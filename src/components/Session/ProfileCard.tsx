import styled from "styled-components";
import type { LiveAssignment } from "../../features/live/stomp";

type ProfileCardProps = {
  profile: LiveAssignment["partnerProfileCard"];
  compatibility: LiveAssignment["compatibility"];
  onClose: () => void;
};

export default function ProfileCard({
  profile,
  compatibility,
  onClose,
}: ProfileCardProps) {
  return (
    <>
      <Backdrop
        type="button"
        aria-label="프로필 카드 닫기"
        onClick={onClose}
      />
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-card-title"
      >
        <CloseButton type="button" aria-label="닫기" onClick={onClose}>
          ×
        </CloseButton>
        <University>{profile.university || "학교 정보 없음"}</University>
        <Nickname id="profile-card-title">
          {profile.nickname || "상대방"}
        </Nickname>
        {compatibility && (
          <MatchScore>관심사 매칭 {compatibility.score}점</MatchScore>
        )}
        <Details>
          {profile.idealType && (
            <p>
              <span>이상형</span>
              {profile.idealType}
            </p>
          )}
          {profile.datingStyle && (
            <p>
              <span>데이트</span>
              {profile.datingStyle}
            </p>
          )}
          {profile.contactStyle && (
            <p>
              <span>연락</span>
              {profile.contactStyle}
            </p>
          )}
          {profile.loveStyle && (
            <p>
              <span>연애</span>
              {profile.loveStyle}
            </p>
          )}
          {!!profile.interests.length && (
            <p>
              <span>관심사</span>
              {profile.interests.join(" · ")}
            </p>
          )}
        </Details>
      </Card>
    </>
  );
}

const Backdrop = styled.button`
  position: fixed;
  z-index: 9;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: #10181075;
`;

const Card = styled.section`
  position: fixed;
  z-index: 10;
  top: 50%;
  left: 50%;
  width: min(36rem, calc(100vw - 6rem));
  max-height: calc(100dvh - 4.8rem);
  overflow-y: auto;
  padding: 2.8rem 2.4rem 2.4rem;
  border: 0.1rem solid #e2e9d9;
  border-radius: 2.4rem;
  background: var(--background);
  box-shadow: 0 1.2rem 4rem #0003;
  font-family: var(--font-body);
  text-align: center;
  transform: translate(-50%, -50%);
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1.2rem;
  width: 3.2rem;
  height: 3.2rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  font: 400 2.8rem/1 var(--font-body);
`;

const University = styled.span`
  color: var(--text-secondary);
  font-size: 1.3rem;
`;

const Nickname = styled.h2`
  margin-top: 0.5rem;
  color: #111;
  font-family: var(--display-font);
  font-size: 2.2rem;
  font-weight: 400;
`;

const MatchScore = styled.p`
  margin-top: 0.6rem;
  color: #66852b;
  font-size: 1.4rem;
`;

const Details = styled.div`
  display: grid;
  gap: 0.8rem;
  margin-top: 1.8rem;
  padding: 1.6rem;
  border-radius: 1.4rem;
  background: #f2f7e7;
  text-align: left;

  p {
    display: grid;
    grid-template-columns: 5.2rem 1fr;
    gap: 0.8rem;
    font-size: 1.3rem;
    line-height: 1.5;
  }

  p span {
    color: var(--text-secondary);
  }
`;
