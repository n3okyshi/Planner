// js/utils/imageHelper.js
/**
 * ==========================================================================
 * GERENCIADOR E REDIMENSIONADOR INTERATIVO DE IMAGENS (IMAGE HELPER)
 * Arquitetura: 100% Vanilla JS ES6+ (Sem frameworks ou bibliotecas externas)
 * Funcionalidades:
 * - Alças de redimensionamento nos 4 cantos (Interactive Drag Handles com proporção fixa)
 * - Barra de ferramentas flutuante: 25%, 50%, 75%, 100%, Alinhamento e Exclusão
 * - Compressão inteligente no upload via HTMLCanvasElement em memória
 * - Compatibilidade universal com ContentEditable e exportação para PDF/Word
 * ==========================================================================
 */

import { Toast } from '../components/toast.js';
import { escapeHTML } from '../utils.js';
import { ModalComponent } from '../components/modal.js';

export const imageHelper = {
    _imagemAtiva: null,
    _editorAtivo: null,
    _overlayEl: null,
    _toolbarEl: null,
    _isDragging: false,
    _startX: 0,
    _startY: 0,
    _startWidth: 0,
    _startHeight: 0,
    _aspectRatio: 1,
    _handlePos: null,

    /**
     * Inicializa os ouvintes de clique e seleção de imagem em um elemento contenteditable
     * @param {HTMLElement|string} editorElement 
     */
    inicializarInspetorImagens(editorElement) {
        const editor = typeof editorElement === 'string' ? document.getElementById(editorElement) : editorElement;
        if (!editor) return;

        // Garante que o editor tenha position relative para cálculos precisos
        const pos = window.getComputedStyle(editor).position;
        if (pos === 'static') {
            editor.style.position = 'relative';
        }

        // Listener de clique nas imagens dentro do editor
        editor.addEventListener('click', (e) => {
            const img = e.target.closest('img');
            if (img && editor.contains(img)) {
                e.stopPropagation();
                this.selecionarImagem(img, editor);
            } else if (!e.target.closest('.planner-image-floating-toolbar') && !e.target.closest('.planner-image-resize-handle')) {
                this.desmarcarImagem();
            }
        });

        // Fechamento ao clicar fora do editor e de seus overlays
        document.addEventListener('click', (e) => {
            if (!this._imagemAtiva) return;
            if (e.target.closest('.planner-image-floating-toolbar') || 
                e.target.closest('.planner-image-resize-handle') ||
                e.target === this._imagemAtiva ||
                e.target.closest('#modal-ajuste-imagem-planner')) {
                return;
            }
            this.desmarcarImagem();
        });

        // Reposiciona overlay se o editor sofrer scroll ou resize
        editor.addEventListener('scroll', () => {
            if (this._imagemAtiva) this.posicionarOverlay();
        });
        window.addEventListener('resize', () => {
            if (this._imagemAtiva) this.posicionarOverlay();
        });
    },

    /**
     * Seleciona uma imagem, aplicando a moldura de foco, alças e barra de ferramentas
     * @param {HTMLImageElement} img 
     * @param {HTMLElement} editor 
     */
    selecionarImagem(img, editor) {
        if (!img || !editor) return;
        this.desmarcarImagem();

        this._imagemAtiva = img;
        this._editorAtivo = editor;

        img.classList.add('planner-img-active-selected');

        // Cria o container do overlay se não existir
        this._criarOverlay(editor);
        this.posicionarOverlay();
    },

    /**
     * Remove a seleção e destrói o overlay de controles
     */
    desmarcarImagem() {
        if (this._imagemAtiva) {
            this._imagemAtiva.classList.remove('planner-img-active-selected');
            this._imagemAtiva = null;
        }
        if (this._overlayEl && this._overlayEl.parentNode) {
            this._overlayEl.parentNode.removeChild(this._overlayEl);
        }
        if (this._toolbarEl && this._toolbarEl.parentNode) {
            this._toolbarEl.parentNode.removeChild(this._toolbarEl);
        }
        this._overlayEl = null;
        this._toolbarEl = null;
        this._isDragging = false;
    },

    /**
     * Cria os elementos DOM do overlay de redimensionamento e barra flutuante
     */
    _criarOverlay(editor) {
        // Overlay com alças
        this._overlayEl = document.createElement('div');
        this._overlayEl.className = 'planner-image-overlay-box';
        this._overlayEl.innerHTML = `
            <div class="planner-image-resize-handle handle-nw" data-pos="nw"></div>
            <div class="planner-image-resize-handle handle-ne" data-pos="ne"></div>
            <div class="planner-image-resize-handle handle-sw" data-pos="sw"></div>
            <div class="planner-image-resize-handle handle-se" data-pos="se"></div>
        `;

        // Vincula eventos de mousedown nas alças
        this._overlayEl.querySelectorAll('.planner-image-resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._iniciarArrasto(e, handle.getAttribute('data-pos'));
            });
        });

        // Barra de ferramentas flutuante
        this._toolbarEl = document.createElement('div');
        this._toolbarEl.className = 'planner-image-floating-toolbar';
        this._toolbarEl.innerHTML = `
            <div class="planner-image-tool-group">
                <button type="button" class="planner-image-tool-btn" title="25% de largura" onclick="imageHelper.aplicarTamanho(25)">25%</button>
                <button type="button" class="planner-image-tool-btn" title="50% de largura" onclick="imageHelper.aplicarTamanho(50)">50%</button>
                <button type="button" class="planner-image-tool-btn" title="75% de largura" onclick="imageHelper.aplicarTamanho(75)">75%</button>
                <button type="button" class="planner-image-tool-btn" title="100% de largura (Total)" onclick="imageHelper.aplicarTamanho(100)">100%</button>
            </div>
            <div class="planner-image-tool-divider"></div>
            <div class="planner-image-tool-group">
                <button type="button" class="planner-image-tool-btn" title="Alinhar à Esquerda" onclick="imageHelper.aplicarAlinhamento('esquerda')">
                    <i class="fas fa-align-left"></i>
                </button>
                <button type="button" class="planner-image-tool-btn" title="Centralizar" onclick="imageHelper.aplicarAlinhamento('centro')">
                    <i class="fas fa-align-center"></i>
                </button>
                <button type="button" class="planner-image-tool-btn" title="Alinhar à Direita" onclick="imageHelper.aplicarAlinhamento('direita')">
                    <i class="fas fa-align-right"></i>
                </button>
                <button type="button" class="planner-image-tool-btn" title="Flutuante com Texto ao Redor (Wrap)" onclick="imageHelper.aplicarAlinhamento('wrap-esquerda')">
                    <i class="fas fa-indent"></i>
                </button>
            </div>
            <div class="planner-image-tool-divider"></div>
            <div class="planner-image-tool-group">
                <button type="button" class="planner-image-tool-btn" title="Configurações Personalizadas" onclick="imageHelper.abrirModalAjustePersonalizado()">
                    <i class="fas fa-sliders-h"></i>
                </button>
                <button type="button" class="planner-image-tool-btn btn-delete" title="Excluir Imagem" onclick="imageHelper.excluirImagemAtiva()">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;

        document.body.appendChild(this._overlayEl);
        document.body.appendChild(this._toolbarEl);
    },

    /**
     * Posiciona o overlay e a barra flutuante exatamente sobre a imagem ativa no viewport
     */
    posicionarOverlay() {
        if (!this._imagemAtiva || !this._overlayEl || !this._toolbarEl) return;

        const rect = this._imagemAtiva.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
            this.desmarcarImagem();
            return;
        }

        // Posiciona a caixa com alças exatamente sobre a imagem
        this._overlayEl.style.top = `${rect.top + window.scrollY}px`;
        this._overlayEl.style.left = `${rect.left + window.scrollX}px`;
        this._overlayEl.style.width = `${rect.width}px`;
        this._overlayEl.style.height = `${rect.height}px`;
        this._overlayEl.style.display = 'block';

        // Posiciona a barra flutuante logo acima da imagem (ou abaixo se estiver no topo)
        const toolbarHeight = 36;
        let toolbarTop = rect.top + window.scrollY - toolbarHeight - 8;
        if (toolbarTop < window.scrollY + 10) {
            toolbarTop = rect.bottom + window.scrollY + 8;
        }

        let toolbarLeft = rect.left + window.scrollX + (rect.width / 2) - 160;
        toolbarLeft = Math.max(10, Math.min(window.innerWidth - 330, toolbarLeft));

        this._toolbarEl.style.top = `${toolbarTop}px`;
        this._toolbarEl.style.left = `${toolbarLeft}px`;
        this._toolbarEl.style.display = 'flex';
    },

    /**
     * Inicia o arrasto de redimensionamento a partir de uma alça nos cantos
     */
    _iniciarArrasto(e, handlePos) {
        if (!this._imagemAtiva) return;

        this._isDragging = true;
        this._handlePos = handlePos;
        this._startX = e.clientX;
        this._startY = e.clientY;

        const rect = this._imagemAtiva.getBoundingClientRect();
        this._startWidth = rect.width;
        this._startHeight = rect.height;
        this._aspectRatio = (rect.width || 1) / (rect.height || 1);

        const onMouseMove = (moveEvent) => {
            if (!this._isDragging || !this._imagemAtiva) return;

            const deltaX = moveEvent.clientX - this._startX;
            let novaLargura = this._startWidth;

            if (this._handlePos === 'se' || this._handlePos === 'ne') {
                novaLargura = Math.max(50, this._startWidth + deltaX);
            } else if (this._handlePos === 'sw' || this._handlePos === 'nw') {
                novaLargura = Math.max(50, this._startWidth - deltaX);
            }

            // Limita a largura máxima à largura do container do editor
            if (this._editorAtivo) {
                const maxW = this._editorAtivo.clientWidth - 20;
                novaLargura = Math.min(novaLargura, maxW);
            }

            // Calcula em porcentagem em relação ao container pai
            const parentWidth = this._imagemAtiva.parentElement?.clientWidth || this._editorAtivo?.clientWidth || 800;
            const percentual = Math.round((novaLargura / parentWidth) * 100);
            const percentualSeguro = Math.max(10, Math.min(100, percentual));

            this._imagemAtiva.style.width = `${percentualSeguro}%`;
            this._imagemAtiva.style.maxWidth = '100%';
            this._imagemAtiva.style.height = 'auto';

            this.posicionarOverlay();
        };

        const onMouseUp = () => {
            if (this._isDragging) {
                this._isDragging = false;
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);

                if (this._editorAtivo) {
                    this._editorAtivo.dispatchEvent(new Event('input', { bubbles: true }));
                }
                this.posicionarOverlay();
            }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    },

    /**
     * Aplica um tamanho percentual pré-definido à imagem ativa
     * @param {number} percentual - 25, 50, 75 ou 100
     */
    aplicarTamanho(percentual) {
        if (!this._imagemAtiva) return;

        const p = Math.max(10, Math.min(100, parseInt(percentual, 10) || 50));
        this._imagemAtiva.style.width = `${p}%`;
        this._imagemAtiva.style.maxWidth = '100%';
        this._imagemAtiva.style.height = 'auto';

        if (this._editorAtivo) {
            this._editorAtivo.dispatchEvent(new Event('input', { bubbles: true }));
        }

        setTimeout(() => this.posicionarOverlay(), 50);
        Toast.show(`Largura ajustada para ${p}%`, "info");
    },

    /**
     * Aplica alinhamento e fluxo de texto à imagem ativa
     * @param {string} modo - 'esquerda', 'centro', 'direita', 'wrap-esquerda', 'wrap-direita'
     */
    aplicarAlinhamento(modo) {
        if (!this._imagemAtiva) return;

        // Reseta flutuações e margens básicas
        this._imagemAtiva.style.float = 'none';
        this._imagemAtiva.style.display = 'block';
        this._imagemAtiva.style.clear = 'both';

        switch (modo) {
            case 'esquerda':
                this._imagemAtiva.style.marginLeft = '0';
                this._imagemAtiva.style.marginRight = 'auto';
                this._imagemAtiva.style.marginTop = '0.5rem';
                this._imagemAtiva.style.marginBottom = '0.5rem';
                break;
            case 'centro':
                this._imagemAtiva.style.marginLeft = 'auto';
                this._imagemAtiva.style.marginRight = 'auto';
                this._imagemAtiva.style.marginTop = '0.75rem';
                this._imagemAtiva.style.marginBottom = '0.75rem';
                break;
            case 'direita':
                this._imagemAtiva.style.marginLeft = 'auto';
                this._imagemAtiva.style.marginRight = '0';
                this._imagemAtiva.style.marginTop = '0.5rem';
                this._imagemAtiva.style.marginBottom = '0.5rem';
                break;
            case 'wrap-esquerda':
                this._imagemAtiva.style.display = 'inline-block';
                this._imagemAtiva.style.float = 'left';
                this._imagemAtiva.style.marginRight = '1.25rem';
                this._imagemAtiva.style.marginBottom = '0.75rem';
                this._imagemAtiva.style.marginTop = '0.25rem';
                this._imagemAtiva.style.clear = 'none';
                break;
            case 'wrap-direita':
                this._imagemAtiva.style.display = 'inline-block';
                this._imagemAtiva.style.float = 'right';
                this._imagemAtiva.style.marginLeft = '1.25rem';
                this._imagemAtiva.style.marginBottom = '0.75rem';
                this._imagemAtiva.style.marginTop = '0.25rem';
                this._imagemAtiva.style.clear = 'none';
                break;
        }

        if (this._editorAtivo) {
            this._editorAtivo.dispatchEvent(new Event('input', { bubbles: true }));
        }

        setTimeout(() => this.posicionarOverlay(), 50);
    },

    /**
     * Exclui a imagem ativa do editor
     */
    excluirImagemAtiva() {
        if (!this._imagemAtiva) return;

        const img = this._imagemAtiva;
        const parentP = img.closest('p');
        this.desmarcarImagem();

        if (parentP && parentP.children.length === 1 && parentP.textContent.trim() === '') {
            parentP.remove();
        } else {
            img.remove();
        }

        if (this._editorAtivo) {
            this._editorAtivo.dispatchEvent(new Event('input', { bubbles: true }));
        }

        Toast.show("Imagem removida com sucesso.", "info");
    },

    /**
     * Abre modal completo para configuração fina de largura, bordas e legenda da imagem
     */
    abrirModalAjustePersonalizado() {
        if (!this._imagemAtiva) return;
        const img = this._imagemAtiva;

        const larguraAtual = parseInt(img.style.width, 10) || 50;
        const bordaRaio = parseInt(img.style.borderRadius, 10) || 8;
        const altText = img.getAttribute('alt') || '';

        const modalHtml = `
            <div style="display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem 0;">
                <div>
                    <label class="form-label" style="font-weight: 700;">Largura da Imagem (${larguraAtual}%):</label>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <input type="range" id="modal-img-largura-slider" min="10" max="100" step="5" value="${larguraAtual}" 
                               class="form-input" style="flex: 1; padding: 0;"
                               oninput="document.getElementById('modal-img-largura-val').innerText = this.value + '%'">
                        <span id="modal-img-largura-val" style="font-weight: 800; font-size: 1rem; min-width: 45px; color: #4f46e5;">${larguraAtual}%</span>
                    </div>
                </div>

                <div>
                    <label class="form-label" style="font-weight: 700;">Bordas Arredondadas (${bordaRaio}px):</label>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <input type="range" id="modal-img-radius-slider" min="0" max="24" step="2" value="${bordaRaio}" 
                               class="form-input" style="flex: 1; padding: 0;"
                               oninput="document.getElementById('modal-img-radius-val').innerText = this.value + 'px'">
                        <span id="modal-img-radius-val" style="font-weight: 800; font-size: 1rem; min-width: 45px; color: #4f46e5;">${bordaRaio}px</span>
                    </div>
                </div>

                <div>
                    <label class="form-label" style="font-weight: 700;">Texto Alternativo / Descrição Pedagógica:</label>
                    <input type="text" id="modal-img-alt-input" class="form-input" value="${escapeHTML(altText)}" placeholder="Ex: Fotomicrografia de células sanguíneas">
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem;">
                    <button type="button" class="btn-secondary" onclick="ModalComponent.close('modal-ajuste-imagem-planner')">Cancelar</button>
                    <button type="button" class="btn-primary" style="background-color: #4f46e5;" onclick="imageHelper.salvarAjustePersonalizado()">
                        <i class="fas fa-check"></i> Aplicar Ajustes
                    </button>
                </div>
            </div>
        `;

        ModalComponent.open({
            id: 'modal-ajuste-imagem-planner',
            title: 'Ajustar Imagem Pedagógica',
            content: modalHtml,
            size: 'sm'
        });
    },

    salvarAjustePersonalizado() {
        if (!this._imagemAtiva) {
            ModalComponent.close('modal-ajuste-imagem-planner');
            return;
        }

        const sliderW = document.getElementById('modal-img-largura-slider');
        const sliderR = document.getElementById('modal-img-radius-slider');
        const inputAlt = document.getElementById('modal-img-alt-input');

        if (sliderW) {
            this.aplicarTamanho(sliderW.value);
        }
        if (sliderR) {
            this._imagemAtiva.style.borderRadius = `${sliderR.value}px`;
        }
        if (inputAlt) {
            this._imagemAtiva.setAttribute('alt', inputAlt.value.trim());
        }

        if (this._editorAtivo) {
            this._editorAtivo.dispatchEvent(new Event('input', { bubbles: true }));
        }

        ModalComponent.close('modal-ajuste-imagem-planner');
        setTimeout(() => this.posicionarOverlay(), 50);
        Toast.show("Configurações da imagem aplicadas com sucesso!", "success");
    },

    /**
     * Processa o upload de uma imagem do usuário com compressão e redimensionamento inteligente em Canvas
     * Reduz fotos pesadas de celulares (ex: 4000x3000) para no máximo 1400px antes de gerar o Base64
     * @param {File} file 
     * @param {Function} callback - Recebe o Base64 otimizado
     */
    processarUploadImagem(file, callback) {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            Toast.show("Por favor, selecione um arquivo de imagem válido.", "warning");
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            Toast.show("A imagem deve ter no máximo 8MB.", "warning");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const MAX_WIDTH = 1400;
                const MAX_HEIGHT = 1400;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                    if (width > height) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    } else {
                        width = Math.round((width * MAX_HEIGHT) / height);
                        height = MAX_HEIGHT;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Exporta em JPEG otimizado ou PNG se tiver transparência
                const isPng = file.type === 'image/png';
                const base64Final = isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85);

                if (typeof callback === 'function') {
                    callback(base64Final);
                }
            };
            img.onerror = () => {
                Toast.show("Erro ao carregar a imagem selecionada.", "error");
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
};

// Disponibiliza globalmente
if (typeof window !== 'undefined') {
    window.imageHelper = imageHelper;
}
