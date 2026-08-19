import { model } from '../model.js';
import { controller } from '../controller.js';
import { planejamentoController } from '../controllers/planejamentoController.js';
import { uiController } from '../controllers/uiController.js';
import { renderKatex, formatarTextoComLatex } from '../utils.js';
import { mensalView } from './mensal.js';
import { diarioView } from './diario.js';

export const planejamentoView = {
    currentTurmaId: null,
    abaAtiva: 'periodo',

    mudarAba(aba) {
        this.abaAtiva = aba;
        this.render('view-container');
    },

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

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

                    <!-- SUBTABS NAVIGATION -->
                    <div style="display: flex; gap: 0.375rem; background-color: var(--color-slate-100); padding: 0.35rem; border-radius: var(--radius-xl);">
                        <button type="button" onclick="planejamentoView.mudarAba('periodo')" class="interactive-element"
                                style="padding: 0.45rem 1rem; font-size: 0.8125rem; font-weight: 800; border-radius: var(--radius-lg); border: none; cursor: pointer; transition: all 0.2s; ${this.abaAtiva === 'periodo' ? 'background-color: #ffffff; color: var(--color-primary); box-shadow: var(--shadow-sm);' : 'background: transparent; color: var(--color-slate-600);'}">
                            <i class="fas fa-layer-group"></i> Por Período
                        </button>
                        <button type="button" onclick="planejamentoView.mudarAba('mensal')" class="interactive-element"
                                style="padding: 0.45rem 1rem; font-size: 0.8125rem; font-weight: 800; border-radius: var(--radius-lg); border: none; cursor: pointer; transition: all 0.2s; ${this.abaAtiva === 'mensal' ? 'background-color: #ffffff; color: var(--color-primary); box-shadow: var(--shadow-sm);' : 'background: transparent; color: var(--color-slate-600);'}">
                            <i class="far fa-calendar-alt"></i> Mensal
                        </button>
                        <button type="button" onclick="planejamentoView.mudarAba('diario')" class="interactive-element"
                                style="padding: 0.45rem 1rem; font-size: 0.8125rem; font-weight: 800; border-radius: var(--radius-lg); border: none; cursor: pointer; transition: all 0.2s; ${this.abaAtiva === 'diario' ? 'background-color: #ffffff; color: var(--color-primary); box-shadow: var(--shadow-sm);' : 'background: transparent; color: var(--color-slate-600);'}">
                            <i class="fas fa-edit"></i> Diário
                        </button>
                    </div>
                </div>

                <div id="subarea-planejamento-content" class="animate-enter"></div>
            </div>
        `;

        container.innerHTML = html;

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
                            <button onclick="planejamentoController.exportarBimestralizacao('${turmaSelecionada.id}')" class="btn-secondary interactive-element" title="Baixar arquivo JSON com a bimestralização desta turma">
                                <i class="fas fa-file-export"></i> <span>Exportar (JSON)</span>
                            </button>

                            <button onclick="planejamentoController.abrirModalImportarBimestralizacao('${turmaSelecionada.id}')" class="btn-secondary interactive-element" title="Importar arquivo JSON de bimestralização">
                                <i class="fas fa-file-import"></i> <span>Importar (JSON)</span>
                            </button>

                            <button onclick="controller.abrirModalCopiarPlanejamento('${turmaSelecionada.id}')" class="btn-secondary interactive-element" title="Copiar planejamento para outra turma">
                                <i class="fas fa-copy"></i> <span>Replicar</span>
                            </button>
                        ` : ''}

                        <div class="custom-dropdown" style="min-width: 240px;">
                            <input type="hidden" id="select-turma-global" onchange="planejamentoView.mudarTurma(this.value)" value="${this.currentTurmaId || ''}">
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
                        <button onclick="controller.openSeletorBncc('${turma.id}', ${i}, '${turma.nivel}', '${turma.serie}')" 
                                class="btn-secondary" style="font-size: 0.75rem; padding: 0.35rem 0.65rem;">
                            <i class="fas fa-search mr-1"></i> Buscar BNCC
                        </button>
                        <button onclick="planejamentoController.openModalCriarHabilidadePersonalizada('${turma.id}', ${i})" 
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
                            <button onclick="controller.openSeletorBncc('${turma.id}', ${i}, '${turma.nivel}', '${turma.serie}')" 
                                    class="btn-icon" style="background-color: var(--color-slate-100); color: var(--color-primary); width: 1.85rem; height: 1.85rem; font-size: 0.75rem;"
                                    title="Adicionar Habilidade da BNCC">
                                <i class="fas fa-search"></i>
                            </button>
                            <button onclick="planejamentoController.openModalCriarHabilidadePersonalizada('${turma.id}', ${i})" 
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
                            <button onclick="planejamentoController.openModalEditarHabilidadePersonalizada('${turmaId}', ${periodoIdx}, '${codigoSafe}')" 
                                    class="btn-action-hab"
                                    style="color: var(--color-slate-400); background: none; border: none; padding: 0.125rem; opacity: 0; transition: opacity var(--transition-fast); cursor: pointer;"
                                    onmouseover="this.style.color='#7c3aed'" onmouseout="this.style.color='var(--color-slate-400)'"
                                    title="Editar Habilidade Personalizada">
                                <i class="fas fa-pencil-alt" style="font-size: 0.75rem;"></i>
                            </button>
                        ` : ''}
                        <button onclick="controller.removeHabilidade('${turmaId}', ${periodoIdx}, '${codigoSafe}')" 
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
                <button onclick="controller.navigate('turmas')" class="btn-primary">
                    <i class="fas fa-plus"></i> <span>Cadastrar Turmas</span>
                </button>
            </div>
        `;
    }
};