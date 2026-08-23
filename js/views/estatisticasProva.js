import { model } from '../model.js';
import { controller } from '../controller.js';
import { EventDelegator } from '../utils/eventDelegator.js';

export const estatisticasProvaView = {
    _cleanupDelegators: null,

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }

        const minhas = (model.state && model.state.questoes) ? model.state.questoes : [];
        const sistema = (model.state && model.state.questoesSistema) ? model.state.questoesSistema : [];
        const todas = [...minhas, ...sistema];

        const porMateria = this.agruparPor(todas, 'materia', 'Geral');
        const porTipo = this.agruparPor(todas, 'tipo', 'Não definido');
        const porAno = this.agruparPor(todas, 'ano', 'Outros');
        const materiasOrdenadas = Object.entries(porMateria).sort((a, b) => b[1] - a[1]);

        const html = `
            <div class="animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8);">
                
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div style="display: flex; align-items: center; gap: var(--spacing-4);">
                        <button type="button" data-action="nav-provas" class="btn-icon" title="Voltar para Provas">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <div>
                            <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em; display: flex; align-items: center; gap: var(--spacing-2);">
                                <i class="fas fa-chart-pie" style="color: var(--color-primary);"></i> Análise do Acervo de Provas
                            </h2>
                            <p style="font-size: 0.875rem; color: var(--color-slate-500);">Distribuição pedagógica, disciplinas e séries cadastradas no banco.</p>
                        </div>
                    </div>
                </div>

                <div class="stat-grid stat-grid--4">
                    ${this.renderMiniCard('Total Geral', todas.length, 'fa-database', '#1e293b')}
                    ${this.renderMiniCard('Múltipla Escolha', porTipo['multipla_escolha'] || porTipo['multipla'] || 0, 'fa-list-ul', '#7c3aed')}
                    ${this.renderMiniCard('Dissertativas', porTipo['aberta'] || 0, 'fa-pen-fancy', '#059669')}
                    ${this.renderMiniCard('Minhas Questões', minhas.length, 'fa-user-check', '#2563eb')}
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: var(--spacing-6);">
                    
                    <div class="card" style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
                        <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: var(--spacing-3); border-bottom: 1px solid var(--color-slate-100);">
                            <h3 style="font-size: 1rem; font-weight: 700; color: var(--color-slate-700); display: flex; align-items: center; gap: var(--spacing-2);">
                                <i class="fas fa-tags" style="color: var(--color-primary);"></i> Por Disciplina
                            </h3>
                            <span class="badge" style="background-color: var(--color-slate-100); color: var(--color-slate-600); font-weight: 700;">
                                ${materiasOrdenadas.length} disciplinas
                            </span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-3); max-height: 480px; overflow-y: auto;" class="custom-scrollbar">
                            ${materiasOrdenadas.map(([nome, total]) =>
            this.renderBarraProgresso(nome, total, todas.length, (model.coresComponentes && model.coresComponentes[nome]) || '#94a3b8')
        ).join('')}
                        </div>
                    </div>

                    <div class="card" style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
                        <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: var(--spacing-3); border-bottom: 1px solid var(--color-slate-100);">
                            <h3 style="font-size: 1rem; font-weight: 700; color: var(--color-slate-700); display: flex; align-items: center; gap: var(--spacing-2);">
                                <i class="fas fa-graduation-cap" style="color: var(--color-primary);"></i> Por Ano / Série
                            </h3>
                            <span class="badge" style="background-color: var(--color-slate-100); color: var(--color-slate-600); font-weight: 700;">
                                ${Object.keys(porAno).length} níveis
                            </span>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: var(--spacing-3);">
                            ${Object.entries(porAno).map(([nome, total]) => `
                                <div style="padding: var(--spacing-4); background-color: var(--color-slate-50); border-radius: var(--radius-xl); border: 1px solid var(--color-slate-100); display: flex; flex-direction: column; gap: 0.25rem;">
                                    <div style="font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-400); text-transform: uppercase; letter-spacing: 0.05em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${window.escapeHTML(nome)}">
                                        ${window.escapeHTML(nome)}
                                    </div>
                                    <div style="font-size: 1.5rem; font-weight: 900; color: var(--color-slate-800); line-height: 1;">
                                        ${total}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                </div>
            </div>
        `;

        container.innerHTML = html;

        this._cleanupDelegators = EventDelegator.bind(container, {
            'nav-provas': () => controller.navigate('provas')
        }, 'click');
    },

    agruparPor(lista, campo, defaultLabel) {
        return lista.reduce((acc, obj) => {
            const chave = obj[campo] || defaultLabel;
            acc[chave] = (acc[chave] || 0) + 1;
            return acc;
        }, {});
    },

    renderMiniCard(label, valor, icone, corFundo = '#1e293b') {
        const labelSafe = window.escapeHTML ? window.escapeHTML(label) : label;
        return `
            <div class="stat-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <div style="background-color: ${corFundo}; width: 2.25rem; height: 2.25rem; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: white; box-shadow: var(--shadow-sm);">
                        <i class="fas ${icone}" style="font-size: 0.875rem;"></i>
                    </div>
                    <span style="font-size: 1.75rem; font-weight: 900; color: var(--color-slate-800); line-height: 1;">${valor}</span>
                </div>
                <div style="font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-400); text-transform: uppercase; letter-spacing: 0.05em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${labelSafe}">
                    ${labelSafe}
                </div>
            </div>
        `;
    },

    renderBarraProgresso(label, valor, total, cor = '#cbd5e1') {
        const percent = total > 0 ? ((valor / total) * 100).toFixed(1) : 0;
        const labelSafe = window.escapeHTML ? window.escapeHTML(label) : label;
        return `
            <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700;">
                    <span style="color: var(--color-slate-700); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;" title="${labelSafe}">
                        ${labelSafe}
                    </span>
                    <span style="color: var(--color-slate-500);">
                        ${valor} <span style="font-weight: 400; opacity: 0.75;">(${percent}%)</span>
                    </span>
                </div>
                <div style="width: 100%; background-color: var(--color-slate-100); height: 0.5rem; border-radius: var(--radius-full); overflow: hidden;">
                    <div style="height: 100%; border-radius: var(--radius-full); width: ${percent}%; background-color: ${cor}; transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);"></div>
                </div>
            </div>
        `;
    },

    destroy() {
        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }
    },
    onLeave() {
        this.destroy();
    }
};

export const estatisticasProvasView = estatisticasProvaView;
