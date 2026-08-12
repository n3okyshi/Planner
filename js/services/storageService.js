const STORAGE_PREFIX = 'planner_pro_docente_2026';
const DB_NAME = 'planner_pro_db';
const DB_VERSION = 2;
const STORE_NAME = 'app_state';
const STATE_KEY = 'state_payload';
const QUEUE_STORE_NAME = 'offline_sync_queue';

export const storageService = {
    namespace: STORAGE_PREFIX,
    _dbPromise: null,
    _pendingSaveTimeout: null,
    _lastStateToSave: null,

    _openDB() {
        if (this._dbPromise) return this._dbPromise;

        if (typeof window === 'undefined' || !window.indexedDB) {
            return Promise.resolve(null);
        }

        this._dbPromise = new Promise((resolve) => {
            try {
                const request = window.indexedDB.open(DB_NAME, DB_VERSION);

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                    if (!db.objectStoreNames.contains(QUEUE_STORE_NAME)) {
                        db.createObjectStore(QUEUE_STORE_NAME, { keyPath: 'id' });
                    }
                };

                request.onsuccess = (event) => {
                    resolve(event.target.result);
                };

                request.onerror = (event) => {
                    console.warn('[storageService] IndexedDB indisponível, usando localStorage:', event.target.error);
                    resolve(null);
                };
            } catch (err) {
                console.warn('[storageService] Erro ao abrir IndexedDB:', err);
                resolve(null);
            }
        });

        return this._dbPromise;
    },

    async loadAsync() {
        try {
            const db = await this._openDB();
            if (db) {
                const data = await new Promise((resolve) => {
                    try {
                        const transaction = db.transaction([STORE_NAME], 'readonly');
                        const store = transaction.objectStore(STORE_NAME);
                        const request = store.get(STATE_KEY);

                        request.onsuccess = () => resolve(request.result || null);
                        request.onerror = () => resolve(null);
                    } catch (e) {
                        resolve(null);
                    }
                });

                if (data && typeof data === 'object') {
                    return data;
                }
            }
        } catch (e) {
            console.warn('[storageService] Falha ao ler IndexedDB, tentando localStorage:', e);
        }

        // Fallback e Migração do localStorage
        const legacyData = this.load();
        if (legacyData) {
            this.saveAsync(legacyData).catch(() => {});
        }
        return legacyData;
    },

    async saveAsync(value) {
        // Sanitiza profundamente para converter Proxies e objetos reativos em JSON puro (elimina DataCloneError)
        let cleanValue;
        try {
            cleanValue = JSON.parse(JSON.stringify(value));
        } catch (err) {
            console.warn('[storageService] Erro ao serializar valor:', err);
            cleanValue = value;
        }

        // Persistência rápida no localStorage (com try/catch silencioso para quota)
        this.save(cleanValue);

        // Armazena o último estado para persistência assíncrona debounced
        this._lastStateToSave = cleanValue;

        if (this._pendingSaveTimeout) {
            clearTimeout(this._pendingSaveTimeout);
        }

        return new Promise((resolve) => {
            this._pendingSaveTimeout = setTimeout(async () => {
                try {
                    const db = await this._openDB();
                    if (!db) {
                        resolve(false);
                        return;
                    }

                    const transaction = db.transaction([STORE_NAME], 'readwrite');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.put(this._lastStateToSave, STATE_KEY);

                    request.onsuccess = () => resolve(true);
                    request.onerror = (err) => {
                        console.warn('[storageService] Erro ao salvar no IndexedDB:', err);
                        resolve(false);
                    };
                } catch (e) {
                    console.warn('[storageService] Erro na transação IndexedDB:', e);
                    resolve(false);
                }
            }, 100);
        });
    },

    load() {
        try {
            const payload = localStorage.getItem(this.namespace);
            return payload ? JSON.parse(payload) : null;
        } catch (error) {
            console.warn('[storageService] Falha ao ler localStorage:', error);
            return null;
        }
    },

    save(value) {
        try {
            const cleanStr = typeof value === 'string' ? value : JSON.stringify(value);
            localStorage.setItem(this.namespace, cleanStr);
            return true;
        } catch (error) {
            // Quota do localStorage excedida - suprimido silenciosamente pois o IndexedDB assume o volume total
            return false;
        }
    },

    async clear() {
        try {
            localStorage.removeItem(this.namespace);
            const db = await this._openDB();
            if (db) {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                store.clear();
            }
        } catch (e) {
            console.warn('[storageService] Erro ao limpar storage:', e);
        }
    },

    exportBackup(data) {
        let payload;
        try {
            payload = JSON.stringify(data, null, 2);
        } catch (e) {
            payload = JSON.stringify(JSON.parse(JSON.stringify(data)), null, 2);
        }
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `backup_planner_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    },

    /**
     * Exporta os dados consolidados do Conselho de Classe em CSV padronizado (com delimitador ';' e UTF-8 BOM)
     * compatível com Excel e sistemas de gestão de secretarias (SED/SIGE).
     * @param {Object} turma - Objeto da Turma
     * @param {Array<Object>} linhasConselho - Dados consolidados dos alunos
     * @param {Object} metadados - Metadados da escola e período
     */
    exportarAtaConselhoCSV(turma, linhasConselho, metadados = {}) {
        if (!turma || !Array.isArray(linhasConselho)) return;

        const headers = [
            'Matrícula',
            'Nome do Estudante',
            '1º Bimestre',
            '2º Bimestre',
            '3º Bimestre',
            '4º Bimestre',
            'Média Anual',
            'Aulas Dadas',
            'Faltas',
            'Frequência (%)',
            'Situação Acadêmica',
            'Risco Pedagógico',
            'Deliberação / Observações do Conselho'
        ];

        const rows = linhasConselho.map(item => [
            `"${(item.matricula || '').replace(/"/g, '""')}"`,
            `"${(item.nome || '').replace(/"/g, '""')}"`,
            item.n1 !== undefined && item.n1 !== null ? Number(item.n1).toFixed(1).replace('.', ',') : '-',
            item.n2 !== undefined && item.n2 !== null ? Number(item.n2).toFixed(1).replace('.', ',') : '-',
            item.n3 !== undefined && item.n3 !== null ? Number(item.n3).toFixed(1).replace('.', ',') : '-',
            item.n4 !== undefined && item.n4 !== null ? Number(item.n4).toFixed(1).replace('.', ',') : '-',
            item.mediaFinal !== undefined ? Number(item.mediaFinal).toFixed(1).replace('.', ',') : '0,0',
            item.totalAulas || 0,
            item.totalFaltas || 0,
            `${item.freqPct || 100}%`,
            `"${(item.situacao || 'Regular').replace(/"/g, '""')}"`,
            `"${(item.risco || 'Nenhum').replace(/"/g, '""')}"`,
            `"${(item.deliberacao || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = '\uFEFF' + [
            `# ATA DE CONSELHO DE CLASSE - ${turma.nome || 'TURMA'}`,
            `# ESCOLA: ${metadados.escola || 'Não informada'} | ANO LETIVO: ${metadados.anoLetivo || 2026}`,
            `# DATA DE EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}`,
            '',
            headers.join(';'),
            ...rows.map(r => r.join(';'))
        ].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `ata_conselho_${(turma.nome || 'turma').replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    },

    /**
     * Exporta os dados da Ata do Conselho de Classe em JSON estruturado para interoperabilidade com o Censo/SIGE.
     * @param {Object} turma 
     * @param {Array<Object>} linhasConselho 
     * @param {Object} metadados 
     */
    exportarAtaConselhoJSON(turma, linhasConselho, metadados = {}) {
        if (!turma || !Array.isArray(linhasConselho)) return;

        const payload = {
            versaoSchema: "2.0",
            geradoEm: new Date().toISOString(),
            escola: metadados.escola || "",
            anoLetivo: metadados.anoLetivo || 2026,
            turma: {
                id: turma.id,
                nome: turma.nome,
                nivel: turma.nivel || "Fundamental",
                disciplina: turma.disciplina || "Geral"
            },
            estatisticas: metadados.estatisticas || {},
            estudantes: linhasConselho
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `ata_conselho_${(turma.nome || 'turma').replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    },

    /**
     * Enfileira uma operação de persistência quando o usuário está sem conexão.
     * @param {Object} operacao - { id, tipo, colecao, docId, dados, timestamp }
     */
    async enfileirarOperacaoOffline(operacao) {
        if (!operacao) return;
        const op = {
            id: operacao.id || ('op_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6)),
            timestamp: operacao.timestamp || Date.now(),
            ...operacao
        };

        try {
            const db = await this._openDB();
            if (db) {
                await new Promise((resolve, reject) => {
                    const tx = db.transaction([QUEUE_STORE_NAME], 'readwrite');
                    const store = tx.objectStore(QUEUE_STORE_NAME);
                    const req = store.put(op);
                    req.onsuccess = () => resolve(true);
                    req.onerror = (err) => reject(err);
                });
            }
        } catch (e) {
            console.warn('[storageService] Erro ao enfileirar no IndexedDB, usando fallback:', e);
            try {
                const fila = JSON.parse(localStorage.getItem('planner_offline_queue') || '[]');
                fila.push(op);
                localStorage.setItem('planner_offline_queue', JSON.stringify(fila));
            } catch (err) {}
        }

        // Solicita registro na Background Sync API se suportado
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
            try {
                const reg = await navigator.serviceWorker.ready;
                if (reg && reg.sync) {
                    await reg.sync.register('sync-offline-operations');
                }
            } catch (e) {
                // Background Sync não suportado ou negado; fallback no evento window 'online'
            }
        }
    },

    /**
     * Retorna todas as operações pendentes na fila offline.
     * @returns {Promise<Array<Object>>}
     */
    async obterFilaOffline() {
        try {
            const db = await this._openDB();
            if (db) {
                const ops = await new Promise((resolve) => {
                    const tx = db.transaction([QUEUE_STORE_NAME], 'readonly');
                    const store = tx.objectStore(QUEUE_STORE_NAME);
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = () => resolve([]);
                });
                if (ops && ops.length > 0) return ops;
            }
        } catch (e) {}

        try {
            return JSON.parse(localStorage.getItem('planner_offline_queue') || '[]');
        } catch (e) {
            return [];
        }
    },

    /**
     * Remove uma operação concluída da fila offline.
     * @param {string} id 
     */
    async removerOperacaoOffline(id) {
        if (!id) return;
        try {
            const db = await this._openDB();
            if (db) {
                await new Promise((resolve) => {
                    const tx = db.transaction([QUEUE_STORE_NAME], 'readwrite');
                    const store = tx.objectStore(QUEUE_STORE_NAME);
                    const req = store.delete(id);
                    req.onsuccess = () => resolve(true);
                    req.onerror = () => resolve(false);
                });
            }
        } catch (e) {}

        try {
            const fila = JSON.parse(localStorage.getItem('planner_offline_queue') || '[]');
            const filtrada = fila.filter(item => item.id !== id);
            localStorage.setItem('planner_offline_queue', JSON.stringify(filtrada));
        } catch (e) {}
    },

    /**
     * Limpa toda a fila offline após sincronização bem-sucedida.
     */
    async limparFilaOffline() {
        try {
            const db = await this._openDB();
            if (db) {
                const tx = db.transaction([QUEUE_STORE_NAME], 'readwrite');
                const store = tx.objectStore(QUEUE_STORE_NAME);
                store.clear();
            }
        } catch (e) {}
        try {
            localStorage.removeItem('planner_offline_queue');
        } catch (e) {}
    }
};

if (typeof window !== 'undefined') {
    window.storageService = storageService;
}
