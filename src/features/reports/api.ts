import { apiRequest } from '../api/client'

// 백엔드 ReportReason과 같은 값. 라벨은 신고 팝업에 보이는 문구
export const reportReasons = [
  { code: 'RULE_VIOLATION', label: '규칙을 위반했어요.' },
  { code: 'LEFT_EARLY', label: '대화 중간에 나갔어요.' },
  { code: 'SEXUAL_HARASSMENT', label: '성희롱을 했어요.' },
  { code: 'GENDER_FRAUD', label: '성별을 속였어요.' },
  { code: 'PERSISTENT_MEETING_REQUEST', label: '계속 만나자고 말해요.' },
  { code: 'VERBAL_ABUSE', label: '사이버 언어폭력을 해요.' },
] as const

export type ReportReason = (typeof reportReasons)[number]['code']
export type ReportStatus = 'PENDING' | 'ACTIONED' | 'DISMISSED'
export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN'

export type ReportReceipt = { reportId: number; alreadyReported: boolean }

/** 세션에서 대화한 상대 신고. 같은 상대를 다시 신고하면 기존 신고를 돌려준다 */
export const submitReport = (sessionId: number, targetId: number, reason: ReportReason) =>
  apiRequest<ReportReceipt>(`/api/sessions/${sessionId}/reports`, {
    method: 'POST',
    body: { targetId, reason },
  })

// ===== 운영자 =====

export type ReportPerson = {
  memberId: number
  alias: string | null
  name: string | null
  email: string | null
  status: MemberStatus | null
}

export type AdminReport = {
  reportId: number
  sessionId: number
  sessionStartTime: string | null
  reporter: ReportPerson
  reported: ReportPerson
  reportedTotalCount: number
  reason: ReportReason
  reasonLabel: string
  status: ReportStatus
  createdAt: string
  resolvedAt: string | null
}

export type SuspendResult = { memberId: number; cancelledApplications: number; resolvedReports: number }

export const getAdminReports = (status?: ReportStatus) =>
  apiRequest<AdminReport[]>(`/admin/reports${status ? `?status=${status}` : ''}`)

export const suspendMember = (memberId: number) =>
  apiRequest<SuspendResult>(`/admin/members/${memberId}/suspend`, { method: 'POST' })

export const reactivateMember = (memberId: number) =>
  apiRequest<null>(`/admin/members/${memberId}/reactivate`, { method: 'POST' })

export const dismissReport = (reportId: number) =>
  apiRequest<null>(`/admin/reports/${reportId}/dismiss`, { method: 'POST' })
