import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { getAccessToken } from "../../features/auth/session";

// 공지를 바꾸면 키의 버전을 올린다 (예: v2). 이 기기에서 [확인]을 누르면 같은 공지는 다시 띄우지 않는다
const SEEN_KEY = "kiiwee.notice.bankTransfer.v1";
// 첫 화면이 그려진 뒤, 알림 받기 팝업(2.5초)보다 먼저 띄운다
const SHOW_DELAY_MS = 1200;

function alreadySeen() {
  try {
    return window.localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    return false;
  }
}

function rememberSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch {
    /* 저장하지 못해도 이번에는 닫는다 */
  }
}

/**
 * 메인 화면: 로그인한 사용자에게 결제 방식이 계좌이체로 바뀌었다고 한 번 알린다.
 * 다른 팝업(약관 재동의 등)이 이미 열려 있으면 이번에는 띄우지 않고 다음 접속 때 다시 시도한다.
 */
export default function PaymentChangeNotice() {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!getAccessToken() || alreadySeen()) return;
    const timer = window.setTimeout(() => {
      if (document.querySelector("dialog[open]")) return;
      setOpen(true);
    }, SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  function close() {
    rememberSeen();
    setOpen(false);
  }

  return (
    <Dialog
      ref={dialog}
      aria-labelledby="payment-change-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <h2 id="payment-change-title">보석 충전 방식이 잠시 바뀌었어요</h2>
      <p>
        카드 결제를 잠시 중단하고, 지금은 <strong>계좌이체</strong>로 보석을
        충전받고 있어요.
      </p>
      <ol>
        <li>상점에서 원하는 보석 상품을 고르고 입금자명을 입력해요.</li>
        <li>안내된 계좌로 금액을 입금해요.</li>
        <li>운영자가 입금을 확인하면 보석이 충전되고 알림을 보내드려요.</li>
      </ol>
      <p className="note">
        이용에 불편을 드려 죄송해요. 카드 결제는 빠른 시일 내로 복구할게요.
      </p>
      <div className="actions">
        <button type="button" className="secondary" onClick={close}>
          확인
        </button>
        <a className="primary" href="/store" onClick={rememberSeen}>
          상점 가기
        </a>
      </div>
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
  &::backdrop {
    background: #222b2566;
  }
  h2 {
    margin: 0 0 1rem;
    font-size: 1.8rem;
    text-align: center;
  }
  p {
    margin: 0 0 1.2rem;
    color: #536057;
    font-size: 1.3rem;
    line-height: 1.6;
  }
  ol {
    display: grid;
    gap: 0.6rem;
    margin: 0 0 1.2rem;
    padding: 1.2rem 1.2rem 1.2rem 3rem;
    border-radius: 1rem;
    background: #f5f8ef;
    color: #3d4a40;
    font-size: 1.2rem;
    line-height: 1.5;
  }
  .note {
    color: #7a5400;
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
    display: grid;
    min-height: 4.6rem;
    place-items: center;
    border: 0;
    border-radius: 1.2rem;
    font-size: 1.3rem;
    font-weight: 700;
    text-decoration: none;
  }
  .secondary {
    border: 0.1rem solid #e3e8df !important;
    background: #fff;
    color: #69756b;
  }
  .primary {
    background: var(--green);
    color: #273219;
  }
`;
