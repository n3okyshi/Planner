import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';
export const horarioView = {
    turnoAtual: 'matutino', 
    modoEdicao: false, 
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        if (!model.state.horario) model.state.horario = { config: {}, grade: {} };
        const html = `
            <div class="fade-in pb-20">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-200 pb-6">
                    <div>
                        <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Grade Horária</h2>
                        <p class="text-slate-500">Gerencie seus horários de aula por turno.</p>
                    </div>
                    <div class="flex bg-slate-100 p-1 rounded-xl">
                        <button onclick="horarioView.mudarTurno('matutino')" class="px-4 py-2 rounded-lg text-sm font-bold transition-all ${this.turnoAtual === 'matutino' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}">Matutino</button>
                        <button onclick="horarioView.mudarTurno('vespertino')" class="px-4 py-2 rounded-lg text-sm font-bold transition-all ${this.turnoAtual === 'vespertino' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}">Vespertino</button>
                        <button onclick="horarioView.mudarTurno('noturno')" class="px-4 py-2 rounded-lg text-sm font-bold transition-all ${this.turnoAtual === 'noturno' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}">Noturno</button>
                    </div>
                </div>
                <div class="flex justify-end mb-4">
                    <button onclick="horarioView.toggleModoEdicao()" class="text-xs font-bold px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center gap-2">
                        <i class="fas ${this.modoEdicao ? 'fa-table' : 'fa-cog'}"></i>
                        ${this.modoEdicao ? 'Voltar para Grade' : 'Configurar Horários'}
                    </button>
                </div>
                <div id="grade-content" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    ${this.modoEdicao ? this.renderConfiguracao() : this.renderGrade()}
                </div>
            </div>
        `;
        container.innerHTML = html;
    },
    mudarTurno(turno) {
        this.turnoAtual = turno;
        this.modoEdicao = false; 
        controller.navigate('horario');
    },
    toggleModoEdicao() {
        this.modoEdicao = !this.modoEdicao;
        controller.navigate('horario');
    },
    renderConfiguracao() {
        const config = (model.state.horario.config && model.state.horario.config[this.turnoAtual]) || [];
        if (config.length === 0) {
            return `
                <div class="p-12 text-center">
                    <div class="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                        <i class="far fa-clock"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-800 mb-2">Turno não configurado</h3>
                    <p class="text-slate-500 mb-6 max-w-md mx-auto">Você ainda não definiu os horários de início e fim das aulas para o turno <strong>${this.turnoAtual}</strong>.</p>
                    <button onclick="horarioView.criarPadrao()" class="btn-primary px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20">
                        Criar Padrão (5 aulas)
                    </button>
                </div>
            `;
        }
        return `
            <div class="p-6 md:p-8">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-bold text-slate-700">Configuração de Horários (${this.turnoAtual})</h3>
                    <button onclick="horarioView.adicionarSlot()" class="text-primary text-sm font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition">
                        <i class="fas fa-plus mr-1"></i> Adicionar Aula
                    </button>
                </div>
                <div class="space-y-3">
                    ${config.map((slot, index) => `
                        <div class="flex items-center gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50 group hover:border-primary/30 transition-colors">
                            <div class="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-400 text-xs shadow-sm">
                                ${index + 1}º
                            </div>
                            <div class="grid grid-cols-2 gap-4 flex-1">
                                <div>
                                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Início</label>
                                    <input type="time" value="${slot.inicio}" onchange="horarioView.atualizarSlot(${index}, 'inicio', this.value)" 
                                        class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-primary outline-none">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fim</label>
                                    <input type="time" value="${slot.fim}" onchange="horarioView.atualizarSlot(${index}, 'fim', this.value)" 
                                        class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-primary outline-none">
                                </div>
                            </div>
                            <button onclick="horarioView.removerSlot(${index})" class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition ml-2" title="Remover aula">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
                <div class="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                    <button onclick="horarioView.toggleModoEdicao()" class="btn-primary px-8 py-3 rounded-xl font-bold">
                        <i class="fas fa-check mr-2"></i> Concluir
                    </button>
                </div>
            </div>
        `;
    },
    criarPadrao() {
        let slots = [];
        if (this.turnoAtual === 'matutino') {
            slots = [
                { inicio: '07:00', fim: '07:50' }, { inicio: '07:50', fim: '08:40' },
                { inicio: '08:40', fim: '09:30' }, { inicio: '09:50', fim: '10:40' }, { inicio: '10:40', fim: '11:30' }
            ];
        } else if (this.turnoAtual === 'vespertino') {
            slots = [
                { inicio: '13:00', fim: '13:50' }, { inicio: '13:50', fim: '14:40' },
                { inicio: '14:40', fim: '15:30' }, { inicio: '15:50', fim: '16:40' }, { inicio: '16:40', fim: '17:30' }
            ];
        } else {
            slots = [
                { inicio: '19:00', fim: '19:45' }, { inicio: '19:45', fim: '20:30' },
                { inicio: '20:40', fim: '21:25' }, { inicio: '21:25', fim: '22:10' }
            ];
        }
        model.saveHorarioConfig(this.turnoAtual, slots);
        controller.navigate('horario');
    },
    adicionarSlot() {
        const config = model.state.horario.config[this.turnoAtual] || [];
        config.push({ inicio: '00:00', fim: '00:00' });
        model.saveHorarioConfig(this.turnoAtual, config);
        controller.navigate('horario');
    },
    removerSlot(index) {
        if(confirm("Remover este horário?")) {
            const config = model.state.horario.config[this.turnoAtual];
            config.splice(index, 1);
            model.saveHorarioConfig(this.turnoAtual, config);
            controller.navigate('horario');
        }
    },
    atualizarSlot(index, campo, valor) {
        const config = model.state.horario.config[this.turnoAtual];
        config[index][campo] = valor;
        model.saveHorarioConfig(this.turnoAtual, config);
    },
    renderGrade() {
        const config = (model.state.horario.config && model.state.horario.config[this.turnoAtual]) || [];
        const grade = (model.state.horario.grade && model.state.horario.grade[this.turnoAtual]) || {};
        const turmas = model.state.turmas;
        const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
        const diasLabel = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
        if (config.length === 0) {
            return `
                <div class="p-12 text-center flex flex-col items-center justify-center h-64">
                    <p class="text-slate-400 mb-4">Horários não definidos para este turno.</p>
                    <button onclick="horarioView.toggleModoEdicao()" class="text-primary font-bold hover:underline">Configurar Agora</button>
                </div>
            `;
        }
        const getTurmaOptions = (selectedId) => {
            let opts = `<option value="">- Livre -</option>`;
            opts += turmas.map(t => `<option value="${t.id}" ${t.id === selectedId ? 'selected' : ''}>${escapeHTML(t.nome)}</option>`).join('');
            return opts;
        };
        return `
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            <th class="p-4 border-b border-slate-200 bg-slate-50 w-20 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Horário</th>
                            ${diasLabel.map(dia => `
                                <th class="p-4 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wider min-w-[140px]">${dia}</th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${config.map((slot, slotIdx) => `
                            <tr class="hover:bg-slate-50/50 transition-colors group">
                                <td class="p-3 border-r border-slate-100 text-center">
                                    <div class="text-xs font-bold text-slate-700">${slot.inicio}</div>
                                    <div class="text-[10px] font-medium text-slate-400">${slot.fim}</div>
                                </td>
                                ${diasSemana.map(diaKey => {
                                    const turmaId = (grade[diaKey] && grade[diaKey][slotIdx]) || "";
                                    const turmaObj = turmas.find(t => t.id === turmaId);
                                    const cardStyle = turmaId 
                                        ? `bg-blue-50 border-blue-200 text-primary` 
                                        : `bg-transparent border-transparent text-slate-400 hover:border-slate-200`;
                                    return `
                                        <td class="p-2 relative">
                                            <div class="relative">
                                                <select onchange="horarioView.salvarGrade('${diaKey}', ${slotIdx}, this.value)" 
                                                        class="w-full appearance-none p-3 rounded-lg border text-xs font-bold outline-none cursor-pointer transition-all ${cardStyle} focus:ring-2 focus:ring-primary focus:bg-white">
                                                    ${getTurmaOptions(turmaId)}
                                                </select>
                                                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                                    <i class="fas fa-chevron-down text-[10px] opacity-50"></i>
                                                </div>
                                            </div>
                                        </td>
                                    `;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 text-center">
                Alterações são salvas automaticamente.
            </div>
        `;
    },
    salvarGrade(dia, slotIdx, turmaId) {
        model.saveGradeHoraria(this.turnoAtual, dia, slotIdx, turmaId);
    }
};
