// js/components/editorToolbar.js
// Componente de Barra de Ferramentas Profissional (Ribbon Word-Like) para o Planner Pro Docente
// 100% Vanilla JavaScript (ES6+), HTML5 e CSS3 - Padrão MVC

import { escapeHTML } from '../utils.js';
import { tableHelper } from '../utils/tableHelper.js';
import { imageHelper } from '../utils/imageHelper.js';
import { Toast } from './toast.js';

let _savedSelection = null;

export const EditorToolbar = {
    _corFonteAtiva: '#1e293b',
    _corDestaqueAtiva: '#fef08a',

    /**
     * Salva o Range de seleção atual do usuário para restaurar após interações em popovers ou seletores
     */
    salvarSelecao() {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            _savedSelection = sel.getRangeAt(0).cloneRange();
        }
    },

    /**
     * Restaura o Range de seleção salvo no editor ativo
     * @param {HTMLElement} editorEl 
     */
    restaurarSelecao(editorEl) {
        if (!editorEl) return;
        editorEl.focus();
        if (_savedSelection) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(_savedSelection);
        }
    },

    /**
     * Gera o HTML completo da Barra de Ferramentas Pedagógica Unificada
     * @param {string} targetEditorId - ID do elemento contenteditable de destino
     * @returns {string} HTML do componente
     */
    render(targetEditorId = 'editor-mat-wysiwyg') {
        const safeTargetId = escapeHTML(targetEditorId);

        return `
            <div class="planner-editor-toolbar" id="toolbar-${safeTargetId}" data-target-editor="${safeTargetId}">
                <!-- LINHA 1: TIPOGRAFIA, TAMANHO EM PT, CORES, ESTILOS DE TEXTO, ALINHAMENTO E LISTAS -->
                <div class="planner-toolbar-row">
                    <!-- GRUPO: FONTE E TAMANHO PT -->
                    <div class="planner-toolbar-group">
                        <select class="planner-toolbar-select" 
                                onfocus="EditorToolbar.salvarSelecao()"
                                onchange="EditorToolbar.aplicarFonte('${safeTargetId}', this.value); this.selectedIndex=0;"
                                title="Família da Fonte">
                            <option value="" disabled selected>Fonte</option>
                            <option value="Inter, sans-serif">Inter</option>
                            <option value="Roboto, sans-serif">Roboto</option>
                            <option value="Outfit, sans-serif">Outfit</option>
                            <option value="'Times New Roman', Times, serif">Times New Roman</option>
                            <option value="Arial, Helvetica, sans-serif">Arial</option>
                            <option value="Georgia, serif">Georgia</option>
                            <option value="'Courier Prime', Courier, monospace">Monospace</option>
                        </select>

                        <select class="planner-toolbar-select" 
                                onfocus="EditorToolbar.salvarSelecao()"
                                onchange="EditorToolbar.aplicarTamanhoPt('${safeTargetId}', this.value); this.selectedIndex=0;"
                                title="Tamanho da Fonte (em pt)">
                            <option value="" disabled selected>Tamanho</option>
                            <option value="8pt">8 pt</option>
                            <option value="9pt">9 pt</option>
                            <option value="10pt">10 pt</option>
                            <option value="11pt">11 pt</option>
                            <option value="12pt">12 pt (Padrão)</option>
                            <option value="14pt">14 pt</option>
                            <option value="16pt">16 pt</option>
                            <option value="18pt">18 pt</option>
                            <option value="20pt">20 pt</option>
                            <option value="24pt">24 pt</option>
                            <option value="28pt">28 pt</option>
                            <option value="32pt">32 pt</option>
                            <option value="36pt">36 pt</option>
                            <option value="48pt">48 pt</option>
                            <option value="72pt">72 pt</option>
                        </select>

                        <button type="button" class="planner-toolbar-btn" 
                                onmousedown="event.preventDefault(); EditorToolbar.salvarSelecao()"
                                onclick="EditorToolbar.ajustarPtRelativo('${safeTargetId}', 1)" 
                                title="Aumentar Fonte em 1pt (A^)">
                            <span style="font-weight: 800; font-size: 0.85rem;">A<sup>+1</sup></span>
                        </button>

                        <button type="button" class="planner-toolbar-btn" 
                                onmousedown="event.preventDefault(); EditorToolbar.salvarSelecao()"
                                onclick="EditorToolbar.ajustarPtRelativo('${safeTargetId}', -1)" 
                                title="Diminuir Fonte em 1pt (Av)">
                            <span style="font-weight: 800; font-size: 0.85rem;">A<sup>-1</sup></span>
                        </button>
                    </div>

                    <div class="planner-toolbar-divider"></div>

                    <!-- GRUPO: CORES E MARCA-TEXTO (SPLIT BUTTONS COM APLICAÇÃO RÁPIDA) -->
                    <div class="planner-toolbar-group">
                        <!-- COR DA FONTE (SPLIT BUTTON) -->
                        <div class="planner-toolbar-split-btn" id="wrap-forecolor-${safeTargetId}" title="Cor do Texto">
                            <button type="button" class="planner-toolbar-split-action"
                                    onmousedown="event.preventDefault(); EditorToolbar.salvarSelecao();"
                                    onclick="EditorToolbar.aplicarCorAtiva('${safeTargetId}', 'foreColor')"
                                    title="Aplicar Cor do Texto (${this._corFonteAtiva})">
                                <i class="fas fa-font" style="font-size: 0.75rem; color: #1e293b;"></i>
                                <div id="bar-forecolor-${safeTargetId}" class="planner-toolbar-color-bar" style="background-color: ${this._corFonteAtiva};"></div>
                            </button>
                            <label class="planner-toolbar-split-trigger" title="Escolher outra cor de texto...">
                                <i class="fas fa-caret-down" style="font-size: 0.55rem; color: #64748b;"></i>
                                <input type="color" value="${this._corFonteAtiva}"
                                       onmousedown="EditorToolbar.salvarSelecao()"
                                       oninput="EditorToolbar.atualizarEAplicarCor('${safeTargetId}', 'foreColor', this.value)"
                                       class="planner-toolbar-color-input">
                            </label>
                        </div>

                        <!-- COR DO MARCA-TEXTO (SPLIT BUTTON) -->
                        <div class="planner-toolbar-split-btn" id="wrap-hilitecolor-${safeTargetId}" title="Cor de Destaque (Marca-Texto)">
                            <button type="button" class="planner-toolbar-split-action"
                                    onmousedown="event.preventDefault(); EditorToolbar.salvarSelecao();"
                                    onclick="EditorToolbar.aplicarCorAtiva('${safeTargetId}', 'hiliteColor')"
                                    title="Aplicar Destaque (${this._corDestaqueAtiva})">
                                <i class="fas fa-highlighter" style="font-size: 0.75rem; color: #eab308;"></i>
                                <div id="bar-hilitecolor-${safeTargetId}" class="planner-toolbar-color-bar" style="background-color: ${this._corDestaqueAtiva};"></div>
                            </button>
                            <label class="planner-toolbar-split-trigger" title="Escolher outra cor de destaque...">
                                <i class="fas fa-caret-down" style="font-size: 0.55rem; color: #64748b;"></i>
                                <input type="color" value="${this._corDestaqueAtiva}"
                                       onmousedown="EditorToolbar.salvarSelecao()"
                                       oninput="EditorToolbar.atualizarEAplicarCor('${safeTargetId}', 'hiliteColor', this.value)"
                                       class="planner-toolbar-color-input">
                            </label>
                        </div>

                        <button type="button" class="planner-toolbar-btn" 
                                onmousedown="event.preventDefault(); EditorToolbar.salvarSelecao()"
                                onclick="EditorToolbar.executarComando('${safeTargetId}', 'removeFormat')" 
                                title="Limpar Formatação do Texto Selecionado">
                            <i class="fas fa-eraser text-slate-500"></i>
                        </button>
                    </div>

                    <div class="planner-toolbar-divider"></div>

                    <!-- GRUPO: ESTILOS DE CARACTERE (B, I, U, S, Sub, Super) -->
                    <div class="planner-toolbar-group">
                        <button type="button" class="planner-toolbar-btn" 
                                onmousedown="EditorToolbar.salvarSelecao()"
                                onclick="EditorToolbar.executarComando('${safeTargetId}', 'bold')" 
                                title="Negrito (Ctrl+B)">
                            <i class="fas fa-bold"></i>
                        </button>
                        <button type="button" class="planner-toolbar-btn" 
                                onmousedown="EditorToolbar.salvarSelecao()"
                                onclick="EditorToolbar.executarComando('${safeTargetId}', 'italic')" 
                                title="Itálico (Ctrl+I)">
                            <i class="fas fa-italic"></i>
                        </button>
                        <button type="button" class="planner-toolbar-btn" 
                                onmousedown="EditorToolbar.salvarSelecao()"
                                onclick="EditorToolbar.executarComando('${safeTargetId}', 'underline')" 
                                title="Sublinhado (Ctrl+U)">
                            <i class="fas fa-underline"></i>
                        </button>
                        <button type="button" class="planner-toolbar-btn" 
                                onmousedown="EditorToolbar.salvarSelecao()"
                                onclick="EditorToolbar.executarComando('${safeTargetId}', 'strikeThrough')" 
                                title="Tachado">
                            <i class="fas fa-strikethrough"></i>
                        </button>
                        <button type="button" class="planner-toolbar-btn" 
                                onmousedown="EditorToolbar.salvarSelecao()"
                                onclick="EditorToolbar.executarComando('${safeTargetId}', 'subscript')" 
                                title="Subscrito (Xᵢ)">
                            <span style="font-weight: 700;">X<sub>2</sub></span>
                        </button>
                        <button type="button" class="planner-toolbar-btn" 
                                onmousedown="EditorToolbar.salvarSelecao()"
                                onclick="EditorToolbar.executarComando('${safeTargetId}', 'superscript')" 
                                title="Sobrescrito (X²)">
                            <span style="font-weight: 700;">X<sup>2</sup></span>
                        </button>
                    </div>

                    <div class="planner-toolbar-divider"></div>

                    <!-- GRUPO: ALINHAMENTO E LISTAS -->
                    <div class="planner-toolbar-group">
                        <button type="button" class="planner-toolbar-btn" 
                                onmousedown="EditorToolbar.salvarSelecao()"
                                onclick="EditorToolbar.executarComando('${safeTargetId}', 'justifyLeft')" 
                                title="Alinhar à Esquerda">
                            <i class="fas fa-align-left"></i>
                        </button>
                        <button type="button" class="planner-toolbar-btn" 
                                onmousedown="EditorToolbar.salvarSelecao()"
                                onclick="EditorToolbar.executarComando('${safeTargetId}', 'justifyCenter')" 
                                title="Centralizar">
                            <i class="fas fa-align-center"></i>
                        </button>
                        <button type="button" class="planner-toolbar-btn" 
                                onmousedown="EditorToolbar.salvarSelecao()"
                                onclick="EditorToolbar.executarComando('${safeTargetId}', 'justifyRight')" 
                                title="Alinhar à Direita">
                            <i class="fas fa-align-right"></i>
                        </button>
                        <button type="button" class="planner-toolbar-btn" 
                                onmousedown="EditorToolbar.salvarSelecao()"
                                onclick="EditorToolbar.executarComando('${safeTargetId}', 'justifyFull')" 
                                title="Justificar">
                            <i class="fas fa-align-justify"></i>
                        </button>
                        <button type="button" class="planner-toolbar-btn" 
                                onmousedown="EditorToolbar.salvarSelecao()"
                                onclick="EditorToolbar.executarComando('${safeTargetId}', 'insertUnorderedList')" 
                                title="Lista com Marcadores">
                            <i class="fas fa-list-ul"></i>
                        </button>
                        <button type="button" class="planner-toolbar-btn" 
                                onmousedown="EditorToolbar.salvarSelecao()"
                                onclick="EditorToolbar.executarComando('${safeTargetId}', 'insertOrderedList')" 
                                title="Lista Numerada">
                            <i class="fas fa-list-ol"></i>
                        </button>
                        <button type="button" class="planner-toolbar-btn" 
                                onmousedown="EditorToolbar.salvarSelecao()"
                                onclick="EditorToolbar.executarComando('${safeTargetId}', 'outdent')" 
                                title="Diminuir Recuo / Desindentar (Shift+Tab)">
                            <i class="fas fa-outdent"></i>
                        </button>
                        <button type="button" class="planner-toolbar-btn" 
                                onmousedown="EditorToolbar.salvarSelecao()"
                                onclick="EditorToolbar.executarComando('${safeTargetId}', 'indent')" 
                                title="Aumentar Recuo / Indentar Lista Aninhada (Tab)">
                            <i class="fas fa-indent"></i>
                        </button>
                    </div>

                    <div class="planner-toolbar-divider"></div>

                    <!-- GRUPO: COLAR LIMPO E IMAGEM -->
                    <div class="planner-toolbar-group">
                        <button type="button" class="planner-toolbar-btn planner-toolbar-btn--highlight" 
                                onclick="EditorToolbar.colarLimpo('${safeTargetId}')" 
                                title="Colar Texto Sem Formatação Parasita">
                            <i class="fas fa-paste"></i> <span>Colar Limpo</span>
                        </button>
                        <button type="button" class="planner-toolbar-btn planner-toolbar-btn--image" 
                                onclick="EditorToolbar.inserirImagem('${safeTargetId}')" 
                                title="Inserir Imagem no Material">
                            <i class="fas fa-image"></i> <span>+ Imagem</span>
                        </button>
                    </div>
                </div>

                <!-- LINHA 2: MATEMÁTICA, SÍMBOLOS, TABELAS E ESTRUTURAS PEDAGÓGICAS PRONTAS -->
                <div class="planner-toolbar-row" style="background-color: #f1f5f9; border-top: 1px solid #e2e8f0;">
                    <!-- GRUPO: SÍMBOLOS E MATEMÁTICA -->
                    <div class="planner-toolbar-group">
                        <!-- POPUP: SÍMBOLOS MATEMÁTICOS BÁSICOS -->
                        <div class="planner-popover-wrapper">
                            <button type="button" class="planner-toolbar-btn planner-toolbar-btn--badge" 
                                    onmousedown="EditorToolbar.salvarSelecao()"
                                    onclick="EditorToolbar.togglePopover('popover-simbolos-${safeTargetId}')"
                                    title="Símbolos de Matemática Básica">
                                <i class="fas fa-square-root-variable text-indigo-600"></i>
                                <span>Símbolos</span>
                                <i class="fas fa-chevron-down text-xs ml-1 opacity-70"></i>
                            </button>
                            <div id="popover-simbolos-${safeTargetId}" class="planner-popover-content hidden">
                                <div class="planner-symbols-header">
                                    <span>Símbolos Matemáticos Básicos</span>
                                    <button type="button" onclick="EditorToolbar.togglePopover('popover-simbolos-${safeTargetId}')" class="planner-popover-close">&times;</button>
                                </div>
                                <div class="planner-symbols-grid">
                                    ${this._renderBotoesSimbolos(safeTargetId)}
                                </div>
                            </div>
                        </div>

                        <!-- POPUP: LETRAS GREGAS -->
                        <div class="planner-popover-wrapper">
                            <button type="button" class="planner-toolbar-btn planner-toolbar-btn--badge" 
                                    onmousedown="EditorToolbar.salvarSelecao()"
                                    onclick="EditorToolbar.togglePopover('popover-gregas-${safeTargetId}')"
                                    title="Letras Gregas (Minúsculas e Maiúsculas)">
                                <span style="font-family: serif; font-weight: bold; font-size: 0.95rem; color: #4338ca;">αβγ</span>
                                <span>Gregas</span>
                                <i class="fas fa-chevron-down text-xs ml-1 opacity-70"></i>
                            </button>
                            <div id="popover-gregas-${safeTargetId}" class="planner-popover-content hidden" style="min-width: 320px;">
                                <div class="planner-symbols-header">
                                    <span>Alfabeto Grego & Variações</span>
                                    <button type="button" onclick="EditorToolbar.togglePopover('popover-gregas-${safeTargetId}')" class="planner-popover-close">&times;</button>
                                </div>
                                <div style="padding: 0.5rem; max-height: 260px; overflow-y: auto;" class="custom-scrollbar">
                                    <div style="font-size: 0.6875rem; font-weight: 800; color: #64748b; margin-bottom: 0.25rem; text-transform: uppercase;">Minúsculas</div>
                                    <div class="planner-symbols-grid" style="margin-bottom: 0.5rem;">
                                        ${this._renderBotoesGregasMinusculas(safeTargetId)}
                                    </div>
                                    <div style="font-size: 0.6875rem; font-weight: 800; color: #64748b; margin-bottom: 0.25rem; text-transform: uppercase;">Maiúsculas</div>
                                    <div class="planner-symbols-grid" style="margin-bottom: 0.5rem;">
                                        ${this._renderBotoesGregasMaiusculas(safeTargetId)}
                                    </div>
                                    <div style="font-size: 0.6875rem; font-weight: 800; color: #64748b; margin-bottom: 0.25rem; text-transform: uppercase;">Variações</div>
                                    <div class="planner-symbols-grid">
                                        ${this._renderBotoesGregasVariacoes(safeTargetId)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- POPUP: EQUAÇÕES PRONTAS (WORD EQUATION RIBBON) -->
                        <div class="planner-popover-wrapper">
                            <button type="button" class="planner-toolbar-btn planner-toolbar-btn--badge" 
                                    onmousedown="EditorToolbar.salvarSelecao()"
                                    onclick="EditorToolbar.togglePopover('popover-equacoes-${safeTargetId}')"
                                    title="Fórmulas e Equações Clássicas">
                                <i class="fas fa-calculator text-blue-600"></i>
                                <span>Equações</span>
                                <i class="fas fa-chevron-down text-xs ml-1 opacity-70"></i>
                            </button>
                            <div id="popover-equacoes-${safeTargetId}" class="planner-popover-content hidden" style="min-width: 320px; max-width: 420px;">
                                <div class="planner-symbols-header">
                                    <span>Modelos de Equações Predefinidas</span>
                                    <button type="button" onclick="EditorToolbar.togglePopover('popover-equacoes-${safeTargetId}')" class="planner-popover-close">&times;</button>
                                </div>
                                <div style="padding: 0.5rem; max-height: 280px; overflow-y: auto;" class="custom-scrollbar">
                                    ${this._renderModelosEquacoes(safeTargetId)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="planner-toolbar-divider"></div>

                    <!-- GRUPO: TABELA COM GRID RÁPIDO & MODAL -->
                    <div class="planner-toolbar-group">
                        <div class="planner-popover-wrapper">
                            <button type="button" class="planner-toolbar-btn planner-toolbar-btn--table" 
                                    onmousedown="EditorToolbar.salvarSelecao()"
                                    onclick="EditorToolbar.togglePopover('popover-tabela-${safeTargetId}')"
                                    title="Inserir e Configurar Tabela">
                                <i class="fas fa-table"></i>
                                <span>Tabela</span>
                                <i class="fas fa-chevron-down text-xs ml-1 opacity-70"></i>
                            </button>
                            <div id="popover-tabela-${safeTargetId}" class="planner-popover-content hidden" style="padding: 0.75rem; width: 220px;">
                                <div style="font-size: 0.75rem; font-weight: 800; color: #1e293b; margin-bottom: 0.5rem; text-align: center;">
                                    Inserir Tabela (<span id="tbl-grid-label-${safeTargetId}">1x1</span>)
                                </div>
                                <div class="planner-table-picker-grid" 
                                     id="grid-picker-${safeTargetId}"
                                     onmouseleave="EditorToolbar.resetTableGridPicker('${safeTargetId}')">
                                    ${this._renderTableGridCells(safeTargetId)}
                                </div>
                                <div style="margin-top: 0.75rem; border-top: 1px solid #e2e8f0; padding-top: 0.5rem;">
                                    <button type="button" class="btn-secondary" style="width: 100%; font-size: 0.75rem; padding: 0.35rem 0.5rem; font-weight: 700;"
                                            onmousedown="EditorToolbar.salvarSelecao()"
                                            onclick="EditorToolbar.abrirModalConfigTabela('${safeTargetId}')">
                                        <i class="fas fa-cog mr-1"></i> Mais Opções de Tabela...
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="planner-toolbar-divider"></div>

                    <!-- GRUPO: ESTRUTURAS PEDAGÓGICAS PRONTAS -->
                    <div class="planner-toolbar-group" style="flex-wrap: wrap;">
                        <button type="button" class="planner-pedag-btn planner-pedag-btn--gabarito" 
                                onclick="EditorToolbar.inserirBlocoPedagogico('${safeTargetId}', 'gabarito')"
                                title="Inserir Bloco de Gabarito (Oculto na Versão do Aluno)">
                            <i class="fas fa-check-circle"></i> + Gabarito
                        </button>
                        <button type="button" class="planner-pedag-btn planner-pedag-btn--comentario" 
                                onclick="EditorToolbar.inserirBlocoPedagogico('${safeTargetId}', 'comentario')"
                                title="Inserir Orientação / Comentário Pedagógico">
                            <i class="fas fa-comment-dots"></i> + Comentário
                        </button>
                        <button type="button" class="planner-pedag-btn planner-pedag-btn--rubrica" 
                                onclick="EditorToolbar.inserirBlocoPedagogico('${safeTargetId}', 'rubrica')"
                                title="Inserir Rúbrica Avaliativa">
                            <i class="fas fa-tasks"></i> + Rúbrica
                        </button>
                        <button type="button" class="planner-pedag-btn planner-pedag-btn--pbl" 
                                onclick="EditorToolbar.inserirBlocoPedagogico('${safeTargetId}', 'pbl')"
                                title="Inserir Roteiro de Projeto PBL">
                            <i class="fas fa-project-diagram"></i> + Projeto PBL
                        </button>
                        <button type="button" class="planner-pedag-btn planner-pedag-btn--jeopardy" 
                                onclick="EditorToolbar.inserirBlocoPedagogico('${safeTargetId}', 'jeopardy')"
                                title="Inserir Jogo de Revisão Jeopardy">
                            <i class="fas fa-gamepad"></i> + Jogo Jeopardy
                        </button>
                        <button type="button" class="planner-pedag-btn planner-pedag-btn--dua" 
                                onclick="EditorToolbar.inserirBlocoPedagogico('${safeTargetId}', 'dua')"
                                title="Inserir Quadro de Opções DUA">
                            <i class="fas fa-th-large"></i> + Quadro DUA
                        </button>
                        <button type="button" class="planner-pedag-btn planner-pedag-btn--lab" 
                                onclick="EditorToolbar.inserirBlocoPedagogico('${safeTargetId}', 'lab')"
                                title="Inserir Roteiro de Laboratório">
                            <i class="fas fa-flask"></i> + Roteiro Lab
                        </button>
                        <button type="button" class="planner-pedag-btn planner-pedag-btn--linhas" 
                                onclick="EditorToolbar.inserirBlocoPedagogico('${safeTargetId}', 'linhas')"
                                title="Inserir Linhas Pautadas para Respostas Discursivas">
                            <i class="fas fa-align-justify"></i> + Linhas
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Executa comandos nativos com ativação de estilos CSS limpos
     */
    executarComando(targetId, comando, valor = null) {
        const editor = document.getElementById(targetId);
        if (!editor) return;
        this.restaurarSelecao(editor);
        document.execCommand('styleWithCSS', false, true);
        document.execCommand(comando, false, valor);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    },

    /**
     * Aplica família de fonte na seleção
     */
    aplicarFonte(targetId, fonte) {
        if (!fonte) return;
        this.executarComando(targetId, 'fontName', fonte);
    },

    /**
     * Aplica tamanho tipográfico em pt no texto selecionado
     */
    aplicarTamanhoPt(targetId, ptString) {
        const editor = document.getElementById(targetId);
        if (!editor) return;
        this.restaurarSelecao(editor);

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
            Toast.show("Selecione um trecho de texto para aplicar o tamanho.", "warning");
            return;
        }

        document.execCommand('styleWithCSS', false, true);
        document.execCommand('fontSize', false, '7'); // marcador temporário

        const fontSpans = editor.querySelectorAll('span[style*="font-size: -webkit-xxx-large"], font[size="7"], span[style*="font-size: 36pt"], span[style*="font-size: xxx-large"]');
        fontSpans.forEach(el => {
            el.removeAttribute('size');
            el.style.fontSize = ptString;
        });

        editor.dispatchEvent(new Event('input', { bubbles: true }));
    },

    /**
     * Incrementa ou decrementa o tamanho da fonte em exatamente 1pt
     */
    ajustarPtRelativo(targetId, deltaPt) {
        const editor = document.getElementById(targetId);
        if (!editor) return;
        this.restaurarSelecao(editor);

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        let parentEl = sel.anchorNode?.nodeType === 1 ? sel.anchorNode : sel.anchorNode?.parentElement;
        let currentSize = 12; // padrão 12pt

        if (parentEl) {
            const computed = window.getComputedStyle(parentEl).fontSize;
            const pxVal = parseFloat(computed) || 16;
            currentSize = Math.round(pxVal * 0.75); // converte px para pt
        }

        const novoPt = Math.max(6, Math.min(120, currentSize + deltaPt)) + 'pt';
        this.aplicarTamanhoPt(targetId, novoPt);
    },

    /**
     * Aplica a cor ativa memorizada (Split Button - clique principal)
     */
    aplicarCorAtiva(targetId, tipo) {
        if (tipo === 'foreColor') {
            this.aplicarCorFonte(targetId, this._corFonteAtiva);
        } else if (tipo === 'hiliteColor') {
            this.aplicarMarcaTexto(targetId, this._corDestaqueAtiva);
        }
    },

    /**
     * Atualiza a cor ativa memorizada e aplica imediatamente à seleção
     */
    atualizarEAplicarCor(targetId, tipo, cor) {
        if (!cor) return;
        if (tipo === 'foreColor') {
            this._corFonteAtiva = cor;
            const b = document.getElementById(`bar-forecolor-${targetId}`);
            if (b) b.style.backgroundColor = cor;
            this.aplicarCorFonte(targetId, cor);
        } else if (tipo === 'hiliteColor') {
            this._corDestaqueAtiva = cor;
            const b = document.getElementById(`bar-hilitecolor-${targetId}`);
            if (b) b.style.backgroundColor = cor;
            this.aplicarMarcaTexto(targetId, cor);
        }
    },

    /**
     * Aplica cor da fonte
     */
    aplicarCorFonte(targetId, cor) {
        if (!cor) return;
        this.executarComando(targetId, 'foreColor', cor);
    },

    /**
     * Aplica cor de destaque / marca-texto
     */
    aplicarMarcaTexto(targetId, cor) {
        if (!cor) return;
        this.executarComando(targetId, 'hiliteColor', cor);
    },

    /**
     * Alterna a visibilidade de popovers contextuais
     */
    togglePopover(popoverId) {
        const target = document.getElementById(popoverId);
        if (!target) return;
        const estaOculto = target.classList.contains('hidden');

        // Fecha todos os outros popovers abertos
        document.querySelectorAll('.planner-popover-content').forEach(p => p.classList.add('hidden'));

        if (estaOculto) {
            target.classList.remove('hidden');
        }
    },

    /**
     * Insere fragmento de texto ou fórmula LaTeX com delimitadores estritos \( \)
     */
    inserirSnippet(targetId, snippet, fecharPopoverId = null) {
        const editor = document.getElementById(targetId)
            || document.getElementById('manual-conteudo-wysiwyg')
            || document.getElementById('editor-mat-wysiwyg');
        if (!editor) return;
        this.restaurarSelecao(editor);

        if (editor.isContentEditable || editor.contentEditable === 'true') {
            const sel = window.getSelection();
            let inserted = false;
            if (sel && sel.rangeCount > 0) {
                try {
                    inserted = document.execCommand('insertHTML', false, snippet);
                } catch (e) {
                    inserted = false;
                }
            }
            if (!inserted) {
                if (sel && sel.rangeCount > 0) {
                    const range = sel.getRangeAt(0);
                    range.deleteContents();
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = snippet;
                    const frag = document.createDocumentFragment();
                    let node, lastNode;
                    while ((node = tempDiv.firstChild)) {
                        lastNode = frag.appendChild(node);
                    }
                    range.insertNode(frag);
                    if (lastNode) {
                        range.setStartAfter(lastNode);
                        range.setEndAfter(lastNode);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                } else {
                    editor.focus();
                    editor.innerHTML += snippet;
                }
            }
        } else if (editor.value !== undefined) {
            const start = editor.selectionStart || 0;
            const end = editor.selectionEnd || 0;
            editor.value = editor.value.substring(0, start) + snippet + editor.value.substring(end);
            editor.selectionStart = start + snippet.length;
            editor.selectionEnd = start + snippet.length;
            editor.focus();
        }

        editor.dispatchEvent(new Event('input', { bubbles: true }));

        if (fecharPopoverId) {
            this.togglePopover(fecharPopoverId);
        }
    },

    /**
     * Limpa o texto da área de transferência e insere sem códigos parasitas
     */
    async colarLimpo(targetId) {
        const editor = document.getElementById(targetId);
        if (!editor) return;
        this.restaurarSelecao(editor);

        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                const text = await navigator.clipboard.readText();
                if (text) {
                    const formatted = escapeHTML(text).replace(/\r\n|\r|\n/g, '<br>');
                    document.execCommand('insertHTML', false, formatted);
                    editor.dispatchEvent(new Event('input', { bubbles: true }));
                    Toast.show("Texto limpo inserido com sucesso!", "success");
                    return;
                }
            }
        } catch (e) {
            console.warn("Clipboard API indisponível, solicitando via prompt:", e);
        }

        Toast.show("Utilize Ctrl+Shift+V para colar sem formatação.", "info");
    },

    /**
     * Faz upload e insere imagem no editor com compressão inteligente e suporte a redimensionamento
     */
    inserirImagem(targetId) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            imageHelper.processarUploadImagem(file, (base64) => {
                const imgHtml = `<p><img src="${base64}" alt="Imagem pedagógica" style="width: 50%; max-width: 100%; height: auto; display: block; margin: 0.75rem auto; border-radius: 8px; border: 1px solid #cbd5e1;" /></p><p><br></p>`;
                this.inserirSnippet(targetId, imgHtml);

                const editor = document.getElementById(targetId)
                    || document.getElementById('manual-conteudo-wysiwyg')
                    || document.getElementById('editor-mat-wysiwyg');
                if (editor) {
                    imageHelper.inicializarInspetorImagens(editor);
                }

                Toast.show("Imagem inserida! Clique nela para redimensionar ou alinhar.", "success");
            });
        };
        input.click();
    },

    /**
     * Abre o modal completo de configurações de tabela
     */
    abrirModalConfigTabela(targetId) {
        this.togglePopover(`popover-tabela-${targetId}`);
        if (typeof tableHelper !== 'undefined') {
            tableHelper.abrirModalInserirTabela(targetId);
        }
    },

    /**
     * Interação visual com a grade de tabela
     */
    hoverTableGridPicker(targetId, maxRow, maxCol) {
        const label = document.getElementById(`tbl-grid-label-${targetId}`);
        if (label) label.innerText = `${maxRow}x${maxCol}`;

        const grid = document.getElementById(`grid-picker-${targetId}`);
        if (!grid) return;

        const cells = grid.querySelectorAll('.planner-table-picker-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.getAttribute('data-r'), 10);
            const c = parseInt(cell.getAttribute('data-c'), 10);
            if (r <= maxRow && c <= maxCol) {
                cell.classList.add('active');
            } else {
                cell.classList.remove('active');
            }
        });
    },

    resetTableGridPicker(targetId) {
        const label = document.getElementById(`tbl-grid-label-${targetId}`);
        if (label) label.innerText = '1x1';

        const grid = document.getElementById(`grid-picker-${targetId}`);
        if (!grid) return;

        grid.querySelectorAll('.planner-table-picker-cell').forEach(c => c.classList.remove('active'));
    },

    selecionarTableGrid(targetId, rows, cols) {
        this.togglePopover(`popover-tabela-${targetId}`);
        if (typeof tableHelper !== 'undefined') {
            tableHelper.inserirTabelaNoEditor(targetId, {
                linhas: rows,
                colunas: cols,
                cabecalho: true,
                tema: 'planner-table-bordered'
            });
        }
    },

    /**
     * Inserção de blocos pedagógicos estruturados
     */
    inserirBlocoPedagogico(targetId, tipo) {
        if (window.conteudoGeradoView) {
            switch (tipo) {
                case 'gabarito': window.conteudoGeradoView.inserirBlocoGabarito(targetId); break;
                case 'comentario': window.conteudoGeradoView.inserirComentarioProfessor(targetId); break;
                case 'rubrica': window.conteudoGeradoView.inserirRubricaAvaliacao(targetId); break;
                case 'pbl': window.conteudoGeradoView.inserirRoteiroPBL(targetId); break;
                case 'jeopardy': window.conteudoGeradoView.inserirJogoJeopardy(targetId); break;
                case 'dua': window.conteudoGeradoView.inserirChoiceBoardDUA(targetId); break;
                case 'lab': window.conteudoGeradoView.inserirRoteiroLaboratorio(targetId); break;
                case 'linhas': window.conteudoGeradoView.inserirLinhasResposta(targetId); break;
            }
        }
    },

    /**
     * Insere símbolo matemático ou letra grega a partir do atributo data-latex do botão
     */
    inserirSimboloDoBotao(btn, targetId) {
        if (!btn) return;
        const latex = btn.getAttribute('data-latex') || '';
        const popoverId = btn.getAttribute('data-popover') || null;
        if (!latex) return;
        this.inserirSnippet(targetId, ` \\(${latex}\\) `, popoverId);
    },

    /**
     * Insere modelo de equação a partir do atributo data-latex do card
     */
    inserirEquacaoDoCard(card, targetId) {
        if (!card) return;
        const latex = card.getAttribute('data-latex') || '';
        const popoverId = card.getAttribute('data-popover') || null;
        if (!latex) return;
        this.inserirSnippet(targetId, ` \\(${latex}\\) `, popoverId);
    },

    // -------------------------------------------------------------
    // RENDERIZADORES AUXILIARES DE SÍMBOLOS E GRIDS
    // -------------------------------------------------------------
    _renderBotoesSimbolos(targetId) {
        const simbolos = [
            { char: '±', latex: '\\pm' },
            { char: '∞', latex: '\\infty' },
            { char: '=', latex: '=' },
            { char: '≠', latex: '\\ne' },
            { char: '≈', latex: '\\approx' },
            { char: '×', latex: '\\times' },
            { char: '÷', latex: '\\div' },
            { char: '<', latex: '<' },
            { char: '≤', latex: '\\le' },
            { char: '>', latex: '>' },
            { char: '≥', latex: '\\ge' },
            { char: 'Δ', latex: '\\Delta' },
            { char: '∇', latex: '\\nabla' },
            { char: '∈', latex: '\\in' },
            { char: '∉', latex: '\\notin' },
            { char: '∃', latex: '\\exists' },
            { char: '∄', latex: '\\nexists' },
            { char: '∀', latex: '\\forall' },
            { char: '∅', latex: '\\emptyset' },
            { char: '%', latex: '\\%' },
            { char: '°', latex: '^\\circ' },
            { char: '°C', latex: '^\\circ\\text{C}' },
            { char: '°F', latex: '^\\circ\\text{F}' },
            { char: '→', latex: '\\to' },
            { char: '←', latex: '\\leftarrow' },
            { char: '↑', latex: '\\uparrow' },
            { char: '↓', latex: '\\downarrow' },
            { char: '↔', latex: '\\leftrightarrow' },
            { char: '∴', latex: '\\therefore' },
            { char: '∵', latex: '\\because' },
            { char: '⊂', latex: '\\subset' },
            { char: '⊆', latex: '\\subseteq' },
            { char: '∪', latex: '\\cup' },
            { char: '∩', latex: '\\cap' },
            { char: '!', latex: '!' },
            { char: '~', latex: '\\sim' }
        ];

        return simbolos.map(s => `
            <button type="button" class="planner-symbol-btn" 
                    title="Inserir ${s.char}"
                    data-latex="${escapeHTML(s.latex)}"
                    data-popover="popover-simbolos-${targetId}"
                    onmousedown="event.preventDefault(); EditorToolbar.salvarSelecao();"
                    onclick="EditorToolbar.inserirSimboloDoBotao(this, '${targetId}')">
                ${s.char}
            </button>
        `).join('');
    },

    _renderBotoesGregasMinusculas(targetId) {
        const minusculas = [
            { c: 'α', l: '\\alpha' }, { c: 'β', l: '\\beta' }, { c: 'γ', l: '\\gamma' }, { c: 'δ', l: '\\delta' },
            { c: 'ε', l: '\\epsilon' }, { c: 'ζ', l: '\\zeta' }, { c: 'η', l: '\\eta' }, { c: 'θ', l: '\\theta' },
            { c: 'ι', l: '\\iota' }, { c: 'κ', l: '\\kappa' }, { c: 'λ', l: '\\lambda' }, { c: 'μ', l: '\\mu' },
            { c: 'ν', l: '\\nu' }, { c: 'ξ', l: '\\xi' }, { c: 'ο', l: 'o' }, { c: 'π', l: '\\pi' },
            { c: 'ρ', l: '\\rho' }, { c: 'σ', l: '\\sigma' }, { c: 'τ', l: '\\tau' }, { c: 'υ', l: '\\upsilon' },
            { c: 'φ', l: '\\phi' }, { c: 'χ', l: '\\chi' }, { c: 'ψ', l: '\\psi' }, { c: 'ω', l: '\\omega' }
        ];

        return minusculas.map(g => `
            <button type="button" class="planner-symbol-btn" 
                    title="Inserir ${g.c}"
                    data-latex="${escapeHTML(g.l)}"
                    data-popover="popover-gregas-${targetId}"
                    onmousedown="event.preventDefault(); EditorToolbar.salvarSelecao();"
                    onclick="EditorToolbar.inserirSimboloDoBotao(this, '${targetId}')">
                ${g.c}
            </button>
        `).join('');
    },

    _renderBotoesGregasMaiusculas(targetId) {
        const maiusculas = [
            { c: 'Α', l: 'A' }, { c: 'Β', l: 'B' }, { c: 'Γ', l: '\\Gamma' }, { c: 'Δ', l: '\\Delta' },
            { c: 'Ε', l: 'E' }, { c: 'Ζ', l: 'Z' }, { c: 'Η', l: 'H' }, { c: 'Θ', l: '\\Theta' },
            { c: 'Ι', l: 'I' }, { c: 'Κ', l: 'K' }, { c: 'Λ', l: '\\Lambda' }, { c: 'Μ', l: 'M' },
            { c: 'Ν', l: 'N' }, { c: 'Ξ', l: '\\Xi' }, { c: 'Ο', l: 'O' }, { c: 'Π', l: '\\Pi' },
            { c: 'Ρ', l: 'P' }, { c: 'Σ', l: '\\Sigma' }, { c: 'Τ', l: 'T' }, { c: 'Υ', l: '\\Upsilon' },
            { c: 'Φ', l: '\\Phi' }, { c: 'Χ', l: 'X' }, { c: 'Ψ', l: '\\Psi' }, { c: 'Ω', l: '\\Omega' }
        ];

        return maiusculas.map(g => `
            <button type="button" class="planner-symbol-btn" 
                    title="Inserir ${g.c}"
                    data-latex="${escapeHTML(g.l)}"
                    data-popover="popover-gregas-${targetId}"
                    onmousedown="event.preventDefault(); EditorToolbar.salvarSelecao();"
                    onclick="EditorToolbar.inserirSimboloDoBotao(this, '${targetId}')">
                ${g.c}
            </button>
        `).join('');
    },

    _renderBotoesGregasVariacoes(targetId) {
        const variacoes = [
            { c: 'ϑ', l: '\\vartheta' }, { c: 'ϖ', l: '\\varpi' }, { c: 'ϱ', l: '\\varrho' },
            { c: 'ς', l: '\\varsigma' }, { c: 'ϕ', l: '\\varphi' }, { c: 'ϰ', l: '\\varkappa' },
            { c: 'ε', l: '\\varepsilon' }
        ];

        return variacoes.map(g => `
            <button type="button" class="planner-symbol-btn" 
                    title="Inserir ${g.c}"
                    data-latex="${escapeHTML(g.l)}"
                    data-popover="popover-gregas-${targetId}"
                    onmousedown="event.preventDefault(); EditorToolbar.salvarSelecao();"
                    onclick="EditorToolbar.inserirSimboloDoBotao(this, '${targetId}')">
                ${g.c}
            </button>
        `).join('');
    },

    _renderModelosEquacoes(targetId) {
        const modelos = [
            {
                nome: "Área do Círculo",
                desc: "A = πr²",
                latex: "A = \\pi r^2"
            },
            {
                nome: "Fórmula Quadrática (Bhaskara)",
                desc: "x = (-b ± √(b² - 4ac)) / 2a",
                latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"
            },
            {
                nome: "Binômio de Newton",
                desc: "(x + a)ⁿ = Σ C(n,k) xᵏ aⁿ⁻ᵏ",
                latex: "(x + a)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^k a^{n-k}"
            },
            {
                nome: "Série de Taylor (Exponencial)",
                desc: "eˣ = 1 + x + x²/2! + ...",
                latex: "e^x = 1 + \\frac{x}{1!} + \\frac{x^2}{2!} + \\frac{x^3}{3!} + \\dots"
            },
            {
                nome: "Fração e Raiz",
                desc: "Fração e Raiz Quadrada",
                latex: "\\frac{a}{b} + \\sqrt{x}"
            },
            {
                nome: "Integral Definida",
                desc: "∫ f(x) dx de a até b",
                latex: "\\int_{a}^{b} f(x)\\,dx"
            },
            {
                nome: "Limite Fundamental",
                desc: "lim (sin x / x) = 1 quando x -> 0",
                latex: "\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1"
            },
            {
                nome: "Matriz 2x2",
                desc: "Matriz com parênteses",
                latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}"
            }
        ];

        return modelos.map(m => `
            <div class="planner-equation-item" 
                 data-latex="${escapeHTML(m.latex)}"
                 data-popover="popover-equacoes-${targetId}"
                 onmousedown="event.preventDefault(); EditorToolbar.salvarSelecao();"
                 onclick="EditorToolbar.inserirEquacaoDoCard(this, '${targetId}')">
                <div style="font-weight: 700; font-size: 0.8125rem; color: #1e293b;">${escapeHTML(m.nome)}</div>
                <div style="font-family: monospace; font-size: 0.75rem; color: #4338ca; background: #eef2ff; padding: 0.25rem 0.5rem; border-radius: 4px; margin-top: 0.25rem;">
                    ${escapeHTML(m.desc)}
                </div>
            </div>
        `).join('');
    },

    _renderTableGridCells(targetId) {
        let html = '';
        for (let r = 1; r <= 8; r++) {
            for (let c = 1; c <= 8; c++) {
                html += `
                    <div class="planner-table-picker-cell" 
                         data-r="${r}" data-c="${c}"
                         onmouseenter="EditorToolbar.hoverTableGridPicker('${targetId}', ${r}, ${c})"
                         onmousedown="event.preventDefault(); EditorToolbar.salvarSelecao();"
                         onclick="EditorToolbar.selecionarTableGrid('${targetId}', ${r}, ${c})"></div>
                `;
            }
        }
        return html;
    }
};

// Fechamento automático de popovers ao clicar fora
if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.planner-popover-wrapper')) {
            document.querySelectorAll('.planner-popover-content').forEach(p => p.classList.add('hidden'));
        }
    });
}

// Vinculação global
if (typeof window !== 'undefined') {
    window.EditorToolbar = EditorToolbar;
}
