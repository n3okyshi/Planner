
import { model } from './model.js';
import { firebaseService } from './firebase-service.js';
import { Toast } from './components/toast.js';
import { escapeHTML, renderKatex } from './utils.js';
import { uiController } from './controllers/uiController.js';
import { authController } from './controllers/authController.js';
import { turmaController } from './controllers/turmaController.js';
import { planejamentoController } from './controllers/planejamentoController.js';
import { router } from './router.js';
import { viewRegistry, publicViewAliases } from './services/viewRegistry.js';
/**
 * Helper Global de Segurança contra XSS.
 * Transforma caracteres especiais em entidades HTML.
 * @global
 */
window.escapeHTML = escapeHTML;
export const controller = {
    currentView: null,
    views: {},

    init: function () {
        if (typeof window !== 'undefined') {
            window.controller = this;
        }
        this.bindViews();
        uiController.aplicarTema();
        uiController.iniciarObservadorDropdowns();
        router.initNavigation();
        this.setupGlobalListeners();
        authController.monitorAuth();
        model.carregarQuestoesSistema();
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
        if (!this.views[target]) this.bindViews();
        const container = document.getElementById('view-container');
        const view = this.views[target];
        this.currentView = target;
        uiController.updateNavHighlight(target);
        uiController.renderSkeleton(container, target);
        uiController.updateNavHighlight(target);
        await uiController.animateViewExit(container);
        uiController.renderSkeleton(container, target);
        setTimeout(async () => {
            try {
                container.innerHTML = '';
                const wrapper = document.createElement('div');
                wrapper.className = 'animate-enter w-full h-full';
                if (view && view.render) {
                    if (target === 'config') await view.render(wrapper, model.state.userConfig);
                    else await view.render(wrapper);
                }
                container.appendChild(wrapper);
                renderKatex(wrapper);
                uiController.initLazyLoading(wrapper);
                uiController.updateBreadcrumb(target);
                uiController.initAllDropdowns(container);
                authController.updateSidebarUserArea();
                if (window.innerWidth < 768 && document.getElementById('app-sidebar').classList.contains('mobile-open')) {
                    uiController.toggleSidebar();
                }
            } catch (e) {
                console.error(`Erro na view ${target}:`, e);
                container.innerHTML = `<div class="p-4 text-red-500">Erro ao carregar a view: ${window.escapeHTML(e.message)}</div>`;
            }
        }, 50);
    },

    openModal(t, c, s) { uiController.openModal(t, c, s); },
    closeModal() { uiController.closeModal(); },
    confirmarAcao(t, m, c) { uiController.confirmarAcao(t, m, c); },
    toggleSidebar() { uiController.toggleSidebar(); },
    aplicarTema() { uiController.aplicarTema(); },

    handleLogin() { authController.handleLogin(); },
    handleLogout() { authController.handleLogout(); },

    openAddTurma() { turmaController.openAddTurma(); },
    saveTurma() { turmaController.saveTurma(); },
    deleteTurma(id) { turmaController.deleteTurma(id); },
    updateSerieOptions(n) { turmaController.updateSerieOptions(n); },
    openAddAluno(t, a) { turmaController.openAddAluno(t, a); },
    saveAluno(t, a) { turmaController.saveAluno(t, a); },
    deleteAluno(t, a) { turmaController.deleteAluno(t, a); },
    openAddAlunoLote(id) { turmaController.openAddAlunoLote(id); },
    saveAlunoLote(id) { turmaController.saveAlunoLote(id); },
    openAddAvaliacao(id) { turmaController.openAddAvaliacao(id); },
    saveAvaliacao(id) { turmaController.saveAvaliacao(id); },
    deleteAvaliacao(t, a) { turmaController.deleteAvaliacao(t, a); },
    updateNota(t, al, av, v) { turmaController.updateNota(t, al, av, v); },

    salvarDiario() { planejamentoController.salvarDiario(); },
    mudarDataDiario(d) { planejamentoController.mudarDataDiario(d); },
    mudarMesDiario(d) { planejamentoController.mudarMesDiario(d); },
    mudarTurmaDiario(id) { planejamentoController.mudarTurmaDiario(id); },
    abrirModalCopiarPlanejamento(id) { planejamentoController.abrirModalCopiarPlanejamento(id); },
    confirmarCopiaPlanejamento(id) { planejamentoController.confirmarCopiaPlanejamento(id); },
    openSeletorBncc(t, p, n, s) { planejamentoController.openSeletorBncc(t, p, n, s); },
    openSeletorBnccDiario(t) { planejamentoController.openSeletorBnccDiario(t); },
    removeHabilidade(t, p, c) { planejamentoController.removeHabilidade(t, p, c); },
    openSeletorBnccMensal(t, m, n, s) { planejamentoController.openSeletorBnccMensal(t, m, n, s); },
    removeHabilidadeMensal(t, m, c) { planejamentoController.removeHabilidadeMensal(t, m, c); },
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
        model.state.userConfig.themeColor = color;
        model.saveLocal();
        uiController.aplicarTema();
        this.navigate('config');
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
    },
    openDayOptions(data) {
        if (calendarioView && calendarioView.openDayOptions) {
            calendarioView.openDayOptions(data);
        } else {
            const tiposHtml = Object.entries(model.tiposEventos).map(([key, valor]) =>
                `<li class="dropdown-item" data-value="${window.escapeHTML(key)}">${window.escapeHTML(valor.label)}</li>`
            ).join('');
            const html = `
    <div style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
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
        
        <button onclick="controller.saveDayEvent('${data}')" class="btn-primary" style="justify-content: center; padding: 0.875rem; margin-top: var(--spacing-4);">Salvar Evento</button>
    </div>
`;
            this.openModal('Editar Calendário', html);
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
if (typeof window !== 'undefined') {
    window.controller = controller;
}

