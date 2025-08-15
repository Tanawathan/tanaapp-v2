'use client'

import TopNavbar from '../../components/TopNavbar'
import CartItem from '../../components/CartItem'
import CartSummary from '../../components/CartSummary'
import { useCart } from '../../src/contexts/CartContext'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

export default function CheckoutPage() {
  const { state, clearCart } = useCart()
  const router = useRouter()

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [orderType, setOrderType] = useState<'dine_in' | 'takeout'>('dine_in')
  const [tableNumber, setTableNumber] = useState<number | ''>('')
  const [partySize, setPartySize] = useState<number>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totals = useMemo(() => {
    const subtotal = state.total
  const service = 0
  const total = subtotal
  return { subtotal, service, total }
  }, [state.total])

  const canSubmit = state.itemCount > 0 && !submitting && (!!customerName.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    try {
      setSubmitting(true)
      setError(null)

      const payload = {
        order_type: orderType,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        customer_email: customerEmail.trim() || null,
        table_number: orderType === 'dine_in' ? (tableNumber || null) : null,
        party_size: orderType === 'dine_in' ? partySize : 1,
        subtotal: totals.subtotal,
        discount_amount: 0,
        tax_amount: 0,
  service_charge: 0,
  total_amount: totals.total,
        items: state.items.map(i => ({
          product_name: i.name,
          quantity: i.quantity,
          unit_price: i.price,
          total_price: i.price * i.quantity,
          special_instructions: i.special_instructions ?? null,
        })),
        source: 'web',
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('建立訂單失敗')
      const data = await res.json()

      // 清空購物車
      clearCart()
      await fetch('/api/cart', { method: 'DELETE' }).catch(() => {})

      // 前往訂單確認頁
      router.push(`/orders/${data.order.id}`)
    } catch (e: any) {
      setError(e?.message || '提交失敗')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen pixel-bg">
      <TopNavbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-3xl font-bold text-amber-900 mb-6 pixel-art">🧾 結帳資訊</h1>

        {state.itemCount === 0 ? (
          <div className="bg-amber-50 border-4 border-amber-200 rounded-xl p-8 text-center pixel-art">
            <p className="text-amber-700 mb-4">購物車是空的，請先選購商品。</p>
            <button
              className="px-6 py-3 bg-amber-600 text-white border-2 border-amber-700 rounded-lg"
              onClick={() => router.push('/order')}
            >
              返回點餐
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form className="lg:col-span-2 space-y-4" onSubmit={handleSubmit}>
              <div className="bg-white border-4 border-amber-400 rounded-xl p-4 pixel-art shadow-pixel">
                <h2 className="font-bold text-amber-900 mb-4 pixel-art">👤 客戶資訊</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-amber-700 mb-1 pixel-art">姓名（必填）</label>
                    <input
                      className="w-full px-3 py-2 border-2 border-amber-300 rounded-lg pixel-art"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-amber-700 mb-1 pixel-art">電話</label>
                    <input
                      className="w-full px-3 py-2 border-2 border-amber-300 rounded-lg pixel-art"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-amber-700 mb-1 pixel-art">Email</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border-2 border-amber-300 rounded-lg pixel-art"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-amber-700 mb-1 pixel-art">訂單類型</label>
                    <select
                      className="w-full px-3 py-2 border-2 border-amber-300 rounded-lg pixel-art"
                      value={orderType}
                      onChange={(e) => setOrderType(e.target.value as any)}
                    >
                      <option value="dine_in">內用</option>
                      <option value="takeout">外帶</option>
                    </select>
                  </div>
                  {orderType === 'dine_in' && (
                    <>
                      <div>
                        <label className="block text-sm text-amber-700 mb-1 pixel-art">桌號</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border-2 border-amber-300 rounded-lg pixel-art"
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value ? Number(e.target.value) : '')}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-amber-700 mb-1 pixel-art">人數</label>
                        <input
                          type="number"
                          min={1}
                          className="w-full px-3 py-2 border-2 border-amber-300 rounded-lg pixel-art"
                          value={partySize}
                          onChange={(e) => setPartySize(Math.max(1, Number(e.target.value) || 1))}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-white border-4 border-amber-400 rounded-xl p-4 pixel-art shadow-pixel">
                <h2 className="font-bold text-amber-900 mb-4 pixel-art">🛒 購物車</h2>
                <div className="space-y-3">
                  {state.items.map((item) => (
                    <CartItem key={item.id} item={item} />
                  ))}
                </div>
              </div>

              {error && (
                <div className="text-red-700 bg-red-100 border-2 border-red-300 rounded px-3 py-2 pixel-art">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  className="px-6 py-3 bg-amber-100 text-amber-800 border-2 border-amber-400 rounded-lg hover:bg-amber-200"
                  onClick={() => router.push('/order')}
                >
                  返回點餐
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="px-6 py-3 bg-emerald-600 text-white border-2 border-emerald-700 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? '送出中…' : '確認下單'}
                </button>
              </div>
            </form>

            <div className="space-y-6">
              <CartSummary />
              <div className="bg-white border-4 border-amber-400 rounded-xl p-4 pixel-art">
                <div className="flex justify-between text-amber-800 mb-2">
                  <span>小計</span>
                  <span className="font-bold">NT$ {totals.subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-amber-800 mb-2">
                  <span>服務費 (10%)</span>
                  <span className="font-bold">NT$ {totals.service.toFixed(0)}</span>
                </div>
                <div className="border-t-2 border-amber-300 my-2"></div>
                <div className="flex justify-between text-amber-900 text-lg">
                  <span className="font-bold">總計</span>
                  <span className="font-bold">NT$ {totals.total.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
