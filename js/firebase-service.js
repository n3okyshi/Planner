
import { firebaseConfig } from './config.js';
export const firebaseService = {
    auth: null,
    db: null,
    functions: null,
    init() {
        if (typeof firebase === 'undefined') {
            console.error("ERRO: Firebase SDK não carregado.");
            return;
        }
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.functions = firebase.functions();
        this.db.enablePersistence({ synchronizeTabs: true })
            .catch(err => {
                if (err.code === 'failed-precondition') {
                    console.warn("Persistência falhou: Múltiplas abas abertas sem suporte.");
                } else if (err.code === 'unimplemented') {
                    console.warn("Persistência falhou: Navegador não suporta.");
                } else {
                    console.warn("Erro na persistência:", err);
                }
            });
        console.log("Firebase Service (Granular v2) inicializado com Comunidade.");
    },
    onAuthStateChanged(callback) {
        if (this.auth) this.auth.onAuthStateChanged(callback);
    },
    async loginGoogle() {
        if (!this.auth) return;
        const provider = new firebase.auth.GoogleAuthProvider();

        try {
            await this.auth.signInWithPopup(provider);
        } catch (error) {
            console.warn("Falha no signInWithPopup. Detalhe:", error.code);

            if (error.code === 'auth/popup-closed-by-user' ||
                error.code === 'auth/popup-blocked' ||
                error.code === 'auth/cancelled-popup-request') {

                console.log("Iniciando fallback para redirecionamento...");
                await this.auth.signInWithRedirect(provider);
            } else {
                console.error("Erro fatal no login:", error);
                if (window.Toast && window.Toast.show) {
                    window.Toast.show("Erro ao conectar: " + error.message, "error");
                } else {
                    alert("Erro ao conectar: " + error.message);
                }
            }
        }
    },
    async logout() {
        if (this.auth) await this.auth.signOut();
        window.location.reload();
    },
    async loadFullData(uid) {
        if (!uid || !this.db) return null;
        const fullState = {
            userConfig: {},
            turmas: [],
            eventos: {},
            questoes: [],
            planosDiarios: {},
            horario: { config: {}, grade: {} }
        };
        try {
            const docRef = this.db.collection('professores').doc(uid);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                const data = docSnap.data();
                if (data.plannerData) {
                    console.log("⚠️ Detectado formato antigo. Migrando dados...");
                    return await this.migrateOldData(uid, data.plannerData);
                }
                fullState.userConfig = data.userConfig || {};
                fullState.eventos = data.eventos || {};
                fullState.questoes = data.questoes || [];
                fullState.planosDiarios = data.planosDiarios || {};
                fullState.lastUpdate = data.lastUpdate || new Date(0).toISOString();
                fullState.horario = data.horario || { config: {}, grade: {} };
                fullState.materiaisGerados = data.materiaisGerados || [];
                fullState.quizzes = data.quizzes || [];
            }
            const turmasSnap = await docRef.collection('turmas').get();
            const turmasPromises = turmasSnap.docs.map(async (turmaDoc) => {
                const turmaData = {
                    ...turmaDoc.data(),
                    id: turmaDoc.id
                };
                const [alunosSnap, avSnap] = await Promise.all([
                    turmaDoc.ref.collection('alunos').get(),
                    turmaDoc.ref.collection('avaliacoes').get()
                ]);
                turmaData.alunos = alunosSnap.docs.map(alunoDoc => ({
                    ...alunoDoc.data(),
                    id: alunoDoc.id
                }));
                turmaData.avaliacoes = avSnap.docs.map(avDoc => ({
                    ...avDoc.data(),
                    id: avDoc.id
                }));
                return turmaData;
            });
            fullState.turmas = await Promise.all(turmasPromises);
            fullState.turmas.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
            return fullState;
        } catch (e) {
            console.error("Erro ao carregar dados granulares:", e);
            throw e;
        }
    },
    async saveRoot(uid, data) {
        if (!uid) return;
        const { turmas, ...rootData } = data;
        await this.db.collection('professores').doc(uid).set(rootData, { merge: true });
    },
    async saveHorarioOnly(uid, horarioData) {
        if (!uid) return;
        await this.db.collection('professores').doc(uid).update({
            horario: horarioData,
            lastUpdate: new Date().toISOString()
        });
    },
    subscribeToUserChanges(uid, callback) {
        if (!uid || !this.db) return;
        return this.db.collection('professores').doc(uid)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    callback(doc.data());
                }
            }, (error) => {
                console.error("Erro no listener em tempo real:", error);
            });
    },

    async saveTurma(uid, turma) {
        if (!uid) return;
        const { alunos, avaliacoes, ...turmaData } = turma;
        const cleanData = JSON.parse(JSON.stringify(turmaData));
        await this.db.collection('professores').doc(uid)
            .collection('turmas').doc(String(turma.id))
            .set(cleanData, { merge: true });
    },
    async deleteTurma(uid, turmaId) {
        if (!uid) return;
        await this.db.collection('professores').doc(uid)
            .collection('turmas').doc(String(turmaId)).delete();
    },

    async saveAluno(uid, turmaId, aluno) {
        if (!uid) return;
        const cleanAluno = JSON.parse(JSON.stringify(aluno));
        await this.db.collection('professores').doc(uid)
            .collection('turmas').doc(String(turmaId))
            .collection('alunos').doc(String(aluno.id))
            .set(cleanAluno, { merge: true });
    },
    async deleteAluno(uid, turmaId, alunoId) {
        if (!uid) return;
        await this.db.collection('professores').doc(uid)
            .collection('turmas').doc(String(turmaId))
            .collection('alunos').doc(String(alunoId)).delete();
    },
    async saveFrequenciaAluno(uid, turmaId, alunoId, frequenciaMap) {
        if (!uid) return;
        await this.db.collection('professores').doc(uid)
            .collection('turmas').doc(String(turmaId))
            .collection('alunos').doc(String(alunoId))
            .update({ frequencia: frequenciaMap })
            .catch(async (err) => {
                if (err.code === 'not-found') {
                    await this.db.collection('professores').doc(uid)
                        .collection('turmas').doc(String(turmaId))
                        .collection('alunos').doc(String(alunoId))
                        .set({ frequencia: frequenciaMap }, { merge: true });
                } else {
                    console.error("Erro ao salvar frequencia:", err);
                }
            });
    },

    async saveAvaliacao(uid, turmaId, avaliacao) {
        if (!uid) return;
        await this.db.collection('professores').doc(uid)
            .collection('turmas').doc(String(turmaId))
            .collection('avaliacoes').doc(String(avaliacao.id)).set(avaliacao, { merge: true });
    },
    async deleteAvaliacao(uid, turmaId, avId) {
        if (!uid) return;
        await this.db.collection('professores').doc(uid)
            .collection('turmas').doc(String(turmaId))
            .collection('avaliacoes').doc(String(avId)).delete();
    },
    async migrateOldData(uid, jsonString) {
        try {
            const oldState = JSON.parse(jsonString);
            console.log("Iniciando migração...");
            await this.saveRoot(uid, {
                userConfig: oldState.userConfig || {},
                eventos: oldState.eventos || {},
                questoes: oldState.questoes || [],
                planosDiarios: oldState.planosDiarios || {},
                materiaisGerados: oldState.materiaisGerados || [],
                quizzes: oldState.quizzes || [],
                migratedAt: new Date().toISOString()
            });
            if (oldState.turmas && Array.isArray(oldState.turmas)) {
                for (const turma of oldState.turmas) {
                    await this.saveTurma(uid, turma);
                    if (turma.alunos) {
                        for (const aluno of turma.alunos) {
                            await this.saveAluno(uid, turma.id, aluno);
                        }
                    }
                    if (turma.avaliacoes) {
                        for (const av of turma.avaliacoes) {
                            await this.saveAvaliacao(uid, turma.id, av);
                        }
                    }
                }
            }
            await this.db.collection('professores').doc(uid).update({
                plannerData: firebase.firestore.FieldValue.delete()
            });
            console.log("Migração concluída com sucesso!");
            return await this.loadFullData(uid);
        } catch (e) {
            console.error("Erro na migração:", e);
            return null;
        }
    },

    async getQuestoesComunidade(materia = '') {
        let ref = this.db.collection('comunidade_questoes');
        if (materia) ref = ref.where('materia', '==', materia);
        const snapshot = await ref.orderBy('data_partilha', 'desc').limit(50).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    async removerQuestaoComunidade(uid, questaoIdLocal) {
        const snapshot = await this.db.collection('comunidade_questoes')
            .where('uid_autor', '==', uid)
            .where('id_local_origem', '==', String(questaoIdLocal))
            .get();
        if (snapshot.empty) return;
        const batch = this.db.batch();
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        return batch.commit();
    },
    async verificarDuplicataComunidade(enunciado) {
        try {
            const snapshot = await this.db.collection('comunidade_questoes')
                .where('enunciado', '==', enunciado)
                .limit(1)
                .get();
            return !snapshot.empty;
        } catch (e) {
            console.error("Erro ao verificar duplicata:", e);
            return false;
        }
    },
    async publicarQuestaoComunidade(dadosQuestao) {
        try {
            return await this.db.collection('comunidade_questoes').add(dadosQuestao);
        } catch (e) {
            console.error("Erro no Firestore ao publicar:", e);
            throw e;
        }
    }
};
if (typeof window !== 'undefined') {
    window.firebaseService = firebaseService;
}
firebaseService.init();