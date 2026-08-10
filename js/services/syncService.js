import { firebaseService } from '../firebase-service.js';

export const syncService = {
    async loadUser(uid) {
        if (!uid || !firebaseService || !firebaseService.loadFullData) return null;
        return firebaseService.loadFullData(uid);
    },
    async persistUser(uid, payload) {
        if (!uid || !firebaseService || !firebaseService.saveRoot) return false;
        await firebaseService.saveRoot(uid, payload);
        return true;
    },
    async persistTurma(uid, turma) {
        if (!uid || !firebaseService || !firebaseService.saveTurma) return false;
        await firebaseService.saveTurma(uid, turma);
        return true;
    },
    async persistAluno(uid, turmaId, aluno) {
        if (!uid || !firebaseService || !firebaseService.saveAluno) return false;
        await firebaseService.saveAluno(uid, turmaId, aluno);
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.syncService = syncService;
}
