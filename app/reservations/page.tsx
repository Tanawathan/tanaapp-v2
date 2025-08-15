import { redirect } from 'next/navigation'

export default function ReservationsRedirectPage() {
  // 頁面已併入會員中心，這裡直接導向
  redirect('/member')
}
