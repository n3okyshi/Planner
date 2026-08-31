import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';
import { uiController } from '../controllers/uiController.js';

export const frequenciaView = {
    currentTurmaId: null,
    currentDate: new Date(),
    chamadaAtiva: false,
    alunoIndex: 0,
    startX: 0,
    alunosChamada: [],

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const turmas = model.state.turmas || [];
        if (!this.currentTurmaId && turmas.length > 0) {
            this.currentTurmaId = turmas[0].id;
        } else if (this.currentTurmaId && !turmas.find(t => String(t.id) === String(this.currentTurmaId))) {
            this.currentTurmaId = turmas.length > 0 ? turmas[0].id : null;
        }

        const turmaSelecionada = turmas.find(t => String(t.id) === String(this.currentTurmaId));
        const ano = this.currentDate.getFullYear();
        const mes = this.currentDate.getMonth();
        const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(this.currentDate);
        const diasNoMes = new Date(ano, mes + 1, 0).getDate();
        const diaSelecionadoStr = this.currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        const todasDatasUnicas = new Set();
        if (turmaSelecionada && turmaSelecionada.alunos) {
            turmaSelecionada.alunos.forEach(a => {
                Object.keys(a.frequencia || {}).forEach(k => todasDatasUnicas.add(k));
            });
        }
        const totalDiasRegistrados = todasDatasUnicas.size;
        const pctCargaLDB = Math.min(100, Math.round((totalDiasRegistrados / 200) * 100));

        const html = `
            <div class="animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8); height: 100%;">
                
                <!-- TOP HEADER & CONTROLS TOOLBAR -->
                <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em; display: flex; align-items: center; gap: var(--spacing-2);">
                                <i class="fas fa-clipboard-check" style="color: var(--color-primary);"></i> Controle de Frequência
                            </h2>
                            <span class="badge" style="background-color: #e0e7ff; color: #3730a3; font-weight: 800; padding: 0.35rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; border: 1px solid #c7d2fe;" title="Meta LDB Art. 24, I: 200 dias / 800 horas letivas">
                                <i class="fas fa-calendar-check" style="margin-right: 0.25rem;"></i> LDB: ${totalDiasRegistrados}/200 dias (${pctCargaLDB}%)
                            </span>
                        </div>
                        <p style="font-size: 0.875rem; color: var(--color-slate-500); margin-top: 0.25rem;">Registro de presença diária e histórico mensal por estudante.</p>
                    </div>

                    <div style="display: flex; align-items: center; gap: var(--spacing-3); flex-wrap: wrap;">
                        <button type="button" onclick="frequenciaView.abrirModalConteudoMinistrado()" 
                                class="btn-secondary" style="white-space: nowrap; flex-shrink: 0;"
                                title="Registrar Conteúdo Lecionado e Habilidade BNCC da Aula">
                            <i class="fas fa-pen-nib" style="color: var(--color-primary);"></i> <span>Conteúdo Ministrado</span>
                        </button>

                        <button type="button" onclick="frequenciaView.abrirModalImprimirChamada()" 
                                class="btn-secondary" style="white-space: nowrap; flex-shrink: 0;"
                                title="Imprimir Folha de Chamada Mensal">
                            <i class="fas fa-print"></i> <span>Imprimir Chamada</span>
                        </button>

                        <button type="button" onclick="frequenciaView.iniciarChamada()" 
                                class="btn-primary" style="background-color: #059669; border-color: #059669; white-space: nowrap; flex-shrink: 0;"
                                title="Iniciar chamada rápida interativa">
                            <i class="fas fa-hand-pointer"></i> <span>Chamada Rápida (${diaSelecionadoStr})</span>
                        </button>

                        <div style="display: flex; align-items: center; background-color: var(--color-slate-50); border: 1px solid var(--color-slate-200); border-radius: var(--radius-xl); padding: 0.25rem; flex-shrink: 0;">
                            <button type="button" onclick="frequenciaView.mudarMes(-1)" class="btn-icon" style="width: 2rem; height: 2rem;" title="Mês Anterior">
                                <i class="fas fa-chevron-left" style="font-size: 0.75rem;"></i>
                            </button>
                            <span style="width: 8.5rem; text-align: center; font-size: 0.875rem; font-weight: 800; color: var(--color-slate-700); text-transform: capitalize; user-select: none;">
                                ${nomeMes} / ${ano}
                            </span>
                            <button type="button" onclick="frequenciaView.mudarMes(1)" class="btn-icon" style="width: 2rem; height: 2rem;" title="Próximo Mês">
                                <i class="fas fa-chevron-right" style="font-size: 0.75rem;"></i>
                            </button>
                        </div>

                        <div class="custom-dropdown" style="min-width: 200px; flex-shrink: 0;">
                            <input type="hidden" id="freq-turma" onchange="frequenciaView.mudarTurma(this.value)" value="${this.currentTurmaId || ''}">
                            <button type="button" class="dropdown-button">
                                <i class="fas fa-users" style="color: var(--color-slate-400); margin-right: var(--spacing-2);"></i>
                                <span class="dropdown-label">${turmaSelecionada ? window.escapeHTML(turmaSelecionada.nome) : 'Nenhuma turma'}</span>
                                <i class="fas fa-chevron-down" style="color: var(--color-slate-400); font-size: 0.75rem; margin-left: auto;"></i>
                            </button>
                            <ul class="dropdown-menu hidden custom-scrollbar">
                                ${turmas.map(t => `
                                    <li class="dropdown-item ${String(t.id) === String(this.currentTurmaId) ? 'dropdown-item--selected' : ''}" data-value="${t.id}">
                                        ${window.escapeHTML(t.nome)}
                                    </li>
                                `).join('')}
                                ${turmas.length === 0 ? '<li class="p-3 text-slate-400 text-sm text-center">Nenhuma turma</li>' : ''}
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- ATTENDANCE TABLE CONTENT -->
                ${turmaSelecionada ? this.renderTabela(turmaSelecionada, ano, mes, diasNoMes) : this.estadoVazio()}
            </div>

            <!-- OVERLAY: CHAMADA RÁPIDA (fixed, fora do fluxo) -->
            <div id="chamada-rapida-overlay"
                 style="display: none; position: fixed; inset: 0; z-index: 9999;
                        background-color: rgba(15, 23, 42, 0.95);
                        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
                        flex-direction: column; align-items: center; justify-content: center;
                        padding: 1.5rem; transition: background-color 0.2s ease;">

                <!-- Header do overlay -->
                <div style="width: 100%; max-width: 420px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; color: white; padding: 0 0.5rem;">
                    <div>
                        <span style="font-size: 0.6875rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; opacity: 0.6;">Chamada Rápida</span>
                        <div id="chamada-progresso" style="font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 0.125rem;"></div>
                    </div>
                    <button type="button" onclick="frequenciaView.finalizarChamada()"
                            style="width: 2.5rem; height: 2.5rem; border-radius: 50%; background-color: rgba(255,255,255,0.1); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: background-color 0.2s;"
                            onmouseover="this.style.backgroundColor='rgba(255,255,255,0.2)'" onmouseout="this.style.backgroundColor='rgba(255,255,255,0.1)'">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Área do card dinâmico -->
                <div id="chamada-card-container"
                     style="width: 100%; max-width: 420px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; min-height: 0;">
                    <!-- Card e botões injetados via JS -->
                </div>

                <!-- Botão finalizar -->
                <button type="button" onclick="frequenciaView.finalizarChamada()"
                        style="margin-top: 1.5rem; color: rgba(255,255,255,0.4); font-size: 0.6875rem; font-weight: 800;
                               text-transform: uppercase; letter-spacing: 0.1em; padding: 0.625rem 1.5rem;
                               border: 1px solid rgba(255,255,255,0.15); border-radius: 999px;
                               background: transparent; cursor: pointer; transition: all 0.2s;"
                        onmouseover="this.style.color='rgba(255,255,255,0.8)'; this.style.borderColor='rgba(255,255,255,0.4)'; this.style.backgroundColor='rgba(255,255,255,0.08)';"
                        onmouseout="this.style.color='rgba(255,255,255,0.4)'; this.style.borderColor='rgba(255,255,255,0.15)'; this.style.backgroundColor='transparent';">
                    Finalizar Chamada
                </button>
            </div>
        `;

        container.innerHTML = html;
        uiController.initAllDropdowns(container);
        this.iniciarRedimensionadorColuna(container);
        this.autoScrollParaHoje(ano, mes);
    },

    obterLarguraColunaAluno() {
        try {
            const saved = localStorage.getItem('frequencia_coluna_aluno_width');
            if (saved && saved.trim() !== '') return saved;
        } catch (e) { }
        return window.innerWidth < 768 ? '135px' : '240px';
    },

    iniciarRedimensionadorColuna(container) {
        const resizer = container.querySelector('#resizer-col-aluno') || document.getElementById('resizer-col-aluno');
        const tabelaContainer = container.querySelector('#tabela-frequencia-container') || document.getElementById('tabela-frequencia-container');
        if (!resizer || !tabelaContainer) return;

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        const onStart = (clientX) => {
            isResizing = true;
            startX = clientX;
            const currentWidth = parseFloat(getComputedStyle(tabelaContainer).getPropertyValue('--col-aluno-width')) || 
                (window.innerWidth < 768 ? 135 : 240);
            startWidth = currentWidth;
            resizer.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        };

        const onMove = (clientX) => {
            if (!isResizing) return;
            const deltaX = clientX - startX;
            const newWidth = Math.min(380, Math.max(90, startWidth + deltaX));
            requestAnimationFrame(() => {
                tabelaContainer.style.setProperty('--col-aluno-width', `${newWidth}px`);
            });
        };

        const onEnd = () => {
            if (!isResizing) return;
            isResizing = false;
            resizer.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            const finalWidth = getComputedStyle(tabelaContainer).getPropertyValue('--col-aluno-width');
            if (finalWidth) {
                try {
                    localStorage.setItem('frequencia_coluna_aluno_width', finalWidth.trim());
                } catch (e) { }
            }
        };

        // Eventos de Mouse
        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            onStart(e.clientX);
        });

        window.addEventListener('mousemove', (e) => {
            if (isResizing) onMove(e.clientX);
        });

        window.addEventListener('mouseup', () => {
            if (isResizing) onEnd();
        });

        // Eventos de Touch
        resizer.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches.length > 0) {
                onStart(e.touches[0].clientX);
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (isResizing && e.touches && e.touches.length > 0) {
                onMove(e.touches[0].clientX);
            }
        }, { passive: true });

        window.addEventListener('touchend', () => {
            if (isResizing) onEnd();
        });

        window.addEventListener('touchcancel', () => {
            if (isResizing) onEnd();
        });
    },

    autoScrollParaHoje(ano, mes) {
        setTimeout(() => {
            const hoje = new Date();
            const isMesAtual = hoje.getMonth() === mes && hoje.getFullYear() === ano;
            if (!isMesAtual) return;
            const elHoje = document.getElementById('dia-hoje');
            const scrollContainer = document.getElementById('scroll-frequencia');
            if (elHoje && scrollContainer) {
                const scrollPos = elHoje.offsetLeft - (scrollContainer.clientWidth / 2) + (elHoje.clientWidth / 2);
                scrollContainer.scrollTo({ left: scrollPos, behavior: 'smooth' });
            }
        }, 300);
    },

    mudarTurma(id) {
        this.currentTurmaId = id;
        this.render('view-container');
    },

    mudarMes(delta) {
        const d = new Date(this.currentDate);
        d.setMonth(d.getMonth() + delta);
        this.currentDate = d;
        this.render('view-container');
    },

    iniciarChamada() {
        const turmas = model.state.turmas || [];
        const turma = turmas.find(t => String(t.id) === String(this.currentTurmaId));
        if (!turma || !turma.alunos || turma.alunos.length === 0) {
            return Toast.show("Não há alunos para realizar a chamada.", "warning");
        }
        this.alunosChamada = window.ordenarEstudantes 
            ? window.ordenarEstudantes(turma.alunos.filter(a => a.status !== 'transferido'), 'chamada_asc')
            : [...turma.alunos]
                .filter(a => a.status !== 'transferido')
                .sort((a, b) => (a.nome || '').localeCompare((b.nome || ''), 'pt-BR', { sensitivity: 'base' }));
        if (this.alunosChamada.length === 0) {
            return Toast.show("Não há alunos ativos para a chamada nesta turma.", "warning");
        }
        this.chamadaAtiva = true;
        this.alunoIndex = 0;
        const overlay = document.getElementById('chamada-rapida-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.style.display = 'flex';
        }
        this.renderProximoAluno();
    },

    renderProximoAluno() {
        const container = document.getElementById('chamada-card-container');
        if (!container) return;
        const aluno = this.alunosChamada[this.alunoIndex];
        if (!aluno || this.alunoIndex >= this.alunosChamada.length) {
            this.finalizarChamada();
            return;
        }


        // Atualiza barra de progresso
        const progressEl = document.getElementById('chamada-progresso');
        if (progressEl) {
            progressEl.textContent = `${this.alunoIndex + 1} de ${this.alunosChamada.length} alunos`;
        }

        const inicial = window.escapeHTML(aluno.nome).charAt(0).toUpperCase();
        const numChamadaText = aluno.chamada ? `Chamada Nº ${aluno.chamada}` : '';

        // Cores do avatar ciclando por índice
        const avatarPalettes = [
            { bg: '#e0e7ff', color: '#4338ca' },
            { bg: '#d1fae5', color: '#065f46' },
            { bg: '#fce7f3', color: '#9d174d' },
            { bg: '#fef3c7', color: '#92400e' },
            { bg: '#ede9fe', color: '#5b21b6' },
            { bg: '#fee2e2', color: '#991b1b' },
        ];
        const palette = avatarPalettes[this.alunoIndex % avatarPalettes.length];

        container.innerHTML = `
            <div id="chamada-card"
                 style="width: 100%; max-width: 360px; aspect-ratio: 3/4; max-height: 480px;
                        background: linear-gradient(160deg, #ffffff 0%, #f8fafc 100%);
                        border-radius: 2rem;
                        box-shadow: 0 32px 64px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.15);
                        display: flex; flex-direction: column; align-items: center; justify-content: center;
                        padding: 2rem 1.75rem 1.5rem;
                        text-align: center; position: relative; overflow: hidden;
                        user-select: none; cursor: grab; touch-action: none;
                        transition: box-shadow 0.2s ease;">

                <!-- Brilho decorativo no topo -->
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 6px;
                            background: linear-gradient(90deg, ${palette.color}40, ${palette.color}, ${palette.color}40);
                            border-radius: 2rem 2rem 0 0;"></div>

                <!-- Conteúdo central (sem pointer-events para não interferir no drag) -->
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; pointer-events: none; gap: 0.5rem;">

                    <!-- Avatar com inicial -->
                    <div style="width: 6rem; height: 6rem; border-radius: 50%;
                                background-color: ${palette.bg}; color: ${palette.color};
                                display: flex; align-items: center; justify-content: center;
                                font-size: 2.25rem; font-weight: 900;
                                border: 4px solid white;
                                box-shadow: 0 8px 24px ${palette.color}30, 0 0 0 2px ${palette.bg};
                                margin-bottom: 0.5rem;">
                        ${inicial}
                    </div>

                    <!-- Contador -->
                    <p style="font-size: 0.625rem; font-weight: 900; color: #94a3b8;
                              text-transform: uppercase; letter-spacing: 0.15em;">
                        Aluno ${this.alunoIndex + 1} de ${this.alunosChamada.length}
                    </p>

                    <!-- Nome do aluno -->
                    <h3 style="font-size: 1.375rem; font-weight: 900; color: #1e293b;
                               line-height: 1.2; max-width: 100%; word-break: break-word;">
                        ${window.escapeHTML(aluno.nome)}
                    </h3>

                    ${numChamadaText ? `
                    <span style="margin-top: 0.25rem; font-size: 0.6875rem; font-weight: 800;
                                 color: #64748b; background-color: #f1f5f9;
                                 border: 1px solid #e2e8f0; border-radius: 999px;
                                 padding: 0.25rem 0.875rem;">
                        ${numChamadaText}
                    </span>` : ''}
                </div>

                <!-- Indicadores de swipe (canto inferior) -->
                <div style="display: flex; gap: 0.75rem; width: 100%; margin-top: 1rem; pointer-events: none;">
                    <div style="flex: 1; border: 2px dashed #fca5a5; border-radius: 1rem; padding: 0.6rem 0.5rem;
                                background-color: #fff5f5; display: flex; flex-direction: column;
                                align-items: center; gap: 0.25rem;">
                        <i class="fas fa-arrow-left" style="color: #f87171; font-size: 0.875rem;"></i>
                        <span style="font-size: 0.5625rem; font-weight: 900; color: #ef4444; text-transform: uppercase; letter-spacing: 0.08em;">Falta</span>
                    </div>
                    <div style="flex: 1; border: 2px dashed #6ee7b7; border-radius: 1rem; padding: 0.6rem 0.5rem;
                                background-color: #f0fdf4; display: flex; flex-direction: column;
                                align-items: center; gap: 0.25rem;">
                        <i class="fas fa-arrow-right" style="color: #34d399; font-size: 0.875rem;"></i>
                        <span style="font-size: 0.5625rem; font-weight: 900; color: #10b981; text-transform: uppercase; letter-spacing: 0.08em;">Presença</span>
                    </div>
                </div>
            </div>

            <!-- Botões de ação manual -->
            <div style="display: flex; justify-content: center; gap: 2.5rem; margin-top: 2rem; width: 100%;">
                <button onclick="frequenciaView.registrarFrequenciaSwipe('${aluno.id}', 'F')"
                        style="width: 5rem; height: 5rem; border-radius: 50%; background-color: #ef4444; color: white;
                               border: none; font-size: 1.625rem; display: flex; align-items: center; justify-content: center;
                               cursor: pointer; box-shadow: 0 12px 24px rgba(239,68,68,0.35);
                               transition: transform 0.15s ease, box-shadow 0.15s ease;"
                        onmouseover="this.style.transform='scale(1.12)'; this.style.boxShadow='0 16px 32px rgba(239,68,68,0.45)';"
                        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 12px 24px rgba(239,68,68,0.35)';">
                    <i class="fas fa-times"></i>
                </button>
                <button onclick="frequenciaView.registrarFrequenciaSwipe('${aluno.id}', 'P')"
                        style="width: 5rem; height: 5rem; border-radius: 50%; background-color: #10b981; color: white;
                               border: none; font-size: 1.625rem; display: flex; align-items: center; justify-content: center;
                               cursor: pointer; box-shadow: 0 12px 24px rgba(16,185,129,0.35);
                               transition: transform 0.15s ease, box-shadow 0.15s ease;"
                        onmouseover="this.style.transform='scale(1.12)'; this.style.boxShadow='0 16px 32px rgba(16,185,129,0.45)';"
                        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 12px 24px rgba(16,185,129,0.35)';">
                    <i class="fas fa-check"></i>
                </button>
            </div>
        `;
        this.vincularEventosSwipe(aluno.id);
    },

    vincularEventosSwipe(alunoId) {
        const card = document.getElementById('chamada-card');
        const overlay = document.getElementById('chamada-rapida-overlay');
        if (!card) return;

        let isDragging = false;

        const handleStart = (e) => {
            isDragging = true;
            this.startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
            card.style.transition = 'none';
            card.style.cursor = 'grabbing';
        };

        const handleMove = (e) => {
            if (!isDragging || !this.startX) return;
            const currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const diffX = currentX - this.startX;
            const rotation = diffX / 18;
            card.style.transform = `translateX(${diffX}px) rotate(${rotation}deg)`;
            if (diffX > 60) overlay.style.backgroundColor = 'rgba(5, 150, 105, 0.82)';
            else if (diffX < -60) overlay.style.backgroundColor = 'rgba(220, 38, 38, 0.82)';
            else overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
        };

        const handleEnd = (e) => {
            if (!isDragging) return;
            isDragging = false;
            card.style.cursor = 'grab';
            const clientX = e.type === 'touchend'
                ? (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0)
                : e.clientX;
            const diffX = clientX - this.startX;
            this.startX = 0;

            if (diffX > 100) {
                this.registrarFrequenciaSwipe(alunoId, 'P');
            } else if (diffX < -100) {
                this.registrarFrequenciaSwipe(alunoId, 'F');
            } else {
                // Snap back
                card.style.transition = 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                card.style.transform = '';
                overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
            }
        };

        // Touch
        card.addEventListener('touchstart', handleStart, { passive: true });
        card.addEventListener('touchmove', handleMove, { passive: true });
        card.addEventListener('touchend', handleEnd);

        // Mouse (attach move/up to window so drag works even outside card bounds)
        card.addEventListener('mousedown', handleStart);
        const mouseMoveHandler = (e) => handleMove(e);
        const mouseUpHandler = (e) => {
            handleEnd(e);
            window.removeEventListener('mousemove', mouseMoveHandler);
            window.removeEventListener('mouseup', mouseUpHandler);
        };
        card.addEventListener('mousedown', () => {
            window.addEventListener('mousemove', mouseMoveHandler);
            window.addEventListener('mouseup', mouseUpHandler);
        });
    },

    registrarFrequenciaSwipe(alunoId, status) {
        const card = document.getElementById('chamada-card');
        const overlay = document.getElementById('chamada-rapida-overlay');
        const ano = this.currentDate.getFullYear();
        const mesFmt = (this.currentDate.getMonth() + 1).toString().padStart(2, '0');
        const diaFmt = this.currentDate.getDate().toString().padStart(2, '0');
        const dataIso = `${ano}-${mesFmt}-${diaFmt}`;

        if (model.registrarFrequencia) {
            model.registrarFrequencia(this.currentTurmaId, alunoId, dataIso, status);
        } else if (model.setFrequencia) {
            model.setFrequencia(this.currentTurmaId, alunoId, dataIso, status);
        }

        if (card) {
            const flyX = status === 'P' ? '120vw' : '-120vw';
            const flyRot = status === 'P' ? '45deg' : '-45deg';
            card.style.transition = 'all 0.38s cubic-bezier(0.55, 0, 1, 0.45)';
            card.style.transform = `translateX(${flyX}) rotate(${flyRot})`;
            card.style.opacity = '0';
        }

        setTimeout(() => {
            this.alunoIndex++;
            if (overlay) overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
            this.renderProximoAluno();
        }, 320);
    },

    finalizarChamada() {
        this.chamadaAtiva = false;
        const overlay = document.getElementById('chamada-rapida-overlay');
        if (overlay) overlay.style.display = 'none';
        Toast.show('Chamada concluída e salva!', 'success');
        this.render('view-container');
    },

    renderTabela(turma, ano, mes, diasNoMes) {
        let headerDias = '';
        const hoje = new Date();

        for (let d = 1; d <= diasNoMes; d++) {
            const dataObj = new Date(ano, mes, d);
            const diaSemana = dataObj.getDay();
            const isFimDeSemana = diaSemana === 0 || diaSemana === 6;
            const letraSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][diaSemana];
            const isHoje = hoje.getDate() === d && hoje.getMonth() === mes && hoje.getFullYear() === ano;

            headerDias += `
                <div ${isHoje ? 'id="dia-hoje"' : ''} 
                     style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 40px; height: 3.5rem; border-right: 1px solid var(--color-slate-100); ${isFimDeSemana ? 'background-color: var(--color-slate-50);' : ''} ${isHoje ? 'background-color: var(--color-primary-light); color: var(--color-primary);' : ''}">
                    <span style="font-size: 0.625rem; font-weight: 800; color: var(--color-slate-400);">${letraSemana}</span>
                    <span style="font-size: 0.875rem; font-weight: 800; color: ${isHoje ? 'var(--color-primary)' : 'var(--color-slate-700)'};">${d}</span>
                </div>
            `;
        }

        const alunosOrdenados = window.ordenarEstudantes
            ? window.ordenarEstudantes(turma.alunos.filter(a => a.status !== 'transferido'), 'chamada_asc')
            : [...turma.alunos]
                .filter(a => a.status !== 'transferido')
                .sort((a, b) => (a.nome || '').localeCompare((b.nome || ''), 'pt-BR', { sensitivity: 'base' }));

        let alunosEmRiscoLDB = 0;
        const larguraAluno = this.obterLarguraColunaAluno();

        const linhasAlunos = alunosOrdenados.map(aluno => {
            let colunas = '';
            for (let d = 1; d <= diasNoMes; d++) {
                const mesFmt = (mes + 1).toString().padStart(2, '0');
                const diaFmt = d.toString().padStart(2, '0');
                const dataIso = `${ano}-${mesFmt}-${diaFmt}`;
                const status = (aluno.frequencia || {})[dataIso];
                const dataObj = new Date(ano, mes, d);
                const isFimDeSemana = dataObj.getDay() === 0 || dataObj.getDay() === 6;
                const isHoje = hoje.getDate() === d && hoje.getMonth() === mes && hoje.getFullYear() === ano;

                let cellBg = '';
                if (isHoje) cellBg = 'background-color: rgba(239, 246, 255, 0.4);';
                else if (isFimDeSemana) cellBg = 'background-color: rgba(248, 250, 252, 0.4);';

                colunas += `
                    <div onclick="frequenciaView.toggleStatus('${turma.id}', '${aluno.id}', '${dataIso}', this)"
                         style="min-width: 40px; height: 3rem; border-right: 1px solid var(--color-slate-100); display: flex; align-items: center; justify-content: center; cursor: pointer; ${cellBg}"
                         title="${window.escapeHTML(aluno.nome)} - ${d}/${mes + 1}">
                         ${this.getIconeStatus(status)}
                    </div>
                `;
            }

            // Cálculo de percentual de faltas para alerta legal LDB
            const freqObj = aluno.frequencia || {};
            let totalReg = 0;
            let totalFaltas = 0;
            Object.values(freqObj).forEach(val => {
                if (val === 'P' || val === 'F' || val === 'J') totalReg++;
                if (val === 'F') totalFaltas++;
            });
            const pctFaltas = totalReg > 0 ? Math.round((totalFaltas / totalReg) * 100) : 0;

            let badgeRisco = '';
            if (totalReg >= 5 && pctFaltas >= 25) {
                alunosEmRiscoLDB++;
                badgeRisco = `
                    <button type="button" onclick="frequenciaView.gerarFichaBuscaAtiva('${aluno.id}')" 
                            style="background-color: #fee2e2; color: #dc2626; border: 1px solid #fecaca; font-size: 0.625rem; font-weight: 900; padding: 0.15rem 0.375rem; border-radius: 0.375rem; margin-left: auto; display: inline-flex; align-items: center; gap: 0.25rem; flex-shrink: 0; cursor: pointer;" 
                            title="Clique para emitir Notificação do Conselho Tutelar (Busca Ativa)">
                        <i class="fas fa-file-export"></i> Busca Ativa (${pctFaltas}%)
                    </button>
                `;
            } else if (totalReg >= 5 && pctFaltas >= 18) {
                badgeRisco = `
                    <span style="background-color: #fef3c7; color: #d97706; border: 1px solid #fde68a; font-size: 0.625rem; font-weight: 800; padding: 0.125rem 0.375rem; border-radius: 0.375rem; margin-left: auto; display: inline-flex; align-items: center; gap: 0.25rem; flex-shrink: 0;" title="Atenção: ${pctFaltas}% de faltas (Aproximando do limite LDB)">
                        <i class="fas fa-clock"></i> ${pctFaltas}%
                    </span>
                `;
            }

            return `
                <div style="display: flex; align-items: center; border-bottom: 1px solid var(--color-slate-100); background-color: var(--color-white);">
                    <div class="col-aluno-sticky" style="padding: var(--spacing-3); border-right: 1px solid var(--color-slate-200); background-color: var(--color-white); z-index: 10; display: flex; align-items: center; gap: var(--spacing-2);">
                        <div style="width: 1.75rem; height: 1.75rem; border-radius: 50%; background-color: var(--color-slate-100); display: flex; align-items: center; justify-content: center; color: var(--color-slate-600); font-size: 0.6875rem; font-weight: 800; border: 1px solid var(--color-slate-200); flex-shrink: 0;">
                            ${aluno.nome.charAt(0)}
                        </div>
                        <span style="font-size: 0.8125rem; font-weight: 600; color: var(--color-slate-700); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0;">${window.escapeHTML(aluno.nome)}</span>
                        ${badgeRisco}
                    </div>
                    ${colunas}
                </div>
            `;
        }).join('');

        const bannerRiscoHtml = alunosEmRiscoLDB > 0 ? `
            <div style="background: linear-gradient(135deg, #fef2f2, #fff1f2); border-left: 4px solid #ef4444; border-radius: 1rem; padding: 0.875rem 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; box-shadow: 0 4px 12px rgba(239,68,68,0.06); margin-bottom: var(--spacing-4);">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 2.25rem; height: 2.25rem; border-radius: 0.75rem; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 1.125rem;">
                        <i class="fas fa-bell"></i>
                    </div>
                    <div>
                        <h4 style="font-weight: 800; color: #991b1b; font-size: 0.875rem; margin: 0;">Alerta de Infrequência Escolar (LDB Art. 24)</h4>
                        <p style="font-size: 0.75rem; color: #b91c1c; margin: 0.125rem 0 0 0;">Existem <strong>${alunosEmRiscoLDB} estudante(s)</strong> que atingiram ou superaram 25% de faltas nesta turma.</p>
                    </div>
                </div>
                <span class="badge" style="background: #ef4444; color: white; font-weight: 800; font-size: 0.6875rem; padding: 0.375rem 0.75rem; border-radius: 9999px; white-space: nowrap;">Busca Ativa Recomendada</span>
            </div>
        ` : '';

        if (alunosOrdenados.length === 0) {
            return `
                <div class="card" style="padding: 4rem 2rem; text-align: center; color: var(--color-slate-400);">
                    <i class="fas fa-user-slash" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
                    <p>Nenhum aluno ativo nesta turma.</p>
                </div>
            `;
        }

        return `
            ${bannerRiscoHtml}
            <div id="tabela-frequencia-container" class="card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column; position: relative; --col-aluno-width: ${larguraAluno};">
                
                <!-- STICKY HEADER -->
                <div style="display: flex; border-bottom: 1px solid var(--color-slate-200); background-color: var(--color-slate-50); position: sticky; top: 0; z-index: 20;">
                    <div class="col-aluno-sticky" style="padding: var(--spacing-3); border-right: 1px solid var(--color-slate-200); background-color: var(--color-slate-50); z-index: 30; display: flex; align-items: flex-end; justify-content: space-between; position: relative;">
                        <span style="font-size: 0.75rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase; letter-spacing: 0.05em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Estudante</span>
                        <div id="resizer-col-aluno" class="col-resizer-handle" title="Arraste para ajustar a largura da coluna de alunos"></div>
                    </div>
                    <div id="header-dias" style="display: flex; overflow: hidden; flex: 1;">
                        ${headerDias}
                    </div>
                </div>

                <!-- SCROLLABLE ROWS -->
                <div id="scroll-frequencia" 
                     onscroll="document.getElementById('header-dias').scrollLeft = this.scrollLeft"
                     class="custom-scrollbar"
                     style="overflow: auto; flex: 1; position: relative;">
                    <div style="min-width: fit-content;">
                        ${linhasAlunos}
                    </div>
                </div>

                <!-- FOOTER LEGEND -->
                <div style="padding: var(--spacing-3) var(--spacing-6); background-color: var(--color-slate-50); border-top: 1px solid var(--color-slate-200); display: flex; gap: var(--spacing-4); font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase; letter-spacing: 0.05em; justify-content: flex-end;">
                    <div style="display: flex; align-items: center; gap: 0.375rem;"><div style="width: 0.75rem; height: 0.75rem; border-radius: 50%; background-color: #d1fae5; border: 1px solid #6ee7b7;"></div> Presente (P)</div>
                    <div style="display: flex; align-items: center; gap: 0.375rem;"><div style="width: 0.75rem; height: 0.75rem; border-radius: 50%; background-color: #fee2e2; border: 1px solid #fca5a5;"></div> Falta (F)</div>
                    <div style="display: flex; align-items: center; gap: 0.375rem;"><div style="width: 0.75rem; height: 0.75rem; border-radius: 50%; background-color: #fef3c7; border: 1px solid #fcd34d;"></div> Justificada (J)</div>
                </div>
            </div>
        `;
    },

    getIconeStatus(status) {
        if (status === 'P') {
            return `<div style="width: 1.5rem; height: 1.5rem; border-radius: var(--radius-md); background-color: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center; font-size: 0.6875rem; font-weight: 900; border: 1px solid #a7f3d0;">P</div>`;
        }
        if (status === 'F') {
            return `<div style="width: 1.5rem; height: 1.5rem; border-radius: var(--radius-md); background-color: #fef2f2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 0.6875rem; font-weight: 900; border: 1px solid #fecaca;">F</div>`;
        }
        if (status === 'J') {
            return `<div style="width: 1.5rem; height: 1.5rem; border-radius: var(--radius-md); background-color: #fffbeb; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 0.6875rem; font-weight: 900; border: 1px solid #fde68a;">J</div>`;
        }
        return `<div style="width: 0.375rem; height: 0.375rem; border-radius: 50%; background-color: var(--color-slate-200);"></div>`;
    },

    toggleStatus(turmaId, alunoId, dataIso, el) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        const aluno = turma.alunos.find(a => String(a.id) === String(alunoId));
        if (!aluno) return;

        const statusAtual = (aluno.frequencia || {})[dataIso];
        let novoStatus = 'P';
        if (statusAtual === 'P') novoStatus = 'F';
        else if (statusAtual === 'F') novoStatus = 'J';
        else if (statusAtual === 'J') novoStatus = null;

        if (model.registrarFrequencia) {
            model.registrarFrequencia(turmaId, alunoId, dataIso, novoStatus);
        } else if (model.setFrequencia) {
            model.setFrequencia(turmaId, alunoId, dataIso, novoStatus);
        }

        el.innerHTML = this.getIconeStatus(novoStatus);
    },

    // =========================================================================
    // IMPRESSÃO DE CHAMADA MENSAL (A4 LANDSCAPE)
    // =========================================================================

    imprimir() {
        this.abrirModalImprimirChamada();
    },

    abrirModalImprimirChamada() {
        const html = `
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                <p style="font-size: 0.9375rem; color: #475569; font-weight: 600;">Selecione o tipo de impressão da Folha de Chamada Mensal A4:</p>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
                    <div onclick="frequenciaView.gerarImpressaoMensal('branco')" class="card interactive-element" style="padding: 1.25rem; cursor: pointer; border: 2px solid var(--color-slate-200); text-align: center; background: #fff;">
                        <i class="fas fa-print" style="font-size: 2rem; color: #3b82f6; margin-bottom: 0.75rem;"></i>
                        <h4 style="font-size: 1rem; font-weight: 800; color: #1e293b; margin-bottom: 0.25rem;">Folha em Branco (Manual)</h4>
                        <p style="font-size: 0.8125rem; color: #64748b;">Para imprimir e realizar a chamada em sala com lápis/caneta.</p>
                    </div>
                    <div onclick="frequenciaView.gerarImpressaoMensal('preenchido')" class="card interactive-element" style="padding: 1.25rem; cursor: pointer; border: 2px solid var(--color-slate-200); text-align: center; background: #fff;">
                        <i class="fas fa-file-invoice" style="font-size: 2rem; color: #059669; margin-bottom: 0.75rem;"></i>
                        <h4 style="font-size: 1rem; font-weight: 800; color: #1e293b; margin-bottom: 0.25rem;">Folha Preenchida (Sistema)</h4>
                        <p style="font-size: 0.8125rem; color: #64748b;">Imprime os registros de presença/falta já lançados neste mês.</p>
                    </div>
                </div>
            </div>
        `;
        controller.openModal('Imprimir Diário / Chamada Mensal', html, 'lg');
    },

    gerarImpressaoMensal(modo) {
        controller.closeModal();
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(this.currentTurmaId));
        if (!turma) return Toast.show("Selecione uma turma.", "warning");

        const alunos = window.ordenarEstudantes ? window.ordenarEstudantes(turma.alunos || [], 'chamada_asc') : (turma.alunos || []);
        const ano = this.currentDate.getFullYear();
        const mes = this.currentDate.getMonth();
        const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(this.currentDate);
        const diasNoMes = new Date(ano, mes + 1, 0).getDate();
        const config = model.state.userConfig || {};
        const escola = config.school || config.escola || 'Unidade Escolar';

        let diasHeader = '';
        for (let d = 1; d <= diasNoMes; d++) {
            diasHeader += `<th style="border: 1px solid #cbd5e1; padding: 2px; text-align: center; font-size: 0.65rem; width: 22px;">${d}</th>`;
        }

        let linhasHtml = '';
        alunos.forEach((aluno, idx) => {
            const numChamada = aluno.chamada || (idx + 1);
            let celulasDias = '';

            for (let d = 1; d <= diasNoMes; d++) {
                let val = '';
                if (modo === 'preenchido') {
                    const diaFormatted = String(d).padStart(2, '0');
                    const mesFormatted = String(mes + 1).padStart(2, '0');
                    const dataIso = `${ano}-${mesFormatted}-${diaFormatted}`;
                    const st = (aluno.frequencia || {})[dataIso];
                    if (st === 'P') val = '<span style="color: #059669; font-weight: 800;">P</span>';
                    else if (st === 'F') val = '<span style="color: #dc2626; font-weight: 800;">F</span>';
                    else if (st === 'J') val = '<span style="color: #d97706; font-weight: 800;">J</span>';
                }
                celulasDias += `<td style="border: 1px solid #cbd5e1; text-align: center; font-size: 0.7rem; height: 22px;">${val}</td>`;
            }

            linhasHtml += `
                <tr>
                    <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-weight: 700; font-size: 0.75rem;">${numChamada}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 4px; font-weight: 600; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">${window.escapeHTML(aluno.nome)}</td>
                    ${celulasDias}
                </tr>
            `;
        });

        const printWindow = window.open('', '_blank');
        if (!printWindow) return Toast.show("Permita pop-ups para visualizar a impressão.", "warning");

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Folha de Chamada Mensal — ${window.escapeHTML(turma.nome)}</title>
                <style>
                    @page { size: A4 landscape; margin: 10mm; }
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 0; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
                    .header h2 { margin: 0; font-size: 1.1rem; text-transform: uppercase; }
                    .header p { margin: 2px 0 0 0; font-size: 0.8rem; color: #475569; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; table-layout: fixed; }
                    th { background-color: #f1f5f9; color: #1e293b; font-weight: 800; }
                    .footer { display: flex; justify-content: space-between; font-size: 0.75rem; color: #64748b; margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h2>${window.escapeHTML(escola)} — Folha de Chamada Mensal</h2>
                        <p><strong>Turma:</strong> ${window.escapeHTML(turma.nome)} &nbsp;|&nbsp; <strong>Mês/Ano:</strong> ${nomeMes.toUpperCase()} / ${ano}</p>
                    </div>
                    <div style="text-align: right; font-size: 0.75rem; color: #475569;">
                        <p><strong>Modo:</strong> ${modo === 'branco' ? 'Preenchimento Manual (Papel)' : 'Registros do Sistema'}</p>
                        <p>Legenda: P = Presença | F = Falta | J = Justificada</p>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="border: 1px solid #cbd5e1; padding: 4px; width: 35px;">Nº</th>
                            <th style="border: 1px solid #cbd5e1; padding: 4px; width: 190px; text-align: left;">Estudante</th>
                            ${diasHeader}
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasHtml}
                    </tbody>
                </table>

                <div class="footer">
                    <span>Documento emitido via Planner Pro Docente em ${new Date().toLocaleDateString('pt-BR')}</span>
                    <span>Assinatura do Professor: _____________________________________________</span>
                </div>

                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    // =========================================================================
    // RELATÓRIO OFICIAL DE BUSCA ATIVA ESCOLAR (CONSELHO TUTELAR A4)
    // =========================================================================

    gerarFichaBuscaAtiva(alunoId) {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(this.currentTurmaId));
        if (!turma) return Toast.show("Selecione uma turma.", "warning");

        const aluno = (turma.alunos || []).find(a => String(a.id) === String(alunoId));
        if (!aluno) return Toast.show("Estudante não encontrado.", "warning");

        const config = model.state.userConfig || {};
        const escola = config.school || config.escola || 'Unidade Escolar';
        const anoLetivo = config.anoLetivo || new Date().getFullYear();

        const freqObj = aluno.frequencia || {};
        let totalReg = 0, totalFaltas = 0, totalPresencas = 0, totalJustificadas = 0;
        Object.values(freqObj).forEach(val => {
            if (val === 'P' || val === 'F' || val === 'J') totalReg++;
            if (val === 'P') totalPresencas++;
            if (val === 'F') totalFaltas++;
            if (val === 'J') totalJustificadas++;
        });

        const pctFaltas = totalReg > 0 ? Math.round((totalFaltas / totalReg) * 100) : 0;
        const pctFreq = totalReg > 0 ? Math.round(((totalReg - totalFaltas) / totalReg) * 100) : 100;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return Toast.show("Permita pop-ups para visualizar a notificação.", "warning");

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Ficha de Notificação de Busca Ativa Escolar — ${window.escapeHTML(aluno.nome)}</title>
                <style>
                    @page { size: A4 portrait; margin: 12mm; }
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 0; }
                    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px; }
                    .header h1 { font-size: 1.1rem; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }
                    .header h2 { font-size: 0.9rem; margin: 4px 0 0 0; color: #475569; font-weight: 700; text-transform: uppercase; }
                    .alert-box { background: #fef2f2; border: 1.5px solid #ef4444; border-radius: 6px; padding: 10px; margin-bottom: 16px; font-size: 0.8rem; color: #991b1b; }
                    .section { margin-bottom: 16px; }
                    .section-title { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px; color: #1e293b; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem; }
                    .field { background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 4px; }
                    .field label { font-size: 0.65rem; font-weight: 800; color: #64748b; text-transform: uppercase; display: block; }
                    .field span { font-weight: 700; color: #0f172a; }
                    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 0.75rem; }
                    th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: center; }
                    th { background: #f1f5f9; font-weight: 800; }
                    .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; text-align: center; font-size: 0.75rem; }
                    .linha-ass { border-top: 1px solid #0f172a; padding-top: 4px; font-weight: 700; }
                    .footer { font-size: 0.65rem; color: #94a3b8; margin-top: 20px; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>ESTADO / MUNICÍPIO — SECRETARIA DE EDUCAÇÃO</h1>
                    <h2>${window.escapeHTML(escola)} — RELATÓRIO OFICIAL DE BUSCA ATIVA ESCOLAR</h2>
                    <p style="font-size: 0.75rem; margin: 4px 0 0 0; color: #64748b;">Notificação Formal de Infrequência Escolar Grave (Lei Nº 13.803/2019 e LDB Art. 24, VI)</p>
                </div>

                <div class="alert-box">
                    <strong>⚠️ ALERTA LEGAL DE EVASÃO ESCOLAR:</strong> O estudante abaixo identificado atingiu um índice de faltas de <strong>${pctFaltas}%</strong> (Frequência acumulada de ${pctFreq}%), ultrapassando o limite legal de infrequência permitido por lei. Este relatório deve ser encaminhado com urgência ao Conselho Tutelar e à Equipe de Busca Ativa.
                </div>

                <div class="section">
                    <div class="section-title">1. Identificação do Estudante e da Turma</div>
                    <div class="grid">
                        <div class="field"><label>Nome do Estudante</label><span>${window.escapeHTML(aluno.nome)}</span></div>
                        <div class="field"><label>Matrícula / ID</label><span>${aluno.matricula || aluno.id}</span></div>
                        <div class="field"><label>Turma / Ano Letivo</label><span>${window.escapeHTML(turma.nome)} (${anoLetivo})</span></div>
                        <div class="field"><label>Responsável Legal</label><span>${window.escapeHTML(aluno.responsavel || 'Não cadastrado')}</span></div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">2. Consolidado da Frequência Escolar</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Aulas Registradas</th>
                                <th>Presenças (P)</th>
                                <th>Faltas (F)</th>
                                <th>Faltas Justificadas (J)</th>
                                <th>% Frequência</th>
                                <th>Status LDB</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${totalReg}</td>
                                <td>${totalPresencas}</td>
                                <td style="color: #dc2626; font-weight: 800;">${totalFaltas}</td>
                                <td>${totalJustificadas}</td>
                                <td style="font-weight: 800;">${pctFreq}%</td>
                                <td style="color: #dc2626; font-weight: 800;">Infrequência Crítica (${pctFaltas}% Faltas)</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">3. Providências e Contatos Prévios da Escola</div>
                    <div style="border: 1px solid #cbd5e1; padding: 10px; border-radius: 4px; font-size: 0.75rem; color: #334155; min-height: 80px;">
                        <p style="margin: 0 0 6px 0;"><strong>Tentativas de Contato com a Família / Responsável:</strong></p>
                        <p style="margin: 0; color: #64748b;">( &nbsp; ) Ligação telefônica &nbsp;&nbsp;&nbsp; ( &nbsp; ) Mensagem por aplicativo &nbsp;&nbsp;&nbsp; ( &nbsp; ) Visita domiciliar &nbsp;&nbsp;&nbsp; ( &nbsp; ) Reunião presencial</p>
                        <br>
                        <p style="margin: 0;"><strong>Observações do Docente / Orientação Pedagógica:</strong> __________________________________________________________________________________________________________________________________________________________________</p>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">4. Encaminhamento ao Conselho Tutelar</div>
                    <p style="font-size: 0.75rem; color: #475569; margin: 0;">
                        Solicita-se a intervenção do Conselho Tutelar competente para a realização de visita domiciliar e aplicação das medidas de proteção previstas no Estatuto da Criança e do Adolescente (ECA, Lei nº 8.069/1990).
                    </p>
                </div>

                <div class="assinaturas">
                    <div>
                        <div class="linha-ass">Professor(a) Titular / Regente</div>
                    </div>
                    <div>
                        <div class="linha-ass">Direção / Coordenação Pedagógica</div>
                    </div>
                </div>

                <div class="footer">
                    Documento gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')} via Planner Pro Docente — Sistema de Gestão de Ensino Integrado
                </div>

                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    // =========================================================================
    // REGISTRO DE CONTEÚDO MINISTRADO E HABILIDADE BNCC POR AULA
    // =========================================================================

    abrirModalConteudoMinistrado() {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(this.currentTurmaId));
        if (!turma) return Toast.show("Selecione uma turma.", "warning");

        const dataStr = this.currentDate.toISOString().split('T')[0];

        const modalHtml = `
            <div id="modal-conteudo-aula" class="modal-overlay modal-enter" style="display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 9999;">
                <div class="card p-6" style="max-width: 540px; width: 90%; background: var(--color-white); border-radius: var(--radius-2xl); box-shadow: var(--shadow-2xl); border: 1px solid var(--color-slate-200);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-pen-nib" style="color: var(--color-primary);"></i> Registro de Conteúdo Ministrado
                        </h3>
                        <button type="button" onclick="document.getElementById('modal-conteudo-aula').remove()" class="btn-icon" style="border: none; background: none; cursor: pointer; color: var(--color-slate-400);">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <p style="font-size: 0.875rem; color: var(--color-slate-600); margin-bottom: 1rem;">
                        Turma: <strong>${window.escapeHTML(turma.nome)}</strong>
                    </p>

                    <form id="form-conteudo-aula" onsubmit="event.preventDefault(); frequenciaView.salvarConteudoMinistrado('${turma.id}');">
                        <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div>
                                    <label class="form-label" style="font-weight: 700;">Data da Aula</label>
                                    <input type="date" id="ca-data" class="form-input" required value="${dataStr}" />
                                </div>
                                <div>
                                    <label class="form-label" style="font-weight: 700;">Habilidade BNCC</label>
                                    <input type="text" id="ca-bncc" class="form-input" placeholder="Ex: EF05LP01, EF09MA02" />
                                </div>
                            </div>

                            <div>
                                <label class="form-label" style="font-weight: 700;">Conteúdo Lecionado / Objeto de Conhecimento</label>
                                <textarea id="ca-conteudo" class="form-input" rows="3" required placeholder="Descreva os tópicos explicados e atividades realizadas na aula..."></textarea>
                            </div>

                            <div>
                                <label class="form-label" style="font-weight: 700;">Tarefa de Casa / Orientação de Estudo (Opcional)</label>
                                <input type="text" id="ca-tarefa" class="form-input" placeholder="Ex: Exercícios 1 a 5 da página 42 do livro..." />
                            </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <button type="button" onclick="frequenciaView.imprimirDiarioConteudoA4('${turma.id}')" class="btn-secondary" style="font-size: 0.75rem;">
                                <i class="fas fa-print"></i> Relatório A4 Diário
                            </button>
                            <div style="display: flex; gap: 0.75rem;">
                                <button type="button" onclick="document.getElementById('modal-conteudo-aula').remove()" class="btn-secondary">Cancelar</button>
                                <button type="submit" class="btn-primary">
                                    <i class="fas fa-save"></i> Salvar Conteúdo
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    salvarConteudoMinistrado(turmaId) {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(turmaId));
        if (!turma) return;

        const dataInput = document.getElementById('ca-data');
        const bnccInput = document.getElementById('ca-bncc');
        const contInput = document.getElementById('ca-conteudo');
        const tarInput = document.getElementById('ca-tarefa');

        const dataVal = dataInput ? dataInput.value : new Date().toISOString().split('T')[0];
        const bnccVal = bnccInput ? bnccInput.value.trim() : '';
        const contVal = contInput ? contInput.value.trim() : '';
        const tarVal = tarInput ? tarInput.value.trim() : '';

        if (!contVal) return Toast.show("Descreva o conteúdo lecionado.", "warning");

        if (!Array.isArray(turma.diarioConteudo)) turma.diarioConteudo = [];

        const novoRegistro = {
            id: Date.now(),
            data: dataVal,
            bncc: bnccVal,
            conteudo: contVal,
            tarefa: tarVal
        };

        turma.diarioConteudo.push(novoRegistro);

        if (model.saveTurma) {
            model.saveTurma(turma);
        } else {
            model.saveLocal();
        }

        const modal = document.getElementById('modal-conteudo-aula');
        if (modal) modal.remove();

        Toast.show("Conteúdo ministrado registrado com sucesso!", "success");
    },

    imprimirDiarioConteudoA4(turmaId) {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(turmaId));
        if (!turma) return Toast.show("Selecione uma turma.", "warning");

        const config = model.state.userConfig || {};
        const escola = config.school || config.escola || 'Unidade Escolar';
        const anoLetivo = config.anoLetivo || new Date().getFullYear();
        const diario = turma.diarioConteudo || [];

        if (diario.length === 0) return Toast.show("Nenhum conteúdo registrado para esta turma.", "info");

        const printWindow = window.open('', '_blank');
        if (!printWindow) return Toast.show("Permita pop-ups para visualizar a impressão.", "warning");

        const linhasHtml = diario.map((d, i) => `
            <tr>
                <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: 700;">${window.escapeHTML(d.conteudo)}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; color: #4338ca; font-weight: 800;">${window.escapeHTML(d.bncc || '-')}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px; color: #475569;">${window.escapeHTML(d.tarefa || '-')}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Diário de Conteúdos Ministrados — ${window.escapeHTML(turma.nome)}</title>
                <style>
                    @page { size: A4 portrait; margin: 12mm; }
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 0; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 16px; }
                    .header h2 { margin: 0; font-size: 1.1rem; text-transform: uppercase; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 0.75rem; }
                    th { background: #f1f5f9; font-weight: 800; border: 1px solid #cbd5e1; padding: 6px; text-align: center; }
                    .assinaturas { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; margin-top: 40px; text-align: center; font-size: 0.75rem; }
                    .linha-ass { border-top: 1px solid #0f172a; padding-top: 4px; font-weight: 700; }
                    .footer { font-size: 0.65rem; color: #94a3b8; margin-top: 20px; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h2>${window.escapeHTML(escola)} — DIÁRIO DE CONTEÚDOS MINISTRADOS</h2>
                        <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #475569;"><strong>Turma:</strong> ${window.escapeHTML(turma.nome)} &nbsp;|&nbsp; <strong>Ano Letivo:</strong> ${anoLetivo}</p>
                    </div>
                    <div style="font-size: 0.75rem; color: #475569;">
                        Emissão: ${new Date().toLocaleDateString('pt-BR')}
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 80px;">Data</th>
                            <th style="text-align: left;">Conteúdo Lecionado / Objeto de Conhecimento</th>
                            <th style="width: 100px;">Habilidade BNCC</th>
                            <th style="text-align: left;">Tarefa de Casa / Atividade</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasHtml}
                    </tbody>
                </table>

                <div class="assinaturas">
                    <div><div class="linha-ass">Professor(a) Regente</div></div>
                    <div><div class="linha-ass">Coordenação Pedagógica</div></div>
                </div>

                <div class="footer">
                    Documento emitido via Planner Pro Docente
                </div>

                <script>
                    if (document.readyState === 'complete' || document.readyState === 'interactive') {
                        setTimeout(() => window.print(), 250);
                    } else {
                        window.addEventListener('DOMContentLoaded', () => setTimeout(() => window.print(), 250));
                        setTimeout(() => window.print(), 800);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    estadoVazio() {
        return `
            <div class="card" style="padding: 5rem 2rem; text-align: center; max-width: 32rem; margin: 3rem auto; border-radius: var(--radius-2xl);">
                <div style="width: 4rem; height: 4rem; border-radius: 50%; background-color: var(--color-slate-100, #f1f5f9); color: var(--color-slate-400, #94a3b8); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; margin: 0 auto 1.25rem;">
                    <i class="fas fa-users-slash"></i>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-700, #334155); margin-bottom: 0.5rem;">Nenhuma turma selecionada</h3>
                <p style="color: var(--color-slate-500, #64748b); font-size: 0.875rem; margin-bottom: 1.5rem; line-height: 1.5;">
                    Selecione uma turma no menu superior ou cadastre novas turmas para gerenciar a frequência e chamadas dos estudantes.
                </p>
                <button type="button" onclick="controller.navigate('turmas')" class="btn-primary interactive-element" style="padding: 0.625rem 1.5rem; font-weight: 700; background-color: #4f46e5; margin: 0 auto; display: inline-flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-chalkboard-teacher"></i> <span>Gerenciar Turmas</span>
                </button>
            </div>
        `;
    }
};