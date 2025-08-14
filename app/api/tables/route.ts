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
      isActive: (r) => truthy(r.is_active, true) && normalizeStatus(r.status) === 'available',
    },
    {
      table: 'restaurant_tables',
      isActive: (r) => truthy(r.is_active, true) && normalizeStatus(r.status) === 'available',
    },
    {
      table: 'dining_tables',
      isActive: (r) => truthy(r.is_active, true) && normalizeStatus(r.status) === 'available',
    },
    {
      table: 'tables_v2',
      isActive: (r) => truthy(r.is_active, true) && normalizeStatus(r.status) === 'available',
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

    if (!dateTime) {
      return NextResponse.json({ error: '請提供日期時間' }, { status: 400 });
    }

  const supabase = supabaseServer();
    
    // 計算30分鐘前後的時間範圍
    const targetTime = new Date(dateTime);
    const startTime = new Date(targetTime.getTime() - 30 * 60 * 1000); // 30分鐘前
    const endTime = new Date(targetTime.getTime() + 30 * 60 * 1000);   // 30分鐘後

    // 查詢該時段已有的預約總數和人數（餐廳可選）
    const restaurantId = process.env.RESTAURANT_ID || null
    let rQuery = supabase
      .from('table_reservations')
      .select('party_size')
      .gte('reservation_time', startTime.toISOString())
      .lte('reservation_time', endTime.toISOString())
      .in('status', ['confirmed', 'pending'])

    if (restaurantId) rQuery = rQuery.eq('restaurant_id', restaurantId)

    const { data: reservations, error } = await rQuery;

    if (error) {
      console.error('查詢預約錯誤:', error);
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 });
    }

    // 讀取可用桌位（過濾維修/停用/保留）
    const { tables: activeTables, source } = await loadActiveTables()

    // 查找該視窗內已被佔用的桌位（以 table_id 為準）
    let blockedIds = new Set<string | number>()
    try {
      let rq2 = supabase
        .from('table_reservations')
        .select('table_id,reservation_time,status')
        .gte('reservation_time', startTime.toISOString())
        .lte('reservation_time', endTime.toISOString())
        .in('status', ['confirmed', 'pending'])
      if (restaurantId) rq2 = rq2.eq('restaurant_id', restaurantId)
      const { data: occ } = await rq2
      for (const r of (occ || [])) {
        if (r && r.table_id) blockedIds.add(r.table_id)
      }
    } catch {}

    const freeTables = activeTables.filter(t => !blockedIds.has(t.id))
  const totalCapacity = freeTables.reduce((sum, t) => sum + toNumber(t.capacity, 0), 0)
  const totalBooked = (reservations || []).reduce((sum: number, r: any) => sum + toNumber(r.party_size, 0), 0)
    const availableCapacity = Math.max(0, totalCapacity - totalBooked)

    // 篩選適合桌位（活躍且未被佔用的桌位中容量 >= partySize）
    const suitableTables = freeTables
      .filter(t => (t.capacity || 0) >= partySize)
      .sort((a, b) => a.capacity - b.capacity)

    const hasAvailable = availableCapacity >= partySize && suitableTables.length > 0;

    return NextResponse.json({
      availableTables: hasAvailable ? suitableTables : [],
      hasAvailable,
      availableCapacity,
      totalBooked,
      totalCapacity,
      blockedTableCount: blockedIds.size,
      source,
      ...(debug ? { debug: { freeTableCount: freeTables.length, activeTableCount: activeTables.length } } : {}),
      message: hasAvailable 
        ? `找到 ${suitableTables.length} 個適合桌位，剩餘容量 ${Math.max(0, availableCapacity)} 人（排除維修/停用與已占用 ${blockedIds.size} 張；來源：${source}）` 
        : `該時段容量不足（已預約 ${Math.max(0, totalBooked)} 人；排除維修/停用與已占用 ${blockedIds.size} 張；來源：${source}）`
    });

  } catch (error) {
    console.error('桌位查詢錯誤:', error);
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic'
