import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { getAccessToken } from '../../features/auth/session'
import { getContactShares, getMatchHistory, type ContactShare, type MatchHistoryItem } from '../../features/records/api'
import MyPageFrame, { Panel } from './MyPageFrame'

type Section = 'matches' | 'sent' | 'received'
type Range = '1' | '3' | '6' | '12' | 'custom'

const dateLabel = (value: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
const contactLabel = { PHONE: '전화번호', INSTAGRAM: '인스타그램' } as const

/** 소개팅 일시가 선택한 기간 안에 있는지. 기타는 시작일/종료일(포함)로, 비어 있으면 그쪽은 제한 없음 */
function inRange(value: string, range: Range, startDate: string, endDate: string) {
  const time = new Date(value).getTime()
  if (range === 'custom') {
    if (startDate && time < new Date(`${startDate}T00:00:00+09:00`).getTime()) return false
    if (endDate && time > new Date(`${endDate}T23:59:59.999+09:00`).getTime()) return false
    return true
  }
  const from = new Date()
  from.setMonth(from.getMonth() - Number(range))
  return time >= from.getTime()
}

const titles: Record<Section, string> = {
  matches: '최종 매칭 결과',
  sent: '연락처 전송 기록',
  received: '받은 연락처 목록',
}

const ranges: Array<{ value: Range; label: string }> = [
  { value: '1', label: '1개월' }, { value: '3', label: '3개월' },
  { value: '6', label: '6개월' }, { value: '12', label: '1년' },
  { value: 'custom', label: '기타' },
]

export default function RecordList({ section }: { section: Section }) {
  const [range, setRange] = useState<Range>('6')
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [matches, setMatches] = useState<MatchHistoryItem[]>([])
  const [shares, setShares] = useState<ContactShare[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false)
      setError('로그인 후 기록을 확인할 수 있어요.')
      return
    }
    let active = true
    setLoading(true)
    const request = section === 'matches'
      ? getMatchHistory().then(items => { if (active) setMatches(items) })
      : getContactShares(section === 'sent' ? 'SENT' : 'RECEIVED').then(history => { if (active) setShares(history.items) })
    request.then(() => { if (active) setError('') }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : '기록을 불러오지 못했어요.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [section, reload])

  const rangedMatches = matches.filter(item => inRange(item.sessionStartTime, range, startDate, endDate))
  const matchedCount = rangedMatches.filter(item => item.matched).length
  const visibleMatches = rangedMatches.filter(item => filter === 'all' || (filter === 'success') === item.matched)
  const visibleShares = shares.filter(item => inRange(item.sessionStartTime, range, startDate, endDate))
  const status = loading
    ? <Empty role="status">기록을 불러오는 중이에요…</Empty>
    : error ? <Empty role="alert">{error}<br /><button type="button" onClick={() => setReload(value => value + 1)}>다시 불러오기</button></Empty>
    : null

  return <MyPageFrame title={titles[section]} backHref="/mypage/record">
    <Panel>
      <h2>기간 선택</h2>
      <RangeOptions aria-label="기록 기간">
        {ranges.map((item) => <button key={item.value} type="button" className={range === item.value ? 'selected' : ''} aria-pressed={range === item.value} onClick={() => setRange(item.value)}>{item.label}</button>)}
      </RangeOptions>
      {range === 'custom' && <DateRange>
        <label>시작일<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <span aria-hidden="true">~</span>
        <label>종료일<input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} /></label>
      </DateRange>}
    </Panel>

    {section === 'matches' && <>
      <MatchPanel>
        <h2>매칭 성공률</h2>
        <MatchSummary aria-label="매칭 성공률과 매칭 성공 수">
          <MatchCopy>
            <MatchNumbers>
              <MatchRate>{loading || error || !rangedMatches.length ? '—' : Math.round(matchedCount / rangedMatches.length * 100)}%</MatchRate>
              <MatchRatio aria-label="매칭 성공 수 / 참가 스터디 수">{loading || error ? '— / —' : `${matchedCount} / ${rangedMatches.length}`}</MatchRatio>
            </MatchNumbers>
            <MatchCaption>매칭 성공 수 / 참가 스터디 수</MatchCaption>
          </MatchCopy>
          <MatchMascot src="/kw1.svg" alt="매칭을 응원하는 키위 캐릭터" />
        </MatchSummary>
      </MatchPanel>
      <Panel>
        <FilterOptions aria-label="매칭 결과 필터">
          {([{ value: 'all', label: '전체' }, { value: 'success', label: '매칭성공' }, { value: 'failed', label: '매칭실패' }] as const).map((item) => <button key={item.value} type="button" className={filter === item.value ? 'selected' : ''} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}
        </FilterOptions>
        {status ?? (visibleMatches.length ? <RecordRows>
          {visibleMatches.map(item => <li key={item.sessionId}>
            <div><time dateTime={item.sessionStartTime}>{dateLabel(item.sessionStartTime)}</time>
              <strong>{item.matched ? `${item.partnerAlias ?? '상대방'}님과 매칭` : '매칭되지 않았어요'}</strong></div>
            <span className={item.matched ? 'badge success' : 'badge'}>{item.matched ? '매칭성공' : '매칭실패'}</span>
          </li>)}
        </RecordRows> : <Empty role="status">{filter === 'all' ? '참여한 스터디 기록이 없어요.' : filter === 'success' ? '매칭 성공 기록이 없어요.' : '매칭 실패 기록이 없어요.'}</Empty>)}
      </Panel>
    </>}

    {section !== 'matches' && <Panel>
      <h2>{titles[section]}</h2>
      {status ?? (visibleShares.length ? <RecordRows>
        {visibleShares.map(item => <li key={item.id}>
          <div><time dateTime={item.sessionStartTime}>{dateLabel(item.sessionStartTime)}</time>
            <strong>{(section === 'sent' ? item.receiverAlias : item.senderAlias) ?? '상대방'}</strong>
            {section === 'received' && <span className="contact">{contactLabel[item.contactType]} · {item.contactValue ?? '삭제된 연락처'}</span>}</div>
          {section === 'sent' && <span className="badge">{contactLabel[item.contactType]}</span>}
        </li>)}
      </RecordRows> : <Empty role="status">{section === 'sent' ? '연락처를 보낸 기록이 없어요.' : '받은 연락처가 없어요.'}</Empty>)}
    </Panel>}
  </MyPageFrame>
}

const RangeOptions = styled.div`
  display: flex; flex-wrap: wrap; gap: .7rem;
  button { min-height: 3.6rem; padding: 0 1.2rem; border: .1rem solid #dfe5dc; border-radius: 99px; background: #fff; color: #536057; font-size: 1.15rem; }
  button.selected { border-color: var(--green); background: var(--green); color: #273219; font-weight: 700; }
`

const FilterOptions = styled(RangeOptions)`
  button { flex: 1; }
`

const DateRange = styled.div`
  display: grid; grid-template-columns: minmax(0,1fr) auto minmax(0,1fr); align-items: end; gap: .8rem; margin-top: 1.5rem;
  label { display: grid; gap: .5rem; color: #536057; font-size: 1.1rem; }
  input { width: 100%; min-width: 0; min-height: 4.2rem; padding: 0 .8rem; border: .1rem solid #dfe5dc; border-radius: .8rem; background: #fff; color: var(--ink); font: 400 1.15rem var(--font-body); }
  > span { padding-bottom: 1.2rem; color: #7d877a; }
`

const MatchSummary = styled.div`
  display: flex; min-height: 10rem; align-items: center; justify-content: space-between; gap: 1rem;
  overflow: hidden;
`

const MatchPanel = styled(Panel)`
  padding: 1.8rem 2rem;
  border-color: #202521;
  border-radius: 1.6rem;
  background: #202521;
  h2 { margin-bottom: .8rem; color: #fff; }
`

const MatchCopy = styled.div`
  min-width: 0;
`

const MatchNumbers = styled.div`
  display: flex; align-items: baseline; gap: .9rem;
`

const MatchRate = styled.strong`
  color: var(--green); font: 700 4.2rem/1 var(--display-font); letter-spacing: -.04em;
`

const MatchRatio = styled.span`
  color: #aeb5b0; font: 500 1.45rem/1 var(--font-body);
`

const MatchCaption = styled.p`
  margin: .8rem 0 0; color: #aeb5b0; font-size: 1rem;
`

const MatchMascot = styled.img`
  flex: 0 0 auto; width: 8rem; height: 8rem; object-fit: contain;
  filter: drop-shadow(0 .5rem .8rem rgb(0 0 0 / 18%));

  @media (max-width: 380px) { width: 6.5rem; height: 6.5rem; }
`

const Empty = styled.p`
  margin-top: 1.8rem; padding: 3.2rem 1rem; border-radius: 1rem; background: #f7f9f4; color: #7d877a; font-size: 1.2rem; line-height: 1.7; text-align: center;
  button { margin-top: 1rem; padding: .8rem 1.4rem; border: 0; border-radius: 1rem; background: var(--green); color: #273219; font-weight: 700; }
`

const RecordRows = styled.ul`
  display: grid; gap: .9rem; margin-top: 1.8rem; padding: 0; list-style: none;
  li { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.4rem; border: .1rem solid #e1e8dc; border-radius: 1.2rem; background: #fff; }
  li > div { display: grid; min-width: 0; gap: .5rem; }
  time { color: #7d877a; font-size: 1.1rem; }
  strong { overflow-wrap: anywhere; color: #202820; font-size: 1.35rem; }
  .contact { overflow-wrap: anywhere; color: #2f5d43; font-size: 1.25rem; font-weight: 600; }
  .badge { flex: 0 0 auto; padding: .4rem .9rem; border-radius: 99rem; background: #eef1ec; color: #647065; font-size: 1.1rem; font-weight: 700; }
  .badge.success { background: var(--green); color: #273219; }
`
