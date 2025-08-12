import Link from 'next/link'
import { headers } from 'next/headers'

// 桌位對照表
const TABLE_NAMES: Record<number, { name: string; type: string }> = {
  1: { name: '1號桌', type: '雙人桌' },
  2: { name: '2號桌', type: '雙人桌' },
  3: { name: '3號桌', type: '四人桌' },
  4: { name: '4號桌', type: '四人桌' },
  5: { name: '5號桌', type: '四人桌' },
  6: { name: '6號桌', type: '六人桌' },
  7: { name: '7號桌', type: '六人桌' },
  8: { name: '8號桌', type: '八人桌' },
};

async function fetchByPhone(phone: string, date?: string) {
  const qs = new URLSearchParams({ phone, ...(date ? { date } : {}) })
  // 在伺服器端組出正確的 origin，避免相對路徑在 SSR 失效
  const h = headers()
  const host = h.get('host') || 'localhost:3001'
  const proto = h.get('x-forwarded-proto') || 'http'
  const origin = `${proto}://${host}`
  const res = await fetch(`${origin}/api/reservations?${qs.toString()}`, { cache: 'no-store' })
  return res.json()
}

export default async function ReservationsPage({ searchParams }: { searchParams: { phone?: string; date?: string } }) {
  const phone = (searchParams?.phone || '').trim()
  const date = (searchParams?.date || '').trim()
  const data = phone ? await fetchByPhone(phone, date || undefined) : { data: [] }
  const list = data.data || []
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-4">我的預約</h1>
      <form className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3" action="/reservations" method="get">
        <input name="phone" placeholder="輸入您的電話" defaultValue={phone} className="rounded border px-3 py-2" />
        <input name="date" type="date" defaultValue={date} className="rounded border px-3 py-2" />
        <button className="rounded bg-indigo-600 px-4 py-2 text-white">查詢</button>
      </form>

      {phone === '' && (
        <p className="text-sm text-gray-600 mb-4">為保護隱私，請輸入您的電話以查詢預約資料。</p>
      )}

      <ul className="divide-y rounded border bg-white">
        {list.map((r: any) => (
          <li key={r.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{r.customer_name} · {r.party_size}人</div>
                <div className="text-xs text-gray-600 mt-1">
                  {new Date(r.reservation_time).toLocaleDateString('zh-TW')} {new Date(r.reservation_time).toLocaleTimeString('zh-TW', {hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Taipei'})} · 
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                    r.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    r.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    r.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {r.status === 'pending' ? '待確認' : 
                     r.status === 'confirmed' ? '已確認' :
                     r.status === 'cancelled' ? '已取消' :
                     r.status === 'completed' ? '已完成' : r.status}
                  </span>
                </div>
                {r.table_id && TABLE_NAMES[r.table_id] && (
                  <div className="text-xs text-indigo-600 mt-1 font-medium">
                    桌位：{TABLE_NAMES[r.table_id].name}（{TABLE_NAMES[r.table_id].type}）
                  </div>
                )}
                {r.special_requests && (
                  <div className="text-xs text-gray-500 mt-1">特殊需求: {r.special_requests}</div>
                )}
                {r.customer_notes && (
                  <div className="text-xs text-gray-500 mt-1">{r.customer_notes}</div>
                )}
                {r.duration_minutes && (
                  <div className="text-xs text-gray-500 mt-1">用餐時間: {r.duration_minutes}分鐘</div>
                )}
              </div>
              <div className="text-xs text-gray-400">
                {new Date(r.created_at).toLocaleString('zh-TW')}
              </div>
            </div>
          </li>
        ))}
        {phone && list.length === 0 && <li className="p-3 text-sm text-gray-500">查無資料，請確認電話或日期。</li>}
      </ul>

      <div className="mt-6 text-sm">
        <Link className="text-indigo-700 underline" href="/book">我要訂位</Link>
      </div>
    </main>
  )
}
