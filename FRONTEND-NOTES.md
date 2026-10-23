# Kiiwee 프론트엔드 · 백엔드 연결 가이드

로그인·가입, 세션 신청/취소, 보석 잔액·거래 내역, 라이브 세션과 투표 제출은 API 모듈을 통해 백엔드에 연결되어 있습니다. 마이페이지 화면도 추가되어 회원 정보와 예약 조회가 연결됐지만, 연락처·비밀번호·프로필 수정 화면은 아직 저장 API에 연결되지 않았습니다. 내 투표 조회와 매칭 요약 경로는 응답 DTO 확인 후 연결해야 합니다. 상세 결과, 연락처 교환, 결제 등 명세가 없는 기능은 실제 백엔드 모드에서 실행을 막고 안내 문구를 표시합니다.

## 빠른 연결 순서

### 1. 백엔드 실행 및 주소 확인

먼저 백엔드 서버를 실행하고 REST 서버 주소와 WebSocket 주소를 확인합니다. 아래 예시는 백엔드 REST가 `http://localhost:8080`에서 실행되고, WebSocket이 `ws://localhost:8080/ws`에 연결되는 경우입니다.

### 2. 실제 백엔드 환경 설정

프로젝트 루트에서 `.env.backend.example`을 `.env.local`로 복사합니다. 이미 `.env.local`이 있으면 복사본 대신 아래 값을 설정합니다.

```dotenv
VITE_USE_MOCK_API=false
VITE_AUTO_LOGIN_MOCK=false
VITE_API_BASE_URL=
VITE_WS_URL=ws://localhost:8080/ws
```

로컬 REST 주소가 `http://localhost:8080`이면 `VITE_API_BASE_URL`을 비워 둡니다. Vite 개발 서버가 기본 REST 요청 앞의 `/api` proxy prefix를 제거하고 `http://localhost:8080`으로 전달합니다. 다른 주소를 쓸 때는 `VITE_API_BASE_URL=https://api.example.com`처럼 **API 경로를 제외한 origin**을 지정합니다. `VITE_API_BASE_URL`이 `/api`로 끝나도 클라이언트가 이를 제거해 도메인 API의 `/auth/...`, `/sessions` 경로를 사용합니다.

HTTPS 웹사이트에서 연결하는 WebSocket은 `wss://`를 사용해야 합니다. 예: `VITE_WS_URL=wss://api.example.com/ws`.

### 3. 프론트엔드 실행

환경 변수를 바꾼 뒤에는 실행 중인 Vite 서버를 재시작해야 합니다. 환경 값은 브라우저 실행 중 자동 갱신되지 않습니다.

```powershell
npm install
npm run dev
```

터미널에 표시되는 로컬 주소를 열고 로그인 또는 회원가입을 진행합니다. 백엔드 모드에서는 자동 로그인과 MSW 목업이 꺼져 있으므로 mock 계정이 동작하지 않습니다. 세션 API는 로그인이 필요하며, 실제 테스트 계정은 백엔드에서 준비해야 합니다.

### 4. 연결 확인

브라우저 개발자 도구의 Network 탭에서 REST 요청이 백엔드로 향하는지 확인합니다. 아래 순서로 확인하면 문제 위치를 찾기 쉽습니다.

1. 로그인 또는 회원가입 후 `GET /members/my`와 `GET /wallet/my`가 성공하는지 확인합니다.
2. 홈에서 세션 목록을 불러오고 세션 상세, 신청, 취소를 확인합니다.
3. 신청한 세션의 라이브 화면에서 WebSocket 연결 및 STOMP `CONNECTED` 프레임을 확인합니다.
4. 보석 잔액과 충전 내역 화면에서 `GET /wallet/my`, `GET /wallet/my/history` 응답을 확인합니다.

## 환경별 설정

| 상황 | `VITE_USE_MOCK_API` | `VITE_AUTO_LOGIN_MOCK` | API 주소 | WebSocket 주소 |
| --- | --- | --- | --- | --- |
| 화면 개발·목업 확인 | `true` | `true` 또는 `false` | 설정하지 않음 | 설정하지 않음 |
| 로컬 백엔드 연결 | `false` | `false` | 비워 두면 `localhost:8080` 프록시 | `ws://localhost:8080/ws` |
| 원격 백엔드 연결 | `false` | `false` | 백엔드 origin 지정 | 백엔드의 `wss://` 주소 지정 |

`.env.example`은 목업 개발용이고 `.env.backend.example`은 실제 백엔드 연결용입니다. `.env.local`은 Git에서 제외됩니다. 배포 빌드에도 같은 환경 변수가 필요하므로 배포 환경에 설정한 뒤 새로 빌드해야 합니다. 브라우저에 노출되어도 되는 `VITE_` 변수에 비밀 키를 넣지 마세요.

## 현재 연결된 API

프론트엔드는 공통 응답 `{ "success": true, "data": ..., "error": null }`을 기대합니다. 오류 응답은 `{ "success": false, "data": null, "error": { "code": "...", "message": "..." } }` 형태입니다. API 서버가 다른 응답 포맷을 반환하면 `src/features/api/client.ts`의 응답 처리 계약을 함께 조정해야 합니다.

| 기능 | 요청 | 인증 |
| --- | --- | --- |
| 이메일 인증 코드 요청 | `POST /auth/email/code` | 불필요 |
| 이메일 인증 코드 확인 | `POST /auth/email/verify` | 불필요 |
| 회원가입 | `POST /auth/signup` | 불필요 |
| 로그인 | `POST /auth/login` | 불필요 |
| 내 회원 정보 | `GET /members/my` | Bearer 토큰 |
| 본인인증 준비 | `POST /members/my/identity-verification/request` | Bearer 토큰 |
| 본인인증 결과 확인 | `POST /members/my/identity-verification/confirm` (`{ identityVerificationId }`) | Bearer 토큰 |
| 회원 탈퇴 | `DELETE /members/my` | Bearer 토큰 |
| 세션 목록·내 신청 목록 | `GET /sessions`, `GET /sessions/my` | Bearer 토큰 |
| 세션 상세 | `GET /sessions/{sessionId}` | Bearer 토큰 |
| 세션 신청·취소 | `POST` 또는 `DELETE /sessions/{sessionId}/participation` | Bearer 토큰 |
| 보석 잔액·거래 내역 | `GET /wallet/my`, `GET /wallet/my/history?page=0&size=20` | Bearer 토큰 |
| 라이브 연결 | `ws(s)://.../ws` · STOMP `CONNECT`, `SUBSCRIBE`, `SEND` | STOMP `Authorization: Bearer {token}` |
| 투표 제출 | `POST /api/sessions/{sessionId}/votes` (`{ rankedMemberIds: number[] }`) | 요청 본문 확인 및 연결 완료 |
| 내 투표·매칭 요약 | `GET /api/sessions/{sessionId}/votes/me`, `GET /api/sessions/{sessionId}/results/summary` | 경로 확인, 응답 DTO 확인 후 연결 |

**경로 규칙:** 1009 도메인 API 명세의 일반 REST 경로는 `/auth/...`, `/members/...`, `/sessions/...`, `/wallet/...`처럼 API origin 바로 뒤에 붙습니다. 별도로 전달된 투표 경로는 `/api/sessions/...`이므로 투표 요청에만 `/api` prefix를 포함합니다. 로컬 프록시는 첫 `/api`를 제거해 전달하므로 투표 요청도 백엔드에 `/api/sessions/...`로 도착합니다.

REST 시간 값은 UTC ISO 8601 문자열을 사용하고 화면에서 한국 시간으로 표시합니다. 거래 내역 페이지 크기는 최대 50으로 제한합니다. 토큰은 현재 브라우저 `localStorage`에 저장되며, 명세된 refresh-token API가 없어 만료 후 자동 갱신은 하지 않습니다. 인증 오류가 발생하면 토큰을 비우고 로그인 화면으로 이동합니다.

라이브 연결은 `/user/queue/live/joined`, `round-assigned`, `round-idle`, `signal`, `voting-started`를 구독하고 `/app/live/join`, `/app/live/signal`로 메시지를 보냅니다. 서버는 STOMP CONNECT 헤더의 Authorization을 확인해야 합니다. 현재 공유된 계약에는 heartbeat 주기가 없어 프론트는 STOMP heartbeat를 협상하지 않습니다. 서버/인프라에서 heartbeat를 요구하면 양쪽 주기를 정하고 클라이언트 송수신 처리를 추가해야 합니다. WebSocket 자동 재접속은 구현되어 있지 않으므로 연결 종료 시 사용자가 다시 진입해야 합니다.

## 아직 연동되지 않았거나 명세를 기다리는 기능

마이페이지 UI에는 내 정보, 본인확인, 프로필 카드, 스터디 기록 및 예약 화면이 있습니다. 이름은 회원가입에서 입력받아 현재 브라우저에 보관하고, 백엔드 회원 API에 name 필드가 추가되기 전까지 다른 기기와 동기화되지 않습니다. 전화번호 조회·수정은 회원 API를 사용합니다. 본인확인일은 회원 응답에 `identityVerifiedAt`이 포함되어야 표시되며, 인증 업체 연동은 아직 필요합니다. 비밀번호 변경 화면은 새 비밀번호 확인 UI까지 구현되어 있지만, 명세의 `PATCH /members/my/password`는 `currentPassword`와 `newPassword`를 모두 요구하므로 현재 화면 항목만으로 요청할 수 없습니다. 스터디 기록은 목록 이동과 기간/결과 필터 UI가 있으나 매칭 및 연락처 기록 API가 명세되지 않아 데이터는 아직 표시되지 않습니다. 프로필 카드 조회·수정과 인스타그램 수정/삭제, 회원 탈퇴도 API 함수에 연결되지 않았습니다.

투표 제출은 `{ "rankedMemberIds": [12, 8, 21] }` 형식으로 연결했습니다. 순위 순서로 회원 ID를 보내며 1~3명, 중복 없이 제출하도록 검사합니다. `POST` 성공 응답은 화면에서 사용하지 않고 공통 API envelope 성공 여부만 확인합니다. `votes/me`와 `results/summary`의 응답 데이터 형식은 아직 확인되지 않아 연결하지 않았습니다.

아래 기능은 현재 공유된 API 계약에 없어 실제 서버 요청을 하지 않거나, 이 문서에 적은 프론트 계약이 백엔드에 구현되어야 동작합니다. 연동 전에 endpoint, 요청/응답 DTO, 오류 코드, 인증 방식, 상태 전이 규칙을 백엔드와 맞춰야 합니다.

- 상세 투표 결과 조회와 결과 열람 보석 차감
- 연락처 교환 의사 표시, 연락처 공개, 교환 내역 조회
- 하트 전송 및 보석 차감
- 상품 목록, 결제 상세·환불
- 알림 조회 및 읽음 처리
- 신고 제출

상점의 상품과 가격은 현재 화면에 표시하는 값입니다. 서버는 `productId`로 상품 가격과 지급할 보석을 자체 조회해야 하며 프론트가 보내는 금액을 결제 근거로 신뢰하면 안 됩니다.

### 카카오페이 결제 연동

프론트는 `src/features/payments/kakaopay.ts`에 모아 둔 앱 백엔드 계약을 사용합니다. 카카오페이 Secret Key와 원본 결제 API 호출은 백엔드에서 처리해야 합니다.

1. 로그인한 사용자는 `GET /shop/products`에서 `{ productId, name, gemAmount }` 목록을 받습니다. 상점은 상품 이름과 보석 개수만 표시하며 현금 가격을 표시하지 않습니다.
2. 상품을 누르면 프론트는 `POST /payments/kakaopay/ready`에 `{ "productId": 1 }`을 Bearer 토큰과 함께 보내고 PC·모바일 웹·웹뷰에 맞는 redirect URL로 이동합니다.
3. 성공 callback에서 `orderId`와 `pg_token`으로 `POST /payments/kakaopay/approve`를 호출합니다. 응답 `{ orderId, grantedGem, gemBalance }`를 보관해 상점으로 돌아간 뒤 충전 완료 팝업에 표시합니다. 취소·실패 callback은 `/cancel`, `/fail` 경로에서 `POST /payments/{orderId}/abort`를 호출하고 결과에 맞는 안내와 함께 상점으로 돌아옵니다.

결제 API 경로는 `GET /shop/products`, `POST /payments/kakaopay/ready`, `POST /payments/kakaopay/approve`, `POST /payments/{orderId}/abort`, `POST /payments/{orderId}/refund`, `GET /payments/my`입니다. 보석 잔액과 보석 거래 내역은 기존 `GET /wallet/my`, `GET /wallet/my/history`를 계속 사용합니다. 승인 요청은 `{ "orderId": "...", "pgToken": "..." }`, 응답은 `{ "orderId", "grantedGem", "gemBalance" }`입니다.

### 주문 조회 및 결제 취소

카카오페이 공식 주문조회와 결제취소 API도 백엔드에서 호출해야 합니다. 주문조회·승인·취소에는 카카오페이 `tid`가 필요하며, 카카오페이는 결제준비 응답의 TID를 주문번호와 매핑해 저장하도록 안내합니다. 결제취소는 승인된 결제에 대해서만 가능하고, 취소 금액 및 비과세/부가세 금액을 함께 검증해야 합니다. 따라서 프론트는 카카오페이에 직접 요청하지 않고 앱 백엔드의 사용자 권한 확인 API를 호출해야 합니다.

카카오페이 원본 요청 필드와 현재 프론트→앱 백엔드 요청은 서로 다릅니다.

- **준비(ready), 카카오페이 서버 호출:** 서버가 `cid`, `partner_order_id`, `partner_user_id`, `item_name`, `quantity`, `total_amount`, `tax_free_amount`, `approval_url`, `cancel_url`, `fail_url` 등을 구성해 전달합니다. 카카오페이 `Secret Key`는 서버에서만 사용합니다.
- **승인(approve), 카카오페이 서버 호출:** 서버가 저장해 둔 `tid`와 callback의 `pg_token`, `cid`, `partner_order_id`, `partner_user_id`로 승인합니다.
- **주문 조회(order), 카카오페이 서버 호출:** 앱 백엔드가 저장한 `tid`를 이용해 조회합니다.
- **취소(cancel), 카카오페이 서버 호출:** 앱 백엔드가 `tid`, 취소 금액, 취소 비과세 금액(필요 시 취소 VAT 포함)을 결정해 호출합니다.
- **프론트→앱 백엔드:** 결제 준비는 `{ "productId": 1 }`, 승인은 `{ "orderId": "...", "pgToken": "..." }`로 전달합니다. 중단은 본문 없이 호출합니다. 환불은 본문 없이 호출하며, 내 결제 내역은 `GET /payments/my?page=0&size=20`로 조회합니다.

카카오페이 원본 응답 DTO의 주요 필드는 다음과 같습니다. 이 필드와 앱 백엔드가 프론트에 반환하는 DTO가 같다고 가정하지 마세요.

- **ready 응답:** `tid`, `next_redirect_pc_url`, `next_redirect_mobile_url`, `next_redirect_app_url`, `created_at`. 현재 백엔드의 프론트 응답 예시는 별도 변환된 `{ orderId, gemAmount, pcRedirectUrl, mobileRedirectUrl, appRedirectUrl }`입니다.
- **주문 조회 응답:** `tid`, `cid`, `status`, `partner_order_id`, `partner_user_id`, `payment_method_type`, `amount`, `item_name`, `quantity`, `created_at`, 승인/취소 시각 등 거래 정보.
- **취소 응답:** 주문 조회 필드와 함께 `approved_cancel_amount`(이번 취소), `canceled_amount`(누적 취소), `cancel_available_amount`(남은 취소 가능액), `canceled_at` 등이 포함됩니다. 프론트는 백엔드가 반환하는 결과만 표시해야 합니다.

`GET /payments/my`는 `{ orderId, productName, grantedGem, status, refundable, paidAt, canceledAt, createdAt }[]`를 반환합니다. `refundable`이 true인 결제에만 환불 버튼을 표시하며, 보석을 이미 사용했다면 환불 API가 409로 거절할 수 있으므로 `error.message`를 그대로 표시합니다. 날짜는 UTC 응답을 한국 시간으로 변환해 표시합니다.

환불 API는 로그인 사용자 인증이 필요하며 `POST /payments/{orderId}/refund`로 본문 없이 호출합니다. 성공 응답은 `ApiResponse<PaymentRefundResponse>`이며 `data`는 `{ "orderId": "ORDER_123", "revokedGem": 20, "gemBalance": 80 }` 형식입니다. 오류도 `{ "success": false, "data": null, "error": { "code": "...", "message": "..." } }` envelope를 사용합니다. 확인된 오류는 `409 INVALID_STATE`(이미 환불, 환불 기간 만료, 결제 미완료, 보석 사용), `404 NOT_FOUND`(주문 없음 또는 다른 사용자 주문), `502 PAYMENT_FAILED`(카카오페이 오류)입니다. 기간 만료 메시지의 7일은 기본 설정 예시이며 설정에 따라 달라집니다. 공통 API 클라이언트는 envelope의 `error.code`와 `error.message`를 `ApiError`로 전달합니다.

### PortOne 본인인증 연동

본인인증은 로그인된 상태에서 `POST /members/my/identity-verification/request`를 호출합니다. 서버 응답의 `storeId`, `channelKey`, `identityVerificationId`로 PortOne Browser SDK 인증을 열고, redirect 또는 SDK 완료 결과에서 받은 `identityVerificationId`를 `POST /members/my/identity-verification/confirm` 본문에 보냅니다. 프론트는 이후 `GET /members/my`를 다시 호출해 `identityVerifiedAt`을 갱신합니다. 백엔드는 가입 때 저장한 생년월일·성별과 PortOne 인증 결과를 검증해야 합니다. 이 흐름은 `src/pages/MyPage/ItsMe.tsx`에 연결되어 있습니다.

## 문제 해결

- **요청이 `localhost:8080`에 도달하지 않음:** 백엔드 실행 여부, 포트, `.env.local` 값과 Vite 재시작 여부를 확인합니다.
- **404:** `VITE_API_BASE_URL`에는 경로를 덧붙이지 말고 origin을 지정합니다. 백엔드에 `/api` prefix를 유지해야 하는 배포 환경이면 현재 프론트 경로/프록시 규칙과 서버 경로를 맞춰야 합니다.
- **CORS 오류:** 원격 API에 직접 연결하는 경우 백엔드에서 프론트엔드 origin을 허용해야 합니다. 로컬 개발에서는 기본 Vite proxy를 사용하면 브라우저의 교차 origin 요청을 피할 수 있습니다.
- **401 또는 로그인 직후 로그아웃:** `Authorization: Bearer ...` 전달과 서버 토큰 형식/만료를 확인합니다. 현재 토큰 갱신 API는 연결되어 있지 않습니다.
- **WebSocket 연결 실패:** `VITE_WS_URL`, `/ws` 경로, HTTP와 HTTPS에 맞는 `ws://` 또는 `wss://`, STOMP CONNECT 인증 헤더 지원 여부를 확인합니다.
- **응답을 불러오지 못함:** 서버가 공통 응답 envelope과 프론트 타입에 맞는 필드 및 enum을 반환하는지 확인합니다.

## 목업으로 화면 확인

`.env.example` 값을 `.env.local`에 적용하고 Vite를 재시작하면 MSW가 REST와 WebSocket 요청을 가로채 화면을 확인할 수 있습니다. 목업 테스트 계정은 `session.test@kiiwee.app` / `kiiwee1234`, 이메일 인증 코드는 `123456`입니다. 이 계정과 코드는 로컬 목업 전용이며 실제 백엔드 인증 정보가 아닙니다.

## 주요 파일

- `src/features/api/client.ts`: REST 공통 클라이언트, envelope 및 인증 오류 처리
- `src/features/auth/session.ts`: 브라우저 토큰 저장·복원
- `src/features/signup/api.ts`: 이메일 인증, 가입, 로그인
- `src/features/members/api.ts`: 내 회원 정보
- `src/features/sessions/api.ts`, `types.ts`: 세션 REST API와 DTO
- `src/features/wallet/api.ts`: 보석 잔액·거래 내역
- `src/features/payments/kakaopay.ts`: 카카오페이 결제 준비·승인·주문 API 계약
- `src/pages/Store/PaymentResult.tsx`: 결제 성공·취소·실패 callback 화면
- `src/features/live/stomp.ts`: STOMP 실시간 연결과 메시지 계약
- `src/mocks/handlers.js`: 개발용 REST·WebSocket 목업
- `vite.config.ts`: 로컬 백엔드 REST proxy
- `fromBackend/`: 백엔드 API·WebSocket 명세 원본 (프로젝트 상위 폴더)

## 유용한 명령

```powershell
npm run dev
npm run build
npm run lint
```

`npm run build`는 TypeScript 검사와 배포용 빌드를 수행합니다. `npm run lint`는 정적 코드 검사를 실행합니다.

