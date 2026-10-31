import { apiRequest } from '../api/client'

export type Wallet = { gemBalance: number }
export type WalletHistoryItem = {
  type: string
  description: string
  amount: number
  balanceAfter: number
  sessionId: number | null
  createdAt: string
  orderId?: string
  paymentAmount?: number | null
  paymentMethod?: string
}

export const getMyWallet = () => apiRequest<Wallet>('/wallet/my')

export const getWalletHistory = (page = 0, size = 20) =>
  apiRequest<WalletHistoryItem[]>(`/wallet/my/history?page=${page}&size=${Math.min(size, 50)}`)
