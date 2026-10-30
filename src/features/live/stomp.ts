import { getAccessToken } from '../auth/session'

export type LiveAssignment = {
  sessionId: number
  roundId: number
  roundNumber: number
  roomId: number
  tableNo: number
  memberId: number
  partnerMemberId: number
  /** 세션 안에서 보여줄 상대 별칭. 서버가 조회하지 못하면 null */
  partnerAlias: string | null
  partnerProfileCard: {
    memberId: number
    university: string | null
    nickname?: string | null
    idealType: string | null
    datingStyle: string | null
    contactStyle: string | null
    loveStyle: string | null
    interests: string[]
  }
  compatibility: { score: number; reason: string } | null
}

export type LiveMessage =
  | { kind: 'joined'; sessionId: number; memberId: number; status: 'JOINED' | 'ASSIGNED' | 'IDLE'; roundId: number | null; roundNumber: number | null; roomId: number | null; tableNo: number | null; partnerMemberId: number | null; partnerAlias: string | null; partnerProfileCard: LiveAssignment['partnerProfileCard'] | null }
  | { kind: 'assigned'; assignment: LiveAssignment }
  | { kind: 'idle'; roundNumber: number; breakSeconds: number }
  | { kind: 'signal'; roomId: number; fromMemberId: number; type: 'OFFER' | 'ANSWER' | 'ICE_CANDIDATE'; payload: string }
  | { kind: 'voting-started'; votingEndsAt: string }
  | { kind: 'hearts-started'; heartsEndsAt: string }
  | { kind: 'results-ready'; sessionId: number; coupleCount: number }
  // 로비 마감(시작 시각)에 출석 인원이 모자라 세션이 취소됨. 로비에 있던 사람(=출석자)은 참가비를 돌려받는다
  | { kind: 'cancelled'; sessionId: number; reason: 'INSUFFICIENT_ATTENDANCE' }
  // 로비 마감 후 진행 확정. firstRoundAt(UTC)에 1라운드가 시작된다
  | { kind: 'starting-soon'; sessionId: number; firstRoundAt: string }
  | { kind: 'heart-received'; sessionId: number; senderId: number; senderAlias: string; receivedCount: number }
  | { kind: 'contact-requested'; id: number; sessionId: number; requesterId: number; targetId: number; contactType: 'PHONE' | 'INSTAGRAM'; status: 'PENDING' | 'ACCEPTED' | 'REJECTED'; chargedGem: number; createdAt: string; respondedAt: string | null }
  | { kind: 'contact-request-answered'; id: number; sessionId: number; requesterId: number; targetId: number; contactType: 'PHONE' | 'INSTAGRAM'; status: 'PENDING' | 'ACCEPTED' | 'REJECTED'; chargedGem: number; createdAt: string; respondedAt: string | null }
  | { kind: 'contact-received'; sessionId: number; shareId: number }

export type LiveConnection = {
  disconnect: () => void
  sendSignal: (input: { sessionId: number; roomId: number; toMemberId: number; type: 'OFFER' | 'ANSWER' | 'ICE_CANDIDATE'; payload: string }) => void
}

export function connectLiveSession(
  sessionId: number,
  onMessage: (message: LiveMessage) => void,
  onStatus: (status: 'CONNECTING' | 'CONNECTED' | 'CLOSED') => void,
  onError: (message: string) => void,
  options: { joinSession?: boolean } = {},
): LiveConnection | null {
  const joinSession = options.joinSession ?? true
  const token = getAccessToken()
  if (!token) {
    onError('로그인 후 세션에 입장할 수 있어요.')
    return null
  }

  const defaultSocketUrl = import.meta.env.DEV
    ? 'ws://localhost:8080/ws'
    : 'wss://kiwiapi.duckdns.org/ws'
  const socketUrl = import.meta.env.VITE_WS_URL?.trim() || defaultSocketUrl
  const socket = new WebSocket(socketUrl)
  let connected = false
  let sequence = 0
  let buffer = ''
  onStatus('CONNECTING')

  const sendFrame = (command: string, headers: Record<string, string> = {}, body = '') => {
    const headerLines = Object.entries(headers).map(([name, value]) => `${name}:${value}`).join('\n')
    socket.send(`${command}\n${headerLines}\n\n${body}\0`)
  }
  const subscribe = (destination: string) => sendFrame('SUBSCRIBE', { id: `live-sub-${++sequence}`, destination, ack: 'auto' })

  socket.addEventListener('open', () => {
    sendFrame('CONNECT', {
      'accept-version': '1.2',
      host: new URL(socketUrl).host,
      Authorization: `Bearer ${token}`,
      // The shared STOMP contract does not define heartbeat negotiation.
      // Do not advertise a heartbeat interval that this client does not send.
      'heart-beat': '0,0',
    })
  })

  socket.addEventListener('message', event => {
    if (typeof event.data !== 'string') return
    buffer += event.data
    const frames = buffer.split('\0')
    buffer = frames.pop() ?? ''
    for (const raw of frames) {
      const frame = raw.replace(/^\n+/, '')
      const separator = frame.indexOf('\n\n')
      if (separator < 0) continue
      const [command, ...headerLines] = frame.slice(0, separator).split('\n')
      const headers = Object.fromEntries(headerLines.map(line => {
        const divider = line.indexOf(':')
        return divider < 0 ? [line, ''] : [line.slice(0, divider), line.slice(divider + 1)]
      }))
      const body = frame.slice(separator + 2)

      if (command === 'CONNECTED' && !connected) {
        connected = true
        onStatus('CONNECTED')
        if (joinSession) {
          subscribe('/user/queue/live/joined')
          subscribe('/user/queue/live/round-assigned')
          subscribe('/user/queue/live/round-idle')
          subscribe('/user/queue/live/signal')
          subscribe('/user/queue/live/voting-started')
          subscribe('/user/queue/live/hearts-started')
          subscribe('/user/queue/live/results-ready')
          subscribe('/user/queue/live/cancelled')
          subscribe('/user/queue/live/starting-soon')
        }
        subscribe('/user/queue/live/heart-received')
        subscribe('/user/queue/live/contact-requested')
        subscribe('/user/queue/live/contact-request-answered')
        subscribe('/user/queue/live/contact-received')
        if (joinSession) {
          sendFrame('SEND', { destination: '/app/live/join', 'content-type': 'application/json' }, JSON.stringify({ sessionId }))
        }
      } else if (command === 'MESSAGE') {
        try {
          const payload = JSON.parse(body)
          const destination = headers.destination
          if (destination?.endsWith('/joined')) onMessage({ kind: 'joined', ...payload })
          else if (destination?.endsWith('/round-assigned')) onMessage({ kind: 'assigned', assignment: payload })
          else if (destination?.endsWith('/round-idle')) onMessage({ kind: 'idle', ...payload })
          else if (destination?.endsWith('/signal')) onMessage({ kind: 'signal', ...payload })
          else if (destination?.endsWith('/voting-started')) onMessage({ kind: 'voting-started', ...payload })
          else if (destination?.endsWith('/hearts-started')) onMessage({ kind: 'hearts-started', ...payload })
          else if (destination?.endsWith('/results-ready')) onMessage({ kind: 'results-ready', ...payload })
          else if (destination?.endsWith('/cancelled')) onMessage({ kind: 'cancelled', ...payload })
          else if (destination?.endsWith('/starting-soon')) onMessage({ kind: 'starting-soon', ...payload })
          else if (destination?.endsWith('/heart-received')) onMessage({ kind: 'heart-received', ...payload })
          else if (destination?.endsWith('/contact-requested')) onMessage({ kind: 'contact-requested', ...payload })
          else if (destination?.endsWith('/contact-request-answered')) onMessage({ kind: 'contact-request-answered', ...payload })
          else if (destination?.endsWith('/contact-received')) onMessage({ kind: 'contact-received', ...payload })
        } catch {
          onError('실시간 메시지를 읽지 못했어요. 연결을 다시 시도해주세요.')
        }
      } else if (command === 'ERROR') {
        onError(body.trim() || '실시간 연결에 문제가 생겼어요. 다시 시도해주세요.')
      }
    }
  })

  socket.addEventListener('error', () => onError('실시간 서버에 연결하지 못했어요.'))
  socket.addEventListener('close', () => onStatus('CLOSED'))

  return {
    disconnect() {
      if (socket.readyState === WebSocket.OPEN) sendFrame('DISCONNECT')
      socket.close()
    },
    sendSignal(input) {
      if (!connected || socket.readyState !== WebSocket.OPEN) return
      sendFrame('SEND', { destination: '/app/live/signal', 'content-type': 'application/json' }, JSON.stringify(input))
    },
  }
}
