import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/client'

// 餐廳桌位配置
const TABLES = [
  { id: 'T001', name: '1號桌', type: '2人桌', capacity: 2 },
  { id: 'T002', name: '2號桌', type: '2人桌', capacity: 2 },
  { id: 'T003', name: '3號桌', type: '4人桌', capacity: 4 },
  { id: 'T004', name: '4號桌', type: '4人桌', capacity: 4 },
  { id: 'T005', name: '5號桌', type: '6人桌', capacity: 6 },
  { id: 'T006', name: '6號桌', type: '6人桌', capacity: 6 },
  { id: 'T007', name: '7號桌', type: '8人桌', capacity: 8 },
  { id: 'T008', name: '8號桌', type: '8人桌', capacity: 8 }
]

// 營業時間設定（預設值 + 嘗試從資料庫讀取覆蓋）
type HoursConfig = {
  start: string // 'HH:MM'
  end: string   // 'HH:MM' 關門時間
  interval: number // 每格分鐘數
  diningDurationMin: number // 最低保留用餐時間（分鐘）
}

type HoursConfigMulti = HoursConfig & { segments?: Array<{ start: string; end: string }> }

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

// 嘗試從 restaurants 表以當日（星期）取得開關門時間與設定
async function loadBusinessHoursForDate(date: string) : Promise<HoursConfigMulti> {
  const supabase = supabaseServer()
  const weekdayIdx = new Date(date + 'T00:00:00').getDay() // 0(日)-6(六)
  const weekdayKeys = ['sun','mon','tue','wed','thu','fri','sat'] as const
  const weekdayKey = weekdayKeys[weekdayIdx]
  const weekdayAliases: Record<string, (string|number)[]> = {
    sun: ['sun','sunday','0','日','週日','星期日',0],
    mon: ['mon','monday','1','一','週一','星期一',1],
    tue: ['tue','tuesday','2','二','週二','星期二',2],
    wed: ['wed','wednesday','3','三','週三','星期三',3],
    thu: ['thu','thursday','4','四','週四','星期四',4],
    fri: ['fri','friday','5','五','週五','星期五',5],
    sat: ['sat','saturday','6','六','週六','星期六',6],
  }
  const restaurantId = process.env.RESTAURANT_ID || null

  // 1) restaurants 表 (business_hours, settings)
  try {
    const base = supabase.from('restaurants').select('business_hours, settings').limit(1)
    const primary = restaurantId ? base.eq('id', restaurantId) : base
    let { data, error } = await primary.maybeSingle()
    if (error || !data) {
      // fallback: take the first row without filtering
      const res = await supabase.from('restaurants').select('business_hours, settings').limit(1).maybeSingle()
      data = res.data
      error = res.error
    }
    if (!error && data) {
  const settings = (data as any).settings || {}
  const bh = (data as any).business_hours || {}

      // 從 settings 推出 interval 與 diningDurationMin
      const interval = settings.slot_interval_min ?? settings.slot_interval ?? settings.interval ?? DEFAULT_HOURS.interval
      const diningDurationMin = settings.dining_duration_min ?? settings.dining_duration ?? settings.diningDurationMin ?? DEFAULT_HOURS.diningDurationMin

      // 依不同結構嘗試取得當日 open/close
      const resolveOpenClose = (source: any): { start?: string; end?: string }[] => {
        if (!source) return []
        const pick = (v: any): { start?: string; end?: string } => ({
          start: v?.open_time ?? v?.opening_time ?? v?.open ?? v?.open_at ?? v?.start ?? v?.from ?? undefined,
          end: v?.close_time ?? v?.closing_time ?? v?.close ?? v?.close_at ?? v?.end ?? v?.to ?? undefined,
        })

        // 常見 weekly map: { mon: { open_time, close_time } } 或 weekly/ days 陣列
        const candidates: any[] = []
        const container = source.weekly || source.weekdays || source.days || source
        const aliases = weekdayAliases[weekdayKey]
        // 物件鍵名匹配
        for (const key of aliases) {
          if (container && typeof container === 'object' && key in container) {
            candidates.push(container[key as any])
          }
        }
        // 陣列形態：[{day: 'mon', segments:[...]}] / [{weekday:1, start, end}]
        if (Array.isArray(container)) {
          for (const item of container) {
            const d = (item?.day ?? item?.weekday ?? item?.wday ?? item?.dow)
            if (aliases.includes(d) || aliases.includes(Number(d))) {
              candidates.push(item)
            }
          }
        }

        const dayConf = candidates.length ? candidates[0] : null
        if (dayConf) {
          if (Array.isArray(dayConf)) {
            return dayConf.map((seg: any) => pick(seg)).filter(s => s.start && s.end)
          }
          // 可能有 segments 陣列
          if (Array.isArray(dayConf.segments)) {
            return dayConf.segments.map((seg: any) => pick(seg)).filter((s: any) => s.start && s.end)
          }
          return [pick(dayConf)].filter((s: any) => s.start && s.end)
        }
        // 若直接是 { open_time, close_time }
        const single = pick(source)
        return single.start && single.end ? [single] : []
      }

      const segs = resolveOpenClose(bh)
      // 若 business_hours 沒有該日，嘗試 settings 的 open_time/close_time
      const settingsStart = settings.open_time ?? settings.opening_time
      const settingsEnd = settings.close_time ?? settings.closing_time
      if (!segs.length && settingsStart && settingsEnd) {
        segs.push({ start: settingsStart, end: settingsEnd })
      }
      const firstStart = segs[0]?.start ?? settingsStart ?? DEFAULT_HOURS.start
      const lastEnd = segs[segs.length - 1]?.end ?? settingsEnd ?? DEFAULT_HOURS.end

      return {
        start: firstStart,
        end: lastEnd,
        interval: Number(interval) || DEFAULT_HOURS.interval,
        diningDurationMin: Number(diningDurationMin) || DEFAULT_HOURS.diningDurationMin,
        segments: segs as Array<{ start: string; end: string }>
      }
    }
  } catch {
    // ignore and continue
  }

  // 2) 舊的表與欄位（向後相容）
  // 依序嘗試多個可能的表與欄位命名，若不存在則使用預設
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

      if (error) {
        // 若資料表不存在或權限不足，忽略並使用下一個嘗試
        // console.warn(`[business-hours] skip ${t.table}:`, error.message)
      } else if (data) {
        const mapped = t.map(data)
        const cfg: HoursConfig = {
          ...DEFAULT_HOURS,
          ...Object.fromEntries(
            Object.entries(mapped).filter(([_, v]) => v !== undefined && v !== null)
          ) as Partial<HoursConfig>,
        }
        return cfg
      }
    } catch {
      // ignore and continue
    }
  }

  return DEFAULT_HOURS
}

// 生成時段選項（以「關門時間 - 用餐時間」為上限）
function generateTimeSlots(cfg: HoursConfigMulti): string[] {
  const slots: string[] = []
  const segments = (cfg.segments && cfg.segments.length > 0)
    ? cfg.segments
    : [{ start: cfg.start, end: cfg.end }]

  for (const seg of segments) {
    const start = toDateFromHHMM(seg.start)
    const close = toDateFromHHMM(seg.end)
    const lastStart = new Date(close.getTime() - cfg.diningDurationMin * 60 * 1000)
    const lastFloored = floorToInterval(lastStart, cfg.interval)
    if (lastFloored <= start) continue
    let current = new Date(start)
    while (current <= lastFloored) {
      slots.push(toHHMM(current))
      current.setMinutes(current.getMinutes() + cfg.interval)
    }
  }
  const uniq = Array.from(new Set(slots))
  uniq.sort()
  return uniq
}

// 日內資料 + 記憶體判斷 30 分鐘內是否已有預約
function has30MinConflict(
  datetime: string,
  reservations: Array<{ reservation_time: string }>
) {
  const requestTime = new Date(datetime)
  const windowStart = new Date(requestTime.getTime() - 30 * 60 * 1000)
  const windowEnd = new Date(requestTime.getTime() + 30 * 60 * 1000)

  for (const r of reservations) {
    const t = new Date(r.reservation_time)
    if (t >= windowStart && t <= windowEnd) return true
  }
  return false
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const partySize = parseInt(searchParams.get('partySize') || '2')
    const preferredTime = searchParams.get('preferredTime') // 用戶原本選擇的時間

    if (!date) {
      return NextResponse.json({ error: '請提供日期' }, { status: 400 })
    }

    // 驗證日期格式
    const selectedDate = new Date(date)
    if (isNaN(selectedDate.getTime())) {
      return NextResponse.json({ error: '日期格式錯誤' }, { status: 400 })
    }

    // 檢查是否為過去日期
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    selectedDate.setHours(0, 0, 0, 0)
    
    if (selectedDate < today) {
      return NextResponse.json({ 
        error: '無法預約過去的日期',
        availableSlots: [],
        recommendations: []
      }, { status: 400 })
    }

  // 讀取營業時間（優先 restaurants.business_hours/settings；否則使用預設或相容表）
  const hours = await loadBusinessHoursForDate(date)
    const timeSlots = generateTimeSlots(hours)

    // 讀取當日預約（僅該餐廳、有效狀態），之後在記憶體內做 30 分鐘判定
  const restaurantId = process.env.RESTAURANT_ID || null

    const dayStart = `${date}T00:00:00+08:00`
    const dayEnd = `${date}T23:59:59+08:00`
    const sb = supabaseServer()

    // 休假日檢查：若當日出現在 restaurant_closures，直接回傳不可預約
    try {
      const { data: closed } = await sb
        .from('restaurant_closures')
        .select('date')
        .eq('date', date)
        .limit(1)
        .maybeSingle()
      if (closed) {
        return NextResponse.json({
          date,
          partySize,
          preferredTime: null,
          availableSlots: [],
          unavailableSlots: [],
          recommendations: [],
          totalAvailable: 0,
          businessHours: hours,
          message: '當日為公休，不開放預約'
        })
      }
    } catch {}
    let query = sb
      .from('table_reservations')
      .select('reservation_time,status')
      .gte('reservation_time', dayStart)
      .lte('reservation_time', dayEnd)
      .in('status', ['confirmed', 'pending'])

    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId)
    }

    const { data: dayReservations, error: rerr } = await query

    if (rerr) {
      console.error('read reservations error:', rerr)
      return NextResponse.json({ error: '讀取預約資料失敗' }, { status: 500 })
    }
    const availableSlots: Array<{
      time: string
      available: boolean
      reason?: string
      conflictCount?: number
    }> = []

    // 檢查每個時段的可用性
    for (const timeSlot of timeSlots) {
      const datetime = `${date}T${timeSlot}:00+08:00`
      const conflict = has30MinConflict(datetime, dayReservations || [])
      availableSlots.push({
        time: timeSlot,
        available: !conflict,
        reason: conflict ? '30分鐘內已有其他預約' : '時段可用',
        conflictCount: conflict ? 1 : 0,
      })
    }

    // 生成推薦時段（最多3個）
    const recommendations = availableSlots
      .filter(slot => slot.available)
      .slice(0, 3)
      .map(slot => ({
        time: slot.time,
        displayTime: slot.time,
        reason: '此時段可接受預約'
      }))

    // 如果用戶有偏好時間，檢查其狀態
    let preferredTimeStatus = null
    if (preferredTime) {
  const preferredSlot = availableSlots.find(slot => slot.time === preferredTime)
      if (preferredSlot) {
        preferredTimeStatus = {
          time: preferredTime,
          available: preferredSlot.available,
          reason: preferredSlot.reason,
          conflictCount: preferredSlot.conflictCount
        }
      }
    }

    return NextResponse.json({
      date,
      partySize,
      preferredTime: preferredTimeStatus,
      availableSlots: availableSlots.filter(slot => slot.available),
      unavailableSlots: availableSlots.filter(slot => !slot.available),
      recommendations,
      totalAvailable: availableSlots.filter(slot => slot.available).length,
      businessHours: hours,
      message: recommendations.length > 0 
        ? `找到 ${recommendations.length} 個推薦時段`
        : '很抱歉，當日所有時段都已被預約'
    })

  } catch (error) {
    console.error('推薦時段API錯誤:', error)
    return NextResponse.json({ 
      error: '取得推薦時段失敗',
      availableSlots: [],
      recommendations: []
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
