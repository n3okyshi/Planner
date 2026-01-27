// js/controller.js
import { model } from './model.js';
import { firebaseService } from './firebase-service.js';
import { Toast } from './components/toast.js';

// Importação dos novos Sub-Controllers
import { uiController } from './controllers/uiController.js';
import { authController } from './controllers/authController.js';
import { turmaController } from './controllers/turmaController.js';
import { planejamentoController } from './controllers/planejamentoController.js';

// Importação das Views (Garantindo que estejam no escopo)
import { bnccView } from './views/bncc.js';
import { turmasView } from './views/turmas.js';
import { calendarioView } from './views/calendario.js';
import { mensalView } from './views/mensal.js';
import { planejamentoView } from './views/planejamento.js';
import { diarioView } from './views/diario.js';
import { salaView } from './views/sala.js';
import { provasView } from './views/provas.js';
import { frequenciaView } from './views/frequencia.js';
import { settingsView } from './views/settings.js';
import { dashboardView } from './views/dashboard.js';
import { horarioView } from './views/horario.js';
import { estatisticasProvasView } from './views/estatisticas-provas.js';
import { comunidadeView } from './views/comunidade.js';
import { notasAnuaisView } from './views/notasAnuais.js';

// Helper Global de Segurança (Mantido aqui para ser acessível por todo o app)
window.escapeHTML = function (str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (match) {
        const escape = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return escape[match];
    });
};

export const controller = {
    currentView: null,
    views: {},

    // --- Inicialização ---
    init: function () {
        if (model && model.init) model.init();
        this.bindViews();
        uiController.aplicarTema();
        this.setupGlobalListeners();
        authController.monitorAuth();
        model.carregarQuestoesSistema();

        // MIGRAR DADOS ANTIGOS (roda apenas uma vez se detectar campos indefinidos)
        if (model.migrarAvaliacoesAntigas) model.migrarAvaliacoesAntigas();
    },

    bindViews: function () {
        this.views = {
            'dashboard': dashboardView,
            'horario': horarioView,
            'calendario': calendarioView,
            'mensal': mensalView,
            'periodo': planejamentoView,
            'dia': diarioView,
            'turmas': turmasView,
            'bncc': bnccView,
            'mapa': salaView,
            'provas': provasView,
            'frequencia': frequenciaView,
            'config': settingsView,
            'stats-provas': estatisticasProvasView,
            'comunidade': comunidadeView,
            'notas-anuais': notasAnuaisView
        };
        Object.keys(this.views).forEach(key => { window[key + 'View'] = this.views[key]; });
    },

    // --- Navegação Centralizada ---
    navigate: async function (viewName) {
        const map = { 'planejamento': 'periodo', 'diario': 'dia', 'sala': 'mapa', 'settings': 'config' };
        const target = map[viewName] || viewName;

        if (!this.views[target]) this.bindViews();

        const container = document.getElementById('view-container');
        const view = this.views[target];
        this.currentView = target;

        uiController.updateNavHighlight(target);
        uiController.renderSkeleton(container, target);

        setTimeout(async () => {
            try {
                container.innerHTML = '';
                if (view && view.render) {
                    if (target === 'config') await view.render(container, model.state.userConfig);
                    else await view.render(container);
                }
                uiController.updateBreadcrumb(target);
                authController.updateSidebarUserArea();
            } catch (e) {
                console.error(`Erro na view ${target}:`, e);
                container.innerHTML = `<div class="p-4 text-red-500">Erro: ${e.message}</div>`;
            }
        }, 50);
    },

    // --- Delegação: Interface (UI) ---
    openModal(t, c, s) { uiController.openModal(t, c, s); },
    closeModal() { uiController.closeModal(); },
    confirmarAcao(t, m, c) { uiController.confirmarAcao(t, m, c); },
    toggleSidebar() { uiController.toggleSidebar(); },
    aplicarTema() { uiController.aplicarTema(); },

    // --- Delegação: Autenticação ---
    handleLogin() { authController.handleLogin(); },
    handleLogout() { authController.handleLogout(); },

    // --- Delegação: Turmas e Alunos ---
    openAddTurma() { turmaController.openAddTurma(); },
    saveTurma() { turmaController.saveTurma(); },
    deleteTurma(id) { turmaController.deleteTurma(id); },
    updateSerieOptions(n) { turmaController.updateSerieOptions(n); },
    openAddAluno(id) { turmaController.openAddAluno(id); },
    saveAluno(id) { turmaController.saveAluno(id); },
    deleteAluno(t, a) { turmaController.deleteAluno(t, a); },
    openAddAlunoLote(id) { turmaController.openAddAlunoLote(id); },
    saveAlunoLote(id) { turmaController.saveAlunoLote(id); },

    // --- ADIÇÃO: Suporte a Período na Avaliação ---
    openAddAvaliacao(id) { turmaController.openAddAvaliacao(id); },
    saveAvaliacao(id) { turmaController.saveAvaliacao(id); },

    deleteAvaliacao(t, a) { turmaController.deleteAvaliacao(t, a); },
    updateNota(t, al, av, v) { turmaController.updateNota(t, al, av, v); },

    // --- Delegação: Planejamento e BNCC ---
    salvarDiario() { planejamentoController.salvarDiario(); },
    mudarDataDiario(d) { planejamentoController.mudarDataDiario(d); },
    mudarMesDiario(d) { planejamentoController.mudarMesDiario(d); },
    mudarTurmaDiario(id) { planejamentoController.mudarTurmaDiario(id); },
    abrirModalCopiarPlanejamento(id) { planejamentoController.abrirModalCopiarPlanejamento(id); },
    confirmarCopiaPlanejamento(id) { planejamentoController.confirmarCopiaPlanejamento(id); },
    openSeletorBncc(t, p, n, s) { planejamentoController.openSeletorBncc(t, p, n, s); },
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
        this.openModal('Selecionar BNCC', '<div id="modal-bncc-container" class="h-[600px]"></div>', 'large');
        setTimeout(() => {
            window.bnccView.render('modal-bncc-container', null, null, callback);
        }, 50);
    },

    // --- Funções de Configuração e Outros ---
    updatePeriodType(type) {
        model.state.userConfig.periodType = type;
        model.saveLocal();
        model.saveCloudRoot();
        this.navigate(this.currentView === 'periodo' ? 'periodo' : 'config');
    },
    updateTheme(color) {
        model.state.userConfig.themeColor = color;
        model.saveLocal();
        model.saveCloudRoot();
        uiController.aplicarTema();
        this.navigate('config');
    },
    updatePeriodDate(index, campo, valor) {
        const tipo = model.state.userConfig.periodType || 'bimestre';
        model.state.periodosDatas[tipo][index][campo] = valor;
        model.saveLocal();
        model.saveCloudRoot();
        Toast.show("Calendário escolar atualizado!", "success");
    },

    exportData() { model.exportData(); },

    deleteQuestao(id) {
        this.confirmarAcao("Excluir Questão?", "Esta questão será removida permanentemente.", () => {
            model.deleteQuestao(id);
            if (window.provasView) {
                window.provasView.selecionadas.delete(id);
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

    openDayOptions(data) { calendarioView.openDayOptions(data); },
    saveDayEvent(data) {
        const tipo = document.getElementById('evt-tipo').value;
        const desc = document.getElementById('evt-desc').value;
        model.setEvento(data, tipo, desc);
        this.closeModal();
        if (this.currentView === 'dashboard') this.navigate('dashboard');
    },
};

// Vinculação Global
window.salaView = salaView;
window.estatisticasProvasView = estatisticasProvasView;
window.notasAnuaisView = notasAnuaisView;
window.controller = controller;
window.addEventListener('load', () => controller.init());