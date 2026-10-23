import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { getMyPayments, type PaymentHistoryItem } from '../../features/payments/toss'
import { getWalletHistory, type WalletHistoryItem } from '../../features/wallet/api'

const formatDate = (value: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value))
type HistoryFilter = 'all' | 'purchase' | 'refund'

function findRelatedPayment(record: WalletHistoryItem, payments: PaymentHistoryItem[]) {
  if (record.orderId) return payments.find(payment => payment.orderId === record.orderId)
  const recordTime = new Date(record.createdAt).getTime()
  return payments
    .filter(payment => payment.grantedGem === Math.abs(record.amount))
    .map(payment => {
      const timestamp = payment.status === 'REFUNDED' ? payment.canceledAt || payment.paidAt : payment.paidAt
      return { payment, difference: Math.abs(new Date(timestamp || payment.createdAt).getTime() - recordTime) }
    })
    .filter(match => Number.isFinite(match.difference) && match.difference <= 5 * 60 * 1000)
    .sort((left, right) => left.difference - right.difference)[0]?.payment
}

function isRefundRecord(record: WalletHistoryItem, payment?: PaymentHistoryItem) {
  return payment?.status === 'REFUNDED' || /환불|refund/i.test(record.type + ' ' + record.description)
}

export default function ChargeHistory() {
  const [records, setRecords] = useState<WalletHistoryItem[]>([])
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [filter, setFilter] = useState<HistoryFilter>('all')

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      getWalletHistory(0, 50),
      getMyPayments(0, 50).catch(() => [] as PaymentHistoryItem[]),
    ]).then(([items, paymentItems]) => {
      if (active) { setRecords(items); setPayments(paymentItems); setError('') }
    }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : '충전 내역을 불러오지 못했어요.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reload])

  const visibleRecords = records
    .map((record, index) => ({ record, index, payment: findRelatedPayment(record, payments) }))
    .filter(({ record, payment }) => {
      if (filter === 'all') return true
      const refund = isRefundRecord(record, payment)
      return filter === 'refund' ? refund : !refund && (payment?.status === 'PAID' || record.amount > 0)
    })

  return <HistoryPage>
    <header className="charge-header"><a href="/store" aria-label="상점으로 돌아가기">‹</a><h1>충전 내역</h1><span /></header>
    <main>
      <nav className="history-filters" aria-label="내역 필터">
        {([['all', '전체'], ['purchase', '구매'], ['refund', '환불']] as const).map(([value, label]) => (
          <button key={value} type="button" className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
        ))}
      </nav>
      {loading ? <p className="state">충전 내역을 불러오는 중이에요…</p> : error ? <div className="state error" role="alert"><p>{error}</p><button type="button" onClick={() => setReload(value => value + 1)}>다시 불러오기</button></div> : visibleRecords.length ? <div className="charge-list">
        {visibleRecords.map(({ record, index, payment }) => {
          const refunded = isRefundRecord(record, payment)
          const orderId = payment?.orderId || record.orderId
          const recordName = refunded ? '보석 환불' : record.description
          return <article className="charge-row" data-status={refunded ? 'refunded' : payment?.status?.toLowerCase() ?? 'unknown'} key={[record.createdAt, record.type, record.sessionId ?? 'none', index].join('-')}>
            <div className="charge-info"><time dateTime={record.createdAt}>{formatDate(record.createdAt)}</time><strong>{recordName}</strong><span>잔액 {record.balanceAfter}개</span></div>
            <div className="row-end"><b className={record.amount > 0 ? 'credit' : 'debit'}>{record.amount > 0 ? '+' : ''}{record.amount}개</b><a href={orderId ? '/charge-info?orderId=' + encodeURIComponent(orderId) : '/charge-info?entry=' + index}>상세</a></div>
          </article>
        })}
      </div> : <p className="state">{filter === 'all' ? '충전 내역이 없어요.' : (filter === 'purchase' ? '구매' : '환불') + ' 내역이 없어요.'}</p>}
    </main>
  </HistoryPage>
}

const HistoryPage = styled.div`
  width: 100%; max-width: 43rem; min-height: 100dvh; margin: 0 auto; padding: 0 3rem 4rem; background: var(--background); color: var(--ink); box-shadow: 0 0 6rem #26372508;
  .charge-header { display: grid; grid-template-columns: 4.4rem 1fr 4.4rem; align-items: center; min-height: 8.6rem; padding-top: calc(2.4rem + env(safe-area-inset-top)); padding-bottom: 1.8rem; }
  .charge-header a { color: var(--ink); font-size: 3.6rem; line-height: 1; text-decoration: none; }
  .charge-header h1 { font: 400 2.2rem/1.2 var(--display-font); text-align: center; }
  .history-filters { display: grid; grid-template-columns: repeat(3, 1fr); gap: .8rem; margin: 1.2rem 0 1.4rem; }
  .history-filters button { min-height: 4.2rem; border: 1px solid #dfe6da; border-radius: 99rem; background: #fff; color: #647065; font-size: 1.2rem; font-weight: 600; }
  .history-filters button.active { border-color: var(--green); background: var(--green); color: #26321a; }
  .charge-list { display: grid; gap: 1rem; margin-top: 1.4rem; }
  .charge-row { display: flex; min-height: 8rem; align-items: center; justify-content: space-between; gap: 1.2rem; padding: 1.5rem; border: 1px solid #e1e8dc; border-radius: 1.6rem; background: white; }
  .charge-info { display: grid; min-width: 0; gap: .6rem; }
  .charge-info time, .charge-info span { color: #7d877a; font-size: 1.1rem; }
  .charge-info strong { overflow-wrap: anywhere; color: #202820; font-size: 1.35rem; }
  .row-end { display: grid; flex: 0 0 auto; justify-items: end; gap: .7rem; }
  .charge-row b { font-size: 1.4rem; }
  .row-end a { color: #6b782f; font-size: 1.1rem; }
  .credit { color: #66852b; } .debit { color: #647065; }
  .state { margin-top: 4rem; color: #899188; font-size: 1.35rem; text-align: center; line-height: 1.7; }
  .state button { margin-top: 1rem; padding: 1rem 1.6rem; border: 0; border-radius: 1rem; background: var(--green); font-weight: 700; }
`
