import type { LiveAssignment } from "../../features/live/stomp";
import type { SessionDetail } from "../../features/sessions/types";

export type SessionProps = { sessionId: number };
export type Phase = "ready" | "connecting" | "lobby" | "assigned" | "idle" | "voting";
export type PeerState = { connection: RTCPeerConnection; assignment: LiveAssignment };

export type LobbyParticipant = {
  memberId: number;
  nickname: string;
  roundNumber?: number;
  x: string;
  y: string;
  delay: string;
};

export const createLobbyParticipants = (
  people: Array<{ memberId: number; nickname: string; roundNumber?: number }>,
): LobbyParticipant[] => {
  const placed: LobbyParticipant[] = [];
  for (const person of people) {
    let x = 50;
    let y = 15;
    let attempts = 0;
    let overlaps = true;
    while (attempts < 160 && overlaps) {
      x = 9 + Math.random() * 82;
      y = 10 + Math.random() * 78;
      const overlapsBubble = x > 6 && x < 94 && y > 27 && y < 56;
      const overlapsMascot = x > 24 && x < 76 && y > 32 && y < 72;
      const overlapsStartButton = y > 88;
      const tooClose = placed.some((other) => {
        const otherX = Number.parseFloat(other.x);
        const otherY = Number.parseFloat(other.y);
        return Math.hypot((x - otherX) * 0.62, y - otherY) < 11;
      });
      overlaps = overlapsBubble || overlapsMascot || overlapsStartButton || tooClose;
      attempts += 1;
    }
    placed.push({
      ...person,
      x: `${x}%`,
      y: `${y}%`,
      delay: `${-(Math.random() * 3.5).toFixed(2)}s`,
    });
  }
  return placed;
};

export const hasSameRoster = (
  current: LobbyParticipant[],
  next: Array<{ memberId: number; nickname: string }>,
) =>
  current.length === next.length &&
  current.every(
    (person, index) =>
      person.memberId === next[index]?.memberId &&
      person.nickname === next[index]?.nickname,
  );

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
export const pad = (value: number) => String(value).padStart(2, "0");
const sessionNicknames = [
  "구름산책",
  "느린토끼",
  "초록새벽",
  "말랑복숭아",
  "고요한파도",
  "달빛수집가",
  "잠꾸러기곰",
  "햇살한스푼",
  "바닐라라떼",
  "웃음많은사람",
  "작은행성",
  "포근한오후",
  "반짝이는별",
  "산책하는고양이",
  "기분좋은바람",
];
const createSessionNickname = () =>
  sessionNicknames[Math.floor(Math.random() * sessionNicknames.length)];

export function createMockAssignment(
  sessionId: number,
  roundNumber: number,
  emptyProfile = false,
): LiveAssignment {
  const alias = createSessionNickname();
  return {
    sessionId,
    roundId: sessionId * 10 + roundNumber,
    roundNumber,
    roomId: sessionId * 100 + roundNumber,
    tableNo: roundNumber,
    memberId: 1,
    partnerMemberId: roundNumber + 1,
    partnerAlias: alias,
    partnerProfileCard: {
      memberId: roundNumber + 1,
      university: emptyProfile ? null : "연세대학교",
      nickname: alias,
      idealType: emptyProfile ? null : "대화가 잘 통하는 사람",
      datingStyle: emptyProfile ? null : "전시회나 맛집 탐방",
      contactStyle: emptyProfile ? null : "하루에 몇 번 연락하는 편",
      loveStyle: emptyProfile ? null : "천천히 알아가는 편",
      interests: emptyProfile ? [] : ["전시", "러닝", "보드게임"],
    },
    compatibility: { score: 82, reason: "관심사가 비슷해요." },
  };
}

export function createVotePreviewSession(sessionId: number): SessionDetail {
  return {
    sessionId,
    startTime: new Date().toISOString(),
    applyDeadline: new Date().toISOString(),
    capacityPerGender: 1,
    maleRemaining: 0,
    femaleRemaining: 0,
    entryFeeGem: 0,
    completionRefundGem: 0,
    status: "READY",
    roundDurationSeconds: 600,
    votingDurationSeconds: 180,
    resultAndShareDurationSeconds: 300,
    myStatus: "APPLIED",
    myAlias: "1:1 테스트",
  };
}

