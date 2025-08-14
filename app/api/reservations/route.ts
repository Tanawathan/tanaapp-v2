import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/client'

// 桌位設定 - 可以後續移至資料庫管理
const TABLES = [
  { id: 1, name: '1號桌', capacity: 2, type: '雙人桌' },
  { id: 2, name: '2號桌', capacity: 2, type: '雙人桌' },
  { id: 3, name: '3號桌', capacity: 4, type: '四人桌' },
  { id: 4, name: '4號桌', capacity: 4, type: '四人桌' },
  { id: 5, name: '5號桌', capacity: 4, type: '四人桌' },
  { id: 6, name: '6號桌', capacity: 6, type: '六人桌' },
  { id: 7, name: '7號桌', capacity: 6, type: '六人桌' },
  { id: 8, name: '8號桌', capacity: 8, type: '八人桌' },
];

// 檢查30分鐘內預約衝突
async function checkReservationConflict(datetime: string, partySize: number) {
  const supabase = supabaseServer();
  
  // 計算30分鐘前後的時間範圍
  const targetTime = new Date(datetime);
  const startTime = new Date(targetTime.getTime() - 30 * 60 * 1000); // 30分鐘前
  const endTime = new Date(targetTime.getTime() + 30 * 60 * 1000);   // 30分鐘後

  console.log('檢查預約衝突:', {
    targetTime: targetTime.toISOString(),
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    partySize
  });

  // 查詢該時段內的所有有效預約
  const { data: conflictingReservations, error } = await supabase
    .from('table_reservations')
    .select('id, customer_name, party_size, reservation_time, status')
    .gte('reservation_time', startTime.toISOString())
    .lte('reservation_time', endTime.toISOString())
    .in('status', ['confirmed', 'pending']);

  if (error) {
    console.error('查詢預約衝突錯誤:', error);
    throw new Error(`預約衝突檢查失敗: ${error.message}`);
  }

  console.log('找到的衝突預約:', conflictingReservations);

  // 檢查是否有衝突
  if (conflictingReservations && conflictingReservations.length > 0) {
    const conflictInfo = conflictingReservations.map((r: any) => 
      `${new Date(r.reservation_time).toLocaleString('zh-TW', {timeZone: 'Asia/Taipei'})} (${r.party_size}人)`
    ).join(', ');

    return {
      hasConflict: true,
      conflictCount: conflictingReservations.length,
      conflictInfo,
      conflictingReservations
    };
  }

  return {
    hasConflict: false,
    conflictCount: 0,
    conflictInfo: null,
    conflictingReservations: []
  };
}

// 舊的桌位可用性檢查函數（改名但保留備用）
async function checkTableCapacity(datetime: string, partySize: number) {
  const supabase = supabaseServer();
  
  // 計算30分鐘前後的時間範圍
  const targetTime = new Date(datetime);
  const startTime = new Date(targetTime.getTime() - 30 * 60 * 1000);
  const endTime = new Date(targetTime.getTime() + 30 * 60 * 1000);

  // 查詢該時段已有的預約總數和人數
  const { data: reservations, error } = await supabase
    .from('table_reservations')
    .select('party_size')
    .gte('reservation_time', startTime.toISOString())
    .lte('reservation_time', endTime.toISOString())
    .in('status', ['confirmed', 'pending']);

  if (error) {
    throw new Error(`桌位容量查詢失敗: ${error.message}`);
  }

  // 計算已預約的總人數
  const totalBooked = reservations?.reduce((sum: number, r: any) => sum + (r.party_size || 0), 0) || 0;
  
  // 餐廳總容量（假設8張桌位總計40人）
  const totalCapacity = 2 + 2 + 4 + 4 + 4 + 6 + 6 + 8; // 36人
  
  // 檢查是否有足夠容量
  const availableCapacity = totalCapacity - totalBooked;
  
  if (availableCapacity >= partySize) {
    // 根據人數返回建議桌位（邏輯上的，不是真實的資料庫ID）
    const suggestedTable = TABLES.find(table => table.capacity >= partySize);
    return suggestedTable || TABLES[0];
  }
  
  return null;
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

    // 基於實際 table_reservations schema 調整插入欄位
    // 組合日期時間，使用台灣時區 (+08:00)
    const reservationDateTime = `${payload.reservation_date}T${payload.reservation_time}:00+08:00`
    
    // 檢查30分鐘內預約衝突
    const conflictCheck = await checkReservationConflict(reservationDateTime, payload.party_size);
    
    if (conflictCheck.hasConflict) {
      return NextResponse.json({ 
        error: '該時段已有其他預約，30分鐘內無法接受重複訂位',
        message: `衝突預約：${conflictCheck.conflictInfo}`,
        conflictDetails: conflictCheck.conflictingReservations,
        available: false
      }, { status: 409 }); // 409 Conflict
    }
    
    // 可選：額外的容量檢查（如果需要）
    const capacityCheck = await checkTableCapacity(reservationDateTime, payload.party_size);
    const suggestedTable = capacityCheck || TABLES.find(table => table.capacity >= payload.party_size) || TABLES[0];
    
    const insert = {
      restaurant_id: restaurantId,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      customer_email: payload.customer_email || null,
      customer_notes: customerData ? `會員ID: ${customerData.customer_id}` : null,
      // customer_id: customerData?.customer_id || null, // 移除：資料表中沒有此欄位
      party_size: payload.party_size,
      reservation_time: reservationDateTime,
      // table_id: availableTable.id, // 暫時移除，因為資料庫table_id是UUID類型
      duration_minutes: 120, // 預設 2 小時
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      special_requests: payload.special_requests || null,
      deposit_amount: 0.00,
      deposit_paid: false,
      reservation_type: customerData ? 'member' : 'online', // 區分會員和訪客訂位
      adult_count: payload.party_size,
      child_count: 0,
      child_chair_needed: false
    }

    console.log('Attempting to insert reservation with table assignment:', insert)
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
      assignedTable: suggestedTable,
      message: `預約成功！已安排 ${suggestedTable.name}（${suggestedTable.type}）`
    })
  } catch (e) {
    console.error('POST /api/reservations error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}