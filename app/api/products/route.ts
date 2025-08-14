import { NextResponse } from 'next/server'
import { supabaseServer } from '../../../src/lib/supabase/client'

type DbProduct = {
	id: string
	name: string
	description?: string | null
	price?: number | null
	image_url?: string | null
	is_available?: boolean | null
	// 資料庫可能有不同欄位名稱保存分類
	category?: string | null
	category_id?: string | null
	categoryId?: string | null
}

function normalizeCategorySlug(value?: string | null): string | null {
	if (!value) return null
	const v = String(value).trim().toLowerCase()
	if (!v || v === 'all' || v === '全部') return 'all'
	if ([
		'appetizer', '前菜', '開胃菜', '加點', '小點', '單點', '副餐', '小菜', '配菜', 'side', 'sides'
	].includes(v)) return 'appetizer'
	if ([
		'main', '主餐', '主菜', '套餐', '主食', '便當', '合菜'
	].includes(v)) return 'main'
	if ([
		'dessert', '甜點', '點心', '甜食', '甜品'
	].includes(v)) return 'dessert'
	if ([
		'beverage', '飲品', '飲料', '飲', '茶飲', '咖啡'
	].includes(v)) return 'beverage'
	return v
}

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
	const url = new URL(req.url)
	const categoryParam = url.searchParams.get('category')
	const search = (url.searchParams.get('search') || '').trim()
	const limit = Number(url.searchParams.get('limit') || '') || undefined

	const s = supabaseServer()

	// 先抓所有產品，再在程式端處理彈性過濾（避免 SQL 組合造成錯誤）
	const { data: allProducts, error: prodErr } = await s
		.from('products')
		.select('*')
		.limit(limit ?? 1000)

	if (prodErr) {
		console.error('[products.GET] supabase products error:', prodErr)
		return NextResponse.json({ products: [], error: 'failed to fetch products' }, { status: 500 })
	}

	let products = (allProducts || []) as DbProduct[]

	// 分類過濾
	if (categoryParam && !['all', '全部'].includes(categoryParam)) {
		const isUuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(categoryParam)
		let acceptedIds = new Set<string>()
		let acceptedSlugs = new Set<string>()

		if (isUuid) {
			// 若傳入的是分類 UUID，順便查出該分類名稱以支援名稱/slug 比對
			const { data: cat, error: catErr } = await s
				.from('categories')
				.select('id,name')
				.eq('id', categoryParam)
				.maybeSingle()
			if (catErr) console.warn('[products.GET] category lookup error:', catErr)
			if (cat?.id) acceptedIds.add(cat.id)
			if (cat?.name) {
				const slug = normalizeCategorySlug(cat.name)
				if (slug) acceptedSlugs.add(slug)
				acceptedSlugs.add(cat.name.trim().toLowerCase())
			}
			// 同時允許直接用 id 過濾（若產品直接儲存 id）
			acceptedIds.add(categoryParam)
		} else {
			// 文字/slug 形式
			const slug = normalizeCategorySlug(categoryParam)
			if (slug) acceptedSlugs.add(slug)
			acceptedSlugs.add(categoryParam.trim().toLowerCase())
		}

		products = products.filter((p) => {
			const key = (p.category ?? p.category_id ?? p.categoryId ?? '').toString().trim()
			if (!key) return false
			// 直接 id 比對
			if (acceptedIds.size && acceptedIds.has(key)) return true
			// 名稱/slug 比對
			const kSlug = normalizeCategorySlug(key)
			if (kSlug && acceptedSlugs.has(kSlug)) return true
			if (acceptedSlugs.has(key.toLowerCase())) return true
			return false
		})
	}

	// 搜尋過濾
	if (search) {
		const sLower = search.toLowerCase()
		products = products.filter((p) =>
			(p.name && p.name.toLowerCase().includes(sLower)) ||
			(p.description && p.description.toLowerCase().includes(sLower))
		)
	}

	// 統一輸出格式
	const out = products.map((p) => ({
		id: p.id,
		name: p.name,
		description: p.description ?? '',
		price: p.price ?? 0,
		image_url: p.image_url ?? null,
		is_available: p.is_available !== false,
		category: (p.category ?? p.category_id ?? p.categoryId ?? '') as string,
	}))

	return NextResponse.json({ products: out })
}

export async function POST(req: Request) {
	const body = await req.json().catch(() => null)
	if (!body || !body.name) {
		return NextResponse.json({ error: 'name is required' }, { status: 400 })
	}
	const s = supabaseServer()
	const { data, error } = await s.from('products').insert(body).select('*').maybeSingle()
	if (error) {
		console.error('[products.POST] insert error:', error)
		return NextResponse.json({ error: 'failed to create product' }, { status: 500 })
	}
	return NextResponse.json({ product: data })
}

