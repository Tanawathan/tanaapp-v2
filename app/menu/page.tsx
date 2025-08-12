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
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [products, selectedCategory, searchTerm])

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
      const response = await fetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterProducts = () => {
    let filtered = products
    
    console.log('篩選前:', {
      selectedCategory,
      totalProducts: products.length,
      availableCategories: [...new Set(products.map(p => p.category))]
    })

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory)
    }

    if (searchTerm) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    console.log('篩選後:', {
      selectedCategory,
      filteredCount: filtered.length,
      searchTerm
    })

    setFilteredProducts(filtered)
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
    <div className="min-h-screen bg-gray-50">
      <TopNavbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 頁面標題 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">美味菜單</h1>
          <p className="text-gray-600">探索我們精心準備的美味佳餚</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左側過濾器 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 搜尋框 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜尋菜品..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 分類過濾 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FunnelIcon className="w-5 h-5" />
                分類篩選
              </h3>
              {categoriesLoading ? (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-violet-100 text-violet-700 border border-violet-200'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="text-lg">{category.icon}</span>
                      <span className="font-medium">{category.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 營業時間 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">⏰ 營業時間</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>週一 ~ 週五</span>
                  <span>11:30 - 21:30</span>
                </div>
                <div className="flex justify-between">
                  <span>週六 ~ 週日</span>
                  <span>11:30 - 21:30</span>
                </div>
              </div>
            </div>

            {/* 聯絡資訊 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">📞 聯絡預約</h3>
              <div className="space-y-3">
                <a 
                  href="tel:0901222861"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  📱 0901-222-861
                </a>
                <Link 
                  href="/book"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-violet-600 text-violet-600 rounded-lg hover:bg-violet-50 transition-colors"
                >
                  📅 線上預約
                </Link>
              </div>
            </div>
          </div>

          {/* 右側菜品列表 */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">找不到相關菜品</h3>
                <p className="text-gray-600">試試調整搜尋條件或選擇其他分類</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <div key={product.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                    {/* 圖片區域 */}
                    <div className="aspect-video bg-gradient-to-br from-violet-100 to-pink-100 relative">
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
                        className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
                      >
                        {favorites.has(product.id) ? (
                          <HeartSolid className="w-5 h-5 text-red-500" />
                        ) : (
                          <HeartIcon className="w-5 h-5 text-gray-600" />
                        )}
                      </button>

                      {/* 可用性標籤 */}
                      <div className="absolute top-3 left-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          product.is_available
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {product.is_available ? '供應中' : '暫缺'}
                        </span>
                      </div>
                    </div>

                    {/* 內容區域 */}
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900 text-lg">{product.name}</h3>
                        <span className="text-lg font-bold text-violet-600">
                          ${product.price}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
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
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {categories.find(c => c.id === product.category)?.name || product.category}
                        </span>
                        
                        <Link 
                          href="/order"
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            product.is_available
                              ? 'bg-violet-600 text-white hover:bg-violet-700'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
        </div>
      </main>
    </div>
  )
}
