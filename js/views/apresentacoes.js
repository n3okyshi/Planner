import { model } from '../model.js';
import { apresentacaoController } from '../controllers/apresentacaoController.js';
import { escapeHTML, generateId, lerArquivoTexto } from '../utils.js';
import { Toast } from '../components/toast.js';

/**
 * View Principal para Gestão, Criação e Edição de Apresentações Animadas
 * Padrão MVC Vanilla JS - Integrada ao Design System e Firebase
 */
export const apresentacoesView = {
    selectedApresId: null,
    editingSlideIndex: 0,
    activeTab: 'todas', // 'todas' | 'nativo' | 'pptx' | 'ia'
    selectedTema: '',
    selectedDisciplina: '',
    selectedQtd: 5,
    selectedBnccSkill: null,
    selectedFileContext: '',
    selectedFileName: '',

    setTab(tab) {
        this.activeTab = tab;
        this.render('view-container');
    },

    async render(container) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        if (!container) return;

        const apresList = model.state.apresentacoes || [];

        // Filtro de abas
        const filtradas = apresList.filter(a => {
            if (this.activeTab === 'todas') return true;
            return a.modoOrigem === this.activeTab;
        });

        container.innerHTML = `
            <div class="view-shell fade-in">
                <!-- CABEÇALHO DA VIEW -->
                <header class="view-header" style="background-color: var(--color-slate-900); color: var(--color-white); padding: var(--spacing-6); border-radius: var(--radius-2xl); border: 1px solid var(--color-slate-800);">
                    <div>
                        <div style="display: flex; align-items: center; gap: var(--spacing-3); margin-bottom: var(--spacing-1);">
                            <span style="padding: var(--spacing-2); background: rgba(99, 102, 241, 0.2); color: #818cf8; border-radius: var(--radius-lg);">
                                <i class="fas fa-desktop" style="font-size: 1.25rem;"></i>
                            </span>
                            <h2 class="view-header__title" style="color: var(--color-white); font-size: 1.5rem;">Apresentações Animadas</h2>
                        </div>
                        <p class="view-header__subtitle" style="color: var(--color-slate-400);">
                            Crie slides nativos interativos, gere apresentações pedagógicas com IA ou importe arquivos PowerPoint (.pptx).
                        </p>
                    </div>

                    <!-- BOTÕES DE AÇÃO DO HEADER -->
                    <div style="display: flex; align-items: center; gap: var(--spacing-3); flex-wrap: wrap; margin-top: var(--spacing-4);">
                        <button type="button" id="btn-nova-apres" class="btn-primary" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border: none;">
                            <i class="fas fa-plus"></i> <span>Nova Apresentação</span>
                        </button>

                        <button type="button" id="btn-abrir-ia-modal" class="btn-secondary" style="background: rgba(147, 51, 234, 0.15); color: #c084fc; border: 1px solid rgba(147, 51, 234, 0.3);">
                            <i class="fas fa-wand-magic-sparkles"></i> <span>Gerar com IA</span>
                        </button>

                        <button type="button" id="btn-importar-pptx" class="btn-secondary" style="background: rgba(234, 88, 12, 0.15); color: #fb923c; border: 1px solid rgba(234, 88, 12, 0.3);">
                            <i class="fas fa-file-powerpoint"></i> <span>Importar PPTX</span>
                        </button>

                        <input type="file" id="input-pptx-file" accept=".pptx" style="display: none;">
                    </div>
                </header>

                <!-- BARRA DE ABAS DE FILTRO -->
                <div style="display: flex; align-items: center; gap: var(--spacing-2); margin-top: var(--spacing-6); border-bottom: 1px solid var(--color-slate-200); padding-bottom: var(--spacing-2); flex-wrap: wrap;">
                    <button type="button" class="btn-secondary ${this.activeTab === 'todas' ? 'btn-primary' : ''}" onclick="apresentacoesView.setTab('todas')" style="padding: 0.4rem 0.85rem; font-size: 0.8125rem;">Todas (${apresList.length})</button>
                    <button type="button" class="btn-secondary ${this.activeTab === 'nativo' ? 'btn-primary' : ''}" onclick="apresentacoesView.setTab('nativo')" style="padding: 0.4rem 0.85rem; font-size: 0.8125rem;">Nativas</button>
                    <button type="button" class="btn-secondary ${this.activeTab === 'ia' ? 'btn-primary' : ''}" onclick="apresentacoesView.setTab('ia')" style="padding: 0.4rem 0.85rem; font-size: 0.8125rem;">✨ IA</button>
                    <button type="button" class="btn-secondary ${this.activeTab === 'pptx' ? 'btn-primary' : ''}" onclick="apresentacoesView.setTab('pptx')" style="padding: 0.4rem 0.85rem; font-size: 0.8125rem;">📄 PowerPoint (.pptx)</button>
                </div>

                <!-- MAIN GRID DE APRESENTAÇÕES -->
                <div id="apres-grid-container" style="margin-top: var(--spacing-6);">
                    ${this._renderGridHTML(filtradas)}
                </div>
            </div>

            <!-- MODAL GERAR COM IA -->
            <div id="modal-ia" class="modal-overlay hidden">
                <div class="card" style="max-width: 550px; width: 100%; padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4); max-height: 90vh; overflow-y: auto;">
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--color-slate-200); padding-bottom: var(--spacing-3);">
                        <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--color-slate-900); display: flex; align-items: center; gap: 0.5rem; margin: 0;">
                            <i class="fas fa-wand-magic-sparkles" style="color: #9333ea;"></i> Gerador de Slides com IA
                        </h3>
                        <button class="close-modal" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--color-slate-400);">&times;</button>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: var(--spacing-3);">
                        <div>
                            <label for="ia-tema-input" class="form-label">Tema / Assunto da Aula *</label>
                            <input type="text" id="ia-tema-input" value="${escapeHTML(this.selectedTema || '')}" placeholder="Ex: Sistema Solar, Segunda Guerra Mundial, Equação de 2º Grau..." class="form-input" style="width: 100%;">
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-3);">
                            <div>
                                <label for="ia-disciplina-input" class="form-label">Disciplina</label>
                                <input type="text" id="ia-disciplina-input" value="${escapeHTML(this.selectedDisciplina || '')}" placeholder="Ex: História, Ciências, Matemática..." class="form-input" style="width: 100%;">
                            </div>
                            <div>
                                <label for="ia-qtd-slides" class="form-label">Quantidade de Slides</label>
                                <select id="ia-qtd-slides" class="form-select" style="width: 100%;">
                                    <option value="4" ${this.selectedQtd == 4 ? 'selected' : ''}>4 Slides (Rápida)</option>
                                    <option value="5" ${this.selectedQtd == 5 ? 'selected' : ''}>5 Slides (Padrão)</option>
                                    <option value="8" ${this.selectedQtd == 8 ? 'selected' : ''}>8 Slides (Completa)</option>
                                </select>
                            </div>
                        </div>

                        <!-- INPUT DE CONTEXTO: HABILIDADE BNCC -->
                        <div>
                            <label class="form-label" style="display: flex; align-items: center; justify-content: space-between;">
                                <span><i class="fas fa-book-open" style="color: var(--color-primary); margin-right: 0.25rem;"></i> Habilidade BNCC (Opcional)</span>
                                ${this.selectedBnccSkill ? `<button type="button" id="btn-remover-bncc-ia" style="background: none; border: none; color: #ef4444; font-size: 0.75rem; cursor: pointer;">Remover</button>` : ''}
                            </label>
                            <div id="container-bncc-selecionada" style="margin-bottom: var(--spacing-2);">
                                ${this.selectedBnccSkill ? `
                                    <div style="padding: 0.5rem 0.75rem; background-color: rgba(5, 150, 105, 0.1); border: 1px solid rgba(5, 150, 105, 0.3); border-radius: var(--radius-lg); font-size: 0.8125rem; color: #047857; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-check-circle"></i>
                                        <div>
                                            <b>${escapeHTML(this.selectedBnccSkill.codigo || this.selectedBnccSkill.code)}</b>: ${escapeHTML(this.selectedBnccSkill.descricao || this.selectedBnccSkill.nome || '').substring(0, 80)}...
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                            <button type="button" id="btn-selecionar-bncc-ia" class="btn-secondary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.8125rem;">
                                <i class="fas fa-search"></i>
                                <span>${this.selectedBnccSkill ? 'Alterar Habilidade BNCC' : 'Selecionar Habilidade da BNCC'}</span>
                            </button>
                        </div>

                        <!-- INPUT DE CONTEXTO: UPLOAD DE ARQUIVO -->
                        <div>
                            <label class="form-label">
                                <i class="fas fa-file-alt" style="color: var(--color-primary); margin-right: 0.25rem;"></i> Material do Professor / Documento Base (Opcional)
                            </label>
                            <div id="ia-file-dropzone" class="file-dropzone" style="padding: var(--spacing-4);">
                                <i class="fas fa-upload" style="font-size: 1.5rem; color: var(--color-slate-400); margin-bottom: 0.375rem;"></i>
                                <p style="font-size: 0.8125rem; font-weight: 600; color: var(--color-slate-700); margin: 0;">
                                    ${this.selectedFileName ? `📄 Arquivo carregado: <b>${escapeHTML(this.selectedFileName)}</b>` : 'Anexar PDF, TXT ou resumo de aula para guiar a IA'}
                                </p>
                                <input type="file" id="input-ia-context-file" accept=".txt,.pdf,.md,.csv" style="display: none;">
                            </div>
                        </div>
                    </div>

                    <!-- BOTÃO DE SUBMISSÃO "GERAR APRESENTAÇÃO" -->
                    <div style="display: flex; justify-content: flex-end; gap: var(--spacing-3); padding-top: var(--spacing-2); border-top: 1px solid var(--color-slate-100);">
                        <button type="button" class="close-modal btn-secondary">Cancelar</button>
                        <button type="button" id="btn-confirmar-ia" class="btn-primary" style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); border: none;">
                            <i class="fas fa-wand-magic-sparkles"></i>
                            <span>Gerar Apresentação</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        this._setupListeners(container);
    },

    /**
     * Renderiza o Grid de Apresentações com o Design System do Projeto
     */
    _renderGridHTML(apresentacoes) {
        if (apresentacoes.length === 0) {
            return `
                <div class="card" style="text-align: center; padding: 4rem 2rem; margin-top: var(--spacing-5);">
                    <div style="width: 4rem; height: 4rem; background-color: var(--color-primary-light); color: var(--color-primary); border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto; font-size: 1.75rem;">
                        <i class="fas fa-presentation-screen"></i>
                    </div>
                    <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--color-slate-900); margin: 0 0 0.5rem 0;">Nenhuma apresentação encontrada</h3>
                    <p style="font-size: 0.875rem; color: var(--color-slate-500); max-width: 450px; margin: 0 auto 1.5rem auto;">
                        Crie uma apresentação do zero, use a Inteligência Artificial para estruturar seus slides ou importe um arquivo PowerPoint (.pptx).
                    </p>
                    <button onclick="apresentacoesView.abrirNovaModal()" class="btn-primary" style="display: inline-flex; align-items: center; gap: 0.5rem; margin: 0 auto;">
                        <i class="fas fa-plus"></i> Criar Minha Primeira Apresentação
                    </button>
                </div>
            `;
        }

        return `
            <div class="apres-grid">
                ${apresentacoes.map(apres => {
                    const totalSlides = apres.slides?.length || 0;
                    const badgeOrigem = apres.modoOrigem === 'pptx' 
                        ? '<span class="apres-badge apres-badge--pptx"><i class="fas fa-file-powerpoint"></i> PPTX</span>'
                        : apres.modoOrigem === 'ia'
                        ? '<span class="apres-badge apres-badge--ia"><i class="fas fa-wand-magic-sparkles"></i> IA</span>'
                        : '<span class="apres-badge apres-badge--nativo"><i class="fas fa-layer-group"></i> Nativa</span>';

                    const dataFormatada = new Date(apres.updatedAt || apres.createdAt || Date.now()).toLocaleDateString('pt-BR');

                    return `
                        <div class="apres-card">
                            <div>
                                <div class="apres-card__header">
                                    ${badgeOrigem}
                                    <span style="font-size: 0.75rem; font-weight: 500; color: var(--color-slate-400);">
                                        ${dataFormatada}
                                    </span>
                                </div>
                                <h3 class="apres-card__title">
                                    ${escapeHTML(apres.titulo)}
                                </h3>
                                <p class="apres-card__subtitle">
                                    ${escapeHTML(apres.subtitulo || 'Sem subtítulo')}
                                </p>
                            </div>

                            <div class="apres-card__footer">
                                <div class="apres-card__meta">
                                    <span><i class="fas fa-cubes" style="color: var(--color-primary); margin-right: 0.25rem;"></i>${totalSlides} Slide(s)</span>
                                    <span><i class="fas fa-book-bookmark" style="color: var(--color-slate-400); margin-right: 0.25rem;"></i>${escapeHTML(apres.disciplina || 'Geral')}</span>
                                </div>

                                <div class="apres-card__actions">
                                    <button onclick="apresentacaoController.iniciarPlayer('${apres.id}')" class="btn-primary" style="padding: 0.5rem; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 0.375rem;">
                                        <i class="fas fa-play"></i> Apresentar
                                    </button>
                                    <button onclick="apresentacoesView.abrirEditor('${apres.id}')" class="btn-secondary" style="padding: 0.5rem; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 0.375rem;">
                                        <i class="fas fa-pen-to-square"></i> Editar
                                    </button>
                                </div>

                                <div style="display: flex; align-items: center; justify-content: flex-end; gap: var(--spacing-4); margin-top: var(--spacing-3); padding-top: var(--spacing-2); font-size: 0.75rem;">
                                    <button onclick="apresentacoesView.duplicarApres('${apres.id}')" style="background: none; border: none; color: var(--color-slate-400); cursor: pointer; display: flex; align-items: center; gap: 0.25rem;" title="Duplicar">
                                        <i class="fas fa-copy"></i> Duplicar
                                    </button>
                                    <button onclick="apresentacoesView.excluirApres('${apres.id}')" style="background: none; border: none; color: #ef4444; cursor: pointer; display: flex; align-items: center; gap: 0.25rem;" title="Excluir">
                                        <i class="fas fa-trash-can"></i> Excluir
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    /**
     * Renderiza o Editor WYSIWYG de Slides
     */
    _renderEditorHTML(apresId) {
        const apres = model.getApresentacaoById(apresId);
        if (!apres) {
            this.selectedApresId = null;
            return this._renderGridHTML(model.state.apresentacoes || []);
        }

        const currentSlide = apres.slides[this.editingSlideIndex] || apres.slides[0];

        return `
            <div style="display: flex; flex-direction: column; gap: var(--spacing-4); margin-top: var(--spacing-4);">
                <!-- BARRA SUPERIOR DO EDITOR -->
                <div class="card" style="padding: var(--spacing-4); display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: var(--spacing-3);">
                        <button onclick="apresentacoesView.fecharEditor()" class="btn-secondary" style="padding: 0.5rem 0.75rem;">
                            <i class="fas fa-arrow-left"></i> Voltar
                        </button>
                        <div>
                            <h3 style="font-weight: 700; color: var(--color-slate-900); font-size: 1rem; margin: 0;">${escapeHTML(apres.titulo)}</h3>
                            <span style="font-size: 0.75rem; color: var(--color-slate-400);">Editando Slide ${this.editingSlideIndex + 1} de ${apres.slides.length}</span>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: var(--spacing-3);">
                        <button onclick="apresentacaoController.iniciarPlayer('${apres.id}')" class="btn-primary" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem;">
                            <i class="fas fa-play"></i> Testar Apresentação
                        </button>
                    </div>
                </div>

                <!-- MAIN WORKSPACE -->
                <div class="apres-editor">
                    <!-- SIDEBAR THUMBNAILS -->
                    <div class="card" style="padding: var(--spacing-4); display: flex; flex-direction: column; gap: var(--spacing-3);">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <span style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-500); text-transform: uppercase;">Lâminas</span>
                            <button onclick="apresentacoesView.adicionarNovoSlide()" class="btn-secondary" style="padding: 0.25rem 0.625rem; font-size: 0.75rem; color: var(--color-primary);">
                                <i class="fas fa-plus"></i> Slide
                            </button>
                        </div>

                        <div class="slide-thumb-list">
                            ${apres.slides.map((s, idx) => `
                                <div onclick="apresentacoesView.selecionarSlideEdicao(${idx})" class="slide-thumb-item ${idx === this.editingSlideIndex ? 'slide-thumb-item--active' : ''}">
                                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.25rem;">
                                        <span style="color: var(--color-primary); font-weight: 700;">#${idx + 1}</span>
                                        <span style="font-size: 0.625rem; color: var(--color-slate-400); text-transform: capitalize;">${s.tipoLayout}</span>
                                    </div>
                                    <p style="font-size: 0.75rem; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(s.titulo || 'Sem Título')}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- FORMULÁRIO DO SLIDE SELECIONADO -->
                    <div class="card" style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-5);">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4);">
                            <div>
                                <label for="edit-slide-layout" class="form-label">Tipo de Layout do Slide</label>
                                <select id="edit-slide-layout" onchange="apresentacoesView.salvarCampoSlide('tipoLayout', this.value)" class="form-select" style="width: 100%;">
                                    <option value="capa" ${currentSlide.tipoLayout === 'capa' ? 'selected' : ''}>Slide de Capa</option>
                                    <option value="titulo-texto" ${currentSlide.tipoLayout === 'titulo-texto' ? 'selected' : ''}>Título e Texto</option>
                                    <option value="topicos-animados" ${currentSlide.tipoLayout === 'topicos-animados' ? 'selected' : ''}>Tópicos Animados (Revelação)</option>
                                    <option value="katex" ${currentSlide.tipoLayout === 'katex' ? 'selected' : ''}>Expressão Matemática (KaTeX)</option>
                                    <option value="quiz" ${currentSlide.tipoLayout === 'quiz' ? 'selected' : ''}>Quiz Interativo</option>
                                </select>
                            </div>

                            <div>
                                <label for="edit-slide-anim" class="form-label">Animação de Entrada</label>
                                <select id="edit-slide-anim" onchange="apresentacoesView.salvarCampoSlide('animacaoEntrada', this.value)" class="form-select" style="width: 100%;">
                                    <option value="fade-up" ${currentSlide.animacaoEntrada === 'fade-up' ? 'selected' : ''}>Fade Up (Suave)</option>
                                    <option value="zoom-in" ${currentSlide.animacaoEntrada === 'zoom-in' ? 'selected' : ''}>Zoom In</option>
                                    <option value="slide-right" ${currentSlide.animacaoEntrada === 'slide-right' ? 'selected' : ''}>Deslizar da Direita</option>
                                </select>
                            </div>
                        </div>

                        <!-- CAMPOS DE TEXTO DO SLIDE -->
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-4);">
                            <div>
                                <label for="edit-slide-titulo" class="form-label">Título do Slide</label>
                                <input type="text" id="edit-slide-titulo" value="${escapeHTML(currentSlide.titulo || '')}" onchange="apresentacoesView.salvarCampoSlide('titulo', this.value)" class="form-input" style="width: 100%; font-weight: 700;">
                            </div>

                            <div>
                                <label for="edit-slide-subtitulo" class="form-label">Subtítulo / Descrição Curta</label>
                                <input type="text" id="edit-slide-subtitulo" value="${escapeHTML(currentSlide.subtitulo || '')}" onchange="apresentacoesView.salvarCampoSlide('subtitulo', this.value)" class="form-input" style="width: 100%;">
                            </div>

                            ${currentSlide.tipoLayout === 'topicos-animados' ? `
                                <div>
                                    <label for="edit-slide-topicos" class="form-label">Tópicos para Revelação Passo a Passo (Um por linha)</label>
                                    <textarea id="edit-slide-topicos" rows="4" onchange="apresentacoesView.salvarTopicos(this.value)" class="form-textarea" style="width: 100%; font-family: monospace;">${(currentSlide.topicos || []).join('\n')}</textarea>
                                </div>
                            ` : `
                                <div>
                                    <label for="edit-slide-conteudo" class="form-label">Conteúdo Principal (Texto / Explicação)</label>
                                    <textarea id="edit-slide-conteudo" rows="4" onchange="apresentacoesView.salvarCampoSlide('conteudo', this.value)" class="form-textarea" style="width: 100%;">${escapeHTML(currentSlide.conteudo || '')}</textarea>
                                </div>
                            `}

                            ${currentSlide.tipoLayout === 'katex' ? `
                                <div>
                                    <label for="edit-slide-katex" class="form-label">Fórmula KaTeX (Ex: \\frac{a}{b} = c)</label>
                                    <input type="text" id="edit-slide-katex" value="${escapeHTML(currentSlide.formulaKatex || '')}" onchange="apresentacoesView.salvarCampoSlide('formulaKatex', this.value)" class="form-input" style="width: 100%; font-family: monospace; color: var(--color-primary);">
                                </div>
                            ` : ''}

                            <div>
                                <label for="edit-slide-notas" class="form-label" style="color: #d97706;">
                                    <i class="fas fa-clipboard-question" style="margin-right: 0.25rem;"></i> Notas Privadas do Apresentador (Visível no modo docente)
                                </label>
                                <textarea id="edit-slide-notas" rows="2" onchange="apresentacoesView.salvarCampoSlide('notasProfessor', this.value)" placeholder="Orientações e roteiro de fala para este slide..." class="form-textarea" style="width: 100%; background-color: rgba(251, 191, 36, 0.08); border-color: rgba(245, 158, 11, 0.3); font-size: 0.8125rem;">${escapeHTML(currentSlide.notasProfessor || '')}</textarea>
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--color-slate-100); padding-top: var(--spacing-4);">
                            <button onclick="apresentacoesView.removerSlideAtual()" class="btn-danger" style="padding: 0.5rem 1rem; font-size: 0.8125rem;">
                                <i class="fas fa-trash-can" style="margin-right: 0.25rem;"></i> Excluir Slide Atual
                            </button>
                            <span style="font-size: 0.75rem; color: var(--color-slate-400);">Modificações salvas automaticamente no estado e nuvem</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    _setupListeners(container) {
        // Abas de filtro
        container.querySelectorAll('[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeTab = btn.getAttribute('data-tab');
                this.render(container);
            });
        });

        // Botão Nova Apresentação
        const btnNova = container.querySelector('#btn-nova-apres');
        if (btnNova) btnNova.addEventListener('click', () => this.abrirNovaModal());

        // Botão Importar PPTX
        const btnImport = container.querySelector('#btn-import-pptx');
        if (btnImport) btnImport.addEventListener('click', () => {
            const modal = container.querySelector('#modal-pptx');
            if (modal) modal.classList.remove('hidden');
        });

        // Botão Gerar IA
        const btnIA = container.querySelector('#btn-gerar-ia');
        if (btnIA) btnIA.addEventListener('click', () => {
            const modal = container.querySelector('#modal-ia');
            if (modal) modal.classList.remove('hidden');
        });

        // Fechar modais
        container.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
            });
        });

        // SINCRONIZAÇÃO EM TEMPO REAL DOS INPUTS DO MODAL IA PARA PRESERVAÇÃO DE ESTADO
        const inputTema = container.querySelector('#ia-tema-input');
        if (inputTema) {
            inputTema.addEventListener('input', (e) => {
                this.selectedTema = e.target.value;
            });
        }

        const inputDisc = container.querySelector('#ia-disciplina-input');
        if (inputDisc) {
            inputDisc.addEventListener('input', (e) => {
                this.selectedDisciplina = e.target.value;
            });
        }

        const selectQtd = container.querySelector('#ia-qtd-slides');
        if (selectQtd) {
            selectQtd.addEventListener('change', (e) => {
                this.selectedQtd = parseInt(e.target.value, 10) || 5;
            });
        }

        // Eventos de Dropzone PPTX
        const dropzone = container.querySelector('#pptx-dropzone');
        const fileInput = container.querySelector('#input-pptx-file');

        if (dropzone && fileInput) {
            dropzone.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', async (e) => {
                if (e.target.files && e.target.files[0]) {
                    container.querySelector('#modal-pptx').classList.add('hidden');
                    const novApres = await apresentacaoController.importarPPTX(e.target.files[0]);
                    if (novApres) this.render(container);
                }
            });

            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.style.borderColor = 'var(--color-primary)';
            });

            dropzone.addEventListener('dragleave', () => {
                dropzone.style.borderColor = '';
            });

            dropzone.addEventListener('drop', async (e) => {
                e.preventDefault();
                dropzone.style.borderColor = '';
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    container.querySelector('#modal-pptx').classList.add('hidden');
                    const novApres = await apresentacaoController.importarPPTX(e.dataTransfer.files[0]);
                    if (novApres) this.render(container);
                }
            });
        }

        // SELETOR BNCC NA MODAL DA IA
        const btnSeletorBnccIA = container.querySelector('#btn-selecionar-bncc-ia');
        if (btnSeletorBnccIA) {
            btnSeletorBnccIA.addEventListener('click', () => {
                // Garante a leitura dos valores atuais antes de abrir o seletor
                if (inputTema) this.selectedTema = inputTema.value;
                if (inputDisc) this.selectedDisciplina = inputDisc.value;
                if (selectQtd) this.selectedQtd = parseInt(selectQtd.value, 10) || 5;

                const callbackSelecao = (habilidade) => {
                    this.selectedBnccSkill = habilidade;
                    if (window.controller && typeof window.controller.closeModal === 'function') {
                        window.controller.closeModal();
                    }
                    this.render(container);
                    // Reabre o modal da IA com todos os valores preservados
                    setTimeout(() => {
                        const modalIA = container.querySelector('#modal-ia');
                        if (modalIA) modalIA.classList.remove('hidden');
                    }, 100);
                };

                if (window.controller && typeof window.controller.openModal === 'function') {
                    window.controller.openModal('Selecionar Habilidade BNCC para IA',
                        `<div id="modal-bncc-ia-container" style="width: 100%; max-height: 75vh; overflow-y: auto; padding: var(--spacing-4);"></div>`,
                        'xl'
                    );
                    setTimeout(() => {
                        if (window.bnccView) {
                            window.bnccView.render('modal-bncc-ia-container', null, null, callbackSelecao);
                        }
                    }, 100);
                }
            });
        }

        const btnRemoverBnccIA = container.querySelector('#btn-remover-bncc-ia');
        if (btnRemoverBnccIA) {
            btnRemoverBnccIA.addEventListener('click', () => {
                if (inputTema) this.selectedTema = inputTema.value;
                if (inputDisc) this.selectedDisciplina = inputDisc.value;
                if (selectQtd) this.selectedQtd = parseInt(selectQtd.value, 10) || 5;

                this.selectedBnccSkill = null;
                this.render(container);
                setTimeout(() => {
                    const modalIA = container.querySelector('#modal-ia');
                    if (modalIA) modalIA.classList.remove('hidden');
                }, 50);
            });
        }

        // UPLOAD DE ARQUIVO NA MODAL DA IA
        const fileDropzoneIA = container.querySelector('#ia-file-dropzone');
        const fileInputIA = container.querySelector('#input-ia-context-file');

        if (fileDropzoneIA && fileInputIA) {
            fileDropzoneIA.addEventListener('click', () => fileInputIA.click());

            fileInputIA.addEventListener('change', async (e) => {
                if (e.target.files && e.target.files[0]) {
                    if (inputTema) this.selectedTema = inputTema.value;
                    if (inputDisc) this.selectedDisciplina = inputDisc.value;
                    if (selectQtd) this.selectedQtd = parseInt(selectQtd.value, 10) || 5;

                    const file = e.target.files[0];
                    this.selectedFileName = file.name;
                    this.selectedFileContext = await lerArquivoTexto(file);
                    if (Toast) Toast.show(`Material "${file.name}" carregado como contexto!`, "info");
                    this.render(container);
                    setTimeout(() => {
                        const modalIA = container.querySelector('#modal-ia');
                        if (modalIA) modalIA.classList.remove('hidden');
                    }, 50);
                }
            });
        }

        // Evento Confirmar IA (com botão de loading Spinner)
        const btnConfirmarIA = container.querySelector('#btn-confirmar-ia');
        if (btnConfirmarIA) {
            btnConfirmarIA.addEventListener('click', async () => {
                const tema = this.selectedTema || (inputTema ? inputTema.value.trim() : '');
                const disc = this.selectedDisciplina || (inputDisc ? inputDisc.value.trim() : 'Geral');
                const qtd = this.selectedQtd || (selectQtd ? parseInt(selectQtd.value, 10) : 5);

                if (!tema) {
                    if (Toast) Toast.show("Insira o tema para a IA.", "warning");
                    return;
                }

                // Efeito visual de loading no botão
                btnConfirmarIA.disabled = true;
                btnConfirmarIA.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Gerando Apresentação...</span>`;

                try {
                    const novApres = await apresentacaoController.gerarApresentacaoIA(
                        tema,
                        disc,
                        qtd,
                        this.selectedBnccSkill,
                        this.selectedFileContext
                    );

                    container.querySelector('#modal-ia').classList.add('hidden');
                    
                    // Limpa estados temporários da IA após geração bem-sucedida
                    this.selectedTema = '';
                    this.selectedDisciplina = '';
                    this.selectedQtd = 5;
                    this.selectedBnccSkill = null;
                    this.selectedFileContext = '';
                    this.selectedFileName = '';

                    if (novApres) {
                        this.selectedApresId = novApres.id;
                        this.editingSlideIndex = 0;
                        this.render(container);
                    }
                } catch (err) {
                    console.error("Erro ao gerar slides:", err);
                    if (Toast) Toast.show("Erro ao gerar apresentação.", "error");
                } finally {
                    btnConfirmarIA.disabled = false;
                    btnConfirmarIA.innerHTML = `<i class="fas fa-wand-magic-sparkles"></i> <span>Gerar Apresentação</span>`;
                }
            });
        }
    },

    abrirNovaModal() {
        apresentacaoController.abrirModalNovaApresentacao((nov) => {
            if (nov) {
                this.selectedApresId = nov.id;
                this.editingSlideIndex = 0;
                this.render('view-container');
            }
        });
    },

    abrirEditor(id) {
        this.selectedApresId = id;
        this.editingSlideIndex = 0;
        this.render('view-container');
    },

    fecharEditor() {
        this.selectedApresId = null;
        this.render('view-container');
    },

    selecionarSlideEdicao(idx) {
        this.editingSlideIndex = idx;
        this.render('view-container');
    },

    adicionarNovoSlide() {
        if (!this.selectedApresId) return;
        const novo = model.addSlide(this.selectedApresId, {
            titulo: `Slide ${ (model.getApresentacaoById(this.selectedApresId)?.slides?.length || 0) + 1}`,
            tipoLayout: 'titulo-texto'
        });
        if (novo) {
            this.editingSlideIndex = (model.getApresentacaoById(this.selectedApresId)?.slides?.length || 1) - 1;
            this.render('view-container');
        }
    },

    removerSlideAtual() {
        if (!this.selectedApresId) return;
        const apres = model.getApresentacaoById(this.selectedApresId);
        if (!apres || apres.slides.length <= 1) {
            if (Toast) Toast.show("A apresentação deve ter pelo menos 1 slide.", "warning");
            return;
        }

        const slideId = apres.slides[this.editingSlideIndex]?.id;
        if (!slideId) return;

        if (window.controller && typeof window.controller.confirmarAcao === 'function') {
            window.controller.confirmarAcao(
                "Excluir Slide",
                "Tem certeza que deseja excluir este slide?",
                () => {
                    model.deleteSlide(this.selectedApresId, slideId);
                    this.editingSlideIndex = Math.max(0, this.editingSlideIndex - 1);
                    if (Toast) Toast.show("Slide excluído com sucesso.", "info");
                    this.render('view-container');
                }
            );
        } else {
            model.deleteSlide(this.selectedApresId, slideId);
            this.editingSlideIndex = Math.max(0, this.editingSlideIndex - 1);
            this.render('view-container');
        }
    },

    salvarCampoSlide(campo, valor) {
        if (!this.selectedApresId) return;
        const apres = model.getApresentacaoById(this.selectedApresId);
        const slideId = apres?.slides[this.editingSlideIndex]?.id;
        if (slideId) {
            model.updateSlide(this.selectedApresId, slideId, { [campo]: valor });
        }
    },

    salvarTopicos(textoMultilinha) {
        if (!this.selectedApresId) return;
        const topicos = (textoMultilinha || '').split('\n').map(t => t.trim()).filter(Boolean);
        const apres = model.getApresentacaoById(this.selectedApresId);
        const slideId = apres?.slides[this.editingSlideIndex]?.id;
        if (slideId) {
            model.updateSlide(this.selectedApresId, slideId, { topicos });
        }
    },

    duplicarApres(id) {
        const cop = model.duplicarApresentacao(id);
        if (cop) {
            if (Toast) Toast.show("Apresentação duplicada com sucesso!", "success");
            this.render('view-container');
        }
    },

    excluirApres(id) {
        if (window.controller && typeof window.controller.confirmarAcao === 'function') {
            window.controller.confirmarAcao(
                "Excluir Apresentação",
                "Tem certeza que deseja excluir esta apresentação? Esta ação não pode ser desfeita.",
                () => {
                    model.deleteApresentacao(id);
                    if (Toast) Toast.show("Apresentação excluída.", "info");
                    this.render('view-container');
                }
            );
        } else {
            model.deleteApresentacao(id);
            if (Toast) Toast.show("Apresentação excluída.", "info");
            this.render('view-container');
        }
    }
};

if (typeof window !== 'undefined') {
    window.apresentacoesView = apresentacoesView;
}
