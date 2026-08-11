
import { firebaseService } from './firebase-service.js';
import { storageService } from './services/storageService.js';
import { initialState, coresComponentes, tiposEventos } from './models/state.js';
import { turmaMethods } from './models/turmaModel.js';
import { provaMethods } from './models/provaModel.js';
import { planejamentoMethods } from './models/planejamentoModel.js';
import { debounce } from './utils.js';
import { createReactiveState } from './reactive.js';
export const model = {
    STORAGE_KEY: 'planner_pro_docente_2026',
    currentUser: null,
    coresComponentes,
    tiposEventos,
    state: initialState,
    init() {
        let loadedData = { ...this.state };
        const savedData = storageService.load();
        if (savedData) {
            try {
                loadedData = { ...loadedData, ...savedData };
                console.log("✅ Cache local carregado.");
            } catch (e) {
                console.error("Erro ao restaurar cache local:", e);
            }
        }
        this.state = createReactiveState(loadedData, (caminho, novoValor, valorAntigo) => {
            try {
                storageService.save(this.state);
            } catch (e) {
                console.warn("Erro no AutoSave local (Quota/Espaço)", e);
            }
            if (this._debouncedCloudSave) {
                this._debouncedCloudSave();
            }
        });
    },
    async loadUserData(user = null) {
        const userAuth = user || (firebaseService?.auth?.currentUser) || this.currentUser;
        if (!userAuth) return;
        this.currentUser = userAuth;
        this.updateStatusCloud('<i class="fas fa-download"></i> Verificando dados...', 'text-blue-600');
        try {
            const cloudData = await firebaseService.loadFullData(this.currentUser.uid);
            if (cloudData) {
                const cloudQuestoes = cloudData.questoes || [];
                const localQuestoes = this.state.questoes || [];
                const mapaUnificado = new Map();
                const processarQuestao = (q) => {
                    const id = String(q.id);
                    const existente = mapaUnificado.get(id);
                    if (!existente) {
                        mapaUnificado.set(id, q);
                    } else {
                        const dataNova = new Date(q.updatedAt || q.createdAt || 0).getTime();
                        const dataExistente = new Date(existente.updatedAt || existente.createdAt || 0).getTime();
                        if (dataNova > dataExistente) {
                            mapaUnificado.set(id, q);
                        }
                    }
                };
                cloudQuestoes.forEach(processarQuestao);
                localQuestoes.forEach(processarQuestao);
                const listaFinalQuestoes = Array.from(mapaUnificado.values());

                if (cloudData.userConfig) {
                    this.state.userConfig = { ...this.state.userConfig, ...cloudData.userConfig };
                }
                if (cloudData.turmas) this.state.turmas = cloudData.turmas;
                if (cloudData.eventos) this.state.eventos = cloudData.eventos;
                if (cloudData.planosDiarios) this.state.planosDiarios = cloudData.planosDiarios;
                if (cloudData.horario) this.state.horario = cloudData.horario;
                if (cloudData.materiaisGerados) this.state.materiaisGerados = cloudData.materiaisGerados;
                if (cloudData.quizzes) this.state.quizzes = cloudData.quizzes;
                if (cloudData.flashcards) this.state.flashcards = cloudData.flashcards;
                if (cloudData.mindmaps) this.state.mindmaps = cloudData.mindmaps;
                if (cloudData.lastUpdate) this.state.lastUpdate = cloudData.lastUpdate;

                this.state.questoes = listaFinalQuestoes;

                // Fallback automático do nome do professor da conta Google se estiver vazio
                if ((!this.state.userConfig.profName || this.state.userConfig.profName.trim() === '') && this.currentUser.displayName) {
                    this.state.userConfig.profName = this.currentUser.displayName;
                }

                this.saveLocal();
                this.state.isCloudSynced = true;
                this.updateStatusCloud('<i class="fas fa-check"></i> Sincronizado', 'text-emerald-600');
            } else {
                if ((!this.state.userConfig.profName || this.state.userConfig.profName.trim() === '') && this.currentUser.displayName) {
                    this.state.userConfig.profName = this.currentUser.displayName;
                }
                this.state.isCloudSynced = true;
                this.saveLocal();
                this.updateStatusCloud('<i class="fas fa-check"></i> Conectado', 'text-emerald-600');
            }
        } catch (e) {
            console.error("❌ Erro no sync cloud:", e);
            this.updateStatusCloud('Modo Offline', 'text-slate-500');
            this.state.isCloudSynced = true;
        }
        firebaseService.subscribeToUserChanges(this.currentUser.uid, (newData) => {
            if (newData) {
                console.log("🔄 Atualização remota recebida.");
                if (newData.userConfig) this.state.userConfig = { ...this.state.userConfig, ...newData.userConfig };
                if (newData.eventos) this.state.eventos = { ...this.state.eventos, ...newData.eventos };
                if (newData.turmas) this.state.turmas = newData.turmas;
                if (newData.planosDiarios) this.state.planosDiarios = newData.planosDiarios;
                if (newData.horario) this.state.horario = newData.horario;
                if (newData.materiaisGerados) this.state.materiaisGerados = newData.materiaisGerados;
                if (newData.quizzes) this.state.quizzes = newData.quizzes;
                if (newData.flashcards) this.state.flashcards = newData.flashcards;
                if (newData.mindmaps) this.state.mindmaps = newData.mindmaps;
                try {
                    storageService.save(this.state);
                } catch (e) { console.error(e); }
            }
        });
    },
    saveLocal() {
        try {
            storageService.save(this.state);
        } catch (e) {
            console.error("Quota Exceeded ou erro de disco", e);
        }
        this._debouncedCloudSave();
    },
    _debouncedCloudSave: debounce(async function () {
        if (!this.state.isCloudSynced || !this.currentUser) return;
        this.updateStatusCloud('<i class="fas fa-pen"></i> Sincronizando...', 'text-yellow-600');
        try {
            await firebaseService.saveRoot(this.currentUser.uid, this.state);
            this.updateStatusCloud('<i class="fas fa-check"></i> Salvo na Nuvem', 'text-emerald-600');
        } catch (err) {
            console.warn("Erro no AutoSave Cloud:", err);
            this.updateStatusCloud('Offline (Salvo Local)', 'text-slate-500');
        }
    }, 1000),
    async saveHorarioCompleto(novoHorario) {
        this.state.horario = novoHorario;
        this.saveLocal();
        if (this.currentUser) {
            try {
                await firebaseService.saveHorarioOnly(this.currentUser.uid, novoHorario);
                return true;
            } catch (e) {
                console.error(e);
                return false;
            }
        }
        return true;
    },
    updateStatusCloud(html, colorClass) {
        const el = document.getElementById('cloud-status');
        if (el) {
            el.innerHTML = html;
            el.className = `flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-100 text-xs font-bold transition-all shadow-sm ${colorClass}`;
        }
    },
    exportData() {
        storageService.exportBackup(this.state);
    },
    async saveMaterial(material) {
        if (!this.state.materiaisGerados) this.state.materiaisGerados = [];
        const novoMaterial = {
            id: 'mat_' + Date.now().toString(36),
            createdAt: new Date().toISOString(),
            ...material
        };
        this.state.materiaisGerados.push(novoMaterial);
        this.saveLocal();
        return novoMaterial;
    },
    async updateMaterial(id, dadosAtualizados) {
        if (!this.state.materiaisGerados) this.state.materiaisGerados = [];
        const index = this.state.materiaisGerados.findIndex(m => m.id === id);
        if (index !== -1) {
            this.state.materiaisGerados[index] = {
                ...this.state.materiaisGerados[index],
                ...dadosAtualizados,
                updatedAt: new Date().toISOString()
            };
            this.saveLocal();
            return this.state.materiaisGerados[index];
        }
    },
    async saveQuiz(quiz) {
        if (!this.state.quizzes) this.state.quizzes = [];
        const cleanQuiz = JSON.parse(JSON.stringify(quiz));
        const novoQuiz = {
            id: cleanQuiz.id || 'quiz_' + Date.now().toString(36),
            createdAt: cleanQuiz.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...cleanQuiz
        };
        const index = this.state.quizzes.findIndex(q => String(q.id) === String(novoQuiz.id));
        if (index !== -1) {
            this.state.quizzes[index] = novoQuiz;
        } else {
            this.state.quizzes.push(novoQuiz);
        }
        this.saveLocal();
        return novoQuiz;
    },
    async deleteQuiz(quizId) {
        if (!this.state.quizzes) this.state.quizzes = [];
        this.state.quizzes = this.state.quizzes.filter(q => String(q.id) !== String(quizId));
        this.saveLocal();
        return true;
    },
    async saveFlashcardDeck(deck) {
        if (!this.state.flashcards) this.state.flashcards = [];
        const cleanDeck = JSON.parse(JSON.stringify(deck));
        const novoDeck = {
            id: cleanDeck.id || 'deck_' + Date.now().toString(36),
            createdAt: cleanDeck.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...cleanDeck
        };
        const index = this.state.flashcards.findIndex(d => String(d.id) === String(novoDeck.id));
        if (index !== -1) {
            this.state.flashcards[index] = novoDeck;
        } else {
            this.state.flashcards.push(novoDeck);
        }
        this.saveLocal();
        return novoDeck;
    },
    async deleteFlashcardDeck(deckId) {
        if (!this.state.flashcards) this.state.flashcards = [];
        this.state.flashcards = this.state.flashcards.filter(d => String(d.id) !== String(deckId));
        this.saveLocal();
        return true;
    },
    async saveMindmap(mindmap) {
        if (!this.state.mindmaps) this.state.mindmaps = [];
        const cleanMindmap = JSON.parse(JSON.stringify(mindmap));
        const novoMindmap = {
            id: cleanMindmap.id || 'map_' + Date.now().toString(36),
            createdAt: cleanMindmap.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...cleanMindmap
        };
        const index = this.state.mindmaps.findIndex(m => String(m.id) === String(novoMindmap.id));
        if (index !== -1) {
            this.state.mindmaps[index] = novoMindmap;
        } else {
            this.state.mindmaps.push(novoMindmap);
        }
        this.saveLocal();
        return novoMindmap;
    },
    async deleteMindmap(mindmapId) {
        if (!this.state.mindmaps) this.state.mindmaps = [];
        this.state.mindmaps = this.state.mindmaps.filter(m => String(m.id) !== String(mindmapId));
        this.saveLocal();
        return true;
    },
    async persist(cloudOperation) {
        this.saveLocal();
        if (this.currentUser && cloudOperation) {
            try {
                await cloudOperation(this.currentUser.uid);
            } catch (error) {
                console.error("Erro silencioso no Cloud Save Granular:", error);
            }
        }
    },
    ...turmaMethods,
    ...provaMethods,
    ...planejamentoMethods,
};
if (typeof window !== 'undefined') {
    window.model = model;
}
