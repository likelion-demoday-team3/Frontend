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
