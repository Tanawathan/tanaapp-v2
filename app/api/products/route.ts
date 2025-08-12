import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../src/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = searchParams.get('limit');

    const supabase = supabaseServer();

    // 建構查詢
    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    // 如果指定分類
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // 如果指定數量限制
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('取得產品資料錯誤:', error);
      return NextResponse.json(
        { error: '取得菜單失敗', details: error.message },
        { status: 500 }
      );
    }

    // 如果沒有產品資料，回傳示例資料
    if (!products || products.length === 0) {
      const sampleProducts = [
        {
          id: 'sample-1',
          name: '招牌牛排',
          description: '嫩煎牛排配時蔬，口感鮮美',
          price: 680,
          category: 'main',
          is_available: true,
          rating: 4.5,
          image_url: null
        },
        {
          id: 'sample-2',
          name: '凱薩沙拉',
          description: '新鮮蔬菜配凱薩醬',
          price: 280,
          category: 'appetizer',
          is_available: true,
          rating: 4.2,
          image_url: null
        },
        {
          id: 'sample-3',
          name: '提拉米蘇',
          description: '經典義式甜點',
          price: 180,
          category: 'dessert',
          is_available: true,
          rating: 4.8,
          image_url: null
        },
        {
          id: 'sample-4',
          name: '現煮咖啡',
          description: '精選咖啡豆現煮',
          price: 120,
          category: 'beverage',
          is_available: true,
          rating: 4.0,
          image_url: null
        },
        {
          id: 'sample-5',
          name: '海鮮義大利麵',
          description: '新鮮海鮮配義大利麵',
          price: 450,
          category: 'main',
          is_available: true,
          rating: 4.6,
          image_url: null
        },
        {
          id: 'sample-6',
          name: '鮮果汁',
          description: '當季新鮮水果現打',
          price: 150,
          category: 'beverage',
          is_available: false,
          rating: 4.3,
          image_url: null
        }
      ];

      return NextResponse.json({
        success: true,
        products: sampleProducts,
        count: sampleProducts.length,
        message: '使用示例資料 (未找到資料庫中的產品)'
      });
    }

    return NextResponse.json({
      success: true,
      products: products,
      count: products.length
    });

  } catch (error) {
    console.error('產品API錯誤:', error);
    return NextResponse.json(
      { error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}

// POST - 新增產品 (管理員功能)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, price, category, image_url, is_available = true } = body;

    if (!name || !price || !category) {
      return NextResponse.json(
        { error: '請填寫必要欄位：名稱、價格、分類' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    const { data: newProduct, error } = await supabase
      .from('products')
      .insert([{
        name,
        description,
        price: parseFloat(price),
        category,
        image_url,
        is_available,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('新增產品錯誤:', error);
      return NextResponse.json(
        { error: '新增產品失敗', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '產品新增成功',
      product: newProduct
    }, { status: 201 });

  } catch (error) {
    console.error('新增產品API錯誤:', error);
    return NextResponse.json(
      { error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
