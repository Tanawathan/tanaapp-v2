'use client'

import TopNavbar from '../../components/TopNavbar'
import { ShoppingCartIcon, HeartIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolid, StarIcon } from '@heroicons/react/24/solid'
import { useState } from 'react'

export default function OrderPage() {
  const [cart, setCart] = useState<{[key: string]: number}>({})
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  const addToCart = (productId: string) => {
    setCart(prev => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }))
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const newCart = { ...prev }
      if (newCart[productId] > 1) {
        newCart[productId]--
      } else {
        delete newCart[productId]
      }
      return newCart
    })
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

  const totalItems = Object.values(cart).reduce((sum, count) => sum + count, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 頁面標題 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">線上點餐</h1>
          <p className="text-gray-600">即將推出，敬請期待！</p>
        </div>

        {/* 建設中提示 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCartIcon className="w-10 h-10 text-violet-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">功能開發中</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              我們正在努力開發線上點餐功能，將為您提供更便捷的用餐體驗。
              目前您可以瀏覽我們的菜單或進行線上預約。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
                查看菜單
              </button>
              <button className="px-6 py-3 border border-violet-600 text-violet-600 rounded-lg hover:bg-violet-50 transition-colors">
                線上預約
              </button>
            </div>
          </div>
        </div>

        {/* 未來功能預覽 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h3 className="text-xl font-bold text-gray-900 mb-6">即將推出的功能</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 功能卡片 */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center mb-4">
                  <ShoppingCartIcon className="w-6 h-6 text-violet-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">線上點餐</h4>
                <p className="text-sm text-gray-600">瀏覽菜單，選擇您喜愛的餐點，直接線上下單</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                  <HeartIcon className="w-6 h-6 text-pink-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">收藏功能</h4>
                <p className="text-sm text-gray-600">收藏您喜愛的餐點，下次點餐更方便</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <StarIcon className="w-6 h-6 text-orange-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">評價系統</h4>
                <p className="text-sm text-gray-600">為餐點評分評論，幫助其他顧客選擇</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">線上付款</h4>
                <p className="text-sm text-gray-600">支援多種付款方式，安全便捷</p>
              </div>
            </div>
          </div>

          {/* 右側邊欄 */}
          <div className="space-y-6">
            {/* 通知訂閱 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📧 搶先體驗</h3>
              <p className="text-sm text-gray-600 mb-4">
                留下您的聯絡資訊，功能上線時第一時間通知您！
              </p>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="請輸入您的信箱"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <button className="w-full px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
                  訂閱通知
                </button>
              </div>
            </div>

            {/* 開發進度 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🚀 開發進度</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">菜單系統</span>
                    <span className="text-sm text-green-600">100%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full w-full"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">購物車</span>
                    <span className="text-sm text-violet-600">75%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-violet-600 h-2 rounded-full w-3/4"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">付款系統</span>
                    <span className="text-sm text-orange-600">50%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-600 h-2 rounded-full w-1/2"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">訂單管理</span>
                    <span className="text-sm text-gray-600">25%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gray-600 h-2 rounded-full w-1/4"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 聯絡資訊 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📞 聯絡我們</h3>
              <p className="text-sm text-gray-600 mb-4">
                如有任何問題或建議，歡迎聯絡我們：
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span>📱</span>
                  <a href="tel:0901222861" className="text-violet-600 hover:underline">
                    0901-222-861
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span>✉️</span>
                  <span className="text-gray-600">service@tana.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
