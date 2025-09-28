import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname
    }
  },
    test: {
      environment: 'jsdom',
      include: ['src/test/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
      exclude: ['e2e/**','tests/**'],
      setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
        reporter: ['text','html'],
    },
  }
})
