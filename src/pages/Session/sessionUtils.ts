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
  if (people.length === 0) return [];

  const rootFontSize =
    typeof document === "undefined"
      ? 16
      : Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const viewportWidth = typeof window === "undefined" ? 688 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;
  const lobbyWidth = Math.min(viewportWidth, 43 * rootFontSize);
  const lobbyHeight = Math.max(320, viewportHeight - 11 * rootFontSize);
  const profileSize = 6 * rootFontSize;
  const radiusX = ((profileSize / 2 + 5) / lobbyWidth) * 100;
  const radiusY = ((profileSize / 2 + 10) / lobbyHeight) * 100;
  const bubbleWidth = Math.min(32 * rootFontSize, lobbyWidth - 2 * rootFontSize);
  const bubble = {
    left: 50 - (bubbleWidth / 2 / lobbyWidth) * 100 - radiusX,
    right: 50 + (bubbleWidth / 2 / lobbyWidth) * 100 + radiusX,
    top: 30 - radiusY,
    bottom: 30 + (6 * rootFontSize / lobbyHeight) * 100 + radiusY,
  };
  const mascotSize = Math.max(
    11 * rootFontSize,
    Math.min(0.52 * viewportWidth, 0.22 * viewportHeight, 23 * rootFontSize),
  );
  const mascot = {
    left: 50 - ((mascotSize / 2 + profileSize / 2 + 8) / lobbyWidth) * 100,
    right: 50 + ((mascotSize / 2 + profileSize / 2 + 8) / lobbyWidth) * 100,
    top: 51 - ((mascotSize / 2 + profileSize / 2 + 10) / lobbyHeight) * 100,
    bottom: 51 + ((mascotSize / 2 + profileSize / 2 + 10) / lobbyHeight) * 100,
  };
  const buttonTop =
    100 - ((6.8 * rootFontSize + profileSize / 2 + 8) / lobbyHeight) * 100;
  const minX = Math.max(3, radiusX);
  const maxX = 100 - minX;
  const minY = Math.max(3, radiusY);
  const maxY = Math.min(100 - radiusY, buttonTop);
  const isInside = (
    point: { x: number; y: number },
    rect: { left: number; right: number; top: number; bottom: number },
  ) =>
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom;

  const placed: LobbyParticipant[] = [];
  for (const person of [...people].sort(() => Math.random() - 0.5)) {
    const candidates: Array<{ x: number; y: number; spacing: number }> = [];
    for (let attempt = 0; attempt < 1800; attempt += 1) {
      const point = {
        x: minX + Math.random() * (maxX - minX),
        y: minY + Math.random() * (maxY - minY),
      };
      if (isInside(point, bubble) || isInside(point, mascot)) continue;

      const spacing = placed.length
        ? Math.min(
            ...placed.map((other) => {
              const dx =
                ((point.x - Number.parseFloat(other.x)) / 100) * lobbyWidth;
              const dy =
                ((point.y - Number.parseFloat(other.y)) / 100) * lobbyHeight;
              return Math.hypot(dx, dy);
            }),
          )
        : Number.POSITIVE_INFINITY;
      if (spacing >= profileSize + rootFontSize * 0.6) {
        candidates.push({ ...point, spacing });
      }
    }
    if (candidates.length === 0) continue;
    candidates.sort((a, b) => b.spacing - a.spacing);
    const preferred = candidates.slice(0, Math.min(24, candidates.length));
    const { x, y } = preferred[Math.floor(Math.random() * preferred.length)];
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

