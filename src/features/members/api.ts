import { apiRequest } from '../api/client'

const localNameKey = (email: string) => `kiiwee.memberName:${email.trim().toLowerCase()}`

export type Member = {
  publicId: string
  email: string
  name?: string | null
  university: string
  gender: 'MALE' | 'FEMALE'
  birthDate: string
  phoneNumber: string | null
  instagramId: string | null
  identityVerifiedAt?: string | null
}

export const getMyMember = () => apiRequest<Member>('/members/my')

export type IdentityVerificationRequest = {
  storeId: string
  channelKey: string
  identityVerificationId: string
}

export type IdentityVerificationConfirmation = {
  verified: boolean
  verifiedAt: string
}

export const requestMyIdentityVerification = () =>
  apiRequest<IdentityVerificationRequest>('/members/my/identity-verification/request', { method: 'POST' })

export const confirmMyIdentityVerification = (identityVerificationId: string) =>
  apiRequest<IdentityVerificationConfirmation>('/members/my/identity-verification/confirm', {
    method: 'POST',
    body: { identityVerificationId },
  })

export type MemberProfile = {
  university: string
  idealType: string | null
  datingStyle: string | null
  contactStyle: string | null
  loveStyle: string | null
  interests: string[]
}

export type UpdateMemberProfile = Omit<MemberProfile, 'university'>

export const getMyProfile = () => apiRequest<MemberProfile>('/members/my/profile')

export const updateMyProfile = (profile: UpdateMemberProfile) =>
  apiRequest<MemberProfile>('/members/my/profile', { method: 'PUT', body: profile })

export const updateMyPhone = (phoneNumber: string) =>
  apiRequest<null>('/members/my/phone', { method: 'PUT', body: { phoneNumber } })

export const updateMyPassword = (currentPassword: string, newPassword: string) =>
  apiRequest<null>('/members/my/password', {
    method: 'PATCH',
    body: { currentPassword, newPassword },
  })

export const deleteMyMember = () => apiRequest<null>('/members/my', { method: 'DELETE' })

// The current backend member DTO has no name field. Keep the signup name locally
// until the backend adds name to its signup and member APIs.
export const getLocalMemberName = (email: string) =>
  window.localStorage.getItem(localNameKey(email))

export const setLocalMemberName = (email: string, name: string) =>
  window.localStorage.setItem(localNameKey(email), name.trim())

export const removeLocalMemberName = (email: string) =>
  window.localStorage.removeItem(localNameKey(email))
