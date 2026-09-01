
import { model } from './model.js';
import { Toast } from './components/toast.js';
import { escapeHTML, renderMath } from './utils.js';
import { uiController } from './controllers/uiController.js';
import { authController } from './controllers/authController.js';
import { turmaController } from './controllers/turmaController.js';
import { planejamentoController } from './controllers/planejamentoController.js';
import { commandPaletteController } from './controllers/commandPaletteController.js';
import { notificationController } from './controllers/notificationController.js';
import { router } from './router.js';
import { viewRegistry, publicViewAliases } from './services/viewRegistry.js';
import { EventDelegator } from './utils/eventDelegator.js';

const subControllers = [
    uiController,
    authController,
    turmaController,
    planejamentoController,
    commandPaletteController,
    notificationController
];

const controllerCore = {
    currentView: null,
    views: {},

    init: function () {
        if (typeof window !== 'undefined') {
            window.controller = controller;
            window.escapeHTML = escapeHTML;
        }
        this.bindViews();
        uiController.aplicarTema();
        uiController.iniciarObservadorDropdowns();
        commandPaletteController.init();
        notificationController.init();
        router.initNavigation();
        this.setupGlobalListeners();
        authController.monitorAuth();
        model.carregarQuestoesSistema();
        if (model.carregarDescritoresSaeb) model.carregarDescritoresSaeb();
        if (model.migrarAvaliacoesAntigas) model.migrarAvaliacoesAntigas();
    },
    bindViews: function () {
        this.views = { ...viewRegistry };
        Object.keys(this.views).forEach(key => {
            const view = this.views[key];
            if (view && typeof view === 'object') {
                const windowKey = `${key}View`;
                if (!window[windowKey]) {
                    window[windowKey] = view;
                }
            }
        });
        if (publicViewAliases && typeof publicViewAliases === 'object') {
            Object.keys(publicViewAliases).forEach(aliasName => {
                window[aliasName] = publicViewAliases[aliasName];
            });
        }
    },

    navigate: async function (viewName) {
        const routeName = router.resolve(viewName);
        const target = routeName;

        // 1. Verificação de Route Guard (Fail-Fast)
        const guardCheck = await router.canActivate(target);
        if (!guardCheck.canActivate) {
            if (guardCheck.message) {
                Toast.show(guardCheck.message, 'warning');
            }
            if (guardCheck.redirect && guardCheck.redirect !== target) {
                return this.navigate(guardCheck.redirect);
            }
            return;
        }

        if (!this.views[target]) this.bindViews();

        // Hook de Ciclo de Vida: Invoca destroy() ou onLeave() na view anterior para limpeza de timers/listeners
        if (this.currentView && this.views[this.currentView]) {
            const prevViewObj = this.views[this.currentView];
            try {
                if (typeof prevViewObj.destroy === 'function') {
                    prevViewObj.destroy();
                } else if (typeof prevViewObj.onLeave === 'function') {
                    prevViewObj.onLeave();
                }
            } catch (err) {
                console.warn(`Erro no hook destroy/onLeave da view '${this.currentView}':`, err);
            }
        }

        const container = document.getElementById('view-container');
        const view = this.views[target];
        this.currentView = target;
        uiController.updateNavHighlight(target);

        if (!container) return;

        requestAnimationFrame(async () => {
            try {
                container.innerHTML = '';
                const wrapper = document.createElement('div');
                wrapper.className = 'animate-enter w-full h-full';
                if (view && view.render) {
                    if (target === 'config') {
                        await view.render(wrapper, model.state.userConfig);
                    } else if (target === 'interatividades') {
                        let aba = null;
                        if (viewName === 'quiz-gestor' || viewName === 'quiz') aba = 'quiz';
                        else if (viewName === 'simuladores' || viewName === 'simulacao') aba = 'simuladores';
                        else if (['apresentacoes', 'slides', 'powerpoint', 'pptx'].includes(viewName)) aba = 'apresentacoes';
                        await view.render(wrapper, aba);
                    } else {
                        await view.render(wrapper);
                    }
                }
                container.appendChild(wrapper);
                
                requestAnimationFrame(() => {
                    renderMath(wrapper);
                });

                uiController.initLazyLoading(wrapper);
                uiController.updateBreadcrumb(target);
                uiController.initAllDropdowns(container);
                authController.updateSidebarUserArea();
                if (window.innerWidth < 768) {
                    const sidebar = document.getElementById('app-sidebar');
                    if (sidebar && sidebar.classList.contains('mobile-open')) {
                        uiController.toggleSidebar(false);
                    }
                }
            } catch (e) {
                console.error(`Erro ao inicializar view '${target}':`, e);
                container.innerHTML = `
                    <div class="card" style="margin: 2rem auto; max-width: 500px; text-align: center; border-top: 4px solid #ef4444;">
                        <div style="font-size: 2.5rem; color: #ef4444; margin-bottom: 0.75rem;">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h3 style="font-weight: 800; color: #0f172a; margin-bottom: 0.5rem;">Indisponibilidade Temporária</h3>
                        <p style="color: #64748b; font-size: 0.875rem; margin-bottom: 1.25rem;">
                            Não foi possível carregar a tela selecionada. Seus dados continuam salvos e seguros.
                        </p>
                        <button type="button" data-action="nav-dashboard" class="btn-primary" style="display: inline-flex; align-items: center; gap: 0.5rem; margin: 0 auto;">
                            <i class="fas fa-arrow-left"></i> <span>Voltar ao Painel</span>
                        </button>
                    </div>
                `;
                EventDelegator.bind(container, {
                    'nav-dashboard': () => this.navigate('dashboard')
                }, 'click');
            }
        });
    },

    openSeletorBnccQuestao() {
        const elMateria = document.getElementById('q-materia');
        const elAno = document.getElementById('q-ano');
        const elEnunciado = document.getElementById('q-enunciado');
        const rascunhoAtual = {
            materia: elMateria ? elMateria.value : '',
            ano: elAno ? elAno.value : '',
            enunciado: elEnunciado ? elEnunciado.value : ''
        };
        const callback = (habilidadeEscolhida) => {
            const dadosCompletos = {
                ...rascunhoAtual,
                bncc: {
                    codigo: habilidadeEscolhida.codigo,
                    descricao: habilidadeEscolhida.descricao
                }
            };
            window.provasView.openAddQuestao(dadosCompletos);
        };
        this.openModal('Selecionar BNCC', '<div id="modal-bncc-container" style="height: 600px;"></div>', 'large');
        setTimeout(() => {
            window.bnccView.render('modal-bncc-container', null, null, callback);
        }, 50);
    },

    updatePeriodType(type) {
        model.state.userConfig.periodType = type;
        model.saveLocal();
        this.navigate(this.currentView === 'periodo' ? 'periodo' : 'config');
    },
    updateTheme(color) {
        if (!color || !/^#([0-9A-F]{3}){1,2}$/i.test(color)) return;
        if (!model.state.userConfig) model.state.userConfig = {};
        model.state.userConfig.themeColor = color;
        localStorage.setItem('planner_theme_color', color);
        model.saveLocal();
        uiController.aplicarTema();
        Toast.show("Cor de destaque aplicada com sucesso!", "success");
        if (this.currentView === 'config' && window.settingsView && window.settingsView.sincronizarEstadoCores) {
            window.settingsView.sincronizarEstadoCores(color);
        }
    },
    resetTheme() {
        const defaultColor = '#3b82f6';
        if (!model.state.userConfig) model.state.userConfig = {};
        model.state.userConfig.themeColor = defaultColor;
        localStorage.setItem('planner_theme_color', defaultColor);
        model.saveLocal();
        uiController.aplicarTema();
        Toast.show("Paleta restaurada para o padrão!", "info");
        if (this.currentView === 'config' && window.settingsView) {
            if (window.settingsView.sincronizarEstadoCores) {
                window.settingsView.sincronizarEstadoCores(defaultColor);
            } else {
                window.settingsView.render('view-container');
            }
        }
    },
    updatePeriodDate(index, campo, valor) {
        const tipo = model.state.userConfig.periodType || 'bimestre';
        if (model.state.periodosDatas && model.state.periodosDatas[tipo]) {
            model.state.periodosDatas[tipo][index][campo] = valor;
            model.saveLocal();
            Toast.show("Calendário escolar atualizado!", "success");
        }
    },
    exportData() { model.exportData(); },
    deleteQuestao(id) {
        this.confirmarAcao("Excluir Questão?", "Esta questão será removida permanentemente.", () => {
            model.deleteQuestao(id);
            if (window.provasView) {
                window.provasView.selecionadas.delete(String(id));
                if (this.currentView === 'provas') window.provasView.render('view-container');
            }
            Toast.show("Questão excluída.", "success");
        });
    },
    setupGlobalListeners: function () {
        const dateEl = document.getElementById('current-date');
        if (dateEl) {
            dateEl.innerText = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }

        EventDelegator.bind(document.body, {
            'navigate': (e, target) => {
                const route = target.getAttribute('data-route');
                if (route) controller.navigate(route);
            },
            'toggle-sidebar': () => controller.toggleSidebar(),
            'handle-login': () => controller.handleLogin(),
            'toggle-zen': () => uiController.toggleZenMode(),
            'toggle-theme': () => uiController.toggleTema(),
            'open-sync': () => uiController.abrirCentroSincronizacao(),
            'print': () => {
                const activeView = controller.views[controller.currentView];
                if (activeView && typeof activeView.imprimir === 'function') {
                    activeView.imprimir();
                } else if (activeView && typeof activeView.imprimirPDF === 'function') {
                    activeView.imprimirPDF();
                } else if (activeView && typeof activeView.gerarPDF === 'function') {
                    activeView.gerarPDF();
                } else {
                    window.print();
                }
            },
            'export-data': () => controller.exportData(),
            'command-palette': () => window.commandPaletteController?.open(),
            'toggle-notifications': () => window.notificationController?.toggle()
        });
    },
    openDayOptions(data) {
        if (calendarioView && calendarioView.openDayOptions) {
            calendarioView.openDayOptions(data);
        } else {
            const tiposHtml = Object.entries(model.tiposEventos).map(([key, valor]) =>
                `<li class="dropdown-item" data-value="${window.escapeHTML(key)}">${window.escapeHTML(valor.label)}</li>`
            ).join('');
            const html = `
    <div id="modal-dia-evento-wrap" style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
        <h3 style="font-size: 1.125rem; font-weight: 700;">Evento em ${data}</h3>
        
        <div>
            <label class="form-label">Tipo de Evento</label>
            <div class="custom-dropdown" style="margin-bottom: var(--spacing-2);">
                <input type="hidden" id="evt-tipo" value="feriado">
                <button type="button" class="dropdown-button">
                    <span class="dropdown-label">Selecione o tipo...</span>
                    <i class="fas fa-chevron-down" style="color: var(--color-slate-400); font-size: 0.75rem; margin-left: var(--spacing-2);"></i>
                </button>
                <ul class="dropdown-menu hidden">
                    ${tiposHtml}
                </ul>
            </div>
        </div>
        <div>
            <label class="form-label">Descrição</label>
            <input type="text" id="evt-desc" class="form-input" placeholder="Ex: Dia da Consciência Negra">
        </div>
        
        <button type="button" data-action="salvar-evento-dia" data-data="${data}" class="btn-primary" style="justify-content: center; padding: 0.875rem; margin-top: var(--spacing-4);">Salvar Evento</button>
    </div>
`;
            this.openModal('Editar Calendário', html);
            const wrap = document.getElementById('modal-dia-evento-wrap');
            if (wrap) {
                EventDelegator.bind(wrap, {
                    'salvar-evento-dia': (e, target) => {
                        const dt = target.getAttribute('data-data');
                        if (dt) this.saveDayEvent(dt);
                    }
                }, 'click');
            }
        }
    },
    saveDayEvent(data) {
        const tipo = document.getElementById('evt-tipo')?.value;
        const desc = document.getElementById('evt-desc')?.value;
        model.setEvento(data, tipo, desc);
        this.closeModal();
        if (this.currentView === 'dashboard') this.navigate('dashboard');
        else if (this.currentView === 'calendario') this.navigate('calendario');
    }
};

export const controller = new Proxy(controllerCore, {
    get(target, prop, receiver) {
        if (prop in target) {
            const val = Reflect.get(target, prop, receiver);
            return typeof val === 'function' ? val.bind(receiver) : val;
        }
        for (const sub of subControllers) {
            if (sub && typeof sub[prop] === 'function') {
                return sub[prop].bind(sub);
            }
        }
        return undefined;
    }
});

if (typeof window !== 'undefined') {
    window.controller = controller;
}

