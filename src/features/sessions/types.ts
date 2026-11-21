export type SessionStatus = 'SCHEDULED' | 'RECRUITING' | 'READY' | 'IN_PROGRESS' | 'CANCELLED' | 'COMPLETED'
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
  liveStatus?: 'WAITING' | 'LOBBY' | 'IN_ROUND' | 'HEART' | 'VOTING' | 'RESULT_AND_SHARE' | 'CLOSED'
  // 로비가 열리는 시각 (일반 세션은 시작 10분 전, 운영자 테스트 세션은 3분 전). 예전 서버면 없다
  lobbyOpenAt?: string | null
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
  // 로비가 열리는 시각 (일반 세션은 시작 10분 전, 운영자 테스트 세션은 3분 전). 예전 서버면 없다
  lobbyOpenAt?: string | null
}

export type ParticipationResult = {
  sessionId: number
  alias: string
  chargedGem: number
  balanceAfter: number | null
}

export type CancellationResult = { sessionId: number; refundedGem: number; balanceAfter?: number | null }
