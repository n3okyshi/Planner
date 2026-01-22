import { model } from '../model.js';

export const frequenciaView = {
    currentTurmaId: null,
    currentDate: new Date(),
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        const turmas = model.state.turmas || [];
        if (!this.currentTurmaId && turmas.length > 0) {
            this.currentTurmaId = turmas[0].id;
        }
        const turmaSelecionada = turmas.find(t => t.id == this.currentTurmaId);
        const ano = this.currentDate.getFullYear();
        const mes = this.currentDate.getMonth();
        const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(this.currentDate);
        const diasNoMes = new Date(ano, mes + 1, 0).getDate();
        const html = `
            <div class="fade-in pb-24 h-full flex flex-col">
                <div class="hidden print:block text-center mb-4">
                    <h1 class="text-2xl font-bold">Frequência - ${nomeMes} / ${ano}</h1>
                    <p class="text-sm">Turma: ${turmaSelecionada ? turmaSelecionada.nome : 'N/A'}</p>
                </div>
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-4 flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Frequência</h2>
                        <p class="text-xs text-slate-500">Controle de chamadas e presença.</p>
                    </div>
                    <div class="flex flex-wrap gap-3 items-center justify-center">
                        <div class="relative">
                            <i class="fas fa-users absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <select onchange="frequenciaView.mudarTurma(this.value)" 
                                    class="bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl pl-10 pr-8 py-2 outline-none focus:border-primary cursor-pointer min-w-[200px]">
                                ${turmas.map(t => `<option value="${t.id}" ${t.id == this.currentTurmaId ? 'selected' : ''}>${t.nome}</option>`).join('')}
                                ${turmas.length === 0 ? '<option>Nenhuma turma</option>' : ''}
                            </select>
                        </div>
                        <div class="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1">
                            <button onclick="frequenciaView.mudarMes(-1)" class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-white rounded-lg transition-all">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <span class="w-32 text-center text-sm font-bold text-slate-700 capitalize select-none">
                                ${nomeMes} / ${ano}
                            </span>
                            <button onclick="frequenciaView.mudarMes(1)" class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-white rounded-lg transition-all">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
                ${turmaSelecionada ? this.renderTabela(turmaSelecionada, ano, mes, diasNoMes) : this.estadoVazio()}
            </div>
        `;
        container.innerHTML = html;
    },
    renderTabela(turma, ano, mes, diasNoMes) {
        let headerDias = '';
        for (let d = 1; d <= diasNoMes; d++) {
            const dataObj = new Date(ano, mes, d);
            const diaSemana = dataObj.getDay();
            const isFimDeSemana = diaSemana === 0 || diaSemana === 6;
            const letraSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][diaSemana];
            const hoje = new Date();
            const isHoje = hoje.getDate() === d && hoje.getMonth() === mes && hoje.getFullYear() === ano;
            headerDias += `
                <div class="flex flex-col items-center justify-center min-w-[40px] h-14 border-r border-slate-100 ${isFimDeSemana ? 'bg-slate-50/50' : ''} ${isHoje ? 'bg-blue-50 text-primary' : ''}">
                    <span class="text-[10px] font-bold text-slate-400">${letraSemana}</span>
                    <span class="text-sm font-bold ${isHoje ? 'text-primary' : 'text-slate-700'}">${d}</span>
                </div>
            `;
        }
        const linhasAlunos = turma.alunos.map(aluno => {
            let colunas = '';
            for (let d = 1; d <= diasNoMes; d++) {
                const mesFmt = (mes + 1).toString().padStart(2, '0');
                const diaFmt = d.toString().padStart(2, '0');
                const dataIso = `${ano}-${mesFmt}-${diaFmt}`;
                const status = (aluno.frequencia || {})[dataIso];
                const dataObj = new Date(ano, mes, d);
                const isFimDeSemana = dataObj.getDay() === 0 || dataObj.getDay() === 6;
                colunas += `
                    <div onclick="frequenciaView.toggleStatus('${turma.id}', '${aluno.id}', '${dataIso}', this)"
                         class="min-w-[40px] h-12 border-r border-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors ${isFimDeSemana ? 'bg-slate-50/30' : ''}"
                         title="${aluno.nome} - ${d}/${mes + 1}">
                         ${this.getIconeStatus(status)}
                    </div>
                `;
            }
            return `
                <div class="flex items-center border-b border-slate-100 hover:bg-slate-50/50 transition-colors bg-white">
                    <div class="w-64 shrink-0 p-3 border-r border-slate-200 sticky left-0 bg-white z-10 flex items-center gap-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold border border-slate-200">
                            ${aluno.nome.charAt(0)}
                        </div>
                        <span class="text-sm font-medium text-slate-700 truncate">${aluno.nome}</span>
                    </div>
                    ${colunas}
                </div>
            `;
        }).join('');
        if (turma.alunos.length === 0) {
            return `
                <div class="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                    <i class="fas fa-user-slash text-4xl mb-3"></i>
                    <p>Nenhum aluno nesta turma.</p>
                </div>`;
        }
        return `
            <div class="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
                <div class="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
                    <div class="w-64 shrink-0 p-3 border-r border-slate-200 sticky left-0 bg-slate-50 z-30 flex items-end shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Aluno</span>
                    </div>
                    <div class="flex overflow-hidden">
                        ${headerDias}
                    </div>
                </div>
                <div class="overflow-auto custom-scrollbar flex-1 relative">
                    <div class="min-w-fit">
                        ${linhasAlunos}
                    </div>
                </div>
                <div class="p-3 bg-slate-50 border-t border-slate-200 flex gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-wide justify-end">
                    <div class="flex items-center gap-1"><div class="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300"></div> Presente</div>
                    <div class="flex items-center gap-1"><div class="w-3 h-3 rounded-full bg-red-100 border border-red-300"></div> Falta</div>
                    <div class="flex items-center gap-1"><div class="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300"></div> Justificada</div>
                </div>
            </div>
        `;
    },
    getIconeStatus(status) {
        if (!status) return `<span class="w-2 h-2 rounded-full bg-slate-200"></span>`; // Bolinha cinza (vazio)
        if (status === 'P') return `<i class="fas fa-check text-emerald-500 text-lg"></i>`;
        if (status === 'F') return `<i class="fas fa-times text-red-500 text-lg"></i>`;
        if (status === 'J') return `<span class="text-xs font-black text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded border border-yellow-200">J</span>`;
        return '';
    },
    toggleStatus(turmaId, alunoId, dataIso, element) {
        const novoStatus = model.toggleFrequencia(turmaId, alunoId, dataIso);
        element.innerHTML = this.getIconeStatus(novoStatus);
        element.classList.add('scale-125');
        setTimeout(() => element.classList.remove('scale-125'), 150);
    },
    mudarTurma(id) {
        this.currentTurmaId = id;
        this.render('view-container');
    },
    mudarMes(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.render('view-container');
    },
    estadoVazio() {
        return `
            <div class="flex flex-col items-center justify-center p-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center flex-1">
                <i class="fas fa-users text-4xl text-slate-300 mb-4"></i>
                <h3 class="text-xl font-bold text-slate-700 mb-2">Sem turmas</h3>
                <p class="text-slate-500 text-sm mb-6">Cadastre turmas para realizar a chamada.</p>
                <button onclick="controller.navigate('turmas')" class="btn-primary px-6 py-2 rounded-xl font-bold shadow-lg shadow-primary/20">
                    Ir para Turmas
                </button>
            </div>
        `;
    }
};