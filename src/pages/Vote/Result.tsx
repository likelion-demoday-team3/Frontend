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
  const matched = params.get("preview") !== "failed";
  const partnerAlreadyAccepted = params.get("preview") === "mutual";
  const [gems, setGems] = useState(0);
  const [summary, setSummary] = useState<VoteSummary | null>(null);
  const [personalMatch, setPersonalMatch] = useState<MatchHistoryItem | null>(null);
  const [loading, setLoading] = useState(!mockMode);
  const [loadError, setLoadError] = useState("");
  const [myDecision, setMyDecision] = useState<"accepted" | "declined" | null>(
    null,
  );
  const partnerAccepted = partnerAlreadyAccepted;

  useEffect(() => {
    if (mockMode) {
      setGems(5);
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
        {mockMode ? (
          matched ? (
            <>
              <section className="match-intro">
                <h2>
                  축하합니다!
                  <br />
                  매칭이 성사되었습니다.
                </h2>
                <p>연락처를 교환하실건가요?</p>
              </section>

              <section className="exchange-card" aria-label="연락처 교환 의사">
                <div className="profile mine">
                  <div className="avatar">나</div>
                  <strong>내 닉네임</strong>
                  <span>나</span>
                </div>
                <div
                  className="exchange-flow"
                  aria-label={
                    myDecision === "accepted" && partnerAccepted
                      ? "서로 수락했어요"
                      : "연락처 교환 응답 대기 중"
                  }
                >
                  <span
                    className={`flow-line${myDecision === "accepted" ? " accepted" : ""}`}
                  />
                  <span
                    className={`flow-line reverse${partnerAccepted ? " accepted" : ""}`}
                  />
                  <span className="flow-heart" aria-hidden="true">
                    ♥
                  </span>
                </div>
                <div className="profile partner">
                  <div className="avatar">구</div>
                  <strong>구름산책</strong>
                  <span>상대방</span>
                </div>
                <div className="decision-actions">
                  <button
                    type="button"
                    className={myDecision === "accepted" ? "selected" : ""}
                    onClick={() => setMyDecision("accepted")}
                  >
                    수락
                  </button>
                  <button
                    type="button"
                    className={
                      myDecision === "declined"
                        ? "selected secondary"
                        : "secondary"
                    }
                    onClick={() => setMyDecision("declined")}
                  >
                    거절
                  </button>
                </div>
                <p className="partner-note" role="status">
                  {partnerAccepted
                    ? "상대방이 연락처 교환을 수락했어요."
                    : "응답 대기 중..."}
                </p>
              </section>
            </>
          ) : (
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
                  message="아직 끝나지 않았어요! 마지막까지 함께해주세요!"
                  variant="conversation"
                />
                <img src="/kw1.svg" alt="키위 캐릭터" />
              </section>
            </>
          )
        ) : loading ? (
          <section className="pending-card" role="status">
            <h2>결과를 불러오는 중이에요</h2>
          </section>
        ) : loadError ? (
          <section className="pending-card" role="alert">
            <h2>결과를 불러오지 못했어요</h2>
            <p>{loadError}</p>
          </section>
        ) : personalMatch?.matched ? (
          <>
            <section className="match-intro">
              <h2>
                축하해요!
                <br />
                {personalMatch.partnerAlias ?? "상대방"}님과 매칭됐어요.
              </h2>
              <p>서로를 최종 선택했어요.</p>
            </section>
            <section className="summary-card personal-match-card">
              <div className="avatar">
                {Array.from(personalMatch.partnerAlias ?? "상")[0]}
              </div>
              <strong>{personalMatch.partnerAlias ?? "상대방"}</strong>
              <p>서로의 선택이 이어졌어요. 연락처를 확인해보세요.</p>
              <a className="contact-result-button" href={`/contact?sessionId=${sessionId}`}>
                연락처 확인하기
              </a>
              <p className="couple-count">
                이번 세션에서 {summary?.coupleCount ?? 0}커플이 매칭됐어요.
              </p>
            </section>
          </>
        ) : personalMatch ? (
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
  .match-intro p {
    margin-top: 1.6rem;
    color: #747f73;
    font-size: 1.5rem;
  }
  .exchange-card {
    position: relative;
    padding: 2.2rem 1.5rem 1.7rem;
    border: 1px solid #e4e9df;
    border-radius: 2.2rem;
    background: white;
    box-shadow: 0 0.8rem 2rem #26372508;
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
  .personal-match-card > p,
  .couple-count {
    color: #747f73;
    font-size: 1.3rem;
    line-height: 1.6;
  }
  .contact-result-button {
    display: flex;
    width: 100%;
    min-height: 4.8rem;
    align-items: center;
    justify-content: center;
    margin-top: 0.6rem;
    border-radius: 1.2rem;
    background: var(--green);
    color: var(--ink);
    font-weight: 700;
    text-decoration: none;
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
  .profile {
    display: flex;
    width: 39%;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    text-align: center;
  }
  .profile.mine {
    float: left;
  }
  .profile.partner {
    float: right;
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
  .partner .avatar {
    border-color: #f0dfc9;
    background: #fff6e9;
    color: #8b6d51;
  }
  .profile strong {
    font-size: 1.35rem;
  }
  .profile > span {
    color: #90988d;
    font-size: 1.1rem;
  }
  .exchange-flow {
    position: absolute;
    top: 4.9rem;
    left: 50%;
    display: flex;
    width: 8.8rem;
    height: 2.8rem;
    flex-direction: column;
    justify-content: center;
    gap: 1rem;
    transform: translateX(-50%);
  }
  .flow-line {
    position: relative;
    display: block;
    width: 100%;
    height: 0.38rem;
    border-radius: 1rem;
    background: #c7cdc3;
    transition: background 180ms ease;
  }
  .flow-line::after {
    position: absolute;
    top: 50%;
    right: -0.1rem;
    width: 0.8rem;
    height: 0.8rem;
    border-top: 0.34rem solid currentColor;
    border-right: 0.34rem solid currentColor;
    color: #c7cdc3;
    content: "";
    transform: translateY(-50%) rotate(45deg);
  }
  .flow-line.accepted {
    background: #00111f;
  }
  .flow-line.accepted::after {
    color: #00111f;
  }
  .flow-line.reverse {
    transform: rotate(180deg);
  }
  .flow-heart {
    position: absolute;
    top: 50%;
    left: 50%;
    padding: 0.3rem;
    background: white;
    color: #96a092;
    font-size: 1.8rem;
    transform: translate(-50%, -50%);
  }
  .decision-actions {
    display: grid;
    clear: both;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
    padding-top: 1.8rem;
  }
  .decision-actions button {
    min-height: 4.5rem;
    border: 1px solid #e0e5dc;
    border-radius: 1.2rem;
    background: white;
    color: var(--ink);
    font-weight: 700;
    transition:
      background 160ms ease,
      border-color 160ms ease;
  }
  .decision-actions button.selected {
    border-color: #a8d348;
    background: var(--green);
  }
  .decision-actions button.selected.secondary {
    border-color: #a8d348;
    background: var(--green);
  }
  .decision-note,
  .partner-note {
    margin-top: 1.1rem;
    color: #6c832f;
    font-size: 1.2rem;
    text-align: center;
  }
  .partner-note {
    color: #6c832f;
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
