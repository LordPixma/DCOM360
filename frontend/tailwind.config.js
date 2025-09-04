/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        brand: {
          primary: '#0066FF',
          secondary: '#1A1D29',
          accent: '#00D4AA',
        },
        // Alert status
        status: {
          red: '#FF4444',
          orange: '#FF8800',
          green: '#00CC66',
          blue: '#0066FF',
        },
        // Neutrals
        charcoal: '#1A1D29',
        gray: {
          700: '#4A5568',
          400: '#A0AEC0',
          bg: '#F7FAFC',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Monaco',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 2px 8px rgba(0,0,0,0.06)',
        md: '0 4px 16px rgba(0,0,0,0.08)',
        lg: '0 8px 32px rgba(0,0,0,0.12)',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.06)', opacity: '0.85' },
        },
        progressBar: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      animation: {
        pulseSoft: 'pulseSoft 1.8s ease-in-out infinite',
        progressBar: 'progressBar 30s linear infinite',
      },
    }
  },
  plugins: []
}
