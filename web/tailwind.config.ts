import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FDF6F0',
          100: '#F9E8DA',
          200: '#F2CCB0',
          300: '#E8A881',
          400: '#DD8456',
          500: '#D16A35',
          600: '#B8542A',
          700: '#9A4323',
          800: '#7A351D',
          900: '#5C2816',
        },
        ink: {
          50: '#F6F2EC',
          100: '#E8E0D4',
          200: '#D1C1AD',
          300: '#B8A185',
          400: '#9E8564',
          500: '#846B4A',
          600: '#6A553C',
          700: '#50412F',
          800: '#362B20',
          900: '#1C1611',
        },
        accent: {
          gold: 'rgb(200 159 92)',
          goldlight: 'rgb(224 195 146)',
          terracotta: 'rgb(201 107 78)',
          sage: 'rgb(127 159 122)',
          sagewash: 'rgb(232 240 229)',
          navy: 'rgb(30 45 61)',
          cream: 'rgb(251 247 242)',
          sand: 'rgb(237 228 214)',
        },
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        heading: ['Lora', 'Georgia', 'serif'],
        body: ['Nunito', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'fade-down': 'fadeDown 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.4s ease-out forwards',
        'slide-left': 'slideLeft 0.5s ease-out forwards',
        'slide-right': 'slideRight 0.5s ease-out forwards',
        'shimmer': 'shimmer 4s ease infinite',
        'float': 'float 3s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'draw': 'draw 1.5s ease-out forwards',
        'breathe': 'breathe 4s ease-in-out infinite',
        'sponge-float': 'spongeFloat 5s ease-in-out infinite',
        'sponge-heart': 'spongeHeart 3s ease-in-out infinite',
        'sponge-squeeze': 'spongeSqueeze 0.6s ease-out forwards',
        'sponge-unsqueeze': 'spongeUnsqueeze 0.6s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeDown: {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideLeft: {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        },
        draw: {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
        spongeFloat: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '25%': { transform: 'translateY(-3px) rotate(-0.5deg)' },
          '50%': { transform: 'translateY(-4px) rotate(0deg)' },
          '75%': { transform: 'translateY(-2px) rotate(0.5deg)' },
          '100%': { transform: 'translateY(0) rotate(0deg)' },
        },
        spongeHeart: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.15)' },
        },
        spongeSqueeze: {
          '0%': { transform: 'scaleY(1) scaleX(1)' },
          '30%': { transform: 'scaleY(0.92) scaleX(1.06)' },
          '60%': { transform: 'scaleY(0.95) scaleX(1.03)' },
          '100%': { transform: 'scaleY(1) scaleX(1)' },
        },
        spongeUnsqueeze: {
          '0%': { transform: 'scaleY(1) scaleX(1)' },
          '100%': { transform: 'scaleY(1) scaleX(1)' },
        },
      },
      backgroundImage: {
        'textile-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c89f5c' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E\")",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'soft': '0 2px 20px rgba(0, 0, 0, 0.04), 0 1px 4px rgba(0, 0, 0, 0.04)',
        'warm': '0 4px 24px rgba(200, 159, 92, 0.12), 0 1px 6px rgba(0, 0, 0, 0.04)',
        'elevated': '0 8px 40px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 24px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}

export default config
