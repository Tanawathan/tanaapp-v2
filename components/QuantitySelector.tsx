'use client'

import { useCart } from '../src/contexts/CartContext'

export default function QuantitySelector({ 
  id, 
  quantity, 
  min = 1, 
  max = 99,
  size = 'md',
  variant = 'full'
}: {
  id: string
  quantity: number
  min?: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'compact'
}) {
  const { updateQuantity } = useCart()

  const handleDecrease = () => {
    const newQuantity = Math.max(min, quantity - 1)
    if (newQuantity === 0) {
      // 如果減到 0，從購物車移除
      updateQuantity(id, 0)
    } else {
      updateQuantity(id, newQuantity)
    }
  }

  const handleIncrease = () => {
    const newQuantity = Math.min(max, quantity + 1)
    updateQuantity(id, newQuantity)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0
    const newQuantity = Math.max(min, Math.min(max, value))
    updateQuantity(id, newQuantity)
  }

  // 根據 size 設定樣式
  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-8 h-8 text-base',
    lg: 'w-10 h-10 text-lg'
  }

  const buttonSizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  }

  const inputSizeClasses = {
    sm: 'w-12 h-6 text-xs px-1',
    md: 'w-16 h-8 text-sm px-2',
    lg: 'w-20 h-10 text-base px-3'
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center space-x-4">
        <button
          onClick={handleDecrease}
          disabled={quantity <= min}
          className={`${buttonSizeClasses[size]} px-3 flex items-center justify-center pixel-chip font-bold`}
        >
          −
        </button>
        <div
          className={`px-3 py-1 bg-amber-100 border-2 border-amber-400 rounded-lg shadow-pixel text-amber-900 font-extrabold text-center leading-none ${
            size === 'sm' ? 'text-2xl min-w-[2.75rem]' : size === 'lg' ? 'text-4xl min-w-[3.25rem]' : 'text-3xl min-w-[3rem]'
          }`}
        >
          {quantity}
        </div>
        <button
          onClick={handleIncrease}
          disabled={quantity >= max}
          className={`${buttonSizeClasses[size]} px-3 flex items-center justify-center pixel-chip font-bold`}
        >
          +
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-1 border border-amber-300 rounded-lg bg-amber-50">
      <button
        onClick={handleDecrease}
        disabled={quantity <= min}
        className={`${buttonSizeClasses[size]} flex items-center justify-center rounded-l-lg bg-amber-100 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed border-r border-amber-300 font-bold text-amber-700 transition-colors pixel-art`}
      >
        −
      </button>
      
      <input
        type="number"
        value={quantity}
        onChange={handleInputChange}
        min={min}
        max={max}
        className={`${inputSizeClasses[size]} text-center bg-transparent border-none outline-none font-bold text-amber-800 pixel-art`}
      />
      
      <button
        onClick={handleIncrease}
        disabled={quantity >= max}
        className={`${buttonSizeClasses[size]} flex items-center justify-center rounded-r-lg bg-amber-100 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed border-l border-amber-300 font-bold text-amber-700 transition-colors pixel-art`}
      >
        +
      </button>
    </div>
  )
}
