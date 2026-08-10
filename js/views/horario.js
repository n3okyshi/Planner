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
            <div class="animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8);">
                
                <!-- TOP HEADER & TURNOS TOOLBAR -->
                <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em; display: flex; align-items: center; gap: var(--spacing-2);">
                            <i class="far fa-clock" style="color: var(--color-primary);"></i> Grade Horária Semanal
                        </h2>
                        <p style="font-size: 0.875rem; color: var(--color-slate-500);">Organize as aulas por turno, dia da semana e componente curricular.</p>
                    </div>

                    <div style="display: flex; align-items: center; gap: var(--spacing-3); flex-wrap: wrap;">
                        <div class="mode-toggle-group">
                            <button type="button" onclick="horarioView.mudarTurno('matutino')" class="mode-toggle-btn interactive-element ${this.turnoAtual === 'matutino' ? 'mode-toggle-btn--active' : ''}">Manhã</button>
                            <button type="button" onclick="horarioView.mudarTurno('vespertino')" class="mode-toggle-btn interactive-element ${this.turnoAtual === 'vespertino' ? 'mode-toggle-btn--active' : ''}">Tarde</button>
                            <button type="button" onclick="horarioView.mudarTurno('noturno')" class="mode-toggle-btn interactive-element ${this.turnoAtual === 'noturno' ? 'mode-toggle-btn--active' : ''}">Noite</button>
                        </div>
                    </div>
                </div>

                <!-- CONTROLS & ACTIONS TOOLBAR -->
                <div class="card" style="padding: var(--spacing-3) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-3); background-color: var(--color-slate-50);">
                    <button type="button" onclick="horarioView.toggleModoEdicao()" class="btn-secondary" style="padding: 0.5rem 1rem;">
                        <i class="fas ${this.modoEdicao ? 'fa-table' : 'fa-cog'}"></i>
                        <span>${this.modoEdicao ? 'Voltar para Grade' : 'Configurar Horários'}</span>
                    </button>

                    <div style="display: flex; align-items: center; gap: var(--spacing-3);">
                        ${this.hasUnsavedChanges ? `
                            <span style="font-size: 0.75rem; font-weight: 800; color: #ea580c; display: flex; align-items: center; gap: 0.375rem;">
                                <i class="fas fa-circle" style="font-size: 0.5rem;"></i> Alterações não salvas
                            </span>
                        ` : ''}
                        <button type="button" onclick="horarioView.salvarTudo()" class="btn-primary" style="padding: 0.5rem 1.25rem;">
                            <i class="fas fa-save"></i> <span>Salvar Alterações</span>
                        </button>
                    </div>
                </div>

                <!-- GRID CONTENT -->
                <div id="grade-content" class="card" style="padding: 0; overflow: hidden; position: relative; min-height: 320px;">
                    ${this.modoEdicao ? this.renderConfiguracao() : this.renderGrade()}

                    <div id="saving-overlay" style="position: absolute; inset: 0; background-color: rgba(255, 255, 255, 0.85); backdrop-filter: blur(4px); display: none; flex-direction: column; align-items: center; justify-content: center; z-index: 30;">
                        <i class="fas fa-circle-notch fa-spin" style="font-size: 2.5rem; color: var(--color-primary); margin-bottom: 0.5rem;"></i>
                        <span style="font-weight: 800; color: var(--color-slate-800);">Sincronizando Grade Horária...</span>
                    </div>
                </div>

                ${!this.modoEdicao ? this.renderLegenda() : ''}
            </div>
        `;

        container.innerHTML = html;
    },

    carregarDoModel() {
        const modelData = model.state.horario || { config: {}, grade: {} };
        this.tempState = JSON.parse(JSON.stringify(modelData));

        if (!this.tempState.config) this.tempState.config = {};
        if (!this.tempState.grade) this.tempState.grade = {};

        this.hasUnsavedChanges = false;
    },

    async salvarTudo() {
        const overlay = document.getElementById('saving-overlay');
        if (overlay) overlay.style.display = 'flex';

        try {
            const sucesso = await model.saveHorarioCompleto(this.tempState);

            if (sucesso) {
                this.hasUnsavedChanges = false;
                Toast.show("Horário salvo e sincronizado com sucesso!", "success");

                if (this.modoEdicao) {
                    this.modoEdicao = false;
                    controller.navigate('horario');
                } else {
                    this.render('view-container');
                }
            } else {
                Toast.show("Salvo localmente. Verifique a conexão com a nuvem.", "warning");
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
                <div style="padding: 4rem 2rem; text-align: center;">
                    <div style="width: 4rem; height: 4rem; border-radius: var(--radius-full); background-color: var(--color-primary-light); color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; margin: 0 auto 1rem;">
                        <i class="far fa-clock"></i>
                    </div>
                    <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.5rem;">Turno Vazio</h3>
                    <p style="color: var(--color-slate-500); font-size: 0.875rem; margin-bottom: 1.5rem;">Defina os intervalos e horários de aula deste turno.</p>
                    <button onclick="horarioView.criarPadrao()" class="btn-primary" style="margin: 0 auto;">
                        <i class="fas fa-magic"></i> <span>Criar Padrão (5 Aulas)</span>
                    </button>
                </div>
            `;
        }

        return `
            <div style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--spacing-3); border-bottom: 1px solid var(--color-slate-100);">
                    <h3 style="font-size: 1rem; font-weight: 800; color: var(--color-slate-800);">Configuração dos Horários (${this.turnoAtual.toUpperCase()})</h3>
                    <button onclick="horarioView.adicionarSlot()" class="btn-secondary" style="padding: 0.375rem 0.75rem; font-size: 0.75rem;">
                        <i class="fas fa-plus"></i> <span>Adicionar Aula</span>
                    </button>
                </div>

                <div style="display: flex; flex-direction: column; gap: var(--spacing-3);">
                    ${config.map((slot, index) => `
                        <div style="display: flex; align-items: center; gap: var(--spacing-4); padding: var(--spacing-3) var(--spacing-4); background-color: var(--color-slate-50); border: 1px solid var(--color-slate-200); border-radius: var(--radius-xl);">
                            <div style="width: 2rem; height: 2rem; border-radius: 50%; background-color: white; border: 1px solid var(--color-slate-200); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; color: var(--color-slate-500); flex-shrink: 0;">
                                ${index + 1}º
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4); flex: 1;">
                                <div>
                                    <label class="form-label" style="font-size: 0.625rem; margin-bottom: 0.25rem;">Horário Inicial</label>
                                    <input type="time" value="${slot.inicio}" 
                                           onchange="horarioView.atualizarSlotLocal(${index}, 'inicio', this.value)" 
                                           class="form-input" style="padding: 0.375rem 0.625rem; font-weight: 800;">
                                </div>
                                <div>
                                    <label class="form-label" style="font-size: 0.625rem; margin-bottom: 0.25rem;">Horário Final</label>
                                    <input type="time" value="${slot.fim}" 
                                           onchange="horarioView.atualizarSlotLocal(${index}, 'fim', this.value)" 
                                           class="form-input" style="padding: 0.375rem 0.625rem; font-weight: 800;">
                                </div>
                            </div>

                            <button onclick="horarioView.removerSlotLocal(${index})" class="btn-icon" style="color: var(--color-slate-400);" title="Remover horário">
                                <i class="fas fa-trash-alt" style="font-size: 0.875rem;"></i>
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

                const format = (d) => d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
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
    },

    renderGrade() {
        const config = (this.tempState.config && this.tempState.config[this.turnoAtual]) || [];
        const grade = (this.tempState.grade && this.tempState.grade[this.turnoAtual]) || {};

        const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
        const diasLabel = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

        if (config.length === 0) {
            return `
                <div style="padding: 4rem 2rem; text-align: center; color: var(--color-slate-400);">
                    <i class="far fa-clock" style="font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                    <p style="font-weight: 600;">Nenhum horário configurado para este turno.</p>
                    <button onclick="horarioView.criarPadrao()" class="btn-primary" style="margin: 1rem auto 0;">
                        <i class="fas fa-magic"></i> <span>Criar Horários Padrão</span>
                    </button>
                </div>
            `;
        }

        return `
            <div class="custom-scrollbar" style="overflow-x: auto;">
                <table style="width: 100%; text-align: left; border-collapse: collapse; min-width: 750px;">
                    <thead>
                        <tr style="background-color: var(--color-slate-50); border-bottom: 1px solid var(--color-slate-200);">
                            <th style="padding: var(--spacing-4); width: 6.5rem; font-size: 0.75rem; font-weight: 800; color: var(--color-slate-400); text-transform: uppercase; text-align: center; position: sticky; left: 0; background-color: var(--color-slate-50); z-index: 10;">Horário</th>
                            ${diasLabel.map(dia => `<th style="padding: var(--spacing-4); font-size: 0.75rem; font-weight: 800; color: var(--color-slate-600); text-transform: uppercase; text-align: center;">${dia}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${config.map((slot, slotIdx) => `
                            <tr style="border-bottom: 1px solid var(--color-slate-100);">
                                <td style="padding: var(--spacing-3); text-align: center; position: sticky; left: 0; background-color: white; z-index: 10; box-shadow: 2px 0 5px -2px rgba(0,0,0,0.05); border-right: 1px solid var(--color-slate-100);">
                                    <div style="font-size: 0.8125rem; font-weight: 800; color: var(--color-slate-700);">${slot.inicio}</div>
                                    <div style="font-size: 0.6875rem; font-weight: 600; color: var(--color-slate-400);">${slot.fim}</div>
                                </td>
                                ${diasSemana.map(diaKey => {
            const aula = (grade[diaKey] && grade[diaKey][slotIdx]) || null;
            const turmaId = aula?.turmaId || "";
            const disciplina = aula?.disciplina || "";
            const corDisciplina = (model.coresComponentes && model.coresComponentes[disciplina]) || '#64748b';

            const cardStyle = turmaId
                ? `background-color: white; border-left: 4px solid ${corDisciplina}; border-top: 1px solid var(--color-slate-200); border-right: 1px solid var(--color-slate-200); border-bottom: 1px solid var(--color-slate-200); box-shadow: var(--shadow-sm);`
                : `background-color: var(--color-slate-50); border: 1px dashed var(--color-slate-200); color: var(--color-slate-400);`;

            return `
                                        <td style="padding: 0.375rem;">
                                            <div onclick="horarioView.abrirEditorAula('${diaKey}', ${slotIdx})" 
                                                 class="interactive-element"
                                                 style="min-height: 52px; padding: 0.375rem 0.5rem; border-radius: var(--radius-lg); cursor: pointer; display: flex; flex-direction: column; justify-content: center; text-align: center; transition: all var(--transition-fast); ${cardStyle}">
                                                ${turmaId ? `
                                                    <div style="font-weight: 800; color: var(--color-slate-800); font-size: 0.8125rem; line-height: 1.2;">${window.escapeHTML(this.getTurmaNome(turmaId))}</div>
                                                    <div style="font-size: 0.625rem; font-weight: 700; text-transform: uppercase; color: ${corDisciplina}; margin-top: 0.125rem;">${window.escapeHTML(disciplina || 'Geral')}</div>
                                                ` : '<span style="font-size: 0.6875rem; font-style: italic; opacity: 0.6;">Livre</span>'}
                                            </div>
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

    getTurmaNome(turmaId) {
        const turmas = model.state.turmas || [];
        const turma = turmas.find(t => String(t.id) === String(turmaId));
        return turma ? turma.nome : 'Turma Removida';
    },

    abrirEditorAula(dia, slotIdx) {
        const grade = (this.tempState.grade && this.tempState.grade[this.turnoAtual]) || {};
        const aulaAtual = (grade[dia] && grade[dia][slotIdx]) || { turmaId: '', disciplina: '' };

        const html = `
            <div style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
                <div>
                    <label class="form-label">Selecione a Turma</label>
                    <select id="editor-turma" class="form-select">
                        <option value="">- Janela / Aula Livre -</option>
                        ${(model.state.turmas || []).map(t => `<option value="${t.id}" ${String(t.id) === String(aulaAtual.turmaId) ? 'selected' : ''}>${window.escapeHTML(t.nome)}</option>`).join('')}
                    </select>
                </div>

                <div>
                    <label class="form-label">Componente / Disciplina</label>
                    <select id="editor-disciplina" class="form-select">
                        <option value="">- Geral -</option>
                        ${Object.keys(model.coresComponentes || {}).map(disc => {
            const discSafe = window.escapeHTML ? window.escapeHTML(disc) : disc;
            return `<option value="${discSafe}" ${disc === aulaAtual.disciplina ? 'selected' : ''}>${discSafe}</option>`;
        }).join('')}
                    </select>
                </div>

                <div style="display: flex; gap: var(--spacing-3); margin-top: var(--spacing-2); padding-top: var(--spacing-4); border-top: 1px solid var(--color-slate-100);">
                    <button onclick="controller.closeModal()" class="btn-secondary" style="flex: 1; justify-content: center; padding: 0.75rem;">Cancelar</button>
                    <button onclick="horarioView.confirmarAula('${dia}', ${slotIdx})" class="btn-primary" style="flex: 1; justify-content: center; padding: 0.75rem;">
                        <i class="fas fa-check"></i> <span>Confirmar</span>
                    </button>
                </div>
            </div>
        `;
        controller.openModal('Definir Aula da Grade', html);
    },

    confirmarAula(dia, slotIdx) {
        const turmaId = document.getElementById('editor-turma').value;
        const disciplina = document.getElementById('editor-disciplina').value;

        this.atualizarGradeLocal(dia, slotIdx, { turmaId, disciplina });
        controller.closeModal();
    },

    atualizarGradeLocal(dia, slotIdx, aulaObj) {
        if (!this.tempState.grade) this.tempState.grade = {};
        if (!this.tempState.grade[this.turnoAtual]) this.tempState.grade[this.turnoAtual] = {};
        if (!this.tempState.grade[this.turnoAtual][dia]) this.tempState.grade[this.turnoAtual][dia] = [];

        while (this.tempState.grade[this.turnoAtual][dia].length <= slotIdx) {
            this.tempState.grade[this.turnoAtual][dia].push(null);
        }

        this.tempState.grade[this.turnoAtual][dia][slotIdx] = aulaObj.turmaId ? aulaObj : null;
        this.hasUnsavedChanges = true;
        this.render('view-container');
    },

    renderLegenda() {
        const grade = (this.tempState.grade && this.tempState.grade[this.turnoAtual]) || {};
        const disciplinasUsadas = new Set();

        Object.values(grade).forEach(dia => {
            if (Array.isArray(dia)) {
                dia.forEach(aula => {
                    if (aula && aula.disciplina) disciplinasUsadas.add(aula.disciplina);
                });
            }
        });

        if (disciplinasUsadas.size === 0) return '';

        return `
            <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-3);">
                <h4 style="font-size: 0.6875rem; font-weight: 900; color: var(--color-slate-400); text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-palette" style="color: var(--color-primary);"></i> Componentes Utilizados na Grade
                </h4>
                <div style="display: flex; flex-wrap: wrap; gap: 1rem 1.5rem;">
                    ${Array.from(disciplinasUsadas).map(disc => `
                        <div style="display: flex; align-items: center; gap: 0.375rem;">
                            <div style="width: 0.75rem; height: 0.75rem; border-radius: 50%; background-color: ${model.coresComponentes[disc] || '#64748b'};"></div>
                            <span style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-700);">${disc}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
};

if (typeof window !== 'undefined') {
    window.horarioView = horarioView;
}