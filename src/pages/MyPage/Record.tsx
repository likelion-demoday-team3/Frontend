import styled from 'styled-components'
import MyPageFrame, { Panel } from './MyPageFrame'

const sections = [
  { title: '최종 매칭 결과', description: '스터디 매칭 성공 및 실패 내역', href: '/mypage/record/matches' },
  { title: '연락처 전송 기록', description: '내 연락처를 전송한 스터디 기록', href: '/mypage/record/sent' },
  { title: '받은 연락처 목록', description: '상대가 내게 연락처를 전송한 기록', href: '/mypage/record/received' },
]

export default function Record() {
  return <MyPageFrame title="스터디 기록">
    {sections.map((section) => <RecordLink key={section.href} href={section.href}>
      <Panel>
        <div><h2>{section.title}</h2><p className="hint">{section.description}</p></div>
        <span aria-hidden="true">›</span>
      </Panel>
    </RecordLink>)}
  </MyPageFrame>
}

const RecordLink = styled.a`
  display: block; color: inherit; text-decoration: none;
  section { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  h2 { margin-bottom: .6rem; }
  section > span { color: #77827a; font-size: 2.4rem; }
`
