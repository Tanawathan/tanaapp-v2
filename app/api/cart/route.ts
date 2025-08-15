import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

type CartItem = {
  id: string
  name: string
  price: number
  quantity: number
  image_url?: string
  category?: string
  special_instructions?: string
}

type CartState = {
  items: CartItem[]
  total: number
  itemCount: number
}

const CART_COOKIE = 'tana-cart'
const DEFAULT_CART: CartState = { items: [], total: 0, itemCount: 0 }

function calc(cart: CartItem[]): { total: number; itemCount: number } {
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0)
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  return { total, itemCount }
}

function readCart(): CartState {
  try {
    const c = cookies().get(CART_COOKIE)?.value
    if (!c) return DEFAULT_CART
    const parsed = JSON.parse(c) as CartState
    if (!parsed || !Array.isArray(parsed.items)) return DEFAULT_CART
    const { total, itemCount } = calc(parsed.items)
    return { items: parsed.items, total, itemCount }
  } catch {
    return DEFAULT_CART
  }
}

function writeCart(cart: CartItem[]) {
  const value: CartState = { items: cart, ...calc(cart) }
  cookies().set(CART_COOKIE, JSON.stringify(value), {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
  return value
}

export async function GET() {
  const cart = readCart()
  return NextResponse.json(cart)
}

export async function POST(req: Request) {
  // Add item
  const body = await req.json().catch(() => null) as Partial<CartItem> | null
  if (!body || !body.id || !body.name || typeof body.price !== 'number') {
    return NextResponse.json({ error: 'id, name, price are required' }, { status: 400 })
  }
  const quantity = Math.max(1, Number(body.quantity ?? 1))
  const current = readCart().items
  const idx = current.findIndex(i => i.id === body.id)
  if (idx >= 0) {
    current[idx] = { ...current[idx], quantity: current[idx].quantity + quantity }
  } else {
    current.push({ id: String(body.id), name: String(body.name), price: Number(body.price), quantity, image_url: body.image_url, category: body.category, special_instructions: body.special_instructions })
  }
  const saved = writeCart(current)
  return NextResponse.json(saved)
}

export async function PUT(req: Request) {
  // Update quantity or replace items
  const body = await req.json().catch(() => null) as any
  const current = readCart().items

  if (body && Array.isArray(body.items)) {
    const sanitized: CartItem[] = body.items
      .filter((i: any) => i && i.id && i.name && typeof i.price === 'number')
      .map((i: any) => ({ id: String(i.id), name: String(i.name), price: Number(i.price), quantity: Math.max(1, Number(i.quantity || 1)), image_url: i.image_url, category: i.category, special_instructions: i.special_instructions }))
    const saved = writeCart(sanitized)
    return NextResponse.json(saved)
  }

  if (!body || !body.id || typeof body.quantity !== 'number') {
    return NextResponse.json({ error: 'id and quantity are required' }, { status: 400 })
  }

  const idx = current.findIndex(i => i.id === body.id)
  if (idx < 0) {
    return NextResponse.json({ error: 'item not found' }, { status: 404 })
  }
  const qty = Number(body.quantity)
  if (qty <= 0) {
    current.splice(idx, 1)
  } else {
    current[idx] = { ...current[idx], quantity: qty }
  }
  const saved = writeCart(current)
  return NextResponse.json(saved)
}

export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const hasBody = (req.headers.get('content-length') ?? '0') !== '0'
  const body = hasBody ? await req.json().catch(() => null) : null
  const current = readCart().items

  const targetId = id || (body && body.id)
  if (!targetId) {
    // clear all
    const cleared = writeCart([])
    return NextResponse.json(cleared)
  }

  const next = current.filter(i => i.id !== String(targetId))
  const saved = writeCart(next)
  return NextResponse.json(saved)
}
