'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { UserCircleIcon, BellIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

interface User {
  name: string;
  email: string;
  avatar?: string;
}

export default function TopNavbar() {
  const [user, setUser] = useState<User | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  async function checkAuthStatus() {
    try {
      const res = await fetch('/api/auth/profile', {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        setUser({
          name: data.customer.name,
          email: data.customer.email,
          avatar: data.customer.avatar
        })
      }
    } catch (error) {
      // 用戶未登入，保持 user 為 null
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-violet-600 to-pink-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Tana餐廳</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-violet-600 transition-colors font-medium">
              首頁
            </Link>
            <Link href="/menu" className="text-gray-700 hover:text-violet-600 transition-colors font-medium">
              菜單
            </Link>
            <Link href="/book" className="text-gray-700 hover:text-violet-600 transition-colors font-medium">
              預約
            </Link>
            <Link href="/order" className="text-gray-700 hover:text-violet-600 transition-colors font-medium">
              點餐
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Contact */}
            <a 
              href="tel:0901222861" 
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors"
            >
              📞 0901-222-861
            </a>

            {/* Notifications */}
            {user && (
              <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                <BellIcon className="w-5 h-5" />
              </button>
            )}

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-50 transition-colors"
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <Link href="/member" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      會員中心
                    </Link>
                    <Link href="/reservations" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      我的預約
                    </Link>
                    <button 
                      onClick={async () => {
                        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                        setUser(null)
                        setIsMenuOpen(false)
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      登出
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link 
                  href="/login"
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
                >
                  登入
                </Link>
                <Link 
                  href="/register"
                  className="px-4 py-2 text-sm text-white bg-gradient-to-r from-violet-600 to-pink-600 rounded-lg hover:shadow-md transition-all"
                >
                  註冊
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
