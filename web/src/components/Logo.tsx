'use client'

const spongeSvg = (s: number) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 44 44"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="1" y="1"
      width="42" height="42"
      rx="12"
      className="fill-accent-gold"
      stroke="var(--color-accent-gold-dark, #b8863a)"
      strokeWidth="1.5"
      opacity="0.95"
    />
    <g className="origin-center motion-safe:animate-sponge-float group-hover:!animate-sponge-squeeze">
      <path
        d="M13 15h18v4l-3.5 2.5 3.5 2.5v4H13v-4l3.5-2.5L13 19v-4z"
        className="fill-ink-800"
        opacity="0.92"
      />
      <path
        d="M15.5 17h13v2l-2.5 2 2.5 2v2h-13v-2l2.5-2-2.5-2v-2z"
        className="fill-accent-cream"
        opacity="0.85"
      />
      <circle cx="20" cy="20" r="2.5" className="fill-accent-terracotta motion-safe:animate-sponge-heart" opacity="0.75" />
      <circle cx="11" cy="11" r="1.2" className="fill-ink-800/20" />
      <circle cx="33" cy="13" r="1" className="fill-ink-800/15" />
      <circle cx="30" cy="33" r="1.5" className="fill-ink-800/15" />
      <circle cx="14" cy="31" r="1" className="fill-ink-800/10" />
      <circle cx="24" cy="10" r="0.8" className="fill-ink-800/15" />
    </g>
  </svg>
)

const spongeSvgLight = (s: number) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 44 44"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="1" y="1"
      width="42" height="42"
      rx="12"
      className="fill-accent-gold"
      stroke="var(--color-accent-gold-light, #e8c97a)"
      strokeWidth="1.5"
      opacity="0.95"
    />
    <g className="origin-center motion-safe:animate-sponge-float group-hover:!animate-sponge-squeeze">
      <path
        d="M13 15h18v4l-3.5 2.5 3.5 2.5v4H13v-4l3.5-2.5L13 19v-4z"
        className="fill-ink-800"
        opacity="0.92"
      />
      <path
        d="M15.5 17h13v2l-2.5 2 2.5 2v2h-13v-2l2.5-2-2.5-2v-2z"
        className="fill-accent-cream"
        opacity="0.85"
      />
      <circle cx="20" cy="20" r="2.5" className="fill-accent-terracotta motion-safe:animate-sponge-heart" opacity="0.75" />
      <circle cx="11" cy="11" r="1.2" className="fill-ink-800/20" />
      <circle cx="33" cy="13" r="1" className="fill-ink-800/15" />
      <circle cx="30" cy="33" r="1.5" className="fill-ink-800/15" />
      <circle cx="14" cy="31" r="1" className="fill-ink-800/10" />
      <circle cx="24" cy="10" r="0.8" className="fill-ink-800/15" />
    </g>
  </svg>
)

export function MaquiMaryLogo({ size = 40, variant = 'full' }: { size?: number; variant?: 'icon' | 'full' }) {
  const icon = (
    <div className="group">
      {spongeSvg(size)}
    </div>
  )

  if (variant === 'icon') return icon

  return (
    <div className="flex items-center gap-2.5 group">
      {spongeSvg(size)}
      <div>
        <span className="font-display text-lg font-bold tracking-tight block leading-tight">Maqui Mary</span>
        <span className="font-body text-[10px] uppercase tracking-[0.15em] text-ink-500 block leading-tight -mt-0.5">Esponjas de Limpieza</span>
      </div>
    </div>
  )
}

export function MaquiMaryLogoLight({ size = 40, variant = 'full' }: { size?: number; variant?: 'icon' | 'full' }) {
  const icon = (
    <div className="group">
      {spongeSvgLight(size)}
    </div>
  )

  if (variant === 'icon') return icon

  return (
    <div className="flex items-center gap-2.5 group">
      {spongeSvgLight(size)}
      <div>
        <span className="font-display text-lg font-bold tracking-tight block leading-tight text-white">Maqui Mary</span>
        <span className="font-body text-[10px] uppercase tracking-[0.15em] text-ink-200 block leading-tight -mt-0.5">Esponjas de Limpieza</span>
      </div>
    </div>
  )
}
