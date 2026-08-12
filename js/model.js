
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
    _isHydrating: false,

    init() {
        this._isHydrating = true;
        let loadedData = { ...this.state };
        const savedData = storageService.load();
        if (savedData) {
            try {
                loadedData = { ...loadedData, ...savedData };
                console.log("✅ Cache síncrono carregado.");
            } catch (e) {
                console.error("Erro ao restaurar cache local:", e);
            }
        }

        this.state = createReactiveState(loadedData, (caminho, novoValor, valorAntigo) => {
            if (this._isHydrating) return;
            try {
                storageService.saveAsync(this.state);
            } catch (e) {
                console.warn("Erro no AutoSave IndexedDB:", e);
            }
            if (this._debouncedCloudSave) {
                this._debouncedCloudSave();
            }
        });

        // Hidratação assíncrona profunda via IndexedDB (sem limite de 5MB)
        if (storageService.loadAsync) {
            storageService.loadAsync().then(asyncData => {
                if (asyncData) {
                    this._isHydrating = true;
                    Object.keys(asyncData).forEach(k => {
                        if (asyncData[k] && (!this.state[k] || Array.isArray(asyncData[k]) && asyncData[k].length > (this.state[k]?.length || 0))) {
                            this.state[k] = asyncData[k];
                        }
                    });
                    console.log("⚡ IndexedDB totalmente sincronizado na memória.");
                }
            }).catch(err => console.warn("Aviso IndexedDB hydration:", err))
            .finally(() => {
                this._isHydrating = false;
            });
        } else {
            this._isHydrating = false;
        }
    },

    mergeStates(local, cloud) {
        if (!cloud) return local;
        const merged = { ...local };

        // 1. Configurações de Usuário
        merged.userConfig = { ...(local.userConfig || {}), ...(cloud.userConfig || {}) };

        // 2. Turmas (Merge por ID e timestamp granular)
        const turmasMap = new Map();
        (local.turmas || []).forEach(t => turmasMap.set(String(t.id), t));
        (cloud.turmas || []).forEach(ct => {
            const id = String(ct.id);
            const lt = turmasMap.get(id);
            if (!lt) {
                turmasMap.set(id, ct);
            } else {
                const timeCloud = new Date(ct.updatedAt || ct.createdAt || 0).getTime();
                const timeLocal = new Date(lt.updatedAt || lt.createdAt || 0).getTime();
                if (timeCloud >= timeLocal) {
                    // Mescla alunos e avaliações se existirem
                    turmasMap.set(id, { ...lt, ...ct });
                }
            }
        });
        merged.turmas = Array.from(turmasMap.values());

        // 3. Planos Diários (Merge por data e turma)
        merged.planosDiarios = { ...(local.planosDiarios || {}) };
        if (cloud.planosDiarios) {
            Object.keys(cloud.planosDiarios).forEach(dataIso => {
                merged.planosDiarios[dataIso] = {
                    ...(merged.planosDiarios[dataIso] || {}),
                    ...(cloud.planosDiarios[dataIso] || {})
                };
            });
        }

        // 4. Eventos do Calendário (Merge por data)
        merged.eventos = { ...(local.eventos || {}), ...(cloud.eventos || {}) };

        // 5. Horário Escolar
        if (cloud.horario) {
            merged.horario = { ...(local.horario || {}), ...(cloud.horario || {}) };
        }

        // 6. Coleções baseadas em Array (Questões, Materiais, Quizzes, Flashcards, Mindmaps)
        const mergeColecaoPorId = (localArr = [], cloudArr = []) => {
            const map = new Map();
            localArr.forEach(item => map.set(String(item.id), item));
            cloudArr.forEach(item => {
                const id = String(item.id);
                const existente = map.get(id);
                if (!existente) {
                    map.set(id, item);
                } else {
                    const timeC = new Date(item.updatedAt || item.createdAt || 0).getTime();
                    const timeL = new Date(existente.updatedAt || existente.createdAt || 0).getTime();
                    if (timeC >= timeL) map.set(id, item);
                }
            });
            return Array.from(map.values());
        };

        merged.questoes = mergeColecaoPorId(local.questoes || [], cloud.questoes || []);
        merged.materiaisGerados = mergeColecaoPorId(local.materiaisGerados || [], cloud.materiaisGerados || []);
        merged.quizzes = mergeColecaoPorId(local.quizzes || [], cloud.quizzes || []);
        merged.flashcards = mergeColecaoPorId(local.flashcards || [], cloud.flashcards || []);
        merged.mindmaps = mergeColecaoPorId(local.mindmaps || [], cloud.mindmaps || []);

        return merged;
    },

    async loadUserData(user = null) {
        const userAuth = user || (firebaseService?.auth?.currentUser) || this.currentUser;
        if (!userAuth) return;
        this.currentUser = userAuth;
        this.updateStatusCloud('<i class="fas fa-download"></i> Sincronizando dados...', 'text-blue-600');
        try {
            const cloudData = await firebaseService.loadFullData(this.currentUser.uid);
            if (cloudData) {
                const merged = this.mergeStates(this.state, cloudData);

                // Aplica estado unificado
                Object.keys(merged).forEach(k => {
                    this.state[k] = merged[k];
                });

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
                console.log("🔄 Atualização remota recebida com fusão granular.");
                const merged = this.mergeStates(this.state, newData);
                Object.keys(merged).forEach(k => {
                    this.state[k] = merged[k];
                });
                storageService.saveAsync(this.state).catch(() => {});
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
