import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';
import { renderKatex, formatarTextoComLatex, sanitizeComLatex, alternarModoEdicaoPreview } from '../utils.js';
import { EventDelegator } from '../utils/eventDelegator.js';
import { tableHelper } from '../utils/tableHelper.js';
import { imageHelper } from '../utils/imageHelper.js';
import { EditorToolbar } from '../components/editorToolbar.js';

export const conteudoGeradoView = {
    materialIdAtual: null,
    modoVisualizacao: 'professor', // 'professor' (com gabarito) ou 'aluno' (sem gabarito)
    _cleanupDelegators: null,

    setMaterial(id) {
        this.materialIdAtual = id;
    },

    setModo(modo) {
        this.modoVisualizacao = modo;
        this.render('view-container');
    },

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }

        if (!this.materialIdAtual && model.state.materiaisGerados && model.state.materiaisGerados.length > 0) {
            this.materialIdAtual = model.state.materiaisGerados[model.state.materiaisGerados.length - 1].id;
        }

        const material = (model.state.materiaisGerados || []).find(m => m.id === this.materialIdAtual);
        if (!material) {
            container.innerHTML = `
                <div class="card" style="padding: 6rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; max-width: 32rem; margin: 3rem auto; border-radius: var(--radius-2xl);">
                    <div style="width: 4rem; height: 4rem; border-radius: var(--radius-full); background-color: var(--color-slate-100); color: var(--color-slate-400); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; margin-bottom: 1.25rem;">
                        <i class="far fa-folder-open"></i>
                    </div>
                    <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--color-slate-700); margin-bottom: 0.5rem;">Material não encontrado</h2>
                    <p style="color: var(--color-slate-500); font-size: 0.875rem; margin-bottom: 1.5rem;">O material selecionado pode ter sido removido ou ainda não foi gerado.</p>
                    <button type="button" data-action="ir-biblioteca" class="btn-primary interactive-element">
                        <i class="fas fa-arrow-left"></i> <span>Ir para a Biblioteca</span>
                    </button>
                </div>
            `;
            return;
        }

        const dataGeracao = new Date(material.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        const tituloSafe = window.escapeHTML ? window.escapeHTML(material.titulo || material.tema || 'Conteúdo Pedagógico') : (material.titulo || 'Conteúdo Pedagógico');
        const temaSafe = window.escapeHTML ? window.escapeHTML(material.tema || 'Geral') : (material.tema || 'Geral');
        const ferramentaSafe = window.escapeHTML ? window.escapeHTML(material.tipo || 'Gerador IA') : (material.tipo || 'Gerador IA');

        const isAluno = this.modoVisualizacao === 'aluno';
        const conteudoProcessado = window.prepararHTMLParaExportacao
            ? window.prepararHTMLParaExportacao(material.conteudo_html || '', this.modoVisualizacao)
            : this.processarHTMLParaModo(material.conteudo_html || '', this.modoVisualizacao);

        const html = `
            <div class="fade-in pb-24 max-w-6xl mx-auto" style="display: flex; flex-direction: column; gap: var(--spacing-6);">
                
                <!-- TOP HEADER & NAVEGAÇÃO -->
                <div>
                    <button type="button" data-action="ir-biblioteca" class="btn-secondary interactive-element text-xs mb-3" style="padding: 0.375rem 0.75rem; font-size: 0.8125rem;">
                        <i class="fas fa-arrow-left"></i> <span>Voltar para a Biblioteca</span>
                    </button>
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; flex-wrap: wrap;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                                <h2 style="font-size: 1.875rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em;">${tituloSafe}</h2>
                                <span class="badge" style="background-color: ${isAluno ? '#dbeafe' : '#dcfce7'}; color: ${isAluno ? '#1e40af' : '#15803d'}; font-weight: 800;">
                                    ${isAluno ? '<i class="fas fa-user-graduate" style="margin-right: 0.25rem;"></i> Versão Aluno' : '<i class="fas fa-chalkboard-teacher" style="margin-right: 0.25rem;"></i> Versão Professor (Com Gabarito)'}
                                </span>
                            </div>
                            <p style="color: var(--color-slate-500); margin-top: 0.25rem; font-size: 0.9375rem;">${temaSafe} • Gerado em ${dataGeracao}</p>
                        </div>

                        <!-- SELETOR DE MODO (PADRÃO BANCO DE QUESTÕES) -->
                        <div class="mode-toggle-group" style="width: fit-content;">
                            <button type="button" data-action="modo-aluno" 
                                    class="mode-toggle-btn interactive-element ${isAluno ? 'mode-toggle-btn--active' : ''}">
                                <i class="fas fa-user-graduate" style="margin-right: 0.375rem; color: ${isAluno ? 'var(--color-primary)' : 'inherit'};"></i>
                                Versão Aluno (Sem Gabarito)
                            </button>
                            <button type="button" data-action="modo-professor" 
                                    class="mode-toggle-btn interactive-element ${!isAluno ? 'mode-toggle-btn--active' : ''}">
                                <i class="fas fa-chalkboard-teacher" style="margin-right: 0.375rem; color: ${!isAluno ? '#059669' : 'inherit'};"></i>
                                Versão Professor (Com Gabarito)
                            </button>
                        </div>
                    </div>
                </div>

                <!-- BARRA DE AÇÕES (TOOLBAR) -->
                <div class="card" style="padding: 0.875rem 1.25rem; display: flex; flex-wrap: wrap; items-center; justify-content: space-between; gap: 0.75rem; border-radius: var(--radius-xl); border: 1px solid var(--color-slate-200);">
                    <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;">
                        <button type="button" data-action="baixar-word" data-id="${material.id}" data-prof="${!isAluno}" 
                                class="btn-primary interactive-element" 
                                style="background-color: ${isAluno ? '#2563eb' : '#059669'}; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);">
                            <i class="far fa-file-word"></i> <span>Baixar Word (${isAluno ? 'Aluno' : 'Professor'})</span>
                        </button>
                        
                        ${(material.tipo === 'rubrica-avaliacao' || (material.conteudo_html || '').includes('table')) ? `
                            <button type="button" data-action="abrir-rubrica" 
                                    class="btn-primary interactive-element" 
                                    style="background: linear-gradient(135deg, #c026d3, #9333ea); box-shadow: 0 4px 10px rgba(192, 38, 211, 0.25);">
                                <i class="fas fa-calculator"></i> <span>Avaliador de Rubrica Interativo</span>
                            </button>
                        ` : ''}

                        <button type="button" data-action="opcoes-impressao" class="btn-secondary interactive-element">
                            <i class="fas fa-print"></i> <span>Imprimir / PDF</span>
                        </button>

                        <button type="button" data-action="copiar-texto" class="btn-secondary interactive-element" title="Copiar texto para colar em outro aplicativo">
                            <i class="far fa-copy"></i> <span>Copiar Texto</span>
                        </button>

                        <button type="button" data-action="abrir-editor-modal" class="btn-secondary interactive-element" style="color: var(--color-slate-700); font-weight: 700;">
                            <i class="fas fa-edit" style="color: var(--color-primary);"></i> <span>Editar Material</span>
                        </button>

                        ${material.compartilhado ? `
                            <button type="button" data-action="remover-comunidade" data-id="${material.id}" class="btn-secondary interactive-element" style="color: #7c3aed; background-color: #f3e8ff; border-color: #ddd6fe; font-weight: 700;" title="Material Público na Comunidade (Clique para retirar)">
                                <i class="fas fa-globe"></i> <span>Público na Comunidade</span>
                            </button>
                        ` : `
                            <button type="button" data-action="compartilhar-comunidade" data-id="${material.id}" class="btn-secondary interactive-element" style="color: #7c3aed; font-weight: 700;" title="Compartilhar com a comunidade de professores">
                                <i class="fas fa-share-nodes"></i> <span>Tornar Público / Comunidade</span>
                            </button>
                        `}
                    </div>

                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <button type="button" data-action="criar-material" class="btn-secondary interactive-element" style="color: var(--color-slate-600);">
                            <i class="fas fa-magic"></i> <span>Gerar Novo Material</span>
                        </button>
                    </div>
                </div>

                <!-- LAYOUT PRINCIPAL: DOCUMENTO (ESQUERDA) E SIDEBAR (DIREITA) -->
                <div style="display: grid; grid-template-columns: 1fr; gap: var(--spacing-6);" class="lg:grid-cols-12">
                    
                    <!-- ÁREA DO DOCUMENTO FORMATADO -->
                    <div class="card lg:col-span-8 ${isAluno ? 'documento-modo-aluno' : ''}" 
                         style="padding: var(--spacing-8); min-height: 600px; border-radius: var(--radius-2xl); border: 1px solid var(--color-slate-200); box-shadow: var(--shadow-sm); background-color: var(--color-white);">
                        
                        <!-- CABEÇALHO DO DOCUMENTO ESCOLAR -->
                        <div style="padding-bottom: 1.5rem; margin-bottom: 2rem; border-bottom: 2px solid var(--color-slate-100); display: flex; flex-direction: column; gap: 0.5rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--color-slate-400); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">
                                <span>${window.escapeHTML(material.disciplina || 'Disciplina')} • ${window.escapeHTML(material.serie || material.turma || 'Série')}${material.bncc ? ` • BNCC: ${window.escapeHTML(material.bncc)}` : ''}</span>
                                <span class="badge" style="background-color: ${isAluno ? '#f1f5f9' : '#f0fdf4'}; color: ${isAluno ? '#475569' : '#166534'};">
                                    ${isAluno ? 'Folha de Atividades (Aluno)' : 'Guia Pedagógico (Professor)'}
                                </span>
                            </div>
                            ${isAluno ? `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background-color: var(--color-slate-50); border: 1px dashed var(--color-slate-200); border-radius: var(--radius-lg); margin-top: 0.5rem; font-size: 0.8125rem; color: var(--color-slate-600);">
                                    <span><strong>Nome do(a) Aluno(a):</strong> __________________________________________________</span>
                                    <span><strong>Data:</strong> ____/____/2026</span>
                                </div>
                            ` : ''}
                        </div>

                        <!-- CONTEÚDO HTML DO DOCUMENTO -->
                        <div id="documento-html-content" style="line-height: 1.8; color: var(--color-slate-700); font-size: 0.9375rem;" class="prose max-w-none">
                            ${conteudoProcessado || '<p class="text-slate-400 italic">O conteúdo gerado está vazio.</p>'}
                        </div>
                    </div>

                    <!-- SIDEBAR DE METADADOS E DETALHES -->
                    <div class="lg:col-span-4 no-print" style="display: flex; flex-direction: column; gap: var(--spacing-4);">
                        
                        <div class="card" style="padding: var(--spacing-6); border-radius: var(--radius-2xl); border: 1px solid var(--color-slate-200);">
                            <h3 style="font-weight: 800; color: var(--color-slate-800); font-size: 1rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--color-slate-100); display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-info-circle" style="color: var(--color-primary);"></i> Metadados do Material
                            </h3>
                            
                            <div style="display: flex; flex-direction: column; gap: 0.875rem;">
                                <div>
                                    <span class="form-label" style="font-size: 0.6875rem; text-transform: uppercase;">Ferramenta</span>
                                    <span style="font-size: 0.875rem; font-weight: 700; color: var(--color-slate-800); text-transform: capitalize;">${ferramentaSafe.replace(/-/g, ' ')}</span>
                                </div>
                                <div>
                                    <span class="form-label" style="font-size: 0.6875rem; text-transform: uppercase;">Disciplina</span>
                                    <span style="font-size: 0.875rem; font-weight: 700; color: var(--color-slate-800); text-transform: capitalize;">${material.disciplina || 'Geral'}</span>
                                </div>
                                <div>
                                    <span class="form-label" style="font-size: 0.6875rem; text-transform: uppercase;">Série / Ano</span>
                                    <span style="font-size: 0.875rem; font-weight: 700; color: var(--color-slate-800);">${material.serie || '-'}</span>
                                </div>
                                <div>
                                    <span class="form-label" style="font-size: 0.6875rem; text-transform: uppercase;">Tema Central</span>
                                    <span style="font-size: 0.875rem; font-weight: 700; color: var(--color-slate-800);">${temaSafe}</span>
                                </div>
                                
                                ${material.bncc ? `
                                <div style="padding-top: 0.75rem; border-top: 1px solid var(--color-slate-100);">
                                    <span class="form-label" style="font-size: 0.6875rem; text-transform: uppercase; margin-bottom: 0.25rem;">Habilidade BNCC</span>
                                    <span class="badge" style="background-color: #eef2ff; color: #4338ca; font-size: 0.75rem; font-weight: 800; padding: 0.25rem 0.5rem; border-radius: var(--radius-md); border: 1px solid #e0e7ff;">${material.bncc}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- CARD DE AÇÕES RÁPIDAS -->
                        <div class="card" style="padding: var(--spacing-6); border-radius: var(--radius-2xl); border: 1px solid #e2e8f0; background: linear-gradient(to bottom, #ffffff, #f8fafc);">
                            <h4 style="font-weight: 800; color: var(--color-slate-800); font-size: 0.875rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-bolt" style="color: #f59e0b;"></i> Dica de Aplicação
                            </h4>
                            <p style="font-size: 0.8125rem; color: var(--color-slate-600); line-height: 1.5; margin-bottom: 1rem;">
                                ${isAluno ? 'Utilize a <strong>Versão Aluno</strong> para imprimir provas ou enviar no Classroom sem revelar as respostas.' : 'A <strong>Versão Professor</strong> inclui o gabarito comentado para agilizar a correção e fornecer feedback à turma.'}
                            </p>
                            <button type="button" data-action="${isAluno ? 'modo-professor' : 'modo-aluno'}" 
                                    class="btn-primary interactive-element w-full justify-center" 
                                    style="background-color: ${isAluno ? '#059669' : '#2563eb'}; border-radius: var(--radius-xl); padding: 0.75rem 1rem; font-size: 0.875rem;">
                                <i class="${isAluno ? 'fas fa-chalkboard-teacher' : 'fas fa-user-graduate'}"></i>
                                <span>Alternar para ${isAluno ? 'Versão Professor' : 'Versão Aluno'}</span>
                            </button>
                        </div>

                    </div>

                </div>

            </div>
        `;

        container.innerHTML = html;

        // Renderização de fórmulas matemáticas e científicas com KaTeX
        renderKatex(container);
        const docContent = container.querySelector('#documento-html-content') || document.getElementById('documento-html-content');
        if (docContent) {
            renderKatex(docContent);
        }
        this._setupListeners(container, material);
    },

    _setupListeners(container, material) {
        this._cleanupDelegators = EventDelegator.bind(container, {
            'ir-biblioteca': () => controller.navigate('biblioteca'),
            'modo-aluno': () => this.setModo('aluno'),
            'modo-professor': () => this.setModo('professor'),
            'baixar-word': (e, target) => {
                const id = target.getAttribute('data-id') || material?.id;
                const prof = target.getAttribute('data-prof') === 'true';
                this.baixarWord(id, prof);
            },
            'abrir-rubrica': () => this.abrirAvaliadorRubrica(),
            'opcoes-impressao': () => this.abrirOpcoesImpressao(),
            'copiar-texto': () => this.copiarTextoFormatado(),
            'abrir-editor-modal': () => this.abrirEditorModal(),
            'remover-comunidade': (e, target) => {
                const id = target.getAttribute('data-id') || material?.id;
                model.removerMaterialDaComunidade(id);
            },
            'compartilhar-comunidade': (e, target) => {
                const id = target.getAttribute('data-id') || material?.id;
                model.compartilharMaterial(id);
            },
            'criar-material': () => controller.navigate('criar-material'),
            'alternar-modo-visual': (e, target) => {
                const mode = target.getAttribute('data-mode');
                this.alternarModoEdicaoVisual(mode);
            },
            'seletor-bncc-modal': () => this.abrirSeletorBnccModal(),
            'salvar-edicao-material': () => this.salvarEdicaoMaterial(),
            'fechar-modal': () => controller.closeModal(),
            'gerar-impressao': (e, target) => {
                const tipo = target.getAttribute('data-tipo');
                controller.closeModal();
                this.gerarDocumentoImpressao(tipo);
            },
            'copiar-rubrica': () => this.copiarResultadoRubrica()
        }, 'click');
    },

    destroy() {
        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }
    },

    onLeave() {
        this.destroy();
    },

    processarHTMLParaModo(rawHtml, modo) {
        if (!rawHtml) return '';
        if (modo === 'professor') {
            // No modo professor, estilizar e destacar os blocos de gabarito e resoluções
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = rawHtml;

            const gabaritos = tempDiv.querySelectorAll('.gabarito, .respostas, .gabarito-bloco, [data-gabarito="true"]');
            gabaritos.forEach(g => {
                g.classList.add('gabarito-bloco');
            });

            return tempDiv.innerHTML;
        } else {
            // No modo aluno, remover/ocultar seções de gabarito e resoluções
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = rawHtml;

            // 1. Remover elementos com classes conhecidas
            const seletoresRemover = [
                '.gabarito',
                '.respostas',
                '.gabarito-bloco',
                '.respostas-bloco',
                '.comentario-professor',
                '.resolucao-professor',
                '[data-gabarito="true"]'
            ];
            tempDiv.querySelectorAll(seletoresRemover.join(', ')).forEach(el => el.remove());

            // 2. Remover cabeçalhos e parágrafos correspondentes a Gabarito caso venham sem classe
            const headers = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, strong, p');
            headers.forEach(h => {
                const text = (h.textContent || '').trim().toLowerCase();
                if (text.startsWith('gabarito') ||
                    text.startsWith('respostas esperadas') ||
                    text.startsWith('critérios de correção') ||
                    text.startsWith('resolução comentada') ||
                    text.startsWith('gabarito comentado')) {

                    let next = h.nextElementSibling;
                    while (next && !['H1', 'H2', 'H3', 'H4'].includes(next.tagName)) {
                        const toRemove = next;
                        next = next.nextElementSibling;
                        toRemove.remove();
                    }
                    h.remove();
                }
            });

            return tempDiv.innerHTML;
        }
    },

    abrirSeletorBnccModal() {
        const tituloEl = document.getElementById('editor-mat-titulo');
        const temaEl = document.getElementById('editor-mat-tema');
        const bnccInput = document.getElementById('editor-mat-bncc');
        const serieEl = document.getElementById('editor-mat-serie');
        const discEl = document.getElementById('editor-mat-disciplina');
        const wysiwyg = document.getElementById('editor-mat-wysiwyg');
        const textarea = document.getElementById('editor-mat-conteudo');

        // Preserva o rascunho em andamento do editor
        if (tituloEl || wysiwyg || textarea) {
            const isCodeMode = textarea && textarea.style.display !== 'none';
            const conteudoHtml = isCodeMode ? (textarea ? textarea.value : '') : (wysiwyg ? wysiwyg.innerHTML : '');
            this._rascunhoEditor = {
                titulo: tituloEl ? tituloEl.value : '',
                tema: temaEl ? temaEl.value : '',
                serie: serieEl ? serieEl.value : '',
                disciplina: discEl ? discEl.value : '',
                bncc: bnccInput ? bnccInput.value : '',
                conteudoHtml: conteudoHtml,
                modo: isCodeMode ? 'code' : 'visual'
            };
        }

        const callback = (habilidade) => {
            if (habilidade && habilidade.codigo) {
                const fn = window.adicionarCodigoBNCC || adicionarCodigoBNCC;
                const bnccAtual = this._rascunhoEditor ? this._rascunhoEditor.bncc : (bnccInput ? bnccInput.value : '');
                const novaBncc = fn(bnccAtual, habilidade.codigo);
                if (this._rascunhoEditor) {
                    this._rascunhoEditor.bncc = novaBncc;
                }
                Toast.show(`Habilidade ${habilidade.codigo} anexada ao material!`, 'success');
            }
            // Reabre o editor com o rascunho preservado
            if (this._rascunhoEditor) {
                this.abrirEditorModal(this._rascunhoEditor);
            }
        };

        const serie = serieEl ? serieEl.value : (this._rascunhoEditor ? this._rascunhoEditor.serie : null);
        const nivel = 'Fundamental';

        if (window.controller && window.controller.openModal) {
            window.controller.openModal('Consultar & Anexar BNCC', '<div id="modal-bncc-editor" style="width: 100%; max-height: 80vh; overflow-y: auto; padding: var(--spacing-4);"></div>', 'xl');
            setTimeout(() => {
                if (window.bnccView) window.bnccView.render('modal-bncc-editor', nivel, serie, callback);
            }, 50);
        }
    },

    abrirEditorModal(rascunho = null) {
        if (typeof this._editorCleanup === 'function') {
            this._editorCleanup();
            this._editorCleanup = null;
        }

        const material = (model.state.materiaisGerados || []).find(m => m.id === this.materialIdAtual);
        if (!material && !rascunho) return Toast.show("Nenhum material carregado para edição.", "error");

        const tituloAtual = rascunho ? rascunho.titulo : (material?.titulo || material?.tema || '');
        const temaAtual = rascunho ? rascunho.tema : (material?.tema || '');
        const conteudoAtual = rascunho ? rascunho.conteudoHtml : (material?.conteudo_html || '');
        const disciplinaAtual = rascunho ? rascunho.disciplina : (material?.disciplina || material?.materia || 'Geral');
        const serieAtual = rascunho ? rascunho.serie : (material?.serie || material?.turma || material?.turma_ano || 'Todas as Turmas');
        const bnccAtual = rascunho ? rascunho.bncc : (material?.bncc || material?.habilidade_bncc || material?.habilidade || material?.codigo_bncc || '');
        const modoInicial = rascunho ? (rascunho.modo || 'visual') : 'visual';

        const disciplinasLista = [
            "Geral", "Língua Portuguesa", "Matemática", "Ciências", "História", "Geografia",
            "Arte", "Educação Física", "Língua Inglesa", "Física", "Química",
            "Biologia", "Filosofia", "Sociologia"
        ];
        if (disciplinaAtual && !disciplinasLista.includes(disciplinaAtual)) {
            disciplinasLista.unshift(disciplinaAtual);
        }

        const seriesLista = [
            "Todas as Turmas", "Berçário I", "Berçário II", "Maternal I", "Maternal II", "Jardim I", "Jardim II",
            "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano", "6º Ano", "7º Ano", "8º Ano", "9º Ano",
            "1ª Série (EM)", "2ª Série (EM)", "3ª Série (EM)"
        ];
        if (serieAtual && !seriesLista.includes(serieAtual)) {
            seriesLista.unshift(serieAtual);
        }

        const modalHtml = `
            <div style="display: flex; flex-direction: column; gap: 0.875rem; width: 100%; max-height: 82vh; overflow-y: auto;" class="custom-scrollbar">
                
                <!-- BLOCO SUPERIOR: METADADOS E SELETOR DE VISÃO -->
                <div style="display: flex; flex-direction: column; gap: 0.75rem; background: #ffffff; padding: 1.25rem; border-radius: var(--radius-xl); border: 1px solid var(--color-slate-200); box-shadow: var(--shadow-sm);">
                    <!-- LINHA 1: TÍTULO, TEMA E MODO DE EDIÇÃO -->
                    <div style="display: grid; grid-template-columns: 2.5fr 2fr 1.5fr; gap: 1rem; align-items: end;">
                        <div>
                            <label class="form-label" style="font-weight: 800; font-size: 0.8125rem; color: var(--color-slate-700);">Título do Material *</label>
                            <input type="text" id="editor-mat-titulo" class="form-input" value="${window.escapeHTML(tituloAtual)}" placeholder="Ex: Avaliação Bimestral de Ciências" style="font-weight: 700;">
                        </div>
                        <div>
                            <label class="form-label" style="font-weight: 800; font-size: 0.8125rem; color: var(--color-slate-700);">Tema / Conteúdo</label>
                            <input type="text" id="editor-mat-tema" class="form-input" value="${window.escapeHTML(temaAtual)}" placeholder="Ex: Fotossíntese e Cadeia Alimentar" style="font-weight: 700;">
                        </div>
                        <div>
                            <label class="form-label" style="font-weight: 800; font-size: 0.8125rem; color: var(--color-slate-700);">Modo de Edição</label>
                            <div style="display: flex; background: var(--color-slate-100); padding: 0.2rem; border-radius: var(--radius-lg); gap: 0.25rem; width: 100%;">
                                <button type="button" id="btn-mode-mat-code" data-action="alternar-modo-visual" data-mode="code" class="${modoInicial === 'code' ? 'btn-primary' : 'btn-secondary'}" style="flex: 1; padding: 0.45rem 0.5rem; font-size: 0.75rem; font-weight: 800; justify-content: center; background: ${modoInicial === 'code' ? 'var(--color-primary)' : 'transparent'};" title="Editor de Texto e Fórmulas LaTeX com Pré-Visualização KaTeX ao vivo">
                                    <i class="fas fa-code mr-1"></i> Editor de Código / LaTeX
                                </button>
                                <button type="button" id="btn-mode-mat-visual" data-action="alternar-modo-visual" data-mode="visual" class="${modoInicial === 'visual' ? 'btn-primary' : 'btn-secondary'}" style="flex: 1; padding: 0.45rem 0.5rem; font-size: 0.75rem; font-weight: 800; justify-content: center; background: ${modoInicial === 'visual' ? 'var(--color-primary)' : 'transparent'};" title="Editor Visual em Folha Mestre">
                                    <i class="fas fa-eye mr-1"></i> Pré-visualização Visual
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- LINHA 2: TURMA/ANO, DISCIPLINA E HABILIDADE BNCC (ORGANIZAÇÃO E FILTROS) -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr 2fr; gap: 1rem; align-items: end; border-top: 1px dashed var(--color-slate-200); padding-top: 0.75rem;">
                        <div>
                            <label class="form-label" style="font-weight: 800; font-size: 0.8125rem; color: var(--color-slate-700); display: flex; align-items: center; gap: 0.35rem;">
                                <i class="fas fa-graduation-cap" style="color: #4f46e5;"></i> Turma / Ano
                            </label>
                            <select id="editor-mat-serie" class="form-select" style="font-weight: 700; font-size: 0.875rem;">
                                ${seriesLista.map(s => `<option value="${window.escapeHTML(s)}" ${s === serieAtual ? 'selected' : ''}>${window.escapeHTML(s)}</option>`).join('')}
                            </select>
                        </div>

                        <div>
                            <label class="form-label" style="font-weight: 800; font-size: 0.8125rem; color: var(--color-slate-700); display: flex; align-items: center; gap: 0.35rem;">
                                <i class="fas fa-book-open" style="color: #059669;"></i> Disciplina / Componente
                            </label>
                            <select id="editor-mat-disciplina" class="form-select" style="font-weight: 700; font-size: 0.875rem;">
                                ${disciplinasLista.map(d => `<option value="${window.escapeHTML(d)}" ${d === disciplinaAtual ? 'selected' : ''}>${window.escapeHTML(d)}</option>`).join('')}
                            </select>
                        </div>

                        <div>
                            <label class="form-label" style="font-weight: 800; font-size: 0.8125rem; color: var(--color-slate-700); display: flex; align-items: center; gap: 0.35rem;">
                                <i class="fas fa-award" style="color: #d97706;"></i> Habilidade(s) BNCC (separadas por vírgula)
                            </label>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <input type="text" id="editor-mat-bncc" class="form-input" value="${window.escapeHTML(bnccAtual)}" placeholder="Ex: EF06MA01, EF06MA02, EF09MA07" style="font-weight: 700; font-size: 0.875rem; flex: 1;">
                                <button type="button" data-action="seletor-bncc-modal" class="btn-secondary interactive-element" style="padding: 0.45rem 0.75rem; font-size: 0.75rem; white-space: nowrap; background: #fff8f0; border-color: #fde68a; color: #b45309;" title="Buscar e Anexar Habilidades da BNCC">
                                    <i class="fas fa-bookmark" style="color: #d97706;"></i> <span>Anexar BNCC</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- MESA DE TRABALHO STUDIO (BARRA RIBBON MODULAR + EDITOR WYSIWYG) -->
                <div style="background-color: #f1f5f9; border-radius: var(--radius-2xl); border: 1px solid var(--color-slate-200); padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
                    
                    <!-- BARRA DE FERRAMENTAS MODULAR (RIBBON COMPLETO) -->
                    ${EditorToolbar.render('editor-mat-wysiwyg')}

                    <!-- ÁREA PRINCIPAL DE EDIÇÃO: EDITOR VISUAL (WYSIWYG TIPO WORD) -->
                    <div style="width: 100%; display: flex; flex-direction: column; position: relative;">
                        <!-- CONTAINER VISUAL PRINCIPAL (CONTENTEDITABLE) -->
                        <div id="editor-mat-wysiwyg" contenteditable="true" class="custom-scrollbar" 
                             style="display: ${modoInicial === 'visual' ? 'block' : 'none'}; width: 100%; min-height: 220px; max-height: 48vh; overflow-y: auto; background: #ffffff; padding: 1.25rem 1.5rem; border-radius: 0 0 var(--radius-xl) var(--radius-xl); border: 1px solid #cbd5e1; border-top: none; box-shadow: var(--shadow-sm); line-height: 1.75; font-size: 1rem; color: #1e293b; outline: none;">
                            ${conteudoAtual}
                        </div>

                        <!-- TEXTAREA DE CÓDIGO (OCULTA POR PADRÃO - SUPORTE AVANÇADO) -->
                        <textarea id="editor-mat-conteudo" class="custom-scrollbar" 
                                  style="display: ${modoInicial === 'code' ? 'block' : 'none'}; width: 100%; min-height: 220px; max-height: 48vh; font-family: monospace; font-size: 0.9rem; background-color: #ffffff; color: #0f172a; padding: 1rem; border-radius: 0 0 var(--radius-xl) var(--radius-xl); border: 1px solid #cbd5e1; border-top: none;">${window.escapeHTML(conteudoAtual)}</textarea>
                    </div>
                </div>

                <!-- RODAPÉ E ALERTA DE SINCRONIZAÇÃO MESTRE -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem; border-top: 1px solid var(--color-slate-200); flex-wrap: wrap; gap: 0.75rem; margin-top: 0.25rem;">
                    <div style="padding: 0.4rem 0.75rem; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-lg); font-size: 0.8125rem; color: #1e40af; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-sync-alt" style="color: #3b82f6;"></i>
                        <span><strong>Edição Mestre:</strong> As alterações são salvas diretamente no documento final da sua biblioteca.</span>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: var(--spacing-3);">
                        <button type="button" data-action="fechar-modal" class="btn-secondary" style="padding: 0.625rem 1.5rem; font-weight: 700;">Cancelar</button>
                        <button type="button" data-action="salvar-edicao-material" class="btn-primary" style="padding: 0.625rem 2.25rem; font-weight: 800; background: linear-gradient(135deg, #4f46e5, #4338ca); border-radius: var(--radius-xl); box-shadow: 0 4px 14px rgba(79,70,229,0.35);">
                            <i class="fas fa-save mr-1"></i> Salvar Alterações
                        </button>
                    </div>
                </div>
            </div>
        `;

        controller.openModal('Editar Material Pedagógico', modalHtml, 'xl');

        setTimeout(() => {
            const modalEl = document.getElementById('global-modal');
            if (modalEl) {
                if (typeof this._editorCleanup === 'function') {
                    this._editorCleanup();
                }
                this._editorCleanup = EventDelegator.bind(modalEl, {
                    'salvar-edicao-material': () => this.salvarEdicaoMaterial(),
                    'fechar-modal': () => controller.closeModal(),
                    'alternar-modo-visual': (e, target) => {
                        const mode = target.getAttribute('data-mode');
                        this.alternarModoEdicaoVisual(mode);
                    },
                    'seletor-bncc-modal': () => this.abrirSeletorBnccModal()
                }, 'click');
            }

            const wysiwyg = document.getElementById('editor-mat-wysiwyg');
            if (wysiwyg) {
                if (typeof renderKatex === 'function') renderKatex(wysiwyg);
                if (window.criarMaterialView) {
                    if (typeof window.criarMaterialView.vincularRastreamentoSelecao === 'function') {
                        window.criarMaterialView.vincularRastreamentoSelecao(wysiwyg);
                    }
                    if (typeof window.criarMaterialView.vincularSanitizadorPaste === 'function') {
                        window.criarMaterialView.vincularSanitizadorPaste(wysiwyg);
                    }
                }
                if (typeof tableHelper !== 'undefined') {
                    tableHelper.inicializarInspetorImagens?.(wysiwyg);
                    tableHelper.inicializarInspetorTabelas(wysiwyg);
                }
                if (typeof imageHelper !== 'undefined') {
                    imageHelper.inicializarInspetorImagens(wysiwyg);
                }
            }
        }, 50);
    },

    modosEdicaoMatAtual: 'code',

    alternarModoEdicaoVisual(modo) {
        this.modosEdicaoMatAtual = modo;
        const wysiwyg = document.getElementById('editor-mat-wysiwyg');
        const textarea = document.getElementById('editor-mat-conteudo');
        const preview = document.getElementById('editor-mat-preview');
        const btnVisual = document.getElementById('btn-mode-mat-visual');
        const btnCode = document.getElementById('btn-mode-mat-code');

        if (modo === 'visual') {
            if (textarea && wysiwyg) {
                wysiwyg.innerHTML = textarea.value;
                if (typeof renderKatex === 'function') renderKatex(wysiwyg);
                if (window.criarMaterialView && typeof window.criarMaterialView.vincularRastreamentoSelecao === 'function') {
                    window.criarMaterialView.vincularRastreamentoSelecao(wysiwyg);
                }
                if (typeof tableHelper !== 'undefined') tableHelper.inicializarInspetorTabelas(wysiwyg);
                if (typeof imageHelper !== 'undefined') imageHelper.inicializarInspetorImagens(wysiwyg);
            }
            if (wysiwyg) wysiwyg.style.display = 'block';
            if (textarea) textarea.style.display = 'none';
            if (preview) preview.style.display = 'none';

            if (btnVisual) {
                btnVisual.style.backgroundColor = '#ffffff';
                btnVisual.style.color = '#4f46e5';
                btnVisual.style.boxShadow = 'var(--shadow-sm)';
            }
            if (btnCode) {
                btnCode.style.backgroundColor = 'transparent';
                btnCode.style.color = '#64748b';
                btnCode.style.boxShadow = 'none';
            }
        } else {
            if (wysiwyg && textarea) {
                textarea.value = wysiwyg.innerHTML;
            }
            if (wysiwyg) wysiwyg.style.display = 'none';
            if (textarea) textarea.style.display = 'block';
            if (preview) preview.style.display = 'none';

            if (btnVisual) {
                btnVisual.style.backgroundColor = 'transparent';
                btnVisual.style.color = '#64748b';
                btnVisual.style.boxShadow = 'none';
            }
            if (btnCode) {
                btnCode.style.backgroundColor = '#ffffff';
                btnCode.style.color = '#4f46e5';
                btnCode.style.boxShadow = 'var(--shadow-sm)';
            }
        }
    },

    inserirFormulaLatex(templateTex) {
        const wysiwyg = document.getElementById('editor-mat-wysiwyg');
        const textarea = document.getElementById('editor-mat-conteudo');

        if (textarea && textarea.style.display !== 'none') {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            textarea.setRangeText(` \\(${templateTex}\\) `, start, end, 'end');
            textarea.focus();
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            return;
        }

        if (wysiwyg) {
            wysiwyg.focus();
            document.execCommand('insertHTML', false, ` \\(${templateTex}\\) `);
        }
    },

    formatarTextoVisual(comando, valor = null) {
        const wysiwyg = document.getElementById('editor-mat-wysiwyg');
        if (wysiwyg && (wysiwyg.style.display !== 'none')) {
            wysiwyg.focus();
            document.execCommand(comando, false, valor);
        }
    },

    inserirTag(tag) {
        const wysiwyg = document.getElementById('editor-mat-wysiwyg');
        const textarea = document.getElementById('editor-mat-conteudo');

        if (wysiwyg && wysiwyg.style.display !== 'none') {
            wysiwyg.focus();
            if (tag === 'sub') {
                this.formatarTextoVisual('subscript');
            } else if (tag === 'sup') {
                this.formatarTextoVisual('superscript');
            } else {
                this.formatarTextoVisual(tag === 'strong' ? 'bold' : tag === 'em' ? 'italic' : 'formatBlock', tag.toUpperCase());
            }
            return;
        }

        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end) || 'Texto aqui';
        const replacement = `<${tag}>${selectedText}</${tag}>`;

        textarea.setRangeText(replacement, start, end, 'select');
        textarea.focus();
    },

    inserirLinhasResposta(targetId = 'editor-mat-wysiwyg') {
        const target = (typeof targetId === 'string' ? document.getElementById(targetId) : targetId) || document.getElementById('editor-mat-wysiwyg') || document.getElementById('manual-conteudo-wysiwyg') || document.getElementById('editor-mat-conteudo');
        const blocoHTML = `<div class="linhas-resposta" style="margin: 1.25rem 0; font-family: monospace; color: #94a3b8;"><p style="border-bottom: 1px dashed #cbd5e1; height: 1.8rem; margin: 0;"></p><p style="border-bottom: 1px dashed #cbd5e1; height: 1.8rem; margin: 0;"></p><p style="border-bottom: 1px dashed #cbd5e1; height: 1.8rem; margin: 0;"></p></div><p>&nbsp;</p>`;

        if (!target) return;
        target.focus();
        if (target.isContentEditable || target.contentEditable === 'true') {
            document.execCommand('insertHTML', false, blocoHTML);
            return;
        }

        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        target.setRangeText(`\n${blocoHTML}\n`, start, end, 'end');
        target.dispatchEvent(new Event('input', { bubbles: true }));
    },

    inserirTabelaPedagogica(targetId = 'editor-mat-wysiwyg') {
        if (typeof tableHelper !== 'undefined') {
            tableHelper.abrirModalInserirTabela(targetId);
            return;
        }
        const target = (typeof targetId === 'string' ? document.getElementById(targetId) : targetId) || document.getElementById('editor-mat-wysiwyg') || document.getElementById('manual-conteudo-wysiwyg') || document.getElementById('editor-mat-conteudo');
        const blocoHTML = `<table style="width: 100%; border-collapse: collapse; margin: 1.25rem 0; border: 1px solid #cbd5e1;"><thead><tr style="background: #f8fafc;"><th style="border: 1px solid #cbd5e1; padding: 0.625rem; text-align: left; font-weight: 800;">Item / Critério</th><th style="border: 1px solid #cbd5e1; padding: 0.625rem; text-align: left; font-weight: 800;">Descrição / Resposta Esperada</th></tr></thead><tbody><tr><td style="border: 1px solid #cbd5e1; padding: 0.625rem;">01</td><td style="border: 1px solid #cbd5e1; padding: 0.625rem;">...</td></tr><tr><td style="border: 1px solid #cbd5e1; padding: 0.625rem;">02</td><td style="border: 1px solid #cbd5e1; padding: 0.625rem;">...</td></tr></tbody></table><p>&nbsp;</p>`;

        if (!target) return;
        target.focus();
        if (target.isContentEditable || target.contentEditable === 'true') {
            document.execCommand('insertHTML', false, blocoHTML);
            return;
        }

        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        target.setRangeText(`\n${blocoHTML}\n`, start, end, 'end');
        target.dispatchEvent(new Event('input', { bubbles: true }));
    },

    inserirBlocoGabarito(targetId = 'editor-mat-wysiwyg') {
        const target = (typeof targetId === 'string' ? document.getElementById(targetId) : targetId) || document.getElementById('editor-mat-wysiwyg') || document.getElementById('manual-conteudo-wysiwyg') || document.getElementById('editor-mat-conteudo');
        const blocoHTML = `<div class="gabarito-bloco" data-gabarito="true"><h3>Gabarito e Expectativa de Resposta</h3><p>Digite a resposta esperada ou resolução detalhada aqui...</p></div><p>&nbsp;</p>`;

        if (!target) return;
        target.focus();
        if (target.isContentEditable || target.contentEditable === 'true') {
            document.execCommand('insertHTML', false, blocoHTML);
            return;
        }

        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        const selectedText = target.value ? (target.value.substring(start, end) || 'Digite a resposta esperada ou resolução detalhada aqui...') : 'Digite a resposta esperada ou resolução detalhada aqui...';

        const bloco = `\n<div class="gabarito-bloco" data-gabarito="true">\n  <h3>Gabarito e Expectativa de Resposta</h3>\n  <p>${selectedText}</p>\n</div>\n`;

        target.setRangeText(bloco, start, end, 'end');
        target.dispatchEvent(new Event('input', { bubbles: true }));
    },

    inserirComentarioProfessor(targetId = 'editor-mat-wysiwyg') {
        const target = (typeof targetId === 'string' ? document.getElementById(targetId) : targetId) || document.getElementById('editor-mat-wysiwyg') || document.getElementById('manual-conteudo-wysiwyg') || document.getElementById('editor-mat-conteudo');
        const blocoHTML = `<div class="comentario-professor"><strong>Observação para o Professor:</strong> Digite orientações pedagógicas, critérios de avaliação ou observações aqui...</div><p>&nbsp;</p>`;

        if (!target) return;
        target.focus();
        if (target.isContentEditable || target.contentEditable === 'true') {
            document.execCommand('insertHTML', false, blocoHTML);
            return;
        }

        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        const selectedText = target.value ? (target.value.substring(start, end) || 'Digite orientações pedagógicas, critérios de avaliação ou observações aqui...') : 'Digite orientações pedagógicas, critérios de avaliação ou observações aqui...';

        const bloco = `\n<div class="comentario-professor">\n  <strong>Observação para o Professor:</strong> ${selectedText}\n</div>\n`;

        target.setRangeText(bloco, start, end, 'end');
        target.dispatchEvent(new Event('input', { bubbles: true }));
    },

    inserirRubricaAvaliacao(targetId = 'editor-mat-wysiwyg') {
        const target = (typeof targetId === 'string' ? document.getElementById(targetId) : targetId) || document.getElementById('editor-mat-wysiwyg') || document.getElementById('manual-conteudo-wysiwyg') || document.getElementById('editor-mat-conteudo');
        const blocoHTML = `
<div class="bloco-rubrica-avaliacao" style="margin: 1.5rem 0; padding: 1.25rem; background: #faf5ff; border: 2px solid #e9d5ff; border-radius: var(--radius-xl);">
    <h3 style="color: #6b21a8; font-size: 1.1rem; font-weight: 800; margin-bottom: 0.75rem;">📊 Rubrica Analítica de Avaliação</h3>
    <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 0.5rem; overflow: hidden; font-size: 0.85rem;">
        <thead>
            <tr style="background: #7e22ce; color: #ffffff; text-align: left;">
                <th style="padding: 0.6rem; border: 1px solid #d8b4fe;">Critério</th>
                <th style="padding: 0.6rem; border: 1px solid #d8b4fe;">Excelente (4 pts)</th>
                <th style="padding: 0.6rem; border: 1px solid #d8b4fe;">Satisfatório (3 pts)</th>
                <th style="padding: 0.6rem; border: 1px solid #d8b4fe;">Em Desenvolv. (2 pts)</th>
                <th style="padding: 0.6rem; border: 1px solid #d8b4fe;">Inicial (1 pt)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="padding: 0.6rem; border: 1px solid #e9d5ff; font-weight: 700;">Domínio do Conteúdo</td>
                <td style="padding: 0.6rem; border: 1px solid #e9d5ff;">Demonstra domínio completo dos conceitos.</td>
                <td style="padding: 0.6rem; border: 1px solid #e9d5ff;">Demonstra bom domínio com pequenas imprecisões.</td>
                <td style="padding: 0.6rem; border: 1px solid #e9d5ff;">Apresenta compreensão parcial.</td>
                <td style="padding: 0.6rem; border: 1px solid #e9d5ff;">Compreensão insipiente do tema.</td>
            </tr>
            <tr>
                <td style="padding: 0.6rem; border: 1px solid #e9d5ff; font-weight: 700;">Organização & Clareza</td>
                <td style="padding: 0.6rem; border: 1px solid #e9d5ff;">Estrutura impecável, articulação clara.</td>
                <td style="padding: 0.6rem; border: 1px solid #e9d5ff;">Organizada com boa sequência lógica.</td>
                <td style="padding: 0.6rem; border: 1px solid #e9d5ff;">Estrutura confusa em momentos.</td>
                <td style="padding: 0.6rem; border: 1px solid #e9d5ff;">Falta de sequência e organização.</td>
            </tr>
        </tbody>
    </table>
</div><p>&nbsp;</p>`;

        if (!target) return;
        target.focus();
        if (target.isContentEditable || target.contentEditable === 'true') {
            document.execCommand('insertHTML', false, blocoHTML);
        } else {
            target.value += blocoHTML;
        }
        Toast.show("Rubrica de Avaliação inserida!", "success");
    },

    inserirRoteiroPBL(targetId = 'editor-mat-wysiwyg') {
        const target = (typeof targetId === 'string' ? document.getElementById(targetId) : targetId) || document.getElementById('editor-mat-wysiwyg') || document.getElementById('manual-conteudo-wysiwyg') || document.getElementById('editor-mat-conteudo');
        const blocoHTML = `
<div class="bloco-roteiro-pbl" style="margin: 1.5rem 0; padding: 1.25rem; background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: var(--radius-xl);">
    <h3 style="color: #15803d; font-size: 1.1rem; font-weight: 800; margin-bottom: 0.75rem;">🚀 Roteiro de Aprendizagem Baseada em Projetos (PBL)</h3>
    <div style="background: #ffffff; padding: 1rem; border-radius: 0.5rem; border: 1px solid #86efac; display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.875rem;">
        <div><strong>❓ Pergunta Disparadora / Problema Central:</strong> Como podemos propor uma solução sustentável para...</div>
        <div><strong>🎯 Objetivos do Projeto:</strong> Investigar, colaborar e construir um produto final relevante para a comunidade.</div>
        <div><strong>📅 Fases de Execução:</strong>
            <ol style="margin-top: 0.25rem; padding-left: 1.25rem;">
                <li>Etapa 1: Diagnóstico e pesquisa inicial.</li>
                <li>Etapa 2: Prototipação e desenvolvimento da solução.</li>
                <li>Etapa 3: Apresentação pública (Feira de Projetos / Pitch).</li>
            </ol>
        </div>
        <div><strong>📦 Entregáveis Esperados:</strong> Relatório em grupo, protótipo físico/digital e apresentação oral.</div>
    </div>
</div><p>&nbsp;</p>`;

        if (!target) return;
        target.focus();
        if (target.isContentEditable || target.contentEditable === 'true') {
            document.execCommand('insertHTML', false, blocoHTML);
        } else {
            target.value += blocoHTML;
        }
        Toast.show("Roteiro de Projeto (PBL) inserido!", "success");
    },

    inserirJogoJeopardy(targetId = 'editor-mat-wysiwyg') {
        const target = (typeof targetId === 'string' ? document.getElementById(targetId) : targetId) || document.getElementById('editor-mat-wysiwyg') || document.getElementById('manual-conteudo-wysiwyg') || document.getElementById('editor-mat-conteudo');
        const blocoHTML = `
<div class="bloco-jogo-jeopardy" style="margin: 1.5rem 0; padding: 1.25rem; background: #fff7ed; border: 2px solid #fed7aa; border-radius: var(--radius-xl);">
    <h3 style="color: #c2410c; font-size: 1.1rem; font-weight: 800; margin-bottom: 0.75rem;">🎮 Jogo de Revisão Estilo Jeopardy! (Quiz Show)</h3>
    <table style="width: 100%; border-collapse: collapse; background: #ffffff; text-align: center; font-size: 0.85rem;">
        <thead>
            <tr style="background: #ea580c; color: #ffffff;">
                <th style="padding: 0.6rem; border: 1px solid #fdba74;">Categoria A (Conceitos)</th>
                <th style="padding: 0.6rem; border: 1px solid #fdba74;">Categoria B (Resolução)</th>
                <th style="padding: 0.6rem; border: 1px solid #fdba74;">Categoria C (Desafio)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="padding: 0.6rem; border: 1px solid #fed7aa; font-weight: 800; color: #c2410c;">100 Pts</td>
                <td style="padding: 0.6rem; border: 1px solid #fed7aa; font-weight: 800; color: #c2410c;">100 Pts</td>
                <td style="padding: 0.6rem; border: 1px solid #fed7aa; font-weight: 800; color: #c2410c;">100 Pts</td>
            </tr>
            <tr>
                <td style="padding: 0.6rem; border: 1px solid #fed7aa; font-weight: 800; color: #c2410c;">200 Pts</td>
                <td style="padding: 0.6rem; border: 1px solid #fed7aa; font-weight: 800; color: #c2410c;">200 Pts</td>
                <td style="padding: 0.6rem; border: 1px solid #fed7aa; font-weight: 800; color: #c2410c;">200 Pts</td>
            </tr>
            <tr>
                <td style="padding: 0.6rem; border: 1px solid #fed7aa; font-weight: 800; color: #c2410c;">300 Pts</td>
                <td style="padding: 0.6rem; border: 1px solid #fed7aa; font-weight: 800; color: #c2410c;">300 Pts</td>
                <td style="padding: 0.6rem; border: 1px solid #fed7aa; font-weight: 800; color: #c2410c;">300 Pts</td>
            </tr>
        </tbody>
    </table>
</div><p>&nbsp;</p>`;

        if (!target) return;
        target.focus();
        if (target.isContentEditable || target.contentEditable === 'true') {
            document.execCommand('insertHTML', false, blocoHTML);
        } else {
            target.value += blocoHTML;
        }
        Toast.show("Jogo Jeopardy inserido!", "success");
    },

    inserirChoiceBoardDUA(targetId = 'editor-mat-wysiwyg') {
        const target = (typeof targetId === 'string' ? document.getElementById(targetId) : targetId) || document.getElementById('editor-mat-wysiwyg') || document.getElementById('manual-conteudo-wysiwyg') || document.getElementById('editor-mat-conteudo');
        const blocoHTML = `
<div class="bloco-choice-board" style="margin: 1.5rem 0; padding: 1.25rem; background: #f5f3ff; border: 2px solid #c7d2fe; border-radius: var(--radius-xl);">
    <h3 style="color: #4338ca; font-size: 1.1rem; font-weight: 800; margin-bottom: 0.75rem;">🎯 Quadro de Opções (Choice Board - DUA 3x3)</h3>
    <p style="font-size: 0.8125rem; color: #475569; margin-bottom: 0.75rem;">Escolha 1 atividade de cada coluna ou 3 em linha reta para concluir a tarefa:</p>
    <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 0.5rem; overflow: hidden; font-size: 0.85rem; text-align: center;">
        <thead>
            <tr style="background: #4f46e5; color: #ffffff;">
                <th style="padding: 0.6rem; border: 1px solid #a5b4fc; width: 33%;">Visual / Gráfico</th>
                <th style="padding: 0.6rem; border: 1px solid #a5b4fc; width: 33%;">Escrito / Analítico</th>
                <th style="padding: 0.6rem; border: 1px solid #a5b4fc; width: 33%;">Prático / Oral</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="padding: 0.75rem; border: 1px solid #c7d2fe; background: #f8fafc;">Crie um Mapa Mental ou Infográfico ilustrando o conceito.</td>
                <td style="padding: 0.75rem; border: 1px solid #c7d2fe; background: #ffffff;">Escreva um resumo explicativo de 2 parágrafos com exemplos.</td>
                <td style="padding: 0.75rem; border: 1px solid #c7d2fe; background: #f8fafc;">Grave um áudio ou vídeo de 1 min apresentando a ideia.</td>
            </tr>
            <tr>
                <td style="padding: 0.75rem; border: 1px solid #c7d2fe; background: #ffffff;">Desenhe uma tirinha ou diagrama explicativo.</td>
                <td style="padding: 0.75rem; border: 1px solid #c7d2fe; background: #f8fafc;">Elabore um questionário com 3 perguntas e respostas.</td>
                <td style="padding: 0.75rem; border: 1px solid #c7d2fe; background: #ffffff;">Crie uma maquete ou protótipo físico simplificado.</td>
            </tr>
        </tbody>
    </table>
</div><p>&nbsp;</p>`;

        if (!target) return;
        target.focus();
        if (target.isContentEditable || target.contentEditable === 'true') {
            document.execCommand('insertHTML', false, blocoHTML);
        } else {
            target.value += blocoHTML;
        }
        Toast.show("Quadro DUA inserido com sucesso!", "success");
    },

    inserirRoteiroLaboratorio(targetId = 'editor-mat-wysiwyg') {
        const target = (typeof targetId === 'string' ? document.getElementById(targetId) : targetId) || document.getElementById('editor-mat-wysiwyg') || document.getElementById('manual-conteudo-wysiwyg') || document.getElementById('editor-mat-conteudo');
        const blocoHTML = `
<div class="bloco-roteiro-lab" style="margin: 1.5rem 0; padding: 1.25rem; background: #ecfeff; border: 2px solid #a5f3fc; border-radius: var(--radius-xl);">
    <h3 style="color: #0891b2; font-size: 1.1rem; font-weight: 800; margin-bottom: 0.75rem;">🥼 Roteiro de Prática de Laboratório / Experimento</h3>
    <div style="background: #ffffff; padding: 1rem; border-radius: 0.5rem; border: 1px solid #67e8f9; display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.875rem;">
        <div><strong>🧪 Tema do Experimento:</strong> Investigação sobre...</div>
        <div><strong>❓ Pergunta / Hipótese:</strong> O que acontece quando misturamos/submetemos X a Y?</div>
        <div><strong>🧰 Materiais Necessários:</strong>
            <ul style="margin-top: 0.25rem; padding-left: 1.25rem;">
                <li>Béquer / Recipiente graduado (250 ml).</li>
                <li>Reagente / Amostra A e B.</li>
                <li>Cronômetro e fita indicadora de pH.</li>
            </ul>
        </div>
        <div><strong>📋 Procedimento Passo a Passo:</strong>
            <ol style="margin-top: 0.25rem; padding-left: 1.25rem;">
                <li>Meça 100 ml da substância A no recipiente.</li>
                <li>Adicione gradualmente 5g da substância B sob agitação.</li>
                <li>Anote o tempo de reação e a variação de temperatura.</li>
            </ol>
        </div>
        <div><strong>📊 Coleta de Dados & Conclusão:</strong> Registre as observações na tabela abaixo e responda às questões no caderno.</div>
    </div>
</div><p>&nbsp;</p>`;

        if (!target) return;
        target.focus();
        if (target.isContentEditable || target.contentEditable === 'true') {
            document.execCommand('insertHTML', false, blocoHTML);
        } else {
            target.value += blocoHTML;
        }
        Toast.show("Roteiro de Laboratório inserido!", "success");
    },

    async salvarEdicaoMaterial() {
        const inputTitulo = document.getElementById('editor-mat-titulo');
        const inputTema = document.getElementById('editor-mat-tema');
        const selectSerie = document.getElementById('editor-mat-serie');
        const selectDisciplina = document.getElementById('editor-mat-disciplina');
        const inputBncc = document.getElementById('editor-mat-bncc');

        const wysiwyg = document.getElementById('editor-mat-wysiwyg');
        const textareaConteudo = document.getElementById('editor-mat-conteudo');

        let novoConteudo = '';

        if (wysiwyg && wysiwyg.innerHTML.trim() !== '') {
            novoConteudo = wysiwyg.innerHTML;
        } else if (textareaConteudo) {
            novoConteudo = textareaConteudo.value;
        }

        if (!novoConteudo || !novoConteudo.trim()) {
            return Toast.show("O conteúdo do material não pode ficar vazio.", "warning");
        }

        let conteudoHtml = novoConteudo;
        if (window.criarMaterialView && typeof window.criarMaterialView.converterMarkdownParaHtml === 'function') {
            if (!novoConteudo.includes('<h2') && !novoConteudo.includes('<h3') && !novoConteudo.includes('<div') && !novoConteudo.includes('<p>')) {
                conteudoHtml = window.criarMaterialView.converterMarkdownParaHtml(novoConteudo);
            }
        }

        const material = (model.state.materiaisGerados || []).find(m => m.id === this.materialIdAtual);
        const novoTitulo = inputTitulo ? inputTitulo.value.trim() : (material ? (material.titulo || material.tema) : '');
        const novoTema = inputTema ? inputTema.value.trim() : (material ? (material.tema || material.titulo) : '');
        const novaSerie = selectSerie ? selectSerie.value.trim() : (material ? (material.serie || material.turma) : '');
        const novaDisciplina = selectDisciplina ? selectDisciplina.value.trim() : (material ? (material.disciplina || material.materia) : '');
        const novaBncc = inputBncc ? inputBncc.value.trim() : (material ? (material.bncc || material.habilidade_bncc) : '');

        try {
            const dadosAtualizados = {
                conteudo_html: conteudoHtml,
                raw_markdown: novoConteudo,
                titulo: novoTitulo,
                tema: novoTema,
                serie: novaSerie,
                turma: novaSerie,
                turma_ano: novaSerie,
                disciplina: novaDisciplina,
                materia: novaDisciplina,
                bncc: novaBncc,
                habilidade_bncc: novaBncc,
                habilidade: novaBncc,
                codigo_bncc: novaBncc
            };

            await model.updateMaterial(this.materialIdAtual, dadosAtualizados);

            if (material) {
                Object.assign(material, dadosAtualizados);
            }

            if (typeof this._editorCleanup === 'function') {
                this._editorCleanup();
                this._editorCleanup = null;
            }
            controller.closeModal();
            Toast.show("Material e metadados organizacionais atualizados com sucesso!", "success");
            this.render('view-container');
            if (typeof renderKatex === 'function') {
                renderKatex(document.getElementById('view-container'));
            }
        } catch (err) {
            console.error("Erro ao salvar edição:", err);
            Toast.show("Erro ao salvar alterações no material.", "error");
        }
    },

    baixarWord(id, comGabarito) {
        const material = (model.state.materiaisGerados || []).find(m => m.id === id);
        if (!material) return Toast.show("Material não encontrado para exportação.", "error");

        const modo = comGabarito ? 'professor' : 'aluno';
        const htmlLimpo = prepararHTMLParaExportacao(material.conteudo_html || '', modo);

        Toast.show(`Baixando Versão ${comGabarito ? 'do Professor (Com Gabarito)' : 'do Aluno (Sem Gabarito)'}...`, "info");

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlLimpo;
        renderKatex(tempDiv);

        // Remove elementos ocultos MathML do KaTeX que o MS Word renderiza duplicados em texto
        tempDiv.querySelectorAll('.katex-mathml').forEach(el => el.remove());

        const sufixo = comGabarito ? '_professor_gabarito' : '_aluno';
        const nomeArquivo = ((material.titulo || material.tema || 'Atividade').replace(/[^a-z0-9]/gi, '_').toLowerCase()) + sufixo;

        const header = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>${window.escapeHTML(material.titulo || 'Material Pedagógico')}</title>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
                <style>
                    body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; padding: 30px; color: #1e293b; }
                    h1 { color: #1e293b; font-size: 20pt; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
                    h2 { color: #334155; font-size: 16pt; margin-top: 20px; }
                    h3 { color: #475569; font-size: 13pt; }
                    p, li { line-height: 1.6; color: #334155; font-size: 11pt; }
                    ul, ol { padding-left: 24px; margin-bottom: 14px; }
                    li { margin-bottom: 6px; }
                    .gabarito-bloco, .gabarito { background-color: #ecfdf5; border: 1px solid #a7f3d0; border-left: 5px solid #059669; padding: 14px 18px; margin: 15px 0; border-radius: 8px; }
                    .gabarito-bloco h3, .gabarito-bloco h4 { color: #065f46; margin-top: 0; }
                    .comentario-professor { background-color: #fefce8; border-left: 4px solid #ca8a04; padding: 10px; }
                    .laboratorio-seguranca { background-color: #fef2f2; border: 1.5px solid #fecaca; border-left: 4px solid #ef4444; padding: 12px; margin: 15px 0; color: #991b1b; }
                    .laboratorio-seguranca h3 { color: #b91c1c; }
                    .etapa-experimento { background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #4f46e5; padding: 10px 14px; margin: 12px 0; }
                    .tabela-experimento { width: 100%; border-collapse: collapse; margin: 16px 0; border: 2px solid #cbd5e1; }
                    .tabela-experimento th { background-color: #f1f5f9; color: #334155; font-weight: bold; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
                    .tabela-experimento td { border: 1px solid #cbd5e1; padding: 10px; min-height: 30px; }
                    .katex { font-size: 1.1em; }
                </style>
            </head>
            <body>
        `;
        const footer = "</body></html>";
        const sourceHTML = header + tempDiv.innerHTML + footer;

        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = `${nomeArquivo}.doc`;
        fileDownload.click();
        document.body.removeChild(fileDownload);
    },

    copiarTextoFormatado() {
        const material = (model.state.materiaisGerados || []).find(m => m.id === this.materialIdAtual);
        if (!material || !material.conteudo_html) {
            return Toast.show("Nenhum material carregado para cópia.", "warning");
        }

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = material.conteudo_html;

        // Converte o HTML em texto formatado limpo preservando quebras de linha
        const textoLimpo = (tempDiv.innerText || tempDiv.textContent || '').trim();

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textoLimpo)
                .then(() => Toast.show("Conteúdo copiado para a área de transferência!", "success"))
                .catch(() => Toast.show("Erro ao copiar texto para a área de transferência.", "error"));
        } else {
            Toast.show("Recurso de cópia não suportado neste navegador.", "warning");
        }
    },

    modalImprimir() {
        this.abrirOpcoesImpressao();
    },

    abrirOpcoesImpressao() {
        const material = (model.state.materiaisGerados || []).find(m => m.id === this.materialIdAtual);
        if (!material) return Toast.show("Nenhum material carregado para impressão.", "error");

        const html = `
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                <div style="text-align: center;">
                    <h3 style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-800); margin: 0 0 0.25rem 0;">Configurações de Impressão & PDF</h3>
                    <p style="font-size: 0.8125rem; color: var(--color-slate-500); margin: 0;">Personalize o layout de colunas, fontes e gabarito para sala de aula ou arquivo:</p>
                </div>

                <!-- 1. PERFIL DA VERSÃO -->
                <div>
                    <label class="form-label" style="font-weight: 800; color: #334155; margin-bottom: 0.5rem;">1. Versão do Documento</label>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem;">
                        <label id="lbl-tipo-aluno" class="card interactive-element" style="padding: 0.75rem; border: 2px solid #3b82f6; background-color: #eff6ff; cursor: pointer; display: flex; align-items: center; gap: 0.75rem;">
                            <input type="radio" name="print-tipo" value="aluno" checked onchange="conteudoGeradoView.atualizarSelecaoPrintTipo(this.value)">
                            <div>
                                <strong style="font-size: 0.875rem; color: #1d4ed8; display: block;"><i class="fas fa-user-graduate"></i> Versão Aluno</strong>
                                <span style="font-size: 0.6875rem; color: #64748b;">Sem respostas/gabarito.</span>
                            </div>
                        </label>

                        <label id="lbl-tipo-professor" class="card interactive-element" style="padding: 0.75rem; border: 2px solid #e2e8f0; background-color: #ffffff; cursor: pointer; display: flex; align-items: center; gap: 0.75rem;">
                            <input type="radio" name="print-tipo" value="professor" onchange="conteudoGeradoView.atualizarSelecaoPrintTipo(this.value)">
                            <div>
                                <strong style="font-size: 0.875rem; color: #15803d; display: block;"><i class="fas fa-chalkboard-teacher"></i> Guia Professor</strong>
                                <span style="font-size: 0.6875rem; color: #64748b;">Com gabarito comentado.</span>
                            </div>
                        </label>

                        <label id="lbl-tipo-acessivel" class="card interactive-element" style="padding: 0.75rem; border: 2px solid #e2e8f0; background-color: #ffffff; cursor: pointer; display: flex; align-items: center; gap: 0.75rem;">
                            <input type="radio" name="print-tipo" value="acessivel" onchange="conteudoGeradoView.atualizarSelecaoPrintTipo(this.value)">
                            <div>
                                <strong style="font-size: 0.875rem; color: #c2410c; display: block;"><i class="fas fa-universal-access"></i> Acessível (AEE)</strong>
                                <span style="font-size: 0.6875rem; color: #64748b;">Alto contraste e fonte ampliada.</span>
                            </div>
                        </label>
                    </div>
                </div>

                <!-- 2. DIAGRAMAÇÃO DE COLUNAS & FONTE -->
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-xl); padding: 1rem; display: flex; flex-direction: column; gap: 0.875rem;">
                    <h4 style="font-size: 0.8125rem; font-weight: 800; color: #475569; margin: 0; text-transform: uppercase;">2. Diagramação & Economia de Folhas</h4>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem;">
                        <div>
                            <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Distribuição de Colunas</label>
                            <select id="print-colunas" class="form-select" style="font-size: 0.8125rem;">
                                <option value="1">1 Coluna (Padrão)</option>
                                <option value="2" selected>2 Colunas (Estilo ENEM / Econômico)</option>
                            </select>
                        </div>

                        <div>
                            <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Tamanho da Tipografia</label>
                            <select id="print-tamanho-fonte" class="form-select" style="font-size: 0.8125rem;">
                                <option value="compacto">Compacto (10pt - Máxima economia)</option>
                                <option value="normal" selected>Normal (11.5pt - Padrão)</option>
                                <option value="amplo">Ampliado (13.5pt - Mais legibilidade)</option>
                            </select>
                        </div>

                        <div>
                            <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Espaçamento & Entrelinhas</label>
                            <select id="print-espacamento" class="form-select" style="font-size: 0.8125rem;">
                                <option value="padrao_4_2" selected>Simples (4pt antes / 2pt depois - Padrão)</option>
                                <option value="maxima_1_1">Máxima Compactação (Linha 1.0, 1pt antes / 1pt depois)</option>
                                <option value="compacto_2_1">Compacto Equilibrado (Linha 1.15, 2pt antes / 1pt depois)</option>
                                <option value="confortavel_6_4">Confortável (Linha 1.5, 6pt antes / 4pt depois)</option>
                            </select>
                        </div>

                        <div>
                            <label class="form-label" style="font-size: 0.75rem; font-weight: 700;">Cabeçalho Escolar</label>
                            <select id="print-cabecalho" class="form-select" style="font-size: 0.8125rem;">
                                <option value="completo" selected>Completo (Escola, Aluno, Nota)</option>
                                <option value="compacto">Compacto (Linha única)</option>
                                <option value="sem">Sem Cabeçalho (Papel timbrado)</option>
                            </select>
                        </div>
                    </div>

                    <!-- OPÇÕES ESPECÍFICAS DE GABARITO E RASCUNHO -->
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.25rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; color: #334155; cursor: pointer;">
                            <input type="checkbox" id="print-gabarito-pagina-separada" value="1">
                            <span><strong>Gabarito em folha separada:</strong> Inicia o gabarito comentado em nova página para destacar antes de entregar aos alunos.</span>
                        </label>

                        <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; color: #334155; cursor: pointer;">
                            <input type="checkbox" id="print-espaco-rascunho" value="1">
                            <span><strong>Espaço para resolução / rascunho:</strong> Adiciona espaçamento pontilhado para cálculos entre questões.</span>
                        </label>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; margin-top: 0.25rem; flex-wrap: wrap;">
                    <div style="display: flex; gap: 0.5rem;">
                                         <button type="button" onclick="conteudoGeradoView.exportarParaWord('docx')" class="btn-secondary interactive-element" style="display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 700; border-color: #2563eb; color: #1e40af; background-color: #eff6ff;" title="Baixar documento nativo do Word (.docx) com equações OMML">
                            <i class="fas fa-file-word text-blue-600"></i> Word (.docx)
                        </button>
                        <button type="button" onclick="conteudoGeradoView.exportarParaWord('doc')" class="btn-secondary interactive-element" style="display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 700; border-color: #cbd5e1; color: #475569;" title="Baixar documento compatível do Word (.doc)">
                            <i class="fas fa-file-word text-slate-500"></i> (.doc)
                        </button>
                    </div>
                    <div style="display: flex; gap: 0.75rem;">
                        <button type="button" onclick="controller.closeModal()" class="btn-secondary">Cancelar</button>
                        <button type="button" onclick="conteudoGeradoView.dispararImpressaoCustomizada()" class="btn-primary interactive-element" style="background-color: #4f46e5; padding: 0.6rem 1.5rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-print"></i> Abrir Impressão / PDF
                        </button>
                    </div>
                </div>
            </div>`;
        controller.openModal('Impressão & Exportação em PDF', html);
    },

    exportarParaWord(formato = 'docx') {
        const material = (model.state.materiaisGerados || []).find(m => m.id === this.materialIdAtual);
        if (!material) {
            Toast.show("Material não encontrado para exportação.", "error");
            return;
        }

        const config = this.obterConfiguracoesImpressaoModal();
        const htmlDoc = this.montarHTMLDocumentoImpressao(config, false);
        if (!htmlDoc) return;

        const nomeArquivo = (material.titulo || material.tema || 'material_pedagogico')
            .replace(/[\/\\:\*\?"<>\|]/g, '_')
            .replace(/\s+/g, '_')
            .trim();

        if (window.exportarMaterialWord) {
            window.exportarMaterialWord(htmlDoc, nomeArquivo, formato);
        } else {
            const htmlComEquacoes = window.converterHtmlLatexParaWordEquations
                ? window.converterHtmlLatexParaWordEquations(htmlDoc)
                : htmlDoc;
            const blob = new Blob(['\ufeff' + htmlComEquacoes], { type: 'application/msword;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${nomeArquivo}.doc`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        controller.closeModal();
        Toast.show(`Material exportado para o Word (.${formato}) com equações nativas (OMML/MathML)!`, "success");
    },

    atualizarSelecaoPrintTipo(tipo) {
        const lblAluno = document.getElementById('lbl-tipo-aluno');
        const lblProf = document.getElementById('lbl-tipo-professor');
        const lblAcess = document.getElementById('lbl-tipo-acessivel');
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
        const tipo = document.querySelector('input[name="print-tipo"]:checked')?.value || 'aluno';
        const colunas = parseInt(document.getElementById('print-colunas')?.value || '2', 10);
        const tamanhoFonte = document.getElementById('print-tamanho-fonte')?.value || 'normal';
        const espacamento = document.getElementById('print-espacamento')?.value || 'padrao_4_2';
        const cabecalho = document.getElementById('print-cabecalho')?.value || 'completo';
        const gabaritoSeparado = Boolean(document.getElementById('print-gabarito-pagina-separada')?.checked);
        const espacoRascunho = Boolean(document.getElementById('print-espaco-rascunho')?.checked);

        return {
            tipo,
            colunas,
            tamanhoFonte,
            espacamento,
            cabecalho,
            gabaritoSeparado,
            espacoRascunho
        };
    },

    dispararImpressaoCustomizada() {
        const config = this.obterConfiguracoesImpressaoModal();
        controller.closeModal();
        this.gerarDocumentoImpressao(config);
    },

    abrirPreviaImpressao() {
        const config = this.obterConfiguracoesImpressaoModal();
        const htmlDoc = this.montarHTMLDocumentoImpressao(config, false);
        if (!htmlDoc) return;

        const modalHtml = `
            <div style="display: flex; flex-direction: column; gap: 1rem; height: 82vh;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.75rem;">
                    <div>
                        <h3 style="font-size: 1.125rem; font-weight: 800; color: #1e293b; margin: 0;">Prévia de Impressão (A4)</h3>
                        <p style="font-size: 0.75rem; color: #64748b; margin: 0;">Visualização em tempo real da diagramação antes de enviar para impressão/PDF.</p>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" onclick="conteudoGeradoView.gerarDocumentoImpressao(conteudoGeradoView.tempPreviaConfig)" class="btn-primary interactive-element" style="background-color: #4f46e5; font-size: 0.8125rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1.25rem;">
                            <i class="fas fa-print"></i> Imprimir / Gerar PDF
                        </button>
                        <button type="button" onclick="conteudoGeradoView.abrirOpcoesImpressao()" class="btn-secondary" style="font-size: 0.8125rem; font-weight: 700;">
                            <i class="fas fa-sliders-h"></i> Ajustar Opções
                        </button>
                    </div>
                </div>

                <div style="flex: 1; background: #e2e8f0; border-radius: 0.75rem; overflow: auto; display: flex; justify-content: center; padding: 1.25rem;">
                    <div style="width: 100%; max-width: 820px; min-height: 100%; background: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border-radius: 4px; overflow: hidden; display: flex; flex-direction: column;">
                        <iframe id="iframe-previa-impressao" style="width: 100%; height: 100%; min-height: 68vh; border: none; flex: 1;"></iframe>
                    </div>
                </div>
            </div>
        `;

        this.tempPreviaConfig = config;
        controller.openModal('Prévia de Impressão', modalHtml);

        setTimeout(() => {
            const iframe = document.getElementById('iframe-previa-impressao');
            if (iframe) {
                const doc = iframe.contentWindow.document;
                doc.open();
                doc.write(htmlDoc);
                doc.close();
            }
        }, 60);
    },

    montarHTMLDocumentoImpressao(configOuTipo = 'aluno', forPrint = true) {
        const material = (model.state.materiaisGerados || []).find(m => m.id === this.materialIdAtual);
        if (!material) {
            Toast.show("Material não encontrado para impressão.", "error");
            return null;
        }

        const opts = typeof configOuTipo === 'string'
            ? { tipo: configOuTipo, colunas: 1, tamanhoFonte: 'normal', espacamento: 'padrao_4_2', cabecalho: 'completo', gabaritoSeparado: false, espacoRascunho: false }
            : configOuTipo;

        const isProf = opts.tipo === 'professor';
        const isAcessivel = opts.tipo === 'acessivel';
        const colunas = opts.colunas || 1;
        const cabecalho = opts.cabecalho || 'completo';
        const gabaritoSeparado = opts.gabaritoSeparado || false;
        const espacoRascunho = opts.espacoRascunho || false;
        const espacamento = opts.espacamento || 'padrao_4_2';

        let fontSizeStr = '11.5pt';
        if (opts.tamanhoFonte === 'compacto') fontSizeStr = '10pt';
        if (opts.tamanhoFonte === 'amplo' || isAcessivel) fontSizeStr = '13.5pt';

        let tblFontSize = '9.5pt';
        if (opts.tamanhoFonte === 'compacto') tblFontSize = '8.5pt';
        else if (opts.tamanhoFonte === 'amplo') tblFontSize = '11pt';
        else if (isAcessivel) tblFontSize = '12pt';

        let h1Size = '17.5px';
        let h2Size = '15.5px';
        let h3Size = '14px';
        let h4Size = '12.5px';
        if (opts.tamanhoFonte === 'compacto') {
            h1Size = '16px';
            h2Size = '14px';
            h3Size = '12.5px';
            h4Size = '11.5px';
        } else if (opts.tamanhoFonte === 'amplo' || isAcessivel) {
            h1Size = isAcessivel ? '20px' : '19px';
            h2Size = isAcessivel ? '17.5px' : '16.5px';
            h3Size = isAcessivel ? '16px' : '15px';
            h4Size = isAcessivel ? '14px' : '13.5px';
        }

        // Definição de entrelinhas e espaçamentos antes/depois
        let lineHeight = '1.25';
        let marginAntes = '4pt';
        let marginDepois = '2pt';
        let itemMarginDepois = '2pt';

        if (espacamento === 'maxima_1_1') {
            lineHeight = '1.05';
            marginAntes = '1pt';
            marginDepois = '1pt';
            itemMarginDepois = '1pt';
        } else if (espacamento === 'compacto_2_1') {
            lineHeight = '1.15';
            marginAntes = '2pt';
            marginDepois = '1pt';
            itemMarginDepois = '1.5pt';
        } else if (espacamento === 'confortavel_6_4' || isAcessivel) {
            lineHeight = isAcessivel ? '1.8' : '1.5';
            marginAntes = isAcessivel ? '8pt' : '6pt';
            marginDepois = isAcessivel ? '6pt' : '4pt';
            itemMarginDepois = isAcessivel ? '6pt' : '4pt';
        }

        let nomeProf = model.state.userConfig?.profName || '__________________________';
        if ((!model.state.userConfig?.profName || model.state.userConfig.profName.trim() === '') && model.currentUser) {
            nomeProf = model.currentUser.displayName || '__________________________';
        }
        const logoUrl = model.state.userConfig?.logo || '';
        const nomeEscola = model.state.userConfig?.schoolName || '________________________________________________';

        let htmlProcessado = this.processarHTMLParaModo(material.conteudo_html || '', isProf ? 'professor' : 'aluno');
        
        // Se a opção de rascunho estiver ativa, insere caixa de cálculo nos itens de questão
        if (espacoRascunho && !isProf) {
            htmlProcessado = htmlProcessado.replace(/<\/li>/g, '<div class="espaco-rascunho-box"></div></li>');
        }

        const tituloDocumento = isProf
            ? `GUIA DO PROFESSOR: ${material.titulo || material.tema || 'Material Pedagógico'}`
            : isAcessivel
                ? `DOCUMENTO ADAPTADO (AEE): ${material.titulo || material.tema || 'Material Pedagógico'}`
                : `${material.titulo || material.tema || 'Material Pedagógico'}`;

        const estiloImpressao = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=Roboto:wght@400;500;700&display=swap');
                
                * { 
                    box-sizing: border-box; 
                    -webkit-print-color-adjust: exact !important; 
                    print-color-adjust: exact !important; 
                    color-adjust: exact !important; 
                }
                body { 
                    font-family: ${isAcessivel ? "'Atkinson Hyperlegible', Arial, sans-serif" : "'Roboto', Arial, sans-serif"}; 
                    padding: ${forPrint ? '30px 40px' : '20px 25px'}; 
                    color: #1e293b; 
                    font-size: ${fontSizeStr};
                    line-height: ${lineHeight};
                    letter-spacing: ${isAcessivel ? '0.03em' : 'normal'};
                    background-color: #ffffff;
                }
                
                mark, span[style*="background"], font[style*="background"] {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                
                .header { 
                    display: flex; 
                    align-items: center; 
                    justify-content: space-between; 
                    border: ${isAcessivel ? '2px solid #000' : '1px solid #334155'}; 
                    padding: 10px 14px; 
                    margin-bottom: ${marginDepois}; 
                    border-radius: 6px; 
                }
                .header-info { flex: 1; min-width: 0; }
                .header-info p { margin: 2pt 0; font-size: ${isAcessivel ? '14px' : '12px'}; font-weight: 500; line-height: 1.2; }
                .header-logo { max-width: 75px; max-height: 75px; object-fit: contain; margin-left: 16px; flex-shrink: 0; }
                
                .titulo-documento { 
                    text-align: center; 
                    text-transform: uppercase; 
                    font-weight: 800; 
                    font-size: ${isAcessivel ? '18px' : '15px'}; 
                    margin-bottom: 12px; 
                    border-bottom: 2px solid #1e293b; 
                    padding-bottom: 4px; 
                    color: #0f172a;
                }
                
                .conteudo-principal {
                    font-size: ${fontSizeStr};
                    line-height: ${lineHeight};
                    ${colunas === 2 ? `
                        column-count: 2;
                        column-gap: 24px;
                        column-rule: 1px solid #cbd5e1;
                        text-align: justify;
                    ` : ''}
                }

                .conteudo-principal p, 
                .conteudo-principal ol > li, 
                .conteudo-principal ul > li,
                .conteudo-principal .questao-item,
                .conteudo-principal .etapa-experimento,
                .conteudo-principal table,
                .conteudo-principal .planner-table-wrapper,
                .conteudo-principal .bloco-rubrica-avaliacao,
                .conteudo-principal .bloco-jogo-jeopardy,
                .conteudo-principal figure,
                .conteudo-principal img {
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                    margin-top: ${marginAntes};
                    margin-bottom: ${itemMarginDepois};
                    line-height: ${lineHeight};
                }

                .conteudo-principal img {
                    max-width: 100% !important;
                    height: auto !important;
                    object-fit: contain;
                    border-radius: 6px;
                    ${colunas === 2 ? 'max-height: 380px !important;' : 'max-height: 580px !important;'}
                }

                table {
                    width: 100% !important;
                    max-width: 100% !important;
                    border-collapse: collapse;
                    margin: 8px 0;
                    box-sizing: border-box !important;
                    table-layout: auto;
                    font-size: ${tblFontSize};
                    line-height: 1.35;
                }

                th, td {
                    border: 1px solid #cbd5e1;
                    padding: 4px 8px;
                    text-align: left;
                    vertical-align: middle;
                    box-sizing: border-box;
                    word-break: normal;
                    overflow-wrap: anywhere;
                }

                th {
                    background-color: #f1f5f9;
                    font-weight: bold;
                    color: #0f172a;
                }

                h1 { font-size: ${h1Size}; color: #0f172a; page-break-after: avoid; }
                h2 { font-size: ${h2Size}; color: #0f172a; page-break-after: avoid; }
                h3 { font-size: ${h3Size}; color: #0f172a; page-break-after: avoid; margin-top: ${marginAntes}; margin-bottom: ${marginDepois}; }
                h4 { font-size: ${h4Size}; color: #0f172a; page-break-after: avoid; }
                p, li, .conteudo-principal div, .conteudo-principal span { font-size: inherit; line-height: inherit; }
                p, li { color: #334155; }
                ul, ol { padding-left: 18px; margin-top: ${marginAntes}; margin-bottom: ${marginDepois}; }
                
                .gabarito-bloco, .gabarito { 
                    column-span: all !important;
                    background-color: #ecfdf5 !important; 
                    border: 1px solid #a7f3d0 !important; 
                    border-left: 5px solid #059669 !important; 
                    border-radius: 8px; 
                    padding: 10px 14px; 
                    margin: 14px 0 10px 0; 
                    break-inside: avoid;
                    page-break-inside: avoid;
                    ${gabaritoSeparado ? 'page-break-before: always !important; break-before: page !important;' : ''}
                }
                .gabarito-bloco h3, .gabarito-bloco h4 { color: #065f46; margin-top: 0; }

                .comentario-professor { 
                    column-span: all !important;
                    background-color: #fefce8 !important; 
                    border: 1px solid #fef08a !important; 
                    border-left: 4px solid #ca8a04 !important; 
                    padding: 10px 14px; 
                    margin: 12px 0; 
                    border-radius: 6px; 
                }

                .espaco-rascunho-box {
                    min-height: 50px;
                    border: 1px dashed #cbd5e1;
                    background-color: #f8fafc;
                    border-radius: 6px;
                    margin: 8px 0 12px 0;
                }

                .laboratorio-seguranca { 
                    background-color: #fef2f2 !important; 
                    border: 1.5px solid #fecaca !important; 
                    border-left: 5px solid #ef4444 !important; 
                    border-radius: 8px; 
                    padding: 12px 16px; 
                    margin: 16px 0; 
                    color: #991b1b;
                    break-inside: avoid;
                }
                
                .etapa-experimento { 
                    background-color: #f8fafc !important; 
                    border: 1px solid #e2e8f0 !important; 
                    border-left: 4px solid #4f46e5 !important; 
                    border-radius: 6px; 
                    padding: 10px 14px; 
                    margin: 12px 0; 
                    break-inside: avoid;
                }
                
                .btn-voltar {
                    position: fixed; top: 16px; right: 16px; z-index: 9999;
                    background-color: #ef4444; color: #ffffff;
                    border: none; border-radius: 8px; padding: 10px 16px;
                    font-weight: bold; cursor: pointer;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                    font-family: sans-serif; text-transform: uppercase; font-size: 12px;
                    transition: background-color 0.2s ease;
                }
                .btn-voltar:hover { background-color: #dc2626; }

                @media print {
                    .no-print, .btn-voltar { display: none !important; }
                    body { padding: 0; background: transparent; }
                    .header { border-color: #000; }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            </style>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"><\/script>
            <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"><\/script>
        `;

        const renderCabecalhoHtml = () => {
            if (cabecalho === 'sem') return '';
            if (cabecalho === 'compacto') {
                return `
                    <div class="header" style="padding: 8px 12px; margin-bottom: 12px;">
                        <div class="header-info">
                            <p style="margin: 0 0 4px 0;"><strong>ESCOLA:</strong> ${window.escapeHTML(nomeEscola)} &nbsp;|&nbsp; <strong>PROF:</strong> ${window.escapeHTML(nomeProf)} &nbsp;|&nbsp; <strong>DISC:</strong> ${window.escapeHTML(material.disciplina || 'Geral')}</p>
                            ${!isProf ? `
                                <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: ${isAcessivel ? '13px' : '11.5px'};">
                                    <span style="flex: 1; display: flex; align-items: baseline;"><strong>ALUNO:</strong> <span style="flex: 1; border-bottom: 1px solid #000; margin-left: 6px;"></span></span>
                                    <span style="white-space: nowrap;"><strong>DATA:</strong> ___/___/2026</span>
                                    <span style="white-space: nowrap;"><strong>TURMA:</strong> <span style="display: inline-block; width: 45px; border-bottom: 1px solid #000; margin-left: 4px;"></span></span>
                                    <span style="white-space: nowrap;"><strong>NOTA:</strong> &nbsp;&nbsp;&nbsp;&nbsp;</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }
            return `
                <div class="header">
                    <div class="header-info">
                        <p style="margin: 0 0 6px 0;"><strong>ESCOLA:</strong> ${window.escapeHTML(nomeEscola)}</p>
                        <div style="display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px 12px; margin-bottom: 6px; font-size: ${isAcessivel ? '13.5px' : '12px'};">
                            <span><strong>PROFESSOR(A):</strong> ${window.escapeHTML(nomeProf)}</span>
                            <span><strong>DISCIPLINA:</strong> ${window.escapeHTML(material.disciplina || 'Geral')}</span>
                            <span><strong>SÉRIE/ANO:</strong> ${window.escapeHTML(material.serie || '-')}</span>
                            <span style="white-space: nowrap;"><strong>TURMA:</strong> <span style="display: inline-block; width: 50px; border-bottom: 1px solid #000; margin-left: 4px;"></span></span>
                        </div>
                        ${!isProf ? `
                            <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: ${isAcessivel ? '13.5px' : '12px'};">
                                <span style="flex: 1; display: flex; align-items: baseline;"><strong>ALUNO(A):</strong> <span style="flex: 1; border-bottom: 1px solid #000; margin-left: 6px;"></span></span>
                                <span style="white-space: nowrap;"><strong>DATA:</strong> ____/____/2026</span>
                                <span style="white-space: nowrap; margin-left: 6px;"><strong>NOTA:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                            </div>
                        ` : `
                            <p style="margin: 0;"><strong>DATA:</strong> ____/____/2026</p>
                        `}
                    </div>
                    ${logoUrl ? `<img src="${logoUrl}" class="header-logo" alt="Logo da Instituição" />` : ''}
                </div>
            `;
        };

        const conteudoFinal = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="utf-8">
                <title>Impressão - ${window.escapeHTML(tituloDocumento)}</title>
                ${estiloImpressao}
            </head>
            <body>
                ${forPrint ? `
                    <button onclick="window.close()" class="btn-voltar">
                        <i class="fas fa-arrow-left"></i> Voltar para o App
                    </button>
                ` : ''}
                
                ${renderCabecalhoHtml()}

                <div class="titulo-documento">${window.escapeHTML(material.titulo || material.tema || 'Atividade Pedagógica')}</div>
                
                <div id="conteudo-documento" class="conteudo-principal">
                    ${htmlProcessado}
                </div>

                <script>
                    let impresso = false;
                    function iniciarImpressao() {
                        if (typeof renderMathInElement === 'function') {
                            try {
                                renderMathInElement(document.body, {
                                    delimiters: [
                                        { left: '\\\\[', right: '\\\\]', display: true },
                                        { left: '\\\\(', right: '\\\\)', display: false },
                                        { left: '$$', right: '$$', display: true },
                                        { left: '$', right: '$', display: false }
                                    ],
                                    throwOnError: false
                                });
                            } catch (err) { console.warn(err); }
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

    gerarDocumentoImpressao(configOuTipo = 'aluno') {
        const conteudoFinal = this.montarHTMLDocumentoImpressao(configOuTipo, true);
        if (!conteudoFinal) return;

        const win = window.open('', '_blank');
        if (win) {
            win.document.open();
            win.document.write(conteudoFinal);
            win.document.close();
        } else {
            Toast.show("Permita pop-ups no seu navegador para abrir a tela de impressão.", "warning");
        }
    },

    abrirAvaliadorRubrica() {
        const material = (model.state.materiaisGerados || []).find(m => m.id === this.materialIdAtual);
        if (!material) return;

        const turmas = model.state.turmas || [];

        // Extrai linhas da tabela do HTML gerado ou monta critérios padrão inteligentes
        const parser = new DOMParser();
        const doc = parser.parseFromString(material.conteudo_html || '', 'text/html');
        const rows = Array.from(doc.querySelectorAll('table tbody tr'));

        let criterios = [];
        if (rows.length > 0) {
            rows.forEach((tr, i) => {
                const cols = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
                if (cols.length >= 4) {
                    criterios.push({
                        id: `crit_${i}`,
                        nome: cols[0] || `Critério ${i + 1}`,
                        insuficiente: cols[1] || 'Insuficiente',
                        regular: cols[2] || 'Regular',
                        bom: cols[3] || 'Bom',
                        excelente: cols[4] || cols[3] || 'Excelente',
                        max: 2.5
                    });
                }
            });
        }

        if (criterios.length === 0) {
            criterios = [
                { id: 'crit_0', nome: 'Domínio do Conteúdo & Conceitos', insuficiente: 'Não demonstra domínio (0 pts)', regular: 'Compreensão parcial (1.0 pts)', bom: 'Bom domínio e clareza (2.0 pts)', excelente: 'Excelente domínio e profundidade (2.5 pts)', max: 2.5 },
                { id: 'crit_1', nome: 'Clareza, Organização & Estrutura', insuficiente: 'Desorganizado e confuso (0 pts)', regular: 'Estrutura básica (1.0 pts)', bom: 'Bem organizado e fluido (2.0 pts)', excelente: 'Estrutura impecável (2.5 pts)', max: 2.5 },
                { id: 'crit_2', nome: 'Aplicação Prática & Resolução', insuficiente: 'Não resolve os desafios (0 pts)', regular: 'Resolução incompleta (1.0 pts)', bom: 'Resolve com precisão (2.0 pts)', excelente: 'Resolução inovadora e precisa (2.5 pts)', max: 2.5 },
                { id: 'crit_3', nome: 'Engajamento & Criatividade', insuficiente: 'Sem participação ativa (0 pts)', regular: 'Participação mínima (1.0 pts)', bom: 'Boa criatividade e entrega (2.0 pts)', excelente: 'Excepcional criatividade (2.5 pts)', max: 2.5 }
            ];
        }

        this._rubricaCriterios = criterios;
        this._rubricaNotas = {};

        const htmlCriterios = criterios.map(c => `
            <div style="background-color: var(--color-slate-50); border: 1px solid var(--color-slate-200); border-radius: var(--radius-xl); padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="font-size: 0.875rem; font-weight: 800; color: var(--color-slate-800); margin: 0;">${window.escapeHTML(c.nome)}</h4>
                    <span id="score-label-${c.id}" style="font-size: 0.8125rem; font-weight: 900; color: var(--color-primary); background: var(--color-primary-light); padding: 0.125rem 0.5rem; border-radius: var(--radius-sm);">0.0 / ${c.max.toFixed(1)}</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem;" class="rubrica-btn-grid" data-crit="${c.id}">
                    <button type="button" onclick="conteudoGeradoView.selecionarNivelRubrica('${c.id}', 0.25 * ${c.max}, this)" 
                            class="rubrica-quadrante-btn" style="padding: 0.625rem; border: 1.5px solid #fee2e2; background: #fff5f5; border-radius: var(--radius-lg); font-size: 0.75rem; text-align: left; cursor: pointer; transition: all 0.2s;">
                        <strong style="color: #dc2626; display: block; font-size: 0.6875rem; text-transform: uppercase;">Insuficiente</strong>
                        <span style="color: var(--color-slate-600); line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-top: 0.25rem;">${window.escapeHTML(c.insuficiente)}</span>
                    </button>
                    <button type="button" onclick="conteudoGeradoView.selecionarNivelRubrica('${c.id}', 0.5 * ${c.max}, this)" 
                            class="rubrica-quadrante-btn" style="padding: 0.625rem; border: 1.5px solid #fef3c7; background: #fffdf5; border-radius: var(--radius-lg); font-size: 0.75rem; text-align: left; cursor: pointer; transition: all 0.2s;">
                        <strong style="color: #d97706; display: block; font-size: 0.6875rem; text-transform: uppercase;">Regular</strong>
                        <span style="color: var(--color-slate-600); line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-top: 0.25rem;">${window.escapeHTML(c.regular)}</span>
                    </button>
                    <button type="button" onclick="conteudoGeradoView.selecionarNivelRubrica('${c.id}', 0.75 * ${c.max}, this)" 
                            class="rubrica-quadrante-btn" style="padding: 0.625rem; border: 1.5px solid #dbeafe; background: #f8faff; border-radius: var(--radius-lg); font-size: 0.75rem; text-align: left; cursor: pointer; transition: all 0.2s;">
                        <strong style="color: #2563eb; display: block; font-size: 0.6875rem; text-transform: uppercase;">Bom</strong>
                        <span style="color: var(--color-slate-600); line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-top: 0.25rem;">${window.escapeHTML(c.bom)}</span>
                    </button>
                    <button type="button" onclick="conteudoGeradoView.selecionarNivelRubrica('${c.id}', 1.0 * ${c.max}, this)" 
                            class="rubrica-quadrante-btn" style="padding: 0.625rem; border: 1.5px solid #d1fae5; background: #f4fdf8; border-radius: var(--radius-lg); font-size: 0.75rem; text-align: left; cursor: pointer; transition: all 0.2s;">
                        <strong style="color: #059669; display: block; font-size: 0.6875rem; text-transform: uppercase;">Excelente</strong>
                        <span style="color: var(--color-slate-600); line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-top: 0.25rem;">${window.escapeHTML(c.excelente)}</span>
                    </button>
                </div>
            </div>
        `).join('');

        window.controller.openModal(`Avaliador Interativo de Rubrica`, `
            <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; max-width: 820px; max-height: 80vh; overflow-y: auto;" class="custom-scrollbar">
                
                <!-- TOP HEADER COM PLACAR DE NOTA TOTAL -->
                <div style="display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 1.25rem 1.5rem; border-radius: var(--radius-xl); box-shadow: var(--shadow-md);">
                    <div>
                        <span style="font-size: 0.6875rem; font-weight: 800; color: #c7d2fe; text-transform: uppercase; letter-spacing: 0.05em;">Matriz de Avaliação Dinâmica</span>
                        <h3 style="font-size: 1.25rem; font-weight: 900; color: white; margin: 0.125rem 0 0 0;">${window.escapeHTML(material.titulo || 'Rubrica de Avaliação')}</h3>
                        <p style="font-size: 0.8125rem; color: #e0e7ff; margin-top: 0.125rem;">Clique nos quadrantes para avaliar cada critério pedagógico.</p>
                    </div>
                    <div style="text-align: right; background: rgba(255,255,255,0.15); padding: 0.5rem 1.25rem; border-radius: var(--radius-xl); border: 1px solid rgba(255,255,255,0.25);">
                        <span style="font-size: 0.6875rem; font-weight: 800; color: #e0e7ff; text-transform: uppercase;">Nota Final Calculada</span>
                        <div id="rubrica-nota-final" style="font-size: 2.25rem; font-weight: 900; color: #fef08a; line-height: 1.1;">0.0</div>
                    </div>
                </div>

                <!-- IDENTIFICAÇÃO DO ALUNO / GRUPO -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <label class="form-label" style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase;">Nome do Estudante ou Grupo</label>
                        <input type="text" id="rubrica-nome-aluno" class="form-input" placeholder="Ex: Maria Clara ou Grupo 3" style="width: 100%; font-weight: 700;">
                    </div>
                    <div>
                        <label class="form-label" style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase;">Comentário de Feedback Formativo</label>
                        <input type="text" id="rubrica-feedback" class="form-input" placeholder="Ex: Excelente clareza na exposição oral..." style="width: 100%;">
                    </div>
                </div>

                <!-- CRITÉRIOS INTERATIVOS -->
                <div style="display: flex; flex-direction: column; gap: 0.875rem;">
                    ${htmlCriterios}
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem;">
                    <button type="button" data-action="fechar-modal" class="btn-secondary">Fechar</button>
                    <button type="button" data-action="copiar-rubrica" class="btn-primary" style="background: #10b981;">
                        <i class="fas fa-copy mr-1"></i> Copiar Parecer / Nota
                    </button>
                </div>
            </div>
        `, 'xl');
    },

    selecionarNivelRubrica(critId, valor, btnElement) {
        if (!this._rubricaNotas) this._rubricaNotas = {};
        this._rubricaNotas[critId] = valor;

        const parent = btnElement.parentElement;
        if (parent) {
            parent.querySelectorAll('.rubrica-quadrante-btn').forEach(b => {
                b.style.boxShadow = 'none';
                b.style.transform = 'none';
                b.style.outline = 'none';
            });
        }

        btnElement.style.boxShadow = '0 0 0 2px var(--color-primary), 0 4px 12px rgba(99, 102, 241, 0.35)';
        btnElement.style.transform = 'scale(1.02)';

        const labelScore = document.getElementById(`score-label-${critId}`);
        if (labelScore) {
            const crit = (this._rubricaCriterios || []).find(c => c.id === critId);
            const maxVal = crit ? crit.max.toFixed(1) : '2.5';
            labelScore.innerText = `${valor.toFixed(1)} / ${maxVal}`;
        }

        const somaTotal = Object.values(this._rubricaNotas).reduce((a, b) => a + b, 0);
        const displayTotal = document.getElementById('rubrica-nota-final');
        if (displayTotal) {
            displayTotal.innerText = somaTotal.toFixed(1);
        }
    },

    copiarResultadoRubrica() {
        const nomeAluno = document.getElementById('rubrica-nome-aluno')?.value.trim() || 'Estudante';
        const feedback = document.getElementById('rubrica-feedback')?.value.trim() || '';
        const somaTotal = Object.values(this._rubricaNotas || {}).reduce((a, b) => a + b, 0);

        const relatorio = `=== AVALIAÇÃO POR RUBRICA ===\nEstudante/Grupo: ${nomeAluno}\nNota Final: ${somaTotal.toFixed(1)} / 10.0\n${feedback ? `Feedback: ${feedback}\n` : ''}Data: ${new Date().toLocaleDateString('pt-BR')}`;

        navigator.clipboard.writeText(relatorio).then(() => {
            Toast.show("Parecer da rubrica copiado para a área de transferência!", "success");
        });
    }
};

if (typeof window !== 'undefined') {
    window.conteudoGeradoView = conteudoGeradoView;
}