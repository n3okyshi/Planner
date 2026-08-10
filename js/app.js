import { model } from './model.js';
import { firebaseService } from './firebase-service.js';
import { uiController } from './controllers/uiController.js';
import { authController } from './controllers/authController.js';
import { controller } from './controller.js';

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

        if (controller && typeof controller.init === 'function') {
            controller.init();
        } else {
            console.warn('[Planner] Controller não possui init() válido.');
        }

        if (typeof window !== 'undefined') {
            window.controller = controller;
            window.controller.currentView = 'dashboard';
            controller.navigate('dashboard');
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
