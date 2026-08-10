
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
        return null;
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
