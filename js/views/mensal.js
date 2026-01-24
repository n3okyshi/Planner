import { model } from '../model.js';
import { controller } from '../controller.js';

export const mensalView = {
    currentMes: null,
    currentTurmaId: null,
    meses: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
    render(container, turmaId = null) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        if (turmaId) this.currentTurmaId = turmaId;
        const turmas = model.state.turmas || [];
        if (this.currentTurmaId && !turmas.find(t => t.id == this.currentTurmaId)) {
            this.currentTurmaId = null;
        }
        if (!this.currentTurmaId && turmas.length > 0) {
            this.currentTurmaId = turmas[0].id;
        }
        if (!this.currentMes) {
            const mesIndex = new Date().getMonth();
            this.currentMes = this.meses[mesIndex];
        }
        if (turmas.length === 0) {
            container.innerHTML = `<div class="p-10 text-center text-slate-400">Nenhuma turma cadastrada. <button onclick="controller.navigate('turmas')" class="text-primary font-bold hover:underline">Cadastrar agora</button></div>`;
            return;
        }
        const turmaAtual = turmas.find(t => t.id == this.currentTurmaId);
        const periodoSugestao = this.identificarPeriodo(this.currentMes);
        const habilidadesDoPeriodo = turmaAtual.planejamento && turmaAtual.planejamento[periodoSugestao]
            ? turmaAtual.planejamento[periodoSugestao]
            : [];
        const habilidadesDoMes = turmaAtual.planejamentoMensal && turmaAtual.planejamentoMensal[this.currentMes]
            ? turmaAtual.planejamentoMensal[this.currentMes]
            : [];
        const codigosNoMes = new Set(habilidadesDoMes.map(h => h.codigo));
        const sugestoesFiltradas = habilidadesDoPeriodo.filter(h => !codigosNoMes.has(h.codigo));
        const html = `
            <div class="fade-in pb-24">
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-20">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Planejamento Mensal</h2>
                        <p class="text-xs text-slate-500">Distribua as habilidades do período (${periodoSugestao}º ${model.state.userConfig.periodType || 'Bimestre'}) nos meses.</p>
                    </div>
                    <div class="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
                        <button onclick="controller.abrirModalCopiarPlanejamento('${turmaAtual.id}')" 
                                class="w-full md:w-auto bg-white border border-slate-200 text-slate-600 hover:text-primary hover:border-primary px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                                title="Copiar planejamento para outra turma">
                            <i class="fas fa-copy"></i> <span>Replicar</span>
                        </button>
                        <div class="relative w-full md:w-64">
                            <i class="fas fa-users absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <select onchange="mensalView.mudarTurma(this.value)" 
                                    class="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl pl-10 pr-4 py-2 outline-none focus:border-primary cursor-pointer hover:bg-slate-100 transition-colors">
                                ${turmas.map(t => `<option value="${t.id}" ${t.id == turmaAtual.id ? 'selected' : ''}>${t.nome}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                <div class="flex overflow-x-auto custom-scrollbar gap-2 mb-6 pb-2 px-1">
                    ${this.meses.map(mes => `
                        <button onclick="mensalView.mudarMes('${mes}')" 
                                class="px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex-shrink-0
                                ${this.currentMes === mes
                ? 'bg-primary text-white shadow-lg shadow-primary/30 ring-2 ring-offset-1 ring-primary/20'
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100 hover:border-slate-300'}">
                            ${mes}
                        </button>
                    `).join('')}
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div class="lg:col-span-2 space-y-4">
                        <div class="flex justify-between items-center mb-2 px-1">
                            <h3 class="font-bold text-slate-700 flex items-center gap-2">
                                <i class="far fa-calendar-check text-primary"></i> 
                                Planejado para ${this.currentMes}
                                <span class="bg-indigo-50 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full border border-indigo-100">${habilidadesDoMes.length}</span>
                            </h3>
                            <button onclick="controller.openSeletorBnccMensal('${turmaAtual.id}', '${this.currentMes}', '${turmaAtual.nivel}', '${turmaAtual.serie}')" 
                                    class="text-xs font-bold text-primary bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
                                <i class="fas fa-search"></i> Buscar na BNCC
                            </button>
                        </div>
                        ${habilidadesDoMes.length > 0 ? `
                            <div class="space-y-3 animate-slideIn">
                                ${habilidadesDoMes.map(h => this.gerarCardHabilidade(h, turmaAtual.id, this.currentMes)).join('')}
                            </div>
                        ` : `
                            <div class="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:border-slate-300 transition-colors">
                                <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 shadow-sm">
                                    <i class="fas fa-wind text-2xl"></i>
                                </div>
                                <h4 class="text-slate-600 font-bold mb-1">Mês Livre</h4>
                                <p class="text-slate-400 text-sm">Adicione habilidades usando a barra lateral ou busque na BNCC.</p>
                            </div>
                        `}
                    </div>
                    <div class="lg:col-span-1 space-y-6">
                        <div class="bg-amber-50 rounded-2xl p-6 border border-amber-100 sticky top-24 shadow-sm">
                            <div class="flex items-center gap-3 mb-4 pb-4 border-b border-amber-100">
                                <div class="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-lg shadow-sm">
                                    <i class="fas fa-lightbulb"></i>
                                </div>
                                <div>
                                    <h3 class="font-bold text-slate-800 text-sm">Sugestões do Período</h3>
                                    <p class="text-[10px] text-amber-700 font-bold uppercase tracking-wide">
                                        Importar do Planejamento
                                    </p>
                                </div>
                            </div>
                            ${sugestoesFiltradas.length > 0 ? `
                                <div class="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                                    ${sugestoesFiltradas.map(h => `
                                        <div class="bg-white p-3 rounded-xl border border-amber-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                                             onclick="mensalView.adicionarSugestao('${h.codigo}')">
                                            <div class="absolute inset-0 bg-amber-100/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div class="relative z-10">
                                                <div class="flex justify-between items-start gap-2">
                                                    <span class="text-[10px] font-bold text-amber-700 bg-amber-100/50 px-1.5 py-0.5 rounded">
                                                        ${h.codigo}
                                                    </span>
                                                    <i class="fas fa-plus-circle text-amber-300 group-hover:text-amber-500 transition-colors"></i>
                                                </div>
                                                <p class="text-xs text-slate-600 mt-2 line-clamp-3 leading-snug">${h.descricao}</p>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                                <p class="text-[10px] text-center text-slate-400 mt-3 font-medium">
                                    <i class="fas fa-mouse-pointer mr-1"></i> Clique para adicionar
                                </p>
                            ` : `
                                <div class="text-center py-8">
                                    <p class="text-xs text-slate-500 mb-2">
                                        ${habilidadesDoPeriodo.length > 0
                ? "Todas as habilidades deste período já estão neste mês!"
                : "Nenhuma habilidade cadastrada no planejamento do período."}
                                    </p>
                                    <button onclick="controller.navigate('planejamento')" class="text-xs font-bold text-amber-600 hover:text-amber-700 underline">
                                        Gerenciar Período
                                    </button>
                                </div>
                            `}
                        </div>
                    </div>

                </div>
            </div>
        `;
        container.innerHTML = html;
    },
    gerarCardHabilidade(habilidade, turmaId, mes) {
        const cor = habilidade.cor || (model.coresComponentes && model.coresComponentes[habilidade.componente]) || "#64748b";
        const codigoSafe = String(habilidade.codigo || "").replace(/'/g, "");
        const eixo = habilidade.objeto || habilidade.eixo || habilidade.componente || "Habilidade";
        habilidades.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
        return `
            <div class="bg-white p-4 rounded-xl border-l-[4px] shadow-sm relative group hover:shadow-md hover:-translate-y-0.5 transition-all border-y border-r border-slate-100" 
                 style="border-left-color: ${cor} !important;">
                <div class="flex justify-between items-start gap-3 mb-2">
                    <div>
                        <span class="inline-block px-2 py-0.5 rounded text-[10px] font-black text-white uppercase tracking-wider mb-1"
                              style="background-color: ${cor}">
                            ${habilidade.codigo}
                        </span>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            ${eixo}
                        </p>
                    </div>
                    <button onclick="controller.removeHabilidadeMensal('${turmaId}', '${mes}', '${codigoSafe}')" 
                            class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                            title="Remover do mês">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                <p class="text-sm text-slate-700 leading-relaxed font-medium">
                    ${habilidade.descricao}
                </p>
            </div>
        `;
    },
    mudarTurma(id) {
        this.currentTurmaId = id;
        this.render('view-container');
    },
    mudarMes(mes) {
        this.currentMes = mes;
        this.render('view-container');
    },
    identificarPeriodo(mesNome) {
        // Essa joça é mais difícil do que parece mas depois de fazer parece fácil
        try {
            const mesIndex = this.meses.indexOf(mesNome);
            const ano = new Date().getFullYear();
            const dataTeste = `${ano}-${String(mesIndex + 1).padStart(2, '0')}-15`; // 15 arbitrariamente
            const periodo = model.getPeriodoPorData(dataTeste);
            return periodo || "1";
        } catch (e) {
            console.error("Erro ao identificar período:", e);
            return "1";
        }
    },
    adicionarSugestao(codigoHabilidade) {
        const turma = model.state.turmas.find(t => t.id == this.currentTurmaId);
        if (!turma) return;
        const periodo = this.identificarPeriodo(this.currentMes);
        const habilidade = turma.planejamento[periodo].find(h => h.codigo === codigoHabilidade);
        if (habilidade) {
            model.addHabilidadeMensal(turma.id, this.currentMes, habilidade);
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-xl z-50 text-sm font-bold animate-slideIn';
            toast.innerHTML = '<i class="fas fa-check mr-2"></i> Adicionado!';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);

            this.render('view-container');
        }
    }
};