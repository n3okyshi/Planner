import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';
import { uiController } from '../controllers/uiController.js';
import { secureShuffle } from '../utils.js';

export const salaView = {
    alunoSelecionadoParaMover: null,
    currentTurmaId: null,
    arrastandoPosicao: null,

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
                            <button type="button" onclick="salaView.ajustarGrid(0, 1)" class="btn-icon" style="width: 1.75rem; height: 1.75rem; font-size: 0.75rem;" title="Adicionar Coluna">
                                <i class="fas fa-plus"></i> <span style="font-size: 0.625rem; margin-left: 2px;">Col</span>
                            </button>
                            <button type="button" onclick="salaView.ajustarGrid(0, -1)" class="btn-icon" style="width: 1.75rem; height: 1.75rem; font-size: 0.75rem;" title="Remover Coluna">
                                <i class="fas fa-minus"></i> <span style="font-size: 0.625rem; margin-left: 2px;">Col</span>
                            </button>
                            <div style="width: 1px; height: 1.25rem; background-color: var(--color-slate-300); margin: 0 0.25rem;"></div>
                            <button type="button" onclick="salaView.ajustarGrid(1, 0)" class="btn-icon" style="width: 1.75rem; height: 1.75rem; font-size: 0.75rem;" title="Adicionar Linha">
                                <i class="fas fa-plus"></i> <span style="font-size: 0.625rem; margin-left: 2px;">Lin</span>
                            </button>
                            <button type="button" onclick="salaView.ajustarGrid(-1, 0)" class="btn-icon" style="width: 1.75rem; height: 1.75rem; font-size: 0.75rem;" title="Remover Linha">
                                <i class="fas fa-minus"></i> <span style="font-size: 0.625rem; margin-left: 2px;">Lin</span>
                            </button>
                        </div>

                        <!-- Botão Visão de Calor (Heatmap) -->
                        <button type="button" onclick="salaView.toggleVisaoCalor()" class="btn-secondary interactive-element ${isVisaoCalor ? 'btn-primary' : ''}" 
                                style="${isVisaoCalor ? 'background: linear-gradient(135deg, #ef4444, #f59e0b); border: none; color: white;' : ''}" 
                                title="Alternar Mapa de Calor Comportamental">
                            <i class="fas fa-fire"></i> <span>Visão de Calor ${isVisaoCalor ? '(Ativa)' : ''}</span>
                        </button>

                        <button type="button" onclick="salaView.embaralhar()" class="btn-secondary interactive-element" title="Sortear assentos aleatoriamente">
                            <i class="fas fa-random"></i> <span>Embaralhar</span>
                        </button>
                        
                        <button type="button" onclick="window.print()" class="btn-secondary interactive-element" title="Imprimir Mapa">
                            <i class="fas fa-print"></i> <span>Imprimir</span>
                        </button>

                        <div class="custom-dropdown" style="min-width: 220px;">
                            <input type="hidden" id="map-select-turma" onchange="salaView.carregarMapa(this.value)" value="${this.currentTurmaId || ''}">
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

        const linhas = turma.mapaConfig?.linhas || 6;
        const colunas = turma.mapaConfig?.colunas || 6;
        const totalAssentos = linhas * colunas;
        const isVisaoCalor = !!turma.mapaConfig?.visaoCalor;

        grid.style.gridTemplateColumns = `repeat(${colunas}, minmax(0, 1fr))`;
        grid.style.maxWidth = `${Math.max(700, colunas * 130)}px`;

        let assentosHtml = '';
        for (let i = 1; i <= totalAssentos; i++) {
            const aluno = (turma.alunos || []).find(a => a.posicao === i);
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

            assentosHtml += `
                <div class="interactive-element seat-drop-zone"
                     id="seat-zone-${i}"
                     draggable="${aluno ? 'true' : 'false'}"
                     ondragstart="salaView.handleDragStart(event, ${i})"
                     ondragover="salaView.handleDragOver(event)"
                     ondragleave="salaView.handleDragLeave(event)"
                     ondrop="salaView.handleDrop(event, ${i})"
                     ondragend="salaView.handleDragEnd(event)"
                     style="height: 5.5rem; border-radius: var(--radius-xl); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; padding: 0.25rem; cursor: pointer; transition: all var(--transition-fast); ${borderStyle}"
                     onclick="salaView.clicarAssento(${i})"
                     title="${aluno ? window.escapeHTML(aluno.nome) + ' (Clique para gerenciar ou arraste para mover)' : 'Carteira ' + i + ' vazia (Clique para alocar aluno)'}">
                    ${calorBadge}
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

    obterNomeExibicaoMapa(aluno, todosAlunos = []) {
        if (!aluno || !aluno.nome) return '';
        const partes = aluno.nome.trim().split(/\s+/);
        if (partes.length <= 1) return partes[0];

        const primeiroNome = partes[0].toLowerCase();
        const homonimos = todosAlunos.filter(a => {
            const outroPrimeiro = (a.nome || '').trim().split(/\s+/)[0]?.toLowerCase();
            return outroPrimeiro === primeiroNome;
        });

        // Se houver mais de um aluno com o mesmo primeiro nome, adiciona o segundo nome / sobrenome
        if (homonimos.length > 1) {
            return `${partes[0]} ${partes[1] || ''}`.trim();
        }
        return partes[0];
    },

    clicarAssento(posicao) {
        this.abrirModalEditarAssento(posicao);
    },

    abrirModalEditarAssento(posicao) {
        const turma = model.state.turmas.find(t => String(t.id) === String(this.currentTurmaId));
        if (!turma) return;

        const alunoNaPosicao = (turma.alunos || []).find(a => a.posicao === posicao);
        const alunosNaoSentados = (turma.alunos || []).filter(a => !a.posicao || a.posicao <= 0);
        const todosAlunos = [...(turma.alunos || [])].sort((a, b) => a.nome.localeCompare(b.nome));

        const htmlAlunosSelect = todosAlunos.map(a => {
            const isAtual = alunoNaPosicao && String(a.id) === String(alunoNaPosicao.id);
            const statusPos = a.posicao ? (a.posicao === posicao ? `(Aluno Atual)` : `(Na Carteira #${a.posicao})`) : `(Sem Carteira / Novo)`;
            return `<option value="${a.id}" ${isAtual ? 'selected' : ''}>${window.escapeHTML(a.nome)} ${statusPos}</option>`;
        }).join('');

        const htmlConteudo = `
            <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; max-width: 500px;">
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
                        <button type="button" onclick="turmaController.abrirModalDossieComportamental('${turma.id}', '${alunoNaPosicao.id}')" class="btn-secondary" style="font-size: 0.75rem; padding: 0.375rem 0.625rem;" title="Ver Dossiê">
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
                        <button type="button" onclick="salaView.desalocarAssento(${posicao})" class="btn-secondary" style="color: #ef4444; border-color: #fecaca; font-size: 0.8125rem;" title="Deixar esta carteira vazia e manter estudante na turma">
                            <i class="fas fa-user-slash mr-1"></i> Desalocar (Deixar Vazia)
                        </button>
                    ` : '<div></div>'}
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" onclick="window.controller.closeModal()" class="btn-secondary">Cancelar</button>
                        <button type="button" onclick="salaView.confirmarAlocacaoAssento(${posicao})" class="btn-primary">
                            <i class="fas fa-check mr-1"></i> ${alunoNaPosicao ? 'Atualizar Assento' : 'Alocar na Carteira'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        window.controller.openModal(`Gerenciar Carteira #${posicao}`, htmlConteudo, 'medium');
    },

    confirmarAlocacaoAssento(posicao) {
        const alunoId = document.getElementById('modal-select-aluno-assento')?.value;
        if (!alunoId) {
            return Toast.show("Selecione um estudante para alocar na carteira.", "warning");
        }

        const sucesso = model.alocarAlunoAssento(this.currentTurmaId, alunoId, posicao);
        if (sucesso) {
            window.controller.closeModal();
            this.carregarMapa(this.currentTurmaId);
            Toast.show(`Carteira #${posicao} atualizada com sucesso!`, "success");
        }
    },

    desalocarAssento(posicao) {
        const sucesso = model.desalocarAlunoAssento(this.currentTurmaId, posicao);
        if (sucesso) {
            window.controller.closeModal();
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

        const linhas = turma.mapaConfig?.linhas || 6;
        const colunas = turma.mapaConfig?.colunas || 6;
        const total = linhas * colunas;

        const posicoes = secureShuffle(Array.from({ length: total }, (_, i) => i + 1));
        turma.alunos.forEach((aluno, index) => {
            aluno.posicao = posicoes[index] || (index + 1);
        });

        model.saveLocal();
        Toast.show("Assentos sorteados com sucesso!", "success");
        this.carregarMapa(this.currentTurmaId);
    }
};

