import { apiRequest } from '../api/client'

export type TossReadyResponse = {
  orderId: string
  orderName: string
  amount: number
  gemAmount: number
  clientKey: string
  successUrl: string
  failUrl: string
}

export type ShopProduct = {
  productId: number
  name: string
  gemAmount: number
  price: number
  salePrice: number | null
}

export type TossConfirmResponse = {
  orderId: string
  grantedGem: number
  gemBalance: number
}

export type PaymentHistoryItem = {
  orderId: string
  productName: string
  grantedGem: number
  amount?: number
  status: 'PAID' | 'REFUNDED'
  refundable: boolean
  paidAt: string
  canceledAt: string | null
  createdAt: string
}

export type PaymentRefundResponse = {
  orderId: string
  revokedGem: number
  gemBalance: number
}

export const getShopProducts = () =>
  apiRequest<ShopProduct[]>('/shop/products', { authenticated: 'optional' })

export const createTossPaymentOrder = (productId: number) =>
  apiRequest<TossReadyResponse>('/payments/toss/ready', {
    method: 'POST',
    body: { productId },
  })

export const confirmTossPayment = (input: {
  orderId: string
  paymentKey: string
  amount: number
}) =>
  apiRequest<TossConfirmResponse>('/payments/toss/confirm', {
    method: 'POST',
    body: input,
  })

export const getMyPayments = (page = 0, size = 20) =>
  apiRequest<PaymentHistoryItem[]>(`/payments/my?page=${page}&size=${Math.min(size, 50)}`)

/** Aborts a pending payment order after SDK failure or checkout cancellation. */
export const abortTossPaymentOrder = (orderId: string) =>
  apiRequest<null>(`/payments/${encodeURIComponent(orderId)}/abort`, {
    method: 'POST',
  })

/** Refunds an order owned by the authenticated user; the endpoint has no request body. */
export const refundTossPaymentOrder = (orderId: string) =>
  apiRequest<PaymentRefundResponse>(`/payments/${encodeURIComponent(orderId)}/refund`, {
    method: 'POST',
  })
