import { useEffect, useState } from "react";
import styled from "styled-components";
import {
  disablePush,
  enablePush,
  getMarketingConsent,
  getPushState,
  marketingConsentResult,
  setMarketingConsent,
  type PushState,
} from "../../features/push/push";

/** 마이페이지 메뉴 한 줄: 이 기기에서 푸시 알림 받기 켜기/끄기 */
export default function PushToggle() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void getPushState().then((value) => {
      if (active) setState(value);
    });
    return () => {
      active = false;
    };
  }, []);

  // 서버에서 푸시를 켜지 않았으면 (아이폰 안내 문구를 포함해) 메뉴를 보이지 않는다
  if (!state || !state.serverEnabled) return null;

  const on = state.subscribed && state.permission === "granted";

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (on) await disablePush();
      else await enablePush();
      setState(await getPushState());
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "푸시 알림 설정을 바꾸지 못했어요.",
      );
      setState(await getPushState());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Row>
      <div className="copy">
        <span className="label">푸시 알림</span>
        <span className="hint">
          {state.support === "ios-needs-install" ? (
            <>
              아이폰은 홈 화면에 추가한 Kiiwee에서 켤 수 있어요.{" "}
              <a href="/push-guide">방법 보기 ›</a>
            </>
          ) : state.support === "unsupported"
              ? "이 브라우저에서는 푸시 알림을 받을 수 없어요."
              : state.permission === "denied"
                ? "알림이 차단돼 있어요. 브라우저·휴대폰 설정에서 허용해주세요."
                : "연락처 요청, 세션 확정·취소를 앱을 닫아도 알려드려요."}
        </span>
        {message && (
          <span className="error" role="alert">
            {message}
          </span>
        )}
      </div>
      {state.support === "supported" && (
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="푸시 알림 받기"
          className={on ? "on" : ""}
          disabled={busy || (state.permission === "denied" && !on)}
          onClick={() => void toggle()}
        >
          <span />
        </button>
      )}
    </Row>
  );
}

/**
 * 마이페이지 메뉴 한 줄: 세션 모집 소식(광고성 정보) 푸시 수신 동의·거부.
 * 바꾸면 처리 결과와 일시를 바로 보여준다 (정보통신망법 제50조 제7항).
 */
export function MarketingPushToggle() {
  const [serverEnabled, setServerEnabled] = useState(false);
  const [agreed, setAgreed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([getPushState(), getMarketingConsent()])
      .then(([state, consent]) => {
        if (!active) return;
        setServerEnabled(state.serverEnabled);
        setAgreed(consent.agreed);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!serverEnabled || agreed === null) return null;

  async function toggle() {
    if (busy || agreed === null) return;
    setBusy(true);
    setMessage("");
    setResult("");
    try {
      const change = await setMarketingConsent(!agreed);
      setAgreed(change.agreed);
      setResult(marketingConsentResult(change));
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "수신 설정을 바꾸지 못했어요.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Row>
      <div className="copy">
        <span className="label">세션 모집 소식 (광고)</span>
        <span className="hint">
          매일 오후 6시, 오늘 신청할 수 있는 세션과 남은 자리를 알려드려요. 푸시 알림이 켜져 있어야
          받을 수 있어요.
        </span>
        {result && (
          <span className="result" role="status">
            {result}
          </span>
        )}
        {message && (
          <span className="error" role="alert">
            {message}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={agreed}
        aria-label="세션 모집 소식(광고성 정보) 받기"
        className={agreed ? "on" : ""}
        disabled={busy}
        onClick={() => void toggle()}
      >
        <span />
      </button>
    </Row>
  );
}

const Row = styled.div`
  display: flex;
  min-height: 5.8rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.2rem;
  border-bottom: 0.1rem solid #e5e9e3;
  .copy {
    display: grid;
    gap: 0.3rem;
    min-width: 0;
  }
  .label {
    color: var(--ink);
    font-size: 1.4rem;
    font-weight: 600;
  }
  .hint {
    color: #8a938b;
    font-size: 1.05rem;
    line-height: 1.5;
  }
  .hint a {
    color: #2f5d43;
    font-weight: 700;
    text-decoration: none;
  }
  .result {
    color: #2f5d43;
    font-size: 1.05rem;
    line-height: 1.5;
  }
  .error {
    color: #c0392b;
    font-size: 1.05rem;
    line-height: 1.5;
  }
  button {
    position: relative;
    flex: 0 0 auto;
    width: 4.6rem;
    height: 2.8rem;
    padding: 0;
    border: 0;
    border-radius: 99px;
    background: #d9dfd6;
    cursor: pointer;
    transition: background 150ms ease;
  }
  button span {
    position: absolute;
    top: 0.3rem;
    left: 0.3rem;
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0.1rem 0.3rem #0002;
    transition: transform 150ms ease;
  }
  button.on {
    background: var(--green, #b8e986);
  }
  button.on span {
    transform: translateX(1.8rem);
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
