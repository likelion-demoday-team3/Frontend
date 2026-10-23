import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { setAccessToken } from './features/auth/session'

async function start() {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API !== 'false') {
    const { worker, initializeSessionTestAccount } = await import('./mocks/browser')
    await worker.start({ onUnhandledFrame: 'bypass' })
    if (import.meta.env.VITE_AUTO_LOGIN_MOCK !== 'false') {
      setAccessToken(initializeSessionTestAccount())
    }
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void start()
