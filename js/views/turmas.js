import { model } from '../model.js';
import { controller } from '../controller.js';
import { uiController } from '../controllers/uiController.js';
import { turmaController } from '../controllers/turmaController.js';
import { EventDelegator } from '../utils/eventDelegator.js';
import { salaView } from './sala.js';

export const turmasView = {
    confirmandoExclusao: null,
    periodoAtivo: 1,
    subAbaAtiva: 'notas',
    criterioOrdenacao: 'chamada_asc',
    _cleanupDelegators: null,
    _lastContainer: null,

    mudarPeriodo(turmaId, periodo) {
        this.periodoAtivo = Number(periodo) || 1;
        this.renderDetalhesTurma(this._lastContainer || 'view-container', turmaId);
    },

    mudarOrdenacao(criterio, turmaId) {
        this.criterioOrdenacao = criterio;
        this.renderDetalhesTurma(this._lastContainer || 'view-container', turmaId);
    },

    toggleOrdenacaoColuna(coluna, turmaId) {
        if (coluna === 'nome') {
            this.criterioOrdenacao = this.criterioOrdenacao === 'nome_asc' ? 'nome_desc' : 'nome_asc';
        } else if (coluna === 'chamada') {
            this.criterioOrdenacao = this.criterioOrdenacao === 'chamada_asc' ? 'chamada_desc' : 'chamada_asc';
        } else if (coluna === 'matricula') {
            this.criterioOrdenacao = 'matricula_asc';
        } else if (coluna === 'status') {
            this.criterioOrdenacao = 'status_nome';
        }
        this.renderDetalhesTurma(this._lastContainer || 'view-container', turmaId);
    },
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }

        this.confirmandoExclusao = null;
        const turmas = model.state.turmas || [];

        const html = `
            <div class="view-shell fade-in">
                <div class="view-header animate-enter">
                    <div>
                        <h2 class="view-header__title">
                            <i class="fas fa-chalkboard-teacher" style="color: var(--color-primary);"></i> Minhas Turmas
                        </h2>
                        <p class="view-header__subtitle">Gerencie alunos, notas e avaliações.</p>
                    </div>
                    <button type="button" data-action="open-add-turma" class="btn-primary interactive-element" style="background-color: #4f46e5; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.25);">
                        <i class="fas fa-plus"></i> <span>Nova Turma</span>
                    </button>
                </div>
                ${turmas.length === 0
                ? `<div class="tool-empty-state animate-enter">
                          <div class="tool-empty-state__icon-wrap">
                             <i class="fas fa-users"></i>
                          </div>
                          <h3 class="tool-empty-state__title">Nenhuma turma encontrada</h3>
                          <p class="tool-empty-state__desc">Comece criando sua primeira turma para registrar alunos e notas.</p>
                          <button type="button" data-action="open-add-turma" class="btn-primary interactive-element" style="background-color: #4f46e5;">Criar Turma Agora</button>
                        </div>`
                : `<div class="stat-grid stat-grid--3 animate-enter">
                            ${turmas.map(t => this._renderCardTurma(t)).join('')}
                        </div>`
            }
            </div>
        `;

        container.innerHTML = html;

        this._cleanupDelegators = EventDelegator.bind(container, {
            'open-add-turma': () => controller.openAddTurma(),
            'ver-detalhes-turma': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) this.renderDetalhesTurma(container, id);
            }
        }, 'click');

        const unbindModel = model.on('turmas:changed', () => {
            const c = document.getElementById('view-container');
            if (c && c.querySelector('.stat-grid')) {
                this.render(c);
            }
        });

        const prevCleanup = this._cleanupDelegators;
        this._cleanupDelegators = () => {
            if (typeof prevCleanup === 'function') prevCleanup();
            if (typeof unbindModel === 'function') unbindModel();
        };

        uiController.initAllDropdowns(container);
    },
    _renderCardTurma(turma) {
        const serieNum = turma.serie ? turma.serie.replace(/\D/g, '') : '?';

        return `
            <div data-action="ver-detalhes-turma" data-id="${turma.id}"
                  class="stat-card interactive-element cursor-pointer group relative overflow-hidden">
                <div class="flex justify-between items-start mb-4">
                    <div style="background-color: #eef2ff; color: #4f46e5; width: 3rem; height: 3rem; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 700;">
                        ${serieNum}
                    </div>
                    <div class="text-right">
                        <span class="text-xs-micro font-bold uppercase tracking-wider text-slate-400 block">${window.escapeHTML(turma.nivel)}</span>
                        <span class="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md mt-1 inline-block">${turma.alunos.length} alunos</span>
                    </div>
                </div>
                <h3 class="font-bold text-slate-800 text-lg mb-1 group-hover:text-indigo-600 transition-colors">${window.escapeHTML(turma.nome)}</h3>
                <p class="text-xs text-slate-400 truncate">${window.escapeHTML(turma.serie)} - ${window.escapeHTML(turma.identificador)}</p>
                <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: linear-gradient(to right, #4f46e5, #06b6d4); opacity: 0; transition: opacity 0.2s;" class="group-hover:opacity-100"></div>
            </div>
        `;
    },
    iniciarExclusao(id) {
        this.confirmandoExclusao = id;
        this.renderDetalhesTurma('view-container', id);
    },
    cancelarExclusao(id) {
        this.confirmandoExclusao = null;
        this.renderDetalhesTurma('view-container', id);
    },
    gerarBotaoExcluir(turmaId) {
        if (this.confirmandoExclusao === turmaId) {
            return `
                <div style="display: flex; align-items: center; gap: var(--spacing-2); animation: bounceIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;">
                    <button type="button" data-action="confirmar-exclusao-turma" data-id="${turmaId}" class="btn-primary" style="background-color: #ef4444; box-shadow: var(--shadow-md); display: flex; align-items: center; gap: var(--spacing-2);">
                        <i class="fas fa-exclamation-circle"></i> Confirmar?
                    </button>
                    <button type="button" data-action="cancelar-exclusao-turma" data-id="${turmaId}" class="btn-icon" style="background-color: var(--color-slate-100); color: var(--color-slate-500);" title="Cancelar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }
        return `
            <button type="button" data-action="iniciar-exclusao-turma" data-id="${turmaId}" class="btn-icon" style="background-color: #fef2f2; color: #ef4444;" title="Excluir Turma">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
    },
    renderDetalhesTurma(container, turmaId) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        this._lastContainer = container;

        const turmas = model.state.turmas || [];
        const turma = turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return controller.navigate('turmas');

        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }

        const tipoConfig = (model.state.userConfig && model.state.userConfig.periodType) || 'bimestre';
        const numPeriodos = tipoConfig === 'bimestre' ? 4 : tipoConfig === 'trimestre' ? 3 : 2;
        const avaliacoesFiltradas = (turma.avaliacoes || []).filter(av => Number(av.periodo || 1) === this.periodoAtivo);
        const statsPeriodo = this._calcularEstatisticas(turma, avaliacoesFiltradas);
        const statsGeral = this._calcularEstatisticas(turma, turma.avaliacoes || []);
        const gradientPeriodo = this._gerarGradientDonut(statsPeriodo);
        const gradientGeral = this._gerarGradientDonut(statsGeral);

        const html = `
            <div class="fade-in" style="padding-bottom: 5rem;">
                <!-- CABEÇALHO SUPERIOR DA TURMA -->
                <div style="display: flex; flex-direction: row; gap: var(--spacing-4); justify-content: space-between; align-items: center; margin-bottom: var(--spacing-6); flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: var(--spacing-3);">
                        <button type="button" data-action="nav-turmas" style="color: var(--color-slate-400); font-weight: 700; display: flex; align-items: center; gap: var(--spacing-2); font-size: 0.875rem; background: none; border: none; cursor: pointer; transition: color var(--transition-fast);" onmouseover="this.style.color='var(--color-slate-700)'" onmouseout="this.style.color='var(--color-slate-400)'">
                            <i class="fas fa-arrow-left"></i> Voltar
                        </button>
                        <div class="custom-dropdown" style="min-width: 200px;">
                            <input type="hidden" id="select-turma-detalhe" data-action="select-turma-detalhe-change" value="${turma.id}">
                            <button type="button" class="dropdown-button" style="padding: 0.4rem 0.75rem; font-size: 0.8125rem;">
                                <i class="fas fa-users" style="color: var(--color-primary); margin-right: 0.5rem;"></i>
                                <span class="dropdown-label font-bold">${window.escapeHTML(turma.nome)}</span>
                                <i class="fas fa-chevron-down text-slate-400 text-xs ml-2"></i>
                            </button>
                            <ul class="dropdown-menu hidden custom-scrollbar">
                                ${turmas.map(t => `<li class="dropdown-item ${String(t.id) === String(turma.id) ? 'dropdown-item--selected' : ''}" data-value="${t.id}">${window.escapeHTML(t.nome)}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                    <div style="flex: 1; min-width: 250px;">
                        <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--color-slate-800);"><span style="color: var(--color-primary);">${window.escapeHTML(turma.nome)}</span></h2>
                        <div style="display: flex; gap: var(--spacing-4); font-size: 0.75rem; font-weight: 700; color: var(--color-slate-500); margin-top: 0.25rem;">
                            <span><i class="fas fa-graduation-cap" style="margin-right: 0.25rem;"></i> ${window.escapeHTML(turma.nivel)}</span>
                            <span><i class="fas fa-users" style="margin-right: 0.25rem;"></i> ${turma.alunos.length} Alunos</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: var(--spacing-2); align-items: center; flex-wrap: wrap;">
                         <button type="button" data-action="nav-notas-anuais" class="btn-outline" style="height: 2.5rem; color: #4f46e5; background-color: #eef2ff; border-color: #e0e7ff;" onmouseover="this.style.backgroundColor='#e0e7ff'" onmouseout="this.style.backgroundColor='#eef2ff'">
                            <i class="fas fa-award" style="margin-right: 0.5rem;"></i> Notas Anuais
                        </button>
                        <button type="button" data-action="exportar-turma-tsv" data-id="${turmaId}" class="btn-outline" style="height: 2.5rem;" title="Exportar dados e notas da turma em TSV para importar em outros sistemas">
                            <i class="fas fa-file-export" style="margin-right: 0.5rem;"></i> Exportar Notas (TSV)
                        </button>
                        <button type="button" data-action="replicar-avaliacao" data-id="${turmaId}" class="btn-outline" style="height: 2.5rem;" title="Copiar estrutura de avaliação para outras turmas">
                            <i class="fas fa-copy" style="margin-right: 0.5rem;"></i> Replicar Avaliação
                        </button>
                         <button type="button" data-action="open-add-avaliacao" data-id="${turmaId}" class="btn-outline" style="height: 2.5rem;">
                            <i class="fas fa-file-alt" style="margin-right: 0.5rem;"></i> Nova Avaliação
                        </button>
                        <button type="button" data-action="open-add-aluno-lote" data-id="${turmaId}" class="btn-outline" style="height: 2.5rem;" title="Importar múltiplos estudantes em lote">
                            <i class="fas fa-file-import" style="margin-right: 0.5rem;"></i> Importar em Lote
                        </button>
                        <button type="button" data-action="open-add-aluno" data-id="${turmaId}" class="btn-primary" style="height: 2.5rem;">
                            <i class="fas fa-user-plus" style="margin-right: 0.5rem;"></i> Novo Aluno
                        </button>
                        ${this.gerarBotaoExcluir(turmaId)}
                    </div>
                </div>

                <!-- SUBMENU PERMANENTE NO TOPO: NOTAS POR PERÍODO / MAPA DE SALA -->
                <div class="scrollable-tabs" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; padding: 0.35rem; background-color: var(--color-slate-100); border-radius: var(--radius-2xl); width: fit-content; max-width: 100%; border: 1px solid var(--color-slate-200); overflow-x: auto;">
                    <button type="button" data-action="mudar-subaba-turma" data-subaba="notas" data-id="${turmaId}"
                            class="interactive-element"
                            style="padding: 0.6rem 1.35rem; border-radius: var(--radius-xl); font-size: 0.8125rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.2s ease; cursor: pointer; border: none; white-space: nowrap; ${this.subAbaAtiva === 'notas' ? 'background-color: var(--color-white); color: #4f46e5; box-shadow: var(--shadow-sm);' : 'background-color: transparent; color: var(--color-slate-600);'}">
                        <i class="fas fa-chart-bar"></i> Notas por Período
                    </button>

                    <button type="button" data-action="mudar-subaba-turma" data-subaba="mapa" data-id="${turmaId}"
                            class="interactive-element"
                            style="padding: 0.6rem 1.35rem; border-radius: var(--radius-xl); font-size: 0.8125rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.2s ease; cursor: pointer; border: none; white-space: nowrap; ${this.subAbaAtiva === 'mapa' ? 'background-color: var(--color-white); color: #0284c7; box-shadow: var(--shadow-sm);' : 'background-color: transparent; color: var(--color-slate-600);'}">
                        <i class="fas fa-chair"></i> Mapa de Sala
                    </button>
                </div>

                <!-- ÁREA DE CONTEÚDO DA SUB-ABA -->
                <div id="turma-aba-content" class="fade-in">
                    ${this.subAbaAtiva === 'notas' 
                        ? this._renderConteudoNotas(turma, turmaId, numPeriodos, tipoConfig, statsPeriodo, statsGeral, gradientPeriodo, gradientGeral, avaliacoesFiltradas)
                        : '<div id="turma-mapa-embutido-slot"></div>'
                    }
                </div>
            </div>
        `;

        container.innerHTML = html;
        uiController.initAllDropdowns(container);

        if (this.subAbaAtiva === 'mapa') {
            const mapSlot = document.getElementById('turma-mapa-embutido-slot');
            if (mapSlot && typeof salaView?.render === 'function') {
                salaView.render(mapSlot, turmaId, { embutido: true });
            }
        }

        // Fecha menus de ações ao clicar em qualquer lugar da tela
        document.addEventListener('click', () => {
            document.querySelectorAll('.planner-table-dropdown-menu.active').forEach(m => m.classList.remove('active'));
        }, { once: false });

        const unbindClick = EventDelegator.bind(container, {
            'nav-turmas': () => controller.navigate('turmas'),
            'nav-notas-anuais': () => controller.navigate('notas-anuais'),
            'open-add-turma': () => controller.openAddTurma(),
            'mudar-subaba-turma': (e, target) => {
                const subaba = target.getAttribute('data-subaba');
                const id = target.getAttribute('data-id') || turmaId;
                if (subaba && subaba !== this.subAbaAtiva) {
                    this.subAbaAtiva = subaba;
                    this.renderDetalhesTurma(container, id);
                }
            },
            'exportar-turma-tsv': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) this.exportarNotasTurmaTSV(id);
            },
            'confirmar-exclusao-turma': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) controller.deleteTurma(id);
            },
            'cancelar-exclusao-turma': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) this.cancelarExclusao(id);
            },
            'iniciar-exclusao-turma': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) this.iniciarExclusao(id);
            },
            'ver-mapa-turma': (e, target) => {
                const id = target.getAttribute('data-id') || turmaId;
                this.subAbaAtiva = 'mapa';
                this.renderDetalhesTurma(container, id);
            },
            'replicar-avaliacao': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) turmaController.abrirModalReplicarAvaliacao(id);
            },
            'batch-fill-avaliacao': (e, target) => {
                const turmaId = target.getAttribute('data-turma');
                const avId = target.getAttribute('data-av');
                const avNome = target.getAttribute('data-nome');
                const max = target.getAttribute('data-max');
                if (turmaId && avId) turmaController.openBatchFillNota(turmaId, avId, avNome, max);
            },
            'open-add-avaliacao': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) controller.openAddAvaliacao(id);
            },
            'open-add-aluno': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) controller.openAddAluno(id);
            },
            'toggle-aluno-menu': (e, target) => {
                e.stopPropagation();
                const menu = target.nextElementSibling;
                if (menu) menu.classList.toggle('active');
            },
            'mudar-periodo-turma': (e, target) => {
                const id = target.getAttribute('data-id');
                const p = Number(target.getAttribute('data-periodo'));
                if (id && p) this.mudarPeriodo(id, p);
            },
            'toggle-ordenacao-chamada': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) this.toggleOrdenacaoColuna('chamada', id);
            },
            'toggle-ordenacao-nome': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) this.toggleOrdenacaoColuna('nome', id);
            },
            'delete-avaliacao': (e, target) => {
                const turmaId = target.getAttribute('data-turma');
                const avId = target.getAttribute('data-av');
                if (turmaId && avId) controller.deleteAvaliacao(turmaId, avId);
            },
            'registrar-ocorrencia': (e, target) => {
                const turmaId = target.getAttribute('data-turma');
                const alunoId = target.getAttribute('data-aluno');
                if (turmaId && alunoId) this.abrirModalOcorrencia(turmaId, alunoId);
            },
            'dossie-comportamental': (e, target) => {
                const turmaId = target.getAttribute('data-turma');
                const alunoId = target.getAttribute('data-aluno');
                if (turmaId && alunoId) turmaController.abrirModalDossieComportamental(turmaId, alunoId);
            },
            'ficha-individual': (e, target) => {
                const turmaId = target.getAttribute('data-turma');
                const alunoId = target.getAttribute('data-aluno');
                if (turmaId && alunoId) uiController.gerarDossieAluno(turmaId, alunoId);
            },
            'editar-aluno': (e, target) => {
                const turmaId = target.getAttribute('data-turma');
                const alunoId = target.getAttribute('data-aluno');
                if (turmaId && alunoId) controller.openAddAluno(turmaId, alunoId);
            },
            'delete-aluno': (e, target) => {
                const turmaId = target.getAttribute('data-turma');
                const alunoId = target.getAttribute('data-aluno');
                if (turmaId && alunoId) controller.deleteAluno(turmaId, alunoId);
            },
            'open-add-aluno-lote': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) controller.openAddAlunoLote(id);
            }
        }, 'click');

        const unbindChange = EventDelegator.bind(container, {
            'update-nota-aluno': (e, target) => {
                const turmaId = target.getAttribute('data-turma');
                const alunoId = target.getAttribute('data-aluno');
                const avId = target.getAttribute('data-av');
                if (turmaId && alunoId && avId) {
                    controller.updateNota(turmaId, alunoId, avId, target.value);
                    if (target.value && target.value.includes(',')) {
                        target.value = target.value.replace(',', '.');
                    }
                }
            },
            'select-turma-detalhe-change': (e, target) => {
                this.renderDetalhesTurma('view-container', target.value);
            },
            'mudar-ordenacao-select': (e, target) => {
                const turmaId = target.getAttribute('data-id');
                if (turmaId) this.mudarOrdenacao(target.value, turmaId);
            }
        }, 'change');

        const unbindFocusOut = EventDelegator.bind(container, {
            'update-nota-aluno': (e, target) => {
                if (target.value && target.value.includes(',')) {
                    target.value = target.value.replace(',', '.');
                }
            }
        }, 'focusout');

        const unbindWheel = EventDelegator.bind(container, {
            'update-nota-aluno': (e) => {
                e.preventDefault();
            }
        }, 'wheel', { passive: false });

        const unbindKeydown = EventDelegator.bind(container, {
            'update-nota-aluno': (e, target) => {
                const turmaId = target.getAttribute('data-turma');
                const alunoId = target.getAttribute('data-aluno');
                const avId = target.getAttribute('data-av');

                // --- TECLA ENTER: Navegação Vertical para a mesma avaliação no próximo aluno ---
                if (e.key === 'Enter') {
                    e.preventDefault();

                    // Salva a nota comitada
                    if (turmaId && alunoId && avId) {
                        controller.updateNota(turmaId, alunoId, avId, target.value);
                        if (target.value && target.value.includes(',')) {
                            target.value = target.value.replace(',', '.');
                        }
                    }

                    // Localiza todos os inputs ativos desta mesma coluna de avaliação
                    const colInputs = Array.from(container.querySelectorAll(`input.input-notas[data-av="${avId}"]:not([disabled])`));
                    const idx = colInputs.indexOf(target);

                    if (idx !== -1) {
                        if (e.shiftKey) {
                            // Shift+Enter: foca no aluno anterior na mesma avaliação
                            if (idx > 0) {
                                colInputs[idx - 1].focus();
                                colInputs[idx - 1].select();
                            }
                        } else {
                            // Enter: foca no próximo aluno na mesma avaliação
                            if (idx + 1 < colInputs.length) {
                                colInputs[idx + 1].focus();
                                colInputs[idx + 1].select();
                            }
                        }
                    }
                    return;
                }

                // --- TECLA TAB: Navegação Horizontal sequencial entre avaliações ---
                if (e.key === 'Tab') {
                    const allGradeInputs = Array.from(container.querySelectorAll('input.input-notas:not([disabled])'));
                    const idx = allGradeInputs.indexOf(target);

                    if (idx !== -1) {
                        if (e.shiftKey) {
                            if (idx > 0) {
                                e.preventDefault();
                                if (target.value && target.value.includes(',')) {
                                    target.value = target.value.replace(',', '.');
                                }
                                allGradeInputs[idx - 1].focus();
                                allGradeInputs[idx - 1].select();
                            }
                        } else {
                            if (idx + 1 < allGradeInputs.length) {
                                e.preventDefault();
                                if (target.value && target.value.includes(',')) {
                                    target.value = target.value.replace(',', '.');
                                }
                                allGradeInputs[idx + 1].focus();
                                allGradeInputs[idx + 1].select();
                            }
                        }
                    }
                }
            }
        }, 'keydown');

        this._cleanupDelegators = () => {
            if (typeof unbindClick === 'function') unbindClick();
            if (typeof unbindChange === 'function') unbindChange();
            if (typeof unbindFocusOut === 'function') unbindFocusOut();
            if (typeof unbindWheel === 'function') unbindWheel();
            if (typeof unbindKeydown === 'function') unbindKeydown();
        };

        uiController.initAllDropdowns(container);
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
    mudarPeriodo(turmaId, num) {
        this.periodoAtivo = num;
        this.renderDetalhesTurma('view-container', turmaId);
    },
    _renderConteudoNotas(turma, turmaId, numPeriodos, tipoConfig, statsPeriodo, statsGeral, gradientPeriodo, gradientGeral, avaliacoesFiltradas) {
        return `
            <div class="scrollable-tabs" style="display: flex; align-items: center; gap: var(--spacing-2); margin-bottom: var(--spacing-6); padding: var(--spacing-1); background-color: var(--color-slate-100); border-radius: var(--radius-2xl); width: fit-content; max-width: 100%; border: 1px solid var(--color-slate-200); overflow-x: auto;">
                ${Array.from({ length: numPeriodos }, (_, i) => `
                    <button type="button" data-action="mudar-periodo-turma" data-id="${turmaId}" data-periodo="${i + 1}"
                             style="padding: 0.5rem 1.5rem; border-radius: var(--radius-xl); font-size: 0.75rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; transition: all var(--transition-fast); cursor: pointer; border: none; white-space: nowrap; ${this.periodoAtivo === (i + 1) ? 'background-color: var(--color-white); color: var(--color-primary); box-shadow: var(--shadow-sm);' : 'background-color: transparent; color: var(--color-slate-500);'}"
                             onmouseover="if(${this.periodoAtivo !== (i + 1)}) this.style.color='var(--color-slate-700)'"
                             onmouseout="if(${this.periodoAtivo !== (i + 1)}) this.style.color='var(--color-slate-500)'">
                        ${i + 1}º ${tipoConfig.slice(0, 3)}
                    </button>
                `).join('')}
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--spacing-6); margin-bottom: var(--spacing-8);">
                <!-- ESTATÍSTICA DO PERÍODO -->
                <div class="card" style="padding: var(--spacing-6); position: relative; overflow: hidden;">
                    <h3 style="font-size: 0.875rem; font-weight: 800; color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--spacing-4); border-bottom: 1px solid rgba(var(--color-primary-rgb), 0.1); padding-bottom: var(--spacing-2);">
                        <i class="fas fa-chart-pie" style="margin-right: 0.5rem;"></i> Desempenho: ${this.periodoAtivo}º Período
                    </h3>
                    <div style="display: flex; flex-direction: row; align-items: center; gap: var(--spacing-6); flex-wrap: wrap;">
                        <div style="position: relative; flex-shrink: 0;">
                            <div id="grafico-rosca" class="chart-donut" style="${gradientPeriodo}"></div>
                            <div class="chart-center-text">
                                <span id="media-rosca" style="font-size: 1.75rem; font-weight: 900; color: var(--color-slate-800); line-height: 1;">${statsPeriodo.mediaGeral}</span>
                                <span style="font-size: 0.625rem; font-weight: 800; color: var(--color-slate-400); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.125rem;">Média</span>
                            </div>
                        </div>
                        <div style="flex: 1; width: 100%;">
                            <div id="legenda-rosca" style="display: grid; grid-template-columns: 1fr 1fr; row-gap: var(--spacing-3); column-gap: var(--spacing-4);">
                                ${this._renderLegenda(statsPeriodo)}
                            </div>
                            ${statsPeriodo.distribuicao.vermelho > 0 || statsPeriodo.distribuicao.laranja > 0 ? `
                                <div style="margin-top: var(--spacing-4); background-color: #fff7ed; border: 1px solid #ffedd5; padding: var(--spacing-3); border-radius: var(--radius-xl); display: flex; align-items: flex-start; gap: var(--spacing-3);">
                                    <i class="fas fa-exclamation-triangle" style="color: #f97316; margin-top: 0.125rem;"></i>
                                    <div>
                                        <p style="font-size: 0.75rem; font-weight: 700; color: #c2410c;">Atenção no Período</p>
                                        <p style="font-size: 0.625rem; color: #ea580c; line-height: 1.625;">
                                            Há <strong>${statsPeriodo.distribuicao.vermelho + statsPeriodo.distribuicao.laranja} alunos</strong> abaixo de 5,0.
                                        </p>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <!-- ESTATÍSTICA GERAL -->
                <div class="card" style="padding: var(--spacing-6); position: relative; overflow: hidden;">
                    <h3 style="font-size: 0.875rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--spacing-4); border-bottom: 1px solid var(--color-slate-100); padding-bottom: var(--spacing-2);">
                        <i class="fas fa-globe" style="margin-right: 0.5rem;"></i> Desempenho Geral (Ano Letivo)
                    </h3>
                    <div style="display: flex; flex-direction: row; align-items: center; gap: var(--spacing-6); flex-wrap: wrap;">
                        <div style="position: relative; flex-shrink: 0;">
                            <div id="grafico-rosca-geral" class="chart-donut" style="${gradientGeral}"></div>
                            <div class="chart-center-text">
                                <span id="media-rosca-geral" style="font-size: 1.75rem; font-weight: 900; color: var(--color-slate-800); line-height: 1;">${statsGeral.mediaGeral}</span>
                                <span style="font-size: 0.625rem; font-weight: 800; color: var(--color-slate-400); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.125rem;">Média</span>
                            </div>
                        </div>
                        <div style="flex: 1; width: 100%;">
                            <div id="legenda-rosca-geral" style="display: grid; grid-template-columns: 1fr 1fr; row-gap: var(--spacing-3); column-gap: var(--spacing-4);">
                                ${this._renderLegenda(statsGeral)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div style="background-color: var(--color-white); border-radius: var(--radius-2xl); box-shadow: var(--shadow-sm); border: 1px solid var(--color-slate-200); overflow: hidden;">
                <div style="padding: var(--spacing-4); background-color: var(--color-slate-50); border-bottom: 1px solid var(--color-slate-200); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                    <div>
                        <h3 style="font-weight: 700; color: var(--color-slate-700); font-size: 0.875rem; margin: 0;">Diário de Notas - ${this.periodoAtivo}º Período</h3>
                        <span style="font-size: 0.6875rem; color: var(--color-slate-400); text-transform: uppercase; font-weight: 700; letter-spacing: -0.05em;">Calculado base 10</span>
                    </div>
                    
                    <!-- SELETOR DE ORDENAÇÃO (SORTER) -->
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; gap: 0.25rem;">
                            <i class="fas fa-sort-amount-down"></i> Ordenar:
                        </label>
                        <select data-action="mudar-ordenacao-select" data-id="${turmaId}" class="form-input" style="padding: 0.35rem 0.625rem; font-size: 0.75rem; width: auto; border-radius: var(--radius-lg); background: var(--bg-surface); font-weight: 600;">
                            <option value="chamada_asc" ${this.criterioOrdenacao === 'chamada_asc' ? 'selected' : ''}>Nº Chamada (1, 2, 3...)</option>
                            <option value="chamada_desc" ${this.criterioOrdenacao === 'chamada_desc' ? 'selected' : ''}>Nº Chamada Inverso</option>
                            <option value="nome_asc" ${this.criterioOrdenacao === 'nome_asc' ? 'selected' : ''}>Nome (A - Z)</option>
                            <option value="nome_desc" ${this.criterioOrdenacao === 'nome_desc' ? 'selected' : ''}>Nome (Z - A)</option>
                            <option value="matricula_asc" ${this.criterioOrdenacao === 'matricula_asc' ? 'selected' : ''}>Matrícula / ID</option>
                            <option value="status_nome" ${this.criterioOrdenacao === 'status_nome' ? 'selected' : ''}>Situação + Nome (Ativos 1º)</option>
                        </select>
                    </div>
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; text-align: left; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: rgba(248, 250, 252, 0.5);">
                                <th data-action="toggle-ordenacao-chamada" data-id="${turmaId}" style="padding: var(--spacing-4); font-size: 0.75rem; font-weight: 700; color: var(--color-slate-500); text-transform: uppercase; width: 3.5rem; cursor: pointer;" title="Clique para inverter ordem da chamada">
                                    # <i class="fas fa-sort" style="font-size: 0.625rem; opacity: 0.5;"></i>
                                </th>
                                <th data-action="toggle-ordenacao-nome" data-id="${turmaId}" style="padding: var(--spacing-4); font-size: 0.75rem; font-weight: 700; color: var(--color-slate-500); text-transform: uppercase; min-width: 200px; cursor: pointer;" title="Clique para ordenar alfabeticamente">
                                    Nome do Aluno <i class="fas fa-sort" style="font-size: 0.625rem; opacity: 0.5;"></i>
                                </th>
                                ${avaliacoesFiltradas.map(av => `
                                    <th style="padding: var(--spacing-2); text-align: center; min-width: 110px; position: relative;" class="hover-group">
                                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                            <span style="font-size: 0.625rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 85px;" title="${window.escapeHTML(av.nome)}">${window.escapeHTML(av.nome)}</span>
                                            <div style="display: flex; align-items: center; gap: 0.25rem; margin-top: 0.125rem;">
                                                <span style="font-size: 0.5625rem; color: var(--color-slate-400); background-color: var(--color-slate-100); padding: 0 0.375rem; border-radius: 0.25rem;">${av.periodo || 1}º Per.</span>
                                                <span style="font-size: 0.5625rem; color: var(--color-slate-300);">Max: ${av.max}</span>
                                            </div>
                                            <button type="button" data-action="batch-fill-avaliacao" data-turma="${turmaId}" data-av="${av.id}" data-max="${av.max}" data-nome="${window.escapeHTML(av.nome)}" style="font-size: 0.625rem; font-weight: 700; color: var(--color-primary); background: none; border: none; cursor: pointer; margin-top: 0.25rem; display: inline-flex; align-items: center; gap: 0.25rem; transition: color var(--transition-fast);" title="Preencher nota em lote para estudantes desta avaliação">
                                                <i class="fas fa-fill-drip"></i> Lote
                                            </button>
                                        </div>
                                        <button type="button" data-action="delete-avaliacao" data-turma="${turmaId}" data-av="${av.id}" style="position: absolute; top: 0.25rem; right: 0.25rem; color: var(--color-slate-300); background: none; border: none; cursor: pointer; transition: color var(--transition-fast);" class="hover-show" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='var(--color-slate-300)'" title="Excluir Avaliação">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </th>
                                `).join('')}
                                <th style="padding: var(--spacing-4); font-size: 0.75rem; font-weight: 700; color: var(--color-slate-500); text-transform: uppercase; text-align: center; width: 6rem; background-color: var(--color-slate-50); border-left: 1px solid var(--color-slate-100);">Soma Per.</th>
                                <th style="padding: var(--spacing-4); width: 6rem; text-align: center;">Ações</th>
                            </tr>
                        </thead>
                        <tbody style="border-top: 1px solid var(--color-slate-100);">
                            ${turma.alunos.length === 0
            ? '<tr><td colspan="100%" style="padding: 2rem; text-align: center; color: var(--color-slate-400); font-size: 0.875rem;">Nenhum aluno cadastrado.</td></tr>'
            : (window.ordenarEstudantes ? window.ordenarEstudantes(turma.alunos, this.criterioOrdenacao) : turma.alunos).map((aluno, idx) => {

                const status = aluno.status || 'cursando';
                const chamada = aluno.chamada || (idx + 1);
                const matricula = aluno.matricula || '';
                let statusBadge = '';
                let opacityInputs = '';
                let rowClass = 'hover-row-default';
                if (status === 'transferido') {
                    statusBadge = `<span style="background-color: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; font-size: 0.5625rem; padding: 0 0.5rem; border-radius: 0.25rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.1em; margin-left: 0.5rem;">Transferido</span>`;
                    rowClass = 'hover-row-red';
                    opacityInputs = 'opacity: 0.5; filter: grayscale(1); cursor: not-allowed;';
                } else if (status === 'realocado') {
                    statusBadge = `<span style="background-color: #fffbeb; color: #d97706; border: 1px solid #fef3c7; font-size: 0.5625rem; padding: 0 0.5rem; border-radius: 0.25rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.1em; margin-left: 0.5rem;">Realocado</span>`;
                    rowClass = 'hover-row-amber';
                    opacityInputs = 'opacity: 0.5; filter: grayscale(1); cursor: not-allowed;';
                }
                const somaPeriodo = avaliacoesFiltradas.reduce((acc, av) => acc + (Number(aluno.notas?.[av.id]) || 0), 0);
                const freq = this._calcularFrequencia(aluno);
                const totalDistribuido = avaliacoesFiltradas.reduce((acc, av) => acc + Number(av.max), 0);
                const mediaPerc = totalDistribuido > 0 ? (somaPeriodo / totalDistribuido) * 100 : 100;

                const riscoFrequencia = freq < 75;
                const riscoNota = totalDistribuido > 0 && mediaPerc < 60;

                let alertaHtml = '';
                if ((riscoFrequencia || riscoNota) && status === 'cursando') {
                    const motivos = [];
                    if (riscoFrequencia) motivos.push(`Freq: ${freq.toFixed(0)}%`);
                    if (riscoNota) motivos.push('Nota Baixa');
                    alertaHtml = `<div style="font-size: 0.625rem; font-weight: 700; color: #ef4444; background-color: #fef2f2; padding: 0.25rem 0.5rem; border-radius: 0.25rem; border: 1px solid #fee2e2; margin-top: 0.5rem; width: fit-content; display: flex; align-items: center; gap: 0.25rem;" title="Alerta de Risco Preventivo"><i class="fas fa-exclamation-circle"></i> ${motivos.join(', ')}</div>`;
                }
                return `
                    <tr class="${rowClass}" style="border-bottom: 1px solid var(--color-slate-100);">
                        <td style="padding: var(--spacing-4); font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); text-align: center;">${window.escapeHTML(String(chamada))}</td>
                        <td style="padding: var(--spacing-4);">
                            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.25rem;">
                                <div style="font-weight: 700; font-size: 0.875rem; ${status === 'cursando' ? 'color: var(--color-slate-700);' : 'color: var(--color-slate-500); text-decoration: line-through;'}">${window.escapeHTML((aluno.nome || '').toUpperCase())}</div>
                                ${statusBadge}
                            </div>
                            ${matricula ? `<div style="font-size: 0.625rem; color: var(--color-slate-400); font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 0.25rem;">MAT: ${window.escapeHTML(matricula)}</div>` : ''}
                            ${alertaHtml}
                        </td>
                        
                        ${avaliacoesFiltradas.map(av => {
                            const nota = aluno.notas && aluno.notas[av.id] !== undefined ? aluno.notas[av.id] : '';
                            return `
                                <td style="padding: var(--spacing-2); text-align: center;">
                                    <input type="text" 
                                            inputmode="decimal"
                                            autocomplete="off"
                                            spellcheck="false"
                                            ${status !== 'cursando' ? 'disabled title="Aluno inativo"' : ''}
                                            value="${nota !== '' && nota !== null && nota !== undefined ? String(nota).replace(',', '.') : ''}" 
                                            placeholder="-"
                                            data-action="update-nota-aluno"
                                            data-turma="${turmaId}"
                                            data-aluno="${aluno.id}"
                                            data-av="${av.id}"
                                            class="input-notas" style="width: 4rem; text-align: center; background-color: var(--color-white); border: 1px solid var(--color-slate-200); border-radius: var(--radius-lg); padding: 0.375rem 0; font-size: 0.8875rem; font-weight: 700; color: var(--color-slate-700); transition: all var(--transition-fast); outline: none; ${opacityInputs}">
                                </td>
                            `;
                        }).join('')}
                        
                        <!-- SOMA DO PERÍODO FIXADA E DISPONÍVEL O TEMPO TODO -->
                        <td style="padding: var(--spacing-2); text-align: center; border-left: 1px solid var(--color-slate-100); background-color: rgba(248, 250, 252, 0.5);">
                            <div id="soma-${aluno.id}" style="width: 3.5rem; margin: 0 auto; padding: 0.25rem 0; border-radius: var(--radius-lg); font-weight: 900; font-size: 0.875rem; transition: all 0.3s; ${status === 'cursando' ? 'color: var(--color-primary);' : 'color: var(--color-slate-400);'}">
                                ${somaPeriodo.toFixed(1)}
                            </div>
                        </td>

                        <!-- MENU DROPDOWN DE AÇÕES DO ALUNO -->
                        <td style="padding: var(--spacing-2); text-align: center;">
                            <div class="planner-table-dropdown">
                                <button type="button" data-action="toggle-aluno-menu" class="btn-secondary" style="padding: 0.25rem 0.55rem; font-size: 0.75rem; font-weight: 700; border-radius: 0.5rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                                    <i class="fas fa-ellipsis-h"></i> Ações
                                </button>
                                <div class="planner-table-dropdown-menu">
                                    <button type="button" data-action="registrar-ocorrencia" data-turma="${turmaId}" data-aluno="${aluno.id}" class="planner-table-dropdown-item"><i class="fas fa-exclamation-triangle" style="color: #f59e0b; width: 1rem;"></i> Ocorrência</button>
                                    <button type="button" data-action="dossie-comportamental" data-turma="${turmaId}" data-aluno="${aluno.id}" class="planner-table-dropdown-item"><i class="fas fa-stream" style="color: #8b5cf6; width: 1rem;"></i> Dossiê</button>
                                    <button type="button" data-action="ficha-individual" data-turma="${turmaId}" data-aluno="${aluno.id}" class="planner-table-dropdown-item"><i class="fas fa-file-invoice" style="color: #10b981; width: 1rem;"></i> Ficha Individual</button>
                                    <div style="height: 1px; background: #e2e8f0; margin: 0.25rem 0;"></div>
                                    <button type="button" data-action="editar-aluno" data-turma="${turmaId}" data-aluno="${aluno.id}" class="planner-table-dropdown-item"><i class="fas fa-edit" style="color: #3b82f6; width: 1rem;"></i> Editar Aluno</button>
                                    <button type="button" data-action="delete-aluno" data-turma="${turmaId}" data-aluno="${aluno.id}" class="planner-table-dropdown-item text-danger"><i class="fas fa-trash-alt" style="color: #ef4444; width: 1rem;"></i> Excluir Aluno</button>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('')
        }
                        </tbody>
                    </table>
                </div>
                <div style="padding: var(--spacing-4); background-color: var(--color-slate-50); border-top: 1px solid var(--color-slate-200); display: flex; justify-content: flex-end;">
                     <button type="button" data-action="open-add-aluno-lote" data-id="${turmaId}" style="font-size: 0.75rem; font-weight: 700; color: var(--color-primary); background: none; border: none; cursor: pointer; transition: color var(--transition-fast);" onmouseover="this.style.color='#1d4ed8'" onmouseout="this.style.color='var(--color-primary)'">
                        <i class="fas fa-file-import" style="margin-right: 0.25rem;"></i> Importar Lista
                     </button>
                </div>
            </div>
        `;
    },

    _calcularMediaAluno(aluno, avaliacoes) {
        if (!aluno.notas || avaliacoes.length === 0) return null;
        let totalPontos = 0;
        let totalMax = 0;
        let temNota = false;

        avaliacoes.forEach(av => {
            if (aluno.notas[av.id] !== undefined && aluno.notas[av.id] !== "") {
                totalPontos += parseFloat(aluno.notas[av.id]);
                totalMax += parseFloat(av.max);
                temNota = true;
            }
        });

        if (!temNota || totalMax === 0) return null;
        return (totalPontos / totalMax) * 10;
    },
    _calcularEstatisticas(turma, avaliacoesParaCalcular) {
        let stats = {
            totalAlunos: 0,
            mediaGeral: '-',
            distribuicao: { vermelho: 0, laranja: 0, azul: 0, ciano: 0, verde: 0 }
        };

        if (!turma.alunos || turma.alunos.length === 0 || !avaliacoesParaCalcular || avaliacoesParaCalcular.length === 0) return stats;

        let somaMedias = 0;
        let alunosComNota = 0;

        turma.alunos.forEach(aluno => {
            if (aluno.status === 'transferido') return;
            const media = this._calcularMediaAluno(aluno, avaliacoesParaCalcular);
            if (media !== null) {
                alunosComNota++;
                somaMedias += media;

                if (media < 3) stats.distribuicao.vermelho++;
                else if (media < 5) stats.distribuicao.laranja++;
                else if (media < 7) stats.distribuicao.azul++;
                else if (media < 9) stats.distribuicao.ciano++;
                else stats.distribuicao.verde++;
            }
        });

        stats.totalAlunos = alunosComNota;
        if (alunosComNota > 0) {
            stats.mediaGeral = (somaMedias / alunosComNota).toFixed(1);
        }

        return stats;
    },
    _gerarGradientDonut(stats) {
        let gradientParts = [];
        let currentPerc = 0;
        const cores = [
            { id: 'vermelho', cor: '#ef4444' },
            { id: 'laranja', cor: '#f97316' },
            { id: 'azul', cor: '#3b82f6' },
            { id: 'ciano', cor: '#06b6d4' },
            { id: 'verde', cor: '#10b981' }
        ];

        cores.forEach(c => {
            const count = stats.distribuicao ? (stats.distribuicao[c.id] || 0) : 0;
            const perc = stats.totalAlunos > 0 ? (count / stats.totalAlunos) * 100 : 0;
            if (perc > 0) {
                const start = currentPerc.toFixed(1);
                const end = (currentPerc + perc).toFixed(1);
                gradientParts.push(`${c.cor} ${start}% ${end}%`);
                currentPerc += perc;
            }
        });

        return gradientParts.length > 0
            ? `background: conic-gradient(${gradientParts.join(', ')});`
            : 'background: conic-gradient(#e2e8f0 0% 100%);';
    },
    _renderLegenda(stats) {
        const cores = [
            { id: 'vermelho', cor: '#ef4444', label: '1 - 2,99' },
            { id: 'laranja', cor: '#f97316', label: '3 - 4,99' },
            { id: 'azul', cor: '#3b82f6', label: '5 - 6,99' },
            { id: 'ciano', cor: '#06b6d4', label: '7 - 8,99' },
            { id: 'verde', cor: '#10b981', label: '9 - 10' }
        ];
        return cores.map(c => {
            const count = stats.distribuicao[c.id];
            const perc = stats.totalAlunos > 0 ? Math.round((count / stats.totalAlunos) * 100) : 0;
            const opacityStyle = count === 0 ? 'opacity: 0.4; filter: grayscale(1);' : '';
            return `
                <div style="display: flex; align-items: center; gap: var(--spacing-3); ${opacityStyle}">
                    <div style="width: 0.75rem; height: 0.75rem; border-radius: 50%; flex-shrink: 0; box-shadow: var(--shadow-sm); background-color: ${c.cor}"></div>
                    <div>
                        <p style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-700);">${c.label}</p>
                        <p style="font-size: 0.625rem; color: var(--color-slate-400); font-weight: 500;">${count} alunos (${perc}%)</p>
                    </div>
                </div>
            `;
        }).join('');
    },
    _calcularFrequencia(aluno) {
        if (!aluno.frequencia) return 100;

        const registros = Object.values(aluno.frequencia);
        const presencas = registros.filter(s => s === 'P').length;
        const faltas = registros.filter(s => s === 'F').length;
        const totalAulas = presencas + faltas;

        if (totalAulas === 0) return 100;
        return (presencas / totalAulas) * 100;
    },
    renderBoletimAnual(turmaId) {
        const turma = model.state.turmas.find(t => t.id == turmaId);
        if (!turma) return "";
        const tipo = model.state.userConfig.periodType || 'bimestre';
        const colunas = tipo === 'bimestre' ? 4 : tipo === 'trimestre' ? 3 : 2;
        return `
        <table style="width: 100%; font-size: 0.875rem; text-align: left; border: 1px solid var(--color-slate-100); border-collapse: collapse;">
            <thead style="background-color: var(--color-slate-50); color: var(--color-slate-500); text-transform: uppercase; font-size: 0.625rem; font-weight: 700;">
                <tr>
                    <th style="padding: var(--spacing-4);">Aluno</th>
                    ${Array.from({ length: colunas }, (_, i) => `<th style="padding: var(--spacing-4); text-align: center;">${i + 1}º</th>`).join('')}
                    <th style="padding: var(--spacing-4); text-align: center; color: var(--color-primary);">Média</th>
                </tr>
            </thead>
            <tbody>
                ${turma.alunos.map(aluno => {
            const resumo = model.getResumoAcademico(turma.id, aluno.id, turma, aluno);
            if (!resumo) return "";
            return `
                        <tr style="border-bottom: 1px solid var(--color-slate-100); transition: background-color var(--transition-fast);" onmouseover="this.style.backgroundColor='var(--color-slate-50)'" onmouseout="this.style.backgroundColor='transparent'">
                            <td style="padding: var(--spacing-4); font-weight: 500; color: var(--color-slate-700);">${window.escapeHTML(aluno.nome)}</td>
                            ${Array.from({ length: colunas }, (_, i) => {
                const nota = resumo.periodos[i + 1] || 0;
                return `<td style="padding: var(--spacing-4); text-align: center; color: ${nota < 6 ? '#ef4444' : 'var(--color-slate-600)'}">${nota.toFixed(1)}</td>`;
            }).join('')}
                            <td style="padding: var(--spacing-4); text-align: center; font-weight: 700; color: var(--color-primary);">${resumo.mediaAnual.toFixed(1)}</td>
                        </tr>
                    `;
        }).join('')}
            </tbody>
        </table>
    `;
    },

    // =========================================================================
    // REGISTRO DE OCORRÊNCIA ESCOLAR E NOTIFICAÇÃO FAMILIAR (A4)
    // =========================================================================

    abrirModalOcorrencia(turmaId, alunoId) {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        const aluno = (turma.alunos || []).find(a => String(a.id) === String(alunoId));
        if (!aluno) return;

        const modalHtml = `
            <div id="modal-ocorrencia" class="modal-overlay modal-enter" style="display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); align-items: center; justify-content: space-between; z-index: 9999;">
                <div class="card p-6" style="max-width: 520px; width: 90%; margin: auto; background: var(--color-white); border-radius: var(--radius-2xl); box-shadow: var(--shadow-2xl); border: 1px solid var(--color-slate-200);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i> Registro de Ocorrência Escolar
                        </h3>
                        <button type="button" data-action="fechar-modal-ocorrencia" class="btn-icon" style="border: none; background: none; cursor: pointer; color: var(--color-slate-400);">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <p style="font-size: 0.875rem; color: var(--color-slate-600); margin-bottom: 1rem;">
                        Estudante: <strong>${window.escapeHTML(aluno.nome)}</strong> — Turma <strong>${window.escapeHTML(turma.nome)}</strong>
                    </p>

                    <form id="form-ocorrencia">
                        <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
                            <div>
                                <label class="form-label" style="font-weight: 700;">Tipo de Ocorrência</label>
                                <select id="oc-tipo" class="form-select" style="font-weight: 600;">
                                    <option value="indisciplina">Indisciplina em Sala de Aula</option>
                                    <option value="material">Falta de Material / Dever de Casa</option>
                                    <option value="conflito">Conflito ou Agressão Verbal/Física</option>
                                    <option value="celular">Uso Indevido de Aparelho Eletrônico</option>
                                    <option value="positivo">Elogio / Destaque Pedagógico Positivo</option>
                                </select>
                            </div>

                            <div>
                                <label class="form-label" style="font-weight: 700;">Descrição dos Fatos</label>
                                <textarea id="oc-desc" class="form-input" rows="3" required placeholder="Descreva detalhadamente o ocorrido em sala..."></textarea>
                            </div>

                            <div>
                                <label class="form-label" style="font-weight: 700;">Providência / Encaminhamento Adotado</label>
                                <input type="text" id="oc-providencia" class="form-input" required placeholder="Ex: Advertência Verbal, Convocação dos Responsáveis..." />
                            </div>
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                            <button type="button" data-action="fechar-modal-ocorrencia" class="btn-secondary">Cancelar</button>
                            <button type="button" data-action="submeter-ocorrencia" class="btn-primary">
                                <i class="fas fa-save"></i> Salvar & Imprimir Termo A4
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modalEl = document.getElementById('modal-ocorrencia');
        if (modalEl) {
            EventDelegator.bind(modalEl, {
                'fechar-modal-ocorrencia': () => modalEl.remove(),
                'submeter-ocorrencia': () => {
                    this.salvarOcorrencia(turmaId, alunoId);
                    modalEl.remove();
                }
            }, 'click');
        }
    },

    salvarOcorrencia(turmaId, alunoId) {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        const aluno = (turma.alunos || []).find(a => String(a.id) === String(alunoId));
        if (!aluno) return;

        const tipoSelect = document.getElementById('oc-tipo');
        const descInput = document.getElementById('oc-desc');
        const provInput = document.getElementById('oc-providencia');

        const tipoVal = tipoSelect ? tipoSelect.value : 'indisciplina';
        const descVal = descInput ? descInput.value.trim() : '';
        const provVal = provInput ? provInput.value.trim() : '';

        if (!descVal) return Toast.show("Descreva o ocorrido.", "warning");

        if (!Array.isArray(aluno.dossie)) aluno.dossie = [];

        const novaOcorrencia = {
            id: Date.now(),
            tipo: tipoVal,
            descricao: descVal,
            providencia: provVal,
            data: new Date().toLocaleDateString('pt-BR')
        };

        aluno.dossie.push(novaOcorrencia);
        model.saveTurma(turma);

        const modal = document.getElementById('modal-ocorrencia');
        if (modal) modal.remove();

        Toast.show("Ocorrência registrada com sucesso!", "success");
        this.gerarTermoOcorrenciaA4(turma, aluno, novaOcorrencia);
    },

    gerarTermoOcorrenciaA4(turma, aluno, ocorrencia) {
        const config = model.state.userConfig || {};
        const escola = config.school || config.escola || 'Unidade Escolar';
        const anoLetivo = config.anoLetivo || new Date().getFullYear();

        const printWindow = window.open('', '_blank');
        if (!printWindow) return Toast.show("Permita pop-ups para visualizar o termo.", "warning");

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Termo de Ocorrência Escolar — ${window.escapeHTML(aluno.nome)}</title>
                <style>
                    @page { size: A4 portrait; margin: 12mm; }
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 0; }
                    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 16px; }
                    .header h2 { margin: 0; font-size: 1.1rem; text-transform: uppercase; }
                    .header p { margin: 2px 0 0 0; font-size: 0.8rem; color: #475569; }
                    .title-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; text-align: center; font-weight: 800; font-size: 0.9rem; text-transform: uppercase; margin-bottom: 16px; color: #1e293b; }
                    .section { margin-bottom: 16px; }
                    .section-title { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px; color: #1e293b; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem; }
                    .field { background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 4px; }
                    .field label { font-size: 0.65rem; font-weight: 800; color: #64748b; text-transform: uppercase; display: block; }
                    .field span { font-weight: 700; color: #0f172a; }
                    .content-box { border: 1px solid #cbd5e1; padding: 10px; border-radius: 4px; font-size: 0.8rem; color: #334155; line-height: 1.5; min-height: 80px; }
                    .assinaturas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 50px; text-align: center; font-size: 0.75rem; }
                    .linha-ass { border-top: 1px solid #0f172a; padding-top: 4px; font-weight: 700; }
                    .footer { font-size: 0.65rem; color: #94a3b8; margin-top: 30px; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>${window.escapeHTML(escola)}</h2>
                    <p>Ano Letivo: ${anoLetivo} &nbsp;|&nbsp; Registro Oficial de Acompanhamento Comportamental</p>
                </div>

                <div class="title-box">
                    TERMO DE OCORRÊNCIA ESCOLAR E NOTIFICAÇÃO FAMILIAR
                </div>

                <div class="section">
                    <div class="section-title">1. Dados do Estudante</div>
                    <div class="grid">
                        <div class="field"><label>Estudante</label><span>${window.escapeHTML(aluno.nome)}</span></div>
                        <div class="field"><label>Turma</label><span>${window.escapeHTML(turma.nome)}</span></div>
                        <div class="field"><label>Data da Ocorrência</label><span>${ocorrencia.data}</span></div>
                        <div class="field"><label>Tipo de Ocorrência</label><span>${ocorrencia.tipo.toUpperCase()}</span></div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">2. Relato dos Fatos Registrados pelo Docente</div>
                    <div class="content-box">
                        ${window.escapeHTML(ocorrencia.descricao)}
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">3. Providência Adotada / Encaminhamento</div>
                    <div class="content-box">
                        ${window.escapeHTML(ocorrencia.providencia)}
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">4. Termo de Ciente do Responsável</div>
                    <p style="font-size: 0.75rem; color: #475569; margin: 0;">
                        Declaramos que fomos devidamente informados a respeito do ocorrido acima registrado e assumimos o compromisso de orientar o estudante para o cumprimento das normas regimentais da escola.
                    </p>
                </div>

                <div class="assinaturas">
                    <div><div class="linha-ass">Professor(a) Titular</div></div>
                    <div><div class="linha-ass">Orientação / Coordenação</div></div>
                    <div><div class="linha-ass">Pai / Mãe / Responsável</div></div>
                </div>

                <div class="footer">
                    Documento emitido via Planner Pro Docente em ${new Date().toLocaleDateString('pt-BR')}
                </div>

                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    /**
     * Exporta a planilha de notas e alunos da turma no formato tabular (TSV/CSV com tabulação).
     * Estrutura: 'Número\t Nome\t Ava 1\t Ava 2\t ... \t Soma\t Média'
     * Compatível com Excel, Google Planilhas e importação de sistemas de gestão escolar.
     * @param {string} turmaId 
     * @param {number} [periodo] 
     */
    exportarNotasTurmaTSV(turmaId, periodo) {
        const turma = model.state.turmas.find(t => t.id === turmaId);
        if (!turma) {
            Toast.show("Turma não encontrada para exportação.", "error");
            return;
        }

        const per = Number(periodo || this.periodoAtivo || 1);
        const avaliacoesFiltradas = (turma.avaliacoes || []).filter(av => Number(av.periodo || 1) === per);
        const alunos = window.ordenarEstudantes ? window.ordenarEstudantes(turma.alunos, this.criterioOrdenacao) : turma.alunos;

        // Cabeçalho da Planilha: Número \t Nome \t [Avaliações...] \t Soma \t Média
        const cabecalho = ['Número', 'Nome', ...avaliacoesFiltradas.map(av => `${av.nome} (Max ${av.max})`), 'Soma', 'Média'];
        const linhas = [cabecalho.join('\t')];

        alunos.forEach((aluno, idx) => {
            const chamada = aluno.chamada || (idx + 1);
            const nome = (aluno.nome || '').toUpperCase();
            const notas = avaliacoesFiltradas.map(av => {
                const n = aluno.notas?.[av.id];
                return n !== undefined && n !== '' ? String(n).replace('.', ',') : '';
            });
            const somaPeriodo = avaliacoesFiltradas.reduce((acc, av) => acc + (Number(aluno.notas?.[av.id]) || 0), 0);
            const totalDistribuido = avaliacoesFiltradas.reduce((acc, av) => acc + Number(av.max), 0);
            const media = totalDistribuido > 0 ? ((somaPeriodo / totalDistribuido) * 10).toFixed(1).replace('.', ',') : '10,0';

            linhas.push([
                chamada,
                nome,
                ...notas,
                somaPeriodo.toFixed(1).replace('.', ','),
                media
            ].join('\t'));
        });

        const tsvTexto = linhas.join('\r\n');
        const blob = new Blob(['\ufeff' + tsvTexto], { type: 'text/tab-separated-values;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const nomeTurmaSanitizado = (turma.nome || 'turma')
            .replace(/[\/\\:\*\?"<>\|]/g, '_')
            .replace(/\s+/g, '_');
        a.download = `Notas_${nomeTurmaSanitizado}_${per}Periodo.tsv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Copia também para o Clipboard para colagem direta rápida no Excel/Google Sheets
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(tsvTexto).catch(() => {});
        }

        Toast.show("Planilha exportada e copiada para a área de transferência!", "success");
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
    window.turmasView = turmasView;
}
