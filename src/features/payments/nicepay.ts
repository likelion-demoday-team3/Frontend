import { apiRequest } from '../api/client'

export type NicePayReadyResponse = {
  orderId: string
  goodsName: string
  amount: number
  gemAmount: number
  clientId: string
  returnUrl: string
}

export type ShopProduct = {
  productId: number
  name: string
  gemAmount: number
  price: number
  salePrice: number | null
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

// 백엔드는 /shop/products도 로그인을 요구하므로 비로그인은 상품을 볼 수 없다.
export const getShopProducts = () =>
  apiRequest<ShopProduct[]>('/shop/products', { authenticated: true })

export const createNicePayOrder = (productId: number) =>
  apiRequest<NicePayReadyResponse>('/payments/nicepay/ready', {
    method: 'POST',
    body: { productId },
  })

export const getMyPayments = (page = 0, size = 20) =>
  apiRequest<PaymentHistoryItem[]>(`/payments/my?page=${page}&size=${Math.min(size, 50)}`)

/** Aborts a pending payment order after SDK failure or checkout cancellation. */
export const abortPaymentOrder = (orderId: string) =>
  apiRequest<null>(`/payments/${encodeURIComponent(orderId)}/abort`, {
    method: 'POST',
  })

/** Refunds an order owned by the authenticated user; the endpoint has no request body. */
export const refundPaymentOrder = (orderId: string) =>
  apiRequest<PaymentRefundResponse>(`/payments/${encodeURIComponent(orderId)}/refund`, {
    method: 'POST',
  })

// ===== 나이스페이 결제창 (https://github.com/nicepayments/nicepay-manual) =====
// 샌드박스·운영 모두 같은 스크립트를 쓴다. 어느 쪽인지는 clientId로 정해진다.
const NICEPAY_SDK_URL = 'https://pay.nicepay.co.kr/v1/js/'

type NicePayRequest = {
  clientId: string
  method: 'card'
  orderId: string
  amount: number
  goodsName: string
  returnUrl: string
  fnError: (result: { errorMsg?: string }) => void
}

declare global {
  interface Window {
    AUTHNICE?: { requestPay: (request: NicePayRequest) => void }
  }
}

let sdkLoading: Promise<void> | null = null

function loadNicePaySdk(): Promise<void> {
  if (window.AUTHNICE) return Promise.resolve()
  sdkLoading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = NICEPAY_SDK_URL
    script.async = true
    script.onload = () => (window.AUTHNICE ? resolve() : reject(new Error('결제창을 불러오지 못했어요.')))
    script.onerror = () => reject(new Error('결제창을 불러오지 못했어요. 잠시 후 다시 시도해주세요.'))
    document.head.appendChild(script)
  }).catch(cause => {
    sdkLoading = null
    throw cause
  })
  return sdkLoading
}

/**
 * 나이스페이 결제창을 연다. 인증이 끝나면 나이스페이가 returnUrl(백엔드)로 결과를 보내고,
 * 백엔드가 승인한 뒤 /shop/payment/{orderId}/success|fail 로 돌려보낸다.
 * 결제창을 닫거나 오류가 나면 returnUrl로 가지 않고 reject된다.
 */
export async function openNicePayCheckout(order: NicePayReadyResponse): Promise<void> {
  await loadNicePaySdk()
  const sdk = window.AUTHNICE
  if (!sdk) throw new Error('결제창을 불러오지 못했어요.')
  return new Promise<void>((_resolve, reject) => {
    sdk.requestPay({
      clientId: order.clientId,
      method: 'card',
      orderId: order.orderId,
      amount: order.amount,
      goodsName: order.goodsName,
      returnUrl: order.returnUrl,
      fnError: result => reject(new Error(result?.errorMsg || '결제를 진행하지 못했어요.')),
    })
  })
}
