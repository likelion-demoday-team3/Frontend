import { useEffect, useState } from "react";
import styled from "styled-components";
import NavBar from "../../components/common/NavBar";
import { clearAccessToken, getAccessToken } from "../../features/auth/session";
import {
  deleteMyMember,
  getLocalMemberName,
  getMyMember,
  removeLocalMemberName,
  type Member,
} from "../../features/members/api";
import NotificationButton from "../../components/common/NotificationButton";

const demoMember: Member = {
  publicId: "kiiwee-demo",
  email: "demo@kiiwee.app",
  university: "서강대학교",
  gender: "FEMALE",
  birthDate: "2002-05-18",
  phoneNumber: "010-1234-5678",
  instagramId: "kiiwee_demo",
};

export default function MyPage({ demo = false }: { demo?: boolean }) {
  const [member, setMember] = useState<Member | null>(demo ? demoMember : null);
  const [loading, setLoading] = useState(!demo && Boolean(getAccessToken()));
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const verified = demo || Boolean(member?.identityVerifiedAt);

  useEffect(() => {
    if (demo || !getAccessToken()) return;
    let active = true;
    getMyMember()
      .then((value) => {
        if (active) setMember(value);
      })
      .catch(() => {
        if (active) setMember(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [demo]);

  async function withdrawAccount() {
    if (withdrawing) return;
    setWithdrawing(true);
    setWithdrawError("");
    try {
      const account = member ?? (await getMyMember());
      await deleteMyMember();
      removeLocalMemberName(account.email);
      clearAccessToken();
      window.location.href = "/home";
    } catch (cause) {
      setWithdrawError(
        cause instanceof Error
          ? cause.message
          : "회원 탈퇴를 처리하지 못했어요.",
      );
      setWithdrawing(false);
    }
  }

  const suffix = demo ? "?demo=1" : "";
  return (
    <Shell>
      <header className="home-header">
        <img src="/logo.svg" width="90" height="40" alt="Kiiwee" />
        <NotificationButton className="notification-button" />
      </header>
      <main>
        <section className="identity">
          <a
            className="avatar"
            href={`/mypage/card${suffix}`}
            aria-label="프로필 카드 수정"
          >
            프로필
            <br />
            사진<i>✎</i>
          </a>
          <h1>
            {demo
              ? "이서강"
              : (member?.name ??
                (member?.email ? getLocalMemberName(member.email) : null) ??
                "이름")}
          </h1>
          <span className={`badge ${verified ? "verified" : ""}`}>
            {loading
              ? "정보 불러오는 중"
              : verified
                ? "인증완료"
                : "본인인증 필요"}
          </span>
        </section>
        {!verified && !loading && (
          <a className="verify-banner" href={`/mypage/identity${suffix}`}>
            본인인증을 완료해주세요 <span>›</span>
          </a>
        )}
        <section className="menu-card" aria-label="마이페이지 메뉴">
          <a href={`/mypage/me${suffix}`}>
            내 정보 <span>›</span>
          </a>
          <a href="/mypage/identity">
            본인인증 <span>›</span>
          </a>
          <a href={`/mypage/card${suffix}`}>
            프로필 카드 <span>›</span>
          </a>
          <a href={`/mypage/record${suffix}`}>
            세션 기록 <span>›</span>
          </a>
          <a href={`/mypage/reservation${suffix}`}>
            예약 확인 <span>›</span>
          </a>
        </section>
        <section className="account-actions" aria-label="계정 관리">
          <button
            className="logout-button"
            type="button"
            onClick={() => {
              clearAccessToken();
              window.location.href = "/login";
            }}
          >
            로그아웃
          </button>
          <button
            className="withdraw-button"
            type="button"
            onClick={() => {
              setWithdrawError("");
              setWithdrawDialogOpen(true);
            }}
          >
            탈퇴하기
          </button>
        </section>
      </main>
      <NavBar
        isLoggedIn={Boolean(getAccessToken())}
        onLoginRequired={() => {
          window.location.href = "/login";
        }}
        activePage="mypage"
      />
      {withdrawDialogOpen && (
        <div
          className="withdraw-backdrop"
          role="presentation"
          onClick={() => {
            if (!withdrawing) setWithdrawDialogOpen(false);
          }}
        >
          <section
            className="withdraw-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="withdraw-title"
            aria-describedby="withdraw-description"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="withdraw-title">정말 탈퇴하시겠어요?</h2>
            <p id="withdraw-description">
              탈퇴하면 계정이 비활성화되고 연락처가 즉시 삭제돼요. 이 작업은
              되돌릴 수 없어요.
            </p>
            {withdrawError && (
              <p className="withdraw-error" role="alert">
                {withdrawError}
              </p>
            )}
            <div className="withdraw-actions">
              <button
                type="button"
                onClick={() => setWithdrawDialogOpen(false)}
                disabled={withdrawing}
              >
                취소
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => void withdrawAccount()}
                disabled={withdrawing}
              >
                {withdrawing ? "탈퇴 처리 중…" : "탈퇴하기"}
              </button>
            </div>
          </section>
        </div>
      )}
      {demo && (
        <a className="demo-chip" href="/kiiwee/mypage">
          시연 중 <span>일반 화면 보기</span>
        </a>
      )}
    </Shell>
  );
}

const Shell = styled.div`
  width: 100%;
  max-width: 43rem;
  min-height: 100dvh;
  margin: 0 auto;
  background: var(--background);
  color: var(--ink);
  box-shadow: 0 0 6rem #26372508;
  .home-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(2.4rem + env(safe-area-inset-top)) 3rem 1.8rem;
  }
  .home-header img {
    display: block;
    width: 9rem;
    height: 4rem;
    object-fit: contain;
  }
  .notification-button {
    display: grid;
    place-items: center;
    width: 4.4rem;
    height: 4.4rem;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--ink);
  }
  .notification-button:hover {
    background: #2b302c08;
  }
  .notification-button svg {
    width: 2.8rem;
    height: 2.8rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  main {
    padding: 0 3rem calc(11.2rem + env(safe-area-inset-bottom));
  }
  .identity {
    display: flex;
    align-items: center;
    flex-direction: column;
    padding: 1.4rem 0 2.6rem;
  }
  .avatar {
    position: relative;
    display: grid;
    width: 10rem;
    height: 10rem;
    place-content: center;
    margin-bottom: 1.4rem;
    border-radius: 50%;
    background: #e9edeb;
    color: #56605a;
    font-size: 1.3rem;
    font-weight: 700;
    line-height: 1.35;
    text-align: center;
    text-decoration: none;
  }
  .avatar i {
    position: absolute;
    right: -0.2rem;
    bottom: 0.2rem;
    display: grid;
    width: 3rem;
    height: 3rem;
    place-items: center;
    border: 0.3rem solid var(--background);
    border-radius: 50%;
    background: #fff;
    color: #7d8980;
    font-style: normal;
  }
  .identity h1 {
    font: 700 2.2rem/1.3 var(--display-font);
  }
  .badge {
    margin-top: 0.7rem;
    padding: 0.45rem 1rem;
    border-radius: 99px;
    background: #ffe6e5;
    color: #d85350;
    font-size: 1.05rem;
    font-weight: 700;
  }
  .badge.verified {
    background: #e7f5d0;
    color: #587b22;
  }
  .menu-card {
    margin: 1rem 0;
    padding: 0.5rem 1.2rem;
    border: 0.1rem solid #e5e9e3;
    border-radius: 1.6rem;
    background: #fff;
  }
  .menu-card a {
    display: flex;
    min-height: 5.8rem;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.2rem;
    border-bottom: 0.1rem solid #e5e9e3;
    color: var(--ink);
    font-size: 1.4rem;
    font-weight: 600;
    text-decoration: none;
  }
  .menu-card a:last-child {
    border-bottom: 0;
  }
  .account-actions {
    display: grid;
    justify-items: center;
    gap: 1.4rem;
    margin-top: 2.4rem;
  }
  .logout-button {
    width: 100%;
    min-height: 4.8rem;
    border: 0.1rem solid #e1e8dc;
    border-radius: 1.2rem;
    background: #fff;
    color: #39433c;
    font: 600 1.3rem var(--font-body);
    cursor: pointer;
  }
  .withdraw-button {
    padding: 0.4rem 0.8rem;
    border: 0;
    background: transparent;
    color: #929a93;
    font: 400 1.05rem var(--font-body);
    text-decoration: underline;
    text-underline-offset: 0.2rem;
    cursor: pointer;
  }
  .withdraw-backdrop {
    position: fixed;
    z-index: 60;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 2rem;
    background: #18221c77;
  }
  .withdraw-dialog {
    width: min(100%, 34rem);
    padding: 2.4rem 2rem 2rem;
    border-radius: 2rem;
    background: var(--background);
    box-shadow: 0 1.5rem 5rem #1114;
  }
  .withdraw-dialog h2 {
    font: 700 1.8rem/1.4 var(--display-font);
    text-align: center;
  }
  .withdraw-dialog > p {
    margin-top: 1rem;
    color: #69756b;
    font-size: 1.2rem;
    line-height: 1.7;
    text-align: center;
  }
  .withdraw-dialog > p.withdraw-error {
    color: #bd5547;
  }
  .withdraw-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
    margin-top: 2rem;
  }
  .withdraw-actions button {
    min-height: 4.4rem;
    border: 1px solid #e1e8dc;
    border-radius: 1rem;
    background: #fff;
    color: #39433c;
    font: 600 1.2rem var(--font-body);
  }
  .withdraw-actions button.danger {
    border: 0;
    background: #ffe6e5;
    color: #a63735;
  }
  .menu-card a span,
  .verify-banner span {
    color: #77827a;
    font-size: 2.4rem;
    font-weight: 400;
    line-height: 1;
  }
  .verify-banner {
    display: flex;
    min-height: 5rem;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.5rem;
    border-radius: 1.2rem;
    background: #fff2e7;
    color: #624525;
    font-size: 1.3rem;
    text-decoration: none;
  }
  .demo-chip {
    position: fixed;
    z-index: 20;
    top: calc(1.2rem + env(safe-area-inset-top));
    right: max(calc((100vw - 43rem) / 2 + 1.2rem), 1.2rem);
    padding: 0.8rem 1.1rem;
    border-radius: 99px;
    background: #17231b;
    color: #fff;
    font-size: 1.05rem;
    text-decoration: none;
  }
  .demo-chip span {
    color: #d8ff8c;
    font-weight: 700;
  }
  @media (max-width: 37.4rem) {
    .home-header {
      padding-left: 3rem;
      padding-right: 3rem;
    }
    main {
      padding-left: 3rem;
      padding-right: 3rem;
    }
  }
`;
