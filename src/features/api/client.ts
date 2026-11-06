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

/** 서버 오류(5xx)나 연결 실패가 났을 때 알려줄 곳. 오류 자동 수집(autoCapture)이 등록한다 */
export type ApiFailureInfo = { method: string; path: string; status: number; code: string; message: string }
let apiFailureListener: ((info: ApiFailureInfo) => void) | null = null
export function setApiFailureListener(listener: ((info: ApiFailureInfo) => void) | null) {
  apiFailureListener = listener
}
function notifyApiFailure(info: ApiFailureInfo) {
  try {
    apiFailureListener?.(info)
  } catch {
    // 수집이 실패해도 원래 요청 흐름에는 영향을 주지 않는다
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

export async function apiRequest<T>(path: string, options: { method?: string; body?: unknown; authenticated?: boolean | 'optional' } = {}): Promise<T> {
  const { method = 'GET', body, authenticated = true } = options
  const accessToken = authenticated === false ? null : getAccessToken()
  if (authenticated === true && !accessToken) {
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
    notifyApiFailure({ method, path, status: 0, code: '', message: '서버에 연결하지 못함' })
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
    // 사용자의 잘못된 요청(4xx)은 정상 흐름이라 빼고, 서버 오류만 수집한다
    if (response.status >= 500) {
      notifyApiFailure({ method, path, status: response.status, code, message: message ?? '' })
    }
    throw new ApiError(message ?? '요청을 처리하지 못했어요. 다시 시도해주세요.', code, response.status)
  }
  return result.data
}
