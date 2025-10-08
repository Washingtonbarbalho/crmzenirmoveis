const CACHE_NAME = 'crm-zenir-cache-v2'; // Mudei a versão para forçar a atualização
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-512x512.png',
  'https://cdn.tailwindcss.com/',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap'
];

// Evento de Instalação: Salva os arquivos no cache
self.addEventListener('install', event => {
  self.skipWaiting(); // Força o novo service worker a ativar
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache).catch(error => {
            console.error('Falha ao adicionar arquivos ao cache:', error);
        });
      })
  );
});

// Evento de Ativação: Limpa caches antigos
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
      ).then(() => {
          // Força o controle da página imediatamente
          return self.clients.claim();
      });
    })
  );
});

// Evento de Fetch: Intercepta as requisições
// Tenta buscar na rede primeiro, se falhar, busca no cache (estratégia Network First).
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then(response => {
        if (response) {
          return response;
        }
      });
    })
  );
});

