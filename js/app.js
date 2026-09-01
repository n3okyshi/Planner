import { model } from './model.js';
import { firebaseService } from './firebase-service.js';
import { controller } from './controller.js';
import { syncService } from './services/syncService.js';

export const app = {
    initialized: false,
    boot() {
        if (this.initialized) return;
        this.initialized = true;
        console.log('[Planner] bootstrapping application shell');

        if (model && typeof model.init === 'function') {
            model.init();
        } else {
            console.warn('[Planner] Model não possui init() válido.');
        }

        if (typeof firebaseService !== 'undefined' && firebaseService.init) {
            firebaseService.init();
        } else {
            console.warn('[Planner] Firebase service indisponível no bootstrap.');
        }

        if (syncService && typeof syncService.init === 'function') {
            syncService.init();
        }

        if (controller && typeof controller.init === 'function') {
            controller.init();
        } else {
            console.warn('[Planner] Controller não possui init() válido.');
        }

        if (typeof window !== 'undefined') {
            window.controller = controller;

            // Detecta se o usuário entrou direto com uma hash (ex: #quiz-entrar?pin=123456)
            const hash = window.location.hash.replace(/^#/, '');
            let rotaInicial = 'dashboard';

            if (hash) {
                const rotaSemQuery = hash.split('?')[0];
                if (rotaSemQuery) {
                    rotaInicial = rotaSemQuery;
                }
            }

            window.controller.currentView = rotaInicial;
            controller.navigate(rotaInicial);

            // Ouvinte de mudança de hash na barra de endereço
            window.addEventListener('hashchange', () => {
                const novaHash = window.location.hash.replace(/^#/, '');
                if (novaHash) {
                    const novaRota = novaHash.split('?')[0];
                    if (novaRota && novaRota !== controller.currentView) {
                        controller.navigate(novaRota);
                    }
                }
            });

            // Registro transparente do Service Worker para PWA Offline-First
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./sw.js').then((reg) => {
                    console.log('[PWA] Service Worker ativo:', reg.scope);
                }).catch((err) => {
                    console.warn('[PWA] Falha ao registrar Service Worker:', err);
                });
            }
        }
    }
};

if (typeof window !== 'undefined') {
    window.app = app;
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', () => {
            app.boot();
        });
    } else {
        app.boot();
    }
}
