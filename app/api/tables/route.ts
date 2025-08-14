import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../src/lib/supabase/client';

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

function normalizeStatus(s: any): string {
  if (typeof s !== 'string') return 'available'
  return s.toLowerCase().trim()
}

function normalizeDbTable(t: DbTable): TableOut {
  const cap = toNumber(t.capacity ?? t.seats ?? t.seat_count, 0)
  const name = (t.name || t.table_number || t.label || t.code || t.no || `桌位${t.id}`).toString()
  return {
    id: t.id,
    name,
    capacity: cap,
    type: `${cap}人桌`,
  }
}

async function loadActiveTables() : Promise<{ tables: TableOut[]; source: string }> {
  const sb = supabaseServer()

  // 嘗試不同可能的資料表名稱
  const tries: Array<{ table: string; isActive: (row: DbTable) => boolean; }>= [
    {
      table: 'tables',
      // 不再只看 status='available'；排除維護/清潔/停用，其餘交由時間窗規則判定
      isActive: (r) => {
        const s = normalizeStatus(r.status)
        return truthy(r.is_active, true) && !['maintenance','cleaning','inactive','out_of_order'].includes(s)
      },
    },
    {
      table: 'restaurant_tables',
      isActive: (r) => {
        const s = normalizeStatus(r.status)
        return truthy(r.is_active, true) && !['maintenance','cleaning','inactive','out_of_order'].includes(s)
      },
    },
    {
      table: 'dining_tables',
      isActive: (r) => {
        const s = normalizeStatus(r.status)
        return truthy(r.is_active, true) && !['maintenance','cleaning','inactive','out_of_order'].includes(s)
      },
    },
    {
      table: 'tables_v2',
      isActive: (r) => {
        const s = normalizeStatus(r.status)
        return truthy(r.is_active, true) && !['maintenance','cleaning','inactive','out_of_order'].includes(s)
      },
    },
  ]

  for (const t of tries) {
    try {
      const { data, error } = await sb.from(t.table).select('*')
      if (!error && data && Array.isArray(data) && data.length > 0) {
        const rows = data as unknown as DbTable[]
        const filtered = rows.filter(t.isActive)
        return { tables: filtered.map(normalizeDbTable), source: t.table }
      }
    } catch {}
  }

  // fallback：與舊版相同的靜態配置（若 DB 尚未建表）
  const FALLBACK: TableOut[] = [
    { id: 1, name: '1號桌', capacity: 2, type: '雙人桌' },
    { id: 2, name: '2號桌', capacity: 2, type: '雙人桌' },
    { id: 3, name: '3號桌', capacity: 4, type: '四人桌' },
    { id: 4, name: '4號桌', capacity: 4, type: '四人桌' },
    { id: 5, name: '5號桌', capacity: 4, type: '四人桌' },
    { id: 6, name: '6號桌', capacity: 6, type: '六人桌' },
    { id: 7, name: '7號桌', capacity: 6, type: '六人桌' },
    { id: 8, name: '8號桌', capacity: 8, type: '八人桌' },
  ]
  return { tables: FALLBACK, source: 'fallback' }
}

// GET - 取得可用桌位
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateTime = searchParams.get('datetime');
    const partySize = parseInt(searchParams.get('partySize') || '1');
  const debug = searchParams.get('debug') === '1'
  const excludeId = searchParams.get('excludeId') || undefined

    if (!dateTime) {
      return NextResponse.json({ error: '請提供日期時間' }, { status: 400 });
    }

  const supabase = supabaseServer();
    
  // 目標時間與封鎖規則（前90分鐘、後120分鐘）
  const targetTime = new Date(dateTime);
  const desiredStart = targetTime.getTime()
  const PRE_BLOCK_MS = 90 * 60 * 1000
  const POST_BLOCK_MS = 120 * 60 * 1000
  const SLOT_MS = 30 * 60 * 1000 // 與營業設定一致；若要更動可改讀 settings
  const slotStart = Math.floor(desiredStart / SLOT_MS) * SLOT_MS
  const slotEnd = slotStart + SLOT_MS
  // 為了查詢，擴大範圍以涵蓋可能影響的預約
  const startTime = new Date(desiredStart - POST_BLOCK_MS) // 最多往前 120 分鐘即可涵蓋反向判定
  const endTime = new Date(desiredStart + POST_BLOCK_MS)   // 往後 120 分鐘

  // 查詢附近時段的預約（用於計算封鎖與容量）。
    const restaurantId = process.env.RESTAURANT_ID || null
    let rQuery = supabase
      .from('table_reservations')
      .select('id, table_id, party_size, reservation_time, duration_minutes, status')
      .gte('reservation_time', startTime.toISOString())
      .lte('reservation_time', endTime.toISOString())
      .in('status', ['confirmed', 'pending', 'seated'])

    if (restaurantId) rQuery = rQuery.eq('restaurant_id', restaurantId)

  const { data: reservationsRaw, error } = await rQuery;

    if (error) {
      console.error('查詢預約錯誤:', error);
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 });
    }

    // 讀取可用桌位（過濾維修/停用/保留）
    const { tables: activeTables, source } = await loadActiveTables()

    // 依規則建立封鎖表：若 desiredStart ∈ [start-90m, start+120m) 則封鎖該 reservation 的 table_id
  const reservations = (reservationsRaw || []).filter((r: any) => excludeId ? String(r.id) !== String(excludeId) : true)
  const blockedIds = new Set<string | number>()
  const overlapping = (reservations || []).filter((r: any) => {
      const s = new Date(r.reservation_time).getTime()
      const blockStart = s - PRE_BLOCK_MS
      const blockEnd = s + POST_BLOCK_MS
      return desiredStart >= blockStart && desiredStart < blockEnd
    })
    for (const r of overlapping) {
      if (r && r.table_id) blockedIds.add(r.table_id)
    }

    // 30 分鐘僅接待一組：同一個 slot 內若已存在任一預約，該時段即不可接受新預約
    const slotTaken = (reservations || []).some((r:any) => {
      if (!r) return false
      const s = new Date(r.reservation_time).getTime()
      return s >= slotStart && s < slotEnd && ['confirmed','pending','seated'].includes(String(r.status||'').toLowerCase())
    })

  const freeTables = activeTables.filter(t => !blockedIds.has(t.id))
  const totalCapacity = freeTables.reduce((sum, t) => sum + toNumber(t.capacity, 0), 0)
    // 只統計未指派桌位的重疊預約，作為保守容量提示（不再作為 gate 條件）
    const totalBooked = overlapping
      .filter((r: any) => !r.table_id)
      .reduce((sum: number, r: any) => sum + toNumber(r.party_size, 0), 0)
    const availableCapacity = Math.max(0, totalCapacity - totalBooked)

    // 篩選適合桌位（活躍且未被佔用的桌位中容量 >= partySize）
  const suitableTables = freeTables
      .filter(t => (t.capacity || 0) >= partySize)
      .sort((a, b) => a.capacity - b.capacity)

  // 7-8 位特例：若沒有單桌滿足，允許 6+2 的雙桌組合
  let hasAvailable = !slotTaken && suitableTables.length > 0
  let combo: { primary: TableOut; secondary: TableOut } | null = null
  if (!hasAvailable && !slotTaken && partySize >= 7) {
      const sixes = freeTables.filter(t => (t.capacity || 0) >= 6).sort((a,b)=>a.capacity-b.capacity)
      const twos = freeTables.filter(t => (t.capacity || 0) >= 2).sort((a,b)=>a.capacity-b.capacity)
      for (const t6 of sixes) {
        const t2 = twos.find(t => String(t.id) !== String(t6.id))
        if (t2) { combo = { primary: t6, secondary: t2 }; hasAvailable = true; break }
      }
    }

    return NextResponse.json({
      availableTables: hasAvailable ? (combo ? [combo.primary, combo.secondary] : suitableTables) : [],
      hasAvailable,
      availableCapacity,
      totalBooked,
      totalCapacity,
      blockedTableCount: blockedIds.size,
      source,
      ...(debug ? { debug: { freeTableCount: freeTables.length, activeTableCount: activeTables.length } } : {}),
    message: hasAvailable 
    ? (combo
      ? `找到 6+2 雙桌組合（${combo.primary.name}+${combo.secondary.name}），剩餘容量(估) ${Math.max(0, availableCapacity)} 人（封鎖 ${blockedIds.size} 張；來源：${source}）`
      : `找到 ${suitableTables.length} 個適合桌位，剩餘容量(估) ${Math.max(0, availableCapacity)} 人（封鎖 ${blockedIds.size} 張；來源：${source}）`)
    : (slotTaken
      ? `該 30 分鐘時段已有預約，暫不接受新預約（封鎖 ${blockedIds.size} 張；來源：${source}）`
      : `該時段容量不足（封鎖 ${blockedIds.size} 張、未指派重疊預約 ${Math.max(0, totalBooked)} 人；來源：${source}）`)
    });

  } catch (error) {
    console.error('桌位查詢錯誤:', error);
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic'
