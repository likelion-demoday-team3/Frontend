import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // VITE_USE_MOCK_API=false일 때 개발 서버가 /api를 로컬 백엔드에 전달합니다.
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true, rewrite: path => path.replace(/^\/api/, '') } },
  },
})
