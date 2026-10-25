import styled from 'styled-components'

const previews = [
  { label: '스터디 로비', query: 'lobby' },
  { label: '1:1 대화', query: 'one-to-one' },
  { label: '하트 선택', query: 'hearts' },
  { label: '최종 투표', query: 'vote' },
] as const

/** 로컬 화면 검토용 바로가기. 서버 API를 호출하거나 DB에 세션을 만들지 않습니다. */
export default function ScreenPreviewPanel() {
  const params = new URLSearchParams(window.location.search)
  if (!import.meta.env.DEV && !params.has('showTest')) return null

  return <Dock aria-label="화면 미리보기 도구">
    <strong>화면 미리보기</strong>
    <small>로컬 샘플 · DB 미사용</small>
    {previews.map(({ label, query }) => <a key={query} href={`/session/1?preview=${query}&showTest=1`}>{label}</a>)}
    <a href="/result?preview=mutual&showTest=1">매칭 결과</a>
    <a href="/result?preview=failed&showTest=1">매칭 실패</a>
    <a href="/result-detail?preview=sample&showTest=1">결과 상세</a>
    <a href="/contact?sessionId=1&preview=sample&showTest=1">연락처 주고받기</a>
  </Dock>
}

const Dock = styled.aside`
  position: fixed; z-index: 1000; top: 50%; left: max(1.2rem, calc((100vw - 43rem) / 2 - 17rem));
  display: grid; width: 15rem; gap: .7rem; padding: 1.2rem; transform: translateY(-50%);
  border: 1px solid #dfe5dc; border-radius: 1.2rem; background: #fff; color: #273219;
  box-shadow: 0 .5rem 2rem #26372518; font-family: var(--font-body, sans-serif);
  strong { font-size: 1.2rem; }
  small { color: #7d877a; font-size: 1rem; }
  a { padding: .7rem .9rem; border-radius: .7rem; background: #f2ffd1; color: #36451e; font-size: 1.1rem; text-decoration: none; }
  @media (max-width: 75rem) { left: 1rem; width: 12rem; }
  @media (max-width: 56rem) { display: none; }
`
