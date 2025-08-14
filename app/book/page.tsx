'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import TanaDateInput from '../../components/TanaDateInput'

export default function BookPage() {
  const [date, setDate] = useState<string>('')
  const [time, setTime] = useState<string>('19:00')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [party, setParty] = useState(2)
  const [specialRequests, setSpecialRequests] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [successData, setSuccessData] = useState<{
    assignedTable?: { name: string; type: string };
    message?: string;
  } | null>(null)
  const [availability, setAvailability] = useState<Record<string, number>>({})
  const [tableAvailability, setTableAvailability] = useState<{
    hasAvailable: boolean;
    availableTables: any[];
    message: string;
  } | null>(null)
  const [checkingTables, setCheckingTables] = useState(false)
  const [recommendations, setRecommendations] = useState<{
    availableSlots: Array<{ time: string; available: boolean }>;
    recommendations: Array<{ time: string; displayTime: string; reason: string }>;
    preferredTime?: { time: string; available: boolean; reason: string };
    totalAvailable: number;
    message: string;
  } | null>(null)
  const [recLoading, setRecLoading] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [step, setStep] = useState<'search' | 'details'>('search')
  // 不再區分午晚餐

  const canSubmit = date && time && name.trim() && phone.trim() && party > 0 && tableAvailability?.hasAvailable

  // 依時間字串判斷區段
  // 取消 period 分類

  // 取得推薦/可用時段（只需要日期與人數）
  async function getRecommendations() {
    if (!date || party <= 0) {
      setRecommendations(null)
      return
    }
    
    try {
      setRecLoading(true)
      const res = await fetch(`/api/recommendations?date=${encodeURIComponent(date)}&partySize=${party}&preferredTime=${encodeURIComponent(time)}`)
      const json = await res.json()
      
      if (res.ok) {
        setRecommendations(json)
        // 如果用戶選擇的時間不可用，自動顯示推薦
        if (json.preferredTime && !json.preferredTime.available) {
          setShowRecommendations(true)
        }
      } else {
        console.error('取得推薦時段失敗:', json.error)
      }
    } catch (error) {
      console.error('取得推薦時段錯誤:', error)
    } finally {
      setRecLoading(false)
    }
  }

  // 檢查桌位可用性
  async function checkTableAvailability() {
    if (!date || !time || party <= 0) {
      setTableAvailability(null)
      return
    }
    
    setCheckingTables(true)
    try {
      const datetime = `${date}T${time}:00`
      const res = await fetch(`/api/tables?datetime=${encodeURIComponent(datetime)}&partySize=${party}`)
      const json = await res.json()
      
      if (res.ok) {
        setTableAvailability(json)
      } else {
        setTableAvailability({
          hasAvailable: false,
          availableTables: [],
          message: json.error || '檢查桌位失敗'
        })
      }
    } catch (e) {
      setTableAvailability({
        hasAvailable: false,
        availableTables: [],
        message: '系統錯誤，請稍後再試'
      })
    } finally {
      setCheckingTables(false)
    }
  }

  // 日期/人數變更時，更新可預約時段
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      getRecommendations()
    }, 400)
    return () => clearTimeout(timeoutId)
  }, [date, party])

  // 有選擇時段並進入細節步驟時，檢查桌位
  useEffect(() => {
    if (step !== 'details') return
    if (!date || !time || party <= 0) return
    const timeoutId = setTimeout(() => {
      checkTableAvailability()
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [step, date, time, party])

  useEffect(() => {
    async function load() {
      setAvailability({})
      if (!date) return
      try {
        const res = await fetch(`/api/availability?date=${date}`, { cache: 'no-store' })
        const json = await res.json()
        if (res.ok) setAvailability(json.by_time || {})
      } catch {}
    }
    load()
  }, [date])

  async function submit() {
    setLoading(true)
    setError(null)
    setOk(false)
    setSuccessData(null)
    
    try {
      if (!date) throw new Error('請選擇日期')
      if (!name.trim()) throw new Error('請輸入姓名')
      if (!phone.trim()) throw new Error('請輸入電話')
      if (!tableAvailability?.hasAvailable) throw new Error('該時段暫無可用桌位，請選擇其他時間')
      
      console.log('Submitting reservation:', { 
        customer_name: name, 
        customer_phone: phone, 
        customer_email: email || null,
        party_size: party, 
        reservation_date: date, 
        reservation_time: time,
        special_requests: specialRequests || null
      })
      
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name,
          customer_phone: phone,
          customer_email: email || null,
          party_size: party,
          reservation_date: date,
          reservation_time: time,
          special_requests: specialRequests || null
        })
      })
      const json = await res.json()
      
      console.log('API response:', { status: res.status, data: json })
      
      if (!res.ok) {
        console.error('API error:', json)
        if (res.status === 409) {
          // 預約衝突，顯示推薦時段
          setShowRecommendations(true)
          await checkTableAvailability()
          await getRecommendations()
        }
        throw new Error(json.error || json.message || '建立預約失敗')
      }
      
      setOk(true)
      setSuccessData({
        assignedTable: json.assignedTable,
        message: json.message
      })
      setName(''); setPhone(''); setEmail(''); setParty(2); setTime('19:00'); setDate(''); setSpecialRequests('')
      setTableAvailability(null)
    } catch (e) {
      console.error('Submit error:', e)
      const errorMessage = (e as Error).message
      
      // 如果是衝突錯誤，顯示更詳細的訊息
      if (errorMessage.includes('30分鐘內') || errorMessage.includes('衝突')) {
        setError(`${errorMessage}`)
        setShowRecommendations(true)
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      {/* 返回首頁按鈕 */}
      <div className="mb-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm px-3 py-1.5 pixel-chip">
          <span>←</span>
          <span>返回首頁</span>
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">線上訂位</h1>
        <p className="mt-2 text-sm text-gray-600">選擇日期與時間，留下您的聯絡資訊，我們將為您保留座位。</p>
      </div>

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="grid gap-0 md:grid-cols-2">
          {/* 左側：選日期 / 人數 / 可預約時段 */}
          <div className="p-6 border-b md:border-b-0 md:border-r">
            <h2 className="mb-4 text-base font-semibold text-gray-900">選擇日期與時段</h2>

            <label className="mb-1 block text-sm text-gray-700">用餐日期</label>
            <TanaDateInput
              value={date}
              onChange={(v: string) => { setDate(v); setStep('search') }}
              min={new Date().toISOString().split('T')[0]}
              max={(() => { const d=new Date(); d.setDate(d.getDate()+30); return d.toISOString().split('T')[0] })()}
              className="w-full"
            />

            <label className="mt-4 mb-1 block text-sm text-gray-700">人數</label>
            <div className="inline-flex items-center rounded-md border">
              <button type="button" onClick={() => setParty(Math.max(1, party - 1))} className="h-10 w-10 select-none text-lg leading-none hover:bg-gray-50" aria-label="減少人數">−</button>
              <input type="number" min={1} className="w-16 border-x px-2 text-center text-sm focus:outline-none" value={party} onChange={e => setParty(Math.max(1, Number(e.target.value) || 1))} />
              <button type="button" onClick={() => setParty(Math.min(20, party + 1))} className="h-10 w-10 select-none text-lg leading-none hover:bg-gray-50" aria-label="增加人數">+</button>
            </div>

            {/* 可預約時段清單（依 Supabase business_hours 驅動） */}
            <div className="mt-4">
              {recLoading ? (
                <div className="text-sm text-gray-500">載入可預約時段中…</div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {(recommendations?.availableSlots ?? []).map(s => (
                      <button
                        key={s.time}
                        type="button"
                        disabled={!s.available}
                        onClick={() => { setTime(s.time); setStep('details') }}
                        className={`px-3 py-2 rounded-md text-sm border ${s.available? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}
                      >
                        {s.time}
                      </button>
                    ))}
                  </div>
                  {!recommendations && (
                    <p className="text-xs text-gray-500 mt-2">提示：先選日期與人數即可顯示可預約時段</p>
                  )}
                  {recommendations && (recommendations.availableSlots?.length ?? 0) === 0 && (
                    <p className="text-xs text-gray-600 mt-2">當日不營業或目前沒有可預約時段</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 右側：顧客資訊（僅在已選時段後顯示） */}
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">{step==='details' ? '確認與聯絡資料' : '等待選擇時段'}</h2>
              {step==='details' && (
                <button className="text-xs text-indigo-600 hover:underline" onClick={() => setStep('search')}>變更時段</button>
              )}
            </div>

            {step !== 'details' ? (
              <div className="text-sm text-gray-600">
                請先於左側選擇日期、人數與可預約的時間。
              </div>
            ) : (
              <>
            <div className="mb-3 text-sm text-gray-700">已選擇：{date} {time} · {party} 位</div>
            <h3 className="mb-2 text-sm font-medium text-gray-900">聯絡與人數</h3>

            <label className="mb-1 block text-sm text-gray-700">姓名</label>
            <input
              placeholder="王小明"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={name}
              onChange={e => setName(e.target.value)}
            />

            <label className="mt-4 mb-1 block text-sm text-gray-700">電話</label>
            <input
              placeholder="0912-345-678"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              inputMode="tel"
            />

            <label className="mt-4 mb-1 block text-sm text-gray-700">Email（選填）</label>
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />

            <label className="mt-4 mb-1 block text-sm text-gray-700">人數</label>
            <div className="inline-flex items-center rounded-md border">
              <button
                type="button"
                onClick={() => setParty(Math.max(1, party - 1))}
                className="h-10 w-10 select-none text-lg leading-none hover:bg-gray-50"
                aria-label="減少人數"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                className="w-16 border-x px-2 text-center text-sm focus:outline-none"
                value={party}
                onChange={e => setParty(Math.max(1, Number(e.target.value) || 1))}
              />
              <button
                type="button"
                onClick={() => setParty(Math.min(20, party + 1))}
                className="h-10 w-10 select-none text-lg leading-none hover:bg-gray-50"
                aria-label="增加人數"
              >
                +
              </button>
            </div>

            {/* 桌位可用性顯示 */}
            {(date && time && party > 0) && (
              <div className="mt-4 space-y-3">
                <div className="rounded-md border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">桌位狀態</span>
                    {checkingTables && (
                      <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                    )}
                  </div>
                  
                  {tableAvailability && !checkingTables && (
                    <div className={`text-sm ${tableAvailability.hasAvailable ? 'text-green-700' : 'text-red-700'}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${tableAvailability.hasAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        {tableAvailability.message}
                      </div>
                      
                      {tableAvailability.hasAvailable && tableAvailability.availableTables.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          建議桌位：{tableAvailability.availableTables[0].name}（{tableAvailability.availableTables[0].type}）
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!tableAvailability && !checkingTables && (
                    <div className="text-sm text-gray-500">請選擇完整的預約資訊</div>
                  )}
                </div>

                {/* 推薦時段顯示 */}
                {recommendations && (!tableAvailability?.hasAvailable || showRecommendations) && (
                  <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-orange-800">推薦時段</span>
                      {!showRecommendations && (
                        <button
                          type="button"
                          onClick={() => setShowRecommendations(true)}
                          className="text-xs text-orange-600 hover:text-orange-700"
                        >
                          查看推薦
                        </button>
                      )}
                    </div>
                    
                    {showRecommendations && (
                      <div className="space-y-2">
                        {recommendations.preferredTime && !recommendations.preferredTime.available && (
                          <div className="text-sm text-red-700 mb-2">
                            <span className="font-medium">{recommendations.preferredTime.time}</span> - {recommendations.preferredTime.reason}
                          </div>
                        )}
                        
                        {recommendations.recommendations.length > 0 ? (
                          <div className="space-y-2">
                            <div className="text-sm text-orange-700">以下時段可接受預約：</div>
                            <div className="grid grid-cols-2 gap-2">
                              {recommendations.recommendations.map((rec, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => {
                                    setTime(rec.time)
                                    setShowRecommendations(false)
                                  }}
                                  className="px-3 py-2 text-sm bg-white border border-orange-300 rounded hover:bg-orange-100 transition-colors text-left"
                                >
                                  <div className="font-medium text-orange-800">{rec.displayTime}</div>
                                  <div className="text-xs text-orange-600">{rec.reason}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-orange-700">
                            很抱歉，當日所有時段都已被預約，請選擇其他日期。
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center pt-2 border-t border-orange-200">
                          <span className="text-xs text-orange-600">
                            可用時段：{recommendations.totalAvailable} 個
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowRecommendations(false)}
                            className="text-xs text-orange-600 hover:text-orange-700"
                          >
                            收起
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <label className="mt-4 mb-1 block text-sm text-gray-700">特殊需求（選填）</label>
            <textarea
              placeholder="靠窗座位、兒童座椅、生日慶祝等..."
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              value={specialRequests}
              onChange={e => setSpecialRequests(e.target.value)}
            />

            {/* 錯誤訊息顯示 */}
            {error && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 text-red-500 mt-0.5">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-red-800 font-medium">無法完成預約</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                    {showRecommendations && recommendations && recommendations.recommendations.length > 0 && (
                      <p className="text-sm text-red-600 mt-2">
                        💡 請查看下方推薦時段，或選擇其他日期
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="text-red-400 hover:text-red-500"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={submit}
              disabled={loading || !canSubmit}
              className="mt-5 inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && (
                <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              送出預約
            </button>

            <p className="mt-3 text-xs text-gray-500">我們僅用於聯繫與訂位確認，不會對外公開您的資訊。</p>

            {ok && (
              <div className="mt-5 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                <div className="font-medium text-green-900">預約成功！</div>
                <div className="mt-1">
                  {successData?.assignedTable && (
                    <div className="mb-2">
                      已為您安排：<span className="font-medium">{successData.assignedTable.name}</span>（{successData.assignedTable.type}）
                    </div>
                  )}
                  {successData?.message && (
                    <div className="mb-2 text-green-700">{successData.message}</div>
                  )}
                  您可前往
                  <Link className="px-1 font-semibold text-green-700 underline" href="/reservations">我的預約</Link>
                  輸入電話查詢詳細資訊。
                </div>
              </div>
            )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* 行動版浮動返回鍵 */}
      <Link
        href="/"
        className="md:hidden fixed bottom-4 right-4 px-3 py-2 text-sm pixel-chip"
        aria-label="返回首頁"
      >
        ← 返回
      </Link>
    </main>
  )
}
