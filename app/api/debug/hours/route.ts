import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/client'

type HoursConfig = {
  start: string
  end: string
  interval: number
  diningDurationMin: number
}

const DEFAULT_HOURS: HoursConfig = {
  start: '17:00',
  end: '21:00',
  interval: 30,
  diningDurationMin: 90,
}

function parseHHMM(s: string): { h: number; m: number } {
  const [hh, mm] = s.split(':').map(n => parseInt(n, 10) || 0)
  return { h: hh, m: mm }
}

function toDateFromHHMM(hhmm: string): Date {
  const { h, m } = parseHHMM(hhmm)
  const d = new Date('2000-01-01T00:00:00')
  d.setHours(h, m, 0, 0)
  return d
}

function toHHMM(d: Date): string {
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

function floorToInterval(date: Date, intervalMin: number): Date {
  const d = new Date(date)
  const minutes = d.getMinutes()
  const floored = Math.floor(minutes / intervalMin) * intervalMin
  d.setMinutes(floored, 0, 0)
  return d
}

async function loadBusinessHours() {
  const supabase = supabaseServer()
  const tries: Array<{
    table: string
    select: string
    map: (row: any) => Partial<HoursConfig>
  }> = [
    {
      table: 'restaurant_settings',
      select: 'open_time, close_time, dining_duration_min, slot_interval_min',
      map: (row: any) => ({
        start: row?.open_time,
        end: row?.close_time,
        diningDurationMin: row?.dining_duration_min,
        interval: row?.slot_interval_min,
      }),
    },
    {
      table: 'business_hours',
      select: 'open_time, close_time, duration_min, interval_min',
      map: (row: any) => ({
        start: row?.open_time,
        end: row?.close_time,
        diningDurationMin: row?.duration_min,
        interval: row?.interval_min,
      }),
    },
    {
      table: 'settings',
      select: 'opening_time, closing_time, dining_duration, slot_interval',
      map: (row: any) => ({
        start: row?.opening_time,
        end: row?.closing_time,
        diningDurationMin: row?.dining_duration,
        interval: row?.slot_interval,
      }),
    },
  ]

  for (const t of tries) {
    try {
      const { data, error } = await supabase
        .from(t.table)
        .select(t.select)
        .limit(1)
        .maybeSingle()

      if (!error && data) {
        const mapped = t.map(data)
        const cfg: HoursConfig = {
          ...DEFAULT_HOURS,
          ...Object.fromEntries(
            Object.entries(mapped).filter(([_, v]) => v !== undefined && v !== null)
          ) as Partial<HoursConfig>,
        }
        return { cfg, source: t.table }
      }
    } catch {}
  }

  return { cfg: DEFAULT_HOURS, source: 'default' as const }
}

function buildSlots(cfg: HoursConfig) {
  const start = toDateFromHHMM(cfg.start)
  const close = toDateFromHHMM(cfg.end)
  const lastStart = new Date(close.getTime() - cfg.diningDurationMin * 60 * 1000)
  const lastFloored = floorToInterval(lastStart, cfg.interval)
  const slots: string[] = []
  let current = new Date(start)
  while (current <= lastFloored) {
    slots.push(toHHMM(current))
    current.setMinutes(current.getMinutes() + cfg.interval)
  }
  return { slots, lastStart: toHHMM(lastFloored) }
}

export async function GET() {
  try {
    const { cfg, source } = await loadBusinessHours()
    const built = buildSlots(cfg)
    return NextResponse.json({ source, config: cfg, ...built })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
