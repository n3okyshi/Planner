/**
 * @file comunidade.js
 * @description View responsável pela interface de busca e importação de questões compartilhadas na Comunidade com Paginação e Filtros por Escola e Bimestre.
 * @module views/comunidadeView
 */

import { model } from '../model.js';
import { controller } from '../controller.js';
import { firebaseService } from '../firebase-service.js';
import { Toast } from '../components/toast.js';
import { renderKatex } from '../utils.js';

/**
 * View da Comunidade de Questões.
 * @namespace comunidadeView
 */
export const comunidadeView = {
    questoes: [],
    filtroMateria: '',
    filtroBimestre: '',
    filtroEscola: '',

    // --- Estado da Paginação ---
    itensPorPagina: 20,     // Padrão: 20 itens
    paginaAtual: 1,         // Página atual
    ultimoDoc: null,        // Cursor para a próxima página
    primeiroDoc: null,      // Cursor auxiliar
    paginasCache: new Map(),// Cache de páginas visitadas para navegação rápida
    totalCarregado: 0,

    bimestresDisponiveis: [
        "1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"
    ],

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
            estrelas += `<i class="fas fa-star ${cor} text-xs-micro"></i>`;
        }

        const labels = ["Não definida", "Fácil", "Média", "Difícil"];

        return `
            <div class="star-rating" title="Dificuldade: ${labels[n] || labels[0]}">
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
            <div class="view-shell fade-in">
                <header class="view-header">
                    <div>
                        <h2 class="view-header__title">
                            <i class="fas fa-users" style="color: var(--color-primary);"></i> Banco da Comunidade
                        </h2>
                        <p class="view-header__subtitle">Explore, filtre por escola e bimestre, e importe questões compartilhadas por outros professores.</p>
                    </div>
                </header>

                <section class="panel panel--fit" style="border-radius: var(--radius-2xl);">
                    <div class="comunidade-filter-bar" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; align-items: center;">
                        
                        <!-- BUSCA DE TEXTO -->
                        <div style="grid-column: 1 / -1;">
                            <input type="text" id="search-comunidade" placeholder="Buscar por tema, enunciado, código BNCC ou escola..." class="form-input--search comunidade-search" style="width: 100%;">
                        </div>

                        <!-- FILTRO MATÉRIA -->
                        <div id="dropdown-materia" class="custom-dropdown">
                            <input type="hidden" id="filter-materia" value="${this.filtroMateria || ''}">
                            <button class="dropdown-button w-full">
                                <span class="dropdown-label truncate">${this.filtroMateria || 'Todas as matérias'}</span>
                                <i class="fas fa-chevron-down" style="color: var(--color-slate-400); font-size: 0.75rem; margin-left: auto;"></i>
                            </button>

                            <ul class="dropdown-menu hidden custom-scrollbar">
                                <li class="dropdown-item ${this.filtroMateria === '' ? 'dropdown-item--selected' : ''}" data-value="">
                                    Todas as matérias
                                </li>
                                ${Object.keys(model.coresComponentes || {}).map(m => `
                                    <li class="dropdown-item ${this.filtroMateria === m ? 'dropdown-item--selected' : ''}" data-value="${m}">
                                        ${m}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>

                        <!-- FILTRO BIMESTRE -->
                        <div>
                            <select id="filter-bimestre" onchange="comunidadeView.setFiltroBimestre(this.value)" class="form-select" style="width: 100%; padding: 0.5rem 0.75rem; font-size: 0.8125rem;">
                                <option value="">Todos os Bimestres</option>
                                ${this.bimestresDisponiveis.map(b => `<option value="${b}" ${this.filtroBimestre === b ? 'selected' : ''}>${b}</option>`).join('')}
                            </select>
                        </div>

                        <!-- FILTRO ESCOLA -->
                        <div>
                            <input type="text" id="filter-escola" placeholder="Filtrar por escola..." class="form-input" style="width: 100%; padding: 0.5rem 0.75rem; font-size: 0.8125rem;" value="${window.escapeHTML(this.filtroEscola || '')}" oninput="comunidadeView.setFiltroEscola(this.value)">
                        </div>

                        <!-- BOTÕES E QUANTIDADE -->
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <button onclick="comunidadeView.novaBusca()" class="btn-primary comunidade-search-button" style="flex: 1; justify-content: center;">
                                <i class="fas fa-search"></i> Buscar
                            </button>

                            <div class="custom-dropdown" style="width: 5rem;">
                                <input type="hidden" onchange="comunidadeView.mudarQtdPagina(this.value)" value="${this.itensPorPagina}">
                                <button type="button" class="dropdown-button" style="padding: 0.5rem;">
                                    <span class="dropdown-label">${this.itensPorPagina}</span>
                                    <i class="fas fa-chevron-down" style="color: var(--color-slate-400); font-size: 0.75rem; margin-left: auto;"></i>
                                </button>
                                <ul class="dropdown-menu hidden custom-scrollbar">
                                    <li class="dropdown-item" data-value="20">20</li>
                                    <li class="dropdown-item" data-value="50">50</li>
                                    <li class="dropdown-item" data-value="100">100</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="comunidade-results" class="comunidade-results"></section>

                <div id="pagination-controls" class="card-page-controls hidden">
                    <button onclick="comunidadeView.paginaAnterior()" id="btn-prev-page" disabled class="btn-pager">
                        <i class="fas fa-chevron-left"></i> Anterior
                    </button>

                    <span style="font-size: 0.6875rem; font-weight: 900; color: var(--color-slate-400); text-transform: uppercase; letter-spacing: 0.1em;">
                        Página <span id="page-num" style="color: #4f46e5; font-size: 0.875rem; margin-left: 0.25rem;">${this.paginaAtual}</span>
                    </span>

                    <button onclick="comunidadeView.proximaPagina()" id="btn-next-page" disabled class="btn-pager btn-pager--active">
                        Próxima <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // ATIVAÇÃO DO DROPDOWN CUSTOMIZADO
        setTimeout(() => {
            if (window.uiController && window.uiController.setupCustomDropdown) {
                window.uiController.setupCustomDropdown('dropdown-materia', (valorSelecionado) => {
                    comunidadeView.setFiltro(valorSelecionado);
                });
            }
        }, 50);

        // Dispara a busca inicial automaticamente para mostrar as últimas questões
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
        this.paginasCache.clear();
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
        const filtroBimestre = this.filtroBimestre;
        const filtroEscola = this.filtroEscola;
        const paginationControls = document.getElementById('pagination-controls');

        if (grid) {
            grid.innerHTML = '<div class="comunidade-empty"><i class="fas fa-circle-notch fa-spin"></i><p style="color: var(--color-slate-400); margin-top: var(--spacing-4); font-size: 0.875rem; font-weight: 700;">Carregando comunidade...</p></div>';
        }

        try {
            let ref = firebaseService.db.collection('comunidade_questoes');

            // Aplica filtros básicos no Firestore
            if (filtro) {
                ref = ref.where('materia', '==', filtro);
            }
            if (filtroBimestre) {
                ref = ref.where('bimestre', '==', filtroBimestre);
            }

            // Ordenação padrão por data (mais recentes primeiro)
            ref = ref.orderBy('data_partilha', 'desc');

            // --- Lógica de Paginação ---
            if (direcao === 'proxima' && this.ultimoDoc) {
                ref = ref.startAfter(this.ultimoDoc);
            }

            // Define o limite
            const limiteQuery = Number(this.itensPorPagina);
            const snapshot = await ref.limit(limiteQuery).get();

            // Processa resultados
            let resultados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Filtragem local por texto e escola (Client-Side Filtering)
            if (filtroEscola) {
                const escolaTermo = filtroEscola.toLowerCase();
                resultados = resultados.filter(q => q.escola && q.escola.toLowerCase().includes(escolaTermo));
            }

            if (termoBusca) {
                const termo = termoBusca.toLowerCase();
                resultados = resultados.filter(q =>
                    (q.enunciado && q.enunciado.toLowerCase().includes(termo)) ||
                    (q.materia && q.materia.toLowerCase().includes(termo)) ||
                    (q.escola && q.escola.toLowerCase().includes(termo)) ||
                    (q.bncc?.codigo && q.bncc.codigo.toLowerCase().includes(termo))
                );
            }

            // Atualiza o cursor para a próxima página
            if (snapshot.docs.length > 0) {
                this.ultimoDoc = snapshot.docs[snapshot.docs.length - 1];
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
                window.Toast.show("Erro ao buscar dados da comunidade.", "error");
            }
            if (grid) grid.innerHTML = '<div class="comunidade-empty"><i class="fas fa-exclamation-triangle"></i><p style="color: #dc2626; margin-top: var(--spacing-4); font-size: 0.875rem; font-weight: 700;">Erro de conexão ou índice inexistente.</p></div>';
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

        if (this._carregarPaginaDoCache(anterior)) {
            return;
        }

        if (anterior === 1) {
            this.novaBusca();
        } else {
            window.Toast.show("Cache expirado. Voltando ao início.", "info");
            this.novaBusca();
        }
    },

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
            const fimDaLinha = this.totalCarregado < this.itensPorPagina;
            btnNext.disabled = fimDaLinha;
            btnNext.classList.toggle('opacity-50', fimDaLinha);
        }
    },

    atualizarUIContadores() {
        const pageNum = document.getElementById('page-num');
        if (pageNum) pageNum.innerText = this.paginaAtual;
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
                <div class="comunidade-empty">
                    <i class="fas fa-search"></i>
                    <p style="margin-top: var(--spacing-4); color: var(--color-slate-500); font-weight: 700;">Nenhuma questão encontrada nesta página.</p>
                </div>`;
            return;
        }

        grid.innerHTML = this.questoes.map(q => {
            const corMateria = (model.coresComponentes && model.coresComponentes[q.materia]) || '#64748b';
            const estrelasHtml = this._renderEstrelasDificuldade(q.dificuldade);
            const autorNome = q.autor ? q.autor.split(' ')[0] : 'Professor(a)';

            const materiaEscaped = window.escapeHTML(q.materia || 'Geral');
            const anoEscaped = window.escapeHTML(q.ano || '');
            const escolaEscaped = q.escola ? window.escapeHTML(q.escola) : '';
            const bimestreEscaped = q.bimestre ? window.escapeHTML(q.bimestre) : '';
            const autorEscaped = window.escapeHTML(autorNome);
            const idEscaped = window.escapeHTML(JSON.stringify(q.id));

            return `
                <article class="comunidade-card" style="border-radius: var(--radius-2xl); border: 1px solid var(--color-slate-200); box-shadow: var(--shadow-sm);">
                    <div class="comunidade-card__header">
                        <div class="comunidade-card__chips" style="display: flex; flex-wrap: wrap; gap: 0.375rem;">
                            <span class="badge" style="background-color: ${corMateria}15; color: ${corMateria}; border-color: ${corMateria}50; font-weight: 700;">
                                ${materiaEscaped}
                            </span>
                            <span class="badge" style="background-color: var(--color-slate-100); color: var(--color-slate-600); font-weight: 600;">
                                ${q.tipo === 'multipla' || q.tipo === 'multipla_escolha' ? 'Múltipla Escolha' : 'Dissertativa'}
                            </span>
                            ${bimestreEscaped ? `<span class="badge badge--bimestre" style="font-size: 0.6875rem;"><i class="fas fa-bookmark"></i> ${bimestreEscaped}</span>` : ''}
                            ${escolaEscaped ? `<span class="badge badge--school" style="font-size: 0.6875rem;"><i class="fas fa-school"></i> ${escolaEscaped}</span>` : ''}
                        </div>
                        <div class="comunidade-card__meta">
                            <small>${anoEscaped}</small>
                            <span><i class="fas fa-user-circle"></i> ${autorEscaped}</span>
                        </div>
                    </div>

                    <div class="comunidade-card__content">
                        ${estrelasHtml}
                        <div class="comunidade-card__enunciado">
                            ${q.enunciado ? window.escapeHTML(q.enunciado.substring(0, 300)).replace(/\n/g, '<br>') + (q.enunciado.length > 300 ? '...' : '') : 'Sem texto.'}
                        </div>
                    </div>

                    <div class="comunidade-card__actions" style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
                        <button onclick="comunidadeView.copiarQuestao(${idEscaped})" class="btn-secondary" style="padding: 0.375rem 0.75rem; font-size: 0.75rem;" title="Copiar texto da questão">
                            <i class="far fa-copy"></i> Copiar
                        </button>
                        <button onclick="comunidadeView.importarQuestao(${idEscaped})" class="comunidade-card__button" style="flex: 1;">
                            <i class="fas fa-file-import"></i> Importar para meu Banco
                        </button>
                    </div>
                </article>
            `;
        }).join('');

        renderKatex(grid);
    },

    copiarQuestao(idCloud) {
        const q = this.questoes.find(item => item.id === idCloud);
        if (!q) return;
        let texto = `${q.enunciado}\n\n`;
        if ((q.tipo === 'multipla' || q.tipo === 'multipla_escolha') && q.alternativas) {
            const letras = ['A', 'B', 'C', 'D', 'E'];
            q.alternativas.forEach((alt, i) => {
                texto += `${letras[i]}) ${alt}\n`;
            });
            if (q.correta !== undefined && q.correta !== null) {
                texto += `\nGabarito: (${letras[q.correta]})\n`;
            }
        } else if (q.gabarito) {
            texto += `\nExpectativa de Resposta / Gabarito:\n${q.gabarito}\n`;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(texto.trim())
                .then(() => Toast.show("Questão copiada para a área de transferência!", "success"))
                .catch(() => Toast.show("Falha ao copiar texto.", "error"));
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
                escola: questao.escola || null,
                bimestre: questao.bimestre || null,
                tipo: questao.tipo || 'aberta',
                dificuldade: Number(questao.dificuldade) || 0,
                suporte: questao.suporte || null,
                bncc: questao.bncc || null,
                origem: `Comunidade (${questao.autor || 'Prof.'})`
            };

            try {
                await model.saveQuestao(novaQuestao);
                Toast.show("Questão importada com sucesso para o seu banco!", "success");
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
        this.novaBusca();
    },

    setFiltroBimestre(val) {
        this.filtroBimestre = val;
        this.novaBusca();
    },

    setFiltroEscola(val) {
        this.filtroEscola = val;
        // Debounce ou nova busca direta
        if (this._timeoutEscola) clearTimeout(this._timeoutEscola);
        this._timeoutEscola = setTimeout(() => {
            this.novaBusca();
        }, 350);
    }
};

if (typeof window !== 'undefined') {
    window.comunidadeView = comunidadeView;
}