import { firebaseService } from './firebase-service.js';
import { initialState, coresComponentes, tiposEventos } from './models/state.js';
import { turmaMethods } from './models/turmaModel.js';
import { provaMethods } from './models/provaModel.js';
import { planejamentoMethods } from './models/planejamentoModel.js';

/**
 * @typedef {import('./models/state.js').initialState} AppState
 */
export const model = {
    STORAGE_KEY: 'planner_pro_docente_2026',
    currentUser: null,
    coresComponentes,
    tiposEventos,
    
    /** @type {AppState} */

    state: initialState,
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
    saveLocal() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    },
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
    updateStatusCloud(html, colorClass) {
        const el = document.getElementById('cloud-status');
        if (el) {
            el.innerHTML = html;
            el.className = `flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-100 text-xs font-bold transition-all shadow-sm ${colorClass}`;
        }
    },
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
    // Retrocompatibilidade
    addQuestao(obj) { this.saveQuestao(obj); },
    updateQuestao(id, dados) { this.saveQuestao({ ...dados, id }); }
};
if (typeof window !== 'undefined') {
    window.model = model;
    window.firebaseService = firebaseService; 
    model.init();
}