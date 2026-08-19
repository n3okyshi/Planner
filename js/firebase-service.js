import { firebaseConfig } from './config.js';
import { generateSecurePIN } from './utils.js';
export const firebaseService = {
    auth: null,
    db: null,
    functions: null,
    initialized: false,
    _activeListeners: new Set(),

    registerListener(unsub) {
        if (typeof unsub === 'function') {
            this._activeListeners.add(unsub);
        }
        return unsub;
    },

    clearActiveListeners() {
        if (this._activeListeners && this._activeListeners.size > 0) {
            this._activeListeners.forEach(unsub => {
                try {
                    if (typeof unsub === 'function') unsub();
                } catch (e) {
                    console.warn("Erro ao desassinar listener Firestore:", e);
                }
            });
            this._activeListeners.clear();
            console.log("🧹 Listeners Firestore em tempo real desassinados com sucesso.");
        }
    },

    init() {
        if (this.initialized) return;
        this.initialized = true;

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
        
        try {
            this.db.enablePersistence({ synchronizeTabs: true })
                .catch(err => {
                    if (err.code == 'failed-precondition') {
                        console.warn("Persistência falhou: Múltiplas abas abertas.");
                    } else if (err.code == 'unimplemented') {
                        console.warn("Navegador não suporta persistência offline.");
                    }
                });
        } catch (e) {
            console.warn("Erro ao configurar persistência:", e);
        }
        console.log("Firebase Service inicializado.");
    },
    onAuthStateChanged(callback) {
        if (this.auth) this.auth.onAuthStateChanged(callback);
    },
    async loginWithGoogle() {
        if (!this.auth) this.init();
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
                console.error("Erro na autenticação:", error);
                const msgAmigavel = "Não foi possível concluir o login com o Google. Verifique sua conexão e tente novamente.";
                if (window.Toast && window.Toast.show) {
                    window.Toast.show(msgAmigavel, "error");
                }
            }
        }
    },
    async loginGoogle() {
        return await this.loginWithGoogle();
    },
    async logout() {
        this.clearActiveListeners();
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
                fullState.apresentacoes = data.apresentacoes || [];
            }
            
            // Busca materiais da subcoleção dedicada
            const materiaisSub = await this.fetchMateriaisDocs(uid);
            if (materiaisSub && materiaisSub.length > 0) {
                const mapa = new Map();
                (fullState.materiaisGerados || []).forEach(m => mapa.set(m.id, m));
                materiaisSub.forEach(m => mapa.set(m.id, m));
                fullState.materiaisGerados = Array.from(mapa.values());
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
        if (!uid || !this.db) return;
        // Omitir materiaisGerados do documento raiz para evitar estourar o limite de 1MB do Firestore
        const { turmas, materiaisGerados, ...rootData } = data;
        let cleanData = JSON.parse(JSON.stringify(rootData));
        await this.db.collection('professores').doc(uid).set(cleanData, { merge: true });
    },
    async saveMaterialDoc(uid, material) {
        if (!uid || !this.db || !material || !material.id) return;
        const cleanMaterial = JSON.parse(JSON.stringify(material));
        await this.db.collection('professores').doc(uid).collection('materiais').doc(String(material.id)).set(cleanMaterial, { merge: true });
    },
    async deleteMaterialDoc(uid, materialId) {
        if (!uid || !this.db || !materialId) return;
        await this.db.collection('professores').doc(uid).collection('materiais').doc(String(materialId)).delete();
    },
    async fetchMateriaisDocs(uid) {
        if (!uid || !this.db) return [];
        try {
            const snap = await this.db.collection('professores').doc(uid).collection('materiais').get();
            return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        } catch (e) {
            console.warn("Erro ao buscar subcoleção de materiais:", e);
            return [];
        }
    },
    async saveHorarioOnly(uid, horarioData) {
        if (!uid) return;
        await this.db.collection('professores').doc(uid).update({
            horario: horarioData,
            lastUpdate: new Date().toISOString()
        });
    },
    async saveApresentacao(uid, apres) {
        if (!uid || !this.db || !apres) return;
        try {
            const apresRef = this.db.collection('professores').doc(uid);
            const docSnap = await apresRef.get();
            let apresList = [];
            if (docSnap.exists) {
                apresList = docSnap.data().apresentacoes || [];
            }
            const idx = apresList.findIndex(a => String(a.id) === String(apres.id));
            if (idx >= 0) {
                apresList[idx] = apres;
            } else {
                apresList.unshift(apres);
            }
            await apresRef.set({ apresentacoes: apresList, lastUpdate: new Date().toISOString() }, { merge: true });
        } catch (e) {
            console.error("Erro ao salvar apresentação no Firestore:", e);
        }
    },
    async deleteApresentacao(uid, id) {
        if (!uid || !this.db || !id) return;
        try {
            const apresRef = this.db.collection('professores').doc(uid);
            const docSnap = await apresRef.get();
            if (docSnap.exists) {
                let apresList = docSnap.data().apresentacoes || [];
                apresList = apresList.filter(a => String(a.id) !== String(id));
                await apresRef.set({ apresentacoes: apresList, lastUpdate: new Date().toISOString() }, { merge: true });
            }
        } catch (e) {
            console.error("Erro ao deletar apresentação no Firestore:", e);
        }
    },
    subscribeToUserChanges(uid, callback) {
        if (!uid || !this.db) return;
        const unsub = this.db.collection('professores').doc(uid)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    callback(doc.data());
                }
            }, (error) => {
                console.error("Erro no listener em tempo real:", error);
            });
        return this.registerListener(unsub);
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
    },

    // =========================================================================
    // BANCO DE MATERIAIS PEDAGÓGICOS DA COMUNIDADE (FIRESTORE)
    // =========================================================================
    async getMateriaisComunidade(disciplina = '', tipo = '') {
        if (!this.db) return [];
        try {
            let ref = this.db.collection('comunidade_materiais');
            if (disciplina) ref = ref.where('disciplina', '==', disciplina);
            if (tipo) ref = ref.where('tipo', '==', tipo);
            const snapshot = await ref.orderBy('data_partilha', 'desc').limit(50).get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            console.warn("Aviso ao buscar materiais da comunidade no Firestore:", e.message);
            // Fallback 1: se índice composto ou ordenação falhar, busca simples e ordena em memória
            try {
                const snapshot = await this.db.collection('comunidade_materiais').limit(50).get();
                let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (disciplina) docs = docs.filter(d => d.disciplina === disciplina);
                if (tipo) docs = docs.filter(d => d.tipo === tipo);
                docs.sort((a, b) => new Date(b.data_partilha || 0) - new Date(a.data_partilha || 0));
                return docs;
            } catch (err2) {
                if (err2?.code === 'permission-denied' || String(err2?.message).includes('permissions')) {
                    console.warn("🔒 Coleção 'comunidade_materiais' sem regra de leitura pública no Firestore. Atualize o firestore.rules.");
                } else {
                    console.error("Erro no fallback de materiais da comunidade:", err2);
                }
                return [];
            }
        }
    },

    async verificarDuplicataMaterialComunidade(titulo) {
        if (!this.db) return false;
        try {
            const snapshot = await this.db.collection('comunidade_materiais')
                .where('titulo', '==', titulo)
                .limit(1)
                .get();
            return !snapshot.empty;
        } catch (e) {
            if (e?.code === 'permission-denied' || String(e?.message).includes('permissions')) {
                console.warn("🔒 Permissão de leitura da coleção 'comunidade_materiais' pendente de configuração no Firestore Console.");
            } else {
                console.error("Erro ao verificar duplicata de material:", e);
            }
            return false;
        }
    },

    async publicarMaterialComunidade(dadosMaterial) {
        if (!this.db) throw new Error("Firestore não inicializado.");
        try {
            return await this.db.collection('comunidade_materiais').add(dadosMaterial);
        } catch (e) {
            if (e?.code === 'permission-denied' || String(e?.message).includes('permissions')) {
                console.error("🔒 Erro de Permissão no Firestore: A coleção 'comunidade_materiais' precisa de regra 'allow create: if request.auth != null' no firestore.rules.");
            } else {
                console.error("Erro no Firestore ao publicar material:", e);
            }
            throw e;
        }
    },

    async removerMaterialComunidade(uid, materialIdLocal) {
        if (!this.db || !uid) return;
        try {
            const snapshot = await this.db.collection('comunidade_materiais')
                .where('uid_autor', '==', uid)
                .where('id_local_origem', '==', String(materialIdLocal))
                .get();
            if (snapshot.empty) return;
            const batch = this.db.batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            return batch.commit();
        } catch (e) {
            console.error("Erro ao remover material da comunidade:", e);
            throw e;
        }
    },

    // =========================================================================
    // QUIZ AO VIVO - MÉTODOS EM TEMPO REAL (FIRESTORE)
    // =========================================================================
    async criarSessaoQuiz(quizData) {
        if (!this.db) throw new Error("Firestore não inicializado.");
        const pin = generateSecurePIN(6);
        const hostUid = this.auth?.currentUser?.uid || 'host_anon';
        
        const cleanQuiz = JSON.parse(JSON.stringify(quizData));
        const sessaoData = {
            pin,
            hostUid,
            quizId: cleanQuiz.id || 'quiz_' + Date.now().toString(36),
            titulo: cleanQuiz.titulo || 'Quiz Interativo',
            disciplina: cleanQuiz.disciplina || 'Geral',
            status: 'LOBBY', // 'LOBBY' | 'COUNTDOWN' | 'QUESTION' | 'FEEDBACK' | 'LEADERBOARD' | 'PODIUM' | 'FINISHED'
            currentQuestionIndex: 0,
            questionStartTime: null,
            perguntas: cleanQuiz.perguntas || [],
            players: {},
            createdAt: Date.now()
        };

        try {
            await this.db.collection('quiz_sessions').doc(pin).set(sessaoData);
        } catch (e) {
            console.warn("Aviso Firestore ao salvar sessão no banco de dados (coleção quiz_sessions requer regra pública):", e.message);
        }
        return pin;
    },

    ouvirSessaoQuiz(pin, callback) {
        if (!this.db || !pin) return () => {};
        try {
            const unsub = this.db.collection('quiz_sessions').doc(String(pin)).onSnapshot((doc) => {
                if (doc.exists) {
                    callback(doc.data());
                } else {
                    callback(null);
                }
            }, (error) => {
                console.warn("Aviso onSnapshot Firestore no Quiz:", error.message);
            });
            return this.registerListener(unsub);
        } catch (e) {
            console.warn("Aviso ao subscrever snapshot:", e.message);
            return () => {};
        }
    },

    async atualizarStatusSessao(pin, novoStatus, questionIndex = null, questionStartTime = null) {
        if (!this.db || !pin) return;
        const updateData = { status: novoStatus };
        if (questionIndex !== null) updateData.currentQuestionIndex = questionIndex;
        if (questionStartTime !== null) updateData.questionStartTime = questionStartTime;
        try {
            await this.db.collection('quiz_sessions').doc(String(pin)).update(updateData);
        } catch (e) {
            console.warn("Aviso Firestore ao atualizar status da sessão:", e.message);
        }
    },

    async entrarSessaoQuiz(pin, playerId, playerName, avatar = '🎓') {
        if (!this.db || !pin) return false;
        try {
            const docRef = this.db.collection('quiz_sessions').doc(String(pin));
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                const data = docSnap.data();
                if (data.status === 'FINISHED') {
                    throw new Error("Esta partida de quiz já foi encerrada.");
                }

                const playerKey = `players.${playerId}`;
                await docRef.update({
                    [playerKey]: {
                        id: playerId,
                        nome: playerName,
                        avatar: avatar,
                        score: 0,
                        streak: 0,
                        lastAnswerIndex: null,
                        lastAnswerTime: null,
                        isCorrect: null,
                        totalCorrect: 0,
                        joinedAt: Date.now()
                    }
                });
            }
        } catch (e) {
            console.warn("Aviso Firestore ao entrar na sessão:", e.message);
        }
        return true;
    },

    async enviarRespostaQuiz(pin, playerId, answerIndex, isCorrect, pointsEarned) {
        if (!this.db || !pin || !playerId) return;
        try {
            const docRef = this.db.collection('quiz_sessions').doc(String(pin));
            const docSnap = await docRef.get();
            if (!docSnap.exists) return;

            const data = docSnap.data();
            const player = (data.players && data.players[playerId]) || {
                id: playerId,
                nome: 'Jogador',
                avatar: '🎓',
                score: 0,
                streak: 0,
                totalCorrect: 0
            };

            const novoScore = (player.score || 0) + (pointsEarned || 0);
            const novoStreak = isCorrect ? (player.streak || 0) + 1 : 0;
            const novoTotalCorrect = isCorrect ? (player.totalCorrect || 0) + 1 : (player.totalCorrect || 0);

            await docRef.update({
                [`players.${playerId}.lastAnswerIndex`]: answerIndex,
                [`players.${playerId}.lastAnswerTime`]: Date.now(),
                [`players.${playerId}.isCorrect`]: isCorrect,
                [`players.${playerId}.score`]: novoScore,
                [`players.${playerId}.streak`]: novoStreak,
                [`players.${playerId}.totalCorrect`]: novoTotalCorrect
            });
        } catch (e) {
            console.warn("Aviso Firestore ao registrar resposta:", e.message);
        }
    },

    async encerrarSessaoQuiz(pin) {
        if (!this.db || !pin) return;
        try {
            await this.db.collection('quiz_sessions').doc(String(pin)).update({
                status: 'FINISHED'
            });
        } catch (e) {
            console.warn("Aviso ao encerrar sessão:", e.message);
        }
    }
};
if (typeof window !== 'undefined') {
    window.firebaseService = firebaseService;
}
firebaseService.init();