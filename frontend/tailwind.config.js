/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#090D16',
        'obsidian-light': '#0D1424',
        card: '#131B2E',
        'card-hover': '#1B2642',
        'card-glass': 'rgba(19, 27, 46, 0.8)',
        surface: '#1E293B',
        'surface-light': '#334155',
        neon: '#10B981',
        'neon-light': '#34D399',
        'neon-glow': 'rgba(16,185,129,0.35)',
        cyan: '#06B6D4',
        'cyan-light': '#38BDF8',
        'cyan-glow': 'rgba(6,182,212,0.35)',
        amber: '#F59E0B',
        'amber-glow': 'rgba(245,158,11,0.35)',
        crimson: '#EF4444',
        'crimson-glow': 'rgba(239,68,68,0.35)',
        'hero-purple': '#6C63FF',
        'hero-pink': '#FF6B6B',
        'hero-gold': '#FFD93D',
        'hero-green': '#6BCB77',
        muted: '#94A3B8',
        'muted-dark': '#64748B',
      },
      fontFamily: {
        outfit: ['Outfit', 'Inter', '-apple-system', 'sans-serif'],
        sans: ['Inter', 'Outfit', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '20px',
        xl: '16px',
        lg: '12px',
        md: '8px',
      },
      boxShadow: {
        glow: '0 0 30px rgba(16,185,129,0.35)',
        'glow-sm': '0 0 15px rgba(16,185,129,0.25)',
        'glow-cyan': '0 0 30px rgba(6,182,212,0.35)',
        'glow-cyan-sm': '0 0 15px rgba(6,182,212,0.25)',
        'glow-amber': '0 0 25px rgba(245,158,11,0.35)',
        card: '0 10px 30px -10px rgba(0,0,0,0.5)',
        'card-hover': '0 20px 40px -15px rgba(0,0,0,0.7)',
        hud: '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
      },
      animation: {
        'fade-in': 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        shimmer: 'shimmer 1.8s infinite linear',
        float: 'float 3s ease-in-out infinite',
        spin: 'spin 0.7s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(16,185,129,0.25)' },
          '50%': { boxShadow: '0 0 35px rgba(16,185,129,0.6)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};
