// js/utils/tableHelper.js
// Utilitário avançado e modular para criação, edição e personalização de tabelas no Planner Pro Docente
// 100% Vanilla JavaScript (ES6+), HTML5 e CSS3 - Padrão MVC

import { ModalComponent } from '../components/modal.js';
import { Toast } from '../components/toast.js';
import { escapeHTML } from '../utils.js';
import { EventDelegator } from './eventDelegator.js';

let _activeCell = null;
let _activeTable = null;
let _activeToolbar = null;
let _currentEditor = null;
let _documentClickHandler = null;
let _editorKeyUpHandler = null;

export const tableHelper = {
    /**
     * Abre o modal intuitivo para configuração e inserção de uma nova tabela no editor.
     * @param {string|HTMLElement} targetEditorId - ID ou elemento do editor contenteditable/textarea
     */
    abrirModalInserirTabela(targetEditorId = 'manual-conteudo-wysiwyg') {
        const editor = typeof targetEditorId === 'string' ? document.getElementById(targetEditorId) : targetEditorId;
        const targetIdStr = typeof targetEditorId === 'string' ? targetEditorId : (editor ? editor.id : 'manual-conteudo-wysiwyg');

        const modalHtml = `
            <div style="padding: 1.25rem; display: flex; flex-direction: column; gap: 1.25rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem; border-bottom: 1px solid var(--color-slate-100); padding-bottom: 0.75rem;">
                    <div style="width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                        <i class="fas fa-table-cells"></i>
                    </div>
                    <div>
                        <h4 style="margin: 0; font-size: 1rem; font-weight: 800; color: #1e293b;">Configurar Tabela Pedagógica</h4>
                        <p style="margin: 0; font-size: 0.8125rem; color: #64748b;">Defina a estrutura e o estilo visual da sua tabela.</p>
                    </div>
                </div>

                <!-- DIMENSÕES DA TABELA -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <label class="form-label" style="font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 0.35rem; display: block;">
                            <i class="fas fa-arrows-alt-v" style="color: #6366f1;"></i> Linhas de Dados
                        </label>
                        <input type="number" id="tbl-input-linhas" min="1" max="25" value="3" class="form-input" style="width: 100%; font-weight: 700; padding: 0.6rem; border-radius: 0.5rem; border: 1.5px solid #cbd5e1;">
                    </div>
                    <div>
                        <label class="form-label" style="font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 0.35rem; display: block;">
                            <i class="fas fa-arrows-alt-h" style="color: #6366f1;"></i> Colunas
                        </label>
                        <input type="number" id="tbl-input-colunas" min="1" max="10" value="3" class="form-input" style="width: 100%; font-weight: 700; padding: 0.6rem; border-radius: 0.5rem; border: 1.5px solid #cbd5e1;">
                    </div>
                </div>

                <!-- OPÇÕES E CABEÇALHO -->
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; background: #f8fafc; padding: 0.875rem; border-radius: 0.75rem; border: 1px solid #e2e8f0;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; font-weight: 600; color: #334155; cursor: pointer;">
                        <input type="checkbox" id="tbl-input-cabecalho" checked style="width: 1.1rem; height: 1.1rem; accent-color: #4f46e5; cursor: pointer;">
                        Incluir Linha de Cabeçalho (Título das Colunas)
                    </label>
                </div>

                <!-- ESTILO VISUAL / TEMA -->
                <div>
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 0.5rem; display: block;">
                        Estilo Visual da Tabela
                    </label>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.6rem;">
                        <label style="display: flex; flex-direction: column; gap: 0.25rem; border: 2px solid #4f46e5; background: #eef2ff; padding: 0.6rem; border-radius: 0.5rem; cursor: pointer; text-align: center;" class="tbl-theme-card" data-theme="planner-table-bordered">
                            <input type="radio" name="tbl-tema" value="planner-table-bordered" checked style="display: none;">
                            <span style="font-size: 0.8125rem; font-weight: 800; color: #312e81;"><i class="fas fa-border-all"></i> Grade Completa</span>
                            <span style="font-size: 0.6875rem; color: #6366f1;">Bordas nítidas em todas as células</span>
                        </label>
                        <label style="display: flex; flex-direction: column; gap: 0.25rem; border: 2px solid #e2e8f0; background: #ffffff; padding: 0.6rem; border-radius: 0.5rem; cursor: pointer; text-align: center;" class="tbl-theme-card" data-theme="planner-table-zebra">
                            <input type="radio" name="tbl-tema" value="planner-table-zebra" style="display: none;">
                            <span style="font-size: 0.8125rem; font-weight: 800; color: #0f172a;"><i class="fas fa-bars-staggered"></i> Zebrada</span>
                            <span style="font-size: 0.6875rem; color: #64748b;">Linhas alternadas com fundo suave</span>
                        </label>
                        <label style="display: flex; flex-direction: column; gap: 0.25rem; border: 2px solid #e2e8f0; background: #ffffff; padding: 0.6rem; border-radius: 0.5rem; cursor: pointer; text-align: center;" class="tbl-theme-card" data-theme="planner-table-horizontal">
                            <input type="radio" name="tbl-tema" value="planner-table-horizontal" style="display: none;">
                            <span style="font-size: 0.8125rem; font-weight: 800; color: #0f172a;"><i class="fas fa-grip-lines"></i> Linhas Horizontais</span>
                            <span style="font-size: 0.6875rem; color: #64748b;">Estilo ENEM / Vestibulares</span>
                        </label>
                        <label style="display: flex; flex-direction: column; gap: 0.25rem; border: 2px solid #e2e8f0; background: #ffffff; padding: 0.6rem; border-radius: 0.5rem; cursor: pointer; text-align: center;" class="tbl-theme-card" data-theme="planner-table-clean">
                            <input type="radio" name="tbl-tema" value="planner-table-clean" style="display: none;">
                            <span style="font-size: 0.8125rem; font-weight: 800; color: #0f172a;"><i class="fas fa-table"></i> Minimalista</span>
                            <span style="font-size: 0.6875rem; color: #64748b;">Apenas separação de cabeçalho</span>
                        </label>
                    </div>
                </div>

                <!-- BOTÕES DE AÇÃO -->
                <div id="modal-inserir-tabela-actions" style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--color-slate-100); padding-top: 1rem; margin-top: 0.25rem;">
                    <button type="button" data-action="cancelar-tabela" class="btn-secondary" style="padding: 0.6rem 1.25rem; font-weight: 700;">Cancelar</button>
                    <button type="button" data-action="confirmar-tabela" data-target="${escapeHTML(targetIdStr)}" class="btn-primary" style="background-color: #4f46e5; padding: 0.6rem 1.5rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-check"></i> Inserir Tabela no Material
                    </button>
                </div>
            </div>
        `;

        ModalComponent.open({
            id: 'modal-inserir-tabela-planner',
            title: 'Inserir Tabela',
            content: modalHtml,
            size: 'md'
        });

        setTimeout(() => {
            const modalEl = document.getElementById('modal-inserir-tabela-planner');
            if (modalEl) {
                EventDelegator.bind(modalEl, {
                    'cancelar-tabela': () => ModalComponent.close('modal-inserir-tabela-planner'),
                    'confirmar-tabela': (e, target) => {
                        const targetId = target.getAttribute('data-target');
                        if (targetId) this.confirmarInsercaoTabela(targetId);
                    }
                }, 'click');
            }

            const cards = document.querySelectorAll('.tbl-theme-card');
            cards.forEach(card => {
                card.addEventListener('click', () => {
                    cards.forEach(c => {
                        c.style.borderColor = '#e2e8f0';
                        c.style.backgroundColor = '#ffffff';
                        const radio = c.querySelector('input[type="radio"]');
                        if (radio) radio.checked = false;
                    });
                    card.style.borderColor = '#4f46e5';
                    card.style.backgroundColor = '#eef2ff';
                    const targetRadio = card.querySelector('input[type="radio"]');
                    if (targetRadio) targetRadio.checked = true;
                });
            });
        }, 50);
    },

    /**
     * Processa a confirmação do modal e injeta o HTML da tabela no editor.
     * @param {string} targetId 
     */
    confirmarInsercaoTabela(targetId) {
        const inputLinhas = document.getElementById('tbl-input-linhas');
        const inputColunas = document.getElementById('tbl-input-colunas');
        const inputCabecalho = document.getElementById('tbl-input-cabecalho');
        const temaSelecionado = document.querySelector('input[name="tbl-tema"]:checked')?.value || 'planner-table-bordered';

        const numLinhas = Math.max(1, Math.min(25, parseInt(inputLinhas?.value, 10) || 3));
        const numColunas = Math.max(1, Math.min(10, parseInt(inputColunas?.value, 10) || 3));
        const temCabecalho = !!inputCabecalho?.checked;

        ModalComponent.close('modal-inserir-tabela-planner');

        this.inserirTabelaNoEditor(targetId, {
            linhas: numLinhas,
            colunas: numColunas,
            cabecalho: temCabecalho,
            tema: temaSelecionado
        });
    },

    /**
     * Gera e insere o HTML da tabela estruturada dentro do editor contenteditable ou textarea.
     * @param {string|HTMLElement} targetEditor 
     * @param {Object} config 
     */
    inserirTabelaNoEditor(targetEditor, config = {}) {
        const editor = (typeof targetEditor === 'string' ? document.getElementById(targetEditor) : targetEditor)
            || document.getElementById('manual-conteudo-wysiwyg')
            || document.getElementById('editor-mat-wysiwyg');

        if (!editor) {
            Toast.show("Editor de texto não encontrado.", "error");
            return;
        }

        const numLinhas = config.linhas || 3;
        const numColunas = config.colunas || 3;
        const temCabecalho = config.cabecalho !== false;
        const temaClasse = config.tema || 'planner-table-bordered';

        let theadHtml = '';
        if (temCabecalho) {
            let thCols = '';
            for (let c = 1; c <= numColunas; c++) {
                thCols += `<th style="padding: 6px 10px; border: 1px solid #cbd5e1; background-color: #f1f5f9; font-weight: 700; text-align: left;">Coluna ${c}</th>`;
            }
            theadHtml = `<thead><tr>${thCols}</tr></thead>`;
        }

        let tbodyRows = '';
        for (let r = 1; r <= numLinhas; r++) {
            let tdCols = '';
            for (let c = 1; c <= numColunas; c++) {
                tdCols += `<td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left;">Item ${r}.${c}</td>`;
            }
            tbodyRows += `<tr>${tdCols}</tr>`;
        }
        const tbodyHtml = `<tbody>${tbodyRows}</tbody>`;

        // Container envolvente seguro que evita fragmentação no modo 2 colunas e transbordo
        const tabelaHtml = `
            <div class="planner-table-wrapper" style="margin: 0.875rem 0; width: 100%; max-width: 100%; overflow-x: auto; break-inside: avoid; page-break-inside: avoid;">
                <table class="planner-table ${temaClasse}" style="width: 100%; max-width: 100%; border-collapse: collapse; margin: 0; font-size: inherit; line-height: 1.4; table-layout: auto; break-inside: avoid; page-break-inside: avoid;">
                    ${theadHtml}
                    ${tbodyHtml}
                </table>
            </div>
            <p>&nbsp;</p>
        `;

        editor.focus();

        if (editor.isContentEditable || editor.contentEditable === 'true') {
            document.execCommand('insertHTML', false, tabelaHtml);
        } else if (editor.value !== undefined) {
            const start = editor.selectionStart || 0;
            const end = editor.selectionEnd || 0;
            editor.value = editor.value.substring(0, start) + `\n${tabelaHtml}\n` + editor.value.substring(end);
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        }

        Toast.show("Tabela inserida com sucesso!", "success");

        // Inicializa ou reativa o inspetor flutuante para esta tabela
        this.inicializarInspetorTabelas(editor);
    },

    /**
     * Vincula ouvintes no editor contenteditable para exibir a barra flutuante de ações ao clicar em uma célula.
     * @param {HTMLElement|string} editorElement 
     */
    inicializarInspetorTabelas(editorElement) {
        const editor = typeof editorElement === 'string' ? document.getElementById(editorElement) : editorElement;
        if (!editor) return;

        _currentEditor = editor;

        // Remove handlers pré-existentes para evitar duplicações
        this.destruirInspetorTabelas();

        _documentClickHandler = (e) => {
            const cell = e.target.closest('td, th');
            const table = cell ? cell.closest('table') : null;
            const toolbar = document.getElementById('table-floating-toolbar-planner');

            // Se o clique foi na própria barra flutuante ou seus botões, mantém a barra aberta
            if (toolbar && (toolbar.contains(e.target) || e.target.closest('#table-floating-toolbar-planner'))) {
                return;
            }

            if (cell && table && editor.contains(table)) {
                _activeCell = cell;
                _activeTable = table;
                this.exibirBarraFlutuante(cell);
            } else {
                this.ocultarBarraFlutuante();
            }
        };

        _editorKeyUpHandler = (e) => {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            const anchor = selection.anchorNode;
            const cell = anchor ? (anchor.nodeType === 1 ? anchor.closest('td, th') : anchor.parentElement?.closest('td, th')) : null;
            const table = cell ? cell.closest('table') : null;

            if (cell && table && editor.contains(table)) {
                _activeCell = cell;
                _activeTable = table;
                this.exibirBarraFlutuante(cell);
            } else {
                this.ocultarBarraFlutuante();
            }
        };

        document.addEventListener('click', _documentClickHandler, true);
        editor.addEventListener('keyup', _editorKeyUpHandler);
    },

    /**
     * Desvincula ouvintes de eventos e remove a barra flutuante.
     */
    destruirInspetorTabelas() {
        if (_documentClickHandler) {
            document.removeEventListener('click', _documentClickHandler, true);
            _documentClickHandler = null;
        }
        if (_currentEditor && _editorKeyUpHandler) {
            _currentEditor.removeEventListener('keyup', _editorKeyUpHandler);
            _editorKeyUpHandler = null;
        }
        this.ocultarBarraFlutuante();
    },

    /**
     * Renderiza e posiciona a barra flutuante de ações contextuais próxima à célula ativa da tabela.
     * @param {HTMLElement} cellElement 
     */
    exibirBarraFlutuante(cellElement) {
        if (!cellElement) return;

        let toolbar = document.getElementById('table-floating-toolbar-planner');
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.id = 'table-floating-toolbar-planner';
            toolbar.className = 'table-floating-toolbar';
            toolbar.style.cssText = `
                position: fixed;
                z-index: 10000;
                background: #1e293b;
                color: #ffffff;
                border-radius: 0.5rem;
                padding: 0.35rem 0.5rem;
                display: flex;
                align-items: center;
                gap: 0.3rem;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
                font-family: inherit;
                font-size: 0.75rem;
                transition: opacity 0.15s ease, transform 0.15s ease;
                opacity: 0;
                transform: translateY(4px);
                pointer-events: auto;
            `;

            toolbar.innerHTML = `
                <!-- LINHAS -->
                <button type="button" data-tbl-action="add-row-above" title="Adicionar Linha Acima" style="background: none; border: none; color: #cbd5e1; padding: 0.25rem 0.4rem; cursor: pointer; border-radius: 0.25rem; font-size: 0.75rem;" onmouseover="this.style.color='#ffffff'; this.style.backgroundColor='#334155';" onmouseout="this.style.color='#cbd5e1'; this.style.backgroundColor='transparent';">
                    <i class="fas fa-arrow-up"></i> +Linha
                </button>
                <button type="button" data-tbl-action="add-row-below" title="Adicionar Linha Abaixo" style="background: none; border: none; color: #cbd5e1; padding: 0.25rem 0.4rem; cursor: pointer; border-radius: 0.25rem; font-size: 0.75rem;" onmouseover="this.style.color='#ffffff'; this.style.backgroundColor='#334155';" onmouseout="this.style.color='#cbd5e1'; this.style.backgroundColor='transparent';">
                    <i class="fas fa-arrow-down"></i> +Linha
                </button>
                <button type="button" data-tbl-action="delete-row" title="Excluir Linha Atual" style="background: none; border: none; color: #f87171; padding: 0.25rem 0.4rem; cursor: pointer; border-radius: 0.25rem; font-size: 0.75rem;" onmouseover="this.style.color='#ef4444'; this.style.backgroundColor='#451a1a';" onmouseout="this.style.color='#f87171'; this.style.backgroundColor='transparent';">
                    <i class="fas fa-trash-can"></i> Linha
                </button>

                <div style="width: 1px; height: 1.25rem; background: #475569; margin: 0 0.15rem;"></div>

                <!-- COLUNAS -->
                <button type="button" data-tbl-action="add-col-left" title="Adicionar Coluna à Esquerda" style="background: none; border: none; color: #cbd5e1; padding: 0.25rem 0.4rem; cursor: pointer; border-radius: 0.25rem; font-size: 0.75rem;" onmouseover="this.style.color='#ffffff'; this.style.backgroundColor='#334155';" onmouseout="this.style.color='#cbd5e1'; this.style.backgroundColor='transparent';">
                    <i class="fas fa-arrow-left"></i> +Col
                </button>
                <button type="button" data-tbl-action="add-col-right" title="Adicionar Coluna à Direita" style="background: none; border: none; color: #cbd5e1; padding: 0.25rem 0.4rem; cursor: pointer; border-radius: 0.25rem; font-size: 0.75rem;" onmouseover="this.style.color='#ffffff'; this.style.backgroundColor='#334155';" onmouseout="this.style.color='#cbd5e1'; this.style.backgroundColor='transparent';">
                    <i class="fas fa-arrow-right"></i> +Col
                </button>
                <button type="button" data-tbl-action="delete-col" title="Excluir Coluna Atual" style="background: none; border: none; color: #f87171; padding: 0.25rem 0.4rem; cursor: pointer; border-radius: 0.25rem; font-size: 0.75rem;" onmouseover="this.style.color='#ef4444'; this.style.backgroundColor='#451a1a';" onmouseout="this.style.color='#f87171'; this.style.backgroundColor='transparent';">
                    <i class="fas fa-trash-can"></i> Col
                </button>

                <div style="width: 1px; height: 1.25rem; background: #475569; margin: 0 0.15rem;"></div>

                <!-- ALINHAMENTO -->
                <button type="button" data-tbl-action="align-left" title="Alinhar Célula à Esquerda" style="background: none; border: none; color: #cbd5e1; padding: 0.25rem 0.35rem; cursor: pointer; border-radius: 0.25rem; font-size: 0.75rem;" onmouseover="this.style.color='#ffffff'; this.style.backgroundColor='#334155';" onmouseout="this.style.color='#cbd5e1'; this.style.backgroundColor='transparent';">
                    <i class="fas fa-align-left"></i>
                </button>
                <button type="button" data-tbl-action="align-center" title="Centralizar Célula" style="background: none; border: none; color: #cbd5e1; padding: 0.25rem 0.35rem; cursor: pointer; border-radius: 0.25rem; font-size: 0.75rem;" onmouseover="this.style.color='#ffffff'; this.style.backgroundColor='#334155';" onmouseout="this.style.color='#cbd5e1'; this.style.backgroundColor='transparent';">
                    <i class="fas fa-align-center"></i>
                </button>
                <button type="button" data-tbl-action="align-right" title="Alinhar Célula à Direita" style="background: none; border: none; color: #cbd5e1; padding: 0.25rem 0.35rem; cursor: pointer; border-radius: 0.25rem; font-size: 0.75rem;" onmouseover="this.style.color='#ffffff'; this.style.backgroundColor='#334155';" onmouseout="this.style.color='#cbd5e1'; this.style.backgroundColor='transparent';">
                    <i class="fas fa-align-right"></i>
                </button>

                <div style="width: 1px; height: 1.25rem; background: #475569; margin: 0 0.15rem;"></div>

                <!-- MESCLAR / DIVIDIR -->
                <button type="button" data-tbl-action="merge-right" title="Mesclar com Célula da Direita" style="background: none; border: none; color: #38bdf8; padding: 0.25rem 0.4rem; cursor: pointer; border-radius: 0.25rem; font-size: 0.75rem;" onmouseover="this.style.color='#ffffff'; this.style.backgroundColor='#0369a1';" onmouseout="this.style.color='#38bdf8'; this.style.backgroundColor='transparent';">
                    <i class="fas fa-object-group"></i> Mesclar
                </button>
                <button type="button" data-tbl-action="split-cell" title="Desfazer Mesclagem" style="background: none; border: none; color: #cbd5e1; padding: 0.25rem 0.35rem; cursor: pointer; border-radius: 0.25rem; font-size: 0.75rem;" onmouseover="this.style.color='#ffffff'; this.style.backgroundColor='#334155';" onmouseout="this.style.color='#cbd5e1'; this.style.backgroundColor='transparent';">
                    <i class="fas fa-object-ungroup"></i>
                </button>

                <div style="width: 1px; height: 1.25rem; background: #475569; margin: 0 0.15rem;"></div>

                <!-- COR DE FUNDO -->
                <label title="Cor de Fundo da Célula" style="display: inline-flex; align-items: center; gap: 0.2rem; cursor: pointer; color: #cbd5e1; padding: 0.15rem 0.3rem; border-radius: 0.25rem;" onmouseover="this.style.backgroundColor='#334155';" onmouseout="this.style.backgroundColor='transparent';">
                    <i class="fas fa-fill-drip" style="color: #fbbf24; font-size: 0.75rem;"></i>
                    <input type="color" data-tbl-action="cell-bg" style="width: 1.1rem; height: 1.1rem; border: none; cursor: pointer; background: none; padding: 0;">
                </label>

                <div style="width: 1px; height: 1.25rem; background: #475569; margin: 0 0.15rem;"></div>

                <!-- SELETOR DE ESTILO -->
                <select data-tbl-action="change-style" style="background: #334155; color: #f8fafc; border: 1px solid #475569; border-radius: 0.25rem; font-size: 0.6875rem; padding: 0.2rem 0.3rem; outline: none; cursor: pointer;">
                    <option value="planner-table-bordered">Grade Completa</option>
                    <option value="planner-table-zebra">Zebrada</option>
                    <option value="planner-table-horizontal">Linhas Horizontais</option>
                    <option value="planner-table-clean">Minimalista</option>
                </select>

                <div style="width: 1px; height: 1.25rem; background: #475569; margin: 0 0.15rem;"></div>

                <!-- EXCLUIR TABELA -->
                <button type="button" data-tbl-action="delete-table" title="Excluir Tabela Inteira" style="background: #dc2626; border: none; color: #ffffff; padding: 0.25rem 0.5rem; cursor: pointer; border-radius: 0.25rem; font-weight: 700; font-size: 0.75rem;" onmouseover="this.style.backgroundColor='#b91c1c';" onmouseout="this.style.backgroundColor='#dc2626';">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            `;

            // Previne perda de seleção no contenteditable durante o clique dos botões da barra
            toolbar.addEventListener('mousedown', (e) => {
                e.preventDefault();
            });

            // Gerencia as ações dos botões
            toolbar.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-tbl-action]');
                if (!btn) return;
                const action = btn.getAttribute('data-tbl-action');
                if (action === 'change-style' || action === 'cell-bg') return;

                this.executarAcaoTabela(action);
            });

            const selectStyle = toolbar.querySelector('select[data-tbl-action="change-style"]');
            if (selectStyle) {
                selectStyle.addEventListener('change', (e) => {
                    this.alterarEstiloTabela(e.target.value);
                });
            }

            const inputBg = toolbar.querySelector('input[data-tbl-action="cell-bg"]');
            if (inputBg) {
                inputBg.addEventListener('input', (e) => {
                    this.alterarCorFundoCelula(e.target.value);
                });
            }

            document.body.appendChild(toolbar);
        }

        _activeToolbar = toolbar;

        // Atualiza a opção selecionada no select de estilo de acordo com a tabela atual
        if (_activeTable) {
            const selectStyle = toolbar.querySelector('select[data-tbl-action="change-style"]');
            if (selectStyle) {
                if (_activeTable.classList.contains('planner-table-zebra')) selectStyle.value = 'planner-table-zebra';
                else if (_activeTable.classList.contains('planner-table-horizontal')) selectStyle.value = 'planner-table-horizontal';
                else if (_activeTable.classList.contains('planner-table-clean')) selectStyle.value = 'planner-table-clean';
                else selectStyle.value = 'planner-table-bordered';
            }
        }

        // Posicionamento inteligente acima da célula
        const rect = cellElement.getBoundingClientRect();
        const toolbarHeight = 38;
        let top = rect.top - toolbarHeight - 8;
        let left = rect.left;

        // Se passar do topo da tela, exibe abaixo da célula
        if (top < 10) {
            top = rect.bottom + 8;
        }

        // Se passar da borda direita da tela, ajusta à esquerda
        const toolbarWidth = 560;
        if (left + toolbarWidth > window.innerWidth - 10) {
            left = Math.max(10, window.innerWidth - toolbarWidth - 10);
        }

        toolbar.style.top = `${Math.round(top)}px`;
        toolbar.style.left = `${Math.round(left)}px`;
        toolbar.style.opacity = '1';
        toolbar.style.transform = 'translateY(0)';
    },

    /**
     * Oculta a barra flutuante contextual.
     */
    ocultarBarraFlutuante() {
        const toolbar = document.getElementById('table-floating-toolbar-planner');
        if (toolbar) {
            toolbar.style.opacity = '0';
            toolbar.style.transform = 'translateY(4px)';
            toolbar.style.pointerEvents = 'none';
        }
    },

    /**
     * Executa ações de manipulação de estrutura na tabela ativa.
     * @param {string} action 
     */
    executarAcaoTabela(action) {
        if (!_activeCell || !_activeTable) {
            Toast.show("Selecione uma célula para realizar a ação.", "warning");
            return;
        }

        const row = _activeCell.closest('tr');
        const isHeader = _activeCell.tagName.toLowerCase() === 'th';
        const colIndex = Array.from(row.children).indexOf(_activeCell);
        const totalCols = row.children.length;

        switch (action) {
            case 'add-row-above': {
                const newRow = document.createElement('tr');
                for (let i = 0; i < totalCols; i++) {
                    const cell = document.createElement(isHeader ? 'th' : 'td');
                    cell.style.cssText = _activeCell.style.cssText;
                    cell.innerHTML = '&nbsp;';
                    newRow.appendChild(cell);
                }
                row.parentNode.insertBefore(newRow, row);
                Toast.show("Linha adicionada acima.", "success");
                break;
            }

            case 'add-row-below': {
                const newRow = document.createElement('tr');
                for (let i = 0; i < totalCols; i++) {
                    const cell = document.createElement('td');
                    cell.style.cssText = 'padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left;';
                    cell.innerHTML = '&nbsp;';
                    newRow.appendChild(cell);
                }
                row.parentNode.insertBefore(newRow, row.nextSibling);
                Toast.show("Linha adicionada abaixo.", "success");
                break;
            }

            case 'delete-row': {
                const allRows = _activeTable.querySelectorAll('tr');
                if (allRows.length <= 1) {
                    this.excluirTabelaAtiva();
                    return;
                }
                row.remove();
                this.ocultarBarraFlutuante();
                Toast.show("Linha excluída.", "info");
                break;
            }

            case 'add-col-left': {
                const allRows = _activeTable.querySelectorAll('tr');
                allRows.forEach(r => {
                    const isTh = r.parentElement.tagName.toLowerCase() === 'thead' || r.querySelector('th');
                    const newCell = document.createElement(isTh ? 'th' : 'td');
                    newCell.style.cssText = 'padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left;';
                    if (isTh) newCell.style.backgroundColor = '#f1f5f9';
                    newCell.innerHTML = '&nbsp;';
                    const targetCell = r.children[colIndex];
                    if (targetCell) {
                        r.insertBefore(newCell, targetCell);
                    } else {
                        r.appendChild(newCell);
                    }
                });
                Toast.show("Coluna adicionada à esquerda.", "success");
                break;
            }

            case 'add-col-right': {
                const allRows = _activeTable.querySelectorAll('tr');
                allRows.forEach(r => {
                    const isTh = r.parentElement.tagName.toLowerCase() === 'thead' || r.querySelector('th');
                    const newCell = document.createElement(isTh ? 'th' : 'td');
                    newCell.style.cssText = 'padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left;';
                    if (isTh) newCell.style.backgroundColor = '#f1f5f9';
                    newCell.innerHTML = '&nbsp;';
                    const targetCell = r.children[colIndex];
                    if (targetCell) {
                        r.insertBefore(newCell, targetCell.nextSibling);
                    } else {
                        r.appendChild(newCell);
                    }
                });
                Toast.show("Coluna adicionada à direita.", "success");
                break;
            }

            case 'delete-col': {
                const allRows = _activeTable.querySelectorAll('tr');
                if (totalCols <= 1) {
                    this.excluirTabelaAtiva();
                    return;
                }
                allRows.forEach(r => {
                    if (r.children[colIndex]) {
                        r.children[colIndex].remove();
                    }
                });
                this.ocultarBarraFlutuante();
                Toast.show("Coluna excluída.", "info");
                break;
            }

            case 'merge-right': {
                const nextCell = _activeCell.nextElementSibling;
                if (!nextCell) {
                    Toast.show("Não há célula à direita para mesclar.", "info");
                    return;
                }
                const currentSpan = parseInt(_activeCell.getAttribute('colspan') || '1', 10);
                const nextSpan = parseInt(nextCell.getAttribute('colspan') || '1', 10);
                _activeCell.setAttribute('colspan', currentSpan + nextSpan);
                if (nextCell.innerHTML.trim() && nextCell.innerHTML !== '&nbsp;') {
                    _activeCell.innerHTML += ' ' + nextCell.innerHTML;
                }
                nextCell.remove();
                Toast.show("Células mescladas!", "success");
                this.exibirBarraFlutuante(_activeCell);
                break;
            }

            case 'split-cell': {
                const currentSpan = parseInt(_activeCell.getAttribute('colspan') || '1', 10);
                if (currentSpan <= 1) {
                    Toast.show("Esta célula não está mesclada.", "info");
                    return;
                }
                _activeCell.removeAttribute('colspan');
                for (let i = 1; i < currentSpan; i++) {
                    const newCell = document.createElement(_activeCell.tagName);
                    newCell.style.cssText = _activeCell.style.cssText;
                    newCell.innerHTML = '&nbsp;';
                    _activeCell.parentNode.insertBefore(newCell, _activeCell.nextSibling);
                }
                Toast.show("Mesclagem desfeita.", "success");
                this.exibirBarraFlutuante(_activeCell);
                break;
            }

            case 'align-left':
                _activeCell.style.textAlign = 'left';
                break;

            case 'align-center':
                _activeCell.style.textAlign = 'center';
                break;

            case 'align-right':
                _activeCell.style.textAlign = 'right';
                break;

            case 'delete-table':
                this.excluirTabelaAtiva();
                break;
        }

        // Notifica o editor sobre a alteração
        if (_currentEditor) {
            _currentEditor.dispatchEvent(new Event('input', { bubbles: true }));
        }
    },

    /**
     * Altera a cor de fundo da célula ativa
     * @param {string} corHex 
     */
    alterarCorFundoCelula(corHex) {
        if (!_activeCell) return;
        _activeCell.style.backgroundColor = corHex;
        if (_currentEditor) {
            _currentEditor.dispatchEvent(new Event('input', { bubbles: true }));
        }
    },

    /**
     * Alterna a classe de estilo visual na tabela ativa.
     * @param {string} novoEstilo 
     */
    alterarEstiloTabela(novoEstilo) {
        if (!_activeTable) return;
        _activeTable.classList.remove('planner-table-bordered', 'planner-table-zebra', 'planner-table-horizontal', 'planner-table-clean');
        _activeTable.classList.add(novoEstilo);

        if (_currentEditor) {
            _currentEditor.dispatchEvent(new Event('input', { bubbles: true }));
        }
        Toast.show("Estilo da tabela atualizado!", "success");
    },

    /**
     * Exclui a tabela completa e o seu container envolvente.
     */
    excluirTabelaAtiva() {
        if (!_activeTable) return;
        const wrapper = _activeTable.closest('.planner-table-wrapper') || _activeTable;
        wrapper.remove();
        _activeCell = null;
        _activeTable = null;
        this.ocultarBarraFlutuante();
        if (_currentEditor) {
            _currentEditor.dispatchEvent(new Event('input', { bubbles: true }));
        }
        Toast.show("Tabela removida.", "info");
    }
};

// Vinculação global para compatibilidade
if (typeof window !== 'undefined') {
    window.tableHelper = tableHelper;
}
