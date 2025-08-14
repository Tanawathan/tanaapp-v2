'use client'
import { useEffect, useState } from 'react'

export type MarqueeItem = {
  id: string
  message: string
  href?: string | null
}

export default function MarqueeRibbon() {
  const [items, setItems] = useState<MarqueeItem[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/marquee', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (mounted) setItems(data.items || [])
      } catch {}
    })()
    return () => { mounted = false }
  }, [])

  if (!items.length) return null

  return (
    <div className="bg-black text-white overflow-hidden">
      <div className="whitespace-nowrap animate-marquee py-2">
        {items.concat(items).map((it, idx) => (
          <span key={it.id + '-' + idx} className="mx-6">
            {it.href ? (
              <a href={it.href} className="underline hover:opacity-90">{it.message}</a>
            ) : (
              it.message
            )}
          </span>
        ))}
      </div>
    </div>
  )
}
