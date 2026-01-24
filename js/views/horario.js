import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';

export const horarioView = {
    turnoAtual: 'matutino',
    modoEdicao: false,
    tempState: null,
    hasUnsavedChanges: false,
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        if (!this.tempState) {
            this.carregarDoModel();
        }
        const html = `
            <div class="fade-in pb-20">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-200 pb-6">
                    <div>
                        <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Grade Horária</h2>
                        <p class="text-slate-500">Gerencie seus horários e turmas.</p>
                    </div>
                    <div class="flex bg-slate-100 p-1 rounded-xl">
                        <button onclick="horarioView.mudarTurno('matutino')" class="px-4 py-2 rounded-lg text-sm font-bold transition-all ${this.turnoAtual === 'matutino' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}">Manhã</button>
                        <button onclick="horarioView.mudarTurno('vespertino')" class="px-4 py-2 rounded-lg text-sm font-bold transition-all ${this.turnoAtual === 'vespertino' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}">Tarde</button>
                        <button onclick="horarioView.mudarTurno('noturno')" class="px-4 py-2 rounded-lg text-sm font-bold transition-all ${this.turnoAtual === 'noturno' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}">Noite</button>
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <button onclick="horarioView.toggleModoEdicao()" class="text-xs font-bold px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition flex items-center gap-2 shadow-sm">
                        <i class="fas ${this.modoEdicao ? 'fa-table' : 'fa-cog'}"></i>
                        ${this.modoEdicao ? 'Voltar para Grade' : 'Configurar Horários'}
                    </button>
                    <div class="flex items-center gap-3">
                        ${this.hasUnsavedChanges ? `
                            <span class="text-xs font-bold text-orange-500 animate-pulse">
                                <i class="fas fa-circle text-[8px] mr-1"></i> Alterações pendentes
                            </span>
                        ` : ''}
                        <button onclick="horarioView.salvarTudo()" 
                                class="btn-primary px-6 py-2 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-105 transition-transform ${this.hasUnsavedChanges ? 'ring-2 ring-orange-300 ring-offset-2' : ''}">
                            <i class="fas fa-save"></i> Salvar Alterações
                        </button>
                    </div>
                </div>
                <div id="grade-content" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
                    ${this.modoEdicao ? this.renderConfiguracao() : this.renderGrade()}
                    <div id="saving-overlay" class="absolute inset-0 bg-white/80 backdrop-blur-sm hidden flex-col items-center justify-center z-10">
                        <i class="fas fa-circle-notch fa-spin text-4xl text-primary mb-2"></i>
                        <span class="font-bold text-slate-600">Salvando e Sincronizando...</span>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    },
    carregarDoModel() {
        const modelData = model.state.horario || { config: {}, grade: {} };
        this.tempState = JSON.parse(JSON.stringify(modelData));
        this.hasUnsavedChanges = false;
    },
    async salvarTudo() {
        const overlay = document.getElementById('saving-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.style.display = 'flex';
        }
        try {
            const sucesso = await model.saveHorarioCompleto(this.tempState);
            if (sucesso) {
                this.hasUnsavedChanges = false;
                Toast.show("Horário salvo e sincronizado com sucesso!", "success");
                controller.navigate('horario');
            } else {
                Toast.show("Salvo localmente, mas houve erro na nuvem. Verifique sua conexão.", "warning");
                if (overlay) overlay.style.display = 'none';
            }
        } catch (error) {
            console.error(error);
            Toast.show("Erro inesperado ao salvar.", "error");
            if (overlay) overlay.style.display = 'none';
        }
    },
    marcarAlteracao() {
        this.hasUnsavedChanges = true;
        this.render('view-container');
    },
    mudarTurno(turno) {
        if (this.hasUnsavedChanges) {
            if (!confirm("Você tem alterações não salvas. Deseja descartá-las e mudar de turno?")) return;
            this.carregarDoModel();
        }
        this.turnoAtual = turno;
        this.modoEdicao = false;
        controller.navigate('horario');
    },
    toggleModoEdicao() {
        this.modoEdicao = !this.modoEdicao;
        controller.navigate('horario');
    },
    renderConfiguracao() {
        const config = (this.tempState.config && this.tempState.config[this.turnoAtual]) || [];
        if (config.length === 0) {
            return `
                <div class="p-12 text-center">
                    <div class="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                        <i class="far fa-clock"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-800 mb-2">Turno Vazio</h3>
                    <p class="text-slate-500 mb-6">Defina os horários das aulas.</p>
                    <button onclick="horarioView.criarPadrao()" class="text-primary font-bold hover:underline">
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
                        <div class="flex items-center gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50">
                            <div class="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-400 text-xs">
                                ${index + 1}º
                            </div>
                            <div class="grid grid-cols-2 gap-4 flex-1">
                                <div>
                                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Início</label>
                                    <input type="time" value="${slot.inicio}" 
                                           onchange="horarioView.atualizarSlotLocal(${index}, 'inicio', this.value)" 
                                           class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-primary outline-none">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fim</label>
                                    <input type="time" value="${slot.fim}" 
                                           onchange="horarioView.atualizarSlotLocal(${index}, 'fim', this.value)" 
                                           class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-primary outline-none">
                                </div>
                            </div>
                            <button onclick="horarioView.removerSlotLocal(${index})" class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition ml-2">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },
    criarPadrao() {
        let slots = [];
        if (this.turnoAtual === 'matutino') {
            slots = [{ inicio: '07:00', fim: '07:50' }, { inicio: '07:50', fim: '08:40' }, { inicio: '08:40', fim: '09:30' }, { inicio: '09:50', fim: '10:40' }, { inicio: '10:40', fim: '11:30' }];
        } else if (this.turnoAtual === 'vespertino') {
            slots = [{ inicio: '13:00', fim: '13:50' }, { inicio: '13:50', fim: '14:40' }, { inicio: '14:40', fim: '15:30' }, { inicio: '15:50', fim: '16:40' }, { inicio: '16:40', fim: '17:30' }];
        } else {
            slots = [{ inicio: '19:00', fim: '19:45' }, { inicio: '19:45', fim: '20:30' }, { inicio: '20:40', fim: '21:25' }, { inicio: '21:25', fim: '22:10' }];
        }
        if (!this.tempState.config) this.tempState.config = {};
        this.tempState.config[this.turnoAtual] = slots;
        this.marcarAlteracao();
    },
    adicionarSlot() {
        if (!this.tempState.config) this.tempState.config = {};
        if (!this.tempState.config[this.turnoAtual]) this.tempState.config[this.turnoAtual] = [];

        const lista = this.tempState.config[this.turnoAtual];
        let novoInicio = '07:30';
        let novoFim = '08:15';
        if (lista.length > 0) {
            const ultimaAula = lista[lista.length - 1];
            if (ultimaAula.fim && ultimaAula.fim !== '00:00') {
                const [h, m] = ultimaAula.fim.split(':').map(Number);
                const dataFim = new Date();
                dataFim.setHours(h, m, 0);
                const format = (d) => d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
                novoInicio = format(dataFim); 
                dataFim.setMinutes(dataFim.getMinutes() + 50); 
                novoFim = format(dataFim);
            }
        } else {
            if (this.turnoAtual === 'vespertino') { novoInicio = '13:00'; novoFim = '13:50'; }
            if (this.turnoAtual === 'noturno') { novoInicio = '19:00'; novoFim = '19:45'; }
        }

        this.tempState.config[this.turnoAtual].push({ inicio: novoInicio, fim: novoFim });
        this.marcarAlteracao();
    },
    removerSlotLocal(index) {
        this.tempState.config[this.turnoAtual].splice(index, 1);
        this.marcarAlteracao();
    },
    atualizarSlotLocal(index, campo, valor) {
        this.tempState.config[this.turnoAtual][index][campo] = valor;
        this.hasUnsavedChanges = true;
        const btnSalvar = document.querySelector('button .fa-save')?.parentElement;
        if (btnSalvar) btnSalvar.classList.add('ring-2', 'ring-orange-300', 'ring-offset-2');
    },
    renderGrade() {
        const config = (this.tempState.config && this.tempState.config[this.turnoAtual]) || [];
        const grade = (this.tempState.grade && this.tempState.grade[this.turnoAtual]) || {};
        const turmas = model.state.turmas;
        const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
        const diasLabel = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
        if (config.length === 0) {
            return `<div class="p-12 text-center text-slate-400">Configure os horários primeiro.</div>`;
        }
        const getTurmaOptions = (selectedId) => {
            let opts = `<option value="">- Livre -</option>`;
            opts += turmas.map(t => `<option value="${t.id}" ${t.id === selectedId ? 'selected' : ''}>${escapeHTML(t.nome)}</option>`).join('');
            return opts;
        };
        return `
            <div class="overflow-x-auto custom-scrollbar pb-4">
                <table class="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr>
                            <th class="p-4 border-b border-slate-200 bg-slate-50 w-20 text-xs font-bold text-slate-400 uppercase text-center sticky left-0 z-10">Horário</th>
                            ${diasLabel.map(dia => `<th class="p-4 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 uppercase text-center">${dia}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${config.map((slot, slotIdx) => `
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <td class="p-3 border-r border-slate-100 text-center sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    <div class="text-xs font-bold text-slate-700">${slot.inicio}</div>
                                    <div class="text-[10px] font-medium text-slate-400">${slot.fim}</div>
                                </td>
                                ${diasSemana.map(diaKey => {
            const turmaId = (grade[diaKey] && grade[diaKey][slotIdx]) || "";
            const cardStyle = turmaId ? `bg-blue-50 border-blue-200 text-primary font-bold` : `text-slate-400`;
            return `
                                        <td class="p-2">
                                            <select onchange="horarioView.atualizarGradeLocal('${diaKey}', ${slotIdx}, this.value)" 
                                                    class="w-full p-2 rounded-lg border border-transparent hover:border-slate-200 text-xs outline-none cursor-pointer transition-all ${cardStyle} focus:ring-2 focus:ring-primary focus:bg-white text-center">
                                                ${getTurmaOptions(turmaId)}
                                            </select>
                                        </td>
                                    `;
        }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },
    atualizarGradeLocal(dia, slotIdx, turmaId) {
        if (!this.tempState.grade) this.tempState.grade = {};
        if (!this.tempState.grade[this.turnoAtual]) this.tempState.grade[this.turnoAtual] = {};
        if (!this.tempState.grade[this.turnoAtual][dia]) this.tempState.grade[this.turnoAtual][dia] = [];
        while (this.tempState.grade[this.turnoAtual][dia].length <= slotIdx) {
            this.tempState.grade[this.turnoAtual][dia].push(null);
        }
        this.tempState.grade[this.turnoAtual][dia][slotIdx] = turmaId;
        this.hasUnsavedChanges = true;
        const btnSalvar = document.querySelector('button .fa-save')?.parentElement;
        if (btnSalvar) {
            btnSalvar.classList.add('ring-2', 'ring-orange-300', 'ring-offset-2');
            btnSalvar.classList.add('animate-pulse');
            setTimeout(() => btnSalvar.classList.remove('animate-pulse'), 500);
        }
    }
};
