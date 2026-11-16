export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

const personalEmailDomains = new Set([
  'gmail.com', 'googlemail.com', 'naver.com', 'daum.net', 'hanmail.net',
  'kakao.com', 'nate.com', 'yahoo.com', 'yahoo.co.kr', 'outlook.com',
  'hotmail.com', 'live.com', 'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'gmx.com', 'zoho.com', 'aol.com',
  'yandex.com', 'mail.com', 'fastmail.com', 'tuta.com', 'tutanota.com',
  'hey.com', 'qq.com', '163.com', '126.com',
])

export function isSchoolEmail(value: string) {
  if (!isEmail(value)) return false
  const domain = value.trim().toLowerCase().split('@').at(-1) ?? ''
  return ![...personalEmailDomains].some((personalDomain) =>
    domain === personalDomain || domain.endsWith(`.${personalDomain}`),
  )
}

export const isCode = (value: string) => /^\d{6}$/.test(value)
export const isPassword = (value: string) => value.length >= 8 && value.length <= 64
export const isPhone = (value: string) => /^010\d{8}$/.test(value.replace(/-/g, ''))
/** 만 나이 (서버와 같은 기준). today는 테스트용 */
export function ageOn(y: number, m: number, d: number, today = new Date()) {
  const birthdayPassed = today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d)
  return today.getFullYear() - y - (birthdayPassed ? 0 : 1)
}

/** 가입 가능한 생년월일인지: 실제 있는 날짜이고 만 19세 이상 만 27세 이하 */
export function isBirthDate(year: string, month: string, day: string, today = new Date()) {
  if (!year || !month || !day) return false
  const y = Number(year), m = Number(month), d = Number(day)
  const date = new Date(y, m - 1, d)
  const age = ageOn(y, m, d, today)
  return age >= 19 && age <= 27
    && date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}
