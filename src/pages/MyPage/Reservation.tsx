import { useEffect, useState } from 'react'
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
      const session = sessions.find(value => value.sessionId === item.sessionId)
      const attendance = session
        ? `${session.capacityPerGender - session.maleRemaining}:${session.capacityPerGender - session.femaleRemaining}`
        : '인원 정보 없음'
      return <Panel key={item.sessionId}>
        <h2>스터디 예약</h2>
        <p className="hint">예약일자</p><strong>{dateLabel(item.appliedAt)}</strong>
        <p className="hint" style={{ marginTop: '1.5rem' }}>스터디 일자</p><strong>{dateLabel(item.startTime)}</strong>
        <p className="hint" style={{ marginTop: '1.5rem' }}>현재 인원 (남:여)</p><strong>{attendance}</strong>
        <div style={{ marginTop: '1.8rem' }}><Action type="button" disabled={busy === item.sessionId} onClick={() => void cancel(item)}>{busy === item.sessionId ? '취소 중…' : '예약취소'}</Action></div>
      </Panel>
    })}
    {message && <p className="success" role="status">{message}</p>}
  </MyPageFrame>
}
