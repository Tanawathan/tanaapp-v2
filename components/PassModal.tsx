'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function PassModal({ res }: { res: any }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => { setMounted(true) }, [])
  
  // ESC 關閉
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') setOpen(false) 
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  
  const code = String(res.id || '').slice(0, 8).toUpperCase()
  const start = new Date(res.reservation_time)
  const end = res.estimated_end_time ? new Date(res.estimated_end_time) : new Date(start.getTime() + (res.duration_minutes || 90) * 60000)
  const dateText = start.toLocaleDateString('zh-TW')
  const timeText = start.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Taipei' })
  const endText = end.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Taipei' })
  const adults = res.adult_count ?? res.party_size
  const children = res.child_count ?? 0

  const statusLabel = (s: string) => ({
    pending: '待確認', confirmed: '已確認', cancelled: '已取消', completed: '已完成', seated: '已入座', no_show: '未到',
  } as any)[s] || s

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('PassModal: 入場證 clicked!', { open, mounted })
    setOpen(true)
  }

  return (
    <>
      <button 
        type="button" 
        onClick={handleClick}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
        className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 cursor-pointer relative z-10"
        style={{ pointerEvents: 'auto' }}
      >
        入場證
      </button>
      {mounted && open && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="預約入場證"
               className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-600 text-white px-5 py-3 flex items-center justify-between">
              <div className="text-sm">
                <div className="font-semibold">{res.restaurant_name || 'Tana Restaurant'} · Boarding Pass</div>
                <div className="opacity-80 text-[12px]">預約入場證 · 出示此票據即可快速確認</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] opacity-90">代碼</div>
                <div className="text-lg font-mono tracking-widest">{code}</div>
              </div>
            </div>
            <div className="p-5">
              <div className="border rounded-xl overflow-hidden">
                <div className="flex">
                  <div className="flex-1 p-4">
                    <div className="text-xs text-gray-500">旅客姓名</div>
                    <div className="text-lg font-semibold text-gray-900">{res.customer_name}</div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-500">日期</div>
                        <div className="font-medium">{dateText}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">時間</div>
                        <div className="font-medium">{timeText}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">狀態</div>
                        <div className="inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">{statusLabel(res.status)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">用餐時長</div>
                        <div className="font-medium">{res.duration_minutes || 90} 分鐘（~ {endText}）</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm">
                      <div className="text-xs text-gray-500">人數</div>
                      <div className="font-medium">{res.party_size} 位（成人 {adults}、兒童 {children}）</div>
                    </div>
                    {res.special_requests && (
                      <div className="mt-3 text-sm">
                        <div className="text-xs text-gray-500">備註</div>
                        <div className="text-gray-800 whitespace-pre-wrap break-words">{res.special_requests}</div>
                      </div>
                    )}
                  </div>
                  <div className="w-px bg-gray-200"/>
                  <div className="w-56 p-4 flex flex-col items-center justify-center">
                    <div className="text-xs text-gray-500">確認碼</div>
                    <div className="mt-1 text-2xl font-mono tracking-widest">{code}</div>
                    <div className="mt-3 text-[11px] text-gray-500">請於櫃檯出示此票據</div>
                    <div className="mt-2 text-[11px] text-gray-400">{res.customer_phone || ''}</div>
                  </div>
                </div>
                <div className="border-t border-dashed p-3 text-[11px] text-gray-500 flex items-center justify-between">
                  <div>建立：{res.created_at ? new Date(res.created_at).toLocaleString('zh-TW') : '-'}</div>
                  <div>ID：{res.id}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <button onClick={() => window.print()} className="px-3 py-1.5 text-sm rounded border bg-gray-50 hover:bg-gray-100">列印</button>
                <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white">關閉</button>
              </div>
            </div>
          </div>
        </div>, document.body)
      }
    </>
  )
}
