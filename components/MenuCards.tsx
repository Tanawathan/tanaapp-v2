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

export default function MenuCards() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

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
      const response = await fetch('/api/products')
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

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category === selectedCategory)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">🍽️</span>
          <h2 className="text-xl font-bold text-gray-900">推薦菜單</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-gray-100 animate-pulse rounded-xl h-64"></div>
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
        <h2 className="text-xl font-bold text-gray-900">推薦菜單</h2>
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
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                selectedCategory === category.id
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{category.icon}</span>
              {category.name}
            </button>
          ))
        )}
      </div>

      {/* 菜品卡片 */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
              {/* 圖片 */}
              <div className="relative h-40 bg-gray-100">
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
                  className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
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
                  <h3 className="font-semibold text-gray-900 flex-1">{product.name}</h3>
                  <span className="text-lg font-bold text-violet-600">
                    NT${product.price}
                  </span>
                </div>

                {product.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
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
                    <span className="text-sm text-gray-600 ml-1">
                      ({product.rating})
                    </span>
                  </div>
                )}

                {/* 加入購物車按鈕 */}
                <button
                  disabled={!product.is_available}
                  className="w-full py-2 px-4 bg-gradient-to-r from-violet-600 to-pink-600 text-white font-medium rounded-lg hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
          <p className="text-gray-600 mb-4">暫無菜品資料</p>
          <p className="text-sm text-gray-500">請稍後再試或聯繫餐廳</p>
        </div>
      )}
    </div>
  )
}
