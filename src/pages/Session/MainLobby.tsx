import GuideBubble from "../../components/Session/GuideBubble";
import type { LobbyParticipant } from "./sessionUtils";

type MainLobbyProps = {
  participants: { opposite: LobbyParticipant[]; same: LobbyParticipant[] };
  myMemberId: number | null;
  announcementIndex: number;
  mascotSrc: string;
  startDisabled: boolean;
  startLabel: string;
  onStart: () => void;
};

export default function MainLobby({
  participants,
  myMemberId,
  announcementIndex,
  mascotSrc,
  startDisabled,
  startLabel,
  onStart,
}: MainLobbyProps) {
  return (
    <section className="lobby-screen" aria-label="로비">
      <div
        className="profile-group opposite-profiles"
        role="group"
        aria-label="이성 참가자 프로필"
      >
        {participants.opposite.map((participant, index) => (
          <div
            className={`profile-avatar${participant.memberId === myMemberId ? " own-profile" : ""}`}
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
      <GuideBubble mode="lobby" index={announcementIndex} />
      <img className="lobby-mascot" src={mascotSrc} alt="키위 캐릭터" />
      <div
        className="profile-group same-profiles"
        role="group"
        aria-label="동성 참가자 프로필"
      >
        {participants.same.map((participant, index) => (
          <div
            className="profile-avatar"
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
      <button
        className="start-conversation"
        type="button"
        disabled={startDisabled}
        onClick={onStart}
      >
        {startLabel}
      </button>
    </section>
  );
}
