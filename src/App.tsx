import Router from './Router'
import { setAccessToken } from './features/auth/session'
import { GlobalStyles } from './styles/GlobalStyles'

export default function App() {
  // 개발용 목업 자동 로그인은 브라우저 저장소를 사용하고, 일반 로그인은 자동 로그인 선택에 따릅니다.
  return <>
    <GlobalStyles />
    <Router onAuthenticated={setAccessToken} />
  </>
}
