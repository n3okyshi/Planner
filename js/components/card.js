import { escapeHTML, sanitizeComLatex } from '../utils.js';

/**
 * Componente Reutilizável de Card (Vanilla JS ES6+)
 * Padroniza a exibição visual e ações de cartões de Materiais, Questões,
 * Apresentações e Planos de Aula no aplicativo com sanitização unificada XSS.
 */
export class CardComponent {
    /**
     * @param {Object} options
     * @param {Object} options.item - Dados do material ou questão
     * @param {string} [options.tipo='material'] - 'material' | 'questao' | 'apresentacao'
     * @param {boolean} [options.selecionado=false] - Estado de seleção para ações em lote
     * @param {Array<Object>} [options.acoes] - Lista de ações [{ id, label, icon, class, onClick }]
     */
    constructor(options = {}) {
        this.item = options.item || {};
        this.tipo = options.tipo || 'material';
        this.selecionado = options.selecionado || false;
        this.acoes = options.acoes || [];
    }

    render() {
        const item = this.item;
        const card = document.createElement('div');
        card.className = `material-card-unified interactive-element ${this.selecionado ? 'material-card-unified--selected' : ''}`;
        card.dataset.id = item.id || '';
        card.style.cssText = `
            background: var(--color-white, #ffffff);
            border: 1px solid ${this.selecionado ? 'var(--color-primary, #4f46e5)' : 'var(--color-slate-200, #e2e8f0)'};
            border-radius: var(--radius-2xl, 1rem);
            padding: 1.25rem;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 1rem;
            box-shadow: var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05));
            transition: all 0.2s ease-in-out;
            position: relative;
        `;

        // Cabeçalho do Card (Badges de Disciplina / Série e Checkbox de seleção)
        const header = document.createElement('div');
        header.style.cssText = `display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;`;

        const badgesBox = document.createElement('div');
        badgesBox.style.cssText = `display: flex; align-items: center; gap: 0.375rem; flex-wrap: wrap;`;

        if (item.disciplina || item.materia) {
            const discBadge = document.createElement('span');
            discBadge.style.cssText = `
                background-color: var(--color-indigo-50, #e0e7ff);
                color: var(--color-indigo-700, #4338ca);
                font-size: 0.6875rem;
                font-weight: 800;
                padding: 0.25rem 0.625rem;
                border-radius: var(--radius-full, 9999px);
                text-transform: uppercase;
            `;
            discBadge.textContent = item.disciplina || item.materia;
            badgesBox.appendChild(discBadge);
        }

        if (item.serie || item.ano) {
            const serieBadge = document.createElement('span');
            serieBadge.style.cssText = `
                background-color: var(--color-slate-100, #f1f5f9);
                color: var(--color-slate-700, #334155);
                font-size: 0.6875rem;
                font-weight: 700;
                padding: 0.25rem 0.625rem;
                border-radius: var(--radius-full, 9999px);
            `;
            serieBadge.textContent = item.serie || item.ano;
            badgesBox.appendChild(serieBadge);
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'card-select-checkbox';
        checkbox.checked = this.selecionado;
        checkbox.style.cssText = `
            width: 1.125rem;
            height: 1.125rem;
            cursor: pointer;
            accent-color: var(--color-primary, #4f46e5);
        `;

        header.appendChild(badgesBox);
        header.appendChild(checkbox);

        // Corpo do Card (Título e Enunciado/Descrição)
        const body = document.createElement('div');
        body.style.cssText = `display: flex; flex-direction: column; gap: 0.5rem;`;

        const titleEl = document.createElement('h4');
        titleEl.style.cssText = `
            margin: 0;
            font-size: 1rem;
            font-weight: 700;
            color: var(--color-slate-900, #0f172a);
            line-height: 1.35;
        `;
        titleEl.textContent = item.titulo || item.enunciado || 'Sem Título';

        const dateEl = document.createElement('span');
        dateEl.style.cssText = `font-size: 0.75rem; color: var(--color-slate-400, #94a3b8);`;
        const dataFormatada = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('pt-BR') : '';
        dateEl.textContent = dataFormatada ? `Atualizado em ${dataFormatada}` : '';

        body.appendChild(titleEl);
        if (dataFormatada) body.appendChild(dateEl);

        // Rodapé do Card (Botões de ação)
        const footer = document.createElement('div');
        footer.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 0.375rem;
            border-top: 1px solid var(--color-slate-100, #f1f5f9);
            padding-top: 0.75rem;
        `;

        this.acoes.forEach(acao => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = acao.class || 'btn-secondary';
            btn.title = acao.label || '';
            btn.innerHTML = `<i class="fas ${acao.icon}"></i> ${acao.showLabel ? `<span>${acao.label}</span>` : ''}`;
            btn.style.cssText = `
                padding: 0.35rem 0.65rem;
                font-size: 0.75rem;
                font-weight: 700;
                border-radius: var(--radius-lg, 0.5rem);
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.25rem;
            `;
            btn.onclick = (e) => {
                e.stopPropagation();
                if (typeof acao.onClick === 'function') {
                    acao.onClick(item, e);
                }
            };
            footer.appendChild(btn);
        });

        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(footer);

        return card;
    }
}
