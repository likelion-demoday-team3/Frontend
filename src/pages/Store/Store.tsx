import { useEffect, useState } from "react";
import styled, { css } from "styled-components";
import NavBar from "../../components/common/NavBar";
import { getAccessToken } from "../../features/auth/session";
import { getMyWallet } from "../../features/wallet/api";
import {
  createGemPaymentOrder,
  getShopProducts,
  type ShopProduct,
} from "../../features/payments/kakaopay";

type PaymentNotice = {
  status: "success" | "cancelled" | "failed";
  grantedGem?: number;
  gemBalance?: number;
  message?: string;
};

const formatWon = (amount: number) => amount.toLocaleString("ko-KR") + "원";
const getDiscountRate = (price: number, salePrice: number | null) =>
  salePrice == null || price <= 0
    ? 0
    : Math.round((1 - salePrice / price) * 100);

function readPaymentNotice(): PaymentNotice | null {
  const status = new URLSearchParams(window.location.search).get("payment");
  if (status !== "success" && status !== "cancelled" && status !== "failed")
    return null;
  try {
    return {
      ...JSON.parse(sessionStorage.getItem("kiiwee-payment-result") ?? "{}"),
      status,
    };
  } catch {
    return { status };
  }
}

type StoreProps = {
  embedded?: boolean;
  open?: boolean;
  initialGems?: number;
  onGemsChange?: (gems: number) => void;
  onClose?: () => void;
};

export default function Store({
  embedded = false,
  open = true,
  initialGems = 0,
  onClose,
}: StoreProps) {
  const mockMode =
    import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API !== "false";
  const [gems, setGems] = useState(mockMode ? initialGems : 0);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<ShopProduct | null>(
    null,
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentNotice, setPaymentNotice] = useState<PaymentNotice | null>(
    readPaymentNotice,
  );
  const isLoggedIn = Boolean(getAccessToken());
  const [walletError, setWalletError] = useState("");

  useEffect(() => setGems(initialGems), [initialGems]);
  useEffect(() => {
    let active = true;
    setProductsLoading(true);
    getShopProducts()
      .then((items) => {
        if (active) {
          setProducts(items);
          setProductsError("");
        }
      })
      .catch((cause) => {
        if (active)
          setProductsError(
            cause instanceof Error
              ? cause.message
              : "보석 상품을 불러오지 못했어요.",
          );
      })
      .finally(() => {
        if (active) setProductsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (mockMode) {
      setGems(initialGems);
      return;
    }
    if (!isLoggedIn) {
      setWalletError("로그인 후 보석 잔액을 확인할 수 있어요.");
      return;
    }
    let active = true;
    getMyWallet()
      .then((wallet) => {
        if (active) {
          setGems(wallet.gemBalance);
          setWalletError("");
        }
      })
      .catch((cause) => {
        if (active)
          setWalletError(
            cause instanceof Error
              ? cause.message
              : "보석 잔액을 불러오지 못했어요.",
          );
      });
    return () => {
      active = false;
    };
  }, [initialGems, isLoggedIn, mockMode]);
  useEffect(() => {
    if (paymentNotice?.gemBalance != null) setGems(paymentNotice.gemBalance);
  }, [paymentNotice]);
  useEffect(() => {
    if (!open) setSelectedPackage(null);
  }, [open]);

  async function confirmPurchase() {
    if (!selectedPackage || paymentPending) return;
    if (!isLoggedIn) {
      setPaymentError("결제는 로그인 후 이용할 수 있어요.");
      return;
    }
    setPaymentPending(true);
    setPaymentError("");
    try {
      const order = await createGemPaymentOrder(selectedPackage.productId);
      if (
        !order.orderId ||
        !Number.isSafeInteger(order.gemAmount) ||
        order.gemAmount <= 0
      ) {
        throw new Error(
          "결제 주문 정보를 확인할 수 없어요. 백엔드 결제 설정을 확인해주세요.",
        );
      }
      const userAgent = navigator.userAgent;
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
      const isWebView =
        /; wv\)/i.test(userAgent) ||
        (/iPhone|iPad|iPod/i.test(userAgent) && !/Safari/i.test(userAgent));
      const redirectUrl = isWebView
        ? order.appRedirectUrl
        : isMobile
          ? order.mobileRedirectUrl
          : order.pcRedirectUrl;
      if (!redirectUrl) {
        throw new Error(
          "카카오페이 결제 주소를 확인할 수 없어요. 백엔드 결제 설정을 확인해주세요.",
        );
      }
      window.location.href = redirectUrl;
    } catch (cause) {
      setPaymentError(
        cause instanceof Error
          ? cause.message
          : "결제를 시작하지 못했어요. 다시 시도해주세요.",
      );
    } finally {
      setPaymentPending(false);
    }
  }

  function closePaymentNotice() {
    setPaymentNotice(null);
    sessionStorage.removeItem("kiiwee-payment-result");
    window.history.replaceState(null, "", window.location.pathname);
  }

  return (
    <StorePage
      className={embedded ? "embedded" : undefined}
      $embedded={embedded}
      $open={open}
      aria-hidden={embedded && !open}
    >
      {!embedded && (
        <header className="home-header">
          <img src="/logo.svg" width="90" height="40" alt="Kiiwee" />
          <button
            className="notification-button"
            type="button"
            aria-label="알림 열기"
            onClick={() => setNotificationsOpen(true)}
          >
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
            </svg>
          </button>
        </header>
      )}

      {!embedded && isLoggedIn && (
        <section
          className="balance-card"
          aria-label={`현재 보유 보석 ${gems}개`}
        >
          <div className="balance-label">
            <span className="balance-title">내 보석</span>
            <span className="gem-mark" aria-hidden="true">
              ◆
            </span>
            <strong>{gems}개</strong>
          </div>
          <a href="/store/history">충전 내역</a>
        </section>
      )}
      {!embedded && isLoggedIn && walletError && (
        <p className="wallet-error" role="alert">
          {walletError}
        </p>
      )}

      <section className="packages-section" id="gem-packages">
        <div className="section-heading">
          <h2>
            <span>보석 충전</span>
            {embedded && (
              <button
                type="button"
                className="section-close"
                aria-label="충전 페이지 닫기"
                onClick={onClose}
              >
                ×
              </button>
            )}
          </h2>
          <p>원하는 보석 상품을 선택하고 결제를 진행해요.</p>
        </div>
        <div className="package-list">
          {productsLoading ? (
            <p className="product-state">상품을 불러오는 중이에요…</p>
          ) : productsError ? (
            <div className="product-state" role="alert">
              <p>{productsError}</p>
              {!isLoggedIn && <a href="/login">로그인하기</a>}
            </div>
          ) : products.length === 0 ? (
            <p className="product-state">판매 중인 상품이 없어요.</p>
          ) : (
            products.map((item) => (
              <article
                className={
                  item.gemAmount === 20
                    ? "package-card popular"
                    : "package-card"
                }
                key={item.productId}
              >
                {item.gemAmount === 20 && (
                  <span className="popular-badge">인기</span>
                )}
                <div className="gem-count">
                  <span className="gem-mark" aria-hidden="true">
                    ◆
                  </span>
                  <strong>{item.gemAmount}개</strong>
                </div>
                <div className="price-info">
                  {item.salePrice != null && item.salePrice < item.price ? (
                    <div className="discount-price">
                      <del>{formatWon(item.price)}</del>
                      <span aria-hidden="true">→</span>
                      <strong>{formatWon(item.salePrice)}</strong>
                      <b>{getDiscountRate(item.price, item.salePrice)}% 할인</b>
                    </div>
                  ) : (
                    <strong>{formatWon(item.salePrice ?? item.price)}</strong>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentError("");
                    if (!isLoggedIn) {
                      setLoginPromptOpen(true);
                      return;
                    }
                    setSelectedPackage(item);
                  }}
                >
                  충전하기
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      {!embedded && (
        <NavBar
          isLoggedIn={isLoggedIn}
          onLoginRequired={() => setLoginPromptOpen(true)}
          activePage="store"
        />
      )}

      {loginPromptOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setLoginPromptOpen(false)}>
          <section className="login-prompt-dialog" role="dialog" aria-modal="true" aria-labelledby="login-prompt-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="login-prompt-title">로그인이 필요한 서비스예요</h2>
            <p>로그인하거나 회원가입하고 스터디를 신청해보세요.</p>
            <div className="login-prompt-actions">
              <a className="signup-link" href="/signup">회원가입</a>
              <a className="login-link" href="/login">로그인</a>
            </div>
          </section>
        </div>
      )}

      {selectedPackage && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setSelectedPackage(null)}
        >
          <section
            className="purchase-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="close"
              type="button"
              aria-label="닫기"
              onClick={() => setSelectedPackage(null)}
            >
              ×
            </button>
            <h2 id="purchase-title">보석 충전</h2>
            <p>{selectedPackage.gemAmount}개</p>
            <strong className="purchase-price">
              {formatWon(selectedPackage.salePrice ?? selectedPackage.price)}
            </strong>
            <p className="demo-note">
              카카오페이 결제창에서 결제를 완료하면 보석이 충전돼요.
            </p>
            {paymentError && (
              <p className="payment-error" role="alert">
                {paymentError}
              </p>
            )}
            <button
              className="confirm"
              type="button"
              disabled={paymentPending}
              onClick={confirmPurchase}
            >
              {paymentPending ? "결제창을 준비하고 있어요…" : "결제하기"}
            </button>
          </section>
        </div>
      )}

      {paymentNotice && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={closePaymentNotice}
        >
          <section
            className="purchase-dialog payment-success-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-success-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="payment-success-title">
              {paymentNotice.status === "success"
                ? "결제가 완료되었습니다"
                : paymentNotice.status === "cancelled"
                  ? "결제가 취소되었어요"
                  : "결제에 실패했어요"}
            </h2>
            <p>
              {paymentNotice.status === "success"
                ? `보석 ${paymentNotice.grantedGem ?? 0}개가 충전되었어요.`
                : paymentNotice.status === "cancelled"
                  ? "결제는 진행되지 않았어요. 원하실 때 다시 충전할 수 있어요."
                  : paymentNotice.message ||
                    "결제에 실패했어요. 다시 시도해주세요."}
            </p>
            {paymentNotice.status === "success" &&
              paymentNotice.gemBalance != null && (
                <p className="balance-result">
                  현재 보석 잔액 {paymentNotice.gemBalance}개
                </p>
              )}
            <button
              className="confirm"
              type="button"
              onClick={closePaymentNotice}
            >
              확인
            </button>
          </section>
        </div>
      )}

      {!embedded && notificationsOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setNotificationsOpen(false)}
        >
          <section
            className="purchase-dialog history-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="close"
              type="button"
              aria-label="닫기"
              onClick={() => setNotificationsOpen(false)}
            >
              ×
            </button>
            <h2 id="notification-title">알림</h2>
            <p className="empty-history">
              {mockMode
                ? "새로운 알림이 없어요."
                : "알림 API 명세가 없어 아직 알림을 불러올 수 없어요."}
            </p>
          </section>
        </div>
      )}
    </StorePage>
  );
}

const StorePage = styled.div<{ $embedded: boolean; $open: boolean }>`
  width: 100%;
  max-width: 43rem;
  min-height: 100dvh;
  margin: 0 auto;
  padding: 0 3rem calc(11rem + env(safe-area-inset-bottom));
  background: var(--background);
  color: var(--ink);
  box-shadow: 0 0 6rem #26372508;

  ${({ $embedded, $open }) =>
    $embedded &&
    css`
      position: fixed;
      z-index: 20;
      top: calc(10.5rem + env(safe-area-inset-top));
      right: 0;
      bottom: 0;
      left: 0;
      height: calc(100dvh - 10.5rem - env(safe-area-inset-top));
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 0 3rem calc(2.4rem + env(safe-area-inset-bottom));
      border-radius: 1.8rem 1.8rem 0 0;
      box-shadow: 0 -0.5rem 1.5rem #17221712;
      transform: translateY(${$open ? "0" : "100%"});
      visibility: ${$open ? "visible" : "hidden"};
      pointer-events: ${$open ? "auto" : "none"};
      transition:
        transform 360ms cubic-bezier(0.2, 0.75, 0.25, 1),
        visibility 0s linear ${$open ? "0s" : "360ms"};
      scrollbar-width: none;
      &::-webkit-scrollbar {
        display: none;
      }
    `}

  .home-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-right: -3rem;
    margin-left: -3rem;
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
  }
  .balance-card {
    display: flex;
    min-height: 9rem;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 1.2rem;
    padding: 1.6rem 2rem;
    border-radius: 2.4rem;
    background: var(--green);
    color: #202820;
  }
  .balance-label {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    font-size: 1.5rem;
    font-weight: 700;
  }
  .balance-title {
    color: #202820;
  }
  .balance-label strong {
    font-size: 1.8rem;
  }
  .gem-mark {
    color: #31bfff;
    font-size: 1.8rem;
  }
  .balance-card a {
    display: grid;
    min-width: 9.5rem;
    min-height: 4.3rem;
    place-items: center;
    padding: 0 1.4rem;
    border: 0;
    border-radius: 1.2rem;
    background: #2b302c;
    color: white;
    font-size: 1.2rem;
    font-weight: 700;
    text-decoration: none;
    white-space: nowrap;
  }
  .wallet-error {
    margin: 0.8rem 0 0 1rem;
    color: var(--text-danger);
    font-size: 1.1rem;
    line-height: 1.5;
  }
  .packages-section {
    padding-top: 3rem;
    scroll-margin-top: 2rem;
  }
  .section-heading {
    margin-bottom: 1.4rem;
  }
  &.embedded .section-heading h2 {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .section-close {
    display: grid;
    flex: 0 0 4rem;
    width: 4rem;
    height: 4rem;
    place-items: center;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--ink);
    font-size: 3.2rem;
    line-height: 1;
  }
  .section-heading h2 {
    font: 400 2rem/1.3 var(--display-font);
  }
  .section-heading p {
    margin-top: 0.5rem;
    color: #899188;
    font-size: 1.1rem;
  }
  .package-list {
    display: grid;
    gap: 1rem;
  }
  .product-state {
    padding: 2rem 1rem;
    color: #899188;
    font-size: 1.25rem;
    line-height: 1.6;
    text-align: center;
  }
  .product-state a {
    display: inline-block;
    margin-top: 1rem;
    color: #617c2c;
    font-weight: 700;
  }
  .package-card {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.9rem 1.2rem;
    padding: 1.5rem;
    border: 1px solid #e2e8dc;
    border-radius: 1.7rem;
    background: #fff;
  }
  .package-card.popular {
    border: 0.2rem solid #a8d348;
    background: #fbfff2;
  }
  .popular-badge {
    position: absolute;
    top: -0.8rem;
    right: 1.4rem;
    padding: 0.35rem 0.8rem;
    border-radius: 99rem;
    background: #a8d348;
    color: #26321a;
    font-size: 0.95rem;
    font-weight: 800;
  }
  .gem-count {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .gem-count strong {
    font-size: 1.65rem;
  }
  .price-info {
    display: grid;
    grid-column: 1;
    gap: 0.35rem;
  }
  .price-info strong {
    font-size: 1.7rem;
  }
  .discount-price {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
  }
  .discount-price del {
    color: #899188;
    font-size: 1.1rem;
  }
  .discount-price > span {
    color: #899188;
    font-size: 1.2rem;
  }
  .discount-price strong {
    color: #202820;
    font-size: 1.7rem;
  }
  .discount-price b {
    margin-left: 0.25rem;
    color: #789a2f;
    font-size: 1.05rem;
    white-space: nowrap;
  }
  .package-card > button {
    grid-column: 2;
    grid-row: 1 / span 2;
    min-width: 9.5rem;
    min-height: 4.3rem;
    border: 0;
    border-radius: 1.2rem;
    background: var(--green);
    color: #202820;
    font-size: 1.2rem;
    font-weight: 750;
  }
  .modal-backdrop {
    position: fixed;
    z-index: 50;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 2rem;
    background: #18221c77;
  }
  .purchase-dialog {
    position: relative;
    width: min(100%, 34rem);
    padding: 3rem 2.2rem 2.2rem;
    border: 0;
    border-radius: 2rem;
    background: var(--background);
    text-align: center;
    box-shadow: 0 1.5rem 5rem #1114;
  }
  .login-prompt-dialog {
    width: min(34rem, calc(100vw - 4.8rem));
    padding: 3rem 2rem 2rem;
    border-radius: 2.9rem;
    background: var(--background);
    color: var(--ink);
    box-shadow: 0 1.6rem 7rem #1113;
  }
  .login-prompt-dialog h2 {
    font: 700 1.9rem/1.5 var(--font-body);
    text-align: center;
    letter-spacing: -0.06rem;
  }
  .login-prompt-dialog > p {
    margin: 1.6rem 0 2rem;
    color: #8b959b;
    font-size: 1.1rem;
    line-height: 1.8;
    text-align: center;
  }
  .login-prompt-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.9rem;
  }
  .login-prompt-actions a {
    display: grid;
    min-height: 4.8rem;
    place-items: center;
    border-radius: 1.3rem;
    font-size: 1.2rem;
    font-weight: 600;
    text-decoration: none;
  }
  .login-prompt-actions .signup-link {
    border: 0.1rem solid #e3e8df;
    color: #85908b;
  }
  .login-prompt-actions .login-link {
    background: var(--green);
    color: #5622ad;
    box-shadow: 0 0.4rem 0.9rem #bed47333;
  }
  .purchase-dialog h2 {
    font: 400 2.2rem/1.3 var(--display-font);
  }
  .purchase-dialog > p {
    margin-top: 1.2rem;
    color: #7e897c;
    font-size: 1.3rem;
  }
  .purchase-price {
    display: block;
    margin-top: 1rem;
    font-size: 2.2rem;
  }
  .purchase-dialog .demo-note {
    font-size: 1.1rem;
  }
  .purchase-dialog .balance-result {
    font-weight: 750;
    color: #536d25;
  }
  .purchase-dialog .payment-error {
    margin-top: 1rem;
    color: #bd5547;
    font-size: 1.1rem;
    line-height: 1.6;
  }
  .close {
    position: absolute;
    top: 0.8rem;
    right: 1rem;
    width: 3.6rem;
    height: 3.6rem;
    border: 0;
    border-radius: 50%;
    background: transparent;
    font-size: 2.6rem;
  }
  .confirm {
    width: 100%;
    min-height: 4.8rem;
    margin-top: 2rem;
    border: 0;
    border-radius: 1.2rem;
    background: var(--green);
    font-weight: 750;
  }
  .history-dialog ul {
    display: grid;
    gap: 0.8rem;
    margin: 2rem 0 0;
    padding: 0;
    list-style: none;
    text-align: left;
  }
  .history-dialog li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.2rem;
    border-radius: 1rem;
    background: #f3f6ee;
    font-size: 1.2rem;
  }
  .history-dialog li span,
  .empty-history {
    color: #899188;
    font-size: 1.1rem;
  }
  .empty-history {
    margin-top: 2rem;
  }
  @media (max-width: 37.4rem) {
    padding-right: 3rem;
    padding-left: 3rem;
  }
`;
