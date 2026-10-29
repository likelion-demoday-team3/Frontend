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
  isMockLiveEnabled: boolean;
  heartChargeOpen: boolean;
  heartRestrictionOpen: boolean;
  heartPurchaseQuantity: number;
  setHeartPurchaseQuantity: Dispatch<SetStateAction<number>>;
  setSelectedProfile: Dispatch<SetStateAction<HeartProfile | null>>;
  onOpenHeartCharge: () => void;
  onCloseHeartCharge: () => void;
  onCloseHeartRestriction: () => void;
  onSendHeart: (profile: HeartProfile) => void;
  onBuyHeart: () => void;
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
  isMockLiveEnabled,
  heartChargeOpen,
  heartRestrictionOpen,
  heartPurchaseQuantity,
  setHeartPurchaseQuantity,
  setSelectedProfile,
  onOpenHeartCharge,
  onCloseHeartCharge,
  onCloseHeartRestriction,
  onSendHeart,
  onBuyHeart,
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
            <div className="heart-balance-summary">
              <span>잔여 하트</span>
              <strong>
                <i aria-hidden="true">♥</i>
                {heartsRemaining}개
              </strong>
            </div>
            <button
              className="heart-send-button"
              type="button"
              disabled={(heartsSent[selectedProfile.memberId] ?? 0) > 0}
              onClick={() => onSendHeart(selectedProfile)}
            >
              {(heartsSent[selectedProfile.memberId] ?? 0) > 0
                ? "하트를 보냈어요"
                : isMockLiveEnabled
                  ? "하트 보내기 미리보기"
                  : "하트 전송 API 명세 대기"}
            </button>
            <button
              className="heart-charge-button"
              type="button"
              onClick={onOpenHeartCharge}
            >
              하트 충전하기
            </button>
          </section>
        </div>
      )}
      {heartChargeOpen && (
        <div
          className="heart-modal-backdrop heart-charge-backdrop"
          role="presentation"
          onClick={onCloseHeartCharge}
        >
          <section
            className="heart-modal heart-charge-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="heart-charge-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="heart-modal-close"
              type="button"
              aria-label="닫기"
              onClick={onCloseHeartCharge}
            >
              ×
            </button>
            <h2 id="heart-charge-title">하트 충전하기</h2>
            <p className="heart-profile-round">
              {isMockLiveEnabled
                ? "보석 1개로 하트 1개를 충전해요."
                : `${selectedProfile?.nickname ?? "상대방"}에게 하트를 보내면 보석 1개가 사용돼요.`}
            </p>
            <div className="heart-charge-summary">
              {!isMockLiveEnabled ? (
                <div className="heart-charge-summary-row">
                  <span>하트 전송 비용</span>
                  <strong>
                    <i className="gem-mark" aria-hidden="true">
                      ◆
                    </i>
                    1개
                  </strong>
                </div>
              ) : (
                <>
                  <div className="heart-charge-quantity-row">
                    <span>구매할 하트</span>
                    <div className="heart-quantity-control">
                      <strong>
                        <i aria-hidden="true">♥</i>
                        {heartPurchaseQuantity}개
                      </strong>
                      <div
                        className="heart-quantity-arrows"
                        aria-label="구매할 하트 수량 조절"
                      >
                        <button
                          type="button"
                          aria-label="하트 수량 늘리기"
                          disabled={heartPurchaseQuantity >= gemsRemaining}
                          onClick={() =>
                            setHeartPurchaseQuantity((quantity) =>
                              Math.min(gemsRemaining, quantity + 1),
                            )
                          }
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          aria-label="하트 수량 줄이기"
                          disabled={heartPurchaseQuantity <= 1}
                          onClick={() =>
                            setHeartPurchaseQuantity((quantity) =>
                              Math.max(1, quantity - 1),
                            )
                          }
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="heart-charge-summary-row">
                    <span>충전 후 잔여 하트</span>
                    <strong>
                      <i aria-hidden="true">♥</i>
                      {heartsRemaining + heartPurchaseQuantity}개
                    </strong>
                  </div>
                  <div className="heart-charge-summary-row heart-charge-cost-row">
                    <span>구매 시 차감</span>
                    <strong>
                      <i className="gem-mark" aria-hidden="true">
                        ◆
                      </i>
                      {heartPurchaseQuantity}개
                    </strong>
                  </div>
                </>
              )}
            </div>
            <button
              className="heart-send-button"
              type="button"
              disabled={!isMockLiveEnabled && gemsRemaining < 1}
              onClick={onBuyHeart}
            >
              {gemsRemaining > 0
                ? isMockLiveEnabled
                  ? `하트 ${heartPurchaseQuantity}개 충전하기`
                  : "보석 1개 사용하고 보내기"
                : "보석이 부족해요"}
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
