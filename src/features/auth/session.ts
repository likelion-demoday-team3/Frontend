const storageKey = 'kiiwee.accessToken'
const expiryKey = 'kiiwee.accessTokenExpiresAt'
const sessionStorageKey = 'kiiwee.accessToken'
const sessionExpiryKey = 'kiiwee.accessTokenExpiresAt'
let currentAccessToken: string | null = null

export function restoreAccessToken() {
  const now = Date.now()
  const storedTokens = [
    {
      storage: window.localStorage,
      token: window.localStorage.getItem(storageKey),
      expiresAt: Number(window.localStorage.getItem(expiryKey) ?? 0),
    },
    {
      storage: window.sessionStorage,
      token: window.sessionStorage.getItem(sessionStorageKey),
      expiresAt: Number(window.sessionStorage.getItem(sessionExpiryKey) ?? 0),
    },
  ]
  const restored = storedTokens.find(({ token, expiresAt }) => token && expiresAt > now)
  if (!restored?.token) {
    clearAccessToken()
    return null
  }
  currentAccessToken = restored.token
  return restored.token
}

export function setAccessToken(token: string | null, remember = true) {
  const normalizedToken = token?.trim().replace(/^Bearer\s+/i, '') || null
  currentAccessToken = normalizedToken
  if (!normalizedToken) {
    clearAccessToken()
    return
  }

  const expiresAt = String(Date.now() + 7 * 24 * 60 * 60 * 1000)
  if (remember) {
    window.localStorage.setItem(storageKey, normalizedToken)
    window.localStorage.setItem(expiryKey, expiresAt)
    window.sessionStorage.removeItem(sessionStorageKey)
    window.sessionStorage.removeItem(sessionExpiryKey)
  } else {
    window.localStorage.removeItem(storageKey)
    window.localStorage.removeItem(expiryKey)
    window.sessionStorage.setItem(sessionStorageKey, normalizedToken)
    window.sessionStorage.setItem(sessionExpiryKey, expiresAt)
  }
}

export function clearAccessToken() {
  currentAccessToken = null
  window.localStorage.removeItem(storageKey)
  window.localStorage.removeItem(expiryKey)
  window.sessionStorage.removeItem(sessionStorageKey)
  window.sessionStorage.removeItem(sessionExpiryKey)
}

export function getAccessToken() {
  return currentAccessToken
}

// 화면 표시용으로만 쓴다. 실제 권한 검사는 서버(/admin/**는 ADMIN만)가 한다
export function getAccessTokenRole(): string | null {
  const payload = currentAccessToken?.split('.')[1]
  if (!payload) return null
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=')
    const claims = JSON.parse(window.atob(base64)) as { role?: unknown }
    return typeof claims.role === 'string' ? claims.role : null
  } catch {
    return null
  }
}

export const isAdminToken = () => getAccessTokenRole() === 'ADMIN'
