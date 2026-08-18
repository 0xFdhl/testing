const DEFAULT_URL = "/admin/orders";

function orderTag(orderId) {
  if (orderId) return `order-${orderId}`;
  return `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {
    title: "Notification",
    body: "",
    icon: "/icons/icon-192.png",
    url: DEFAULT_URL,
    orderId: null,
  };
  try {
    data = { ...data, ...(event.data ? event.data.json() : {}) };
  } catch {
    // malformed payload — use defaults
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.icon,
      tag: orderTag(data.orderId),
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? DEFAULT_URL;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client && client.url !== url) {
            client.navigate(url);
          }
          return;
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
