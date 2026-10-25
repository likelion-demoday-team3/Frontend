import { useEffect, useState } from 'react'
import styled from 'styled-components'
import PageHeader from '../components/common/PageHeader'
import { getMyWallet } from '../features/wallet/api'
import { getContactShares, type ContactShare } from '../features/records/api'
import { getContactRequests, requestContact, respondToContactRequest, sendContact, type ContactRequest, type ContactType } from '../features/sessions/interactionApi'

type Partner = { memberId: number; nickname: string; roundNumber: number }

export default function Contact() {
  const params = new URLSearchParams(window.location.search)
  const sessionId = Number(params.get('sessionId'))
  const [gems, setGems] = useState(0)
  const [partners, setPartners] = useState<Partner[]>([])
  const [shares, setShares] = useState<ContactShare[]>([])
  const [requests, setRequests] = useState<ContactRequest[]>([])
  const [myMemberId, setMyMemberId] = useState<number | null>(null)
  const [contactType, setContactType] = useState<ContactType>('PHONE')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')

  async function refresh() {
    const [wallet, sent, received, requestHistory] = await Promise.all([
      getMyWallet(), getContactShares('SENT'), getContactShares('RECEIVED'), getContactRequests(),
    ])
    setGems(wallet.gemBalance)
    setShares([...sent.items, ...received.items])
    setRequests(requestHistory.items)
  }

  useEffect(() => {
    const stored = sessionId ? sessionStorage.getItem(`kiiwee.session-context:${sessionId}`) : null
    if (stored) {
      try {
        const context = JSON.parse(stored) as { partners?: Partner[]; myMemberId?: number }
        setPartners(context.partners ?? [])
        setMyMemberId(context.myMemberId ?? null)
      } catch { /* 잘못된 임시 화면 상태는 무시하고 안내를 표시 */ }
    }
    let active = true
    refresh().catch(cause => { if (active) setError(cause instanceof Error ? cause.message : '연락처 정보를 불러오지 못했어요.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [sessionId])

  async function runAction(memberId: number, action: 'send' | 'request') {
    setBusyId(memberId); setError('')
    try {
      if (action === 'send') await sendContact(sessionId, memberId, contactType)
      else await requestContact(sessionId, memberId, contactType)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '연락처 교환을 처리하지 못했어요.')
    } finally { setBusyId(null) }
  }

  async function answerRequest(requestId: number, accept: boolean) {
    setBusyId(requestId); setError('')
    try { await respondToContactRequest(sessionId, requestId, accept); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : '요청에 응답하지 못했어요.') }
    finally { setBusyId(null) }
  }

  return <ContactPage>
    <PageHeader title="마지막 단계" gems={gems} onGemsChange={setGems} />

    <main>
      <section className="intro">
        <h2>연락처 주고받기</h2>
        <p>마음이 통했다면 연락처를 교환해보세요.</p>
        {sessionId > 0 && <button type="button" className="refresh" onClick={() => { setLoading(true); refresh().catch(cause => setError(cause instanceof Error ? cause.message : '연락처 정보를 불러오지 못했어요.')).finally(() => setLoading(false)) }}>요청 새로고침</button>}
      </section>

      {!sessionId ? <section className="pending-card" role="status"><h2>세션 정보가 없어요</h2><p>스터디 결과 화면에서 연락처 교환을 열어주세요.</p></section> : loading ? <section className="pending-card" role="status"><p>연락처 정보를 불러오는 중이에요…</p></section> : <>
      <section className="contact-type" aria-label="공유할 연락처 종류">
        <span>연락처 종류</span>
        <button type="button" aria-pressed={contactType === 'PHONE'} className={contactType === 'PHONE' ? 'selected' : ''} onClick={() => setContactType('PHONE')}>전화번호</button>
        <button type="button" aria-pressed={contactType === 'INSTAGRAM'} className={contactType === 'INSTAGRAM' ? 'selected' : ''} onClick={() => setContactType('INSTAGRAM')}>인스타그램</button>
      </section>
      {error && <p className="error" role="alert">{error}</p>}
      {!partners.length && <section className="pending-card" role="status"><h2>대화 상대 정보가 없어요</h2><p>세션 화면에서 대화 상대 정보가 전달되지 않았습니다. 세션을 다시 열고 결과 화면으로 이동해주세요.</p></section>}
      <section className="partner-list" aria-label="대화 상대 목록">
        {partners.map((partner, index) => {
          const sent = shares.some(item => item.sessionId === sessionId && item.senderId === myMemberId && item.receiverId === partner.memberId)
          const received = shares.some(item => item.sessionId === sessionId && item.receiverId === myMemberId && item.senderId === partner.memberId)
          const outgoingRequest = requests.some(item => item.sessionId === sessionId && item.requesterId === myMemberId && item.targetId === partner.memberId && item.status === 'PENDING')
          return <article className="partner-card" key={partner.memberId}>
          <div className={`avatar tone-${index % 2}`} aria-label={`${partner.nickname} 프로필 사진`}>
            <span>{Array.from(partner.nickname)[0]}</span>
          </div>
          <div className="partner-info">
            <span className="round">{partner.roundNumber}번째 대화</span>
            <h2>{partner.nickname}</h2>
            {sent && <small>내 연락처를 보냈어요</small>}
            {received && shares.filter(item => item.sessionId === sessionId && item.receiverId === myMemberId && item.senderId === partner.memberId).map(item => <small key={item.id}>받은 연락처 · {item.contactValue ?? '삭제된 연락처'}</small>)}
            {outgoingRequest && <p>연락처 공개 요청에 응답을 기다리고 있어요.</p>}
          </div>
          <div className="actions">
            <button type="button" disabled={!myMemberId || sent || busyId === partner.memberId || gems < 1} onClick={() => void runAction(partner.memberId, 'send')}>
              {sent ? '보냄' : '내 연락처 보내기'}{!sent && <small>◆ 1</small>}
            </button>
            <button type="button" className="receive" disabled={!myMemberId || received || outgoingRequest || busyId === partner.memberId} onClick={() => void runAction(partner.memberId, 'request')}>
              {received ? '받음' : outgoingRequest ? '요청 중' : '연락처 요청'}
            </button>
          </div>
        </article>})}
      </section>
      {requests.filter(request => request.sessionId === sessionId && request.targetId === myMemberId && request.status === 'PENDING').map(request => <article className="request-card" key={request.id}>
        <p>상대방이 {request.contactType === 'PHONE' ? '전화번호' : '인스타그램'} 연락처를 요청했어요.</p>
        <div className="actions"><button type="button" disabled={busyId === request.id} onClick={() => void answerRequest(request.id, true)}>수락</button><button type="button" className="receive" disabled={busyId === request.id} onClick={() => void answerRequest(request.id, false)}>거절</button></div>
      </article>)}
      </>}

      <section className="guide" aria-label="연락처 교환 안내">
        <p>내 연락처 보내기는 보석 1개를 사용합니다. 연락처 요청은 상대가 수락하면 요청자에게 보석 1개가 차감됩니다. 매칭된 상대의 연락처는 무료로 공유될 수 있습니다.</p>
        <p>주고받은 연락처는 마이페이지에서 확인할 수 있습니다. 세션이 종료되면 세션 정보는 삭제되지만 연락처 기록은 남습니다.</p>
        <span>연락처 주고받기에는 보석이 사용됩니다.</span>
      </section>
    </main>

    <a className="finish-button" href="/home">종료하기</a>
  </ContactPage>
}

const ContactPage = styled.div`
  width: 100%;
  max-width: 43rem;
  min-height: 100dvh;
  margin: 0 auto;
  padding: calc(1.2rem + env(safe-area-inset-top)) 2.4rem calc(2.4rem + env(safe-area-inset-bottom));
  background: var(--background);
  color: var(--ink);
  box-shadow: 0 0 6rem #26372508;

  .intro { padding: 2.8rem 0 1.8rem; text-align: center; }
  .intro h2 { font: 400 2.3rem/1.3 var(--display-font); }
  .intro p { margin-top: 0.7rem; color: #899188; font-size: 1.2rem; }
  .refresh { margin-top:.8rem; padding:.6rem 1rem; border:1px solid #e2e8dc; border-radius:99px; background:#fff; color:#536057; font-size:1rem; }
  .pending-card { display: grid; min-height: 28rem; align-content: center; justify-items: center; gap: 1rem; padding: 2rem; border: 1px solid #e4e9df; border-radius: 1.8rem; background: white; text-align: center; }
  .contact-type { display:flex; align-items:center; gap:.6rem; margin-bottom:1rem; color:#536057; font-size:1.1rem; }
  .contact-type button { min-height:3.5rem; padding:0 1rem; border:1px solid #e2e8dc; border-radius:99px; background:#fff; color:#536057; }
  .contact-type button.selected { border-color:var(--green); background:var(--green); color:#273219; font-weight:700; }
  .error { margin-bottom:1rem; color:#c7554a; font-size:1.1rem; }
  .request-card { display:grid; gap:1rem; margin:1rem 0; padding:1.3rem; border:1px solid #e4e9df; border-radius:1.2rem; background:#fff; }
  .pending-card h2 { font: 400 1.9rem/1.4 var(--display-font); }
  .pending-card p { max-width: 28rem; color: #818a7f; font-size: 1.25rem; line-height: 1.7; }
  .partner-list { display: grid; gap: 1rem; }
  .partner-card { display: grid; grid-template-columns: 5.4rem minmax(0, 1fr); align-items: center; gap: 1.2rem; padding: 1.4rem; border: 1px solid #e4e9df; border-radius: 1.8rem; background: #fff; box-shadow: 0 0.5rem 1.8rem #26372508; }
  .avatar { display: grid; width: 5.4rem; height: 5.4rem; place-items: center; border: 0.25rem solid #e2edc9; border-radius: 50%; background: #f0f7e2; color: #607d2f; }
  .avatar span { font: 400 2rem var(--display-font); }
  .avatar.tone-1 { border-color: #f0dfc9; background: #fff6e9; color: #8b6d51; }
  .partner-info { min-width: 0; }
  .round { color: #9ba494; font-size: 1rem; }
  .partner-info h2 { margin-top: 0.2rem; font: 400 1.6rem/1.3 var(--display-font); }
  .partner-info p { margin-top: 0.35rem; color: #8b938d; font-size: 1.05rem; }
  .partner-info p.accepted { color: #72932f; }
  .partner-info small { display: block; margin-top: 0.45rem; color: #72932f; font-size: 0.95rem; line-height: 1.4; }
  .actions { display: grid; grid-column: 1 / -1; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
  .actions button { display: flex; min-height: 4.2rem; align-items: center; justify-content: center; gap: 0.6rem; border: 0; border-radius: 1rem; background: var(--green); color: var(--ink); font-size: 1.25rem; font-weight: 700; }
  .actions button.receive { border: 1px solid #e2e8dc; background: white; }
  .actions button:disabled { border-color: #e5e8e2; background: #f0f2ed; color: #a1a89c; }
  .actions button small { color: #31aee0; font-size: 1rem; }
  .guide { display: grid; gap: 1rem; margin-top: 1.4rem; padding: 1.5rem; border-radius: 1.4rem; background: #f5f8ef; color: #707a6e; font-size: 1.1rem; line-height: 1.7; }
  .guide span { color: #8a9b67; font-size: 1rem; }
  .finish-button { display: flex; min-height: 5.2rem; align-items: center; justify-content: center; gap: 1rem; margin-top: 2rem; border-radius: 1.4rem; background: #011020; color: white; font-weight: 700; text-decoration: none; }
  @media (max-width: 37.4rem) { padding-right: 2.4rem; padding-left: 2.4rem; }
`
