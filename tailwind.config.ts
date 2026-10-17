import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/styles/**/*.css',
  ],
  safelist: [
    // Reveal delay utilities used dynamically via template literals
    'reveal-delay-1',
    'reveal-delay-2',
    'reveal-delay-3',
    'reveal-delay-4',
    // Custom animations from landing.css
    'animate-blob',
    'animate-slide-up',
    'animate-gradient-x',
    'animate-radar',
    'animate-float',
    'animate-shimmer',
    'animate-pulse-glow',
    'animate-fade-in-scale',
    'animate-spin-slow',
    'animation-delay-100',
    'animation-delay-200',
    'animation-delay-2000',
    'animation-delay-4000',
    'glass-panel',
    'card-hover',
    'static-noise',
    'radar-sweep',
    'wa-bg',
    'custom-scrollbar',
    'text-shimmer',
    'glow-border',
    'video-overlay-block',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        blob:         'blob 8s ease-in-out infinite',
        'slide-up':   'slideUp .45s cubic-bezier(.22,1,.36,1) forwards',
        'gradient-x': 'gradientX 12s ease infinite',
        radar:        'radar 2s linear infinite',
        float:        'floatY 4s ease-in-out infinite',
        shimmer:      'shimmer 2.5s linear infinite',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'fade-in-scale': 'fadeInScale .55s cubic-bezier(.22,1,.36,1) forwards',
        'spin-slow':  'spinSlow 8s linear infinite',
      },
      keyframes: {
        blob: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%':     { transform: 'translate(24px,-40px) scale(1.08)' },
          '66%':     { transform: 'translate(-16px,16px) scale(0.94)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        gradientX: {
          '0%,100%': { backgroundPosition: 'left center' },
          '50%':     { backgroundPosition: 'right center' },
        },
        radar: {
          to: { transform: 'rotate(360deg)' },
        },
        floatY: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% center' },
          to:   { backgroundPosition: '200% center' },
        },
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(59,130,246,0)' },
          '50%':     { boxShadow: '0 0 20px 4px rgba(59,130,246,.25)' },
        },
        fadeInScale: {
          from: { opacity: '0', transform: 'scale(.96) translateY(12px)' },
          to:   { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        spinSlow: {
          to: { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
