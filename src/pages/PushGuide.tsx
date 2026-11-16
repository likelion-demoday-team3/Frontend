import type { ReactNode } from "react";
import styled from "styled-components";
import MyPageFrame from "./MyPage/MyPageFrame";

/**
 * 아이폰에서 푸시 알림을 켜는 방법 (/push-guide).
 * 아이폰은 Safari에서 "홈 화면에 추가"한 Kiiwee 앱에서만 푸시를 받을 수 있다 (iOS 16.4+).
 * 그림은 실제 화면을 단순화한 것이다 (iOS 버전에 따라 모양이 조금 다를 수 있다).
 */
export default function PushGuide() {
  return (
    <MyPageFrame title="아이폰 알림 켜는 방법" backHref="/mypage">
      <Intro>
        아이폰은 Safari에서 Kiiwee를 <strong>홈 화면에 추가</strong>한 뒤, 홈 화면 아이콘으로
        열어야 알림을 받을 수 있어요. iOS 16.4 이상에서 할 수 있어요.
      </Intro>
      <Steps>
        <Step
          number={1}
          title="Safari 아래쪽의 공유 버튼을 눌러요"
          note="공유 버튼이 안 보이면 오른쪽 아래 ⋯ 버튼을 누른 뒤 '공유'를 눌러요."
          figure={<SafariToolbar />}
        />
        <Step
          number={2}
          title="메뉴를 내려 '홈 화면에 추가'를 눌러요"
          note="목록에 없으면 메뉴를 끝까지 내리거나 '더 보기'를 눌러요."
          figure={<ShareSheet />}
        />
        <Step
          number={3}
          title="오른쪽 위 '추가'를 눌러요"
          note="'웹 앱으로 열기'가 보이면 켜진 상태로 두세요."
          figure={<AddDialog />}
        />
        <Step
          number={4}
          title="홈 화면에 생긴 Kiiwee 아이콘으로 다시 들어가요"
          note="Safari와 로그인 정보가 따로라서, 처음 한 번은 다시 로그인해야 해요."
          figure={<HomeScreen />}
        />
        <Step
          number={5}
          title="마이페이지에서 '푸시 알림'을 켜요"
          figure={<PushSwitch />}
        />
        <Step
          number={6}
          title="알림을 '허용'해요"
          note="이제 연락처 요청, 세션 확정·취소를 앱을 닫아도 알려드려요."
          figure={<PermissionAlert />}
        />
      </Steps>
      <Help>
        <h2>알림이 안 와요</h2>
        <ul>
          <li>
            '허용 안 함'을 눌렀다면: 아이폰 <strong>설정 → 알림 → Kiiwee</strong>에서 알림
            허용을 켜주세요.
          </li>
          <li>집중 모드(방해 금지)가 켜져 있으면 알림이 보이지 않을 수 있어요.</li>
          <li>홈 화면 아이콘을 지웠다면 1단계부터 다시 해주세요.</li>
        </ul>
      </Help>
    </MyPageFrame>
  );
}

function Step({
  number,
  title,
  note,
  figure,
}: {
  number: number;
  title: string;
  note?: string;
  figure: ReactNode;
}) {
  return (
    <li>
      <div className="copy">
        <span className="number" aria-hidden="true">
          {number}
        </span>
        <div>
          <h2>
            <span className="sr-only">{number}단계. </span>
            {title}
          </h2>
          {note && <p>{note}</p>}
        </div>
      </div>
      <figure aria-hidden="true">{figure}</figure>
    </li>
  );
}

// ===== 그림 (단순화한 아이폰 화면) =====

const INK = "#202820";
const MUTED = "#a7afa5";
const LINE = "#e3e8e0";
const HIGHLIGHT = "#8cc63f";

/** 휴대폰 아래쪽 일부만 보여주는 틀 */
function Phone({ children, height = 150 }: { children: ReactNode; height?: number }) {
  return (
    <svg viewBox={`0 0 240 ${height}`} role="img">
      <rect x="1" y="1" width="238" height={height - 2} rx="22" fill="#fbfcfa" stroke={LINE} strokeWidth="2" />
      {children}
    </svg>
  );
}

function Ring({ x, y, w, h, r = 10 }: { x: number; y: number; w: number; h: number; r?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={r} fill="none" stroke={HIGHLIGHT} strokeWidth="3" />;
}

function ShareIcon({ x, y, color = INK }: { x: number; y: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-7 -2 h-3 v14 h20 v-14 h-3" />
      <path d="M0 4 V-12 M-5 -7 L0 -12 L5 -7" />
    </g>
  );
}

function SafariToolbar() {
  return (
    <Phone height={150}>
      <rect x="20" y="22" width="200" height="30" rx="10" fill="#eef1ec" />
      <text x="120" y="42" textAnchor="middle" fontSize="12" fill={MUTED}>kiiwee.vercel.app</text>
      <line x1="1" y1="88" x2="239" y2="88" stroke={LINE} strokeWidth="1.5" />
      {/* 뒤로·앞으로 */}
      <path d="M36 108 l-8 8 l8 8" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M72 108 l8 8 l-8 8" stroke={MUTED} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* 공유 */}
      <ShareIcon x={120} y={117} />
      <Ring x={100} y={96} w={40} h={40} />
      {/* 책갈피·탭 */}
      <path d="M160 108 h14 v16 l-7 -5 l-7 5 z" stroke={INK} strokeWidth="2" fill="none" strokeLinejoin="round" />
      <rect x="198" y="108" width="14" height="14" rx="3" stroke={INK} strokeWidth="2" fill="none" />
      <rect x="202" y="104" width="14" height="14" rx="3" stroke={INK} strokeWidth="2" fill="#fbfcfa" />
    </Phone>
  );
}

function ShareSheet() {
  const rows = ["복사", "읽기 목록에 추가", "책갈피 추가", "홈 화면에 추가"];
  return (
    <Phone height={190}>
      <rect x="12" y="14" width="216" height="164" rx="14" fill="#fff" stroke={LINE} />
      {rows.map((label, index) => {
        const y = 22 + index * 38;
        const last = index === rows.length - 1;
        return (
          <g key={label}>
            <text x="28" y={y + 23} fontSize="13" fill={last ? INK : MUTED} fontWeight={last ? 700 : 400}>
              {label}
            </text>
            {last ? (
              <g transform={`translate(196 ${y + 9})`} stroke={INK} strokeWidth="1.8" fill="none">
                <rect x="0" y="0" width="16" height="16" rx="4" />
                <path d="M8 4 v8 M4 8 h8" strokeLinecap="round" />
              </g>
            ) : (
              <rect x="196" y={y + 9} width="16" height="16" rx="4" fill="none" stroke={MUTED} strokeWidth="1.5" />
            )}
            {!last && <line x1="28" y1={y + 36} x2="212" y2={y + 36} stroke={LINE} />}
          </g>
        );
      })}
      <Ring x={18} y={136} w={204} h={36} />
    </Phone>
  );
}

function AddDialog() {
  return (
    <Phone height={180}>
      <text x="24" y="34" fontSize="13" fill={MUTED}>취소</text>
      <text x="120" y="34" textAnchor="middle" fontSize="13" fontWeight="700" fill={INK}>홈 화면에 추가</text>
      <text x="198" y="34" textAnchor="middle" fontSize="13" fontWeight="700" fill="#2f7cf6">추가</text>
      <Ring x={178} y={16} w={42} h={26} r={8} />
      <rect x="20" y="56" width="200" height="56" rx="12" fill="#fff" stroke={LINE} />
      <rect x="32" y="64" width="40" height="40" rx="10" fill="#e5ff76" />
      <text x="52" y="90" textAnchor="middle" fontSize="16" fontWeight="800" fill="#273219">K</text>
      <text x="84" y="82" fontSize="13" fontWeight="700" fill={INK}>Kiiwee</text>
      <text x="84" y="99" fontSize="10" fill={MUTED}>kiiwee.vercel.app</text>
      <rect x="20" y="124" width="200" height="40" rx="12" fill="#fff" stroke={LINE} />
      <text x="34" y="149" fontSize="12" fill={INK}>웹 앱으로 열기</text>
      <rect x="176" y="133" width="34" height="22" rx="11" fill="#34c759" />
      <circle cx="199" cy="144" r="9" fill="#fff" />
    </Phone>
  );
}

function HomeScreen() {
  const apps = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <Phone height={170}>
      <rect x="1" y="1" width="238" height="168" rx="22" fill="#dfe9f3" />
      {apps.map((index) => {
        const x = 26 + (index % 4) * 50;
        const y = 22 + Math.floor(index / 4) * 66;
        const kiiwee = index === 5;
        return (
          <g key={index}>
            <rect x={x} y={y} width="38" height="38" rx="10" fill={kiiwee ? "#e5ff76" : "#ffffffaa"} />
            {kiiwee && (
              <>
                <text x={x + 19} y={y + 25} textAnchor="middle" fontSize="16" fontWeight="800" fill="#273219">K</text>
                <text x={x + 19} y={y + 52} textAnchor="middle" fontSize="10" fill={INK}>Kiiwee</text>
              </>
            )}
          </g>
        );
      })}
      <Ring x={70} y={82} w={50} h={60} r={12} />
    </Phone>
  );
}

function PushSwitch() {
  return (
    <Phone height={150}>
      <rect x="14" y="16" width="212" height="118" rx="14" fill="#fff" stroke={LINE} />
      <text x="30" y="44" fontSize="13" fill={MUTED}>예약 확인</text>
      <text x="210" y="45" textAnchor="end" fontSize="16" fill={MUTED}>›</text>
      <line x1="30" y1="60" x2="210" y2="60" stroke={LINE} />
      <text x="30" y="86" fontSize="13" fontWeight="700" fill={INK}>푸시 알림</text>
      <text x="30" y="104" fontSize="9.5" fill={MUTED}>연락처 요청, 세션 확정·취소 알림</text>
      <rect x="168" y="78" width="40" height="24" rx="12" fill="#b8e986" />
      <circle cx="196" cy="90" r="9.5" fill="#fff" />
      <Ring x={160} y={70} w={56} h={40} r={14} />
    </Phone>
  );
}

function PermissionAlert() {
  return (
    <Phone height={170}>
      <rect x="1" y="1" width="238" height="168" rx="22" fill="#00000014" />
      <rect x="30" y="18" width="180" height="134" rx="16" fill="#f4f5f3" />
      <text x="120" y="46" textAnchor="middle" fontSize="12" fontWeight="700" fill={INK}>'Kiiwee'에서 알림을</text>
      <text x="120" y="63" textAnchor="middle" fontSize="12" fontWeight="700" fill={INK}>보내고자 합니다</text>
      <text x="120" y="84" textAnchor="middle" fontSize="9.5" fill={MUTED}>알림에는 알림, 사운드, 아이콘</text>
      <text x="120" y="97" textAnchor="middle" fontSize="9.5" fill={MUTED}>배지가 포함될 수 있습니다.</text>
      <line x1="30" y1="112" x2="210" y2="112" stroke="#d7dbd5" />
      <line x1="120" y1="112" x2="120" y2="152" stroke="#d7dbd5" />
      <text x="75" y="137" textAnchor="middle" fontSize="12" fill="#2f7cf6">허용 안 함</text>
      <text x="165" y="137" textAnchor="middle" fontSize="12" fontWeight="700" fill="#2f7cf6">허용</text>
      <Ring x={126} y={117} w={78} h={30} r={8} />
    </Phone>
  );
}

// ===== 스타일 =====

const Intro = styled.p`
  margin: 0 0 1.6rem;
  color: #536057;
  font-size: 1.3rem;
  line-height: 1.7;
`;

const Steps = styled.ol`
  display: grid;
  gap: 1.2rem;
  margin: 0;
  padding: 0;
  list-style: none;
  li {
    display: grid;
    gap: 1.2rem;
    padding: 1.6rem;
    border: 0.1rem solid #e1e8dc;
    border-radius: 1.6rem;
    background: #fff;
  }
  .copy {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }
  .number {
    display: grid;
    flex: 0 0 auto;
    width: 2.6rem;
    height: 2.6rem;
    place-items: center;
    border-radius: 50%;
    background: var(--green, #b8e986);
    color: #273219;
    font-size: 1.3rem;
    font-weight: 800;
  }
  h2 {
    margin: 0.2rem 0 0;
    color: #202820;
    font-size: 1.45rem;
    line-height: 1.45;
  }
  p {
    margin: 0.5rem 0 0;
    color: #7d877a;
    font-size: 1.15rem;
    line-height: 1.6;
  }
  figure {
    margin: 0;
  }
  svg {
    display: block;
    width: 100%;
    max-width: 28rem;
    height: auto;
    margin: 0 auto;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
`;

const Help = styled.section`
  margin-top: 1.6rem;
  padding: 1.6rem;
  border-radius: 1.4rem;
  background: #f5f8ef;
  h2 {
    margin: 0 0 0.8rem;
    font-size: 1.4rem;
  }
  ul {
    display: grid;
    gap: 0.6rem;
    margin: 0;
    padding-left: 1.8rem;
    color: #536057;
    font-size: 1.2rem;
    line-height: 1.6;
  }
`;
