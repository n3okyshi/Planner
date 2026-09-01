// js/views/sala.js
/**
 * ==========================================================================
 * MAPA DE SALA INTERATIVO (SALA VIEW)
 * Padrão: Vanilla MVC, ES Modules, Event Delegation (data-action), DocumentFragment.
 * ==========================================================================
 */

import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';
import { uiController } from '../controllers/uiController.js';
import { turmaController } from '../controllers/turmaController.js';
import { EventDelegator } from '../utils/eventDelegator.js';
import { secureShuffle } from '../utils.js';

export const salaView = {
    alunoSelecionadoParaMover: null,
    currentTurmaId: null,
    arrastandoPosicao: null,
    _cleanupDelegators: null,

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
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

        const turmaAtual = turmas.find(t => String(t.id) === String(this.currentTurmaId));
        const linhas = turmaAtual?.mapaConfig?.linhas || 6;
        const colunas = turmaAtual?.mapaConfig?.colunas || 6;
        const isVisaoCalor = !!turmaAtual?.mapaConfig?.visaoCalor;

        const html = `
            <div class="animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8);">
                
                <!-- TOP HEADER & TOOLBAR -->
                <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em; display: flex; align-items: center; gap: var(--spacing-2);">
                            <i class="fas fa-chair" style="color: var(--color-primary);"></i> Mapa de Sala Interativo
                        </h2>
                        <p style="font-size: 0.875rem; color: var(--color-slate-500);">Arraste e solte carteiras, dimensione a disposição da sala e visualize o calor comportamental.</p>
                    </div>

                    <div style="display: flex; align-items: center; gap: var(--spacing-3); flex-wrap: wrap;">
                        <!-- Controles de Grid (Linhas e Colunas) -->
                        <div style="display: flex; align-items: center; gap: 0.25rem; background: var(--color-slate-100); padding: 0.25rem 0.5rem; border-radius: var(--radius-xl); border: 1px solid var(--color-slate-200);">
                            <span style="font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase; margin-right: 0.25rem;">Grid (${linhas}x${colunas}):</span>
                            <button type="button" data-action="ajustar-grid" data-linhas="0" data-colunas="1" class="btn-icon" style="width: 1.75rem; height: 1.75rem; font-size: 0.75rem;" title="Adicionar Coluna">
                                <i class="fas fa-plus"></i> <span style="font-size: 0.625rem; margin-left: 2px;">Col</span>
                            </button>
                            <button type="button" data-action="ajustar-grid" data-linhas="0" data-colunas="-1" class="btn-icon" style="width: 1.75rem; height: 1.75rem; font-size: 0.75rem;" title="Remover Coluna">
                                <i class="fas fa-minus"></i> <span style="font-size: 0.625rem; margin-left: 2px;">Col</span>
                            </button>
                            <div style="width: 1px; height: 1.25rem; background-color: var(--color-slate-300); margin: 0 0.25rem;"></div>
                            <button type="button" data-action="ajustar-grid" data-linhas="1" data-colunas="0" class="btn-icon" style="width: 1.75rem; height: 1.75rem; font-size: 0.75rem;" title="Adicionar Linha">
                                <i class="fas fa-plus"></i> <span style="font-size: 0.625rem; margin-left: 2px;">Lin</span>
                            </button>
                            <button type="button" data-action="ajustar-grid" data-linhas="-1" data-colunas="0" class="btn-icon" style="width: 1.75rem; height: 1.75rem; font-size: 0.75rem;" title="Remover Linha">
                                <i class="fas fa-minus"></i> <span style="font-size: 0.625rem; margin-left: 2px;">Lin</span>
                            </button>
                        </div>

                        <!-- Botão Visão de Calor (Heatmap) -->
                        <button type="button" data-action="toggle-visao-calor" class="btn-secondary interactive-element ${isVisaoCalor ? 'btn-primary' : ''}" 
                                style="${isVisaoCalor ? 'background: linear-gradient(135deg, #ef4444, #f59e0b); border: none; color: white;' : ''}" 
                                title="Alternar Mapa de Calor Comportamental">
                            <i class="fas fa-fire"></i> <span>Visão de Calor ${isVisaoCalor ? '(Ativa)' : ''}</span>
                        </button>

                        <button type="button" data-action="embaralhar-mapa" class="btn-secondary interactive-element" title="Sortear assentos aleatoriamente">
                            <i class="fas fa-random"></i> <span>Embaralhar</span>
                        </button>
                        
                        <button type="button" data-action="imprimir-mapa" class="btn-secondary interactive-element" title="Imprimir Mapa">
                            <i class="fas fa-print"></i> <span>Imprimir</span>
                        </button>

                        <div class="custom-dropdown" style="min-width: 220px;">
                            <input type="hidden" id="map-select-turma" data-action="carregar-mapa-change" value="${this.currentTurmaId || ''}">
                            <button type="button" class="dropdown-button">
                                <i class="fas fa-users" style="color: var(--color-slate-400); margin-right: var(--spacing-2);"></i>
                                <span class="dropdown-label">${turmaAtual?.nome || 'Selecionar Turma...'}</span>
                                <i class="fas fa-chevron-down" style="color: var(--color-slate-400); font-size: 0.75rem; margin-left: auto;"></i>
                            </button>
                            <ul class="dropdown-menu hidden custom-scrollbar">
                                ${turmas.length > 0
                                    ? turmas.map(t => `<li class="dropdown-item ${String(t.id) === String(this.currentTurmaId) ? 'dropdown-item--selected' : ''}" data-value="${t.id}">${window.escapeHTML(t.nome)}</li>`).join('')
                                    : '<li class="p-3 text-slate-400 text-sm text-center">Nenhuma turma</li>'
                                }
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- CLASSROOM MAP CONTAINER -->
                <div class="card" style="padding: var(--spacing-6); background-color: var(--color-slate-100); border: 1px solid var(--color-slate-200); display: flex; flex-direction: column; align-items: center; min-height: 600px;">
                    
                    <!-- QUADRO / MESA DO PROFESSOR -->
                    <div style="width: 100%; max-width: 580px; height: 3rem; background-color: var(--color-white); border-radius: var(--radius-xl); box-shadow: var(--shadow-sm); margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase; letter-spacing: 0.1em; border: 1px solid var(--color-slate-200);">
                        <i class="fas fa-chalkboard" style="margin-right: 0.5rem; color: var(--color-primary);"></i> Quadro / Mesa do Professor
                    </div>

                    ${isVisaoCalor ? `
                        <!-- BARRA DE LEGENDA DO MAPA DE CALOR -->
                        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; justify-content: center; background: white; padding: 0.5rem 1.25rem; border-radius: var(--radius-full); margin-bottom: 1.5rem; border: 1px solid var(--color-slate-200); box-shadow: var(--shadow-sm); font-size: 0.75rem; font-weight: 700;">
                            <span style="color: var(--color-slate-500);"><i class="fas fa-info-circle text-indigo-500"></i> Legenda do Heatmap:</span>
                            <span style="display: flex; align-items: center; gap: 0.35rem; color: #15803d;">
                                <span style="width: 0.75rem; height: 0.75rem; border-radius: 50%; background-color: #22c55e;"></span> Alta Participação / Elogios
                            </span>
                            <span style="display: flex; align-items: center; gap: 0.35rem; color: #b91c1c;">
                                <span style="width: 0.75rem; height: 0.75rem; border-radius: 50%; background-color: #ef4444;"></span> Alerta de Indisciplina
                            </span>
                            <span style="display: flex; align-items: center; gap: 0.35rem; color: #6b21a8;">
                                <span style="width: 0.75rem; height: 0.75rem; border-radius: 50%; background-color: #a855f7;"></span> Encaminhamentos / Família
                            </span>
                        </div>
                    ` : ''}

                    <!-- DYNAMIC DESKS GRID -->
                    <div id="room-grid" style="display: grid; grid-template-columns: repeat(${colunas}, minmax(0, 1fr)); gap: 0.75rem; width: 100%; max-width: ${Math.max(700, colunas * 130)}px;">
                        <div style="grid-column: 1 / -1; padding: 4rem 0; text-align: center; color: var(--color-slate-400);">
                            <i class="fas fa-chair" style="font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                            <p>Carregando mapa da sala...</p>
                        </div>
                    </div>

                    <div style="margin-top: 1.5rem; text-align: center; font-size: 0.75rem; color: var(--color-slate-500); font-weight: 600;">
                        <i class="fas fa-mouse-pointer" style="color: var(--color-primary); margin-right: 0.25rem;"></i> <strong>Dica:</strong> Arraste e solte carteiras para reorganizar ou clique em duas carteiras para trocar.
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        const unbindClick = EventDelegator.bind(container, {
            'ajustar-grid': (e, target) => {
                const lin = Number(target.getAttribute('data-linhas') || 0);
                const col = Number(target.getAttribute('data-colunas') || 0);
                this.ajustarGrid(lin, col);
            },
            'toggle-visao-calor': () => this.toggleVisaoCalor(),
            'embaralhar-mapa': () => this.embaralhar(),
            'imprimir-mapa': () => this.imprimir(),
            'clicar-assento': (e, target) => {
                const pos = Number(target.getAttribute('data-posicao'));
                if (!isNaN(pos)) this.clicarAssento(pos);
            },
            'ajustar-xp': (e, target) => {
                e.stopPropagation();
                const tId = target.getAttribute('data-turma');
                const aId = target.getAttribute('data-aluno');
                const delta = Number(target.getAttribute('data-delta') || 10);
                if (tId && aId) this.ajustarXP(tId, aId, delta);
            }
        }, 'click');

        const unbindChange = EventDelegator.bind(container, {
            'carregar-mapa-change': (e, target) => {
                this.carregarMapa(target.value);
            }
        }, 'change');

        this._cleanupDelegators = () => {
            if (typeof unbindClick === 'function') unbindClick();
            if (typeof unbindChange === 'function') unbindChange();
        };

        uiController.initAllDropdowns(container);

        if (this.currentTurmaId) {
            this.carregarMapa(this.currentTurmaId);
        } else {
            const grid = document.getElementById('room-grid');
            if (grid) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; padding: 4rem 0; text-align: center; color: var(--color-slate-400);">
                        <i class="fas fa-chair" style="font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                        <p>Cadastre ou selecione uma turma para organizar o mapa.</p>
                    </div>
                `;
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
    },

    carregarMapa(turmaId) {
        if (!turmaId) return;
        this.currentTurmaId = turmaId;

        const grid = document.getElementById('room-grid');
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma || !grid) return;

        const linhas = turma.mapaConfig?.linhas || 6;
        const colunas = turma.mapaConfig?.colunas || 6;
        const totalAssentos = linhas * colunas;
        const isVisaoCalor = !!turma.mapaConfig?.visaoCalor;

        grid.style.gridTemplateColumns = `repeat(${colunas}, minmax(0, 1fr))`;
        grid.style.maxWidth = `${Math.max(700, colunas * 130)}px`;

        const fragment = document.createDocumentFragment();

        for (let i = 1; i <= totalAssentos; i++) {
            const aluno = (turma.alunos || []).find(a => a.posicao === i && (a.status === 'cursando' || (!a.status && a.status !== 'transferido' && a.status !== 'realocado' && a.status !== 'evadido')));
            const isSelecionado = this.alunoSelecionadoParaMover === i;

            let borderStyle = 'border: 2px dashed var(--color-slate-300); background-color: var(--color-slate-50);';
            let calorBadge = '';

            if (isSelecionado) {
                borderStyle = 'border: 2px solid var(--color-primary); background-color: var(--color-primary-light); box-shadow: var(--shadow-md); transform: scale(1.04);';
            } else if (aluno) {
                if (isVisaoCalor) {
                    const dossie = Array.isArray(aluno.dossie) ? aluno.dossie : [];
                    const countPositivo = dossie.filter(d => d.tipo === 'positivo').length;
                    const countIndisciplina = dossie.filter(d => d.tipo === 'indisciplina').length;
                    const countCoordenacao = dossie.filter(d => d.tipo === 'coordenacao' || d.tipo === 'familia').length;

                    if (countIndisciplina > 0 && countIndisciplina >= countPositivo) {
                        borderStyle = 'border: 2px solid #ef4444; background: linear-gradient(135deg, #fef2f2, #fee2e2); box-shadow: 0 0 12px rgba(239, 68, 68, 0.25);';
                        calorBadge = `<span style="position: absolute; top: 3px; left: 4px; font-size: 0.6rem; color: #ef4444; font-weight: 900;"><i class="fas fa-exclamation-triangle"></i> ${countIndisciplina}</span>`;
                    } else if (countPositivo > 0) {
                        borderStyle = 'border: 2px solid #10b981; background: linear-gradient(135deg, #f0fdf4, #dcfce7); box-shadow: 0 0 12px rgba(16, 185, 129, 0.25);';
                        calorBadge = `<span style="position: absolute; top: 3px; left: 4px; font-size: 0.6rem; color: #059669; font-weight: 900;"><i class="fas fa-star"></i> ${countPositivo}</span>`;
                    } else if (countCoordenacao > 0) {
                        borderStyle = 'border: 2px solid #a855f7; background: linear-gradient(135deg, #faf5ff, #f3e8ff); box-shadow: 0 0 12px rgba(168, 85, 247, 0.25);';
                        calorBadge = `<span style="position: absolute; top: 3px; left: 4px; font-size: 0.6rem; color: #9333ea; font-weight: 900;"><i class="fas fa-phone-alt"></i></span>`;
                    } else {
                        borderStyle = 'border-left: 4px solid var(--color-primary); border-top: 1px solid var(--color-slate-200); border-right: 1px solid var(--color-slate-200); border-bottom: 1px solid var(--color-slate-200); background-color: var(--color-white); box-shadow: var(--shadow-sm);';
                    }
                } else {
                    borderStyle = 'border-left: 4px solid var(--color-primary); border-top: 1px solid var(--color-slate-200); border-right: 1px solid var(--color-slate-200); border-bottom: 1px solid var(--color-slate-200); background-color: var(--color-white); box-shadow: var(--shadow-sm);';
                }
            }

            let content = `<span style="font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-400);">${i}</span>`;

            if (aluno) {
                const xp = aluno.xp || 0;
                const level = Math.floor(xp / 100) + 1;
                const nomeExibicao = this.obterNomeExibicaoMapa(aluno, turma.alunos || []);
                content = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%; padding: 0.25rem; text-align: center; pointer-events: none;">
                        <span style="font-weight: 800; color: var(--color-slate-800); font-size: 0.75rem; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;" title="${window.escapeHTML(aluno.nome)}">
                            ${window.escapeHTML(nomeExibicao)}
                        </span>
                        <div style="display: flex; align-items: center; gap: 0.25rem; margin-top: 0.25rem;">
                            <span style="font-size: 0.5625rem; font-weight: 900; background-color: #fef3c7; color: #d97706; padding: 0.05rem 0.25rem; border-radius: var(--radius-sm); border: 1px solid #fde68a;">Lvl ${level}</span>
                            <span style="font-size: 0.5625rem; font-weight: 700; color: var(--color-slate-400);">${xp} XP</span>
                        </div>
                    </div>
                `;
            }

            const seatDiv = document.createElement('div');
            seatDiv.className = 'interactive-element seat-drop-zone';
            seatDiv.id = `seat-zone-${i}`;
            seatDiv.setAttribute('data-action', 'clicar-assento');
            seatDiv.setAttribute('data-posicao', String(i));
            seatDiv.setAttribute('draggable', aluno ? 'true' : 'false');
            seatDiv.setAttribute('style', `height: 5.5rem; border-radius: var(--radius-xl); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; padding: 0.25rem; cursor: pointer; transition: all var(--transition-fast); ${borderStyle}`);
            seatDiv.title = aluno ? `${window.escapeHTML(aluno.nome)} (Clique para gerenciar ou arraste para mover)` : `Carteira ${i} vazia (Clique para alocar aluno)`;

            seatDiv.innerHTML = `
                ${calorBadge}
                ${content}
                ${aluno ? `
                    <div style="position: absolute; top: 2px; right: 2px; display: flex; gap: 2px;">
                        <button type="button" data-action="ajustar-xp" data-turma="${turma.id}" data-aluno="${aluno.id}" data-delta="10"
                                style="width: 1.125rem; height: 1.125rem; border-radius: 50%; background-color: #d1fae5; color: #059669; border: none; font-size: 0.5rem; font-weight: 900; display: flex; align-items: center; justify-content: center; cursor: pointer;" title="+10 XP">
                            +
                        </button>
                    </div>
                ` : ''}
            `;

            // Vincula eventos nativos de Drag and Drop
            seatDiv.addEventListener('dragstart', (e) => this.handleDragStart(e, i));
            seatDiv.addEventListener('dragover', (e) => this.handleDragOver(e));
            seatDiv.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            seatDiv.addEventListener('drop', (e) => this.handleDrop(e, i));
            seatDiv.addEventListener('dragend', (e) => this.handleDragEnd(e));

            fragment.appendChild(seatDiv);
        }

        grid.replaceChildren(fragment);
    },

    obterNomeExibicaoMapa(aluno, todosAlunos = []) {
        if (!aluno || !aluno.nome) return '';
        const partes = aluno.nome.trim().toUpperCase().split(/\s+/);
        if (partes.length <= 1) return partes[0];

        const primeiroNome = partes[0].toLowerCase();
        const homonimos = todosAlunos.filter(a => {
            const outroPrimeiro = (a.nome || '').trim().split(/\s+/)[0]?.toLowerCase();
            return outroPrimeiro === primeiroNome;
        });

        if (homonimos.length > 1) {
            return `${partes[0]} ${partes[1] || ''}`.trim().toUpperCase();
        }
        return partes[0].toUpperCase();
    },

    clicarAssento(posicao) {
        this.abrirModalEditarAssento(posicao);
    },

    abrirModalEditarAssento(posicao) {
        const turma = model.state.turmas.find(t => String(t.id) === String(this.currentTurmaId));
        if (!turma) return;

        const alunoNaPosicao = (turma.alunos || []).find(a => a.posicao === posicao && (a.status === 'cursando' || (!a.status && a.status !== 'transferido' && a.status !== 'realocado' && a.status !== 'evadido')));
        const alunosAtivos = (turma.alunos || []).filter(a => a.status === 'cursando' || (!a.status && a.status !== 'transferido' && a.status !== 'realocado' && a.status !== 'evadido'));
        const alunosNaoSentados = alunosAtivos.filter(a => !a.posicao || a.posicao <= 0);
        const todosAlunos = [...alunosAtivos].sort((a, b) => (a.nome || '').localeCompare((b.nome || '')));

        const htmlAlunosSelect = todosAlunos.map(a => {
            const isAtual = alunoNaPosicao && String(a.id) === String(alunoNaPosicao.id);
            const statusPos = a.posicao ? (a.posicao === posicao ? `(Aluno Atual)` : `(Na Carteira #${a.posicao})`) : `(Sem Carteira / Novo)`;
            return `<option value="${a.id}" ${isAtual ? 'selected' : ''}>${window.escapeHTML((a.nome || '').toUpperCase())} ${statusPos}</option>`;
        }).join('');

        const htmlConteudo = `
            <div id="modal-editar-assento-wrap" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; max-width: 500px;">
                <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 0.75rem; border-bottom: 1px solid var(--color-slate-100);">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="width: 2.75rem; height: 2.75rem; border-radius: var(--radius-xl); background: var(--color-primary-light); color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 900;">
                            #${posicao}
                        </div>
                        <div>
                            <h3 style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-800); margin: 0;">Carteira #${posicao}</h3>
                            <p style="font-size: 0.75rem; color: var(--color-slate-400); margin: 0;">${alunoNaPosicao ? 'Ocupada por <strong>' + window.escapeHTML(alunoNaPosicao.nome) + '</strong>' : 'Carteira Vazia / Disponível'}</p>
                        </div>
                    </div>
                    ${alunoNaPosicao ? `
                        <button type="button" data-action="ver-dossie-modal" data-turma="${turma.id}" data-aluno="${alunoNaPosicao.id}" class="btn-secondary" style="font-size: 0.75rem; padding: 0.375rem 0.625rem;" title="Ver Dossiê">
                            <i class="fas fa-stream mr-1"></i> Dossiê
                        </button>
                    ` : ''}
                </div>

                <!-- SELETOR / ATRIBUIÇÃO DIRETA DE ALUNO -->
                <div>
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase;">
                        ${alunoNaPosicao ? 'Substituir / Trocar por outro Estudante' : 'Escolha um Estudante para esta Carteira'}
                    </label>
                    <select id="modal-select-aluno-assento" class="form-input" style="width: 100%; font-weight: 700;">
                        <option value="">-- Selecione o estudante da turma --</option>
                        ${htmlAlunosSelect}
                    </select>
                    ${alunosNaoSentados.length > 0 ? `
                        <p style="font-size: 0.75rem; color: #d97706; margin-top: 0.375rem; font-weight: 600;">
                            <i class="fas fa-info-circle"></i> Há <strong>${alunosNaoSentados.length}</strong> estudante(s) sem carteira definida nesta turma.
                        </p>
                    ` : ''}
                </div>

                <!-- AÇÕES DISPONÍVEIS -->
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.5rem; padding-top: 0.75rem; border-top: 1px solid var(--color-slate-100);">
                    ${alunoNaPosicao ? `
                        <button type="button" data-action="desalocar-assento" data-posicao="${posicao}" class="btn-secondary" style="color: #ef4444; border-color: #fecaca; font-size: 0.8125rem;" title="Deixar esta carteira vazia e manter estudante na turma">
                            <i class="fas fa-user-slash mr-1"></i> Desalocar (Deixar Vazia)
                        </button>
                    ` : '<div></div>'}
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" data-action="cancelar-assento" class="btn-secondary">Cancelar</button>
                        <button type="button" data-action="confirmar-assento" data-posicao="${posicao}" class="btn-primary">
                            <i class="fas fa-check mr-1"></i> ${alunoNaPosicao ? 'Atualizar Assento' : 'Alocar na Carteira'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        controller.openModal(`Gerenciar Carteira #${posicao}`, htmlConteudo, 'medium');

        const modalWrap = document.getElementById('modal-editar-assento-wrap');
        if (modalWrap) {
            EventDelegator.bind(modalWrap, {
                'ver-dossie-modal': (e, target) => {
                    const tId = target.getAttribute('data-turma');
                    const aId = target.getAttribute('data-aluno');
                    if (tId && aId) turmaController.abrirModalDossieComportamental(tId, aId);
                },
                'desalocar-assento': (e, target) => {
                    const p = Number(target.getAttribute('data-posicao'));
                    this.desalocarAssento(p);
                },
                'cancelar-assento': () => controller.closeModal(),
                'confirmar-assento': (e, target) => {
                    const p = Number(target.getAttribute('data-posicao'));
                    this.confirmarAlocacaoAssento(p);
                }
            }, 'click');
        }
    },

    confirmarAlocacaoAssento(posicao) {
        const alunoId = document.getElementById('modal-select-aluno-assento')?.value;
        if (!alunoId) {
            return Toast.show("Selecione um estudante para alocar na carteira.", "warning");
        }

        const sucesso = model.alocarAlunoAssento(this.currentTurmaId, alunoId, posicao);
        if (sucesso) {
            controller.closeModal();
            this.carregarMapa(this.currentTurmaId);
            Toast.show(`Carteira #${posicao} atualizada com sucesso!`, "success");
        }
    },

    desalocarAssento(posicao) {
        const sucesso = model.desalocarAlunoAssento(this.currentTurmaId, posicao);
        if (sucesso) {
            controller.closeModal();
            this.carregarMapa(this.currentTurmaId);
            Toast.show(`Carteira #${posicao} desocupada com sucesso.`, "info");
        }
    },

    handleDragStart(event, posicao) {
        this.arrastandoPosicao = posicao;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(posicao));
        event.currentTarget.style.opacity = '0.4';
    },

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        const zone = event.currentTarget;
        if (zone) {
            zone.style.transform = 'scale(1.06)';
            zone.style.outline = '2px solid var(--color-primary)';
        }
    },

    handleDragLeave(event) {
        const zone = event.currentTarget;
        if (zone) {
            zone.style.transform = '';
            zone.style.outline = '';
        }
    },

    handleDragEnd(event) {
        event.currentTarget.style.opacity = '1';
        document.querySelectorAll('.seat-drop-zone').forEach(el => {
            el.style.transform = '';
            el.style.outline = '';
        });
        this.arrastandoPosicao = null;
    },

    handleDrop(event, posicaoDestino) {
        event.preventDefault();
        const posicaoOrigem = this.arrastandoPosicao !== null ? this.arrastandoPosicao : Number(event.dataTransfer.getData('text/plain'));
        
        if (posicaoOrigem && posicaoOrigem !== posicaoDestino) {
            model.trocarPosicoesAlunos(this.currentTurmaId, posicaoOrigem, posicaoDestino);
            Toast.show("Carteiras reorganizadas!", "success");
            this.carregarMapa(this.currentTurmaId);
        }
        this.arrastandoPosicao = null;
    },

    ajustarGrid(deltaLinhas, deltaColunas) {
        const turma = model.state.turmas.find(t => String(t.id) === String(this.currentTurmaId));
        if (!turma) return;

        const atuais = turma.mapaConfig || { linhas: 6, colunas: 6, visaoCalor: false };
        const novasLinhas = Math.max(2, Math.min(10, (atuais.linhas || 6) + deltaLinhas));
        const novasColunas = Math.max(2, Math.min(10, (atuais.colunas || 6) + deltaColunas));

        model.setMapaConfig(this.currentTurmaId, {
            linhas: novasLinhas,
            colunas: novasColunas,
            visaoCalor: !!atuais.visaoCalor
        });

        Toast.show(`Grid ajustado para ${novasLinhas}x${novasColunas}`, "info");
        this.render('view-container');
    },

    toggleVisaoCalor() {
        const turma = model.state.turmas.find(t => String(t.id) === String(this.currentTurmaId));
        if (!turma) return;

        const atuais = turma.mapaConfig || { linhas: 6, colunas: 6, visaoCalor: false };
        const novoStatus = !atuais.visaoCalor;

        model.setMapaConfig(this.currentTurmaId, {
            ...atuais,
            visaoCalor: novoStatus
        });

        Toast.show(novoStatus ? "🔥 Visão de Calor Comportamental ativada!" : "Visão de Calor desativada.", "info");
        this.render('view-container');
    },

    ajustarXP(turmaId, alunoId, delta) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        const aluno = turma.alunos.find(a => String(a.id) === String(alunoId));
        if (!aluno) return;

        aluno.xp = Math.max(0, (aluno.xp || 0) + delta);
        if (model.saveTurmas) model.saveTurmas();
        else model.saveLocal();
        Toast.show(`${aluno.nome.split(' ')[0]}: ${delta > 0 ? '+' : ''}${delta} XP!`, "success");
        this.carregarMapa(this.currentTurmaId);
    },

    embaralhar() {
        const turma = model.state.turmas.find(t => String(t.id) === String(this.currentTurmaId));
        if (!turma || !turma.alunos || turma.alunos.length === 0) {
            return Toast.show("Nenhum aluno nesta turma para embaralhar.", "warning");
        }

        const alunosAtivos = (turma.alunos || []).filter(a => a.status === 'cursando' || (!a.status && a.status !== 'transferido' && a.status !== 'realocado' && a.status !== 'evadido'));
        if (alunosAtivos.length === 0) {
            return Toast.show("Nenhum aluno ativo nesta turma para sortear assentos.", "warning");
        }

        const linhas = turma.mapaConfig?.linhas || 6;
        const colunas = turma.mapaConfig?.colunas || 6;
        const total = linhas * colunas;

        const posicoes = secureShuffle(Array.from({ length: total }, (_, i) => i + 1));
        
        turma.alunos.forEach(aluno => {
            const indexAtivo = alunosAtivos.indexOf(aluno);
            if (indexAtivo >= 0) {
                aluno.posicao = posicoes[indexAtivo] || (indexAtivo + 1);
            } else {
                aluno.posicao = null;
            }
        });

        if (model.saveTurma) {
            model.saveTurma(turma);
        } else {
            model.saveLocal();
        }
        Toast.show("Assentos sorteados e salvos com sucesso!", "success");
        this.carregarMapa(this.currentTurmaId);
    },

    // =========================================================================
    // IMPRESSÃO DE MAPA DE SALA (A4 LANDSCAPE)
    // =========================================================================

    imprimir() {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(this.currentTurmaId));
        if (!turma) return Toast.show("Selecione uma turma para imprimir o mapa de sala.", "warning");

        const modalHtml = `
            <div id="modal-imprimir-sala" class="modal-overlay modal-enter" style="display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 9999;">
                <div class="card p-6" style="max-width: 440px; width: 90%; background: var(--color-white); border-radius: var(--radius-2xl); box-shadow: var(--shadow-2xl); border: 1px solid var(--color-slate-200);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-print" style="color: var(--color-primary);"></i> Imprimir Mapa de Sala
                        </h3>
                        <button type="button" data-action="fechar-modal-imprimir-sala" class="btn-icon" style="border: none; background: none; cursor: pointer; color: var(--color-slate-400);">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <p style="font-size: 0.875rem; color: var(--color-slate-600); margin-bottom: 1.5rem;">
                        Escolha como deseja emitir a folha A4 do mapa de sala da turma <strong>${window.escapeHTML(turma.nome)}</strong>:
                    </p>

                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <button type="button" data-action="emitir-impressao-preenchido" class="btn-primary" style="padding: 0.875rem; justify-content: center; font-weight: 700; font-size: 0.9375rem;">
                            <i class="fas fa-users" style="margin-right: 0.5rem;"></i> Imprimir Mapa Preenchido (com Alunos)
                        </button>
                        <button type="button" data-action="emitir-impressao-branco" class="btn-secondary" style="padding: 0.875rem; justify-content: center; font-weight: 700; font-size: 0.9375rem;">
                            <i class="far fa-square" style="margin-right: 0.5rem;"></i> Imprimir Mapa em Branco (em Papel)
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modalEl = document.getElementById('modal-imprimir-sala');
        if (modalEl) {
            EventDelegator.bind(modalEl, {
                'fechar-modal-imprimir-sala': () => modalEl.remove(),
                'emitir-impressao-preenchido': () => {
                    modalEl.remove();
                    this.gerarImpressaoMapa('preenchido');
                },
                'emitir-impressao-branco': () => {
                    modalEl.remove();
                    this.gerarImpressaoMapa('branco');
                }
            }, 'click');
        }
    },

    gerarImpressaoMapa(modo) {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(this.currentTurmaId));
        if (!turma) return;

        const config = model.state.userConfig || {};
        const escola = config.school || config.escola || 'Unidade Escolar';
        const linhas = turma.mapaConfig?.linhas || 6;
        const colunas = turma.mapaConfig?.colunas || 6;
        const alunos = turma.alunos || [];

        let gridHtml = '';
        for (let l = 0; l < linhas; l++) {
            let celulas = '';
            for (let c = 0; c < colunas; c++) {
                const posIndex = (l * colunas) + c + 1;
                const aluno = modo === 'preenchido' ? alunos.find(a => Number(a.posicao) === posIndex) : null;
                const nomeExibicao = aluno ? this.obterNomeExibicaoMapa(aluno, alunos) : '';

                celulas += `
                    <div style="border: 1px solid #94a3b8; border-radius: 6px; padding: 6px; min-height: 48px; background: #fff; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                        ${aluno ? `
                            <span style="font-size: 0.65rem; font-weight: 800; color: #475569;">Assento ${posIndex}</span>
                            <strong style="font-size: 0.75rem; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;">${window.escapeHTML(nomeExibicao)}</strong>
                        ` : `
                            <span style="font-size: 0.65rem; color: #cbd5e1; font-style: italic;">Assento ${posIndex}</span>
                        `}
                    </div>
                `;
            }
            gridHtml += `<div style="display: grid; grid-template-columns: repeat(${colunas}, 1fr); gap: 6px; margin-bottom: 6px;">${celulas}</div>`;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return Toast.show("Permita pop-ups para visualizar a impressão.", "warning");

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Mapa de Sala — ${window.escapeHTML(turma.nome)}</title>
                <style>
                    @page { size: A4 landscape; margin: 10mm; }
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 0; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 12px; }
                    .header h2 { margin: 0; font-size: 1.1rem; text-transform: uppercase; }
                    .header p { margin: 2px 0 0 0; font-size: 0.8rem; color: #475569; }
                    .quadro { width: 80%; margin: 0 auto 16px auto; height: 28px; background: #e2e8f0; border: 1px solid #94a3b8; border-radius: 6px; text-align: center; font-weight: 800; font-size: 0.75rem; color: #334155; line-height: 28px; letter-spacing: 0.1em; text-transform: uppercase; }
                    .footer { display: flex; justify-content: space-between; font-size: 0.75rem; color: #64748b; margin-top: 14px; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h2>${window.escapeHTML(escola)} — Mapa de Sala de Aula ${modo === 'branco' ? '(Em Branco)' : ''}</h2>
                        <p><strong>Turma:</strong> ${window.escapeHTML(turma.nome)} &nbsp;|&nbsp; <strong>Grade:</strong> ${linhas} Linhas × ${colunas} Colunas (${alunos.length} alunos)</p>
                    </div>
                    <div style="text-align: right; font-size: 0.75rem; color: #475569;">
                        <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>

                <div class="quadro">
                    [ QUADRO DA SALA DE AULA / MESA DO PROFESSOR ]
                </div>

                <div style="width: 100%;">
                    ${gridHtml}
                </div>

                <div class="footer">
                    <span>Organização de Carteiras gerada via Planner Pro Docente</span>
                    <span>Visto do Professor: _____________________________________</span>
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

if (typeof window !== 'undefined') {
    window.salaView = salaView;
}
