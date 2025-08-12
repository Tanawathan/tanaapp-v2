'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const canSubmit = email.trim() && password.trim()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!canSubmit) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '登入失敗')
      }

      // 登入成功，導向會員中心
      router.push('/member')

    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight">會員登入</h1>
        <p className="mt-2 text-sm text-gray-600">登入您的帳戶以查看訂位記錄</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">信箱</label>
          <input
            type="email"
            required
            placeholder="your@email.com"
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
          <input
            type="password"
            required
            placeholder="請輸入密碼"
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="w-full inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && (
            <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          {loading ? '登入中...' : '登入'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-gray-600">還沒有帳戶？</span>
        <Link href="/register" className="ml-1 text-indigo-600 hover:text-indigo-500">
          立即註冊
        </Link>
      </div>

      <div className="mt-4 text-center">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← 返回首頁
        </Link>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h3 className="text-sm font-medium text-gray-900 mb-2">測試帳戶</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <p>信箱：<code className="bg-gray-200 px-1 rounded">test@example.com</code></p>
          <p>密碼：<code className="bg-gray-200 px-1 rounded">123456</code></p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <h3 className="text-sm font-medium text-blue-900 mb-2">會員功能</h3>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 快速訂位，無需重複填寫資料</li>
          <li>• 查看所有歷史訂位記錄</li>
          <li>• 管理個人資料</li>
          <li>• 專屬會員優惠（即將推出）</li>
        </ul>
      </div>
    </main>
  )
}
