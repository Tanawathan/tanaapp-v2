import TopNavbar from '../components/TopNavbar'
import MarqueeRibbon from '../components/MarqueeRibbon'
import MenuCards from '../components/MenuCards'
import { CalendarDaysIcon, PhoneIcon, ShoppingBagIcon, BookOpenIcon, UserIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { headers } from 'next/headers'

type InfoLine = { label: string; text: string }

export default async function Home() {
  // 讀取 Supabase API 的餐廳資訊（電話、地址、營業時間）
  let phone = '0901-222-861'
  let address = '台北市信義區餐廳街123號'
  let lines: InfoLine[] = []
  try {
    const host = headers().get('host') || ''
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const base = host ? `${protocol}://${host}` : ''
    const res = await fetch(`${base}/api/restaurant`, { next: { revalidate: 60 } })
    if (res.ok) {
      const json = await res.json()
      phone = json?.info?.phone || phone
      address = json?.info?.address || address
      lines = Array.isArray(json?.lines) ? json.lines : []
    }
  } catch {}

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
                  href={`tel:${phone.replace(/\D/g, '')}`}
                  className="flex items-center gap-2 px-4 py-2 pixel-btn"
                >
                  <PhoneIcon className="w-5 h-5" />
                  {phone}
                </a>
              </div>
            </div>

            {/* 快捷功能卡片（避免與上方重複） */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 我的預約（改導向會員中心） */}
              <Link href="/member" className="group p-4 pixel-card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 pixel-chip">
                    <CalendarDaysIcon className="w-6 h-6 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-pixel text-lg">我的預約</h3>
                    <p className="text-sm">查詢與管理訂位</p>
                  </div>
                </div>
              </Link>

              {/* 會員中心 */}
              <Link href="/member" className="group p-4 pixel-card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 pixel-chip">
                    <UserIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-pixel text-lg">會員中心</h3>
                    <p className="text-sm">查看個人資料與記錄</p>
                  </div>
                </div>
              </Link>

              {/* 線上點餐（保留唯一入口） */}
              <Link href="/order" className="group p-4 pixel-card">
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
            </div>

            {/* 快速預約已移除 */}

            {/* 推薦菜單：2/3/4 欄自適應（首頁只顯示 8 筆；首頁隱藏加入購物車按鈕） */}
            <div className="pixel-card p-6">
              <MenuCards maxItems={8} hideAddToCart />
            </div>

            {/* 餐廳資訊（可展開） - 由 Supabase API 提供 */}
            <details className="pixel-card p-6" open>
              <summary className="font-pixel text-2xl mb-4 cursor-pointer">餐廳資訊</summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-pixel text-lg mb-2">營業時間</h3>
                  <div className="space-y-1 text-sm">
                    {lines?.length ? (
                      lines.map((l: InfoLine, idx: number) => (
                        <div key={idx} className="flex justify-between">
                          <span>{l.label}</span>
                          <span>{l.text}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500">尚無營業時間資料</div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-pixel text-lg mb-2">聯絡方式</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4" />
                      <a href={`tel:${phone.replace(/\D/g, '')}`} className="hover:underline">
                        {phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      <span>{address}</span>
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
