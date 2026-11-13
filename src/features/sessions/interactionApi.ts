import { apiRequest } from '../api/client'

export type HeartStatus = {
  sentTo: number[]
  receivedCount: number
  receivedFrom?: Array<{ senderId: number; senderAlias: string }>
  freeHeartRemaining: boolean
  heartsEndsAt: string | null
}

export type HeartReceipt = { receiverId: number; chargedGem: number; alreadySent: boolean }

export const getHeartStatus = (sessionId: number) =>
  apiRequest<HeartStatus>(`/api/sessions/${sessionId}/hearts`)

export const sendHeart = (sessionId: number, receiverId: number) =>
  apiRequest<HeartReceipt>(`/api/sessions/${sessionId}/hearts`, {
    method: 'POST',
    body: { receiverId },
  })

export type ContactType = 'PHONE' | 'INSTAGRAM'
// 백엔드 ContactRequest.Status와 같은 값 (거절은 REJECTED)
export type ContactRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'
export type ContactRequest = {
  id: number
  sessionId: number
  requesterId: number
  targetId: number
  contactType: ContactType
  status: ContactRequestStatus
  chargedGem: number
  createdAt: string
  respondedAt: string | null
  /** 아래는 요청 기록(getContactRequests)에서만 온다 */
  sessionStartTime?: string | null
  requesterAlias?: string | null
  targetAlias?: string | null
  /** 조회한 내가 보낸 요청이면 SENT, 받은 요청이면 RECEIVED */
  direction?: 'SENT' | 'RECEIVED' | null
}

type Paged<T> = { items: T[]; hasNext: boolean }

export const sendContact = (sessionId: number, targetId: number, contactType: ContactType) =>
  apiRequest<unknown>(`/api/sessions/${sessionId}/contacts/send`, {
    method: 'POST', body: { targetId, contactType },
  })

export const requestContact = (sessionId: number, targetId: number, contactType: ContactType) =>
  apiRequest<ContactRequest>(`/api/sessions/${sessionId}/contacts/requests`, {
    method: 'POST', body: { targetId, contactType },
  })

export const respondToContactRequest = (sessionId: number, requestId: number, accept: boolean) =>
  apiRequest<ContactRequest>(`/api/sessions/${sessionId}/contacts/requests/${requestId}/response`, {
    method: 'POST', body: { accept },
  })

export const getContactRequests = (page = 0, size = 50) =>
  apiRequest<Paged<ContactRequest>>(`/api/contact-history/requests?page=${page}&size=${size}`)

// 세션에서 내가 대화한 상대 목록. 연락처 화면이 탭을 새로 열어도 서버에서 다시 받는다
export type SessionPartners = {
  sessionId: number
  myMemberId: number
  partners: Array<{ memberId: number; alias: string | null; roundNumber: number }>
}

export const getSessionPartners = (sessionId: number) =>
  apiRequest<SessionPartners>(`/api/sessions/${sessionId}/partners`)

export const closeResultsWindow = (sessionId: number) =>
  apiRequest<null>(`/api/sessions/${sessionId}/results/close`, { method: 'POST' })
