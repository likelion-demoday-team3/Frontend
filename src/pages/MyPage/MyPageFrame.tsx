import type { ReactNode } from 'react'
import styled from 'styled-components'

export default function MyPageFrame({ title, children, demo = false, centerContent = false, backHref = '/mypage' }: { title: string; children: ReactNode; demo?: boolean; centerContent?: boolean; backHref?: string }) {
  return <Frame>
    <header><a href={backHref} aria-label="이전 화면으로 돌아가기">‹</a><h1>{title}</h1><span /></header>
    <main className={centerContent ? 'center-content' : undefined}>{children}</main>
    {demo && <a className="demo-chip" href="/kiiwee/mypage-demo">시연 중 <span>마이페이지로</span></a>}
  </Frame>
}

export const Panel = styled.section`
  margin: 1.6rem 0; padding: 1.8rem; border: .1rem solid #e5e9e3; border-radius: 1.6rem; background: #fff;
  h2 { margin-bottom: 1.4rem; font: 700 1.7rem/1.4 var(--display-font); }
  .panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.4rem; }
  .panel-heading h2 { margin: 0; }
`

export const Field = styled.label`
  display: grid; gap: .7rem; margin: 1.5rem 0; color: #536057; font-size: 1.25rem; font-weight: 600;
  input { width: 100%; min-height: 4.6rem; padding: 0 1.2rem; border: .1rem solid #dfe5dc; border-radius: 1rem; background: #fff; color: var(--ink); font: 400 1.4rem var(--font-body); }
  input:read-only { background: #f5f7f3; color: #7b847d; }
  .inline-control { position: relative; display: block; }
  .inline-control input { padding-right: 12rem; }
  .inline-control button { position: absolute; top: 50%; right: .7rem; transform: translateY(-50%); }
`

export const Action = styled.button`
  display: flex; width: 100%; min-height: 4.8rem; align-items: center; justify-content: center; padding: 0 1.4rem; border: 0; border-radius: 1.1rem; background: var(--green); color: #273219; font-size: 1.35rem; font-weight: 700;
`

const Frame = styled.div`
  width: 100%; max-width: 43rem; min-height: 100dvh; margin: 0 auto; padding: 0 3rem calc(4rem + env(safe-area-inset-bottom)); background: var(--background); color: var(--ink); box-shadow: 0 0 6rem #26372508;
  header { display: grid; grid-template-columns: 4.4rem 1fr 4.4rem; align-items: center; min-height: 8.6rem; padding-top: calc(2.4rem + env(safe-area-inset-top)); padding-bottom: 1.8rem; }
  header a { color: var(--ink); font-size: 3.6rem; line-height: 1; text-decoration: none; }
  header h1 { color: var(--ink); font: 400 2.2rem/1.2 var(--display-font); text-align: center; }
  main { padding-bottom: 2rem; }
  main.center-content { display: flex; min-height: calc(100dvh - 18.2rem - env(safe-area-inset-bottom)); flex-direction: column; justify-content: center; }
  .demo-chip { position: fixed; z-index: 20; top: calc(1.2rem + env(safe-area-inset-top)); right: max(calc((100vw - 43rem)/2 + 1.2rem), 1.2rem); padding: .8rem 1.1rem; border-radius: 99px; background: #17231b; color: #fff; font-size: 1.05rem; text-decoration: none; }
  .demo-chip span { color: #d8ff8c; font-weight: 700; }
  .hint { color: var(--text-secondary); font-size: 1.2rem; line-height: 1.6; }
  .success { margin-top: 1rem; color: #567a24; font-size: 1.2rem; }
  .verification-date { margin: 1.8rem 0; color: #567a24; font-size: 1.3rem; font-weight: 700; }
  .verification-date.pending { color: #7d877a; font-weight: 400; }
  .error { margin: .8rem 0 1.2rem; color: #c34b4b; font-size: 1.2rem; line-height: 1.5; }
  @media(max-width:37.4rem) { padding-right: 3rem; padding-left: 3rem; }
`
