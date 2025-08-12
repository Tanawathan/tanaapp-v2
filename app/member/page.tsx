'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Customer {
  customer_id: string;
  name: string;
  email: string;
  phone: string;
  membership_level: string;
  created_at: string;
}

interface Reservation {
  id: string;
  customer_name: string;
  party_size: number;
  reservation_time: string;
  status: string;
  special_requests?: string;
  customer_notes?: string;
  duration_minutes?: number;
  created_at: string;
}

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

export default function MemberPage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'reservations'>('reservations')
  const router = useRouter()

  // 編輯資料狀態
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)

  // 預約修改狀態
  const [editingReservation, setEditingReservation] = useState<string | null>(null)
  const [editReservationData, setEditReservationData] = useState({
    reservation_date: '',
    reservation_time: '',
    party_size: 2,
    special_requests: ''
  })
  const [reservationLoading, setReservationLoading] = useState(false)

  useEffect(() => {
    fetchMemberData()
  }, [])

  async function fetchMemberData() {
    try {
      console.log('正在取得會員資料...')
      const res = await fetch('/api/auth/profile', {
        credentials: 'include'
      })

      if (!res.ok) {
        if (res.status === 401) {
          console.log('未授權，重導向至登入頁面')
          router.push('/login')
          return
        }
        throw new Error('取得會員資料失敗')
      }

      const data = await res.json()
      console.log('取得的會員資料:', data)
      console.log('預約記錄數量:', data.reservations?.length || 0)
      
      setCustomer(data.customer)
      setReservations(data.reservations || [])
      setEditName(data.customer.name)
      setEditPhone(data.customer.phone)

    } catch (err) {
      console.error('取得會員資料錯誤:', err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      router.push('/')
    } catch (err) {
      console.error('登出失敗:', err)
    }
  }

  async function handleUpdateProfile() {
    if (!editName.trim() || !editPhone.trim()) {
      return
    }

    setUpdateLoading(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editName,
          phone: editPhone
        })
      })

      if (!res.ok) {
        throw new Error('更新失敗')
      }

      const data = await res.json()
      setCustomer(data.customer)
      setEditMode(false)

    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUpdateLoading(false)
    }
  }

  // 開始編輯預約
  function startEditReservation(reservation: Reservation) {
    const reservationDateTime = new Date(reservation.reservation_time);
    const date = reservationDateTime.toISOString().split('T')[0];
    const time = reservationDateTime.toTimeString().slice(0, 5);
    
    setEditingReservation(reservation.id);
    setEditReservationData({
      reservation_date: date,
      reservation_time: time,
      party_size: reservation.party_size,
      special_requests: reservation.special_requests || ''
    });
  }

  // 取消編輯預約
  function cancelEditReservation() {
    setEditingReservation(null);
    setEditReservationData({
      reservation_date: '',
      reservation_time: '',
      party_size: 2,
      special_requests: ''
    });
  }

  // 儲存預約修改
  async function handleUpdateReservation(reservationId: string) {
    if (!editReservationData.reservation_date || !editReservationData.reservation_time) {
      alert('請填寫完整的預約資訊');
      return;
    }

    setReservationLoading(true);
    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editReservationData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '修改預約失敗');
      }

      const result = await response.json();
      alert(result.message || '預約修改成功！');
      
      // 重新載入預約資料
      await fetchMemberData();
      cancelEditReservation();

    } catch (error) {
      console.error('修改預約錯誤:', error);
      alert((error as Error).message);
    } finally {
      setReservationLoading(false);
    }
  }

  // 取消預約
  async function handleCancelReservation(reservationId: string, reservationTime: string) {
    const reservationDateTime = new Date(reservationTime);
    const now = new Date();
    const hoursUntilReservation = (reservationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilReservation < 2) {
      alert('預約時間不足2小時，無法取消。請直接聯繫餐廳。');
      return;
    }

    if (!confirm('確定要取消此預約嗎？此操作無法復原。')) {
      return;
    }

    setReservationLoading(true);
    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '取消預約失敗');
      }

      const result = await response.json();
      alert(result.message || '預約已成功取消！');
      
      // 重新載入預約資料
      await fetchMemberData();

    } catch (error) {
      console.error('取消預約錯誤:', error);
      alert((error as Error).message);
    } finally {
      setReservationLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <Link href="/" className="text-indigo-600 hover:text-indigo-500">返回首頁</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">會員中心</h1>
          <p className="text-gray-600">歡迎回來，{customer?.name}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          登出
        </button>
      </div>

      {/* 會員等級卡片 */}
      <div className="mb-6 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {customer?.membership_level === 'vip' ? 'VIP會員' : 
               customer?.membership_level === 'premium' ? '白金會員' : '一般會員'}
            </h2>
            <p className="text-indigo-100">會員編號：{customer?.customer_id.slice(-8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-indigo-100">加入日期</p>
            <p className="font-medium">
              {customer?.created_at ? new Date(customer.created_at).toLocaleDateString('zh-TW') : ''}
            </p>
          </div>
        </div>
      </div>

      {/* 選項卡 */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('reservations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reservations' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            訂位記錄 ({reservations.length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            個人資料
          </button>
        </nav>
      </div>

      {/* 內容區域 */}
      {activeTab === 'reservations' && (
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">我的訂位</h3>
              <Link
                href="/book"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
              >
                新增訂位
              </Link>
            </div>

            {reservations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">您還沒有任何訂位記錄</p>
                <Link
                  href="/book"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  立即訂位
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {reservations.map((reservation) => (
                  <div key={reservation.id} className="border rounded-lg p-4">
                    {editingReservation === reservation.id ? (
                      // 編輯模式
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900 mb-3">修改預約</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">預約日期</label>
                            <input
                              type="date"
                              value={editReservationData.reservation_date}
                              onChange={(e) => setEditReservationData({...editReservationData, reservation_date: e.target.value})}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">預約時間</label>
                            <input
                              type="time"
                              value={editReservationData.reservation_time}
                              onChange={(e) => setEditReservationData({...editReservationData, reservation_time: e.target.value})}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">用餐人數</label>
                          <select
                            value={editReservationData.party_size}
                            onChange={(e) => setEditReservationData({...editReservationData, party_size: parseInt(e.target.value)})}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            {[1,2,3,4,5,6,7,8].map(num => (
                              <option key={num} value={num}>{num}人</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">特殊需求</label>
                          <textarea
                            value={editReservationData.special_requests}
                            onChange={(e) => setEditReservationData({...editReservationData, special_requests: e.target.value})}
                            rows={2}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="素食、生日慶祝、兒童椅需求..."
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            onClick={cancelEditReservation}
                            disabled={reservationLoading}
                            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => handleUpdateReservation(reservation.id)}
                            disabled={reservationLoading}
                            className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {reservationLoading ? '儲存中...' : '儲存修改'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 顯示模式
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900">{reservation.party_size}人用餐</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              reservation.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              reservation.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              reservation.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {reservation.status === 'pending' ? '待確認' : 
                               reservation.status === 'confirmed' ? '已確認' :
                               reservation.status === 'cancelled' ? '已取消' :
                               reservation.status === 'completed' ? '已完成' : reservation.status}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>
                              用餐時間：{new Date(reservation.reservation_time).toLocaleString('zh-TW', {timeZone: 'Asia/Taipei'})}
                            </p>
                            {reservation.duration_minutes && (
                              <p>用餐時長：{reservation.duration_minutes}分鐘</p>
                            )}
                            {reservation.special_requests && (
                              <p>特殊需求：{reservation.special_requests}</p>
                            )}
                            {reservation.customer_notes && (
                              <p>備註：{reservation.customer_notes}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-xs text-gray-400">
                            預約時間：{new Date(reservation.created_at).toLocaleDateString('zh-TW')}
                          </div>
                          
                          {/* 操作按鈕 */}
                          {(reservation.status === 'pending' || reservation.status === 'confirmed') && (
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => startEditReservation(reservation)}
                                disabled={reservationLoading}
                                className="px-3 py-1 text-xs text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50 disabled:opacity-50"
                              >
                                修改
                              </button>
                              <button
                                onClick={() => handleCancelReservation(reservation.id, reservation.reservation_time)}
                                disabled={reservationLoading}
                                className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
                              >
                                取消
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">個人資料</h3>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  編輯資料
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                {editMode ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">{customer?.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">信箱</label>
                <p className="text-gray-900">{customer?.email}</p>
                <p className="text-xs text-gray-500">信箱無法修改</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電話</label>
                {editMode ? (
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">{customer?.phone}</p>
                )}
              </div>

              {editMode && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleUpdateProfile}
                    disabled={updateLoading || !editName.trim() || !editPhone.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {updateLoading ? '更新中...' : '儲存變更'}
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false)
                      setEditName(customer?.name || '')
                      setEditPhone(customer?.phone || '')
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← 返回首頁
        </Link>
      </div>
    </main>
  )
}
