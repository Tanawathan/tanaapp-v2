'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const canSubmit = name.trim() && email.trim() && phone.trim() && 
                   password.length >= 6 && password === confirmPassword

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!canSubmit) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          password
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '註冊失敗')
      }

      setSuccess(true)
      setName('')
      setEmail('')
      setPhone('')
      setPassword('')
      setConfirmPassword('')

    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="mx-auto max-w-md p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">註冊成功！</h1>
          <p className="text-gray-600 mb-6">歡迎加入我們的會員，您現在可以登入使用完整功能。</p>
          <Link 
            href="/login" 
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            前往登入
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight">會員註冊</h1>
        <p className="mt-2 text-sm text-gray-600">建立帳戶享受更便利的訂位服務</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
          <input
            type="text"
            required
            placeholder="請輸入您的姓名"
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

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
          <label className="block text-sm font-medium text-gray-700 mb-1">電話</label>
          <input
            type="tel"
            required
            placeholder="0912-345-678"
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
          <input
            type="password"
            required
            placeholder="至少6個字元"
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {password && password.length < 6 && (
            <p className="mt-1 text-xs text-red-600">密碼長度至少需要6個字元</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">確認密碼</label>
          <input
            type="password"
            required
            placeholder="再次輸入密碼"
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="mt-1 text-xs text-red-600">密碼不一致</p>
          )}
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
          {loading ? '註冊中...' : '建立帳戶'}
        </button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <h3 className="text-sm font-medium text-blue-900 mb-2">會員功能說明</h3>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 註冊後可快速查詢您的訂位記錄</li>
          <li>• 系統會自動關聯您的電話和Email</li>
          <li>• 目前為簡化版本，完整功能需要資料庫升級</li>
        </ul>
      </div>

      <div className="mt-6 text-center text-sm">
        <span className="text-gray-600">已經有帳戶？</span>
        <Link href="/login" className="ml-1 text-indigo-600 hover:text-indigo-500">
          立即登入
        </Link>
      </div>

      <div className="mt-4 text-center">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← 返回首頁
        </Link>
      </div>
    </main>
  )
}
