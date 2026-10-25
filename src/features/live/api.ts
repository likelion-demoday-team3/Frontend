import { apiRequest } from '../api/client'

export type IceServerConfig = {
  iceServers: Array<{ urls: string[]; username: string | null; credential: string | null }>
  credentialTtlSeconds: number
}

export const getIceServers = (sessionId: number) =>
  apiRequest<IceServerConfig>(`/api/live/sessions/${sessionId}/ice-servers`)
