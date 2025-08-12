import { supabase } from '../../../src/lib/supabase/client'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 從 categories 表格獲取所有分類
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      // 如果資料庫出錯，提供預設分類
      const defaultCategories = [
        { id: 'all', name: '全部', icon: '🍽️', display_order: 0 },
        { id: 'appetizer', name: '開胃菜', icon: '🥗', display_order: 1 },
        { id: 'main', name: '主餐', icon: '🍖', display_order: 2 },
        { id: 'dessert', name: '甜點', icon: '🍰', display_order: 3 },
        { id: 'beverage', name: '飲品', icon: '🥤', display_order: 4 }
      ]
      
      return NextResponse.json({
        categories: defaultCategories,
        message: '使用預設分類資料'
      })
    }

    // 確保 "全部" 選項在最前面
    const allCategories = [
      { id: 'all', name: '全部', icon: '🍽️', display_order: 0 },
      ...(categories || [])
    ]

    return NextResponse.json({
      categories: allCategories,
      message: '成功獲取分類資料'
    })

  } catch (error) {
    console.error('API error:', error)
    
    // 錯誤時提供預設分類
    const defaultCategories = [
      { id: 'all', name: '全部', icon: '🍽️', display_order: 0 },
      { id: 'appetizer', name: '開胃菜', icon: '🥗', display_order: 1 },
      { id: 'main', name: '主餐', icon: '🍖', display_order: 2 },
      { id: 'dessert', name: '甜點', icon: '🍰', display_order: 3 },
      { id: 'beverage', name: '飲品', icon: '🥤', display_order: 4 }
    ]
    
    return NextResponse.json({
      categories: defaultCategories,
      message: '連接資料庫失敗，使用預設分類'
    })
  }
}

export async function POST(request: Request) {
  try {
    const { name, icon } = await request.json()

    // 驗證必要欄位
    if (!name) {
      return NextResponse.json(
        { error: '分類名稱為必填' },
        { status: 400 }
      )
    }

    // 新增分類到資料庫
    const { data, error } = await supabase
      .from('categories')
      .insert([
        {
          name,
          icon: icon || '🍽️'
        }
      ])
      .select()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json(
        { error: '新增分類失敗' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      category: data[0],
      message: '分類新增成功'
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: '服務器錯誤' },
      { status: 500 }
    )
  }
}
