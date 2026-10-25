import { useEffect, useState } from 'react'
import styled from 'styled-components'
import MyPageFrame, { Action, Panel } from './MyPageFrame'
import { getAccessToken } from '../../features/auth/session'
import { cancelSession, getMySessions, getSessions } from '../../features/sessions/api'
import type { MySession, Session } from '../../features/sessions/types'

const demoReservation: MySession = { sessionId: 101, startTime: new Date(Date.now() + 86_400_000).toISOString(), sessionStatus: 'RECRUITING', myStatus: 'APPLIED', alias: '햇살', appliedAt: new Date().toISOString() }
const dateLabel = (value: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))

export default function Reservation({ demo = false }: { demo?: boolean }) {
  const [reservations, setReservations] = useState<MySession[]>(demo ? [demoReservation] : [])
  const [sessions, setSessions] = useState<Session[]>([])
  const [message, setMessage] = useState(demo ? '시연용 예약 내역이에요.' : '')
  const [busy, setBusy] = useState<number | null>(null)

  useEffect(() => {
    if (demo || !getAccessToken()) return
    let active = true
    Promise.all([getMySessions(), getSessions()]).then(([mine, all]) => {
      if (!active) return
      // 세션 자체가 취소돼도 내 신청 상태는 APPLIED로 남는다. 취소된 세션도 구분해서 보여준다
      setReservations(mine.filter(item => item.myStatus === 'APPLIED'))
      setSessions(all)
    }).catch(cause => { if (active) setMessage(cause instanceof Error ? cause.message : '예약 내역을 불러오지 못했어요.') })
    return () => { active = false }
  }, [demo])

  async function cancel(reservation: MySession) {
    if (demo) {
      setReservations(current => current.filter(item => item.sessionId !== reservation.sessionId))
      setMessage('시연 예약을 취소했어요.')
      return
    }
    setBusy(reservation.sessionId); setMessage('')
    try {
      await cancelSession(reservation.sessionId)
      setReservations(current => current.filter(item => item.sessionId !== reservation.sessionId))
      setMessage('예약을 취소했어요.')
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '예약 취소에 실패했어요.')
    } finally { setBusy(null) }
  }

  return <MyPageFrame title="스터디 예약 확인" demo={demo}>
    {reservations.length === 0 ? <Panel><h2>예약 내역</h2><p className="hint">진행 중인 스터디 예약이 없어요.</p></Panel> : reservations.map(item => {
      const cancelled = item.sessionStatus === 'CANCELLED'
      const session = sessions.find(value => value.sessionId === item.sessionId)
      const attendance = session
        ? `${session.capacityPerGender - session.maleRemaining}:${session.capacityPerGender - session.femaleRemaining}`
        : '인원 정보 없음'
      return <ReservationPanel key={item.sessionId} data-cancelled={cancelled || undefined} aria-disabled={cancelled || undefined}>
        <h2>스터디 예약{cancelled && <span className="badge">취소된 스터디</span>}{item.sessionStatus === 'READY' && <span className="badge ready">진행 확정</span>}</h2>
        <p className="hint">예약일자</p><strong>{dateLabel(item.appliedAt)}</strong>
        <p className="hint" style={{ marginTop: '1.5rem' }}>스터디 일자</p><strong>{dateLabel(item.startTime)}</strong>
        {cancelled
          ? <p className="hint" style={{ marginTop: '1.5rem' }}>인원 미달 또는 운영 사정으로 취소되어 참가비가 전액 환불됐어요.</p>
          : <>
            <p className="hint" style={{ marginTop: '1.5rem' }}>현재 인원 (남:여)</p><strong>{attendance}</strong>
            {item.sessionStatus === 'READY'
              // 진행 확정 뒤에는 서버도 본인 취소를 받지 않는다
              ? <p className="hint" style={{ marginTop: '1.8rem' }}>진행이 확정된 스터디라 예약을 취소할 수 없어요.</p>
              : <div style={{ marginTop: '1.8rem' }}><Action type="button" disabled={busy === item.sessionId} onClick={() => void cancel(item)}>{busy === item.sessionId ? '취소 중…' : '예약취소'}</Action></div>}
          </>}
      </ReservationPanel>
    })}
    {message && <p className="success" role="status">{message}</p>}
  </MyPageFrame>
}

const ReservationPanel = styled(Panel)`
  h2 { display: flex; align-items: center; gap: .8rem; }
  .badge { padding: .3rem .8rem; border-radius: 99rem; background: #eef1ec; color: #647065; font-size: 1.05rem; font-weight: 700; }
  .badge.ready { background: var(--green); color: #273219; }
  &[data-cancelled] { opacity: .55; pointer-events: none; user-select: none; }
`
