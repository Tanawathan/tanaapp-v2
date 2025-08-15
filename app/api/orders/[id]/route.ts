import { NextResponse } from 'next/server'
import { supabaseServer } from '../../../../src/lib/supabase/client'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const id = ctx.params.id
  const s = supabaseServer()
  const { data: order, error } = await s.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle()
  if (error || !order) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  return NextResponse.json({ order })
}

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const id = ctx.params.id
  const body = await req.json().catch(() => null) as any
  const s = supabaseServer()
  const { data, error } = await s.from('orders').update(body ?? {}).eq('id', id).select('*').maybeSingle()
  if (error || !data) {
    return NextResponse.json({ error: 'update failed' }, { status: 500 })
  }
  return NextResponse.json({ order: data })
}
