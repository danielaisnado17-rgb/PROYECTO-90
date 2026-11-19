// Service worker mínimo: muestra notificaciones y abre la app al tocarlas.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow("/");
    }),
  );
});
// Preparado para Web Push (ver README): muestra el payload recibido.
self.addEventListener("push", (event) => {
  let data = { title: "Project 90", body: "" };
  try { data = event.data.json(); } catch {}
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "/icon-192.png" }));
});
