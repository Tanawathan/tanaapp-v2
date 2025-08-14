import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/client'

export async function GET() {
  try {
    const sb = supabaseServer()
    
    // 嘗試查詢不同的資料表來了解結構
    const tables = [
      'table_reservations', 
      'customers', 
      'users',
      'profiles',
      'customer_profiles',
      // 營業資訊表（若不存在會回報 exists=false）
      'restaurant_settings',
      'restaurant_closures',
    ]
    
    const results: any = {}
    
    for (const table of tables) {
      try {
        const { data, error } = await sb
          .from(table)
          .select('*')
          .limit(1)
        
        results[table] = {
          exists: true,
          error: error?.message,
          sample: data?.[0] || 'no data'
        }
      } catch (e) {
        results[table] = {
          exists: false,
          error: (e as Error).message
        }
      }
    }
    
    return NextResponse.json({ tables: results })
  } catch (e) {
    return NextResponse.json({ 
      error: (e as Error).message,
      message: 'Failed to query tables'
    })
  }
}
