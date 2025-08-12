import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TanaApp v2 - Reservations',
  description: 'Modern restaurant reservation app',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  )
}
