import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { getAccessToken } from '../../features/auth/session'
import { getLocalMemberName, getMyMember, getMyProfile, updateMyProfile, type MemberProfile, type UpdateMemberProfile } from '../../features/members/api'
import MyPageFrame, { Action, Field, Panel } from './MyPageFrame'

const emptyProfile: UpdateMemberProfile = {
  idealType: '', datingStyle: '', contactStyle: '', loveStyle: '', interests: [],
}

const toPayload = (profile: MemberProfile): UpdateMemberProfile => ({
  idealType: profile.idealType ?? '',
  datingStyle: profile.datingStyle ?? '',
  contactStyle: profile.contactStyle ?? '',
  loveStyle: profile.loveStyle ?? '',
  interests: profile.interests ?? [],
})

export default function CardEdit({ demo = false }: { demo?: boolean }) {
  const [values, setValues] = useState<UpdateMemberProfile>(emptyProfile)
  const [interestDraft, setInterestDraft] = useState('')
  const [name, setName] = useState('')
  const [university, setUniversity] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (demo) {
      setName('이서강')
      setUniversity('서강대학교')
      setValues({ idealType: '곰상', datingStyle: '전시회나 맛집 탐방', contactStyle: '전화 선호', loveStyle: '천천히 알아가는 편', interests: ['전시', '러닝'] })
      setLoading(false)
      return
    }
    if (!getAccessToken()) {
      setLoading(false)
      setError('로그인 후 프로필 카드를 확인할 수 있어요.')
      return
    }
    let active = true
    Promise.all([getMyMember(), getMyProfile()]).then(([member, profile]) => {
      if (!active) return
      setName(member.name ?? getLocalMemberName(member.email) ?? '')
      setUniversity(profile.university || member.university)
      setValues(toPayload(profile))
      setError('')
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : '프로필 카드를 불러오지 못했어요.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [demo])

  function update(field: keyof Omit<UpdateMemberProfile, 'interests'>, value: string) {
    setValues(current => ({ ...current, [field]: value }))
  }

  function addInterest() {
    const tag = interestDraft.trim()
    if (!tag) return
    const current = values.interests ?? []
    if (current.length >= 5) { setError('관심사는 최대 5개까지 입력할 수 있어요.'); return }
    if (tag.length > 20) { setError('관심사는 항목당 20자 이하로 입력해주세요.'); return }
    setInterestDraft('')
    if (current.includes(tag)) return
    setValues(cur => ({ ...cur, interests: [...(cur.interests ?? []), tag] }))
    setError('')
  }

  function removeInterest(index: number) {
    setValues(cur => ({ ...cur, interests: (cur.interests ?? []).filter((_, i) => i !== index) }))
  }

  async function saveProfile() {
    if (demo || saving) return
    setError('')
    const fail = (message: string) => setDialog({ kind: 'error', message })
    // 입력 중이던(엔터로 확정 안 한) 관심사도 함께 저장한다
    const base = values.interests ?? []
    const draft = interestDraft.trim()
    const interests = draft && !base.includes(draft) ? [...base, draft] : base
    const fields = [values.idealType ?? '', values.datingStyle ?? '', values.contactStyle ?? '', values.loveStyle ?? '']
    if (fields.some(value => value.length > 200)) { fail('프로필 항목은 각각 200자 이하로 입력해주세요.'); return }
    if (interests.length > 5 || interests.some(item => item.length > 20)) { fail('관심사는 최대 5개, 항목당 20자 이하로 입력해주세요.'); return }
    if (/(https?:\/\/|www\.|@|\b01[016789][ -]?\d{3,4}[ -]?\d{4}\b)/i.test([...fields, ...interests].join(' '))) {
      fail('프로필에는 전화번호, 인스타그램 아이디, 링크를 입력할 수 없어요.')
      return
    }

    setSaving(true)
    try {
      const updated = await updateMyProfile({ ...values, interests })
      setValues(toPayload(updated))
      setInterestDraft('')
      setDialog({ kind: 'success', message: '프로필 카드를 저장했어요.' })
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : '프로필 카드를 저장하지 못했어요.')
    } finally {
      setSaving(false)
    }
  }

  return <MyPageFrame title="나의 프로필 카드" demo={demo}>
    <Panel>
      <ProfilePhoto aria-hidden="true"><span>프로필<br />사진</span></ProfilePhoto>
      {loading ? <p className="hint" role="status">프로필 정보를 불러오는 중이에요…</p> : <>
        <Field>이름<input value={name} readOnly /></Field>
        <Field>학교 정보<input value={university} readOnly /></Field>
        <Field>이상형<input maxLength={200} value={values.idealType ?? ''} onChange={event => update('idealType', event.target.value)} placeholder="이상형을 입력해주세요" /></Field>
        <Field>데이트 스타일<input maxLength={200} value={values.datingStyle ?? ''} onChange={event => update('datingStyle', event.target.value)} placeholder="선호하는 데이트를 입력해주세요" /></Field>
        <Field>연락 스타일<input maxLength={200} value={values.contactStyle ?? ''} onChange={event => update('contactStyle', event.target.value)} placeholder="연락 스타일을 입력해주세요" /></Field>
        <Field>연애 스타일<input maxLength={200} value={values.loveStyle ?? ''} onChange={event => update('loveStyle', event.target.value)} placeholder="연애 스타일을 입력해주세요" /></Field>
        <Field>관심사 (최대 5개)
          <InterestEditor>
            {(values.interests ?? []).map((tag, index) => (
              <span className="chip" key={`${tag}-${index}`}>
                {tag}
                <button type="button" className="chip-remove" aria-label={`${tag} 삭제`} onClick={() => removeInterest(index)}>×</button>
              </span>
            ))}
            {(values.interests ?? []).length < 5 && (
              <input
                className="chip-input"
                maxLength={20}
                value={interestDraft}
                onChange={event => setInterestDraft(event.target.value)}
                onKeyDown={event => {
                  // 한글 조합 중 Enter는 무시한다 (조합 확정과 겹쳐 같은 태그가 두 번 들어가는 것 방지)
                  if (event.nativeEvent.isComposing) return
                  if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addInterest() }
                  else if (event.key === 'Backspace' && !interestDraft && (values.interests ?? []).length) { removeInterest((values.interests ?? []).length - 1) }
                }}
                placeholder={(values.interests ?? []).length ? '관심사 추가' : '전시, 러닝, 보드게임'}
              />
            )}
          </InterestEditor>
        </Field>
        {error && <p className="error" role="alert">{error}</p>}
        <Action type="button" disabled={saving || demo} onClick={() => void saveProfile()}>{saving ? '저장 중…' : '프로필 카드 저장'}</Action>
        <p className="hint">관심사는 엔터로 추가하고, 최대 5개까지 입력할 수 있어요.</p>
      </>}
    </Panel>
    {dialog && <SaveDialogBackdrop role="presentation" onClick={() => setDialog(null)}>
      <section className="save-dialog" role="alertdialog" aria-modal="true" aria-labelledby="save-dialog-title" aria-describedby="save-dialog-message" onClick={event => event.stopPropagation()}>
        <h2 id="save-dialog-title">{dialog.kind === 'success' ? '저장 완료' : '저장하지 못했어요'}</h2>
        <p id="save-dialog-message" className={dialog.kind}>{dialog.message}</p>
        <button type="button" autoFocus onClick={() => setDialog(null)}>확인</button>
      </section>
    </SaveDialogBackdrop>}
  </MyPageFrame>
}

const ProfilePhoto = styled.div`
  display: grid; width: 10rem; height: 10rem; place-items: center; margin: 0 auto 1.8rem; border-radius: 50%; background: #e9edeb; color: #56605a; font-size: 1.3rem; font-weight: 700; line-height: 1.35; text-align: center;
`

const SaveDialogBackdrop = styled.div`
  position: fixed; z-index: 60; inset: 0; display: grid; place-items: center; padding: 2rem; background: #18221c77;
  .save-dialog { width: min(100%, 34rem); padding: 2.4rem 2rem 2rem; border-radius: 2rem; background: var(--background); box-shadow: 0 1.5rem 5rem #1114; text-align: center; }
  .save-dialog h2 { font: 700 1.8rem/1.4 var(--display-font); }
  .save-dialog p { margin-top: 1rem; color: #69756b; font-size: 1.2rem; line-height: 1.7; }
  .save-dialog p.error { color: #bd5547; }
  .save-dialog button { width: 100%; min-height: 4.4rem; margin-top: 2rem; border: 0; border-radius: 1rem; background: #2f5d43; color: #fff; font: 600 1.3rem var(--font-body); cursor: pointer; }
`

const InterestEditor = styled.div`
  display: flex; flex-wrap: wrap; gap: .6rem; align-items: center; min-height: 4.6rem; padding: .7rem 1rem; border: .1rem solid #dfe5dc; border-radius: 1rem; background: #fff;
  &:focus-within { outline: .2rem solid var(--focus); outline-offset: .2rem; }
  .chip { display: inline-flex; align-items: center; gap: .4rem; padding: .4rem .5rem .4rem .9rem; border-radius: 999rem; background: #eaf2ec; color: #2f5d43; font-size: 1.3rem; font-weight: 700; }
  .chip-remove { display: grid; width: 1.8rem; height: 1.8rem; place-items: center; padding: 0; border: 0; border-radius: 50%; background: #cfe0d5; color: #2f5d43; font-size: 1.4rem; line-height: 1; cursor: pointer; }
  .chip-input { flex: 1; min-width: 8rem; min-height: 3rem; padding: 0 .2rem; border: 0; background: transparent; color: var(--ink); font: 400 1.4rem var(--font-body); }
  .chip-input:focus { outline: none; }
`
