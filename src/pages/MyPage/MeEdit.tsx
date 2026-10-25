import { useEffect, useState, type FormEvent } from 'react'
import styled from 'styled-components'
import { getAccessToken, setAccessToken } from '../../features/auth/session'
import { deleteMyInstagram, deleteMyPhone, getLocalMemberName, getMyMember, type Member, setLocalMemberName, updateMyInstagram, updateMyName, updateMyPhone } from '../../features/members/api'
import { login } from '../../features/signup/api'
import MyPageFrame, { Action, Field, Panel } from './MyPageFrame'

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}
const instagramHandle = (value: string) => value.trim().replace(/^@+/, '')
const CONTACT_REQUIRED = '전화번호와 인스타그램 아이디 중 하나는 반드시 있어야 해요.'

export default function MeEdit() {
  const [member, setMember] = useState<Member | null>(null)
  const [name, setName] = useState('')
  const [initialName, setInitialName] = useState('')
  const [phone, setPhone] = useState('')
  const [initialPhone, setInitialPhone] = useState('')
  const [instagramId, setInstagramId] = useState('')
  const [initialInstagramId, setInitialInstagramId] = useState('')
  const [passwordVerified, setPasswordVerified] = useState(false)
  const [gatePassword, setGatePassword] = useState('')
  const [verifiedPassword, setVerifiedPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showGatePassword, setShowGatePassword] = useState(false)
  const [verifyingPassword, setVerifyingPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false)
      setError('로그인 후 내 정보를 확인할 수 있어요.')
      return
    }
    let active = true
    getMyMember()
      .then((value) => {
        if (!active) return
        setMember(value)
        const savedName = value.name ?? getLocalMemberName(value.email) ?? ''
        setName(savedName)
        setInitialName(savedName)
        const savedPhone = formatPhone(value.phoneNumber ?? '')
        setPhone(savedPhone)
        setInitialPhone(savedPhone)
        const savedInstagram = instagramHandle(value.instagramId ?? '')
        setInstagramId(savedInstagram)
        setInitialInstagramId(savedInstagram)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : '회원 정보를 불러오지 못했어요.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function saveInfo() {
    if (!member || saving) return
    setError('')
    setNotice('')
    setSaving(true)
    try {
      const trimmedName = name.trim()
      const normalizedPhone = phone.replace(/-/g, '')
      const normalizedInstagram = instagramHandle(instagramId)
      if (!normalizedPhone && !normalizedInstagram) {
        setError(CONTACT_REQUIRED)
        return
      }
      if (trimmedName && trimmedName !== initialName) {
        await updateMyName(trimmedName)
      }
      if (normalizedPhone !== (member.phoneNumber ?? '')) {
        if (normalizedPhone) await updateMyPhone(normalizedPhone)
        else await deleteMyPhone()
      }
      if (normalizedInstagram !== initialInstagramId) {
        if (normalizedInstagram) await updateMyInstagram(normalizedInstagram)
        else await deleteMyInstagram()
      }
      if (trimmedName) setLocalMemberName(member.email, trimmedName)
      setInitialName(trimmedName)
      setInitialPhone(phone)
      setInitialInstagramId(normalizedInstagram)
      setNotice('정보를 저장했어요.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '정보를 저장하지 못했어요.')
    } finally {
      setSaving(false)
    }
  }

  function removePhone() {
    if (!instagramHandle(instagramId)) {
      setNotice('')
      setError(CONTACT_REQUIRED)
      return
    }
    setError('')
    setPhone('')
  }

  function removeInstagram() {
    if (!phone.replace(/-/g, '')) {
      setNotice('')
      setError(CONTACT_REQUIRED)
      return
    }
    setError('')
    setInstagramId('')
  }

  async function verifyPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!member || !gatePassword || verifyingPassword) return
    setError('')
    setVerifyingPassword(true)
    try {
      const tokens = await login(member.email, gatePassword)
      setAccessToken(tokens.accessToken)
      setVerifiedPassword(gatePassword)
      setGatePassword('')
      setPasswordVerified(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '비밀번호를 확인하지 못했어요.')
    } finally {
      setVerifyingPassword(false)
    }
  }

  return (
    <MyPageFrame title="내 정보" centerContent>
      <Panel>
        <h2>{passwordVerified ? '계정 정보' : '비밀번호 확인'}</h2>
        {loading ? <p className="hint" role="status">정보를 불러오는 중이에요…</p> : !passwordVerified ? <form onSubmit={(event) => void verifyPassword(event)}>
          <p className="hint">내 정보를 보려면 계정 비밀번호를 입력해주세요.</p>
          <PasswordField>
            <span className="inline-control password-input">
              <input type={showGatePassword ? 'text' : 'password'} autoComplete="current-password" value={gatePassword} onChange={(event) => setGatePassword(event.target.value)} placeholder="비밀번호를 입력해주세요" required />
              <button className="password-visibility" type="button" aria-label={showGatePassword ? '비밀번호 숨기기' : '비밀번호 보기'} aria-pressed={showGatePassword} onClick={() => setShowGatePassword((visible) => !visible)}>
                {showGatePassword ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.3 9.5 7-.4 1.1-1.2 2.2-2.2 3.2M6.2 6.2C4.3 7.5 3 9.3 2.5 12c.5 1.5 1.5 2.9 3 4 1.7 1.3 3.8 2 6.5 2 1.1 0 2.1-.2 3.1-.5" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="2.5" /></svg>}
              </button>
            </span>
          </PasswordField>
          {error && <p className="error" role="alert">{error}</p>}
          <Action type="submit" disabled={verifyingPassword || !gatePassword}>{verifyingPassword ? '확인 중…' : '확인하기'}</Action>
        </form> : <>
          <Field>
            이름
            <input value={name} placeholder="이름을 입력해주세요" onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field>
            아이디 (학교 이메일)
            <input type="email" value={member?.email ?? ''} readOnly />
          </Field>
          <PasswordField>
            비밀번호
            <span className="inline-control">
              <input aria-label="비밀번호" type={showPassword ? 'text' : 'password'} value={showPassword ? verifiedPassword : '••••••••'} readOnly />
              <button className="password-visibility" type="button" aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
                {showPassword ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.3 9.5 7-.4 1.1-1.2 2.2-2.2 3.2M6.2 6.2C4.3 7.5 3 9.3 2.5 12c.5 1.5 1.5 2.9 3 4 1.7 1.3 3.8 2 6.5 2 1.1 0 2.1-.2 3.1-.5" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="2.5" /></svg>}
              </button>
              <PasswordLink href="/mypage/change-password">비밀번호 변경</PasswordLink>
            </span>
          </PasswordField>
          <Field>
            학교
            <input value={member?.university ?? ''} readOnly />
          </Field>
          <DeletableField>
            전화번호
            <span className="field-with-action">
              <input type="tel" value={phone} onChange={(event) => setPhone(formatPhone(event.target.value))} placeholder="가입 시 입력한 전화번호" />
              <button type="button" className="delete-button" onClick={removePhone} disabled={!phone}>삭제</button>
            </span>
          </DeletableField>
          <InstagramField>
            인스타그램 아이디
            <span className="field-with-action">
              <span className="instagram-input">
                <span aria-hidden="true">@</span>
                <input type="text" autoComplete="off" value={instagramId} onChange={(event) => setInstagramId(instagramHandle(event.target.value))} placeholder="아이디" />
              </span>
              <button type="button" className="delete-button" onClick={removeInstagram} disabled={!instagramId}>삭제</button>
            </span>
          </InstagramField>
          {error && <p className="error" role="alert">{error}</p>}
          {notice && <p className="success" role="status">{notice}</p>}
          <Action type="button" disabled={saving || !member || (name.trim() === initialName && phone === initialPhone && instagramHandle(instagramId) === initialInstagramId)} onClick={() => void saveInfo()}>{saving ? '저장 중…' : '저장하기'}</Action>        </>}
      </Panel>
    </MyPageFrame>
  )
}

const PasswordLink = styled.a`
  position: absolute;
  top: 50%;
  right: .7rem;
  display: grid;
  min-height: 3.4rem;
  place-items: center;
  padding: 0 1rem;
  border: .1rem solid #dfe5dc;
  border-radius: .8rem;
  background: #f6f8f4;
  color: #344136;
  font-size: 1.1rem;
  font-weight: 700;
  text-decoration: none;
  transform: translateY(-50%);
`

const PasswordField = styled(Field)`
  .inline-control input { padding-right: 12rem; }
  .inline-control.password-input input { padding-right: 5rem; }
  .inline-control button.password-visibility { right: 9.4rem; display: grid; width: 3.4rem; height: 3.4rem; place-items: center; padding: 0; border: 0; background: transparent; color: #657267; }
  .inline-control.password-input button.password-visibility { right: .5rem; }
  .password-visibility svg { width: 2rem; height: 2rem; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
`

const DeletableField = styled(Field)`
  .field-with-action { display: flex; gap: .8rem; align-items: stretch; }
  .field-with-action > input, .field-with-action > .instagram-input { flex: 1; min-width: 0; }
  .delete-button { flex: 0 0 auto; padding: 0 1.4rem; border: .1rem solid #e2b4b4; border-radius: 1rem; background: #fff; color: #c0504d; font-size: 1.3rem; font-weight: 700; cursor: pointer; }
  .delete-button:disabled { opacity: .45; cursor: default; }
`

const InstagramField = styled(DeletableField)`
  .instagram-input { display: flex; min-height: 4.6rem; align-items: center; padding-left: 1.2rem; border: .1rem solid #dfe5dc; border-radius: 1rem; background: #fff; color: var(--ink); font: 400 1.4rem var(--font-body); }
  .instagram-input input { min-height: 4.4rem; padding-left: .3rem; border: 0; background: transparent; }
  .instagram-input input:focus { outline: none; }
  .instagram-input:focus-within { outline: .2rem solid var(--focus); outline-offset: .2rem; }
`

