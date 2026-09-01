// js/views/interatividades.js
// View Hub de Interatividades Pedagógicas (Apresentações, Quiz ao Vivo, Simulações)
// 100% Vanilla JavaScript (ES6+), Padrão MVC

import { controller } from '../controller.js';
import { EventDelegator } from '../utils/eventDelegator.js';
import { apresentacoesView } from './apresentacoes.js';
import { quizGestorView } from './quizGestor.js';
import { simuladoresView } from './simuladores.js';

export const interatividadesView = {
    abaAtiva: 'apresentacoes',
    _cleanupDelegators: null,

    render(container, abaInicial = null) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        if (abaInicial && ['apresentacoes', 'quiz', 'simuladores'].includes(abaInicial)) {
            this.abaAtiva = abaInicial;
        }

        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }

        const html = `
            <div class="view-shell fade-in">
                <!-- CABEÇALHO UNIFICADO DE INTERATIVIDADES -->
                <div class="view-header animate-enter">
                    <div>
                        <h2 class="view-header__title" style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-shapes" style="color: #6366f1;"></i> Interatividades Pedagógicas
                        </h2>
                        <p class="view-header__subtitle">Apresentações animadas, gamificação em tempo real e simulações científicas.</p>
                    </div>
                </div>

                <!-- BARRA DE ABAS SUPERIORES -->
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; padding: 0.35rem; background-color: var(--color-slate-100); border-radius: var(--radius-2xl); width: fit-content; border: 1px solid var(--color-slate-200); overflow-x: auto;">
                    <button type="button" data-action="mudar-aba-interatividades" data-aba="apresentacoes"
                            style="padding: 0.6rem 1.25rem; border-radius: var(--radius-xl); font-size: 0.8125rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.2s ease; cursor: pointer; border: none; white-space: nowrap; ${this.abaAtiva === 'apresentacoes' ? 'background-color: var(--color-white); color: #4f46e5; box-shadow: var(--shadow-sm);' : 'background-color: transparent; color: var(--color-slate-600);'}">
                        <i class="fas fa-desktop"></i> Apresentações Animadas
                    </button>

                    <button type="button" data-action="mudar-aba-interatividades" data-aba="quiz"
                            style="padding: 0.6rem 1.25rem; border-radius: var(--radius-xl); font-size: 0.8125rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.2s ease; cursor: pointer; border: none; white-space: nowrap; ${this.abaAtiva === 'quiz' ? 'background-color: var(--color-white); color: #059669; box-shadow: var(--shadow-sm);' : 'background-color: transparent; color: var(--color-slate-600);'}">
                        <i class="fas fa-gamepad"></i> Quiz ao Vivo
                    </button>

                    <button type="button" data-action="mudar-aba-interatividades" data-aba="simuladores"
                            style="padding: 0.6rem 1.25rem; border-radius: var(--radius-xl); font-size: 0.8125rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.2s ease; cursor: pointer; border: none; white-space: nowrap; ${this.abaAtiva === 'simuladores' ? 'background-color: var(--color-white); color: #ea580c; box-shadow: var(--shadow-sm);' : 'background-color: transparent; color: var(--color-slate-600);'}">
                        <i class="fas fa-flask"></i> Simulações Interativas
                    </button>
                </div>

                <!-- ÁREA DE CONTEÚDO DA ABA ATIVA -->
                <div id="interatividades-tab-content" class="fade-in"></div>
            </div>
        `;

        container.innerHTML = html;

        this._cleanupDelegators = EventDelegator.bind(container, {
            'mudar-aba-interatividades': (e, target) => {
                const aba = target.getAttribute('data-aba');
                if (aba) {
                    this.abaAtiva = aba;
                    this.render(container);
                }
            }
        }, 'click');

        const tabContent = document.getElementById('interatividades-tab-content');
        if (tabContent) {
            if (this.abaAtiva === 'apresentacoes' && typeof apresentacoesView?.render === 'function') {
                apresentacoesView.render(tabContent);
            } else if (this.abaAtiva === 'quiz' && typeof quizGestorView?.render === 'function') {
                quizGestorView.render(tabContent);
            } else if (this.abaAtiva === 'simuladores' && typeof simuladoresView?.render === 'function') {
                simuladoresView.render(tabContent);
            }
        }
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

if (typeof window !== 'undefined') {
    window.interatividadesView = interatividadesView;
}
