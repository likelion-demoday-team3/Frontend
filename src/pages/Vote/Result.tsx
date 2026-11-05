import { useEffect, useState } from "react";
import styled from "styled-components";
import PageHeader from "../../components/common/PageHeader";
import GuideBubble from "../../components/Session/GuideBubble";
import { getMyWallet } from "../../features/wallet/api";
import {
  getVoteSummary,
  type VoteSummary,
} from "../../features/sessions/resultsApi";
import { getMatchHistory, type MatchHistoryItem } from "../../features/records/api";

export default function Result() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = Number(params.get("sessionId"));
  const mockMode =
    params.has("preview") && (import.meta.env.DEV || params.has("showTest"));
  const previewMatched = params.get("preview") !== "failed";
  const [gems, setGems] = useState(0);
  const [summary, setSummary] = useState<VoteSummary | null>(null);
  const [personalMatch, setPersonalMatch] = useState<MatchHistoryItem | null>(null);
  const [loading, setLoading] = useState(!mockMode);
  const [loadError, setLoadError] = useState("");
  const displayedMatch: MatchHistoryItem | null = mockMode
    ? {
        sessionId: sessionId || 1,
        sessionStartTime: new Date().toISOString(),
        matched: previewMatched,
        partnerMemberId: previewMatched ? 2 : null,
        partnerAlias: previewMatched ? "구름산책" : null,
        matchedAt: previewMatched ? new Date().toISOString() : null,
      }
    : personalMatch;

  useEffect(() => {
    if (mockMode) {
      setGems(5);
      setSummary({ sessionId: sessionId || 1, coupleCount: 3 });
      setLoading(false);
      return;
    }
    if (!sessionId) {
      setLoadError("결과를 불러올 세션 정보가 없어요.");
      setLoading(false);
      return;
    }
    let active = true;
    Promise.allSettled([
      getVoteSummary(sessionId),
      getMyWallet(),
      getMatchHistory(),
    ])
      .then(([summaryResult, walletResult, historyResult]) => {
        if (!active) return;
        if (summaryResult.status === "fulfilled")
          setSummary(summaryResult.value);
        if (walletResult.status === "fulfilled")
          setGems(walletResult.value.gemBalance);
        if (historyResult.status === "fulfilled") {
          setPersonalMatch(
            historyResult.value.find((item) => item.sessionId === sessionId) ??
              null,
          );
          setLoadError("");
        } else {
          setLoadError(
            historyResult.reason instanceof Error
              ? historyResult.reason.message
              : "결과를 불러오지 못했어요.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionId, mockMode]);

  return (
    <ResultPage>
      <PageHeader title="투표 결과" gems={gems} onGemsChange={setGems} />

      <main>
        {!mockMode && loading ? (
          <section className="pending-card" role="status">
            <h2>결과를 불러오는 중이에요</h2>
          </section>
        ) : !mockMode && loadError ? (
          <section className="pending-card" role="alert">
            <h2>결과를 불러오지 못했어요</h2>
            <p>{loadError}</p>
          </section>
        ) : displayedMatch?.matched ? (
          <>
            <section className="match-intro">
              <span className="match-heart" aria-hidden="true">♥</span>
              <h2>
                축하해요!
                <br />
                {displayedMatch.partnerAlias ?? "상대방"}님과 매칭됐어요.
              </h2>
              <p>서로를 1순위로 선택했어요.</p>
            </section>
            <section className="summary-card personal-match-card">
              <div className="avatar">
                {Array.from(displayedMatch.partnerAlias ?? "상")[0]}
              </div>
              <strong>{displayedMatch.partnerAlias ?? "상대방"}</strong>
              <p className="contact-note">
                연락처가 자동으로 교환됐어요.
                <br />
                마이페이지 &gt; 소개팅 기록에서 확인할 수 있어요.
              </p>
            </section>
          </>
        ) : displayedMatch ? (
          <>
            <section className="miss-intro">
              <h2>
                아쉽지만 이번에는
                <br />
                매칭이 이루어지지 않았어요.
              </h2>
            </section>
            <section className="miss-card">
              <GuideBubble
                message="함께해주셔서 고마워요. 다음 만남도 기다릴게요!"
                variant="conversation"
              />
              <img src="/kw1.svg" alt="키위 캐릭터" />
              <p>이번 세션에서 {summary?.coupleCount ?? 0}커플이 매칭됐어요.</p>
            </section>
          </>
        ) : (
          <section className="pending-card" role="status">
            <h2>개인 매칭 기록을 찾지 못했어요</h2>
            <p>잠시 후 최종 매칭 결과 기록에서 확인해주세요.</p>
          </section>
        )}
      </main>

      <a
        className="more-button"
        href={`/result-detail?sessionId=${sessionId}${mockMode ? "&preview=sample&showTest=1" : ""}`}
      >
        투표 결과 상세 보기
      </a>
    </ResultPage>
  );
}

const ResultPage = styled.div`
  position: relative;
  display: flex;
  width: 100%;
  max-width: 43rem;
  min-height: 100dvh;
  flex-direction: column;
  margin: 0 auto;
  padding: calc(1.2rem + env(safe-area-inset-top)) 2.4rem
    calc(9rem + env(safe-area-inset-bottom));
  overflow-x: hidden;
  background: var(--background);
  color: var(--ink);
  box-shadow: 0 0 6rem #26372508;

  main {
    display: flex;
    flex: 1;
    flex-direction: column;
  }
  .match-intro,
  .miss-intro {
    padding: clamp(3rem, 8dvh, 6.5rem) 0 2.8rem;
    text-align: center;
  }
  .match-intro h2,
  .miss-intro h2 {
    margin-top: 1.2rem;
    color: #202820;
    font: 400 2.8rem/1.4 var(--display-font);
  }
  .match-heart {
    display: block;
    margin-bottom: 0.8rem;
    color: #ff4a78;
    font-size: 3.2rem;
    line-height: 1;
  }
  .match-intro p {
    margin-top: 1.6rem;
    color: #747f73;
    font-size: 1.5rem;
  }
  .personal-match-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
    padding: 2.4rem;
    text-align: center;
  }
  .personal-match-card .avatar {
    display: grid;
    width: 6.8rem;
    height: 6.8rem;
    place-items: center;
    border: 0.3rem solid #e2edc9;
    border-radius: 50%;
    background: #f0f7e2;
    color: #607d2f;
    font: 400 2.6rem var(--display-font);
  }
  .personal-match-card > strong {
    font-size: 1.8rem;
  }
  .personal-match-card > p {
    color: #747f73;
    font-size: 1.3rem;
    line-height: 1.6;
  }
  .personal-match-card .contact-note {
    max-width: 30rem;
    margin-top: 0.4rem;
  }
  .pending-card {
    display: grid;
    flex: 1;
    align-content: center;
    justify-items: center;
    gap: 1.2rem;
    padding: 2rem;
    text-align: center;
  }
  .pending-card h2 {
    font: 400 2rem/1.4 var(--display-font);
  }
  .pending-card p {
    max-width: 28rem;
    color: #7d877b;
    font-size: 1.3rem;
    line-height: 1.7;
  }
  .avatar {
    display: grid;
    width: 6.8rem;
    height: 6.8rem;
    place-items: center;
    border: 0.3rem solid #e2edc9;
    border-radius: 50%;
    background: #f0f7e2;
    color: #607d2f;
    font: 400 2.6rem var(--display-font);
  }
  .miss-intro {
    padding-bottom: 2rem;
  }
  .miss-card {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem 0 4rem;
    text-align: center;
  }
  .miss-card img {
    width: 13rem;
    height: 13rem;
    margin-top: 2.8rem;
    object-fit: contain;
  }
  .miss-card p {
    margin-top: 1.2rem;
    color: #8b938d;
    font-size: 1.3rem;
    line-height: 1.7;
  }
  .more-button {
    position: fixed;
    z-index: 10;
    right: max(calc((100vw - 43rem) / 2 + 2.4rem), 2.4rem);
    bottom: calc(1.6rem + env(safe-area-inset-bottom));
    left: max(calc((100vw - 43rem) / 2 + 2.4rem), 2.4rem);
    display: flex;
    min-height: 5.2rem;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    border-radius: 1.4rem;
    background: #011020;
    color: white;
    font-weight: 700;
    text-decoration: none;
  }
  .more-button span {
    font-size: 1.8rem;
  }
  @media (max-width: 37.4rem) {
    padding-right: 2.4rem;
    padding-left: 2.4rem;
  }
`;
