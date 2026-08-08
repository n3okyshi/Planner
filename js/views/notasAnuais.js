/**
 * @file notasAnuais.js
 * @description View responsável pelo relatório consolidado de notas anuais (Boletim da Turma).
 * @module views/notasAnuaisView
 */

import { model } from '../model.js';
import { controller } from '../controller.js';

/**
 * View de Notas Anuais.
 * @namespace notasAnuaisView
 */
export const notasAnuaisView = {
    turmaIdSelecionada: null,

    /**
     * Renderiza o relatório de notas anuais.
     * @param {HTMLElement|string} container
     */
    async render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const turmas = model.state.turmas || [];
        const tipo = model.state.userConfig.periodType || 'bimestre';

        // Formata o label para exibição (ex: Bimestre, Trimestre)
        const labelPeriodo = tipo.charAt(0).toUpperCase() + tipo.slice(1);

        const html = `
            <div class="fade-in pb-20">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 no-print">
                    <div>
                        <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Notas Anuais</h2>
                        <p class="text-slate-500">Visão consolidada por <strong>${labelPeriodo}</strong> e média final.</p>
                    </div>
                    <div class="flex gap-3 w-full md:w-auto">
                        <div class="custom-dropdown relative flex-1 md:w-64">
    <i class="fas fa-users absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none"></i>
    
    <input type="hidden" id="select-turma-global" onchange="notasAnuaisView.selecionarTurma(this.value)" value="${this.currentTurmaId || ''}">
    
    <button type="button" class="dropdown-button w-full flex items-center justify-between pl-10 pr-4 py-2.5 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl shadow-sm text-sm font-bold text-slate-700 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-50">
        <span class="dropdown-label truncate">${turmas.find(t => String(t.id) === String(this.currentTurmaId))?.nome || 'Selecionar Turma...'}</span>
        <i class="fas fa-chevron-down text-slate-400 text-xs ml-2"></i>
    </button>

    <ul class="dropdown-menu hidden absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl shadow-slate-200/50 max-h-64 overflow-y-auto custom-scrollbar p-1.5 animate-slide-up origin-top text-left font-normal">
        ${turmas.length > 0 
            ? turmas.map(t => `<li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors ${String(t.id) === String(this.currentTurmaId) ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'}" data-value="${t.id}">${window.escapeHTML(t.nome)}</li>`).join('')
            : '<li class="p-2.5 text-slate-400 text-sm text-center">Nenhuma turma</li>'
        }
    </ul>
</div>
                        <button onclick="window.print()" class="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm text-slate-600" title="Imprimir Relatório">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </div>

                <div id="tabela-notas-container">
                    ${this.turmaIdSelecionada ? this.renderTabela() : this.renderEstadoVazio()}
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    selecionarTurma(id) {
        this.turmaIdSelecionada = id;
        this.render('view-container');
    },

    renderTabela() {
        const turma = model.state.turmas.find(t => String(t.id) === String(this.turmaIdSelecionada));
        if (!turma) return this.renderEstadoVazio();

        const tipo = model.state.userConfig.periodType || 'bimestre';
        const numPeriodos = tipo === 'bimestre' ? 4 : tipo === 'trimestre' ? 3 : 2;

        return `
            <div class="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden animate-slide-up print:shadow-none print:border-0">
                <div class="overflow-x-auto">

                    <div class="hidden print:block text-center mb-6 pt-4 border-b pb-4">
                        <h1 class="text-xl font-bold">${window.escapeHTML(turma.nome)} - Relatório de Notas</h1>
                    </div>

                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/50 border-b border-slate-100">
                                <th class="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Estudante</th>
                                ${Array.from({length: numPeriodos}, (_, i) => `
                                    <th class="p-6 text-center text-xs font-black text-slate-400 uppercase tracking-widest">${i+1}º Per.</th>
                                `).join('')}
                                <th class="p-6 text-center text-xs font-black text-primary uppercase tracking-widest bg-blue-50/30">Média Final</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${turma.alunos.length > 0 ? turma.alunos.map(aluno => {
                                // Chama o método de cálculo centralizado no Model
                                const resumo = model.getResumoAcademico(turma.id, aluno.id, turma, aluno);
                                if (!resumo) return '';

                                return `
                                    <tr class="hover:bg-slate-50/50 transition-colors group print:break-inside-avoid">
                                        <td class="p-6">
                                            <div class="font-bold text-slate-700">${window.escapeHTML(aluno.nome)}</div>
                                            <div class="text-[10px] text-slate-400 uppercase tracking-tighter font-semibold">Matrícula: ${aluno.id.slice(-6)}</div>
                                        </td>
                                        ${Array.from({length: numPeriodos}, (_, i) => {
                                            const nota = resumo.periodos[i+1] || 0;
                                            const corNota = nota < 6 ? 'text-red-500 bg-red-50' : 'text-slate-600 bg-slate-100';

                                            return `
                                                <td class="p-6 text-center">
                                                    <span class="inline-block px-3 py-1 rounded-lg font-mono font-bold ${corNota} print:bg-transparent print:text-black">
                                                        ${nota.toFixed(1)}
                                                    </span>
                                                </td>
                                            `;
                                        }).join('')}
                                        <td class="p-6 text-center bg-blue-50/10">
                                            <span class="text-lg font-black ${resumo.mediaAnual < 6 ? 'text-red-600' : 'text-primary'}">
                                                ${resumo.mediaAnual.toFixed(1)}
                                            </span>
                                        </td>
                                    </tr>
                                `;
                            }).join('') : `
                                <tr>
                                    <td colspan="${numPeriodos + 2}" class="p-20 text-center text-slate-400 italic">
                                        Nenhum aluno cadastrado nesta turma.
                                    </td>
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
            <div class="flex flex-col items-center justify-center py-32 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 animate-pulse no-print">
                <div class="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-6 text-slate-300">
                    <i class="fas fa-graduation-cap text-4xl"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-800">Selecione uma turma</h3>
                <p class="text-slate-500 max-w-xs text-center mt-2 font-medium">Escolha uma turma no menu acima para consolidar os resultados anuais.</p>
            </div>
        `;
    }
};

// VINCULAÇÃO GLOBAL PARA EVENTOS ONCLICK
if (typeof window !== 'undefined') {
    window.notasAnuaisView = notasAnuaisView;
}