import { model } from '../model.js';
import { controller } from '../controller.js';
import { uiController } from '../controllers/uiController.js';
import { planejamentoController } from '../controllers/planejamentoController.js';
import { renderKatex } from '../utils.js';
import { EventDelegator } from '../utils/eventDelegator.js';

export const diarioView = {
    currentDate: new Date().toISOString().split('T')[0],
    viewDate: new Date(),
    currentTurmaId: null,
    _cleanupDelegators: null,

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);

        // Se o contêiner de abas do planejamento (#subarea-planejamento-content) existir no DOM,
        // renderiza a view do diário dentro dele para não apagar o cabeçalho com as abas ("Por Período", "Mensal", "Diário").
        const subarea = document.getElementById('subarea-planejamento-content');
        if (subarea && (container === document.getElementById('view-container') || !container)) {
            container = subarea;
        } else if (!subarea && (container === document.getElementById('view-container') || !container)) {
            if (window.planejamentoView) {
                window.planejamentoView.abaAtiva = 'diario';
                window.planejamentoView.render('view-container');
                return;
            }
        }

        if (!container) return;

        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }

        const turmas = (model.state && model.state.turmas) ? model.state.turmas : [];

        if (this.currentTurmaId && !turmas.find(t => String(t.id) === String(this.currentTurmaId))) {
            this.currentTurmaId = null;
        }
        if (!this.currentTurmaId && turmas.length > 0) {
            this.currentTurmaId = turmas[0].id;
        }

        const html = `
            <div class="animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8);">
                
                <!-- TOP HEADER & TOOLBAR -->
                <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div style="display: flex; align-items: center; gap: var(--spacing-4);">
                        <div style="background-color: var(--color-primary-light); color: var(--color-primary); width: 2.75rem; height: 2.75rem; border-radius: var(--radius-xl); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                            <i class="fas fa-book-reader"></i>
                        </div>
                        <div>
                            <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em;">Diário de Classe</h2>
                            <p style="font-size: 0.875rem; color: var(--color-slate-500);">Registro diário de aulas, metodologia e habilidades desenvolvidas.</p>
                        </div>
                    </div>

                        <button type="button" data-action="replicar-plano-diario" class="btn-secondary interactive-element" title="Replicar este plano de aula para outras turmas da mesma série">
                            <i class="fas fa-copy"></i> <span>Replicar Plano</span>
                        </button>

                        <div class="custom-dropdown" style="min-width: 240px;">
                            <input type="hidden" id="select-turma-global" data-action="mudar-turma-diario-change" value="${this.currentTurmaId || ''}">
                            <button type="button" class="dropdown-button">
                                <i class="fas fa-users" style="color: var(--color-slate-400); margin-right: var(--spacing-2);"></i>
                                <span class="dropdown-label">${turmas.find(t => String(t.id) === String(this.currentTurmaId))?.nome || 'Selecionar Turma...'}</span>
                                <i class="fas fa-chevron-down" style="color: var(--color-slate-400); font-size: 0.75rem; margin-left: auto;"></i>
                            </button>
                            <ul class="dropdown-menu hidden custom-scrollbar">
                                ${turmas.length > 0
                ? turmas.map(t => `<li class="dropdown-item ${String(t.id) === String(this.currentTurmaId) ? 'dropdown-item--selected' : ''}" data-value="${t.id}">${window.escapeHTML(t.nome)}</li>`).join('')
                : '<li class="p-3 text-slate-400 text-sm text-center">Nenhuma turma cadastrada</li>'
            }
                            </ul>
                        </div>
                        <div id="status-salvamento" style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); min-width: 80px; text-align: right;"></div>
                    </div>
                </div>

                <!-- MAIN SIDE-BY-SIDE GRID (CALENDAR + LESSON PLAN EDITOR) -->
                ${turmas.length === 0 ? this.estadoVazio() : `
                    <div class="layout-2col-responsive--wide">
                        
                        <!-- LEFT COLUMN: MINI CALENDAR & TIPS (360px) -->
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-4); width: 100%;">
                            <div id="mini-calendario-container">
                                ${this.gerarMiniCalendario()}
                            </div>
                            
                            <div class="card" style="padding: var(--spacing-4); background-color: #eff6ff; border: 1px solid #dbeafe; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.8125rem; color: #1e40af; line-height: 1.5;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 800;">
                                    <i class="fas fa-info-circle"></i> Como funciona:
                                </div>
                                <ol style="padding-left: 1.25rem; margin: 0; display: flex; flex-direction: column; gap: 0.25rem;">
                                    <li>Selecione a data no calendário acima.</li>
                                    <li>Preencha os campos da aula ao lado.</li>
                                    <li>O salvamento ocorre automaticamente.</li>
                                </ol>
                            </div>
                        </div>

                        <!-- RIGHT COLUMN: LESSON PLAN EDITOR -->
                        <div id="editor-diario-container" style="width: 100%; min-width: 0;">
                            ${this.renderEditor()}
                        </div>
                    </div>
                `}
            </div>
        `;

        container.innerHTML = html;

        const unbindClick = EventDelegator.bind(container, {
            'replicar-plano-diario': () => planejamentoController.abrirModalReplicarPlanoDiario(this.currentDate, this.currentTurmaId),
            'selecionar-data-diario': (e, target) => {
                const dt = target.getAttribute('data-date');
                if (dt) this.selecionarData(dt);
            },
            'selecionar-data-hoje': () => this.selecionarData(new Date().toISOString().split('T')[0]),
            'mudar-mes-diario': (e, target) => {
                const delta = Number(target.getAttribute('data-delta') || 0);
                if (delta) this.mudarMes(delta);
            },
            'add-habilidade-diario': (e, target) => {
                const texto = target.getAttribute('data-texto');
                if (texto) this.adicionarHabilidadeTexto(texto);
            },
            'imprimir-diario': () => this.imprimirPlano(),
            'salvar-diario': () => controller.salvarDiario(),
            'open-seletor-bncc-diario': () => controller.openSeletorBnccDiario(this.currentTurmaId),
            'nav-turmas': () => controller.navigate('turmas')
        }, 'click');

        const unbindChange = EventDelegator.bind(container, {
            'mudar-turma-diario-change': (e, target) => {
                controller.mudarTurmaDiario(target.value);
            }
        }, 'change');

        this._cleanupDelegators = () => {
            if (typeof unbindClick === 'function') unbindClick();
            if (typeof unbindChange === 'function') unbindChange();
        };

        uiController.initAllDropdowns(container);

        if (turmas.length > 0) {
            this.preencherCampos();
            if (window.planejamentoController?.initDiarioAutosave) {
                window.planejamentoController.initDiarioAutosave();
            }
        }
        renderKatex(container);
    },

    gerarMiniCalendario() {
        const ano = this.viewDate.getFullYear();
        const mes = this.viewDate.getMonth();
        const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
        const totalDias = new Date(ano, mes + 1, 0).getDate();

        let diasHtml = '';

        for (let i = 0; i < primeiroDiaSemana; i++) {
            diasHtml += `<div style="height: 2.5rem;"></div>`;
        }

        for (let dia = 1; dia <= totalDias; dia++) {
            const dataIso = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const isSelected = dataIso === this.currentDate;
            const planoExistente = model.getPlanoDiario(dataIso, this.currentTurmaId);
            const temPlano = planoExistente && (
                (planoExistente.tema && planoExistente.tema.trim()) ||
                (planoExistente.bncc && planoExistente.bncc.trim()) ||
                (planoExistente.objetivos && planoExistente.objetivos.trim()) ||
                (planoExistente.metodologia && planoExistente.metodologia.trim())
            );

            const indicadorHtml = temPlano
                ? `<span style="position: absolute; bottom: 4px; width: 6px; height: 6px; border-radius: 50%; background-color: #10b981; box-shadow: 0 0 4px rgba(16, 185, 129, 0.6);"></span>`
                : '';

            const bgStyle = isSelected
                ? 'background-color: var(--color-slate-800); color: white; box-shadow: var(--shadow-sm);'
                : 'background-color: var(--color-white); color: var(--color-slate-700); border: 1px solid var(--color-slate-100);';

            diasHtml += `
                <button type="button" data-action="selecionar-data-diario" data-date="${dataIso}"
                        class="interactive-element"
                        style="height: 2.5rem; width: 100%; border-radius: var(--radius-lg); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; font-size: 0.8125rem; font-weight: 700; cursor: pointer; ${bgStyle}"
                        onmouseover="if(!${isSelected}) this.style.backgroundColor='var(--color-slate-50)'"
                        onmouseout="if(!${isSelected}) this.style.backgroundColor='var(--color-white)'">
                    ${dia}
                    ${indicadorHtml}
                </button>
            `;
        }

        return `
            <div class="card" style="padding: var(--spacing-4); display: flex; flex-direction: column; gap: var(--spacing-3);">
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--spacing-3); border-bottom: 1px solid var(--color-slate-100);">
                    <button type="button" data-action="mudar-mes-diario" data-delta="-1" class="btn-icon" style="width: 2rem; height: 2rem;" title="Mês Anterior">
                        <i class="fas fa-chevron-left" style="font-size: 0.75rem;"></i>
                    </button>
                    
                    <div style="display: flex; align-items: center; gap: var(--spacing-2);">
                        <span style="font-size: 0.9375rem; font-weight: 800; color: var(--color-slate-800);">${nomesMeses[mes]} ${ano}</span>
                        <button type="button" data-action="selecionar-data-hoje" 
                                class="badge" style="background-color: var(--color-primary-light); color: var(--color-primary); font-weight: 800; cursor: pointer; border: none;"
                                title="Voltar para Hoje">
                            Hoje
                        </button>
                    </div>

                    <button type="button" data-action="mudar-mes-diario" data-delta="1" class="btn-icon" style="width: 2rem; height: 2rem;" title="Próximo Mês">
                        <i class="fas fa-chevron-right" style="font-size: 0.75rem;"></i>
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.25rem; text-align: center;">
                    <div style="font-size: 0.6875rem; font-weight: 900; color: #ef4444; padding: 0.25rem 0;">D</div>
                    <div style="font-size: 0.6875rem; font-weight: 900; color: var(--color-slate-400); padding: 0.25rem 0;">S</div>
                    <div style="font-size: 0.6875rem; font-weight: 900; color: var(--color-slate-400); padding: 0.25rem 0;">T</div>
                    <div style="font-size: 0.6875rem; font-weight: 900; color: var(--color-slate-400); padding: 0.25rem 0;">Q</div>
                    <div style="font-size: 0.6875rem; font-weight: 900; color: var(--color-slate-400); padding: 0.25rem 0;">Q</div>
                    <div style="font-size: 0.6875rem; font-weight: 900; color: var(--color-slate-400); padding: 0.25rem 0;">S</div>
                    <div style="font-size: 0.6875rem; font-weight: 900; color: var(--color-slate-400); padding: 0.25rem 0;">S</div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.25rem;">
                    ${diasHtml}
                </div>
            </div>
        `;
    },

    selecionarData(novaData) {
        if (!novaData) return;

        // 1. Salva o plano que estava sendo editado na data anterior
        if (window.planejamentoController?.salvarDiario) {
            window.planejamentoController.salvarDiario(true);
        }

        // 2. Atualiza a data ativa
        this.currentDate = novaData;
        const [ano, mes] = novaData.split('-');
        this.viewDate = new Date(parseInt(ano), parseInt(mes) - 1, 1);

        // 3. Atualiza os campos do editor imediatamente com os dados do plano da nova data
        this.preencherCampos();

        // 4. Atualiza o badge de data no cabeçalho do editor e no input oculto
        const [anoF, mesF, diaF] = novaData.split('-');
        const dataFmt = `${diaF}/${mesF}/${anoF}`;
        const inputDataEl = document.getElementById('diario-data');
        if (inputDataEl) {
            inputDataEl.value = novaData;
            const badgeEl = inputDataEl.previousElementSibling;
            if (badgeEl) {
                badgeEl.innerHTML = `<i class="far fa-calendar" style="color: var(--color-primary); margin-right: 0.375rem;"></i> ${dataFmt}`;
            }
        }

        // 5. Atualiza a marcação visual no mini-calendário
        const containerMiniCal = document.getElementById('mini-calendario-container');
        if (containerMiniCal) {
            containerMiniCal.innerHTML = this.gerarMiniCalendario();
        }

        // 6. Atualiza sugestões BNCC do mês e do Período
        const containerSugestoes = document.getElementById('sugestoes-mensal-container');
        if (containerSugestoes) {
            const sugestoes = model.getSugestoesDoMes(this.currentTurmaId, this.currentDate);
            if (sugestoes.length > 0) {
                containerSugestoes.style.display = 'flex';
                containerSugestoes.innerHTML = `
                    <h4 style="font-size: 0.8125rem; font-weight: 800; color: #854d0e; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-lightbulb"></i> Sugestões do Planejamento Mensal
                    </h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${sugestoes.map(h => `
                            <button type="button" data-action="add-habilidade-diario" data-texto="${window.escapeHTML(h.codigo)} - ${window.escapeHTML(h.descricao)}"
                                    class="pill-item" style="font-size: 0.75rem; background-color: white; border: 1px solid #fde047; color: #854d0e;">
                                <i class="fas fa-plus-circle" style="margin-right: 0.25rem;"></i> ${window.escapeHTML(h.codigo)}
                            </button>
                        `).join('')}
                    </div>
                `;
            } else {
                containerSugestoes.style.display = 'none';
                containerSugestoes.innerHTML = '';
            }
        }

        const containerPeriodo = document.getElementById('habilidades-periodo-container');
        if (containerPeriodo) {
            const periodInfo = model.getHabilidadesDoPeriodo ? model.getHabilidadesDoPeriodo(this.currentTurmaId, this.currentDate) : { periodoNum: "1", habilidades: [] };
            if (periodInfo.habilidades && periodInfo.habilidades.length > 0) {
                containerPeriodo.style.display = 'flex';
                containerPeriodo.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <h4 style="font-size: 0.8125rem; font-weight: 800; color: #166534; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-bullseye" style="color: #16a34a;"></i> Habilidades Recomendadas do Período (${periodInfo.periodoNum}º Período)
                        </h4>
                        <span style="font-size: 0.75rem; color: #15803d; font-weight: 700;">${periodInfo.habilidades.length} hab. cadastradas</span>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${periodInfo.habilidades.map(h => `
                            <button type="button" data-action="add-habilidade-diario" data-texto="${window.escapeHTML(h.codigo)} - ${window.escapeHTML(h.descricao)}"
                                    class="pill-item interactive-element" 
                                    style="font-size: 0.75rem; background-color: #ffffff; border: 1px solid #86efac; color: #14532d; font-weight: 700; padding: 0.35rem 0.65rem; border-radius: var(--radius-lg); text-align: left; cursor: pointer;"
                                    title="${window.escapeHTML(h.descricao)}">
                                <i class="fas fa-plus-circle" style="color: #16a34a; margin-right: 0.25rem;"></i>
                                <strong>${window.escapeHTML(h.codigo)}</strong>
                            </button>
                        `).join('')}
                    </div>
                `;
            } else {
                containerPeriodo.style.display = 'none';
                containerPeriodo.innerHTML = '';
            }
        }

        const statusEl = document.getElementById('status-salvamento');
        if (statusEl) statusEl.innerHTML = '';
    },

    selecionarTurma(novoId) {
        if (window.planejamentoController?.salvarDiario) {
            window.planejamentoController.salvarDiario(true);
        }
        this.currentTurmaId = novoId;
        const containerMiniCal = document.getElementById('mini-calendario-container');
        if (containerMiniCal) {
            containerMiniCal.innerHTML = this.gerarMiniCalendario();
        }
        this.preencherCampos();
        const dropdownLabel = document.querySelector('.custom-dropdown .dropdown-label');
        if (dropdownLabel) {
            const turmas = model.state?.turmas || [];
            dropdownLabel.textContent = turmas.find(t => String(t.id) === String(novoId))?.nome || 'Selecionar Turma...';
        }
        this.selecionarData(this.currentDate);
    },

    mudarMes(delta) {
        const novaData = new Date(this.viewDate);
        novaData.setMonth(novaData.getMonth() + delta);
        this.viewDate = novaData;
        const containerMiniCal = document.getElementById('mini-calendario-container');
        if (containerMiniCal) {
            containerMiniCal.innerHTML = this.gerarMiniCalendario();
        } else {
            this.render('view-container');
        }
    },

    renderEditor() {
        const [ano, mes, dia] = this.currentDate.split('-');
        const dataFormatada = `${dia}/${mes}/${ano}`;
        const sugestoes = model.getSugestoesDoMes(this.currentTurmaId, this.currentDate);
        const periodInfo = model.getHabilidadesDoPeriodo ? model.getHabilidadesDoPeriodo(this.currentTurmaId, this.currentDate) : { periodoNum: "1", habilidades: [] };

        return `
            <div class="card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column;">
                
                <!-- EDITOR HEADER -->
                <div style="padding: var(--spacing-4) var(--spacing-6); background-color: var(--color-slate-50); border-bottom: 1px solid var(--color-slate-200); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-3);">
                    <div style="display: flex; align-items: center; gap: var(--spacing-2);">
                        <span class="badge" style="background-color: var(--color-white); color: var(--color-slate-700); font-weight: 800; padding: 0.375rem 0.75rem; border: 1px solid var(--color-slate-200); box-shadow: var(--shadow-sm); font-size: 0.875rem;">
                            <i class="far fa-calendar" style="color: var(--color-primary); margin-right: 0.375rem;"></i> ${dataFormatada}
                        </span>
                        <input type="hidden" id="diario-data" value="${this.currentDate}">
                    </div>

                    <div style="display: flex; align-items: center; gap: var(--spacing-2);">
                        <button type="button" data-action="imprimir-diario" class="btn-secondary" style="padding: 0.5rem 0.875rem; font-size: 0.8125rem;">
                            <i class="fas fa-print"></i> <span>Imprimir</span>
                        </button>
                        <button type="button" data-action="salvar-diario" class="btn-primary" style="padding: 0.5rem 1.25rem; font-size: 0.8125rem;">
                            <i class="fas fa-save"></i> <span>Salvar</span>
                        </button>
                    </div>
                </div>

                <!-- FORM FIELDS -->
                <div style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-5);">
                    <div>
                        <label class="form-label">Tema da Aula</label>
                        <input type="text" id="plan-tema" placeholder="Qual o tema principal desta aula?" 
                                class="autosave-input form-input" style="font-size: 1.125rem; font-weight: 700; color: var(--color-slate-800);">
                    </div>

                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-2);">
                            <label class="form-label" style="margin-bottom: 0;">Habilidades BNCC</label>
                            <button type="button" data-action="open-seletor-bncc-diario" 
                                    class="btn-primary interactive-element" style="padding: 0.375rem 0.75rem; font-size: 0.75rem; border-radius: var(--radius-lg);">
                                <i class="fas fa-search"></i> <span>Consultar BNCC</span>
                            </button>
                        </div>
                        <textarea id="plan-bncc" rows="2" class="autosave-input form-input custom-scrollbar" style="resize: vertical;" placeholder="Códigos e descrições das habilidades trabalhadas..."></textarea>
                    </div>

                    <!-- CARD DE HABILIDADES RECOMENDADAS DO PERÍODO -->
                    <div id="habilidades-periodo-container" style="${periodInfo.habilidades.length > 0 ? 'display: flex;' : 'display: none;'} padding: var(--spacing-4); background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-xl); flex-direction: column; gap: var(--spacing-2);">
                        ${periodInfo.habilidades.length > 0 ? `
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <h4 style="font-size: 0.8125rem; font-weight: 800; color: #166534; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-bullseye" style="color: #16a34a;"></i> Habilidades Recomendadas do Período (${periodInfo.periodoNum}º Período)
                                </h4>
                                <span style="font-size: 0.75rem; color: #15803d; font-weight: 700;">${periodInfo.habilidades.length} hab. cadastradas</span>
                            </div>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                ${periodInfo.habilidades.map(h => `
                                    <button type="button" data-action="add-habilidade-diario" data-texto="${window.escapeHTML(h.codigo)} - ${window.escapeHTML(h.descricao)}"
                                            class="pill-item interactive-element" 
                                            style="font-size: 0.75rem; background-color: #ffffff; border: 1px solid #86efac; color: #14532d; font-weight: 700; padding: 0.35rem 0.65rem; border-radius: var(--radius-lg); text-align: left; cursor: pointer;"
                                            title="${window.escapeHTML(h.descricao)}">
                                        <i class="fas fa-plus-circle" style="color: #16a34a; margin-right: 0.25rem;"></i>
                                        <strong>${window.escapeHTML(h.codigo)}</strong>
                                    </button>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>

                    <!-- CARD DE SUGESTÕES MENSAIS -->
                    <div id="sugestoes-mensal-container" style="${sugestoes.length > 0 ? 'display: flex;' : 'display: none;'} padding: var(--spacing-4); background-color: #fefce8; border: 1px solid #fef08a; border-radius: var(--radius-xl); flex-direction: column; gap: var(--spacing-2);">
                        ${sugestoes.length > 0 ? `
                            <h4 style="font-size: 0.8125rem; font-weight: 800; color: #854d0e; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-lightbulb"></i> Sugestões do Planejamento Mensal
                            </h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                ${sugestoes.map(h => `
                                    <button type="button" data-action="add-habilidade-diario" data-texto="${window.escapeHTML(h.codigo)} - ${window.escapeHTML(h.descricao)}"
                                            class="pill-item" style="font-size: 0.75rem; background-color: white; border: 1px solid #fde047; color: #854d0e;">
                                        <i class="fas fa-plus-circle" style="margin-right: 0.25rem;"></i> ${window.escapeHTML(h.codigo)}
                                    </button>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--spacing-4);">
                        <div>
                            <label class="form-label">Objetivos de Aprendizagem</label>
                            <textarea id="plan-objetivos" rows="3" class="autosave-input form-input custom-scrollbar" style="resize: vertical;" placeholder="O que os estudantes deverão assimilar..."></textarea>
                        </div>
                        <div>
                            <label class="form-label">Metodologia e Dinâmica</label>
                            <textarea id="plan-metodologia" rows="3" class="autosave-input form-input custom-scrollbar" style="resize: vertical;" placeholder="Estratégias de ensino, atividades em grupo..."></textarea>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--spacing-4);">
                        <div>
                            <label class="form-label">Recursos Didáticos</label>
                            <textarea id="plan-recursos" rows="2" class="autosave-input form-input custom-scrollbar" style="resize: vertical;" placeholder="Livro, projetor, materiais de laboratório..."></textarea>
                        </div>
                        <div>
                            <label class="form-label">Avaliação Contínua</label>
                            <textarea id="plan-avaliacao" rows="2" class="autosave-input form-input custom-scrollbar" style="resize: vertical;" placeholder="Instrumentos de verificação e critérios..."></textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    preencherCampos() {
        const plano = model.getPlanoDiario(this.currentDate, this.currentTurmaId) || {};
        const tema = document.getElementById('plan-tema');
        const bncc = document.getElementById('plan-bncc');
        const objetivos = document.getElementById('plan-objetivos');
        const recursos = document.getElementById('plan-recursos');
        const metodologia = document.getElementById('plan-metodologia');
        const avaliacao = document.getElementById('plan-avaliacao');

        if (tema) tema.value = plano.tema || '';
        if (bncc) bncc.value = plano.bncc || '';
        if (objetivos) objetivos.value = plano.objetivos || '';
        if (recursos) recursos.value = plano.recursos || '';
        if (metodologia) metodologia.value = plano.metodologia || '';
        if (avaliacao) avaliacao.value = plano.avaliacao || '';
    },

    adicionarHabilidadeTexto(texto) {
        const bnccEl = document.getElementById('plan-bncc');
        if (bnccEl) {
            const atual = bnccEl.value.trim();
            bnccEl.value = atual ? `${atual}\n${texto}` : texto;
            bnccEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
    },

    imprimirPlano() {
        window.print();
    },

    estadoVazio() {
        return `
            <div class="card" style="padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 2px dashed var(--color-slate-200); max-width: 600px; margin: 2rem auto;">
                <div style="width: 4rem; height: 4rem; border-radius: var(--radius-full); background-color: var(--color-slate-100); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; color: var(--color-slate-400); font-size: 1.5rem;">
                    <i class="fas fa-edit"></i>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.5rem;">Nenhuma turma selecionada</h3>
                <p style="color: var(--color-slate-500); font-size: 0.875rem; margin-bottom: 1.5rem;">Cadastre suas turmas para iniciar o diário de classe.</p>
                <button type="button" data-action="nav-turmas" class="btn-primary">
                    <i class="fas fa-plus"></i> <span>Cadastrar Turmas</span>
                </button>
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