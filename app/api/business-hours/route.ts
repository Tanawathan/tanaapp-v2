import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/client'

// Schema（建議以 SQL 建表，見 README/SQL 範本）：
// - restaurant_settings: open_time (text HH:MM), close_time (text HH:MM), slot_interval_min int, dining_duration_min int
// - restaurant_closures: date (date), reason (text)

export async function GET(req: NextRequest) {
  try {
    const sb = supabaseServer()
    const { data: settings, error: e1 } = await sb
      .from('restaurant_settings')
      .select('open_time, close_time, slot_interval_min, dining_duration_min')
      .limit(1)
      .maybeSingle()

    if (e1 && e1.code !== 'PGRST116') throw e1 // ignore table missing in GET; return null settings

    const { data: closures, error: e2 } = await sb
      .from('restaurant_closures')
      .select('date, reason')
      .order('date', { ascending: true })

    if (e2 && e2.code !== 'PGRST116') throw e2

    return NextResponse.json({ settings: settings || null, closures: closures || [] })
  } catch (e) {
    return NextResponse.json({ error: (e as any)?.message || 'fetch failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const settings = body.settings as {
      open_time?: string
      close_time?: string
      slot_interval_min?: number
      dining_duration_min?: number
    } | undefined
    const closures = body.closures as Array<{ date: string; reason?: string }> | undefined

    const sb = supabaseServer()

    if (settings) {
      // upsert 單列設定
      const { error } = await sb.from('restaurant_settings').upsert({
        id: 1,
        open_time: settings.open_time ?? '17:00',
        close_time: settings.close_time ?? '21:00',
        slot_interval_min: settings.slot_interval_min ?? 30,
        dining_duration_min: settings.dining_duration_min ?? 90,
      }, { onConflict: 'id' })
      if (error) throw error
    }

    if (Array.isArray(closures)) {
      // 採全部覆蓋：刪除全部再插入
      const { error: delErr } = await sb.from('restaurant_closures').delete().neq('date', null)
      if (delErr) throw delErr
      if (closures.length) {
        const { error: insErr } = await sb.from('restaurant_closures').insert(
          closures.map(c => ({ date: c.date, reason: c.reason || null }))
        )
        if (insErr) throw insErr
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as any)?.message || 'update failed' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
