
import { model } from '../model.js';
import { controller } from '../controller.js';
import { calendarioView } from './calendario.js';
export const dashboardView = {
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        const saudacao = this.getSaudacao();
        const pendencias = this.calcularPendencias();
        const aniversariantes = this.buscarAniversariantes();
        const alunosRiscoLDB = this.calcularAlertasLDB();

        const hoje = new Date();
        const dataHojeIso = hoje.toISOString().split('T')[0];

        const turmas = model.state.turmas || [];
        const aulasHoje = turmas.filter(t => {
            const planos = model.state.planosDiarios || {};
            return planos[dataHojeIso] && planos[dataHojeIso][t.id];
        });
        const nomeProf = this.getNomeProf();
        const nomeSafe = window.escapeHTML ? window.escapeHTML(nomeProf) : nomeProf.replace(/[<>]/g, '');
        const html = `
            <div class="fade-in" style="padding-bottom: 5rem; display: flex; flex-direction: column; gap: var(--spacing-8);">
                
                <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: var(--spacing-4); border-bottom: 1px solid var(--color-slate-200); padding-bottom: var(--spacing-6); flex-wrap: wrap;">
                    <div>
                        <h1 style="font-size: 1.875rem; font-weight: 700; color: var(--color-slate-800); letter-spacing: -0.025em;">${saudacao.texto}, ${nomeSafe}!</h1>
                        <p style="color: var(--color-slate-500); margin-top: 0.25rem; display: flex; align-items: center; gap: var(--spacing-2);">
                            <i class="far fa-calendar" style="color: var(--color-primary);"></i>
                            ${hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                    <div style="display: flex; gap: var(--spacing-2);">
                         <button onclick="controller.navigate('dia')" class="btn-primary" style="box-shadow: 0 10px 15px -3px rgba(var(--color-primary-rgb), 0.2);">
                            <i class="fas fa-plus"></i> Novo Diário
                         </button>
                    </div>
                </div>

                ${alunosRiscoLDB > 0 ? `
                    <div class="card" style="background: linear-gradient(135deg, #fef2f2, #fff1f2); border-left: 5px solid #ef4444; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; box-shadow: 0 4px 15px rgba(239,68,68,0.08);">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="width: 2.75rem; height: 2.75rem; border-radius: 0.875rem; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0;">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <div>
                                <h4 style="font-size: 0.9375rem; font-weight: 800; color: #991b1b; margin: 0;">Atenção Pedagógica: Risco de Infrequência (LDB Art. 24)</h4>
                                <p style="font-size: 0.8125rem; color: #b91c1c; margin: 0.25rem 0 0 0;">
                                    Identificamos <strong>${alunosRiscoLDB} estudante(s)</strong> com 25% ou mais de faltas acumuladas nas suas turmas.
                                </p>
                            </div>
                        </div>
                        <button onclick="controller.navigate('frequencia')" class="btn-primary" style="background: #ef4444; border-color: #ef4444; font-size: 0.8125rem; font-weight: 800; padding: 0.5rem 1rem; border-radius: 0.75rem;">
                            <i class="fas fa-clipboard-check"></i> Ver Frequência
                        </button>
                    </div>
                ` : ''}
                <div class="stat-grid stat-grid--3">
                    
                    <!-- Card 1: Situação de Hoje -->
                    <div class="stat-card stat-card--blue">
                        <div class="stat-card__bg-icon">
                            <i class="fas fa-chalkboard-teacher"></i>
                        </div>
                        <h3 class="stat-card__title">Situação de Hoje</h3>
                        <div class="stat-card__content">
                            <div class="stat-card__value">
                                ${aulasHoje.length} / ${turmas.length}
                            </div>
                            <p class="stat-card__desc">Turmas planejadas</p>
                            
                            <div class="stat-card__footer">
                                ${turmas.length === 0
                ? '<span style="font-size: 0.75rem; color: #f97316; font-weight: 600;">Nenhuma turma cadastrada.</span>'
                : aulasHoje.length === turmas.length
                    ? '<span style="font-size: 0.75rem; color: #059669; font-weight: 700; display: flex; align-items: center; gap: 0.25rem;"><i class="fas fa-check-circle"></i> Tudo pronto para hoje!</span>'
                    : `<button onclick="controller.navigate('dia')" style="font-size: 0.75rem; color: var(--color-primary); font-weight: 700; cursor: pointer; text-align: left; background: none; border: none; padding: 0; display: flex; align-items: center; gap: 0.375rem;">
                                             <i class="fas fa-arrow-right"></i> Planejar ${turmas.length - aulasHoje.length} turmas restantes
                                           </button>`
            }
                            </div>
                        </div>
                        <div class="stat-card__bar"></div>
                    </div>
                    <!-- Card 2: Pendências -->
                    <div class="stat-card ${pendencias.total > 0 ? 'stat-card--orange' : 'stat-card--emerald'}">
                        <div class="stat-card__bg-icon">
                            <i class="fas fa-tasks"></i>
                        </div>
                        <h3 class="stat-card__title">Pendências</h3>
                        <div class="stat-card__content">
                            <div class="stat-card__value">
                                ${pendencias.total}
                            </div>
                            <p class="stat-card__desc">${pendencias.total === 1 ? 'Diário atrasado' : 'Diários atrasados'}</p>
                            
                            <div class="stat-card__footer">
                                ${pendencias.total > 0
                ? `<button onclick="controller.navigate('mensal')" style="font-size: 0.75rem; font-weight: 700; color: #ea580c; background-color: #fff7ed; border: 1px solid #ffedd5; padding: 0.375rem 0.75rem; border-radius: var(--radius-lg); width: fit-content; cursor: pointer; transition: background-color var(--transition-fast);" onmouseover="this.style.backgroundColor='#ffedd5'" onmouseout="this.style.backgroundColor='#fff7ed'">
                                         Ver pendências
                                       </button>`
                : '<span style="font-size: 0.75rem; color: #059669; font-weight: 700; display: flex; align-items: center; gap: 0.25rem;"><i class="fas fa-check-circle"></i> Você está em dia!</span>'
            }
                            </div>
                        </div>
                        <div class="stat-card__bar"></div>
                    </div>
                    <!-- Card 3: Aniversariantes -->
                    <div class="stat-card stat-card--pink">
                        <div class="stat-card__bg-icon">
                            <i class="fas fa-birthday-cake"></i>
                        </div>
                        <h3 class="stat-card__title">Aniversariantes (Mês)</h3>
                        <div class="stat-card__content">
                            ${aniversariantes.length > 0
                ? `<div class="avatar-group">
                                    ${aniversariantes.map(a => `
                                        <div class="avatar-group__item" title="${window.escapeHTML(a.nome)}">
                                            ${window.escapeHTML(a.nome.charAt(0))}
                                        </div>
                                     `).join('')}
                                   </div>
                                   <p class="stat-card__desc"><strong style="color: #1e293b; font-weight: 700;">${aniversariantes.length}</strong> alunos celebram este mês.</p>`
                : `<div style="display: flex; flex-direction: column; justify-content: center; height: 5rem;">
                                     <div class="stat-card__value" style="color: var(--color-slate-300);">0</div>
                                     <p class="stat-card__desc" style="font-size: 0.75rem; color: var(--color-slate-400);">Nenhum aniversariante cadastrado.</p>
                                   </div>`
            }
                        </div>
                        <div class="stat-card__bar"></div>
                    </div>
                </div>
                <div style="padding-top: var(--spacing-8); border-top: 1px solid var(--color-slate-200);">
                     <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-4);">
                        <h2 style="font-size: 1.125rem; font-weight: 700; color: var(--color-slate-700);">Calendário Geral</h2>
                     </div>
                     <div id="calendar-wrapper"></div>
                </div>
            </div>
        `;
        container.innerHTML = html;

        setTimeout(() => {
            const calContainer = document.getElementById('calendar-wrapper');
            if (calContainer) {
                calendarioView.render(calContainer);

                const oldHeader = calContainer.querySelector('h1.text-2xl');
                if (oldHeader && oldHeader.parentElement) oldHeader.parentElement.style.display = 'none';
                const oldHello = calContainer.querySelector('h2.text-3xl');
                if (oldHello && oldHello.parentElement) oldHello.parentElement.parentElement.style.display = 'none';
            }
        }, 0);
    },
    getSaudacao() {
        const hora = new Date().getHours();
        if (hora < 12) return { texto: 'Bom dia', icon: 'fa-sun' };
        if (hora < 18) return { texto: 'Boa tarde', icon: 'fa-cloud-sun' };
        return { texto: 'Boa noite', icon: 'fa-moon' };
    },
    getNomeProf() {
        const config = model.state.userConfig || {};
        if (config.profName && config.profName.trim() !== '') {
            return config.profName.split(' ')[0];
        }
        if (model.currentUser && model.currentUser.displayName) {
            return model.currentUser.displayName.split(' ')[0];
        }
        return 'Professor(a)';
    },
    calcularPendencias() {
        let pendencias = 0;
        const hoje = new Date();
        const turmas = model.state.turmas || [];

        if (turmas.length === 0) return { total: 0 };
        for (let i = 1; i <= 3; i++) {
            const d = new Date();
            d.setDate(hoje.getDate() - i);

            if (d.getDay() === 0 || d.getDay() === 6) continue;
            const dataIso = d.toISOString().split('T')[0];

            if (model.state.eventos && model.state.eventos[dataIso]) continue;

            const temDiario = model.state.planosDiarios && model.state.planosDiarios[dataIso];

            if (!temDiario) {
                pendencias++;
            }
        }

        return { total: pendencias };
    },
    buscarAniversariantes() {
        return [];
    },
    calcularAlertasLDB() {
        const turmas = model.state.turmas || [];
        let totalAlunosRisco = 0;

        turmas.forEach(t => {
            (t.alunos || []).forEach(aluno => {
                if (aluno.status === 'transferido') return;
                const freqObj = aluno.frequencia || {};
                let totalReg = 0;
                let totalFaltas = 0;
                Object.values(freqObj).forEach(val => {
                    if (val === 'P' || val === 'F' || val === 'J') totalReg++;
                    if (val === 'F') totalFaltas++;
                });
                if (totalReg >= 5) {
                    const pctFaltas = Math.round((totalFaltas / totalReg) * 100);
                    if (pctFaltas >= 25) {
                        totalAlunosRisco++;
                    }
                }
            });
        });

        return totalAlunosRisco;
    }
};