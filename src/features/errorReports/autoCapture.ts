import { getAccessToken } from '../auth/session'
import { setApiFailureListener, type ApiFailureInfo } from '../api/client'
import { ERROR_REPORTS_PATH, submitErrorReport } from './api'

// 앱에서 생긴 에러를 자동으로 모아 개발자에게 보낸다 (kind=AUTO).
// - 화면 에러(window error), 처리되지 않은 Promise 에러, 서버 5xx·연결 실패
// - 로그인한 상태에서만 보낸다 (제보 API가 로그인을 요구한다)
// - 같은 에러는 페이지를 새로 열 때까지 한 번만, 한 번 열린 페이지에서 최대 MAX_SENDS개까지만 보낸다
// - 최근 에러 몇 개는 기억해 두었다가 사용자가 직접 제보할 때 함께 붙인다

const MAX_SENDS = 10
const RECENT_LIMIT = 5

export type CapturedError = { at: string; message: string; pageUrl: string; detail?: string }

const sentKeys = new Set<string>()
let sendCount = 0
const recent: CapturedError[] = []
let installed = false

/** 직접 제보할 때 붙일 최근 에러 (최신이 마지막) */
export const recentErrors = (): CapturedError[] => [...recent]

function remember(error: CapturedError) {
  recent.push(error)
  if (recent.length > RECENT_LIMIT) recent.shift()
}

function capture(message: string, detail?: string) {
  const trimmed = message.trim()
  if (!trimmed) return
  const error: CapturedError = {
    at: new Date().toISOString(),
    message: trimmed.slice(0, 1000),
    pageUrl: window.location.href,
    detail: detail?.slice(0, 4000),
  }
  remember(error)

  const key = `${error.message}|${window.location.pathname}`
  if (!getAccessToken() || sentKeys.has(key) || sendCount >= MAX_SENDS) return
  sentKeys.add(key)
  sendCount += 1
  // 제보 자체가 실패해도 사용자 화면에는 아무 영향이 없게 한다
  void submitErrorReport({
    kind: 'AUTO',
    message: error.message,
    pageUrl: error.pageUrl,
    userAgent: navigator.userAgent,
    detail: error.detail,
  }).catch(() => undefined)
}

// 브라우저 확장 프로그램이나 다른 사이트 스크립트에서 난 에러, 의미 없는 경고는 버린다
function isNoise(message: string, hasStack: boolean) {
  if (message === 'Script error.' && !hasStack) return true
  return /ResizeObserver loop/i.test(message)
}

function onWindowError(event: ErrorEvent) {
  const error = event.error instanceof Error ? event.error : null
  const message = error?.message || event.message || ''
  if (isNoise(message, Boolean(error?.stack))) return
  const where = event.filename ? `\n(${event.filename}:${event.lineno}:${event.colno})` : ''
  capture(message, (error?.stack ?? '') + where)
}

function onUnhandledRejection(event: PromiseRejectionEvent) {
  const reason = event.reason
  // 서버 응답 에러(ApiError)는 아래 API 실패 수집에서 따로 다룬다
  if (reason instanceof Error && reason.name === 'ApiError') return
  const message = reason instanceof Error ? reason.message : String(reason ?? '')
  if (isNoise(message, reason instanceof Error && Boolean(reason.stack))) return
  capture(`Unhandled promise rejection: ${message}`, reason instanceof Error ? reason.stack : undefined)
}

function onApiFailure(info: ApiFailureInfo) {
  // 제보 API 자신의 실패는 다시 제보하지 않는다 (무한 반복 방지)
  if (info.path.startsWith(ERROR_REPORTS_PATH)) return
  const status = info.status === 0 ? '연결 실패' : `HTTP ${info.status}`
  capture(`API ${info.method} ${info.path.split('?')[0]} → ${status}`,
    [info.code && `code: ${info.code}`, info.message && `message: ${info.message}`].filter(Boolean).join('\n'))
}

/** 앱 시작 때 한 번 부른다 */
export function installErrorCapture() {
  if (installed) return
  installed = true
  window.addEventListener('error', onWindowError)
  window.addEventListener('unhandledrejection', onUnhandledRejection)
  setApiFailureListener(onApiFailure)
}
