import { model } from '../model.js';
import { controller } from '../controller.js';
import { turmasView } from '../views/turmas.js';
import { Toast } from '../components/toast.js';
import { firebaseService } from '../firebase-service.js';
export const turmaController = {
    wizard: {
        step: 1,
        maxSteps: 4,
        data: {
            id: null,
            nome: '',
            serie: '',
            disciplina: '',
            turno: '',
            periodoLetivo: { inicio: '', termino: '', divisao: 'Bimestral', media: 6.0, faltas: '' },
            horarios: [],
            alunosRascunho: [],
            textoBrutoAlunos: ''
        }
    },
    disciplinas: [
        "Matemática", "Ciências", "Geografia", "História", "Língua Portuguesa",
        "Inglês", "Arte", "Educação Física", "Física", "Química", "Biologia"
    ],
    series: [
        "Educação Infantil", "1º Ano — EF I", "2º Ano — EF I", "3º Ano — EF I",
        "4º Ano — EF I", "5º Ano — EF I", "6º Ano — EF II", "7º Ano — EF II",
        "8º Ano — EF II", "9º Ano — EF II", "1ª Série — EM", "2ª Série — EM", "3ª Série — EM"
    ],
    openAddTurma() {
        this.wizard.step = 1;
        this.wizard.data = {
            id: 'turma_' + Date.now().toString(36),
            nome: '', serie: '', disciplina: '', turno: '',
            periodoLetivo: { inicio: '', termino: '', divisao: 'Bimestral', media: 6.0, faltas: '' },
            horarios: [], alunosRascunho: [], textoBrutoAlunos: ''
        };

        const html = `<div id="wizard-container" class="min-h-[500px] flex flex-col relative transition-all duration-300"></div>`;
        controller.openModal('', html, 'xl');
        setTimeout(() => this.renderWizardStep(), 50);
    },
    avancar() {
        if (!this.salvarEstadoPassoAtual()) return;
        if (this.wizard.step < this.wizard.maxSteps) {
            this.wizard.step++;
            this.renderWizardStep();
        } else {
            this.finalizarWizard();
        }
    },
    voltar() {
        this.salvarEstadoPassoAtual();
        if (this.wizard.step > 1) {
            this.wizard.step--;
            this.renderWizardStep();
        } else {
            controller.closeModal();
        }
    },
    salvarEstadoPassoAtual() {
        const step = this.wizard.step;
        const d = this.wizard.data;
        if (step === 1) {
            d.nome = document.getElementById('wiz-nome')?.value.trim();
            d.serie = document.getElementById('wiz-serie')?.value;
            d.disciplina = document.getElementById('wiz-disciplina')?.value;
            d.turno = document.getElementById('wiz-turno')?.value;

            if (!d.nome) {
                Toast.show("O nome da turma é obrigatório.", "warning");
                document.getElementById('wiz-nome')?.focus();
                return false;
            }
        }
        else if (step === 2) {
            d.periodoLetivo.inicio = document.getElementById('wiz-per-ini')?.value;
            d.periodoLetivo.termino = document.getElementById('wiz-per-fim')?.value;
            d.periodoLetivo.divisao = document.getElementById('wiz-per-div')?.value;
            d.periodoLetivo.media = parseFloat(document.getElementById('wiz-per-med')?.value) || 6.0;
            d.periodoLetivo.faltas = parseInt(document.getElementById('wiz-per-faltas')?.value) || null;
        }
        else if (step === 4) {
            const textarea = document.getElementById('wiz-alunos-texto');
            if (textarea && textarea.parentElement.classList.contains('hidden') === false) {
                d.textoBrutoAlunos = textarea.value;
                this.limparListaAlunos(d.textoBrutoAlunos);
            }
        }
        return true;
    },
    limparListaAlunos(textoBruto) {
        if (!textoBruto) {
            this.wizard.data.alunosRascunho = [];
            return;
        }
        const linhas = textoBruto.split('\n');
        const alunosLimpos = [];
        linhas.forEach(linha => {
            let nome = linha.replace(/^[0-9]+[.\-)]*\s*/, '').trim();
            nome = nome.replace(/^-\s*/, '').trim();
            if (nome.length > 2) {
                nome = nome.toLowerCase().replace(/(?:^|\s)\S/g, a => a.toUpperCase());
                alunosLimpos.push(nome);
            }
        });
        this.wizard.data.alunosRascunho = alunosLimpos;
        this.renderRevisaoAlunos();
    },
    removerAlunoRascunho(index) {
        this.wizard.data.alunosRascunho.splice(index, 1);
        this.renderRevisaoAlunos();
    },
    finalizarWizard() {
        const d = this.wizard.data;
        const novaTurma = {
            id: d.id,
            nome: d.nome,
            serie: d.serie,
            disciplina: d.disciplina,
            turno: d.turno,
            periodoLetivo: d.periodoLetivo,
            horarios: d.horarios,
            planejamento: {},
            planejamentoMensal: {},
            alunos: [],
            avaliacoes: []
        };
        d.alunosRascunho.forEach((nomeAluno, index) => {
            const numChamada = String(index + 1).padStart(2, '0');
            novaTurma.alunos.push({
                id: 'aluno_' + Date.now().toString(36) + '_' + index,
                nome: nomeAluno,
                chamada: numChamada,
                matricula: '',
                status: 'cursando',
                posicao: null,
                frequencia: {},
                notas: {}
            });
        });
        if (!model.state.turmas) model.state.turmas = [];
        model.state.turmas.push(novaTurma);

        model.saveLocal();
        if (model.persist && window.firebaseService) {
            model.persist(() => firebaseService.saveTurma(model.currentUser.uid, novaTurma));
        }
        Toast.show("Turma criada com sucesso!", "success");
        controller.closeModal();
        controller.navigate('turmas');
    },
    renderWizardStep() {
        const container = document.getElementById('wizard-container');
        if (!container) return;
        const { step } = this.wizard;

        let headerHtml = `
            <div class="wizard-header">
                <button type="button" onclick="turmaController.voltar()" class="btn-outline">
                    <i class="fas fa-chevron-left"></i> ${step === 1 ? 'Cancelar' : 'Voltar'}
                </button>
                <div class="hidden md:flex items-center gap-2">
                    ${this.gerarProgressoVisual()}
                </div>
            </div>
        `;
        let bodyHtml = '';
        let footerHtml = `
            <div class="wizard-footer">
                <button type="button" onclick="turmaController.avancar()" class="btn-primary" style="padding: 0.75rem 2rem;">
                    ${step === 4 ? 'Concluir e Salvar' : 'Continuar'} <i class="fas ${step === 4 ? 'fa-check' : 'fa-chevron-right'}"></i>
                </button>
            </div>
        `;
        switch (step) {
            case 1: bodyHtml = this.renderStep1_Dados(); break;
            case 2: bodyHtml = this.renderStep2_Periodo(); break;
            case 3: bodyHtml = this.renderStep3_Horarios(); break;
            case 4:
                bodyHtml = this.renderStep4_Alunos();
                footerHtml = '';
                break;
        }
        container.innerHTML = headerHtml + `<div class="flex-1 animate-slide-in">` + bodyHtml + `</div>` + footerHtml;
        if (step === 4 && this.wizard.data.alunosRascunho.length > 0) {
            this.renderRevisaoAlunos();
        }
    },
    gerarProgressoVisual() {
        const steps = ['Dados', 'Período', 'Horários', 'Alunos'];
        return steps.map((label, idx) => {
            const numero = idx + 1;
            const isActive = numero === this.wizard.step;
            const isCompleted = numero < this.wizard.step;

            let circleClass = 'wizard-step';
            let iconOrNum = numero;
            if (isCompleted) {
                circleClass += ' wizard-step--completed';
                iconOrNum = '<i class="fas fa-check"></i>';
            } else if (isActive) {
                circleClass += ' wizard-step--active';
            }
            const linha = idx < 3 ? `<div class="wizard-step__line ${isCompleted ? 'wizard-step__line--completed' : ''}"></div>` : '';
            return `
                <div style="display: flex; align-items: center; gap: var(--spacing-2);">
                    <div style="display: flex; align-items: center; gap: var(--spacing-2);">
                        <div class="${circleClass}">
                            ${iconOrNum}
                        </div>
                        <span style="font-size: 0.75rem; font-weight: 700; color: ${isActive || isCompleted ? 'var(--color-slate-700)' : 'var(--color-slate-400)'};">${label}</span>
                    </div>
                    ${linha}
                </div>
            `;
        }).join('');
    },
    renderStep1_Dados() {
        const d = this.wizard.data;
        return `
            <div style="max-width: 42rem; margin: 0 auto; display: flex; flex-direction: column; gap: var(--spacing-6);">
                <div>
                    <h3 style="font-size: 1.5rem; font-weight: 700; color: var(--color-slate-800);">Dados da turma</h3>
                    <p style="color: var(--color-slate-500); font-size: 0.875rem; margin-top: var(--spacing-1);">Só o nome é obrigatório — o resto dá pra ajustar depois.</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: var(--spacing-4);">
                    <div>
                        <label class="form-label">Nome da turma *</label>
                        <input type="text" id="wiz-nome" value="${d.nome}" placeholder="Ex: 9º Ano B, Manhã" class="form-input">
                    </div>
                    <div>
                        <label class="form-label">Série</label>
                        <select id="wiz-serie" class="form-select">
                            <option value="">—</option>
                            ${this.series.map(s => `<option value="${s}" ${d.serie === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Disciplina</label>
                        <select id="wiz-disciplina" class="form-select">
                            <option value="">—</option>
                            ${this.disciplinas.map(m => `<option value="${m}" ${d.disciplina === m ? 'selected' : ''}>${m}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Turno</label>
                        <select id="wiz-turno" class="form-select">
                            <option value="">—</option>
                            <option value="Manhã" ${d.turno === 'Manhã' ? 'selected' : ''}>Manhã</option>
                            <option value="Tarde" ${d.turno === 'Tarde' ? 'selected' : ''}>Tarde</option>
                            <option value="Noite" ${d.turno === 'Noite' ? 'selected' : ''}>Noite</option>
                            <option value="Integral" ${d.turno === 'Integral' ? 'selected' : ''}>Integral</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    },
    renderStep2_Periodo() {
        const d = this.wizard.data.periodoLetivo;
        return `
            <div style="max-width: 42rem; margin: 0 auto; display: flex; flex-direction: column; gap: var(--spacing-6);">
                <div>
                    <h3 style="font-size: 1.5rem; font-weight: 700; color: var(--color-slate-800);">Período letivo e avaliação</h3>
                    <p style="color: var(--color-slate-500); font-size: 0.875rem; margin-top: var(--spacing-1);">Opcional. Define os bimestres e as regras de aprovação/faltas.</p>
                </div>
                <div style="padding: var(--spacing-6); background-color: var(--color-slate-50); border: 1px solid var(--color-slate-200); border-radius: var(--radius-2xl); display: flex; flex-direction: column; gap: var(--spacing-5);">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4);">
                        <div>
                            <label class="form-label">Início</label>
                            <input type="date" id="wiz-per-ini" value="${d.inicio}" class="form-input">
                        </div>
                        <div>
                            <label class="form-label">Término</label>
                            <input type="date" id="wiz-per-fim" value="${d.termino}" class="form-input">
                        </div>
                    </div>
                    <div>
                        <label class="form-label">Divisão do ano</label>
                        <select id="wiz-per-div" class="form-select">
                            <option value="Bimestral" ${d.divisao === 'Bimestral' ? 'selected' : ''}>Bimestral (4 períodos)</option>
                            <option value="Trimestral" ${d.divisao === 'Trimestral' ? 'selected' : ''}>Trimestral (3 períodos)</option>
                            <option value="Semestral" ${d.divisao === 'Semestral' ? 'selected' : ''}>Semestral (2 períodos)</option>
                            <option value="Anual" ${d.divisao === 'Anual' ? 'selected' : ''}>Anual (Sem divisões)</option>
                        </select>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4);">
                    <div>
                        <label class="form-label">Média de aprovação</label>
                        <input type="number" id="wiz-per-med" value="${d.media}" step="0.1" class="form-input" placeholder="Ex: 6.0">
                    </div>
                    <div>
                        <label class="form-label">Limite de faltas</label>
                        <input type="number" id="wiz-per-faltas" value="${d.faltas}" class="form-input" placeholder="Ex: 25">
                    </div>
                </div>
            </div>
        `;
    },
    renderStep3_Horarios() {
        return `
            <div style="max-width: 42rem; margin: 0 auto; display: flex; flex-direction: column; gap: var(--spacing-6);">
                <div>
                    <h3 style="font-size: 1.5rem; font-weight: 700; color: var(--color-slate-800);">Horários das aulas</h3>
                    <p style="color: var(--color-slate-500); font-size: 0.875rem; margin-top: var(--spacing-1);">Opcional. Com os horários, a chamada do dia aparece sozinha.</p>
                </div>
                <div style="padding: var(--spacing-10); border: 2px dashed var(--color-slate-200); border-radius: var(--radius-2xl); text-align: center; background-color: var(--color-slate-50);">
                    <i class="far fa-clock" style="font-size: 2.25rem; color: var(--color-slate-300); margin-bottom: var(--spacing-4);"></i>
                    <h4 style="font-weight: 700; color: var(--color-slate-600); margin-bottom: var(--spacing-1);">Módulo unificado na Grade Horária</h4>
                    <p style="font-size: 0.875rem; color: var(--color-slate-500); margin-bottom: var(--spacing-6); max-width: 24rem; margin-left: auto; margin-right: auto;">Para evitar conflitos de horários entre turmas, toda a alocação de aulas agora é feita na aba central de <strong>Grade Horária</strong>.</p>
                    <button type="button" onclick="turmaController.avancar()" class="btn-primary" style="margin: 0 auto;">
                        Pular esta etapa <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
    },
    renderStep4_Alunos() {
        const d = this.wizard.data;
        return `
            <div style="max-width: 42rem; margin: 0 auto; display: flex; flex-direction: column; gap: var(--spacing-6); height: 100%;">
                <div>
                    <h3 style="font-size: 1.5rem; font-weight: 700; color: var(--color-slate-800);">Alunos da turma</h3>
                    <p style="color: var(--color-slate-500); font-size: 0.875rem; margin-top: var(--spacing-1);">Cole a lista do WhatsApp ou da secretaria — você confere antes de criar.</p>
                </div>
                <div id="step-colar-alunos" style="display: ${d.alunosRascunho.length > 0 ? 'none' : 'flex'}; flex-direction: column; flex: 1;">
                    <label class="form-label">Cole a lista, um nome por linha</label>
                    <textarea id="wiz-alunos-texto" rows="12" placeholder="Ana Beatriz Souza\nCarlos Eduardo Lima\nDaniela Nunes\n..." 
                              style="width: 100%; flex: 1; padding: var(--spacing-5); background-color: var(--color-slate-50); border: 1px solid var(--color-slate-200); border-radius: var(--radius-2xl); outline: none; font-family: monospace; font-size: 0.875rem; line-height: 1.625; resize: none;" class="form-input">${d.textoBrutoAlunos}</textarea>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--spacing-4); padding-top: var(--spacing-4); border-top: 1px solid var(--color-slate-100);">
                        <p style="font-size: 0.625rem; color: var(--color-slate-400); font-weight: 700; text-transform: uppercase;">Pode colar com número, "nº", travessão — a IA limpa.</p>
                        <button onclick="turmaController.salvarEstadoPassoAtual()" class="btn-primary" style="background-color: #e0e7ff; color: #4338ca;">
                            <i class="fas fa-magic"></i> Revisar Lista
                        </button>
                    </div>
                </div>
                <div id="step-revisar-alunos" style="display: none; flex-direction: column; flex: 1;">
                    <!-- Conteúdo injetado via JS na função renderRevisaoAlunos() -->
                </div>
            </div>
        `;
    },
    renderRevisaoAlunos() {
        const d = this.wizard.data;
        const containerColar = document.getElementById('step-colar-alunos');
        const containerRevisar = document.getElementById('step-revisar-alunos');
        const footerWizard = document.querySelector('.mt-auto.pt-6');
        if (!containerColar || !containerRevisar) return;
        containerColar.style.display = 'none';
        containerRevisar.style.display = 'flex';
        if (footerWizard) footerWizard.style.display = 'none';
        const itensHtml = d.alunosRascunho.map((nome, i) => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-3); background-color: var(--color-white); border: 1px solid var(--color-slate-100); border-radius: var(--radius-xl); box-shadow: var(--shadow-sm); animation: slideUp 0.3s ease forwards; animation-delay: ${i * 20}ms;">
                <div style="display: flex; align-items: center; gap: var(--spacing-3);">
                    <span style="font-size: 0.625rem; font-weight: 900; color: var(--color-slate-300); width: 1rem; text-align: right;">${i + 1}</span>
                    <span style="font-size: 0.875rem; font-weight: 700; color: var(--color-slate-700); text-transform: uppercase;">${window.escapeHTML(nome)}</span>
                </div>
                <button onclick="turmaController.removerAlunoRascunho(${i})" class="btn-icon" style="color: #ef4444; background-color: #fef2f2;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
        containerRevisar.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; background-color: #ecfdf5; border: 1px solid #d1fae5; padding: var(--spacing-4); border-radius: var(--radius-xl); margin-bottom: var(--spacing-4);">
                <span style="font-weight: 700; color: #065f46; font-size: 0.875rem;">Confira antes de salvar</span>
                <span style="background-color: #a7f3d0; color: #065f46; padding: 0.25rem 0.75rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 900; box-shadow: var(--shadow-sm);">${d.alunosRascunho.length} alunos</span>
            </div>
            <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: var(--spacing-2); padding-right: var(--spacing-2); padding-bottom: var(--spacing-4); max-height: 300px;">
                ${itensHtml}
            </div>
            <div class="wizard-footer">
                <button type="button" onclick="turmaController.voltarParaTexto()" class="btn-outline">
                    <i class="fas fa-arrow-left"></i> Voltar e colar de novo
                </button>
                <button type="button" onclick="turmaController.finalizarWizard()" class="btn-primary" style="padding: 0.75rem 2rem;">
                    Criar turma com ${d.alunosRascunho.length} alunos
                </button>
            </div>
        `;
    },
    voltarParaTexto() {
        const containerColar = document.getElementById('step-colar-alunos');
        const containerRevisar = document.getElementById('step-revisar-alunos');
        containerRevisar.style.display = 'none';
        containerColar.style.display = 'flex';
    },

    deleteTurma(id) {
        model.deleteTurma(id);
        controller.navigate('turmas');
        Toast.show("Turma removida com sucesso.", "info");
    },
    openAddAluno(turmaId, alunoId = null) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        const aluno = alunoId ? turma.alunos.find(a => String(a.id) === String(alunoId)) : null;
        const isEdit = !!aluno;

        const nome = aluno ? aluno.nome : '';
        const chamada = (aluno && aluno.chamada) ? aluno.chamada : '';
        const matricula = (aluno && aluno.matricula) ? aluno.matricula : '';
        const status = (aluno && aluno.status) ? aluno.status : 'cursando';
        const html = `
            <div style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
                <div>
                    <label class="form-label">Nome do Estudante *</label>
                    <input type="text" id="al-nome" class="form-input" placeholder="Nome completo..." value="${window.escapeHTML(nome)}">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4);">
                    <div>
                        <label class="form-label">Nº Chamada</label>
                        <input type="text" id="al-chamada" class="form-input" placeholder="Ex: 01" value="${window.escapeHTML(chamada)}">
                    </div>
                    <div>
                        <label class="form-label">Matrícula</label>
                        <input type="text" id="al-matricula" class="form-input" placeholder="Ex: 20261234" value="${window.escapeHTML(matricula)}">
                    </div>
                </div>
                <div>
                    <label class="form-label">Situação / Status</label>
                    <select id="al-status" class="form-select">
                        <option value="cursando" ${status === 'cursando' ? 'selected' : ''}>Cursando Ativamente</option>
                        <option value="transferido" ${status === 'transferido' ? 'selected' : ''}>Transferido para outra escola</option>
                        <option value="realocado" ${status === 'realocado' ? 'selected' : ''}>Realocado de Turma</option>
                    </select>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: var(--spacing-3); padding-top: var(--spacing-4);">
                    <button onclick="controller.closeModal()" class="btn-secondary">Cancelar</button>
                    <button onclick="controller.saveAluno('${turmaId}', ${isEdit ? `'${aluno.id}'` : 'null'})" class="btn-primary">
                        ${isEdit ? 'Salvar Alterações' : 'Adicionar Estudante'}
                    </button>
                </div>
            </div>
        `;
        controller.openModal(isEdit ? 'Editar Estudante' : 'Novo Estudante', html);
    },
    saveAluno(turmaId, alunoId = null) {
        const nome = document.getElementById('al-nome').value.trim();
        const chamada = document.getElementById('al-chamada').value.trim();
        const matricula = document.getElementById('al-matricula').value.trim();
        const status = document.getElementById('al-status').value;
        if (!nome) return Toast.show("O nome do aluno é obrigatório.", "error");
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (alunoId && alunoId !== 'null') {
            const aluno = turma.alunos.find(a => String(a.id) === String(alunoId));
            if (aluno) {
                aluno.nome = nome;
                aluno.chamada = chamada;
                aluno.matricula = matricula;
                aluno.status = status;

                model.saveLocal();
                if (model.persist && window.firebaseService) {
                    model.persist(() => firebaseService.saveAluno(model.currentUser.uid, turmaId, aluno));
                }
                Toast.show("Dados do estudante atualizados!", "success");
            }
        } else {
            const novoAluno = {
                id: 'aluno_' + Date.now().toString(36),
                nome: nome,
                chamada: chamada,
                matricula: matricula,
                status: status,
                xp: 0,
                notas: {},
                frequencia: {}
            };
            turma.alunos.push(novoAluno);
            model.saveLocal();

            if (model.persist && window.firebaseService) {
                model.persist(() => firebaseService.saveAluno(model.currentUser.uid, turmaId, novoAluno));
            }
            Toast.show("Estudante adicionado!", "success");
        }
        controller.closeModal();
        controller.views['turmas'].renderDetalhesTurma('view-container', turmaId);
    },
    openAddAlunoLote(turmaId) {
        const html = `
            <div style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
                <div class="alert alert--info">
                    <div>
                        <p style="font-weight: 700; margin-bottom: 0.25rem;"><i class="fas fa-magic"></i> Importação Inteligente</p>
                        <p>Cole a lista (um nome por linha). O sistema limpará marcações como "1." ou "01 -" e <strong>gerará automaticamente o Número da Chamada</strong>.</p>
                    </div>
                </div>
                
                <div>
                    <label class="form-label">Lista de Estudantes</label>
                    <textarea id="al-lista" rows="10" class="form-input" style="font-family: monospace; resize: vertical;" placeholder="João da Silva\nMaria Oliveira\nPedro Santos..."></textarea>
                </div>
                
                <div style="display: flex; align-items: center; gap: var(--spacing-3); padding: var(--spacing-3); background-color: var(--color-slate-50); border-radius: var(--radius-xl); border: 1px solid var(--color-slate-100);">
                    <input type="checkbox" id="al-alfabetica" checked style="width: 1.25rem; height: 1.25rem; cursor: pointer;">
                    <label for="al-alfabetica" style="font-size: 0.875rem; font-weight: 700; color: var(--color-slate-600); cursor: pointer; user-select: none;">
                        Ordenar em ordem alfabética antes de importar
                    </label>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: var(--spacing-3); padding-top: var(--spacing-4); border-top: 1px solid var(--color-slate-100); margin-top: var(--spacing-2);">
                    <button onclick="controller.closeModal()" class="btn-secondary">Cancelar</button>
                    <button onclick="controller.saveAlunoLote('${turmaId}')" class="btn-primary">Importar Lista</button>
                </div>
            </div>
        `;
        controller.openModal('Importar Estudantes em Lote', html);
    },
    saveAlunoLote(turmaId) {
        const texto = document.getElementById('al-lista').value;
        const inputOrdenar = document.getElementById('al-alfabetica');
        const ordenar = inputOrdenar ? inputOrdenar.checked : false;

        let nomes = texto.split('\n')
            .map(n => n.trim())
            .map(n => n.replace(/^(\d+[\.\-\)\]]\s*)/, ''))
            .filter(n => n !== "");

        if (nomes.length === 0) return Toast.show("A lista informada está vazia.", "warning");
        if (ordenar) {
            nomes.sort((a, b) => a.localeCompare(b));
        }
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        let ultimoNumeroChamada = 0;
        turma.alunos.forEach(a => {
            const num = parseInt(a.chamada);
            if (!isNaN(num) && num > ultimoNumeroChamada) {
                ultimoNumeroChamada = num;
            }
        });
        nomes.forEach((nome, index) => {
            const numChamada = String(ultimoNumeroChamada + index + 1).padStart(2, '0');

            const novoAluno = {
                id: 'aluno_' + Date.now().toString(36) + '_' + index,
                nome: nome,
                chamada: numChamada,
                matricula: '',
                status: 'cursando',
                notas: {},
                frequencia: {}
            };
            turma.alunos.push(novoAluno);
        });
        model.saveLocal();
        if (model.persist && window.firebaseService) {
            model.persist(() => firebaseService.saveTurma(model.currentUser.uid, turma));
        }
        controller.closeModal();
        controller.views['turmas'].renderDetalhesTurma('view-container', turmaId);
        Toast.show(`${nomes.length} estudantes importados com sucesso!`, "success");
    },
    deleteAluno(turmaId, alunoId) {
        if (confirm("Deseja remover este estudante? As notas e frequência serão perdidas.")) {
            model.deleteAluno(turmaId, alunoId);
            turmasView.renderDetalhesTurma('view-container', turmaId);
            Toast.show("Estudante removido.", "info");
        }
    },
    adicionarXP(turmaId, alunoId, quantidade) {
        const turma = model.state.turmas.find(t => t.id === turmaId);
        const aluno = turma.alunos.find(a => a.id === alunoId);

        if (aluno) {
            aluno.xp = (aluno.xp || 0) + quantidade;

            const xpElement = document.getElementById(`xp-${alunoId}`);
            if (xpElement) {
                xpElement.innerText = `${aluno.xp} XP`;
                xpElement.classList.add('text-emerald-500', 'scale-110');
                setTimeout(() => xpElement.classList.remove('text-emerald-500', 'scale-110'), 300);
            }
            Toast.show(`+${quantidade} XP concedido a ${aluno.nome.split(' ')[0]}!`, "success");
        }
    },
    openAddAvaliacao(turmaId) {
        const tipoConfig = model.state.userConfig.periodType || 'bimestre';
        const numPeriodos = tipoConfig === 'bimestre' ? 4 : tipoConfig === 'trimestre' ? 3 : 2;
        const html = `
            <div style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4); animation: slideUp 0.3s ease forwards;">
                <div>
                    <label class="form-label">Nome da Avaliação</label>
                    <input type="text" id="av-nome" class="form-input" placeholder="Ex: Prova Mensal, Simulado...">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4);">
                    <div>
                        <label class="form-label">Valor Máximo</label>
                        <input type="number" id="av-max" class="form-input" value="10" step="0.5">
                    </div>
                    <div>
                        <label class="form-label">Período Letivo</label>
                        <select id="av-periodo" class="form-select" style="color: var(--color-primary);">
                            ${Array.from({ length: numPeriodos }, (_, i) => `
                                <option value="${i + 1}" ${turmasView.periodoAtivo === (i + 1) ? 'selected' : ''}>
                                    ${i + 1}º ${tipoConfig.charAt(0).toUpperCase() + tipoConfig.slice(1, 3)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="alert alert--info">
                    <p style="font-size: 0.75rem; line-height: 1.25;">
                        <i class="fas fa-info-circle" style="margin-right: 0.25rem;"></i> Esta nota será computada automaticamente na média do período selecionado.
                    </p>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: var(--spacing-3); padding-top: var(--spacing-4);">
                    <button onclick="controller.closeModal()" class="btn-secondary">Cancelar</button>
                    <button onclick="controller.saveAvaliacao('${turmaId}')" class="btn-primary">Salvar Avaliação</button>
                </div>
            </div>
        `;
        controller.openModal('Nova Avaliação', html);
    },
    saveAvaliacao(turmaId) {
        const nome = document.getElementById('av-nome').value;
        const max = document.getElementById('av-max').value;
        const periodo = document.getElementById('av-periodo').value;
        if (!nome || !max) return Toast.show("Preencha o nome e valor da nota.", "error");
        model.addAvaliacao(turmaId, nome, max, periodo);
        controller.closeModal();

        turmasView.periodoAtivo = Number(periodo);
        turmasView.renderDetalhesTurma('view-container', turmaId);

        Toast.show("Avaliação cadastrada com sucesso!", "success");
    },
    deleteAvaliacao(turmaId, avId) {
        if (confirm("Excluir esta avaliação? Todas as notas vinculadas serão apagadas.")) {
            model.deleteAvaliacao(turmaId, avId);
            turmasView.renderDetalhesTurma('view-container', turmaId);
            Toast.show("Avaliação removida.", "info");
        }
    },
    updateNota(turmaId, alunoId, avId, valor) {
        const notaLimpa = valor === "" ? "" : Number(valor);

        model.updateNota(turmaId, alunoId, avId, notaLimpa);

        const turma = model.state.turmas.find(t => t.id === turmaId);
        if (!turma) return;
        const aluno = turma.alunos.find(a => a.id === alunoId);
        if (!aluno) return;

        const avaliacoesFiltradas = (turma.avaliacoes || []).filter(av => Number(av.periodo || 1) === window.turmasView.periodoAtivo);
        const somaPeriodo = avaliacoesFiltradas.reduce((acc, av) => acc + (Number(aluno.notas?.[av.id]) || 0), 0);

        const somaElement = document.getElementById(`soma-${alunoId}`);
        if (somaElement) {
            somaElement.innerText = somaPeriodo.toFixed(1);

            somaElement.classList.add('bg-emerald-100', 'text-emerald-700', 'scale-110');
            setTimeout(() => {
                somaElement.classList.remove('bg-emerald-100', 'text-emerald-700', 'scale-110');
            }, 300);
        }
        if (window.turmasView) {
            const statsPeriodo = window.turmasView._calcularEstatisticas(turma, avaliacoesFiltradas);
            const gradientPeriodo = window.turmasView._gerarGradientDonut(statsPeriodo);

            const rosca = document.getElementById('grafico-rosca');
            const mediaTexto = document.getElementById('media-rosca');
            const legenda = document.getElementById('legenda-rosca');

            if (rosca) {
                const bg = gradientPeriodo.replace('background: ', '').replace(';', '');
                rosca.style.background = bg;
            }
            if (mediaTexto) mediaTexto.innerText = statsPeriodo.mediaGeral;
            if (legenda) legenda.innerHTML = window.turmasView._renderLegenda(statsPeriodo);

            const statsGeral = window.turmasView._calcularEstatisticas(turma, turma.avaliacoes || []);
            const gradientGeral = window.turmasView._gerarGradientDonut(statsGeral);
            const roscaGeral = document.getElementById('grafico-rosca-geral');
            const mediaTextoGeral = document.getElementById('media-rosca-geral');
            const legendaGeral = document.getElementById('legenda-rosca-geral');

            if (roscaGeral) {
                const bgGeral = gradientGeral.replace('background: ', '').replace(';', '');
                roscaGeral.style.background = bgGeral;
            }
            if (mediaTextoGeral) mediaTextoGeral.innerText = statsGeral.mediaGeral;
            if (legendaGeral) legendaGeral.innerHTML = window.turmasView._renderLegenda(statsGeral);
        }
    }
};
if (typeof window !== 'undefined') {
    window.turmaController = turmaController;
}