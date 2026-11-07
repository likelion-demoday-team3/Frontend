import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import MyPageFrame, { Panel } from "../MyPage/MyPageFrame";
import { isAdminToken } from "../../features/auth/session";
import {
  getAdminErrorReports,
  resolveErrorReport,
  type AdminErrorReport,
  type ErrorReportKind,
  type ErrorReportStatus,
} from "../../features/errorReports/api";

const statusFilters: Array<{ value: ErrorReportStatus | "ALL"; label: string }> = [
  { value: "OPEN", label: "확인 전" },
  { value: "RESOLVED", label: "해결" },
  { value: "ALL", label: "전체" },
];

const kindFilters: Array<{ value: ErrorReportKind | "ALL"; label: string }> = [
  { value: "ALL", label: "모두" },
  { value: "USER", label: "직접 제보" },
  { value: "AUTO", label: "자동 수집" },
];

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

/** 운영자 오류 제보 확인 화면. 오류 제보 알림을 누르면 여기로 온다 */
export default function AdminErrorReports() {
  const [status, setStatus] = useState<ErrorReportStatus | "ALL">("OPEN");
  const [kind, setKind] = useState<ErrorReportKind | "ALL">("ALL");
  const [items, setItems] = useState<AdminErrorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const isAdmin = isAdminToken();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(
        await getAdminErrorReports({
          status: status === "ALL" ? undefined : status,
          kind: kind === "ALL" ? undefined : kind,
        }),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "오류 제보 목록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [status, kind]);

  useEffect(() => {
    if (isAdmin) void load();
    else setLoading(false);
  }, [isAdmin, load]);

  async function resolve(item: AdminErrorReport) {
    setBusyId(item.id);
    setError("");
    try {
      await resolveErrorReport(item.id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "해결 처리하지 못했어요.");
    } finally {
      setBusyId(null);
    }
  }

  if (!isAdmin) {
    return (
      <MyPageFrame title="오류 제보 관리" backHref="/home">
        <Panel>
          <p className="hint">운영자만 볼 수 있는 화면이에요.</p>
        </Panel>
      </MyPageFrame>
    );
  }

  return (
    <MyPageFrame title="오류 제보 관리" backHref="/home">
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
      <Filters aria-label="종류">
        {kindFilters.map((item) => (
          <button
            key={item.value}
            type="button"
            className={kind === item.value ? "selected" : ""}
            aria-pressed={kind === item.value}
            onClick={() => setKind(item.value)}
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
          <p className="hint">해당하는 오류 제보가 없어요.</p>
        </Panel>
      ) : (
        items.map((item) => (
          <Card key={item.id} data-resolved={item.status === "RESOLVED" || undefined}>
            <div className="meta">
              <span className={`badge ${item.kind === "USER" ? "user" : "auto"}`}>
                {item.kind === "USER" ? "직접 제보" : "자동 수집"}
              </span>
              {item.occurrenceCount > 1 && <span className="badge">{item.occurrenceCount}회</span>}
              {item.status === "RESOLVED" && <span className="badge">해결됨</span>}
              <time dateTime={item.lastOccurredAt}>{formatTime(item.lastOccurredAt)}</time>
            </div>
            <p className="message">{item.message}</p>
            <dl>
              <div>
                <dt>제보자</dt>
                <dd>
                  {item.reporter
                    ? [item.reporter.name, item.reporter.email].filter(Boolean).join(" · ") ||
                      `회원 #${item.reporter.memberId}`
                    : "-"}
                </dd>
              </div>
              <div>
                <dt>화면</dt>
                <dd>{item.pageUrl ?? "-"}</dd>
              </div>
              <div>
                <dt>처음</dt>
                <dd>{formatTime(item.createdAt)}</dd>
              </div>
            </dl>
            {(item.detail || item.userAgent) && (
              <details>
                <summary>자세히</summary>
                {item.userAgent && <p className="ua">{item.userAgent}</p>}
                {item.detail && <pre>{item.detail}</pre>}
              </details>
            )}
            {item.status === "OPEN" && (
              <button
                className="resolve"
                type="button"
                disabled={busyId === item.id}
                onClick={() => void resolve(item)}
              >
                {busyId === item.id ? "처리 중…" : "해결 처리"}
              </button>
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
  &[data-resolved] {
    opacity: 0.6;
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
  .badge.user {
    background: var(--green);
    color: #273219;
  }
  .badge.auto {
    background: #17231b;
    color: #fff;
  }
  time {
    margin-left: auto;
    color: #7d877a;
    font-size: 1.05rem;
  }
  .message {
    margin: 1.2rem 0;
    color: #202820;
    font-size: 1.35rem;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
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
  details {
    margin-top: 1rem;
    font-size: 1.05rem;
  }
  summary {
    color: #2f5d43;
    font-weight: 700;
    cursor: pointer;
  }
  .ua {
    margin: 0.8rem 0;
    color: #69756b;
    overflow-wrap: anywhere;
  }
  pre {
    max-height: 24rem;
    overflow: auto;
    padding: 1rem;
    border-radius: 0.8rem;
    background: #f5f7f3;
    color: #2f3a32;
    font-size: 1rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .resolve {
    width: 100%;
    min-height: 4.2rem;
    margin-top: 1.2rem;
    border: 0;
    border-radius: 1rem;
    background: var(--green);
    color: #273219;
    font-size: 1.25rem;
    font-weight: 700;
  }
`;
