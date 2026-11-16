import { apiRequest } from '../api/client'

// 웹 푸시: 앱을 닫아도 연락처 요청·세션 확정/취소 같은 알림을 기기 알림으로 받는다.
// 아이폰·아이패드는 Safari에서 "홈 화면에 추가"한 Kiiwee 앱에서만 받을 수 있다 (iOS 16.4+).

type PushConfig = { enabled: boolean; publicKey: string | null }

export type PushSupport =
  | 'supported'
  /** 아이폰에서 홈 화면에 추가하지 않고 Safari로 연 경우 */
  | 'ios-needs-install'
  | 'unsupported'

export type PushState = {
  support: PushSupport
  /** 서버에서 웹 푸시를 켰는지 (VAPID 키가 있는지) */
  serverEnabled: boolean
  permission: NotificationPermission | 'unsupported'
  /** 이 기기가 지금 구독 중인지 */
  subscribed: boolean
}

const SW_URL = '/sw.js'

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export function pushSupport(): PushSupport {
  const hasApis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (isIos() && !isStandalone()) return 'ios-needs-install'
  return hasApis ? 'supported' : 'unsupported'
}

/** 앱을 시작할 때 서비스 워커를 등록한다 (푸시를 받으려면 필요) */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(SW_URL).catch(() => undefined)
  })
}

const getConfig = () => apiRequest<PushConfig>('/push/config', { authenticated: false })

async function currentSubscription() {
  if (!('serviceWorker' in navigator)) return null
  const registration = await navigator.serviceWorker.getRegistration(SW_URL)
  return (await registration?.pushManager.getSubscription()) ?? null
}

export async function getPushState(): Promise<PushState> {
  const support = pushSupport()
  const config = await getConfig().catch(() => ({ enabled: false, publicKey: null }))
  if (support !== 'supported') {
    return { support, serverEnabled: config.enabled, permission: 'unsupported', subscribed: false }
  }
  return {
    support,
    serverEnabled: config.enabled,
    permission: Notification.permission,
    subscribed: Boolean(await currentSubscription().catch(() => null)),
  }
}

function toUint8Array(base64Url: string) {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

async function saveOnServer(subscription: PushSubscription) {
  const json = subscription.toJSON()
  await apiRequest<null>('/push/subscriptions', {
    method: 'POST',
    body: { endpoint: json.endpoint, keys: json.keys },
  })
}

/** 알림 권한을 묻고 이 기기를 구독한다. 반드시 버튼 클릭 안에서 부른다 (iOS 요구사항) */
export async function enablePush() {
  if (pushSupport() !== 'supported') throw new Error('이 브라우저에서는 푸시 알림을 받을 수 없어요.')
  // 권한은 클릭 직후 다른 기다림 없이 물어야 한다 (Safari는 서버 응답을 기다린 뒤 물으면 막는다)
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('알림 권한이 꺼져 있어요. 브라우저(또는 휴대폰) 설정에서 Kiiwee 알림을 허용해주세요.')
  }
  const config = await getConfig()
  if (!config.enabled || !config.publicKey) throw new Error('지금은 푸시 알림을 쓸 수 없어요.')

  const registration =
    (await navigator.serviceWorker.getRegistration(SW_URL)) ?? (await navigator.serviceWorker.register(SW_URL))
  await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  // 서버 키가 바뀌었으면 기존 구독은 쓸 수 없으니 새로 만든다
  const key = toUint8Array(config.publicKey)
  const currentKey = subscription?.options.applicationServerKey
  if (subscription && currentKey && !sameBytes(new Uint8Array(currentKey), key)) {
    await subscription.unsubscribe()
    subscription = null
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
  await saveOnServer(subscription)
}

/** 이 기기의 푸시를 끈다. 로그아웃할 때도 부른다 (다음에 로그인하는 사람에게 알림이 가지 않게) */
export async function disablePush() {
  const subscription = await currentSubscription().catch(() => null)
  if (!subscription) return
  await apiRequest<null>('/push/subscriptions/delete', {
    method: 'POST',
    body: { endpoint: subscription.endpoint },
  }).catch(() => undefined)
  await subscription.unsubscribe().catch(() => undefined)
}

/** 로그인한 뒤 이 기기가 이미 구독 중이면 서버에 다시 알려 지금 로그인한 회원으로 맞춘다 */
export async function syncPushSubscription() {
  if (pushSupport() !== 'supported' || Notification.permission !== 'granted') return
  const subscription = await currentSubscription().catch(() => null)
  if (subscription) await saveOnServer(subscription).catch(() => undefined)
}

function sameBytes(a: Uint8Array, b: Uint8Array) {
  return a.length === b.length && a.every((value, index) => value === b[index])
}
