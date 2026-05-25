export type TrackPreset = {
  label: string
  src: string
  scene?: 'landing' | 'crm' | 'login' | 'success' | 'menu'
}

export const TRACK_PRESETS: Record<string, TrackPreset> = {
  // ─── Top Gear OST ───
  'top-gear-title':    { label: '🏁 Título',       src: '/audio/topgear-01-title.mp3',        scene: 'menu'    },
  'top-gear-las-vegas':{ label: '🎰 Las Vegas',    src: '/audio/topgear-02-las-vegas.mp3',    scene: 'crm'     },
  'top-gear-hiroshima':{ label: '🏯 Hiroshima',    src: '/audio/topgear-03-hiroshima.mp3',    scene: 'crm'     },
  'top-gear-bordeaux': { label: '🍷 Bordeaux',     src: '/audio/topgear-04-bordeaux.mp3',     scene: 'crm'     },
  'top-gear-frankfurt':{ label: '🏎️ Frankfurt',    src: '/audio/topgear-05-frankfurt.mp3',    scene: 'crm'     },
  'top-gear-qualified':{ label: '🏆 Qualified',    src: '/audio/topgear-06-qualified.mp3',    scene: 'success' },
  'top-gear-ending':   { label: '🌅 Ending Theme', src: '/audio/topgear-07-ending-theme.mp3', scene: 'landing' },

  // ─── Gunbound OST ───
  'gunbound-lobby':       { label: '🎮 Lobby',       src: '/audio/gunbound-01-lobby.mp3',       scene: 'menu'    },
  'gunbound-now-loading': { label: '⏳ Now Loading', src: '/audio/gunbound-02-now-loading.mp3',  scene: 'login'   },
  'gunbound-battle-1':    { label: '⚔️ Batalla #1',  src: '/audio/gunbound-03-battle-1.mp3',    scene: 'crm'     },
  'gunbound-battle-2':    { label: '🔥 Batalla #2',  src: '/audio/gunbound-04-battle-2.mp3',    scene: 'crm'     },
  'gunbound-battle-3':    { label: '💥 Batalla #3',  src: '/audio/gunbound-05-battle-3.mp3',    scene: 'crm'     },
  'gunbound-battle-4':    { label: '🌪️ Batalla #4',  src: '/audio/gunbound-06-battle-4.mp3',    scene: 'crm'     },
  'gunbound-battle-5':    { label: '🎯 Batalla #5',  src: '/audio/gunbound-07-battle-5.mp3',    scene: 'crm'     },
  'gunbound-battle-6':    { label: '🚀 Batalla #6',  src: '/audio/gunbound-08-battle-6.mp3',    scene: 'crm'     },
  'gunbound-battle-7':    { label: '🛡️ Batalla #7',  src: '/audio/gunbound-09-battle-7.mp3',    scene: 'crm'     },
  'gunbound-battle-8':    { label: '⚡ Batalla #8',  src: '/audio/gunbound-10-battle-8.mp3',    scene: 'crm'     },
  'gunbound-battle-9':    { label: '🏰 Batalla #9',  src: '/audio/gunbound-11-battle-9.mp3',    scene: 'crm'     },
  'gunbound-battle-10':   { label: '🎪 Batalla #10', src: '/audio/gunbound-12-battle-10.mp3',   scene: 'crm'     },
  'gunbound-battle-11':   { label: '🌋 Batalla #11', src: '/audio/gunbound-13-battle-11.mp3',   scene: 'crm'     },
  'gunbound-battle-12':   { label: '🏆 Batalla #12', src: '/audio/gunbound-14-battle-12.mp3',   scene: 'crm'     },
  'gunbound-sudden-death':{ label: '💀 Sudden Death',src: '/audio/gunbound-15-sudden-death.mp3', scene: 'success' },
}

export type TrackGroup = {
  key: string
  label: string
  emoji: string
  ids: string[]
}

export const TRACK_GROUPS: TrackGroup[] = [
  {
    key: 'top-gear',
    label: 'Top Gear OST',
    emoji: '🏁',
    ids: [
      'top-gear-title', 'top-gear-las-vegas', 'top-gear-hiroshima',
      'top-gear-bordeaux', 'top-gear-frankfurt', 'top-gear-qualified', 'top-gear-ending',
    ],
  },
  {
    key: 'gunbound',
    label: 'Gunbound OST',
    emoji: '🎮',
    ids: [
      'gunbound-lobby', 'gunbound-now-loading',
      'gunbound-battle-1', 'gunbound-battle-2', 'gunbound-battle-3', 'gunbound-battle-4',
      'gunbound-battle-5', 'gunbound-battle-6', 'gunbound-battle-7', 'gunbound-battle-8',
      'gunbound-battle-9', 'gunbound-battle-10', 'gunbound-battle-11', 'gunbound-battle-12',
      'gunbound-sudden-death',
    ],
  },
]

class AudioEngine {
  private ctx: AudioContext | null = null

  private currentTrack: HTMLAudioElement | null = null
  trackPlaying = false
  currentTrackId: string = ''
  private trackVolume = 0.3

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return this.ctx
  }

  private note(freq: number, dur: number, type: OscillatorType = 'sine', t?: number, vol = 0.12) {
    const ctx = this.getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    const start = t ?? ctx.currentTime
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(vol, start + 0.02)
    gain.gain.setValueAtTime(vol, start + dur * 0.7)
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + dur)
  }

  addToCart() {
    const t = this.getCtx().currentTime
    this.note(523.25, 0.1, 'sine', t)
    this.note(659.25, 0.12, 'sine', t + 0.06)
    this.note(783.99, 0.08, 'sine', t + 0.12)
  }

  removeFromCart() {
    const t = this.getCtx().currentTime
    this.note(440, 0.1, 'triangle', t)
    this.note(349.23, 0.15, 'triangle', t + 0.07)
  }

  checkout() {
    const t = this.getCtx().currentTime
    this.note(523.25, 0.1, 'sine', t)
    this.note(659.25, 0.1, 'sine', t + 0.08)
    this.note(783.99, 0.15, 'sine', t + 0.16)
    this.note(1046.5, 0.4, 'sine', t + 0.24, 0.12)
  }

  error() {
    const t = this.getCtx().currentTime
    this.note(220, 0.15, 'sawtooth', t, 0.05)
    this.note(196, 0.2, 'sawtooth', t + 0.08, 0.05)
    this.note(174.61, 0.25, 'sawtooth', t + 0.16, 0.04)
  }

  startTrack(trackId: string, loop = true) {
    const preset = TRACK_PRESETS[trackId]
    if (!preset) return
    if (this.currentTrackId === trackId) return

    if (!this.currentTrack) {
      this.currentTrack = new Audio()
    }

    this.currentTrack.pause()
    this.currentTrack.src = preset.src
    this.currentTrack.loop = loop
    this.currentTrack.volume = this.trackVolume
    this.currentTrack.currentTime = 0
    this.currentTrackId = trackId
    this.trackPlaying = false

    const startedId = trackId
    this.currentTrack.play().then(() => {
      if (this.currentTrackId === startedId) this.trackPlaying = true
    }).catch(() => {
      if (this.currentTrackId === startedId) {
        this.currentTrack = null
        this.trackPlaying = false
        this.currentTrackId = ''
      }
    })
  }

  stopTrack() {
    if (this.currentTrack) {
      this.currentTrack.pause()
      this.currentTrack.currentTime = 0
    }
    this.trackPlaying = false
    this.currentTrackId = ''
  }

  toggleTrack(trackId: string, loop = true): boolean {
    if (this.trackPlaying && this.currentTrackId === trackId) {
      this.stopTrack()
      return false
    }
    this.startTrack(trackId, loop)
    return true
  }

  setTrackVolume(v: number) {
    this.trackVolume = v
    if (this.currentTrack) {
      this.currentTrack.volume = v
    }
  }

  stopAll() {
    this.stopTrack()
  }
}

export const audio = new AudioEngine()
