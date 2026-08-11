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

        const html = `
            <div class="animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8); height: 100%;">
                
                <!-- TOP HEADER & CONTROLS TOOLBAR -->
                <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em; display: flex; align-items: center; gap: var(--spacing-2);">
                            <i class="fas fa-clipboard-check" style="color: var(--color-primary);"></i> Controle de Frequência
                        </h2>
                        <p style="font-size: 0.875rem; color: var(--color-slate-500);">Registro de presença diária e histórico mensal por estudante.</p>
                    </div>

                    <div style="display: flex; align-items: center; gap: var(--spacing-3); flex-wrap: wrap;">
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
        this.autoScrollParaHoje(ano, mes);
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
        this.alunosChamada = [...turma.alunos]
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

        const alunosOrdenados = [...turma.alunos]
            .filter(a => a.status !== 'transferido')
            .sort((a, b) => (a.nome || '').localeCompare((b.nome || ''), 'pt-BR', { sensitivity: 'base' }));

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

            return `
                <div style="display: flex; align-items: center; border-bottom: 1px solid var(--color-slate-100); background-color: var(--color-white);">
                    <div style="width: 16rem; flex-shrink: 0; padding: var(--spacing-3); border-right: 1px solid var(--color-slate-200); position: sticky; left: 0; background-color: var(--color-white); z-index: 10; display: flex; align-items: center; gap: var(--spacing-3); box-shadow: 2px 0 5px -2px rgba(0,0,0,0.05);">
                        <div style="width: 2rem; height: 2rem; border-radius: 50%; background-color: var(--color-slate-100); display: flex; align-items: center; justify-content: center; color: var(--color-slate-600); font-size: 0.75rem; font-weight: 800; border: 1px solid var(--color-slate-200);">
                            ${aluno.nome.charAt(0)}
                        </div>
                        <span style="font-size: 0.875rem; font-weight: 600; color: var(--color-slate-700); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${window.escapeHTML(aluno.nome)}</span>
                    </div>
                    ${colunas}
                </div>
            `;
        }).join('');

        if (alunosOrdenados.length === 0) {
            return `
                <div class="card" style="padding: 4rem 2rem; text-align: center; color: var(--color-slate-400);">
                    <i class="fas fa-user-slash" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
                    <p>Nenhum aluno ativo nesta turma.</p>
                </div>
            `;
        }

        return `
            <div class="card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column; position: relative;">
                
                <!-- STICKY HEADER -->
                <div style="display: flex; border-bottom: 1px solid var(--color-slate-200); background-color: var(--color-slate-50); position: sticky; top: 0; z-index: 20;">
                    <div style="width: 16rem; flex-shrink: 0; padding: var(--spacing-3); border-right: 1px solid var(--color-slate-200); position: sticky; left: 0; background-color: var(--color-slate-50); z-index: 30; display: flex; align-items: flex-end; box-shadow: 2px 0 5px -2px rgba(0,0,0,0.05);">
                        <span style="font-size: 0.75rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase; letter-spacing: 0.05em;">Estudante</span>
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
    }
};