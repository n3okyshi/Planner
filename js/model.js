/**
 * @file model.js
 * @description Core Model da aplicação. Centraliza o estado, persistência (Local/Cloud) e orquestra sub-módulos.
 * @module model
 */

import { firebaseService } from './firebase-service.js';
import { initialState, coresComponentes, tiposEventos } from './models/state.js';
import { turmaMethods } from './models/turmaModel.js';
import { provaMethods } from './models/provaModel.js';
import { planejamentoMethods } from './models/planejamentoModel.js';
import { debounce } from './utils.js';

/**
 * @typedef {import('./models/state.js').AppState} AppState
 */

/**
 * Modelo Central da Aplicação.
 * Combina estado reativo, persistência e lógica de negócios modularizada.
 * @namespace model
 */
export const model = {
    /** @type {string} Chave utilizada para persistência no LocalStorage */
    STORAGE_KEY: 'planner_pro_docente_2026',

    /** @type {Object|null} Objeto de usuário do Firebase Auth */
    currentUser: null,

    /** @type {Object} Configurações estáticas de cores */
    coresComponentes,

    /** @type {Object} Configurações estáticas de tipos de eventos */
    tiposEventos,

    /** @type {AppState} Estado global reativo da aplicação */
    state: initialState,

    /**
     * Inicializa o modelo carregando dados salvos localmente.
     */
    init() {
        const savedData = localStorage.getItem(this.STORAGE_KEY);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                // Merge seguro com o estado inicial para garantir que novos campos existam
                this.state = { ...this.state, ...parsed };
                console.log("📦 Cache local carregado.");
            } catch (e) {
                console.error("❌ Erro ao restaurar cache local:", e);
            }
        }
    },

    /**
     * Sincroniza o estado local com o Firestore após o login.
     * Implementa estratégia de "Merge Inteligente" baseada em timestamp.
     */
    async loadUserData() {
        if (!firebaseService.auth.currentUser) return;
        this.currentUser = firebaseService.auth.currentUser;

        this.updateStatusCloud('<i class="fas fa-download"></i> Verificando dados...', 'text-blue-600');

        try {
            const cloudData = await firebaseService.loadFullData(this.currentUser.uid);

            if (cloudData) {
                // Estratégia de Merge para Questões (Item a Item)
                const cloudQuestoes = cloudData.questoes || [];
                const localQuestoes = this.state.questoes || [];
                const mapaUnificado = new Map();

                const processarQuestao = (q) => {
                    const id = String(q.id);
                    const existente = mapaUnificado.get(id);

                    if (!existente) {
                        mapaUnificado.set(id, q);
                    } else {
                        // Conflito: Vence o mais recente
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

                // Merge do Estado Global (Prioridade para Cloud em configurações gerais)
                this.state = { ...this.state, ...cloudData };
                this.state.questoes = listaFinalQuestoes;

                // Salva o resultado do merge
                this.saveLocal(); // Dispara saveLocal + CloudSync automático

                this.state.isCloudSynced = true;
                this.updateStatusCloud('<i class="fas fa-check"></i> Sincronizado', 'text-emerald-600');

            } else {
                // Primeiro acesso ou nuvem vazia: Envia dados locais
                this.state.isCloudSynced = true;
                this.saveLocal(); // Força envio inicial
            }
        } catch (e) {
            console.error("❌ Erro no sync cloud:", e);
            this.updateStatusCloud('Modo Offline', 'text-slate-500');
            this.state.isCloudSynced = true; // Permite continuar trabalhando offline
        }

        // Listener em Tempo Real
        firebaseService.subscribeToUserChanges(this.currentUser.uid, (newData) => {
            if (newData) {
                console.log("🔄 Atualização remota recebida.");
                
                // Atualiza apenas campos raiz para evitar sobrescrever trabalho em andamento nas turmas
                if (newData.userConfig) this.state.userConfig = { ...this.state.userConfig, ...newData.userConfig };
                if (newData.eventos) this.state.eventos = { ...this.state.eventos, ...newData.eventos };

                // Apenas salva no localStorage, sem disparar o cloudSave de volta (loop infinito)
                try {
                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
                } catch (e) { console.error(e); }
            }
        });
    },

    /**
     * PERSISTÊNCIA CENTRALIZADA
     * 1. Salva no LocalStorage Imediatamente (Segurança contra fechar aba).
     * 2. Agenda salvamento na Nuvem após 1s (Debounce para performance).
     */
    saveLocal() {
        // 1. Salvamento Local Síncrono (Imediato)
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
        } catch (e) {
            console.error("Quota Exceeded ou erro de disco", e);
        }

        // 2. Disparo para Nuvem (Assíncrono e Debounced)
        this._debouncedCloudSave();
    },

    /**
     * Função interna com Debounce (1000ms) para não sobrecarregar o Firebase.
     * Só executa se o usuário parar de chamar saveLocal por 1 segundo.
     */
    _debouncedCloudSave: debounce(async function () {
        if (!this.state.isCloudSynced || !this.currentUser) return;

        // Feedback Visual: Editando
        this.updateStatusCloud('<i class="fas fa-pen"></i> Sincronizando...', 'text-yellow-600');

        try {
            // Salva dados raiz (Config, Eventos, Questões)
            await firebaseService.saveRoot(this.currentUser.uid, this.state);
            // Feedback Visual: Sucesso
            this.updateStatusCloud('<i class="fas fa-check"></i> Salvo na Nuvem', 'text-emerald-600');
        } catch (err) {
            console.warn("Erro no AutoSave Cloud:", err);
            this.updateStatusCloud('Offline (Salvo Local)', 'text-slate-500');
        }
    }, 1000),


    /**
     * Salva o horário completo (Config + Grade).
     * @param {Object} novoHorario 
     */
    async saveHorarioCompleto(novoHorario) {
        this.state.horario = novoHorario;
        this.saveLocal(); // Salva local e agenda root update
        
        // Horário é pesado, garantimos envio específico se online
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

    /**
     * Atualiza o indicador visual de status da nuvem na UI.
     * @param {string} html 
     * @param {string} colorClass 
     */
    updateStatusCloud(html, colorClass) {
        const el = document.getElementById('cloud-status');
        if (el) {
            el.innerHTML = html;
            el.className = `flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-100 text-xs font-bold transition-all shadow-sm ${colorClass}`;
        }
    },

    /**
     * Exporta os dados atuais para um arquivo JSON (Backup).
     */
    exportData() {
        const dataStr = JSON.stringify(this.state, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_planner_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Executa operação de persistência granular (ex: salvar turma específica).
     * @param {Function} cloudOperation - Função do firebaseService.
     */
    async persist(cloudOperation) {
        this.saveLocal(); // Garante consistência local

        if (this.currentUser && cloudOperation) {
            try {
                await cloudOperation(this.currentUser.uid);
            } catch (error) {
                console.error("Erro silencioso no Cloud Save Granular:", error);
            }
        }
    },

    // --- Importação de Métodos Modulares (Mixins) ---
    ...turmaMethods,
    ...provaMethods,
    ...planejamentoMethods,

    // --- Aliases de Compatibilidade (Legacy Support) ---
    /** @deprecated Use saveQuestao */
    addQuestao(obj) { this.saveQuestao(obj); }
};

// Exposição Global
if (typeof window !== 'undefined') {
    window.model = model;
}
