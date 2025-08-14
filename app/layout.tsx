import './globals.css'
import type { Metadata } from 'next'
import { VT323 } from 'next/font/google'

const vt323 = VT323({ subsets: ['latin'], weight: '400', variable: '--font-vt323' })

export const metadata: Metadata = {
  title: 'TanaApp v2 - Reservations',
  description: 'Modern restaurant reservation app',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
            (function(){
              try {
                var stored = localStorage.getItem('theme');
                var preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (stored === 'dark' || (!stored && preferDark)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch(e) {}
            })();
          `}}
        />
      </head>
      <body className={`${vt323.variable} min-h-screen pixel-bg text-pixel-ink`}>{children}</body>
    </html>
  )
}
