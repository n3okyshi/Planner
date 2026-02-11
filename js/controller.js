/**
 * @file controller.js
 * @description Controlador Principal (Main Controller). Orquestra a inicialização, roteamento de views e delegação para sub-controladores.
 * @module controller
 */

import { model } from './model.js';
import { firebaseService } from './firebase-service.js';
import { Toast } from './components/toast.js';

// Importação dos Sub-Controllers (Lógica de Negócio Modularizada)
import { uiController } from './controllers/uiController.js';
import { authController } from './controllers/authController.js';
import { turmaController } from './controllers/turmaController.js';
import { planejamentoController } from './controllers/planejamentoController.js';

// Importação das Views
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

/**
 * Helper Global de Segurança contra XSS.
 * Transforma caracteres especiais em entidades HTML.
 * @global
 */
window.escapeHTML = function (str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (match) {
        const escape = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return escape[match];
    });
};

/**
 * Controlador Principal.
 * @namespace controller
 */
export const controller = {
    currentView: null,
    views: {},

    // =========================================================================
    // CICLO DE VIDA E INICIALIZAÇÃO
    // =========================================================================

    init: function () {
        if (model && model.init) model.init();

        this.bindViews();
        uiController.aplicarTema();
        this.setupGlobalListeners();

        // Inicia monitoramento de autenticação e carrega dados iniciais
        authController.monitorAuth();
        model.carregarQuestoesSistema();

        // Migração de dados legados (Executa apenas se necessário)
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

        // Exposição global das views para acesso via HTML (onclick)
        window.salaView = salaView;
        window.diarioView = diarioView;
        window.turmasView = turmasView;
        window.planejamentoView = planejamentoView;
        window.bnccView = bnccView;
        window.provasView = provasView;
        window.frequenciaView = frequenciaView;
        window.horarioView = horarioView;
        window.mensalView = mensalView;
        window.estatisticasProvasView = estatisticasProvasView;
        window.comunidadeView = comunidadeView;
        window.notasAnuaisView = notasAnuaisView;
        window.settingsView = settingsView;

        // Mantém também a lógica dinâmica para segurança
        Object.keys(this.views).forEach(key => { window[key + 'View'] = this.views[key]; });
    },

    // =========================================================================
    // NAVEGAÇÃO E ROTEAMENTO
    // =========================================================================

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
                container.innerHTML = `<div class="p-4 text-red-500">Erro ao carregar a view: ${window.escapeHTML(e.message)}</div>`;
            }
        }, 50);
    },

    // =========================================================================
    // DELEGAÇÃO: INTERFACE (UI)
    // =========================================================================

    openModal(t, c, s) { uiController.openModal(t, c, s); },
    closeModal() { uiController.closeModal(); },
    confirmarAcao(t, m, c) { uiController.confirmarAcao(t, m, c); },
    toggleSidebar() { uiController.toggleSidebar(); },
    aplicarTema() { uiController.aplicarTema(); },

    // =========================================================================
    // DELEGAÇÃO: AUTENTICAÇÃO
    // =========================================================================

    handleLogin() { authController.handleLogin(); },
    handleLogout() { authController.handleLogout(); },

    // =========================================================================
    // DELEGAÇÃO: TURMAS, ALUNOS E AVALIAÇÕES
    // =========================================================================

    openAddTurma() { turmaController.openAddTurma(); },
    saveTurma() { turmaController.saveTurma(); },
    deleteTurma(id) { turmaController.deleteTurma(id); },
    updateSerieOptions(n) { turmaController.updateSerieOptions(n); },

    openAddAluno(id) { turmaController.openAddAluno(id); },
    saveAluno(id) { turmaController.saveAluno(id); },
    deleteAluno(t, a) { turmaController.deleteAluno(t, a); },
    openAddAlunoLote(id) { turmaController.openAddAlunoLote(id); },
    saveAlunoLote(id) { turmaController.saveAlunoLote(id); },

    openAddAvaliacao(id) { turmaController.openAddAvaliacao(id); },
    saveAvaliacao(id) { turmaController.saveAvaliacao(id); },
    deleteAvaliacao(t, a) { turmaController.deleteAvaliacao(t, a); },
    updateNota(t, al, av, v) { turmaController.updateNota(t, al, av, v); },

    // =========================================================================
    // DELEGAÇÃO: PLANEJAMENTO E BNCC
    // =========================================================================

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

    /**
     * Abre o seletor BNCC específico para o modal de criação de questão.
     */
    openSeletorBnccQuestao() {
        const elMateria = document.getElementById('q-materia');
        const elAno = document.getElementById('q-ano');
        const elEnunciado = document.getElementById('q-enunciado');

        // Salva o rascunho atual para não perder dados ao fechar/abrir modais
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

    // =========================================================================
    // CONFIGURAÇÃO, CALENDÁRIO E OUTROS
    // =========================================================================

    updatePeriodType(type) {
        model.state.userConfig.periodType = type;
        model.saveLocal();
        model.saveCloudRoot();
        // Recarrega a view atual se for relevante, senão vai para config
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
        if (model.state.periodosDatas && model.state.periodosDatas[tipo]) {
            model.state.periodosDatas[tipo][index][campo] = valor;
            model.saveLocal();
            model.saveCloudRoot();
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

    // Métodos delegados para o calendário (abrir modal do dia)
    openDayOptions(data) { 
        if (calendarioView && calendarioView.openDayOptions) {
            calendarioView.openDayOptions(data); 
        } else {
            const tiposHtml = Object.entries(model.tiposEventos).map(([key, valor]) => 
                `<option value="${window.escapeHTML(key)}">${window.escapeHTML(valor.label)}</option>`
            ).join('');

            const html = `
                <div class="p-6">
                    <h3 class="text-lg font-bold mb-4">Evento em ${data}</h3>
                    <label class="block text-xs uppercase text-gray-500 font-bold mb-1">Tipo de Evento</label>
                    <select id="evt-tipo" class="w-full border p-2 rounded mb-4 focus:border-primary outline-none bg-white">
                        ${tiposHtml}
                    </select>
                    <label class="block text-xs uppercase text-gray-500 font-bold mb-1">Descrição</label>
                    <input type="text" id="evt-desc" class="w-full border p-2 rounded mb-4 outline-none focus:border-primary" placeholder="Ex: Dia da Consciência Negra">
                    <button onclick="controller.saveDayEvent('${data}')" class="w-full bg-primary text-white py-2 rounded-xl font-bold shadow-md">Salvar Evento</button>
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

// Exposição Global (Necessário para onclicks no HTML)
window.controller = controller;
window.addEventListener('load', () => controller.init());