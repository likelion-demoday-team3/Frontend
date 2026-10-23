import styled from 'styled-components'

type NavBarProps = {
  isLoggedIn: boolean
  onLoginRequired: () => void
  activePage?: 'home' | 'store' | 'mypage'
}

function StoreIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v10h18V10M2 10l2-6h16l2 6a3 3 0 0 1-5 2 3 3 0 0 1-5 0 3 3 0 0 1-5 0 3 3 0 0 1-5-2ZM9 20v-6h6v6" /></svg>
}

function HomeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7" /></svg>
}

function ProfileIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
}

export default function NavBar({ isLoggedIn, onLoginRequired, activePage = 'home' }: NavBarProps) {
  function selectRestrictedPage() {
    if (!isLoggedIn) onLoginRequired()
  }

  return <NavBarStyles aria-label="주요 메뉴">
    {isLoggedIn ? <a className={`nav-item${activePage === 'store' ? ' active' : ''}`} href="/store" aria-label="보석 상점" aria-current={activePage === 'store' ? 'page' : undefined}>
      <StoreIcon />
      <span>보석 상점</span>
    </a> : <button type="button" className={`nav-item${activePage === 'store' ? ' active' : ''}`} onClick={selectRestrictedPage} aria-label="보석 상점">
      <StoreIcon />
      <span>보석 상점</span>
    </button>}
    <a className={`nav-item${activePage === 'home' ? ' active' : ''}`} href="/home" aria-current={activePage === 'home' ? 'page' : undefined} aria-label="홈">
      <HomeIcon />
      <span>홈</span>
    </a>
    {isLoggedIn ? <a className={`nav-item${activePage === 'mypage' ? ' active' : ''}`} href="/mypage" aria-current={activePage === 'mypage' ? 'page' : undefined} aria-label="마이페이지">
      <ProfileIcon />
      <span>마이페이지</span>
    </a> : <button type="button" className="nav-item" onClick={selectRestrictedPage} aria-label="마이페이지">
      <ProfileIcon />
      <span>마이페이지</span>
    </button>}
  </NavBarStyles>
}

const NavBarStyles = styled.nav`
  position: fixed;
  z-index: 15;
  left: 50%;
  bottom: 0;
  display: flex;
  width: 100%;
  max-width: 43rem;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 3rem calc(1.2rem + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  border-radius: 2.4563rem 2.4563rem 0 0;
  background: var(--white);
  box-shadow: 0 2px 10px 0 rgba(43, 48, 44, 0.30);

  .nav-item {
    display: flex;
    min-width: 5.2rem;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0;
    border: 0;
    background: transparent;
    color: #858b86;
    font: 600 1.2rem/1.2 var(--font-body);
    text-align: center;
    text-decoration: none;
    white-space: nowrap;
  }

  .nav-item svg {
    width: 2.4rem;
    height: 2.4rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .nav-item.active { color: #101411; }

  @media (max-width: 37.4rem) {
    padding-right: 3rem;
    padding-left: 3rem;
  }
`
