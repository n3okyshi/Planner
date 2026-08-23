import { EventDelegator } from '../utils/eventDelegator.js';

/**
 * Componente Reutilizável de Paginador Reativo (Vanilla JS ES6+)
 * Permite paginar coleções de dados no frontend de forma eficiente e acessível.
 */
export class PaginatorComponent {
    /**
     * @param {Object} options
     * @param {number} [options.pageSize=12] - Quantidade de itens por página
     * @param {Function} options.onPageChange - Callback acionado na mudança de página `(page, paginatedItems)`
     */
    constructor(options = {}) {
        this.pageSize = options.pageSize || 12;
        this.currentPage = 1;
        this.totalItems = 0;
        this.items = [];
        this.onPageChange = options.onPageChange || (() => {});
        this._cleanupDelegators = null;
    }

    setItems(items = []) {
        this.items = Array.isArray(items) ? items : [];
        this.totalItems = this.items.length;
        this.currentPage = 1;
        this._notify();
    }

    goToPage(page) {
        const totalPages = this.getTotalPages();
        if (page < 1 || (totalPages > 0 && page > totalPages)) return;
        this.currentPage = page;
        this._notify();
    }

    nextPage() {
        this.goToPage(this.currentPage + 1);
    }

    prevPage() {
        this.goToPage(this.currentPage - 1);
    }

    getTotalPages() {
        return Math.ceil(this.totalItems / this.pageSize) || 1;
    }

    getPaginatedItems() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.items.slice(start, start + this.pageSize);
    }

    renderControls() {
        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }

        const totalPages = this.getTotalPages();
        const container = document.createElement('div');
        container.className = 'paginator-controls';
        container.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            padding: 1rem 0;
            font-size: 0.875rem;
            color: var(--color-slate-600, #475569);
        `;

        const info = document.createElement('span');
        const startItem = this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
        const endItem = Math.min(this.currentPage * this.pageSize, this.totalItems);
        info.textContent = `Exibindo ${startItem}-${endItem} de ${this.totalItems} itens (Página ${this.currentPage} de ${totalPages})`;

        const buttons = document.createElement('div');
        buttons.style.cssText = `display: flex; align-items: center; gap: 0.35rem;`;

        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'btn-secondary';
        prevBtn.setAttribute('data-action', 'paginator-prev');
        prevBtn.disabled = this.currentPage <= 1;
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Anteriores';
        prevBtn.style.cssText = `padding: 0.4rem 0.75rem; font-size: 0.8125rem; font-weight: 700; cursor: pointer;`;

        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'btn-secondary';
        nextBtn.setAttribute('data-action', 'paginator-next');
        nextBtn.disabled = this.currentPage >= totalPages;
        nextBtn.innerHTML = 'Próximos <i class="fas fa-chevron-right"></i>';
        nextBtn.style.cssText = `padding: 0.4rem 0.75rem; font-size: 0.8125rem; font-weight: 700; cursor: pointer;`;

        buttons.appendChild(prevBtn);
        buttons.appendChild(nextBtn);

        container.appendChild(info);
        container.appendChild(buttons);

        this._cleanupDelegators = EventDelegator.bind(container, {
            'paginator-prev': () => this.prevPage(),
            'paginator-next': () => this.nextPage()
        }, 'click');

        return container;
    }

    _notify() {
        if (typeof this.onPageChange === 'function') {
            this.onPageChange(this.currentPage, this.getPaginatedItems(), {
                totalPages: this.getTotalPages(),
                totalItems: this.totalItems
            });
        }
    }

    destroy() {
        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }
    }
}
