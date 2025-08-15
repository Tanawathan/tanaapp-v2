'use client'

import React, { createContext, useContext, useReducer, useEffect } from 'react'

// 購物車商品類型
export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image_url?: string
  category?: string
  special_instructions?: string
}

// 購物車狀態類型
export interface CartState {
  items: CartItem[]
  total: number
  itemCount: number
}

// 購物車動作類型
export type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> & { quantity?: number } }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'UPDATE_NOTE'; payload: { id: string; special_instructions: string } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartState }

// 初始狀態
const initialState: CartState = {
  items: [],
  total: 0,
  itemCount: 0,
}

// 計算購物車總計
const calculateTotals = (items: CartItem[]): { total: number; itemCount: number } => {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  return { total, itemCount }
}

// Reducer 函數
const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(item => item.id === action.payload.id)
      let newItems: CartItem[]

      if (existingItemIndex >= 0) {
        // 如果商品已存在，增加數量
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + (action.payload.quantity || 1) }
            : item
        )
      } else {
        // 如果是新商品，添加到購物車
        newItems = [
          ...state.items,
          { ...action.payload, quantity: action.payload.quantity || 1 }
        ]
      }

      const { total, itemCount } = calculateTotals(newItems)
      return { items: newItems, total, itemCount }
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload.id)
      const { total, itemCount } = calculateTotals(newItems)
      return { items: newItems, total, itemCount }
    }

    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        // 如果數量為 0 或負數，移除商品
        const newItems = state.items.filter(item => item.id !== action.payload.id)
        const { total, itemCount } = calculateTotals(newItems)
        return { items: newItems, total, itemCount }
      }

      const newItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      )
      const { total, itemCount } = calculateTotals(newItems)
      return { items: newItems, total, itemCount }
    }

    case 'UPDATE_NOTE': {
      const note = (action.payload.special_instructions || '').slice(0, 120) // 簡單限制長度
      const newItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, special_instructions: note.trim() }
          : item
      )
      const { total, itemCount } = calculateTotals(newItems)
      return { items: newItems, total, itemCount }
    }

    case 'CLEAR_CART':
      return initialState

    case 'LOAD_CART':
      return action.payload

    default:
      return state
  }
}

// Context 類型
interface CartContextType {
  state: CartState
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  updateNote: (id: string, special_instructions: string) => void
  clearCart: () => void
}

// 創建 Context
const CartContext = createContext<CartContextType | undefined>(undefined)

// 本地存儲鍵
const CART_STORAGE_KEY = 'tana-cart'

// Provider 組件
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  // 從 localStorage 載入購物車
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY)
      if (savedCart) {
        const parsedCart: CartState = JSON.parse(savedCart)
        dispatch({ type: 'LOAD_CART', payload: parsedCart })
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error)
    }
  }, [])

  // 保存購物車到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error)
    }
  }, [state])

  // Action creators
  const addItem = (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    dispatch({ type: 'ADD_ITEM', payload: item })
  }

  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id } })
  }

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } })
  }

  const updateNote = (id: string, special_instructions: string) => {
    dispatch({ type: 'UPDATE_NOTE', payload: { id, special_instructions } })
  }

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' })
  }

  const value: CartContextType = {
    state,
    addItem,
    removeItem,
    updateQuantity,
    updateNote,
    clearCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// Hook for using cart context
export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
