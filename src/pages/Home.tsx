import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import Calender, { getToday } from '../components/Home/Calender'
import Countdown from '../components/Home/Countdown'
import Scadule from '../components/Home/Scadule'
import NavBar from '../components/common/NavBar'
import { getMyMember } from '../features/members/api'
import { getMySessions, getSessions } from '../features/sessions/api'
import type { MySession, Session } from '../features/sessions/types'
import { clearAccessToken, getAccessToken } from '../features/auth/session'
import { ApiError } from '../features/api/client'

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(getToday)
  const [loginPrompt, setLoginPrompt] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getAccessToken()))
  const [sessions, setSessions] = useState<Session[]>([])
  const [mySessions, setMySessions] = useState<MySession[]>([])
  const [myGender, setMyGender] = useState<'MALE' | 'FEMALE' | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const loginDialog = useRef<HTMLDialogElement>(null)
  const notificationsDialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    let active = true
    const token = getAccessToken()
    setLoading(true)
    setLoadError('')
    if (!token) {
      setSessions([])
      setMySessions([])
      setMyGender(null)
      setIsLoggedIn(false)
      setLoading(false)
      return () => { active = false }
    }
    Promise.all([getSessions(), getMySessions(), getMyMember()]).then(([items, mine, member]) => {
      if (!active) return
      setSessions(items)
      setMySessions(mine)
      setMyGender(member.gender)
      setIsLoggedIn(true)
    }).catch(cause => {
      if (!active) return
      if (cause instanceof ApiError && cause.status === 401) {
        clearAccessToken()
        setIsLoggedIn(false)
        setSessions([])
        setMySessions([])
        setMyGender(null)
        setLoadError('로그인이 만료됐어요. 다시 로그인해주세요.')
      } else {
        setLoadError(cause instanceof Error ? cause.message : '세션 정보를 불러오지 못했어요.')
      }
    }).finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [reload, isLoggedIn])

  useEffect(() => {
    if (!loginPrompt) return
    const element = loginDialog.current
    element?.showModal()
    return () => element?.close()
  }, [loginPrompt])

  useEffect(() => {
    if (!notificationsOpen) return
    const element = notificationsDialog.current
    element?.showModal()
    return () => element?.close()
  }, [notificationsOpen])

  function logout() {
    clearAccessToken()
    setIsLoggedIn(false)
    setMySessions([])
    setMyGender(null)
    setNotificationsOpen(false)
  }

  return (
    <HomeShell>
      <header className="home-header">
        <img src="/logo.svg" width="90" height="40" alt="Kiiwee" />
        <button className="notification-button" type="button" aria-label="알림 열기" onClick={() => setNotificationsOpen(true)}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        </button>
      </header>

      <Countdown sessions={sessions} mySessions={mySessions} />

      <main className="home-content">
        <Calender selectedDate={selectedDate} onSelectDate={setSelectedDate} sessions={sessions} />
        <Scadule
          selectedDate={selectedDate}
          isLoggedIn={isLoggedIn}
          onLoginRequired={() => setLoginPrompt(true)}
          sessions={sessions}
          mySessions={mySessions}
          myGender={myGender}
          loading={loading}
          loadError={loadError}
          onRetry={() => setReload(value => value + 1)}
          onDataChanged={(items, mine) => { setSessions(items); setMySessions(mine) }}
        />
      </main>

      <NavBar isLoggedIn={isLoggedIn} onLoginRequired={() => setLoginPrompt(true)} />

      <dialog ref={loginDialog} className="booking-dialog auth-prompt" aria-labelledby="login-prompt-title" onCancel={() => setLoginPrompt(false)} onClick={event => { if (event.target === event.currentTarget) setLoginPrompt(false) }}>
        <div className="dialog-body">
          <h2 id="login-prompt-title">로그인이 필요한 서비스예요</h2>
          <p className="dialog-description">로그인하거나 회원가입하고 소개팅을 신청해보세요.</p>
          <div className="dialog-actions"><a className="cancel-button auth-link" href="/signup" onClick={() => setLoginPrompt(false)}>회원가입</a><a className="confirm-button auth-link" href="/login" onClick={() => setLoginPrompt(false)}>로그인</a></div>
        </div>
      </dialog>

      <dialog ref={notificationsDialog} className="notification-dialog" aria-labelledby="notification-title" onCancel={() => setNotificationsOpen(false)} onClick={event => { if (event.target === event.currentTarget) setNotificationsOpen(false) }}>
        <div className="notification-dialog-body">
          <h2 id="notification-title">알림</h2>
          <p>{!isLoggedIn ? '로그인하면 소개팅 관련 알림을 확인할 수 있어요.' : import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API !== 'false' ? '새로운 알림이 없어요.' : '알림 API 명세가 없어 아직 알림을 불러올 수 없어요.'}</p>
          {isLoggedIn
            ? <button type="button" className="notification-action secondary" onClick={logout}>로그아웃</button>
            : <div className="notification-links"><a href="/signup" onClick={() => setNotificationsOpen(false)}>회원가입</a><a href="/login" onClick={() => setNotificationsOpen(false)}>로그인</a></div>}
        </div>
      </dialog>
    </HomeShell>
  )
}

const HomeShell = styled.div`
  max-width: 43rem;
  min-height: 100dvh;
  margin: 0 auto;
  background: var(--background);
  box-shadow: 0 0 6rem #26372508;

  .home-header { display: flex; align-items: center; justify-content: space-between; padding: calc(2.4rem + env(safe-area-inset-top)) 3rem 1.8rem; }
  .home-header img { display: block; width: 9rem; height: 4rem; object-fit: contain; }
  .home-content { padding: 0 3rem calc(11.2rem + env(safe-area-inset-bottom)); }
  .notification-button { display: grid; place-items: center; width: 4.4rem; height: 4.4rem; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--ink); }
  .notification-button:hover { background: #2b302c08; }
  .notification-button svg { width: 2.8rem; height: 2.8rem; }

  .booking-dialog { padding: 0; border: 0; border-radius: 2.9rem; width: min(34rem,calc(100vw - 4.8rem)); max-height: calc(100dvh - 4rem); background: var(--background); color: var(--ink); box-shadow: 0 1.6rem 7rem #1113; }
  .booking-dialog::backdrop { background: #222b2566; }
  .dialog-body { padding: 3rem 2rem 2rem; }
  .booking-dialog h2 { text-align: center; font-family: var(--font-body); font-size: 1.9rem; font-weight: 700; line-height: 1.5; letter-spacing: -0.06rem; }
  .dialog-description { text-align: center; font-size: 1.1rem; line-height: 1.8; color: #8b959b; margin: 1.6rem 0 2rem; }
  .dialog-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; }
  .dialog-actions > * { min-height: 3.9rem; border-radius: 1.3rem; font-size: 1.2rem; }
  .cancel-button { background: transparent; border: 0.1rem solid #e3e8df; color: #85908b; font-family: var(--font-body); font-weight: 500; }
  .confirm-button { background: var(--green); border: 0; font-family: var(--font-body); font-weight: 600; box-shadow: 0 0.4rem 0.9rem #bed47333; }
  .auth-link { display: grid; place-items: center; text-decoration: none; cursor: pointer; }
  .auth-prompt .dialog-actions { margin-top: 2rem; }

  .notification-dialog { position: fixed; top: 7.2rem; right: max(calc((100vw - 43rem) / 2 + 2.4rem), 1.6rem); left: auto; bottom: auto; margin: 0; width: min(34rem, calc(100vw - 3.2rem)); padding: 0; border: 0; border-radius: 2rem; background: var(--background); color: var(--ink); box-shadow: 0 1.6rem 7rem #1113; }
  .notification-dialog::backdrop { background: #222b2533; }
  .notification-dialog-body { padding: 2rem; }
  .notification-dialog h2 { font: 600 1.8rem/1.4 var(--font-body); }
  .notification-dialog p { margin-top: 1.2rem; color: var(--text-secondary); font-size: 1.4rem; line-height: 1.6; }
  .notification-links { display: flex; gap: 0.8rem; margin-top: 1.6rem; }
  .notification-links a, .notification-action { display: grid; flex: 1; min-height: 4.2rem; place-items: center; border: 0.1rem solid var(--ink); border-radius: 1rem; background: var(--green); color: var(--ink); font: 500 1.4rem var(--font-body); text-decoration: none; }
  .notification-action { width: 100%; margin-top: 1.6rem; background: var(--white); }

  @media (max-width: 37.4rem) {
    .home-header { padding-left: 3rem; padding-right: 3rem; }
    .home-content { padding-left: 3rem; padding-right: 3rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    &, & * { transition: none !important; scroll-behavior: auto !important; }
  }
`
