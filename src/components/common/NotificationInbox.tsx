import { useEffect, useState } from "react";
import styled from "styled-components";
import { getAccessToken } from "../../features/auth/session";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type InboxNotification,
} from "../../features/notifications/api";

const timeLabel = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

function navigate(link: string) {
  window.history.pushState(null, "", link);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

type NotificationInboxProps = {
  // 알림을 눌러 다른 화면으로 이동하기 전에 알림함을 닫는다
  onNavigate: () => void;
  // 읽음 처리 후 벨의 안 읽은 개수를 다시 확인한다
  onReadChange: () => void;
};

/** 세션 진행·취소, 연락처 교환 알림 목록 (백엔드 알림함) */
export default function NotificationInbox({
  onNavigate,
  onReadChange,
}: NotificationInboxProps) {
  const loggedIn = Boolean(getAccessToken());
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(loggedIn);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loggedIn) return;
    let active = true;
    getNotifications()
      .then((result) => {
        if (active) setItems(result.items);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "알림을 불러오지 못했어요.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loggedIn]);

  async function open(item: InboxNotification) {
    if (!item.read) {
      setItems((current) =>
        current.map((value) =>
          value.id === item.id ? { ...value, read: true } : value,
        ),
      );
      try {
        await markNotificationRead(item.id);
      } catch {
        // 읽음 처리에 실패해도 이동은 막지 않는다
      }
      onReadChange();
    }
    if (item.link) {
      onNavigate();
      navigate(item.link);
    }
  }

  async function readAll() {
    setItems((current) => current.map((value) => ({ ...value, read: true })));
    try {
      await markAllNotificationsRead();
    } finally {
      onReadChange();
    }
  }

  if (!loggedIn) return <InboxEmpty>로그인하면 알림을 확인할 수 있어요.</InboxEmpty>;
  if (loading) return <InboxEmpty>알림을 불러오는 중이에요…</InboxEmpty>;
  if (error) return <InboxEmpty role="alert">{error}</InboxEmpty>;
  if (!items.length) return <InboxEmpty>도착한 알림이 없습니다.</InboxEmpty>;

  return (
    <InboxList>
      {items.some((item) => !item.read) && (
        <button type="button" className="read-all" onClick={() => void readAll()}>
          모두 읽음
        </button>
      )}
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={item.read ? "inbox-item" : "inbox-item unread"}
              onClick={() => void open(item)}
            >
              <strong>{item.title}</strong>
              <span>{item.body}</span>
              <time dateTime={item.createdAt}>{timeLabel(item.createdAt)}</time>
            </button>
          </li>
        ))}
      </ul>
    </InboxList>
  );
}

const InboxEmpty = styled.p`
  margin-top: 1.2rem;
  color: var(--text-secondary);
  font-size: 1.3rem;
  line-height: 1.6;
`;

const InboxList = styled.div`
  margin-top: 1.2rem;

  .read-all {
    display: block;
    margin: 0 0 0.8rem auto;
    padding: 0.4rem 0.8rem;
    border: 0;
    background: transparent;
    color: #6f7a70;
    font: 500 1.2rem var(--font-body);
    cursor: pointer;
  }
  ul {
    display: grid;
    gap: 0.8rem;
    max-height: min(50dvh, 40rem);
    overflow-y: auto;
    list-style: none;
  }
  .inbox-item {
    display: grid;
    gap: 0.4rem;
    width: 100%;
    padding: 1.2rem 1.4rem;
    border: 0.1rem solid #e3e8df;
    border-radius: 1.4rem;
    background: var(--white);
    color: var(--ink);
    text-align: left;
    font-family: var(--font-body);
    cursor: pointer;
  }
  .inbox-item.unread {
    border-color: var(--ink);
    background: #eff8d7;
  }
  .inbox-item strong {
    font-size: 1.35rem;
    font-weight: 700;
  }
  .inbox-item span {
    font-size: 1.25rem;
    line-height: 1.55;
    color: #4f5a52;
  }
  .inbox-item time {
    font-size: 1.1rem;
    color: #8b959b;
  }
`;
