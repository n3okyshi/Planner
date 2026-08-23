import { model } from '../model.js';
import { controller } from '../controller.js';
import { planejamentoController } from '../controllers/planejamentoController.js';
import { uiController } from '../controllers/uiController.js';
import { renderKatex, formatarTextoComLatex } from '../utils.js';
import { mensalView } from './mensal.js';
import { diarioView } from './diario.js';
import { EventDelegator } from '../utils/eventDelegator.js';

export const planejamentoView = {
    currentTurmaId: null,
    abaAtiva: 'periodo',
    _cleanupDelegators: null,

    mudarAba(aba) {
        this.abaAtiva = aba;
        if (window.controller) {
            window.controller.currentView = aba === 'diario' ? 'dia' : aba;
            if (window.uiController && typeof window.uiController.updateActiveNav === 'function') {
                window.uiController.updateActiveNav(window.controller.currentView);
            }
            if (window.uiController && typeof window.uiController.updateBreadcrumb === 'function') {
                window.uiController.updateBreadcrumb(window.controller.currentView);
            }
        }
        this.render('view-container', aba);
    },

    render(container, forceAba = null) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) container = document.getElementById('view-container');
        if (!container) return;

        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }

        if (forceAba) {
            this.abaAtiva = forceAba;
        } else if (window.controller && window.controller.currentView) {
            const v = window.controller.currentView;
            if (v === 'mensal') this.abaAtiva = 'mensal';
            else if (v === 'dia' || v === 'diario') this.abaAtiva = 'diario';
            else if (v === 'periodo' || v === 'planejamento') this.abaAtiva = 'periodo';
        }

        const html = `
            <div class="animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8);">
                
                <!-- UNIFIED PLANNING TOP BAR WITH SUBTABS -->
                <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em; display: flex; align-items: center; gap: var(--spacing-2); margin: 0;">
                            <i class="far fa-calendar-alt" style="color: var(--color-primary);"></i> Planejamento Pedagógico
                        </h2>
                        <p style="font-size: 0.875rem; color: var(--color-slate-500); margin-top: 0.25rem;">Gerencie o planejamento por período letivo, registros mensais e diário de classe.</p>
                    </div>

                    <!-- SUBTABS NAVIGATION & 5ES BUTTON -->
                    <div style="display: flex; items-center; gap: 0.75rem; flex-wrap: wrap;">
                        <button type="button" onclick="planejamentoView.abrirModal5Es()" class="btn-primary" style="padding: 0.45rem 1rem; font-size: 0.8125rem; font-weight: 800;">
                            <i class="fas fa-magic"></i> <span>Gerar Plano 5Es (IA)</span>
                        </button>
                        <div style="display: flex; gap: 0.375rem; background-color: var(--color-slate-100); padding: 0.35rem; border-radius: var(--radius-xl);">
                            <button type="button" data-action="mudar-aba-planejamento" data-aba="periodo" class="interactive-element"
                                    style="padding: 0.45rem 1rem; font-size: 0.8125rem; font-weight: 800; border-radius: var(--radius-lg); border: none; cursor: pointer; transition: all 0.2s; ${this.abaAtiva === 'periodo' ? 'background-color: #ffffff; color: var(--color-primary); box-shadow: var(--shadow-sm);' : 'background: transparent; color: var(--color-slate-600);'}">
                                <i class="fas fa-layer-group"></i> Por Período
                            </button>
                            <button type="button" data-action="mudar-aba-planejamento" data-aba="mensal" class="interactive-element"
                                    style="padding: 0.45rem 1rem; font-size: 0.8125rem; font-weight: 800; border-radius: var(--radius-lg); border: none; cursor: pointer; transition: all 0.2s; ${this.abaAtiva === 'mensal' ? 'background-color: #ffffff; color: var(--color-primary); box-shadow: var(--shadow-sm);' : 'background: transparent; color: var(--color-slate-600);'}">
                                <i class="far fa-calendar-alt"></i> Mensal
                            </button>
                            <button type="button" data-action="mudar-aba-planejamento" data-aba="diario" class="interactive-element"
                                    style="padding: 0.45rem 1rem; font-size: 0.8125rem; font-weight: 800; border-radius: var(--radius-lg); border: none; cursor: pointer; transition: all 0.2s; ${this.abaAtiva === 'diario' ? 'background-color: #ffffff; color: var(--color-primary); box-shadow: var(--shadow-sm);' : 'background: transparent; color: var(--color-slate-600);'}">
                                <i class="fas fa-edit"></i> Diário
                            </button>
                        </div>
                    </div>
                </div>

                <div id="subarea-planejamento-content" class="animate-enter"></div>
            </div>
        `;

        container.innerHTML = html;

        this._cleanupDelegators = EventDelegator.bind(container, {
            'mudar-aba-planejamento': (e, target) => {
                const aba = target.getAttribute('data-aba');
                if (aba) this.mudarAba(aba);
            }
        }, 'click');

        const subarea = document.getElementById('subarea-planejamento-content');
        if (!subarea) return;

        if (this.abaAtiva === 'mensal') {
            if (mensalView && typeof mensalView.render === 'function') {
                mensalView.render(subarea);
            }
        } else if (this.abaAtiva === 'diario') {
            if (diarioView && typeof diarioView.render === 'function') {
                diarioView.render(subarea);
            }
        } else {
            this.renderPorPeriodo(subarea);
        }
    },

    renderPorPeriodo(container) {
        const turmas = (model.state && model.state.turmas) ? model.state.turmas : [];
        const tipoPeriodo = (model.state?.userConfig?.periodType) || 'bimestre';

        if (this.currentTurmaId && !turmas.find(t => String(t.id) === String(this.currentTurmaId))) {
            this.currentTurmaId = null;
        }
        if (!this.currentTurmaId && turmas.length > 0) {
            this.currentTurmaId = turmas[0].id;
        }

        const configPeriodos = {
            'bimestre': { qtd: 4, label: 'Bimestre' },
            'trimestre': { qtd: 3, label: 'Trimestre' },
            'semestre': { qtd: 2, label: 'Semestre' }
        };
        const config = configPeriodos[tipoPeriodo] || configPeriodos['bimestre'];
        const turmaSelecionada = turmas.find(t => String(t.id) === String(this.currentTurmaId));

        const htmlPeriodo = `
            <div style="display: flex; flex-direction: column; gap: var(--spacing-6);">
                <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div style="display: flex; align-items: center; gap: var(--spacing-3); flex-wrap: wrap;">
                        ${turmaSelecionada ? `
                            <button type="button" data-action="exportar-bimestralizacao" data-id="${turmaSelecionada.id}" class="btn-secondary interactive-element" title="Baixar arquivo JSON com a bimestralização desta turma">
                                <i class="fas fa-file-export"></i> <span>Exportar (JSON)</span>
                            </button>

                            <button type="button" data-action="importar-bimestralizacao" data-id="${turmaSelecionada.id}" class="btn-secondary interactive-element" title="Importar arquivo JSON de bimestralização">
                                <i class="fas fa-file-import"></i> <span>Importar (JSON)</span>
                            </button>

                            <button type="button" data-action="copiar-planejamento" data-id="${turmaSelecionada.id}" class="btn-secondary interactive-element" title="Copiar planejamento para outra turma">
                                <i class="fas fa-copy"></i> <span>Replicar</span>
                            </button>
                        ` : ''}

                        <div class="custom-dropdown" style="min-width: 240px;">
                            <input type="hidden" id="select-turma-global" data-action="mudar-turma-planejamento-change" value="${this.currentTurmaId || ''}">
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
                    </div>
                </div>

                <div>
                    ${turmas.length > 0 && turmaSelecionada
                        ? this.gerarCardTurma(turmaSelecionada, config)
                        : this.estadoVazio()
                    }
                </div>
            </div>
        `;

        container.innerHTML = htmlPeriodo;

        const unbindClick = EventDelegator.bind(container, {
            'exportar-bimestralizacao': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) planejamentoController.exportarBimestralizacao(id);
            },
            'importar-bimestralizacao': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) planejamentoController.abrirModalImportarBimestralizacao(id);
            },
            'copiar-planejamento': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) controller.abrirModalCopiarPlanejamento(id);
            },
            'open-seletor-bncc': (e, target) => {
                const id = target.getAttribute('data-id');
                const periodo = Number(target.getAttribute('data-periodo'));
                const nivel = target.getAttribute('data-nivel');
                const serie = target.getAttribute('data-serie');
                if (id && periodo) controller.openSeletorBncc(id, periodo, nivel, serie);
            },
            'criar-habilidade-personalizada': (e, target) => {
                const id = target.getAttribute('data-id');
                const periodo = Number(target.getAttribute('data-periodo'));
                if (id && periodo) planejamentoController.openModalCriarHabilidadePersonalizada(id, periodo);
            },
            'editar-habilidade-personalizada': (e, target) => {
                const id = target.getAttribute('data-id');
                const periodo = Number(target.getAttribute('data-periodo'));
                const codigo = target.getAttribute('data-codigo');
                if (id && periodo && codigo) planejamentoController.openModalEditarHabilidadePersonalizada(id, periodo, codigo);
            },
            'remove-habilidade': (e, target) => {
                const id = target.getAttribute('data-id');
                const periodo = Number(target.getAttribute('data-periodo'));
                const codigo = target.getAttribute('data-codigo');
                if (id && periodo && codigo) controller.removeHabilidade(id, periodo, codigo);
            },
            'nav-turmas': () => controller.navigate('turmas')
        }, 'click');

        const unbindChange = EventDelegator.bind(container, {
            'mudar-turma-planejamento-change': (e, target) => {
                this.mudarTurma(target.value);
            }
        }, 'change');

        const prevCleanup = this._cleanupDelegators;
        this._cleanupDelegators = () => {
            if (typeof prevCleanup === 'function') prevCleanup();
            if (typeof unbindClick === 'function') unbindClick();
            if (typeof unbindChange === 'function') unbindChange();
        };

        uiController.initAllDropdowns(container);
        renderKatex(container);
    },

    mudarTurma(id) {
        this.currentTurmaId = id;
        this.render('view-container');
    },

    gerarCardTurma(turma, config) {
        const plan = turma.planejamento || {};
        let colunasHtml = '';

        for (let i = 1; i <= config.qtd; i++) {
            const habilidades = plan[i] ? [...plan[i]] : [];
            const isVazio = habilidades.length === 0;

            habilidades.sort((a, b) => {
                const codA = String(a.codigo || "");
                const codB = String(b.codigo || "");
                return codA.localeCompare(codB, undefined, { numeric: true });
            });

            const btnAdicionarVazio = `
                <div style="width: 100%; min-height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; color: var(--color-slate-400); border: 2px dashed var(--color-slate-200); border-radius: var(--radius-xl); padding: 1.5rem; background-color: var(--color-white);">
                    <i class="fas fa-layer-group" style="font-size: 2rem; color: var(--color-slate-300);"></i>
                    <span style="font-size: 0.8125rem; font-weight: 700;">Nenhuma habilidade cadastrada</span>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;">
                        <button type="button" data-action="open-seletor-bncc" data-id="${turma.id}" data-periodo="${i}" data-nivel="${turma.nivel}" data-serie="${turma.serie}"
                                class="btn-secondary" style="font-size: 0.75rem; padding: 0.35rem 0.65rem;">
                            <i class="fas fa-search mr-1"></i> Buscar BNCC
                        </button>
                        <button type="button" data-action="criar-habilidade-personalizada" data-id="${turma.id}" data-periodo="${i}"
                                class="btn-primary" style="font-size: 0.75rem; padding: 0.35rem 0.65rem; background-color: #7c3aed;">
                            <i class="fas fa-plus mr-1"></i> Própria / Municipal
                        </button>
                    </div>
                </div>
            `;

            colunasHtml += `
                <div class="card" style="display: flex; flex-direction: column; height: 600px; padding: 0; overflow: hidden; background-color: var(--color-slate-50);">
                    
                    <!-- COLUMN HEADER -->
                    <div style="padding: var(--spacing-4); border-bottom: 1px solid var(--color-slate-200); background-color: var(--color-white); display: flex; justify-content: space-between; align-items: center; z-index: 10;">
                        <div style="display: flex; align-items: center; gap: var(--spacing-2);">
                            <div style="width: 1.75rem; height: 1.75rem; border-radius: var(--radius-full); background-color: var(--color-primary-light); color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;">
                                ${i}º
                            </div>
                            <span style="font-size: 0.875rem; font-weight: 800; color: var(--color-slate-700); text-transform: uppercase; letter-spacing: 0.05em;">
                                ${config.label}
                            </span>
                        </div>

                        <div style="display: flex; align-items: center; gap: 0.375rem;">
                            ${!isVazio ? `<span class="badge" style="background-color: var(--color-primary-light); color: var(--color-primary); font-weight: 800;">${habilidades.length} hab.</span>` : ''}
                            <button type="button" data-action="open-seletor-bncc" data-id="${turma.id}" data-periodo="${i}" data-nivel="${turma.nivel}" data-serie="${turma.serie}" 
                                    class="btn-icon" style="background-color: var(--color-slate-100); color: var(--color-primary); width: 1.85rem; height: 1.85rem; font-size: 0.75rem;"
                                    title="Adicionar Habilidade da BNCC">
                                <i class="fas fa-search"></i>
                            </button>
                            <button type="button" data-action="criar-habilidade-personalizada" data-id="${turma.id}" data-periodo="${i}" 
                                    class="btn-icon" style="background-color: #f3e8ff; color: #7c3aed; width: 1.85rem; height: 1.85rem; font-size: 0.75rem;"
                                    title="Adicionar Habilidade Personalizada / Própria">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>

                    <!-- HABILIDADES LIST -->
                    <div class="custom-scrollbar" style="padding: var(--spacing-3); flex: 1; display: flex; flex-direction: column; gap: var(--spacing-3); overflow-y: auto;">
                        ${!isVazio
                            ? habilidades.map(h => this.gerarMiniCardHabilidade(h, turma.id, i)).join('')
                            : btnAdicionarVazio
                        }
                    </div>
                </div>
            `;
        }

        return `
            <div style="display: flex; flex-direction: column; gap: var(--spacing-4);">
                <div style="display: flex; align-items: center; gap: var(--spacing-2); flex-wrap: wrap;">
                    <span class="badge" style="background-color: var(--color-slate-200); color: var(--color-slate-700); font-weight: 700;">
                        <i class="fas fa-layer-group" style="margin-right: 0.25rem;"></i> ${window.escapeHTML(turma.nivel)}
                    </span>
                    <span class="badge" style="background-color: var(--color-slate-200); color: var(--color-slate-700); font-weight: 700;">
                        <i class="fas fa-graduation-cap" style="margin-right: 0.25rem;"></i> ${window.escapeHTML(turma.serie)}
                    </span>
                    <span style="font-size: 0.75rem; color: var(--color-slate-400); margin-left: auto;">
                        <i class="fas fa-info-circle text-primary"></i> As habilidades configuradas aqui são sugeridas automaticamente no planejamento mensal e diário.
                    </span>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--spacing-6);">
                    ${colunasHtml}
                </div>
            </div>
        `;
    },

    gerarMiniCardHabilidade(habilidade, turmaId, periodoIdx) {
        const codigoSafe = window.escapeHTML ? window.escapeHTML(habilidade.codigo) : habilidade.codigo;
        const descSafe = window.escapeHTML ? window.escapeHTML(habilidade.descricao) : habilidade.descricao;
        const isPersonalizada = habilidade.tipo === 'personalizada';
        const eixo = habilidade.objeto || habilidade.eixo || habilidade.unidadeTematica || habilidade.componente || (isPersonalizada ? "Matriz Própria" : "BNCC");
        const subtitulo = window.escapeHTML ? window.escapeHTML(eixo) : "Habilidade";
        const cor = isPersonalizada ? "#7c3aed" : (habilidade.cor || (model.coresComponentes ? model.coresComponentes[habilidade.componente] : "#2563eb") || "#2563eb");

        return `
            <div class="card" style="padding: var(--spacing-3); border-left: 4px solid ${cor}; display: flex; flex-direction: column; gap: 0.375rem; position: relative; transition: all var(--transition-fast);" 
                 title="${descSafe}"
                 onmouseover="this.style.boxShadow='var(--shadow-md)'; this.style.transform='translateY(-2px)'; this.querySelectorAll('.btn-action-hab').forEach(b => b.style.opacity='1');"
                 onmouseout="this.style.boxShadow='var(--shadow-sm)'; this.style.transform='translateY(0)'; this.querySelectorAll('.btn-action-hab').forEach(b => b.style.opacity='0');">
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                        <span style="font-size: 0.625rem; font-weight: 900; color: white; padding: 0.125rem 0.375rem; border-radius: var(--radius-sm); text-transform: uppercase; letter-spacing: 0.05em; background-color: ${cor}; box-shadow: var(--shadow-sm);">
                            ${codigoSafe}
                        </span>
                        ${isPersonalizada ? `
                            <span style="font-size: 0.5625rem; font-weight: 800; background-color: #f3e8ff; color: #7c3aed; border: 1px solid #e9d5ff; padding: 0.05rem 0.25rem; border-radius: var(--radius-sm);">
                                Própria
                            </span>
                        ` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.25rem;">
                        ${isPersonalizada ? `
                            <button type="button" data-action="editar-habilidade-personalizada" data-id="${turmaId}" data-periodo="${periodoIdx}" data-codigo="${codigoSafe}"
                                    class="btn-action-hab"
                                    style="color: var(--color-slate-400); background: none; border: none; padding: 0.125rem; opacity: 0; transition: opacity var(--transition-fast); cursor: pointer;"
                                    onmouseover="this.style.color='#7c3aed'" onmouseout="this.style.color='var(--color-slate-400)'"
                                    title="Editar Habilidade Personalizada">
                                <i class="fas fa-pencil-alt" style="font-size: 0.75rem;"></i>
                            </button>
                        ` : ''}
                        <button type="button" data-action="remove-habilidade" data-id="${turmaId}" data-periodo="${periodoIdx}" data-codigo="${codigoSafe}"
                                class="btn-action-hab"
                                style="color: var(--color-slate-300); background: none; border: none; padding: 0.125rem; opacity: 0; transition: opacity var(--transition-fast); cursor: pointer;"
                                onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='var(--color-slate-300)'"
                                title="Remover Habilidade">
                            <i class="fas fa-trash-alt" style="font-size: 0.75rem;"></i>
                        </button>
                    </div>
                </div>

                <p style="font-size: 0.625rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase; letter-spacing: 0.025em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${subtitulo}
                </p>
                <p style="font-size: 0.75rem; color: var(--color-slate-700); font-weight: 500; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                    ${formatarTextoComLatex(descSafe)}
                </p>
            </div>
        `;
    },

    estadoVazio() {
        return `
            <div class="card" style="padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 2px dashed var(--color-slate-200); max-width: 600px; margin: 2rem auto 0;">
                <div style="width: 4rem; height: 4rem; border-radius: var(--radius-full); background-color: var(--color-slate-100); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; color: var(--color-slate-400); font-size: 1.5rem;">
                    <i class="fas fa-chalkboard-teacher"></i>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.5rem;">Comece por aqui</h3>
                <p style="color: var(--color-slate-500); font-size: 0.875rem; margin-bottom: 1.5rem; max-width: 380px;">Cadastre suas turmas na aba "Turmas" para estruturar seu planejamento pedagógico.</p>
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
    },

    // =========================================================================
    // GERADOR IA DE PLANO DE AULA (MODELO 5ES - METODOLOGIA ATIVA)
    // =========================================================================

    abrirModal5Es() {
        const modalHtml = `
            <div id="modal-5es" class="modal-overlay modal-enter" style="display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 9999;">
                <div class="card p-6" style="max-width: 580px; width: 92%; background: var(--color-white); border-radius: var(--radius-2xl); box-shadow: var(--shadow-2xl); border: 1px solid var(--color-slate-200);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-magic" style="color: var(--color-primary);"></i> Gerador IA de Plano de Aula (Modelo 5Es)
                        </h3>
                        <button type="button" onclick="document.getElementById('modal-5es').remove()" class="btn-icon" style="border: none; background: none; cursor: pointer; color: var(--color-slate-400);">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <p style="font-size: 0.875rem; color: var(--color-slate-600); margin-bottom: 1rem;">
                        Crie um plano de aula completo em segundos utilizando a metodologia ativa internacional dos 5Es (Engajar, Explorar, Explicar, Elaborar, Avaliar).
                    </p>

                    <form id="form-5es" onsubmit="event.preventDefault(); planejamentoView.gerarPlano5EsIA();">
                        <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div>
                                    <label class="form-label" style="font-weight: 700;">Disciplina</label>
                                    <input type="text" id="5es-disciplina" class="form-input" required placeholder="Ex: História, Matemática" />
                                </div>
                                <div>
                                    <label class="form-label" style="font-weight: 700;">Ano / Série</label>
                                    <input type="text" id="5es-serie" class="form-input" required placeholder="Ex: 6º Ano, 1º Ano EM" />
                                </div>
                            </div>

                            <div>
                                <label class="form-label" style="font-weight: 700;">Tema Principal da Aula</label>
                                <input type="text" id="5es-tema" class="form-input" required placeholder="Ex: Fotossíntese e Ecossistema, Revolução Francesa" />
                            </div>

                            <div>
                                <label class="form-label" style="font-weight: 700;">Habilidade BNCC (Opcional)</label>
                                <input type="text" id="5es-habilidade" class="form-input" placeholder="Ex: EF06CI05" />
                            </div>
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                            <button type="button" onclick="document.getElementById('modal-5es').remove()" class="btn-secondary">Cancelar</button>
                            <button type="submit" id="btn-submit-5es" class="btn-primary">
                                <i class="fas fa-sparkles"></i> Gerar Plano com IA
                            </button>
                        </div>
                    </form>

                    <div id="resultado-5es" style="margin-top: 1.5rem; display: none;"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    async gerarPlano5EsIA() {
        const btn = document.getElementById('btn-submit-5es');
        const resContainer = document.getElementById('resultado-5es');
        const disc = document.getElementById('5es-disciplina')?.value.trim();
        const serie = document.getElementById('5es-serie')?.value.trim();
        const tema = document.getElementById('5es-tema')?.value.trim();
        const hab = document.getElementById('5es-habilidade')?.value.trim();

        if (!disc || !serie || !tema) return Toast.show("Preencha disciplina, série e tema.", "warning");

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando com IA...';
        }

        try {
            const rawRes = await aiService.gerarPlanoAula5Es({ disciplina: disc, anoSerie: serie, tema, habilidadeBNCC: hab });
            let plano = null;
            try {
                plano = typeof rawRes === 'string' ? JSON.parse(rawRes.replace(/```json|```/g, '').trim()) : rawRes;
            } catch (e) {
                plano = { titulo: tema, habilidade: hab, engajar: rawRes };
            }

            if (resContainer && plano) {
                resContainer.style.display = 'block';
                resContainer.innerHTML = `
                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: var(--radius-xl); padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
                        <h4 style="font-size: 1rem; font-weight: 800; color: #1e1b4b; margin: 0;">${window.escapeHTML(plano.titulo || tema)}</h4>
                        <p style="font-size: 0.75rem; color: #4338ca; font-weight: 700; margin: 0;">BNCC: ${window.escapeHTML(plano.habilidade || hab || 'Geral')}</p>
                        
                        <div style="font-size: 0.8125rem; color: #334155; line-height: 1.5; display: flex; flex-direction: column; gap: 0.5rem; max-height: 250px; overflow-y: auto;">
                            <div><strong>1. Engajar:</strong> ${window.escapeHTML(plano.engajar || '')}</div>
                            <div><strong>2. Explorar:</strong> ${window.escapeHTML(plano.explorar || '')}</div>
                            <div><strong>3. Explicar:</strong> ${window.escapeHTML(plano.explicar || '')}</div>
                            <div><strong>4. Elaborar:</strong> ${window.escapeHTML(plano.elaborar || '')}</div>
                            <div><strong>5. Avaliar:</strong> ${window.escapeHTML(plano.avaliar || '')}</div>
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem;">
                            <button type="button" onclick="planejamentoView.imprimirPlano5EsA4(${JSON.stringify(plano).replace(/"/g, '&quot;')})" class="btn-secondary" style="font-size: 0.75rem;">
                                <i class="fas fa-print"></i> Imprimir A4
                            </button>
                        </div>
                    </div>
                `;
            }
        } catch (err) {
            Toast.show("Erro ao gerar plano com IA: " + err.message, "danger");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sparkles"></i> Gerar Plano com IA';
            }
        }
    },

    imprimirPlano5EsA4(plano) {
        const config = model.state.userConfig || {};
        const escola = config.school || config.escola || 'Unidade Escolar';
        const printWindow = window.open('', '_blank');
        if (!printWindow) return Toast.show("Permita pop-ups para visualizar a impressão.", "warning");

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Plano de Aula 5Es — ${window.escapeHTML(plano.titulo || 'Plano de Aula')}</title>
                <style>
                    @page { size: A4 portrait; margin: 12mm; }
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 0; }
                    .header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
                    .header h2 { margin: 0; font-size: 1.1rem; text-transform: uppercase; }
                    .title-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-bottom: 16px; }
                    .title-box h3 { margin: 0 0 4px 0; font-size: 1rem; color: #1e1b4b; }
                    .title-box p { margin: 0; font-size: 0.75rem; color: #4338ca; font-weight: 700; }
                    .step { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-bottom: 10px; font-size: 0.8rem; line-height: 1.5; }
                    .step-title { font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
                    .footer { font-size: 0.7rem; color: #64748b; margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 6px; text-align: center; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h2>${window.escapeHTML(escola)} — PLANO DE AULA (METODOLOGIA ATIVA 5ES)</h2>
                    </div>
                    <div style="font-size: 0.75rem; color: #64748b;">
                        Data: ${new Date().toLocaleDateString('pt-BR')}
                    </div>
                </div>

                <div class="title-box">
                    <h3>${window.escapeHTML(plano.titulo || 'Plano de Aula')}</h3>
                    <p>Habilidade BNCC: ${window.escapeHTML(plano.habilidade || 'Alinhada à BNCC')}</p>
                </div>

                <div class="step"><div class="step-title">1. Engajar (Sensibilização & Gancho Inicial)</div>${window.escapeHTML(plano.engajar || '')}</div>
                <div class="step"><div class="step-title">2. Explorar (Investigação & Desafio Prático)</div>${window.escapeHTML(plano.explorar || '')}</div>
                <div class="step"><div class="step-title">3. Explicar (Mediação & Síntese de Conceitos)</div>${window.escapeHTML(plano.explicar || '')}</div>
                <div class="step"><div class="step-title">4. Elaborar (Aplicação Prática em Novo Contexto)</div>${window.escapeHTML(plano.elaborar || '')}</div>
                <div class="step"><div class="step-title">5. Avaliar (Avaliação Formativa & Autoavaliação)</div>${window.escapeHTML(plano.avaliar || '')}</div>

                <div class="footer">
                    Plano emitido via Planner Pro Docente
                </div>

                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
};