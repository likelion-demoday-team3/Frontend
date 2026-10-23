const storageKey = 'kiiwee.accessToken'
const expiryKey = 'kiiwee.accessTokenExpiresAt'
let currentAccessToken: string | null = null

export function restoreAccessToken() {
  const token = window.localStorage.getItem(storageKey)
  const expiresAt = Number(window.localStorage.getItem(expiryKey) ?? 0)
  if (!token || expiresAt <= Date.now()) {
    clearAccessToken()
    return null
  }
  currentAccessToken = token
  return token
}

export function setAccessToken(token: string | null, remember = true) {
  const normalizedToken = token?.trim().replace(/^Bearer\s+/i, '') || null
  currentAccessToken = normalizedToken
  if (normalizedToken && remember) {
    window.localStorage.setItem(storageKey, normalizedToken)
    window.localStorage.setItem(expiryKey, String(Date.now() + 7 * 24 * 60 * 60 * 1000))
  } else {
    window.localStorage.removeItem(storageKey)
    window.localStorage.removeItem(expiryKey)
  }
}

export function clearAccessToken() {
  currentAccessToken = null
  window.localStorage.removeItem(storageKey)
  window.localStorage.removeItem(expiryKey)
}

export function getAccessToken() {
  return currentAccessToken
}
