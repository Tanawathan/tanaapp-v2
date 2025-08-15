'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type ReservationLike = {
  id: string
  customer_name?: string
  customer_phone?: string
  restaurant_name?: string
  reservation_time: string | Date
  estimated_end_time?: string | Date | null
  duration_minutes?: number | null
  party_size?: number | null
  adult_count?: number | null
  child_count?: number | null
  status?: string
  special_requests?: string | null
  created_at?: string | Date | null
}

export default function PassModal({ res }: { res: ReservationLike }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  // mark mounted to safely access document for portals
  useEffect(() => setMounted(true), [])

  // ESC close when open
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const start = new Date(res?.reservation_time || new Date())
  const end = res?.estimated_end_time
    ? new Date(res.estimated_end_time)
    : new Date(start.getTime() + (res?.duration_minutes ?? 90) * 60_000)
  const code = String(res?.id || '').slice(0, 8).toUpperCase()
  const adults = res?.adult_count ?? res?.party_size ?? 0
  const children = res?.child_count ?? 0

  const tTime = (d: Date) => d.toLocaleTimeString('zh-TW', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Taipei'
  })

  const statusLabel = (s?: string) => ({
    pending: '待確認', confirmed: '已確認', cancelled: '已取消', completed: '已完成', seated: '已入座', no_show: '未到'
  } as Record<string, string>)[s || ''] || (s || '-')

  return (
    <>
      <button
        type="button"
        className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50"
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
      >
        入場證
      </button>

      {open && (
        mounted && typeof document !== 'undefined' && (document.body)
          ? createPortal(
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 p-4 sm:p-6"
          onClick={() => setOpen(false)}
          aria-label="入場證對話框背景"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="預約入場證"
            className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-2xl mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-600 text-white px-5 py-3 flex items-center justify-between">
              <div className="text-sm">
                <div className="font-semibold">{res?.restaurant_name || 'Tana Restaurant'} · Boarding Pass</div>
                <div className="opacity-80 text-[12px]">預約入場證 · 櫃檯出示即可快速確認</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] opacity-90">代碼</div>
                <div className="text-lg font-mono tracking-widest">{code}</div>
              </div>
            </div>

            <div className="p-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="border rounded-xl overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  <div className="flex-1 p-4">
                    <div className="text-xs text-gray-500">旅客姓名</div>
                    <div className="text-lg font-semibold text-gray-900">{res?.customer_name || '-'}</div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-500">日期</div>
                        <div className="font-medium">{start.toLocaleDateString('zh-TW')}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">時間</div>
                        <div className="font-medium">{tTime(start)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">狀態</div>
                        <div className="inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">{statusLabel(res?.status)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">用餐時長</div>
                        <div className="font-medium">{res?.duration_minutes ?? 90} 分鐘（~ {tTime(end)}）</div>
                      </div>
                    </div>

                    <div className="mt-3 text-sm">
                      <div className="text-xs text-gray-500">人數</div>
                      <div className="font-medium">{res?.party_size ?? adults} 位（成人 {adults}、兒童 {children}）</div>
                    </div>

                    {res?.special_requests && (
                      <div className="mt-3 text-sm">
                        <div className="text-xs text-gray-500">備註</div>
                        <div className="text-gray-800 whitespace-pre-wrap break-words">{res.special_requests}</div>
                      </div>
                    )}
                  </div>

                  <div className="hidden sm:block w-px bg-gray-200" />

                  <div className="sm:w-56 p-4 flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-gray-200">
                    <div className="text-xs text-gray-500">確認碼</div>
                    <div className="mt-1 text-2xl font-mono tracking-widest">{code}</div>
                    <div className="mt-3 text-[11px] text-gray-500">請於櫃檯出示此票據</div>
                    <div className="mt-2 text-[11px] text-gray-400">{res?.customer_phone || ''}</div>
                  </div>
                </div>

                <div className="border-t border-dashed p-3 text-[11px] text-gray-500 flex items-center justify-between">
                  <div>建立：{res?.created_at ? new Date(res.created_at).toLocaleString('zh-TW') : '-'}</div>
                  <div>ID：{res?.id}</div>
                </div>
              </div>

              <div className="mt-4 flex gap-2 justify-end sticky bottom-0 bg-white/80 backdrop-blur p-2 rounded">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-sm rounded border bg-gray-50 hover:bg-gray-100"
                >
                  列印
                </button>
                <button
                  ref={closeBtnRef}
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white"
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        </div>, document.body)
          : (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 p-4 sm:p-6"
          onClick={() => setOpen(false)}
          aria-label="入場證對話框背景"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="預約入場證"
            className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-2xl mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-600 text-white px-5 py-3 flex items-center justify-between">
              <div className="text-sm">
                <div className="font-semibold">{res?.restaurant_name || 'Tana Restaurant'} · Boarding Pass</div>
                <div className="opacity-80 text-[12px]">預約入場證 · 櫃檯出示即可快速確認</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] opacity-90">代碼</div>
                <div className="text-lg font-mono tracking-widest">{code}</div>
              </div>
            </div>

            <div className="p-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="border rounded-xl overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  <div className="flex-1 p-4">
                    <div className="text-xs text-gray-500">旅客姓名</div>
                    <div className="text-lg font-semibold text-gray-900">{res?.customer_name || '-'}</div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-500">日期</div>
                        <div className="font-medium">{start.toLocaleDateString('zh-TW')}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">時間</div>
                        <div className="font-medium">{tTime(start)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">狀態</div>
                        <div className="inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">{statusLabel(res?.status)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">用餐時長</div>
                        <div className="font-medium">{res?.duration_minutes ?? 90} 分鐘（~ {tTime(end)}）</div>
                      </div>
                    </div>

                    <div className="mt-3 text-sm">
                      <div className="text-xs text-gray-500">人數</div>
                      <div className="font-medium">{res?.party_size ?? adults} 位（成人 {adults}、兒童 {children}）</div>
                    </div>

                    {res?.special_requests && (
                      <div className="mt-3 text-sm">
                        <div className="text-xs text-gray-500">備註</div>
                        <div className="text-gray-800 whitespace-pre-wrap break-words">{res.special_requests}</div>
                      </div>
                    )}
                  </div>

                  <div className="hidden sm:block w-px bg-gray-200" />

                  <div className="sm:w-56 p-4 flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-gray-200">
                    <div className="text-xs text-gray-500">確認碼</div>
                    <div className="mt-1 text-2xl font-mono tracking-widest">{code}</div>
                    <div className="mt-3 text-[11px] text-gray-500">請於櫃檯出示此票據</div>
                    <div className="mt-2 text-[11px] text-gray-400">{res?.customer_phone || ''}</div>
                  </div>
                </div>

                <div className="border-t border-dashed p-3 text-[11px] text-gray-500 flex items-center justify-between">
                  <div>建立：{res?.created_at ? new Date(res.created_at).toLocaleString('zh-TW') : '-'}</div>
                  <div>ID：{res?.id}</div>
                </div>
              </div>

              <div className="mt-4 flex gap-2 justify-end sticky bottom-0 bg-white/80 backdrop-blur p-2 rounded">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-sm rounded border bg-gray-50 hover:bg-gray-100"
                >
                  列印
                </button>
                <button
                  ref={closeBtnRef}
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white"
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        </div>
          )
      )}
    </>
  )
}
