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
  const [interestText, setInterestText] = useState('')
  const [name, setName] = useState('')
  const [university, setUniversity] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (demo) {
      setName('이서강')
      setUniversity('서강대학교')
      setValues({ idealType: '곰상', datingStyle: '전시회나 맛집 탐방', contactStyle: '전화 선호', loveStyle: '천천히 알아가는 편', interests: ['전시', '러닝'] })
      setInterestText('전시, 러닝')
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
      setInterestText((profile.interests ?? []).join(', '))
      setError('')
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : '프로필 카드를 불러오지 못했어요.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [demo])

  function update(field: keyof Omit<UpdateMemberProfile, 'interests'>, value: string) {
    setValues(current => ({ ...current, [field]: value }))
    setNotice('')
  }

  async function saveProfile() {
    if (demo || saving) return
    setError('')
    setNotice('')
    const interests = interestText.split(',').map(item => item.trim()).filter(Boolean)
    const fields = [values.idealType ?? '', values.datingStyle ?? '', values.contactStyle ?? '', values.loveStyle ?? '']
    if (fields.some(value => value.length > 200)) { setError('프로필 항목은 각각 200자 이하로 입력해주세요.'); return }
    if (interests.length > 5 || interests.some(item => item.length > 20)) { setError('관심사는 최대 5개, 항목당 20자 이하로 입력해주세요.'); return }
    if (/(https?:\/\/|www\.|@|\b01[016789][ -]?\d{3,4}[ -]?\d{4}\b)/i.test([...fields, ...interests].join(' '))) {
      setError('프로필에는 전화번호, 인스타그램 아이디, 링크를 입력할 수 없어요.')
      return
    }

    setSaving(true)
    try {
      const updated = await updateMyProfile({ ...values, interests })
      setValues(toPayload(updated))
      setInterestText((updated.interests ?? interests).join(', '))
      setNotice('프로필 카드를 저장했어요.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '프로필 카드를 저장하지 못했어요.')
    } finally {
      setSaving(false)
    }
  }

  return <MyPageFrame title="나의 프로필 카드" demo={demo}>
    <Panel>
      <ProfilePhoto aria-hidden="true"><span>프로필<br />사진</span></ProfilePhoto>
      {loading ? <p className="hint" role="status">프로필 정보를 불러오는 중이에요…</p> : <>
        {error && !name && <p className="error" role="alert">{error}</p>}
        <Field>이름<input value={name} readOnly /></Field>
        <Field>학교 정보<input value={university} readOnly /></Field>
        <Field>이상형<input maxLength={200} value={values.idealType ?? ''} onChange={event => update('idealType', event.target.value)} placeholder="이상형을 입력해주세요" /></Field>
        <Field>데이트 스타일<input maxLength={200} value={values.datingStyle ?? ''} onChange={event => update('datingStyle', event.target.value)} placeholder="선호하는 데이트를 입력해주세요" /></Field>
        <Field>연락 스타일<input maxLength={200} value={values.contactStyle ?? ''} onChange={event => update('contactStyle', event.target.value)} placeholder="연락 스타일을 입력해주세요" /></Field>
        <Field>연애 스타일<input maxLength={200} value={values.loveStyle ?? ''} onChange={event => update('loveStyle', event.target.value)} placeholder="연애 스타일을 입력해주세요" /></Field>
        <Field>관심사 (쉼표로 구분)<input maxLength={104} value={interestText} onChange={event => {
          const next = event.target.value
          // 관심사가 5개를 넘기면 6번째 항목 입력을 막는다 (쉼표로 구분된 비어있지 않은 항목 기준)
          if (next.split(',').map(item => item.trim()).filter(Boolean).length > 5) return
          setInterestText(next)
          setNotice('')
        }} placeholder="전시, 러닝, 보드게임" /></Field>
        {error && name && <p className="error" role="alert">{error}</p>}
        {notice && <p className="success" role="status">{notice}</p>}
        <Action type="button" disabled={saving || demo || !name} onClick={() => void saveProfile()}>{saving ? '저장 중…' : '프로필 카드 저장'}</Action>
        <p className="hint">관심사는 최대 5개까지 입력할 수 있어요.</p>
      </>}
    </Panel>
  </MyPageFrame>
}

const ProfilePhoto = styled.div`
  display: grid; width: 10rem; height: 10rem; place-items: center; margin: 0 auto 1.8rem; border-radius: 50%; background: #e9edeb; color: #56605a; font-size: 1.3rem; font-weight: 700; line-height: 1.35; text-align: center;
`
