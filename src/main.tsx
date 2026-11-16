import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { registerServiceWorker } from './features/push/push'

// 웹 푸시 알림을 받기 위한 서비스 워커
registerServiceWorker()
createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
)
