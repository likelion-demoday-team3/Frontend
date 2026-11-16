// Kiiwee 서비스 워커: 웹 푸시 알림만 담당한다 (오프라인 캐시는 하지 않는다).
// 서버가 보내는 내용: { notificationId, type, title, body, link }

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Kiiwee";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/iconImg.svg",
      // 같은 알림이 두 번 오면 하나로 합친다
      tag: data.notificationId ? `notification-${data.notificationId}` : undefined,
      data: { link: data.link || "/home" },
    }),
  );
});

// 알림을 누르면 열려 있는 Kiiwee 창으로 이동하고, 없으면 새 창을 연다
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data && event.notification.data.link) || "/home",
    self.location.origin,
  ).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        try {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        } catch {
          // 이동하지 못하면 새 창을 연다
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
