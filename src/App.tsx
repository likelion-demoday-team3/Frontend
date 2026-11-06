import Router from './Router'
import { setAccessToken } from './features/auth/session'
import { GlobalStyles } from './styles/GlobalStyles'
import ScreenPreviewPanel from './test/ScreenPreviewPanel'
import { installErrorCapture } from './features/errorReports/autoCapture'

// 앱에서 생긴 에러를 자동으로 모아 개발자에게 보낸다 (로그인한 경우에만 전송)
installErrorCapture()

export default function App() {
  // 개발용 목업 자동 로그인은 브라우저 저장소를 사용하고, 일반 로그인은 자동 로그인 선택에 따릅니다.
  return <>
    <GlobalStyles />
    <Router onAuthenticated={setAccessToken} />
    <ScreenPreviewPanel />
  </>
}
