/**
 * @file turmaController.js
 * @description Sub-controller responsável pela lógica de Turmas, incluindo o Wizard de 4 passos e Gestão de Alunos/Avaliações.
 * @module controllers/turmaController
 */
import { model } from '../model.js';
import { controller } from '../controller.js';
import { turmasView } from '../views/turmas.js';
import { Toast } from '../components/toast.js';
import { firebaseService } from '../firebase-service.js';

export const turmaController = {
    // ------------------------------------------------------------------------
    // ESTADO DO WIZARD DE CRIAÇÃO
    // ------------------------------------------------------------------------
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
            alunosRascunho: [], // Array de nomes limpos
            textoBrutoAlunos: '' // Texto cru colado
        }
    },

    // Disciplinas e Séries fixas para popular os selects
    disciplinas: [
        "Matemática", "Ciências", "Geografia", "História", "Língua Portuguesa", 
        "Inglês", "Arte", "Educação Física", "Física", "Química", "Biologia"
    ],
    series: [
        "Educação Infantil", "1º Ano — EF I", "2º Ano — EF I", "3º Ano — EF I", 
        "4º Ano — EF I", "5º Ano — EF I", "6º Ano — EF II", "7º Ano — EF II", 
        "8º Ano — EF II", "9º Ano — EF II", "1ª Série — EM", "2ª Série — EM", "3ª Série — EM"
    ],

    // ------------------------------------------------------------------------
    // CONTROLE DE FLUXO DO WIZARD
    // ------------------------------------------------------------------------
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

    // ------------------------------------------------------------------------
    // PROCESSAMENTO DE ALUNOS INTELIGENTE NO WIZARD
    // ------------------------------------------------------------------------
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

        // INTEGRAÇÃO DOS NOVOS CAMPOS NA CRIAÇÃO DO WIZARD
        d.alunosRascunho.forEach((nomeAluno, index) => {
            const numChamada = String(index + 1).padStart(2, '0'); // Auto numeração: 01, 02...
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
        if(model.persist && window.firebaseService) {
            model.persist(() => firebaseService.saveTurma(model.currentUser.uid, novaTurma));
        }

        Toast.show("Turma criada com sucesso!", "success");
        controller.closeModal();
        controller.navigate('turmas');
    },

    // ------------------------------------------------------------------------
    // MOTORES DE RENDERIZAÇÃO DA UI (WIZARD STEPS)
    // ------------------------------------------------------------------------
    renderWizardStep() {
        const container = document.getElementById('wizard-container');
        if (!container) return;

        const { step } = this.wizard;
        
        let headerHtml = `
            <div class="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                <button onclick="turmaController.voltar()" class="text-indigo-600 font-bold hover:bg-indigo-50 px-4 py-2 rounded-xl transition flex items-center gap-2">
                    <i class="fas fa-chevron-left"></i> ${step === 1 ? 'Cancelar' : 'Voltar'}
                </button>
                <div class="hidden md:flex items-center gap-2">
                    ${this.gerarProgressoVisual()}
                </div>
            </div>
        `;

        let bodyHtml = '';
        let footerHtml = `
            <div class="mt-auto pt-6 border-t border-slate-100 flex justify-end">
                <button onclick="turmaController.avancar()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2">
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
            
            let circleClass = 'bg-slate-100 text-slate-400 border-2 border-slate-200';
            let iconOrNum = numero;

            if (isCompleted) {
                circleClass = 'bg-emerald-500 text-white border-2 border-emerald-500';
                iconOrNum = '<i class="fas fa-check"></i>';
            } else if (isActive) {
                circleClass = 'bg-white text-indigo-600 border-2 border-indigo-600 ring-4 ring-indigo-50';
            }

            const linha = idx < 3 ? `<div class="w-8 h-0.5 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'}"></div>` : '';

            return `
                <div class="flex items-center gap-2">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${circleClass}">
                            ${iconOrNum}
                        </div>
                        <span class="text-xs font-bold ${isActive || isCompleted ? 'text-slate-700' : 'text-slate-400'}">${label}</span>
                    </div>
                    ${linha}
                </div>
            `;
        }).join('');
    },

    renderStep1_Dados() {
        const d = this.wizard.data;
        return `
            <div class="max-w-2xl mx-auto space-y-6">
                <div>
                    <h3 class="text-2xl font-bold text-slate-800 tracking-tight">Dados da turma</h3>
                    <p class="text-slate-500 text-sm mt-1">Só o nome é obrigatório — o resto dá pra ajustar depois.</p>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Nome da turma *</label>
                        <input type="text" id="wiz-nome" value="${d.nome}" placeholder="Ex: 9º Ano B, Manhã" class="w-full p-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 text-slate-700 font-bold transition-all shadow-sm">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Série</label>
                        <select id="wiz-serie" class="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white text-slate-700 font-medium transition-all shadow-sm cursor-pointer">
                            <option value="">—</option>
                            ${this.series.map(s => `<option value="${s}" ${d.serie === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Disciplina</label>
                        <select id="wiz-disciplina" class="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white text-slate-700 font-medium transition-all shadow-sm cursor-pointer">
                            <option value="">—</option>
                            ${this.disciplinas.map(m => `<option value="${m}" ${d.disciplina === m ? 'selected' : ''}>${m}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Turno</label>
                        <select id="wiz-turno" class="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white text-slate-700 font-medium transition-all shadow-sm cursor-pointer">
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
            <div class="max-w-2xl mx-auto space-y-6">
                <div>
                    <h3 class="text-2xl font-bold text-slate-800 tracking-tight">Período letivo e avaliação</h3>
                    <p class="text-slate-500 text-sm mt-1">Opcional. Define os bimestres e as regras de aprovação/faltas.</p>
                </div>
                <div class="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-5">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Início</label>
                            <input type="date" id="wiz-per-ini" value="${d.inicio}" class="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-slate-700 font-medium shadow-sm">
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Término</label>
                            <input type="date" id="wiz-per-fim" value="${d.termino}" class="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-slate-700 font-medium shadow-sm">
                        </div>
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Divisão do ano</label>
                        <select id="wiz-per-div" class="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-slate-700 font-medium shadow-sm cursor-pointer">
                            <option value="Bimestral" ${d.divisao === 'Bimestral' ? 'selected' : ''}>Bimestral (4 períodos)</option>
                            <option value="Trimestral" ${d.divisao === 'Trimestral' ? 'selected' : ''}>Trimestral (3 períodos)</option>
                            <option value="Semestral" ${d.divisao === 'Semestral' ? 'selected' : ''}>Semestral (2 períodos)</option>
                            <option value="Anual" ${d.divisao === 'Anual' ? 'selected' : ''}>Anual (Sem divisões)</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Média de aprovação</label>
                        <input type="number" id="wiz-per-med" value="${d.media}" step="0.1" class="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-slate-700 font-bold shadow-sm" placeholder="Ex: 6.0">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Limite de faltas</label>
                        <input type="number" id="wiz-per-faltas" value="${d.faltas}" class="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-slate-700 font-bold shadow-sm" placeholder="Ex: 25">
                    </div>
                </div>
            </div>
        `;
    },

    renderStep3_Horarios() {
        return `
            <div class="max-w-2xl mx-auto space-y-6">
                <div>
                    <h3 class="text-2xl font-bold text-slate-800 tracking-tight">Horários das aulas</h3>
                    <p class="text-slate-500 text-sm mt-1">Opcional. Com os horários, a chamada do dia aparece sozinha.</p>
                </div>
                <div class="p-10 border-2 border-dashed border-slate-200 rounded-3xl text-center bg-slate-50">
                    <i class="far fa-clock text-4xl text-slate-300 mb-4"></i>
                    <h4 class="font-bold text-slate-600 mb-1">Módulo unificado na Grade Horária</h4>
                    <p class="text-sm text-slate-500 mb-6 max-w-sm mx-auto">Para evitar conflitos de horários entre turmas, toda a alocação de aulas agora é feita na aba central de <strong>Grade Horária</strong>.</p>
                    <button type="button" onclick="turmaController.avancar()" class="btn-primary px-6 py-2.5 rounded-xl font-bold shadow-md inline-flex items-center gap-2">
                        Pular esta etapa <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
    },

    renderStep4_Alunos() {
        const d = this.wizard.data;
        return `
            <div class="max-w-2xl mx-auto space-y-6 flex flex-col h-full">
                <div>
                    <h3 class="text-2xl font-bold text-slate-800 tracking-tight">Alunos da turma</h3>
                    <p class="text-slate-500 text-sm mt-1">Cole a lista do WhatsApp ou da secretaria — você confere antes de criar.</p>
                </div>
                <div id="step-colar-alunos" class="flex-1 flex flex-col ${d.alunosRascunho.length > 0 ? 'hidden' : ''}">
                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Cole a lista, um nome por linha</label>
                    <textarea id="wiz-alunos-texto" rows="12" placeholder="Ana Beatriz Souza\nCarlos Eduardo Lima\nDaniela Nunes\n..." 
                              class="w-full flex-1 p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white text-slate-700 font-mono text-sm leading-relaxed resize-none custom-scrollbar transition-all shadow-inner">${d.textoBrutoAlunos}</textarea>
                    
                    <div class="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Pode colar com número, "nº", travessão — a IA limpa.</p>
                        <button onclick="turmaController.salvarEstadoPassoAtual()" class="bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2">
                            <i class="fas fa-magic"></i> Revisar Lista
                        </button>
                    </div>
                </div>
                <div id="step-revisar-alunos" class="flex-1 flex flex-col hidden">
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

        containerColar.classList.add('hidden');
        containerRevisar.classList.remove('hidden');
        if (footerWizard) footerWizard.style.display = 'none';

        const itensHtml = d.alunosRascunho.map((nome, i) => `
            <div class="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm group hover:border-slate-300 transition-colors animate-slide-up" style="animation-delay: ${i * 20}ms">
                <div class="flex items-center gap-3">
                    <span class="text-[10px] font-black text-slate-300 w-4 text-right">${i + 1}</span>
                    <span class="text-sm font-bold text-slate-700 uppercase">${window.escapeHTML(nome)}</span>
                </div>
                <button onclick="turmaController.removerAlunoRascunho(${i})" class="text-slate-300 hover:text-red-500 hover:bg-red-50 w-8 h-8 rounded-lg flex items-center justify-center transition-colors">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        containerRevisar.innerHTML = `
            <div class="flex justify-between items-center bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-4">
                <span class="font-bold text-emerald-800 text-sm">Confira antes de salvar</span>
                <span class="bg-emerald-200 text-emerald-800 px-3 py-1 rounded-full text-xs font-black shadow-sm">${d.alunosRascunho.length} alunos</span>
            </div>
            <div class="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2 pb-4 max-h-[300px]">
                ${itensHtml}
            </div>
            <div class="mt-auto pt-6 border-t border-slate-100 flex justify-between items-center">
                <button onclick="turmaController.voltarParaTexto()" class="text-slate-500 hover:text-slate-800 font-bold text-sm flex items-center gap-2 transition-colors">
                    <i class="fas fa-arrow-left"></i> Voltar e colar de novo
                </button>
                <button onclick="turmaController.finalizarWizard()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2">
                    Criar turma com ${d.alunosRascunho.length} alunos
                </button>
            </div>
        `;
    },

    voltarParaTexto() {
        const containerColar = document.getElementById('step-colar-alunos');
        const containerRevisar = document.getElementById('step-revisar-alunos');
        containerRevisar.classList.add('hidden');
        containerColar.classList.remove('hidden');
    },

    // ------------------------------------------------------------------------
    // GESTÃO DE ALUNOS (PÓS-CRIAÇÃO) E TURMAS (EXCLUSÃO)
    // ------------------------------------------------------------------------
    
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
            <div class="p-6 space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Estudante *</label>
                    <input type="text" id="al-nome" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary" placeholder="Nome completo..." value="${window.escapeHTML(nome)}">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Nº Chamada</label>
                        <input type="text" id="al-chamada" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary" placeholder="Ex: 01" value="${window.escapeHTML(chamada)}">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Matrícula</label>
                        <input type="text" id="al-matricula" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary" placeholder="Ex: 20261234" value="${window.escapeHTML(matricula)}">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Situação / Status</label>
                    <select id="al-status" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary bg-white font-medium text-slate-700">
                        <option value="cursando" ${status === 'cursando' ? 'selected' : ''}>Cursando Ativamente</option>
                        <option value="transferido" ${status === 'transferido' ? 'selected' : ''}>Transferido para outra escola</option>
                        <option value="realocado" ${status === 'realocado' ? 'selected' : ''}>Realocado de Turma</option>
                    </select>
                </div>
                <div class="flex justify-end gap-3 pt-4">
                    <button onclick="controller.closeModal()" class="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition">Cancelar</button>
                    <button onclick="controller.saveAluno('${turmaId}', ${isEdit ? `'${aluno.id}'` : 'null'})" class="btn-primary px-8 py-2 rounded-xl font-bold shadow-lg shadow-primary/20">
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
                if(model.persist && window.firebaseService) {
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
                notas: {},
                frequencia: {}
            };
            turma.alunos.push(novoAluno);
            model.saveLocal();
            
            if(model.persist && window.firebaseService) {
                model.persist(() => firebaseService.saveAluno(model.currentUser.uid, turmaId, novoAluno));
            }
            Toast.show("Estudante adicionado!", "success");
        }

        controller.closeModal();
        controller.views['turmas'].renderDetalhesTurma('view-container', turmaId);
    },

    openAddAlunoLote(turmaId) {
        const html = `
            <div class="p-6 space-y-4">
                <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-xs mb-4">
                    <p class="font-bold mb-1"><i class="fas fa-magic"></i> Importação Inteligente</p>
                    <p>Cole a lista (um nome por linha). O sistema limpará marcações como "1." ou "01 -" e <strong>gerará automaticamente o Número da Chamada</strong>.</p>
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Lista de Estudantes</label>
                    <textarea id="al-lista" rows="10" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary text-sm font-mono" placeholder="João da Silva\nMaria Oliveira\nPedro Santos..."></textarea>
                </div>
                
                <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div class="relative flex items-center justify-center w-5 h-5 rounded border border-slate-300 bg-white">
                        <input type="checkbox" id="al-alfabetica" class="peer sr-only" checked>
                        <i class="fas fa-check text-xs text-white opacity-0 peer-checked:opacity-100 absolute"></i>
                        <div class="absolute inset-0 rounded bg-primary opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                    </div>
                    <label for="al-alfabetica" class="text-sm font-bold text-slate-600 cursor-pointer select-none">
                        Ordenar em ordem alfabética antes de importar
                    </label>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                    <button onclick="controller.closeModal()" class="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition">Cancelar</button>
                    <button onclick="controller.saveAlunoLote('${turmaId}')" class="btn-primary px-8 py-2 rounded-xl font-bold shadow-lg shadow-primary/20">Importar Lista</button>
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
        if(confirm("Deseja remover este estudante? As notas e frequência serão perdidas.")) {
            model.deleteAluno(turmaId, alunoId);
            turmasView.renderDetalhesTurma('view-container', turmaId);
            Toast.show("Estudante removido.", "info");
        }
    },

    // ------------------------------------------------------------------------
    // GESTÃO DE AVALIAÇÕES E NOTAS
    // ------------------------------------------------------------------------
    openAddAvaliacao(turmaId) {
        const tipoConfig = model.state.userConfig.periodType || 'bimestre';
        const numPeriodos = tipoConfig === 'bimestre' ? 4 : tipoConfig === 'trimestre' ? 3 : 2;

        const html = `
            <div class="p-6 space-y-4 animate-slide-up">
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Nome da Avaliação</label>
                    <input type="text" id="av-nome" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary" placeholder="Ex: Prova Mensal, Simulado...">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Valor Máximo</label>
                        <input type="number" id="av-max" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary" value="10" step="0.5">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Período Letivo</label>
                        <select id="av-periodo" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary bg-white font-bold text-primary">
                            ${Array.from({length: numPeriodos}, (_, i) => `
                                <option value="${i+1}" ${turmasView.periodoAtivo === (i+1) ? 'selected' : ''}>
                                    ${i+1}º ${tipoConfig.charAt(0).toUpperCase() + tipoConfig.slice(1,3)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <p class="text-[10px] text-blue-600 leading-tight">
                        <i class="fas fa-info-circle mr-1"></i> Esta nota será computada automaticamente na média do período selecionado.
                    </p>
                </div>
                <div class="flex justify-end gap-3 pt-4">
                    <button onclick="controller.closeModal()" class="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition">Cancelar</button>
                    <button onclick="controller.saveAvaliacao('${turmaId}')" class="btn-primary px-8 py-2 rounded-xl font-bold shadow-lg shadow-primary/20">Salvar Avaliação</button>
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
        if(confirm("Excluir esta avaliação? Todas as notas vinculadas serão apagadas.")) {
            model.deleteAvaliacao(turmaId, avId);
            turmasView.renderDetalhesTurma('view-container', turmaId);
            Toast.show("Avaliação removida.", "info");
        }
    },

    updateNota(turmaId, alunoId, avId, valor) {
        const notaLimpa = valor === "" ? "" : Number(valor);
        model.updateNota(turmaId, alunoId, avId, notaLimpa);
    }
};

if (typeof window !== 'undefined') {
    window.turmaController = turmaController;
}