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
        
        this.updateStatusCloud('<i class="fas fa-download"></i> Verificando dados...', 'text-blue-600');
        
        try {
            const cloudData = await firebaseService.loadFullData(this.currentUser.uid);
            
            if (cloudData) {
                // --- INÍCIO DO MERGE INTELIGENTE ---
                
                // 1. Prepara as listas para comparação
                const cloudQuestoes = cloudData.questoes || [];
                const localQuestoes = this.state.questoes || [];
                
                // Vamos criar um Map para unificar as questões pelo ID
                const mapaUnificado = new Map();
                
                // Função auxiliar para decidir quem ganha
                const processarQuestao = (q) => {
                    const id = String(q.id);
                    const existente = mapaUnificado.get(id);
                    
                    if (!existente) {
                        mapaUnificado.set(id, q);
                    } else {
                        // Se já existe, comparamos as datas de atualização
                        const dataNova = new Date(q.updatedAt || q.createdAt || 0).getTime();
                        const dataExistente = new Date(existente.updatedAt || existente.createdAt || 0).getTime();
                        
                        // Se a questão processada agora for mais recente, ela substitui a anterior
                        if (dataNova > dataExistente) {
                            mapaUnificado.set(id, q);
                        }
                    }
                };

                // Processamos PRIMEIRO a nuvem, DEPOIS o local.
                // Isso garante que, em caso de empate de datas, o Local (último a entrar) ganhe.
                cloudQuestoes.forEach(processarQuestao);
                localQuestoes.forEach(processarQuestao);
                
                // Gera a lista final blindada
                const listaFinalQuestoes = Array.from(mapaUnificado.values());
                
                // --- FIM DO MERGE INTELIGENTE ---

                // Aplica os dados gerais da nuvem (configurações, turmas, etc), mas preserva nossas questões tratadas
                this.state = { ...this.state, ...cloudData };
                this.state.questoes = listaFinalQuestoes;
                
                // Salva o resultado da fusão no LocalStorage
                this.saveLocal();
                
                // Se o Local tinha coisas mais novas que a Nuvem, precisamos subir essa versão final atualizada
                // Verificamos isso comparando o tamanho ou conteúdo, mas por segurança forçamos um sync se houver diferença
                if (listaFinalQuestoes.length !== cloudQuestoes.length) {
                     this.state.isCloudSynced = true;
                     await this.saveCloudRoot();
                     this.updateStatusCloud('<i class="fas fa-check"></i> Sincronizado (Merge)', 'text-emerald-600');
                } else {
                     this.state.isCloudSynced = true;
                     this.updateStatusCloud('<i class="fas fa-check"></i> Sincronizado', 'text-emerald-600');
                }

            } else {
                // Primeiro acesso
                this.state.isCloudSynced = true;
                this.saveCloudRoot();
            }
        } catch (e) {
            console.error("❌ Erro no sync cloud:", e);
            this.updateStatusCloud('Modo Offline', 'text-slate-500');
            this.state.isCloudSynced = true; // Permite trabalhar offline
        }

        // Listener para mudanças em tempo real (mantém atualizado se você mexer em outro PC)
        firebaseService.subscribeToUserChanges(this.currentUser.uid, (newData) => {
            if (newData && newData.questoes) {
                // Aqui poderíamos replicar a lógica de merge, mas para simplificar, 
                // assumimos que eventos em tempo real devem ser respeitados.
                // Mas cuidado: isso pode sobrescrever se você estiver digitando AGORA.
                // Como melhoria futura, não aplicamos patches diretos se houver edições pendentes.
                console.log("Recebendo atualização em tempo real...");
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

    _saveTimeout: null,

    async saveCloudRoot() {
        if (!this.state.isCloudSynced || !this.currentUser) return;
        this.updateStatusCloud('<i class="fas fa-pen"></i> Editando...', 'text-yellow-600');
        if (this._saveTimeout) clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(async () => {
            try {
                this.updateStatusCloud('<i class="fas fa-sync fa-spin"></i> Salvando...', 'text-blue-600');
                await firebaseService.saveRoot(this.currentUser.uid, this.state);
                this.updateStatusCloud('<i class="fas fa-check"></i> Salvo', 'text-emerald-600');
            } catch (err) {
            }
        }, 2000);
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