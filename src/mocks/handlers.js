import { http, HttpResponse, ws } from 'msw'

const ok = (data = null) => HttpResponse.json({ success: true, data, error: null })
const fail = (status, code, message) => HttpResponse.json({ success: false, data: null, error: { code, message } }, { status })
const koreaToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = name => Number(parts.find(item => item.type === name)?.value)
  return { year: part('year'), month: part('month'), day: part('day') }
}

// Store mock timestamps in Korea time regardless of the tester's device timezone.
const isoAt = (dayOffset, hour) => {
  const { year, month, day } = koreaToday()
  return new Date(Date.UTC(year, month - 1, day + dayOffset, hour - 9)).toISOString()
}

const sessions = Array.from({ length: 24 }, (_, index) => {
  const dayOffset = index + Math.floor(index / 5)
  const capacityPerGender = index % 4 === 0 ? 3 : 4
  return {
    sessionId: 101 + index,
    startTime: isoAt(dayOffset, [18, 19, 20, 21][index % 4]),
    applyDeadline: isoAt(dayOffset, [17, 18, 19, 20][index % 4]),
    capacityPerGender,
    maleRemaining: index % 7 === 0 ? 1 : Math.max(0, capacityPerGender - (index % 3 + 1)),
    femaleRemaining: index % 6 === 0 ? 1 : Math.max(0, capacityPerGender - ((index + 1) % 3 + 1)),
    entryFeeGem: 10,
    completionRefundGem: 5,
    status: index % 9 === 8 ? 'READY' : 'RECRUITING',
  }
})
const oneToOneTestSessionId = 125
sessions.push({
  sessionId: oneToOneTestSessionId,
  startTime: new Date(Date.now() - 30_000).toISOString(),
  applyDeadline: new Date(Date.now() - 5 * 60_000).toISOString(),
  capacityPerGender: 1,
  maleRemaining: 0,
  femaleRemaining: 0,
  entryFeeGem: 0,
  completionRefundGem: 0,
  status: 'READY',
})
const applications = new Map()
const emailCodes = new Map()
const signupTokens = new Map()
const sessionTestEmail = 'session.test@kiiwee.app'
const sessionTestPassword = 'kiiwee1234'
const sessionTestToken = 'mock-token-session-test-account'
const sessionTestId = 101
const users = new Map([
  ['test@kiiwee.app', { password: 'kiiwee1234', gender: 'FEMALE', birthDate: '2002-01-01', phoneNumber: '01012345678', instagramId: null }],
  ['test@sogang.ac.kr', { password: '00000000', gender: 'FEMALE', birthDate: '2002-01-01', phoneNumber: '01012345678', instagramId: null }],
  [sessionTestEmail, { password: sessionTestPassword, gender: 'FEMALE', birthDate: '2002-01-01', phoneNumber: '01012345678', instagramId: null }],
])
let activeToken = ''
let activeEmail = ''
let sequence = 200
let gemBalance = 90
const walletHistory = []
const sessionNicknames = ['구름산책', '느린토끼', '초록새벽', '말랑복숭아', '고요한파도', '달빛수집가', '잠꾸러기곰', '햇살한스푼', '바닐라라떼', '웃음많은사람', '작은행성', '포근한오후', '반짝이는별', '산책하는고양이', '기분좋은바람']
const createSessionNickname = () => sessionNicknames[Math.floor(Math.random() * sessionNicknames.length)]
const liveSocket = ws.link('ws://localhost:8080/ws')

export function initializeSessionTestAccount() {
  activeToken = sessionTestToken
  activeEmail = sessionTestEmail
  if (!applications.has(sessionTestId)) {
    const testSession = sessions.find(item => item.sessionId === sessionTestId)
    if (testSession) testSession.femaleRemaining = Math.max(0, testSession.femaleRemaining - 1)
    applications.set(sessionTestId, { status: 'APPLIED', alias: '세션 테스트', appliedAt: new Date().toISOString(), gender: 'FEMALE' })
  }
  if (!applications.has(oneToOneTestSessionId)) {
    applications.set(oneToOneTestSessionId, {
      status: 'APPLIED',
      alias: '1:1 테스트',
      appliedAt: new Date().toISOString(),
      gender: 'FEMALE',
    })
  }
  return sessionTestToken
}

const sessionTestStartTime = () => new Date(Date.now() + 60_000).toISOString()

liveSocket.addEventListener('connection', ({ client }) => {
  const subscriptions = new Map()
  let sessionId = null
  const sendTo = (destination, data) => {
    const subscriptionId = subscriptions.get(destination)
    if (!subscriptionId) return
    client.send(`MESSAGE\nsubscription:${subscriptionId}\nmessage-id:${crypto.randomUUID()}\ndestination:${destination}\ncontent-type:application/json\n\n${JSON.stringify(data)}\0`)
  }

  client.addEventListener('message', ({ data }) => {
    if (typeof data !== 'string') return
    const divider = data.indexOf('\n\n')
    if (divider < 0) return
    const [command, ...headerLines] = data.slice(0, divider).replace(/\0$/, '').split('\n')
    const headers = Object.fromEntries(headerLines.map(line => {
      const split = line.indexOf(':')
      return split < 0 ? [line, ''] : [line.slice(0, split), line.slice(split + 1)]
    }))
    const body = data.slice(divider + 2).replace(/\0$/, '')

    if (command === 'CONNECT') {
      const token = headers.Authorization?.replace(/^Bearer\s+/, '')
      if (!token || token !== activeToken) {
        client.send('ERROR\nmessage:Unauthorized\n\n로그인이 필요해요.\0')
        client.close()
        return
      }
      client.send('CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0')
    } else if (command === 'SUBSCRIBE') {
      subscriptions.set(headers.destination, headers.id)
    } else if (command === 'SEND' && headers.destination === '/app/live/join') {
      sessionId = JSON.parse(body).sessionId
      const application = applications.get(sessionId)
      if (application?.status !== 'APPLIED') {
        client.send('ERROR\nmessage:Not a participant\n\n세션 신청 내역을 찾을 수 없어요.\0')
        return
      }
      sendTo('/user/queue/live/joined', { sessionId, memberId: 1, status: 'JOINED', roundId: null, roundNumber: null, roomId: null, tableNo: null, partnerMemberId: null })
      setTimeout(() => {
        if (client.readyState !== 1) return
        sendTo('/user/queue/live/round-assigned', {
          sessionId, roundId: sessionId * 10, roundNumber: 1, roomId: sessionId * 100,
          tableNo: 1, memberId: 1, partnerMemberId: 2,
          partnerProfileCard: { memberId: 2, university: '연세대학교', nickname: createSessionNickname(), idealType: '대화가 잘 통하는 사람', datingStyle: '전시회나 맛집 탐방', contactStyle: '하루에 몇 번 연락하는 편', loveStyle: '천천히 알아가는 편', interests: ['전시', '러닝', '보드게임'] },
          compatibility: { score: 82, reason: '관심사가 비슷해요.' },
        })
      }, 1200)
    }
  })
})

function authorized(request) {
  return request.headers.get('Authorization') === `Bearer ${activeToken}` && Boolean(activeToken)
}

export const handlers = [
  http.post('*/api/auth/email/code', async ({ request }) => {
    const { email } = await request.json()
    if (!email || !email.includes('@')) return fail(400, 'INVALID_EMAIL', '올바른 이메일 주소를 입력해주세요.')
    emailCodes.set(email.toLowerCase(), '123456')
    return ok(null)
  }),
  http.post('*/api/auth/email/verify', async ({ request }) => {
    const { email, code } = await request.json()
    if (emailCodes.get(email?.toLowerCase()) !== code) return fail(400, 'INVALID_CODE', '인증번호를 확인해주세요.')
    const signupToken = `mock-signup-${crypto.randomUUID()}`
    signupTokens.set(signupToken, email.toLowerCase())
    return ok({ signupToken })
  }),
  http.post('*/api/auth/signup', async ({ request }) => {
    const body = await request.json()
    const email = signupTokens.get(body.signupToken)
    if (!email) return fail(400, 'INVALID_SIGNUP_TOKEN', '이메일 인증을 다시 진행해주세요.')
    if (users.has(email)) return fail(409, 'EMAIL_DUPLICATED', '이미 가입한 이메일이에요.')
    users.set(email, { password: body.password, gender: body.gender, birthDate: body.birthDate, phoneNumber: body.phoneNumber ?? null, instagramId: body.instagramId ?? null })
    signupTokens.delete(body.signupToken)
    activeToken = `mock-token-${crypto.randomUUID()}`
    activeEmail = email
    return ok({ accessToken: activeToken, tokenType: 'Bearer' })
  }),
  http.post('*/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json()
    const user = users.get(email?.toLowerCase())
    if (!user || user.password !== password) return fail(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호를 확인해주세요.')
    activeToken = `mock-token-${crypto.randomUUID()}`
    activeEmail = email.toLowerCase()
    return ok({ accessToken: activeToken, tokenType: 'Bearer' })
  }),
  http.get('*/api/members/my', ({ request }) => {
    if (!authorized(request)) return fail(401, 'UNAUTHORIZED', '로그인이 필요해요.')
    const user = users.get(activeEmail)
    return ok({ publicId: 'mock-user-1', email: activeEmail, university: '키위대학교', gender: user.gender, birthDate: user.birthDate, phoneNumber: user.phoneNumber, instagramId: user.instagramId })
  }),
  http.get('*/api/wallet/my', ({ request }) => {
    if (!authorized(request)) return fail(401, 'UNAUTHORIZED', '로그인이 필요해요.')
    return ok({ gemBalance })
  }),
  http.get('*/api/wallet/my/history', ({ request }) => {
    if (!authorized(request)) return fail(401, 'UNAUTHORIZED', '로그인이 필요해요.')
    const url = new URL(request.url)
    const size = Math.min(50, Math.max(1, Number(url.searchParams.get('size') || 20)))
    return ok(walletHistory.slice(0, size))
  }),
  http.get('*/api/sessions', ({ request }) => {
    if (!authorized(request)) return fail(401, 'UNAUTHORIZED', '로그인이 필요해요.')
    return ok(sessions.map(session => session.sessionId === sessionTestId && activeEmail === sessionTestEmail ? { ...session, startTime: sessionTestStartTime() } : session))
  }),
  http.get('*/api/sessions/my', ({ request }) => {
    if (!authorized(request)) return fail(401, 'UNAUTHORIZED', '로그인이 필요해요.')
    return ok([...applications.entries()].map(([sessionId, item]) => {
      const session = sessions.find(candidate => candidate.sessionId === sessionId)
      return { sessionId, startTime: sessionId === sessionTestId && activeEmail === sessionTestEmail ? sessionTestStartTime() : session?.startTime, sessionStatus: session?.status, myStatus: item.status, alias: item.alias, appliedAt: item.appliedAt }
    }))
  }),
  http.get('*/api/sessions/:id', ({ request, params }) => {
    if (!authorized(request)) return fail(401, 'UNAUTHORIZED', '로그인이 필요해요.')
    const sessionId = Number(params.id)
    const session = sessions.find(item => item.sessionId === sessionId)
    if (!session) return fail(404, 'NOT_FOUND', '세션을 찾을 수 없어요.')
    const application = applications.get(sessionId)
    return ok({ ...session, ...(sessionId === sessionTestId && activeEmail === sessionTestEmail ? { startTime: sessionTestStartTime() } : {}), roundDurationSeconds: 180, votingDurationSeconds: 180, resultAndShareDurationSeconds: 300, myStatus: application?.status === 'APPLIED' ? 'APPLIED' : application?.status === 'CANCELLED' ? 'CANCELLED' : null, myAlias: application?.status === 'APPLIED' ? application.alias : null })
  }),
  http.post('*/api/sessions/:id/participation', ({ request, params }) => {
    if (!authorized(request)) return fail(401, 'UNAUTHORIZED', '로그인이 필요해요.')
    const sessionId = Number(params.id)
    const session = sessions.find(item => item.sessionId === sessionId)
    if (!session || session.status !== 'RECRUITING') return fail(409, 'SESSION_CLOSED', '모집 중인 세션이 아니에요.')
    if (applications.get(sessionId)?.status === 'APPLIED') return fail(409, 'ALREADY_APPLIED', '이미 신청한 세션이에요.')
    const gender = users.get(activeEmail)?.gender
    const remaining = gender === 'MALE' ? session.maleRemaining : session.femaleRemaining
    if (remaining < 1) return fail(409, 'SESSION_FULL', '내 성별 신청 자리가 마감됐어요.')
    if (gemBalance < session.entryFeeGem) return fail(409, 'INSUFFICIENT_GEM', `보석이 부족합니다. 보유 ${gemBalance}개, 필요 ${session.entryFeeGem}개`)
    const alias = `키위${++sequence}`
    applications.set(sessionId, { status: 'APPLIED', alias, appliedAt: new Date().toISOString(), gender })
    gemBalance -= session.entryFeeGem
    if (session.entryFeeGem > 0) walletHistory.unshift({ type: 'ENTRY_FEE', description: '세션 참가비', amount: -session.entryFeeGem, balanceAfter: gemBalance, sessionId, createdAt: new Date().toISOString() })
    if (gender === 'MALE') session.maleRemaining -= 1
    else session.femaleRemaining -= 1
    return ok({ sessionId, alias, chargedGem: session.entryFeeGem, balanceAfter: session.entryFeeGem > 0 ? gemBalance : null })
  }),
  http.delete('*/api/sessions/:id/participation', ({ request, params }) => {
    if (!authorized(request)) return fail(401, 'UNAUTHORIZED', '로그인이 필요해요.')
    const sessionId = Number(params.id)
    const session = sessions.find(item => item.sessionId === sessionId)
    const application = applications.get(sessionId)
    if (!session || application?.status !== 'APPLIED') return fail(404, 'APPLICATION_NOT_FOUND', '신청 내역을 찾지 못했어요.')
    application.status = 'CANCELLED'
    const hoursUntilStart = (new Date(session.startTime).getTime() - Date.now()) / 3_600_000
    const refundedGem = hoursUntilStart >= 24 ? session.entryFeeGem : hoursUntilStart >= 12 ? Math.ceil(session.entryFeeGem / 2) : 0
    gemBalance += refundedGem
    if (refundedGem > 0) walletHistory.unshift({ type: 'ENTRY_FEE_REFUND', description: '세션 참가비 환불', amount: refundedGem, balanceAfter: gemBalance, sessionId, createdAt: new Date().toISOString() })
    if (application.gender === 'MALE') session.maleRemaining += 1
    else session.femaleRemaining += 1
    return ok({ sessionId, refundedGem, balanceAfter: refundedGem > 0 ? gemBalance : null })
  }),
  liveSocket,
]
