import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './entrypoints/**/*.{ts,tsx,html}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0f172a',
          light: '#1e293b',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.85)',
          medium: 'rgba(255, 255, 255, 0.65)',
          heavy: 'rgba(255, 255, 255, 0.95)',
          border: 'rgba(255, 255, 255, 0.65)',
          shimmer: 'rgba(255, 255, 255, 0.4)',
        },
        accent: {
          purple: '#8b5cf6',
          blue: '#3b82f6',
          green: '#10b981',
          pink: '#ec4899',
          orange: '#f59e0b',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      animation: {
        'glass-shimmer': 'glass-shimmer 3s ease-in-out infinite',
        'float-gentle': 'float-gentle 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-down': 'slide-down 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in': 'fade-in 0.3s ease-out',
        'bounce-gentle': 'bounce-gentle 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      keyframes: {
        'glass-shimmer': {
          '0%, 100%': {
            opacity: '0.3',
            transform: 'translateX(-100%) skewX(-45deg)',
          },
          '50%': {
            opacity: '0.8',
            transform: 'translateX(100%) skewX(-45deg)',
          },
        },
        'float-gentle': {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-2px)',
          },
        },
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 5px rgba(139, 92, 246, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.6)',
          },
        },
        'slide-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px) scale(0.95)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
        },
        'slide-down': {
          '0%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
          '100%': {
            opacity: '0',
            transform: 'translateY(-20px) scale(0.95)',
          },
        },
        'scale-in': {
          '0%': {
            opacity: '0',
            transform: 'scale(0.9)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
        'fade-in': {
          '0%': {
            opacity: '0',
          },
          '100%': {
            opacity: '1',
          },
        },
        'bounce-gentle': {
          '0%': {
            transform: 'scale(0.3)',
          },
          '50%': {
            transform: 'scale(1.05)',
          },
          '70%': {
            transform: 'scale(0.9)',
          },
          '100%': {
            transform: 'scale(1)',
          },
        },
      },
      backdropBlur: {
        xs: '2px',
        '4xl': '72px',
      },
      boxShadow: {
        'glass-sm': '0 2px 8px rgba(15, 23, 42, 0.08)',
        'glass-md': '0 8px 32px rgba(15, 23, 42, 0.12)',
        'glass-lg': '0 16px 64px rgba(15, 23, 42, 0.16)',
        'glass-xl': '0 24px 96px rgba(15, 23, 42, 0.2)',
        'inner-glass': 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        'glow-sm': '0 0 10px rgba(139, 92, 246, 0.3)',
        'glow-md': '0 0 20px rgba(139, 92, 246, 0.4)',
        'glow-lg': '0 0 30px rgba(139, 92, 246, 0.5)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      zIndex: {
        toast: '2147483640',
        modal: '2147483645',
        tooltip: '2147483647',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
