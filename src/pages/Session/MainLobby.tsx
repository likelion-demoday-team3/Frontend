import GuideBubble from "../../components/Session/GuideBubble";
import type { LobbyParticipant } from "./sessionUtils";

type MainLobbyProps = {
  participants: { opposite: LobbyParticipant[]; same: LobbyParticipant[] };
  showWelcome?: boolean;
  myMemberId: number | null;
  myRealName: string;
  myNickname: string;
  announcementIndex: number;
  roundDurationSeconds?: number;
  mascotSrc: string;
  startDisabled: boolean;
  startLabel: string;
  showParticipantNotice?: boolean;
  showIdleNotice?: boolean;
  /** 마이크 권한이 없을 때 로비에 띄울 안내 */
  micNotice?: string;
  onStart: () => void;
};

export default function MainLobby({
  participants,
  showWelcome = false,
  myMemberId,
  myRealName,
  myNickname,
  announcementIndex,
  roundDurationSeconds,
  mascotSrc,
  startDisabled,
  startLabel,
  showParticipantNotice,
  showIdleNotice,
  micNotice,
  onStart,
}: MainLobbyProps) {
  return (
    <section className="lobby-screen" aria-label="로비">
      {!showWelcome && (
        <div
          className="profile-group opposite-profiles"
          role="group"
          aria-label="이성 참가자 프로필"
        >
          {participants.opposite.map((participant, index) => (
            <div
              className={`profile-avatar${participant.memberId === myMemberId ? " own-profile" : ""}${participant.entering ? " entering" : ""}`}
              role="img"
              key={`opposite-${participant.nickname}-${index}`}
              style={{
                left: participant.x,
                top: participant.y,
                animationDelay: participant.delay,
              }}
              aria-label={`이성 참가자 ${participant.nickname}`}
            >
              <span aria-hidden="true">{Array.from(participant.nickname)[0]}</span>
            </div>
          ))}
        </div>
      )}
      {showWelcome ? (
        <div className="lobby-welcome-note" role="status" aria-live="polite">
          <strong>{myRealName}님의 닉네임은</strong>
          <strong>{myNickname}입니다</strong>
        </div>
      ) : (
        <GuideBubble
          mode="lobby"
          index={announcementIndex}
          roundDurationSeconds={roundDurationSeconds}
        />
      )}
      <img className="lobby-mascot" src={mascotSrc} alt="키위 캐릭터" />
      {!showWelcome && (
        <div
          className="profile-group same-profiles"
          role="group"
          aria-label="동성 참가자 프로필"
        >
          {participants.same.map((participant, index) => (
            <div
              className={`profile-avatar${participant.memberId === myMemberId ? " own-profile" : ""}${participant.entering ? " entering" : ""}`}
              role="img"
              key={`same-${participant.nickname}-${index}`}
              style={{
                left: participant.x,
                top: participant.y,
                animationDelay: participant.delay,
              }}
              aria-label={
                participant.memberId === myMemberId
                  ? `내 프로필 ${participant.nickname}`
                  : `동성 참가자 ${participant.nickname}`
              }
            >
              <span aria-hidden="true">{Array.from(participant.nickname)[0]}</span>
            </div>
          ))}
        </div>
      )}
      {showParticipantNotice && (
        <p className="participant-waiting-note" role="status">
          소개팅 참가자들이 입장하고 있어요! 참가자 확인이 끝나면 대화가 시작됩니다.{" "}
          <span>오류가 아니니 절대 새로고침하거나 화면을 끄지 마세요.</span>
          {" "}조금만 기다려주세요.
        </p>
      )}
      {micNotice && (
        <p className="participant-waiting-note" role="alert">
          {micNotice}
        </p>
      )}
      {showIdleNotice ? (
        <div className="participant-waiting-note minigame-waiting-note" role="status">
          <strong>이번 라운드에는 매칭되지 않았어요</strong>
          <span>
            참가 인원이 홀수라 이번 라운드에서는 매칭이 되지 않았어요.
            다른 참가자들이 대화하는 동안 조금만 기다려주세요.
          </span>
          <span className="minigame-coming">미니게임 페이지 개발 중...</span>
        </div>
      ) : (
        <button
          className="start-conversation"
          type="button"
          disabled={startDisabled}
          onClick={onStart}
        >
          {startLabel}
        </button>
      )}
    </section>
  );
}
