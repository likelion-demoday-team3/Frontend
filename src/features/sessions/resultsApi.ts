import { apiRequest } from '../api/client'

export type OwnVote = { submitted: boolean; rankedMemberIds: number[] }
export type VoteSummary = { sessionId: number; coupleCount: number }
export type ResultProduct = 'FIRST_CHOOSERS' | 'MY_FIRST_CHOICE_RANK' | 'USER_RANKINGS' | 'ALL_RANKINGS' | 'BUNDLE'
export type ResultProductInfo = { product: ResultProduct; priceGem: number; targetRequired: boolean }
export type ResultPerson = { memberId: number; alias: string }
export type ResultDetails = {
  product: ResultProduct
  firstChoosers: ResultPerson[]
  myRank: { myFirstChoice: ResultPerson; rankOfMe: number | null; submitted: boolean } | null
  rankings: Array<{ voter: ResultPerson; submitted: boolean; choices: Array<{ rank: number; target: ResultPerson }> }>
}
export type ResultPurchase = { chargedGem: number; newPurchase: boolean; data: ResultDetails }

export const getOwnVote = (sessionId: number) =>
  apiRequest<OwnVote>(`/api/sessions/${sessionId}/votes/me`)

export const getVoteSummary = (sessionId: number) =>
  apiRequest<VoteSummary>(`/api/sessions/${sessionId}/results/summary`)

export const getResultProducts = (sessionId: number) =>
  apiRequest<ResultProductInfo[]>(`/api/sessions/${sessionId}/results/products`)

export const purchaseResult = (sessionId: number, product: ResultProduct, targetId?: number) =>
  apiRequest<ResultPurchase>(`/api/sessions/${sessionId}/results/purchases`, {
    method: 'POST', body: { product, ...(targetId === undefined ? {} : { targetId }) },
  })

export const getResultDetails = (sessionId: number, product: ResultProduct, targetId?: number) => {
  const query = new URLSearchParams({ product })
  if (targetId !== undefined) query.set('targetId', String(targetId))
  return apiRequest<ResultDetails>(`/api/sessions/${sessionId}/results/items?${query}`)
}
