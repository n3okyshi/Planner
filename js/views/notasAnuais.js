import { model } from '../model.js';
import { controller } from '../controller.js';
import { uiController } from '../controllers/uiController.js';

export const notasAnuaisView = {
    turmaIdSelecionada: null,

    async render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const turmas = model.state.turmas || [];
        const tipo = model.state.userConfig?.periodType || 'bimestre';
        const labelPeriodo = tipo.charAt(0).toUpperCase() + tipo.slice(1);

        if (this.turmaIdSelecionada && !turmas.find(t => String(t.id) === String(this.turmaIdSelecionada))) {
            this.turmaIdSelecionada = null;
        }
        if (!this.turmaIdSelecionada && turmas.length > 0) {
            this.turmaIdSelecionada = turmas[0].id;
        }

        const html = `
            <div class="animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8);">
                
                <!-- TOP HEADER & TOOLBAR -->
                <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em; display: flex; align-items: center; gap: var(--spacing-2);">
                            <i class="fas fa-award" style="color: var(--color-primary);"></i> Notas Anuais & Médias
                        </h2>
                        <p style="font-size: 0.875rem; color: var(--color-slate-500);">Visão consolidada do ano letivo por <strong>${labelPeriodo}</strong> com cálculo de aprovação.</p>
                    </div>

                    <div style="display: flex; align-items: center; gap: var(--spacing-3); flex-wrap: wrap;">
                        <button type="button" onclick="window.print()" class="btn-secondary interactive-element" title="Imprimir Relatório Anual">
                            <i class="fas fa-print"></i> <span>Imprimir</span>
                        </button>

                        <div class="custom-dropdown" style="min-width: 240px;">
                            <input type="hidden" id="select-turma-global" onchange="notasAnuaisView.selecionarTurma(this.value)" value="${this.turmaIdSelecionada || ''}">
                            <button type="button" class="dropdown-button">
                                <i class="fas fa-users" style="color: var(--color-slate-400); margin-right: var(--spacing-2);"></i>
                                <span class="dropdown-label">${turmas.find(t => String(t.id) === String(this.turmaIdSelecionada))?.nome || 'Selecionar Turma...'}</span>
                                <i class="fas fa-chevron-down" style="color: var(--color-slate-400); font-size: 0.75rem; margin-left: auto;"></i>
                            </button>
                            <ul class="dropdown-menu hidden custom-scrollbar">
                                ${turmas.length > 0
                ? turmas.map(t => `<li class="dropdown-item ${String(t.id) === String(this.turmaIdSelecionada) ? 'dropdown-item--selected' : ''}" data-value="${t.id}">${window.escapeHTML(t.nome)}</li>`).join('')
                : '<li class="p-3 text-slate-400 text-sm text-center">Nenhuma turma cadastrada</li>'
            }
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- TABLE CONTENT -->
                <div id="tabela-notas-container">
                    ${this.turmaIdSelecionada ? this.renderTabela() : this.renderEstadoVazio()}
                </div>
            </div>
        `;

        container.innerHTML = html;
        uiController.initAllDropdowns(container);
    },

    selecionarTurma(id) {
        this.turmaIdSelecionada = id;
        this.render('view-container');
    },

    renderTabela() {
        const turma = model.state.turmas.find(t => String(t.id) === String(this.turmaIdSelecionada));
        if (!turma) return this.renderEstadoVazio();

        const tipo = model.state.userConfig?.periodType || 'bimestre';
        const numPeriodos = tipo === 'bimestre' ? 4 : tipo === 'trimestre' ? 3 : 2;

        return `
            <div class="card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column;">
                <div class="custom-scrollbar" style="overflow-x: auto;">
                    <table style="width: 100%; text-align: left; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: var(--color-slate-50); border-bottom: 1px solid var(--color-slate-200);">
                                <th style="padding: var(--spacing-4) var(--spacing-6); font-size: 0.75rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase; letter-spacing: 0.05em; min-width: 220px;">Estudante</th>
                                ${Array.from({ length: numPeriodos }, (_, i) => `
                                    <th style="padding: var(--spacing-4); text-align: center; font-size: 0.75rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase; letter-spacing: 0.05em; min-width: 90px;">${i + 1}º Per.</th>
                                `).join('')}
                                <th style="padding: var(--spacing-4) var(--spacing-6); text-align: center; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-primary); background-color: var(--color-primary-light); min-width: 110px;">Média Final</th>
                                <th style="padding: var(--spacing-4) var(--spacing-6); text-align: center; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-slate-500); min-width: 120px;">Situação</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${turma.alunos.length > 0 ? turma.alunos.map(aluno => {
            const resumo = model.getResumoAcademico ? model.getResumoAcademico(turma.id, aluno.id, turma, aluno) : null;
            const mediaAnual = resumo?.mediaAnual || 0;
            const isAprovado = mediaAnual >= 6;

            return `
                                    <tr style="border-bottom: 1px solid var(--color-slate-100); transition: background-color var(--transition-fast);"
                                        onmouseover="this.style.backgroundColor='var(--color-slate-50)'"
                                        onmouseout="this.style.backgroundColor='transparent'">
                                        <td style="padding: var(--spacing-4) var(--spacing-6);">
                                            <div style="font-weight: 700; color: var(--color-slate-800); font-size: 0.875rem;">${window.escapeHTML(aluno.nome)}</div>
                                            <div style="font-size: 0.6875rem; color: var(--color-slate-400); font-weight: 600; text-transform: uppercase;">Matrícula: ${aluno.matricula || aluno.id.slice(-6)}</div>
                                        </td>
                                        ${Array.from({ length: numPeriodos }, (_, i) => {
                const nota = resumo?.periodos ? (resumo.periodos[i + 1] || 0) : 0;
                const corNota = nota < 6 ? 'color: #ef4444; background-color: #fef2f2; border: 1px solid #fee2e2;' : 'color: var(--color-slate-700); background-color: var(--color-slate-100);';
                return `
                                                <td style="padding: var(--spacing-4); text-align: center;">
                                                    <span style="display: inline-block; padding: 0.25rem 0.625rem; border-radius: var(--radius-lg); font-family: monospace; font-weight: 800; font-size: 0.875rem; ${corNota}">
                                                        ${nota.toFixed(1)}
                                                    </span>
                                                </td>
                                            `;
            }).join('')}
                                        <td style="padding: var(--spacing-4) var(--spacing-6); text-align: center; background-color: rgba(238, 242, 255, 0.4);">
                                            <span style="font-size: 1.125rem; font-weight: 900; color: ${isAprovado ? 'var(--color-primary)' : '#dc2626'};">
                                                ${mediaAnual.toFixed(1)}
                                            </span>
                                        </td>
                                        <td style="padding: var(--spacing-4) var(--spacing-6); text-align: center;">
                                            <span class="badge" style="background-color: ${isAprovado ? '#d1fae5' : '#fee2e2'}; color: ${isAprovado ? '#059669' : '#dc2626'}; font-weight: 800;">
                                                ${isAprovado ? 'Aprovado' : 'Recuperação'}
                                            </span>
                                        </td>
                                    </tr>
                                `;
        }).join('') : `
                                <tr>
                                    <td colspan="100%" style="padding: 3rem; text-align: center; color: var(--color-slate-400);">Nenhum aluno cadastrado nesta turma.</td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderEstadoVazio() {
        return `
            <div class="card" style="padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 2px dashed var(--color-slate-200); max-width: 600px; margin: 2rem auto;">
                <div style="width: 4rem; height: 4rem; border-radius: var(--radius-full); background-color: var(--color-slate-100); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; color: var(--color-slate-400); font-size: 1.5rem;">
                    <i class="fas fa-award"></i>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.5rem;">Nenhuma turma selecionada</h3>
                <p style="color: var(--color-slate-500); font-size: 0.875rem; margin-bottom: 1.5rem;">Cadastre ou selecione uma turma para ver o consolidado anual de notas.</p>
                <button onclick="controller.navigate('turmas')" class="btn-primary">
                    <i class="fas fa-plus"></i> <span>Cadastrar Turmas</span>
                </button>
            </div>
        `;
    }
};