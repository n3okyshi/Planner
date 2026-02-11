/**
 * @file turmas.js
 * @description View responsável pela exibição da lista de turmas e detalhes (alunos, notas, gráficos).
 * @module views/turmasView
 */

import { model } from '../model.js';
import { controller } from '../controller.js';

/**
 * View de Turmas.
 * @namespace turmasView
 */
export const turmasView = {
    confirmandoExclusao: null,
    periodoAtivo: 1, // Controle interno do período visualizado (1º Bimestre, etc.)

    /**
     * Renderiza a lista de turmas.
     * @param {HTMLElement|string} container
     */
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        this.confirmandoExclusao = null;
        const turmas = model.state.turmas || [];

        const html = `
            <div class="fade-in pb-20">
                <div class="flex justify-between items-center mb-8 border-b border-slate-200 pb-6">
                    <div>
                        <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Minhas Turmas</h2>
                        <p class="text-slate-500">Gerencie alunos, notas e avaliações.</p>
                    </div>
                    <button onclick="controller.openAddTurma()" class="btn-primary px-4 py-2 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:brightness-110 transition">
                        <i class="fas fa-plus"></i> <span class="hidden md:inline">Nova Turma</span>
                    </button>
                </div>
                ${turmas.length === 0
                    ? `<div class="text-center py-20">
                          <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 text-3xl">
                             <i class="fas fa-users"></i>
                          </div>
                          <h3 class="text-xl font-bold text-slate-700">Nenhuma turma encontrada</h3>
                          <p class="text-slate-400 mb-6">Comece criando sua primeira turma.</p>
                          <button onclick="controller.openAddTurma()" class="text-primary font-bold hover:underline">Criar Turma Agora</button>
                        </div>`
                    : `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            ${turmas.map(t => this._renderCardTurma(t)).join('')}
                        </div>`
                }
            </div>
        `;

        container.innerHTML = html;
    },

    /**
     * Renderiza o card individual de uma turma na lista.
     * @private
     */
    _renderCardTurma(turma) {
        // Extrai apenas os números da série para o ícone (ex: "6º Ano" -> "6")
        const serieNum = turma.serie ? turma.serie.replace(/\D/g, '') : '?';

        return `
            <div onclick="controller.views['turmas'].renderDetalhesTurma('view-container', '${turma.id}')"
                 class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-primary/30 transition group relative overflow-hidden">
                <div class="flex justify-between items-start mb-4">
                    <div class="w-12 h-12 rounded-xl bg-blue-50 text-primary flex items-center justify-center text-xl font-bold group-hover:bg-primary group-hover:text-white transition-colors">
                        ${serieNum}
                    </div>
                    <div class="text-right">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">${window.escapeHTML(turma.nivel)}</span>
                        <span class="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md mt-1 inline-block">${turma.alunos.length} alunos</span>
                    </div>
                </div>
                <h3 class="text-xl font-bold text-slate-800 mb-1 group-hover:text-primary transition-colors">${window.escapeHTML(turma.nome)}</h3>
                <p class="text-sm text-slate-400 truncate">${window.escapeHTML(turma.serie)} - ${window.escapeHTML(turma.identificador)}</p>
                <div class="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
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
                <div class="flex items-center gap-2 animate-bounce-in">
                    <button onclick="controller.deleteTurma('${turmaId}')"
                            class="bg-red-500 text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-red-600 transition shadow-md flex items-center gap-2">
                        <i class="fas fa-exclamation-circle"></i> Confirmar?
                    </button>
                    <button onclick="turmasView.cancelarExclusao('${turmaId}')"
                            class="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition"
                            title="Cancelar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }
        return `
            <button onclick="turmasView.iniciarExclusao('${turmaId}')"
                    class="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition"
                    title="Excluir Turma">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
    },

    /**
     * Renderiza a visão detalhada de uma turma (alunos, notas, gráficos).
     */
    renderDetalhesTurma(container, turmaId) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return controller.navigate('turmas');

        const tipoConfig = (model.state.userConfig && model.state.userConfig.periodType) || 'bimestre';
        const numPeriodos = tipoConfig === 'bimestre' ? 4 : tipoConfig === 'trimestre' ? 3 : 2;

        // FILTRO: Avaliações que pertencem ao período ativo
        const avaliacoesFiltradas = (turma.avaliacoes || []).filter(av => Number(av.periodo || 1) === this.periodoAtivo);

        // Estatísticas para o gráfico
        const stats = this._calcularEstatisticas(turma);
        let gradientParts = [];
        let currentPerc = 0;

        const cores = [
            { id: 'vermelho', cor: '#ef4444', label: '1 - 2,99' },
            { id: 'laranja', cor: '#f97316', label: '3 - 4,99' },
            { id: 'azul', cor: '#3b82f6', label: '5 - 6,99' },
            { id: 'ciano', cor: '#06b6d4', label: '7 - 8,99' },
            { id: 'verde', cor: '#10b981', label: '9 - 10' }
        ];

        cores.forEach(c => {
            const count = stats.distribuicao[c.id];
            const perc = stats.totalAlunos > 0 ? (count / stats.totalAlunos) * 100 : 0;
            if (perc > 0) {
                gradientParts.push(`${c.cor} ${currentPerc}% ${currentPerc + perc}%`);
                currentPerc += perc;
            }
        });

        const gradientStyle = gradientParts.length > 0
            ? `background: conic-gradient(${gradientParts.join(', ')});`
            : 'background: #f1f5f9;';

        const html = `
            <div class="fade-in pb-20">
                <div class="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-8">
                    <button onclick="controller.navigate('turmas')" class="text-slate-400 hover:text-slate-700 font-bold flex items-center gap-2 text-sm transition">
                        <i class="fas fa-arrow-left"></i> Voltar
                    </button>
                    <div class="flex-1">
                        <h2 class="text-2xl font-bold text-slate-800"><span class="text-primary">${window.escapeHTML(turma.nome)}</span></h2>
                        <div class="flex gap-4 text-xs font-bold text-slate-500 mt-1">
                            <span><i class="fas fa-graduation-cap mr-1"></i> ${window.escapeHTML(turma.nivel)}</span>
                            <span><i class="fas fa-users mr-1"></i> ${turma.alunos.length} Alunos</span>
                        </div>
                    </div>
                    <div class="flex gap-2 items-center">
                         <button onclick="controller.navigate('notas-anuais')" class="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold hover:bg-indigo-100 transition shadow-sm text-sm h-10 border border-indigo-100">
                            <i class="fas fa-award mr-2"></i> Notas Anuais
                        </button>

                         <button onclick="controller.openAddAvaliacao('${turmaId}')" class="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold hover:bg-slate-50 transition shadow-sm text-sm h-10">
                            <i class="fas fa-file-alt mr-2"></i> Nova Avaliação
                        </button>
                        <button onclick="controller.openAddAluno('${turmaId}')" class="bg-primary text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition text-sm h-10">
                            <i class="fas fa-user-plus mr-2"></i> Novo Aluno
                        </button>
                        ${this.gerarBotaoExcluir(turmaId)}
                    </div>
                </div>

                <div class="flex items-center gap-2 mb-6 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200">
                    ${Array.from({length: numPeriodos}, (_, i) => `
                        <button onclick="turmasView.mudarPeriodo('${turmaId}', ${i+1})"
                                class="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${this.periodoAtivo === (i+1) ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                            ${i+1}º ${tipoConfig.slice(0,3)}
                        </button>
                    `).join('')}
                </div>

                <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8 relative overflow-hidden">
                    <h3 class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">
                        <i class="fas fa-chart-pie mr-2"></i> Índice de Desempenho da Turma
                    </h3>
                    <div class="flex flex-col md:flex-row items-center gap-8 md:gap-16">
                        <div class="relative shrink-0">
                            <div class="chart-donut shadow-inner" style="${gradientStyle}"></div>
                            <div class="chart-center-text">
                                <span class="text-3xl font-black text-slate-800">${stats.mediaGeral}</span>
                                <span class="text-[10px] font-bold text-slate-400 uppercase">Média Geral</span>
                            </div>
                        </div>
                        <div class="flex-1 w-full">
                            <div class="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
                                ${cores.map(c => {
                                    const count = stats.distribuicao[c.id];
                                    const perc = stats.totalAlunos > 0 ? Math.round((count / stats.totalAlunos) * 100) : 0;
                                    const opacity = count === 0 ? 'opacity-40 grayscale' : '';
                                    return `
                                        <div class="flex items-center gap-3 ${opacity}">
                                            <div class="w-3 h-3 rounded-full shrink-0 shadow-sm" style="background-color: ${c.cor}"></div>
                                            <div>
                                                <p class="text-xs font-bold text-slate-700">${c.label}</p>
                                                <p class="text-[10px] text-slate-400 font-medium">${count} alunos (${perc}%)</p>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            ${stats.distribuicao.vermelho > 0 || stats.distribuicao.laranja > 0 ? `
                                <div class="mt-6 bg-orange-50 border border-orange-100 p-3 rounded-xl flex items-start gap-3">
                                    <i class="fas fa-exclamation-triangle text-orange-500 mt-0.5"></i>
                                    <div>
                                        <p class="text-xs font-bold text-orange-700">Atenção Necessária</p>
                                        <p class="text-[10px] text-orange-600 leading-relaxed">
                                            Há <strong>${stats.distribuicao.vermelho + stats.distribuicao.laranja} alunos</strong> com desempenho abaixo de 5,0.
                                            Considere atividades de recuperação.
                                        </p>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 class="font-bold text-slate-700 text-sm">Diário de Notas - ${this.periodoAtivo}º Período</h3>
                        <div class="text-xs text-slate-400 uppercase font-bold tracking-tighter">
                             Calculado base 10
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/50">
                                    <th class="p-4 text-xs font-bold text-slate-500 uppercase w-10">#</th>
                                    <th class="p-4 text-xs font-bold text-slate-500 uppercase min-w-[200px]">Nome do Aluno</th>
                                    ${avaliacoesFiltradas.map(av => `
                                        <th class="p-2 text-center min-w-[100px] group relative">
                                            <div class="flex flex-col items-center justify-center">
                                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate max-w-[80px]" title="${window.escapeHTML(av.nome)}">${window.escapeHTML(av.nome)}</span>
                                                <div class="flex items-center gap-1 mt-0.5">
                                                    <span class="text-[9px] text-slate-400 bg-slate-100 px-1.5 rounded">${av.periodo || 1}º Per.</span>
                                                    <span class="text-[9px] text-slate-300">Max: ${av.max}</span>
                                                </div>
                                            </div>
                                            <button onclick="controller.deleteAvaliacao('${turmaId}', '${av.id}')" class="absolute top-1 right-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        </th>
                                    `).join('')}
                                    <th class="p-4 text-xs font-bold text-slate-500 uppercase text-center w-24 bg-slate-50 border-l border-slate-100">Soma Per.</th>
                                    <th class="p-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${turma.alunos.length === 0
                                    ? '<tr><td colspan="100%" class="p-8 text-center text-slate-400 text-sm">Nenhum aluno cadastrado.</td></tr>'
                                    : turma.alunos.map((aluno, idx) => {
                                        // Calcula a soma apenas das notas do período que está filtrado
                                        const somaPeriodo = avaliacoesFiltradas.reduce((acc, av) => acc + (Number(aluno.notas?.[av.id]) || 0), 0);

                                        // Análise de Risco Preventivo
                                        const freq = this._calcularFrequencia(aluno);
                                        const totalDistribuido = avaliacoesFiltradas.reduce((acc, av) => acc + Number(av.max), 0);
                                        const mediaPerc = totalDistribuido > 0 ? (somaPeriodo / totalDistribuido) * 100 : 100;

                                        const riscoFrequencia = freq < 75;
                                        const riscoNota = totalDistribuido > 0 && mediaPerc < 60; // Menor que 60% de aproveitamento

                                        let alertaHtml = '';
                                        if (riscoFrequencia || riscoNota) {
                                            const motivos = [];
                                            if (riscoFrequencia) motivos.push(`Freq: ${freq.toFixed(0)}%`);
                                            if (riscoNota) motivos.push('Nota Baixa');
                                            alertaHtml = `<div class="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100 mt-1 w-fit flex items-center gap-1" title="Alerta de Risco Preventivo"><i class="fas fa-exclamation-circle"></i> ${motivos.join(', ')}</div>`;
                                        }

                                        return `
                                            <tr class="hover:bg-slate-50 transition">
                                                <td class="p-4 text-xs font-bold text-slate-400">${idx + 1}</td>
                                                <td class="p-4">
                                                    <div class="font-bold text-slate-700 text-sm">${window.escapeHTML(aluno.nome)}</div>
                                                    ${alertaHtml}
                                                </td>

                                                ${avaliacoesFiltradas.map(av => {
                                                    const nota = aluno.notas && aluno.notas[av.id] !== undefined ? aluno.notas[av.id] : '';
                                                    return `
                                                        <td class="p-2 text-center">
                                                            <input type="number"
                                                                   value="${nota}"
                                                                   placeholder="-"
                                                                   onchange="controller.updateNota('${turmaId}', '${aluno.id}', '${av.id}', this.value)"
                                                                   class="w-16 text-center bg-white border border-slate-200 rounded-lg py-1.5 text-sm font-bold text-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-200">
                                                        </td>
                                                    `;
                                                }).join('')}
                                                <td class="p-2 text-center border-l border-slate-100 bg-slate-50/30">
                                                    <div class="w-12 mx-auto py-1 rounded-lg font-black text-sm text-primary">
                                                        ${somaPeriodo.toFixed(1)}
                                                    </div>
                                                </td>
                                                <td class="p-4 text-center">
                                                    <button onclick="controller.deleteAluno('${turmaId}', '${aluno.id}')" class="text-slate-300 hover:text-red-500 transition">
                                                        <i class="fas fa-trash-alt"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')
                                }
                            </tbody>
                        </table>
                    </div>
                    <div class="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                         <button onclick="controller.openAddAlunoLote('${turmaId}')" class="text-xs font-bold text-primary hover:text-blue-700">
                            <i class="fas fa-file-import mr-1"></i> Importar Lista
                         </button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    mudarPeriodo(turmaId, num) {
        this.periodoAtivo = num;
        this.renderDetalhesTurma('view-container', turmaId);
    },

    /**
     * Calcula a média de um aluno com base nas avaliações da turma.
     * @private
     */
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
        // Normaliza para base 10
        return (totalPontos / totalMax) * 10;
    },

    /**
     * Gera estatísticas gerais da turma (distribuição de notas).
     * @private
     */
    _calcularEstatisticas(turma) {
        let stats = {
            totalAlunos: 0,
            mediaGeral: 0,
            distribuicao: {
                vermelho: 0, // 1-2.99
                laranja: 0,  // 3-4.99
                azul: 0,     // 5-6.99
                ciano: 0,    // 7-8.99
                verde: 0     // 9-10
            }
        };

        if (!turma.alunos || turma.alunos.length === 0) return stats;

        let somaMedias = 0;
        let alunosComNota = 0;

        turma.alunos.forEach(aluno => {
            const media = this._calcularMediaAluno(aluno, turma.avaliacoes);

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
        stats.mediaGeral = alunosComNota > 0 ? (somaMedias / alunosComNota).toFixed(1) : '-';
        return stats;
    },

    /**
     * Calcula o percentual de frequência do aluno.
     * @private
     */
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
        <table class="w-full text-sm text-left border border-slate-100">
            <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                    <th class="p-4">Aluno</th>
                    ${Array.from({ length: colunas }, (_, i) => `<th class="p-4 text-center">${i + 1}º</th>`).join('')}
                    <th class="p-4 text-center text-primary">Média</th>
                </tr>
            </thead>
            <tbody>
                ${turma.alunos.map(aluno => {
                    const resumo = model.getResumoAcademico(turma.id, aluno.id);
                    if(!resumo) return "";
                    return `
                        <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td class="p-4 font-medium text-slate-700">${window.escapeHTML(aluno.nome)}</td>
                            ${Array.from({length: colunas}, (_, i) => {
                                const nota = resumo.periodos[i+1] || 0;
                                return `<td class="p-4 text-center ${nota < 6 ? 'text-red-500' : 'text-slate-600'}">${nota.toFixed(1)}</td>`;
                            }).join('')}
                            <td class="p-4 text-center font-bold text-primary">${resumo.mediaAnual.toFixed(1)}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    }
};

// Exposição global
if (typeof window !== 'undefined') {
    window.turmasView = turmasView;
}