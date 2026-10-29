import styled from "styled-components";

export const lobbyGuideMessages = [
  "이 소개팅은 로테이션 방식으로 진행돼요.",
  "얼굴 공개 없이 오직 목소리로만 서로를 알아가요.",
  "한 사람 당 10분의 대화 시간이 주어져요.",
  "10분이 지나면 자동으로 종료되고 로비로 돌아와요.",
  "1분의 휴식시간이 지난 후 다음 대화가 시작돼요.",
  "보석은 미리 충전해두는 것을 추천드려요.",
  "서로를 1순위로 지목하면 최종 매칭이 성사돼요.",
  "반드시 예의를 지켜 대화해주세요.",
];

export const finalChoiceGuideMessages = [
  "모든 대화가 끝났습니다.",
  "3분 후 최종 선택이 시작됩니다.",
  "최종 선택 전 호감을 표시할 수 있는 시간을 드립니다.",
  "프로필을 눌러 마음에 드는 상대에게 하트를 보내세요.",
  "상대는 누가 하트를 보냈는지 확인할 수 있습니다.",
  "여러 명에게 보내고 싶으면 추가 하트를 구매하세요.",
  "하트 하나로 최종 선택 결과가 달라질 수 있습니다.",
  "지금 바로 하트를 보내 마음을 표현하세요!",
];

type GuideBubbleProps = {
  message?: string;
  mode?: "lobby" | "final-choice";
  index?: number;
  variant?: "lobby" | "conversation";
};

export default function GuideBubble({
  message,
  mode = "lobby",
  index = 0,
  variant = "lobby",
}: GuideBubbleProps) {
  const messages =
    mode === "final-choice" ? finalChoiceGuideMessages : lobbyGuideMessages;
  const visibleMessage =
    message ?? messages[Math.min(index, messages.length - 1)];

  return (
    <Bubble $variant={variant} role="status" aria-live="polite">
      {visibleMessage}
    </Bubble>
  );
}

const Bubble = styled.div<{ $variant: "lobby" | "conversation" }>`
  position: ${({ $variant }) =>
    $variant === "lobby" ? "absolute" : "relative"};
  z-index: 4;
  top: ${({ $variant }) => ($variant === "lobby" ? "30%" : "auto")};
  left: ${({ $variant }) => ($variant === "lobby" ? "50%" : "auto")};
  width: min(32rem, calc(100% - 2rem));
  box-sizing: border-box;
  padding: clamp(0.7rem, 2dvh, 0.9rem) clamp(1rem, 4vw, 1.6rem);
  border: 0.1rem solid #927958;
  border-radius: 1rem;
  background: #fffef3;
  color: #090909;
  font: 400 clamp(1.1rem, 3.2vw, 1.4rem)/1.45 var(--font-body);
  text-align: center;
  transform: ${({ $variant }) =>
    $variant === "lobby" ? "translateX(-50%)" : "none"};
  ${({ $variant }) =>
    $variant === "conversation" &&
    `
      width: min(100%, 30rem);
      white-space: normal;
    `}

  &::after {
    position: absolute;
    bottom: -0.65rem;
    left: calc(50% - 0.65rem);
    width: 1.1rem;
    height: 1.1rem;
    border-right: 0.1rem solid #927958;
    border-bottom: 0.1rem solid #927958;
    background: #fffef3;
    content: "";
    transform: rotate(45deg);
  }

  @media (max-height: 42rem) {
    ${({ $variant }) => $variant === "lobby" && "top: 27%;"}
    padding-top: 0.6rem;
    padding-bottom: 0.6rem;
  }
`;
