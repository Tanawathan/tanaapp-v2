import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../src/lib/supabase/client';

// 解析token的簡單函數
function parseToken(token: string) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    if (decoded.exp < Date.now()) {
      return null; // token已過期
    }
    return decoded;
  } catch {
    return null;
  }
}

// GET - 取得會員資訊和訂位記錄
export async function GET(request: NextRequest) {
  try {
    // 從Cookie或Authorization header取得token
    const token = request.cookies.get('auth-token')?.value || 
                 request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: '請先登入' },
        { status: 401 }
      );
    }

    const userData = parseToken(token);
    if (!userData) {
      return NextResponse.json(
        { error: 'Token無效或已過期，請重新登入' },
        { status: 401 }
      );
    }

    console.log('會員資料查詢 - 使用者資料:', userData);

    const supabase = supabaseServer();

    // 模擬會員基本資料（因為沒有 customers 資料表）
    const customer = {
      customer_id: userData.customer_id,
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '0900000000',
      membership_level: userData.membership_level || 'regular',
      created_at: new Date().toISOString(),
      status: 'active'
    };

    // 取得該會員的訂位記錄（根據電話或email）
    let reservations: any[] = [];
    
    // 先嘗試用電話查詢
    if (userData.phone) {
      const { data: phoneReservations, error: phoneError } = await supabase
        .from('table_reservations')
        .select(`
          id,
          customer_name,
          customer_phone,
          party_size,
          reservation_time,
          status,
          special_requests,
          customer_notes,
          duration_minutes,
          created_at
        `)
        .eq('customer_phone', userData.phone)
        .order('reservation_time', { ascending: false });

      if (!phoneError) {
        reservations = phoneReservations || [];
        console.log(`使用電話 ${userData.phone} 找到 ${reservations.length} 筆預約記錄`);
      } else {
        console.log('電話查詢預約記錄錯誤:', phoneError);
      }
    }

    // 如果沒找到，嘗試用email查詢（在customer_notes中）
    if (reservations.length === 0 && userData.email) {
      const { data: emailReservations, error: emailError } = await supabase
        .from('table_reservations')
        .select(`
          id,
          customer_name,
          customer_phone,
          party_size,
          reservation_time,
          status,
          special_requests,
          customer_notes,
          duration_minutes,
          created_at
        `)
        .ilike('customer_notes', `%${userData.email}%`)
        .order('reservation_time', { ascending: false });

      if (!emailError) {
        reservations = emailReservations || [];
        console.log(`使用Email ${userData.email} 找到 ${reservations.length} 筆預約記錄`);
      } else {
        console.log('Email查詢預約記錄錯誤:', emailError);
      }
    }

    console.log('最終返回的預約記錄數量:', reservations.length);
    
    return NextResponse.json({
      success: true,
      customer: customer,
      reservations: reservations,
      reservationCount: reservations.length,
      note: '由於資料庫限制，會員功能目前基於現有訂位記錄'
    });

  } catch (error) {
    console.error('會員資料API錯誤:', error);
    return NextResponse.json(
      { error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic'

// PUT - 更新會員資料
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value || 
                 request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: '請先登入' },
        { status: 401 }
      );
    }

    const userData = parseToken(token);
    if (!userData) {
      return NextResponse.json(
        { error: 'Token無效或已過期，請重新登入' },
        { status: 401 }
      );
    }

    const { name, phone } = await request.json();

    if (!name || !phone) {
      return NextResponse.json(
        { error: '姓名和電話為必填欄位' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    // 更新會員資料
    const { data: updatedCustomer, error } = await supabase
      .from('customers')
      .update({
        name,
        phone,
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', userData.customer_id)
      .select('customer_id, name, email, phone, membership_level, created_at')
      .single();

    if (error) {
      console.error('更新會員資料錯誤:', error);
      return NextResponse.json(
        { error: '更新失敗，請稍後再試' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '會員資料更新成功',
      customer: updatedCustomer
    });

  } catch (error) {
    console.error('更新會員資料API錯誤:', error);
    return NextResponse.json(
      { error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
