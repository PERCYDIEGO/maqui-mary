'use client'

import { useEffect } from 'react'

export default function ThemeApplier() {
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(data => {
        const tema = data.settings?.tema ?? 'terracota'
        applyTheme(tema)
        try { localStorage.setItem('maqui-tema', tema) } catch {}
      })
      .catch(() => {})
  }, [])
  return null
}

export function applyTheme(tema: string) {
  if (tema && tema !== 'terracota') {
    document.documentElement.setAttribute('data-theme', tema)
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}
