import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/circuit-equivalence-lab/',
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/.npm-cache/**', '**/output/playwright/**', '**/.artifacts/**', '**/coverage/**'],
    },
  },
})
