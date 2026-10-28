import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { ApiError } from '../../features/api/client'
import { abortPaymentOrder } from '../../features/payments/nicepay'
import { clearPaymentReturnLocation, getPaymentReturnLocation } from '../../features/payments/returnLocation'

type CallbackAction = 'success' | 'fail'

type PaymentNotice = {
  status: 'success' | 'cancelled' | 'failed'
  grantedGem?: number
  gemBalance?: number
  message?: string
}

function returnToOrigin(notice: PaymentNotice) {
  try {
    sessionStorage.setItem('kiiwee-payment-result', JSON.stringify(notice))
  } catch {
    // The store still opens with a generic status if session storage is unavailable.
  }
  const { href } = getPaymentReturnLocation(notice.status)
  clearPaymentReturnLocation()
  window.location.replace(href)
}

const toCount = (value: string | null) => {
  const count = Number(value)
  return value !== null && Number.isSafeInteger(count) && count >= 0 ? count : undefined
}

// 나이스페이 결제창 인증 결과는 백엔드(/payments/nicepay/return)가 받아 승인까지 끝낸 뒤 이 페이지로 보낸다.
// success: ?grantedGem=&gemBalance=  /  fail: ?code=&message=
export default function PaymentResult() {
  const callback = window.location.pathname.match(/^\/shop\/payment\/([^/]+)\/(success|fail)$/)
  const orderId = callback?.[1] ?? ''
  const action = callback?.[2] as CallbackAction | undefined
  const params = new URLSearchParams(window.location.search)
  const grantedGem = toCount(params.get('grantedGem'))
  const gemBalance = toCount(params.get('gemBalance'))
  const failureMessage = params.get('message') ?? ''
  const started = useRef(false)
  const [message, setMessage] = useState('결제 결과를 확인하고 있어요. 잠시만 기다려주세요.')

  useEffect(() => {
    if (!action || !orderId) {
      setMessage('결제 정보를 확인할 수 없어요. 결제를 시작한 화면으로 돌아가주세요.')
      return
    }
    if (started.current) return
    started.current = true

    if (action === 'success') {
      returnToOrigin({ status: 'success', grantedGem, gemBalance })
      return
    }

    const failed = () => returnToOrigin({
      status: 'failed',
      message: failureMessage || '결제에 실패했어요. 다시 시도해주세요.',
    })
    if (orderId === 'unknown') {
      failed()
      return
    }
    // 백엔드가 대부분 실패 처리를 끝냈지만, 승인 전에 거절된 주문이 대기 상태로 남지 않게 한 번 더 정리한다.
    abortPaymentOrder(orderId).then(failed).catch(cause => {
      if (cause instanceof ApiError && cause.status === 401) return
      failed()
    })
  }, [action, failureMessage, gemBalance, grantedGem, orderId])

  const returnLocation = getPaymentReturnLocation()
  return <ResultPage>
    <a className="back" href={returnLocation.href} aria-label="결제를 시작한 화면으로 돌아가기">‹</a>
    <main>
      <div className="status-icon" aria-hidden="true">…</div>
      <h1>결제 처리 중</h1>
      <p>{message}</p>
      <a className="primary" href={returnLocation.href}>결제를 시작한 화면으로</a>
    </main>
  </ResultPage>
}

const ResultPage = styled.div`
  position: relative; width: 100%; max-width: 43rem; min-height: 100dvh; margin: 0 auto; padding: 0 3rem; background: var(--background); color: var(--ink); box-shadow: 0 0 6rem #26372508;
  .back { position: absolute; top: calc(2.4rem + env(safe-area-inset-top)); left: 3rem; display: inline-block; color: var(--ink); font-size: 3.6rem; line-height: 1; text-decoration: none; }
  main { display: flex; min-height: 100dvh; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .status-icon { display: grid; width: 7rem; height: 7rem; place-items: center; border-radius: 50%; background: #eff2eb; color: #68736a; font-size: 3.2rem; font-weight: 700; }
  h1 { margin-top: 2rem; font: 400 2.4rem/1.3 var(--display-font); }
  main > p { margin-top: 1rem; color: #7d877a; font-size: 1.35rem; line-height: 1.7; }
  .primary { display: grid; width: 100%; min-height: 5rem; place-items: center; margin-top: 2.4rem; border-radius: 1.2rem; background: var(--green); color: #273219; font-size: 1.4rem; font-weight: 750; text-decoration: none; }
`
