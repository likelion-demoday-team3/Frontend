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
export function isBirthDate(year: string, month: string, day: string, currentYear: number) {
  if (!year || !month || !day) return false
  const y = Number(year), m = Number(month), d = Number(day)
  const date = new Date(y, m - 1, d)
  return currentYear - y + 1 >= 20 && currentYear - y + 1 <= 28
    && date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}
