import TopNavbar from '../components/TopNavbar'
import QuickBooking from '../components/QuickBooking'
import MenuCards from '../components/MenuCards'
import { CalendarDaysIcon, PhoneIcon, ShoppingBagIcon, BookOpenIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導航 */}
      <TopNavbar />

      {/* 主要內容區域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 左側內容區 */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 歡迎卡片 */}
            <div className="bg-gradient-to-r from-violet-600 via-pink-600 to-orange-600 rounded-2xl p-6 text-white">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                歡迎來到 Tana 餐廳 🍽️
              </h1>
              <p className="text-white/90 mb-4">
                享受美食，感受溫馨！現在就預約您的專屬用餐時光
              </p>
              <div className="flex flex-wrap gap-3">
                <Link 
                  href="/book"
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all"
                >
                  <CalendarDaysIcon className="w-5 h-5" />
                  立即預約
                </Link>
                <Link 
                  href="/menu"
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all"
                >
                  <BookOpenIcon className="w-5 h-5" />
                  查看菜單
                </Link>
                <a 
                  href="tel:0901222861"
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all"
                >
                  <PhoneIcon className="w-5 h-5" />
                  0901-222-861
                </a>
              </div>
            </div>

            {/* 快捷功能卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link 
                href="/book"
                className="group p-4 bg-white rounded-xl border border-gray-100 hover:shadow-lg hover:border-violet-200 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-violet-100 rounded-lg group-hover:bg-violet-200 transition-colors">
                    <CalendarDaysIcon className="w-6 h-6 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">線上預約</h3>
                    <p className="text-sm text-gray-600">快速預約座位</p>
                  </div>
                </div>
              </Link>

              <Link 
                href="/order"
                className="group p-4 bg-white rounded-xl border border-gray-100 hover:shadow-lg hover:border-pink-200 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-pink-100 rounded-lg group-hover:bg-pink-200 transition-colors">
                    <ShoppingBagIcon className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">線上點餐</h3>
                    <p className="text-sm text-gray-600">即將推出</p>
                  </div>
                </div>
              </Link>

              <Link 
                href="/menu"
                className="group p-4 bg-white rounded-xl border border-gray-100 hover:shadow-lg hover:border-orange-200 transition-all sm:col-span-2 lg:col-span-1"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                    <BookOpenIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">菜單瀏覽</h3>
                    <p className="text-sm text-gray-600">查看所有菜品</p>
                  </div>
                </div>
              </Link>
            </div>

            {/* 菜單展示區域 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <MenuCards />
            </div>

            {/* 餐廳資訊卡片 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">餐廳資訊</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">營業時間</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>週一 ~ 週五</span>
                      <span>11:30 - 14:30, 17:30 - 21:30</span>
                    </div>
                    <div className="flex justify-between">
                      <span>週六 ~ 週日</span>
                      <span>11:30 - 21:30</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">聯絡方式</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4" />
                      <a href="tel:0901222861" className="hover:text-violet-600 transition-colors">
                        0901-222-861
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      <span>台北市信義區餐廳街123號</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右側邊欄 */}
          <div className="space-y-6">
            {/* 快速預約組件 */}
            <QuickBooking />

            {/* 最新消息 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4">🔔 最新消息</h2>
              <div className="space-y-3">
                <div className="p-3 bg-violet-50 rounded-lg">
                  <p className="text-sm font-medium text-violet-900">新菜品上線</p>
                  <p className="text-xs text-violet-700">招牌牛排現已供應</p>
                </div>
                <div className="p-3 bg-pink-50 rounded-lg">
                  <p className="text-sm font-medium text-pink-900">線上點餐功能</p>
                  <p className="text-xs text-pink-700">即將推出，敬請期待</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm font-medium text-orange-900">會員優惠</p>
                  <p className="text-xs text-orange-700">註冊即享9折優惠</p>
                </div>
              </div>
            </div>

            {/* 客戶評價 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4">⭐ 客戶評價</h2>
              <div className="space-y-4">
                <div className="border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">王</span>
                    </div>
                    <span className="text-sm font-medium">王小明</span>
                  </div>
                  <p className="text-sm text-gray-600">服務很棒，食物美味，環境舒適！</p>
                </div>
                <div className="border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">李</span>
                    </div>
                    <span className="text-sm font-medium">李美華</span>
                  </div>
                  <p className="text-sm text-gray-600">預約系統很方便，推薦給大家！</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
