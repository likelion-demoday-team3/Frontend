import { clearAccessToken, getAccessToken } from '../auth/session'

// The domain API uses root-level routes such as /auth and /sessions.
// /api is only needed locally as the Vite proxy prefix; the vote API adds it
// explicitly in its own route. Strip a stale /api suffix from deployed envs.
const configuredApiOrigin = (import.meta.env.VITE_API_BASE_URL ?? '')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '')
const baseUrl = configuredApiOrigin || (import.meta.env.DEV ? '/api' : 'https://kiwiapi.duckdns.org')

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  constructor(message: string, code = '', status = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

type ApiEnvelope<T> = { success: boolean; data: T; error: { code: string; message: string } | null }
type ApiFailurePayload = {
  success?: boolean
  error?: string | { code?: string; message?: string } | null
  message?: string
  code?: string
  data?: unknown
}

export async function apiRequest<T>(path: string, options: { method?: string; body?: unknown; authenticated?: boolean } = {}): Promise<T> {
  const { method = 'GET', body, authenticated = true } = options
  const accessToken = authenticated ? getAccessToken() : null
  if (authenticated && !accessToken) {
    throw new ApiError('로그인이 필요해요.', 'UNAUTHORIZED', 401)
  }
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new ApiError('서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.')
  }

  const result = await response.json().catch(() => null) as (ApiEnvelope<T> & ApiFailurePayload) | null
  if (!response.ok || !result?.success) {
    const message = typeof result?.error === 'object' && result.error !== null
      ? result.error.message ?? result.message
      : result?.message ?? (typeof result?.error === 'string' ? result.error : undefined)
    const code = typeof result?.error === 'object' && result.error !== null
      ? result.error.code ?? result.code ?? ''
      : result?.code ?? ''
    if (response.status === 401 && ['TOKEN_EXPIRED', 'INVALID_TOKEN', 'UNAUTHORIZED'].includes(code)) {
      clearAccessToken()
      if (window.location.pathname !== '/login') {
        window.history.pushState(null, '', '/login')
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    }
    throw new ApiError(message ?? '요청을 처리하지 못했어요. 다시 시도해주세요.', code, response.status)
  }
  return result.data
}
