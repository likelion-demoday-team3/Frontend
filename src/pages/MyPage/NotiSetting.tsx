import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import MyPageFrame, { Panel } from "./MyPageFrame";
import {
  disablePush,
  enablePush,
  getMarketingConsent,
  getPushState,
  marketingConsentResult,
  setMarketingConsent,
  type PushState,
} from "../../features/push/push";

export default function NotiSetting() {
  const [pushState, setPushState] = useState<PushState | null>(null);
  const [marketingAgreed, setMarketingAgreed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushBusy, setPushBusy] = useState(false);
  const [marketingBusy, setMarketingBusy] = useState(false);
  const [error, setError] = useState("");
  const [consentNotice, setConsentNotice] = useState("");
  const autoRevokeAttempted = useRef(false);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getPushState(), getMarketingConsent()])
      .then(([pushResult, consentResult]) => {
        if (!active) return;
        const loadErrors: string[] = [];
        if (pushResult.status === "fulfilled") setPushState(pushResult.value);
        else loadErrors.push("푸시 알림 설정을 불러오지 못했어요.");
        if (consentResult.status === "fulfilled")
          setMarketingAgreed(consentResult.value.agreed);
        else loadErrors.push("세션 모집 소식 설정을 불러오지 못했어요.");
        if (loadErrors.length) setError(loadErrors.join(" "));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const pushEnabled = Boolean(
    pushState?.subscribed && pushState.permission === "granted",
  );
  const pushUnavailable =
    !pushState?.serverEnabled || pushState.support !== "supported";

  useEffect(() => {
    if (pushEnabled) {
      autoRevokeAttempted.current = false;
      return;
    }
    if (
      loading ||
      marketingAgreed !== true ||
      marketingBusy ||
      autoRevokeAttempted.current
    )
      return;

    autoRevokeAttempted.current = true;
    setMarketingBusy(true);
    setError("");
    setMarketingAgreed(false);
    setMarketingConsent(false)
      .then((result) => {
        setMarketingAgreed(false);
        setConsentNotice(marketingConsentResult(result));
      })
      .catch((cause) => {
        setMarketingAgreed(true);
        setError(
          cause instanceof Error
            ? cause.message
            : "푸시 알림이 꺼져 세션 모집 소식 수신을 해제하지 못했어요.",
        );
      })
      .finally(() => setMarketingBusy(false));
  }, [pushEnabled, loading, marketingAgreed, marketingBusy]);

  async function togglePush() {
    if (!pushState || pushBusy || pushUnavailable) return;
    setPushBusy(true);
    setError("");
    try {
      if (pushEnabled) await disablePush();
      else await enablePush();
      setPushState(await getPushState());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "푸시 알림 설정을 바꾸지 못했어요.",
      );
      setPushState(await getPushState().catch(() => pushState));
    } finally {
      setPushBusy(false);
    }
  }

  async function toggleMarketing() {
    if (!pushEnabled || marketingAgreed === null || marketingBusy) return;
    setMarketingBusy(true);
    setError("");
    setConsentNotice("");
    try {
      const result = await setMarketingConsent(!marketingAgreed);
      setMarketingAgreed(result.agreed);
      setConsentNotice(marketingConsentResult(result));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "세션 모집 소식 설정을 바꾸지 못했어요.",
      );
    } finally {
      setMarketingBusy(false);
    }
  }

  let pushHint = "연락처 요청, 세션 확정·취소 알림을 앱을 닫아도 알려드려요.";
  if (loading) pushHint = "푸시 알림 설정을 확인하고 있어요.";
  else if (!pushState?.serverEnabled)
    pushHint = "현재 푸시 알림을 사용할 수 없어요.";
  else if (pushState.support === "ios-needs-install")
    pushHint = "아이폰은 홈 화면에 추가한 Kiiwee에서 켤 수 있어요.";
  else if (pushState.support === "unsupported")
    pushHint = "이 브라우저에서는 푸시 알림을 받을 수 없어요.";
  else if (pushState.permission === "denied")
    pushHint = "알림이 차단돼 있어요. 브라우저·휴대폰 설정에서 허용해주세요.";

  return (
    <MyPageFrame title="알림 설정">
      <Panel>
        <Settings>
          <SettingRow>
            <div className="copy">
              <span className="label">푸시 알림</span>
              <span className="hint">
                {pushState?.support === "ios-needs-install" ? (
                  <>
                    {pushHint} <a href="/push-guide">알림 설정 방법 보기 ›</a>
                  </>
                ) : (
                  pushHint
                )}
              </span>
            </div>
            <Switch
              type="button"
              role="switch"
              aria-checked={pushEnabled}
              aria-label="푸시 알림 켜기/끄기"
              className={pushEnabled ? "on" : ""}
              disabled={
                loading ||
                pushBusy ||
                pushUnavailable ||
                (pushState?.permission === "denied" && !pushEnabled)
              }
              onClick={() => void togglePush()}
            >
              <span />
            </Switch>
          </SettingRow>
          <SettingRow className={!pushEnabled ? "disabled" : ""}>
            <div className="copy">
              <span className="label">세션 모집 소식 (광고)</span>
              <span className="hint">
                매일 오후 6시, 오늘 신청할 수 있는 세션과 남은 자리를
                알려드려요. 푸시 알림을 켜야 받을 수 있어요.
              </span>
              {consentNotice && (
                <span className="notice" role="status">
                  {consentNotice}
                </span>
              )}
            </div>
            <Switch
              type="button"
              role="switch"
              aria-checked={marketingAgreed ?? false}
              aria-label="세션 모집 소식 켜기/끄기"
              className={marketingAgreed ? "on" : ""}
              disabled={
                !pushEnabled ||
                loading ||
                marketingBusy ||
                marketingAgreed === null
              }
              onClick={() => void toggleMarketing()}
            >
              <span />
            </Switch>
          </SettingRow>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </Settings>
      </Panel>
    </MyPageFrame>
  );
}

const Settings = styled.div`
  display: grid;
  .error {
    margin: 1rem 0 0;
    color: #c0392b;
    font-size: 1.15rem;
    line-height: 1.5;
  }
`;

const SettingRow = styled.div`
  display: flex;
  min-height: 7rem;
  align-items: center;
  justify-content: space-between;
  gap: 1.2rem;
  padding: 1.2rem 0;
  border-bottom: 0.1rem solid #e5e9e3;
  &:last-of-type {
    border-bottom: 0;
  }
  .copy {
    display: grid;
    min-width: 0;
    gap: 0.4rem;
  }
  .label {
    color: var(--ink);
    font-size: 1.4rem;
    font-weight: 600;
  }
  .hint,
  .notice {
    color: #8a938b;
    font-size: 1.1rem;
    line-height: 1.5;
  }
  .hint a {
    color: #2f5d43;
    font-weight: 700;
    text-decoration: none;
  }
  .notice {
    color: #2f5d43;
  }
  &.disabled .copy {
    opacity: 0.5;
  }
`;

const Switch = styled.button`
  position: relative;
  flex: 0 0 auto;
  width: 4.6rem;
  height: 2.8rem;
  padding: 0;
  border: 0;
  border-radius: 99px;
  background: #d9dfd6;
  cursor: pointer;
  transition:
    background 150ms ease,
    opacity 150ms ease;
  span {
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
  &.on {
    background: var(--green);
  }
  &.on span {
    transform: translateX(1.8rem);
  }
  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`;
