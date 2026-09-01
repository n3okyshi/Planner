
import { firebaseService } from './firebase-service.js';
import { syncService } from './services/syncService.js';
import { storageService } from './services/storageService.js';
import { Toast } from './components/toast.js';
import { initialState, coresComponentes, tiposEventos } from './models/state.js';
import { turmaMethods } from './models/turmaModel.js';
import { provaMethods } from './models/provaModel.js';
import { planejamentoMethods } from './models/planejamentoModel.js';
import { apresentacaoMethods } from './models/apresentacaoModel.js';
import { debounce } from './utils.js';
import { createReactiveState } from './reactive.js';
export const model = {
    STORAGE_KEY: 'planner_pro_docente_2026',
    currentUser: null,
    coresComponentes,
    tiposEventos,
    state: initialState,
    _isHydrating: false,
    _isRemoteSyncing: false,
    _bus: new EventTarget(),

    /**
     * Inscreve um ouvinte para um evento de estado/domínio
     * @param {string} evento - Ex: 'turmas:changed', 'state:changed'
     * @param {Function} callback - Recebe o detalhe do evento
     * @param {Object} [options] - Opções de addEventListener (ex: { once: true, signal })
     * @returns {Function} Função de cancelamento (unsubscribe)
     */
    on(evento, callback, options = {}) {
        const handler = (e) => callback(e.detail);
        this._bus.addEventListener(evento, handler, options);
        return () => this._bus.removeEventListener(evento, handler, options);
    },

    /**
     * Remove um ouvinte previamente registrado
     */
    off(evento, handler, options = {}) {
        this._bus.removeEventListener(evento, handler, options);
    },

    /**
     * Dispara um evento de domínio através do barramento nativo
     * @param {string} evento 
     * @param {any} [detalhe] 
     */
    emit(evento, detalhe = {}) {
        this._bus.dispatchEvent(new CustomEvent(evento, { detail: detalhe }));
    },

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
            if (this._isHydrating || this._isRemoteSyncing) return;
            try {
                storageService.saveAsync(this.state);
            } catch (e) {
                console.warn("Erro no AutoSave IndexedDB:", e);
            }
            if (this._debouncedCloudSave) {
                this._debouncedCloudSave();
            }

            // Emite evento global de alteração de estado
            this.emit('state:changed', { caminho, novoValor, valorAntigo });

            // Emite eventos de domínio especializados baseados na raiz da mutação
            if (caminho.startsWith('turmas')) {
                this.emit('turmas:changed', { caminho, novoValor, valorAntigo });
            } else if (caminho.startsWith('materiaisGerados')) {
                this.emit('materiais:changed', { caminho, novoValor, valorAntigo });
            } else if (caminho.startsWith('userConfig')) {
                this.emit('config:changed', { caminho, novoValor, valorAntigo });
            } else if (caminho.startsWith('planejamentos')) {
                this.emit('planejamento:changed', { caminho, novoValor, valorAntigo });
            } else if (caminho.startsWith('bancoQuestoes')) {
                this.emit('questoes:changed', { caminho, novoValor, valorAntigo });
            } else if (caminho.startsWith('apresentacoes')) {
                this.emit('apresentacoes:changed', { caminho, novoValor, valorAntigo });
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
                    this.emit('state:hydrated', { source: 'indexedDB' });
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

        // 2. Turmas (Merge por ID e timestamp granular com subcoleções de alunos e avaliações)
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
                
                // Mesclagem granular de alunos da turma por ID/número
                const alunosMap = new Map();
                (lt.alunos || []).forEach(a => alunosMap.set(String(a.id || a.numero), a));
                (ct.alunos || []).forEach(ca => {
                    const aid = String(ca.id || ca.numero);
                    const la = alunosMap.get(aid);
                    if (!la) {
                        alunosMap.set(aid, ca);
                    } else {
                        const tC = new Date(ca.updatedAt || 0).getTime();
                        const tL = new Date(la.updatedAt || 0).getTime();
                        const mergedAluno = tC >= tL ? { ...la, ...ca } : { ...ca, ...la };
                        // Deep merge das frequências diárias para blindar contra perda de presenças/faltas/justificativas
                        mergedAluno.frequencia = {
                            ...(la.frequencia || {}),
                            ...(ca.frequencia || {})
                        };
                        alunosMap.set(aid, mergedAluno);
                    }
                });

                // Mesclagem granular de avaliações da turma por ID
                const avMap = new Map();
                (lt.avaliacoes || []).forEach(av => avMap.set(String(av.id), av));
                (ct.avaliacoes || []).forEach(cav => {
                    const avid = String(cav.id);
                    const lav = avMap.get(avid);
                    if (!lav) {
                        avMap.set(avid, cav);
                    } else {
                        const tC = new Date(cav.updatedAt || 0).getTime();
                        const tL = new Date(lav.updatedAt || 0).getTime();
                        avMap.set(avid, tC >= tL ? { ...lav, ...cav } : { ...cav, ...lav });
                    }
                });

                const mergedTurma = timeCloud >= timeLocal ? { ...lt, ...ct } : { ...ct, ...lt };
                mergedTurma.alunos = Array.from(alunosMap.values());
                mergedTurma.avaliacoes = Array.from(avMap.values());
                turmasMap.set(id, mergedTurma);
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

            const getTime = (item) => {
                const t = item.updatedAt || item.deletadoEm || item.createdAt;
                return t ? new Date(t).getTime() : 0;
            };

            cloudArr.forEach(item => {
                const id = String(item.id);
                const existente = map.get(id);
                if (!existente) {
                    map.set(id, item);
                } else {
                    const timeC = getTime(item);
                    const timeL = getTime(existente);
                    if (timeC > timeL) {
                        map.set(id, item);
                    } else if (timeC === timeL) {
                        // Empate exato: se a versão da nuvem tiver a flag naLixeira (ou updatedAt), prioriza ela
                        if (item.naLixeira && !existente.naLixeira) {
                            map.set(id, item);
                        } else if (!item.naLixeira && existente.naLixeira) {
                            // Mantém a versão local já marcada como lixeira
                        } else {
                            map.set(id, item);
                        }
                    }
                }
            });
            return Array.from(map.values());
        };

        const COLECOES_ARRAY = ['questoes', 'materiaisGerados', 'quizzes', 'flashcards', 'mindmaps', 'apresentacoes', 'pdis', 'pastasEstudos', 'pastasMateriais'];
        COLECOES_ARRAY.forEach(key => {
            merged[key] = mergeColecaoPorId(local[key] || [], cloud[key] || []);
        });

        // Auto-reconciliação de integridade para pastas de materiais
        if (merged.materiaisGerados && Array.isArray(merged.materiaisGerados)) {
            if (!merged.pastasMateriais) merged.pastasMateriais = [];
            const pastaIdsExistentes = new Set(merged.pastasMateriais.map(p => String(p.id)));
            merged.materiaisGerados.forEach(m => {
                if (m.pastaId && !pastaIdsExistentes.has(String(m.pastaId))) {
                    const nomePasta = m.nomePasta || 'Pasta de Materiais';
                    merged.pastasMateriais.push({
                        id: String(m.pastaId),
                        nome: nomePasta,
                        parentId: null,
                        createdAt: new Date().toISOString()
                    });
                    pastaIdsExistentes.add(String(m.pastaId));
                }
            });
        }

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

                // Auto-Upload Reconciliador: Se o estado local continha pastas de materiais ou estudos que
                // faltavam na nuvem (ex: criadas no desktop antes do sync), faz o upload imediato ao Firestore!
                if (firebaseService && typeof firebaseService.saveRoot === 'function') {
                    const localTinhaMaisPastas = (merged.pastasMateriais?.length > (cloudData.pastasMateriais?.length || 0)) ||
                                                 (merged.pastasEstudos?.length > (cloudData.pastasEstudos?.length || 0));
                    if (localTinhaMaisPastas) {
                        console.log("🚀 [model] Sincronizando pastas locais existentes com a nuvem Firestore...");
                        firebaseService.saveRoot(this.currentUser.uid, merged).catch(e => console.warn("Aviso ao auto-sincronizar pastas com a nuvem:", e));
                    }
                }

                this.emit('materiais:changed', { timestamp: Date.now(), source: 'cloud' });
                this.emit('estudos:changed', { timestamp: Date.now(), source: 'cloud' });
                this.emit('state:hydrated', { source: 'cloud' });
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
                this._isRemoteSyncing = true;
                try {
                    const merged = this.mergeStates(this.state, newData);
                    Object.keys(merged).forEach(k => {
                        this.state[k] = merged[k];
                    });
                    storageService.saveAsync(this.state).catch(() => { });
                    this.emit('materiais:changed', { timestamp: Date.now(), source: 'cloud-snapshot' });
                    this.emit('estudos:changed', { timestamp: Date.now(), source: 'cloud-snapshot' });
                    this.emit('state:hydrated', { source: 'cloud-snapshot' });
                } finally {
                    setTimeout(() => {
                        this._isRemoteSyncing = false;
                    }, 50);
                }
            }
        });
    },
    saveLocal() {
        try {
            storageService.saveAsync(this.state).catch(() => { });
        } catch (e) {
            console.warn("Erro ao salvar estado local:", e);
        }
        this._debouncedCloudSave();
    },
    _debouncedCloudSave: debounce(async function () {
        if (!this.state.isCloudSynced || !this.currentUser || this._isHydrating || this._isRemoteSyncing) return;
        this.updateStatusCloud('<i class="fas fa-pen"></i> Sincronizando...', 'text-yellow-600');
        try {
            await firebaseService.saveRoot(this.currentUser.uid, this.state);
            this.updateStatusCloud('<i class="fas fa-check"></i> Salvo na Nuvem', 'text-emerald-600');
        } catch (err) {
            console.warn("Erro no AutoSave Cloud:", err);
            this.updateStatusCloud('Offline (Salvo Local)', 'text-slate-500');
        }
    }, 2000),
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
            let formattedHtml = html;
            if (!html.includes('desktop-only') && html.includes('</i>')) {
                formattedHtml = html.replace(/(<\/i>)\s*([^<]+)/, '$1 <span class="desktop-only">$2</span>');
            } else if (!html.includes('<i') && !html.includes('desktop-only')) {
                formattedHtml = `<i class="fas fa-cloud"></i> <span class="desktop-only">${html}</span>`;
            }
            el.innerHTML = formattedHtml;
            el.className = `status-badge ${colorClass || ''}`;
        }
    },
    exportData() {
        storageService.exportBackup(this.state);
    },
    // =========================================================================
    // HELPERS GENÉRICOS UNIFICADOS (DRY & SRP) DE GERENCIAMENTO DE ESTADO E TOAST
    // =========================================================================
    _notify(mensagem, tipo = 'info') {
        Toast.show(mensagem, tipo);
    },

    _salvarItemColecao(nomeColecao, item, prefixoId = 'item') {
        if (!this.state[nomeColecao]) this.state[nomeColecao] = [];
        const cleanItem = JSON.parse(JSON.stringify(item));
        const dataAgora = new Date().toISOString();
        const itemAtualizado = {
            id: cleanItem.id || `${prefixoId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
            createdAt: cleanItem.createdAt || dataAgora,
            updatedAt: dataAgora,
            ...cleanItem
        };

        const index = this.state[nomeColecao].findIndex(x => String(x.id) === String(itemAtualizado.id));
        if (index !== -1) {
            this.state[nomeColecao][index] = itemAtualizado;
        } else {
            this.state[nomeColecao].push(itemAtualizado);
        }
        this.saveLocal();
        return itemAtualizado;
    },

    _moverParaLixeiraColecao(nomeColecao, id, labelEntidade = 'Item', aoMoverCloud = null, silencioso = false) {
        if (!this.state[nomeColecao]) this.state[nomeColecao] = [];
        const index = this.state[nomeColecao].findIndex(x => String(x.id) === String(id));
        if (index !== -1) {
            const dataAgora = new Date().toISOString();
            const itemLixeira = {
                ...this.state[nomeColecao][index],
                naLixeira: true,
                deletadoEm: dataAgora,
                updatedAt: dataAgora
            };
            this.state[nomeColecao][index] = itemLixeira;
            this.saveLocal();
            if (typeof aoMoverCloud === 'function') {
                aoMoverCloud(itemLixeira);
            }
            if (!silencioso) {
                this._notify(`${labelEntidade} enviado(a) para a lixeira.`, 'info');
            }
            this._atualizarViewsMaterial();
            return itemLixeira;
        }
        return false;
    },

    _restaurarDaLixeiraColecao(nomeColecao, id, labelEntidade = 'Item', aoRestaurarCloud = null) {
        if (!this.state[nomeColecao]) this.state[nomeColecao] = [];
        const index = this.state[nomeColecao].findIndex(x => String(x.id) === String(id));
        if (index !== -1) {
            const itemRestaurado = {
                ...this.state[nomeColecao][index],
                naLixeira: false,
                deletadoEm: null,
                updatedAt: new Date().toISOString()
            };
            this.state[nomeColecao][index] = itemRestaurado;
            this.saveLocal();
            if (typeof aoRestaurarCloud === 'function') {
                aoRestaurarCloud(itemRestaurado);
            }
            this._notify(`${labelEntidade} restaurado(a) com sucesso!`, 'success');
            this._atualizarViewsMaterial();
            return itemRestaurado;
        }
        return false;
    },

    _deletarPermanenteColecao(nomeColecao, id, labelEntidade = 'Item', aoDeletarCloud = null) {
        if (!this.state[nomeColecao]) this.state[nomeColecao] = [];
        const idStr = String(id);
        const tamanhoInicial = this.state[nomeColecao].length;
        this.state[nomeColecao] = this.state[nomeColecao].filter(x => String(x.id) !== idStr);
        if (this.state[nomeColecao].length < tamanhoInicial) {
            this.saveLocal();
            if (typeof aoDeletarCloud === 'function') {
                aoDeletarCloud(idStr);
            }
            this._notify(`${labelEntidade} excluído(a) permanentemente.`, 'info');
            this._atualizarViewsMaterial();
            return true;
        }
        return false;
    },

    // =========================================================================
    // MATERIAIS PEDAGÓGICOS
    // =========================================================================
    async saveMaterial(material) {
        const novoMaterial = this._salvarItemColecao('materiaisGerados', material, 'mat');
        if (this.currentUser) {
            syncService.persistMaterialDoc(this.currentUser.uid, novoMaterial);
        }
        this._atualizarViewsMaterial();
        return novoMaterial;
    },

    async updateMaterial(id, dadosAtualizados) {
        if (!this.state.materiaisGerados) this.state.materiaisGerados = [];
        const index = this.state.materiaisGerados.findIndex(m => String(m.id) === String(id));
        if (index !== -1) {
            const matAtualizado = {
                ...this.state.materiaisGerados[index],
                ...dadosAtualizados,
                updatedAt: new Date().toISOString()
            };
            this.state.materiaisGerados[index] = matAtualizado;
            this.saveLocal();
            if (this.currentUser) {
                syncService.persistMaterialDoc(this.currentUser.uid, matAtualizado);
            }
            this._atualizarViewsMaterial();
            return matAtualizado;
        }
    },

    async deleteMaterial(id) {
        return this.moverMaterialParaLixeira(id);
    },

    async moverMaterialParaLixeira(id) {
        return this._moverParaLixeiraColecao('materiaisGerados', id, 'Material', (item) => {
            if (this.currentUser) syncService.persistMaterialDoc(this.currentUser.uid, item);
        });
    },

    async moverMateriaisParaLixeiraEmMassa(idsArray) {
        if (!idsArray || !idsArray.length) return;
        idsArray.forEach(id => {
            this._moverParaLixeiraColecao('materiaisGerados', id, 'Material', (item) => {
                if (this.currentUser) syncService.persistMaterialDoc(this.currentUser.uid, item);
            }, true);
        });
        this._notify(`${idsArray.length} materiais enviados para a lixeira.`, 'info');
        this._atualizarViewsMaterial();
        return true;
    },

    async restaurarMaterialDaLixeira(id) {
        return this._restaurarDaLixeiraColecao('materiaisGerados', id, 'Material', (item) => {
            if (this.currentUser) syncService.persistMaterialDoc(this.currentUser.uid, item);
        });
    },

    async deleteMaterialPermanente(id) {
        return this._deletarPermanenteColecao('materiaisGerados', id, 'Material', (idStr) => {
            if (this.currentUser) syncService.deleteMaterialDoc(this.currentUser.uid, idStr);
        });
    },

    // =========================================================================
    // FLASHCARDS & MAPAS MENTAIS (CRUD UNIFICADO)
    // =========================================================================
    async saveFlashcardDeck(deck) {
        return this._salvarItemColecao('flashcards', deck, 'deck');
    },

    async deleteFlashcardDeck(deckId) {
        return this.moverFlashcardParaLixeira(deckId);
    },

    async moverFlashcardParaLixeira(deckId) {
        return this._moverParaLixeiraColecao('flashcards', deckId, 'Baralho de Flashcards');
    },

    async restaurarFlashcardDaLixeira(deckId) {
        return this._restaurarDaLixeiraColecao('flashcards', deckId, 'Baralho de Flashcards');
    },

    async deleteFlashcardDeckPermanente(deckId) {
        return this._deletarPermanenteColecao('flashcards', deckId, 'Baralho de Flashcards');
    },

    async saveMindmap(mindmap) {
        return this._salvarItemColecao('mindmaps', mindmap, 'map');
    },

    async deleteMindmap(mindmapId) {
        return this.moverMindmapParaLixeira(mindmapId);
    },

    async moverMindmapParaLixeira(mindmapId) {
        return this._moverParaLixeiraColecao('mindmaps', mindmapId, 'Mapa Mental');
    },

    async restaurarMindmapDaLixeira(mindmapId) {
        return this._restaurarDaLixeiraColecao('mindmaps', mindmapId, 'Mapa Mental');
    },

    async deleteMindmapPermanente(mindmapId) {
        return this._deletarPermanenteColecao('mindmaps', mindmapId, 'Mapa Mental');
    },

    async esvaziarLixeira() {
        if (!this.state.materiaisGerados) this.state.materiaisGerados = [];
        if (!this.state.flashcards) this.state.flashcards = [];
        if (!this.state.mindmaps) this.state.mindmaps = [];

        const idsMateriais = this.state.materiaisGerados.filter(m => m.naLixeira).map(m => m.id);
        if (idsMateriais.length) {
            await this.deleteMateriaisPermanentesEmMassa(idsMateriais);
        }

        this.state.flashcards = this.state.flashcards.filter(d => !d.naLixeira);
        this.state.mindmaps = this.state.mindmaps.filter(m => !m.naLixeira);

        this.saveLocal();
        this._atualizarViewsMaterial();
        return true;
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
    criarPastaMaterial(nome, parentId = null) {
        if (!this.state.pastasMateriais) this.state.pastasMateriais = [];
        const novaPasta = {
            id: 'pasta_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            nome: (nome || 'Nova Pasta').trim(),
            parentId: parentId || null,
            createdAt: new Date().toISOString()
        };
        this.state.pastasMateriais.push(novaPasta);
        this.saveLocal();
        if (this.currentUser && firebaseService && typeof firebaseService.saveRoot === 'function') {
            firebaseService.saveRoot(this.currentUser.uid, this.state).catch(e => console.warn("Erro ao sincronizar pasta na nuvem:", e));
        }
        if (Toast) Toast.show(`Pasta "${novaPasta.nome}" criada com sucesso.`, 'success');
        this._atualizarViewsMaterial();
        return novaPasta;
    },

    excluirPastaMaterial(pastaId) {
        if (!this.state.pastasMateriais) this.state.pastasMateriais = [];
        if (this.state.materiaisGerados) {
            this.state.materiaisGerados.forEach(m => {
                if (String(m.pastaId) === String(pastaId)) {
                    m.pastaId = null;
                }
            });
        }
        const pastaAlvo = this.state.pastasMateriais.find(p => String(p.id) === String(pastaId));
        const parentId = pastaAlvo ? pastaAlvo.parentId : null;
        this.state.pastasMateriais.forEach(p => {
            if (String(p.parentId) === String(pastaId)) {
                p.parentId = parentId;
            }
        });

        this.state.pastasMateriais = this.state.pastasMateriais.filter(p => String(p.id) !== String(pastaId));
        this.saveLocal();
        if (this.currentUser && firebaseService && typeof firebaseService.saveRoot === 'function') {
            firebaseService.saveRoot(this.currentUser.uid, this.state).catch(e => console.warn("Erro ao sincronizar exclusão de pasta na nuvem:", e));
        }
        if (Toast) Toast.show('Pasta removida.', 'info');
        this._atualizarViewsMaterial();
    },

    moverMaterialParaPasta(materialId, pastaId) {
        if (!this.state.materiaisGerados) return;
        const mat = this.state.materiaisGerados.find(m => String(m.id) === String(materialId));
        if (mat) {
            mat.pastaId = pastaId || null;
            mat.updatedAt = new Date().toISOString();
            this.saveLocal();
            if (this.currentUser && typeof syncService !== 'undefined' && syncService.persistMaterialDoc) {
                syncService.persistMaterialDoc(this.currentUser.uid, mat);
            }
            if (this.currentUser && firebaseService && typeof firebaseService.saveRoot === 'function') {
                firebaseService.saveRoot(this.currentUser.uid, this.state).catch(e => console.warn("Erro ao sincronizar movimentação na nuvem:", e));
            }
            if (Toast) Toast.show('Material movido com sucesso.', 'success');
            this._atualizarViewsMaterial();
        }
    },

    obterCaminhoCompletoPasta(pastaId) {
        if (!pastaId || !this.state.pastasMateriais) return '';
        const caminho = [];
        let currId = String(pastaId);
        const visitados = new Set();

        while (currId && !visitados.has(currId)) {
            visitados.add(currId);
            const pasta = this.state.pastasMateriais.find(p => String(p.id) === currId);
            if (!pasta) break;
            caminho.unshift(pasta.nome);
            currId = pasta.parentId ? String(pasta.parentId) : null;
        }

        return caminho.join(' / ');
    },

    obterCadeiaHierarquicaPasta(pastaId) {
        if (!pastaId || !this.state.pastasMateriais) return [];
        const cadeia = [];
        let currId = String(pastaId);
        const visitados = new Set();

        while (currId && !visitados.has(currId)) {
            visitados.add(currId);
            const pasta = this.state.pastasMateriais.find(p => String(p.id) === currId);
            if (!pasta) break;
            cadeia.unshift({ id: pasta.id, nome: pasta.nome });
            currId = pasta.parentId ? String(pasta.parentId) : null;
        }

        return cadeia;
    },

    obterIdsTodasSubpastas(pastaId) {
        if (!pastaId || !this.state.pastasMateriais) return new Set();
        const ids = new Set([String(pastaId)]);
        let alterou = true;

        while (alterou) {
            alterou = false;
            for (const p of this.state.pastasMateriais) {
                if (p.parentId && ids.has(String(p.parentId)) && !ids.has(String(p.id))) {
                    ids.add(String(p.id));
                    alterou = true;
                }
            }
        }

        return ids;
    },

    contarMateriaisPastaRecursivo(pastaId) {
        if (!pastaId || !this.state.materiaisGerados) return 0;
        const subpastaIds = this.obterIdsTodasSubpastas(pastaId);
        return this.state.materiaisGerados.filter(m => !m.naLixeira && m.pastaId && subpastaIds.has(String(m.pastaId))).length;
    },

    criarPastaEstudo(nome, parentId = null, tipo = 'flashcard') {
        if (!this.state.pastasEstudos) this.state.pastasEstudos = [];
        const novaPasta = {
            id: 'pasta_estudo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            nome: nome || 'Nova Pasta',
            parentId: parentId || null,
            tipo: tipo || 'flashcard',
            createdAt: new Date().toISOString()
        };
        this.state.pastasEstudos.push(novaPasta);
        this.saveLocal();
        if (this.currentUser && firebaseService && typeof firebaseService.saveRoot === 'function') {
            firebaseService.saveRoot(this.currentUser.uid, this.state).catch(e => console.warn("Erro ao sincronizar pasta de estudos na nuvem:", e));
        }
        if (typeof this.emit === 'function') {
            this.emit('estudos:changed', { timestamp: Date.now() });
        }
        if (Toast) Toast.show('Pasta de estudos criada com sucesso.', 'success');
        return novaPasta;
    },

    excluirPastaEstudo(pastaId) {
        if (!this.state.pastasEstudos) this.state.pastasEstudos = [];
        ['flashcards', 'mindmaps'].forEach(colecao => {
            if (this.state[colecao]) {
                this.state[colecao].forEach(item => {
                    if (String(item.pastaId) === String(pastaId)) {
                        item.pastaId = null;
                    }
                });
            }
        });

        this.state.pastasEstudos = this.state.pastasEstudos.filter(p => String(p.id) !== String(pastaId));
        this.saveLocal();
        if (this.currentUser && firebaseService && typeof firebaseService.saveRoot === 'function') {
            firebaseService.saveRoot(this.currentUser.uid, this.state).catch(e => console.warn("Erro ao sincronizar exclusão de pasta de estudos na nuvem:", e));
        }
        if (typeof this.emit === 'function') {
            this.emit('estudos:changed', { timestamp: Date.now() });
        }
        if (Toast) Toast.show('Pasta de estudos removida.', 'info');
    },

    moverEstudoParaPasta(colecao, itemId, pastaId) {
        const colecaoAlvo = colecao === 'mindmaps' ? 'mindmaps' : 'flashcards';
        if (!this.state[colecaoAlvo]) return;
        const item = this.state[colecaoAlvo].find(i => String(i.id) === String(itemId));
        if (item) {
            item.pastaId = pastaId || null;
            item.updatedAt = new Date().toISOString();
            this.saveLocal();
            if (this.currentUser && firebaseService && typeof firebaseService.saveRoot === 'function') {
                firebaseService.saveRoot(this.currentUser.uid, this.state).catch(e => console.warn("Erro ao sincronizar movimentação de estudos na nuvem:", e));
            }
            if (typeof this.emit === 'function') {
                this.emit('estudos:changed', { timestamp: Date.now() });
            }
            if (Toast) Toast.show('Item movido para a pasta com sucesso.', 'success');
        }
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
    async compartilharMaterial(materialId) {
        const user = this.currentUser || firebaseService?.auth?.currentUser;
        if (!user) {
            if (Toast) Toast.show("Você precisa estar conectado com o Google para compartilhar com a comunidade.", "warning");
            return;
        }

        if (!this.state.materiaisGerados) this.state.materiaisGerados = [];
        const mat = this.state.materiaisGerados.find(m => String(m.id) === String(materialId));
        if (!mat) {
            if (Toast) Toast.show("Material não encontrado.", "error");
            return;
        }

        try {
            const tituloNormalizado = (mat.titulo || mat.tema || "Material").trim();
            const jaExiste = await firebaseService.verificarDuplicataMaterialComunidade(tituloNormalizado);
            if (jaExiste) {
                mat.compartilhado = true;
                this.saveLocal();
                if (Toast) Toast.show("Este material já está publicado na comunidade.", "info");
                this._atualizarViewsMaterial();
                return;
            }

            const matPublico = {
                titulo: tituloNormalizado,
                tema: mat.tema || mat.titulo || '',
                tipo: mat.tipo || 'planejamento',
                disciplina: mat.disciplina || 'Geral',
                serie: mat.serie || '',
                conteudo_html: mat.conteudo_html || '',
                autor: user.displayName || this.state.userConfig?.profName || "Professor(a)",
                uid_autor: user.uid,
                id_local_origem: String(mat.id),
                data_partilha: new Date().toISOString()
            };

            await firebaseService.publicarMaterialComunidade(matPublico);
            mat.compartilhado = true;
            this.saveLocal();
            if (Toast) Toast.show("Material compartilhado com sucesso na comunidade!", "success");
            this._atualizarViewsMaterial();
        } catch (error) {
            console.error("❌ Erro ao compartilhar material:", error);
            if (error?.code === 'permission-denied' || String(error?.message).includes('permissions')) {
                if (Toast) Toast.show("Permissão pendente no Firestore. Atualize o arquivo firestore.rules no Console.", "error");
            } else {
                if (Toast) Toast.show("Falha ao enviar para a comunidade.", "error");
            }
        }
    },

    async removerMaterialDaComunidade(materialId) {
        const user = this.currentUser || firebaseService?.auth?.currentUser;
        if (!user) {
            if (Toast) Toast.show("Faça login com o Google para gerenciar materiais na comunidade.", "warning");
            return;
        }

        if (!this.state.materiaisGerados) return;
        const mat = this.state.materiaisGerados.find(m => String(m.id) === String(materialId));

        try {
            if (firebaseService?.removerMaterialComunidade) {
                await firebaseService.removerMaterialComunidade(user.uid, materialId);
            }
            if (mat) {
                delete mat.compartilhado;
                this.saveLocal();
            }
            if (Toast) Toast.show("Material retirado da comunidade.", "info");
            this._atualizarViewsMaterial();
        } catch (error) {
            console.error("❌ Erro ao remover material da comunidade:", error);
            if (Toast) Toast.show("Erro ao retirar material da comunidade.", "error");
        }
    },

    importarMaterialComunidade(materialPublico) {
        if (!this.state.materiaisGerados) this.state.materiaisGerados = [];
        const novoLocal = {
            id: 'mat_import_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4),
            titulo: materialPublico.titulo || materialPublico.tema || 'Material Importado',
            tema: materialPublico.tema || materialPublico.titulo || '',
            tipo: materialPublico.tipo || 'planejamento',
            disciplina: materialPublico.disciplina || 'Geral',
            serie: materialPublico.serie || '',
            conteudo_html: materialPublico.conteudo_html || '',
            autorOriginal: materialPublico.autor || 'Comunidade',
            importadoComunidade: true,
            createdAt: new Date().toISOString()
        };

        this.state.materiaisGerados.unshift(novoLocal);
        this.saveLocal();
        if (Toast) Toast.show("Material importado para sua Biblioteca!", "success");
        return novoLocal;
    },

    async deleteMateriaisEmMassa(idsArray) {
        if (!idsArray || !idsArray.length) return;
        if (!this.state.materiaisGerados) this.state.materiaisGerados = [];
        const setIds = new Set(idsArray.map(id => String(id)));
        this.state.materiaisGerados = this.state.materiaisGerados.filter(m => !setIds.has(String(m.id)));
        this.saveLocal();
        if (this.currentUser && firebaseService?.deleteMaterialDoc) {
            for (const id of idsArray) {
                firebaseService.deleteMaterialDoc(this.currentUser.uid, id).catch(e => console.warn("Erro ao deletar material na subcoleção:", e));
            }
        }
        if (Toast) Toast.show(`${idsArray.length} materiais excluídos com sucesso.`, "info");
        this._atualizarViewsMaterial();
        return true;
    },

    async duplicarMaterial(materialId) {
        if (!this.state.materiaisGerados) this.state.materiaisGerados = [];
        const matOriginal = this.state.materiaisGerados.find(m => String(m.id) === String(materialId));
        if (!matOriginal) {
            if (Toast) Toast.show("Material não encontrado para duplicação.", "error");
            return null;
        }

        const copia = JSON.parse(JSON.stringify(matOriginal));
        copia.id = 'mat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4);
        copia.titulo = `${copia.titulo || copia.tema || 'Material'} (Cópia)`;
        copia.createdAt = new Date().toISOString();
        copia.pastaId = null;
        delete copia.compartilhado;

        this.state.materiaisGerados.unshift(copia);
        this.saveLocal();
        if (this.currentUser && firebaseService?.saveMaterialDoc) {
            firebaseService.saveMaterialDoc(this.currentUser.uid, copia).catch(e => console.warn("Erro ao salvar cópia de material na nuvem:", e));
        }
        if (Toast) Toast.show("Material duplicado com sucesso!", "success");
        this._atualizarViewsMaterial();
        return copia;
    },

    async compartilharMateriaisEmMassa(idsArray) {
        if (!idsArray || !idsArray.length) return;
        let sucessos = 0;
        for (const id of idsArray) {
            try {
                await this.compartilharMaterial(id);
                sucessos++;
            } catch (e) {
                console.error("Erro ao compartilhar item em massa:", id, e);
            }
        }
        if (sucessos > 0 && Toast) {
            Toast.show(`${sucessos} materiais compartilhados com a comunidade!`, "success");
        }
        this._atualizarViewsMaterial();
    },

    async compilarMateriaisEmPacote(idsArray, tituloPacote = 'Pacote Integrado de Materiais') {
        if (!idsArray || !idsArray.length) return null;
        if (!this.state.materiaisGerados) this.state.materiaisGerados = [];

        const materiaisSelecionados = this.state.materiaisGerados.filter(m => idsArray.map(String).includes(String(m.id)));
        if (!materiaisSelecionados.length) {
            if (Toast) Toast.show("Nenhum material encontrado para compilação.", "error");
            return null;
        }

        const profNome = this.state.userConfig?.profName || 'Professor(a)';
        const escolaNome = this.state.userConfig?.escola || 'Escola';
        const dataHoje = new Date().toLocaleDateString('pt-BR');

        let htmlCompilado = `
            <div class="pacote-compilado-capa" style="page-break-after: always; text-align: center; padding: 4rem 2rem; border-bottom: 2px dashed #cbd5e1; margin-bottom: 3rem;">
                <h1 style="font-size: 2.25rem; font-weight: 800; color: #1e293b; margin-bottom: 1rem;">${window.escapeHTML ? window.escapeHTML(tituloPacote) : tituloPacote}</h1>
                <p style="font-size: 1.125rem; color: #64748b; margin-bottom: 2rem;">Coletânea de Materiais Pedagógicos Integrados</p>
                <div style="display: inline-block; text-align: left; background-color: #f8fafc; padding: 1.25rem 2rem; border-radius: 1rem; border: 1px solid #e2e8f0;">
                    <p style="margin: 0.25rem 0; font-weight: 600; color: #334155;"><strong>Elaborado por:</strong> ${window.escapeHTML ? window.escapeHTML(profNome) : profNome}</p>
                    <p style="margin: 0.25rem 0; font-weight: 600; color: #334155;"><strong>Instituição:</strong> ${window.escapeHTML ? window.escapeHTML(escolaNome) : escolaNome}</p>
                    <p style="margin: 0.25rem 0; font-weight: 600; color: #334155;"><strong>Data da Compilação:</strong> ${dataHoje}</p>
                    <p style="margin: 0.25rem 0; font-weight: 600; color: #334155;"><strong>Total de Seções:</strong> ${materiaisSelecionados.length} materiais</p>
                </div>
            </div>
            
            <div class="pacote-sumario" style="margin-bottom: 3rem; background-color: #f1f5f9; padding: 1.5rem; border-radius: 1rem;">
                <h3 style="font-size: 1.25rem; font-weight: 700; color: #1e293b; margin-bottom: 1rem;">Índice do Pacote:</h3>
                <ol style="margin-left: 1.5rem; color: #475569;">
                    ${materiaisSelecionados.map(m => `
                        <li style="margin-bottom: 0.5rem;">
                            <strong>${window.escapeHTML ? window.escapeHTML(m.titulo || m.tema || 'Material') : (m.titulo || 'Material')}</strong> 
                            <span style="color: #94a3b8; font-size: 0.875rem;">(${window.escapeHTML ? window.escapeHTML(m.disciplina || 'Geral') : (m.disciplina || 'Geral')} - ${window.escapeHTML ? window.escapeHTML(m.serie || 'Geral') : (m.serie || 'Geral')})</span>
                        </li>
                    `).join('')}
                </ol>
            </div>
        `;

        materiaisSelecionados.forEach((m, idx) => {
            const tituloMat = window.escapeHTML ? window.escapeHTML(m.titulo || m.tema || 'Seção') : (m.titulo || 'Seção');
            htmlCompilado += `
                <div class="pacote-secao" style="page-break-before: ${idx > 0 ? 'always' : 'auto'}; margin-bottom: 4rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #4f46e5; padding-bottom: 0.5rem; margin-bottom: 1.5rem;">
                        <h2 style="font-size: 1.5rem; font-weight: 800; color: #1e293b;">${idx + 1}. ${tituloMat}</h2>
                        <span style="font-size: 0.75rem; background-color: #e0e7ff; color: #4338ca; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 700;">${window.escapeHTML ? window.escapeHTML(m.disciplina || 'Geral') : (m.disciplina || 'Geral')}</span>
                    </div>
                    <div class="secao-conteudo">
                        ${m.conteudo_html || '<p>Sem conteúdo estipulado.</p>'}
                    </div>
                </div>
            `;
        });

        const novoPacote = {
            id: 'pacote_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4),
            titulo: tituloPacote,
            tema: `Compilação de ${materiaisSelecionados.length} materiais`,
            tipo: 'pacote-compilado',
            disciplina: materiaisSelecionados[0]?.disciplina || 'Geral',
            serie: materiaisSelecionados[0]?.serie || 'Diversas',
            conteudo_html: htmlCompilado,
            itensCompiladosCount: materiaisSelecionados.length,
            createdAt: new Date().toISOString()
        };

        this.state.materiaisGerados.unshift(novoPacote);
        this.saveLocal();
        if (this.currentUser && firebaseService?.saveMaterialDoc) {
            firebaseService.saveMaterialDoc(this.currentUser.uid, novoPacote).catch(e => console.warn("Erro ao salvar pacote compilado no Firebase:", e));
        }
        if (Toast) Toast.show(`Pacote "${tituloPacote}" compilado com sucesso!`, "success");
        this._atualizarViewsMaterial();
        return novoPacote;
    },

    _atualizarViewsMaterial() {
        if (typeof this.emit === 'function') {
            this.emit('materiais:changed', { timestamp: Date.now() });
        }
    },
    ...turmaMethods,
    ...provaMethods,
    ...planejamentoMethods,
    ...apresentacaoMethods,
};
if (typeof window !== 'undefined') {
    window.model = model;
}
