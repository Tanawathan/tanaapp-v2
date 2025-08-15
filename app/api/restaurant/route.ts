import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/client'

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
type Segment = { start: string; end: string }
type Hours = Partial<Record<DayKey, Segment[]>>

function toHHMM(s?: string | null): string | null {
  if (!s) return null
  const m = String(s).match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  const hh = m[1].padStart(2, '0')
  const mm = m[2]
  return `${hh}:${mm}`
}

// Normalize various possible shapes of business hours into { day: [{start,end}, ...] }
function normalizeHours(raw: any, settings: any): Hours | null {
  const result: Hours = {}
  const days: DayKey[] = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

  const src = raw || settings?.businessHours || settings?.reservationSettings?.businessHours
  if (!src || typeof src !== 'object') return null

  for (const d of days) {
    const v = (src as any)[d] ?? (src as any)[(d as string).toUpperCase?.()] // allow uppercase keys
    if (!v) continue
    const segs: Segment[] = []

    if (Array.isArray(v)) {
      for (const it of v) {
        const start = toHHMM(it.open || it.start || it.openTime)
        const end = toHHMM(it.close || it.end || it.closeTime)
        if (start && end) segs.push({ start, end })
      }
    } else if (typeof v === 'object') {
      const candidates = [
        { start: v.open, end: v.close },
        { start: v.start, end: v.end },
        { start: v.openTime, end: v.closeTime },
      ]
      for (const c of candidates) {
        const start = toHHMM(c.start)
        const end = toHHMM(c.end)
        if (start && end) segs.push({ start, end })
      }
      // lunch/dinner split
      if (!segs.length && (v.lunch || v.dinner)) {
        const lunch = v.lunch
        const dinner = v.dinner
        if (lunch) {
          const start = toHHMM(lunch.start || lunch.open || lunch.openTime)
          const end = toHHMM(lunch.end || lunch.close || lunch.closeTime)
          if (start && end) segs.push({ start, end })
        }
        if (dinner) {
          const start = toHHMM(dinner.start || dinner.open || dinner.openTime)
          const end = toHHMM(dinner.end || dinner.close || dinner.closeTime)
          if (start && end) segs.push({ start, end })
        }
      }
    }

    if (segs.length) result[d] = segs
  }

  return Object.keys(result).length ? result : null
}

function formatSegments(segs?: Segment[]): string {
  if (!segs || !segs.length) return '休息'
  return segs.map(s => `${s.start} - ${s.end}`).join(', ')
}

function buildDisplayLines(hours: Hours | null): Array<{ label: string; text: string }> {
  if (!hours) return []
  const lines: Array<{ label: string; text: string }> = []
  const wk: DayKey[] = ['monday','tuesday','wednesday','thursday','friday']
  const we: DayKey[] = ['saturday','sunday']
  const wkText = formatSegments(hours['monday'])
  const sameWeekdays = wk.every(k => formatSegments(hours[k]) === wkText)
  const weText = formatSegments(hours['saturday'])
  const sameWeekend = we.every(k => formatSegments(hours[k]) === weText)

  if (sameWeekdays) lines.push({ label: '週一 ~ 週五', text: wkText })
  else {
    const map: Record<DayKey, string> = {
      monday: '週一', tuesday: '週二', wednesday: '週三', thursday: '週四', friday: '週五', saturday: '週六', sunday: '週日'
    }
    ;(['monday','tuesday','wednesday','thursday','friday'] as DayKey[]).forEach(k => {
      lines.push({ label: map[k], text: formatSegments(hours[k]) })
    })
  }

  if (sameWeekend) lines.push({ label: '週六 ~ 週日', text: weText })
  else {
    lines.push({ label: '週六', text: formatSegments(hours['saturday']) })
    lines.push({ label: '週日', text: formatSegments(hours['sunday']) })
  }

  return lines
}

export async function GET() {
  try {
    const sb = supabaseServer()
    const restaurantId = process.env.RESTAURANT_ID || null
    let q = sb.from('restaurants').select('id, name, phone, address, business_hours, settings').limit(1)
    q = restaurantId ? q.eq('id', restaurantId) : q
    const { data, error } = await q.maybeSingle()
    if (error) throw error

    const info = {
      id: (data as any)?.id ?? null,
      name: (data as any)?.name ?? 'Tana 餐廳',
      phone: (data as any)?.phone ?? '0901-222-861',
      address: (data as any)?.address ?? '台北市信義區餐廳街123號',
      hours: normalizeHours((data as any)?.business_hours, (data as any)?.settings),
    }

    const lines = buildDisplayLines(info.hours)
    return NextResponse.json({ info, lines })
  } catch (e) {
    return NextResponse.json({ error: (e as any)?.message || 'failed' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
