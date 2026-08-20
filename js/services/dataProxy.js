/**
 * @file dataProxy.js
 * @description Proxy centralizado de dados (DataProxy) que encapsula e despacha operações
 * para o firebaseService e storageService com fallback transparente.
 * @module services/dataProxy
 */

import { firebaseService } from '../firebase-service.js';
import { storageService } from './storageService.js';

export const dataProxy = new Proxy({}, {
    get(target, prop) {
        if (prop in target) {
            return target[prop];
        }
        if (firebaseService && typeof firebaseService[prop] === 'function') {
            return firebaseService[prop].bind(firebaseService);
        }
        if (storageService && typeof storageService[prop] === 'function') {
            return storageService[prop].bind(storageService);
        }
        return undefined;
    }
});

if (typeof window !== 'undefined') {
    window.dataProxy = dataProxy;
    window.authService = dataProxy;
    window.planejamentoService = dataProxy;
    window.provaService = dataProxy;
    window.turmaService = dataProxy;
}
