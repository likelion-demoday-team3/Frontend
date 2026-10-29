import styled from "styled-components";
import MyPageFrame from "./MyPageFrame";

export default function ItsMe() {
  return (
    <MyPageFrame title="본인인증" centerContent>
      <UnavailableMessage>서비스 준비 중입니다.</UnavailableMessage>
    </MyPageFrame>
  );
}

const UnavailableMessage = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font: 600 1.8rem/1.5 var(--font-body);
  text-align: center;
`;
