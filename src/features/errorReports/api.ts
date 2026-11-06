import { apiRequest } from '../api/client'

// 오류 제보 (POST /api/error-reports, 운영자 GET /admin/error-reports)
export type ErrorReportKind = 'USER' | 'AUTO'
export type ErrorReportStatus = 'OPEN' | 'RESOLVED'

export type ErrorReportInput = {
  kind: ErrorReportKind
  message: string
  pageUrl?: string
  userAgent?: string
  detail?: string
}

/** id가 null이면 자동 수집이 너무 많아 서버가 버린 것. merged는 같은 자동 에러에 횟수만 더한 것 */
export type ErrorReportReceipt = { id: number | null; merged: boolean }

export type AdminErrorReport = {
  id: number
  kind: ErrorReportKind
  status: ErrorReportStatus
  message: string
  pageUrl: string | null
  userAgent: string | null
  detail: string | null
  occurrenceCount: number
  reporter: { memberId: number; name: string | null; email: string | null } | null
  createdAt: string
  lastOccurredAt: string
  resolvedAt: string | null
}

export const ERROR_REPORTS_PATH = '/api/error-reports'

export const submitErrorReport = (input: ErrorReportInput) =>
  apiRequest<ErrorReportReceipt>(ERROR_REPORTS_PATH, { method: 'POST', body: input })

export const getAdminErrorReports = (filter: { status?: ErrorReportStatus; kind?: ErrorReportKind } = {}) => {
  const query = new URLSearchParams()
  if (filter.status) query.set('status', filter.status)
  if (filter.kind) query.set('kind', filter.kind)
  const search = query.toString()
  return apiRequest<AdminErrorReport[]>(search ? `/admin/error-reports?${search}` : '/admin/error-reports')
}

export const resolveErrorReport = (errorReportId: number) =>
  apiRequest<null>(`/admin/error-reports/${errorReportId}/resolve`, { method: 'POST' })
