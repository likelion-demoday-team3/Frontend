import type { Dispatch, SetStateAction } from "react";
import GuideBubble from "../../components/Session/GuideBubble";
import type { LobbyParticipant } from "./sessionUtils";

type HeartProfile = {
  memberId: number;
  nickname: string;
  roundNumber: number;
};

type HeartLobbyProps = {
  participants: LobbyParticipant[];
  myMemberId: number | null;
  encounteredCount: number;
  mascotSrc: string;
  announcementIndex: number;
  startDisabled: boolean;
  startLabel: string;
  selectedProfile: HeartProfile | null;
  heartsRemaining: number;
  gemsRemaining: number;
  heartsSent: Record<number, number>;
  heartRestrictionOpen: boolean;
  setSelectedProfile: Dispatch<SetStateAction<HeartProfile | null>>;
  onCloseHeartRestriction: () => void;
  onSendHeart: (profile: HeartProfile) => void;
  onSelectProfile: (profile: {
    memberId: number;
    nickname: string;
    roundNumber: number;
  }) => void;
  onStart: () => void;
};

export default function HeartLobby({
  participants,
  myMemberId,
  encounteredCount,
  mascotSrc,
  announcementIndex,
  startDisabled,
  startLabel,
  selectedProfile,
  heartsRemaining,
  gemsRemaining,
  heartsSent,
  heartRestrictionOpen,
  setSelectedProfile,
  onCloseHeartRestriction,
  onSendHeart,
  onSelectProfile,
  onStart,
}: HeartLobbyProps) {
  return (
    <section className="lobby-screen" aria-label="하트 보내기 로비">
      <div
        className="profile-group opposite-profiles"
        role="group"
        aria-label="참가자 프로필"
      >
        {participants.map((participant) => (
          <button
            className={`profile-avatar choice-profile${participant.memberId === myMemberId ? " own-profile" : ""}`}
            type="button"
            disabled={participant.memberId === myMemberId}
            key={`heart-${participant.memberId}`}
            style={{
              left: participant.x,
              top: participant.y,
              animationDelay: participant.delay,
            }}
            aria-label={
              participant.memberId === myMemberId
                ? "내 프로필"
                : `참가자 ${participant.nickname}`
            }
            onClick={() =>
              onSelectProfile({
                memberId: participant.memberId,
                nickname: participant.nickname,
                roundNumber: participant.roundNumber ?? 1,
              })
            }
          >
            <span aria-hidden="true">{Array.from(participant.nickname)[0]}</span>
          </button>
        ))}
      </div>
      {encounteredCount === 0 && (
        <p className="heart-candidates-empty">
          대화한 상대가 생기면 하트를 보낼 수 있어요.
        </p>
      )}
      <GuideBubble mode="final-choice" index={announcementIndex} />
      <img className="lobby-mascot" src={mascotSrc} alt="키위 캐릭터" />
      <button
        className="start-conversation"
        type="button"
        disabled={startDisabled}
        onClick={onStart}
      >
        {startLabel}
      </button>
      {selectedProfile && (
        <div
          className="heart-modal-backdrop"
          role="presentation"
          onClick={() => setSelectedProfile(null)}
        >
          <section
            className="heart-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="heart-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="heart-modal-close"
              type="button"
              aria-label="닫기"
              onClick={() => setSelectedProfile(null)}
            >
              ×
            </button>
            <p className="heart-profile-round">
              {selectedProfile.roundNumber}번째 대화에서 만났어요
            </p>
            <h2 id="heart-modal-title">{selectedProfile.nickname}</h2>
            <div className="heart-send-summary">
              <div className="heart-send-summary-row">
                <span>보낼 하트</span>
                <strong>
                  <i aria-hidden="true">♥</i>1개
                </strong>
              </div>
              <div className="heart-send-summary-row heart-send-cost-row">
                <span>보석 차감</span>
                <strong>
                  <i className="gem-mark" aria-hidden="true">◆</i>
                  {heartsRemaining > 0 ? 0 : 1}개
                </strong>
              </div>
            </div>
            <button
              className="heart-send-button"
              type="button"
              disabled={
                (heartsSent[selectedProfile.memberId] ?? 0) > 0 ||
                (heartsRemaining < 1 && gemsRemaining < 1)
              }
              onClick={() => onSendHeart(selectedProfile)}
            >
              {(heartsSent[selectedProfile.memberId] ?? 0) > 0
                ? "하트를 보냈어요"
                : heartsRemaining < 1 && gemsRemaining < 1
                  ? "보석이 부족해요"
                  : "하트 보내기"}
            </button>
          </section>
        </div>
      )}
      {heartRestrictionOpen && (
        <div
          className="heart-modal-backdrop"
          role="presentation"
          onClick={onCloseHeartRestriction}
        >
          <section
            className="heart-modal heart-restriction-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="heart-restriction-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="heart-modal-close"
              type="button"
              aria-label="닫기"
              onClick={onCloseHeartRestriction}
            >
              ×
            </button>
            <h2 id="heart-restriction-title">하트를 보낼 수 없어요</h2>
            <button
              className="heart-send-button"
              type="button"
              onClick={onCloseHeartRestriction}
            >
              확인
            </button>
          </section>
        </div>
      )}
    </section>
  );
}
