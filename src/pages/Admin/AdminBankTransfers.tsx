import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import MyPageFrame, { Panel } from "../MyPage/MyPageFrame";
import { isAdminToken } from "../../features/auth/session";
import {
  approveBankTransfer,
  getAdminBankTransfers,
  rejectBankTransfer,
  type AdminBankTransfer,
  type BankTransferStatus,
} from "../../features/payments/bankTransfer";

const statusFilters: Array<{ value: BankTransferStatus | "ALL"; label: string }> = [
  { value: "READY", label: "입금 대기" },
  { value: "PAID", label: "승인" },
  { value: "FAILED", label: "거절·취소" },
  { value: "ALL", label: "전체" },
];

const statusLabel: Record<AdminBankTransfer["status"], string> = {
  READY: "입금 대기",
  PAID: "승인됨",
  FAILED: "거절·취소",
  REFUNDED: "환불됨",
};

const formatWon = (amount: number) => amount.toLocaleString("ko-KR") + "원";
const formatTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

/**
 * 운영자 계좌이체 입금 확인 화면. 입금 신청 알림을 누르면 여기로 온다.
 * 통장 입금 내역에서 입금자명·금액을 확인하고 [입금 확인]을 누르면 보석이 지급된다.
 */
export default function AdminBankTransfers() {
  const [status, setStatus] = useState<BankTransferStatus | "ALL">("READY");
  const [items, setItems] = useState<AdminBankTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const isAdmin = isAdminToken();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await getAdminBankTransfers(status === "ALL" ? undefined : status));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "입금 신청 목록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (isAdmin) void load();
    else setLoading(false);
  }, [isAdmin, load]);

  async function approve(item: AdminBankTransfer) {
    if (
      !window.confirm(
        `${item.depositorName} 님의 ${formatWon(item.amount)} 입금을 확인했나요?\n승인하면 보석 ${item.grantedGem}개가 바로 지급돼요.`,
      )
    )
      return;
    await run(item, () => approveBankTransfer(item.orderId), "승인하지 못했어요.");
  }

  async function reject(item: AdminBankTransfer) {
    const reason = window.prompt(
      "거절 사유를 적어주세요. 사용자에게 알림으로 보내져요. (비워 두면 '입금이 확인되지 않았어요')",
      "",
    );
    if (reason === null) return;
    await run(item, () => rejectBankTransfer(item.orderId, reason), "거절하지 못했어요.");
  }

  async function run(item: AdminBankTransfer, action: () => Promise<unknown>, fallback: string) {
    setBusyId(item.orderId);
    setError("");
    try {
      await action();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : fallback);
    } finally {
      setBusyId("");
    }
  }

  if (!isAdmin) {
    return (
      <MyPageFrame title="입금 확인" backHref="/home">
        <Panel>
          <p className="hint">운영자만 볼 수 있는 화면이에요.</p>
        </Panel>
      </MyPageFrame>
    );
  }

  return (
    <MyPageFrame title="입금 확인" backHref="/home">
      <Filters aria-label="상태">
        {statusFilters.map((item) => (
          <button
            key={item.value}
            type="button"
            className={status === item.value ? "selected" : ""}
            aria-pressed={status === item.value}
            onClick={() => setStatus(item.value)}
          >
            {item.label}
          </button>
        ))}
      </Filters>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="hint" role="status">
          불러오는 중이에요…
        </p>
      ) : items.length === 0 ? (
        <Panel>
          <p className="hint">해당하는 입금 신청이 없어요.</p>
        </Panel>
      ) : (
        items.map((item) => (
          <Card key={item.orderId} data-done={item.status !== "READY" || undefined}>
            <div className="meta">
              <span className={`badge ${item.status === "READY" ? "pending" : ""}`}>
                {statusLabel[item.status]}
              </span>
              <time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>
            </div>
            <p className="amount">
              {formatWon(item.amount)} <span>· 입금자명</span> {item.depositorName}
            </p>
            <dl>
              <div>
                <dt>상품</dt>
                <dd>
                  {item.productName ?? "-"} (보석 {item.grantedGem}개)
                </dd>
              </div>
              <div>
                <dt>회원</dt>
                <dd>
                  {[item.memberName, item.memberEmail].filter(Boolean).join(" · ") ||
                    `회원 #${item.memberId}`}
                </dd>
              </div>
              {item.paidAt && (
                <div>
                  <dt>승인</dt>
                  <dd>{formatTime(item.paidAt)}</dd>
                </div>
              )}
              {item.status === "FAILED" && (
                <div>
                  <dt>사유</dt>
                  <dd>
                    {item.cancelReason ?? "-"} ({formatTime(item.canceledAt)})
                  </dd>
                </div>
              )}
              <div>
                <dt>주문</dt>
                <dd className="order">{item.orderId}</dd>
              </div>
            </dl>
            {item.status === "READY" && (
              <div className="actions">
                <button
                  type="button"
                  className="reject"
                  disabled={busyId === item.orderId}
                  onClick={() => void reject(item)}
                >
                  거절
                </button>
                <button
                  type="button"
                  className="approve"
                  disabled={busyId === item.orderId}
                  onClick={() => void approve(item)}
                >
                  {busyId === item.orderId ? "처리 중…" : "입금 확인 · 보석 지급"}
                </button>
              </div>
            )}
          </Card>
        ))
      )}
    </MyPageFrame>
  );
}

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-bottom: 1rem;
  button {
    min-height: 3.6rem;
    padding: 0 1.2rem;
    border: 0.1rem solid #dfe5dc;
    border-radius: 99px;
    background: #fff;
    color: #536057;
    font-size: 1.15rem;
  }
  button.selected {
    border-color: var(--green);
    background: var(--green);
    color: #273219;
    font-weight: 700;
  }
`;

const Card = styled(Panel)`
  &[data-done] {
    opacity: 0.7;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
  }
  .badge {
    padding: 0.3rem 0.8rem;
    border-radius: 99rem;
    background: #eef1ec;
    color: #647065;
    font-size: 1.05rem;
    font-weight: 700;
  }
  .badge.pending {
    background: #fff1cc;
    color: #7a5400;
  }
  time {
    margin-left: auto;
    color: #7d877a;
    font-size: 1.05rem;
  }
  .amount {
    margin: 1.2rem 0;
    color: #202820;
    font-size: 1.6rem;
    font-weight: 700;
    overflow-wrap: anywhere;
  }
  .amount span {
    color: #7d877a;
    font-size: 1.2rem;
    font-weight: 500;
  }
  dl {
    display: grid;
    gap: 0.4rem;
    margin: 0;
    font-size: 1.1rem;
  }
  dl > div {
    display: flex;
    gap: 0.8rem;
  }
  dt {
    flex: 0 0 4.5rem;
    color: #7d877a;
  }
  dd {
    margin: 0;
    color: #2f3a32;
    overflow-wrap: anywhere;
  }
  dd.order {
    color: #8a948b;
    font-size: 1rem;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 0.8rem;
    margin-top: 1.2rem;
  }
  .actions button {
    min-height: 4.2rem;
    border: 0;
    border-radius: 1rem;
    font-size: 1.25rem;
    font-weight: 700;
  }
  .actions .approve {
    background: var(--green);
    color: #273219;
  }
  .actions .reject {
    border: 0.1rem solid #dfe5dc;
    background: #fff;
    color: #8a4a3f;
  }
`;
