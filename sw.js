// sw.js — SERVICE WORKER: hace la app instalable y offline
// ¿Que es? Un script que el navegador instala en segundo plano.
// Intercepta las peticiones (fetch) y sirve copia guardada si no hay internet.
// Ciclo de vida: install (guardar) -> activate (limpiar viejo) -> fetch (servir).

// Nombre del "cajon" de cache. Cambialo si cambias archivos para forzar actualizacion.
const CACHE = 'asistencia-v3';

// Archivos imprescindibles para abrir la app sin internet.
// OJO: js/*.js los genera "npx tsc", deben existir antes de instalar.
const FILES = ['./', './index.html', './manifest.json', './logo.png', './js/app.js', './js/store.js', './js/types.js', './js/dates.js'];

// INSTALL: se ejecuta UNA vez al instalar/actualizar. Guarda FILES en cache.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting())
  );
});

// ACTIVATE: limpia caches viejos (ej: asistencia-v1) para no ocupar espacio.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// FETCH: por cada peticion (html, js, imagen...):
// 1. Intenta cache primero (rapido + offline).
// 2. Si no esta, va a red y guarda copia para la proxima.
// 3. Si no hay red ni cache, falla silencioso.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return res;
      }).catch(() => cached);
    })
  );
});
