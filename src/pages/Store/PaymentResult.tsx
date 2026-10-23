import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { ApiError } from '../../features/api/client'
import { abortKakaoPayOrder, approveKakaoPayOrder } from '../../features/payments/kakaopay'

type CallbackAction = 'success' | 'cancel' | 'fail'

type PaymentNotice = {
  status: 'success' | 'cancelled' | 'failed'
  grantedGem?: number
  gemBalance?: number
  message?: string
}

function returnToStore(notice: PaymentNotice) {
  try {
    sessionStorage.setItem('kiiwee-payment-result', JSON.stringify(notice))
  } catch {
    // The store still opens with a generic status if session storage is unavailable.
  }
  window.location.replace(`/store?payment=${notice.status}`)
}

export default function PaymentResult() {
  const callback = window.location.pathname.match(/^\/shop\/payment\/([^/]+)\/(success|cancel|fail)$/)
  const orderId = callback?.[1] ?? ''
  const action = callback?.[2] as CallbackAction | undefined
  const pgToken = new URLSearchParams(window.location.search).get('pg_token') ?? ''
  const started = useRef(false)
  const [message, setMessage] = useState('결제 결과를 확인하고 있어요. 잠시만 기다려주세요.')

  useEffect(() => {
    if (!action || !orderId) {
      setMessage('결제 정보를 확인할 수 없어요. 보석 상점으로 돌아가주세요.')
      return
    }
    if (started.current) return
    started.current = true

    if (action === 'success') {
      if (!pgToken) {
        returnToStore({ status: 'failed', message: '결제 승인 정보가 없어 보석을 충전하지 못했어요. 다시 시도해주세요.' })
        return
      }
      approveKakaoPayOrder(orderId, pgToken).then(result => {
        returnToStore({ status: 'success', grantedGem: result.grantedGem, gemBalance: result.gemBalance })
      }).catch(cause => {
        if (cause instanceof ApiError && cause.status === 401) return
        returnToStore({ status: 'failed', message: cause instanceof Error ? cause.message : '결제에 실패했어요. 다시 시도해주세요.' })
      })
      return
    }

    abortKakaoPayOrder(orderId).then(() => {
      returnToStore({
        status: action === 'cancel' ? 'cancelled' : 'failed',
        ...(action === 'fail' ? { message: '결제에 실패했어요. 다시 시도해주세요.' } : {}),
      })
    }).catch(cause => {
      if (cause instanceof ApiError && cause.status === 401) return
      returnToStore({
        status: 'failed',
        message: cause instanceof Error ? cause.message : '결제 중단을 처리하지 못했어요. 상점에서 다시 확인해주세요.',
      })
    })
  }, [action, orderId, pgToken])

  return <ResultPage>
    <a className="back" href="/store" aria-label="보석 상점으로 돌아가기">‹</a>
    <main>
      <div className="status-icon" aria-hidden="true">…</div>
      <h1>결제 처리 중</h1>
      <p>{message}</p>
      <a className="primary" href="/store">보석 상점으로</a>
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
