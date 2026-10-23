import { useState } from 'react'
import styled from 'styled-components'
import PageHeader from '../components/common/PageHeader'

type ContactPartner = {
  id: number
  nickname: string
  initial: string
  accepted: boolean
  sent: boolean
  received: boolean
}

const initialPartners: ContactPartner[] = [
  { id: 1, nickname: '구름산책', initial: '구', accepted: true, sent: false, received: false },
  { id: 2, nickname: '달빛수집가', initial: '달', accepted: false, sent: false, received: false },
  { id: 3, nickname: '포근한오후', initial: '포', accepted: true, sent: false, received: false },
]

export default function Contact() {
  const mockMode = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API !== "false";
  const [gems, setGems] = useState(5)
  const [partners, setPartners] = useState(initialPartners)

  function spendGem(id: number, action: 'sent' | 'received') {
    const partner = partners.find(item => item.id === id)
    if (!partner || gems < 1 || partner[action] || (action === 'received' && !partner.accepted)) return
    setGems(value => value - 1)
    setPartners(items => items.map(item => item.id === id ? { ...item, [action]: true } : item))
  }

  return <ContactPage>
    <PageHeader title="마지막 단계" gems={gems} onGemsChange={setGems} />

    <main>
      <section className="intro">
        <h2>연락처 주고받기</h2>
        <p>{mockMode ? '화면 미리보기 · 샘플 데이터' : '마음이 통했다면 연락처를 교환해보세요.'}</p>
      </section>

      {!mockMode ? <section className="pending-card" role="status"><h2>연락처 교환 API 명세 대기 중</h2><p>연락처 교환 의사, 보석 차감, 공개할 연락처와 내역 조회 계약이 없어 실제 교환 기능을 사용할 수 없어요.</p></section> : <>
      <section className="partner-list" aria-label="대화 상대 목록">
        {partners.map((partner, index) => <article className="partner-card" key={partner.id}>
          <div className={`avatar tone-${index % 2}`} aria-label={`${partner.nickname} 프로필 사진`}>
            <span>{partner.initial}</span>
          </div>
          <div className="partner-info">
            <span className="round">{partner.id}번째 대화</span>
            <h2>{partner.nickname}</h2>
            {partner.accepted
              ? <p className="accepted">연락처 교환 수락</p>
              : <p>상대방 응답 대기 중</p>}
            {partner.sent && <small>내 연락처를 보냈어요</small>}
            {partner.received && <small>연락처를 받았어요 · 010-1234-5678</small>}
          </div>
          <div className="actions">
            <button type="button" disabled={partner.sent || gems < 1} onClick={() => spendGem(partner.id, 'sent')}>
              {partner.sent ? '보냄' : '보내기'}{!partner.sent && <small>◆ 1</small>}
            </button>
            <button type="button" className="receive" disabled={!partner.accepted || partner.received || gems < 1} onClick={() => spendGem(partner.id, 'received')}>
              {partner.received ? '받음' : '받기'}{!partner.received && <small>◆ 1</small>}
            </button>
          </div>
        </article>)}
      </section>
      </>}

      <section className="guide" aria-label="연락처 교환 안내">
        <p>보내기를 클릭하면 내 연락처가 상대에게 가고, 받기를 클릭하면 상대의 연락처를 받을 수 있습니다. 상대가 수락한 경우에만 연락처를 받을 수 있습니다.</p>
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
  .pending-card { display: grid; min-height: 28rem; align-content: center; justify-items: center; gap: 1rem; padding: 2rem; border: 1px solid #e4e9df; border-radius: 1.8rem; background: white; text-align: center; }
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
