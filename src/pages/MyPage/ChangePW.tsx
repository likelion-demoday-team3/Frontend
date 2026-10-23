import { useState, type FormEvent } from 'react'
import styled from 'styled-components'
import MyPageFrame, { Action, Field, Panel } from './MyPageFrame'
import { updateMyPassword } from '../../features/members/api'

export default function ChangePW() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [message, setMessage] = useState<{ text: string; kind: 'error' | 'success' } | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    if (!currentPassword) {
      setMessage({ text: '현재 비밀번호를 입력해주세요.', kind: 'error' })
      return
    }
    if (newPassword.length < 8 || newPassword.length > 64) {
      setMessage({ text: '새 비밀번호는 8~64자로 입력해주세요.', kind: 'error' })
      return
    }
    if (newPassword !== confirmation) {
      setMessage({ text: '비밀번호가 일치하지 않아요. 다시 확인해주세요.', kind: 'error' })
      return
    }
    setSaving(true)
    try {
      await updateMyPassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setMessage({ text: '비밀번호를 변경했어요.', kind: 'success' })
    } catch (cause) {
      setMessage({ text: cause instanceof Error ? cause.message : '비밀번호를 변경하지 못했어요.', kind: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <MyPageFrame title="비밀번호 변경" backHref="/mypage/me" centerContent>
      <Panel>
        <h2>새 비밀번호 설정</h2>
        <form onSubmit={submit}>
          <PasswordField>
            현재 비밀번호
            <span className="inline-control password-input">
              <input type={showCurrentPassword ? 'text' : 'password'} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="현재 비밀번호를 입력해주세요" required />
              <button type="button" className="eye-button" aria-label={showCurrentPassword ? '현재 비밀번호 숨기기' : '현재 비밀번호 표시'} aria-pressed={showCurrentPassword} onClick={() => setShowCurrentPassword((visible) => !visible)}><EyeIcon visible={showCurrentPassword} /></button>
            </span>
          </PasswordField>
          <PasswordField>
            새 비밀번호
            <span className="inline-control password-input">
              <input type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={64} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="8~64자 입력" required />
              <button type="button" className="eye-button" aria-label={showNewPassword ? '새 비밀번호 숨기기' : '새 비밀번호 표시'} aria-pressed={showNewPassword} onClick={() => setShowNewPassword((visible) => !visible)}><EyeIcon visible={showNewPassword} /></button>
            </span>
          </PasswordField>
          <PasswordField>
            비밀번호 재입력
            <span className="inline-control password-input">
              <input type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={64} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="새 비밀번호를 다시 입력해주세요" required />
              <button type="button" className="eye-button" aria-label={showConfirmation ? '재입력 비밀번호 숨기기' : '재입력 비밀번호 표시'} aria-pressed={showConfirmation} onClick={() => setShowConfirmation((visible) => !visible)}><EyeIcon visible={showConfirmation} /></button>
            </span>
          </PasswordField>
          {message && <p className={message.kind === 'success' ? 'success' : 'error'} role={message.kind === 'success' ? 'status' : 'alert'}>{message.text}</p>}
          <Action type="submit" disabled={saving}>{saving ? '변경 중…' : '변경하기'}</Action>
        </form>
      </Panel>
    </MyPageFrame>
  )
}

function EyeIcon({ visible }: { visible: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="2.5" />{visible && <path d="m3 3 18 18" />}</svg>
}

const PasswordField = styled(Field)`
  .inline-control input { padding-right: 5rem; }
  .inline-control button.eye-button { right: .5rem; display: grid; width: 3.6rem; height: 3.6rem; place-items: center; padding: 0; border: 0; background: transparent; color: #657267; }
  .eye-button svg { width: 2.1rem; height: 2.1rem; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
`
