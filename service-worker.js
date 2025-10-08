const CACHE_NAME = 'crm-zenir-cache-v3'; // Versão incrementada para forçar a atualização
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-512x512.png'
];

// Instala o Service Worker e armazena os assets no cache
self.addEventListener('install', event => {
  self.skipWaiting(); // Força a ativação do novo Service Worker
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativa o Service Worker e limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      ).then(() => self.clients.claim()); // Assume o controle da página imediatamente
    })
  );
});

// Intercepta as requisições: tenta buscar na rede, se falhar, busca no cache
self.addEventListener('fetch', event => {
    // Ignora requisições que não são GET (ex: POST para o Firebase)
    if (event.request.method !== 'GET') {
        return;
    }
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

