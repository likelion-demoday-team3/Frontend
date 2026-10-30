import { useCallback, useEffect, useState } from "react";
import { getAccessToken } from "../../features/auth/session";
import { getUnreadNotificationCount } from "../../features/notifications/api";

const UNREAD_POLL_MS = 60_000;

/**
 * 알림함의 안 읽은 개수. 로그인 상태에서만 1분마다, 그리고 창으로 돌아올 때 다시 확인한다.
 * 실패해도 벨은 그대로 쓸 수 있어야 하므로 0으로 둔다.
 */
export function useUnreadNotificationCount(enabled: boolean) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!enabled || !getAccessToken()) {
      setCount(0);
      return;
    }
    getUnreadNotificationCount()
      .then((result) => setCount(result.count))
      .catch(() => setCount(0));
  }, [enabled]);

  useEffect(() => {
    refresh();
    if (!enabled) return;
    const interval = window.setInterval(refresh, UNREAD_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, refresh]);

  return { count, refresh };
}
