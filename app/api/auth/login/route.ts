import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../src/lib/supabase/client';
import { createHash } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: '請輸入信箱和密碼' },
        { status: 400 }
      );
    }

    // 由於沒有 customers 資料表，我們提供一個臨時的登入方式
    // 在實際應用中，您需要建立 customers 資料表
    
    // 簡單的示範登入邏輯（僅供測試）
    if (email === 'test@example.com' && password === '123456') {
      // 生成簡單的token（基於時間戳和用戶資訊）
      const tokenData = JSON.stringify({
        customer_id: 'demo-customer-id',
        email: email,
        name: '測試用戶',
        membership_level: 'regular',
        exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7天後過期
      });
      
      const token = Buffer.from(tokenData).toString('base64');

      // 回傳會員資料
      const customerData = {
        customer_id: 'demo-customer-id',
        name: '測試用戶',
        email: email,
        phone: '0900000000',
        membership_level: 'regular',
        status: 'active'
      };

      const response = NextResponse.json({
        success: true,
        message: '登入成功',
        customer: customerData,
        token,
        note: '這是示範登入，實際部署需要建立 customers 資料表'
      });

      // 設定Cookie
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7天
      });

      return response;
    }

    // 如果不是測試帳戶，檢查是否為現有的訂位客戶
    const supabase = supabaseServer();
    
    const { data: reservations, error } = await supabase
      .from('table_reservations')
      .select('customer_name, customer_phone, customer_notes')
      .ilike('customer_notes', `%${email}%`)
      .limit(1);

    if (!error && reservations && reservations.length > 0) {
      const reservation = reservations[0];
      
      // 為現有客戶創建臨時會員資料
      const tokenData = JSON.stringify({
        customer_id: createHash('md5').update(email).digest('hex'),
        email: email,
        name: reservation.customer_name || '客戶',
        phone: reservation.customer_phone,
        membership_level: 'regular',
        exp: Date.now() + (7 * 24 * 60 * 60 * 1000)
      });
      
      const token = Buffer.from(tokenData).toString('base64');

      const customerData = {
        customer_id: createHash('md5').update(email).digest('hex'),
        name: reservation.customer_name || '客戶',
        email: email,
        phone: reservation.customer_phone,
        membership_level: 'regular',
        status: 'active'
      };

      const response = NextResponse.json({
        success: true,
        message: '歡迎回來！我們找到了您的訂位記錄',
        customer: customerData,
        token
      });

      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });

      return response;
    }

    return NextResponse.json(
      { error: '信箱或密碼錯誤。測試用戶: test@example.com / 123456' },
      { status: 401 }
    );

  } catch (error) {
    console.error('登入API錯誤:', error);
    return NextResponse.json(
      { error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
