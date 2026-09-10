/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#090D16',
        card: '#131B2E',
        'card-hover': '#1a2235',
        surface: '#1F2937',
        neon: '#10B981',
        'neon-glow': 'rgba(16,185,129,0.35)',
        cyan: '#06B6D4',
        'cyan-glow': 'rgba(6,182,212,0.35)',
        amber: '#F59E0B',
        crimson: '#EF4444',
        'hero-purple': '#6C63FF',
        'hero-pink': '#FF6B6B',
        'hero-gold': '#FFD93D',
        'hero-green': '#6BCB77',
        muted: '#94A3B8',
      },
      fontFamily: {
        outfit: ['Outfit', 'Inter', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xl: '16px',
        lg: '10px',
      },
      boxShadow: {
        glow: '0 0 30px rgba(16,185,129,0.35)',
        'glow-cyan': '0 0 30px rgba(6,182,212,0.35)',
        card: '0 8px 32px rgba(0,0,0,0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'scale-in': 'scaleIn 0.3s ease forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        shimmer: 'shimmer 1.5s infinite',
        spin: 'spin 0.7s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(16,185,129,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(16,185,129,0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
