import { apiRequest } from '../api/client'

export type HeartStatus = {
  sentTo: number[]
  receivedCount: number
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
export type ContactRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED'
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

export const closeResultsWindow = (sessionId: number) =>
  apiRequest<null>(`/api/sessions/${sessionId}/results/close`, { method: 'POST' })
