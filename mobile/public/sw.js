// Service worker de S-Doorbell (PWA).
//
// Regla de oro: NUNCA cachear la API. Un timbre que muestra datos viejos es
// peor que uno que no muestra nada. Solo cacheamos el shell estático.
const VERSION = 'sdoorbell-v1';
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
