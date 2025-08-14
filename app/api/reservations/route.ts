import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/client'

// 動態載入桌位（與 /api/tables 規則一致）
type DbTable = Record<string, any>
type TableOut = { id: string | number; name: string; capacity: number; type: string }

function toNumber(n: any, def = 0): number {
  const v = typeof n === 'string' ? Number(n) : (typeof n === 'number' ? n : NaN)
  return Number.isFinite(v) ? v : def
}
function truthy(v: any, def = true): boolean {
  if (v === undefined || v === null) return def
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') return ['1','true','t','y','yes','on','enabled'].includes(v.toLowerCase().trim())
  return def
}
function normalizeStatus(s: any): string {
  if (typeof s !== 'string') return 'available'
  return s.toLowerCase().trim()
}
function normalizeDbTable(t: DbTable): TableOut {
  const cap = toNumber(t.capacity ?? t.seats ?? t.seat_count, 0)
  const name = (t.name || t.table_number || t.label || t.code || t.no || `桌位${t.id}`).toString()
  return { id: t.id, name, capacity: cap, type: `${cap}人桌` }
}
async function loadActiveTables() : Promise<{ tables: TableOut[]; source: string }> {
  const sb = supabaseServer()
  const tries: Array<{ table: string; isActive: (row: DbTable) => boolean; }>= [
    { table: 'tables', isActive: (r) => { const s=normalizeStatus(r.status); return truthy(r.is_active,true) && !['maintenance','cleaning','inactive','out_of_order'].includes(s) } },
    { table: 'restaurant_tables', isActive: (r) => { const s=normalizeStatus(r.status); return truthy(r.is_active,true) && !['maintenance','cleaning','inactive','out_of_order'].includes(s) } },
    { table: 'dining_tables', isActive: (r) => { const s=normalizeStatus(r.status); return truthy(r.is_active,true) && !['maintenance','cleaning','inactive','out_of_order'].includes(s) } },
    { table: 'tables_v2', isActive: (r) => { const s=normalizeStatus(r.status); return truthy(r.is_active,true) && !['maintenance','cleaning','inactive','out_of_order'].includes(s) } },
  ]
  for (const t of tries) {
    try {
      const { data, error } = await sb.from(t.table).select('*')
      if (!error && data && Array.isArray(data) && data.length > 0) {
        const rows = data as unknown as DbTable[]
        const filtered = rows.filter(t.isActive)
        return { tables: filtered.map(normalizeDbTable), source: t.table }
      }
    } catch {}
  }
  // fallback 若 DB 尚未建表
  const FALLBACK: TableOut[] = [
    { id: 1, name: '1號桌', capacity: 2, type: '雙人桌' },
    { id: 2, name: '2號桌', capacity: 2, type: '雙人桌' },
    { id: 3, name: '3號桌', capacity: 4, type: '四人桌' },
    { id: 4, name: '4號桌', capacity: 4, type: '四人桌' },
    { id: 5, name: '5號桌', capacity: 4, type: '四人桌' },
    { id: 6, name: '6號桌', capacity: 6, type: '六人桌' },
    { id: 7, name: '7號桌', capacity: 6, type: '六人桌' },
    { id: 8, name: '8號桌', capacity: 8, type: '八人桌' },
  ]
  return { tables: FALLBACK, source: 'fallback' }
}

// 依 −90/+120 分鐘規則，回傳與欲預約時間重疊的預約（用於封鎖桌位）
async function getOverlappingReservations(datetimeISO: string) {
  const sb = supabaseServer()
  const desiredStart = new Date(datetimeISO).getTime()
  const PRE_BLOCK_MS = 90 * 60 * 1000
  const POST_BLOCK_MS = 120 * 60 * 1000
  const start = new Date(desiredStart - POST_BLOCK_MS)
  const end = new Date(desiredStart + POST_BLOCK_MS)
  const restaurantId = process.env.RESTAURANT_ID || null
  let q = sb
    .from('table_reservations')
    .select('id, table_id, reservation_time, status, party_size, duration_minutes')
    .gte('reservation_time', start.toISOString())
    .lte('reservation_time', end.toISOString())
    .in('status', ['confirmed', 'pending', 'seated'])
  if (restaurantId) q = q.eq('restaurant_id', restaurantId)
  const { data, error } = await q
  if (error) throw error
  // 過濾出 desiredStart ∈ [s−90m, s+120m) 的預約
  const overlapping = (data || []).filter((r: any) => {
    const s = new Date(r.reservation_time).getTime()
    const blockStart = s - PRE_BLOCK_MS
    const blockEnd = s + POST_BLOCK_MS
    return desiredStart >= blockStart && desiredStart < blockEnd
  })
  return overlapping
}

// 在可用桌位中，選出最合適的一張（容量最接近但足以容納）
function pickBestTable(tables: TableOut[], partySize: number): TableOut | null {
  const suitable = tables.filter(t => (t.capacity || 0) >= partySize)
  suitable.sort((a, b) => (a.capacity - b.capacity) || (String(a.name).localeCompare(String(b.name))))
  return suitable[0] || null
}

// 特例：8 位優先拆成 6+2
function pickSixPlusTwoCombo(tables: TableOut[]): { primary: TableOut; secondary: TableOut } | null {
  const sixOrMore = tables.filter(t => (t.capacity || 0) >= 6).sort((a,b)=>a.capacity-b.capacity)
  const twoOrMore = tables.filter(t => (t.capacity || 0) >= 2).sort((a,b)=>a.capacity-b.capacity)
  for (const t6 of sixOrMore) {
    const t2 = twoOrMore.find(t => String(t.id) !== String(t6.id))
    if (t2) return { primary: t6, secondary: t2 }
  }
  return null
}

// 顧客端查詢：必須以 phone 作為查詢條件，避免回傳所有訂位資料
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const phone = searchParams.get('phone')?.trim()
    const date = searchParams.get('date')?.trim() // 可選：YYYY-MM-DD

    const sb = supabaseServer()
    const restaurantId = process.env.RESTAURANT_ID
    if (!restaurantId) {
      return NextResponse.json({ error: 'RESTAURANT_ID missing' }, { status: 500 })
    }
    
    let query = sb
      .from('table_reservations')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('reservation_time', { ascending: true })

    // 如果有提供電話號碼，則按電話號碼篩選
    if (phone) {
      query = query.eq('customer_phone', phone)
    }

    if (date) {
      // 將 date 參數轉換為該日期的時間範圍過濾（台灣時區）
      const startTime = `${date}T00:00:00+08:00`
      const endTime = `${date}T23:59:59+08:00`
      query = query.gte('reservation_time', startTime).lte('reservation_time', endTime)
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    const restaurantId = process.env.RESTAURANT_ID
    if (!restaurantId) return NextResponse.json({ error: 'RESTAURANT_ID missing' }, { status: 500 })

    // 檢查是否為登入會員（從Cookie取得token）
    const cookies = req.headers.get('cookie')
    let customerData = null
    
    if (cookies) {
      const tokenMatch = cookies.match(/auth-token=([^;]+)/)
      if (tokenMatch) {
        try {
          const tokenData = JSON.parse(Buffer.from(tokenMatch[1], 'base64').toString())
          if (tokenData.exp > Date.now()) {
            customerData = tokenData
          }
        } catch (e) {
          // Token無效，忽略
        }
      }
    }

    // 組合日期時間（台灣時區 +08:00）
    const reservationDateTime = `${payload.reservation_date}T${payload.reservation_time}:00+08:00`

    // 讀取活躍桌位並套用 −90/+120 規則計算封鎖
    const { tables: activeTables, source } = await loadActiveTables()
    const overlapping = await getOverlappingReservations(reservationDateTime)
    const PRE_BLOCK_MS = 90 * 60 * 1000
    const POST_BLOCK_MS = 120 * 60 * 1000
    const desiredStart = new Date(reservationDateTime).getTime()
    const SLOT_MS = 30 * 60 * 1000
    const slotStart = Math.floor(desiredStart / SLOT_MS) * SLOT_MS
    const slotEnd = slotStart + SLOT_MS
    const blocked = new Set<string | number>()
    for (const r of overlapping) {
      const s = new Date(r.reservation_time).getTime()
      const blockStart = s - PRE_BLOCK_MS
      const blockEnd = s + POST_BLOCK_MS
      if (desiredStart >= blockStart && desiredStart < blockEnd) {
        if (r.table_id) blocked.add(r.table_id)
      }
    }
    // 一個 30 分鐘 slot 僅接待一組：若 slot 內已有任何有效預約則拒絕
    const slotTaken = overlapping.some((r:any) => {
      const t = new Date(r.reservation_time).getTime()
      return t >= slotStart && t < slotEnd && ['confirmed','pending','seated'].includes(String(r.status||'').toLowerCase())
    })
    if (slotTaken) {
      return NextResponse.json({
        available: false,
        error: '該 30 分鐘時段已有預約',
        message: '請選擇其他時間（本店每 30 分鐘僅接待一組）'
      }, { status: 409 })
    }
    const freeTables = activeTables.filter(t => !blocked.has(t.id))
    let chosen = null as TableOut | null
    let secondary: TableOut | null = null
    
    // 若顧客有選位，嘗試優先滿足（驗證其仍在 freeTables 內）
    const prefIds: string[] = Array.isArray(payload.preferred_table_ids) ? payload.preferred_table_ids.map((x:any)=>String(x)) : []
    if (prefIds.length === 2 && payload.party_size >= 7) {
      const a = freeTables.find(t => String(t.id) === prefIds[0])
      const b = freeTables.find(t => String(t.id) === prefIds[1])
      if (a && b) { chosen = a; secondary = b }
    }
    if (!chosen && prefIds.length === 1) {
      const a = freeTables.find(t => String(t.id) === prefIds[0])
      if (a && (a.capacity||0) >= payload.party_size) chosen = a
    }

    // 若未選到或無效，依規則自動分配
    if (!chosen && payload.party_size >= 7) {
      const combo = pickSixPlusTwoCombo(freeTables)
      if (combo) { chosen = combo.primary; secondary = combo.secondary }
    }
    if (!chosen) {
      chosen = pickBestTable(freeTables, payload.party_size)
    }

    if (!chosen) {
      return NextResponse.json({
        available: false,
        error: '該時段無可用桌位',
        message: `該時段容量不足或時段衝突（封鎖 ${blocked.size} 張；來源：${source}）`,
        debug: { freeTableCount: freeTables.length, activeTableCount: activeTables.length }
      }, { status: 409 })
    }
    
    const insert: any = {
      restaurant_id: restaurantId,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      customer_email: payload.customer_email || null,
      customer_notes: customerData ? `會員ID: ${customerData.customer_id}` : null,
      // customer_id: customerData?.customer_id || null, // 移除：資料表中沒有此欄位
      party_size: payload.party_size,
      reservation_time: reservationDateTime,
      // table_id 將以字串寫入，以相容 uuid 欄位；若為 fallback 則避免寫入
      duration_minutes: 120, // 預設 2 小時
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      special_requests: payload.special_requests || null,
      deposit_amount: 0.00,
      deposit_paid: false,
  reservation_type: customerData ? 'member' : 'online', // 區分會員和訪客訂位
  adult_count: typeof payload.adult_count === 'number' ? payload.adult_count : payload.party_size,
  child_count: typeof payload.child_count === 'number' ? payload.child_count : 0,
      child_chair_needed: false
    }

    // 僅在來源非 fallback 時指派 table_id，避免數值型 ID 與資料表 uuid 衝突
    if (source !== 'fallback' && chosen?.id) {
      insert.table_id = String(chosen.id)
    }

  // 若為 7-8 位且選到 6+2，將副桌資訊寫入 notes 方便現場識別
  if (payload.party_size >= 7 && secondary) {
      const note = `second_table_id=${secondary.id}; second_table_name=${secondary.name}; second_table_type=${secondary.type}`
      insert.notes = insert.notes ? `${insert.notes}\n${note}` : note
    }

    console.log('Attempting to insert reservation with table assignment:', { ...insert, table_id: insert.table_id || '(not assigned)' })
    const sb = supabaseServer()
    const { data, error } = await sb.from('table_reservations').insert(insert).select('*').single()
    
    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ 
        error: error.message, 
        details: error.details, 
        hint: error.hint,
        code: error.code 
      }, { status: 500 })
    }

    console.log('Successfully inserted reservation:', data)
    return NextResponse.json({ 
      data,
      assignedTable: chosen,
      ...(secondary ? { additionalTable: secondary } : {}),
      message: secondary
        ? `預約成功！已安排 ${chosen.name}（${chosen.type}） + ${secondary.name}（${secondary.type}）`
        : `預約成功！已安排 ${chosen.name}（${chosen.type}）`
    })
  } catch (e) {
    console.error('POST /api/reservations error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}