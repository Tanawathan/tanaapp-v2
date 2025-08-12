import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/client'

// GET /api/availability?date=YYYY-MM-DD
// 回傳：{ total: number, by_time: Record<string, number> }
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')?.trim()
    const restaurantId = process.env.RESTAURANT_ID
    if (!date) return NextResponse.json({ error: 'missing date' }, { status: 400 })
    if (!restaurantId) return NextResponse.json({ error: 'RESTAURANT_ID missing' }, { status: 500 })

    const sb = supabaseServer()
    const { data, error } = await sb
      .from('reservations')
      .select('reservation_time')
      .eq('restaurant_id', restaurantId)
      .eq('reservation_date', date)

    if (error) throw error

    const by_time: Record<string, number> = {}
    for (const row of data || []) {
      const t = (row as any).reservation_time as string
      by_time[t] = (by_time[t] || 0) + 1
    }
    const total = (data || []).length
    return NextResponse.json({ total, by_time })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
