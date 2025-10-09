const CACHE_NAME = 'crm-zenir-v4'; // MUITO IMPORTANTE: Versão do cache alterada para v4
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './assets/icons/icon-192x192.png', // Garante que o novo ícone seja salvo
  './assets/icons/icon-512x512.png', // Garante que o novo ícone seja salvo
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Evento de Instalação: Salva os arquivos essenciais no cache.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de Ativação: Limpa os caches antigos.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Se o cache encontrado não estiver na lista de caches permitidos (apenas o v4), ele será deletado.
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Evento Fetch: Intercepta as requisições e serve os arquivos do cache se estiverem disponíveis.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se a resposta for encontrada no cache, retorna ela.
        if (response) {
          return response;
        }
        // Caso contrário, faz a requisição à rede.
        return fetch(event.request);
      })
  );
});
