import { apiRequest } from '../api/client'

export async function sendCode(email: string) {
  await apiRequest<null>('/auth/email/code', { method: 'POST', body: { email }, authenticated: false })
}

export async function verifyCode(email: string, code: string) {
  const data = await apiRequest<{ signupToken: string }>('/auth/email/verify', { method: 'POST', body: { email, code }, authenticated: false })
  return data.signupToken
}

export type SignupRequest = {
  // The verified email is represented by signupToken in the current API contract.
  signupToken: string
  name: string
  password: string
  gender: 'MALE' | 'FEMALE'
  birthDate: string
  phoneNumber?: string
  instagramId?: string
}

export type AuthTokens = {
  accessToken: string
  tokenType?: string
  refreshToken?: string
}

export async function signup(body: SignupRequest) {
  return apiRequest<AuthTokens>('/auth/signup', { method: 'POST', body, authenticated: false })
}

export async function login(email: string, password: string) {
  return apiRequest<AuthTokens>('/auth/login', { method: 'POST', body: { email, password }, authenticated: false })
}
