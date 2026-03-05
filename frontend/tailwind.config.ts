import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core dark theme surfaces
        'aeo-bg':      '#0d0f1a',
        'aeo-surface': '#111827',
        'aeo-card':    '#1f2937',
        'aeo-border':  '#374151',
        // Accent colors (matching the reference UI)
        'aeo-green':   '#00ff88',
        'aeo-purple':  '#a855f7',
        'aeo-yellow':  '#eab308',
        'aeo-red':     '#ef4444',
        'aeo-orange':  '#f97316',
      },
      fontFamily: {
        sans: [
          'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"',
          '"Noto Sans CJK SC"', '"Noto Sans CJK TC"', 'sans-serif',
        ],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Menlo', 'monospace'],
      },
      animation: {
        'ticker': 'ticker 40s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
