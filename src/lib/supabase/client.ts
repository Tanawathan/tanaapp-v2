import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, anon, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
})

export function supabaseServer() {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || anon
  return createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } })
}
