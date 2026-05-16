'use client'

import NextImage from 'next/image'

function LogoImg({ size }: { size: number }) {
  return (
    <NextImage
      src="/img/logo_oficial.png"
      alt="Maqui Mary"
      width={size}
      height={size}
      style={{ objectFit: 'contain', width: 'auto', height: size }}
      priority
    />
  )
}

export function MaquiMaryLogo({ size = 40, variant = 'full' }: { size?: number; variant?: 'icon' | 'full' }) {
  if (variant === 'icon') return <LogoImg size={size} />

  return (
    <div className="flex items-center gap-2.5">
      <LogoImg size={size} />
      <div>
        <span className="font-display text-lg font-bold tracking-tight block leading-tight">Maqui Mary</span>
        <span className="font-body text-[10px] uppercase tracking-[0.15em] text-ink-500 block leading-tight -mt-0.5">Esponjas de Limpieza</span>
      </div>
    </div>
  )
}

export function MaquiMaryLogoLight({ size = 40, variant = 'full' }: { size?: number; variant?: 'icon' | 'full' }) {
  if (variant === 'icon') return <LogoImg size={size} />

  return (
    <div className="flex items-center gap-2.5">
      <LogoImg size={size} />
      <div>
        <span className="font-display text-lg font-bold tracking-tight block leading-tight text-white">Maqui Mary</span>
        <span className="font-body text-[10px] uppercase tracking-[0.15em] text-ink-200 block leading-tight -mt-0.5">Esponjas de Limpieza</span>
      </div>
    </div>
  )
}
