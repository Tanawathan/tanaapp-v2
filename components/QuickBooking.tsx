'use client'
import { useState } from 'react'
import { CalendarDaysIcon, ClockIcon, UserGroupIcon, PhoneIcon } from '@heroicons/react/24/outline'

export default function QuickBooking() {
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    partySize: 2,
    phone: ''
  })

  const [isLoading, setIsLoading] = useState(false)

  const timeSlots = [
    '11:30', '12:00', '12:30', '13:00', '13:30', '17:30', 
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // 這裡可以直接提交預約或跳轉到詳細預約頁面
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reservation_date: formData.date,
          reservation_time: formData.time,
          party_size: formData.partySize,
          customer_phone: formData.phone,
          customer_name: '快速預約', // 可以後續完善
        })
      })

      if (response.ok) {
        alert('預約成功！我們會盡快與您聯繫確認。')
        setFormData({ date: '', time: '', partySize: 2, phone: '' })
      } else {
        const error = await response.json()
        alert(error.error || '預約失敗，請稍後再試')
      }
    } catch (error) {
      alert('預約失敗，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  // 獲取今天和未來7天的日期
  const getAvailableDates = () => {
    const dates = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push({
        value: date.toISOString().split('T')[0],
        label: i === 0 ? '今天' : i === 1 ? '明天' : date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
      })
    }
    return dates
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-6">
        <CalendarDaysIcon className="w-6 h-6 text-violet-600" />
        <h2 className="text-xl font-bold text-gray-900">快速預約</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 日期選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">選擇日期</label>
          <div className="grid grid-cols-4 gap-2">
            {getAvailableDates().map((date) => (
              <button
                key={date.value}
                type="button"
                onClick={() => setFormData({ ...formData, date: date.value })}
                className={`p-2 text-sm rounded-lg border transition-all ${
                  formData.date === date.value
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-violet-300'
                }`}
              >
                {date.label}
              </button>
            ))}
          </div>
        </div>

        {/* 時間選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">用餐時間</label>
          <div className="grid grid-cols-4 gap-2">
            {timeSlots.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => setFormData({ ...formData, time })}
                className={`p-2 text-sm rounded-lg border transition-all ${
                  formData.time === time
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-violet-300'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* 人數選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">用餐人數</label>
          <div className="flex items-center gap-3">
            <UserGroupIcon className="w-5 h-5 text-gray-400" />
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setFormData({ ...formData, partySize: num })}
                  className={`w-10 h-10 rounded-lg border text-sm font-medium transition-all ${
                    formData.partySize === num
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-violet-300'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 電話號碼 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">聯絡電話</label>
          <div className="relative">
            <PhoneIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="請輸入您的電話號碼"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              required
            />
          </div>
        </div>

        {/* 提交按鈕 */}
        <button
          type="submit"
          disabled={!formData.date || !formData.time || !formData.phone || isLoading}
          className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-pink-600 text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? '預約中...' : '立即預約'}
        </button>

        {/* 電話預約提示 */}
        <div className="text-center pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600 mb-2">或直接致電預約</p>
          <a 
            href="tel:0901222861"
            className="inline-flex items-center gap-2 text-violet-600 font-medium hover:text-violet-700 transition-colors"
          >
            <PhoneIcon className="w-4 h-4" />
            0901-222-861
          </a>
        </div>
      </form>
    </div>
  )
}
