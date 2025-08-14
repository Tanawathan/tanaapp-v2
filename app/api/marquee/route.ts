import { NextResponse } from 'next/server'
import { supabaseServer } from '../../../src/lib/supabase/client'

export const dynamic = 'force-dynamic'

type Marquee = {
  id?: string
  message: string
  href?: string | null
  priority?: number | null
  is_active?: boolean | null
  starts_at?: string | null
  ends_at?: string | null
  created_at?: string
  updated_at?: string
}

function isActiveNow(row: Marquee) {
  if (row.is_active === false) return false
  const now = new Date()
  const startOk = !row.starts_at || new Date(row.starts_at) <= now
  const endOk = !row.ends_at || new Date(row.ends_at) >= now
  return startOk && endOk
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Number(url.searchParams.get('limit') || '') || 20

  const s = supabaseServer()
  const { data, error } = await s
    .from('marquees')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    // 若資料表不存在，回傳初始化指引
    const hint = `請在 Supabase SQL Editor 執行下列指令建立資料表:\n\n` +
`create table if not exists public.marquees (\n` +
`  id uuid primary key default gen_random_uuid(),\n` +
`  message text not null,\n` +
`  href text,\n` +
`  priority int default 0,\n` +
`  is_active boolean default true,\n` +
`  starts_at timestamptz,\n` +
`  ends_at timestamptz,\n` +
`  created_at timestamptz default now(),\n` +
`  updated_at timestamptz default now()\n` +
`);\n\n` +
`-- 讓 updated_at 自動更新\n` +
`create or replace function public.set_updated_at() returns trigger as $$\n` +
`begin\n` +
`  new.updated_at = now();\n` +
`  return new;\n` +
`end;\n` +
`$$ language plpgsql;\n` +
`drop trigger if exists set_marquees_updated_at on public.marquees;\n` +
`create trigger set_marquees_updated_at before update on public.marquees\n` +
`for each row execute function public.set_updated_at();\n`

    return NextResponse.json({ items: [], error: 'marquees table missing', setup: hint }, { status: 501 })
  }

  const rows = (data || []).filter(isActiveNow)
  return NextResponse.json({ items: rows })
}

// 建立或更新一筆公告（若 body.id 存在則更新）
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Partial<Marquee> | null
  if (!body || !body.message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const row: Partial<Marquee> = {
    message: body.message,
    href: body.href ?? null,
    priority: body.priority ?? 0,
    is_active: body.is_active ?? true,
    starts_at: body.starts_at ?? null,
    ends_at: body.ends_at ?? null,
  }

  const s = supabaseServer()
  if (body.id) {
    const { data, error } = await s
      .from('marquees')
      .update(row)
      .eq('id', body.id)
      .select('*')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data })
  }

  const { data, error } = await s
    .from('marquees')
    .insert(row)
    .select('*')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
