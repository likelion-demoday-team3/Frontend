import { useEffect, useState } from 'react'
import styled from 'styled-components'
import NotificationButton from './NotificationButton'
import Store from '../../pages/Store/Store'
import { getMyWallet } from '../../features/wallet/api'
import { getAccessToken } from '../../features/auth/session'

export default function PageHeader({ title, gems = 5, onGemsChange }: { title: string; gems?: number; onGemsChange?: (gems: number) => void }) {
  const [shopOpen, setShopOpen] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    if (!getAccessToken()) { setBalance(null); return }
    let active = true
    getMyWallet().then(wallet => { if (active) setBalance(wallet.gemBalance) }).catch(() => { if (active) setBalance(null) })
    return () => { active = false }
  }, [gems])

  function updateGems(value: number) {
    setBalance(value)
    onGemsChange?.(value)
  }

  return <>
    <Header aria-label={title}>
    <NotificationButton className="notifications" />
    <h1>{title}</h1>
    <div className="gem-balance" aria-label={balance === null ? '보석 잔액을 불러올 수 없음' : `보석 ${balance}개`}>
      <span className="gem" aria-hidden="true">◆</span>
      <span>{balance === null ? '—' : `${balance}개`}</span>
      <button className="plus" type="button" onClick={() => setShopOpen(true)} aria-label="보석 충전 열기">+</button>
    </div>
    </Header>
    <Store embedded open={shopOpen} initialGems={balance ?? 0} onGemsChange={updateGems} onClose={() => setShopOpen(false)} />
  </>
}

const Header = styled.header`
  display: grid;
  width: calc(100% - 1.2rem);
  margin: 1.2rem 0.6rem 0;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.8rem;
  min-height: 4.4rem;

  h1 { margin: 0; color: #00111f; font: 400 2.2rem/1 var(--display-font); text-align: center; white-space: nowrap; }
  .notifications { display: grid; width: 4.4rem; height: 4.4rem; place-items: center; justify-self: start; color: #00111f; }
  .notifications svg { width: 2.8rem; height: 2.8rem; }
  .gem-balance { display: flex; align-items: center; justify-self: end; gap: 0.5rem; padding: 0.55rem 0.8rem; border: 0.1rem solid #00111f; border-radius: 0.7rem; background: #ffffffbb; color: #00111f; font-size: 1.4rem; font-weight: 700; white-space: nowrap; }
  .gem { color: #31bfff; font-size: 1.7rem; line-height: 1; }
  .gem-balance .plus { position: relative; display: grid; width: 1.8rem; height: 1.8rem; place-items: center; padding: 0; border: 0; border-radius: 50%; background: #ffc93d; font-size: 0; }
  .gem-balance .plus::before, .gem-balance .plus::after { position: absolute; top: 50%; left: 50%; width: 0.9rem; height: 0.2rem; border-radius: 999px; background: #332400; content: ""; transform: translate(-50%, -50%); }
  .gem-balance .plus::after { transform: translate(-50%, -50%) rotate(90deg); }
`
