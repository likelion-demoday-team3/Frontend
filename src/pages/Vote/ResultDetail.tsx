import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import styled from "styled-components";
import PageHeader from "../../components/common/PageHeader";
import { getMyWallet } from "../../features/wallet/api";
import {
  getResultProducts,
  getResultDetails,
  getVoteSummary,
  purchaseResult,
  type ResultDetails,
  type ResultProduct,
  type ResultProductInfo,
  type VoteSummary,
} from "../../features/sessions/resultsApi";
import {
  createPreviewResult,
  previewResultProducts,
} from "../../test/previewFixtures";

const productLabels: Record<ResultProduct, string> = {
  FIRST_CHOOSERS: "나를 1순위로 선택한 사람",
  MY_FIRST_CHOICE_RANK: "내 1순위가 나를 선택한 순위",
  USER_RANKINGS: "닉네임 선택",
  ALL_RANKINGS: "전체 참여자의 선택 순위",
  BUNDLE: "결과 묶음",
};

export default function ResultDetail() {
  const sessionId = Number(
    new URLSearchParams(window.location.search).get("sessionId"),
  );
  const previewParams = new URLSearchParams(window.location.search);
  const preview =
    previewParams.has("preview") &&
    (import.meta.env.DEV || previewParams.has("showTest"));
  const [partners] = useState<Array<{ memberId: number; nickname: string }>>(
    () => {
      if (preview)
        return [
          { memberId: 2, nickname: "구름산책" },
          { memberId: 3, nickname: "달빛수집가" },
        ];
      try {
        const context = JSON.parse(
          sessionStorage.getItem(`kiiwee.session-context:${sessionId}`) ?? "{}",
        );
        return Array.isArray(context.partners)
          ? context.partners.filter(
              (
                person: unknown,
              ): person is { memberId: number; nickname: string } => {
                if (typeof person !== "object" || person === null) return false;
                const candidate = person as {
                  memberId?: unknown;
                  nickname?: unknown;
                };
                return (
                  typeof candidate.memberId === "number" &&
                  Number.isFinite(candidate.memberId) &&
                  typeof candidate.nickname === "string"
                );
              },
            )
          : [];
      } catch {
        return [];
      }
    },
  );
  const [gems, setGems] = useState(0);
  const [catalog, setCatalog] = useState<ResultProductInfo[]>([]);
  const [summary, setSummary] = useState<VoteSummary | null>(null);
  const [details, setDetails] = useState<ResultDetails[]>([]);
  const [targetIds, setTargetIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<ResultProduct | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (preview) {
      setCatalog(previewResultProducts);
      setSummary({ sessionId: 1, coupleCount: 3 });
      setGems(5);
      setLoading(false);
      return;
    }
    if (!sessionId) {
      setError("세션 정보가 없어 결과를 불러올 수 없어요.");
      setLoading(false);
      return;
    }
    let active = true;
    Promise.all([
      getMyWallet(),
      getVoteSummary(sessionId),
      getResultProducts(sessionId),
    ])
      .then(([wallet, result, products]) => {
        if (!active) return;
        setGems(wallet.gemBalance);
        setSummary(result);
        setCatalog(products);
        setError("");
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "결과를 불러오지 못했어요.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionId, preview]);

  async function unlock(product: ResultProduct, targetRequired: boolean) {
    if (preview) {
      setDetails((items) => [
        ...items.filter((item) => item.product !== product),
        createPreviewResult(product),
      ]);
      setGems((value) =>
        Math.max(
          0,
          value -
            (previewResultProducts.find((item) => item.product === product)
              ?.priceGem ?? 1),
        ),
      );
      return;
    }
    const targetId = targetRequired ? Number(targetIds[product]) : undefined;
    if (!sessionId || (targetRequired && (!targetId || targetId <= 0))) {
      setError("닉네임을 선택해주세요.");
      return;
    }
    setBusy(product);
    setError("");
    try {
      const result = await purchaseResult(sessionId, product, targetId);
      setDetails((items) => [
        ...items.filter((item) => item.product !== product),
        result.data,
      ]);
      const [wallet, unlocked] = await Promise.all([
        getMyWallet(),
        getResultDetails(sessionId, product, targetId),
      ]);
      setGems(wallet.gemBalance);
      setDetails((items) => [
        ...items.filter((item) => item.product !== product),
        unlocked,
      ]);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "결과를 열람하지 못했어요.",
      );
    } finally {
      setBusy(null);
    }
  }

  function goToContact(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    event.stopPropagation();
    window.history.pushState(null, "", `/contact?sessionId=${sessionId}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  return (
    <DetailPage>
      <PageHeader title="투표 결과" gems={gems} onGemsChange={setGems} />
      <main>
        {loading ? (
          <section className="pending-card" role="status">
            <p>투표 결과를 불러오는 중이에요…</p>
          </section>
        ) : error && !catalog.length && !preview ? (
          <section className="pending-card" role="alert">
            <h2>결과를 불러오지 못했어요</h2>
            <p>{error}</p>
          </section>
        ) : (
          <>
            <p className="intro">
              이번 세션의 투표 결과를 확인해보세요.{" "}
              {preview && <span>미리보기</span>}
            </p>
            {!preview && summary && (
              <section className="summary-card match-count">
                <span className="section-number">01</span>
                <div>
                  <h2>매칭된 커플 수</h2>
                  <p>서로를 1순위로 선택한 커플</p>
                </div>
                <strong className="count">
                  {summary.coupleCount}
                  <span>커플</span>
                </strong>
              </section>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {catalog.map((item, index) => {
              const unlocked = details.find(
                (detail) => detail.product === item.product,
              );
              return (
                <section className="people-card" key={item.product}>
                  <div
                    className={
                      item.targetRequired
                        ? "people-heading nickname-heading"
                        : "people-heading"
                    }
                  >
                    <span className="section-number">
                      {String(index + 2).padStart(2, "0")}
                    </span>
                    {!item.targetRequired && (
                      <h2>{productLabels[item.product]}</h2>
                    )}
                    {item.targetRequired && (
                      <select
                        className="target-select"
                        aria-label="닉네임 선택하기"
                        value={targetIds[item.product] ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          setTargetIds((values) => ({
                            ...values,
                            [item.product]: value,
                          }));
                          setDetails((items) =>
                            items.filter(
                              (detail) => detail.product !== item.product,
                            ),
                          );
                        }}
                      >
                        <option value="">선택해주세요.</option>
                        {partners.map((person) => (
                          <option key={person.memberId} value={person.memberId}>
                            {person.nickname}
                          </option>
                        ))}
                      </select>
                    )}
                    {item.targetRequired && (
                      <h2 className="selection-suffix">님의 선택 보기</h2>
                    )}
                  </div>
                  {unlocked ? (
                    <ResultContents details={unlocked} />
                  ) : (
                    <div className="locked-content">
                      <button
                        type="button"
                        disabled={
                          gems < item.priceGem ||
                          busy !== null ||
                          (item.targetRequired && !targetIds[item.product])
                        }
                        onClick={() =>
                          void unlock(item.product, item.targetRequired)
                        }
                      >
                        {busy === item.product
                          ? "열람 중…"
                          : `보석 ${item.priceGem}개로 열람`}
                      </button>
                    </div>
                  )}
                </section>
              );
            })}
          </>
        )}
      </main>
      <a
        className="next-button"
        href={`/contact?sessionId=${sessionId}`}
        onClick={goToContact}
      >
        마지막 단계로 가기
      </a>
    </DetailPage>
  );
}

function ResultContents({ details }: { details: ResultDetails }) {
  return (
    <div className="unlocked-results">
      {details.firstChoosers.length > 0 && (
        <ul>
          {details.firstChoosers.map((person) => (
            <li key={person.memberId}>{person.alias}</li>
          ))}
        </ul>
      )}
      {details.myRank && (
        <p className="my-rank-message">
          <span className="inline-choice-chip">
            {details.myRank.myFirstChoice.alias}
          </span>
          <span>님이 나를</span>
          {details.myRank.rankOfMe ? (
            <>
              <span className="inline-choice-chip">
                {details.myRank.rankOfMe}순위
              </span>
              <span>로 선택했습니다.</span>
            </>
          ) : (
            <>
              <span>선택하지</span>
              <span className="inline-choice-chip">않았습니다.</span>
            </>
          )}
        </p>
      )}
      {details.product === "USER_RANKINGS" &&
        details.rankings.map((ranking) => (
          <div className="selected-vote" key={ranking.voter.memberId}>
            {ranking.submitted ? (
              [1, 2, 3].map((rank) => {
                const choice = ranking.choices.find(
                  (item) => item.rank === rank,
                );
                return (
                  <p className="rank-choice" key={rank}>
                    <strong>{rank}순위</strong>
                    <span>{choice?.target.alias ?? "선택하지 않았어요"}</span>
                  </p>
                );
              })
            ) : (
              <p>제출한 투표가 없어요.</p>
            )}
          </div>
        ))}
      {details.product !== "USER_RANKINGS" &&
        details.rankings.map((ranking) => (
          <p key={ranking.voter.memberId}>
            <strong>{ranking.voter.alias}</strong>
            {ranking.submitted
              ? `: ${ranking.choices.map((choice) => `${choice.rank}순위 ${choice.target.alias}`).join(" · ") || "선택 없음"}`
              : ": 미제출"}
          </p>
        ))}
      {!details.firstChoosers.length &&
        !details.myRank &&
        !details.rankings.length && <p>해당하는 결과가 없어요.</p>}
    </div>
  );
}

const DetailPage = styled.div`
  width: 100%;
  max-width: 43rem;
  min-height: 100dvh;
  margin: 0 auto;
  padding: calc(1.2rem + env(safe-area-inset-top)) 2.4rem
    calc(9rem + env(safe-area-inset-bottom));
  background: var(--background);
  color: var(--ink);
  box-shadow: 0 0 6rem #26372508;

  .intro {
    margin: 2rem 0 1.8rem;
    color: #818a7f;
    font-size: 1.3rem;
  }
  .intro span {
    margin-left: 0.5rem;
    padding: 0.3rem 0.7rem;
    border-radius: 99rem;
    background: #f2ffd1;
    color: #6c832f;
    font-size: 1rem;
  }
  .pending-card {
    display: grid;
    min-height: 30rem;
    align-content: center;
    justify-items: center;
    gap: 1rem;
    padding: 2rem;
    border: 1px solid #e4e9df;
    border-radius: 1.8rem;
    background: white;
    text-align: center;
  }
  .pending-card h2 {
    font: 400 1.9rem/1.4 var(--display-font);
  }
  .pending-card p {
    max-width: 28rem;
    color: #818a7f;
    font-size: 1.25rem;
    line-height: 1.7;
  }
  .summary-card,
  .people-card {
    margin-bottom: 1.2rem;
    border: 1px solid #e4e9df;
    border-radius: 1.8rem;
    background: #fff;
    box-shadow: 0 0.5rem 1.8rem #26372508;
  }
  .summary-card {
    display: grid;
    grid-template-columns: 3.2rem 1fr auto;
    align-items: center;
    gap: 1rem;
    min-height: 9rem;
    padding: 1.4rem;
  }
  .match-count {
    background: #f5faea;
  }
  .crossed-count {
    background: #fffaf2;
  }
  .section-number {
    display: grid;
    width: 3rem;
    height: 3rem;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 1rem;
    background: #eaf3d7;
    color: #68862d;
    font-size: 1.1rem;
    font-weight: 800;
  }
  .crossed-count .section-number {
    background: #f8ebd9;
    color: #9a7548;
  }
  .summary-card h2,
  .people-card h2 {
    color: #283027;
    font: 400 1.55rem/1.4 var(--display-font);
  }
  .summary-card p {
    margin-top: 0.4rem;
    color: #899188;
    font-size: 1.05rem;
    line-height: 1.5;
  }
  .count {
    color: #66852b;
    font: 400 2.3rem/1 var(--display-font);
    white-space: nowrap;
  }
  .crossed-count .count {
    color: #a17a4c;
  }
  .count span {
    margin-left: 0.3rem;
    font: 500 1.1rem var(--font-body);
  }
  .people-card {
    padding: 1.6rem;
  }
  .people-heading {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .people-heading h2 {
    min-width: 0;
    flex: 1 1 auto;
    font-size: 1.6rem;
  }
  .target-select {
    width: min(40%, 17rem);
    min-width: 12rem;
    min-height: 4rem;
    flex: 0 1 40%;
    appearance: none;
    padding: 0 2.6rem 0 1rem;
    border: 1px solid #e0e6dc;
    border-radius: 1rem;
    background: #f7f9f4
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%232b302c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")
      no-repeat right 1.4rem center / 1rem;
    color: var(--ink);
    font: 600 1.15rem/1.3 var(--font-body);
  }
  .nickname-heading .selection-suffix {
    flex: 0 0 auto;
    font-size: 1.55rem;
    white-space: nowrap;
  }
  .locked-content {
    display: flex;
    min-height: 15rem;
    align-items: center;
    justify-content: center;
    margin-top: 1.4rem;
    border-radius: 1.3rem;
    background: #f7f9f4;
  }
  .locked-content button {
    min-width: 17rem;
    min-height: 4rem;
    padding: 0.8rem 1.2rem;
    border: 0;
    border-radius: 1rem;
    background: var(--green);
    color: var(--ink);
    font-size: 1.25rem;
    font-weight: 700;
  }
  .locked-content button:disabled {
    background: #e4e8df;
    color: #929a8d;
  }
  .people-card ul {
    display: grid;
    gap: 0.8rem;
    margin: 1.4rem 0 0;
    padding: 0;
    list-style: none;
  }
  .selected-vote {
    display: grid;
    gap: 0.8rem;
    margin-top: 1.4rem;
  }
  .selected-vote h3 {
    margin: 0;
    color: #283027;
    font: 400 1.45rem/1.4 var(--display-font);
  }
  .selected-vote p {
    margin: 0;
    padding: 1rem 1.2rem;
    border-radius: 1rem;
    background: #f7f9f4;
    font-size: 1.25rem;
  }
  .selected-vote .rank-choice {
    display: flex;
    height: 4.4rem;
    min-height: 4.4rem;
    align-items: center;
    gap: 1rem;
    box-sizing: border-box;
  }
  .rank-choice strong {
    min-width: 5rem;
    color: #66852b;
    font-weight: 750;
  }
  .rank-choice span {
    font-weight: 600;
  }
  .my-rank-message {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1.4rem 0 0;
    color: #283027;
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.4;
  }
  .inline-choice-chip {
    display: inline-flex;
    width: fit-content;
    height: 4.4rem;
    min-height: 4.4rem;
    align-items: center;
    padding: 1rem 1.2rem;
    border-radius: 1rem;
    background: #f7f9f4;
    box-sizing: border-box;
    font-size: 1.25rem;
    font-weight: 600;
    white-space: nowrap;
  }
  .people-card li {
    display: flex;
    height: 4.4rem;
    min-height: 4.4rem;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.2rem;
    border-radius: 1rem;
    background: #f7f9f4;
    font-size: 1.25rem;
    font-weight: 600;
    box-sizing: border-box;
  }
  .avatar {
    display: grid;
    width: 3.6rem;
    height: 3.6rem;
    place-items: center;
    border-radius: 50%;
    background: #edf4dd;
    color: #65852b;
    font: 400 1.7rem var(--display-font);
  }
  .avatar.tone-1 {
    background: #f8ebd9;
    color: #94714b;
  }
  .small-arrow {
    margin-left: auto;
    color: #a5ad9d;
    font-size: 1.6rem;
  }
  .next-button {
    display: flex;
    min-height: 5.2rem;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 2rem;
    border-radius: 1.4rem;
    background: #011020;
    color: white;
    font-weight: 700;
    text-decoration: none;
  }
  @media (max-width: 37.4rem) {
    padding-right: 2.4rem;
    padding-left: 2.4rem;
    .people-heading:not(.nickname-heading) {
      flex-wrap: wrap;
    }
    .people-heading:not(.nickname-heading) h2 {
      flex: 1 1 calc(100% - 4rem);
    }
    .target-select {
      width: min(40%, 17rem);
      min-width: 0;
    }
    .nickname-heading .selection-suffix {
      font-size: 1.2rem;
    }
  }
`;
