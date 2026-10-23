import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 개발 서버가 /api 요청을 로컬 백엔드에 전달합니다.
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true, rewrite: path => path.replace(/^\/api/, '') } },
  },
})
