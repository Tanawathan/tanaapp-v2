'use client'
import { useState, useEffect } from 'react'
import { StarIcon, HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
  is_available?: boolean;
  rating?: number;
}

interface Category {
  id: string
  name: string
  icon: string
  display_order?: number
}

export default function MenuCards({ maxItems }: { maxItems?: number } = {}) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState('all')

  // 將各種別名正規化為一致的分類代碼
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

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  useEffect(() => {
    // 當分類變更時重新獲取產品
    fetchProducts()
  }, [selectedCategory])

  async function fetchCategories() {
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
          { id: 'beverage', name: '飲品', icon: '🥤' }
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
        { id: 'beverage', name: '飲品', icon: '🥤' }
      ])
    } finally {
      setCategoriesLoading(false)
    }
  }

  async function fetchProducts() {
    try {
      // 根據選擇的分類構建 API URL
      const categoryParam = selectedCategory === 'all' ? '' : `?category=${selectedCategory}`
      const response = await fetch(`/api/products${categoryParam}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('獲取菜單失敗:', error)
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

  // 僅顯示有供應的商品（is_available 預設視為 true）
  const availableProducts = products.filter(p => p.is_available !== false)

  // 由於已經從 API 按分類篩選，這裡直接使用所有可用產品
  const filteredProducts = availableProducts

  const limitedProducts = maxItems ? filteredProducts.slice(0, maxItems) : filteredProducts

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">🍽️</span>
          <h2 className="font-pixel text-2xl">推薦菜單</h2>
        </div>
  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="pixel-card animate-pulse h-64"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">🍽️</span>
        <h2 className="font-pixel text-2xl">推薦菜單</h2>
      </div>

      {/* 分類過濾 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categoriesLoading ? (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-gray-100 animate-pulse rounded-full h-8 w-20"></div>
            ))}
          </div>
        ) : (
          categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 whitespace-nowrap text-sm font-pixel ${
                selectedCategory === category.id
                  ? 'pixel-btn'
                  : 'pixel-chip'
              }`}
            >
              <span>{category.icon}</span>
              {category.name}
            </button>
          ))
        )}
      </div>

      {/* 菜品卡片 */}
      {limitedProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {limitedProducts.map(product => (
            <div key={product.id} className="pixel-card overflow-hidden">
              {/* 圖片 */}
              <div className="relative h-40 bg-gray-100 border-b-3 border-black">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl">🍽️</span>
                  </div>
                )}
                
                {/* 收藏按鈕 */}
                <button
                  onClick={() => toggleFavorite(product.id)}
                  className="absolute top-2 right-2 p-2 pixel-chip"
                >
                  {favorites.has(product.id) ? (
                    <HeartSolidIcon className="w-5 h-5 text-red-500" />
                  ) : (
                    <HeartIcon className="w-5 h-5 text-gray-600" />
                  )}
                </button>

                {/* 可用狀態 */}
                {!product.is_available && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-medium">暫時缺貨</span>
                  </div>
                )}
              </div>

              {/* 內容 */}
        <div className="p-4">
                <div className="flex items-start justify-between mb-2">
          <h3 className="font-pixel text-lg flex-1">{product.name}</h3>
          <span className="text-lg font-pixel">
                    NT${product.price}
                  </span>
                </div>

                {product.description && (
          <p className="text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>
                )}

                {/* 評分 */}
                {product.rating && (
      <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map(star => (
                      <StarIcon 
                        key={star}
                        className={`w-4 h-4 ${
                          star <= product.rating! 
          ? 'text-yellow-400 fill-current' 
          : 'text-gray-300'
                        }`}
                      />
                    ))}
        <span className="text-sm ml-1">
                      ({product.rating})
                    </span>
                  </div>
                )}

                {/* 加入購物車按鈕 */}
                <button
                  disabled={!product.is_available}
      className={`w-full py-2 px-4 ${product.is_available ? 'pixel-btn' : 'pixel-chip opacity-60 cursor-not-allowed'}`}
                >
                  {product.is_available ? '加入購物車' : '暫時缺貨'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">🍽️</span>
          <p className="mb-4">暫無菜品資料</p>
          <p className="text-sm">請稍後再試或聯繫餐廳</p>
        </div>
      )}

      {maxItems && filteredProducts.length > maxItems ? (
        <div className="flex justify-center pt-4">
          <a href="/menu" className="pixel-btn px-4 py-2">更多菜單</a>
        </div>
      ) : null}
    </div>
  )
}
