import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { getMyPayments, refundPaymentOrder, type PaymentHistoryItem, type PaymentRefundResponse } from '../../features/payments/nicepay'
import { getWalletHistory, type WalletHistoryItem } from '../../features/wallet/api'

const formatDate = (value: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value))
const packageByGemAmount: Record<number, { baseAmount: number; price: number }> = {
  10: { baseAmount: 10, price: 5000 },
  20: { baseAmount: 20, price: 9000 },
  22: { baseAmount: 20, price: 9000 },
  30: { baseAmount: 30, price: 13000 },
  34: { baseAmount: 30, price: 13000 },
  50: { baseAmount: 50, price: 21000 },
  60: { baseAmount: 50, price: 21000 },
  70: { baseAmount: 70, price: 29000 },
  88: { baseAmount: 70, price: 29000 },
  100: { baseAmount: 100, price: 39000 },
  130: { baseAmount: 100, price: 39000 },
}
const formatWon = (amount: number) => amount.toLocaleString('ko-KR') + '원'
const getNamedGemAmount = (productName: string) => Number(productName.match(/(\d+)\s*개/)?.[1]) || null

type RefundState = 'closed' | 'confirm' | 'success'

export default function ChargeInfo() {
  const params = new URLSearchParams(window.location.search)
  const fromChargeHistory = params.get('from') === 'charge'
  const historyHref = fromChargeHistory ? '/store/charge-history' : '/store/history'
  const historyTitle = fromChargeHistory ? '충전내역' : '이용내역'
  const entryParam = params.get('entry')
  const entry = entryParam === null ? -1 : Number(entryParam)
  const requestedOrderId = params.get('orderId') ?? ''
  const [walletRecord, setWalletRecord] = useState<WalletHistoryItem | null>(null)
  const [payment, setPayment] = useState<PaymentHistoryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refundError, setRefundError] = useState('')
  const [refundPending, setRefundPending] = useState(false)
  const [refundState, setRefundState] = useState<RefundState>('closed')
  const [refundResult, setRefundResult] = useState<PaymentRefundResponse | null>(null)

  useEffect(() => {
    let active = true
    const loadDetail = async () => {
      setLoading(true)
      setError('')
      try {
        let walletItem: WalletHistoryItem | null = null
        if (Number.isInteger(entry) && entry >= 0 && entry < 50) {
          const history = await getWalletHistory(0, 50)
          walletItem = history[entry] ?? null
          if (active) setWalletRecord(walletItem)
        } else if (!requestedOrderId) {
          throw new Error('결제 내역 위치를 확인할 수 없어요.')
        }

        const orderId = requestedOrderId || walletItem?.orderId
        if (!orderId && !walletItem) throw new Error('결제 내역을 찾을 수 없어요.')

        const payments = await getMyPayments(0, 50)
        let match = orderId ? payments.find(item => item.orderId === orderId) : undefined
        if (!match && walletItem) {
          const targetTime = new Date(walletItem.createdAt).getTime()
          const sameGemPayments = payments
            .filter(item => item.grantedGem === Math.abs(walletItem.amount))
            .map(item => ({ item, delta: Math.abs(new Date(item.paidAt || item.createdAt).getTime() - targetTime) }))
            .filter(candidate => Number.isFinite(candidate.delta) && candidate.delta <= 5 * 60 * 1000)
            .sort((a, b) => a.delta - b.delta)
          match = sameGemPayments[0]?.item
        }
        if (!match && !walletItem) throw new Error('결제 내역을 찾을 수 없어요.')
        if (active && match) setPayment(match)
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : '결제 내역을 불러오지 못했어요.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadDetail()
    return () => { active = false }
  }, [entry, requestedOrderId])

  const orderId = payment?.orderId || walletRecord?.orderId || requestedOrderId
  const isPurchase = payment?.status === 'PAID' || payment?.status === 'REFUNDED' || Boolean(walletRecord && walletRecord.amount > 0)

  async function requestRefund() {
    if (!orderId || !payment?.refundable || refundPending) return
    setRefundPending(true)
    setRefundError('')
    try {
      const result = await refundPaymentOrder(orderId)
      setRefundResult(result)
      setPayment(current => current ? { ...current, status: 'REFUNDED', refundable: false, canceledAt: new Date().toISOString() } : current)
      setRefundState('success')
    } catch (cause) {
      setRefundError(cause instanceof Error ? cause.message : '구매 취소를 처리하지 못했어요.')
    } finally {
      setRefundPending(false)
    }
  }

  const rawProductName = payment?.productName || walletRecord?.description || ''
  const isRefunded = payment?.status === 'REFUNDED' || /환불|refund/i.test(walletRecord?.description ?? '')
  const displayDate = isRefunded
    ? payment?.canceledAt || walletRecord?.createdAt || payment?.paidAt || payment?.createdAt
    : payment?.paidAt || payment?.createdAt || walletRecord?.createdAt
  const namedGemAmount = getNamedGemAmount(rawProductName)
  const gemAmount = payment?.grantedGem ?? (walletRecord && walletRecord.amount > 0 ? walletRecord.amount : 0)
  const productPackage = packageByGemAmount[namedGemAmount ?? gemAmount]
  const productName = isRefunded ? '보석 환불' : namedGemAmount ? '보석 ' + namedGemAmount + '개' : productPackage ? '보석 ' + productPackage.baseAmount + '개' : rawProductName || '확인할 수 없음'
  const paymentAmount = payment?.amount ?? walletRecord?.paymentAmount ?? productPackage?.price ?? null

  return <InfoPage>
    <header className="charge-header"><a href={historyHref} aria-label={`${historyTitle}으로 돌아가기`}>‹</a><h1>{historyTitle} 상세</h1><span /></header>
    {loading ? <p className="state">결제 내역을 불러오는 중이에요…</p> : error ? <p className="state error" role="alert">{error}</p> : !payment && !walletRecord ? <p className="state">결제 내역을 찾을 수 없어요.</p> : <main>
      <section className="detail-card" aria-label={isRefunded ? '환불 정보' : '결제 정보'}><dl>
        <div><dt>주문번호</dt><dd>{orderId || '확인할 수 없음'}</dd></div>
        <div><dt>상품명</dt><dd>{productName}</dd></div>
        <div><dt>{isRefunded ? '환불금액' : '결제금액'}</dt><dd>{paymentAmount != null ? formatWon(paymentAmount) : '확인할 수 없음'}</dd></div>
        <div><dt>{isRefunded ? '환불일시' : '결제일시'}</dt><dd>{displayDate ? formatDate(displayDate) : '확인할 수 없음'}</dd></div>
      </dl></section>
      {isPurchase && (payment?.refundable || payment?.status === 'REFUNDED') && <section className="refund-section">
        <p className="refund-policy">구매 취소는 결제일로부터 7일 이내이고, 구매한 보석을 아직 사용하지 않은 경우에만 가능합니다.</p>
        <button
          className={`refund-button${payment?.status === 'REFUNDED' ? ' refunded' : ''}`}
          type="button"
          disabled={refundPending || payment?.status === 'REFUNDED'}
          onClick={() => { setRefundError(''); setRefundState('confirm') }}
        >{payment?.status === 'REFUNDED' ? '환불 완료' : '구매 취소'}</button>
      </section>}
    </main>}

    {refundState !== 'closed' && <div className="modal-backdrop" role="presentation" onClick={() => { if (!refundPending) setRefundState('closed') }}>
      <section className="refund-dialog" role="dialog" aria-modal="true" aria-labelledby="refund-title" onClick={event => event.stopPropagation()}>
        {refundState === 'confirm' ? <>
          <h2 id="refund-title">구매를 취소할까요?</h2>
          <p>환불이 완료되면 보석 {payment?.grantedGem ?? gemAmount}개가 회수됩니다. 구매한 보석을 사용한 경우 환불할 수 없어요.</p>
          {refundError && <p className="refund-error" role="alert">{refundError}</p>}
          <div className="dialog-actions">
            <button type="button" className="secondary" disabled={refundPending} onClick={() => setRefundState('closed')}>돌아가기</button>
            <button type="button" className="confirm" disabled={refundPending} onClick={requestRefund}>{refundPending ? '환불 처리 중…' : '취소하고 환불받기'}</button>
          </div>
        </> : <>
          <h2 id="refund-title">구매 취소가 완료되었습니다</h2>
          <p>보석 {refundResult?.revokedGem ?? gemAmount}개를 회수했어요.</p>
          {refundResult && <p className="balance-result">현재 보석 잔액 {refundResult.gemBalance}개</p>}
          <button type="button" className="confirm full-width" onClick={() => { setRefundState('closed'); window.location.href = historyHref }}>확인</button>
        </>}
      </section>
    </div>}
  </InfoPage>
}

const InfoPage = styled.div`
  width: 100%; max-width: 43rem; min-height: 100dvh; margin: 0 auto; padding: 0 3rem 4rem; background: var(--background); color: var(--ink); box-shadow: 0 0 6rem #26372508;
  .charge-header { display: grid; grid-template-columns: 4.4rem 1fr 4.4rem; align-items: center; min-height: 8.6rem; padding-top: calc(2.4rem + env(safe-area-inset-top)); padding-bottom: 1.8rem; }
  .charge-header a { color: var(--ink); font-size: 3.6rem; line-height: 1; text-decoration: none; }
  .charge-header h1 { font: 400 2.2rem/1.2 var(--display-font); text-align: center; white-space: nowrap; }
  .detail-card { margin-top: 2rem; padding: .6rem 1.6rem; border: 1px solid #e1e8dc; border-radius: 1.6rem; background: white; }
  dl { margin: 0; } dl > div { display: grid; grid-template-columns: 9rem minmax(0, 1fr); align-items: start; gap: 1rem; padding: 1.5rem 0; border-bottom: 1px solid #edf0e9; } dl > div:last-child { border-bottom: 0; }
  dt { color: #7d877a; font-size: 1.25rem; } dd { margin: 0; color: #202820; font-size: 1.25rem; font-weight: 600; overflow-wrap: anywhere; }
  .refund-section { margin-top: 2.4rem; }
  .refund-policy { color: #7d877a; font-size: 1.15rem; line-height: 1.7; }
  .refund-button { width: 100%; min-height: 5rem; margin-top: 1.5rem; border: 0; border-radius: 1.2rem; background: var(--green); color: #273219; font-size: 1.35rem; font-weight: 750; }
  .refund-button:disabled { cursor: not-allowed; opacity: .5; }
  .refund-button.refunded { background: #e7eae5; color: #858b84; opacity: 1; }
  .state { margin-top: 4rem; color: #899188; text-align: center; line-height: 1.7; }
  .state.error { color: #bd5547; }
  .modal-backdrop { position: fixed; z-index: 100; inset: 0; display: grid; place-items: center; padding: 2rem; background: #18221c77; }
  .refund-dialog { width: min(100%, 36rem); padding: 3rem 2.4rem 2.4rem; border-radius: 2rem; background: var(--background); box-shadow: 0 1.5rem 5rem #1114; text-align: center; }
  .refund-dialog h2 { font: 400 2rem/1.35 var(--display-font); }
  .refund-dialog p { margin-top: 1.4rem; color: #647065; font-size: 1.25rem; line-height: 1.7; }
  .refund-dialog .refund-error { color: #bd5547; }
  .refund-dialog .balance-result { font-weight: 700; }
  .dialog-actions { display: grid; grid-template-columns: 1fr 1.5fr; gap: .8rem; margin-top: 2rem; }
  .dialog-actions button, .full-width { min-height: 4.8rem; border: 0; border-radius: 1.1rem; font-size: 1.15rem; font-weight: 700; }
  .dialog-actions .secondary { background: #edf0e9; color: #344033; }
  .dialog-actions .confirm, .full-width { background: var(--green); color: #273219; }
  .full-width { width: 100%; margin-top: 2rem; }
  .dialog-actions button:disabled { opacity: .6; }
`
