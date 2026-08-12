import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';
import { uiController } from '../controllers/uiController.js';
import { secureShuffle } from '../utils.js';

export const salaView = {
    alunoSelecionadoParaMover: null,
    currentTurmaId: null,

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

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
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em; display: flex; align-items: center; gap: var(--spacing-2);">
                            <i class="fas fa-chair" style="color: var(--color-primary);"></i> Mapa de Sala Interativo
                        </h2>
                        <p style="font-size: 0.875rem; color: var(--color-slate-500);">Organize a disposição das carteiras e gerencie a pontuação de participação (XP).</p>
                    </div>

                    <div style="display: flex; align-items: center; gap: var(--spacing-3); flex-wrap: wrap;">
                        <button type="button" onclick="salaView.embaralhar()" class="btn-secondary interactive-element" title="Sortear assentos aleatoriamente">
                            <i class="fas fa-random"></i> <span>Embaralhar</span>
                        </button>
                        <button type="button" onclick="window.print()" class="btn-secondary interactive-element" title="Imprimir Mapa">
                            <i class="fas fa-print"></i> <span>Imprimir</span>
                        </button>

                        <div class="custom-dropdown" style="min-width: 240px;">
                            <input type="hidden" id="map-select-turma" onchange="salaView.carregarMapa(this.value)" value="${this.currentTurmaId || ''}">
                            <button type="button" class="dropdown-button">
                                <i class="fas fa-users" style="color: var(--color-slate-400); margin-right: var(--spacing-2);"></i>
                                <span class="dropdown-label">${turmas.find(t => String(t.id) === String(this.currentTurmaId))?.nome || 'Selecionar Turma...'}</span>
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
                    <div style="width: 100%; max-width: 580px; height: 3rem; background-color: var(--color-white); border-radius: var(--radius-xl); box-shadow: var(--shadow-sm); margin-bottom: 2rem; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase; letter-spacing: 0.1em; border: 1px solid var(--color-slate-200);">
                        <i class="fas fa-chalkboard" style="margin-right: 0.5rem; color: var(--color-primary);"></i> Quadro / Mesa do Professor
                    </div>

                    <!-- 6x6 DESKS GRID -->
                    <div id="room-grid" style="display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0.75rem; width: 100%; max-width: 900px;">
                        <div style="grid-column: 1 / -1; padding: 4rem 0; text-align: center; color: var(--color-slate-400);">
                            <i class="fas fa-chair" style="font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                            <p>Carregando mapa da sala...</p>
                        </div>
                    </div>

                    <div style="margin-top: 1.5rem; text-align: center; font-size: 0.75rem; color: var(--color-slate-500); font-weight: 600;">
                        <i class="fas fa-info-circle" style="color: var(--color-primary); margin-right: 0.25rem;"></i> Clique em um aluno e depois no assento de destino para trocar ou mover de lugar.
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
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

    carregarMapa(turmaId) {
        if (!turmaId) return;
        this.currentTurmaId = turmaId;

        const grid = document.getElementById('room-grid');
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma || !grid) return;

        let assentosHtml = '';
        for (let i = 1; i <= 36; i++) {
            const aluno = turma.alunos.find(a => a.posicao === i);
            const isSelecionado = this.alunoSelecionadoParaMover === i;

            let borderStyle = 'border: 2px dashed var(--color-slate-300); background-color: var(--color-slate-50);';
            if (isSelecionado) {
                borderStyle = 'border: 2px solid var(--color-primary); background-color: var(--color-primary-light); box-shadow: var(--shadow-md); transform: scale(1.05);';
            } else if (aluno) {
                borderStyle = 'border-left: 4px solid var(--color-primary); border-top: 1px solid var(--color-slate-200); border-right: 1px solid var(--color-slate-200); border-bottom: 1px solid var(--color-slate-200); background-color: var(--color-white); box-shadow: var(--shadow-sm);';
            }

            let content = `<span style="font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-400);">${i}</span>`;

            if (aluno) {
                const xp = aluno.xp || 0;
                const level = Math.floor(xp / 100) + 1;
                content = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%; padding: 0.25rem; text-align: center; pointer-events: none;">
                        <span style="font-weight: 800; color: var(--color-slate-800); font-size: 0.75rem; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;">
                            ${window.escapeHTML(aluno.nome).split(' ')[0]}
                        </span>
                        <div style="display: flex; align-items: center; gap: 0.25rem; margin-top: 0.25rem;">
                            <span style="font-size: 0.5625rem; font-weight: 900; background-color: #fef3c7; color: #d97706; padding: 0.05rem 0.25rem; border-radius: var(--radius-sm); border: 1px solid #fde68a;">Lvl ${level}</span>
                            <span style="font-size: 0.5625rem; font-weight: 700; color: var(--color-slate-400);">${xp} XP</span>
                        </div>
                    </div>
                `;
            }

            assentosHtml += `
                <div class="interactive-element"
                     style="height: 5.5rem; border-radius: var(--radius-xl); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; padding: 0.25rem; cursor: pointer; transition: all var(--transition-fast); ${borderStyle}"
                     onclick="salaView.clicarAssento(${i})"
                     title="${aluno ? window.escapeHTML(aluno.nome) : 'Carteira ' + i + ' (Vazia)'}">
                    ${content}
                    ${aluno ? `
                        <div style="position: absolute; top: 2px; right: 2px; display: flex; gap: 2px;">
                            <button onclick="event.stopPropagation(); salaView.ajustarXP('${turma.id}', '${aluno.id}', 10)" 
                                    style="width: 1.125rem; height: 1.125rem; border-radius: 50%; background-color: #d1fae5; color: #059669; border: none; font-size: 0.5rem; font-weight: 900; display: flex; align-items: center; justify-content: center; cursor: pointer;" title="+10 XP">
                                +
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        grid.innerHTML = assentosHtml;
    },

    clicarAssento(posicao) {
        const turma = model.state.turmas.find(t => String(t.id) === String(this.currentTurmaId));
        if (!turma) return;

        if (this.alunoSelecionadoParaMover === null) {
            const aluno = turma.alunos.find(a => a.posicao === posicao);
            if (aluno) {
                this.alunoSelecionadoParaMover = posicao;
                this.carregarMapa(this.currentTurmaId);
            }
        } else {
            const origem = this.alunoSelecionadoParaMover;
            const destino = posicao;

            if (origem !== destino) {
                const alunoOrigem = turma.alunos.find(a => a.posicao === origem);
                const alunoDestino = turma.alunos.find(a => a.posicao === destino);

                if (alunoOrigem) alunoOrigem.posicao = destino;
                if (alunoDestino) alunoDestino.posicao = origem;

                if (model.saveTurmas) model.saveTurmas();
                Toast.show("Carteiras reorganizadas!", "success");
            }

            this.alunoSelecionadoParaMover = null;
            this.carregarMapa(this.currentTurmaId);
        }
    },

    ajustarXP(turmaId, alunoId, delta) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        const aluno = turma.alunos.find(a => String(a.id) === String(alunoId));
        if (!aluno) return;

        aluno.xp = Math.max(0, (aluno.xp || 0) + delta);
        if (model.saveTurmas) model.saveTurmas();
        Toast.show(`${aluno.nome.split(' ')[0]}: ${delta > 0 ? '+' : ''}${delta} XP!`, "success");
        this.carregarMapa(this.currentTurmaId);
    },

    embaralhar() {
        const turma = model.state.turmas.find(t => String(t.id) === String(this.currentTurmaId));
        if (!turma || !turma.alunos || turma.alunos.length === 0) {
            return Toast.show("Nenhum aluno nesta turma para embaralhar.", "warning");
        }

        const posicoes = secureShuffle(Array.from({ length: 36 }, (_, i) => i + 1));
        turma.alunos.forEach((aluno, index) => {
            aluno.posicao = posicoes[index];
        });

        if (model.saveTurmas) model.saveTurmas();
        Toast.show("Assentos sorteados com sucesso!", "success");
        this.carregarMapa(this.currentTurmaId);
    }
};
