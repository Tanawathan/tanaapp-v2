'use client'

import TopNavbar from '../../components/TopNavbar'
import CartItem from '../../components/CartItem'
import CartSummary from '../../components/CartSummary'
import { useCart } from '../../src/contexts/CartContext'
import { ShoppingCartIcon } from '@heroicons/react/24/outline'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Product = {
	id: string
	name: string
	description?: string
	price: number
	image_url?: string | null
	category?: string
	is_available?: boolean
}

type Category = {
	id: string
	name: string
	icon: string
}

export default function OrderPage() {
	const { state, addItem, clearCart } = useCart()
	const router = useRouter()
	const [syncing, setSyncing] = useState(false)
	const [checkingOut, setCheckingOut] = useState(false)
	const [checkoutError, setCheckoutError] = useState<string | null>(null)
	const [orderInfo, setOrderInfo] = useState<any>(null)

	// 菜單資料（單次載入，頁面分段顯示）
	const [products, setProducts] = useState<Product[]>([])
	const [categories, setCategories] = useState<Category[]>([])
	const [loadingProducts, setLoadingProducts] = useState(true)
	const [loadingCategories, setLoadingCategories] = useState(true)
	const [cartOpenMobile, setCartOpenMobile] = useState(false)

		useEffect(() => {
			// 載入分類
			const loadCategories = async () => {
				try {
					setLoadingCategories(true)
					const res = await fetch('/api/categories')
					if (res.ok) {
						const data = await res.json()
						setCategories(data.categories || [])
					} else {
						setCategories([
							{ id: 'all', name: '全部', icon: '🍽️' },
							{ id: 'appetizer', name: '開胃菜', icon: '🥗' },
							{ id: 'main', name: '主餐', icon: '🍖' },
							{ id: 'dessert', name: '甜點', icon: '🍰' },
							{ id: 'beverage', name: '飲品', icon: '🥤' },
						])
					}
				} finally {
					setLoadingCategories(false)
				}
			}
			loadCategories()
		}, [])

		useEffect(() => {
			// 載入所有產品（之後用分類分段顯示）
			const loadProducts = async () => {
				try {
					setLoadingProducts(true)
					const res = await fetch('/api/products')
					if (res.ok) {
						const data = await res.json()
						setProducts((data.products || []).filter((p: Product) => p.is_available !== false))
					} else {
						setProducts([])
					}
				} finally {
					setLoadingProducts(false)
				}
			}
			loadProducts()
		}, [])

	const addToCart = (p: Product) => {
		addItem({ id: p.id, name: p.name, price: p.price, image_url: p.image_url || undefined, category: p.category })
	}

		// 購物車數量快取
		const qtyById = useMemo(() => {
			const m = new Map<string, number>()
			state.items.forEach(i => m.set(i.id, i.quantity))
			return m
		}, [state.items])

		// 類別與產品對應（以 API 類別順序為主，排除 'all'，僅顯示有商品的段落）
		const isUuid = (v?: string) => !!v && /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(v)
		const normalize = (value?: string | null) => {
			const v = String(value || '').trim().toLowerCase()
			if (!v || v === 'all' || v === '全部') return 'all'
			if ([ 'appetizer','前菜','開胃菜','加點','小點','單點','副餐','小菜','配菜','side','sides' ].includes(v)) return 'appetizer'
			if ([ 'main','主餐','主菜','套餐','主食','便當','合菜' ].includes(v)) return 'main'
			if ([ 'dessert','甜點','點心','甜食','甜品' ].includes(v)) return 'dessert'
			if ([ 'beverage','飲品','飲料','飲','茶飲','咖啡' ].includes(v)) return 'beverage'
			return v
		}

		const sections = useMemo(() => {
			const cats = (categories || []).filter(c => c.id !== 'all')
			const pickForCat = (c: Category) => products.filter(p => {
				const pk = p.category || ''
				if (isUuid(pk)) return pk === c.id
				return normalize(pk) === normalize(c.name)
			})
			const list: { cat: Category, items: Product[] }[] = []
			const used = new Set<string>()
			cats.forEach(c => {
				const items = pickForCat(c)
				if (items.length) {
					list.push({ cat: c, items })
					items.forEach(i => used.add(i.id))
				}
			})
			// 其他未歸類的商品
			const others = products.filter(p => !used.has(p.id))
			if (others.length) {
				list.push({ cat: { id: 'others', name: '其他', icon: '🍽️' }, items: others })
			}
			return list
		}, [categories, products])

	// 同步購物車到後端 Cookie API
	const syncCartToApi = async () => {
		try {
			setSyncing(true)
			setCheckoutError(null)
			const res = await fetch('/api/cart', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ items: state.items }),
			})
			if (!res.ok) throw new Error('同步失敗')
		} catch (e: any) {
			setCheckoutError(e?.message || '同步購物車失敗')
		} finally {
			setSyncing(false)
		}
	}

	// 建立訂單（結帳）
	const handleCheckout = async () => {
		if (state.itemCount === 0) return
		try {
			setCheckingOut(true)
			setCheckoutError(null)

			const subtotal = state.total
			const service_charge = 0
			const total_amount = subtotal

			const payload = {
				order_type: 'dine_in',
				subtotal,
				discount_amount: 0,
				tax_amount: 0,
			service_charge,
				total_amount,
				items: state.items.map(i => ({
					product_name: i.name,
					quantity: i.quantity,
					unit_price: i.price,
					total_price: i.price * i.quantity,
					special_instructions: i.special_instructions ?? null,
				})),
				source: 'web',
			}

			await fetch('/api/cart', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ items: state.items }),
			}).catch(() => {})

			const res = await fetch('/api/orders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})
			if (!res.ok) throw new Error('建立訂單失敗')
			const data = await res.json()
			setOrderInfo(data.order)

			clearCart()
			await fetch('/api/cart', { method: 'DELETE' }).catch(() => {})
			// 導向訂單確認頁
			router.push(`/orders/${data.order.id}`)
		} catch (e: any) {
			setCheckoutError(e?.message || '結帳失敗')
		} finally {
			setCheckingOut(false)
		}
	}

	return (
		<div className="min-h-screen pixel-bg">
			<TopNavbar />

					<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 scroll-smooth">
						{/* 標題 */}
						<div id="top" className="text-center mb-6">
							<h1 className="text-4xl font-bold text-amber-900 mb-2 pixel-art">🛒 線上點餐</h1>
							<p className="text-amber-700 pixel-art">依分類瀏覽，一頁完成點餐</p>
						</div>

						{/* 分類導引列（置頂、可捲動） */}
						<div className="sticky top-0 z-20 bg-[rgb(255,251,235)]/90 backdrop-blur supports-[backdrop-filter]:bg-[rgb(255,251,235)]/70 border-b-4 border-amber-200 mb-4">
							<div className="flex gap-2 overflow-x-auto px-2 py-2">
								<a href="#top" className="pixel-chip px-3 py-2 whitespace-nowrap">🍽️ 全部</a>
								{loadingCategories ? (
									<span className="px-3 py-2 text-sm">載入分類中…</span>
								) : (
									sections.map(s => (
										<a key={s.cat.id} href={`#sec-${s.cat.id}`} className="pixel-btn px-3 py-2 whitespace-nowrap">
											<span className="mr-1">{s.cat.icon}</span>{s.cat.name}
										</a>
									))
								)}
							</div>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* 左側：一頁式分段菜單 */}
							<div className="lg:col-span-2 space-y-8">
								{loadingProducts ? (
									<div className="flex justify-center items-center h-64">
										<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
									</div>
								) : sections.length === 0 ? (
									<div className="text-center py-12">
										<div className="text-6xl mb-4">🍽️</div>
										<h3 className="font-pixel text-xl mb-2">暫無菜品</h3>
										<p className="text-sm">請稍後再試</p>
									</div>
								) : (
									sections.map(section => (
										<section key={section.cat.id} id={`sec-${section.cat.id}`} className="scroll-mt-24">
											<div className="flex items-center gap-2 mb-3">
												<span className="text-2xl">{section.cat.icon}</span>
												<h2 className="font-pixel text-2xl">{section.cat.name}</h2>
											</div>
																<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
												{section.items.map(p => (
																		<div key={p.id} className="pixel-card overflow-hidden">
																			{/* Mobile: compact row; Desktop: classic card */}
																			<div className="p-3 md:p-0">
																											<div className="relative flex items-center gap-3 md:hidden">
																					<div className="w-16 h-16 bg-gray-100 border-2 border-black overflow-hidden flex items-center justify-center">
																						{p.image_url ? (
																							<img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
																						) : (
																							<span className="text-2xl">🍽️</span>
																						)}
																					</div>
																					<div className="flex-1 min-w-0">
																													<div className="flex items-center justify-between gap-2">
																														<h3 className="font-pixel text-lg truncate">{p.name}</h3>
																														<span className="text-base font-pixel whitespace-nowrap">${p.price}</span>
																						</div>
																						{p.description ? (
																							<p className="text-xs text-gray-600 line-clamp-1 mt-1">{p.description}</p>
																						) : null}
																					</div>
																					<div>
																						<button
																							onClick={() => addToCart(p)}
																							disabled={p.is_available === false}
																														className={`${p.is_available !== false ? 'pixel-btn' : 'pixel-chip opacity-60 cursor-not-allowed'} px-3 py-1 text-sm whitespace-nowrap`}
																						>
																							{p.is_available !== false ? '加入' : '缺貨'}
																						</button>
																					</div>
																												{/* 單品數量徽章 */}
																												{(qtyById.get(p.id) || 0) > 0 && (
																													<span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 border-2 border-black">
																														{qtyById.get(p.id)}
																													</span>
																												)}
																				</div>

																				{/* Desktop / tablet card */}
																				<div className="hidden md:block">
																					<div className="aspect-video bg-gray-100 relative border-b-3 border-black">
																						{p.image_url ? (
																							<img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
																						) : (
																							<div className="w-full h-full flex items-center justify-center">
																								<span className="text-4xl">🍽️</span>
																							</div>
																						)}
																					</div>
																					<div className="p-4">
																						<div className="flex justify-between items-start mb-2">
																							<h3 className="font-pixel text-lg">{p.name}</h3>
																							<span className="text-lg font-pixel">${p.price}</span>
																						</div>
																						{p.description ? (
																							<p className="text-sm mb-3 line-clamp-2">{p.description}</p>
																						) : null}
																						<button
																							onClick={() => addToCart(p)}
																							disabled={p.is_available === false}
																							className={`w-full py-2 px-4 ${p.is_available !== false ? 'pixel-btn' : 'pixel-chip opacity-60 cursor-not-allowed'}`}
																						>
																							{p.is_available !== false ? '加入購物車' : '暫時缺貨'}
																						</button>
																					</div>
																				</div>
																			</div>
																		</div>
												))}
											</div>
										</section>
									))
								)}
							</div>

							{/* 右側：購物車與結帳（桌機顯示） */}
							<div className="space-y-6 hidden lg:block">
								<CartSummary />

								<div className="bg-white border-4 border-amber-400 rounded-2xl p-4 pixel-art shadow-pixel">
									{checkoutError && (
										<div className="mb-3 text-red-700 bg-red-100 border-2 border-red-300 rounded px-3 py-2">
											{checkoutError}
										</div>
									)}

									{orderInfo ? (
										<div className="mb-3 text-green-800 bg-green-100 border-2 border-green-300 rounded px-3 py-2">
											訂單建立成功！訂單編號：
											<span className="font-bold"> {orderInfo.order_number}</span>
										</div>
									) : null}

									<div className="flex flex-col gap-3">
										<button
											onClick={syncCartToApi}
											disabled={state.itemCount === 0 || syncing}
											className="px-4 py-2 bg-amber-100 text-amber-800 border-2 border-amber-400 rounded-lg hover:bg-amber-200 disabled:opacity-50"
										>
											{syncing ? '同步中…' : '同步購物車到伺服器'}
										</button>
										<button
											onClick={handleCheckout}
											disabled={state.itemCount === 0 || checkingOut}
											className="px-4 py-2 bg-emerald-600 text-white border-2 border-emerald-700 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
										>
											{checkingOut ? '送出中…' : '送出訂單'}
										</button>
										<a
											href={state.itemCount > 0 ? '/checkout' : '#'}
											className={`px-4 py-2 text-center border-2 rounded-lg ${state.itemCount>0 ? 'bg-purple-600 text-white border-purple-700 hover:bg-purple-700' : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'}`}
										>
											前往結帳頁填資料
										</a>
									</div>
								</div>

								<div className="bg-white border-4 border-amber-300 rounded-2xl p-4 pixel-art shadow-pixel">
									<h3 className="text-lg font-bold text-amber-900 mb-3">🛍️ 購物車內容</h3>
									{state.items.length === 0 ? (
										<div className="text-amber-600">購物車目前沒有商品</div>
									) : (
										<div className="space-y-4">
											{state.items.map((item) => (
												<CartItem key={item.id} item={item} />
											))}
										</div>
									)}
								</div>
							</div>
						</div>

						{/* 手機：浮動徽章購物車 + 抽屜 */}
						<div className="fixed bottom-4 right-4 lg:hidden z-30">
							<button
								onClick={() => setCartOpenMobile(true)}
								className="relative px-4 py-3 pixel-btn rounded-full shadow-pixel flex items-center gap-2"
								aria-label="開啟購物車"
							>
								<ShoppingCartIcon className="w-5 h-5" />
								<span className="font-pixel">購物車</span>
								{state.itemCount > 0 && (
									<span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5 border-2 border-black">
										{state.itemCount}
									</span>
								)}
							</button>
						</div>

						{cartOpenMobile && (
							<div className="fixed inset-0 z-40 lg:hidden">
								<div className="absolute inset-0 bg-black/40" onClick={() => setCartOpenMobile(false)} />
								<div className="absolute bottom-0 left-0 right-0 bg-white border-t-4 border-black rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto shadow-pixel">
									<div className="flex items-center justify-between mb-3">
										<h3 className="font-pixel text-xl">🛍️ 購物車</h3>
										<button onClick={() => setCartOpenMobile(false)} className="pixel-chip px-3 py-1">關閉</button>
									</div>
									<CartSummary />
									<div className="mt-3 space-y-4">
										{state.items.length === 0 ? (
											<div className="text-amber-600">購物車目前沒有商品</div>
										) : (
											state.items.map(item => <CartItem key={item.id} item={item} />)
										)}
									</div>
									<div className="mt-4 flex flex-col gap-3">
										<button
											onClick={syncCartToApi}
											disabled={state.itemCount === 0 || syncing}
											className="px-4 py-2 bg-amber-100 text-amber-800 border-2 border-amber-400 rounded-lg hover:bg-amber-200 disabled:opacity-50"
										>
											{syncing ? '同步中…' : '同步購物車到伺服器'}
										</button>
										<button
											onClick={handleCheckout}
											disabled={state.itemCount === 0 || checkingOut}
											className="px-4 py-2 bg-emerald-600 text-white border-2 border-emerald-700 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
										>
											{checkingOut ? '送出中…' : '送出訂單'}
										</button>
										<a
											href={state.itemCount > 0 ? '/checkout' : '#'}
											className={`px-4 py-2 text-center border-2 rounded-lg ${state.itemCount>0 ? 'bg-purple-600 text-white border-purple-700 hover:bg-purple-700' : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'}`}
											onClick={() => setCartOpenMobile(false)}
										>
											前往結帳頁填資料
										</a>
									</div>
								</div>
							</div>
						)}
					</main>
		</div>
	)
}
