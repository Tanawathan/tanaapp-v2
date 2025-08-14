'use client'

import TopNavbar from '../../components/TopNavbar'
import { HeartIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolid, StarIcon } from '@heroicons/react/24/solid'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  image_url?: string
  is_available: boolean
  rating?: number
}

interface Category {
  id: string
  name: string
  icon: string
  display_order?: number
}

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  // 分類代碼正規化（支援中英別名）
  const normalizeCategory = (value?: string | null) => {
    const v = String(value || '').trim().toLowerCase()
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
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  useEffect(() => {
    // 當分類或搜尋詞變更時重新獲取產品
    fetchProducts()
  }, [selectedCategory, searchTerm])

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true)
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      } else {
        // 如果 API 失敗，使用預設分類
        setCategories([
          { id: 'all', name: '全部', icon: '🍽️' },
          { id: 'appetizer', name: '開胃菜', icon: '🥗' },
          { id: 'main', name: '主餐', icon: '🍖' },
          { id: 'dessert', name: '甜點', icon: '🍰' },
          { id: 'beverage', name: '飲品', icon: '🥤' },
        ])
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      // 錯誤時使用預設分類
      setCategories([
        { id: 'all', name: '全部', icon: '🍽️' },
        { id: 'appetizer', name: '開胃菜', icon: '🥗' },
        { id: 'main', name: '主餐', icon: '🍖' },
        { id: 'dessert', name: '甜點', icon: '🍰' },
        { id: 'beverage', name: '飲品', icon: '🥤' },
      ])
    } finally {
      setCategoriesLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      // 根據選擇的分類和搜尋詞構建 API URL
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }
      
      const url = `/api/products${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        // 只顯示有供應的商品
        const availableProducts = (data.products || []).filter((p: Product) => p.is_available !== false)
        setFilteredProducts(availableProducts)
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(productId)) {
        newFavorites.delete(productId)
      } else {
        newFavorites.add(productId)
      }
      return newFavorites
    })
  }

  return (
    <div className="min-h-screen">
      <TopNavbar />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 標題 */}
        <div className="text-center">
          <h1 className="font-pixel text-3xl mb-1">美味菜單</h1>
          <p className="text-sm">探索我們精心準備的美味佳餚</p>
        </div>

        {/* 搜尋與分類（水平） */}
        <div className="pixel-card p-4">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" />
              <input
                type="text"
                placeholder="搜尋菜品..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 pixel-border focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {categoriesLoading ? (
                <div className="py-2 text-sm">載入分類中…</div>
              ) : (
                categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-pixel whitespace-nowrap ${
                      selectedCategory === category.id ? 'pixel-btn' : 'pixel-chip'
                    }`}
                  >
                    <span>{category.icon}</span>
                    {category.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 菜品列表 2/3/4 欄 */}
        <div>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="font-pixel text-xl mb-2">找不到相關菜品</h3>
                <p className="text-sm">試試調整搜尋條件或選擇其他分類</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                  <div key={product.id} className="pixel-card overflow-hidden">
                    {/* 圖片區域 */}
                    <div className="aspect-video bg-gray-100 relative border-b-3 border-black">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-4xl">
                            {product.category === 'appetizer' && '🥗'}
                            {product.category === 'main' && '🍖'}
                            {product.category === 'dessert' && '🍰'}
                            {product.category === 'beverage' && '🥤'}
                            {!['appetizer', 'main', 'dessert', 'beverage'].includes(product.category) && '🍽️'}
                          </span>
                        </div>
                      )}
                      
                      {/* 收藏按鈕 */}
                      <button
                        onClick={() => toggleFavorite(product.id)}
                        className="absolute top-2 right-2 p-2 pixel-chip"
                      >
                        {favorites.has(product.id) ? (
                          <HeartSolid className="w-5 h-5 text-red-500" />
                        ) : (
                          <HeartIcon className="w-5 h-5 text-gray-600" />
                        )}
                      </button>

                      {/* 可用性標籤 */}
                      <div className="absolute top-2 left-2">
                        <span className={`px-2 py-1 text-xs font-pixel ${
                          product.is_available ? 'pixel-chip' : 'pixel-chip opacity-60'
                        }`}>
                          {product.is_available ? '供應中' : '暫缺'}
                        </span>
                      </div>
                    </div>

                    {/* 內容區域 */}
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-pixel text-lg">{product.name}</h3>
                        <span className="text-lg font-pixel">
                          ${product.price}
                        </span>
                      </div>
                      
                      <p className="text-sm mb-3 line-clamp-2">
                        {product.description}
                      </p>

                      {/* 評分 */}
                      {product.rating && (
                        <div className="flex items-center gap-1 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <StarIcon 
                              key={i}
                              className={`w-4 h-4 ${
                                i < product.rating! ? 'text-yellow-400' : 'text-gray-300'
                              }`} 
                            />
                          ))}
                          <span className="text-sm text-gray-600 ml-1">({product.rating})</span>
                        </div>
                      )}

                      {/* 分類標籤 */}
                      <div className="flex justify-between items-center">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-pixel pixel-chip">
                          {categories.find(c => c.id === product.category)?.name || product.category}
                        </span>
                        
                        <Link 
                          href="/order"
                          className={`px-4 py-2 text-sm ${
                            product.is_available ? 'pixel-btn' : 'pixel-chip opacity-60 cursor-not-allowed'
                          }`}
                        >
                          {product.is_available ? '立即點餐' : '暫時缺貨'}
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </main>
    </div>
  )
}
