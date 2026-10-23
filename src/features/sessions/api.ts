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

export function submitSessionVotes(sessionId: number, rankedMemberIds: number[]): Promise<unknown> {
  if (rankedMemberIds.length < 1 || rankedMemberIds.length > 3 || new Set(rankedMemberIds).size !== rankedMemberIds.length) {
    return Promise.reject(new Error('투표는 중복 없이 1명 이상, 최대 3명까지 선택해주세요.'))
  }
  return apiRequest<unknown>(`/api/sessions/${sessionId}/votes`, {
    method: 'POST',
    body: { rankedMemberIds },
  })
}
