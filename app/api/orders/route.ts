import { NextResponse } from 'next/server'
import { supabaseServer } from '../../../src/lib/supabase/client'

export const dynamic = 'force-dynamic'

// 建立訂單
export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as any
  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'items are required' }, { status: 400 })
  }

  const s = supabaseServer()

  // 產生訂單號碼（簡單遞增或 timestamp）
  const orderNumber = `ODR-${Date.now()}`

  // 取得餐廳 ID：body > 環境變數 > DB 中第一筆（且驗證存在性，避免外鍵錯誤）
  let restaurantId: string | null = body.restaurant_id ?? process.env.RESTAURANT_ID ?? null
  if (restaurantId) {
    const { data: exists, error: existsErr } = await s.from('restaurants').select('id').eq('id', restaurantId).maybeSingle()
    if (existsErr || !exists?.id) {
      // env 指向的餐廳不存在，嘗試抓第一筆
      const { data: r, error: rErr } = await s.from('restaurants').select('id').limit(1).maybeSingle()
      if (!rErr && r?.id) restaurantId = r.id as string
      else restaurantId = null
    }
  } else {
    const { data: r, error: rErr } = await s.from('restaurants').select('id').limit(1).maybeSingle()
    if (!rErr && r?.id) restaurantId = r.id as string
  }
  if (!restaurantId) {
    // 資料表要求 NOT NULL，沒有餐廳 id 無法建立
    return NextResponse.json({ error: 'missing restaurant_id' }, { status: 400 })
  }

  const order = {
    restaurant_id: restaurantId,
    table_id: body.table_id ?? null,
    session_id: body.session_id ?? null,
    order_number: orderNumber,
    order_type: body.order_type ?? 'dine_in',
    customer_name: body.customer_name ?? null,
    customer_phone: body.customer_phone ?? null,
    customer_email: body.customer_email ?? null,
    table_number: body.table_number ?? null,
    party_size: body.party_size ?? 1,
    subtotal: Number(body.subtotal ?? 0),
    discount_amount: Number(body.discount_amount ?? 0),
    tax_amount: Number(body.tax_amount ?? 0),
    service_charge: Number(body.service_charge ?? 0),
    total_amount: Number(body.total_amount ?? 0),
    notes: body.notes ?? null,
    special_instructions: body.special_instructions ?? null,
    source: 'web',
    metadata: body.metadata ?? null,
  }

  const { data: created, error: orderErr } = await s.from('orders').insert(order as any).select('*').maybeSingle()
  if (orderErr || !created) {
    console.error('[orders.POST] create order error:', orderErr)
    // 在開發環境回傳詳細錯誤資訊，方便定位資料表欄位不相容問題
    const detail = (process.env.NODE_ENV !== 'production') ? orderErr : undefined
    return NextResponse.json({ error: 'failed to create order', detail }, { status: 500 })
  }

  // 插入 order_items
  const items = body.items.map((i: any) => ({
    order_id: created.id,
    product_id: i.product_id ?? null,
    combo_id: i.combo_id ?? null,
    item_type: i.item_type ?? 'product',
    product_name: i.product_name ?? i.name ?? 'Item',
    product_sku: i.product_sku ?? null,
    variant_name: i.variant_name ?? null,
    quantity: Number(i.quantity ?? 1),
    unit_price: Number(i.unit_price ?? i.price ?? 0),
    total_price: Number(i.unit_price ?? i.price ?? 0) * Number(i.quantity ?? 1),
    cost_price: Number(i.cost_price ?? 0),
    special_instructions: i.special_instructions ?? null,
    modifiers: i.modifiers ?? null,
  }))

  if (items.length) {
  const { error: itemsErr } = await s.from('order_items').insert(items as any)
    if (itemsErr) {
      console.error('[orders.POST] insert items error:', itemsErr)
      // 不中斷回傳，但記錄錯誤
    }
  }

  // 嘗試綁定 CRM 顧客（customer_users）
  try {
    let customerId: string | null = null
    if (body.customer_id) {
      customerId = body.customer_id
    } else if (body.customer_phone || body.customer_email) {
      let q = s.from('customer_users').select('id').limit(1)
      if (body.customer_phone) q = q.eq('phone', body.customer_phone)
      else if (body.customer_email) q = q.eq('email', body.customer_email)
      const { data: found } = await q.maybeSingle()
      if (found?.id) customerId = found.id
    }
    if (customerId) {
      await s.from('order_customers').insert({ order_id: created.id, customer_id: customerId } as any)
    }
  } catch (e) {
    console.warn('[orders.POST] link order_customers skipped:', (e as Error).message)
  }

  return NextResponse.json({ order: created })
}

// 查詢訂單（可依 user_id）
export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Number(url.searchParams.get('limit') || 20)
  const phone = url.searchParams.get('phone')
  const email = url.searchParams.get('email')
  const customerId = url.searchParams.get('customer_id')
  const ridFromQuery = url.searchParams.get('restaurant_id')
  const s = supabaseServer()

  const selectCols = `
    id, order_number, order_type, status,
    subtotal, total_amount, created_at,
    customer_phone, customer_email,
    order_items(
      id, product_id, product_name, quantity, unit_price, total_price, special_instructions
    )
  `
  let query = s
    .from('orders')
    .select(selectCols)
    .order('created_at', { ascending: false })
    .limit(limit)

  // 餐廳範圍限制：優先用查詢參數，其次用環境變數
  const rid = ridFromQuery || process.env.RESTAURANT_ID
  if (rid) query = query.eq('restaurant_id', rid)

  if (customerId) {
    // 透過 order_customers 關聯查詢
    // 先找到此 customer 的 order_id 清單
    const { data: ocList, error: ocErr } = await s
      .from('order_customers')
      .select('order_id')
      .eq('customer_id', customerId)
      .limit(1000)
    if (!ocErr && ocList?.length) {
      const ids = ocList.map(r => r.order_id)
      query = query.in('id', ids as any)
    } else {
      // 沒關聯就直接回空
      const { data } = await query.limit(0)
      return NextResponse.json({ orders: [] })
    }
  } else if (phone) {
    // 先精準比對，若想更彈性可改為 .or('customer_phone.eq....,customer_phone.ilike.%...%')
    query = query.eq('customer_phone', phone)
  } else if (email) {
    // 模糊比對 email，避免大小寫或額外字串造成 miss
    query = query.ilike('customer_email', `%${email}%`)
  }

  const { data, error } = await query
  if (error) {
    console.error('[orders.GET] list error:', error)
    const detail = (process.env.NODE_ENV !== 'production') ? error : undefined
    return NextResponse.json({ orders: [], detail }, { status: 500 })
  }
  return NextResponse.json({ orders: data })
}
