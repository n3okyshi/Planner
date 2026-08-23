import { sanitizeComLatex } from '../utils.js';
import { EventDelegator } from '../utils/eventDelegator.js';

/**
 * Componente Reutilizável de Modal Acessível (Vanilla JS ES6+)
 * Suporta backdrop blur, animação de entrada/saída, teclas de atalho (ESC),
 * bloqueio de scroll de fundo e foco acessível.
 */
export class ModalComponent {
    /**
     * @param {Object} options
     * @param {string} [options.id] - ID opcional para o container do modal
     * @param {string} options.title - Título exibido no cabeçalho
     * @param {string|HTMLElement} options.content - Conteúdo HTML ou nó DOM do corpo
     * @param {string} [options.icon] - Ícone FontAwesome opcional no cabeçalho
     * @param {string} [options.maxWidth='600px'] - Largura máxima do modal (ex: '500px', '800px')
     * @param {Array<Object>} [options.actions] - Botões de ação [{ label, class, onClick }]
     * @param {Function} [options.onClose] - Callback ao fechar
     */
    constructor(options = {}) {
        this.options = {
            id: options.id || `modal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            title: options.title || 'Informação',
            content: options.content || '',
            icon: options.icon || 'fa-info-circle',
            maxWidth: options.maxWidth || '600px',
            actions: options.actions || [],
            onClose: options.onClose || null
        };

        this.element = null;
        this._cleanupDelegators = null;
        this._keydownHandler = this._handleKeydown.bind(this);
    }

    render() {
        if (document.getElementById(this.options.id)) {
            this.destroy();
        }

        const backdrop = document.createElement('div');
        backdrop.id = this.options.id;
        backdrop.className = 'modal-backdrop animate-fade-in';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(15, 23, 42, 0.65);
            backdrop-filter: blur(4px);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            box-sizing: border-box;
        `;

        const card = document.createElement('div');
        card.className = 'modal-card animate-scale-up';
        card.style.cssText = `
            background: var(--color-white, #ffffff);
            border-radius: var(--radius-2xl, 1rem);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            width: 100%;
            max-width: ${this.options.maxWidth};
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid var(--color-slate-100, #f1f5f9);
        `;

        // Cabeçalho
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--color-slate-100, #f1f5f9);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background-color: var(--color-slate-50, #f8fafc);
        `;

        const titleBox = document.createElement('div');
        titleBox.style.cssText = `display: flex; align-items: center; gap: 0.625rem;`;
        
        if (this.options.icon) {
            const iconEl = document.createElement('i');
            iconEl.className = `fas ${this.options.icon}`;
            iconEl.style.cssText = `color: var(--color-primary, #4f46e5); font-size: 1.125rem;`;
            titleBox.appendChild(iconEl);
        }

        const titleEl = document.createElement('h3');
        titleEl.style.cssText = `margin: 0; font-size: 1.0625rem; font-weight: 700; color: var(--color-slate-900, #0f172a);`;
        titleEl.textContent = this.options.title;
        titleBox.appendChild(titleEl);

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn-close-modal';
        closeBtn.setAttribute('data-action', 'modal-close');
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.style.cssText = `
            background: transparent;
            border: none;
            color: var(--color-slate-400, #94a3b8);
            font-size: 1.125rem;
            cursor: pointer;
            padding: 0.35rem 0.5rem;
            border-radius: var(--radius-lg, 0.5rem);
            transition: all 0.2s;
        `;

        header.appendChild(titleBox);
        header.appendChild(closeBtn);

        // Corpo
        const body = document.createElement('div');
        body.style.cssText = `
            padding: 1.5rem;
            overflow-y: auto;
            flex: 1;
            font-size: 0.875rem;
            color: var(--color-slate-700, #334155);
            line-height: 1.5;
        `;

        if (typeof this.options.content === 'string') {
            body.innerHTML = sanitizeComLatex(this.options.content);
        } else if (this.options.content instanceof HTMLElement) {
            body.appendChild(this.options.content);
        }

        card.appendChild(header);
        card.appendChild(body);

        const handlersMap = {
            'modal-close': () => this.close()
        };

        // Rodapé com ações
        if (this.options.actions && this.options.actions.length > 0) {
            const footer = document.createElement('div');
            footer.style.cssText = `
                padding: 1rem 1.5rem;
                border-top: 1px solid var(--color-slate-100, #f1f5f9);
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 0.75rem;
                background-color: var(--color-slate-50, #f8fafc);
            `;

            this.options.actions.forEach((action, idx) => {
                const actionKey = `modal-action-${idx}`;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = action.class || 'btn-secondary';
                btn.setAttribute('data-action', actionKey);
                btn.textContent = action.label || 'OK';
                btn.style.cssText = `
                    padding: 0.5rem 1rem;
                    border-radius: var(--radius-xl, 0.75rem);
                    font-size: 0.875rem;
                    font-weight: 700;
                    cursor: pointer;
                `;
                handlersMap[actionKey] = (e) => {
                    if (typeof action.onClick === 'function') {
                        action.onClick(e, this);
                    } else {
                        this.close();
                    }
                };
                footer.appendChild(btn);
            });

            card.appendChild(footer);
        }

        backdrop.appendChild(card);

        this._cleanupDelegators = EventDelegator.bind(backdrop, handlersMap, 'click');
        
        // Fechar ao clicar no backdrop
        backdrop.onclick = (e) => {
            if (e.target === backdrop) {
                this.close();
            }
        };

        this.element = backdrop;
        return backdrop;
    }

    open() {
        const el = this.render();
        document.body.appendChild(el);
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', this._keydownHandler);
    }

    close() {
        if (!this.element || !this.element.parentNode) return;
        
        this.element.style.opacity = '0';
        this.element.style.transition = 'opacity 0.2s ease-out';
        
        setTimeout(() => {
            this.destroy();
            if (typeof this.options.onClose === 'function') {
                this.options.onClose();
            }
        }, 200);
    }

    destroy() {
        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }
        window.removeEventListener('keydown', this._keydownHandler);
        document.body.style.overflow = '';
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    }

    _handleKeydown(e) {
        if (e.key === 'Escape') {
            this.close();
        }
    }
}
