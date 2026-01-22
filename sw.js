const CACHE_NAME = 'planner-docente-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/style.css',
    './js/controller.js',
    './js/model.js',
    './js/firebase-service.js',
    './js/views/bncc.js',
    './js/views/calendario.js',
    './js/views/diario.js',
    './js/views/mensal.js',
    './js/views/planejamento.js',
    './js/views/provas.js',
    './js/views/sala.js',
    './js/views/settings.js',
    './js/views/turmas.js',
    // Bibliotecas externas (CDN) - Opcional: Cachear para garantir offline total
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    // Dados estáticos
    './assets/BNCC/bncc_infantil.json',
    './assets/BNCC/bncc_fundamental.json',
    './assets/BNCC/bncc_medio.json'
];
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching app shell');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
});
self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('firebase') || event.request.url.includes('googleapis')) {
        return;
    }
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});