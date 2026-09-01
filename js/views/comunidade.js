/**
 * @file comunidade.js
 * @description View responsável pela interface de busca e importação de questões compartilhadas na Comunidade com Paginação e Filtros por Escola e Bimestre.
 * @module views/comunidadeView
 */

import { model } from '../model.js';
import { controller } from '../controller.js';
import { dataProxy } from '../services/dataProxy.js';
import { uiController } from '../controllers/uiController.js';
import { Toast } from '../components/toast.js';
import { ModalComponent } from '../components/modal.js';
import { EventDelegator } from '../utils/eventDelegator.js';
import { renderKatex, formatarTextoComLatex, sanitizeComLatex } from '../utils.js';

/**
 * View da Comunidade de Questões.
 * @namespace comunidadeView
 */
export const comunidadeView = {
    abaAtiva: 'questoes', // 'questoes' | 'materiais'
    questoes: [],
    materiais: [],
    filtroMateria: '',
    filtroBimestre: '',
    filtroEscola: '',
    filtroTipoMaterial: '',

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

    tiposMateriaisDisponiveis: [
        { valor: '', label: 'Todos os Tipos' },
        { valor: 'planejamento', label: 'Planejamento / Sequência Didática' },
        { valor: 'dinamica-jogo', label: 'Dinâmica / Jogo / RPG' },
        { valor: 'atividade-imprimivel', label: 'Atividade Imprimível' },
        { valor: 'avaliacao-prova', label: 'Avaliação / Prova' },
        { valor: 'rubrica-avaliacao', label: 'Rubrica de Avaliação' }
    ],

    mudarAba(aba) {
        this.abaAtiva = aba;
        const targetContainer = document.getElementById('area-comunidade-materiais') ? 'area-comunidade-materiais' : 'view-container';
        this.render(targetContainer);
    },

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

        const isMateriais = this.abaAtiva === 'materiais';

        const html = `
            <div class="view-shell fade-in">
                <header class="view-header">
                    <div>
                        <h2 class="view-header__title">
                            <i class="fas fa-users" style="color: var(--color-primary);"></i> Banco da Comunidade
                        </h2>
                        <p class="view-header__subtitle">
                            ${isMateriais 
                                ? 'Explore, filtre e importe materiais pedagógicos e sequências didáticas compartilhados por professores.' 
                                : 'Explore, filtre por escola e bimestre, e importe questões compartilhadas por outros professores.'}
                        </p>
                    </div>
                </header>

                <!-- SELETOR DE ABAS DA COMUNIDADE -->
                <div class="mode-toggle-group" style="width: fit-content; margin-bottom: 1.5rem;">
                    <button type="button" data-action="mudar-aba-comunidade" data-aba="questoes" 
                            class="mode-toggle-btn interactive-element ${!isMateriais ? 'mode-toggle-btn--active' : ''}">
                        <i class="fas fa-question-circle" style="color: ${!isMateriais ? 'var(--color-primary)' : 'inherit'}; margin-right: 0.35rem;"></i> Banco de Questões
                    </button>
                    <button type="button" data-action="mudar-aba-comunidade" data-aba="materiais" 
                            class="mode-toggle-btn interactive-element ${isMateriais ? 'mode-toggle-btn--active' : ''}">
                        <i class="fas fa-book-open" style="color: ${isMateriais ? 'var(--color-primary)' : 'inherit'}; margin-right: 0.35rem;"></i> Materiais Pedagógicos
                    </button>
                </div>

                ${!isMateriais ? `
                    <!-- PAINEL DE FILTROS: QUESTÕES -->
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
                                <select id="filter-bimestre" data-action="filtro-bimestre-comunidade" class="form-select" style="width: 100%; padding: 0.5rem 0.75rem; font-size: 0.8125rem;">
                                    <option value="">Todos os Bimestres</option>
                                    ${this.bimestresDisponiveis.map(b => `<option value="${b}" ${this.filtroBimestre === b ? 'selected' : ''}>${b}</option>`).join('')}
                                </select>
                            </div>

                            <!-- FILTRO ESCOLA -->
                            <div>
                                <input type="text" id="filter-escola" data-action="filtro-escola-comunidade" placeholder="Filtrar por escola..." class="form-input" style="width: 100%; padding: 0.5rem 0.75rem; font-size: 0.8125rem;" value="${window.escapeHTML(this.filtroEscola || '')}">
                            </div>

                            <!-- BOTÕES E QUANTIDADE -->
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <button type="button" data-action="nova-busca-comunidade" class="btn-primary comunidade-search-button" style="flex: 1; justify-content: center;">
                                    <i class="fas fa-search"></i> Buscar
                                </button>

                                <div class="custom-dropdown" style="width: 5rem;">
                                    <input type="hidden" value="${this.itensPorPagina}">
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
                        <button type="button" data-action="prev-pagina-comunidade" id="btn-prev-page" disabled class="btn-pager">
                            <i class="fas fa-chevron-left"></i> Anterior
                        </button>

                        <span style="font-size: 0.6875rem; font-weight: 900; color: var(--color-slate-400); text-transform: uppercase; letter-spacing: 0.1em;">
                            Página <span id="page-num" style="color: #4f46e5; font-size: 0.875rem; margin-left: 0.25rem;">${this.paginaAtual}</span>
                        </span>

                        <button type="button" data-action="next-pagina-comunidade" id="btn-next-page" disabled class="btn-pager btn-pager--active">
                            Próxima <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                ` : `
                    <!-- PAINEL DE FILTROS: MATERIAIS PEDAGÓGICOS -->
                    <section class="panel panel--fit" style="border-radius: var(--radius-2xl);">
                        <div class="comunidade-filter-bar" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; align-items: center;">
                            
                            <!-- BUSCA DE TEXTO -->
                            <div style="grid-column: 1 / -1;">
                                <input type="text" id="search-comunidade-material" placeholder="Buscar materiais por tema, título, autor ou disciplina..." class="form-input--search comunidade-search" style="width: 100%;">
                            </div>

                            <!-- FILTRO MATÉRIA / DISCIPLINA -->
                            <div id="dropdown-materia-mat" class="custom-dropdown">
                                <input type="hidden" id="filter-materia-mat" value="${this.filtroMateria || ''}">
                                <button class="dropdown-button w-full">
                                    <span class="dropdown-label truncate">${this.filtroMateria || 'Todas as disciplinas'}</span>
                                    <i class="fas fa-chevron-down" style="color: var(--color-slate-400); font-size: 0.75rem; margin-left: auto;"></i>
                                </button>

                                <ul class="dropdown-menu hidden custom-scrollbar">
                                    <li class="dropdown-item ${this.filtroMateria === '' ? 'dropdown-item--selected' : ''}" data-value="">
                                        Todas as disciplinas
                                    </li>
                                    ${Object.keys(model.coresComponentes || {}).map(m => `
                                        <li class="dropdown-item ${this.filtroMateria === m ? 'dropdown-item--selected' : ''}" data-value="${m}">
                                            ${m}
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>

                            <!-- FILTRO TIPO DE MATERIAL -->
                            <div>
                                <select id="filter-tipo-material" data-action="filtro-tipo-material-comunidade" class="form-select" style="width: 100%; padding: 0.5rem 0.75rem; font-size: 0.8125rem;">
                                    ${this.tiposMateriaisDisponiveis.map(t => `<option value="${t.valor}" ${this.filtroTipoMaterial === t.valor ? 'selected' : ''}>${t.label}</option>`).join('')}
                                </select>
                            </div>

                            <!-- BOTÃO DE BUSCA -->
                            <div>
                                <button type="button" data-action="buscar-materiais-comunidade" class="btn-primary comunidade-search-button" style="width: 100%; justify-content: center;">
                                    <i class="fas fa-search mr-1"></i> Buscar Materiais
                                </button>
                            </div>
                        </div>
                    </section>

                    <section id="comunidade-materiais-results" class="stat-grid stat-grid--3" style="margin-top: 1.5rem;"></section>
                `}
            </div>
        `;

        container.innerHTML = html;

        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }

        const unbindClick = EventDelegator.bind(container, {
            'mudar-aba-comunidade': (e, target) => {
                const aba = target.getAttribute('data-aba');
                if (aba) this.mudarAba(aba);
            },
            'nova-busca-comunidade': () => this.novaBusca(),
            'buscar-materiais-comunidade': () => this.buscarMateriais(),
            'prev-pagina-comunidade': () => this.paginaAnterior(),
            'next-pagina-comunidade': () => this.proximaPagina(),
            'abrir-preview-material': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) this.abrirPreviewMaterial(id);
            },
            'importar-material-comunidade': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) this.importarMaterialComunidade(id);
            },
            'copiar-questao-comunidade': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) this.copiarQuestao(id);
            },
            'importar-questao-comunidade': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) this.importarQuestao(id);
            }
        }, 'click');

        const unbindChange = EventDelegator.bind(container, {
            'filtro-bimestre-comunidade': (e, target) => this.setFiltroBimestre(target.value),
            'filtro-tipo-material-comunidade': (e, target) => this.setFiltroTipoMaterial(target.value)
        }, 'change');

        const unbindInput = EventDelegator.bind(container, {
            'filtro-escola-comunidade': (e, target) => this.setFiltroEscola(target.value)
        }, 'input');

        this._cleanupDelegators = () => {
            if (typeof unbindClick === 'function') unbindClick();
            if (typeof unbindChange === 'function') unbindChange();
            if (typeof unbindInput === 'function') unbindInput();
        };

        if (!isMateriais) {
            // ATIVAÇÃO DO DROPDOWN CUSTOMIZADO DE QUESTÕES
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
        } else {
            // ATIVAÇÃO DO DROPDOWN CUSTOMIZADO DE MATERIAIS
            setTimeout(() => {
                if (window.uiController && window.uiController.setupCustomDropdown) {
                    window.uiController.setupCustomDropdown('dropdown-materia-mat', (valorSelecionado) => {
                        comunidadeView.filtroMateria = valorSelecionado;
                        comunidadeView.buscarMateriais();
                    });
                }
            }, 50);

            this.buscarMateriais();
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
            uiController.renderLoading(grid, 'Carregando comunidade...');
        }

        try {
            const res = await dataProxy.buscarComunidadePaginada({
                colecao: 'comunidade_questoes',
                filtroMateria: filtro,
                filtroBimestre: filtroBimestre,
                filtroEscola: filtroEscola,
                termoBusca: termoBusca,
                ultimoDoc: direcao === 'proxima' ? this.ultimoDoc : null,
                limite: this.itensPorPagina
            });

            this.questoes = res.itens;
            this.ultimoDoc = res.ultimoDoc;
            this.totalCarregado = res.itens.length;

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
            if (error?.code === 'failed-precondition') {
                window.Toast.show("A criar índices... Tente novamente em instantes.", "warning");
            } else {
                window.Toast.show("Erro ao buscar dados da comunidade.", "error");
            }
            if (grid) {
                uiController.renderEmptyState(grid, {
                    icone: 'fa-exclamation-triangle',
                    titulo: 'Erro de conexão',
                    mensagem: 'Não foi possível carregar os dados da comunidade.'
                });
            }
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

        grid.innerHTML = '';
        const fragment = document.createDocumentFragment();

        this.questoes.forEach(q => {
            const corMateria = (model.coresComponentes && model.coresComponentes[q.materia]) || '#4f46e5';
            const estrelasHtml = this._renderEstrelasDificuldade(q.dificuldade);
            const autorNome = q.autor ? q.autor.split(' ')[0] : 'Professor(a)';

            const materiaEscaped = window.escapeHTML(q.materia || 'Geral');
            const anoEscaped = window.escapeHTML(q.ano || '');
            const escolaEscaped = q.escola ? window.escapeHTML(q.escola) : '';
            const bimestreEscaped = q.bimestre ? window.escapeHTML(q.bimestre) : '';
            const autorEscaped = window.escapeHTML(autorNome);
            const idEscaped = window.escapeHTML(JSON.stringify(q.id));
            const tipoLabel = (q.tipo === 'multipla' || q.tipo === 'multipla_escolha') ? 'Múltipla Escolha' : 'Dissertativa';
            const tipoIcon = (q.tipo === 'multipla' || q.tipo === 'multipla_escolha') ? 'fa-list-ul' : 'fa-pen-nib';
            const bgHeader = `${corMateria}12`;

            const card = document.createElement('div');
            card.className = 'comunidade-card interactive-element animate-enter';
            card.style.cssText = 'border: 1px solid var(--color-slate-200); border-radius: var(--radius-2xl); background: var(--color-white); display: flex; flex-direction: column; overflow: hidden; box-shadow: var(--shadow-sm);';
            card.innerHTML = `
                <div style="padding: 1rem 1.25rem; background-color: ${bgHeader}; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-slate-100);">
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        <span class="badge" style="background-color: var(--color-white); color: ${corMateria}; font-weight: 800; box-shadow: var(--shadow-sm);">
                            ${materiaEscaped}
                        </span>
                        <span class="badge" style="background-color: rgba(255, 255, 255, 0.85); color: var(--color-slate-600); font-weight: 600; font-size: 0.6875rem;">
                            ${tipoLabel}
                        </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        ${estrelasHtml}
                        <div style="width: 2rem; height: 2rem; border-radius: var(--radius-lg); background-color: var(--color-white); display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-sm); color: ${corMateria};">
                            <i class="fas ${tipoIcon}" style="font-size: 0.8125rem;"></i>
                        </div>
                    </div>
                </div>

                <div style="padding: 1.25rem; display: flex; flex-direction: column; flex: 1;">
                    <div class="comunidade-card__enunciado" style="color: var(--color-slate-800); font-size: 0.875rem; line-height: 1.55; font-weight: 500; margin-bottom: 0.75rem; max-height: 130px; overflow-y: auto;">
                        ${q.enunciado ? formatarTextoComLatex(sanitizeComLatex(q.enunciado).replace(/\n/g, '<br>')) : '<span style="color: var(--color-slate-400); font-style: italic;">Sem enunciado cadastrado.</span>'}
                    </div>

                    <div style="margin-top: auto; padding-top: 0.5rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.375rem; font-size: 0.75rem; color: var(--color-slate-400);">
                        <div style="display: flex; align-items: center; gap: 0.375rem; flex-wrap: wrap;">
                            ${anoEscaped ? `<span style="font-weight: 700; color: var(--color-slate-500);">${anoEscaped}</span>` : ''}
                            ${bimestreEscaped ? `<span>• ${bimestreEscaped}</span>` : ''}
                            ${escolaEscaped ? `<span class="truncate" style="max-width: 140px;" title="${escolaEscaped}">• ${escolaEscaped}</span>` : ''}
                        </div>
                        <span style="display: flex; align-items: center; gap: 0.25rem; color: var(--color-slate-500); font-weight: 600;">
                            <i class="fas fa-user-circle" style="color: var(--color-slate-400);"></i> ${autorEscaped}
                        </span>
                    </div>

                    <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--color-slate-100); display: flex; gap: 0.5rem; align-items: center;">
                        <button type="button" data-action="copiar-questao-comunidade" data-id="${q.id}" class="btn-secondary interactive-element" style="padding: 0.5rem 0.75rem; font-size: 0.75rem; font-weight: 700;" title="Copiar texto da questão">
                            <i class="far fa-copy"></i> <span>Copiar</span>
                        </button>
                        <button type="button" data-action="importar-questao-comunidade" data-id="${q.id}" class="btn-primary interactive-element" style="flex: 1; justify-content: center; padding: 0.5rem 0.875rem; font-size: 0.8125rem; font-weight: 700; background-color: #4f46e5;">
                            <i class="fas fa-download"></i> <span>Importar para meu Banco</span>
                        </button>
                    </div>
                </div>
            `;
            fragment.appendChild(card);
        });

        grid.appendChild(fragment);
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
    },

    setFiltroTipoMaterial(val) {
        this.filtroTipoMaterial = val;
        this.buscarMateriais();
    },

    async buscarMateriais() {
        const grid = document.getElementById('comunidade-materiais-results');
        if (!grid) return;
        uiController.renderLoading(grid, 'Consultando materiais pedagógicos da comunidade...');

        const busca = (document.getElementById('search-comunidade-material')?.value || '').trim().toLowerCase();
        const disc = this.filtroMateria || '';
        const tipo = this.filtroTipoMaterial || '';

        try {
            const res = await dataProxy.buscarComunidadePaginada({
                colecao: 'comunidade_materiais',
                filtroMateria: disc,
                filtroTipo: tipo,
                termoBusca: busca,
                limite: 50
            });
            this.materiais = res.itens;
            this.renderListaMateriais();
        } catch (e) {
            console.error("Erro ao buscar materiais:", e);
            uiController.renderEmptyState(grid, {
                icone: 'fa-exclamation-circle',
                titulo: 'Falha de conexão',
                mensagem: 'Não foi possível carregar os materiais da comunidade.'
            });
        }
    },

    renderListaMateriais() {
        const grid = document.getElementById('comunidade-materiais-results');
        if (!grid) return;

        if (!this.materiais || this.materiais.length === 0) {
            grid.innerHTML = `
                <div class="card" style="grid-column: 1 / -1; padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border-radius: var(--radius-2xl);">
                    <div style="width: 4rem; height: 4rem; border-radius: var(--radius-full); background: var(--color-slate-100); color: var(--color-slate-400); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 1rem;">
                        <i class="fas fa-folder-open"></i>
                    </div>
                    <h3 style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-700); margin-bottom: 0.25rem;">Nenhum material encontrado</h3>
                    <p style="color: var(--color-slate-400); font-size: 0.8125rem; max-width: 340px;">Experimente buscar por outros termos ou limpar os filtros de disciplina e tipo.</p>
                </div>
            `;
            return;
        }

        const colorMap = {
            'planejamento': { i: 'far fa-calendar-alt', c: '#4f46e5', bg: '#eef2ff' },
            'dinamica-jogo': { i: 'fas fa-users', c: '#2563eb', bg: '#eff6ff' },
            'atividade-imprimivel': { i: 'fas fa-print', c: '#059669', bg: '#ecfdf5' },
            'avaliacao-prova': { i: 'fas fa-clipboard-list', c: '#ea580c', bg: '#fff7ed' },
            'rubrica-avaliacao': { i: 'fas fa-calculator', c: '#9333ea', bg: '#faf5ff' }
        };

        grid.innerHTML = '';
        const fragment = document.createDocumentFragment();

        this.materiais.forEach(m => {
            const style = colorMap[m.tipo] || { i: 'fas fa-file-alt', c: '#64748b', bg: '#f8fafc' };
            const tituloSafe = window.escapeHTML ? window.escapeHTML(m.titulo || m.tema || 'Material Pedagógico') : (m.titulo || 'Material Pedagógico');
            const discSafe = window.escapeHTML ? window.escapeHTML(m.disciplina || 'Geral') : (m.disciplina || 'Geral');
            const serieSafe = window.escapeHTML ? window.escapeHTML(m.serie || 'Série Livre') : (m.serie || 'Série Livre');
            const autorSafe = window.escapeHTML ? window.escapeHTML(m.autor || 'Professor(a)') : (m.autor || 'Professor(a)');
            const dataFmt = m.data_partilha ? new Date(m.data_partilha).toLocaleDateString('pt-BR') : '';

            const card = document.createElement('div');
            card.className = 'material-card interactive-element animate-enter';
            card.style.cssText = 'border: 1px solid var(--color-slate-200); border-radius: var(--radius-2xl); background: var(--color-white); display: flex; flex-direction: column; overflow: hidden; box-shadow: var(--shadow-sm);';
            card.innerHTML = `
                <div style="padding: 1.25rem; background-color: ${style.bg}; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--color-slate-100);">
                    <span class="badge" style="background-color: var(--color-white); color: ${style.c}; font-weight: 800; box-shadow: var(--shadow-sm);">
                        ${discSafe}
                    </span>
                    <div style="width: 2.25rem; height: 2.25rem; border-radius: var(--radius-lg); background-color: var(--color-white); display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-sm);">
                        <i class="${style.i}" style="color: ${style.c};"></i>
                    </div>
                </div>

                <div style="padding: 1.25rem; display: flex; flex-direction: column; flex: 1;">
                    <h4 style="font-weight: 800; color: var(--color-slate-800); font-size: 1.05rem; line-height: 1.35; margin-bottom: 0.35rem;" class="line-clamp-2">${tituloSafe}</h4>
                    <p style="font-size: 0.75rem; color: var(--color-slate-400); margin-bottom: 1rem;">${serieSafe} • Por <strong>${autorSafe}</strong> ${dataFmt ? 'em ' + dataFmt : ''}</p>

                    <div style="margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--color-slate-100); display: flex; gap: 0.5rem;">
                        <button type="button" data-action="abrir-preview-material" data-id="${m.id}" class="btn-secondary interactive-element" style="flex: 1; padding: 0.625rem 0.75rem; font-size: 0.8125rem;">
                            <i class="fas fa-eye"></i> <span>Visualizar</span>
                        </button>
                        <button type="button" data-action="importar-material-comunidade" data-id="${m.id}" class="btn-primary interactive-element" style="flex: 1; padding: 0.625rem 0.75rem; font-size: 0.8125rem; background-color: #4f46e5;">
                            <i class="fas fa-download"></i> <span>Importar</span>
                        </button>
                    </div>
                </div>
            `;
            fragment.appendChild(card);
        });

        grid.appendChild(fragment);
    },

    abrirPreviewMaterial(materialId) {
        const mat = (this.materiais || []).find(m => String(m.id) === String(materialId));
        if (!mat) return;

        const tituloSafe = window.escapeHTML ? window.escapeHTML(mat.titulo || mat.tema || 'Material') : (mat.titulo || 'Material');
        const conteudo = mat.conteudo_html || '<p>Conteúdo não disponível.</p>';

        const previewContainer = document.createElement('div');
        previewContainer.style.cssText = 'padding: 1rem; display: flex; flex-direction: column; gap: 1rem; max-width: 800px; max-height: 75vh; overflow-y: auto;';
        previewContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.75rem; border-bottom: 1px solid var(--color-slate-100); flex-wrap: wrap; gap: 0.5rem;">
                <div>
                    <span class="badge" style="background: #eef2ff; color: #4f46e5; font-weight: 800; margin-right: 0.5rem;">${window.escapeHTML(mat.disciplina || 'Geral')}</span>
                    <span style="font-size: 0.8125rem; color: var(--color-slate-500);">${window.escapeHTML(mat.serie || 'Série Livre')} • Por <strong>${window.escapeHTML(mat.autor || 'Prof')}</strong></span>
                </div>
            </div>
            <div class="documento-visualizacao" style="background: #fff; padding: 1.5rem; border: 1px solid var(--color-slate-200); border-radius: var(--radius-xl); font-size: 0.9375rem; line-height: 1.6;">
                ${conteudo}
            </div>
        `;

        const modal = new ModalComponent({
            title: tituloSafe,
            icon: 'fa-book-open',
            maxWidth: '850px',
            content: previewContainer,
            actions: [
                {
                    id: 'btn-importar-modal',
                    label: 'Importar para Minha Biblioteca',
                    icon: 'fa-download',
                    class: 'btn-primary',
                    handler: () => {
                        this.importarMaterialComunidade(mat.id);
                        modal.close();
                    }
                }
            ]
        });

        modal.open();

        setTimeout(() => {
            if (window.renderKatex) {
                window.renderKatex(previewContainer.querySelector('.documento-visualizacao'));
            }
        }, 50);
    },

    importarMaterialComunidade(materialId) {
        const mat = (this.materiais || []).find(m => String(m.id) === String(materialId));
        if (!mat) return;
        model.importarMaterialComunidade(mat);
    },

    destroy() {
        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }
    },

    onLeave() {
        this.destroy();
    }
};

if (typeof window !== 'undefined') {
    window.comunidadeView = comunidadeView;
}