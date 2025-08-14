'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  className?: string
  disabled?: boolean
  minDate?: string
  maxDate?: string
}

export default function DatePicker({ 
  value, 
  onChange, 
  className = '', 
  disabled = false,
  minDate,
  maxDate 
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement | null>(null)
  const [position, setPosition] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })

  const [viewMonth, setViewMonth] = useState(() => {
    const date = value ? new Date(value) : new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // 計算日曆網格
  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    
    // 本月第一天是星期幾 (0=星期日)
    const firstDayOfMonth = new Date(year, month, 1)
    const startDayOfWeek = firstDayOfMonth.getDay()
    
    // 本月有多少天
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    // 上個月的最後幾天
    const prevMonth = new Date(year, month - 1, 1)
    const daysInPrevMonth = new Date(year, month, 0).getDate()
    
    const days = []
    
    // 填充上個月的日期
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), day)
      days.push({
        date,
        day,
        isCurrentMonth: false,
        dateString: date.toISOString().split('T')[0]
      })
    }
    
    // 填充本月的日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      days.push({
        date,
        day,
        isCurrentMonth: true,
        dateString: date.toISOString().split('T')[0]
      })
    }
    
    // 填充下個月的日期 (補足42個格子 - 6週)
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day)
      days.push({
        date,
        day,
        isCurrentMonth: false,
        dateString: date.toISOString().split('T')[0]
      })
    }
    
    return days
  }, [viewMonth])

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ]

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  const navigateMonth = (direction: 'prev' | 'next') => {
    setViewMonth(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const selectDate = (dateString: string) => {
    onChange(dateString)
    setIsOpen(false)
  }

  // 根據按鈕位置計算 Portal 彈窗座標
  const updatePosition = () => {
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()

    const panelWidth = 320 // w-80
    const margin = 8
    let left = rect.left
    // 若超出右邊界，向左收斂
    if (left + panelWidth > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - margin - panelWidth)
    }
    const top = rect.bottom + 4 // 與按鈕有一點間距

    setPosition({ top, left, width: rect.width })
  }

  useEffect(() => {
    if (!isOpen) return
    updatePosition()
    const onScroll = () => updatePosition()
    const onResize = () => updatePosition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const isDateDisabled = (dateString: string) => {
    if (disabled) return true
    
    // 不能選擇過去的日期
    if (dateString < todayStr) return true
    
    // 檢查最小日期限制
    if (minDate && dateString < minDate) return true
    
    // 檢查最大日期限制
    if (maxDate && dateString > maxDate) return true
    
    return false
  }

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '請選擇日期'
    
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    
    if (dateString === todayStr) {
      return `今天 (${date.getMonth() + 1}/${date.getDate()})`
    } else if (dateString === tomorrow.toISOString().split('T')[0]) {
      return `明天 (${date.getMonth() + 1}/${date.getDate()})`
    } else {
      const weekDay = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()]
      return `${date.getMonth() + 1}月${date.getDate()}日 ${weekDay}`
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* 日期選擇按鈕 */}
      <button
        type="button"
        ref={anchorRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-3 text-left border rounded-lg text-sm transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-indigo-500
          ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50 hover:border-indigo-300'}
          ${isOpen ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-gray-300'}
          ${!value ? 'text-gray-500' : 'text-gray-900'}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-md ${value ? 'bg-indigo-100' : 'bg-gray-100'}`}>
              <svg className={`w-4 h-4 ${value ? 'text-indigo-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className={`text-sm ${value ? 'font-medium' : 'font-normal'}`}>
                {formatDisplayDate(value)}
              </span>
              {value && (
                <span className="text-xs text-gray-500">
                  點擊更改日期
                </span>
              )}
            </div>
          </div>
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* 日曆彈窗 (使用 Portal，避免 overflow-hidden 裁切) */}
      {isOpen && !disabled && createPortal(
        <>
          {/* 背景覆蓋層 */}
          <div
            className="fixed inset-0 z-[999]"
            onClick={() => setIsOpen(false)}
          />

          {/* 浮動日曆面板 */}
          <div
            className="fixed z-[1000] w-80 bg-white border border-gray-200 rounded-lg shadow-xl animate-in slide-in-from-top-2 duration-200"
            style={{ top: position.top, left: position.left }}
          >
            {/* 月份導航 */}
            <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
              <button
                type="button"
                onClick={() => navigateMonth('prev')}
                className="p-1.5 hover:bg-white/80 rounded-md transition-colors duration-200"
              >
                <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
              </button>

              <h3 className="text-sm font-semibold text-gray-800 bg-white/60 px-3 py-1 rounded-full">
                {viewMonth.getFullYear()}年 {monthNames[viewMonth.getMonth()]}
              </h3>

              <button
                type="button"
                onClick={() => navigateMonth('next')}
                className="p-1.5 hover:bg-white/80 rounded-md transition-colors duration-200"
              >
                <ChevronRightIcon className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* 星期標題 */}
            <div className="grid grid-cols-7 border-b bg-gray-50">
              {weekDays.map(day => (
                <div key={day} className="p-2.5 text-xs font-semibold text-gray-600 text-center">
                  {day}
                </div>
              ))}
            </div>

            {/* 日曆網格 */}
            <div className="grid grid-cols-7 p-2 bg-white">
              {calendarDays.map((day, index) => {
                const isSelected = value === day.dateString
                const isToday = day.dateString === todayStr
                const isDisabled = isDateDisabled(day.dateString)

                return (
                  <button
                    key={`${day.dateString}-${index}`}
                    type="button"
                    onClick={() => !isDisabled && selectDate(day.dateString)}
                    disabled={isDisabled}
                    className={`
                      w-8 h-8 text-sm rounded-lg m-0.5 transition-all duration-200 font-medium
                      ${!day.isCurrentMonth
                        ? 'text-gray-300'
                        : isDisabled
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 hover:scale-105'
                      }
                      ${isSelected ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md transform scale-105' : ''}
                      ${isToday && !isSelected ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 font-bold ring-2 ring-amber-300' : ''}
                    `}
                  >
                    {day.day}
                  </button>
                )
              })}
            </div>

            {/* 快速選擇 */}
            <div className="border-t p-3 bg-gray-50 rounded-b-lg">
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => selectDate(todayStr)}
                  className="px-3 py-1.5 text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors duration-200 font-medium"
                >
                  🗓️ 今天
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tomorrow = new Date(today)
                    tomorrow.setDate(today.getDate() + 1)
                    selectDate(tomorrow.toISOString().split('T')[0])
                  }}
                  className="px-3 py-1.5 text-purple-600 hover:bg-purple-100 rounded-full transition-colors duration-200 font-medium"
                >
                  ➡️ 明天
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextWeek = new Date(today)
                    nextWeek.setDate(today.getDate() + 7)
                    selectDate(nextWeek.toISOString().split('T')[0])
                  }}
                  className="px-3 py-1.5 text-green-600 hover:bg-green-100 rounded-full transition-colors duration-200 font-medium"
                >
                  📅 下週
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500 text-center">
                💡 點擊日期快速選擇，最多可預約30天內
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
