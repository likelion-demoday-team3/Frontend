import { apiRequest } from '../api/client'

export type IceServerConfig = {
  iceServers: Array<{ urls: string[]; username: string | null; credential: string | null }>
  credentialTtlSeconds: number
}

export type LiveSessionState = {
  sessionId: number
  phase: string
  deadline: string | null
  voteSubmitted: boolean
  participants: Array<{
    memberId: number
    gender: 'MALE' | 'FEMALE'
    alias: string
  }>
}

export const getIceServers = (sessionId: number) =>
  apiRequest<IceServerConfig>(`/api/live/sessions/${sessionId}/ice-servers`)

export const getLiveSessionState = (sessionId: number) =>
  apiRequest<LiveSessionState>(`/api/sessions/${sessionId}/live/state`)
