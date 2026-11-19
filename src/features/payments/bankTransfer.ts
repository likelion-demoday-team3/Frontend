import { apiRequest } from '../api/client'

// 계좌이체 충전. 입금 신청 → 안내된 계좌로 입금 → 운영자가 입금을 확인하고 승인하면 보석이 들어온다.
// 신청 내역은 getMyPayments(/payments/my)에 method: 'BANK_TRANSFER'로 함께 나온다 (status READY = 입금 대기)

export type BankAccount = {
  /** 계좌 설정이 없으면 false (입금 신청을 받지 않는다) */
  available: boolean
  bankName: string | null
  accountNumber: string | null
  accountHolder: string | null
}

export type BankTransferDeposit = {
  orderId: string
  productName: string
  amount: number
  grantedGem: number
  depositorName: string
  account: BankAccount
  createdAt: string
}

export type BankTransferStatus = 'READY' | 'PAID' | 'FAILED'

export type AdminBankTransfer = {
  orderId: string
  status: BankTransferStatus | 'REFUNDED'
  productName: string | null
  amount: number
  grantedGem: number
  depositorName: string
  memberId: number
  memberName: string | null
  memberEmail: string | null
  createdAt: string
  paidAt: string | null
  canceledAt: string | null
  cancelReason: string | null
}

export const getBankAccount = () =>
  apiRequest<BankAccount>('/payments/bank-transfer/account')

export const requestBankTransfer = (productId: number, depositorName: string) =>
  apiRequest<BankTransferDeposit>('/payments/bank-transfer', {
    method: 'POST',
    body: { productId, depositorName },
  })

/** 입금 전 본인 신청 취소 */
export const cancelBankTransfer = (orderId: string) =>
  apiRequest<null>(`/payments/bank-transfer/${encodeURIComponent(orderId)}/cancel`, { method: 'POST' })

// ===== 운영자 =====

export const getAdminBankTransfers = (status?: BankTransferStatus) =>
  apiRequest<AdminBankTransfer[]>(status ? `/admin/bank-transfers?status=${status}` : '/admin/bank-transfers')

export const approveBankTransfer = (orderId: string) =>
  apiRequest<null>(`/admin/bank-transfers/${encodeURIComponent(orderId)}/approve`, { method: 'POST' })

export const rejectBankTransfer = (orderId: string, reason?: string) =>
  apiRequest<null>(`/admin/bank-transfers/${encodeURIComponent(orderId)}/reject`, {
    method: 'POST',
    body: { reason: reason?.trim() || null },
  })

/** 계좌번호를 복사한다. 클립보드를 쓸 수 없으면 false */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
