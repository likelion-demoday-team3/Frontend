import { useEffect, useState } from "react";
import styled from "styled-components";
import Router from "./Router";
import { setAccessToken } from "./features/auth/session";
import { GlobalStyles } from "./styles/GlobalStyles";
import ScreenPreviewPanel from "./test/ScreenPreviewPanel";
import { installErrorCapture } from "./features/errorReports/autoCapture";

// 앱에서 생긴 에러를 자동으로 모아 개발자에게 보낸다 (로그인한 경우에만 전송)
installErrorCapture();

export default function App() {
  const [showThumbnail, setShowThumbnail] = useState(true);
  const [fadingThumbnail, setFadingThumbnail] = useState(false);
  const [thumbnailReady, setThumbnailReady] = useState(false);

  useEffect(() => {
    if (!thumbnailReady) return;
    const fadeTimeout = window.setTimeout(() => setFadingThumbnail(true), 1600);
    const hideTimeout = window.setTimeout(() => setShowThumbnail(false), 2000);
    return () => {
      window.clearTimeout(fadeTimeout);
      window.clearTimeout(hideTimeout);
    };
  }, [thumbnailReady]);

  // 개발용 목업 자동 로그인은 브라우저 저장소를 사용하고, 일반 로그인은 자동 로그인 선택에 따릅니다.
  return (
    <>
      <GlobalStyles />
      <Router onAuthenticated={setAccessToken} />
      <ScreenPreviewPanel />
      {showThumbnail && (
        <ThumbnailSplash
          $fading={fadingThumbnail}
          role="status"
          aria-label="Kiiwee 시작 화면"
        >
          <img
            src="/thumbnail.svg"
            alt="Kiiwee"
            onLoad={() => setThumbnailReady(true)}
            onError={() => setThumbnailReady(true)}
          />
        </ThumbnailSplash>
      )}
    </>
  );
}

const ThumbnailSplash = styled.div<{ $fading: boolean }>`
  position: fixed;
  z-index: 10000;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #fcfffb;
  opacity: ${({ $fading }) => ($fading ? 0 : 1)};
  pointer-events: ${({ $fading }) => ($fading ? "none" : "auto")};
  transition: opacity 500ms ease;

  img {
    display: block;
    width: min(100vw, 43rem);
    height: 100dvh;
    object-fit: contain;
    transform: scale(1.12);
    transform-origin: center;
  }
`;
