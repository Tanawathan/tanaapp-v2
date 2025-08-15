'use client'

import TopNavbar from '../../../components/TopNavbar'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/orders/${id}`)
        if (!res.ok) throw new Error('讀取訂單失敗')
        const data = await res.json()
        setOrder(data.order)
      } catch (e: any) {
        setError(e?.message || '讀取失敗')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [id])

  return (
    <div className="min-h-screen pixel-bg">
      <TopNavbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="text-amber-700">載入中…</div>
        ) : error ? (
          <div className="text-red-700">{error}</div>
        ) : !order ? (
          <div className="text-amber-700">找不到訂單</div>
        ) : (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-amber-900 pixel-art">✅ 訂單建立成功</h1>
            <div className="bg-white border-4 border-amber-400 rounded-xl p-4 pixel-art">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-amber-800">
                <div><span className="font-bold">訂單編號：</span>{order.order_number}</div>
                <div><span className="font-bold">狀態：</span>{order.status}</div>
                <div><span className="font-bold">總金額：</span>NT$ {Number(order.total_amount || 0).toFixed(0)}</div>
                <div><span className="font-bold">建立時間：</span>{new Date(order.created_at).toLocaleString()}</div>
              </div>
            </div>

            <div className="bg-white border-4 border-amber-400 rounded-xl p-4 pixel-art">
              <h2 className="font-bold text-amber-900 mb-3">🛒 餐點明細</h2>
              {(order.order_items || []).length === 0 ? (
                <div className="text-amber-700">沒有項目</div>
              ) : (
                <ul className="space-y-2">
                  {order.order_items.map((it: any) => (
                    <li key={it.id} className="flex justify-between text-amber-800">
                      <span>{it.product_name} × {it.quantity}</span>
                      <span>NT$ {Number(it.total_price || 0).toFixed(0)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-3">
              <button
                className="px-6 py-3 bg-amber-100 text-amber-800 border-2 border-amber-400 rounded-lg"
                onClick={() => router.push('/order')}
              >
                回到點餐
              </button>
              <button
                className="px-6 py-3 bg-emerald-600 text-white border-2 border-emerald-700 rounded-lg"
                onClick={() => router.push('/member')}
              >
                查看我的訂單
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
