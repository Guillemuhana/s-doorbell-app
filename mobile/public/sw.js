// Service worker de S-Doorbell (PWA).
//
// Regla de oro: NUNCA cachear la API. Un timbre que muestra datos viejos es
// peor que uno que no muestra nada. Solo cacheamos el shell estático.
const VERSION = 'sdoorbell-v2';
const SHELL = ['/', '/index.html', '/manifest.json', '/icons/pwa-192.png', '/icons/pwa-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      // addAll es atómico: si un archivo falla, no se instala nada. Toleramos
      // fallos individuales para no romper la instalación por un ícono.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Cualquier cosa que no sea de nuestro origen (la API vive en otro host) va
  // directo a la red, sin tocar el cache.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navegaciones: red primero (para tomar deploys nuevos), cache como respaldo
  // offline. Sin esto, el usuario queda clavado en la versión instalada.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Estáticos (JS/fonts/imágenes con hash en el nombre): cache primero.
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(request, copy));
        }
        return res;
      });
    })
  );
});

// ─── Web Push ────────────────────────────────────────────────────────────────
// Llega un timbrazo aunque la app esté cerrada. En iOS el sonido es el del
// sistema (Apple no permite sonido propio en PWA); en Android puede sonar el
// canal. Requiere que el PWA esté agregado a la pantalla de inicio.
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) { payload = {}; }
  const title = payload.title || '🔔 ¡Timbre!';
  const body = payload.body || 'Alguien está en tu puerta';
  const data = payload.data || {};

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/pwa-192.png',
      badge: '/icons/pwa-192.png',
      // Vibración (donde el navegador la respete) para reforzar el aviso.
      vibrate: [200, 100, 200, 100, 200],
      tag: 'doorbell-ring',
      renotify: true,
      requireInteraction: true,
      data,
    })
  );
});

// Al tocar la notificación: enfocar la app si está abierta, o abrirla.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientes) => {
      for (const c of clientes) {
        if ('focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
