import { apiRequest } from '../api/client'

// 백엔드 알림함 (GET /notifications). 앱을 닫고 있어도 나중에 확인해야 하는 세션·연락처 알림
export type NotificationType =
  | 'SESSION_CONFIRMED'
  | 'SESSION_CANCELLED_LOW_APPLICANTS'
  | 'SESSION_CANCELLED_BY_ADMIN'
  | 'SESSION_CANCELLED_LOW_ATTENDANCE'
  | 'NO_SHOW'
  // 투표 완료로 보증금 반환. link가 없어 누르면 읽음 처리만 된다
  | 'COMPLETION_REFUND'
  | 'CONTACT_REQUESTED'
  | 'CONTACT_REQUEST_ACCEPTED'
  | 'CONTACT_REQUEST_REJECTED'
  | 'CONTACT_RECEIVED'

export type InboxNotification = {
  id: number
  type: NotificationType
  title: string
  body: string
  sessionId: number | null
  // 눌렀을 때 이동할 프론트 경로 (예: /contact?sessionId=12). 없으면 null
  link: string | null
  createdAt: string
  read: boolean
}

export const getNotifications = (page = 0, size = 20) =>
  apiRequest<{ items: InboxNotification[]; hasNext: boolean }>(`/notifications?page=${page}&size=${size}`)

export const getUnreadNotificationCount = () =>
  apiRequest<{ count: number }>('/notifications/unread-count')

export const markNotificationRead = (notificationId: number) =>
  apiRequest<InboxNotification>(`/notifications/${notificationId}/read`, { method: 'POST' })

export const markAllNotificationsRead = () =>
  apiRequest<{ count: number }>('/notifications/read-all', { method: 'POST' })
