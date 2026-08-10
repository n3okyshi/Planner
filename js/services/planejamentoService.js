import { firebaseService } from '../firebase-service.js';

export const planejamentoService = {
    async saveTurma(uid, turma) {
        if (!uid || !firebaseService?.saveTurma) return false;
        await firebaseService.saveTurma(uid, turma);
        return true;
    },
    async savePlanoDiario(uid, payload) {
        if (!uid || !firebaseService?.saveRoot) return false;
        const data = { planosDiarios: payload };
        await firebaseService.saveRoot(uid, data);
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.planejamentoService = planejamentoService;
}
