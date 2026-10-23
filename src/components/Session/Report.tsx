import { useState } from "react";
import styled from "styled-components";

type ReportProps = {
  onClose: () => void;
  onSubmit: (reason: string) => void;
};

const reasons = [
  "규칙을 위반했어요.",
  "대화 중간에 나갔어요.",
  "성희롱을 했어요.",
  "성별을 속였어요.",
  "계속 만나자고 말해요.",
  "사이버 언어폭력을 해요.",
];

export default function Report({ onClose, onSubmit }: ReportProps) {
  const [selectedReason, setSelectedReason] = useState("");

  return (
    <>
      <Backdrop type="button" aria-label="신고 팝업 닫기" onClick={onClose} />
      <Dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-popup-title"
      >
        <CloseButton
          type="button"
          aria-label="신고 팝업 닫기"
          onClick={onClose}
        >
          ×
        </CloseButton>
        <h2 id="report-popup-title">신고하기</h2>
        <Description>신고 내용을 선택해주세요.</Description>
        <Divider />
        <ReasonList>
          {reasons.map((reason) => (
            <ReasonButton
              key={reason}
              type="button"
              className={selectedReason === reason ? "selected" : ""}
              aria-pressed={selectedReason === reason}
              onClick={() => setSelectedReason(reason)}
            >
              {reason}
            </ReasonButton>
          ))}
        </ReasonList>
        <SubmitButton
          type="button"
          disabled={!selectedReason}
          onClick={() => selectedReason && onSubmit(selectedReason)}
        >
          제출
        </SubmitButton>
      </Dialog>
    </>
  );
}

const Backdrop = styled.button`
  position: fixed;
  z-index: 11;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: #181b1880;
`;

const Dialog = styled.section`
  position: fixed;
  z-index: 12;
  top: 45%;
  left: 50%;
  display: flex;
  width: min(35rem, calc(100vw - 6rem));
  height: min(66rem, calc(100dvh - 24rem));
  min-height: min(38rem, calc(100dvh - 14rem));
  max-height: calc(100dvh - 8rem);
  padding: 1.8rem 2.4rem 2rem;
  flex-direction: column;
  border: 0.0793rem solid #8b6d51;
  border-radius: 2rem;
  background: #fbfff1;
  color: #080a08;
  transform: translate(-50%, -50%);

  &::after {
    position: absolute;
    right: 11%;
    bottom: -0.9rem;
    width: 1.6rem;
    height: 1.6rem;
    border-right: 0.0793rem solid #8b6d51;
    border-bottom: 0.0793rem solid #8b6d51;
    background: #fbfff1;
    content: "";
    transform: rotate(45deg);
  }

  h2 {
    font: 400 3.2rem/1.2 var(--display-font);
    text-align: center;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1.1rem;
  right: 1.4rem;
  display: grid;
  width: 3.6rem;
  height: 3.6rem;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: #2b302c;
  font: 400 3.2rem/1 var(--font-body);
`;

const Description = styled.p`
  margin-top: 0.3rem;
  font: 400 1.3rem/1.5 var(--font-body);
  text-align: center;
`;

const Divider = styled.div`
  height: 0.1rem;
  margin: 1rem 0 1.2rem;
  background: #d6d9d0;
`;

const ReasonList = styled.div`
  display: grid;
  align-content: start;
  flex: 1;
  gap: 0.5rem;
  overflow-y: auto;
`;

const ReasonButton = styled.button`
  min-height: 4.2rem;
  padding: 0.7rem 0.8rem;
  border: 0;
  border-radius: 0.8rem;
  background: transparent;
  color: #111;
  font: 400 1.4rem/1.5 var(--font-body);
  text-align: left;

  &.selected {
    background: #eff5df;
  }
`;

const SubmitButton = styled.button`
  display: grid;
  width: 14rem;
  min-height: 4.6rem;
  flex: 0 0 auto;
  place-items: center;
  align-self: center;
  margin-top: 1.2rem;
  border: 0;
  border-radius: 1.2rem;
  background: var(--green);
  color: #111;
  font: 500 1.5rem var(--font-body);

  &:disabled {
    background: #e1e4da;
    color: #858b84;
  }
`;
