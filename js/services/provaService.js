import { firebaseService } from '../firebase-service.js';

export const provaService = {
    async verificarDuplicataComunidade(enunciado) {
        if (!firebaseService?.verificarDuplicataComunidade) return false;
        return firebaseService.verificarDuplicataComunidade(enunciado);
    },
    async publicarQuestaoComunidade(payload) {
        if (!firebaseService?.publicarQuestaoComunidade) return false;
        return firebaseService.publicarQuestaoComunidade(payload);
    },
    async removerQuestaoComunidade(uid, questaoIdLocal) {
        if (!firebaseService?.removerQuestaoComunidade) return false;
        return firebaseService.removerQuestaoComunidade(uid, questaoIdLocal);
    }
};

if (typeof window !== 'undefined') {
    window.provaService = provaService;
}
