import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { getAccessToken } from "../../features/auth/session";
import { agreeToCurrentTerms, getMyMember } from "../../features/members/api";

// 약관을 읽거나 가입·로그인하는 화면에서는 동의 창을 띄우지 않는다
const SKIP_PATHS = [/^\/terms/, /^\/signup/, /^\/login/, /^\/error-report/];

/**
 * 로그인한 회원이 지금 약관에 동의하지 않았으면 (동의 기능 이전 가입자, 약관이 바뀐 경우)
 * 닫을 수 없는 동의 창을 띄운다. checkKey가 바뀌면 (새로 로그인하면) 다시 확인한다.
 */
export default function TermsConsentGate({ checkKey }: { checkKey: number }) {
  const [open, setOpen] = useState(false);
  const [agreements, setAgreements] = useState({ terms: false, privacy: false, thirdParty: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const allAgreed = agreements.terms && agreements.privacy && agreements.thirdParty;

  useEffect(() => {
    if (!getAccessToken()) return;
    if (SKIP_PATHS.some((pattern) => pattern.test(window.location.pathname))) return;
    let active = true;
    getMyMember()
      .then((member) => {
        if (active && member.termsAgreementRequired) setOpen(true);
      })
      // 내 정보를 못 불러오면 (로그인 만료 등) 여기서는 아무것도 하지 않는다
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [checkKey]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  async function submit() {
    if (!allAgreed || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await agreeToCurrentTerms();
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "동의를 저장하지 못했어요. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  const toggle = (key: keyof typeof agreements) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setAgreements((prev) => ({ ...prev, [key]: event.target.checked }));

  return (
    <Dialog
      ref={dialog}
      aria-labelledby="terms-consent-title"
      // Esc로 닫지 못하게 한다 (동의해야 계속 이용할 수 있다)
      onCancel={(event) => event.preventDefault()}
    >
      <h2 id="terms-consent-title">약관에 동의해주세요</h2>
      <p>
        Kiiwee 이용약관과 개인정보처리방침이 마련됐어요. 계속 이용하려면 아래 필수 항목에
        동의해주세요.
      </p>
      <fieldset>
        <label className="all">
          <input
            type="checkbox"
            checked={allAgreed}
            onChange={(event) => {
              const checked = event.target.checked;
              setAgreements({ terms: checked, privacy: checked, thirdParty: checked });
            }}
          />
          전체 동의
        </label>
        <label>
          <input type="checkbox" checked={agreements.terms} onChange={toggle("terms")} />
          [필수] 이용약관 동의
          <a href="/terms/service" target="_blank" rel="noreferrer">
            보기
          </a>
        </label>
        <label>
          <input type="checkbox" checked={agreements.privacy} onChange={toggle("privacy")} />
          [필수] 개인정보 수집·이용 동의
          <a href="/terms/privacy" target="_blank" rel="noreferrer">
            보기
          </a>
        </label>
        <label>
          <input type="checkbox" checked={agreements.thirdParty} onChange={toggle("thirdParty")} />
          [필수] 개인정보 제3자 제공 동의
          <a href="/terms/privacy" target="_blank" rel="noreferrer">
            보기
          </a>
        </label>
        <p className="note">
          매칭되거나 연락처를 주고받으면 상대에게 연락처가, 같은 세션 회원이 투표 결과를 열람하면
          세션 별칭과 투표 순위가 제공돼요.
        </p>
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="button" disabled={!allAgreed || submitting} onClick={() => void submit()}>
        {submitting ? "저장 중…" : "동의하고 계속하기"}
      </button>
    </Dialog>
  );
}

const Dialog = styled.dialog`
  width: min(calc(100vw - 3.2rem), 40rem);
  padding: 2.4rem 2rem;
  border: 0;
  border-radius: 2rem;
  background: #fff;
  color: #202820;
  &::backdrop {
    background: #222b2566;
  }
  h2 {
    margin: 0 0 1rem;
    font-size: 2rem;
  }
  > p {
    margin: 0 0 1.6rem;
    color: #536057;
    font-size: 1.35rem;
    line-height: 1.6;
  }
  fieldset {
    display: grid;
    gap: 1rem;
    margin: 0 0 1.6rem;
    padding: 1.4rem 1.6rem;
    border: 0.1rem solid #dfe5dc;
    border-radius: 1.2rem;
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    font-size: 1.3rem;
  }
  label.all {
    padding-bottom: 1rem;
    border-bottom: 0.1rem solid #eef1ec;
    font-weight: 700;
  }
  input[type="checkbox"] {
    width: 1.8rem;
    height: 1.8rem;
    flex: 0 0 auto;
    accent-color: var(--green, #b8e986);
  }
  a {
    margin-left: auto;
    color: #8a938b;
    font-size: 1.15rem;
    text-decoration: underline;
  }
  .note {
    margin: 0;
    color: #8a938b;
    font-size: 1.1rem;
    line-height: 1.5;
  }
  .error {
    margin: 0 0 1rem;
    color: #c0392b;
    font-size: 1.25rem;
  }
  button {
    width: 100%;
    min-height: 4.8rem;
    border: 0;
    border-radius: 1.2rem;
    background: var(--green, #b8e986);
    color: #273219;
    font-size: 1.4rem;
    font-weight: 700;
  }
  button:disabled {
    opacity: 0.5;
  }
`;
