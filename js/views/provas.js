import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';
import { ModalComponent } from '../components/modal.js';
import { PaginatorComponent } from '../components/paginator.js';
import { aiService } from '../ai-service.js';
import { renderKatex, formatarTextoComLatex, sanitizeComLatex, alternarModoEdicaoPreview, lerArquivoTexto } from '../utils.js';
import { EventDelegator } from '../utils/eventDelegator.js';
import { tableHelper } from '../utils/tableHelper.js';

export const provasView = {
    selecionadas: new Set(),
    gabaritosOcultos: new Set(),
    termoBusca: '',
    tempDados: null,
    contextoQuestaoArquivo: '',
    abaAtiva: 'minhas',
    _cleanupDelegators: null,
    filtros: {
        materia: '',
        ano: '',
        tipo: '',
        bncc: '',
        escola: '',
        bimestre: ''
    },
    itensPorPagina: 25,
    paginaAtual: 1,
    disciplinas: [
        "Língua Portuguesa", "Matemática", "Ciências", "História", "Geografia",
        "Arte", "Educação Física", "Língua Inglesa", "Ensino Religioso", "Física", "Química",
        "Biologia", "Filosofia", "Sociologia"
    ],
    seriesDisponiveis: [
        "Berçário I", "Berçário II", "Maternal I", "Maternal II", "Jardim I", "Jardim II",
        "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano", "6º Ano", "7º Ano", "8º Ano", "9º Ano",
        "1ª Série (EM)", "2ª Série (EM)", "3ª Série (EM)"
    ],
    bimestresDisponiveis: [
        "1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"
    ],

    obterListaEscolas() {
        const todas = [
            ...(model.state.questoes || []),
            ...(model.state.questoesSistema || []),
            ...(model.state.questoesEnem || [])
        ];
        const setEscolas = new Set();
        if (model.state.userConfig?.escola) setEscolas.add(model.state.userConfig.escola.trim());
        todas.forEach(q => {
            if (q.escola && typeof q.escola === 'string' && q.escola.trim()) {
                setEscolas.add(q.escola.trim());
            }
        });
        return Array.from(setEscolas).filter(Boolean).sort();
    },
    formatarHTMLQuestao(texto) {
        if (!texto) return '';
        if (window.sanitizeComLatex) {
            return window.sanitizeComLatex(texto);
        }
        return window.escapeHTML(texto);
    },
    _renderEstrelasDificuldade(nivel = 0) {
        let n = 0;
        if (typeof nivel === 'string') {
            const nivelLower = nivel.toLowerCase();
            if (nivelLower.includes('fácil') || nivelLower.includes('facil')) n = 1;
            else if (nivelLower.includes('méd') || nivelLower.includes('med')) n = 2;
            else if (nivelLower.includes('difícil') || nivelLower.includes('dificil')) n = 3;
            else n = Number(nivel) || 0;
        } else {
            n = Number(nivel) || 0;
        }
        let estrelas = '';
        for (let i = 1; i <= 3; i++) {
            let cor = 'var(--color-slate-200)';
            if (n > 0 && i <= n) {
                cor = '#fbbf24';
            }
            estrelas += `<i class="fas fa-star" style="color: ${cor}; font-size: 0.625rem;"></i>`;
        }
        const labels = ["Não definida", "Fácil", "Média", "Difícil"];
        return `
        <div style="display: flex; align-items: center; gap: 0.25rem; background-color: var(--color-slate-50); padding: 0.25rem 0.5rem; border-radius: var(--radius-lg); border: 1px solid var(--color-slate-100);" title="Dificuldade: ${labels[n] || labels[0]}">
            ${estrelas}
        </div>
    `;
    },
    mudarAba(novaAba) {
        this.abaAtiva = novaAba;
        this.filtros = { materia: '', ano: '', tipo: '', bncc: '', escola: '', bimestre: '' };
        this.termoBusca = '';
        this.paginaAtual = 1;
        this.render('view-container');
    },
    atualizarFiltro(campo, valor) {
        this.filtros[campo] = valor;
        this.paginaAtual = 1;
        this.render('view-container');
    },
    filtrarQuestoes(todas) {
        return todas.filter(q => {
            const codigoBncc = typeof q.bncc === 'string' ? q.bncc : (q.bncc?.codigo || '');
            const qAdapter = {
                ...q,
                bncc_texto: codigoBncc,
                tags_texto: Array.isArray(q.tags) ? q.tags.join(' ') : ''
            };
            const matchBusca = (window.matchMultiTermos || matchMultiTermos)(qAdapter, ['enunciado', 'bncc_texto', 'escola', 'tags_texto'], this.termoBusca);
            const matchMateria = !this.filtros.materia || q.materia === this.filtros.materia;
            const matchAno = !this.filtros.ano || q.ano === this.filtros.ano;
            const matchTipo = !this.filtros.tipo || q.tipo === this.filtros.tipo;
            const matchEscola = !this.filtros.escola || (q.escola && q.escola.toLowerCase().includes(this.filtros.escola.toLowerCase()));
            const matchBimestre = !this.filtros.bimestre || q.bimestre === this.filtros.bimestre;
            const matchUnidade = !this.filtros.unidade || q.bncc?.unidade_tematica === this.filtros.unidade;
            const matchSaeb = !this.filtros.saeb || (q.descritorSaeb && q.descritorSaeb.toLowerCase().includes(this.filtros.saeb.toLowerCase()));
            return matchBusca && matchMateria && matchAno && matchTipo && matchEscola && matchBimestre && matchUnidade && matchSaeb;
        });
    },
    async verificarImagem(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (e) {
            return false;
        }
    },
    _renderFiltros(lista = []) {
        const descritores = model.state.descritoresSaeb || [];
        let listaAnos = this.seriesDisponiveis;
        if (this.abaAtiva === 'enem') {
            const anosEnem = Array.from(new Set((model.state.questoesEnem || []).map(q => q.ano).filter(Boolean))).sort();
            listaAnos = anosEnem.length > 0 ? anosEnem : ["ENEM 1998", "ENEM 1999"];
        }
        return `
            <div class="dynamic-box" style="padding: 1.25rem; margin-bottom: 1rem;">
                <div class="provas-filters-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1rem;">
                    <div>
                        <label class="form-label">Disciplina</label>
                        <select onchange="provasView.atualizarFiltro('materia', this.value)" class="form-select">
                            <option value="">Todas as Matérias</option>
                            ${this.disciplinas.map(d => `<option value="${d}" ${this.filtros.materia === d ? 'selected' : ''}>${d}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="form-label">${this.abaAtiva === 'enem' ? 'Edição ENEM' : 'Série/Ano'}</label>
                        <select onchange="provasView.atualizarFiltro('ano', this.value)" class="form-select">
                            <option value="">${this.abaAtiva === 'enem' ? 'Todas as Edições' : 'Todos os Anos'}</option>
                            ${listaAnos.map(s => `<option value="${s}" ${this.filtros.ano === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Bimestre</label>
                        <select onchange="provasView.atualizarFiltro('bimestre', this.value)" class="form-select">
                            <option value="">Todos os Bimestres</option>
                            ${this.bimestresDisponiveis.map(b => `<option value="${b}" ${this.filtros.bimestre === b ? 'selected' : ''}>${b}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Descritor SAEB</label>
                        <select onchange="provasView.atualizarFiltro('saeb', this.value)" class="form-select">
                            <option value="">Todos os Descritores</option>
                            ${descritores.map(d => `<option value="${d.codigo}" ${this.filtros.saeb === d.codigo ? 'selected' : ''}>${d.codigo} - ${window.escapeHTML(d.disciplina)}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Escola</label>
                        <select onchange="provasView.atualizarFiltro('escola', this.value)" class="form-select">
                            <option value="">Todas as Escolas</option>
                            ${this.obterListaEscolas().map(esc => `<option value="${window.escapeHTML(esc)}" ${this.filtros.escola === esc ? 'selected' : ''}>${window.escapeHTML(esc)}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Tipo</label>
                        <select onchange="provasView.atualizarFiltro('tipo', this.value)" class="form-select">
                            <option value="">Todos os Tipos</option>
                            <option value="multipla" ${this.filtros.tipo === 'multipla' ? 'selected' : ''}>Múltipla Escolha</option>
                            <option value="aberta" ${this.filtros.tipo === 'aberta' ? 'selected' : ''}>Dissertativa</option>
                        </select>
                    </div>
                </div>
                
                <div style="position: relative; margin-top: 1rem;">
                    <i class="fas fa-search" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--color-slate-400);"></i>
                    <input type="text" id="input-busca-provas" placeholder="Pesquisar por enunciado, código BNCC, Descritor SAEB ou escola..." 
                        class="form-input" style="padding-left: 2.75rem; width: 100%;"
                        oninput="provasView.atualizarBusca(this.value)" value="${this.termoBusca}">
                </div>
            </div>`;
    },
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }

        const minhasQuestoes = model.state.questoes || [];
        const questoesSistema = model.state.questoesSistema || [];
        const questoesEnem = model.state.questoesEnem || [];
        let listaParaFiltrar;
        if (this.abaAtiva === 'minhas') listaParaFiltrar = minhasQuestoes;
        else if (this.abaAtiva === 'sistema') listaParaFiltrar = questoesSistema;
        else listaParaFiltrar = questoesEnem;
        const questoesFiltradas = this.filtrarQuestoes(listaParaFiltrar);
        const totalItens = questoesFiltradas.length;
        let totalPaginas = this.itensPorPagina === 'all' ? 1 : Math.ceil(totalItens / this.itensPorPagina);
        if (totalPaginas === 0) totalPaginas = 1;
        if (this.paginaAtual > totalPaginas) this.paginaAtual = totalPaginas;
        let questoesPaginadas = questoesFiltradas;
        if (this.itensPorPagina !== 'all') {
            const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
            const fim = inicio + this.itensPorPagina;
            questoesPaginadas = questoesFiltradas.slice(inicio, fim);
        }
        const todosIdsExistentes = new Set([...minhasQuestoes, ...questoesSistema, ...questoesEnem].map(q => String(q.id)));
        for (const id of this.selecionadas) {
            if (!todosIdsExistentes.has(String(id))) this.selecionadas.delete(id);
        }
        const html = `
        <div class="fade-in print-hidden" style="padding-bottom: 6rem;">
            <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; gap: 1rem;">
                <div>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Gerador de Avaliações</h2>
                        <button type="button" data-action="nav-stats-provas" 
                                class="interactive-element"
                                style="width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background-color: #ffffff; border: 1px solid #e2e8f0; color: #94a3b8; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-sm); cursor: pointer; transition: all var(--transition-fast);"
                                onmouseover="this.style.color='#4f46e5'; this.style.borderColor='#c7d2fe'; this.style.backgroundColor='#eff6ff';" onmouseout="this.style.color='#94a3b8'; this.style.borderColor='#e2e8f0'; this.style.backgroundColor='#ffffff';"
                                title="Analisar Acervo de Questões">
                            <i class="fas fa-chart-pie"></i>
                        </button>
                    </div>
                    <p class="text-slate-500 mt-1">Selecione questões e gere provas (Aluno ou Gabarito).</p>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <button type="button" data-action="nav-comunidade" 
                            class="btn-secondary interactive-element"
                            style="background-color: #4f46e5; color: #ffffff; padding: 0.75rem 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.25);">
                        <i class="fas fa-globe"></i> Explorar Comunidade
                    </button>
                    <button type="button" data-action="open-add-questao" 
                            class="btn-primary interactive-element" style="padding: 0.75rem 1.5rem; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.25);">
                        <i class="fas fa-plus"></i> Nova Questão
                    </button>
                </div>
            </div>
            <div class="provas-layout">
                <div class="provas-main-content">
                    <div class="mode-toggle-group" style="width: fit-content;">
                        <button type="button" data-action="mudar-aba-provas" data-aba="minhas" 
                                class="mode-toggle-btn interactive-element ${this.abaAtiva === 'minhas' ? 'mode-toggle-btn--active' : ''}">
                            Minhas Questões (${minhasQuestoes.length})
                        </button>
                        <button type="button" data-action="mudar-aba-provas" data-aba="sistema" 
                                class="mode-toggle-btn interactive-element ${this.abaAtiva === 'sistema' ? 'mode-toggle-btn--active' : ''}">
                            Banco do Sistema (${questoesSistema.length})
                        </button>
                        <button type="button" data-action="mudar-aba-provas" data-aba="enem" 
                                class="mode-toggle-btn interactive-element ${this.abaAtiva === 'enem' ? 'mode-toggle-btn--active' : ''}">
                            Banco ENEM (${questoesEnem.length})
                        </button>
                    </div>
                    
                    ${this._renderFiltros(listaParaFiltrar)}

                    <!-- BARRA SUPERIOR DE PAGINAÇÃO -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; margin-top: 1.5rem;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: #94a3b8;">Mostrando <strong style="color: #475569;">${questoesPaginadas.length}</strong> de <strong style="color: #475569;">${totalItens}</strong> questões</span>
                        
                        <div style="display: flex; align-items: center; background-color: #ffffff; border-radius: 0.75rem; border: 1px solid #e2e8f0; padding: 0.25rem 0.75rem; box-shadow: var(--shadow-sm);">
                            <label class="form-label" style="margin-bottom: 0; margin-right: 0.5rem;">Itens p/ pág:</label>
                            <div class="custom-dropdown relative" style="width: 6rem;">
                                <input type="hidden" onchange="provasView.mudarQtdPagina(this.value)" value="${this.itensPorPagina}">
                                <button type="button" class="dropdown-button w-full flex items-center justify-between bg-transparent border-none text-sm font-bold text-slate-700">
                                    <span class="dropdown-label truncate">${this.itensPorPagina === 'all' ? 'Todas' : this.itensPorPagina}</span>
                                    <i class="fas fa-chevron-down text-slate-400 text-xs-micro ml-1"></i>
                                </button>
                                <ul class="dropdown-menu hidden absolute z-50 w-24 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl p-1.5 animate-enter origin-top-right text-left font-normal">
                                    <li class="dropdown-item" data-value="25">25</li>
                                    <li class="dropdown-item" data-value="50">50</li>
                                    <li class="dropdown-item" data-value="100">100</li>
                                    <li class="dropdown-item" data-value="200">200</li>
                                    <li class="dropdown-item" data-value="all">Todas</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <!-- LISTA DE QUESTÕES (usando questoesPaginadas) -->
                    <div style="display: flex; flex-direction: column; gap: 1rem;" id="lista-questoes">
                        ${questoesPaginadas.length > 0
                ? questoesPaginadas.map(q => this.cardQuestao(q)).join('')
                : this.estadoVazio()}
                    </div>
                    
                    <!-- CONTROLES INFERIORES DE PAGINAÇÃO -->
                    <div id="pagination-controls" style="display: ${totalPaginas <= 1 ? 'none' : 'flex'}; margin-top: 2rem; justify-content: space-between; align-items: center; background-color: var(--color-white); padding: 1rem; border-radius: var(--radius-2xl); border: 1px solid var(--color-slate-200); box-shadow: var(--shadow-sm);">
                        <button type="button" data-action="pagina-anterior" ${this.paginaAtual === 1 ? 'disabled' : ''}
                                style="padding: 0.5rem 1rem; border-radius: var(--radius-lg); border: 1px solid var(--color-slate-200); color: var(--color-slate-500); font-weight: 700; font-size: 0.875rem; background-color: transparent; cursor: ${this.paginaAtual === 1 ? 'not-allowed' : 'pointer'}; opacity: ${this.paginaAtual === 1 ? '0.5' : '1'}; transition: all var(--transition-fast); display: flex; align-items: center; gap: 0.5rem;"
                                ${this.paginaAtual !== 1 ? 'onmouseover="this.style.backgroundColor=\'var(--color-slate-50)\'" onmouseout="this.style.backgroundColor=\'transparent\'"' : ''}>
                            <i class="fas fa-chevron-left"></i> Anterior
                        </button>
                        
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase; letter-spacing: 0.1em;">
                            Página <span style="color: #4f46e5; font-size: 0.875rem; margin: 0 0.25rem;">${this.paginaAtual}</span> de ${totalPaginas}
                        </span>
                        
                        <button type="button" data-action="proxima-pagina" ${this.paginaAtual === totalPaginas ? 'disabled' : ''}
                                style="padding: 0.5rem 1rem; border-radius: var(--radius-lg); background-color: #e0e7ff; color: #4f46e5; border: 1px solid #c7d2fe; font-weight: 700; font-size: 0.875rem; cursor: ${this.paginaAtual === totalPaginas ? 'not-allowed' : 'pointer'}; opacity: ${this.paginaAtual === totalPaginas ? '0.5' : '1'}; transition: all var(--transition-fast); display: flex; align-items: center; gap: 0.5rem;"
                                ${this.paginaAtual !== totalPaginas ? 'onmouseover="this.style.backgroundColor=\'#c7d2fe\'" onmouseout="this.style.backgroundColor=\'#e0e7ff\'"' : ''}>
                            Próxima <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
                <div style="grid-column: span 1; position: sticky; top: 6rem;">
                    <div style="background-color: var(--color-white); padding: 1.5rem; border-radius: var(--radius-2xl); box-shadow: var(--shadow-lg); border: 1px solid var(--color-slate-100); outline: 1px solid rgba(226, 232, 240, 0.5);">
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; border-bottom: 1px solid var(--color-slate-50); padding-bottom: 1rem;">
                            <div style="background-color: #e0e7ff; color: #4f46e5; width: 2.5rem; height: 2.5rem; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-file-alt" style="font-size: 1.125rem;"></i>
                            </div>
                            <div>
                                <h3 style="font-weight: 700; color: var(--color-slate-800);">Prova Atual</h3>
                                <p style="font-size: 0.75rem; color: var(--color-slate-500);">Questões selecionadas</p>
                            </div>
                        </div>
                        <div style="margin-bottom: 1.5rem; text-align: center;">
                            <div id="contador-questoes" style="font-size: 2.25rem; font-weight: 900; color: var(--color-slate-800); margin-bottom: 0.25rem;">${this.selecionadas.size}</div>
                            <p style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase; letter-spacing: 0.1em;">Selecionadas</p>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            <button type="button" data-action="abrir-opcoes-impressao" 
                                    style="width: 100%; padding: 0.75rem 0; background-color: var(--color-slate-800); color: var(--color-white); border-radius: var(--radius-xl); font-weight: 700; transition: background-color var(--transition-fast); display: flex; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: var(--shadow-md); border: none; cursor: ${this.selecionadas.size === 0 ? 'not-allowed' : 'pointer'}; opacity: ${this.selecionadas.size === 0 ? '0.5' : '1'};" 
                                    ${this.selecionadas.size === 0 ? 'disabled' : ''}
                                    ${this.selecionadas.size > 0 ? 'onmouseover="this.style.backgroundColor=\'var(--color-slate-900)\'" onmouseout="this.style.backgroundColor=\'var(--color-slate-800)\'"' : ''}>
                                <i class="fas fa-print"></i> Gerar Prova
                            </button>
                            ${this.selecionadas.size > 0 ? `
                                <button type="button" data-action="limpar-selecao" style="width: 100%; padding: 0.5rem 0; color: #ef4444; font-size: 0.75rem; font-weight: 700; border-radius: var(--radius-lg); transition: background-color var(--transition-fast); background-color: transparent; border: none; cursor: pointer;" onmouseover="this.style.backgroundColor='#fef2f2'" onmouseout="this.style.backgroundColor='transparent'">
                                    Limpar Seleção
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
        container.innerHTML = html;

        this._cleanupDelegators = EventDelegator.bind(container, {
            'nav-stats-provas': () => controller.navigate('stats-provas'),
            'nav-comunidade': () => controller.navigate('comunidade'),
            'open-add-questao': () => this.openAddQuestao(),
            'mudar-aba-provas': (e, target) => {
                const aba = target.getAttribute('data-aba');
                if (aba) this.mudarAba(aba);
            },
            'pagina-anterior': () => this.paginaAnterior(),
            'proxima-pagina': () => this.proximaPagina(),
            'abrir-opcoes-impressao': () => this.abrirOpcoesImpressao(),
            'limpar-selecao': () => this.limparSelecao(),
            'remover-comunidade': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) model.removerDaComunidade(id);
            },
            'compartilhar-questao': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) model.compartilharQuestao(id);
            },
            'toggle-gabarito-card': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) this.toggleGabaritoCard(id);
            },
            'copiar-questao': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) this.copiarQuestao(id);
            },
            'clonar-questao': (e, target) => {
                const raw = target.getAttribute('data-json');
                if (raw) {
                    try { this.clonarQuestaoParaProfessor(JSON.parse(raw)); } catch (err) { }
                }
            },
            'editar-questao': (e, target) => {
                const raw = target.getAttribute('data-json');
                if (raw) {
                    try { this.openAddQuestao(JSON.parse(raw)); } catch (err) { }
                }
            },
            'excluir-questao': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) this.excluirQuestao(id);
            },
            'toggle-selecao': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) this.toggleSelecao(id);
            }
        }, 'click');

        this.renderizarLatex(container);
        questoesPaginadas.forEach(async (q) => {
            if (q.suporte && q.suporte.tem_imagem) {
                const containerImg = document.getElementById(`img-container-${q.id}`);
                if (!containerImg) return;
                const url = q.suporte.url_imagem;
                const existe = await this.verificarImagem(url);
                if (existe) {
                    containerImg.style.display = 'flex';
                    containerImg.innerHTML = '';
                    const img = new Image();
                    img.src = url;
                    img.style.maxHeight = '12rem';
                    img.style.borderRadius = 'var(--radius-md)';
                    img.style.boxShadow = 'var(--shadow-sm)';
                    img.style.objectFit = 'contain';
                    containerImg.appendChild(img);
                    if (q.suporte.legenda) {
                        const p = document.createElement('p');
                        p.style.fontSize = '0.5625rem';
                        p.style.color = 'var(--color-slate-400)';
                        p.style.marginTop = '0.5rem';
                        p.style.fontStyle = 'italic';
                        p.style.textAlign = 'center';
                        p.textContent = q.suporte.legenda;
                        containerImg.appendChild(p);
                    }
                }
            }
        });
    },
    cardQuestao(q) {
        const isSelected = this.selecionadas.has(String(q.id));
        const isCompartilhada = q.compartilhada === true;
        const isSistema = this.abaAtiva === 'sistema';
        let tagsHtml = `<span style="padding: 0.25rem 0.5rem; background-color: var(--color-slate-100); font-size: 0.625rem; font-weight: 700; color: var(--color-slate-600); border-radius: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em;">${window.escapeHTML(q.materia || 'Geral')}</span>`;
        if (q.serie) tagsHtml += `<span style="padding: 0.25rem 0.5rem; background-color: #eef2ff; font-size: 0.625rem; font-weight: 700; color: #4f46e5; border-radius: 0.25rem; text-transform: uppercase; border: 1px solid #e0e7ff;">${window.escapeHTML(q.serie)}</span>`;
        if (q.bimestre) tagsHtml += `<span class="badge badge--bimestre" style="font-size: 0.625rem;" title="Bimestre"><i class="fas fa-bookmark"></i> ${window.escapeHTML(q.bimestre)}</span>`;
        if (q.escola) tagsHtml += `<span class="badge badge--school" style="font-size: 0.625rem;" title="Escola"><i class="fas fa-school"></i> ${window.escapeHTML(q.escola)}</span>`;
        if (q.bncc && q.bncc.codigo) tagsHtml += `<span style="padding: 0.25rem 0.5rem; background-color: #fefce8; font-size: 0.625rem; font-weight: 700; color: #a16207; border-radius: 0.25rem; text-transform: uppercase; border: 1px solid #fef08a;" title="${window.escapeHTML(q.bncc.descricao)}">${window.escapeHTML(q.bncc.codigo)}</span>`;
        const tipoLabel = (q.tipo === 'multipla') ? 'Múltipla Escolha' : 'Dissertativa';
        const tipoCor = (q.tipo === 'multipla') ? 'color: #9333ea; background-color: #faf5ff; border-color: #f3e8ff;' : 'color: #059669; background-color: #ecfdf5; border-color: #d1fae5;';
        tagsHtml += `<span style="padding: 0.25rem 0.5rem; font-size: 0.625rem; font-weight: 700; border-radius: 0.25rem; text-transform: uppercase; border: 1px solid; ${tipoCor}">${tipoLabel}</span>`;

        // Tag do ano / edição de aplicação da questão antes da dificuldade
        if (q.ano) {
            tagsHtml += `<span style="padding: 0.25rem 0.5rem; background-color: #eff6ff; font-size: 0.625rem; font-weight: 700; color: #1d4ed8; border-radius: 0.25rem; text-transform: uppercase; border: 1px solid #bfdbfe;" title="Ano/Edição de Aplicação"><i class="far fa-calendar-alt" style="margin-right: 0.25rem;"></i>${window.escapeHTML(q.ano)}</span>`;
        }

        tagsHtml += this._renderEstrelasDificuldade(q.dificuldade);

        const gabaritoOculto = this.gabaritosOcultos.has(String(q.id));
        let conteudoGabarito = '';
        if (q.tipo === 'multipla' && q.alternativas) {
            const letras = ['a', 'b', 'c', 'd', 'e'];
            conteudoGabarito = `
            <div id="gabarito-questao-${q.id}" style="margin-top: 1rem; display: ${gabaritoOculto ? 'none' : 'flex'}; flex-direction: column; gap: 0.375rem; padding-left: 0.75rem; border-left: 2px solid var(--color-slate-100);">
                ${q.alternativas.map((alt, i) => {
                const isCorreta = q.correta == i;
                const styleCor = isCorreta ? 'color: #059669; font-weight: 700;' : 'color: var(--color-slate-500);';
                const iconCorreta = isCorreta ? '<i class="fas fa-check-circle" style="font-size: 0.625rem; margin-top: 0.125rem;"></i>' : '';
                return '<div style="font-size: 0.75rem; display: flex; gap: 0.5rem; ' + styleCor + '">' +
                    '<span style="text-transform: uppercase; font-weight: 700;">' + letras[i] + ')</span>' +
                    '<span>' + this.formatarHTMLQuestao(alt) + '</span>' + iconCorreta +
                    '</div>';
            }).join('')}
            </div>`;
        } else if (q.gabarito || q.gabarito_comentado) {
            const textoGabarito = q.gabarito || q.gabarito_comentado;
            conteudoGabarito = `
            <div id="gabarito-questao-${q.id}" style="margin-top: 1rem; display: ${gabaritoOculto ? 'none' : 'block'}; padding: 0.75rem; background-color: rgba(236, 253, 245, 0.5); border-radius: var(--radius-xl); border: 1px solid rgba(209, 250, 229, 0.5);">
                <p style="font-size: 0.5625rem; font-weight: 900; color: #047857; text-transform: uppercase; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.25rem;">
                    <i class="fas fa-lightbulb"></i> Gabarito / Resposta Esperada
                </p>
                <p style="font-size: 0.75rem; color: #065f46; line-height: 1.625;">${this.formatarHTMLQuestao(textoGabarito)}</p>
                ${q.gabarito_comentado ? `
                <p style="font-size: 0.5625rem; font-weight: 900; color: #047857; text-transform: uppercase; margin-top: 0.5rem; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.25rem;">
                    <i class="fas fa-comment-dots"></i> Comentário Pedagógico
                </p>
                <p style="font-size: 0.75rem; color: #065f46; line-height: 1.625; font-style: italic;">${this.formatarHTMLQuestao(q.gabarito_comentado)}</p>
                ` : ''}
            </div>`;
        }
        const dataJson = JSON.stringify(q).replace(/'/g, "&#39;").replace(/"/g, '&quot;');
        const btnComunidade = isCompartilhada ?
            `
            <button type="button" data-action="remover-comunidade" data-id="${q.id}" 
                    style="width: 2rem; height: 2rem; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: #4f46e5; background-color: #e0e7ff; border: 1px solid #c7d2fe; cursor: pointer; transition: all var(--transition-fast);" 
                    onmouseover="this.style.backgroundColor='#fef2f2'; this.style.color='#ef4444'; this.style.borderColor='#fecaca';" onmouseout="this.style.backgroundColor='#e0e7ff'; this.style.color='#4f46e5'; this.style.borderColor='#c7d2fe';"
                    title="Remover da Comunidade">
                <i class="fas fa-globe"></i>
            </button>
            ` :
            `
            <button type="button" data-action="compartilhar-questao" data-id="${q.id}" 
                    style="width: 2rem; height: 2rem; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: var(--color-slate-300); background-color: transparent; border: none; cursor: pointer; transition: all var(--transition-fast);" 
                    onmouseover="this.style.color='#4f46e5'; this.style.backgroundColor='#e0e7ff';" onmouseout="this.style.color='var(--color-slate-300)'; this.style.backgroundColor='transparent';"
                    title="Compartilhar com a Comunidade">
                <i class="fas fa-share-nodes"></i>
            </button>
            `;
        const botoesAcao = isSistema ?
            `
            <button type="button" data-action="toggle-gabarito-card" data-id="${q.id}" 
                    style="width: 2rem; height: 2rem; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: var(--color-slate-400); background-color: transparent; border: none; cursor: pointer; transition: all var(--transition-fast);"
                    title="${gabaritoOculto ? 'Mostrar Gabarito' : 'Ocultar Gabarito'}">
                <i id="btn-eye-${q.id}" class="${gabaritoOculto ? 'far fa-eye-slash' : 'far fa-eye'}"></i>
            </button>
            <button type="button" data-action="copiar-questao" data-id="${q.id}" 
                    style="width: 2rem; height: 2rem; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: var(--color-slate-400); background-color: transparent; border: none; cursor: pointer; transition: all var(--transition-fast);"
                    title="Copiar texto da questão">
                <i class="far fa-copy"></i>
            </button>
            <button type="button" data-action="clonar-questao" data-json="${dataJson}" 
                    style="width: 2rem; height: 2rem; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: var(--color-slate-400); background-color: transparent; border: none; cursor: pointer; transition: all var(--transition-fast);" 
                    onmouseover="this.style.color='var(--color-primary)'; this.style.backgroundColor='rgba(59, 130, 246, 0.1)';" onmouseout="this.style.color='var(--color-slate-400)'; this.style.backgroundColor='transparent';"
                    title="Clonar e Editar">
                <i class="fas fa-clone"></i>
            </button>
            <span style="font-size: 0.5625rem; font-weight: 700; color: var(--color-slate-400); background-color: var(--color-slate-50); padding: 0.25rem 0.5rem; border-radius: 0.25rem; border: 1px solid var(--color-slate-100); text-transform: uppercase; letter-spacing: -0.05em;">Global</span>
            ` :
            `
            <button type="button" data-action="toggle-gabarito-card" data-id="${q.id}" 
                    style="width: 2rem; height: 2rem; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: var(--color-slate-400); background-color: transparent; border: none; cursor: pointer; transition: all var(--transition-fast);"
                    title="${gabaritoOculto ? 'Mostrar Gabarito' : 'Ocultar Gabarito'}">
                <i id="btn-eye-${q.id}" class="${gabaritoOculto ? 'far fa-eye-slash' : 'far fa-eye'}"></i>
            </button>
            <button type="button" data-action="copiar-questao" data-id="${q.id}" 
                    style="width: 2rem; height: 2rem; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: var(--color-slate-400); background-color: transparent; border: none; cursor: pointer; transition: all var(--transition-fast);"
                    title="Copiar texto da questão">
                <i class="far fa-copy"></i>
            </button>
            ${btnComunidade}
            <button type="button" data-action="editar-questao" data-json="${dataJson}" 
                    style="width: 2rem; height: 2rem; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: var(--color-slate-300); background-color: transparent; border: none; cursor: pointer; transition: all var(--transition-fast);" 
                    onmouseover="this.style.color='#3b82f6'; this.style.backgroundColor='#eff6ff';" onmouseout="this.style.color='var(--color-slate-300)'; this.style.backgroundColor='transparent';"
                    title="Editar">
                <i class="fas fa-pencil-alt"></i>
            </button>
            ${!isSelected ? `<button type="button" data-action="excluir-questao" data-id="${q.id}" style="width: 2rem; height: 2rem; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: var(--color-slate-300); background-color: transparent; border: none; cursor: pointer; transition: all var(--transition-fast);" onmouseover="this.style.color='#ef4444'; this.style.backgroundColor='#fef2f2';" onmouseout="this.style.color='var(--color-slate-300)'; this.style.backgroundColor='transparent';" title="Excluir"><i class="fas fa-trash-alt"></i></button>` : ''}
            `;
        return `
        <div id="card-questao-${q.id}" class="stat-card interactive-element animate-enter" style="min-height: auto; padding: 1.5rem; transition: all 0.2s; position: relative; ${isSelected ? 'border-color: #4f46e5; box-shadow: 0 0 0 2px #4f46e5; background-color: rgba(238, 242, 255, 0.3);' : 'border-color: #e2e8f0; background-color: #ffffff;'}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem;">
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">${tagsHtml}</div>
                <div style="display: flex; gap: 0.375rem; flex-shrink: 0; align-items: center;">
                    ${botoesAcao}
                    <button type="button" data-action="toggle-selecao" data-id="${q.id}" class="interactive-element" style="width: 2.25rem; height: 2.25rem; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; transition: all var(--transition-fast); box-shadow: var(--shadow-sm); cursor: pointer; border: none; ${isSelected ? 'background-color: #fee2e2; color: #ef4444;' : 'background-color: #f1f5f9; color: #64748b;'}"
                            title="${isSelected ? 'Desmarcar da Prova' : 'Selecionar para a Prova'}">
                        <i class="fas ${isSelected ? 'fa-minus' : 'fa-plus'}"></i>
                    </button>
                </div>
            </div>
            <div style="color: var(--color-slate-700); font-size: 0.875rem; line-height: 1.625; font-weight: 500; font-family: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif; white-space: pre-line;">
                ${this.formatarHTMLQuestao(q.enunciado)}
                <div id="img-container-${q.id}" style="display: none; margin-top: 1rem; flex-direction: column; align-items: center;"></div>
            </div>
            ${conteudoGabarito}
            <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--color-slate-50); display: flex; justify-content: flex-end;">
                ${isSelected ? '<span style="font-size: 0.625rem; font-weight: 700; color: var(--color-primary); display: flex; align-items: center; gap: 0.25rem;"><i class="fas fa-check-circle"></i> Selecionada para Prova</span>' : '<span style="font-size: 0.625rem; color: var(--color-slate-300); text-transform: uppercase; font-weight: 700; letter-spacing: -0.05em;">Disponível no banco</span>'}
            </div>
        </div>`;
    },

    toggleGabaritoCard(id) {
        const idStr = String(id);
        if (this.gabaritosOcultos.has(idStr)) {
            this.gabaritosOcultos.delete(idStr);
        } else {
            this.gabaritosOcultos.add(idStr);
        }
        const gabEl = document.getElementById(`gabarito-questao-${idStr}`);
        const btnIcon = document.getElementById(`btn-eye-${idStr}`);
        if (gabEl) {
            const oculto = this.gabaritosOcultos.has(idStr);
            gabEl.style.display = oculto ? 'none' : 'block';
            if (btnIcon) {
                btnIcon.className = oculto ? 'far fa-eye-slash' : 'far fa-eye';
                btnIcon.parentElement.title = oculto ? 'Mostrar Gabarito' : 'Ocultar Gabarito';
            }
        }
    },

    copiarQuestao(id) {
        const todas = [
            ...(model.state.questoes || []),
            ...(model.state.questoesSistema || []),
            ...(model.state.questoesEnem || [])
        ];
        const q = todas.find(item => String(item.id) === String(id));
        if (!q) return;
        let texto = `${q.enunciado}\n\n`;
        if (q.tipo === 'multipla' && q.alternativas) {
            const letras = ['A', 'B', 'C', 'D', 'E'];
            q.alternativas.forEach((alt, i) => {
                texto += `${letras[i]}) ${alt}\n`;
            });
            if (q.correta !== undefined && q.correta !== null) {
                texto += `\nGabarito: (${letras[q.correta]})\n`;
            }
        } else if (q.gabarito || q.gabarito_comentado) {
            texto += `\nExpectativa de Resposta / Gabarito:\n${q.gabarito || q.gabarito_comentado}\n`;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(texto.trim())
                .then(() => Toast.show("Questão copiada para a área de transferência!", "success"))
                .catch(() => Toast.show("Falha ao copiar texto.", "error"));
        }
    },
    atualizarBusca(valor) {
        this.termoBusca = valor;
        this.paginaAtual = 1;
        let lista;
        if (this.abaAtiva === 'minhas') lista = model.state.questoes || [];
        else if (this.abaAtiva === 'enem') lista = model.state.questoesEnem || [];
        else lista = model.state.questoesSistema || [];
        const filtradas = this.filtrarQuestoes(lista);
        const container = document.getElementById('lista-questoes');
        if (container) {
            container.innerHTML = filtradas.length > 0 ? filtradas.map(q => provasView.cardQuestao(q)).join('') : this.estadoVazio();
            this.renderizarLatex(container);
        }
        document.getElementById('input-busca-provas')?.focus();
    },
    mudarQtdPagina(valor) {
        this.itensPorPagina = valor === 'all' ? 'all' : Number(valor);
        this.paginaAtual = 1;
        this.render('view-container');
    },
    paginaAnterior() {
        if (this.paginaAtual > 1) {
            this.paginaAtual--;
            this.render('view-container');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    },
    proximaPagina() {
        this.paginaAtual++;
        this.render('view-container');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    renderizarLatex(elemento) {
        renderKatex(elemento);
    },



    openAddQuestao(dados = {}) {
        const exibirBotaoIA = !dados.id;
        dados = dados || {};
        if (this.tempDados) {
            dados = { ...this.tempDados, ...dados };
            this.tempDados = null;
        }
        const escolaPadrao = dados.escola || model.state.userConfig?.escola || '';
        const bimestrePadrao = dados.bimestre || '';
        const listaEscolas = this.obterListaEscolas();

        const habilidadeHtml = dados.bncc
            ? `<div style="background-color: #fefce8; border: 1px solid #fef08a; padding: 0.75rem; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: space-between;">
                 <div><span style="font-weight: 700; color: #a16207; font-size: 0.75rem;">${dados.bncc.codigo}</span><p style="font-size: 0.75rem; color: #ca8a04; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${dados.bncc.descricao}</p></div>
                 <button onclick="document.getElementById('q-bncc-cod').value=''; provasView.openAddQuestao({...provasView.getDataModal(), bncc: null})" style="color: #ca8a04; background: none; border: none; cursor: pointer;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#ca8a04'"><i class="fas fa-times"></i></button>
               </div>`
            : `<button onclick="provasView.preservarEstadoEBuscarBNCC()" style="width: 100%; padding: 0.75rem; border: 2px dashed var(--color-slate-200); border-radius: var(--radius-xl); color: var(--color-slate-400); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: none; cursor: pointer; transition: all var(--transition-fast);" onmouseover="this.style.borderColor='var(--color-primary)'; this.style.color='var(--color-primary)'; this.style.backgroundColor='#eff6ff';" onmouseout="this.style.borderColor='var(--color-slate-200)'; this.style.color='var(--color-slate-400)'; this.style.backgroundColor='transparent';"><i class="fas fa-search"></i> Selecionar Habilidade BNCC</button>`;
        const html = `
            <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
                <input type="hidden" id="q-id" value="${dados.id || ''}">
                <input type="hidden" id="q-created-at" value="${dados.createdAt || ''}">
                <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem;" class="grid-md-2">
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase; margin-bottom: 0.25rem;">Disciplina</label>
                        <select id="q-materia" class="input-default" style="width: 100%; border: 2px solid var(--color-slate-100); padding: 0.625rem; border-radius: var(--radius-xl); outline: none; background-color: var(--color-white); font-size: 0.875rem;">
                            <option value="">Selecione...</option>
                            ${this.disciplinas.map(d => `<option value="${d}" ${dados.materia === d ? 'selected' : ''}>${d}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase; margin-bottom: 0.25rem;">Ano / Série</label>
                        <select id="q-ano" class="input-default" style="width: 100%; border: 2px solid var(--color-slate-100); padding: 0.625rem; border-radius: var(--radius-xl); outline: none; background-color: var(--color-white); font-size: 0.875rem;">
                            <option value="">Selecione...</option>
                            ${this.seriesDisponiveis.map(s => `<option value="${s}" ${dados.ano === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem;" class="grid-md-2">
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase; margin-bottom: 0.25rem;">Escola / Unidade Escolar</label>
                        <input type="text" id="q-escola" list="lista-escolas-sugestoes" class="input-default" style="width: 100%; border: 2px solid var(--color-slate-100); padding: 0.625rem; border-radius: var(--radius-xl); outline: none; background-color: var(--color-white); font-size: 0.875rem;" placeholder="Ex: Escola Municipal..." value="${window.escapeHTML(escolaPadrao)}">
                        <datalist id="lista-escolas-sugestoes">
                            ${listaEscolas.map(esc => `<option value="${window.escapeHTML(esc)}"></option>`).join('')}
                        </datalist>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase; margin-bottom: 0.25rem;">Bimestre de Aplicação</label>
                        <select id="q-bimestre" class="input-default" style="width: 100%; border: 2px solid var(--color-slate-100); padding: 0.625rem; border-radius: var(--radius-xl); outline: none; background-color: var(--color-white); font-size: 0.875rem;">
                            <option value="">Geral / Não especificado</option>
                            ${this.bimestresDisponiveis.map(b => `<option value="${b}" ${bimestrePadrao === b ? 'selected' : ''}>${b}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem;" class="grid-md-2">
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase; margin-bottom: 0.25rem;">Tipo</label>
                        <select id="q-tipo" onchange="provasView.mudarTipoQuestao()" class="input-default" style="width: 100%; border: 1px solid var(--color-slate-200); padding: 0.5rem; border-radius: var(--radius-lg); outline: none; background-color: var(--color-white); font-size: 0.875rem; font-weight: 500;">
                            <option value="aberta" ${dados.tipo === 'aberta' ? 'selected' : ''}>Dissertativa</option>
                            <option value="multipla" ${dados.tipo === 'multipla' ? 'selected' : ''}>Múltipla Escolha</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase; margin-bottom: 0.25rem;">Dificuldade</label>
                        <select id="q-dificuldade" class="input-default" style="width: 100%; border: 1px solid var(--color-slate-200); padding: 0.5rem; border-radius: var(--radius-lg); outline: none; background-color: var(--color-white); font-size: 0.875rem; font-weight: 500;">
                            <option value="0" ${!dados.dificuldade || dados.dificuldade == 0 ? 'selected' : ''}>Não Definida</option>
                            <option value="1" ${dados.dificuldade == 1 ? 'selected' : ''}>★ (Fácil)</option>
                            <option value="2" ${dados.dificuldade == 2 ? 'selected' : ''}>★★ (Média)</option>
                            <option value="3" ${dados.dificuldade == 3 ? 'selected' : ''}>★★★ (Difícil)</option>
                        </select>
                    </div>
                </div>
                <div id="container-qtd-alt" class="${dados.tipo === 'multipla' ? '' : 'hidden'}">
                    <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase; margin-bottom: 0.25rem;">Quantidade de Alternativas</label>
                    <select id="q-qtd-alt" onchange="provasView.gerarInputsAlternativas()" class="input-default" style="width: 100%; border: 1px solid var(--color-slate-200); padding: 0.5rem; border-radius: var(--radius-lg); outline: none; background-color: var(--color-white); font-size: 0.875rem; font-weight: 500;">
                        <option value="3" ${dados.alternativas?.length === 3 ? 'selected' : ''}>3</option>
                        <option value="4" ${dados.alternativas?.length === 4 || !dados.id ? 'selected' : ''}>4</option>
                        <option value="5" ${dados.alternativas?.length === 5 ? 'selected' : ''}>5</option>
                    </select>
                </div>
                <div>
                    <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase; margin-bottom: 0.25rem;">BNCC</label>
                    <input type="hidden" id="q-bncc-cod" value="${dados.bncc ? dados.bncc.codigo : ''}">
                    <input type="hidden" id="q-bncc-desc" value="${dados.bncc ? dados.bncc.descricao : ''}">
                    ${habilidadeHtml}
                </div>
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; flex-wrap: wrap; gap: 0.5rem;">
                        <label style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase;">Enunciado (Suporta TeX/LaTeX & Tabelas)</label>
                        <div style="display: flex; gap: 0.35rem;">
                            <button type="button" onclick="tableHelper.abrirModalInserirTabela('q-enunciado')" class="btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.6875rem; font-weight: 700; color: #4f46e5; border-color: #c7d2fe; background: #eff6ff;" title="Inserir Tabela Estruturada">
                                <i class="fas fa-table"></i> + Tabela
                            </button>
                            <button type="button" onclick="alternarModoEdicaoPreview('q-enunciado', 'preview-q-enunciado', 'btn-prev-q-enunciado')" id="btn-prev-q-enunciado" class="btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.6875rem;">
                                <i class="fas fa-eye"></i> Visualizar (TeX)
                            </button>
                        </div>
                    </div>
                    <textarea id="q-enunciado" rows="4" class="input-default" style="width: 100%; border: 2px solid var(--color-slate-100); padding: 0.75rem; border-radius: var(--radius-xl); outline: none; font-size: 0.875rem; font-weight: 500;">${dados.enunciado || ''}</textarea>
                    <div id="preview-q-enunciado" style="display: none;"></div>
                </div>
                <div id="area-alternativas" class="${dados.tipo === 'multipla' ? '' : 'hidden'}" style="margin-top: 0.5rem; border-top: 1px solid var(--color-slate-100); padding-top: 0.75rem;">
                    <div id="inputs-alternativas" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
                </div>
                <div id="area-gabarito" class="${dados.tipo === 'multipla' ? 'hidden' : ''}" style="margin-top: 0.5rem; border-top: 1px solid var(--color-slate-100); padding-top: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                        <label style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase;">Resposta / Gabarito Sugerido</label>
                        <button type="button" onclick="alternarModoEdicaoPreview('q-gabarito', 'preview-q-gabarito', 'btn-prev-q-gabarito')" id="btn-prev-q-gabarito" class="btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.6875rem;">
                            <i class="fas fa-eye"></i> Visualizar (TeX)
                        </button>
                    </div>
                    <textarea id="q-gabarito" rows="2" class="input-default" style="width: 100%; border: 1px solid var(--color-slate-200); padding: 0.75rem; border-radius: var(--radius-xl); outline: none; font-size: 0.875rem; background-color: rgba(236, 253, 245, 0.3);" placeholder="Resposta esperada...">${dados.gabarito || ''}</textarea>
                    <div id="preview-q-gabarito" style="display: none;"></div>
                </div>
                <div style="padding-top: 1rem; display: flex; flex-direction: column; gap: 1rem;">
                    <div id="ai-section" class="${exibirBotaoIA ? '' : 'hidden'}">
                        <!-- UPLOAD DE ARQUIVO E CONTEXTO NOTEBOOKLM -->
                        <div style="background-color: var(--color-slate-50); border: 1px solid var(--color-slate-200); border-radius: var(--radius-xl); padding: var(--spacing-3); margin-bottom: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-600); display: flex; align-items: center; gap: 0.25rem;">
                                    <i class="fas fa-file-upload" style="color: var(--color-primary);"></i> Contexto / Arquivo / NotebookLM
                                </span>
                                <span id="q-badge-contexto" style="font-size: 0.625rem; font-weight: 700; color: var(--color-slate-400);">Opcional</span>
                            </div>
                            <div style="display: flex; gap: 0.375rem; align-items: center;">
                                <label class="btn-outline" style="cursor: pointer; padding: 0.375rem 0.625rem; font-size: 0.6875rem; display: flex; align-items: center; gap: 0.25rem; background-color: #fff;">
                                    <i class="fas fa-paperclip"></i> <span>Anexar Arquivo</span>
                                    <input type="file" id="q-file-input" accept=".txt,.md,.pdf,.csv,.json" style="display: none;" onchange="provasView.carregarArquivoQuestao(this)">
                                </label>
                                <span id="q-nome-arquivo" style="font-size: 0.6875rem; color: var(--color-slate-500); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px;"></span>
                            </div>
                            <textarea id="q-notebooklm-texto" rows="1" class="input-default" style="width: 100%; border: 1px solid var(--color-slate-200); padding: 0.375rem 0.5rem; border-radius: var(--radius-lg); font-size: 0.75rem;" placeholder="Ou cole o link/resumo do Google NotebookLM..."></textarea>
                        </div>

                        <div id="ai-loading" class="hidden" style="text-align: center; padding: 0.75rem; background-color: #e0e7ff; border-radius: var(--radius-xl); margin-bottom: 0.75rem; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;">
                            <i class="fas fa-robot" style="color: #4f46e5; margin-right: 0.5rem;"></i> 
                            <span style="font-size: 0.75rem; font-weight: 700; color: #4f46e5; text-transform: uppercase;">A IA está elaborando a questão...</span>
                        </div>
                        <button onclick="provasView.gerarComIA()" 
                            style="width: 100%; background: linear-gradient(to right, #4f46e5, #9333ea); color: var(--color-white); padding: 0.75rem; border-radius: var(--radius-xl); font-weight: 700; box-shadow: var(--shadow-lg); transition: all var(--transition-fast); display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 1rem; border: none; cursor: pointer;" onmouseover="this.style.filter='brightness(1.1)'" onmouseout="this.style.filter='none'">
                            <i class="fas fa-robot"></i> Gerar Questão com IA
                        </button>
                        
                        <div style="position: relative; display: flex; padding: 0.5rem 0; align-items: center;">
                            <div style="flex-grow: 1; border-top: 1px solid var(--color-slate-100);"></div>
                            <span style="flex-shrink: 0; margin: 0 1rem; font-size: 0.625rem; font-weight: 700; color: var(--color-slate-300); text-transform: uppercase; letter-spacing: 0.1em;">Ou edite manualmente</span>
                            <div style="flex-grow: 1; border-top: 1px solid var(--color-slate-100);"></div>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 1rem;">
                        <button onclick="controller.closeModal()" style="padding: 0.625rem 1.25rem; color: var(--color-slate-500); font-weight: 700; border-radius: var(--radius-xl); background: none; border: none; cursor: pointer; transition: background-color var(--transition-fast);" onmouseover="this.style.backgroundColor='var(--color-slate-50)'" onmouseout="this.style.backgroundColor='transparent'">Cancelar</button>
                        <button onclick="provasView.salvarQuestao()" class="btn-primary" style="padding: 0.625rem 2rem; border-radius: var(--radius-xl); font-weight: 700; box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.2);">
                            ${dados.id ? 'Salvar Alterações' : 'Salvar Questão'}
                        </button>
                    </div>
                </div>
            </div>`;
        controller.openModal(dados.id ? 'Editar Questão' : 'Nova Questão', html);
        setTimeout(() => {
            if (window.anexarPreviewLatex) {
                window.anexarPreviewLatex('q-enunciado', 'preview-q-enunciado');
            }
            if (dados.tipo === 'multipla') provasView.gerarInputsAlternativas(dados.alternativas, dados.correta);
            else provasView.mudarTipoQuestao();
        }, 50);
    },
    async carregarArquivoQuestao(input) {
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        const nomeEl = document.getElementById('q-nome-arquivo');
        const badgeEl = document.getElementById('q-badge-contexto');

        try {
            if (nomeEl) nomeEl.innerText = `Lendo ${file.name}...`;
            const texto = await lerArquivoTexto(file);
            this.contextoQuestaoArquivo = texto;

            if (nomeEl) nomeEl.innerText = `📄 ${file.name} (${texto.length} carac.)`;
            if (badgeEl) {
                badgeEl.innerText = `✅ Carregado`;
                badgeEl.style.color = '#059669';
            }
            Toast.show(`Arquivo "${file.name}" carregado!`, 'success');
        } catch (e) {
            console.error(e);
            if (nomeEl) nomeEl.innerText = 'Erro no arquivo';
            Toast.show('Não foi possível ler o arquivo anexado.', 'error');
        }
    },
    async gerarComIA() {
        const materia = document.getElementById('q-materia').value;
        const codBncc = document.getElementById('q-bncc-cod').value;
        const descBncc = document.getElementById('q-bncc-desc').value;
        const dificuldade = document.getElementById('q-dificuldade').value;
        const tipo = document.getElementById('q-tipo').value;
        const idExistente = document.getElementById('q-id')?.value;
        const enunciadoAtual = document.getElementById('q-enunciado')?.value;
        const textoNotebookLM = document.getElementById('q-notebooklm-texto')?.value.trim() || '';
        const contextoFinal = (this.contextoQuestaoArquivo ? `${this.contextoQuestaoArquivo}\n\n` : '') + textoNotebookLM;

        if (idExistente || (enunciadoAtual && enunciadoAtual.length > 20)) {
            if (!confirm("Isso substituirá o conteúdo atual pela resposta da IA. Deseja continuar?")) {
                return;
            }
        }
        if (!materia || !codBncc) {
            return Toast.show("Selecione a disciplina e a BNCC primeiro!", "warning");
        }
        const loading = document.getElementById('ai-loading');
        loading.classList.remove('hidden');
        try {
            const questaoGerada = await aiService.gerarQuestao({
                materia,
                habilidade: { codigo: codBncc, descricao: descBncc },
                dificuldade,
                tipo,
                contextoDocumento: contextoFinal
            });
            document.getElementById('q-enunciado').value = questaoGerada.enunciado;
            if (tipo === 'multipla') {
                const alts = questaoGerada.alternativas || ["A", "B", "C", "D"];
                document.getElementById('q-qtd-alt').value = alts.length;
                this.gerarInputsAlternativas(alts, questaoGerada.correta);
            } else {
                document.getElementById('q-gabarito').value = questaoGerada.gabarito;
            }
            Toast.show("Questão gerada com sucesso!", "success");
        } catch (err) {
            Toast.show(err.message, "error");
        } finally {
            loading.classList.add('hidden');
        }
    },
    clonarQuestaoParaProfessor(questaoOriginal) {
        const novaQuestao = JSON.parse(JSON.stringify(questaoOriginal));
        delete novaQuestao.id;
        delete novaQuestao.preDefinida;
        this.openAddQuestao(novaQuestao);
        Toast.show("Cópia pronta para edição!", "info");
    },
    preservarEstadoEBuscarBNCC() {
        const dadosAtuais = this.getDataModal();
        this.tempDados = dadosAtuais;
        controller.openSeletorBnccQuestao();
    },
    mudarTipoQuestao() {
        const tipo = document.getElementById('q-tipo').value;
        const containerQtd = document.getElementById('container-qtd-alt');
        const areaAlt = document.getElementById('area-alternativas');
        const areaGab = document.getElementById('area-gabarito');
        if (tipo === 'multipla') {
            containerQtd?.classList.remove('hidden');
            areaAlt?.classList.remove('hidden');
            areaGab?.classList.add('hidden');
            if (!document.getElementById('inputs-alternativas').innerHTML) this.gerarInputsAlternativas();
        } else {
            containerQtd?.classList.add('hidden');
            areaAlt?.classList.add('hidden');
            areaGab?.classList.remove('hidden');
        }
    },
    gerarInputsAlternativas(valores = null, correta = null) {
        const qtdEl = document.getElementById('q-qtd-alt');
        if (!qtdEl) return;
        const qtd = parseInt(qtdEl.value);
        const container = document.getElementById('inputs-alternativas');
        const letras = ['A', 'B', 'C', 'D', 'E'];
        let html = '';
        for (let i = 0; i < qtd; i++) {
            const valor = (valores && valores[i]) ? valores[i] : '';
            const isChecked = (correta != null && correta == i) ? 'checked' : '';
            html += `
                <div style="display: flex; flex-direction: column; gap: 0.25rem; padding: 0.375rem; border-radius: var(--radius-lg); transition: background-color var(--transition-fast);" onmouseover="this.style.backgroundColor='var(--color-slate-50)'" onmouseout="this.style.backgroundColor='transparent'">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <input type="radio" name="correta" value="${i}" ${isChecked} style="width: 1rem; height: 1rem; cursor: pointer; accent-color: var(--color-primary);">
                        <span style="width: 1.5rem; height: 1.5rem; border-radius: 50%; background-color: var(--color-slate-100); color: var(--color-slate-500); font-weight: 700; font-size: 0.625rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${letras[i]}</span>
                        <input type="text" id="alt-${i}" value="${window.escapeHTML(valor)}" placeholder="Alternativa ${letras[i]} (suporta LaTeX $...$)" class="input-default" style="flex: 1; border: 1px solid var(--color-slate-200); padding: 0.5rem; border-radius: var(--radius-lg); font-size: 0.875rem; outline: none;">
                    </div>
                    <div id="preview-alt-${i}" style="display: none; margin-left: 2.25rem;"></div>
                </div>`;
        }
        container.innerHTML = html;

        setTimeout(() => {
            if (window.anexarPreviewLatex) {
                for (let i = 0; i < qtd; i++) {
                    window.anexarPreviewLatex(`alt-${i}`, `preview-alt-${i}`);
                }
            }
        }, 30);
    },

    getDataModal() {
        const diffElement = document.getElementById('q-dificuldade');
        const diffValor = diffElement ? diffElement.value : 0;
        const idField = document.getElementById('q-id');
        const idValue = idField && idField.value.trim() !== "" ? idField.value : null;
        const dados = {
            id: idValue,
            createdAt: document.getElementById('q-created-at')?.value || null,
            materia: document.getElementById('q-materia')?.value,
            ano: document.getElementById('q-ano')?.value,
            escola: document.getElementById('q-escola')?.value?.trim() || null,
            bimestre: document.getElementById('q-bimestre')?.value || null,
            enunciado: document.getElementById('q-enunciado')?.value,
            tipo: document.getElementById('q-tipo')?.value,
            dificuldade: parseInt(diffValor) || 0,
            bncc: document.getElementById('q-bncc-cod')?.value ? {
                codigo: document.getElementById('q-bncc-cod').value,
                descricao: document.getElementById('q-bncc-desc').value
            } : null
        };
        if (dados.tipo === 'multipla') {
            const qtdEl = document.getElementById('q-qtd-alt');
            if (qtdEl) {
                const qtd = parseInt(qtdEl.value);
                dados.alternativas = Array.from({ length: qtd }, (_, i) => document.getElementById(`alt-${i}`)?.value || '');
                const radio = document.querySelector('input[name="correta"]:checked');
                dados.correta = radio ? parseInt(radio.value) : null;
            }
        } else {
            dados.gabarito = document.getElementById('q-gabarito')?.value || '';
        }
        return dados;
    },
    salvarQuestao() {
        const dados = this.getDataModal();
        if (!dados.enunciado) return Toast.show("O enunciado é obrigatório.", "error");
        model.saveQuestao(dados);
        controller.closeModal();
        this.render('view-container');
    },
    excluirQuestao(id) {
        if (window.controller && typeof window.controller.confirmarAcao === 'function') {
            window.controller.confirmarAcao(
                "Excluir Questão",
                "Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita.",
                () => {
                    model.deleteQuestao(id);
                    this.selecionadas.delete(String(id));
                    this.render('view-container');
                    Toast.show("Questão excluída com sucesso.", "info");
                }
            );
        } else {
            model.deleteQuestao(id);
            this.selecionadas.delete(String(id));
            this.render('view-container');
            Toast.show("Questão excluída com sucesso.", "info");
        }
    },
    toggleSelecao(id) {
        const idStr = String(id);
        if (this.selecionadas.has(idStr)) { this.selecionadas.delete(idStr); }
        else { this.selecionadas.add(idStr); }
        this.render('view-container');
    },
    limparSelecao() {
        if (!this.selecionadas || this.selecionadas.size === 0) return;
        if (window.controller && typeof window.controller.confirmarAcao === 'function') {
            window.controller.confirmarAcao(
                "Limpar Seleção",
                "Deseja remover todas as questões selecionadas da lista da prova?",
                () => {
                    this.selecionadas.clear();
                    this.render('view-container');
                    Toast.show("Seleção de questões limpa com sucesso.", "info");
                }
            );
        } else {
            this.selecionadas.clear();
            this.render('view-container');
            Toast.show("Seleção de questões limpa com sucesso.", "info");
        }
    },
    estadoVazio() {
        return `<div class="p-10 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">Nenhuma questão encontrada para este filtro.</div>`;
    },
    abrirOpcoesImpressao() {
        const html = `
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                <div style="text-align: center;">
                    <h3 style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-800); margin: 0 0 0.25rem 0;">Configurações de Impressão da Prova</h3>
                    <p style="font-size: 0.8125rem; color: var(--color-slate-500); margin: 0;">Selecione o formato para sala de aula, simulado ou arquivo do professor:</p>
                </div>

                <!-- 1. PERFIL DA VERSÃO -->
                <div>
                    <label class="form-label" style="font-weight: 800; color: #334155; margin-bottom: 0.5rem;">1. Versão do Documento</label>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem;">
                        <label id="lbl-prova-aluno" class="card interactive-element" style="padding: 0.75rem; border: 2px solid #3b82f6; background-color: #eff6ff; cursor: pointer; display: flex; align-items: center; gap: 0.75rem;">
                            <input type="radio" name="prova-print-tipo" value="aluno" checked onchange="provasView.atualizarSelecaoPrintTipo(this.value)">
                            <div>
                                <strong style="font-size: 0.875rem; color: #1d4ed8; display: block;"><i class="fas fa-user-graduate"></i> Padrão Aluno</strong>
                                <span style="font-size: 0.6875rem; color: #64748b;">Sem gabarito.</span>
                            </div>
                        </label>

                        <label id="lbl-prova-professor" class="card interactive-element" style="padding: 0.75rem; border: 2px solid #e2e8f0; background-color: #ffffff; cursor: pointer; display: flex; align-items: center; gap: 0.75rem;">
                            <input type="radio" name="prova-print-tipo" value="professor" onchange="provasView.atualizarSelecaoPrintTipo(this.value)">
                            <div>
                                <strong style="font-size: 0.875rem; color: #15803d; display: block;"><i class="fas fa-chalkboard-teacher"></i> Guia Professor</strong>
                                <span style="font-size: 0.6875rem; color: #64748b;">Gabarito comentado.</span>
                            </div>
                        </label>

                        <label id="lbl-prova-acessivel" class="card interactive-element" style="padding: 0.75rem; border: 2px solid #e2e8f0; background-color: #ffffff; cursor: pointer; display: flex; align-items: center; gap: 0.75rem;">
                            <input type="radio" name="prova-print-tipo" value="acessivel" onchange="provasView.atualizarSelecaoPrintTipo(this.value)">
                            <div>
                                <strong style="font-size: 0.875rem; color: #c2410c; display: block;"><i class="fas fa-universal-access"></i> Acessível (AEE)</strong>
                                <span style="font-size: 0.6875rem; color: #64748b;">Fonte ampliada e alto contraste.</span>
                            </div>
                        </label>
                    </div>
                </div>

                <!-- 2. DIAGRAMAÇÃO & COLUNAS -->
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-xl); padding: 1rem; display: flex; flex-direction: column; gap: 0.875rem;">
                    <h4 style="font-size: 0.8125rem; font-weight: 800; color: #475569; margin: 0; text-transform: uppercase;">2. Diagramação & Economia de Folhas</h4>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem;">
                        <div>
                            <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Distribuição de Colunas</label>
                            <select id="prova-print-colunas" class="form-select" style="font-size: 0.8125rem;">
                                <option value="1">1 Coluna (Padrão)</option>
                                <option value="2" selected>2 Colunas (Estilo ENEM / Vestibular)</option>
                            </select>
                        </div>

                        <div>
                            <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Tamanho da Tipografia</label>
                            <select id="prova-print-fonte" class="form-select" style="font-size: 0.8125rem;">
                                <option value="compacto">Compacto (10pt - Mais economia)</option>
                                <option value="normal" selected>Normal (11.5pt - Padrão)</option>
                                <option value="amplo">Ampliado (13.5pt - Legibilidade)</option>
                            </select>
                        </div>

                        <div>
                            <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Espaçamento & Entrelinhas</label>
                            <select id="prova-print-espacamento" class="form-select" style="font-size: 0.8125rem;">
                                <option value="padrao_4_2" selected>Simples (4pt antes / 2pt depois - Padrão)</option>
                                <option value="maxima_1_1">Máxima Compactação (Linha 1.0, 1pt antes / 1pt depois)</option>
                                <option value="compacto_2_1">Compacto Equilibrado (Linha 1.15, 2pt antes / 1pt depois)</option>
                                <option value="confortavel_6_4">Confortável (Linha 1.5, 6pt antes / 4pt depois)</option>
                            </select>
                        </div>

                        <div>
                            <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Gabarito Comentado</label>
                            <select id="prova-print-gabarito-posicao" class="form-select" style="font-size: 0.8125rem;">
                                <option value="junto" selected>Ao final da prova</option>
                                <option value="separado">Em folha separada (Destacar)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; margin-top: 0.25rem;">
                    <button type="button" onclick="provasView.abrirPreviaImpressao()" class="btn-secondary interactive-element" style="display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 700; border-color: #cbd5e1; color: #334155;">
                        <i class="fas fa-eye"></i> Ver Prévia A4
                    </button>
                    <div style="display: flex; gap: 0.75rem;">
                        <button type="button" onclick="controller.closeModal()" class="btn-secondary">Cancelar</button>
                        <button type="button" onclick="provasView.dispararImpressaoCustomizada()" class="btn-primary interactive-element" style="background-color: #4f46e5; padding: 0.6rem 1.5rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-print"></i> Abrir Impressão / PDF
                        </button>
                    </div>
                </div>
            </div>`;
        controller.openModal('Impressão da Prova', html);
    },

    atualizarSelecaoPrintTipo(tipo) {
        const lblAluno = document.getElementById('lbl-prova-aluno');
        const lblProf = document.getElementById('lbl-prova-professor');
        const lblAcess = document.getElementById('lbl-prova-acessivel');
        const map = { aluno: lblAluno, professor: lblProf, acessivel: lblAcess };
        ['aluno', 'professor', 'acessivel'].forEach(t => {
            if (map[t]) {
                if (t === tipo) {
                    map[t].style.borderColor = t === 'aluno' ? '#3b82f6' : (t === 'professor' ? '#16a34a' : '#ea580c');
                    map[t].style.backgroundColor = t === 'aluno' ? '#eff6ff' : (t === 'professor' ? '#f0fdf4' : '#fff7ed');
                } else {
                    map[t].style.borderColor = '#e2e8f0';
                    map[t].style.backgroundColor = '#ffffff';
                }
            }
        });
    },

    obterConfiguracoesImpressaoModal() {
        const tipo = document.querySelector('input[name="prova-print-tipo"]:checked')?.value || 'aluno';
        const colunas = parseInt(document.getElementById('prova-print-colunas')?.value || '2', 10);
        const tamanhoFonte = document.getElementById('prova-print-fonte')?.value || 'normal';
        const espacamento = document.getElementById('prova-print-espacamento')?.value || 'padrao_4_2';
        const gabaritoSeparado = document.getElementById('prova-print-gabarito-posicao')?.value === 'separado';

        return {
            tipo,
            colunas,
            tamanhoFonte,
            espacamento,
            gabaritoSeparado
        };
    },

    dispararImpressaoCustomizada() {
        const config = this.obterConfiguracoesImpressaoModal();
        controller.closeModal();
        this.imprimirProva(config);
    },

    abrirPreviaImpressao() {
        const config = this.obterConfiguracoesImpressaoModal();
        const htmlDoc = this.montarHTMLDocumentoImpressao(config, false);
        if (!htmlDoc) return;

        const modalHtml = `
            <div style="display: flex; flex-direction: column; gap: 1rem; height: 82vh;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.75rem;">
                    <div>
                        <h3 style="font-size: 1.125rem; font-weight: 800; color: #1e293b; margin: 0;">Prévia da Avaliação (A4)</h3>
                        <p style="font-size: 0.75rem; color: #64748b; margin: 0;">Visualização em tempo real das questões e diagramação.</p>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" onclick="provasView.imprimirProva(provasView.tempPreviaConfig)" class="btn-primary interactive-element" style="background-color: #4f46e5; font-size: 0.8125rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1.25rem;">
                            <i class="fas fa-print"></i> Imprimir / Gerar PDF
                        </button>
                        <button type="button" onclick="provasView.abrirOpcoesImpressao()" class="btn-secondary" style="font-size: 0.8125rem; font-weight: 700;">
                            <i class="fas fa-sliders-h"></i> Ajustar Opções
                        </button>
                    </div>
                </div>

                <div style="flex: 1; background: #e2e8f0; border-radius: 0.75rem; overflow: auto; display: flex; justify-content: center; padding: 1.25rem;">
                    <div style="width: 100%; max-width: 820px; min-height: 100%; background: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border-radius: 4px; overflow: hidden; display: flex; flex-direction: column;">
                        <iframe id="iframe-previa-prova" style="width: 100%; height: 100%; min-height: 68vh; border: none; flex: 1;"></iframe>
                    </div>
                </div>
            </div>
        `;

        this.tempPreviaConfig = config;
        controller.openModal('Prévia da Prova', modalHtml);

        setTimeout(() => {
            const iframe = document.getElementById('iframe-previa-prova');
            if (iframe) {
                const doc = iframe.contentWindow.document;
                doc.open();
                doc.write(htmlDoc);
                doc.close();
            }
        }, 60);
    },

    montarHTMLDocumentoImpressao(configOuTipo = 'aluno', forPrint = true) {
        if (this.selecionadas.size === 0) {
            Toast.show("Nenhuma questão selecionada!", "warning");
            return null;
        }
        const bancoTotal = [
            ...(model.state.questoesSistema || []),
            ...(model.state.questoes || []),
            ...(model.state.questoesEnem || [])
        ];
        const selecionadas = bancoTotal.filter(q => this.selecionadas.has(String(q.id)));
        if (selecionadas.length === 0) { 
            Toast.show("Erro ao recuperar questões selecionadas.", "error"); 
            return null; 
        }

        const opts = typeof configOuTipo === 'string'
            ? { tipo: configOuTipo, colunas: 1, tamanhoFonte: 'normal', espacamento: 'padrao_4_2', gabaritoSeparado: false }
            : configOuTipo;

        const isProf = opts.tipo === 'professor';
        const isAcessivel = opts.tipo === 'acessivel';
        const colunas = opts.colunas || 1;
        const gabaritoSeparado = opts.gabaritoSeparado || false;
        const espacamento = opts.espacamento || 'padrao_4_2';

        let fontSizeStr = '11.5pt';
        if (opts.tamanhoFonte === 'compacto') fontSizeStr = '10pt';
        if (opts.tamanhoFonte === 'amplo' || isAcessivel) fontSizeStr = '13.5pt';

        let tblFontSize = '9.5pt';
        if (opts.tamanhoFonte === 'compacto') tblFontSize = '8.5pt';
        else if (opts.tamanhoFonte === 'amplo') tblFontSize = '11pt';
        else if (isAcessivel) tblFontSize = '12pt';

        let numSize = isAcessivel ? '16px' : (opts.tamanhoFonte === 'compacto' ? '12px' : opts.tamanhoFonte === 'amplo' ? '15px' : '13.5px');

        // Definição precisa de entrelinhas e espaçamento antes e depois
        let lineHeight = '1.2';
        let marginAntes = '4pt';
        let marginDepois = '2pt';
        let altMarginDepois = '2pt';

        if (espacamento === 'maxima_1_1') {
            lineHeight = '1.05';
            marginAntes = '1pt';
            marginDepois = '1pt';
            altMarginDepois = '1pt';
        } else if (espacamento === 'compacto_2_1') {
            lineHeight = '1.15';
            marginAntes = '2pt';
            marginDepois = '1pt';
            altMarginDepois = '1.5pt';
        } else if (espacamento === 'confortavel_6_4' || isAcessivel) {
            lineHeight = isAcessivel ? '1.75' : '1.5';
            marginAntes = isAcessivel ? '8pt' : '6pt';
            marginDepois = isAcessivel ? '6pt' : '4pt';
            altMarginDepois = isAcessivel ? '6pt' : '4pt';
        }

        let nomeProf = model.state.userConfig.profName || '__________________________';
        if ((!model.state.userConfig.profName || model.state.userConfig.profName.trim() === "") && model.currentUser) {
            nomeProf = model.currentUser.displayName;
        }
        const logoUrl = model.state.userConfig.logo || '';

        const questoesHtml = selecionadas.map((q, i) => {
            const letras = ['a', 'b', 'c', 'd', 'e'];
            let conteudoResposta = '';
            if (q.tipo === 'multipla' && q.alternativas) {
                conteudoResposta = `
                    <div style="margin-top: ${marginAntes};">
                        ${q.alternativas.map((alt, idx) => {
                    const styleCorrect = (isProf && q.correta == idx)
                        ? 'font-weight: bold; color: #059669; background-color: #ecfdf5; border-radius: 4px;'
                        : '';
                    const iconCheck = (isProf && q.correta == idx) ? ' ✓' : '';
                    return `
                                <div class="alternativa" style="${styleCorrect}">
                                    <span class="alt-letra">( &nbsp; ) <strong>${letras[idx]}</strong></span> 
                                    <span>${this.formatarHTMLQuestao(alt)} ${iconCheck}</span>
                                </div>
                            `;
                }).join('')}
                    </div>
                `;
            } else {
                conteudoResposta = `
                    <div style="margin-top: ${marginAntes};">
                        <div class="resposta-area"></div>
                        <div class="resposta-area"></div>
                        <div class="resposta-area"></div>
                        ${isProf && q.gabarito ? `
                            <div style="margin-top: ${marginAntes}; padding: 8px 10px; background-color: #f0fdf4; border: 1px dashed #16a34a; border-radius: 6px; font-size: ${opts.tamanhoFonte === 'compacto' ? '9.5px' : '11px'}; color: #15803d; white-space: pre-line;">
                                <strong>Gabarito Esperado:</strong><br>
                                ${this.formatarHTMLQuestao(q.gabarito)}
                            </div>
                        ` : ''}
                    </div>
                `;
            }
            return `
                <div class="questao ${isAcessivel ? 'questao-acessivel' : ''}">
                    ${q.bncc ? `<div class="questao-info no-print">Habilidade: ${window.escapeHTML(q.bncc.codigo)}</div>` : ''}
                    <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
                        <span class="questao-numero" style="flex-shrink: 0; line-height: ${lineHeight}; font-size: ${numSize};">${i + 1})</span>
                        <div class="questao-texto" style="flex: 1; min-width: 0;">${this.formatarHTMLQuestao(q.enunciado)}</div>
                    </div>
                    ${conteudoResposta}
                </div>
            `;
        }).join('');

        const tituloDoc = isProf ? 'GABARITO - Avaliação' : isAcessivel ? 'Avaliação Adaptada (AEE / Acessível)' : 'Avaliação de Aprendizagem';

        const estiloImpressao = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=Roboto:wght@400;700&display=swap');
                * { box-sizing: border-box; }
                body { 
                    font-family: ${isAcessivel ? "'Atkinson Hyperlegible', 'Arial', sans-serif" : "'Roboto', sans-serif"}; 
                    padding: ${forPrint ? '30px 40px' : '20px 25px'}; 
                    color: #000; 
                    font-size: ${fontSizeStr};
                    line-height: ${lineHeight};
                    letter-spacing: ${isAcessivel ? '0.03em' : 'normal'};
                    background-color: #ffffff;
                }
                
                .header { 
                    display: flex; 
                    align-items: center; 
                    justify-content: space-between; 
                    border: ${isAcessivel ? '2px solid #000' : '1px solid #000'}; 
                    padding: 10px 14px; 
                    margin-bottom: ${marginDepois}; 
                    border-radius: 6px; 
                }
                .header-info { flex: 1; min-width: 0; }
                .header-info p { margin: 2pt 0; font-size: ${isAcessivel ? '14px' : '12px'}; font-weight: 500; line-height: 1.2; }
                .header-logo { max-width: 75px; max-height: 75px; object-fit: contain; margin-left: 16px; flex-shrink: 0; }
                
                .titulo-prova { text-align: center; text-transform: uppercase; font-weight: 800; font-size: ${isAcessivel ? '18px' : '15px'}; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 4px; }
                
                .container-questoes-prova {
                    font-size: ${fontSizeStr};
                    line-height: ${lineHeight};
                    ${colunas === 2 ? `
                        column-count: 2;
                        column-gap: 24px;
                        column-rule: 1px solid #cbd5e1;
                        text-align: justify;
                    ` : ''}
                }

                .questao { 
                    margin-top: ${marginAntes};
                    margin-bottom: ${marginDepois}; 
                    break-inside: avoid !important; 
                    page-break-inside: avoid !important; 
                }
                .questao-acessivel { 
                    background: #fbfcfe; 
                    border: 1.5px solid #cbd5e1; 
                    border-left: 6px solid #2563eb; 
                    padding: 12px 16px; 
                    border-radius: 8px; 
                    margin-top: ${marginAntes};
                    margin-bottom: ${marginDepois}; 
                }
                
                .questao-info { font-size: 9.5px; color: #666; margin-bottom: 2pt; text-transform: uppercase; font-weight: bold; }
                .questao-numero { font-weight: 800; font-size: ${numSize}; margin-right: 4px; color: ${isAcessivel ? '#1d4ed8' : '#000'}; }
                .questao-texto { 
                    font-size: ${fontSizeStr}; 
                    line-height: ${lineHeight}; 
                    text-align: left; 
                    margin-top: 0; 
                    margin-bottom: ${marginDepois}; 
                }
                .questao-texto p, .questao-texto div, .questao-texto span {
                    font-size: inherit;
                    line-height: inherit;
                }
                
                /* FORMATAÇÃO E ISOLAMENTO ESTREITO DE TABELAS */
                table, .planner-table-wrapper, .bloco-rubrica-avaliacao, .bloco-jogo-jeopardy {
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                }

                table {
                    width: 100% !important;
                    max-width: 100% !important;
                    border-collapse: collapse;
                    margin: 6px 0;
                    box-sizing: border-box !important;
                    table-layout: auto;
                    font-size: ${tblFontSize};
                    line-height: 1.25;
                }

                th, td {
                    border: 1px solid #000000;
                    padding: 3px 6px;
                    text-align: left;
                    vertical-align: middle;
                    box-sizing: border-box;
                    word-break: normal;
                    overflow-wrap: anywhere;
                }

                th {
                    background-color: #f1f5f9;
                    font-weight: bold;
                    color: #000000;
                }

                /* Estilos Visuais Específicos para Provas */
                .planner-table-zebra tbody tr:nth-child(even) { background-color: #f8fafc; }
                .planner-table-horizontal th, .planner-table-horizontal td { border: none; border-top: 1px solid #000; border-bottom: 1px solid #000; }
                .planner-table-horizontal thead tr th { border-top: 2px solid #000; border-bottom: 2px solid #000; background: transparent; }
                .planner-table-horizontal tbody tr:last-child td { border-bottom: 2px solid #000; }
                .planner-table-clean th, .planner-table-clean td { border: none; border-bottom: 1px solid #cbd5e1; }
                .planner-table-clean thead th { border-bottom: 2px solid #000; background: transparent; }
                
                .resposta-area { border-bottom: 1px solid #94a3b8; height: 20px; width: 100%; display: block; margin-top: 4px; }
                .alternativa { 
                    margin-top: 1pt;
                    margin-bottom: ${altMarginDepois}; 
                    font-size: ${fontSizeStr}; 
                    line-height: ${lineHeight};
                    display: flex; 
                    align-items: baseline; 
                    gap: 6px; 
                    padding: ${isAcessivel ? '3px 5px' : '1px 0'};
                }
                .alternativa span {
                    font-size: inherit;
                    line-height: inherit;
                }
                .alt-letra { font-family: monospace; font-size: ${fontSizeStr}; font-weight: bold; }

                .btn-voltar {
                    position: fixed; top: 20px; right: 20px;
                    background-color: #ef4444; color: white; padding: 12px 20px;
                    border: none; border-radius: 50px; font-weight: bold; cursor: pointer;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 9999;
                    display: flex; align-items: center; gap: 8px;
                    font-family: sans-serif; text-transform: uppercase; font-size: 12px;
                }
                .btn-voltar:hover { background-color: #dc2626; }
                @media print {
                    .no-print, .btn-voltar { display: none !important; }
                    body { padding: 0; background: transparent; }
                    .questao-acessivel { background: transparent !important; border: 1px solid #000 !important; border-left: 4px solid #000 !important; }
                }
            </style>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"><\/script>
            <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"><\/script>
        `;
        const conteudoFinal = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="utf-8">
                <title>Impressão - ${tituloDoc}</title>
                ${estiloImpressao}
            </head>
            <body>
                ${forPrint ? `
                    <button onclick="window.close()" class="btn-voltar">
                        <i class="fas fa-arrow-left"></i> Voltar para o App
                    </button>
                ` : ''}
                <div class="header">
                    <div class="header-info">
                        <p style="margin: 0 0 6px 0;"><strong>ESCOLA:</strong> ${window.escapeHTML(model.state.userConfig.schoolName || '________________________________________________')}</p>
                        <div style="display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px 12px; margin-bottom: 6px; font-size: ${isAcessivel ? '13.5px' : '12px'};">
                            <span><strong>PROFESSOR(A):</strong> ${window.escapeHTML(nomeProf)}</span>
                            <span style="white-space: nowrap;"><strong>DATA:</strong> ____/____/2026</span>
                            <span style="white-space: nowrap;"><strong>TURMA:</strong> <span style="display: inline-block; width: 50px; border-bottom: 1px solid #000; margin-left: 4px;"></span></span>
                            <span style="white-space: nowrap;"><strong>NOTA:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                        </div>
                        ${!isProf ? `
                            <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: ${isAcessivel ? '13.5px' : '12px'};">
                                <span style="flex: 1; display: flex; align-items: baseline;"><strong>ALUNO(A):</strong> <span style="flex: 1; border-bottom: 1px solid #000; margin-left: 6px;"></span></span>
                            </div>
                        ` : ''}
                    </div>
                    ${logoUrl ? `<img src="${logoUrl}" class="header-logo" alt="Logo da Instituição" />` : ''}
                </div>
                <div class="titulo-prova">${tituloDoc}</div>
                <div id="conteudo-prova" class="container-questoes-prova">${questoesHtml}</div>
                <script>
                    let impresso = false;
                    function iniciarImpressao() {
                        if (typeof renderMathInElement === 'function') {
                            try {
                                renderMathInElement(document.body, {
                                    delimiters: [
                                        { left: '$$', right: '$$', display: true },
                                        { left: '\\\\[', right: '\\\\]', display: true },
                                        { left: '\\\\(', right: '\\\\)', display: false },
                                        { left: '$', right: '$', display: false }
                                    ],
                                    throwOnError: false
                                });
                            } catch (e) { console.warn(e); }
                        }
                        ${forPrint ? `
                            if (!impresso) {
                                impresso = true;
                                setTimeout(() => window.print(), 250);
                            }
                        ` : ''}
                    }
                    if (document.readyState === 'complete') {
                        iniciarImpressao();
                    } else {
                        window.addEventListener('load', iniciarImpressao);
                    }
                <\/script>
            </body>
            </html>
        `;
        return conteudoFinal;
    },

    imprimirProva(configOuTipo = 'aluno') {
        const conteudoFinal = this.montarHTMLDocumentoImpressao(configOuTipo, true);
        if (!conteudoFinal) return;

        const win = window.open('', '_blank');
        if (win) {
            const safeHtml = window.sanitizeComLatex ? window.sanitizeComLatex(conteudoFinal) : conteudoFinal;
            win.document.open();
            win.document.write(safeHtml);
            win.document.close();
        }
    }
};

if (typeof window !== 'undefined') {
    window.provasView = provasView;
}

