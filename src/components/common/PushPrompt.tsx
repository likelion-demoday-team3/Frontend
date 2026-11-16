import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { getAccessToken } from "../../features/auth/session";
import { getMyMember } from "../../features/members/api";
import { enablePush, getPushState, type PushSupport } from "../../features/push/push";

// '나중에'를 누르면 이 기간 동안 다시 묻지 않는다
const DISMISS_KEY = "kiiwee.pushPrompt.dismissedAt";
const DISMISS_DAYS = 7;
// 첫 화면(썸네일)이 사라진 뒤에 띄운다
const SHOW_DELAY_MS = 2500;

function recentlyDismissed() {
  try {
    const value = Number(window.localStorage.getItem(DISMISS_KEY));
    return value > 0 && Date.now() - value < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* 저장하지 못해도 이번에는 닫는다 */
  }
}

/**
 * 메인 화면: 로그인했고 이 기기에서 아직 푸시를 켜지 않았으면 "알림 받을까요?"를 먼저 묻는다.
 * 브라우저 권한 창은 사용자가 [알림 받기]를 눌렀을 때만 띄운다 (Safari는 클릭 안에서만 허락하고,
 * 한 번 '차단'되면 사이트에서 다시 물을 수 없기 때문).
 * - 브라우저 권한이 이미 차단돼 있으면 묻지 않는다
 * - 아이폰 Safari는 바로 켤 수 없으므로 홈 화면에 추가하는 방법 안내로 보낸다
 */
export default function PushPrompt() {
  const [mode, setMode] = useState<PushSupport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!getAccessToken() || recentlyDismissed()) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const state = await getPushState();
        if (!state.serverEnabled || state.support === "unsupported") return;
        if (state.support === "supported" && (state.subscribed || state.permission === "denied")) return;
        // 약관 동의 창이 떠 있어야 하는 회원에게는 겹쳐 띄우지 않는다
        const member = await getMyMember();
        if (member.termsAgreementRequired) return;
        // 다른 팝업이 열려 있으면 이번에는 넘어간다
        if (document.querySelector("dialog[open]")) return;
        if (active) setMode(state.support);
      } catch {
        /* 확인하지 못하면 묻지 않는다 */
      }
    }, SHOW_DELAY_MS);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (mode && !element.open) element.showModal();
    if (!mode && element.open) element.close();
  }, [mode]);

  function later() {
    rememberDismissed();
    setMode(null);
  }

  async function turnOn() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await enablePush();
      setMode(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "알림을 켜지 못했어요.");
      // 권한을 거절했으면 다시 묻지 않도록 기록해 둔다
      rememberDismissed();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      ref={dialog}
      aria-labelledby="push-prompt-title"
      onCancel={(event) => {
        event.preventDefault();
        later();
      }}
    >
      <img src="/kw-wink.svg" alt="" width="72" height="72" />
      <h2 id="push-prompt-title">알림을 받아볼까요?</h2>
      <p>
        연락처 요청이 오거나 신청한 세션이 확정·취소되면 앱을 닫아도 바로 알려드려요.
      </p>
      {mode === "ios-needs-install" && (
        <p className="note">
          아이폰은 Safari에서 Kiiwee를 <strong>홈 화면에 추가</strong>한 뒤 그 아이콘으로 열어야
          알림을 받을 수 있어요.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button type="button" className="later" onClick={later}>
          나중에
        </button>
        {mode === "ios-needs-install" ? (
          <a
            className="primary"
            href="/push-guide"
            onClick={() => rememberDismissed()}
          >
            방법 보기
          </a>
        ) : (
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={() => void turnOn()}
          >
            {busy ? "설정 중…" : "알림 받기"}
          </button>
        )}
      </div>
      <small>마이페이지에서 언제든 끄고 켤 수 있어요.</small>
    </Dialog>
  );
}

const Dialog = styled.dialog`
  width: min(calc(100vw - 3.2rem), 36rem);
  padding: 2.6rem 2rem 2rem;
  border: 0;
  border-radius: 2rem;
  background: #fff;
  color: #202820;
  text-align: center;
  &::backdrop {
    background: #222b2566;
  }
  img {
    display: block;
    margin: 0 auto 1rem;
  }
  h2 {
    margin: 0 0 0.8rem;
    font-size: 1.9rem;
  }
  p {
    margin: 0 0 1.2rem;
    color: #536057;
    font-size: 1.3rem;
    line-height: 1.6;
  }
  .note {
    padding: 1rem 1.2rem;
    border-radius: 1rem;
    background: #f5f8ef;
    font-size: 1.15rem;
  }
  .error {
    color: #c0392b;
    font-size: 1.2rem;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: 0.8rem;
    margin-top: 0.4rem;
  }
  .actions button,
  .actions a {
    display: flex;
    min-height: 4.8rem;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 1.2rem;
    font-size: 1.4rem;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
  }
  .later {
    border: 0.1rem solid #e1e8dc !important;
    background: #fff;
    color: #536057;
  }
  .primary {
    background: var(--green, #b8e986);
    color: #273219;
  }
  .primary:disabled {
    opacity: 0.6;
  }
  small {
    display: block;
    margin-top: 1.2rem;
    color: #8a938b;
    font-size: 1.05rem;
  }
`;
