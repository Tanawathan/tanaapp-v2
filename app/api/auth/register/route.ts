import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../src/lib/supabase/client';
import { createHash } from 'crypto';

export async function POST(request: NextRequest) {
  try {
  const { name, email, phone, password, marketing_consent = false, terms_accepted = false } = await request.json();

    // 驗證必填欄位
    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { error: '姓名、信箱、電話和密碼為必填欄位' },
        { status: 400 }
      );
    }

    // 驗證密碼長度
    if (password.length < 6) {
      return NextResponse.json(
        { error: '密碼長度至少需要6個字元' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    // 確認 CRM 會員表是否已有相同 email/phone
    const lowerEmail = String(email).trim().toLowerCase();
    const { data: existsByEmail } = await supabase
      .from('customer_users')
      .select('id')
      .eq('email', lowerEmail)
      .maybeSingle();

    if (existsByEmail?.id) {
      return NextResponse.json(
        { error: '此 Email 已被註冊' },
        { status: 409 }
      );
    }

    const { data: existsByPhone } = await supabase
      .from('customer_users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existsByPhone?.id) {
      return NextResponse.json(
        { error: '此電話已被註冊' },
        { status: 409 }
      );
    }

    // 密碼雜湊（簡化版：SHA-256(password + email)）
    const password_hash = createHash('sha256').update(`${password}:${lowerEmail}`).digest('hex');

    // 寫入 CRM 會員表
    const insertPayload = {
      phone: String(phone),
      email: lowerEmail,
      name: String(name),
      password_hash,
      preferences: {},
      is_active: true,
      terms_accepted: !!terms_accepted,
      marketing_consent: !!marketing_consent,
    } as any;

    const { data: created, error: insertErr } = await supabase
      .from('customer_users')
      .insert(insertPayload)
      .select('*')
      .maybeSingle();

    if (insertErr || !created) {
      console.error('註冊寫入 customer_users 失敗:', insertErr);
      const isDev = process.env.NODE_ENV !== 'production';
      const hint = (!process.env.SUPABASE_SERVICE_ROLE_KEY)
        ? '缺少 SUPABASE_SERVICE_ROLE_KEY，伺服器端使用 anon key 可能無法寫入（RLS）'
        : undefined;
      // 常見：code 42501 權限不足（RLS/政策）
      const payload: any = { error: '建立會員失敗' };
      if (isDev) {
        payload.detail = insertErr;
        if (hint) payload.hint = hint;
      }
      return NextResponse.json(payload, { status: 500 });
    }

    // 建立登入 token 並設 Cookie
    const tokenData = {
      customer_id: created.id,
      email: created.email,
      phone: created.phone,
      name: created.name,
      membership_level: 'regular',
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
    const response = NextResponse.json({
      success: true,
      message: '會員註冊成功',
      customer: {
        customer_id: created.id,
        name: created.name,
        email: created.email,
        phone: created.phone,
        created_at: created.created_at,
        membership_level: 'regular'
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

  } catch (error) {
    console.error('註冊API錯誤:', error);
    return NextResponse.json(
      { error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
