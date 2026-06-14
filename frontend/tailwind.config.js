/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Custom fintech palette
        fintech: {
          900: '#020617', // Deepest background
          800: '#0F172A', // Primary dark
          700: '#1E293B', // Secondary dark
          600: '#334155', // Tertiary dark
          500: '#475569', // Muted
          400: '#94A3B8', // Light muted
          300: '#CBD5E1', // Lighter
          100: '#F8FAFC', // Text primary
          50: '#F1F5F9',  // Text secondary
        },
        // Semantic colors
        success: {
          DEFAULT: '#22C55E',
          dark: '#16A34A',
          light: '#4ADE80',
          glow: 'rgba(34, 197, 94, 0.3)',
        },
        danger: {
          DEFAULT: '#EF4444',
          dark: '#DC2626',
          light: '#F87171',
          glow: 'rgba(239, 68, 68, 0.3)',
        },
        warning: {
          DEFAULT: '#F59E0B',
          dark: '#D97706',
          light: '#FBBF24',
        },
        info: {
          DEFAULT: '#3B82F6',
          dark: '#2563EB',
          light: '#60A5FA',
          glow: 'rgba(59, 130, 246, 0.3)',
        },
        accent: {
          DEFAULT: '#6366F1',
          dark: '#4F46E5',
          light: '#818CF8',
        },
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'glow-success': '0 0 20px rgba(34, 197, 94, 0.3)',
        'glow-danger': '0 0 20px rgba(239, 68, 68, 0.3)',
        'glow-info': '0 0 20px rgba(59, 130, 246, 0.3)',
        'inner-light': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

