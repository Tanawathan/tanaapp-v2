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

// 驗證預約是否屬於當前用戶
async function verifyReservationOwnership(reservationId: string, userData: any, supabase: any) {
  const { data: reservation, error } = await supabase
    .from('table_reservations')
    .select('customer_name, customer_phone, customer_notes')
    .eq('id', reservationId)
    .single();

  if (error || !reservation) {
    return false;
  }

  // 檢查是否是用戶的預約（通過電話或email）
  const isOwner = reservation.customer_phone === userData.phone ||
                 reservation.customer_notes?.includes(userData.email);
  
  return isOwner;
}

// PUT - 修改預約
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reservationId = params.id;
    
    // 驗證登入狀態
    const token = request.cookies.get('auth-token')?.value || 
                 request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const userData = parseToken(token);
    if (!userData) {
      return NextResponse.json({ error: 'Token無效或已過期，請重新登入' }, { status: 401 });
    }

    const supabase = supabaseServer();

    // 驗證預約擁有權
    const isOwner = await verifyReservationOwnership(reservationId, userData, supabase);
    if (!isOwner) {
      return NextResponse.json({ error: '您沒有權限修改此預約' }, { status: 403 });
    }

    const body = await request.json();
    const { reservation_date, reservation_time, party_size, special_requests } = body;

    if (!reservation_date || !reservation_time || !party_size) {
      return NextResponse.json({ error: '請填寫完整的預約資訊' }, { status: 400 });
    }

    // 組合新的預約時間
    const newReservationDateTime = `${reservation_date}T${reservation_time}:00+08:00`;

    // 檢查新時間是否有衝突（排除當前預約）
    const { data: conflicts, error: conflictError } = await supabase
      .from('table_reservations')
      .select('id, reservation_time, party_size')
      .neq('id', reservationId)
      .gte('reservation_time', `${reservation_date}T${reservation_time.split(':')[0]}:${Math.max(0, parseInt(reservation_time.split(':')[1]) - 30).toString().padStart(2, '0')}:00+08:00`)
      .lte('reservation_time', `${reservation_date}T${reservation_time.split(':')[0]}:${Math.min(59, parseInt(reservation_time.split(':')[1]) + 30).toString().padStart(2, '0')}:00+08:00`)
      .in('status', ['confirmed', 'pending']);

    if (conflictError) {
      console.error('檢查衝突錯誤:', conflictError);
      return NextResponse.json({ error: '檢查時段衝突時發生錯誤' }, { status: 500 });
    }

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({ 
        error: '該時段已有其他預約，30分鐘內無法接受重複訂位',
        conflictDetails: conflicts 
      }, { status: 409 });
    }

    // 更新預約
    const { data: updatedReservation, error: updateError } = await supabase
      .from('table_reservations')
      .update({
        reservation_time: newReservationDateTime,
        party_size: parseInt(party_size),
        special_requests: special_requests || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', reservationId)
      .select('*')
      .single();

    if (updateError) {
      console.error('更新預約錯誤:', updateError);
      return NextResponse.json({ error: '更新預約失敗，請稍後再試' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '預約修改成功',
      reservation: updatedReservation
    });

  } catch (error) {
    console.error('修改預約API錯誤:', error);
    return NextResponse.json({ error: '系統錯誤，請稍後再試' }, { status: 500 });
  }
}

// DELETE - 取消預約
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reservationId = params.id;
    
    // 驗證登入狀態
    const token = request.cookies.get('auth-token')?.value || 
                 request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const userData = parseToken(token);
    if (!userData) {
      return NextResponse.json({ error: 'Token無效或已過期，請重新登入' }, { status: 401 });
    }

    const supabase = supabaseServer();

    // 驗證預約擁有權
    const isOwner = await verifyReservationOwnership(reservationId, userData, supabase);
    if (!isOwner) {
      return NextResponse.json({ error: '您沒有權限取消此預約' }, { status: 403 });
    }

    // 檢查預約時間是否允許取消（例如：至少提前2小時）
    const { data: reservation, error: fetchError } = await supabase
      .from('table_reservations')
      .select('reservation_time, status')
      .eq('id', reservationId)
      .single();

    if (fetchError || !reservation) {
      return NextResponse.json({ error: '找不到預約記錄' }, { status: 404 });
    }

    // 檢查是否已過期或已取消
    if (reservation.status === 'cancelled') {
      return NextResponse.json({ error: '此預約已經取消' }, { status: 400 });
    }

    const reservationTime = new Date(reservation.reservation_time);
    const now = new Date();
    const timeDifference = reservationTime.getTime() - now.getTime();
    const hoursUntilReservation = timeDifference / (1000 * 60 * 60);

    if (hoursUntilReservation < 2) {
      return NextResponse.json({ 
        error: '預約時間不足2小時，無法取消。請直接聯繫餐廳。' 
      }, { status: 400 });
    }

    // 取消預約（軟刪除：更新狀態為cancelled）
    const { data: cancelledReservation, error: cancelError } = await supabase
      .from('table_reservations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
        notes: (reservation as any).notes ? `${(reservation as any).notes}\n[已取消於 ${new Date().toISOString()}]` : `[已取消於 ${new Date().toISOString()}]`
      })
      .eq('id', reservationId)
      .select('*')
      .single();

    if (cancelError) {
      console.error('取消預約錯誤:', cancelError);
      return NextResponse.json({ error: '取消預約失敗，請稍後再試' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '預約已成功取消',
      reservation: cancelledReservation
    });

  } catch (error) {
    console.error('取消預約API錯誤:', error);
    return NextResponse.json({ error: '系統錯誤，請稍後再試' }, { status: 500 });
  }
}
