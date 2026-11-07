import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  finalChoiceGuideMessages,
  lobbyGuideMessages,
} from "../../components/Session/GuideBubble";
import SessionNoti from "../../components/Session/SessionNoti";
import LobbyBackground from "../../components/Session/LobbyBackground";
import Store from "../Store/Store";
import Vote from "../Vote/Vote";
import { getAccessToken } from "../../features/auth/session";
import { getSession, submitSessionVotes } from "../../features/sessions/api";
import type { SessionDetail } from "../../features/sessions/types";
import { connectLiveSession } from "../../features/live/stomp";
import type {
  LiveAssignment,
  LiveConnection,
  LiveMessage,
} from "../../features/live/stomp";
import { getMyWallet } from "../../features/wallet/api";
import {
  getHeartStatus,
  sendHeart as sendHeartRequest,
} from "../../features/sessions/interactionApi";
import { getOwnVote, type OwnVote } from "../../features/sessions/resultsApi";
import { getIceServers } from "../../features/live/api";
import { getLiveSessionState } from "../../features/live/api";
import { getMyMember } from "../../features/members/api";
import SessionPage from "./SessionPage";
import Call from "./Call";
import MiniGame from "./MiniGame";
import HeartLobby from "./HeartLobby.tsx";
import MainLobby from "./MainLobby";
import Waiting from "./Waiting";
import {
  createLobbyParticipants,
  createMockAssignment,
  createVotePreviewSession,
  hasSameRoster,
  pad,
} from "./sessionUtils";
import type { LobbyParticipant, PeerState, Phase, SessionProps } from "./sessionUtils";

const PLAYBACK_BLOCKED_MESSAGE =
  "브라우저에서 음성 재생이 막혔어요. 화면을 한 번 누르면 상대 목소리가 나와요.";

const MIC_LOBBY_NOTICE =
  "마이크 권한이 필요해요. 주소창의 🔒(또는 ⓘ) → 마이크 → 허용으로 바꿔주세요. 허용하지 않으면 상대 목소리만 들리고 내 목소리는 전달되지 않아요.";

/** 마이크를 쓸 수 없을 때 보여줄 안내. 권한 거부면 브라우저 설정에서 허용하는 방법을 알려준다 */
function microphoneErrorMessage(cause: unknown) {
  const name = cause instanceof DOMException ? cause.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError")
    return "마이크 권한이 꺼져 있어요. 주소창의 🔒(또는 ⓘ) → 마이크 → 허용으로 바꾼 뒤 마이크 버튼을 눌러주세요. 그 전까지는 상대 목소리만 들려요.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError")
    return "사용할 수 있는 마이크를 찾지 못했어요. 그 전까지는 상대 목소리만 들려요.";
  return cause instanceof Error && cause.message
    ? cause.message
    : "마이크를 사용할 수 없어요. 그 전까지는 상대 목소리만 들려요.";
}

const MIC_UNSUPPORTED_MESSAGE =
  "이 브라우저에서는 마이크를 사용할 수 없어요. 그 전까지는 상대 목소리만 들려요.";

/** 마이크 권한만 받고 바로 끈다. 실패하면 이유를 담아 던진다 */
async function requestMicrophoneAccess() {
  if (!navigator.mediaDevices?.getUserMedia)
    throw new Error(MIC_UNSUPPORTED_MESSAGE);
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });
  stream.getTracks().forEach((track) => track.stop());
}

export default function Session({ sessionId }: SessionProps) {
  const previewParams = new URLSearchParams(window.location.search);
  const isMockLiveEnabled =
    previewParams.has("preview") &&
    (import.meta.env.DEV || previewParams.has("showTest"));
  const previewKind = previewParams.get("preview");
  const waitingPreviewMode =
    isMockLiveEnabled &&
    ["waiting-upcoming", "waiting-open", "waiting-closed"].includes(
      previewKind ?? "",
    );
  const idlePreviewMode = isMockLiveEnabled && previewKind === "idle";
  const heartRestrictionPreviewMode =
    isMockLiveEnabled && previewKind === "heart-restriction";
  const heartLobbyPreviewMode =
    isMockLiveEnabled &&
    ["hearts", "heart-send", "heart-restriction"].includes(
      previewKind ?? "",
    );
  const callPreviewMode =
    isMockLiveEnabled &&
    [
      "one-to-one",
      "one-to-one-empty-profile",
      "one-to-one-profile",
      "one-to-one-report",
      "call-5m",
      "call-1m",
      "call-urgent",
    ].includes(previewKind ?? "");
  const lobbyPreviewMode =
    isMockLiveEnabled &&
    previewKind === "lobby";
  const emptyProfilePreviewMode =
    isMockLiveEnabled && previewKind === "one-to-one-empty-profile";
  const notificationPreviewMode =
    isMockLiveEnabled && (previewKind === "notifications" || previewKind === "notifications-empty");
  const votePreviewMode =
    isMockLiveEnabled &&
    previewKind === "vote";
  const sessionPreviewMode =
    lobbyPreviewMode ||
    heartLobbyPreviewMode ||
    callPreviewMode ||
    emptyProfilePreviewMode ||
    notificationPreviewMode ||
    votePreviewMode ||
    idlePreviewMode ||
    waitingPreviewMode;
  const [session, setSession] = useState<SessionDetail | null>(() =>
    sessionPreviewMode
      ? {
          ...createVotePreviewSession(sessionId),
          startTime: new Date(
            Date.now() +
              (previewKind === "waiting-upcoming"
                ? 15 * 60_000
                : previewKind === "waiting-open"
                  ? 2 * 60_000
                  : previewKind === "waiting-closed"
                    ? -2 * 60_000
                    : 0),
          ).toISOString(),
        }
      : null,
  );
  const [loading, setLoading] = useState(!sessionPreviewMode);
  const [loadError, setLoadError] = useState("");
  const [phase, setPhase] = useState<Phase>(
    votePreviewMode
      ? "voting"
      : heartLobbyPreviewMode
        ? "idle"
        : idlePreviewMode
          ? "idle"
          : callPreviewMode
          ? "assigned"
        : lobbyPreviewMode || notificationPreviewMode
            ? "lobby"
            : "ready",
  );
  // 서버가 이번 라운드에 짝이 없다고 알려준 경우(round-idle, 재입장 IDLE)만 true.
  // 대화를 마치고 다음 라운드를 기다리는 것도 phase가 "idle"이라 따로 구분한다
  const [unmatchedThisRound, setUnmatchedThisRound] = useState(idlePreviewMode);
  const [assignment, setAssignment] = useState<LiveAssignment | null>(
    callPreviewMode
      ? createMockAssignment(
          sessionId,
          1,
          emptyProfilePreviewMode,
        )
      : null,
  );
  const [myLiveMemberId, setMyLiveMemberId] = useState<number | null>(
    lobbyPreviewMode || idlePreviewMode || callPreviewMode || notificationPreviewMode || votePreviewMode || heartLobbyPreviewMode ? 1 : null,
  );
  const [myRealName, setMyRealName] = useState(
    sessionPreviewMode ? "유진" : "",
  );
  const [currentRound, setCurrentRound] = useState(1);
  const [conversationEndsAt, setConversationEndsAt] = useState<number | null>(
    callPreviewMode
      ? Date.now() +
        (previewKind === "call-5m"
          ? 5 * 60_000
          : previewKind === "call-1m"
            ? 60_000
            : previewKind === "call-urgent"
              ? 10_000
              : 9 * 60_000)
      : null,
  );
  const [miniGameEndsAt, setMiniGameEndsAt] = useState<number | null>(() =>
    idlePreviewMode ? Date.now() + 55_000 : null,
  );
  const [finalChoiceLobby, setFinalChoiceLobby] = useState(heartLobbyPreviewMode);
  const [finalChoiceStartsAt, setFinalChoiceStartsAt] = useState<number | null>(
    heartLobbyPreviewMode ? Date.now() + 3 * 60 * 1000 : null,
  );
  const [finalChoiceCountdown, setFinalChoiceCountdown] = useState<
    number | null
  >(null);
  const [votingEndsAt, setVotingEndsAt] = useState<string | null>(null);
  const [ownVote, setOwnVote] = useState<OwnVote | null>(null);
  const [encounteredProfiles, setEncounteredProfiles] = useState<
    Array<{ nickname: string; roundNumber: number; memberId: number }>
  >(() => {
    if (votePreviewMode || lobbyPreviewMode || idlePreviewMode) {
      return [
        { nickname: "구름산책", roundNumber: 1, memberId: 2 },
        { nickname: "달빛수집가", roundNumber: 2, memberId: 3 },
        { nickname: "포근한오후", roundNumber: 3, memberId: 4 },
        { nickname: "초록새벽", roundNumber: 4, memberId: 5 },
        { nickname: "느린토끼", roundNumber: 5, memberId: 6 },
        { nickname: "햇살한스푼", roundNumber: 6, memberId: 7 },
      ];
    }
    if (heartLobbyPreviewMode) {
      return [
        { nickname: "구름산책", roundNumber: 1, memberId: 2 },
        { nickname: "달빛수집가", roundNumber: 2, memberId: 3 },
        { nickname: "포근한오후", roundNumber: 3, memberId: 4 },
        { nickname: "초록새벽", roundNumber: 4, memberId: 5 },
        { nickname: "느린토끼", roundNumber: 5, memberId: 6 },
      ];
    }
    // 새로고침·재입장: 앞에서 만난 상대 목록을 sessionStorage에서 되살린다.
    // (복원하지 않으면 아래 effect가 빈 목록으로 덮어써서 하트·투표·연락처 화면이 비게 된다)
    if (sessionPreviewMode) return [];
    try {
      const stored = sessionStorage.getItem(
        `kiiwee.session-context:${sessionId}`,
      );
      const partners = stored
        ? (JSON.parse(stored) as { partners?: unknown }).partners
        : null;
      if (!Array.isArray(partners)) return [];
      return partners.filter(
        (item): item is { nickname: string; roundNumber: number; memberId: number } =>
          typeof item === "object" &&
          item !== null &&
          typeof item.memberId === "number" &&
          typeof item.roundNumber === "number" &&
          typeof item.nickname === "string",
      );
    } catch {
      return [];
    }
  });
  useEffect(() => {
    const key = `kiiwee.session-context:${sessionId}`;
    let storedMemberId: number | null = null;
    try {
      const stored = sessionStorage.getItem(key);
      const parsed = stored
        ? (JSON.parse(stored) as { myMemberId?: unknown })
        : null;
      const value = parsed?.myMemberId;
      if (typeof value === "number") storedMemberId = value;
    } catch {
      // 깨진 값은 새로 덮어쓴다
    }
    sessionStorage.setItem(
      key,
      JSON.stringify({
        partners: encounteredProfiles,
        // 재입장 직후 아직 memberId를 모를 때 기존 값을 지우지 않는다
        myMemberId: myLiveMemberId ?? assignment?.memberId ?? storedMemberId,
      }),
    );
  }, [sessionId, encounteredProfiles, myLiveMemberId, assignment?.memberId]);
  const [selectedProfile, setSelectedProfile] = useState<{
    nickname: string;
    roundNumber: number;
    memberId: number;
  } | null>(() =>
    previewKind === "heart-send"
      ? { nickname: "구름산책", roundNumber: 1, memberId: 2 }
      : null,
  );
  const [heartsRemaining, setHeartsRemaining] = useState(1);
  const [gemsRemaining, setGemsRemaining] = useState(isMockLiveEnabled ? 5 : 0);
  const [shopOpen, setShopOpen] = useState(
    () =>
      new URLSearchParams(window.location.search).get("paymentReturn") ===
      "embedded",
  );
  const [heartsSent, setHeartsSent] = useState<Record<number, number>>({});
  const [heartRestrictionOpen, setHeartRestrictionOpen] = useState(heartRestrictionPreviewMode);
  const [isPartnerSpeaking, setIsPartnerSpeaking] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [profileCardOpen, setProfileCardOpen] = useState(
    previewKind === "one-to-one-profile",
  );
  const [reportPopupOpen, setReportPopupOpen] = useState(
    previewKind === "one-to-one-report",
  );
  const [isStarting, setIsStarting] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [roundStartNotice, setRoundStartNotice] = useState("");
  const [countdownNotice, setCountdownNotice] = useState<5 | 1 | null>(() =>
    previewKind === "call-5m" ? 5 : previewKind === "call-1m" ? 1 : null,
  );
  useEffect(() => {
    if (previewKind !== "call-5m" && previewKind !== "call-1m") return;
    const timeout = window.setTimeout(() => setCountdownNotice(null), 3000);
    return () => window.clearTimeout(timeout);
  }, []);
  const [connectionStatus, setConnectionStatus] = useState("입장 전");
  const [, setCallStatus] = useState("상대 배정을 기다리는 중");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [lobbyParticipants, setLobbyParticipants] = useState<{
    opposite: LobbyParticipant[];
    same: LobbyParticipant[];
  }>(() => {
    if (!lobbyPreviewMode && !idlePreviewMode) return { opposite: [], same: [] };
    const roster = createLobbyParticipants([
      { memberId: 2, nickname: "구름산책" },
      { memberId: 3, nickname: "달빛수집가" },
      { memberId: 1, nickname: "나" },
      { memberId: 4, nickname: "포근한오후" },
      { memberId: 5, nickname: "초록새벽" },
    ]);
    return { opposite: roster.slice(0, 2), same: roster.slice(2) };
  });
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [showLobbyWelcome, setShowLobbyWelcome] = useState(false);
  const [mascotSpeaking, setMascotSpeaking] = useState(false);
  const [mascotMouthOpen, setMascotMouthOpen] = useState(false);
  const [autoStartCountdown, setAutoStartCountdown] = useState<number | null>(
    null,
  );
  const liveRef = useRef<LiveConnection | null>(null);
  const lobbyWelcomeStarted = useRef(false);
  const lobbyWelcomeTimer = useRef<number | null>(null);
  const iceServersRef = useRef<RTCIceServer[] | null>(null);
  const peerRef = useRef<PeerState | null>(null);
  const pendingSignals = useRef<Extract<LiveMessage, { kind: "signal" }>[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mutedRef = useRef(false);
  const speakerEnabledRef = useRef(true);
  const audioPlaybackBlockedRef = useRef(false);
  // 브라우저가 상대 음성 자동 재생을 막았는지 (스피커 버튼에 "눌러서 소리 켜기"로 보여준다)
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  // 마이크를 못 가져온 상태. 이때는 상대 목소리만 받는 연결로 붙고, 마이크 버튼은 "권한 필요"로 보인다
  const [micUnavailable, setMicUnavailable] = useState(false);
  const markPlaybackBlocked = useCallback((blocked: boolean) => {
    audioPlaybackBlockedRef.current = blocked;
    setPlaybackBlocked(blocked);
  }, []);
  const audioContextRef = useRef<AudioContext | null>(null);
  const speechFrameRef = useRef<number | null>(null);
  const candidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const makingOffer = useRef(false);
  const ignoreOffer = useRef(false);
  const intentionalClose = useRef(false);
  const startRequested = useRef(false);
  const autoStartTimeoutRef = useRef<number | null>(null);
  const autoStartIntervalRef = useRef<number | null>(null);
  const finalChoiceTimerRef = useRef<number | null>(null);
  const roundNoticeTimeoutRef = useRef<number | null>(null);
  const countdownNoticeTimeoutRef = useRef<number | null>(null);
  const previousConversationRemainingRef = useRef<number | null>(null);
  const shownConversationCountdownsRef = useRef<Set<number>>(new Set());
  const startConversationRef = useRef<() => void>(() => undefined);
  // 서버 기준 라이브 단계. 하트·투표 중에 재입장하면 joined(JOINED)가 와도 로비로 돌아가지 않게 막는다
  const livePhaseRef = useRef<"HEART" | "VOTING" | null>(null);
  const sessionRef = useRef<SessionDetail | null>(null);
  sessionRef.current = session;
  // 상대가 재접속해 새 연결로 offer를 보내면 기존 RTCPeerConnection을 버리고 다시 만든다
  const [peerResetKey, setPeerResetKey] = useState(0);
  const awaitRemoteOfferRef = useRef(false);
  const autoReconnectTriedRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isMockLiveEnabled || !getAccessToken()) return;
    let active = true;
    getMyWallet()
      .then((wallet) => {
        if (active) setGemsRemaining(wallet.gemBalance);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "보석 잔액을 불러오지 못했어요.",
          );
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isMockLiveEnabled || !getAccessToken() || !finalChoiceLobby) return;
    let active = true;
    getHeartStatus(sessionId)
      .then((status) => {
        if (!active) return;
        setHeartsRemaining(status.freeHeartRemaining ? 1 : 0);
        setHeartsSent(
          Object.fromEntries(status.sentTo.map((memberId) => [memberId, 1])),
        );
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "하트 상태를 불러오지 못했어요.",
          );
      });
    return () => {
      active = false;
    };
  }, [finalChoiceLobby, sessionId]);

  useEffect(() => {
    if (phase !== "lobby" && phase !== "idle") return;

    let speechTimer = 0;
    let mouthTimer = 0;
    const speak = () => {
      setMascotSpeaking(true);
      setMascotMouthOpen(true);
      mouthTimer = window.setInterval(() => {
        setMascotMouthOpen((open) => !open);
      }, 600);
      speechTimer = window.setTimeout(() => {
        window.clearInterval(mouthTimer);
        setMascotSpeaking(false);
        setMascotMouthOpen(false);
      }, 3600);
    };

    speak();
    const announcementTimer = window.setInterval(() => {
      setAnnouncementIndex((index) => (index + 1) % lobbyGuideMessages.length);
      speak();
    }, 3000);

    return () => {
      window.clearInterval(announcementTimer);
      window.clearInterval(mouthTimer);
      window.clearTimeout(speechTimer);
      setMascotSpeaking(false);
      setMascotMouthOpen(false);
    };
  }, [phase]);

  useEffect(() => {
    if (sessionPreviewMode) return;
    let active = true;
    if (!getAccessToken()) {
      setLoading(false);
      setLoadError("로그인 후 신청한 세션에 입장할 수 있어요.");
      return () => {
        active = false;
      };
    }
    getSession(sessionId)
      .then((result) => {
        if (active) {
          setSession(result);
          if (result.currentRoundNumber)
            setCurrentRound((round) =>
              Math.max(round, result.currentRoundNumber ?? 0),
            );
          if (result.liveStatus === "VOTING" && result.phaseEndsAt) {
            livePhaseRef.current = "VOTING";
            setVotingEndsAt(result.phaseEndsAt);
            setPhase("voting");
          } else if (result.liveStatus === "HEART") {
            // 하트 단계에 재입장: 하트 로비로 바로 복원한다
            livePhaseRef.current = "HEART";
            setFinalChoiceLobby(true);
            setFinalChoiceStartsAt(
              result.phaseEndsAt ? Date.parse(result.phaseEndsAt) : Date.now(),
            );
            setFinalChoiceCountdown(null);
            setUnmatchedThisRound(false);
            setPhase("idle");
          }
        }
      })
      .catch((cause) => {
        if (active)
          setLoadError(
            cause instanceof Error
              ? cause.message
              : "세션 정보를 불러오지 못했어요.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionId, sessionPreviewMode]);

  useEffect(() => {
    if (isMockLiveEnabled) return;
    if (
      !liveRef.current ||
      finalChoiceLobby ||
      (phase !== "lobby" && phase !== "idle")
    ) {
      setLobbyParticipants({ opposite: [], same: [] });
      return;
    }

    let active = true;
    let pollTimer = 0;
    const refreshParticipants = async (myGender: "MALE" | "FEMALE") => {
      try {
        const currentSession = await getSession(sessionId);
        if (!active) return;
        setSession(currentSession);
        if (
          currentSession.status !== "IN_PROGRESS" &&
          currentSession.status !== "COMPLETED"
        ) {
          setLobbyParticipants({ opposite: [], same: [] });
          return;
        }
        const state = await getLiveSessionState(sessionId);
        if (!active) return;
        const others = state.participants.filter(
          (person) => person.memberId !== myLiveMemberId,
        );
        const opposite = others
          .filter((person) => person.gender !== myGender)
          .map((person) => ({
            memberId: person.memberId,
            nickname: person.alias,
          }));
        const same = others
          .filter((person) => person.gender === myGender)
          .map((person) => ({
            memberId: person.memberId,
            nickname: person.alias,
          }));
        const self = state.participants.find(
          (person) => person.memberId === myLiveMemberId,
        );
        if (myLiveMemberId != null) {
          same.unshift({
            memberId: myLiveMemberId,
            nickname: self?.alias || currentSession.myAlias || "나",
          });
        }
        setLobbyParticipants((current) => {
          if (
            hasSameRoster(current.opposite, opposite) &&
            hasSameRoster(current.same, same)
          ) {
            return current;
          }
          const currentById = new Map(
            [...current.opposite, ...current.same].map((person) => [
              person.memberId,
              person,
            ]),
          );
          const newcomers = [...opposite, ...same].filter(
            (person) => !currentById.has(person.memberId),
          );
          const generated = createLobbyParticipants([
            ...currentById.values(),
            ...newcomers,
          ]);
          const generatedById = new Map(
            generated.map((person) => [person.memberId, person]),
          );
          const place = (person: (typeof opposite)[number]) =>
            currentById.get(person.memberId) ?? {
              ...generatedById.get(person.memberId)!,
              entering: true,
            };
          return {
            opposite: opposite.map(place),
            same: same.map(place),
          };
        });
      } catch {
        // Keep the lobby free of fabricated profiles when the roster is unavailable.
      }
    };

    getMyMember()
      .then((member) => {
        if (!active) return;
        setMyRealName(member.name?.trim() ?? "");
        void refreshParticipants(member.gender);
        pollTimer = window.setInterval(
          () => void refreshParticipants(member.gender),
          1500,
        );
      })
      .catch(() => setLobbyParticipants({ opposite: [], same: [] }));

    return () => {
      active = false;
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [finalChoiceLobby, isMockLiveEnabled, myLiveMemberId, phase, sessionId]);

  useEffect(() => {
    if (phase !== "voting" || isMockLiveEnabled || !getAccessToken()) return;
    let active = true;
    getOwnVote(sessionId)
      .then((vote) => {
        if (active) setOwnVote(vote);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "제출한 투표를 불러오지 못했어요.",
          );
      });
    return () => {
      active = false;
    };
  }, [phase, sessionId]);

  useEffect(() => {
    if (isMockLiveEnabled || !getAccessToken()) return;
    let active = true;
    getIceServers(sessionId)
      .then((config) => {
        if (active) {
          const configuredServers = config.iceServers.map((server) => ({
            urls: server.urls,
            ...(server.username ? { username: server.username } : {}),
            ...(server.credential ? { credential: server.credential } : {}),
          }));
          iceServersRef.current = configuredServers.length
            ? configuredServers
            : [{ urls: "stun:stun.l.google.com:19302" }];
        }
      })
      .catch(() => {
        // API 일시 장애 시 기존 공개 STUN 서버로 WebRTC를 유지합니다.
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  const sendSignal = useCallback(
    (input: Parameters<LiveConnection["sendSignal"]>[0]) => {
      liveRef.current?.sendSignal(input);
    },
    [],
  );

  const handleSignal = useCallback(
    async (signal: Extract<LiveMessage, { kind: "signal" }>) => {
      const peer = peerRef.current;
      if (!peer) {
        // OFFER/ANSWER는 ICE 후보에 밀려 버려지지 않도록 따로 지킨다
        const queued = [...pendingSignals.current, signal];
        const descriptions = queued.filter((item) => item.type !== "ICE_CANDIDATE");
        const candidates = queued
          .filter((item) => item.type === "ICE_CANDIDATE")
          .slice(-64);
        pendingSignals.current = queued.filter(
          (item) => descriptions.includes(item) || candidates.includes(item),
        );
        return;
      }
      if (signal.roomId !== peer.assignment.roomId) return;
      const connection = peer.connection;
      if (
        signal.type === "OFFER" &&
        connection.remoteDescription &&
        connection.signalingState === "stable"
      ) {
        // 이미 연결을 맺은 상대가 다시 offer를 보냈다 = 상대가 재입장해 새 RTCPeerConnection을 만든 것.
        // 기존 연결에 그대로 적용하면 실패하므로 연결을 새로 만들고, 새 연결은 이 offer에 응답만 한다
        connection.close();
        peerRef.current = null;
        candidateQueue.current = [];
        pendingSignals.current = [signal];
        awaitRemoteOfferRef.current = true;
        setPeerResetKey((key) => key + 1);
        return;
      }
      if (signal.type === "ICE_CANDIDATE") {
        try {
          const candidate = JSON.parse(signal.payload) as RTCIceCandidateInit;
          if (connection.remoteDescription)
            await connection.addIceCandidate(candidate);
          else candidateQueue.current.push(candidate);
        } catch {
          // 이전 연결에서 온 늦은 후보는 적용되지 않아도 통화에 영향이 없다
        }
        return;
      }
      // 보낸 offer가 없는데 온 answer는 이전 연결의 것이라 무시한다
      if (signal.type === "ANSWER" && connection.signalingState !== "have-local-offer")
        return;
      try {
        const description = signal.payload.startsWith("{")
          ? (JSON.parse(signal.payload) as RTCSessionDescriptionInit)
          : ({
              type: signal.type.toLowerCase(),
              sdp: signal.payload,
            } as RTCSessionDescriptionInit);
        const collision =
          signal.type === "OFFER" &&
          (makingOffer.current || connection.signalingState !== "stable");
        const polite =
          peer.assignment.memberId > peer.assignment.partnerMemberId;
        ignoreOffer.current = !polite && collision;
        if (ignoreOffer.current) {
          // 상대 offer와 엇갈려 이쪽(impolite)이 무시했다. 보통은 상대가 양보하고 이쪽 offer에 답한다.
          // 그런데 상대가 이쪽 offer를 받기 전에 새로고침했다면 그 offer는 사라져서 양쪽이 서로 기다리게 된다.
          // 잠시 뒤에도 답이 없으면 같은 offer를 다시 보내 상대(polite)가 받아들이게 한다
          const pendingOfferSdp = connection.localDescription?.sdp;
          const assignmentAtCollision = peer.assignment;
          window.setTimeout(() => {
            if (
              peerRef.current?.connection !== connection ||
              connection.signalingState !== "have-local-offer" ||
              !pendingOfferSdp ||
              connection.localDescription?.sdp !== pendingOfferSdp
            )
              return;
            sendSignal({
              sessionId,
              roomId: assignmentAtCollision.roomId,
              toMemberId: assignmentAtCollision.partnerMemberId,
              type: "OFFER",
              payload: pendingOfferSdp,
            });
          }, 3000);
          return;
        }
        if (collision && polite)
          await connection.setLocalDescription({ type: "rollback" });
        await connection.setRemoteDescription(description);
        for (const candidate of candidateQueue.current.splice(0))
          await connection.addIceCandidate(candidate).catch(() => undefined);

        if (signal.type === "OFFER") {
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          sendSignal({
            sessionId,
            roomId: peer.assignment.roomId,
            toMemberId: peer.assignment.partnerMemberId,
            type: "ANSWER",
            payload: connection.localDescription?.sdp ?? "",
          });
        }
      } catch {
        if (!ignoreOffer.current)
          setError("상대와 음성 연결을 설정하지 못했어요. 다시 입장해주세요.");
      }
    },
    [sendSignal, sessionId],
  );

  const handleMessage = useCallback(
    (message: LiveMessage) => {
      if (message.kind === "assigned") {
        if (message.assignment.sessionId !== sessionId) return;
      } else if (
        message.kind !== "heart-received" &&
        message.kind !== "contact-requested" &&
        message.kind !== "contact-request-answered" &&
        message.kind !== "contact-received" &&
        message.sessionId !== sessionId
      ) {
        return;
      }
      if (
        message.kind === "heart-received" ||
        message.kind === "contact-requested" ||
        message.kind === "contact-request-answered" ||
        message.kind === "contact-received"
      ) {
        window.dispatchEvent(
          new CustomEvent("kiiwee:live-notification", { detail: message }),
        );
      } else if (message.kind === "joined") {
        setMyLiveMemberId(message.memberId);
        // 서버가 돌려준 지난 상대 목록으로 복원한다 (새 탭·다른 기기로 재입장해도 하트·투표 후보가 유지됨).
        // 이미 아는 라운드는 기존 별칭을 지키고, 모르는 라운드만 채운다
        const restoredPartners = message.partners ?? [];
        if (restoredPartners.length > 0) {
          setEncounteredProfiles((profiles) => {
            const known = new Set(profiles.map((profile) => profile.roundNumber));
            const added = restoredPartners
              .filter((partner) => !known.has(partner.roundNumber))
              .map((partner) => ({
                nickname: partner.alias || "상대방",
                roundNumber: partner.roundNumber,
                memberId: partner.memberId,
              }));
            return added.length === 0
              ? profiles
              : [...profiles, ...added].sort(
                  (left, right) => left.roundNumber - right.roundNumber,
                );
          });
        }
        if (
          message.status === "ASSIGNED" &&
          message.roomId !== null &&
          message.partnerMemberId !== null &&
          message.roundId !== null &&
          message.roundNumber !== null
        ) {
          const roundNumber = message.roundNumber;
          const partnerMemberId = message.partnerMemberId;
          // 재접속: 서버가 돌려준 상대 별칭과 프로필 카드로 복원한다
          const nickname = message.partnerAlias || "상대방";
          setEncounteredProfiles((profiles) =>
            profiles.some((profile) => profile.roundNumber === roundNumber)
              ? profiles
              : [
                  ...profiles,
                  {
                    nickname,
                    roundNumber,
                    memberId: partnerMemberId,
                  },
                ],
          );
          setAssignment({
            sessionId: message.sessionId,
            roundId: message.roundId,
            roundNumber: message.roundNumber,
            roomId: message.roomId,
            tableNo: message.tableNo ?? 0,
            memberId: message.memberId,
            partnerMemberId: message.partnerMemberId,
            partnerAlias: message.partnerAlias,
            partnerProfileCard: {
              ...(message.partnerProfileCard ?? {
                memberId: message.partnerMemberId,
                university: null,
                idealType: null,
                datingStyle: null,
                contactStyle: null,
                loveStyle: null,
                interests: [],
              }),
              nickname,
            },
            compatibility: null,
            roundEndsAt: message.roundEndsAt,
          });
          setConversationEndsAt(message.roundEndsAt ? Date.parse(message.roundEndsAt) : null);
          setCurrentRound(message.roundNumber);
          startRequested.current = true;
          setUnmatchedThisRound(false);
          setPhase("assigned");
        } else if (livePhaseRef.current) {
          // 하트·투표 단계에 재입장: 진행 중인 라운드가 없어 JOINED가 오지만 화면은 그대로 둔다
          setConnectionStatus(
            livePhaseRef.current === "HEART"
              ? "하트 선택 진행 중"
              : "최종 투표 진행 중",
          );
          return;
        } else {
          setConversationEndsAt(null);
          setUnmatchedThisRound(message.status === "IDLE");
          if (message.status === "IDLE" && message.roundNumber !== null) {
            setMiniGameEndsAt(
              Date.now() +
                (sessionRef.current?.roundDurationSeconds ?? 180) * 1000,
            );
            const roundNumber = message.roundNumber;
            setCurrentRound((round) => Math.max(round, roundNumber));
          } else if (message.status === "JOINED") {
            setMiniGameEndsAt(null);
            const current = sessionRef.current;
            const lastRound = current?.currentRoundNumber ?? 0;
            if (
              current?.status === "IN_PROGRESS" &&
              current.liveStatus === "IN_ROUND" &&
              lastRound > 0
            ) {
              // 라운드 사이에 재입장: 직전 라운드는 끝났으니 다음 라운드 번호로 안내한다
              setCurrentRound((round) => Math.max(round, lastRound + 1));
            }
          }
          setPhase(message.status === "IDLE" ? "idle" : "lobby");
        }
        setConnectionStatus(
          message.status === "ASSIGNED"
            ? "진행 중인 대화에 재접속했어요"
            : message.status === "IDLE"
              ? "이번 라운드 대기"
              : "로비 입장 완료",
        );
      } else if (message.kind === "assigned") {
        setMiniGameEndsAt(null);
        setMyLiveMemberId(message.assignment.memberId);
        // 상대는 서버가 정한 세션 별칭으로 기록한다
        const nickname =
          message.assignment.partnerAlias ||
          message.assignment.partnerProfileCard.nickname ||
          "상대방";
        setEncounteredProfiles((profiles) =>
          profiles.some(
            (profile) => profile.roundNumber === message.assignment.roundNumber,
          )
            ? profiles
            : [
                ...profiles,
                {
                  nickname,
                  roundNumber: message.assignment.roundNumber,
                  memberId: message.assignment.partnerMemberId,
                },
              ],
        );
        setAssignment({
          ...message.assignment,
          partnerProfileCard: {
            ...message.assignment.partnerProfileCard,
            nickname,
          },
        });
        setConversationEndsAt(message.assignment.roundEndsAt ? Date.parse(message.assignment.roundEndsAt) : null);
        setCurrentRound((round) =>
          Math.max(round, message.assignment.roundNumber),
        );
        setIsStarting(false);
        startRequested.current = true;
        setUnmatchedThisRound(false);
        setPhase("assigned");
        setCallStatus(
          isMockLiveEnabled
            ? "목업 상대 연결됨"
            : "마이크와 음성 연결을 준비 중",
        );
      } else if (message.kind === "idle") {
        peerRef.current?.connection.close();
        peerRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setConversationEndsAt(null);
        setMiniGameEndsAt(
          Date.now() +
            (sessionRef.current?.roundDurationSeconds ?? 180) * 1000,
        );
        setIsPartnerSpeaking(false);
        setCurrentRound((round) => Math.max(round, message.roundNumber));
        setAssignment(null);
        startRequested.current = false;
        setIsStarting(false);
        setUnmatchedThisRound(true);
        setPhase("idle");
        setCallStatus("");
        setConnectionStatus("이번 라운드 대기");
      } else if (message.kind === "signal") {
        void handleSignal(message);
      } else if (message.kind === "voting-started") {
        livePhaseRef.current = "VOTING";
        peerRef.current?.connection.close();
        peerRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setConversationEndsAt(null);
        setMiniGameEndsAt(null);
        setIsPartnerSpeaking(false);
        setVotingEndsAt(message.votingEndsAt);
        setFinalChoiceLobby(false);
        setFinalChoiceStartsAt(null);
        setFinalChoiceCountdown(null);
        setPhase("voting");
        setConnectionStatus("최종 투표 진행 중");
      } else if (message.kind === "hearts-started") {
        livePhaseRef.current = "HEART";
        peerRef.current?.connection.close();
        peerRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setConversationEndsAt(null);
        setMiniGameEndsAt(null);
        setIsPartnerSpeaking(false);
        setAssignment(null);
        setIsStarting(false);
        startRequested.current = false;
        setFinalChoiceLobby(true);
        setFinalChoiceStartsAt(
          message.heartsEndsAt ? Date.parse(message.heartsEndsAt) : Date.now(),
        );
        setFinalChoiceCountdown(null);
        setUnmatchedThisRound(false);
        setPhase("idle");
        setConnectionStatus("하트 선택 진행 중");
      } else if (message.kind === "starting-soon") {
        // 로비 마감과 함께 출석이 확정됐다. firstRoundAt에 서버가 1라운드 배정을 보낸다
        setConnectionStatus("참가자 확인 완료 · 곧 첫 대화가 시작돼요");
      } else if (message.kind === "cancelled") {
        // 로비 마감 때 출석 인원이 모자라 취소됨. 로비에 있던 사람은 출석으로 처리돼 참가비를 돌려받는다
        intentionalClose.current = true;
        liveRef.current?.disconnect();
        liveRef.current = null;
        startRequested.current = false;
        setIsStarting(false);
        setSession((current) =>
          current ? { ...current, status: "CANCELLED" } : current,
        );
        setPhase("ready");
        setConnectionStatus("세션 취소");
        setError(
          "입장 인원이 모자라 세션이 취소됐어요. 참가비와 보증금은 돌려드렸어요.",
        );
      } else if (message.kind === "results-ready") {
        liveRef.current?.disconnect();
        window.history.pushState(
          null,
          "",
          `/result?sessionId=${message.sessionId}`,
        );
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    },
    [handleSignal, sessionId],
  );

  useEffect(() => {
    if (!assignment || phase !== "assigned") return;
    const currentAssignment = assignment;
    setConversationEndsAt(
      (endAt) =>
        endAt ?? Date.now() + (session?.roundDurationSeconds ?? 180) * 1000,
    );
    if (isMockLiveEnabled) {
      setCallStatus("목업 연결 · 화면 테스트 중");
      setIsPartnerSpeaking(true);
      return;
    }
    setIsPartnerSpeaking(false);

    let cancelled = false;
    // 상대가 재입장해 보낸 offer로 연결을 다시 만드는 경우, 이쪽은 offer를 보내지 않고 응답만 한다
    const answerOnly = awaitRemoteOfferRef.current;
    awaitRemoteOfferRef.current = false;
    async function startPeer() {
      try {
        // 마이크를 못 가져와도 연결은 만든다. 그래야 상대 목소리는 들리고 상대도 연결된 걸 안다
        let stream: MediaStream | null = null;
        try {
          if (!navigator.mediaDevices?.getUserMedia)
            throw new Error(MIC_UNSUPPORTED_MESSAGE);
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          setMicUnavailable(false);
        } catch (micCause) {
          setMicUnavailable(true);
          setError(microphoneErrorMessage(micCause));
        }
        if (cancelled) {
          stream?.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        stream?.getAudioTracks().forEach((track) => {
          track.enabled = !mutedRef.current;
        });
        if (!iceServersRef.current) {
          try {
            const config = await getIceServers(sessionId);
            const configuredServers = config.iceServers.map((server) => ({
              urls: server.urls,
              ...(server.username ? { username: server.username } : {}),
              ...(server.credential ? { credential: server.credential } : {}),
            }));
            iceServersRef.current = configuredServers.length
              ? configuredServers
              : [{ urls: "stun:stun.l.google.com:19302" }];
          } catch {
            // Use STUN fallback if the ICE configuration endpoint is unavailable.
          }
        }
        if (cancelled) {
          stream?.getTracks().forEach((track) => track.stop());
          return;
        }
        const connection = new RTCPeerConnection({
          iceServers: iceServersRef.current ?? [
            { urls: "stun:stun.l.google.com:19302" },
          ],
        });
        const localStream = stream;
        if (localStream) {
          localStream
            .getTracks()
            .forEach((track) => connection.addTrack(track, localStream));
        } else {
          // 마이크 없이 받기 전용으로 연결한다
          connection.addTransceiver("audio", { direction: "recvonly" });
        }
        connection.onicecandidate = (event) => {
          if (event.candidate)
            sendSignal({
              sessionId,
              roomId: currentAssignment.roomId,
              toMemberId: currentAssignment.partnerMemberId,
              type: "ICE_CANDIDATE",
              payload: JSON.stringify(event.candidate),
            });
        };
        connection.onnegotiationneeded = async () => {
          if (answerOnly) return;
          try {
            makingOffer.current = true;
            await connection.setLocalDescription(
              await connection.createOffer(),
            );
            sendSignal({
              sessionId,
              roomId: currentAssignment.roomId,
              toMemberId: currentAssignment.partnerMemberId,
              type: "OFFER",
              payload: connection.localDescription?.sdp ?? "",
            });
          } catch {
            setError("음성 연결 제안을 보내지 못했어요.");
          } finally {
            makingOffer.current = false;
          }
        };
        connection.ontrack = (event) => {
          const audio = audioRef.current;
          if (audio) {
            event.track.addEventListener("mute", () =>
              setIsPartnerSpeaking(false),
            );
            audio.srcObject = event.streams[0];
            // iOS Safari는 volume을 바꿀 수 없어(항상 1) 스피커 끄기는 muted로 한다
            audio.muted = !speakerEnabledRef.current;
            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            audioContext
              .createMediaStreamSource(event.streams[0])
              .connect(analyser);
            const samples = new Uint8Array(analyser.frequencyBinCount);
            audioContextRef.current = audioContext;
            const detectSpeech = () => {
              analyser.getByteFrequencyData(samples);
              const average =
                samples.reduce((total, value) => total + value, 0) /
                samples.length;
              setIsPartnerSpeaking((speaking) =>
                speaking === average > 12 ? speaking : average > 12,
              );
              speechFrameRef.current =
                window.requestAnimationFrame(detectSpeech);
            };
            detectSpeech();
            void audioContext.resume().catch(() => undefined);
            void audio
              .play()
              .then(
                () => {
                  markPlaybackBlocked(false);
                },
                () => {
                  markPlaybackBlocked(true);
                  setError(PLAYBACK_BLOCKED_MESSAGE);
                },
              );
          }
        };
        connection.onconnectionstatechange = () => {
          const state = connection.connectionState;
          setCallStatus(
            state === "connected"
              ? "음성 연결됨"
              : state === "failed"
                ? "음성 연결이 끊겼어요. 재입장해주세요."
                : state === "connecting"
                  ? "상대와 연결 중"
                  : "상대 배정을 기다리는 중",
          );
        };
        peerRef.current = { connection, assignment: currentAssignment };
        const earlySignals = pendingSignals.current.splice(0);
        for (const signal of earlySignals) {
          if (signal.roomId === currentAssignment.roomId)
            void handleSignal(signal);
        }
        setCallStatus("상대와 음성을 연결하고 있어요.");
      } catch (cause) {
        setError(
          cause instanceof Error && cause.message
            ? cause.message
            : "음성 연결을 시작하지 못했어요.",
        );
        setCallStatus("음성 연결을 시작하지 못했어요.");
      }
    }
    void startPeer();
    return () => {
      cancelled = true;
      if (speechFrameRef.current !== null)
        window.cancelAnimationFrame(speechFrameRef.current);
      speechFrameRef.current = null;
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setIsPartnerSpeaking(false);
      markPlaybackBlocked(false);
      peerRef.current?.connection.close();
      peerRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [assignment, handleSignal, markPlaybackBlocked, peerResetKey, phase, sendSignal, sessionId]);

  // 자동 재생이 막혔으면, 사용자가 화면 어디든 처음 누를 때 다시 재생한다
  // (브라우저는 사용자가 한 번 누른 뒤에는 재생을 허락한다. 스피커 버튼을 눌러도 여기서 먼저 시도된다)
  useEffect(() => {
    if (!playbackBlocked) return;
    const retryPlayback = () => {
      const audio = audioRef.current;
      if (!audio || !audioPlaybackBlockedRef.current) return;
      void audioContextRef.current?.resume().catch(() => undefined);
      void audio.play().then(
        () => {
          markPlaybackBlocked(false);
          setError((current) =>
            current === PLAYBACK_BLOCKED_MESSAGE ? "" : current,
          );
        },
        () => undefined,
      );
    };
    document.addEventListener("pointerdown", retryPlayback, true);
    return () =>
      document.removeEventListener("pointerdown", retryPlayback, true);
  }, [markPlaybackBlocked, playbackBlocked]);

  useEffect(
    () => () => {
      intentionalClose.current = true;
      liveRef.current?.disconnect();
      peerRef.current?.connection.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const startTime = session ? new Date(session.startTime).getTime() : 0;
  const opensAt = startTime - 10 * 60 * 1000;
  // 백엔드 규칙: 로비는 시작 10분 전 ~ 시작 시각(미포함), 시작 시각에 출석 확정 후 15초 뒤 1라운드
  const closesAt = startTime;
  const joinWindowOpen = now >= opensAt && now < closesAt;
  const canEnterLobby = joinWindowOpen ||
    (session?.status === "IN_PROGRESS" && session.myStatus === "ATTENDED");
  const timeUntilEntry = Math.max(0, opensAt - now);
  const days = Math.floor(timeUntilEntry / 86400000);
  const hours = Math.floor((timeUntilEntry / 3600000) % 24);
  const minutes = Math.floor((timeUntilEntry / 60000) % 60);
  const seconds = Math.floor((timeUntilEntry / 1000) % 60);
  const timeUntilConversationStart = Math.max(0, startTime - now);
  const conversationStartSeconds = Math.ceil(timeUntilConversationStart / 1000);
  const conversationStartCountdown = `${pad(Math.floor(conversationStartSeconds / 60))}:${pad(conversationStartSeconds % 60)}`;

  function enterLobby() {
    if (
      !session ||
      (session.myStatus !== "APPLIED" && session.myStatus !== "ATTENDED") ||
      !canEnterLobby ||
      liveRef.current
    )
      return;
    setError("");
    setPhase("connecting");
    intentionalClose.current = false;
    // 대화가 시작되기 전에 마이크 권한을 미리 받아 둔다 (입장 버튼을 누른 이 순간에 허용 창이 뜬다)
    if (!isMockLiveEnabled) void checkMicrophone();

    if (isMockLiveEnabled) {
      startRequested.current = false;
      setIsStarting(false);
      setConnectionStatus("목업 로비 입장 완료");
      setCallStatus("목업 상대 연결됨");
      setAssignment(createMockAssignment(sessionId, 1));
      setPhase("lobby");
      return;
    }

    connectLive();
  }

  function connectLive() {
    intentionalClose.current = false;
    const live = connectLiveSession(
      sessionId,
      handleMessage,
      (status) => {
        setConnectionStatus(
          status === "CONNECTING"
            ? "실시간 서버에 연결 중"
            : status === "CONNECTED"
              ? "서버 연결 완료"
              : "연결 종료",
        );
        if (status === "CLOSED" && !intentionalClose.current)
          setPhase((current) => (current === "connecting" ? "ready" : current));
      },
      (message) => {
        setError(message);
        setIsStarting(false);
        startRequested.current = false;
        liveRef.current?.disconnect();
        liveRef.current = null;
        // 하트·투표 화면은 유지하고, 로비·대화 단계에서만 입장 화면으로 돌아간다
        if (!livePhaseRef.current) setPhase("ready");
      },
    );
    liveRef.current = live;
  }

  // 하트·투표 단계에 새로고침하면 입장 버튼이 없는 화면이 바로 뜬다.
  // 실시간 연결을 자동으로 다시 열어 결과 이동·알림·하트 단계 전환을 계속 받는다
  useEffect(() => {
    if (
      isMockLiveEnabled ||
      autoReconnectTriedRef.current ||
      liveRef.current ||
      !session ||
      !livePhaseRef.current ||
      session.status !== "IN_PROGRESS" ||
      session.myStatus !== "ATTENDED"
    )
      return;
    autoReconnectTriedRef.current = true;
    connectLive();
  }, [session]);

  function startConversation() {
    if (autoStartTimeoutRef.current !== null) {
      window.clearTimeout(autoStartTimeoutRef.current);
      autoStartTimeoutRef.current = null;
    }
    if (autoStartIntervalRef.current !== null) {
      window.clearInterval(autoStartIntervalRef.current);
      autoStartIntervalRef.current = null;
    }
    setAutoStartCountdown(null);
    startRequested.current = true;
    setError("");
    if (isMockLiveEnabled) {
      if (!assignment) {
        const mockAssignment = createMockAssignment(sessionId, currentRound);
        setAssignment(mockAssignment);
        setEncounteredProfiles((profiles) =>
          profiles.some(
            (profile) => profile.roundNumber === mockAssignment.roundNumber,
          )
            ? profiles
            : [
                ...profiles,
                {
                  nickname:
                    mockAssignment.partnerProfileCard.nickname || "상대방",
                  roundNumber: mockAssignment.roundNumber,
                  memberId: mockAssignment.partnerMemberId,
                },
              ],
        );
      }
      setCallStatus("목업 연결 · 화면 테스트 중");
      setIsStarting(false);
      setPhase("assigned");
      return;
    }
    if (assignment) setPhase("assigned");
    else setIsStarting(true);
  }

  startConversationRef.current = startConversation;

  useEffect(() => {
    if (finalChoiceLobby || phase !== "lobby" || !session) return;

    const startAt = new Date(session.startTime).getTime();
    const beginAutoStartCountdown = () => {
      let secondsLeft = 3;
      setAutoStartCountdown(secondsLeft);
      autoStartIntervalRef.current = window.setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft <= 0) {
          if (autoStartIntervalRef.current !== null) {
            window.clearInterval(autoStartIntervalRef.current);
            autoStartIntervalRef.current = null;
          }
          setAutoStartCountdown(null);
          startConversationRef.current();
          return;
        }
        setAutoStartCountdown(secondsLeft);
      }, 1000);
    };

    autoStartTimeoutRef.current = window.setTimeout(
      beginAutoStartCountdown,
      Math.max(0, startAt - Date.now()),
    );

    return () => {
      if (autoStartTimeoutRef.current !== null) {
        window.clearTimeout(autoStartTimeoutRef.current);
        autoStartTimeoutRef.current = null;
      }
      if (autoStartIntervalRef.current !== null) {
        window.clearInterval(autoStartIntervalRef.current);
        autoStartIntervalRef.current = null;
      }
    };
  }, [finalChoiceLobby, phase, session?.startTime]);

  useEffect(() => {
    if (!finalChoiceLobby || finalChoiceStartsAt === null) return;
    let countdownInterval = 0;
    const countdownTimeout = window.setTimeout(
      () => {
        setFinalChoiceCountdown(3);
        let secondsLeft = 3;
        countdownInterval = window.setInterval(() => {
          secondsLeft -= 1;
          if (secondsLeft <= 0) {
            window.clearInterval(countdownInterval);
            finalChoiceTimerRef.current = null;
            setFinalChoiceCountdown(null);
            setFinalChoiceLobby(false);
            setPhase("voting");
            return;
          }
          setFinalChoiceCountdown(secondsLeft);
        }, 1000);
        finalChoiceTimerRef.current = countdownInterval;
      },
      Math.max(0, finalChoiceStartsAt - Date.now()),
    );

    return () => {
      window.clearTimeout(countdownTimeout);
      if (countdownInterval) window.clearInterval(countdownInterval);
      finalChoiceTimerRef.current = null;
    };
  }, [finalChoiceLobby, finalChoiceStartsAt]);

  function leaveSession() {
    intentionalClose.current = true;
    liveRef.current?.disconnect();
    liveRef.current = null;
    peerRef.current?.connection.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    window.history.pushState(null, "", "/home");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  /** 마이크 권한을 받아 본다. 성공하면 true */
  async function checkMicrophone() {
    try {
      await requestMicrophoneAccess();
      setMicUnavailable(false);
      return true;
    } catch (cause) {
      setMicUnavailable(true);
      setError(microphoneErrorMessage(cause));
      return false;
    }
  }

  /** "권한 필요" 상태의 마이크 버튼. 권한을 다시 받으면 새 마이크로 연결을 다시 만든다 */
  async function retryMicrophone() {
    if (!(await checkMicrophone())) return;
    setError("");
    if (phase === "assigned" && peerRef.current) {
      // 기존 연결에 마이크를 끼워 넣지 않고 연결을 새로 만든다.
      // 상대는 새 offer를 재입장처럼 받아 연결을 다시 맺는다 (handleSignal의 재입장 처리)
      peerRef.current.connection.close();
      peerRef.current = null;
      candidateQueue.current = [];
      pendingSignals.current = [];
      awaitRemoteOfferRef.current = false;
      setPeerResetKey((key) => key + 1);
    }
  }

  function toggleMute() {
    if (micUnavailable) {
      void retryMicrophone();
      return;
    }
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
    if (!nextMuted) {
      window.alert(
        "마이크를 켰어요. 마이크가 작동하지 않으면 브라우저 설정에서 마이크 권한이 허용되어 있는지 확인해주세요.",
      );
    }
  }

  function toggleSpeaker() {
    if (audioPlaybackBlockedRef.current && audioRef.current) {
      speakerEnabledRef.current = true;
      audioRef.current.muted = false;
      void audioRef.current.play().then(
        () => {
          markPlaybackBlocked(false);
          setSpeakerEnabled(true);
          setError("");
        },
        () => setError("상대 음성을 재생할 수 없어요. 브라우저의 사이트 소리 설정을 확인해주세요."),
      );
      return;
    }
    const nextEnabled = !speakerEnabled;
    speakerEnabledRef.current = nextEnabled;
    if (audioRef.current) {
      audioRef.current.muted = !nextEnabled;
      if (nextEnabled) {
        void audioRef.current.play().then(
          () => setError(""),
          () => setError("상대 음성을 재생할 수 없어요. 브라우저의 사이트 소리 설정을 확인해주세요."),
        );
      }
    }
    setSpeakerEnabled(nextEnabled);
  }

  function endConversation() {
    peerRef.current?.connection.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.srcObject = null;
    markPlaybackBlocked(false);
    if (speechFrameRef.current !== null)
      window.cancelAnimationFrame(speechFrameRef.current);
    speechFrameRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsPartnerSpeaking(false);
    setProfileCardOpen(false);
    setAssignment(null);
    setConversationEndsAt(null);
    setCurrentRound((round) => round + 1);
    startRequested.current = false;
    setIsStarting(false);
    setCallStatus("");
    setConnectionStatus("다음 대화 준비 완료");
    setUnmatchedThisRound(false);
    setPhase("idle");
  }

  const conversationRemaining = conversationEndsAt
    ? Math.max(0, conversationEndsAt - now)
    : 10 * 60 * 1000;
  const conversationMinutes = Math.floor(conversationRemaining / 60000);
  const conversationSeconds = Math.floor(
    (conversationRemaining % 60000) / 1000,
  );

  useEffect(() => {
    if (phase !== "assigned" || !assignment) return;
    setRoundStartNotice(`${assignment.roundNumber}번째 대화가 시작되었습니다.`);
    if (!callPreviewMode) setCountdownNotice(null);
    previousConversationRemainingRef.current = null;
    shownConversationCountdownsRef.current = new Set();
    if (roundNoticeTimeoutRef.current !== null) {
      window.clearTimeout(roundNoticeTimeoutRef.current);
    }
    roundNoticeTimeoutRef.current = window.setTimeout(() => {
      setRoundStartNotice("");
      roundNoticeTimeoutRef.current = null;
    }, 3000);
    return () => {
      if (roundNoticeTimeoutRef.current !== null) {
        window.clearTimeout(roundNoticeTimeoutRef.current);
        roundNoticeTimeoutRef.current = null;
      }
    };
  }, [assignment?.roundId, assignment?.roundNumber, phase]);

  useEffect(() => {
    if (callPreviewMode) return;
    if (phase !== "assigned" || !assignment) {
      previousConversationRemainingRef.current = null;
      if (countdownNoticeTimeoutRef.current !== null) {
        window.clearTimeout(countdownNoticeTimeoutRef.current);
        countdownNoticeTimeoutRef.current = null;
      }
      setCountdownNotice(null);
      return;
    }
    const previousRemaining = previousConversationRemainingRef.current;
    previousConversationRemainingRef.current = conversationRemaining;
    if (previousRemaining === null) return;

    const crossedThreshold = [5, 1].find((minutes) => {
      const threshold = minutes * 60 * 1000;
      return (
        previousRemaining > threshold &&
        conversationRemaining <= threshold &&
        !shownConversationCountdownsRef.current.has(minutes)
      );
    });
    if (crossedThreshold === undefined) return;

    shownConversationCountdownsRef.current.add(crossedThreshold);
    setCountdownNotice(crossedThreshold as 5 | 1);
    if (countdownNoticeTimeoutRef.current !== null) {
      window.clearTimeout(countdownNoticeTimeoutRef.current);
    }
    countdownNoticeTimeoutRef.current = window.setTimeout(() => {
      setCountdownNotice(null);
      countdownNoticeTimeoutRef.current = null;
    }, 3000);
  }, [assignment, conversationRemaining, phase]);
  const finalChoiceRemaining = finalChoiceStartsAt
    ? Math.max(0, finalChoiceStartsAt - now)
    : 0;
  const finalChoiceMinutes = Math.floor(finalChoiceRemaining / 60000);
  const finalChoiceSeconds = Math.floor((finalChoiceRemaining % 60000) / 1000);
  const finalAnnouncementIndex = Math.min(
    finalChoiceGuideMessages.length - 1,
    Math.floor((3 * 60 * 1000 - finalChoiceRemaining) / 8000),
  );

  function enterFinalSelection() {
    if (finalChoiceTimerRef.current !== null) {
      window.clearInterval(finalChoiceTimerRef.current);
      finalChoiceTimerRef.current = null;
    }
    setFinalChoiceCountdown(null);
    setFinalChoiceLobby(false);
    setPhase("voting");
  }

  async function sendHeart(profile: {
    nickname: string;
    roundNumber: number;
    memberId: number;
  }) {
    if ((heartsSent[profile.memberId] ?? 0) > 0) return;
    if (isMockLiveEnabled) {
      if (heartsRemaining < 1 && gemsRemaining < 1) return;
      setHeartsRemaining((count) => Math.max(0, count - 1));
      if (heartsRemaining < 1)
        setGemsRemaining((count) => Math.max(0, count - 1));
      setHeartsSent((sent) => ({ ...sent, [profile.memberId]: 1 }));
      setSelectedProfile(null);
      return;
    }
    if (heartsRemaining < 1 && gemsRemaining < 1) return;
    try {
      const receipt = await sendHeartRequest(sessionId, profile.memberId);
      setHeartsRemaining(0);
      setGemsRemaining((count) => Math.max(0, count - receipt.chargedGem));
      setHeartsSent((sent) => ({ ...sent, [profile.memberId]: 1 }));
      setSelectedProfile(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "하트를 보내지 못했어요.",
      );
    }
  }

  useEffect(() => {
    if (
      phase === "assigned" &&
      assignment &&
      conversationEndsAt &&
      now >= conversationEndsAt
    ) {
      endConversation();
    }
  }, [assignment, conversationEndsAt, now, phase]);

  const miniGameVisible = phase === "idle" && unmatchedThisRound && !finalChoiceLobby;
  const lobbyVisible =
    (phase === "lobby" || phase === "idle") && !miniGameVisible;
  const miniGameRemaining = Math.max(0, (miniGameEndsAt ?? now) - now);
  const miniGameMinutes = Math.floor(miniGameRemaining / 60000);
  const miniGameSeconds = Math.floor((miniGameRemaining % 60000) / 1000);
  useEffect(() => {
    if (
      phase !== "lobby" ||
      !myRealName ||
      !session?.myAlias ||
      lobbyWelcomeStarted.current
    ) {
      return;
    }
    lobbyWelcomeStarted.current = true;
    setShowLobbyWelcome(true);
    lobbyWelcomeTimer.current = window.setTimeout(() => {
      setShowLobbyWelcome(false);
      lobbyWelcomeTimer.current = null;
    }, 5000);
  }, [myRealName, phase, session?.myAlias]);
  useEffect(
    () => () => {
      if (lobbyWelcomeTimer.current !== null)
        window.clearTimeout(lobbyWelcomeTimer.current);
    },
    [],
  );
  const inlineStoreVisible = phase === "ready" || phase === "connecting";
  const heartParticipants = useMemo(() => {
    const candidates = encounteredProfiles.filter(
      (profile) => profile.memberId !== myLiveMemberId,
    );
    if (myLiveMemberId != null) {
      candidates.push({
        memberId: myLiveMemberId,
        nickname: session?.myAlias || "나",
        roundNumber: 0,
      });
    }
    return createLobbyParticipants(candidates);
  }, [encounteredProfiles, myLiveMemberId, session?.myAlias]);

  return (
    <SessionPage
      className={
        phase === "voting"
          ? "vote-page"
          : lobbyVisible
            ? "lobby-page"
          : phase === "assigned" || miniGameVisible
              ? "conversation-page"
              : ""
      }
    >
      {lobbyVisible && <LobbyBackground />}
      <header
        className={`session-header ${lobbyVisible ? "lobby-header" : phase === "assigned" || miniGameVisible || phase === "voting" ? "conversation-header" : "entry-header"}`}
      >
        {lobbyVisible || phase === "assigned" || miniGameVisible || phase === "voting" ? (
          <>
            <SessionNoti
              className="lobby-bell"
              sessionId={sessionId}
              recipientId={myLiveMemberId ?? assignment?.memberId}
            />
            <h1>
              {miniGameVisible
                ? "미니게임"
                : lobbyVisible
                ? "로비"
                : phase === "voting"
                  ? "최종투표"
                  : assignment
                    ? `${assignment.roundNumber}번째 대화`
                    : "소개팅"}
            </h1>
            <div className="gem-balance" aria-label={`보석 ${gemsRemaining}개`}>
              <span className="gem" aria-hidden="true">
                ◆
              </span>
              <span>{gemsRemaining}개</span>
            </div>
          </>
        ) : (
          <>
            <a className="home-logo" href="/" aria-label="홈으로 이동">
              <img src="/logo.svg" width="90" height="40" alt="Kiiwee" />
            </a>
            <div className="gem-balance" aria-label={`보석 ${gemsRemaining}개`}>
              <span className="gem" aria-hidden="true">
                ◆
              </span>
              <span>{gemsRemaining}개</span>
            </div>
          </>
        )}
      </header>
      <main
        className={
          lobbyVisible
            ? "lobby-main"
            : phase === "voting"
              ? "vote-main"
              : phase === "assigned" || miniGameVisible
                ? "conversation-main"
                : ""
        }
      >
        {loading ? (
          <section className="state-card" role="status">
            세션 정보를 확인하고 있어요…
          </section>
        ) : loadError ? (
          <section className="state-card" role="alert">
            <h1>세션에 입장할 수 없어요</h1>
            <p>{loadError}</p>
            <div className="actions">
              <a className="primary" href="/login">
                로그인
              </a>
              <button type="button" onClick={leaveSession}>
                홈으로
              </button>
            </div>
          </section>
        ) : !session ? (
          <section className="state-card">세션 정보가 없어요.</section>
        ) : session.myStatus !== "APPLIED" &&
          session.myStatus !== "ATTENDED" ? (
          <section className="state-card">
            <h1>신청한 세션이 아니에요</h1>
            <p>신청을 완료한 계정으로 입장해주세요.</p>
            <button className="primary" type="button" onClick={leaveSession}>
              홈으로 돌아가기
            </button>
          </section>
        ) : phase === "voting" ? (
          <Vote
            candidates={encounteredProfiles}
            myAlias={session.myAlias}
            initialVote={ownVote}
            allowLocalSubmit={isMockLiveEnabled}
            onSubmit={(rankedMemberIds) =>
              submitSessionVotes(sessionId, rankedMemberIds)
            }
            votingEndsAt={votingEndsAt}
          />
        ) : (
          <>
            {lobbyVisible ? (
              <>
                {finalChoiceLobby ? (
                  <HeartLobby
                    participants={heartParticipants}
                    myMemberId={myLiveMemberId}
                    encounteredCount={encounteredProfiles.length}
                    mascotSrc={mascotSpeaking && mascotMouthOpen ? "/kw2.svg" : "/kw1.svg"}
                    announcementIndex={finalAnnouncementIndex}
                    startDisabled={finalChoiceRemaining > 0}
                    startLabel={
                      finalChoiceRemaining > 0
                        ? `최종 선택까지 ${pad(finalChoiceMinutes)}:${pad(finalChoiceSeconds)}`
                        : finalChoiceCountdown !== null
                          ? `${finalChoiceCountdown}초 후 자동 시작 · 최종 선택하기`
                          : "최종 선택하기"
                    }
                    selectedProfile={selectedProfile}
                    heartsRemaining={heartsRemaining}
                    gemsRemaining={gemsRemaining}
                    heartsSent={heartsSent}
                    heartRestrictionOpen={heartRestrictionOpen}
                    setSelectedProfile={setSelectedProfile}
                    onCloseHeartRestriction={() =>
                      setHeartRestrictionOpen(false)
                    }
                    onSendHeart={sendHeart}
                    onSelectProfile={setSelectedProfile}
                    onStart={enterFinalSelection}
                  />
                ) : (
                  <MainLobby
                    showWelcome={showLobbyWelcome}
                    micNotice={micUnavailable ? MIC_LOBBY_NOTICE : undefined}
                    participants={lobbyParticipants}
                    myMemberId={myLiveMemberId}
                    myRealName={myRealName}
                    myNickname={session.myAlias ?? ""}
                    announcementIndex={announcementIndex}
                    roundDurationSeconds={session?.roundDurationSeconds}
                    mascotSrc={mascotSpeaking && mascotMouthOpen ? "/kw2.svg" : "/kw1.svg"}
                    startDisabled={
                      phase === "idle" ||
                      timeUntilConversationStart > 0 ||
                      isStarting
                    }
                    startLabel={
                      phase === "idle"
                        ? "다음 대화를 기다리고 있어요"
                        : isStarting && !assignment
                          ? "참가자를 확인하고 있어요…"
                          : timeUntilConversationStart > 0
                            ? `대화 시작까지 ${conversationStartCountdown}`
                            : autoStartCountdown !== null
                              ? `${autoStartCountdown}초 후 자동 입장 · 지금 시작`
                              : currentRound === 1
                                ? "첫 번째 대화 시작하기"
                                : currentRound === 2
                                  ? "두 번째 대화 시작하기"
                                  : `${currentRound}번째 대화 시작하기`
                    }
                    showParticipantNotice={isStarting && !assignment}
                    showIdleNotice={phase === "idle" && unmatchedThisRound}
                    onStart={startConversation}
                  />
                )}
                
              </>
            ) : (
              <>
                {miniGameVisible && (
                  <MiniGame
                    minutes={miniGameMinutes}
                    seconds={miniGameSeconds}
                    isUrgent={miniGameRemaining <= 10_000}
                  />
                )}
                {phase === "ready" || phase === "connecting" ? (
                  <Waiting
                    startTime={session.startTime}
                    phase={phase}
                    connectionStatus={connectionStatus}
                    joinWindowOpen={canEnterLobby}
                    now={now}
                    opensAt={opensAt}
                    days={days}
                    hours={hours}
                    minutes={minutes}
                    seconds={seconds}
                    onEnter={enterLobby}
                  />
                ) : null}

                {phase === "assigned" && assignment && (
                  <Call
                    assignment={assignment}
                    conversationMinutes={conversationMinutes}
                    conversationSeconds={conversationSeconds}
                    isUrgent={conversationRemaining <= 10_000}
                    roundStartNotice={roundStartNotice}
                    countdownNotice={countdownNotice}
                    isPartnerSpeaking={isPartnerSpeaking}
                    muted={muted}
                    speakerEnabled={speakerEnabled}
                    speakerBlocked={playbackBlocked}
                    micUnavailable={micUnavailable}
                    reportPopupOpen={reportPopupOpen}
                    profileCardOpen={profileCardOpen}
                    audioRef={audioRef}
                    onToggleMute={toggleMute}
                    onToggleSpeaker={toggleSpeaker}
                    onOpenProfile={() => setProfileCardOpen(true)}
                    onOpenReport={() => {
                      setError("");
                      setReportPopupOpen(true);
                    }}
                    onCloseReport={() => setReportPopupOpen(false)}
                    onSubmitReport={() => {
                      setReportPopupOpen(false);
                      setError("신고 제출은 백엔드 연동 후 사용할 수 있어요.");
                    }}
                    onCloseProfile={() => setProfileCardOpen(false)}
                  />
                )}</>
            )}
          </>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
      </main>
      <Store
        embedded
        inline={inlineStoreVisible}
        purchasesDisabled={phase !== "ready"}
        open={inlineStoreVisible || shopOpen}
        initialGems={gemsRemaining}
        onGemsChange={setGemsRemaining}
        onClose={() => setShopOpen(false)}
      />
    </SessionPage>
  );
}

