'use client'

import { useEffect } from 'react'

export default function ThemeApplier() {
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(data => {
        const tema = data.settings?.tema
        if (tema && tema !== 'terracota') {
          document.documentElement.setAttribute('data-theme', tema)
        } else {
          document.documentElement.removeAttribute('data-theme')
        }
      })
      .catch(() => {})
  }, [])
  return null
}
