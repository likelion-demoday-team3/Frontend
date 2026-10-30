import type { RefObject } from "react";
import GuideBubble from "../../components/Session/GuideBubble";
import ProfileCard from "../../components/Session/ProfileCard";
import Report from "../../components/Session/Report";
import type { LiveAssignment } from "../../features/live/stomp";

type CallProps = {
  assignment: LiveAssignment;
  conversationMinutes: number;
  conversationSeconds: number;
  isUrgent: boolean;
  roundStartNotice: string;
  countdownNotice: 5 | 1 | null;
  isPartnerSpeaking: boolean;
  muted: boolean;
  speakerEnabled: boolean;
  reportPopupOpen: boolean;
  profileCardOpen: boolean;
  audioRef: RefObject<HTMLAudioElement | null>;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onOpenProfile: () => void;
  onOpenReport: () => void;
  onCloseReport: () => void;
  onSubmitReport: () => void;
  onCloseProfile: () => void;
};

const pad = (value: number) => String(value).padStart(2, "0");

export default function Call({
  assignment,
  conversationMinutes,
  conversationSeconds,
  isUrgent,
  roundStartNotice,
  countdownNotice,
  isPartnerSpeaking,
  muted,
  speakerEnabled,
  reportPopupOpen,
  profileCardOpen,
  audioRef,
  onToggleMute,
  onToggleSpeaker,
  onOpenProfile,
  onOpenReport,
  onCloseReport,
  onSubmitReport,
  onCloseProfile,
}: CallProps) {
  return (
    <section className="conversation-screen" aria-label="일대일 대화">
      <div className="conversation-timer" role="timer" aria-live="off">
        <strong className={isUrgent ? "is-urgent" : undefined}>
          {pad(conversationMinutes)}:{pad(conversationSeconds)}
        </strong>
        <p>{assignment.partnerProfileCard.nickname || "상대방"}</p>
      </div>
      {countdownNotice !== null && (
        <p className="conversation-countdown-alert" role="status">
          {countdownNotice}분 남았습니다
        </p>
      )}
      <div className="conversation-stage">
        <div className="conversation-character-group">
          <GuideBubble
            variant="conversation"
            message="저를 클릭해 상대방의 프로필카드를 열어보세요!"
          />
          <button
            className={`conversation-mascot${isPartnerSpeaking ? " is-speaking" : ""}`}
            type="button"
            aria-label="상대 프로필 카드 보기"
            onClick={onOpenProfile}
          >
            <img src="/kw1.svg" alt="키위 캐릭터" />
          </button>
        </div>
      </div>
      {roundStartNotice && (
        <div className="round-start-notice" role="status">
          {roundStartNotice}
        </div>
      )}
      <div className="conversation-controls">
        <button
          type="button"
          className={`conversation-control${muted ? " is-muted" : " is-mic-on"}`}
          onClick={onToggleMute}
          aria-pressed={muted}
        >
          <span className="control-icon mute-icon" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none">
              <rect x="15" y="4" width="10" height="21" rx="5" />
              <path d="M9 19a11 11 0 0 0 22 0M20 30v6m-7 0h14" />
            </svg>
          </span>
          <span>마이크</span>
        </button>
        <button
          type="button"
          className={`conversation-control${speakerEnabled ? " is-speaker-on" : " is-speaker-off"}`}
          onClick={onToggleSpeaker}
          aria-pressed={speakerEnabled}
        >
          <span className="control-icon" aria-hidden="true">
            <img src="/speakerphoneIcon.svg" alt="" />
          </span>
          <span>스피커</span>
        </button>
        <button
          type="button"
          className="conversation-control report-control"
          onClick={onOpenReport}
        >
          <span className="control-icon" aria-hidden="true">
            <img src="/reportIcon.svg" alt="" />
          </span>
          <span>신고하기</span>
        </button>
      </div>
      {reportPopupOpen && (
        <Report onClose={onCloseReport} onSubmit={onSubmitReport} />
      )}
      {profileCardOpen && (
        <ProfileCard
          profile={assignment.partnerProfileCard}
          compatibility={assignment.compatibility}
          onClose={onCloseProfile}
        />
      )}
      <audio ref={audioRef} autoPlay playsInline />
    </section>
  );
}
