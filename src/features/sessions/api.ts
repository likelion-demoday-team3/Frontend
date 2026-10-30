import { apiRequest } from '../api/client'
import type { CancellationResult, MySession, ParticipationResult, Session, SessionDetail } from './types'

export function getSessions(): Promise<Session[]> {
  return apiRequest<Session[]>('/sessions')
}

export function getMySessions(): Promise<MySession[]> {
  return apiRequest<MySession[]>('/sessions/my')
}

export function getSession(sessionId: number): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}`)
}

export function applyToSession(sessionId: number): Promise<ParticipationResult> {
  return apiRequest<ParticipationResult>(`/sessions/${sessionId}/participation`, { method: 'POST' })
}

export function cancelSession(sessionId: number): Promise<CancellationResult> {
  return apiRequest<CancellationResult>(`/sessions/${sessionId}/participation`, { method: 'DELETE' })
}

export type SessionCreateRequest = {
  startTime: string
  capacityPerGender: number
  roundDurationSeconds: number
  votingDurationSeconds: number
  resultAndShareDurationSeconds: number
  entryFeeGem: number
  completionRefundGem: number
}

// 관리자 전용. 생성된 세션은 SCHEDULED 상태라 목록에 보이려면 모집 시작(openSessionRecruiting)이 필요하다
export function createSession(request: SessionCreateRequest): Promise<number> {
  return apiRequest<number>('/admin/sessions', { method: 'POST', body: request })
}

export function openSessionRecruiting(sessionId: number): Promise<null> {
  return apiRequest<null>(`/admin/sessions/${sessionId}/open`, { method: 'POST' })
}

// DELETED: 신청 기록이 없어 세션을 지움 / CANCELLED: 신청 기록이 있어 전원 100% 환불 후 취소 (목록에서는 둘 다 사라진다)
export type SessionDeleteResult = {
  sessionId: number
  result: 'DELETED' | 'CANCELLED'
  refundedParticipants: number
}

export function deleteAdminSession(sessionId: number): Promise<SessionDeleteResult> {
  return apiRequest<SessionDeleteResult>(`/admin/sessions/${sessionId}`, { method: 'DELETE' })
}

export function submitSessionVotes(sessionId: number, rankedMemberIds: number[]): Promise<unknown> {
  if (rankedMemberIds.length < 1 || rankedMemberIds.length > 3 || new Set(rankedMemberIds).size !== rankedMemberIds.length) {
    return Promise.reject(new Error('투표는 중복 없이 1명 이상, 최대 3명까지 선택해주세요.'))
  }
  return apiRequest<unknown>(`/api/sessions/${sessionId}/votes`, {
    method: 'POST',
    body: { rankedMemberIds },
  })
}
