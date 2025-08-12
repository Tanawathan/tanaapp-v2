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

// 營業時間範圍
const BUSINESS_HOURS = {
  start: '17:00',
  end: '21:00',
  interval: 30 // 30分鐘間隔
}

// 生成時段選項
function generateTimeSlots(): string[] {
  const slots: string[] = []
  const start = new Date(`2000-01-01T${BUSINESS_HOURS.start}:00`)
  const end = new Date(`2000-01-01T${BUSINESS_HOURS.end}:00`)
  
  let current = new Date(start)
  while (current <= end) {
    const timeStr = current.toTimeString().substr(0, 5)
    slots.push(timeStr)
    current.setMinutes(current.getMinutes() + BUSINESS_HOURS.interval)
  }
  
  return slots
}

// 檢查30分鐘內預約衝突
async function checkReservationConflict(datetime: string, partySize: number) {
  const supabase = supabaseServer()
  
  // 計算30分鐘時間窗口
  const requestTime = new Date(datetime)
  const windowStart = new Date(requestTime.getTime() - 30 * 60 * 1000) // 30分鐘前
  const windowEnd = new Date(requestTime.getTime() + 30 * 60 * 1000)   // 30分鐘後

  const { data: conflictingReservations, error } = await supabase
    .from('table_reservations')
    .select('*')
    .gte('reservation_time', windowStart.toISOString())
    .lte('reservation_time', windowEnd.toISOString())
    .neq('status', 'cancelled')

  if (error) {
    console.error('Database query error:', error)
    return { hasConflict: true, reason: '資料庫查詢錯誤' }
  }

  if (conflictingReservations && conflictingReservations.length > 0) {
    return { 
      hasConflict: true, 
      reason: '30分鐘內已有其他預約',
      conflictCount: conflictingReservations.length,
      conflictingReservations 
    }
  }

  return { hasConflict: false, reason: '時段可用' }
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

    const timeSlots = generateTimeSlots()
    const availableSlots: Array<{
      time: string
      available: boolean
      reason?: string
      conflictCount?: number
    }> = []

    // 檢查每個時段的可用性
    for (const timeSlot of timeSlots) {
      const datetime = `${date}T${timeSlot}:00+08:00`
      const conflictCheck = await checkReservationConflict(datetime, partySize)
      
      availableSlots.push({
        time: timeSlot,
        available: !conflictCheck.hasConflict,
        reason: conflictCheck.reason,
        conflictCount: conflictCheck.conflictCount || 0
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
