/**
 * @file comunidade.js
 * @description View responsável pela interface de busca e importação de questões compartilhadas na Comunidade com Paginação.
 * @module views/comunidadeView
 */

import { model } from '../model.js';
import { controller } from '../controller.js';
import { firebaseService } from '../firebase-service.js';
import { Toast } from '../components/toast.js';

/**
 * View da Comunidade de Questões.
 * @namespace comunidadeView
 */
export const comunidadeView = {
    questoes: [],
    filtroMateria: '',
    
    // --- Estado da Paginação ---
    itensPorPagina: 20,     // Padrão: 20 itens
    paginaAtual: 1,         // Página atual
    ultimoDoc: null,        // Cursor para a próxima página
    primeiroDoc: null,      // Cursor auxiliar
    paginasCache: new Map(),// Cache de páginas visitadas para navegação rápida
    totalCarregado: 0,
    
    /**
     * Helper para renderizar estrelas de dificuldade (Visualização).
     * @private
     */
    _renderEstrelasDificuldade(nivel = 0) {
        const n = Number(nivel) || 0;
        let estrelas = '';

        for (let i = 1; i <= 3; i++) {
            let cor = 'text-slate-200';
            if (n > 0 && i <= n) {
                cor = 'text-amber-400';
            }
            estrelas += `<i class="fas fa-star ${cor} text-[10px]"></i>`;
        }
        
        const labels = ["Não definida", "Fácil", "Média", "Difícil"];
        
        return `
            <div class="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100" title="Dificuldade original: ${labels[n] || labels[0]}">
                ${estrelas}
            </div>
        `;
    },

    /**
     * Renderiza a página principal da comunidade.
     */
    async render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const html = `
            <div class="fade-in pb-20">
                <div class="mb-8">
                    <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Comunidade</h2>
                    <p class="text-slate-500">Explore e importe questões compartilhadas por outros professores.</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                    <input type="text" id="search-comunidade" placeholder="Buscar por tema..." 
                           class="md:col-span-5 p-4 rounded-xl border border-slate-200 outline-none focus:border-primary shadow-sm bg-white focus:ring-4 focus:ring-primary/5 transition-all">
                    
                    <select id="filter-materia" onchange="comunidadeView.setFiltro(this.value)"
                            class="md:col-span-3 p-4 rounded-xl border border-slate-200 outline-none cursor-pointer shadow-sm bg-white focus:border-primary">
                        <option value="">Todas as matérias</option>
                        ${Object.keys(model.coresComponentes || {}).map(m => `
                            <option value="${m}" ${this.filtroMateria === m ? 'selected' : ''}>${m}</option>
                        `).join('')}
                    </select>
                    
                    <button onclick="comunidadeView.novaBusca()" 
                            class="md:col-span-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-md flex items-center justify-center gap-2 active:scale-95 py-3 md:py-0">
                        <i class="fas fa-search"></i> Buscar
                    </button>

                    <div class="md:col-span-2 flex items-center justify-end md:justify-center bg-white rounded-xl border border-slate-200 px-3 shadow-sm">
                        <label class="text-[10px] text-slate-400 font-bold uppercase mr-2">Itens:</label>
                        <select onchange="comunidadeView.mudarQtdPagina(this.value)" class="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer py-2">
                            <option value="20" ${this.itensPorPagina == 20 ? 'selected' : ''}>20</option>
                            <option value="50" ${this.itensPorPagina == 50 ? 'selected' : ''}>50</option>
                            <option value="100" ${this.itensPorPagina == 100 ? 'selected' : ''}>100</option>
                        </select>
                    </div>
                </div>
                
                <div id="comunidade-results" class="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[300px]">
                    </div>

                <div id="pagination-controls" class="hidden mt-8 flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <button onclick="comunidadeView.paginaAnterior()" id="btn-prev-page" disabled
                            class="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2">
                        <i class="fas fa-chevron-left"></i> Anterior
                    </button>
                    
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Página <span id="page-num" class="text-indigo-600 text-sm">${this.paginaAtual}</span>
                    </span>
                    
                    <button onclick="comunidadeView.proximaPagina()" id="btn-next-page" disabled
                            class="px-4 py-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold text-sm hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2">
                        Próxima <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Dispara a busca inicial automaticamente para mostrar as últimas 20
        if (this.questoes.length === 0) {
            this.novaBusca();
        } else {
            this.renderLista();
            this.atualizarBotoesPaginacao();
        }
    },

    /**
     * Reinicia a paginação e faz uma nova busca limpa.
     */
    async novaBusca() {
        this.paginaAtual = 1;
        this.paginasCache.clear(); // Limpa o cache
        this.ultimoDoc = null;
        await this.buscar('inicio');
    },

    /**
     * Executa a busca no Firestore com suporte a paginação.
     * @param {string} direcao - 'inicio', 'proxima'
     */
    async buscar(direcao = 'inicio') {
        const grid = document.getElementById('comunidade-results');
        const termoBusca = document.getElementById('search-comunidade')?.value.trim();
        const filtro = this.filtroMateria;
        const paginationControls = document.getElementById('pagination-controls');

        if (grid) {
            grid.innerHTML = '<div class="col-span-full text-center py-20"><i class="fas fa-circle-notch fa-spin text-3xl text-primary"></i><p class="text-slate-400 mt-4 text-sm font-medium">Carregando comunidade...</p></div>';
        }

        try {
            let ref = firebaseService.db.collection('comunidade_questoes');
            
            // Aplica filtros básicos
            if (filtro) {
                ref = ref.where('materia', '==', filtro);
            }
            
            // Ordenação padrão por data (mais recentes primeiro)
            ref = ref.orderBy('data_partilha', 'desc');

            // --- Lógica de Paginação ---
            if (direcao === 'proxima' && this.ultimoDoc) {
                ref = ref.startAfter(this.ultimoDoc);
            } else if (direcao === 'inicio') {
                // Não precisa de startAfter
            }

            // Define o limite (Limitamos a +1 para saber se existe uma próxima página)
            const limiteQuery = Number(this.itensPorPagina);
            const snapshot = await ref.limit(limiteQuery).get();
            
            // Processa resultados
            let resultados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Filtragem local por texto (Client-Side Filtering)
            // Nota: Se houver muito filtro de texto, a página pode ficar com menos de 20 itens.
            // Para uma solução perfeita precisaria de Algolia, mas para Vanilla JS isto serve.
            if (termoBusca) {
                const termo = termoBusca.toLowerCase();
                resultados = resultados.filter(q => 
                    (q.enunciado && q.enunciado.toLowerCase().includes(termo)) ||
                    (q.materia && q.materia.toLowerCase().includes(termo))
                );
            }

            // Atualiza o cursor para a próxima página
            if (snapshot.docs.length > 0) {
                this.ultimoDoc = snapshot.docs[snapshot.docs.length - 1]; // Guarda o último documento real do banco
                this.totalCarregado = snapshot.docs.length;
            } else {
                this.ultimoDoc = null;
            }

            this.questoes = resultados;
            
            // Salva no cache
            this.paginasCache.set(this.paginaAtual, {
                questoes: [...this.questoes],
                ultimoDoc: this.ultimoDoc,
                totalCarregado: this.totalCarregado
            });

            this.renderLista();
            
            if (paginationControls) {
                paginationControls.classList.remove('hidden');
                this.atualizarBotoesPaginacao();
            }
            
        } catch (error) {
            console.error("Erro na busca da comunidade:", error);
            if (error.code === 'failed-precondition') {
                 window.Toast.show("A criar índices... Tente novamente em instantes.", "warning");
            } else {
                 window.Toast.show("Erro ao buscar dados.", "error");
            }
            if (grid) grid.innerHTML = '<div class="col-span-full text-center text-red-400">Erro de conexão ou índice inexistente.</div>';
        }
    },

    /**
     * Helper para restaurar uma página do cache.
     * @private
     */
    _carregarPaginaDoCache(numPagina) {
        if (!this.paginasCache.has(numPagina)) return false;

        const dados = this.paginasCache.get(numPagina);
        this.questoes = dados.questoes;
        this.ultimoDoc = dados.ultimoDoc;
        this.totalCarregado = dados.totalCarregado;
        this.paginaAtual = numPagina;
        
        this.renderLista();
        this.atualizarBotoesPaginacao();
        return true;
    },

    /**
     * Avança para a próxima página.
     */
    async proximaPagina() {
        const proxima = this.paginaAtual + 1;

        // Tenta carregar do cache primeiro
        if (this._carregarPaginaDoCache(proxima)) {
            return;
        }

        if (!this.ultimoDoc) return;
        
        this.paginaAtual++;
        await this.buscar('proxima');
        this.atualizarUIContadores();
    },

    /**
     * Volta para a página anterior usando cache.
     */
    async paginaAnterior() {
        if (this.paginaAtual <= 1) return;

        const anterior = this.paginaAtual - 1;

        // Tenta carregar do cache
        if (this._carregarPaginaDoCache(anterior)) {
            return;
        }

        // Fallback se não estiver no cache (raro, pois deve ter sido visitada)
        if (anterior === 1) {
            this.novaBusca();
        } else {
            // Se perdermos o cache de páginas intermediárias, forçamos reset
            window.Toast.show("Cache expirado. Voltando ao início.", "info");
            this.novaBusca();
        }
    },

    /**
     * Atualiza o estado dos botões de paginação.
     */
    atualizarBotoesPaginacao() {
        const btnPrev = document.getElementById('btn-prev-page');
        const btnNext = document.getElementById('btn-next-page');
        const pageNum = document.getElementById('page-num');

        if (pageNum) pageNum.innerText = this.paginaAtual;

        if (btnPrev) {
            btnPrev.disabled = this.paginaAtual === 1;
            btnPrev.classList.toggle('opacity-50', this.paginaAtual === 1);
        }

        if (btnNext) {
            // Se carregou menos itens do que o limite, é a última página
            const fimDaLinha = this.totalCarregado < this.itensPorPagina;
            btnNext.disabled = fimDaLinha;
            btnNext.classList.toggle('opacity-50', fimDaLinha);
        }
    },
    
    atualizarUIContadores() {
        const pageNum = document.getElementById('page-num');
        if(pageNum) pageNum.innerText = this.paginaAtual;
    },

    mudarQtdPagina(valor) {
        this.itensPorPagina = Number(valor);
        this.novaBusca();
    },

    renderLista() {
        const grid = document.getElementById('comunidade-results');
        if (!grid) return;

        if (this.questoes.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                    <i class="fas fa-search text-4xl text-slate-200 mb-2"></i>
                    <p class="text-slate-400">Nenhuma questão encontrada nesta página.</p>
                </div>`;
            return;
        }

        grid.innerHTML = this.questoes.map(q => {
            const corMateria = (model.coresComponentes && model.coresComponentes[q.materia]) || '#64748b';
            const estrelasHtml = this._renderEstrelasDificuldade(q.dificuldade);
            const autorNome = q.autor ? q.autor.split(' ')[0] : 'Anônimo';

            // Explicit escaping for XSS prevention
            const materiaEscaped = window.escapeHTML(q.materia || 'Geral');
            const anoEscaped = window.escapeHTML(q.ano || '');
            const autorEscaped = window.escapeHTML(autorNome);
            const idEscaped = window.escapeHTML(JSON.stringify(q.id));

            return `
                <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col h-full animate-pop-in">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex flex-col gap-2">
                            <div class="flex gap-2">
                                <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit" 
                                      style="background-color: ${corMateria}15; color: ${corMateria}">
                                    ${materiaEscaped}
                                </span>
                                <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">
                                    ${q.tipo === 'multipla_escolha' ? 'Múltipla' : 'Aberta'}
                                </span>
                            </div>
                            ${estrelasHtml}
                        </div>
                        <div class="text-right">
                            <span class="block text-[10px] text-slate-400 font-bold uppercase">${anoEscaped}</span>
                            <span class="text-[10px] text-slate-300 font-medium flex items-center justify-end gap-1">
                                <i class="fas fa-user-circle"></i> ${autorEscaped}
                            </span>
                        </div>
                    </div>
                    
                    <div class="text-slate-700 mb-6 flex-grow font-medium text-sm leading-relaxed overflow-hidden">
                        ${q.enunciado ? window.escapeHTML(q.enunciado.substring(0, 300)).replace(/\n/g, '<br>') + (q.enunciado.length > 300 ? '...' : '') : 'Sem texto.'}
                    </div>
                    
                    <div class="pt-4 border-t border-slate-50 mt-auto">
                        <button onclick="comunidadeView.importarQuestao(${idEscaped})"
                                class="w-full py-3 rounded-xl bg-slate-50 text-indigo-600 font-bold text-xs hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 group-hover:bg-indigo-50">
                            <i class="fas fa-file-import"></i> Importar para meu Banco
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        if (window.renderMathInElement) {
            renderMathInElement(grid, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false }
                ],
                throwOnError: false
            });
        }
    },

    async importarQuestao(idCloud) {
        const questao = this.questoes.find(q => q.id === idCloud);
        
        if (questao) {
            const novaQuestao = {
                enunciado: questao.enunciado,
                alternativas: questao.alternativas || null,
                correta: questao.correta !== undefined ? questao.correta : null,
                gabarito: questao.gabarito || null,
                gabarito_comentado: questao.gabarito_comentado || null,
                materia: questao.materia || 'Geral',
                ano: questao.ano || '',
                tipo: questao.tipo || 'aberta',
                dificuldade: Number(questao.dificuldade) || 0,
                suporte: questao.suporte || null,
                bncc: questao.bncc || null,
                origem: `Comunidade (${questao.autor || 'Prof.'})`
            };

            try {
                await model.saveQuestao(novaQuestao);
                Toast.show("Questão importada com sucesso!", "success");
                setTimeout(() => {
                    controller.navigate('provas');
                }, 1000);
            } catch (err) {
                console.error("Erro na importação:", err);
                Toast.show("Erro ao salvar questão localmente.", "error");
            }
        }
    },

    setFiltro(val) {
        this.filtroMateria = val;
        // Ao mudar filtro, reinicia a paginação
        this.novaBusca();
    }
};

if (typeof window !== 'undefined') {
    window.comunidadeView = comunidadeView;
}