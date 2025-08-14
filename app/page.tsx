import TopNavbar from '../components/TopNavbar'
import MarqueeRibbon from '../components/MarqueeRibbon'
import MenuCards from '../components/MenuCards'
import { CalendarDaysIcon, PhoneIcon, ShoppingBagIcon, BookOpenIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function Home() {
  return (
  <div className="min-h-screen">
  {/* 跑馬燈 */}
  <MarqueeRibbon />
      {/* 頂部導航 */}
      <TopNavbar />

      {/* 主要內容區域 */}
  <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            
            {/* 歡迎卡片 */}
            <div className="pixel-card p-6 bg-black text-white">
              <h1 className="font-pixel text-3xl mb-2">
                歡迎來到 Tana 餐廳 🍽️
              </h1>
              <p className="mb-4">
                享受美食，感受溫馨！現在就預約您的專屬用餐時光
              </p>
              <div className="flex flex-wrap gap-3">
                <Link 
                  href="/book"
                  className="flex items-center gap-2 px-4 py-2 pixel-btn"
                >
                  <CalendarDaysIcon className="w-5 h-5" />
                  立即預約
                </Link>
                <Link 
                  href="/menu"
                  className="flex items-center gap-2 px-4 py-2 pixel-btn"
                >
                  <BookOpenIcon className="w-5 h-5" />
                  查看菜單
                </Link>
                <a 
                  href="tel:0901222861"
                  className="flex items-center gap-2 px-4 py-2 pixel-btn"
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
                className="group p-4 pixel-card"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 pixel-chip">
                    <CalendarDaysIcon className="w-6 h-6 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-pixel text-lg">線上預約</h3>
                    <p className="text-sm">快速預約座位</p>
                  </div>
                </div>
              </Link>

              <Link 
                href="/order"
                className="group p-4 pixel-card"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 pixel-chip">
                    <ShoppingBagIcon className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="font-pixel text-lg">線上點餐</h3>
                    <p className="text-sm">即將推出</p>
                  </div>
                </div>
              </Link>

              <Link 
                href="/menu"
                className="group p-4 pixel-card sm:col-span-2 lg:col-span-1"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 pixel-chip">
                    <BookOpenIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-pixel text-lg">菜單瀏覽</h3>
                    <p className="text-sm">查看所有菜品</p>
                  </div>
                </div>
              </Link>
            </div>

            {/* 快速預約已移除 */}

            {/* 推薦菜單：2/3/4 欄自適應（首頁只顯示 8 筆） */}
            <div className="pixel-card p-6">
              <MenuCards maxItems={8} />
            </div>

            {/* 餐廳資訊（可展開） */}
            <details className="pixel-card p-6" open>
              <summary className="font-pixel text-2xl mb-4 cursor-pointer">餐廳資訊</summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-pixel text-lg mb-2">營業時間</h3>
                  <div className="space-y-1 text-sm">
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
                  <h3 className="font-pixel text-lg mb-2">聯絡方式</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4" />
                      <a href="tel:0901222861" className="hover:underline">
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
            </details>
            
            {/* 最新消息（縮成一排 chips） */}
            <div className="pixel-card p-4">
              <h2 className="font-pixel text-xl mb-3">🔔 最新消息</h2>
              <div className="flex flex-wrap gap-2">
                <span className="pixel-chip px-3 py-2 text-sm">新菜品上線</span>
                <span className="pixel-chip px-3 py-2 text-sm">線上點餐：即將推出</span>
                <span className="pixel-chip px-3 py-2 text-sm">會員優惠：註冊享9折</span>
              </div>
            </div>

            {/* 客戶評價（可展開） */}
            <details className="pixel-card p-6">
              <summary className="font-pixel text-xl mb-4 cursor-pointer">⭐ 客戶評價</summary>
              <div className="space-y-4 mt-2">
                <div className="border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-black text-white flex items-center justify-center">
                      <span className="text-white text-xs">王</span>
                    </div>
                    <span className="text-sm font-pixel">王小明</span>
                  </div>
                  <p className="text-sm text-gray-600">服務很棒，食物美味，環境舒適！</p>
                </div>
                <div className="border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-black text-white flex items-center justify-center">
                      <span className="text-white text-xs">李</span>
                    </div>
                    <span className="text-sm font-pixel">李美華</span>
                  </div>
                  <p className="text-sm text-gray-600">預約系統很方便，推薦給大家！</p>
                </div>
              </div>
            </details>
        
      </main>
    </div>
  )
}
