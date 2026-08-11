
import { model } from '../model.js';
import { Toast } from '../components/toast.js';
import { controller } from '../controller.js';
export const uiController = {
    openModal(titulo, conteudo, tamanho = 'medium') {
        const modal = document.getElementById('global-modal');
        if (!modal) return;
        const headerHtml = titulo ? `
            <div class="modal__header">
                <h3 class="modal__title">${window.escapeHTML(titulo)}</h3>
                <button onclick="uiController.closeModal()" class="modal__close" title="Fechar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        ` : `
            <button onclick="uiController.closeModal()" class="modal__close" style="position: absolute; top: 1rem; right: 1rem; z-index: 20;" title="Fechar">
                <i class="fas fa-times"></i>
            </button>
        `;
        modal.innerHTML = `
        <div class="modal__content modal__content--${tamanho}">
            ${headerHtml}
            <div class="modal__body custom-scrollbar">
                ${conteudo}
            </div>
        </div>
        `;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        setTimeout(() => uiController.initAllDropdowns(), 50);
    },
    closeModal() {
        const modal = document.getElementById('global-modal');
        if (modal) {
            modal.classList.add('hidden');
            setTimeout(() => { modal.innerHTML = ''; }, 300);
        }
        document.body.style.overflow = '';
    },
    confirmarAcao(titulo, mensagem, callbackConfirmacao) {
        const html = `
            <div class="confirm-dialog">
                <div class="confirm-dialog__icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="confirm-dialog__title">${titulo}</h3>
                <p class="confirm-dialog__text">${mensagem}</p>
                <div class="confirm-dialog__actions">
                    <button onclick="uiController.closeModal()" class="btn-secondary">Cancelar</button>
                    <button id="btn-confirm-action" class="btn-danger">Confirmar</button>
                </div>
            </div>
        `;
        this.openModal('Confirmação', html, 'small');
        setTimeout(() => {
            const btn = document.getElementById('btn-confirm-action');
            if (btn) {
                btn.onclick = () => {
                    callbackConfirmacao();
                    this.closeModal();
                };
                btn.focus();
            }
        }, 50);
    },
    toggleSidebar() {
        const sidebar = document.getElementById('app-sidebar');
        const main = document.getElementById('main-content');
        const icon = document.getElementById('sidebar-toggle-icon');
        const headerIcon = document.getElementById('header-sidebar-toggle-icon');
        if (!sidebar || !main) return;

        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            sidebar.classList.toggle('mobile-open');
            const isExp = sidebar.classList.contains('mobile-open');
            if (icon) icon.className = isExp ? 'fas fa-chevron-left' : 'fas fa-bars';
            if (headerIcon) headerIcon.className = isExp ? 'fas fa-chevron-left' : 'fas fa-bars';
        } else {
            sidebar.classList.toggle('collapsed');
            main.classList.toggle('expanded-content');
            const isCollapsed = sidebar.classList.contains('collapsed');
            if (icon) icon.className = isCollapsed ? 'fas fa-bars' : 'fas fa-chevron-left';
            if (headerIcon) headerIcon.className = isCollapsed ? 'fas fa-bars' : 'fas fa-chevron-left';
        }
    },
    updateNavHighlight(viewName) {
        document.querySelectorAll('nav button').forEach(btn => {
            btn.classList.remove('nav-item--active');
        });
        const mapId = {
            'periodo': 'planejamento',
            'dia': 'diario',
            'mapa': 'sala',
            'frequencia': 'frequencia',
            'config': 'settings',
            'mensal': 'mensal',
            'bimestralizacoes': 'bimestralizacao'
        };
        let activeBtn = document.getElementById(`nav-${viewName}`);
        if (!activeBtn && mapId[viewName]) {
            activeBtn = document.getElementById(`nav-${mapId[viewName]}`);
        }
        if (activeBtn) {
            activeBtn.classList.add('nav-item--active');
        }
    },
    updateBreadcrumb(viewName) {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;
        const map = {
            'dashboard': 'Visão Geral',
            'mensal': 'Planejamento / Mensal',
            'periodo': 'Planejamento / Por Período',
            'dia': 'Planejamento / Diário',
            'turmas': 'Acadêmico / Turmas',
            'bncc': 'Acadêmico / BNCC',
            'bimestralizacao': 'Acadêmico / Bimestralizações (Formosa)',
            'bimestralizacoes': 'Acadêmico / Bimestralizações (Formosa)',
            'mapa': 'Acadêmico / Mapa de Sala',
            'provas': 'Acadêmico / Gerador de Provas',
            'stats-provas': 'Acadêmico / Estatísticas de Avaliações',
            'frequencia': 'Acadêmico / Frequência',
            'comunidade': 'Comunidade / Banco de Questões',
            'biblioteca': 'Biblioteca de Materiais',
            'criar-material': 'Criador de Materiais IA',
            'conteudo-gerado': 'Material Pedagógico',
            'quiz-gestor': 'Gestor de Quizzes',
            'quiz-player': 'Apresentação de Quiz',
            'correcao': 'Correção Automática',
            'simuladores': 'Simulações Interativas',
            'notas-anuais': 'Notas Anuais & Médias',
            'estatisticas': 'Analytics / Desempenho',
            'config': 'Configurações'
        };
        const label = map[viewName] || viewName.charAt(0).toUpperCase() + viewName.slice(1);
        breadcrumb.innerHTML = `<i class="fas fa-home text-slate-300"></i> <span class="text-slate-300 mx-2">/</span> ${window.escapeHTML(label)}`;
    },
    getCardSkeleton(count = 6) {
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--spacing-6);" class="animate-enter">
                ${Array.from({ length: count }).map(() => `
                    <div class="card" style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div class="skeleton-bg skeleton-rounded-xl" style="width: 3rem; height: 3rem;"></div>
                            <div class="skeleton-bg skeleton-rounded-md" style="width: 5rem; height: 1rem;"></div>
                        </div>
                        <div class="skeleton-bg skeleton-rounded-md" style="width: 75%; height: 1.5rem;"></div>
                        <div class="skeleton-bg skeleton-rounded-md" style="width: 50%; height: 1rem;"></div>
                        <div class="skeleton-bg skeleton-rounded-full" style="width: 100%; height: 0.375rem; margin-top: var(--spacing-3);"></div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    getTableSkeleton(rows = 5) {
        return `
            <div class="card animate-enter" style="padding: var(--spacing-4); display: flex; flex-direction: column; gap: var(--spacing-4);">
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--spacing-4); border-bottom: 1px solid var(--color-slate-100);">
                    <div class="skeleton-bg skeleton-rounded-md" style="width: 12rem; height: 1.5rem;"></div>
                    <div class="skeleton-bg skeleton-rounded-lg" style="width: 6rem; height: 2rem;"></div>
                </div>
                <div style="display: flex; flex-direction: column; gap: var(--spacing-3);">
                    ${Array.from({ length: rows }).map(() => `
                        <div style="display: flex; align-items: center; gap: var(--spacing-4); padding: var(--spacing-2) 0;">
                            <div class="skeleton-bg skeleton-rounded-full" style="width: 2rem; height: 2rem; flex-shrink: 0;"></div>
                            <div class="skeleton-bg skeleton-rounded-md" style="flex: 1; height: 1.25rem;"></div>
                            <div class="skeleton-bg skeleton-rounded-md" style="width: 5rem; height: 1.25rem;"></div>
                            <div class="skeleton-bg skeleton-rounded-md" style="width: 4rem; height: 1.25rem;"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },
    renderSkeleton(container, viewTarget) {
        if (!container) return;
        const specificSkeletons = {
            dashboard: `
                <div class="skeleton animate-enter">
                    <div style="height: 2rem; width: 33%; margin-bottom: 1.5rem;" class="skeleton-bg skeleton-rounded"></div>
                    <div style="display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
                        <div style="height: 8rem;" class="skeleton-bg skeleton-rounded-2xl"></div>
                        <div style="height: 8rem;" class="skeleton-bg skeleton-rounded-2xl"></div>
                        <div style="height: 8rem;" class="skeleton-bg skeleton-rounded-2xl"></div>
                    </div>
                    <div style="height: 16rem; margin-top: 1.5rem;" class="skeleton-bg skeleton-rounded-2xl"></div>
                </div>`,
            turmas: `
                <div class="skeleton animate-enter">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem;">
                        <div style="height: 2rem; width: 12rem;" class="skeleton-bg skeleton-rounded"></div>
                        <div style="height: 2.5rem; width: 8rem;" class="skeleton-bg skeleton-rounded"></div>
                    </div>
                    <div style="display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
                        <div style="height: 10rem;" class="skeleton-bg skeleton-rounded-2xl"></div>
                        <div style="height: 10rem;" class="skeleton-bg skeleton-rounded-2xl"></div>
                        <div style="height: 10rem;" class="skeleton-bg skeleton-rounded-2xl"></div>
                    </div>
                </div>`
        };

        if (specificSkeletons[viewTarget]) {
            container.innerHTML = specificSkeletons[viewTarget];
            return;
        }

        const tableViews = ['diario', 'dia', 'frequencia', 'horario', 'notas-anuais'];
        if (tableViews.includes(viewTarget)) {
            container.innerHTML = this.getTableSkeleton();
            return;
        }

        container.innerHTML = this.getCardSkeleton();
    },
    initLazyLoading(scope = document) {
        const lazyElements = scope.querySelectorAll('.lazy-content:not(.loaded)');
        if (lazyElements.length === 0) return;
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('loaded');
                    obs.unobserve(entry.target);
                }
            });
        }, { rootMargin: '50px 0px', threshold: 0.1 });
        lazyElements.forEach(el => observer.observe(el));
    },
    async animateViewExit(container) {
        if (!container || !container.firstElementChild) return;
        return new Promise(resolve => {
            container.firstElementChild.classList.add('animate-exit');
            setTimeout(resolve, 180);
        });
    },
    aplicarTema() {
        if (model?.state?.userConfig?.themeColor) {
            document.documentElement.style.setProperty('--primary-color', model.state.userConfig.themeColor);
        }
    },
    setupCustomDropdown(dropdownId, onChangeCallback) {
        const container = document.getElementById(dropdownId);
        if (!container) return;
        this.initAllDropdowns(container);
        if (onChangeCallback) {
            const inputHidden = container.querySelector('input[type="hidden"]');
            if (inputHidden) {
                inputHidden.addEventListener('change', (e) => onChangeCallback(e.target.value));
            }
        }
    },
    _globalClickListenerAtivo: false,
    iniciarObservadorDropdowns() {
        if (!this._globalClickListenerAtivo) {
            document.addEventListener('click', (e) => {
                const targetDropdown = e.target.closest('.custom-dropdown');
                document.querySelectorAll('.custom-dropdown').forEach(d => {
                    if (d !== targetDropdown) {
                        const m = d.querySelector('.dropdown-menu');
                        const b = d.querySelector('.dropdown-button');
                        if (m) m.classList.add('hidden');
                        if (b) b.classList.remove('dropdown-button--active');
                    }
                });
            });
            this._globalClickListenerAtivo = true;
        }

        if (this._observerAtivo) return;
        const observer = new MutationObserver((mutations) => {
            let temNovoElemento = false;
            for (let mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    temNovoElemento = true;
                    break;
                }
            }
            if (temNovoElemento) {
                this.initAllDropdowns();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        this._observerAtivo = true;
    },
    initAllDropdowns(scope = document) {
        const containers = scope.querySelectorAll ? scope.querySelectorAll('.custom-dropdown') : [];
        containers.forEach(container => {
            if (container.dataset.initialized === 'true') return;
            container.dataset.initialized = 'true';
            container.classList.add('dropdown-initialized');

            const button = container.querySelector('.dropdown-button');
            const menu = container.querySelector('.dropdown-menu');
            const inputHidden = container.querySelector('input[type="hidden"]');
            let labelElement = container.querySelector('.dropdown-label');
            if (!button || !menu) return;
            if (!labelElement) {
                labelElement = button.querySelector('span') || button;
            }

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (button.disabled || button.classList.contains('opacity-60')) return;
                document.querySelectorAll('.dropdown-menu').forEach(m => {
                    if (m !== menu) m.classList.add('hidden');
                });
                document.querySelectorAll('.dropdown-button').forEach(b => {
                    if (b !== button) b.classList.remove('dropdown-button--active');
                });
                menu.classList.toggle('hidden');
                button.classList.toggle('dropdown-button--active');
            });

            menu.addEventListener('click', (e) => {
                const item = e.target.closest('.dropdown-item');
                if (!item) return;
                e.stopPropagation();
                const value = item.dataset.value;
                const text = item.innerText.trim();

                if (labelElement) {
                    labelElement.innerText = text;
                }

                menu.classList.add('hidden');
                button.classList.remove('dropdown-button--active');
                menu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('dropdown-item--selected'));
                item.classList.add('dropdown-item--selected');

                if (inputHidden) {
                    inputHidden.value = value !== undefined ? value : text;
                    
                    // Executa callback de forma assíncrona para permitir encerramento do clique
                    setTimeout(() => {
                        // 1. Executa onchange atribuído programaticamente
                        if (typeof inputHidden.onchange === 'function') {
                            try {
                                inputHidden.onchange.call(inputHidden, { target: inputHidden });
                            } catch (err) {
                                console.error("Erro no handler onchange do dropdown:", err);
                            }
                        } else if (inputHidden.getAttribute('onchange')) {
                            // 2. Executa string do atributo onchange inline com contexto correto
                            try {
                                const handlerFn = new Function('event', inputHidden.getAttribute('onchange'));
                                handlerFn.call(inputHidden, { target: inputHidden });
                            } catch (err) {
                                console.error("Erro ao executar atributo onchange do dropdown:", err);
                            }
                        }

                        // 3. Dispara eventos padrão DOM
                        inputHidden.dispatchEvent(new Event('change', { bubbles: true }));
                        inputHidden.dispatchEvent(new Event('input', { bubbles: true }));
                    }, 0);
                }
            });
        });
    }
};

if (typeof window !== 'undefined') {
    window.uiController = uiController;
}