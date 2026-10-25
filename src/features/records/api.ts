import { apiRequest } from '../api/client'

export type ContactType = 'PHONE' | 'INSTAGRAM'

export type ContactShare = {
  id: number
  sessionId: number
  senderId: number
  receiverId: number
  contactType: ContactType
  contactValue: string | null
  shareType: 'MANUAL' | 'REQUEST_ACCEPTED' | 'AUTO_MATCH'
  createdAt: string
  sessionStartTime: string
  senderAlias: string | null
  receiverAlias: string | null
}

export type MatchHistoryItem = {
  sessionId: number
  sessionStartTime: string
  matched: boolean
  partnerMemberId: number | null
  partnerAlias: string | null
  matchedAt: string | null
}

type History<T> = { items: T[]; hasNext: boolean }

export const getContactShares = (direction: 'SENT' | 'RECEIVED', page = 0, size = 50) =>
  apiRequest<History<ContactShare>>(`/api/contact-history/shares?direction=${direction}&page=${page}&size=${size}`)

export const getMatchHistory = () => apiRequest<MatchHistoryItem[]>('/api/match-history')
