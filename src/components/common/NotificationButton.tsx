import { useEffect, useId, useRef, useState } from 'react'
import styled from 'styled-components'

export default function NotificationButton({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    dialogRef.current?.showModal()
    return () => dialogRef.current?.close()
  }, [open])

  return <>
    <BellButton className={className} type="button" aria-label="알림 열기" onClick={() => setOpen(true)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </svg>
    </BellButton>
    <NoticeDialog ref={dialogRef} aria-labelledby={titleId} onCancel={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false) }}>
      <h2 id={titleId}>알림</h2>
      <p>알림 API 명세가 없어 아직 알림을 불러올 수 없어요.</p>
      <button type="button" onClick={() => setOpen(false)}>확인</button>
    </NoticeDialog>
  </>
}

const BellButton = styled.button`
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #00111f;
  cursor: pointer;
  &:hover { background: #2b302c08; }
  svg { width: 2.8rem; height: 2.8rem; }
`

const NoticeDialog = styled.dialog`
  position: fixed;
  top: 7.2rem;
  right: max(calc((100vw - 43rem) / 2 + 2.4rem), 1.6rem);
  left: auto;
  bottom: auto;
  margin: 0;
  width: min(34rem, calc(100vw - 3.2rem));
  padding: 2rem;
  border: 0;
  border-radius: 2rem;
  background: var(--background);
  color: var(--ink);
  box-shadow: 0 1.6rem 7rem #1113;
  &::backdrop { background: #222b2533; }
  h2 { font: 600 1.8rem/1.4 var(--font-body); }
  p { margin-top: 1.2rem; color: var(--text-secondary); font-size: 1.4rem; line-height: 1.6; }
  button { display: grid; width: 100%; min-height: 4.2rem; place-items: center; margin-top: 1.6rem; border: 0.1rem solid var(--ink); border-radius: 1rem; background: var(--green); color: var(--ink); font: 500 1.4rem var(--font-body); }
`
