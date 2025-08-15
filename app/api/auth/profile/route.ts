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

    // 以 CRM customer_users 為主回傳會員基本資料
    let customer: any = null
    try {
      if (userData.customer_id) {
        const { data } = await supabase
          .from('customer_users')
          .select('id, name, email, phone, is_active, created_at')
          .eq('id', userData.customer_id)
          .maybeSingle()
        if (data) {
          customer = {
            customer_id: data.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            membership_level: userData.membership_level || 'regular',
            created_at: data.created_at,
            status: data.is_active ? 'active' : 'inactive'
          }
        }
      }
      if (!customer) {
        // fallback：用 token 中的資料
        customer = {
          customer_id: userData.customer_id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone || '0900000000',
          membership_level: userData.membership_level || 'regular',
          created_at: new Date().toISOString(),
          status: 'active'
        }
      }
    } catch {}

    // 取得該會員的訂位記錄：同時查 table_reservations 與 customer_reservations（CRM），取用真實最新狀態
    let reservations: any[] = [];

    // A) table_reservations by phone / email（舊有來源）
    const selectTable = `
      id,
      customer_name,
      customer_phone,
      customer_email,
      party_size,
      reservation_time,
      status,
      special_requests,
      customer_notes,
      duration_minutes,
      created_at
    `
    try {
      const buckets: any[][] = []
      // 1) 依電話
      if (userData.phone) {
        const { data, error } = await supabase
          .from('table_reservations')
          .select(selectTable)
          .eq('customer_phone', userData.phone)
          .order('reservation_time', { ascending: false })
        if (!error && data) buckets.push(data)
      }
      // 2) 依 email 直接比對欄位（新資料走這條）
      if (userData.email) {
        const { data, error } = await supabase
          .from('table_reservations')
          .select(selectTable)
          .ilike('customer_email', `%${userData.email}%`)
          .order('reservation_time', { ascending: false })
        if (!error && data) buckets.push(data)
      }
      // 3) 舊 fallback：notes 內包含 email
      if (userData.email) {
        const { data, error } = await supabase
          .from('table_reservations')
          .select(selectTable)
          .ilike('customer_notes', `%${userData.email}%`)
          .order('reservation_time', { ascending: false })
        if (!error && data) buckets.push(data)
      }
      // 合併 + 去重
      if (buckets.length) {
        const merged = ([] as any[]).concat(...buckets)
        const seen = new Set<string>()
        const uniq = merged.filter(r => {
          const id = String(r.id)
          if (seen.has(id)) return false
          seen.add(id)
          return true
        })
        reservations = reservations.concat(uniq.map(r => ({ ...r, _source: 'table_reservations' })))
      }
    } catch (e) {
      console.log('查詢 table_reservations 失敗:', e)
    }

    // B) customer_reservations（CRM）：優先以 customer_id，其次 phone/email
    const selectCRM = `
      id,
      customer_id,
      table_id,
      reservation_date,
      reservation_time,
      party_size,
      status,
      special_requests,
      contact_phone,
      contact_email,
      notes,
      created_at
    `
    try {
      let cr: any[] = []
      if (userData.customer_id) {
        const { data, error } = await supabase
          .from('customer_reservations')
          .select(selectCRM)
          .eq('customer_id', userData.customer_id)
          .order('reservation_date', { ascending: false })
          .order('reservation_time', { ascending: false })
        if (!error && data) cr = data
      }
      if ((!cr || cr.length === 0) && userData.phone) {
        const { data, error } = await supabase
          .from('customer_reservations')
          .select(selectCRM)
          .eq('contact_phone', userData.phone)
          .order('reservation_date', { ascending: false })
          .order('reservation_time', { ascending: false })
        if (!error && data) cr = data
      }
      if ((!cr || cr.length === 0) && userData.email) {
        const { data, error } = await supabase
          .from('customer_reservations')
          .select(selectCRM)
          .ilike('contact_email', `%${userData.email}%`)
          .order('reservation_date', { ascending: false })
          .order('reservation_time', { ascending: false })
        if (!error && data) cr = data
      }
      if (cr?.length) {
        // 正規化成前端需要的欄位結構
        const normalized = cr.map(r => ({
          id: r.id,
          customer_name: customer.name,
          customer_phone: r.contact_phone,
          party_size: r.party_size,
          reservation_time: r.reservation_date && r.reservation_time
            ? new Date(`${r.reservation_date}T${r.reservation_time}`).toISOString()
            : r.created_at,
          status: r.status,
          special_requests: r.special_requests,
          customer_notes: r.notes,
          duration_minutes: null,
          created_at: r.created_at,
          _source: 'customer_reservations'
        }))
        reservations = reservations.concat(normalized)
      }
    } catch (e) {
      console.log('查詢 customer_reservations 失敗:', e)
    }

    // 排序（以 reservation_time 或 created_at 由新到舊）
    reservations.sort((a, b) => new Date(b.reservation_time || b.created_at).getTime() - new Date(a.reservation_time || a.created_at).getTime())

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

    // 更新 CRM 會員資料（customer_users）
    const { data: updated, error } = await supabase
      .from('customer_users')
      .update({
        name,
        phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.customer_id)
      .select('id, name, email, phone, created_at, is_active')
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
      customer: updated ? {
        customer_id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        membership_level: 'regular',
        created_at: updated.created_at,
        status: updated.is_active ? 'active' : 'inactive'
      } : null
    });

  } catch (error) {
    console.error('更新會員資料API錯誤:', error);
    return NextResponse.json(
      { error: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
