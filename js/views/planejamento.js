import { model } from '../model.js';

/**
 * VIEW DE PLANEJAMENTO ANUAL/PERIÓDICO
 * Gerencia a visualização em colunas (Bimestres/Trimestres/Semestres) e a alocação de habilidades BNCC.
 * @namespace planejamentoView
 */
export const planejamentoView = {
    /** @type {string|null} ID da turma atualmente visualizada */
    currentTurmaId: null,

    /**
     * Renderiza a interface de planejamento.
     * @param {HTMLElement|string} container - Elemento pai ou ID do container.
     */
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        const turmas = (model.state && model.state.turmas) ? model.state.turmas : [];
        const tipoPeriodo = (model.state && model.state.userConfig && model.state.userConfig.periodType) || 'bimestre';
        if (this.currentTurmaId && !turmas.find(t => t.id == this.currentTurmaId)) {
            this.currentTurmaId = null;
        }
        if (!this.currentTurmaId && turmas.length > 0) {
            this.currentTurmaId = turmas[0].id;
        }

        /** @type {Object.<string, {qtd: number, label: string, gridCols: string}>} Configurações de layout por período */
        const configPeriodos = {
            'bimestre': { qtd: 4, label: 'Bimestre', gridCols: 'lg:grid-cols-4' },
            'trimestre': { qtd: 3, label: 'Trimestre', gridCols: 'lg:grid-cols-3' },
            'semestre': { qtd: 2, label: 'Semestre', gridCols: 'lg:grid-cols-2' }
        };

        const config = configPeriodos[tipoPeriodo] || configPeriodos['bimestre'];
        const turmaSelecionada = turmas.find(t => t.id == this.currentTurmaId);

        const html = `
            <div class="fade-in pb-24">
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-30">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Planejamento ${config.label}</h2>
                        <p class="text-xs text-slate-500">Distribuição de habilidades da BNCC por período.</p>
                    </div>
                    <div class="flex gap-3 w-full md:w-auto">
                        <div class="relative flex-1 md:w-64">
                            <i class="fas fa-users absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            
                            <select id="plan-selecao-turma" name="plan-selecao-turma" aria-label="Selecionar Turma" 
                                    onchange="planejamentoView.mudarTurma(this.value)" 
                                    class="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl pl-10 pr-4 py-2 outline-none focus:border-primary cursor-pointer hover:bg-slate-100 transition-colors">
                                ${turmas.length > 0
                                    ? turmas.map(t => `<option value="${t.id}" ${t.id == this.currentTurmaId ? 'selected' : ''}>${t.nome} - ${t.disciplina || 'Geral'}</option>`).join('')
                                    : `<option value="">Nenhuma turma cadastrada</option>`
                                }
                            </select>
                        </div>
                        <div class="relative w-32 hidden">
                            <select id="plan-tipo-periodo" name="plan-tipo-periodo" aria-label="Tipo de Período"
                                    onchange="controller.updatePeriodType(this.value)" 
                                    class="w-full bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-primary cursor-pointer">
                                <option value="bimestre" ${tipoPeriodo === 'bimestre' ? 'selected' : ''}>Bimestral</option>
                                <option value="trimestre" ${tipoPeriodo === 'trimestre' ? 'selected' : ''}>Trimestral</option>
                                <option value="semestre" ${tipoPeriodo === 'semestre' ? 'selected' : ''}>Semestral</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="space-y-6">
                    ${turmas.length > 0 && turmaSelecionada
                        ? this.gerarCardTurma(turmaSelecionada, config)
                        : this.estadoVazio()
                    }
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    /**
     * Altera a turma visualizada e re-renderiza a view.
     * @param {string|number} id - ID da nova turma.
     */
    mudarTurma(id) {
        this.currentTurmaId = id;
        this.render('view-container');
    },

    /**
     * Gera o HTML das colunas de planejamento para a turma selecionada.
     * @param {Object} turma - Objeto da turma vindo do model.
     * @param {Object} config - Configurações de exibição (bimestre, trimestre...).
     * @returns {string} HTML Template.
     */
    gerarCardTurma(turma, config) {
        const plan = turma.planejamento || {};
        let colunasHtml = '';
        for (let i = 1; i <= config.qtd; i++) {
            const habilidades = plan[i] ? [...plan[i]] : [];
            const isVazio = habilidades.length === 0;
            habilidades.sort((a, b) => {
                const codA = String(a.codigo || "");
                const codB = String(b.codigo || "");
                return codA.localeCompare(codB, undefined, { numeric: true });
            });

            const btnAdicionar = `
                <button onclick="controller.openSeletorBncc('${turma.id}', ${i}, '${turma.nivel}', '${turma.serie}')" 
                        class="w-full h-full flex flex-col items-center justify-center text-slate-300 hover:text-primary hover:bg-white border-2 border-dashed border-slate-200 hover:border-primary rounded-xl transition-all p-6 group/empty opacity-70 hover:opacity-100">
                    <i class="fas fa-plus-circle text-3xl mb-2 group-hover/empty:scale-110 transition-transform"></i>
                    <span class="text-xs font-bold">Adicionar Habilidade</span>
                </button>
            `;

            colunasHtml += `
                <div class="flex flex-col h-[500px] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden group/col hover:border-slate-300 transition-colors shadow-sm">
                    <div class="p-4 border-b border-slate-200 bg-white flex justify-between items-center z-10 sticky top-0">
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200">
                                ${i}º
                            </div>
                            <span class="text-xs font-bold text-slate-600 uppercase tracking-wide">
                                ${config.label}
                            </span>
                        </div>
                        <div class="flex items-center gap-2">
                            ${!isVazio ? `<span class="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">${habilidades.length}</span>` : ''}
                            <button onclick="controller.openSeletorBncc('${turma.id}', ${i}, '${turma.nivel}', '${turma.serie}')" 
                                    class="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
                                    title="Adicionar Habilidade">
                                <i class="fas fa-plus text-xs"></i>
                            </button>
                            <button onclick="controller.abrirModalCopiarPlanejamento('${turma.id}')" 
                                    class="bg-white border border-slate-200 text-slate-600 hover:text-primary hover:border-primary px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2"
                                    title="Copiar planejamento para outra turma">
                                <i class="fas fa-copy"></i> <span class="hidden sm:inline">Replicar</span>
                            </button>
                        </div>
                    </div>
                    <div class="p-3 flex-1 space-y-3 custom-scrollbar overflow-y-auto bg-slate-100/50">
                        ${!isVazio
                            ? habilidades.map(h => this.gerarMiniCardHabilidade(h, turma.id, i)).join('')
                            : btnAdicionar
                        }
                    </div>
                </div>
            `;
        }

        return `
            <div class="animate-slideIn">
                <div class="flex items-center gap-2 mb-4 px-1">
                    <span class="px-2 py-1 bg-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded-md tracking-wider">
                        <i class="fas fa-layer-group mr-1"></i>${turma.nivel}
                    </span>
                    <span class="px-2 py-1 bg-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded-md tracking-wider">
                        <i class="fas fa-graduation-cap mr-1"></i>${turma.serie}
                    </span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 ${config.gridCols} gap-6">
                    ${colunasHtml}
                </div>
            </div>
        `;
    },

    /**
     * Gera o card pequeno de uma habilidade para as colunas.
     * @param {Object} habilidade - Dados da habilidade.
     * @param {string} turmaId - ID da turma.
     * @param {number} periodoIdx - Índice do bimestre/trimestre.
     * @returns {string} HTML Template.
     */
    gerarMiniCardHabilidade(habilidade, turmaId, periodoIdx) {
        const codigoSafe = window.escapeHTML ? window.escapeHTML(habilidade.codigo) : habilidade.codigo;
        const descSafe = window.escapeHTML ? window.escapeHTML(habilidade.descricao) : habilidade.descricao;
        const subtitulo = window.escapeHTML ? window.escapeHTML(habilidade.objeto || habilidade.eixo || habilidade.componente || "Habilidade") : "Habilidade";
        const cor = habilidade.cor || (model.coresComponentes ? model.coresComponentes[habilidade.componente] : "#64748b") || "#64748b";

        return `
            <div class="bg-white p-3 rounded-xl border-l-[4px] shadow-sm relative group hover:shadow-md hover:-translate-y-0.5 transition-all cursor-help border border-slate-200" 
                 style="border-left-color: ${cor} !important;" 
                 title="${descSafe}">
                <div class="flex justify-between items-start mb-2 gap-2">
                    <span class="text-[9px] font-black text-white px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm" 
                          style="background-color: ${cor}">
                        ${habilidade.codigo}
                    </span>
                    <button onclick="controller.removeHabilidade('${turmaId}', ${periodoIdx}, '${codigoSafe}')" 
                            class="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            title="Remover">
                        <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                </div>
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1 truncate">
                    ${subtitulo}
                </p>
                <p class="text-[11px] text-slate-700 line-clamp-3 leading-snug font-medium">
                    ${descSafe}
                </p>
            </div>
        `;
    },

    /**
     * Renderiza o estado vazio para usuários sem turmas cadastradas.
     * @returns {string} HTML Template.
     */
    estadoVazio() {
        return `
            <div class="flex flex-col items-center justify-center p-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center mx-auto max-w-2xl mt-10">
                <i class="fas fa-chalkboard-teacher text-4xl text-slate-300 mb-4"></i>
                <h3 class="text-xl font-bold text-slate-700 mb-2">Comece por aqui</h3>
                <p class="text-slate-500 text-sm mb-6">Cadastre suas turmas na aba "Turmas" para iniciar o planejamento anual.</p>
                <button onclick="controller.navigate('turmas')" class="btn-primary px-6 py-2 rounded-xl font-bold shadow-lg shadow-primary/20">
                    Ir para Turmas
                </button>
            </div>
        `;
    }
};