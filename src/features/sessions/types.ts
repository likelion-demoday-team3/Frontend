export type SessionStatus = 'SCHEDULED' | 'RECRUITING' | 'READY' | 'CANCELLED' | 'COMPLETED'
export type MyStatus = 'APPLIED' | 'CANCELLED' | 'ATTENDED' | 'NO_SHOW' | 'LEFT'

// GET /sessions and related endpoint payloads.
export type Session = {
  sessionId: number
  startTime: string
  applyDeadline: string
  capacityPerGender: number
  maleRemaining: number
  femaleRemaining: number
  entryFeeGem: number
  completionRefundGem: number
  status: SessionStatus
}

export type SessionDetail = Session & {
  roundDurationSeconds: number
  votingDurationSeconds: number
  resultAndShareDurationSeconds: number
  myStatus: MyStatus | null
  myAlias: string | null
  liveStatus?: 'WAITING' | 'LOBBY' | 'IN_ROUND' | 'VOTING' | 'RESULT_AND_SHARE' | 'CLOSED'
  currentRoundNumber?: number
  phaseEndsAt?: string | null
}

export type MySession = {
  sessionId: number
  startTime: string
  sessionStatus: SessionStatus
  myStatus: MyStatus
  alias: string
  appliedAt: string
}

export type ParticipationResult = {
  sessionId: number
  alias: string
  chargedGem: number
  balanceAfter: number | null
}

export type CancellationResult = { sessionId: number; refundedGem: number; balanceAfter?: number | null }
