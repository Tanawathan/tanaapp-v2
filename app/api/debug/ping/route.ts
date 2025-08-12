import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/client'

export async function GET() {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    RESTAURANT_ID: process.env.RESTAURANT_ID || null,
  }
  try {
    const sb = supabaseServer()
    const { count, error } = await sb
      .from('table_reservations')
      .select('*', { head: true, count: 'exact' })

    if (error) {
      return NextResponse.json({ ok: false, env, error: { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code } }, { status: 500 })
    }

    return NextResponse.json({ ok: true, env, reservations_count: count ?? 0 })
  } catch (e) {
    return NextResponse.json({ ok: false, env, error: { message: (e as Error).message } }, { status: 500 })
  }
}
