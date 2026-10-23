import { useState } from 'react'
import styled from 'styled-components'
import MyPageFrame, { Panel } from './MyPageFrame'

type Section = 'matches' | 'sent' | 'received'
type Range = '1' | '3' | '6' | '12' | 'custom'

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
              <MatchRate>—%</MatchRate>
              <MatchRatio aria-label="매칭 성공 수 / 참가 스터디 수">— / —</MatchRatio>
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
        <Empty role="status">매칭 기록 API 연결 후 {filter === 'all' ? '성공률과 스터디 기록' : filter === 'success' ? '매칭 성공 기록' : '매칭 실패 기록'}을 표시할게요.</Empty>
      </Panel>
    </>}

    {section === 'sent' && <Panel><h2>연락처 전송 기록</h2><Empty role="status">연락처 전송 기록 API 연결 후 스터디 일시와 닉네임을 표시할게요.</Empty></Panel>}
    {section === 'received' && <Panel><h2>받은 연락처 목록</h2><Empty role="status">받은 연락처 API 연결 후 스터디 일시, 닉네임, 연락처를 표시할게요.</Empty></Panel>}
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
`
