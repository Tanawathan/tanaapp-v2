import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/client'

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
function normalizeStatus(s: any): string { return typeof s === 'string' ? s.toLowerCase().trim() : 'available' }
function normalizeDbTable(t: DbTable): TableOut {
  const cap = toNumber(t.capacity ?? t.seats ?? t.seat_count, 0)
  const name = (t.name || t.table_number || t.label || t.code || t.no || `桌位${t.id}`).toString()
  return { id: t.id, name, capacity: cap, type: `${cap}人桌` }
}
async function loadActiveTables() : Promise<TableOut[]> {
  const sb = supabaseServer()
  const tries = ['tables','restaurant_tables','dining_tables','tables_v2']
  for (const table of tries) {
    try {
      const { data, error } = await sb.from(table).select('*')
      if (!error && Array.isArray(data) && data.length) {
        return (data as any[])
          .filter(r => truthy((r as any).is_active, true) && !['maintenance','cleaning','inactive','out_of_order'].includes(normalizeStatus((r as any).status)))
          .map(normalizeDbTable)
      }
    } catch {}
  }
  return [
    { id: 1, name: '1號桌', capacity: 2, type: '雙人桌' },
    { id: 2, name: '2號桌', capacity: 2, type: '雙人桌' },
    { id: 3, name: '3號桌', capacity: 4, type: '四人桌' },
    { id: 4, name: '4號桌', capacity: 4, type: '四人桌' },
    { id: 5, name: '5號桌', capacity: 6, type: '六人桌' },
    { id: 6, name: '6號桌', capacity: 6, type: '六人桌' },
    { id: 7, name: '7號桌', capacity: 8, type: '八人桌' },
  ]
}

function pickBestTable(tables: TableOut[], partySize: number): TableOut | null {
  const suitable = tables.filter(t => (t.capacity || 0) >= partySize)
  suitable.sort((a, b) => (a.capacity - b.capacity) || (String(a.name).localeCompare(String(b.name))))
  return suitable[0] || null
}
function pickSixPlusTwoCombo(tables: TableOut[]): { primary: TableOut; secondary: TableOut } | null {
  const sixOrMore = tables.filter(t => (t.capacity || 0) >= 6).sort((a,b)=>a.capacity-b.capacity)
  const twoOrMore = tables.filter(t => (t.capacity || 0) >= 2).sort((a,b)=>a.capacity-b.capacity)
  for (const t6 of sixOrMore) {
    const t2 = twoOrMore.find(t => String(t.id) !== String(t6.id))
    if (t2) return { primary: t6, secondary: t2 }
  }
  return null
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const payload = await req.json()
    const restaurantId = process.env.RESTAURANT_ID
    if (!restaurantId) return NextResponse.json({ error: 'RESTAURANT_ID missing' }, { status: 500 })

    // 新的目標時間
    const reservationDateTime = `${payload.reservation_date}T${payload.reservation_time}:00+08:00`
    const desiredStart = new Date(reservationDateTime).getTime()
    const PRE_BLOCK_MS = 90 * 60 * 1000
    const POST_BLOCK_MS = 120 * 60 * 1000
    const SLOT_MS = 30 * 60 * 1000
    const slotStart = Math.floor(desiredStart / SLOT_MS) * SLOT_MS
    const slotEnd = slotStart + SLOT_MS

    const sb = supabaseServer()
    // 讀取當前預約（取得原始 slot）
    const { data: current, error: cerr } = await sb
      .from('table_reservations')
      .select('id, reservation_time')
      .eq('id', id)
      .single()
    if (cerr || !current) return NextResponse.json({ error: '找不到預約' }, { status: 404 })
    const oldStart = new Date((current as any).reservation_time).getTime()
    const oldSlotStart = Math.floor(oldStart / SLOT_MS) * SLOT_MS

    // 讀取該日附近預約，排除自己
    const start = new Date(desiredStart - POST_BLOCK_MS)
    const end = new Date(desiredStart + POST_BLOCK_MS)
    let q = sb
      .from('table_reservations')
      .select('id, table_id, reservation_time, status, party_size')
      .gte('reservation_time', start.toISOString())
      .lte('reservation_time', end.toISOString())
      .in('status', ['confirmed','pending','seated'])
      .neq('id', id)
    if (restaurantId) q = q.eq('restaurant_id', restaurantId)
    const { data: overlapping, error } = await q
    if (error) throw error

    // slot 限制
  const slotTaken = (overlapping || []).some(r => {
      const t = new Date((r as any).reservation_time).getTime()
      return t >= slotStart && t < slotEnd
    })
  // 若仍在同一個 30 分鐘 slot 內，允許修改（不觸發一組限制）
  if (slotTaken && slotStart !== oldSlotStart) {
      return NextResponse.json({ error: '該時段已有其他預約，30分鐘內無法接受重複訂位' }, { status: 409 })
    }

    // 計算封鎖桌位
    const blocked = new Set<string|number>()
    for (const r of (overlapping||[])) {
      const s = new Date((r as any).reservation_time).getTime()
      const blockStart = s - PRE_BLOCK_MS
      const blockEnd = s + POST_BLOCK_MS
      if (desiredStart >= blockStart && desiredStart < blockEnd) {
        if ((r as any).table_id) blocked.add((r as any).table_id)
      }
    }

    // 可用桌
    const activeTables = await loadActiveTables()
    const freeTables = activeTables.filter(t => !blocked.has(t.id))

    // 選位（如果前端提供 preferred_table_ids）
    let chosen: TableOut | null = null
    let secondary: TableOut | null = null
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

    if (!chosen && payload.party_size >= 7) {
      const combo = pickSixPlusTwoCombo(freeTables)
      if (combo) { chosen = combo.primary; secondary = combo.secondary }
    }
    if (!chosen) {
      chosen = pickBestTable(freeTables, payload.party_size)
    }
    if (!chosen) {
      return NextResponse.json({ error: '該時段無可用桌位' }, { status: 409 })
    }

    const update: any = {
      reservation_time: reservationDateTime,
      party_size: payload.party_size,
      adult_count: typeof payload.adult_count === 'number' ? payload.adult_count : payload.party_size,
      child_count: typeof payload.child_count === 'number' ? payload.child_count : 0,
      special_requests: payload.special_requests || null,
      // 以字串寫入，以相容 uuid table_id
      table_id: String(chosen.id),
      updated_at: new Date().toISOString(),
    }
    if (secondary) {
      const note = `second_table_id=${secondary.id}; second_table_name=${secondary.name}; second_table_type=${secondary.type}`
      update.notes = update.notes ? `${update.notes}\n${note}` : note
    }

    const { data: saved, error: uerr } = await sb
      .from('table_reservations')
      .update(update)
      .eq('id', id)
      .select('*')
      .single()
    if (uerr) throw uerr

    return NextResponse.json({ data: saved, assignedTable: chosen, ...(secondary ? { additionalTable: secondary } : {}) })

  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
// end of file
