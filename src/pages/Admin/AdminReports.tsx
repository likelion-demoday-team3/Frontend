import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import MyPageFrame, { Panel } from "../MyPage/MyPageFrame";
import { isAdminToken } from "../../features/auth/session";
import {
  dismissReport,
  getAdminReports,
  reactivateMember,
  suspendMember,
  type AdminReport,
  type ReportPerson,
  type ReportStatus,
} from "../../features/reports/api";

const filters: Array<{ value: ReportStatus | "ALL"; label: string }> = [
  { value: "PENDING", label: "확인 전" },
  { value: "ACTIONED", label: "정지 처리" },
  { value: "DISMISSED", label: "기각" },
  { value: "ALL", label: "전체" },
];

const statusLabels: Record<ReportStatus, string> = {
  PENDING: "확인 전",
  ACTIONED: "정지 처리됨",
  DISMISSED: "기각됨",
};

const memberStatusLabels: Record<string, string> = {
  ACTIVE: "이용 중",
  SUSPENDED: "이용 정지",
  WITHDRAWN: "탈퇴",
};

const formatTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("ko-KR", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const describe = (person: ReportPerson) =>
  [person.alias, person.name, person.email].filter(Boolean).join(" · ") ||
  `회원 #${person.memberId}`;

/** 운영자 신고 확인 화면. 신고 알림을 누르면 여기로 온다 */
export default function AdminReports() {
  const [filter, setFilter] = useState<ReportStatus | "ALL">("PENDING");
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isAdmin = isAdminToken();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReports(await getAdminReports(filter === "ALL" ? undefined : filter));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "신고 목록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (isAdmin) void load();
    else setLoading(false);
  }, [isAdmin, load]);

  async function run(key: string, action: () => Promise<string>) {
    setBusyKey(key);
    setError("");
    setNotice("");
    try {
      setNotice(await action());
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "처리하지 못했어요.");
    } finally {
      setBusyKey(null);
    }
  }

  const suspend = (report: AdminReport) => {
    const target = describe(report.reported);
    if (
      !window.confirm(
        `${target} 님을 이용 정지할까요?\n새 세션 신청이 막히고, 신청해 둔 시작 전 세션은 취소돼요.
참가비는 환불 규정을 따라요 (24시간 전 100%, 12시간 전 50%, 그 이후 0%).`,
      )
    )
      return;
    void run(`suspend-${report.reportId}`, async () => {
      const result = await suspendMember(report.reported.memberId);
      return `${target} 님을 이용 정지했어요. 취소한 신청 ${result.cancelledApplications}개 (환불 보석 ${result.refundedGem}개), 함께 처리된 신고 ${result.resolvedReports}개`;
    });
  };

  const reactivate = (report: AdminReport) => {
    const target = describe(report.reported);
    if (!window.confirm(`${target} 님의 이용 정지를 해제할까요?`)) return;
    void run(`reactivate-${report.reportId}`, async () => {
      await reactivateMember(report.reported.memberId);
      return `${target} 님의 이용 정지를 해제했어요.`;
    });
  };

  const dismiss = (report: AdminReport) => {
    if (!window.confirm("이 신고를 기각할까요? (신고된 회원은 그대로 이용할 수 있어요)")) return;
    void run(`dismiss-${report.reportId}`, async () => {
      await dismissReport(report.reportId);
      return "신고를 기각했어요.";
    });
  };

  return (
    <MyPageFrame title="신고 관리" backHref="/home">
      {!isAdmin ? (
        <p className="error" role="alert">운영자만 볼 수 있는 화면이에요.</p>
      ) : (
        <>
          <Filters role="tablist" aria-label="신고 상태">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={filter === item.value}
                className={filter === item.value ? "active" : ""}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </Filters>
          {notice && <p className="success" role="status">{notice}</p>}
          {error && <p className="error" role="alert">{error}</p>}
          {loading ? (
            <p className="hint" role="status">신고 목록을 불러오는 중이에요…</p>
          ) : reports.length === 0 ? (
            <p className="hint">해당하는 신고가 없어요.</p>
          ) : (
            reports.map((report) => {
              const suspended = report.reported.status === "SUSPENDED";
              const withdrawn = report.reported.status === "WITHDRAWN";
              return (
                <ReportCard key={report.reportId} aria-label={`신고 #${report.reportId}`}>
                  <div className="panel-heading">
                    <h2>{report.reasonLabel}</h2>
                    <span className={`badge ${report.status.toLowerCase()}`}>
                      {statusLabels[report.status]}
                    </span>
                  </div>
                  <dl>
                    <dt>신고 대상</dt>
                    <dd>
                      {describe(report.reported)}
                      <small>
                        {memberStatusLabels[report.reported.status ?? ""] ?? "알 수 없음"} · 누적 신고{" "}
                        {report.reportedTotalCount}건
                      </small>
                    </dd>
                    <dt>신고자</dt>
                    <dd>{describe(report.reporter)}</dd>
                    <dt>세션</dt>
                    <dd>
                      #{report.sessionId} · {formatTime(report.sessionStartTime)}
                    </dd>
                    <dt>신고 시각</dt>
                    <dd>{formatTime(report.createdAt)}</dd>
                  </dl>
                  <div className="actions">
                    {report.status === "PENDING" && (
                      <button
                        type="button"
                        className="secondary"
                        disabled={busyKey !== null}
                        onClick={() => dismiss(report)}
                      >
                        기각
                      </button>
                    )}
                    {suspended ? (
                      <button
                        type="button"
                        className="secondary"
                        disabled={busyKey !== null}
                        onClick={() => reactivate(report)}
                      >
                        정지 해제
                      </button>
                    ) : (
                      !withdrawn && (
                        <button
                          type="button"
                          className="danger"
                          disabled={busyKey !== null}
                          onClick={() => suspend(report)}
                        >
                          이용 정지
                        </button>
                      )
                    )}
                  </div>
                </ReportCard>
              );
            })
          )}
        </>
      )}
    </MyPageFrame>
  );
}

const Filters = styled.div`
  display: flex;
  gap: 0.6rem;
  margin: 0.4rem 0 1.2rem;
  button {
    flex: 1;
    min-height: 3.8rem;
    border: 0.1rem solid #dfe5dc;
    border-radius: 99px;
    background: #fff;
    color: #536057;
    font-size: 1.2rem;
    font-weight: 600;
  }
  button.active {
    border-color: transparent;
    background: var(--green);
    color: #273219;
  }
`;

const ReportCard = styled(Panel)`
  .badge {
    flex-shrink: 0;
    padding: 0.4rem 0.9rem;
    border-radius: 99px;
    background: #f1f4ef;
    color: #536057;
    font-size: 1.1rem;
    font-weight: 700;
  }
  .badge.pending {
    background: #fff4e5;
    color: #b0660a;
  }
  .badge.actioned {
    background: #fdecec;
    color: #c34b4b;
  }
  dl {
    display: grid;
    grid-template-columns: 6.4rem 1fr;
    gap: 0.8rem 1rem;
    margin: 0;
    font-size: 1.25rem;
    line-height: 1.5;
  }
  dt {
    color: #7b847d;
  }
  dd {
    margin: 0;
    color: var(--ink);
    word-break: break-all;
  }
  dd small {
    display: block;
    color: #7b847d;
    font-size: 1.1rem;
  }
  .actions {
    display: flex;
    gap: 0.8rem;
    margin-top: 1.4rem;
  }
  .actions button {
    flex: 1;
    min-height: 4.2rem;
    border: 0;
    border-radius: 1rem;
    font-size: 1.3rem;
    font-weight: 700;
  }
  .actions .secondary {
    background: #f1f4ef;
    color: #536057;
  }
  .actions .danger {
    background: #c34b4b;
    color: #fff;
  }
  .actions button:disabled {
    opacity: 0.5;
  }
`;
