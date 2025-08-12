import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../src/lib/supabase/client';

// 桌位設定 - 可以後續移至資料庫管理
const TABLES = [
  { id: 1, name: '1號桌', capacity: 2, type: '雙人桌' },
  { id: 2, name: '2號桌', capacity: 2, type: '雙人桌' },
  { id: 3, name: '3號桌', capacity: 4, type: '四人桌' },
  { id: 4, name: '4號桌', capacity: 4, type: '四人桌' },
  { id: 5, name: '5號桌', capacity: 4, type: '四人桌' },
  { id: 6, name: '6號桌', capacity: 6, type: '六人桌' },
  { id: 7, name: '7號桌', capacity: 6, type: '六人桌' },
  { id: 8, name: '8號桌', capacity: 8, type: '八人桌' },
];

// GET - 取得可用桌位
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateTime = searchParams.get('datetime');
    const partySize = parseInt(searchParams.get('partySize') || '1');

    if (!dateTime) {
      return NextResponse.json({ error: '請提供日期時間' }, { status: 400 });
    }

    const supabase = supabaseServer();
    
    // 計算30分鐘前後的時間範圍
    const targetTime = new Date(dateTime);
    const startTime = new Date(targetTime.getTime() - 30 * 60 * 1000); // 30分鐘前
    const endTime = new Date(targetTime.getTime() + 30 * 60 * 1000);   // 30分鐘後

    // 查詢該時段已有的預約總數和人數
    const { data: reservations, error } = await supabase
      .from('table_reservations')
      .select('party_size')
      .gte('reservation_time', startTime.toISOString())
      .lte('reservation_time', endTime.toISOString())
      .in('status', ['confirmed', 'pending']);

    if (error) {
      console.error('查詢預約錯誤:', error);
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 });
    }

    // 計算已預約的總人數
    const totalBooked = reservations?.reduce((sum: number, r: any) => sum + (r.party_size || 0), 0) || 0;
    
    // 餐廳總容量
    const totalCapacity = 2 + 2 + 4 + 4 + 4 + 6 + 6 + 8; // 36人
    
    // 檢查是否有足夠容量
    const availableCapacity = totalCapacity - totalBooked;
    
    // 篩選適合的桌位
    const suitableTables = TABLES.filter(table => table.capacity >= partySize);
    
    // 按容量排序，優先安排最適合的桌位
    suitableTables.sort((a, b) => a.capacity - b.capacity);

    const hasAvailable = availableCapacity >= partySize && suitableTables.length > 0;

    return NextResponse.json({
      availableTables: hasAvailable ? suitableTables : [],
      hasAvailable,
      availableCapacity,
      totalBooked,
      totalCapacity,
      message: hasAvailable 
        ? `找到 ${suitableTables.length} 個適合桌位，剩餘容量 ${availableCapacity} 人` 
        : `該時段容量不足（已預約 ${totalBooked} 人，剩餘容量 ${availableCapacity} 人）`
    });

  } catch (error) {
    console.error('桌位查詢錯誤:', error);
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 });
  }
}
