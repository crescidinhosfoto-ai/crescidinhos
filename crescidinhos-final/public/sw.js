const CACHE_NAME = 'crescidinhos-v1';

// Ao instalar, não faz cache de nada — só ativa
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Ao ativar, limpa caches antigos e toma controle imediatamente
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Estratégia: sempre busca na rede primeiro
// Se falhar (offline), tenta cache
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET e requests para APIs externas
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.hostname !== self.location.hostname) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Salva uma cópia no cache
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
