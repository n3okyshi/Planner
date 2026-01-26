const CACHE_NAME = 'planner-pro-docente-v1.4'; // Versão atualizada
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/final.css', // Atualizado de style.css para final.css
    './manifest.json',
    
    // LÓGICA CORE
    './js/controller.js',
    './js/model.js',
    './js/firebase-service.js',

    // COMPONENTES
    './js/components/toast.js',

    // SUB-CONTROLLERS (NOVA ESTRUTURA)
    './js/controllers/authController.js',
    './js/controllers/uiController.js',
    './js/controllers/turmaController.js',
    './js/controllers/planejamentoController.js',

    // VIEWS (TODAS AS ATUAIS)
    './js/views/dashboard.js',
    './js/views/horario.js',
    './js/views/calendario.js',
    './js/views/mensal.js',
    './js/views/planejamento.js',
    './js/views/diario.js',
    './js/views/turmas.js',
    './js/views/sala.js',
    './js/views/bncc.js',
    './js/views/provas.js',
    './js/views/estatisticas-provas.js',
    './js/views/frequencia.js',
    './js/views/settings.js',

    // BIBLIOTECAS EXTERNAS (CDN) - Garante funcionamento offline das fórmulas e ícones
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
    'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js',
    'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js',

    // DADOS DO BANCO DE QUESTÕES (SISTEMA)
    './assets/data/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Cache atualizado com sucesso');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                // Remove caches antigos para liberar espaço e evitar conflitos
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removendo cache antigo:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Ignora requisições para o Firebase (precisam ser em tempo real)
    if (event.request.url.includes('firebase') || event.request.url.includes('googleapis')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            // Retorna o cache se encontrar, senão busca na rede
            return response || fetch(event.request);
        })
    );
});