import { NextResponse } from 'next/server'

// 簡單查詢現有 restaurant_id 值的路由
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !key) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
    }

    // 直接查詢現有的 restaurant_id 值
    const res = await fetch(`${url}/rest/v1/table_reservations?select=restaurant_id&limit=10`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: 'Failed to query reservations', detail: text }, { status: res.status })
    }

    const data = await res.json()
    const uniqueRestaurantIds = [...new Set(data.map((r: any) => r.restaurant_id).filter(Boolean))]
    
    return NextResponse.json({
      current_env_restaurant_id: process.env.RESTAURANT_ID,
      found_restaurant_ids_in_db: uniqueRestaurantIds,
      total_reservations: data.length,
      sample_data: data.slice(0, 3)
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
