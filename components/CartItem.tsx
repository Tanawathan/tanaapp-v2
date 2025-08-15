'use client'

import { useState } from 'react'
import { useCart, CartItem } from '../src/contexts/CartContext'
import QuantitySelector from './QuantitySelector'

export default function CartItemComponent({ item }: { item: CartItem }) {
  const { removeItem, updateNote } = useCart()
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(item.special_instructions || '')

  const handleRemove = () => {
    removeItem(item.id)
  }

  const handleSaveNote = () => {
    updateNote(item.id, note)
    setEditing(false)
  }

  return (
    <div className="p-3 bg-white border-2 border-amber-300 rounded-lg mb-3 pixel-art shadow-pixel">
      {/* 第一列：品名、數量（精簡）、小計、刪除 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-bold text-amber-900 pixel-art break-words leading-snug">{item.name}</h3>
        </div>

        {/* 數量選擇器（精簡版） */}
        <div className="mx-2">
          <QuantitySelector id={item.id} quantity={item.quantity} size="sm" variant="compact" min={0} />
        </div>

  {/* 只顯示總價（小計） */}
  <div className="text-right min-w-[84px] mr-1">
          <div className="font-bold text-amber-900 pixel-art whitespace-nowrap">NT$ {(item.price * item.quantity).toFixed(0)}</div>
        </div>

  {/* 刪除按鈕移除：數量減到 0 會自動刪除 */}
      </div>

      {/* 第二列：備註輸入/顯示 */}
      <div className="mt-2">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：不要香菜、少冰、醬料分開…"
              maxLength={120}
              className="flex-1 px-2 py-1 border-2 border-amber-300 rounded pixel-art focus:outline-none"
            />
            <button onClick={handleSaveNote} className="pixel-btn px-3 py-1">儲存</button>
            <button onClick={() => { setNote(item.special_instructions || ''); setEditing(false) }} className="pixel-chip px-3 py-1">取消</button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="text-amber-700 text-xs pixel-art min-h-[20px]">
              {item.special_instructions ? (
                <span>備註：{item.special_instructions}</span>
              ) : (
                <span className="opacity-60">備註（可選填）</span>
              )}
            </div>
            <button onClick={() => setEditing(true)} className="pixel-chip px-2 py-1 text-xs">{item.special_instructions ? '編輯備註' : '新增備註'}</button>
          </div>
        )}
      </div>
    </div>
  )
}
