import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ── Campus Loop Design Tokens ──────────────────────────
      colors: {
        // Dark theme (primary)
        canvas:    '#17120d',   // Primary background
        surface:   '#201914',   // Cards, nav modules
        elevated:  '#281f19',   // Featured rows, modals
        border:    'rgba(255, 235, 220, 0.12)',

        // Typography
        primary:   '#f7efe7',   // Main text — ivory
        muted:     '#d3c0b0',   // Secondary text — soft sand

        // Accent
        accent:    '#e87c3a',   // Warm amber — CTAs
        'accent-hover': '#d4692a',

        // Light theme (cream)
        cream: {
          bg:      '#faf6f0',
          surface: '#f2ebe0',
          border:  'rgba(100, 70, 40, 0.12)',
          text:    '#2c1a0e',
          muted:   '#7a5c42',
        },

        // Status colors
        success:   '#4caf50',
        error:     '#ef5350',
        warning:   '#ff9800',
      },

      fontFamily: {
        // Display font — used for headings
        display: ['var(--font-display)', 'Georgia', 'serif'],
        // Body font — used for all text
        body:    ['var(--font-body)', 'system-ui', 'sans-serif'],
      },

      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '24px',
      },

      boxShadow: {
        'card':    '0 4px 24px rgba(0,0,0,0.3)',
        'modal':   '0 8px 48px rgba(0,0,0,0.5)',
        'glow':    '0 0 24px rgba(232, 124, 58, 0.2)',
      },

      animation: {
        'fade-up':    'fadeUp 0.4s ease forwards',
        'fade-in':    'fadeIn 0.3s ease forwards',
        'slide-in':   'slideIn 0.3s ease forwards',
        'shimmer':    'shimmer 1.5s infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },

      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}

export default config