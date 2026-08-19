import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';
import { renderKatex, formatarTextoComLatex, sanitizeComLatex, alternarModoEdicaoPreview } from '../utils.js';

export const conteudoGeradoView = {
    materialIdAtual: null,
    modoVisualizacao: 'professor', // 'professor' (com gabarito) ou 'aluno' (sem gabarito)

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
                    <button type="button" onclick="controller.navigate('biblioteca')" class="btn-primary interactive-element">
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
                    <button type="button" onclick="controller.navigate('biblioteca')" class="btn-secondary interactive-element text-xs mb-3" style="padding: 0.375rem 0.75rem; font-size: 0.8125rem;">
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
                            <button type="button" onclick="conteudoGeradoView.setModo('aluno')" 
                                    class="mode-toggle-btn interactive-element ${isAluno ? 'mode-toggle-btn--active' : ''}">
                                <i class="fas fa-user-graduate" style="margin-right: 0.375rem; color: ${isAluno ? 'var(--color-primary)' : 'inherit'};"></i>
                                Versão Aluno (Sem Gabarito)
                            </button>
                            <button type="button" onclick="conteudoGeradoView.setModo('professor')" 
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
                        <button type="button" onclick="conteudoGeradoView.baixarWord('${material.id}', ${!isAluno})" 
                                class="btn-primary interactive-element" 
                                style="background-color: ${isAluno ? '#2563eb' : '#059669'}; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);">
                            <i class="far fa-file-word"></i> <span>Baixar Word (${isAluno ? 'Aluno' : 'Professor'})</span>
                        </button>
                        
                        ${(material.tipo === 'rubrica-avaliacao' || (material.conteudo_html || '').includes('table')) ? `
                            <button type="button" onclick="conteudoGeradoView.abrirAvaliadorRubrica()" 
                                    class="btn-primary interactive-element" 
                                    style="background: linear-gradient(135deg, #c026d3, #9333ea); box-shadow: 0 4px 10px rgba(192, 38, 211, 0.25);">
                                <i class="fas fa-calculator"></i> <span>Avaliador de Rubrica Interativo</span>
                            </button>
                        ` : ''}

                        <button type="button" onclick="conteudoGeradoView.abrirOpcoesImpressao()" class="btn-secondary interactive-element">
                            <i class="fas fa-print"></i> <span>Imprimir / PDF</span>
                        </button>

                        <button type="button" onclick="conteudoGeradoView.copiarTextoFormatado()" class="btn-secondary interactive-element" title="Copiar texto para colar em outro aplicativo">
                            <i class="far fa-copy"></i> <span>Copiar Texto</span>
                        </button>

                        <button type="button" onclick="conteudoGeradoView.abrirEditorModal()" class="btn-secondary interactive-element" style="color: var(--color-slate-700); font-weight: 700;">
                            <i class="fas fa-edit" style="color: var(--color-primary);"></i> <span>Editar Material</span>
                        </button>

                        ${material.compartilhado ? `
                            <button type="button" onclick="model.removerMaterialDaComunidade('${material.id}')" class="btn-secondary interactive-element" style="color: #7c3aed; background-color: #f3e8ff; border-color: #ddd6fe; font-weight: 700;" title="Material Público na Comunidade (Clique para retirar)">
                                <i class="fas fa-globe"></i> <span>Público na Comunidade</span>
                            </button>
                        ` : `
                            <button type="button" onclick="model.compartilharMaterial('${material.id}')" class="btn-secondary interactive-element" style="color: #7c3aed; font-weight: 700;" title="Compartilhar com a comunidade de professores">
                                <i class="fas fa-share-nodes"></i> <span>Tornar Público / Comunidade</span>
                            </button>
                        `}
                    </div>

                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <button type="button" onclick="controller.navigate('criar-material')" class="btn-secondary interactive-element" style="color: var(--color-slate-600);">
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
                                <span>${material.disciplina || 'Disciplina'} • ${material.serie || 'Série'}</span>
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
                            <button type="button" onclick="conteudoGeradoView.setModo('${isAluno ? 'professor' : 'aluno'}')" 
                                    class="btn-secondary interactive-element" style="width: 100%; justify-content: center; font-size: 0.75rem;">
                                <i class="fas fa-sync-alt"></i> <span>Alternar para ${isAluno ? 'Versão Professor' : 'Versão Aluno'}</span>
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
                    while (next && !['H1','H2','H3','H4'].includes(next.tagName)) {
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

    abrirEditorModal() {
        const material = (model.state.materiaisGerados || []).find(m => m.id === this.materialIdAtual);
        if (!material) return Toast.show("Nenhum material carregado para edição.", "error");

        const tituloAtual = material.titulo || material.tema || '';
        const temaAtual = material.tema || '';
        const conteudoAtual = material.conteudo_html || '';

        const modalHtml = `
            <div style="display: flex; flex-direction: column; gap: 1rem; width: 100%;">
                
                <!-- BLOCO SUPERIOR: METADADOS E SELETOR DE VISÃO -->
                <div style="display: grid; grid-template-columns: 2fr 2fr 1.5fr; gap: 1rem; align-items: end; background: #ffffff; padding: 1rem 1.25rem; border-radius: var(--radius-xl); border: 1px solid var(--color-slate-200); box-shadow: var(--shadow-sm);">
                    <div>
                        <label class="form-label" style="font-weight: 800; font-size: 0.8125rem; color: var(--color-slate-700);">Título do Material</label>
                        <input type="text" id="editor-mat-titulo" class="form-input" value="${window.escapeHTML(tituloAtual)}" placeholder="Ex: Avaliação Bimestral de Ciências" style="font-weight: 700;">
                    </div>
                    <div>
                        <label class="form-label" style="font-weight: 800; font-size: 0.8125rem; color: var(--color-slate-700);">Tema / Conteúdo</label>
                        <input type="text" id="editor-mat-tema" class="form-input" value="${window.escapeHTML(temaAtual)}" placeholder="Ex: Fotossíntese e Cadeia Alimentar" style="font-weight: 700;">
                    </div>
                    <div>
                        <label class="form-label" style="font-weight: 800; font-size: 0.8125rem; color: var(--color-slate-700);">Modo de Edição</label>
                        <div style="display: flex; gap: 0.25rem; background: var(--color-slate-100); padding: 0.25rem; border-radius: var(--radius-xl); border: 1px solid var(--color-slate-200);">
                            <button type="button" id="btn-mode-mat-code" onclick="conteudoGeradoView.alternarModoEdicaoVisual('code')" class="btn-primary" style="flex: 1; padding: 0.45rem 0.5rem; font-size: 0.75rem; font-weight: 800; justify-content: center; background: var(--color-primary);" title="Editor de Texto e Fórmulas LaTeX com Pré-Visualização KaTeX ao vivo">
                                <i class="fas fa-square-root-alt"></i> Texto / LaTeX
                            </button>
                            <button type="button" id="btn-mode-mat-visual" onclick="conteudoGeradoView.alternarModoEdicaoVisual('visual')" class="btn-secondary" style="flex: 1; padding: 0.45rem 0.5rem; font-size: 0.75rem; font-weight: 800; justify-content: center; background: transparent;" title="Editor Visual em Folha Mestre">
                                <i class="fas fa-file-alt"></i> Folha Mestre
                            </button>
                        </div>
                    </div>
                </div>

                <!-- MESA DE TRABALHO STUDIO (BACKGROUND NEUTRO + BARRA RIBBON + FOLHA A4) -->
                <div style="background-color: #f1f5f9; border-radius: var(--radius-2xl); border: 1px solid var(--color-slate-200); padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;">
                    
                    <!-- BARRA DE FERRAMENTAS RIBBON CLÁSSICA E MODERNA -->
                    <div id="editor-mat-toolbar-visual" style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.625rem 1rem; background-color: #ffffff; border: 1px solid var(--color-slate-200); border-radius: var(--radius-xl); box-shadow: 0 2px 5px rgba(0,0,0,0.03);">
                        
                        <!-- ATALHOS TeX / MATEMÁTICA -->
                        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem;">
                            <button type="button" onclick="conteudoGeradoView.inserirFormulaLatex('\\\\dfrac{a}{b}')" class="btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.8125rem; font-weight: 800; color: #4f46e5;" title="Inserir Fração TeX (a/b)">
                                <i class="fas fa-divide"></i> <span>Fração</span>
                            </button>
                            <button type="button" onclick="conteudoGeradoView.inserirFormulaLatex('x^{2}')" class="btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.8125rem; font-weight: 800; color: #4f46e5;" title="Inserir Potência (x²)">
                                <i class="fas fa-superscript"></i> <span>x²</span>
                            </button>
                            <button type="button" onclick="conteudoGeradoView.inserirFormulaLatex('\\\\sqrt{x}')" class="btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.8125rem; font-weight: 800; color: #4f46e5;" title="Inserir Raiz Quadrada">
                                <i class="fas fa-square-root-alt"></i> <span>√x</span>
                            </button>
                            <button type="button" onclick="conteudoGeradoView.inserirFormulaLatex('\\\\alpha')" class="btn-secondary" style="padding: 0.35rem 0.55rem; font-size: 0.8125rem; font-weight: 800; color: #4f46e5;" title="Símbolo Alpha">
                                <span>α</span>
                            </button>
                            <button type="button" onclick="conteudoGeradoView.inserirFormulaLatex('\\\\beta')" class="btn-secondary" style="padding: 0.35rem 0.55rem; font-size: 0.8125rem; font-weight: 800; color: #4f46e5;" title="Símbolo Beta">
                                <span>β</span>
                            </button>
                            <div style="width: 1px; height: 1.5rem; background-color: var(--color-slate-200); margin: 0 0.25rem;"></div>
                            <button type="button" onclick="conteudoGeradoView.formatarTextoVisual('bold')" class="btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.8125rem; font-weight: 800;" title="Negrito (Ctrl+B)">
                                <i class="fas fa-bold"></i> <span>N</span>
                            </button>
                            <button type="button" onclick="conteudoGeradoView.formatarTextoVisual('italic')" class="btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.8125rem; font-style: italic;" title="Itálico (Ctrl+I)">
                                <i class="fas fa-italic"></i> <span>I</span>
                            </button>
                        </div>

                        <!-- GRUPO RECURSOS PEDAGÓGICOS -->
                        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;">
                            <button type="button" onclick="conteudoGeradoView.inserirBlocoGabarito()" class="btn-primary" style="background-color: #059669; font-size: 0.78125rem; padding: 0.4rem 0.75rem; font-weight: 800; box-shadow: var(--shadow-sm);" title="Inserir gabarito que fica oculto na versão do aluno">
                                <i class="fas fa-check-circle"></i> + Gabarito
                            </button>
                            <button type="button" onclick="conteudoGeradoView.inserirComentarioProfessor()" class="btn-secondary" style="background-color: #fefce8; border-color: #fef08a; color: #a16207; font-size: 0.78125rem; padding: 0.4rem 0.75rem; font-weight: 800;" title="Inserir orientação pedagógica para o professor">
                                <i class="fas fa-comment-dots"></i> + Comentário
                            </button>
                            <button type="button" onclick="conteudoGeradoView.inserirLinhasResposta()" class="btn-secondary" style="font-size: 0.78125rem; padding: 0.4rem 0.65rem; font-weight: 700;" title="Inserir pauta de linhas para resposta do aluno">
                                <i class="fas fa-align-justify"></i> + Linhas
                            </button>
                            <button type="button" onclick="conteudoGeradoView.inserirTabelaPedagogica()" class="btn-secondary" style="font-size: 0.78125rem; padding: 0.4rem 0.65rem; font-weight: 700;" title="Inserir grade/tabela pedagógica">
                                <i class="fas fa-table"></i> + Tabela
                            </button>
                        </div>
                    </div>

                    <!-- AREA PRINCIPAL DE EDIÇÃO: TEXTAREA COM PRÉ-VISUALIZAÇÃO KATEX AO VIVO -->
                    <div style="width: 100%; display: flex; flex-direction: column; gap: 1rem; position: relative;">
                        
                        <!-- TEXTAREA DE CÓDIGO/TEXTO (MODO PADRÃO TEXTO E LATEX) -->
                        <textarea id="editor-mat-conteudo" class="custom-scrollbar" 
                                  style="display: block; width: 100%; min-height: 260px; max-height: 45vh; font-family: 'Fira Code', 'Segoe UI Mono', monospace; font-size: 0.9375rem; line-height: 1.6; background-color: #ffffff; color: #0f172a; padding: 1.25rem; border-radius: var(--radius-xl); border: 2px solid var(--color-slate-200); box-shadow: var(--shadow-sm);"
                                  placeholder="Digite ou edite o texto e as equações em LaTeX aqui...">${window.escapeHTML(conteudoAtual)}</textarea>

                        <!-- BOX DE PRÉ-VISUALIZAÇÃO KATEX AO VIVO (IGUAL AO GERADOR DE AVALIAÇÕES) -->
                        <div id="editor-mat-preview" style="display: block; width: 100%;"></div>

                        <!-- CONTAINER VISUAL OCULTO POR PADRÃO (WYSIWYG) -->
                        <div id="editor-mat-wysiwyg" contenteditable="true" class="custom-scrollbar" 
                             style="display: none; width: 100%; max-width: 820px; min-height: 480px; max-height: 60vh; overflow-y: auto; background: #ffffff; padding: 2.5rem; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); line-height: 1.75; font-size: 1rem; color: #1e293b;">
                            ${conteudoAtual}
                        </div>
                    </div>
                </div>

                <!-- RODAPÉ E ALERTA DE SINCRONIZAÇÃO MESTRE -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem; flex-wrap: wrap; gap: 1rem;">
                    <div style="padding: 0.5rem 0.875rem; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-lg); font-size: 0.8125rem; color: #1e40af; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-sync-alt" style="color: #3b82f6;"></i>
                        <span><strong>Edição Mestre:</strong> Atualiza simultaneamente a <strong>Versão do Aluno</strong> e do <strong>Professor</strong>.</span>
                    </div>

                    <div style="display: flex; gap: 0.75rem;">
                        <button type="button" onclick="controller.closeModal()" class="btn-secondary" style="padding: 0.625rem 1.5rem; font-weight: 700;">Cancelar</button>
                        <button type="button" onclick="conteudoGeradoView.salvarEdicaoMaterial()" class="btn-primary" style="padding: 0.625rem 2.25rem; font-weight: 800; background: linear-gradient(135deg, #4f46e5, #4338ca); border-radius: var(--radius-xl); box-shadow: 0 4px 14px rgba(79,70,229,0.35);">
                            <i class="fas fa-save" style="margin-right: 0.375rem;"></i> <span>Salvar Alterações</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        controller.openModal('Editar Material Pedagógico', modalHtml, 'xl');

        setTimeout(() => {
            anexarPreviewLatex('editor-mat-conteudo', 'editor-mat-preview');
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

        if (!wysiwyg || !textarea) return;

        if (modo === 'visual') {
            wysiwyg.innerHTML = textarea.value;
            wysiwyg.style.display = 'block';
            textarea.style.display = 'none';
            if (preview) preview.style.display = 'none';

            if (btnVisual) {
                btnVisual.className = 'btn-primary';
                btnVisual.style.background = 'var(--color-primary)';
            }
            if (btnCode) {
                btnCode.className = 'btn-secondary';
                btnCode.style.background = 'transparent';
            }
        } else {
            textarea.value = wysiwyg.innerHTML;
            wysiwyg.style.display = 'none';
            textarea.style.display = 'block';

            if (btnCode) {
                btnCode.className = 'btn-primary';
                btnCode.style.background = 'var(--color-primary)';
            }
            if (btnVisual) {
                btnVisual.className = 'btn-secondary';
                btnVisual.style.background = 'transparent';
            }

            anexarPreviewLatex('editor-mat-conteudo', 'editor-mat-preview');
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
        if (wysiwyg) wysiwyg.focus();
        document.execCommand(comando, false, valor);
    },

    inserirTagEditor(tag) {
        const wysiwyg = document.getElementById('editor-mat-wysiwyg');
        const textarea = document.getElementById('editor-mat-conteudo');

        if (wysiwyg && wysiwyg.style.display !== 'none') {
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

    inserirLinhasResposta() {
        const wysiwyg = document.getElementById('editor-mat-wysiwyg');
        const textarea = document.getElementById('editor-mat-conteudo');

        const blocoHTML = `<div class="linhas-resposta" style="margin: 1.25rem 0; font-family: monospace; color: #94a3b8;"><p style="border-bottom: 1px dashed #cbd5e1; height: 1.8rem; margin: 0;"></p><p style="border-bottom: 1px dashed #cbd5e1; height: 1.8rem; margin: 0;"></p><p style="border-bottom: 1px dashed #cbd5e1; height: 1.8rem; margin: 0;"></p></div><p></p>`;

        if (wysiwyg && wysiwyg.style.display !== 'none') {
            wysiwyg.focus();
            document.execCommand('insertHTML', false, blocoHTML);
            return;
        }

        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.setRangeText(`\n${blocoHTML}\n`, start, end, 'end');
        textarea.focus();
    },

    inserirTabelaPedagogica() {
        const wysiwyg = document.getElementById('editor-mat-wysiwyg');
        const textarea = document.getElementById('editor-mat-conteudo');

        const blocoHTML = `<table style="width: 100%; border-collapse: collapse; margin: 1.25rem 0; border: 1px solid #cbd5e1;"><thead><tr style="background: #f8fafc;"><th style="border: 1px solid #cbd5e1; padding: 0.625rem; text-align: left; font-weight: 800;">Item / Critério</th><th style="border: 1px solid #cbd5e1; padding: 0.625rem; text-align: left; font-weight: 800;">Descrição / Resposta Esperada</th></tr></thead><tbody><tr><td style="border: 1px solid #cbd5e1; padding: 0.625rem;">01</td><td style="border: 1px solid #cbd5e1; padding: 0.625rem;">...</td></tr><tr><td style="border: 1px solid #cbd5e1; padding: 0.625rem;">02</td><td style="border: 1px solid #cbd5e1; padding: 0.625rem;">...</td></tr></tbody></table><p></p>`;

        if (wysiwyg && wysiwyg.style.display !== 'none') {
            wysiwyg.focus();
            document.execCommand('insertHTML', false, blocoHTML);
            return;
        }

        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.setRangeText(`\n${blocoHTML}\n`, start, end, 'end');
        textarea.focus();
    },

    inserirBlocoGabarito() {
        const wysiwyg = document.getElementById('editor-mat-wysiwyg');
        const textarea = document.getElementById('editor-mat-conteudo');

        const blocoHTML = `<div class="gabarito-bloco" data-gabarito="true"><h3>Gabarito e Expectativa de Resposta</h3><p>Digite a resposta esperada ou resolução detalhada aqui...</p></div><p></p>`;

        if (wysiwyg && wysiwyg.style.display !== 'none') {
            wysiwyg.focus();
            document.execCommand('insertHTML', false, blocoHTML);
            return;
        }

        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end) || 'Digite a resposta esperada ou resolução detalhada aqui...';
        
        const bloco = `\n<div class="gabarito-bloco" data-gabarito="true">\n  <h3>Gabarito e Expectativa de Resposta</h3>\n  <p>${selectedText}</p>\n</div>\n`;

        textarea.setRangeText(bloco, start, end, 'end');
        textarea.focus();
    },

    inserirComentarioProfessor() {
        const wysiwyg = document.getElementById('editor-mat-wysiwyg');
        const textarea = document.getElementById('editor-mat-conteudo');

        const blocoHTML = `<div class="comentario-professor"><strong>Observação para o Professor:</strong> Digite orientações pedagógicas, critérios de avaliação ou observações aqui...</div><p></p>`;

        if (wysiwyg && wysiwyg.style.display !== 'none') {
            wysiwyg.focus();
            document.execCommand('insertHTML', false, blocoHTML);
            return;
        }

        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end) || 'Digite orientações pedagógicas, critérios de avaliação ou observações aqui...';

        const bloco = `\n<div class="comentario-professor">\n  <strong>Observação para o Professor:</strong> ${selectedText}\n</div>\n`;

        textarea.setRangeText(bloco, start, end, 'end');
        textarea.focus();
    },

    async salvarEdicaoMaterial() {
        const inputTitulo = document.getElementById('editor-mat-titulo');
        const inputTema = document.getElementById('editor-mat-tema');
        const wysiwyg = document.getElementById('editor-mat-wysiwyg');
        const textareaConteudo = document.getElementById('editor-mat-conteudo');

        let novoConteudo = '';

        if (wysiwyg && wysiwyg.style.display !== 'none') {
            novoConteudo = wysiwyg.innerHTML;
        } else if (textareaConteudo) {
            novoConteudo = textareaConteudo.value;
        }

        if (!novoConteudo || !novoConteudo.trim()) {
            return Toast.show("O conteúdo do material não pode ficar vazio.", "warning");
        }

        const novoTitulo = inputTitulo ? inputTitulo.value.trim() : '';
        const novoTema = inputTema ? inputTema.value.trim() : '';

        try {
            await model.updateMaterial(this.materialIdAtual, {
                titulo: novoTitulo,
                tema: novoTema,
                conteudo_html: novoConteudo
            });

            controller.closeModal();
            Toast.show("Material atualizado com sucesso!", "success");
            this.render('view-container');
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

    abrirOpcoesImpressao() {
        const material = (model.state.materiaisGerados || []).find(m => m.id === this.materialIdAtual);
        if (!material) return Toast.show("Nenhum material carregado para impressão.", "error");

        const html = `
            <div style="padding: 1.5rem; text-align: center; display: flex; flex-direction: column; gap: 1rem;">
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); margin: 0;">Imprimir / Exportar Documento Pedagógico</h3>
                <p style="font-size: 0.8125rem; color: var(--color-slate-500); margin: 0;">Escolha o formato de diagramação adequado para a aplicação em sala de aula ou arquivo do professor:</p>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin-top: 1rem;">
                    
                    <!-- OPÇÃO 1: PADRÃO ALUNO -->
                    <button type="button" onclick="controller.closeModal(); conteudoGeradoView.gerarDocumentoImpressao('aluno')" 
                            class="interactive-element"
                            style="padding: 1.25rem 0.75rem; border: 2px solid var(--color-slate-100); border-radius: var(--radius-2xl); cursor: pointer; transition: all var(--transition-fast); background-color: var(--color-white); display: flex; flex-direction: column; align-items: center; gap: 0.5rem;"
                            onmouseover="this.style.borderColor='var(--color-primary)'; this.style.backgroundColor='#eff6ff';" onmouseout="this.style.borderColor='var(--color-slate-100)'; this.style.backgroundColor='var(--color-white)';">
                        <div style="width: 2.75rem; height: 2.75rem; border-radius: 50%; background: #eff6ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                            <i class="fas fa-user-graduate"></i>
                        </div>
                        <div style="font-weight: 800; font-size: 0.875rem; color: var(--color-slate-700);">Padrão Aluno</div>
                        <div style="font-size: 0.6875rem; color: var(--color-slate-400);">Sem gabaritos, com cabeçalho de identificação</div>
                    </button>

                    <!-- OPÇÃO 2: ACESSÍVEL AEE / INCLUSÃO -->
                    <button type="button" onclick="controller.closeModal(); conteudoGeradoView.gerarDocumentoImpressao('acessivel')" 
                            class="interactive-element"
                            style="padding: 1.25rem 0.75rem; border: 2px solid var(--color-slate-100); border-radius: var(--radius-2xl); cursor: pointer; transition: all var(--transition-fast); background-color: var(--color-white); display: flex; flex-direction: column; align-items: center; gap: 0.5rem;"
                            onmouseover="this.style.borderColor='#3b82f6'; this.style.backgroundColor='#eff6ff';" onmouseout="this.style.borderColor='var(--color-slate-100)'; this.style.backgroundColor='var(--color-white)';">
                        <div style="width: 2.75rem; height: 2.75rem; border-radius: 50%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                            <i class="fas fa-universal-access"></i>
                        </div>
                        <div style="font-weight: 800; font-size: 0.875rem; color: var(--color-slate-700);">Acessível (AEE)</div>
                        <div style="font-size: 0.6875rem; color: var(--color-slate-400);">Tipografia Atkinson, alto contraste e entrelinhas 1.85</div>
                    </button>

                    <!-- OPÇÃO 3: GUIA DO PROFESSOR (COM GABARITO) -->
                    <button type="button" onclick="controller.closeModal(); conteudoGeradoView.gerarDocumentoImpressao('professor')" 
                            class="interactive-element"
                            style="padding: 1.25rem 0.75rem; border: 2px solid var(--color-slate-100); border-radius: var(--radius-2xl); cursor: pointer; transition: all var(--transition-fast); background-color: var(--color-white); display: flex; flex-direction: column; align-items: center; gap: 0.5rem;"
                            onmouseover="this.style.borderColor='#10b981'; this.style.backgroundColor='#ecfdf5';" onmouseout="this.style.borderColor='var(--color-slate-100)'; this.style.backgroundColor='var(--color-white)';">
                        <div style="width: 2.75rem; height: 2.75rem; border-radius: 50%; background: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                            <i class="fas fa-chalkboard-teacher"></i>
                        </div>
                        <div style="font-weight: 800; font-size: 0.875rem; color: var(--color-slate-700);">Guia do Professor</div>
                        <div style="font-size: 0.6875rem; color: var(--color-slate-400);">Completo com gabaritos comentados e critérios</div>
                    </button>
                </div>
            </div>`;
        controller.openModal('Impressão & Exportação em PDF', html);
    },

    gerarDocumentoImpressao(tipo = 'aluno') {
        const material = (model.state.materiaisGerados || []).find(m => m.id === this.materialIdAtual);
        if (!material) return Toast.show("Material não encontrado para impressão.", "error");

        const isProf = tipo === 'professor';
        const isAcessivel = tipo === 'acessivel';

        let nomeProf = model.state.userConfig?.profName || '__________________________';
        if ((!model.state.userConfig?.profName || model.state.userConfig.profName.trim() === '') && model.currentUser) {
            nomeProf = model.currentUser.displayName || '__________________________';
        }
        const logoUrl = model.state.userConfig?.logo || '';
        const nomeEscola = model.state.userConfig?.schoolName || '________________________________________________';

        const htmlProcessado = this.processarHTMLParaModo(material.conteudo_html || '', isProf ? 'professor' : 'aluno');
        const conteudoFinalHTML = htmlProcessado;

        const tituloDocumento = isProf 
            ? `GUIA DO PROFESSOR: ${material.titulo || material.tema || 'Material Pedagógico'}`
            : isAcessivel 
                ? `DOCUMENTO ADAPTADO (AEE): ${material.titulo || material.tema || 'Material Pedagógico'}`
                : `${material.titulo || material.tema || 'Material Pedagógico'}`;

        const estiloImpressao = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=Roboto:wght@400;500;700&display=swap');
                
                * { box-sizing: border-box; }
                body { 
                    font-family: ${isAcessivel ? "'Atkinson Hyperlegible', Arial, sans-serif" : "'Roboto', Arial, sans-serif"}; 
                    padding: 40px; 
                    color: #1e293b; 
                    line-height: ${isAcessivel ? '1.85' : '1.6'};
                    letter-spacing: ${isAcessivel ? '0.03em' : 'normal'};
                    background-color: #ffffff;
                }
                
                /* CABEÇALHO ESCOLAR */
                .header { 
                    display: flex; 
                    align-items: center; 
                    justify-content: space-between; 
                    border: ${isAcessivel ? '2px solid #000' : '1px solid #334155'}; 
                    padding: 14px 18px; 
                    margin-bottom: 24px; 
                    border-radius: 8px; 
                }
                .header-info { flex: 1; }
                .header-info p { margin: 5px 0; font-size: ${isAcessivel ? '14.5px' : '13px'}; font-weight: 500; }
                .header-logo { max-width: 80px; max-height: 80px; object-fit: contain; margin-left: 20px; }
                
                .titulo-documento { 
                    text-align: center; 
                    text-transform: uppercase; 
                    font-weight: 800; 
                    font-size: ${isAcessivel ? '19px' : '17px'}; 
                    margin-bottom: 24px; 
                    border-bottom: 2px solid #1e293b; 
                    padding-bottom: 10px; 
                    color: #0f172a;
                }
                
                /* FORMATAÇÃO DE CONTEÚDO PEDAGÓGICO */
                h1, h2, h3, h4 { color: #0f172a; page-break-after: avoid; }
                h3 { font-size: ${isAcessivel ? '16px' : '15px'}; margin-top: 18px; margin-bottom: 8px; }
                p, li { font-size: ${isAcessivel ? '15px' : '13.5px'}; color: #334155; margin-bottom: 10px; }
                ul, ol { padding-left: 24px; margin-bottom: 14px; }
                
                /* CAIXAS DE DESTAQUE E LABORATÓRIO */
                .laboratorio-seguranca { 
                    background-color: #fef2f2; 
                    border: 1.5px solid #fecaca; 
                    border-left: 5px solid #ef4444; 
                    border-radius: 8px; 
                    padding: 12px 16px; 
                    margin: 16px 0; 
                    color: #991b1b;
                    page-break-inside: avoid;
                }
                .laboratorio-seguranca h3, .laboratorio-seguranca h4 { color: #b91c1c; margin-top: 0; }
                
                .etapa-experimento { 
                    background-color: #f8fafc; 
                    border: 1px solid #e2e8f0; 
                    border-left: 4px solid #4f46e5; 
                    border-radius: 6px; 
                    padding: 10px 14px; 
                    margin: 12px 0; 
                    page-break-inside: avoid;
                }
                
                .tabela-experimento { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 18px 0; 
                    border: 2px solid #334155; 
                    page-break-inside: avoid;
                }
                .tabela-experimento th { 
                    background-color: #f1f5f9; 
                    color: #0f172a; 
                    font-weight: bold; 
                    padding: 9px; 
                    border: 1px solid #334155; 
                    text-align: left; 
                    font-size: 12px;
                    text-transform: uppercase;
                }
                .tabela-experimento td { 
                    border: 1px solid #334155; 
                    padding: 12px; 
                    min-height: 44px; 
                    font-size: 13px;
                }

                .gabarito-bloco, .gabarito { 
                    background-color: #ecfdf5; 
                    border: 1px solid #a7f3d0; 
                    border-left: 5px solid #059669; 
                    border-radius: 8px; 
                    padding: 14px 18px; 
                    margin: 20px 0; 
                    page-break-inside: avoid;
                }
                .gabarito-bloco h3, .gabarito-bloco h4 { color: #065f46; margin-top: 0; }

                .comentario-professor { 
                    background-color: #fefce8; 
                    border: 1px solid #fef08a; 
                    border-left: 4px solid #ca8a04; 
                    padding: 10px 14px; 
                    margin: 12px 0; 
                    border-radius: 6px; 
                }

                .btn-voltar {
                    position: fixed; top: 20px; right: 20px;
                    background-color: #ef4444; color: white; padding: 12px 22px;
                    border: none; border-radius: 50px; font-weight: bold; cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.25); z-index: 9999;
                    display: flex; align-items: center; gap: 8px;
                    font-family: sans-serif; text-transform: uppercase; font-size: 12px;
                    transition: background-color 0.2s ease;
                }
                .btn-voltar:hover { background-color: #dc2626; }

                @media print {
                    .no-print, .btn-voltar { display: none !important; }
                    body { padding: 0; background: transparent; }
                    .header { border-color: #000; }
                    .laboratorio-seguranca { background: transparent !important; border: 1px solid #000 !important; border-left: 4px solid #000 !important; color: #000 !important; }
                    .etapa-experimento { background: transparent !important; border: 1px solid #000 !important; border-left: 4px solid #000 !important; }
                    .tabela-experimento, .tabela-experimento th, .tabela-experimento td { border-color: #000 !important; }
                    .gabarito-bloco { background: transparent !important; border: 1px solid #000 !important; border-left: 4px solid #000 !important; }
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
                <title>Impressão - ${window.escapeHTML(tituloDocumento)}</title>
                ${estiloImpressao}
            </head>
            <body>
                <button onclick="window.close()" class="btn-voltar">
                    <i class="fas fa-arrow-left"></i> Voltar para o App
                </button>
                
                <div class="header">
                    <div class="header-info">
                        <p><strong>ESCOLA:</strong> ${window.escapeHTML(nomeEscola)}</p>
                        <p><strong>PROFESSOR(A):</strong> ${window.escapeHTML(nomeProf)} &nbsp;&nbsp;&nbsp;&nbsp; <strong>DISCIPLINA:</strong> ${window.escapeHTML(material.disciplina || 'Geral')} &nbsp;&nbsp;&nbsp;&nbsp; <strong>SÉRIE/ANO:</strong> ${window.escapeHTML(material.serie || '-')}</p>
                        ${!isProf ? `
                            <p><strong>ALUNO(A):</strong> _______________________________________________________ <strong>TURMA:</strong> ________ <strong>DATA:</strong> ____/____/2026</p>
                        ` : `
                            <p><strong>TIPO DO DOCUMENTO:</strong> Guia Pedagógico do Docente &nbsp;&nbsp;&nbsp;&nbsp; <strong>DATA:</strong> ____/____/2026</p>
                        `}
                    </div>
                    ${logoUrl ? `<img src="${logoUrl}" class="header-logo" alt="Logo da Instituição" />` : ''}
                </div>

                <div class="titulo-documento">${window.escapeHTML(material.titulo || material.tema || 'Atividade Pedagógica')}</div>
                
                <div id="conteudo-documento">
                    ${conteudoFinalHTML}
                </div>

                <script>
                    window.onload = function() { 
                        if (typeof renderMathInElement === 'function') {
                            renderMathInElement(document.body, {
                                delimiters: [
                                    { left: '$$', right: '$$', display: true },
                                    { left: '\\\\[', right: '\\\\]', display: true },
                                    { left: '\\\\(', right: '\\\\)', display: false },
                                    { left: '$', right: '$', display: false }
                                ],
                                throwOnError: false
                            });
                        }
                        setTimeout(() => window.print(), 350); 
                    };
                <\/script>
            </body>
            </html>
        `;

        const win = window.open('', '_blank');
        if (win) {
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
                    <button type="button" onclick="window.controller.closeModal()" class="btn-secondary">Fechar</button>
                    <button type="button" onclick="conteudoGeradoView.copiarResultadoRubrica()" class="btn-primary" style="background: #10b981;">
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