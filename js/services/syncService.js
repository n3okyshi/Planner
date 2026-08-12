import { firebaseService } from '../firebase-service.js';
import { storageService } from './storageService.js';
import { Toast } from '../components/toast.js';

export const syncService = {
    _isProcessingQueue: false,
    _syncListenersInitialized: false,

    /**
     * Inicializa os ouvintes de rede (online/offline) e mensagens do Service Worker (Background Sync).
     */
    init() {
        if (this._syncListenersInitialized || typeof window === 'undefined') return;
        this._syncListenersInitialized = true;

        // Ouvinte do Service Worker para o evento Background Sync
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'PROCESS_OFFLINE_SYNC') {
                    console.log('[syncService] Mensagem de Background Sync recebida do SW');
                    this.processarFilaOffline();
                }
            });
        }

        // Ouvinte de conexão restabelecida no navegador (fallback para iOS / Safari)
        window.addEventListener('online', () => {
            console.log('[syncService] Conexão restabelecida via evento window.online');
            this.atualizarIndicadorUI('online');
            this.processarFilaOffline();
        });

        window.addEventListener('offline', () => {
            console.log('[syncService] Dispositivo desconectado da rede');
            this.atualizarIndicadorUI('offline');
        });

        // Estado inicial
        if (!navigator.onLine) {
            this.atualizarIndicadorUI('offline');
        } else {
            this.atualizarIndicadorUI('online');
            // Verifica se há fila pendente ao iniciar
            this.processarFilaOffline();
        }
    },

    /**
     * Atualiza o indicador visual de nuvem no cabeçalho (#cloud-status).
     * @param {'sincronizando'|'online'|'offline'|'erro'} estado 
     */
    atualizarIndicadorUI(estado) {
        if (typeof document === 'undefined') return;
        const badge = document.getElementById('cloud-status');
        if (!badge) return;

        switch (estado) {
            case 'sincronizando':
                badge.innerHTML = '<i class="fas fa-sync fa-spin" style="color: #d97706;"></i>';
                badge.title = 'Sincronizando alterações com a nuvem...';
                badge.style.borderColor = '#fde68a';
                break;
            case 'offline':
                badge.innerHTML = '<i class="fas fa-cloud-slash" style="color: #94a3b8;"></i>';
                badge.title = 'Modo Offline: Alterações salvas localmente e enfileiradas.';
                badge.style.borderColor = '#cbd5e1';
                break;
            case 'erro':
                badge.innerHTML = '<i class="fas fa-exclamation-circle" style="color: #ef4444;"></i>';
                badge.title = 'Erro de sincronização. Nova tentativa automática.';
                badge.style.borderColor = '#fca5a5';
                break;
            case 'online':
            default:
                badge.innerHTML = '<i class="fas fa-cloud text-emerald-500" style="color: #10b981;"></i>';
                badge.title = 'Nuvem sincronizada em tempo real.';
                badge.style.borderColor = 'var(--color-slate-200)';
                break;
        }
    },

    /**
     * Processa todas as alterações enfileiradas no IndexedDB durante o período offline,
     * aplicando resolução de conflitos (Last-Write-Wins baseado em timestamp).
     */
    async processarFilaOffline() {
        if (this._isProcessingQueue || (typeof navigator !== 'undefined' && !navigator.onLine)) {
            return;
        }

        const fila = await storageService.obterFilaOffline();
        if (!Array.isArray(fila) || fila.length === 0) {
            this.atualizarIndicadorUI('online');
            return;
        }

        this._isProcessingQueue = true;
        this.atualizarIndicadorUI('sincronizando');
        console.log(`[syncService] Processando ${fila.length} operações offline pendentes...`);

        // Ordena operações por timestamp crescente (garante ordenação cronológica)
        const filaOrdenada = [...fila].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        let sucessos = 0;

        for (const op of filaOrdenada) {
            try {
                let ok = false;
                const uid = op.uid || (window.model && window.model.currentUser ? window.model.currentUser.uid : null);

                if (uid && firebaseService && firebaseService.initialized) {
                    if (op.tipo === 'salvar_turma' && op.turma) {
                        await firebaseService.saveTurma(uid, op.turma);
                        ok = true;
                    } else if (op.tipo === 'salvar_aluno' && op.turmaId && op.aluno) {
                        await firebaseService.saveAluno(uid, op.turmaId, op.aluno);
                        ok = true;
                    } else if (op.tipo === 'salvar_root' && op.dados) {
                        await firebaseService.saveRoot(uid, op.dados);
                        ok = true;
                    } else if (op.tipo === 'salvar_avaliacao' && op.turmaId && op.avaliacao) {
                        await firebaseService.saveAvaliacao(uid, op.turmaId, op.avaliacao);
                        ok = true;
                    } else {
                        // Operação genérica
                        ok = true;
                    }
                } else {
                    // Sem usuário autenticado na nuvem, encerra o loop sem remover
                    break;
                }

                if (ok) {
                    await storageService.removerOperacaoOffline(op.id);
                    sucessos++;
                }
            } catch (err) {
                console.warn(`[syncService] Erro ao sincronizar operação ${op.id}:`, err);
            }
        }

        this._isProcessingQueue = false;
        const filaRestante = await storageService.obterFilaOffline();

        if (filaRestante.length === 0) {
            this.atualizarIndicadorUI('online');
            if (sucessos > 0) {
                Toast.show(`☁️ ${sucessos} alteraç${sucessos > 1 ? 'ões' : 'ão'} offline sincronizada${sucessos > 1 ? 's' : ''} com sucesso!`, 'info');
            }
        } else {
            this.atualizarIndicadorUI('sincronizando');
        }
    },

    async loadUser(uid) {
        if (!uid || !firebaseService || !firebaseService.loadFullData) return null;
        return firebaseService.loadFullData(uid);
    },
    async persistUser(uid, payload) {
        if (!uid || !firebaseService || !firebaseService.saveRoot) {
            await storageService.enfileirarOperacaoOffline({ tipo: 'salvar_root', uid, dados: payload });
            return true;
        }
        try {
            await firebaseService.saveRoot(uid, payload);
            return true;
        } catch (e) {
            await storageService.enfileirarOperacaoOffline({ tipo: 'salvar_root', uid, dados: payload });
            return true;
        }
    },
    async persistTurma(uid, turma) {
        if (!uid || !firebaseService || !firebaseService.saveTurma) {
            await storageService.enfileirarOperacaoOffline({ tipo: 'salvar_turma', uid, turma });
            return true;
        }
        try {
            await firebaseService.saveTurma(uid, turma);
            return true;
        } catch (e) {
            await storageService.enfileirarOperacaoOffline({ tipo: 'salvar_turma', uid, turma });
            return true;
        }
    },
    async persistAluno(uid, turmaId, aluno) {
        if (!uid || !firebaseService || !firebaseService.saveAluno) {
            await storageService.enfileirarOperacaoOffline({ tipo: 'salvar_aluno', uid, turmaId, aluno });
            return true;
        }
        try {
            await firebaseService.saveAluno(uid, turmaId, aluno);
            return true;
        } catch (e) {
            await storageService.enfileirarOperacaoOffline({ tipo: 'salvar_aluno', uid, turmaId, aluno });
            return true;
        }
    },
    async forcarSincronizacao() {
        if (!navigator.onLine) {
            Toast.show("Dispositivo desconectado da internet. Conecte-se para sincronizar.", "warning");
            return { sucesso: false, motivo: 'offline' };
        }
        this.atualizarIndicadorUI('sincronizando');
        try {
            await this.processarFilaOffline();
            if (window.model && window.model.currentUser && firebaseService && firebaseService.saveRoot) {
                await firebaseService.saveRoot(window.model.currentUser.uid, window.model.state);
            }
            this.atualizarIndicadorUI('online');
            Toast.show("Sincronização com a nuvem concluída!", "success");
            return { sucesso: true };
        } catch (e) {
            console.error("Erro na sincronização forçada:", e);
            this.atualizarIndicadorUI('erro');
            Toast.show("Falha ao sincronizar com o Firebase.", "error");
            return { sucesso: false, erro: e.message };
        }
    },
    async obterDetalhesFilaOffline() {
        const fila = (await storageService.obterFilaOffline()) || [];
        return fila.map(op => {
            let label = 'Operação Pendente';
            let detalhe = '';

            if (op.tipo === 'salvar_turma') {
                label = 'Turma';
                detalhe = op.turma?.nome || 'Dados da Turma';
            } else if (op.tipo === 'salvar_aluno') {
                label = 'Estudante';
                detalhe = op.aluno?.nome ? `${op.aluno.nome} (Turma ID ${op.turmaId})` : 'Dados do Estudante';
            } else if (op.tipo === 'salvar_avaliacao') {
                label = 'Avaliação';
                detalhe = op.avaliacao?.nome ? `${op.avaliacao.nome} (${op.avaliacao.periodo}º Bim)` : 'Avaliação';
            } else if (op.tipo === 'salvar_root') {
                label = 'Backup Geral';
                detalhe = 'Snapshot do Planejamento & Estado';
            }

            return {
                id: op.id,
                tipo: op.tipo,
                label,
                detalhe,
                timestamp: op.timestamp || Date.now(),
                dataHora: new Date(op.timestamp || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };
        });
    }
};

if (typeof window !== 'undefined') {
    window.syncService = syncService;
}

