import { firebaseService } from './firebase-service.js';
import { initialState, coresComponentes, tiposEventos } from './models/state.js';
import { turmaMethods } from './models/turmaModel.js';
import { provaMethods } from './models/provaModel.js';
import { planejamentoMethods } from './models/planejamentoModel.js';

/**
 * @typedef {import('./models/state.js').initialState} AppState
 */

/**
 * CORE MODEL - Planner Pro Docente 2026
 * Centraliza o estado da aplicação e distribui métodos especializados para turmas, provas e planejamentos.
 * * @namespace model
 */
export const model = {
    /** @type {string} Chave utilizada para persistência no LocalStorage */
    STORAGE_KEY: 'planner_pro_docente_2026',
    
    /** @type {Object|null} Objeto de usuário do Firebase Auth */
    currentUser: null,
    
    /** @type {Object} Mapeamento de cores por componente curricular */
    coresComponentes,
    
    /** @type {Object} Configurações de tipos de eventos do calendário */
    tiposEventos,
    
    /** @type {AppState} Estado reativo global da aplicação */
    state: initialState,

    /**
     * Inicializa o modelo carregando dados salvos localmente.
     * Realiza um merge profundo básico entre o estado inicial e o salvo.
     * @returns {void}
     */
    init() {
        const savedData = localStorage.getItem(this.STORAGE_KEY);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                this.state = { ...this.state, ...parsed };
            } catch (e) {
                console.error("❌ Erro ao restaurar cache local:", e);
            }
        }
    },

    /**
     * Sincroniza o estado local com o Firestore após o login do usuário.
     * Ativa também o listener para atualizações em tempo real.
     * @async
     * @returns {Promise<void>}
     */
    async loadUserData() {
        if (!firebaseService.auth.currentUser) return;
        this.currentUser = firebaseService.auth.currentUser;
        
        this.updateStatusCloud('<i class="fas fa-download"></i> Sincronizando...', 'text-blue-600');
        
        try {
            const cloudData = await firebaseService.loadFullData(this.currentUser.uid);
            if (cloudData) {
                this.state = { ...this.state, ...cloudData };
                this.saveLocal();
                this.updateStatusCloud('<i class="fas fa-check"></i> Sincronizado', 'text-emerald-600');
            } else {
                this.state.isCloudSynced = true;
                this.saveCloudRoot();
            }
        } catch (e) {
            console.error("❌ Erro no sync cloud:", e);
            this.updateStatusCloud('Erro de conexão', 'text-red-500');
        } finally {
            this.state.isCloudSynced = true;
        }

        firebaseService.subscribeToUserChanges(this.currentUser.uid, (newData) => {
            if (newData) {
                this.state = { ...this.state, ...newData };
                this.saveLocal();
            }
        });
    },

    /**
     * Persiste o estado atual da aplicação no LocalStorage do navegador.
     * @returns {void}
     */
    saveLocal() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    },

    /**
     * Salva o estado completo no banco de dados Firebase (Firestore).
     * @async
     * @returns {Promise<void>}
     */
    async saveCloudRoot() {
        if (!this.state.isCloudSynced || !this.currentUser) return;
        
        this.updateStatusCloud('<i class="fas fa-sync fa-spin"></i> Salvando...', 'text-yellow-600');
        try {
            await firebaseService.saveRoot(this.currentUser.uid, this.state);
            this.updateStatusCloud('<i class="fas fa-check"></i> Salvo', 'text-emerald-600');
        } catch (err) {
            this.updateStatusCloud('Erro ao salvar', 'text-red-500');
        }
    },

    /**
     * Atualiza o indicador visual de sincronização na interface.
     * @param {string} html - Conteúdo HTML a ser inserido no elemento de status.
     * @param {string} colorClass - Classe CSS do Tailwind para definir a cor.
     * @returns {void}
     */
    updateStatusCloud(html, colorClass) {
        const el = document.getElementById('cloud-status');
        if (el) {
            el.innerHTML = html;
            el.className = `flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-100 text-xs font-bold transition-all shadow-sm ${colorClass}`;
        }
    },

    /**
     * Gera e dispara o download de um arquivo JSON contendo o backup completo dos dados.
     * @returns {void}
     */
    exportData() {
        const dataStr = JSON.stringify(this.state, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `backup_planner_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    },

    ...turmaMethods,
    ...provaMethods,
    ...planejamentoMethods,

    /**
     * Alias para saveQuestao - Mantido para evitar quebra de chamadas legadas.
     * @param {Object} obj - Objeto da questão.
     * @deprecated Use saveQuestao diretamente.
     */
    addQuestao(obj) { this.saveQuestao(obj); },

    /**
     * Alias para atualização de questão.
     * @param {string|number} id - ID da questão.
     * @param {Object} dados - Novos dados da questão.
     * @deprecated Use saveQuestao enviando o objeto com ID.
     */
    updateQuestao(id, dados) { this.saveQuestao({ ...dados, id }); }
};

if (typeof window !== 'undefined') {
    window.model = model;
    window.firebaseService = firebaseService; 
    model.init();
}