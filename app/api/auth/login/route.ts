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

    // 先嘗試以 CRM 會員表登入
    const lowerEmail = String(email).trim().toLowerCase();
    const password_hash = createHash('sha256').update(`${password}:${lowerEmail}`).digest('hex');
    const supabase = supabaseServer();

    const { data: customer, error: loginErr } = await supabase
      .from('customer_users')
      .select('id, name, email, phone, is_active')
      .eq('email', lowerEmail)
      .eq('password_hash', password_hash)
      .eq('is_active', true)
      .maybeSingle();

    if (customer?.id) {
      const tokenData = {
        customer_id: customer.id,
        email: customer.email,
        phone: customer.phone,
        name: customer.name,
        membership_level: 'regular',
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      };
      const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
      const response = NextResponse.json({
        success: true,
        message: '登入成功',
        customer: {
          customer_id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          membership_level: 'regular',
          status: 'active'
        },
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

    // 如果不是測試帳戶，檢查是否為現有的訂位客戶
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
