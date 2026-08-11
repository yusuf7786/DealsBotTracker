import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        surface2: 'rgb(var(--surface-2) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        text: 'rgb(var(--text) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        exceptional: 'rgb(var(--exceptional) / <alpha-value>)',
        excellent: 'rgb(var(--excellent) / <alpha-value>)',
        good: 'rgb(var(--good) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'pulse-soft': { '0%,100%': { opacity: '1' }, '50%': { opacity: '.6' } },
      },
      animation: {
        'fade-in': 'fade-in .25s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
