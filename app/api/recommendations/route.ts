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

async function loadBusinessHours() : Promise<HoursConfig> {
  const supabase = supabaseServer()
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
function generateTimeSlots(cfg: HoursConfig): string[] {
  const slots: string[] = []
  const start = toDateFromHHMM(cfg.start)
  const close = toDateFromHHMM(cfg.end)

  // 最後可預約時間 = 關門時間 - 用餐時間（向下取至間隔）
  const lastStart = new Date(close.getTime() - cfg.diningDurationMin * 60 * 1000)
  const lastFloored = floorToInterval(lastStart, cfg.interval)

  if (lastFloored <= start) {
    // 若設定異常導致沒有任何時段，回傳空陣列
    return []
  }

  let current = new Date(start)
  while (current <= lastFloored) {
    slots.push(toHHMM(current))
    current.setMinutes(current.getMinutes() + cfg.interval)
  }
  return slots
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

  // 讀取營業時間（若無設定則使用預設：17:00 ~ 21:00，間隔 30 分鐘，用餐 90 分鐘）
    const hours = await loadBusinessHours()
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
