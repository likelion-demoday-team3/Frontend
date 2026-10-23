import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import * as PortOne from '@portone/browser-sdk/v2'
import MyPageFrame, { Action, Panel } from './MyPageFrame'
import { getAccessToken } from '../../features/auth/session'
import { ApiError } from '../../features/api/client'
import { confirmMyIdentityVerification, requestMyIdentityVerification } from '../../features/members/api'

const pendingVerificationKey = 'kiiwee.pending-identity-verification-id'

const dateLabel = (value: string) => new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric',
}).format(new Date(value))

export default function ItsMe() {
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [successOpen, setSuccessOpen] = useState(false)
  const confirmingId = useRef<string | null>(null)
  const errorDialog = useRef<HTMLDialogElement>(null)
  const successDialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (error) errorDialog.current?.showModal()
    else errorDialog.current?.close()
  }, [error])

  useEffect(() => {
    if (successOpen) successDialog.current?.showModal()
    else successDialog.current?.close()
  }, [successOpen])

  function markAlreadyVerified(cause: unknown) {
    if (!(cause instanceof ApiError) || cause.status !== 409 || !cause.message.includes('이미 본인인증이 완료된 회원')) return false
    sessionStorage.removeItem(pendingVerificationKey)
    setVerified(true)
    setVerifiedAt(null)
    setNotice('')
    setError('')
    setSuccessOpen(true)
    return true
  }

  async function confirmVerification(identityVerificationId: string) {
    if (!identityVerificationId || confirmingId.current === identityVerificationId) return
    confirmingId.current = identityVerificationId
    setVerifying(true)
    setError('')
    setNotice('본인인증 결과를 확인하고 있어요…')
    try {
      const confirmation = await confirmMyIdentityVerification(identityVerificationId)
      if (!confirmation.verified) throw new Error('본인인증 결과를 확인하지 못했어요.')
      setVerified(true)
      setVerifiedAt(confirmation.verifiedAt)
      setNotice('')
      setSuccessOpen(true)
      sessionStorage.removeItem(pendingVerificationKey)
    } catch (cause) {
      if (markAlreadyVerified(cause)) {
        sessionStorage.removeItem(pendingVerificationKey)
        return
      }
      confirmingId.current = null
      setNotice('')
      setError(cause instanceof Error ? cause.message : '본인인증 결과를 확인하지 못했어요.')
    } finally {
      setVerifying(false)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }

  useEffect(() => {
    if (!getAccessToken()) {
      setError('로그인 후 본인인증 상태를 확인할 수 있어요.')
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const identityVerificationId = params.get('identityVerificationId')
    const message = params.get('message')
    if (params.has('code')) {
      setError(message || '본인인증이 완료되지 않았어요. 다시 시도해주세요.')
      sessionStorage.removeItem(pendingVerificationKey)
      window.history.replaceState(null, '', window.location.pathname)
      return
    }
    const pendingId = sessionStorage.getItem(pendingVerificationKey)
    const verificationId = pendingId || identityVerificationId
    if (verificationId) void confirmVerification(verificationId)
  }, [])

  async function startVerification() {
    if (verifying || verified) return
    setError('')
    setNotice('본인인증 창을 준비하고 있어요…')
    setVerifying(true)
    try {
      const request = await requestMyIdentityVerification()
      sessionStorage.setItem(pendingVerificationKey, request.identityVerificationId)
      const result = await PortOne.requestIdentityVerification({
        storeId: request.storeId,
        channelKey: request.channelKey,
        identityVerificationId: request.identityVerificationId,
        redirectUrl: `${window.location.origin}/mypage/identity`,
      })
      if (!result) {
        setNotice('본인인증 페이지에서 돌아오면 결과를 확인할게요.')
        return
      }
      if (result.code !== undefined) throw new Error(result.message || '본인인증이 취소되었거나 실패했어요.')
      await confirmVerification(request.identityVerificationId)
    } catch (cause) {
      if (markAlreadyVerified(cause)) return
      sessionStorage.removeItem(pendingVerificationKey)
      setNotice('')
      setError(cause instanceof Error ? cause.message : '본인인증을 시작하지 못했어요.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <MyPageFrame title="본인인증">
      <Panel>
        <h2>본인인증</h2>
        <p className="hint">더 안전하고 신뢰할 수 있는 소개팅을 위해 본인인증을 진행해주세요.</p>
        {verifiedAt ? <p className="verification-date">본인인증 완료 · {dateLabel(verifiedAt)}</p> : verified ? <p className="verification-date">본인인증이 완료된 상태예요.</p> : <p className="verification-date pending">본인인증을 진행해주세요.</p>}
        <Action type="button" onClick={() => void startVerification()} disabled={verifying || verified}>
          {verifying ? '본인인증 진행 중…' : verified ? '본인인증 완료' : '본인인증하기'}
        </Action>
        {notice && <p className="hint" role="status">{notice}</p>}
      </Panel>
      <ErrorDialog
        ref={errorDialog}
        role="alertdialog"
        aria-labelledby="identity-error-title"
        aria-describedby="identity-error-description"
        onCancel={(event) => { event.preventDefault(); setError('') }}
        onClick={(event) => { if (event.target === event.currentTarget) setError('') }}
      >
        <h2 id="identity-error-title">본인인증을 진행할 수 없어요</h2>
        <p id="identity-error-description">{error}</p>
        <button type="button" autoFocus onClick={() => setError('')}>확인</button>
      </ErrorDialog>
      <SuccessDialog
        ref={successDialog}
        role="dialog"
        aria-labelledby="identity-success-title"
        onCancel={(event) => { event.preventDefault(); setSuccessOpen(false) }}
        onClick={(event) => { if (event.target === event.currentTarget) setSuccessOpen(false) }}
      >
        <h2 id="identity-success-title">본인인증 완료</h2>
        <p>{verifiedAt ? `본인인증을 완료했어요. (${dateLabel(verifiedAt)})` : '이미 본인인증이 완료된 계정이에요.'}</p>
        <button type="button" autoFocus onClick={() => setSuccessOpen(false)}>확인</button>
      </SuccessDialog>
    </MyPageFrame>
  )
}

const ErrorDialog = styled.dialog`
  width: min(34rem, calc(100vw - 4.8rem));
  padding: 2.5rem;
  border: 0;
  border-radius: 2.4rem;
  background: var(--background);
  color: var(--ink);
  box-shadow: 0 1.6rem 7rem #1113;
  &::backdrop { background: #222b2566; }
  h2 { font: 400 2.3rem/1.4 var(--display-font); }
  p { margin: 1.5rem 0 2.3rem; color: #bd5547; font-size: 1.5rem; line-height: 1.6; overflow-wrap: anywhere; }
  button { display: grid; width: 100%; min-height: 4.8rem; place-items: center; border: 0; border-radius: 1.2rem; background: var(--green); color: #273219; font: 700 1.4rem var(--font-body); cursor: pointer; }
`

const SuccessDialog = styled(ErrorDialog)`
  p { color: #536d25; }
`
