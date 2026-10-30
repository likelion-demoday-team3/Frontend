import { useState } from "react";
import styled from "styled-components";

const sessionPreviews = [
  { label: "입장 대기 · 입장까지 10분 이상", mode: "waiting-upcoming" },
  { label: "입장 가능 · 시작 2분 전", mode: "waiting-open" },
  { label: "입장 마감 · 시작 후 1분 경과", mode: "waiting-closed" },
  { label: "로비 · 참가자와 내 프로필", mode: "lobby" },
  { label: "다음 대화 대기 · 로비", mode: "idle" },
  { label: "최종 선택 · 참가자 목록", mode: "hearts" },
  { label: "최종 선택 · 하트 충전 팝업", mode: "heart-charge" },
  { label: "최종 선택 · 하트 제한 팝업", mode: "heart-restriction" },
  { label: "1:1 대화 · 기본 화면", mode: "one-to-one" },
  { label: "1:1 대화 · 프로필 카드 열림", mode: "one-to-one-profile" },
  { label: "1:1 대화 · 신고 창 열림", mode: "one-to-one-report" },
  { label: "1:1 대화 · 프로필 정보 없음", mode: "one-to-one-empty-profile" },
  { label: "1:1 대화 · 5분 남음 안내", mode: "call-5m" },
  { label: "1:1 대화 · 1분 남음 안내", mode: "call-1m" },
  { label: "1:1 대화 · 10초 카운트다운", mode: "call-urgent" },
  { label: "최종 투표 화면", mode: "vote" },
] as const;

const notificationPreviews = [
  { label: "알림함 · 전체 목록", query: "preview=notifications" },
  { label: "알림함 · 도착한 알림 없음", query: "preview=notifications-empty" },
  { label: "하트 도착 팝업", query: "preview=notifications&notice=heart" },
  { label: "연락처 요청 팝업", query: "preview=notifications&notice=contact" },
  { label: "연락처 응답 팝업", query: "preview=notifications&notice=accepted" },
  { label: "연락처 도착 팝업", query: "preview=notifications&notice=share" },
] as const;

const resultPreviews = [
  { label: "매칭 결과 · 응답 대기", mode: "matched" },
  { label: "매칭 결과 · 서로 수락", mode: "mutual" },
  { label: "매칭 실패", mode: "failed" },
];

const contactPreviews = [
  { label: "연락처 · 전체 상태 예시", mode: "all" },
  { label: "연락처 · 응답 대기", mode: "pending" },
  { label: "연락처 · 도착한 정보", mode: "received" },
  { label: "연락처 · 상태 없음", mode: "empty" },
];

/** 로컬 화면 검토용 바로가기. API 호출이나 DB 변경 없이 샘플 화면을 엽니다. */
export default function ScreenPreviewPanel() {
  const params = new URLSearchParams(window.location.search);
  const [open, setOpen] = useState(false);
  if (!import.meta.env.DEV && !params.has("showTest")) return null;

  return (
    <PreviewDock>
      {open && (
        <Panel aria-label="화면 미리보기 목록">
          <PanelHeader>
            <div>
              <strong>화면 미리보기</strong>
              <small>샘플 화면 · 실제 데이터 변경 없음</small>
            </div>
            <button
              type="button"
              className="close"
              aria-label="미리보기 메뉴 닫기"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </PanelHeader>

          <PreviewGroup open>
            <summary>세션 진행</summary>
            {sessionPreviews.map(({ label, mode }) => (
              <a
                key={mode}
                href={`/session/1?preview=${mode}&showTest=1`}
              >
                {label}
              </a>
            ))}
          </PreviewGroup>

          <PreviewGroup>
            <summary>알림</summary>
            {notificationPreviews.map(({ label, query }) => (
              <a key={query} href={`/session/1?${query}&showTest=1`}>
                {label}
              </a>
            ))}
          </PreviewGroup>

          <PreviewGroup>
            <summary>투표 결과</summary>
            {resultPreviews.map(({ label, mode }) => (
              <a key={mode} href={`/result?preview=${mode}&showTest=1`}>
                {label}
              </a>
            ))}
            <a href="/result-detail?preview=sample&showTest=1">
              결과 상세 · 항목별 열람
            </a>
          </PreviewGroup>

          <PreviewGroup>
            <summary>연락처 교환</summary>
            {contactPreviews.map(({ label, mode }) => (
              <a
                key={mode}
                href={`/contact?sessionId=1&preview=${mode}&showTest=1`}
              >
                {label}
              </a>
            ))}
          </PreviewGroup>
        </Panel>
      )}
      <Toggle
        type="button"
        aria-expanded={open}
        aria-controls="screen-preview-panel"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "미리보기 닫기" : "화면 미리보기"}
      </Toggle>
    </PreviewDock>
  );
}

const PreviewDock = styled.aside`
  position: fixed;
  z-index: 1000;
  top: 50%;
  right: max(1rem, calc((100vw - 43rem) / 2 - 34rem));
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.8rem;
  transform: translateY(-50%);

  @media (max-width: 78rem) {
    top: auto;
    right: auto;
    bottom: calc(1rem + env(safe-area-inset-bottom));
    left: 1rem;
    align-items: flex-start;
    transform: none;
  }
`;

const Toggle = styled.button`
  min-height: 3.6rem;
  padding: 0.8rem 1.2rem;
  border: 1px solid #dfe5dc;
  border-radius: 999px;
  background: #00111f;
  color: white;
  box-shadow: 0 0.4rem 1.5rem #26372524;
  font: 600 1.1rem/1.2 var(--font-body, sans-serif);
  cursor: pointer;
`;

const Panel = styled.nav.attrs({ id: "screen-preview-panel" })`
  display: flex;
  width: min(33rem, calc(100vw - 2rem));
  box-sizing: border-box;
  max-height: min(72dvh, 58rem);
  flex-direction: column;
  gap: 0.8rem;
  overflow-y: auto;
  padding: 1.2rem;
  border: 1px solid #dfe5dc;
  border-radius: 1.4rem;
  background: #fff;
  color: #273219;
  box-shadow: 0 0.5rem 2rem #26372524;
  font-family: var(--font-body, sans-serif);
  overscroll-behavior: contain;

  @media (max-width: 56rem) {
    max-height: min(72dvh, 52rem);
  }
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.2rem 0.2rem 0.5rem;

  strong,
  small {
    display: block;
  }
  strong {
    font-size: 1.35rem;
  }
  small {
    margin-top: 0.3rem;
    color: #7d877a;
    font-size: 1rem;
  }
  .close {
    width: 2.8rem;
    height: 2.8rem;
    border: 0;
    border-radius: 50%;
    background: #f2f5ef;
    color: #273219;
    font-size: 1.8rem;
    line-height: 1;
    cursor: pointer;
  }
`;

const PreviewGroup = styled.details`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.5rem;
  min-width: 0;
  padding: 0.75rem;
  border-radius: 0.9rem;
  background: #f7f9f4;

  summary {
    grid-column: 1;
    padding: 0.25rem 0.2rem 0.4rem;
    color: #374522;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
  }
  a {
    display: block;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 0.7rem 0.8rem;
    border: 1px solid #e5eadf;
    border-radius: 0.65rem;
    background: white;
    color: #263225;
    font-size: 1.05rem;
    line-height: 1.35;
    text-decoration: none;
    overflow-wrap: anywhere;
    transition: background 120ms ease, border-color 120ms ease;
  }
  a:hover {
    border-color: #a5d83f;
    background: #fbfff1;
  }
  a:focus-visible {
    outline: 2px solid #a5d83f;
    outline-offset: 1px;
  }
`;
