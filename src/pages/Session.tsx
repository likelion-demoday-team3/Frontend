import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import Report from "../components/Session/Report";
import ProfileCard from "../components/Session/ProfileCard";
import GuideBubble, {
  finalChoiceGuideMessages,
  lobbyGuideMessages,
} from "../components/Session/GuideBubble";
import NotificationButton from "../components/common/NotificationButton";
import Store from "./Store/Store";
import Vote from "./Vote/Vote";
import { getAccessToken } from "../features/auth/session";
import { getSession, submitSessionVotes } from "../features/sessions/api";
import type { SessionDetail } from "../features/sessions/types";
import { connectLiveSession } from "../features/live/stomp";
import type {
  LiveAssignment,
  LiveConnection,
  LiveMessage,
} from "../features/live/stomp";
import { getMyWallet } from "../features/wallet/api";
import { getHeartStatus, sendHeart as sendHeartRequest } from "../features/sessions/interactionApi";
import { getOwnVote, type OwnVote } from "../features/sessions/resultsApi";
import { getIceServers } from "../features/live/api";

type SessionProps = { sessionId: number };
type Phase = "ready" | "connecting" | "lobby" | "assigned" | "idle" | "voting";
type PeerState = { connection: RTCPeerConnection; assignment: LiveAssignment };

type LobbyParticipant = {
  nickname: string;
  x: string;
  y: string;
  delay: string;
};

const lobbyNicknamePool = [
  "구름산책",
  "느린토끼",
  "초록새벽",
  "말랑복숭아",
  "고요한파도",
  "달빛수집가",
  "잠꾸러기곰",
  "햇살한스푼",
  "바닐라라떼",
  "작은행성",
  "포근한오후",
  "반짝이는별",
  "산책하는고양이",
  "기분좋은바람",
  "졸린수달",
];

const createLobbyParticipants = (
  row: "opposite" | "same",
  nicknames: string[],
): LobbyParticipant[] => {
  // Keep profiles in the upper/lower bands, with enough space around the mascot and speech bubble.
  const anchors: [number, number][] =
    row === "opposite"
      ? [
          [14, 16],
          [50, 14],
          [86, 17],
          [29, 23],
          [72, 22],
        ]
      : [
          [16, 72],
          [50, 76],
          [84, 73],
          [29, 64],
          [72, 65],
        ];
  const shuffled = [...anchors]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(nicknames.length, anchors.length));

  return shuffled.map(([x, y], index) => ({
    nickname: nicknames[index],
    x: `${x + (Math.random() * 4 - 2)}%`,
    y: `${y + (Math.random() * 4 - 2)}%`,
    delay: `${-Math.random() * 4.8}s`,
  }));
};

function LobbyBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video?.pause();
      return;
    }

    let frame = 0;
    const softenLoop = () => {
      if (video && Number.isFinite(video.duration) && video.duration > 0) {
        const fade = 0.35;
        const opacity = Math.min(
          1,
          video.currentTime / fade,
          (video.duration - video.currentTime) / fade,
        );
        video.style.opacity = String(Math.max(0, opacity));
      }
      frame = window.requestAnimationFrame(softenLoop);
    };
    frame = window.requestAnimationFrame(softenLoop);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <video
      ref={videoRef}
      className="wait-background"
      src="/session-waiting.webm"
      autoPlay
      muted
      loop
      playsInline
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}

const formatDate = (value: string) =>
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
const pad = (value: number) => String(value).padStart(2, "0");
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

function createMockAssignment(
  sessionId: number,
  roundNumber: number,
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
      university: "연세대학교",
      nickname: alias,
      idealType: "대화가 잘 통하는 사람",
      datingStyle: "전시회나 맛집 탐방",
      contactStyle: "하루에 몇 번 연락하는 편",
      loveStyle: "천천히 알아가는 편",
      interests: ["전시", "러닝", "보드게임"],
    },
    compatibility: { score: 82, reason: "관심사가 비슷해요." },
  };
}

function createVotePreviewSession(sessionId: number): SessionDetail {
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

export default function Session({ sessionId }: SessionProps) {
  const previewParams = new URLSearchParams(window.location.search);
  const isMockLiveEnabled = previewParams.has("preview") && (import.meta.env.DEV || previewParams.has("showTest"));
  const heartPreviewMode =
    isMockLiveEnabled &&
    new URLSearchParams(window.location.search).get("preview") === "hearts";
  const lobbyPreviewMode =
    isMockLiveEnabled &&
    new URLSearchParams(window.location.search).get("preview") === "lobby";
  const oneToOnePreviewMode =
    isMockLiveEnabled &&
    new URLSearchParams(window.location.search).get("preview") === "one-to-one";
  const votePreviewMode =
    isMockLiveEnabled &&
    new URLSearchParams(window.location.search).get("preview") === "vote";
  const sessionPreviewMode =
    lobbyPreviewMode ||
    heartPreviewMode ||
    oneToOnePreviewMode ||
    votePreviewMode;
  const [session, setSession] = useState<SessionDetail | null>(() =>
    sessionPreviewMode ? createVotePreviewSession(sessionId) : null,
  );
  const [loading, setLoading] = useState(!sessionPreviewMode);
  const [loadError, setLoadError] = useState("");
  const [phase, setPhase] = useState<Phase>(
    votePreviewMode
      ? "voting"
      : heartPreviewMode
        ? "idle"
        : oneToOnePreviewMode
          ? "assigned"
          : lobbyPreviewMode
            ? "lobby"
            : "ready",
  );
  const [assignment, setAssignment] = useState<LiveAssignment | null>(
    oneToOnePreviewMode ? createMockAssignment(sessionId, 1) : null,
  );
  const [myLiveMemberId, setMyLiveMemberId] = useState<number | null>(
    oneToOnePreviewMode || votePreviewMode || heartPreviewMode ? 1 : null,
  );
  const [currentRound, setCurrentRound] = useState(1);
  const [conversationEndsAt, setConversationEndsAt] = useState<number | null>(
    null,
  );
  const [finalChoiceLobby, setFinalChoiceLobby] = useState(heartPreviewMode);
  const [finalChoiceStartsAt, setFinalChoiceStartsAt] = useState<number | null>(
    heartPreviewMode ? Date.now() + 3 * 60 * 1000 : null,
  );
  const [finalChoiceCountdown, setFinalChoiceCountdown] = useState<
    number | null
  >(null);
  const [votingEndsAt, setVotingEndsAt] = useState<string | null>(null);
  const [ownVote, setOwnVote] = useState<OwnVote | null>(null);
  const [encounteredProfiles, setEncounteredProfiles] = useState<
    Array<{ nickname: string; roundNumber: number; memberId: number }>
  >(() => {
    if (votePreviewMode) {
      return [
        { nickname: "구름산책", roundNumber: 1, memberId: 2 },
        { nickname: "달빛수집가", roundNumber: 2, memberId: 3 },
        { nickname: "포근한오후", roundNumber: 3, memberId: 4 },
        { nickname: "초록새벽", roundNumber: 4, memberId: 5 },
        { nickname: "느린토끼", roundNumber: 5, memberId: 6 },
        { nickname: "햇살한스푼", roundNumber: 6, memberId: 7 },
      ];
    }
    return heartPreviewMode
      ? [
          { nickname: "구름산책", roundNumber: 1, memberId: 2 },
          { nickname: "달빛수집가", roundNumber: 2, memberId: 3 },
          { nickname: "포근한오후", roundNumber: 3, memberId: 4 },
          { nickname: "초록새벽", roundNumber: 4, memberId: 5 },
          { nickname: "느린토끼", roundNumber: 5, memberId: 6 },
        ]
      : [];
  });
  useEffect(() => {
    sessionStorage.setItem(`kiiwee.session-context:${sessionId}`, JSON.stringify({
      partners: encounteredProfiles,
      myMemberId: myLiveMemberId ?? assignment?.memberId ?? null,
    }));
  }, [sessionId, encounteredProfiles, myLiveMemberId, assignment?.memberId]);
  const [selectedProfile, setSelectedProfile] = useState<{
    nickname: string;
    roundNumber: number;
    memberId: number;
  } | null>(null);
  const [heartsRemaining, setHeartsRemaining] = useState(1);
  const [gemsRemaining, setGemsRemaining] = useState(isMockLiveEnabled ? 5 : 0);
  const [shopOpen, setShopOpen] = useState(
    () => new URLSearchParams(window.location.search).get("paymentReturn") === "embedded",
  );
  const [heartPurchaseQuantity, setHeartPurchaseQuantity] = useState(1);
  const [heartsSent, setHeartsSent] = useState<Record<number, number>>({});
  const [heartChargeOpen, setHeartChargeOpen] = useState(false);
  const [heartRestrictionOpen, setHeartRestrictionOpen] = useState(false);
  const [isPartnerSpeaking, setIsPartnerSpeaking] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [profileCardOpen, setProfileCardOpen] = useState(false);
  const [reportPopupOpen, setReportPopupOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [connectionStatus, setConnectionStatus] = useState("입장 전");
  const [, setCallStatus] = useState("상대 배정을 기다리는 중");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [lobbyParticipants] = useState(() => {
    const nicknames = [...lobbyNicknamePool].sort(() => Math.random() - 0.5);
    return {
      opposite: createLobbyParticipants("opposite", nicknames.slice(0, 4)),
      same: createLobbyParticipants("same", nicknames.slice(4, 8)),
    };
  });
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [mascotSpeaking, setMascotSpeaking] = useState(false);
  const [mascotMouthOpen, setMascotMouthOpen] = useState(false);
  const [autoStartCountdown, setAutoStartCountdown] = useState<number | null>(
    null,
  );
  const liveRef = useRef<LiveConnection | null>(null);
  const iceServersRef = useRef<RTCIceServer[] | null>(null);
  const peerRef = useRef<PeerState | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
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
  const startConversationRef = useRef<() => void>(() => undefined);

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
    if (isMockLiveEnabled || !getAccessToken()) return;
    let active = true;
    getHeartStatus(sessionId).then((status) => {
      if (!active) return;
      setHeartsRemaining(status.freeHeartRemaining ? 1 : 0);
      setHeartsSent(Object.fromEntries(status.sentTo.map((memberId) => [memberId, 1])));
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "하트 상태를 불러오지 못했어요.");
    });
    return () => { active = false };
  }, [sessionId]);

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
    }, 5000);

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
      setLoadError("로그인 후 신청한 스터디 세션에 입장할 수 있어요.");
      return () => {
        active = false;
      };
    }
    getSession(sessionId)
      .then((result) => {
        if (active) {
          setSession(result);
          if (result.liveStatus === "VOTING" && result.phaseEndsAt) {
            setVotingEndsAt(result.phaseEndsAt);
            setPhase("voting");
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
    if (phase !== "voting" || isMockLiveEnabled || !getAccessToken()) return;
    let active = true;
    getOwnVote(sessionId).then((vote) => { if (active) setOwnVote(vote) })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "제출한 투표를 불러오지 못했어요."); });
    return () => { active = false };
  }, [phase, sessionId]);

  useEffect(() => {
    if (isMockLiveEnabled || !getAccessToken()) return;
    let active = true;
    getIceServers(sessionId).then((config) => {
      if (active) iceServersRef.current = config.iceServers.map(server => ({
        urls: server.urls,
        ...(server.username ? { username: server.username } : {}),
        ...(server.credential ? { credential: server.credential } : {}),
      }));
    }).catch(() => {
      // API 일시 장애 시 기존 공개 STUN 서버로 WebRTC를 유지합니다.
    });
    return () => { active = false };
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
      if (!peer || signal.roomId !== peer.assignment.roomId) return;
      const connection = peer.connection;
      try {
        if (signal.type === "ICE_CANDIDATE") {
          const candidate = JSON.parse(signal.payload) as RTCIceCandidateInit;
          if (connection.remoteDescription)
            await connection.addIceCandidate(candidate);
          else candidateQueue.current.push(candidate);
          return;
        }

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
        if (ignoreOffer.current) return;
        if (collision && polite)
          await connection.setLocalDescription({ type: "rollback" });
        await connection.setRemoteDescription(description);
        for (const candidate of candidateQueue.current.splice(0))
          await connection.addIceCandidate(candidate);

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
      if (message.kind === "joined") {
        setMyLiveMemberId(message.memberId);
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
          });
          setCurrentRound(message.roundNumber);
          startRequested.current = true;
          setPhase("assigned");
        } else {
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
        setCurrentRound((round) =>
          Math.max(round, message.assignment.roundNumber),
        );
        setIsStarting(false);
        startRequested.current = true;
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
        setIsPartnerSpeaking(false);
        setCurrentRound((round) => Math.max(round, message.roundNumber));
        setAssignment(null);
        startRequested.current = false;
        setIsStarting(false);
        setPhase("idle");
        setCallStatus("");
        setConnectionStatus("이번 라운드 대기");
      } else if (message.kind === "signal") {
        void handleSignal(message);
      } else if (message.kind === "voting-started") {
        peerRef.current?.connection.close();
        peerRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setConversationEndsAt(null);
        setIsPartnerSpeaking(false);
        setVotingEndsAt(message.votingEndsAt);
        setFinalChoiceLobby(false);
        setFinalChoiceStartsAt(null);
        setFinalChoiceCountdown(null);
        setPhase("voting");
        setConnectionStatus("최종 투표 진행 중");
      } else if (message.kind === "results-ready") {
        liveRef.current?.disconnect();
        window.history.pushState(null, "", `/result?sessionId=${message.sessionId}`);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    },
    [handleSignal],
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
    async function startPeer() {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error("이 브라우저에서는 마이크를 사용할 수 없어요.");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const connection = new RTCPeerConnection({
          iceServers: iceServersRef.current ?? [{ urls: "stun:stun.l.google.com:19302" }],
        });
        peerRef.current = { connection, assignment: currentAssignment };
        stream
          .getTracks()
          .forEach((track) => connection.addTrack(track, stream));
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
              .catch(() =>
                setCallStatus("화면을 한 번 눌러 상대 음성을 재생해주세요."),
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
        setCallStatus("상대와 음성을 연결하고 있어요.");
      } catch (cause) {
        setCallStatus(
          cause instanceof Error ? cause.message : "마이크를 사용할 수 없어요.",
        );
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
      peerRef.current?.connection.close();
      peerRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [assignment, phase, sendSignal, sessionId]);

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
  const opensAt = startTime - 5 * 60 * 1000;
  const closesAt = startTime + 60 * 1000;
  const joinWindowOpen = now >= opensAt && now <= closesAt;
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
      session.myStatus !== "APPLIED" ||
      !joinWindowOpen ||
      liveRef.current
    )
      return;
    setError("");
    setPhase("connecting");
    intentionalClose.current = false;

    if (isMockLiveEnabled) {
      startRequested.current = false;
      setIsStarting(false);
      setConnectionStatus("목업 로비 입장 완료");
      setCallStatus("목업 상대 연결됨");
      setAssignment(createMockAssignment(sessionId, 1));
      setPhase("lobby");
      return;
    }

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
        setPhase("ready");
        liveRef.current?.disconnect();
        liveRef.current = null;
      },
    );
    liveRef.current = live;
  }

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

  function toggleMute() {
    const nextMuted = !muted;
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
  }

  function toggleSpeaker() {
    const nextEnabled = !speakerEnabled;
    if (audioRef.current) audioRef.current.volume = nextEnabled ? 1 : 0;
    setSpeakerEnabled(nextEnabled);
  }

  function endConversation() {
    peerRef.current?.connection.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.srcObject = null;
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
    setPhase("idle");
  }

  const conversationRemaining = conversationEndsAt
    ? Math.max(0, conversationEndsAt - now)
    : 10 * 60 * 1000;
  const conversationMinutes = Math.floor(conversationRemaining / 60000);
  const conversationSeconds = Math.floor(
    (conversationRemaining % 60000) / 1000,
  );
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
      setHeartsRemaining((count) => Math.max(0, count - 1));
      setHeartsSent((sent) => ({ ...sent, [profile.memberId]: 1 }));
      setSelectedProfile(null);
      return;
    }
    if (heartsRemaining < 1) {
      setHeartPurchaseQuantity(1);
      setSelectedProfile(profile);
      setHeartChargeOpen(true);
      return;
    }
    try {
      await sendHeartRequest(sessionId, profile.memberId);
      setHeartsRemaining(0);
      setHeartsSent((sent) => ({ ...sent, [profile.memberId]: 1 }));
      setSelectedProfile(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "하트를 보내지 못했어요.");
    }
  }

  async function buyHeart() {
    const quantity = Math.max(
      1,
      Math.min(heartPurchaseQuantity, gemsRemaining),
    );
    if (gemsRemaining < quantity) return;
    if (!isMockLiveEnabled && selectedProfile) {
      try {
        await sendHeartRequest(sessionId, selectedProfile.memberId);
        const wallet = await getMyWallet();
        setGemsRemaining(wallet.gemBalance);
        setHeartsSent((sent) => ({ ...sent, [selectedProfile.memberId]: 1 }));
        setHeartChargeOpen(false);
        setSelectedProfile(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "하트를 보내지 못했어요.");
      }
      return;
    }
    setGemsRemaining((count) => count - quantity);
    setHeartsRemaining((count) => count + quantity);
    setHeartChargeOpen(false);
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

  const lobbyVisible = phase === "lobby" || phase === "idle";

  function selectHeartParticipant(nickname: string) {
    const encounteredProfile = encounteredProfiles.find(
      (profile) => profile.nickname === nickname,
    );
    if (encounteredProfile) setSelectedProfile(encounteredProfile);
    else setHeartRestrictionOpen(true);
  }

  return (
    <SessionPage
      className={
        phase === "voting"
          ? "vote-page"
          : lobbyVisible
            ? "lobby-page"
            : phase === "assigned"
              ? "conversation-page"
              : ""
      }
    >
      {lobbyVisible && <LobbyBackground />}
      <header
        className={`session-header ${lobbyVisible ? "lobby-header" : phase === "assigned" || phase === "voting" ? "conversation-header" : ""}`}
      >
        {lobbyVisible || phase === "assigned" || phase === "voting" ? (
          <>
            <NotificationButton className="lobby-bell" />
            <h1>
              {lobbyVisible
                ? "로비"
                : phase === "voting"
                  ? "최종투표"
                  : assignment
                    ? `${assignment.roundNumber}번째 대화`
                    : "스터디"}
            </h1>
            <div className="gem-balance" aria-label={`보석 ${gemsRemaining}개`}>
              <span className="gem" aria-hidden="true">
                ◆
              </span>
              <span>{gemsRemaining}개</span>
              <button
                className="store-link"
                type="button"
                onClick={() => setShopOpen(true)}
                aria-label="보석 상점 열기"
              >
                +
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              className="back-button"
              type="button"
              onClick={leaveSession}
              aria-label="홈으로 나가기"
            >
              ‹
            </button>
            <img src="/logo.svg" alt="Kiiwee" />
            <span className="connection-indicator">
              <i />
              {connectionStatus}
            </span>
          </>
        )}
      </header>
      <main
        className={
          lobbyVisible
            ? "lobby-main"
            : phase === "voting"
              ? "vote-main"
              : phase === "assigned"
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
            <p>스터디 신청을 완료한 계정으로 입장해주세요.</p>
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
              <section className="lobby-screen" aria-label="스터디 로비">
                {finalChoiceLobby ? (
                  <>
                    <div
                      className="profile-group opposite-profiles"
                      role="group"
                      aria-label="이성 참가자 프로필"
                    >
                      {lobbyParticipants.opposite.map((participant, index) => (
                        <button
                          className="profile-avatar choice-profile"
                          type="button"
                          key={`opposite-${participant.nickname}-${index}`}
                          style={{
                            left: participant.x,
                            top: participant.y,
                            animationDelay: participant.delay,
                          }}
                          aria-label={`이성 참가자 ${participant.nickname}`}
                          onClick={() => selectHeartParticipant(participant.nickname)}
                        >
                          <span aria-hidden="true">
                            {Array.from(participant.nickname)[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div
                      className="profile-group same-profiles"
                      role="group"
                      aria-label="동성 참가자 프로필"
                    >
                      {lobbyParticipants.same.map((participant, index) => (
                        <button
                          className="profile-avatar choice-profile"
                          type="button"
                          key={`same-${participant.nickname}-${index}`}
                          style={{
                            left: participant.x,
                            top: participant.y,
                            animationDelay: participant.delay,
                          }}
                          aria-label={`동성 참가자 ${participant.nickname}`}
                          onClick={() => selectHeartParticipant(participant.nickname)}
                        >
                          <span aria-hidden="true">
                            {Array.from(participant.nickname)[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div
                    className="profile-group opposite-profiles"
                    role="group"
                    aria-label="이성 참가자 프로필"
                  >
                    {lobbyParticipants.opposite.map((participant, index) => (
                      <div
                        className="profile-avatar"
                        role="img"
                        key={`opposite-${participant.nickname}-${index}`}
                        style={{
                          left: participant.x,
                          top: participant.y,
                          animationDelay: participant.delay,
                        }}
                        aria-label={`이성 참가자 ${participant.nickname}`}
                      >
                        <span aria-hidden="true">
                          {Array.from(participant.nickname)[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <GuideBubble
                  mode={finalChoiceLobby ? "final-choice" : "lobby"}
                  index={
                    finalChoiceLobby
                      ? finalAnnouncementIndex
                      : announcementIndex
                  }
                />
                <img
                  className="lobby-mascot"
                  src={
                    mascotSpeaking && mascotMouthOpen ? "/kw2.svg" : "/kw1.svg"
                  }
                  alt="키위 캐릭터"
                />
                {!finalChoiceLobby && (
                  <div
                    className="profile-group same-profiles"
                    role="group"
                    aria-label="동성 참가자 프로필"
                  >
                    {lobbyParticipants.same.map((participant, index) => (
                      <div
                        className="profile-avatar"
                        role="img"
                        key={`same-${participant.nickname}-${index}`}
                        style={{
                          left: participant.x,
                          top: participant.y,
                          animationDelay: participant.delay,
                        }}
                        aria-label={`동성 참가자 ${participant.nickname}`}
                      >
                        <span aria-hidden="true">
                          {Array.from(participant.nickname)[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className="start-conversation"
                  type="button"
                  onClick={
                    finalChoiceLobby ? enterFinalSelection : startConversation
                  }
                  disabled={
                    finalChoiceLobby
                      ? finalChoiceRemaining > 0
                      : phase === "idle" ||
                        timeUntilConversationStart > 0 ||
                        isStarting
                  }
                >
                  {finalChoiceLobby
                    ? finalChoiceRemaining > 0
                      ? `최종 선택까지 ${pad(finalChoiceMinutes)}:${pad(finalChoiceSeconds)}`
                      : finalChoiceCountdown !== null
                        ? `${finalChoiceCountdown}초 후 자동 시작 · 최종 선택하기`
                        : "최종 선택하기"
                    : phase === "idle"
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
                                : `${currentRound}번째 대화 시작하기`}
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
                        onClick={() => sendHeart(selectedProfile)}
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
                        disabled={false}
                        onClick={() => {
                          setHeartPurchaseQuantity(1);
                          setHeartChargeOpen(true);
                        }}
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
                    onClick={() => setHeartChargeOpen(false)}
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
                        onClick={() => setHeartChargeOpen(false)}
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
                        {!isMockLiveEnabled ? <div className="heart-charge-summary-row"><span>하트 전송 비용</span><strong><i className="gem-mark" aria-hidden="true">◆</i>1개</strong></div> : <>
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
                                disabled={
                                  heartPurchaseQuantity >= gemsRemaining
                                }
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
                        </>}
                      </div>
                      <p className="heart-gem-balance">
                        보유 보석 <strong>{gemsRemaining}개</strong>
                      </p>
                      <button
                        className="heart-send-button"
                        type="button"
                        disabled={!isMockLiveEnabled && gemsRemaining < 1}
                        onClick={buyHeart}
                      >
                        {gemsRemaining > 0
                          ? isMockLiveEnabled ? `하트 ${heartPurchaseQuantity}개 충전하기` : "보석 1개 사용하고 보내기"
                          : "보석이 부족해요"}
                      </button>
                    </section>
                  </div>
                )}
                {heartRestrictionOpen && (
                  <div
                    className="heart-modal-backdrop"
                    role="presentation"
                    onClick={() => setHeartRestrictionOpen(false)}
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
                        onClick={() => setHeartRestrictionOpen(false)}
                      >
                        ×
                      </button>
                      <h2 id="heart-restriction-title">대화해본 사람만 선택할 수 있어요</h2>
                      <button
                        className="heart-send-button"
                        type="button"
                        onClick={() => setHeartRestrictionOpen(false)}
                      >
                        확인
                      </button>
                    </section>
                  </div>
                )}
              </section>
            ) : (
              <>
                {phase !== "assigned" && (
                  <section className="session-intro">
                    <span className="eyebrow">KIIWEE LIVE SESSION</span>
                    <h1>스터디 세션</h1>
                    <p>{formatDate(session.startTime)}</p>
                  </section>
                )}

                {phase === "ready" || phase === "connecting" ? (
                  <section className="lobby-card">
                    <img src="/kw1.svg" alt="" aria-hidden="true" />
                    <h2>
                      {phase === "connecting"
                        ? "로비에 입장하고 있어요"
                        : joinWindowOpen
                          ? "스터디에 입장할 수 있어요"
                          : now < opensAt
                            ? "입장 시간을 기다리고 있어요"
                            : "입장 시간이 지났어요"}
                    </h2>
                    <p>
                      {phase === "connecting"
                        ? connectionStatus
                        : joinWindowOpen
                          ? "입장하면 상대 배정과 실시간 안내를 받을 수 있어요."
                          : now < opensAt
                            ? "세션 시작 5분 전부터 입장할 수 있어요."
                            : "세션 시작 후 1분까지 입장할 수 있어요."}
                    </p>
                    {now < opensAt && (
                      <strong className="entry-countdown">
                        {days > 0 ? `${pad(days)}일 ` : ""}
                        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
                      </strong>
                    )}
                    <button
                      className="primary"
                      type="button"
                      disabled={!joinWindowOpen || phase === "connecting"}
                      onClick={enterLobby}
                    >
                      {phase === "connecting" ? "연결 중…" : "입장하기"}
                    </button>
                  </section>
                ) : null}

                {phase === "assigned" && assignment && (
                  <section
                    className="conversation-screen"
                    aria-label="스터디 대화"
                  >
                    <div
                      className="conversation-timer"
                      role="timer"
                      aria-live="off"
                    >
                      <strong>
                        {pad(conversationMinutes)}:{pad(conversationSeconds)}
                      </strong>
                      <p>
                        {assignment.partnerProfileCard.nickname || "상대방"}
                      </p>
                    </div>
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
                          onClick={() => setProfileCardOpen(true)}
                        >
                          <img src="/kw1.svg" alt="키위 캐릭터" />
                        </button>
                      </div>
                    </div>
                    <div className="conversation-controls">
                      <button
                        type="button"
                        className="conversation-control"
                        onClick={toggleMute}
                        aria-pressed={muted}
                      >
                        <span
                          className="control-icon mute-icon"
                          aria-hidden="true"
                        >
                          <img src="/muteIcon.svg" alt="" />
                        </span>
                        <span>{muted ? "음소거 해제" : "음소거"}</span>
                      </button>
                      <button
                        type="button"
                        className="conversation-control"
                        onClick={toggleSpeaker}
                        aria-pressed={speakerEnabled}
                      >
                        <span className="control-icon" aria-hidden="true">
                          <img src="/speakerphoneIcon.svg" alt="" />
                        </span>
                        <span>스피커폰</span>
                      </button>
                      <button
                        type="button"
                        className="conversation-control report-control"
                        onClick={() => {
                          setError("");
                          setReportPopupOpen(true);
                        }}
                      >
                        <span className="control-icon" aria-hidden="true">
                          <img src="/reportIcon.svg" alt="" />
                        </span>
                        <span>신고하기</span>
                      </button>
                    </div>
                    {reportPopupOpen && (
                      <Report
                        onClose={() => setReportPopupOpen(false)}
                        onSubmit={() => {
                          setReportPopupOpen(false);
                          setError(
                            "신고 제출은 백엔드 연동 후 사용할 수 있어요.",
                          );
                        }}
                      />
                    )}
                    {profileCardOpen && (
                      <ProfileCard
                        profile={assignment.partnerProfileCard}
                        compatibility={assignment.compatibility}
                        onClose={() => setProfileCardOpen(false)}
                      />
                    )}
                    <audio ref={audioRef} autoPlay />
                  </section>
                )}
              </>
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
        open={shopOpen}
        initialGems={gemsRemaining}
        onGemsChange={setGemsRemaining}
        onClose={() => setShopOpen(false)}
      />
    </SessionPage>
  );
}

const SessionPage = styled.div`
  width: 100%;
  max-width: 43rem;
  min-height: 100dvh;
  margin: 0 auto;
  padding: calc(2.4rem + env(safe-area-inset-top)) 3rem
    calc(3rem + env(safe-area-inset-bottom));
  background: var(--background);
  box-shadow: 0 0 6rem #26372508;

  &.lobby-page {
    position: relative;
    isolation: isolate;
    height: 100dvh;
    min-height: 100dvh;
    overflow: hidden;
    display: block;
    padding: 0;
    background: #f0ffd1;
    box-shadow: none;
  }
  &.lobby-page::before {
    position: absolute;
    z-index: 1;
    inset: 0;
    background: linear-gradient(
      180deg,
      #f2ffda58 0%,
      #dfff7552 54%,
      #edffc370 100%
    );
    content: "";
    pointer-events: none;
  }
  &.lobby-page > .wait-background {
    position: absolute;
    z-index: 0;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
  &.conversation-page {
    display: flex;
    height: 100dvh;
    overflow: hidden;
    flex-direction: column;
  }
  &.vote-page {
    display: flex;
    height: 100dvh;
    min-height: 100dvh;
    overflow: hidden;
    flex-direction: column;
    padding: calc(2.4rem + env(safe-area-inset-top)) 3rem
      calc(1.2rem + env(safe-area-inset-bottom));
  }

  .session-header {
    display: grid;
    grid-template-columns: 4rem 1fr auto;
    align-items: center;
    gap: 1rem;
  }
  &.lobby-page .session-header {
    position: absolute;
    z-index: 3;
    top: calc(2.4rem + env(safe-area-inset-top));
    right: 3rem;
    left: 3rem;
    grid-template-columns: 1fr auto 1fr;
    min-height: 4.4rem;
    gap: 0.8rem;
  }
  .lobby-header h1 {
    margin: 0;
    color: #00111f;
    font: 700 2.2rem/1 var(--display-font);
    text-align: center;
  }
  .conversation-header {
    grid-template-columns: 1fr auto 1fr;
    min-height: 4.4rem;
    gap: 0.8rem;
  }
  .conversation-header h1 {
    margin: 0;
    color: #00111f;
    font: 400 2.2rem/1 var(--display-font);
    text-align: center;
  }
  .lobby-bell {
    display: grid;
    width: 4.4rem;
    height: 4.4rem;
    place-items: center;
    justify-self: start;
    color: #00111f;
  }
  .lobby-bell svg {
    width: 2.8rem;
    height: 2.8rem;
  }
  .gem-balance {
    display: flex;
    align-items: center;
    justify-self: end;
    gap: 0.5rem;
    padding: 0.55rem 0.8rem;
    border: 0.1rem solid #00111f;
    border-radius: 0.7rem;
    background: #ffffffbb;
    color: #00111f;
    font-size: 1.4rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .gem-balance svg {
    width: 1.8rem;
    height: 1.8rem;
    fill: #5bcaff;
    stroke: #138fca;
    stroke-width: 1.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .gem-balance .store-link {
    position: relative;
    display: grid;
    width: 1.8rem;
    height: 1.8rem;
    place-items: center;
    border-radius: 50%;
    background: #ffc93d;
    color: #332400;
    font-size: 0;
    border: 0;
    cursor: pointer;
  }
  .gem-balance .store-link::before,
  .gem-balance .store-link::after {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0.9rem;
    height: 0.2rem;
    border-radius: 999px;
    background: #332400;
    content: "";
    transform: translate(-50%, -50%);
  }
  .gem-balance .store-link::after {
    transform: translate(-50%, -50%) rotate(90deg);
  }
  .back-button {
    width: 4rem;
    height: 4rem;
    border: 0;
    border-radius: 50%;
    background: transparent;
    font-size: 3.2rem;
    line-height: 1;
  }
  .session-header img {
    width: 8rem;
    height: 3.6rem;
    object-fit: contain;
  }
  .connection-indicator {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: var(--text-secondary);
    font-size: 1.1rem;
    white-space: nowrap;
  }
  .connection-indicator i,
  .call-status span {
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 50%;
    background: #aeb5ae;
  }
  .connection-indicator i.online,
  .call-status span.online {
    background: #6cab30;
  }
  main {
    padding-top: 3rem;
  }
  &.conversation-page main.conversation-main {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    padding: 0;
    margin-top: clamp(1rem, 3dvh, 2.8rem);
  }
  &.vote-page main.vote-main {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    padding: clamp(2rem, 4dvh, 4rem) 0 0;
    margin-top: 0;
  }
  .conversation-screen {
    position: relative;
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    align-items: center;
    font-family: var(--display-font);
  }
  .conversation-timer {
    flex: 0 0 auto;
    margin-top: clamp(1.5rem, 5.8dvh, 5.2rem);
    color: #050505;
    text-align: center;
  }
  .conversation-timer p {
    margin-top: 0.4rem;
    font-size: 2rem;
  }
  .conversation-timer strong {
    display: block;
    margin-top: 0.4rem;
    font-size: clamp(3.8rem, 8dvh, 5.2rem);
    font-weight: 400;
    line-height: 1;
  }
  .conversation-stage {
    position: absolute;
    top: 24%;
    right: 0;
    bottom: 32%;
    left: 0;
    display: flex;
    width: 100%;
    min-height: 0;
    align-items: center;
    justify-content: center;
  }
  .conversation-character-group {
    display: flex;
    width: min(100%, 32rem);
    max-height: 100%;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
  }
  .conversation-mascot {
    --mascot-size: clamp(11rem, min(52vw, 22dvh), 23rem);
    position: relative;
    z-index: 1;
    display: block;
    flex: 0 1 var(--mascot-size);
    width: var(--mascot-size);
    height: var(--mascot-size);
    max-width: 100%;
    max-height: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    transition: filter 180ms ease;
    cursor: pointer;
  }
  .conversation-mascot img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .conversation-mascot.is-speaking {
    filter: drop-shadow(0 0 30px #dcff74);
  }
  .conversation-controls {
    position: absolute;
    right: 0;
    bottom: clamp(0.8rem, 4dvh, 4.2rem);
    left: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: start;
    justify-items: center;
    gap: 0.6rem;
  }
  .conversation-control {
    display: flex;
    min-width: 0;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 0;
    border: 0;
    background: transparent;
    color: #050505;
    font: 400 1.5rem/1.2 var(--font-body);
    white-space: nowrap;
  }
  .control-icon {
    display: grid;
    width: 10.3rem;
    height: 10.3rem;
    place-items: center;
    border-radius: 50%;
    background: #e0ebd9;
    color: #2b302c;
  }
  .control-icon img {
    display: block;
    width: 4.4rem;
    height: 4.4rem;
    object-fit: contain;
  }
  .report-control .control-icon {
    background: #ff0909;
    color: #fff;
  }
  &.lobby-page main.lobby-main {
    position: absolute;
    z-index: 2;
    inset: calc(6.8rem + env(safe-area-inset-top)) 3rem
      calc(1.2rem + env(safe-area-inset-bottom));
    min-height: 0;
    padding: 0;
    overflow: hidden;
    background: transparent;
  }
  .lobby-screen {
    position: absolute;
    isolation: isolate;
    inset: 0;
    min-height: 0;
    overflow: hidden;
    background: transparent;
  }
  .profile-group {
    position: absolute;
    z-index: 2;
    inset: 0;
    pointer-events: none;
  }
  .profile-avatar {
    position: absolute;
    display: grid;
    width: 6rem;
    height: 6rem;
    place-items: center;
    transform: translate(-50%, -50%);
    border: 0.3rem solid #8b6d51;
    border-radius: 50%;
    background: #dfff75;
    box-shadow:
      0 0 0 0.35rem #fbfff1bb,
      0 0.7rem 1.5rem #44280e2b;
    animation: profile-float 4.8s ease-in-out infinite;
  }
  .profile-avatar span {
    color: #44280e;
    font: 700 2.7rem/1 var(--display-font);
  }
  .choice-profile {
    padding: 0;
    color: inherit;
    pointer-events: auto;
    cursor: pointer;
  }
  .heart-modal-backdrop {
    position: fixed;
    z-index: 20;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 2.4rem;
    background: #10161080;
  }
  .heart-modal {
    position: relative;
    display: flex;
    width: min(100%, 34rem);
    max-height: calc(100dvh - 3.2rem);
    flex-direction: column;
    align-items: center;
    overflow-y: auto;
    padding: 3rem 2.4rem 2.4rem;
    border: 0.1rem solid #8b6d51;
    border-radius: 2rem;
    background: #fbfff1;
    box-shadow: 0 1rem 3rem #10161030;
    text-align: center;
  }
  .heart-modal-close {
    position: absolute;
    top: 1rem;
    right: 1.2rem;
    width: 3.2rem;
    height: 3.2rem;
    border: 0;
    background: transparent;
    color: #2b302c;
    font: 400 2.8rem/1 var(--font-body);
    cursor: pointer;
  }
  .heart-profile-round {
    margin-top: 1.6rem;
    color: #899188;
    font: 500 1.4rem/1.4 var(--font-body);
  }
  .heart-modal h2 {
    margin-top: 0.4rem;
    color: #2b302c;
    font: 700 2.4rem/1.3 var(--display-font);
  }
  .heart-balance-summary {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    margin-top: 2rem;
    padding: 1.5rem 1.6rem;
    border-radius: 1.4rem;
    background: #f2f7e7;
    color: #899188;
    font: 400 1.4rem/1.4 var(--font-body);
    text-align: left;
  }
  .heart-balance-summary strong {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    color: #2b302c;
    font-size: 1.8rem;
    font-weight: 700;
  }
  .heart-balance-summary i {
    color: #ff4a78;
    font-size: 2rem;
    font-style: normal;
  }
  .heart-balance-summary .gem-mark {
    color: var(--gem-blue);
  }
  .heart-charge-backdrop {
    z-index: 22;
  }
  .heart-charge-modal h2 {
    margin-top: 0.5rem;
  }
  .heart-charge-modal .heart-profile-round {
    margin-top: 0.8rem;
  }
  .heart-charge-summary {
    display: flex;
    width: 100%;
    flex-direction: column;
    margin-top: 1.8rem;
    padding: 1.5rem 1.6rem;
    border-radius: 1.4rem;
    background: #f2f7e7;
    color: #899188;
    font: 400 1.4rem/1.4 var(--font-body);
    text-align: left;
  }
  .heart-charge-summary-row,
  .heart-charge-quantity-row {
    display: flex;
    min-height: 3.8rem;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .heart-charge-summary-row strong,
  .heart-charge-quantity-row strong {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    color: #2b302c;
    font-size: 1.6rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .heart-charge-summary-row i,
  .heart-charge-quantity-row i {
    color: #ff4a78;
    font-size: 1.8rem;
    font-style: normal;
  }
  .heart-charge-summary-row .gem-mark {
    color: var(--gem-blue);
  }
  .heart-charge-cost-row {
    margin-top: 0.6rem;
    padding-top: 1rem;
    border-top: 1px solid #dce4d2;
    color: #2b302c;
    font-weight: 700;
  }
  .heart-quantity-control {
    display: inline-flex;
    align-items: center;
    gap: 0.9rem;
  }
  .heart-quantity-arrows {
    display: flex;
    flex-direction: row;
    gap: 0.2rem;
  }
  .heart-quantity-arrows button {
    width: 2.4rem;
    height: 1.8rem;
    padding: 0;
    border: 0;
    border-radius: 0.4rem;
    background: #e3ecd6;
    color: #52633a;
    font-size: 0.9rem;
    line-height: 1;
    cursor: pointer;
  }
  .heart-quantity-arrows button:disabled {
    color: #adb5a5;
    cursor: default;
  }
  .heart-gem-balance {
    align-self: flex-end;
    margin-top: 0.8rem;
    color: #899188;
    font: 400 1.2rem/1.4 var(--font-body);
  }
  .heart-gem-balance strong {
    color: #2b302c;
  }
  .heart-send-button,
  .heart-buy-button {
    width: 100%;
    min-height: 4.6rem;
    margin-top: 1.8rem;
    border: 0;
    border-radius: 1.2rem;
    background: var(--green);
    color: #011020;
    font: 600 1.5rem var(--font-body);
    cursor: pointer;
  }
  .heart-send-button:disabled {
    background: #e3e7df;
    color: #8b918a;
    cursor: default;
  }
  .heart-charge-button {
    min-height: 4rem;
    margin-top: 0.9rem;
    padding: 0.6rem;
    border: 0;
    background: transparent;
    color: #66716b;
    font: 500 1.4rem var(--font-body);
    text-decoration: underline;
    cursor: pointer;
  }
  .heart-charge-button:disabled {
    color: #a1a69f;
    cursor: default;
  }
  .heart-buy-button {
    min-height: 4rem;
    margin-top: 0.8rem;
    background: transparent;
    color: #66716b;
    font-size: 1.3rem;
    text-decoration: underline;
  }
  .heart-buy-button:disabled {
    color: #a1a69f;
    cursor: default;
  }
  .same-profiles .profile-avatar {
    background: #eaf2d5;
  }
  .same-profiles .profile-avatar:nth-child(2n) {
    background: #e4d0a9;
  }
  .opposite-profiles .profile-avatar:nth-child(2n) {
    background: #b9d987;
  }
  .lobby-mascot {
    position: absolute;
    z-index: 2;
    top: 51%;
    left: 50%;
    box-sizing: border-box;
    width: clamp(13rem, min(44vw, 21dvh), 19rem);
    height: clamp(13rem, min(44vw, 21dvh), 19rem);
    padding: 1.6rem;
    object-fit: contain;
    transform: translate(-50%, -50%);
    filter: drop-shadow(0 1rem 0.55rem #27351b36);
  }
  .gem-balance .gem {
    color: var(--gem-blue);
    font-size: 1.7rem;
    line-height: 1;
  }
  .start-conversation {
    position: absolute;
    z-index: 3;
    bottom: 2.2rem;
    right: 0;
    left: 0;
    display: flex;
    width: 100%;
    padding: 1.3216rem 0;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin: 0;
    border: 0;
    border-radius: 1.3216rem;
    background: #011020;
    color: #fff;
    font: 700 1.6rem var(--display-font);
  }
  .start-conversation:disabled {
    opacity: 0.55;
  }
  @keyframes profile-float {
    0%,
    100% {
      translate: 0 0;
    }
    50% {
      translate: 0 -0.9rem;
    }
  }
  .session-intro {
    margin-bottom: 2rem;
  }
  .eyebrow {
    display: block;
    color: #819065;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.1rem;
  }
  .session-intro h1,
  .state-card h1 {
    margin-top: 0.6rem;
    font: 400 2.8rem/1.3 var(--display-font);
  }
  .session-intro p {
    margin-top: 0.8rem;
    color: var(--text-secondary);
    font-size: 1.3rem;
  }
  .lobby-card,
  .state-card,
  .partner-card {
    padding: 2.4rem;
    border: 0.1rem solid #e4e9df;
    border-radius: 2.4rem;
    background: var(--white);
    box-shadow: 0 0.6rem 2rem #2b302c0a;
  }
  .lobby-card {
    text-align: center;
  }
  .lobby-card > img {
    width: 7rem;
    height: 7rem;
    margin: 0 auto 1.4rem;
    object-fit: contain;
  }
  .lobby-card h2,
  .state-card h2,
  .partner-card h2 {
    font: 400 2.1rem/1.4 var(--display-font);
  }
  .lobby-card p,
  .state-card p {
    margin-top: 0.8rem;
    color: var(--text-secondary);
    font-size: 1.3rem;
    line-height: 1.7;
  }
  .entry-countdown {
    display: block;
    margin: 1.8rem 0 0;
    font-size: 2.8rem;
    letter-spacing: 0.1rem;
  }
  .primary {
    display: grid;
    width: 100%;
    min-height: 4.8rem;
    place-items: center;
    margin-top: 2rem;
    border: 0;
    border-radius: 1.2rem;
    background: var(--green);
    color: var(--ink);
    font: 600 1.5rem var(--font-body);
    text-decoration: none;
  }
  .primary:disabled {
    background: var(--control-disabled);
    color: var(--text-placeholder);
  }
  .state-card {
    text-align: center;
  }
  .wait-background {
    position: absolute;
    z-index: 0;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
  .state-card .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .state-card .actions button,
  .state-card > button:not(.primary) {
    min-height: 4.4rem;
    margin-top: 2rem;
    padding: 1rem;
    border: 0.1rem solid #e3e8df;
    border-radius: 1.2rem;
    background: var(--white);
    font-size: 1.3rem;
  }
  .partner-card {
    text-align: center;
  }
  .partner-avatar {
    display: grid;
    width: 9rem;
    height: 9rem;
    place-items: center;
    margin: 0 auto 1.6rem;
    border-radius: 50%;
    background: var(--green-soft);
  }
  .partner-avatar img {
    width: 7rem;
    height: 7rem;
    object-fit: contain;
  }
  .partner-card h2 {
    margin-top: 0.6rem;
    font-size: 2.4rem;
  }
  .call-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.7rem;
    margin-top: 1rem;
    color: var(--text-secondary);
    font-size: 1.2rem;
  }
  .compatibility {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    margin-top: 2rem;
    padding: 1.3rem 1.5rem;
    border-radius: 1.5rem;
    background: #f2f7e7;
    text-align: left;
  }
  .compatibility strong {
    color: #66852b;
    font-size: 2.5rem;
  }
  .compatibility small {
    margin-left: 0.2rem;
    font-size: 1.1rem;
  }
  .compatibility p {
    color: var(--text-secondary);
    font-size: 1.2rem;
  }
  .profile-details {
    display: grid;
    gap: 0.8rem;
    margin-top: 1.6rem;
    text-align: left;
  }
  .profile-details p {
    display: grid;
    grid-template-columns: 5rem 1fr;
    gap: 0.8rem;
    color: var(--ink);
    font-size: 1.2rem;
    line-height: 1.5;
  }
  .profile-details p span {
    color: var(--text-secondary);
  }
  .call-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 2rem;
  }
  .call-actions button {
    min-height: 4.5rem;
    border: 0.1rem solid var(--ink);
    border-radius: 1.2rem;
    background: var(--white);
    font: 600 1.3rem var(--font-body);
  }
  .call-actions button.muted {
    background: var(--green);
  }
  .call-actions button.leave {
    border-color: transparent;
    background: var(--ink);
    color: var(--white);
  }
  .voting-card > strong {
    display: block;
    margin-top: 1.8rem;
  }
  .error-message {
    margin-top: 1.4rem;
    color: var(--text-danger);
    font-size: 1.3rem;
    line-height: 1.6;
    text-align: center;
  }

  @media (max-width: 37.4rem) {
    padding-right: 3rem;
    padding-left: 3rem;

    .conversation-stage {
      top: 23%;
      bottom: 31%;
    }
    .conversation-mascot {
      --mascot-size: clamp(11rem, min(54vw, 21dvh), 19rem);
    }
    .conversation-controls {
      gap: 0.2rem;
    }
    .conversation-control {
      gap: 0.7rem;
      font-size: clamp(1.2rem, 3.3vw, 1.5rem);
    }
    .control-icon {
      width: clamp(6rem, 19vw, 8.2rem);
      height: clamp(6rem, 19vw, 8.2rem);
    }
    .control-icon img {
      width: clamp(3.2rem, 10vw, 4.4rem);
      height: clamp(3.2rem, 10vw, 4.4rem);
    }
  }
  @media (max-height: 65rem) {
    .profile-avatar {
      width: 5.2rem;
      height: 5.2rem;
    }
    .start-conversation {
      bottom: 1.2rem;
    }
    .conversation-timer {
      margin-top: clamp(1.2rem, 4.5dvh, 2.8rem);
    }
    .conversation-timer strong {
      font-size: clamp(3.4rem, 7dvh, 4.6rem);
    }
    .conversation-controls {
      bottom: clamp(0.6rem, 2.5dvh, 2.4rem);
    }
    .control-icon {
      width: clamp(6rem, 18vw, 8.2rem);
      height: clamp(6rem, 18vw, 8.2rem);
    }
    .control-icon img {
      width: 3.8rem;
      height: 3.8rem;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .wait-background {
      display: none;
    }
    .profile-avatar {
      animation: none;
    }
  }
`;
