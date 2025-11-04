import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/tortilleria-pos/', // IMPORTANT: Replace 'tortilleria-pos' with your GitHub repository name
})
