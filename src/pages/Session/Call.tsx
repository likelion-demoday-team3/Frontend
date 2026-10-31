import type { RefObject } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
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

const RoundStartLayer = styled.div`
  position: fixed;
  z-index: 20000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 1.6rem;
`;

const RoundStartBackdrop = styled.div`
  position: absolute;
  z-index: 0;
  inset: 0;
  background: rgb(0 0 0 / 42%);
`;

const RoundStartNotice = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  width: min(100%, 34rem);
  min-height: 0;
  align-items: center;
  justify-content: center;
  padding: 2rem 2.4rem;
  border: 0.1rem solid #8b6d51;
  border-radius: 2rem;
  background: #fbfff1;
  box-shadow: 0 1rem 3rem #10161030;
  color: #2b302c;
  font: 700 2.4rem/1.3 var(--display-font);
  text-align: center;
  pointer-events: none;
`;

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
        createPortal(
          <RoundStartLayer>
            <RoundStartBackdrop aria-hidden="true" />
            <RoundStartNotice role="status">
              {roundStartNotice}
            </RoundStartNotice>
          </RoundStartLayer>,
          document.body,
        )
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
