'use client'

import { useCart } from '../src/contexts/CartContext'

export default function CartSummary({ showDetails = true }: { showDetails?: boolean }) {
  const { state } = useCart()

  if (state.itemCount === 0) {
    return (
      <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg pixel-art">
        <div className="text-center text-amber-600 pixel-art">
          🛒 購物車是空的
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border-2 border-amber-400 rounded-lg p-4 pixel-art shadow-pixel">
      <h3 className="font-bold text-amber-900 mb-3 pixel-art border-b-2 border-amber-200 pb-2">
        📋 訂單摘要
      </h3>
      
      {showDetails && (
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-amber-800 pixel-art">
            <span>商品數量:</span>
            <span className="font-bold">{state.itemCount} 項</span>
          </div>
          
          <div className="flex justify-between text-amber-800 pixel-art">
            <span>小計:</span>
            <span className="font-bold">NT$ {state.total.toFixed(0)}</span>
          </div>

          <div className="border-t-2 border-amber-300 pt-2 mt-3">
            <div className="flex justify-between text-amber-900 font-bold text-lg pixel-art">
              <span>總計:</span>
              <span>NT$ {state.total.toFixed(0)}</span>
            </div>
          </div>
        </div>
      )}
      
      {!showDetails && (
        <div className="text-center">
          <div className="text-sm text-amber-700 pixel-art">
            {state.itemCount} 項商品
          </div>
          <div className="text-lg font-bold text-amber-900 pixel-art">
            NT$ {state.total.toFixed(0)}
          </div>
        </div>
      )}
    </div>
  )
}
