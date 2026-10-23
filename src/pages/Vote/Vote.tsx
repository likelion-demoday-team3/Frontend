import { useEffect, useState } from "react";
import styled from "styled-components";

export type VoteCandidate = {
  memberId: number;
  nickname: string;
  roundNumber: number;
};

type VoteProps = {
  candidates: VoteCandidate[];
  myAlias?: string | null;
  allowLocalSubmit?: boolean;
  onSubmit?: (rankedMemberIds: number[]) => Promise<unknown>;
  votingEndsAt?: string | null;
};

export default function Vote({ candidates, myAlias, allowLocalSubmit = false, onSubmit, votingEndsAt = null }: VoteProps) {
  const [rankedIds, setRankedIds] = useState<Array<number | null>>([
    null,
    null,
    null,
  ]);
  const [activeRank, setActiveRank] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!votingEndsAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [votingEndsAt]);

  const nicknameById = new Map(
    candidates.map((candidate) => [candidate.memberId, candidate.nickname]),
  );
  const selectedRankById = new Map<number, number>();
  rankedIds.forEach((memberId, index) => {
    if (memberId !== null) selectedRankById.set(memberId, index + 1);
  });
  const hasFirstChoice = rankedIds[0] !== null;
  const votingRemaining = votingEndsAt ? Math.max(0, new Date(votingEndsAt).getTime() - now) : null;
  const votingCountdown = votingRemaining === null ? null : `${String(Math.floor(votingRemaining / 60000)).padStart(2, '0')}:${String(Math.floor((votingRemaining % 60000) / 1000)).padStart(2, '0')}`;

  function toggleRank(rank: number) {
    if (submitted) return;
    setActiveRank((current) => (current === rank ? null : rank));
  }

  function selectCandidate(candidate: VoteCandidate) {
    if (submitted) return;
    const selectedRank = selectedRankById.get(candidate.memberId);
    if (selectedRank) {
      setRankedIds((current) =>
        current.map((memberId, index) =>
          index === selectedRank - 1 ? null : memberId,
        ),
      );
      setActiveRank(null);
      return;
    }
    if (activeRank === null) return;
    setRankedIds((current) =>
      current.map((memberId, index) =>
        index === activeRank - 1 ? candidate.memberId : memberId,
      ),
    );
    setActiveRank(null);
  }

  async function submitVote() {
    const rankedMemberIds = rankedIds.filter((memberId): memberId is number => memberId !== null);
    if (!rankedMemberIds.length || submitting || votingRemaining === 0) return;
    if (allowLocalSubmit) {
      setSubmitted(true);
      return;
    }
    if (!onSubmit) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onSubmit(rankedMemberIds);
      setSubmitted(true);
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : '투표를 제출하지 못했어요. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <VoteLayout aria-label="최종 투표">
      <RankingPanel>
        <h2>
          {myAlias
            ? `${myAlias}님이 선택한 최종 순위`
            : "내가 선택한 최종 순위"}
        </h2>
        {votingCountdown !== null && <p className="vote-countdown" role="timer">투표 종료까지 {votingCountdown}</p>}
        <p className="ranking-help">
          {activeRank === null
            ? "+ 버튼을 누르고 아래 프로필을 선택하세요."
            : `${activeRank}순위로 선택할 프로필을 눌러주세요.`}
        </p>
        <RankingSlots>
          {rankedIds.map((memberId, index) => {
            const rank = index + 1;
            const nickname =
              memberId === null ? null : nicknameById.get(memberId);
            const candidateIndex = candidates.findIndex(
              (candidate) => candidate.memberId === memberId,
            );
            return (
              <RankSlot
                key={rank}
                className={
                  memberId === null ? "" : `profile-tone-${candidateIndex % 2}`
                }
              >
                <span className="rank-label">
                  {rank}순위{rank === 1 ? " · 필수" : " · 선택"}
                </span>
                <button
                  className={`rank-circle${activeRank === rank ? " is-active" : ""}${memberId !== null ? " has-candidate" : ""}`}
                  type="button"
                  aria-label={
                    memberId === null
                      ? `${rank}순위 선택${activeRank === rank ? " 취소" : ""}`
                      : `${rank}순위 ${nickname} 선택됨, 누르면 선택 취소`
                  }
                  aria-pressed={activeRank === rank}
                  disabled={submitted}
                  onClick={() => {
                    if (memberId !== null) {
                      setRankedIds((current) =>
                        current.map((value, slotIndex) =>
                          slotIndex === index ? null : value,
                        ),
                      );
                      setActiveRank(null);
                    } else {
                      toggleRank(rank);
                    }
                  }}
                >
                  {memberId === null ? (
                    <span aria-hidden="true">+</span>
                  ) : (
                    <>
                      <span className="rank-initial" aria-hidden="true">
                        {Array.from(nickname ?? "?")[0]}
                      </span>
                    </>
                  )}
                </button>
              </RankSlot>
            );
          })}
        </RankingSlots>
        <p className="rank-note">
          1순위는 필수예요. 2·3순위는 비워둘 수 있어요.
        </p>
      </RankingPanel>

      <CandidateSection>
        <h2>대화한 상대</h2>
        {candidates.length ? (
          <CandidateGrid>
            {candidates.map((candidate, index) => {
              const rank = selectedRankById.get(candidate.memberId);
              return (
                <CandidateButton
                  key={candidate.memberId}
                  type="button"
                  className={`profile-tone-${index % 2}${rank ? " is-selected" : ""}`}
                  aria-label={`${candidate.nickname}, ${candidate.roundNumber}번째 대화에서 만남${rank ? `, ${rank}순위 선택됨` : ""}`}
                  aria-pressed={Boolean(rank)}
                  disabled={
                    submitted || (rank === undefined && activeRank === null)
                  }
                  onClick={() => selectCandidate(candidate)}
                >
                  <span className="candidate-name">{candidate.nickname}</span>
                  <span className="candidate-avatar">
                    <span className="candidate-initial" aria-hidden="true">
                      {Array.from(candidate.nickname)[0]}
                    </span>
                    {rank && <span className="candidate-rank">{rank}</span>}
                  </span>
                  <span className="candidate-round">
                    {candidate.roundNumber}번째 대화
                  </span>
                </CandidateButton>
              );
            })}
          </CandidateGrid>
        ) : (
          <p className="no-candidates">선택할 상대가 없어요.</p>
        )}
      </CandidateSection>

      <SubmitButton
        type="button"
        disabled={!hasFirstChoice || submitted || submitting || (!allowLocalSubmit && !onSubmit) || votingRemaining === 0}
        onClick={() => void submitVote()}
      >
        {submitted ? "최종 선택을 완료했어요" : submitting ? "투표를 제출하고 있어요…" : allowLocalSubmit ? "최종 선택 미리보기" : onSubmit ? "최종 선택 제출" : "투표 API 연결 준비 중"}
      </SubmitButton>
      {submitError && <p className="submit-hint submit-error" role="alert">{submitError}</p>}
      {!allowLocalSubmit && !onSubmit && <p className="submit-hint" role="status">투표 API 경로를 확인했어요. 요청 형식을 확인한 뒤 연결할게요.</p>}
    </VoteLayout>
  );
}

const VoteLayout = styled.section`
  display: flex;
  width: 100%;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  align-items: stretch;
  --vote-profile-size: clamp(5.2rem, 15vw, 6rem);
  gap: clamp(2rem, 4.5dvh, 3.6rem);
  color: #011020;

  .submit-hint {
    margin-top: 0.4rem;
    color: #7c867d;
    font: 400 1.2rem/1.4 var(--font-body);
    text-align: center;
  }
  .submit-error { color: #b24338; }
  @media (max-height: 45rem) {
    gap: 1.6rem;
    .submit-hint {
      margin-top: 0.2rem;
    }
  }
`;

const RankingPanel = styled.section`
  width: 100%;
  padding: clamp(1.6rem, 3.5dvh, 2.4rem) clamp(1.2rem, 4vw, 2rem);
  border-radius: 2rem;
  background: #e0ebd9;
  text-align: center;

  h2 {
    margin-bottom: 0.8rem;
    color: #011020;
    font: 400 clamp(1.7rem, 4.2vw, 2rem)/1.25 var(--display-font);
  }
  .vote-countdown { margin: 0 0 .5rem; color: #69784a; font: 700 1.3rem/1.4 var(--font-body); }
  .ranking-help {
    min-height: 1.8rem;
    margin-top: 0.8rem;
    color: #66716b;
    font: 400 clamp(1.1rem, 3vw, 1.3rem)/1.6 var(--font-body);
  }
  .rank-note {
    margin-top: 1.6rem;
    color: #899188;
    font: 400 1.1rem/1.4 var(--font-body);
  }
  @media (max-height: 45rem) {
    padding-top: 1.5rem;
    padding-bottom: 1.5rem;
    .ranking-help {
      min-height: 1.4rem;
      margin-top: 0.5rem;
    }
    .rank-note {
      margin-top: 1rem;
    }
  }
`;

const RankingSlots = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
  margin-top: 1.8rem;

  @media (max-height: 45rem) {
    margin-top: 0.9rem;
  }
`;

const RankSlot = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;

  .rank-label {
    padding: 0.25rem 0.7rem;
    border-radius: 99rem;
    background: #fffef8;
    color: #2b302c;
    font: 500 1.1rem/1.2 var(--font-body);
    white-space: nowrap;
  }
  .rank-circle {
    position: relative;
    display: grid;
    width: var(--vote-profile-size);
    height: var(--vote-profile-size);
    place-items: center;
    padding: 0;
    border: 0.3rem solid transparent;
    border-radius: 50%;
    background: #fff;
    color: #769a22;
    font: 400 2.8rem/1 var(--font-body);
    transition:
      border-color 150ms ease,
      background-color 150ms ease;
  }
  .rank-circle:not(:disabled) {
    cursor: pointer;
  }
  .rank-circle.is-active {
    border-color: #769a22;
  }
  .rank-circle.has-candidate {
    border-color: #8b6d51;
    color: #44280e;
    overflow: hidden;
  }
  .profile-tone-0 .rank-circle.has-candidate {
    background: #dfff75;
  }
  .profile-tone-1 .rank-circle.has-candidate {
    background: #b9d987;
  }
  .rank-initial {
    position: relative;
    z-index: 0;
    font: 700 2.5rem/1 var(--display-font);
  }
`;

const CandidateSection = styled.section`
  width: 100%;
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  scrollbar-color: #b8c4b1 transparent;
  scrollbar-width: thin;
  padding: 0.4rem 0.2rem;

  &::-webkit-scrollbar {
    width: 0.5rem;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 99rem;
    background: #b8c4b1;
  }

  h2 {
    margin-bottom: 1.8rem;
    color: #66716b;
    font: 600 1.4rem/1.3 var(--font-body);
  }
  .no-candidates {
    padding: 2rem 0;
    color: #899188;
    font: 400 1.3rem/1.4 var(--font-body);
    text-align: center;
  }
`;

const CandidateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.8rem 0.4rem;

  @media (max-width: 37.4rem) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1.6rem 0.2rem;
  }
`;

const CandidateButton = styled.button`
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: #011020;

  &:disabled {
    cursor: default;
  }
  .candidate-name {
    max-width: 100%;
    overflow: hidden;
    padding: 0.2rem 0.5rem;
    border-radius: 99rem;
    background: #f4f5f0;
    color: #596358;
    font: 500 1.05rem/1.2 var(--font-body);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .candidate-avatar {
    position: relative;
    display: grid;
    width: var(--vote-profile-size);
    height: var(--vote-profile-size);
    place-items: center;
    overflow: hidden;
    border: 0.3rem solid #8b6d51;
    border-radius: 50%;
    background: #dfff75;
    color: #44280e;
    transition: background-color 150ms ease;
  }
  &.profile-tone-1 .candidate-avatar {
    background: #b9d987;
  }
  &.is-selected .candidate-avatar::after {
    position: absolute;
    z-index: 1;
    inset: 0;
    background: #0008;
    content: "";
  }
  .candidate-initial {
    position: relative;
    z-index: 0;
    font: 700 2.5rem/1 var(--display-font);
  }
  .candidate-rank {
    position: absolute;
    inset: 0;
    display: grid;
    z-index: 2;
    place-items: center;
    color: #dfff75;
    font: 400 3.6rem/1 var(--display-font);
  }
  .candidate-round {
    color: #899188;
    font: 400 1rem/1.2 var(--font-body);
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  flex: 0 0 auto;
  min-height: 4.8rem;
  padding: 1rem;
  border: 0;
  border-radius: 1.3rem;
  background: #011020;
  color: #fff;
  font: 400 1.6rem/1.2 var(--display-font);

  &:disabled {
    background: #d9ded7;
    color: #909990;
    cursor: default;
  }
  @media (max-height: 45rem) {
    min-height: 4.2rem;
  }
`;
