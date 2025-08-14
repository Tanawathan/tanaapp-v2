'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { UserCircleIcon, BellIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import ThemeToggle from './ThemeToggle'

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
    <header className="sticky top-0 z-50 pixel-surface border-b-3 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-pixel-accent text-white pixel-border flex items-center justify-center">
              <span className="font-pixel text-lg">T</span>
            </div>
            <span className="font-pixel text-2xl">Tana餐廳</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            <Link href="/" className="font-pixel text-base hover:underline">
              首頁
            </Link>
            <Link href="/menu" className="font-pixel text-base hover:underline">
              菜單
            </Link>
            <Link href="/book" className="font-pixel text-base hover:underline">
              預約
            </Link>
            <Link href="/order" className="font-pixel text-base hover:underline">
              點餐
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Contact */}
            <a 
              href="tel:0901222861" 
              className="icon-text-combo comb-responsive ellipsis nowrap px-3 py-1.5 text-sm pixel-chip"
            >
              <span className="itx-icon">📞</span>
              <span className="itx-text">0901-222-861</span>
            </a>

            {/* Notifications */}
            {user && (
              <button className="p-2 pixel-chip">
                <BellIcon className="w-5 h-5" />
              </button>
            )}

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 p-1 pixel-chip">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 bg-black text-white flex items-center justify-center">
                      <span className="text-white text-sm font-medium font-pixel">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 pixel-card py-2 z-50">
                    <div className="px-4 py-2 border-b-3 border-black">
                      <p className="text-sm font-pixel">{user.name}</p>
                      <p className="text-xs">{user.email}</p>
                    </div>
                    <Link href="/member" className="block px-4 py-2 text-sm hover:underline">
                      會員中心
                    </Link>
                    <Link href="/reservations" className="block px-4 py-2 text-sm hover:underline">
                      我的預約
                    </Link>
                    <button 
                      onClick={async () => {
                        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                        setUser(null)
                        setIsMenuOpen(false)
                      }}
                      className="block w-full text-left px-4 py-2 text-sm hover:underline"
                    >
                      登出
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="px-3 py-2 text-sm pixel-chip">
                  登入
                </Link>
                <Link href="/register" className="px-3 py-2 text-sm pixel-btn">註冊</Link>
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
