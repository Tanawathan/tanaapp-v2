import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const rid = process.env.RESTAURANT_ID || ''

  // 做一個最小的權限檢查：嘗試以 server 用戶端 select 1 from customer_users limit 1（不拋錯即可）
  let canReadCustomerUsers = false
  let readError: any = null
  try {
    if (url && (service || anon)) {
      const sb = createClient(url, service || anon, { auth: { autoRefreshToken: false, persistSession: false } })
      const { error } = await sb.from('customer_users').select('id').limit(1)
      if (!error) canReadCustomerUsers = true
      else readError = { code: (error as any).code, message: (error as any).message }
    }
  } catch (e: any) {
    readError = { message: String(e?.message || e) }
  }

  return NextResponse.json({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: !!url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!anon,
      SUPABASE_SERVICE_ROLE_KEY: !!service,
      RESTAURANT_ID: !!rid,
    },
    serverUsesServiceRole: !!service,
    canReadCustomerUsers,
    readError,
  })
}
