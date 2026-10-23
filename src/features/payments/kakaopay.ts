import { apiRequest } from '../api/client'

/** KakaoPay checkout URLs returned by the backend after creating an order. */
export type KakaoPayReadyResponse = {
  orderId: string
  gemAmount: number
  pcRedirectUrl: string
  mobileRedirectUrl: string
  appRedirectUrl: string
}

export type ShopProduct = {
  productId: number
  name: string
  gemAmount: number
  price: number
  salePrice: number | null
}

export type KakaoPayApproveResponse = {
  orderId: string
  grantedGem: number
  gemBalance: number
}

export type PaymentHistoryItem = {
  orderId: string
  productName: string
  grantedGem: number
  paymentAmount?: number
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
  apiRequest<ShopProduct[]>('/shop/products')

export const createGemPaymentOrder = (productId: number) =>
  apiRequest<KakaoPayReadyResponse>('/payments/kakaopay/ready', {
    method: 'POST',
    body: { productId },
  })

export const approveKakaoPayOrder = (orderId: string, pgToken: string) =>
  apiRequest<KakaoPayApproveResponse>('/payments/kakaopay/approve', {
    method: 'POST',
    body: { orderId, pgToken },
  })

export const getMyPayments = (page = 0, size = 20) =>
  apiRequest<PaymentHistoryItem[]>(`/payments/my?page=${page}&size=${Math.min(size, 50)}`)

/** Aborts a payment order after KakaoPay cancellation/failure. */
export const abortKakaoPayOrder = (orderId: string) =>
  apiRequest<null>(`/payments/${encodeURIComponent(orderId)}/abort`, {
    method: 'POST',
  })

/** Refunds an order owned by the authenticated user; the endpoint has no request body. */
export const refundKakaoPayOrder = (orderId: string) =>
  apiRequest<PaymentRefundResponse>(`/payments/${encodeURIComponent(orderId)}/refund`, {
    method: 'POST',
  })
