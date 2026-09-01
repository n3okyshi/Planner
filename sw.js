const CACHE_NAME = 'planner-pro-docente-v2.6';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './aluno.html',
    './css/variables.css',
    './css/base.css',
    './css/layout.css',
    './css/components.css',
    './manifest.json',

    './js/app.js',
    './js/router.js',
    './js/controller.js',
    './js/model.js',
    './js/firebase-service.js',
    './js/ai-service.js',
    './js/config.js',
    './js/utils.js',
    './js/reactive.js',

    './js/components/toast.js',
    './js/components/modal.js',
    './js/components/paginator.js',
    './js/components/filterBar.js',
    './js/components/card.js',
    './js/components/editorToolbar.js',
    './js/utils/eventDelegator.js',
    './js/utils/imageHelper.js',
    './js/utils/tableHelper.js',

    './js/models/apresentacaoModel.js',
    './js/models/planejamentoModel.js',
    './js/models/provaModel.js',
    './js/models/state.js',
    './js/models/turmaModel.js',

    './js/services/viewRegistry.js',
    './js/services/storageService.js',
    './js/services/syncService.js',
    './js/services/dataProxy.js',
    './js/services/attendanceCalculatorService.js',
    './js/services/gradeCalculatorService.js',
    './js/services/pptxParserService.js',

    './js/controllers/authController.js',
    './js/controllers/uiController.js',
    './js/controllers/turmaController.js',
    './js/controllers/planejamentoController.js',
    './js/controllers/apresentacaoController.js',
    './js/controllers/commandPaletteController.js',
    './js/controllers/notificationController.js',

    './js/views/dashboard.js',
    './js/views/notasAnuais.js',
    './js/views/ataConselho.js',
    './js/views/criarMaterial.js',
    './js/views/biblioteca.js',
    './js/views/quizGestor.js',
    './js/views/quizPlayer.js',
    './js/views/quizAluno.js',
    './js/views/conteudoGerado.js',
    './js/views/correcaoAutomatica.js',
    './js/views/simuladores.js',
    './js/views/estudosVisuais.js',
    './js/views/horario.js',
    './js/views/calendario.js',
    './js/views/mensal.js',
    './js/views/planejamento.js',
    './js/views/diario.js',
    './js/views/turmas.js',
    './js/views/sala.js',
    './js/views/bncc.js',
    './js/views/bimestralizacao.js',
    './js/views/provas.js',
    './js/views/comunidade.js',
    './js/views/estatisticasProva.js',
    './js/views/frequencia.js',
    './js/views/settings.js',
    './js/views/apresentacoes.js',
    './js/views/apresentadorPlayer.js',
    './js/views/coordenacao.js',
    './js/views/pdi.js',

    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
    'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js',
    'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js'
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
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removendo cache antigo:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // Ignora chamadas dinâmicas do Firebase / Google APIs para evitar interceptação indevida de dados/auth
    if (url.includes('firebase') ||
        url.includes('googleapis') ||
        url.includes('googleusercontent') ||
        url.includes('__/auth/')) {
        return;
    }

    // Estratégia Stale-While-Revalidate: Retorna o cache imediatamente se disponível
    // e atualiza o cache em segundo plano se houver conexão ativa.
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Silencia falhas de rede no modo offline
            });

            return cachedResponse || fetchPromise;
        })
    );
});

// Background Sync API: acionado quando a conexão Wi-Fi/dados móveis é restabelecida
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-offline-operations') {
        console.log('[Service Worker] Background sync acionado:', event.tag);
        event.waitUntil(
            self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({ type: 'PROCESS_OFFLINE_SYNC', timestamp: Date.now() });
                });
            })
        );
    }
});