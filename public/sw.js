/* Service worker mínimo para que la PWA sea instalable.
   Estrategia: network-first con fallback a caché para las páginas principales. */
const CACHE = "proagenda-v1";
const PRECACHE = ["/", "/icon-192.png", "/icon-512.png", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((m) => m || caches.match("/")))
  );
});


/* ── Notificaciones push ───────────────────────────────────────
   Recibe el recordatorio (enviado por el cron cuando falta 1 día
   para la cita) y lo muestra aunque la app esté cerrada. */
self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { body: e.data ? e.data.text() : "" };
  }
  const title = data.title || "Recordatorio de tu cita";
  const opts = {
    body: data.body || "Tienes una cita mañana. ¡Te esperamos!",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "recordatorio-cita",
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url).catch(() => c.focus());
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
