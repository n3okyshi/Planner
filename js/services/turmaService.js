import { firebaseService } from '../firebase-service.js';

export const turmaService = {
    async saveTurma(uid, turma) {
        if (!uid || !firebaseService?.saveTurma) return false;
        await firebaseService.saveTurma(uid, turma);
        return true;
    },
    async deleteTurma(uid, turmaId) {
        if (!uid || !firebaseService?.deleteTurma) return false;
        await firebaseService.deleteTurma(uid, turmaId);
        return true;
    },
    async saveAluno(uid, turmaId, aluno) {
        if (!uid || !firebaseService?.saveAluno) return false;
        await firebaseService.saveAluno(uid, turmaId, aluno);
        return true;
    },
    async deleteAluno(uid, turmaId, alunoId) {
        if (!uid || !firebaseService?.deleteAluno) return false;
        await firebaseService.deleteAluno(uid, turmaId, alunoId);
        return true;
    },
    async saveAvaliacao(uid, turmaId, avaliacao) {
        if (!uid || !firebaseService?.saveAvaliacao) return false;
        await firebaseService.saveAvaliacao(uid, turmaId, avaliacao);
        return true;
    },
    async deleteAvaliacao(uid, turmaId, avId) {
        if (!uid || !firebaseService?.deleteAvaliacao) return false;
        await firebaseService.deleteAvaliacao(uid, turmaId, avId);
        return true;
    },
    async saveFrequenciaAluno(uid, turmaId, alunoId, map) {
        if (!uid || !firebaseService?.saveFrequenciaAluno) return false;
        await firebaseService.saveFrequenciaAluno(uid, turmaId, alunoId, map);
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.turmaService = turmaService;
}
