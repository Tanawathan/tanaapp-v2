import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/client'

export async function GET() {
  try {
    const sb = supabaseServer()
    
    // 嘗試查詢 customers 表的結構
    const { data, error } = await sb
      .from('customers')
      .select('*')
      .limit(1)
    
    return NextResponse.json({ 
      message: 'customers table exists',
      sample: data,
      error: error?.message 
    })
  } catch (e) {
    return NextResponse.json({ 
      error: (e as Error).message,
      message: 'Failed to query customers table'
    })
  }
}
