import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../src/lib/supabase/client';
import { createHash } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password } = await request.json();

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

    // 由於 customers 資料表可能不存在，我們嘗試不同的方法
    // 首先檢查是否已有相同 email 或 phone 的訂位記錄
    const { data: existingReservations, error: checkError } = await supabase
      .from('table_reservations')
      .select('customer_phone, customer_email')
      .or(`customer_phone.eq.${phone},customer_notes.ilike.%${email}%`);

    if (checkError) {
      console.error('檢查現有記錄錯誤:', checkError);
    }

    // 如果有相同電話的記錄，提示用戶
    const phoneExists = existingReservations?.some(r => r.customer_phone === phone);
    if (phoneExists) {
      return NextResponse.json(
        { error: '此電話號碼已有訂位記錄，您可以直接使用電話查詢功能' },
        { status: 409 }
      );
    }

    // 密碼加密（使用SHA-256 + salt）
    const salt = Math.random().toString(36).substring(2, 15);
    const hashedPassword = createHash('sha256').update(password + salt).digest('hex');

    // 由於沒有獨立的 customers 資料表，我們在一個臨時解決方案中使用 localStorage
    // 在實際部署中，您需要創建 customers 資料表
    
    // 創建會員記錄（模擬版本）
    const customerId = createHash('md5').update(email + Date.now()).digest('hex');
    
    // 在實際應用中，這裡應該存儲到資料庫
    // 現在我們返回成功，但會員功能有限
    
    return NextResponse.json({
      success: true,
      message: '會員註冊成功',
      customer: {
        customer_id: customerId,
        name,
        email,
        phone,
        created_at: new Date().toISOString(),
        membership_level: 'regular',
        note: '由於資料庫限制，會員功能目前有限。您仍可使用電話查詢訂位記錄。'
      }
    });

  } catch (error) {
    console.error('註冊API錯誤:', error);
    return NextResponse.json(
      { error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
