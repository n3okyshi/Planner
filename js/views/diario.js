/**
 * @file diario.js
 * @description View responsável pela interface do Diário de Classe (Planejamento Diário).
 * @module views/diarioView
 */

import { model } from '../model.js';
import { controller } from '../controller.js';

/**
 * View do Diário de Classe.
 * @namespace diarioView
 */
export const diarioView = {
    currentDate: new Date().toISOString().split('T')[0],
    viewDate: new Date(),
    currentTurmaId: null,

    /**
     * Renderiza o layout principal do diário.
     * @param {HTMLElement|string} container 
     */
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const turmas = (model.state && model.state.turmas) ? model.state.turmas : [];
        
        // Validação da Turma Ativa
        if (this.currentTurmaId && !turmas.find(t => String(t.id) === String(this.currentTurmaId))) {
            this.currentTurmaId = null;
        }
        if (!this.currentTurmaId && turmas.length > 0) {
            this.currentTurmaId = turmas[0].id;
        }

        const html = `
            <div class="fade-in pb-24">
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center justify-between sticky top-0 z-20">
                    <div class="flex items-center gap-4 flex-1">
                        <div class="bg-indigo-100 text-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center">
                            <i class="fas fa-book-reader"></i>
                        </div>
                        <div>
                            <h2 class="text-xl font-bold text-slate-800">Diário de Classe</h2>
                            <p class="text-xs text-slate-500">Selecione uma data para planejar.</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-bold text-slate-400 uppercase hidden md:inline">Turma:</span>
                        <select id="diario-turma" onchange="controller.mudarTurmaDiario(this.value)"
                                class="bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl px-4 py-2 outline-none focus:border-primary min-w-[200px]">
                            ${turmas.length > 0
                                ? turmas.map(t => `<option value="${t.id}" ${String(t.id) === String(this.currentTurmaId) ? 'selected' : ''}>${window.escapeHTML(t.nome)}</option>`).join('')
                                : '<option value="">Nenhuma turma</option>'
                            }
                        </select>
                        <div id="status-salvamento" class="text-[10px] font-bold text-slate-400 min-w-[60px] text-right transition-all"></div>
                    </div>
                </div>
                ${turmas.length === 0 ? this.estadoVazio() : `
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div class="lg:col-span-4 space-y-6">
                            ${this.gerarMiniCalendario()}
                            <div id="dica-diario" class="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-xs leading-relaxed flex gap-2 items-start relative group">
                                <i class="fas fa-info-circle mt-0.5"></i> 
                                <div>
                                    <p class="font-bold mb-1">Como usar:</p>
                                    1. Clique em uma data no calendário.<br>
                                    2. Preencha ou edite o plano ao lado.<br>
                                    3. O salvamento é automático.
                                </div>
                                <button onclick="document.getElementById('dica-diario').remove()" class="absolute top-2 right-2 text-blue-300 hover:text-blue-600 transition-colors" title="Fechar dica">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div class="lg:col-span-8">
                            ${this.renderEditor()}
                        </div>
                    </div>
                `}
            </div>
        `;
        
        container.innerHTML = html;
        
        if (turmas.length > 0) {
            this.preencherCampos();
            // Inicializa o autosave (se o controller estiver pronto)
            if (window.planejamentoController?.initDiarioAutosave) {
                window.planejamentoController.initDiarioAutosave();
            }
        }
    },

    /**
     * Gera o HTML do mini calendário lateral.
     */
    gerarMiniCalendario() {
        const ano = this.viewDate.getFullYear();
        const mes = this.viewDate.getMonth();
        const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
        const totalDias = new Date(ano, mes + 1, 0).getDate();
        
        let diasHtml = '';
        
        // Espaços vazios
        for (let i = 0; i < primeiroDiaSemana; i++) {
            diasHtml += `<div class="h-10"></div>`;
        }

        // Dias preenchidos
        for (let dia = 1; dia <= totalDias; dia++) {
            const dataIso = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const isSelected = dataIso === this.currentDate;
            const temPlano = model.getPlanoDiario(dataIso, this.currentTurmaId);
            
            const indicadorHtml = temPlano
                ? `<span class="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm"></span>`
                : '';
            
            const btnClass = isSelected
                ? 'bg-slate-800 text-white shadow-lg transform scale-110 z-10 border-slate-800'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100 hover:border-slate-300';
            
            diasHtml += `
                <button onclick="controller.mudarDataDiario('${dataIso}')" 
                        class="h-10 w-full rounded-lg flex flex-col items-center justify-center relative transition-all text-xs font-bold ${btnClass}">
                    <span>${dia}</span>
                    ${indicadorHtml}
                </button>
            `;
        }

        return `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <div class="flex justify-between items-center mb-4">
                    <button onclick="controller.mudarMesDiario(-1)" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-primary transition">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-slate-700 capitalize text-sm">${nomesMeses[mes]} ${ano}</span>
                        <button onclick="controller.mudarDataDiario(new Date().toISOString().split('T')[0])" 
                                class="text-[10px] font-bold bg-blue-50 text-primary px-2 py-0.5 rounded border border-blue-100 hover:bg-blue-100 transition"
                                title="Voltar para Hoje">
                            Hoje
                        </button>
                    </div>
                    <button onclick="controller.mudarMesDiario(1)" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-primary transition">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="grid grid-cols-7 gap-1 text-center mb-2">
                    <div class="text-[10px] font-black text-red-400 uppercase">D</div>
                    <div class="text-[10px] font-black text-slate-300 uppercase">S</div>
                    <div class="text-[10px] font-black text-slate-300 uppercase">T</div>
                    <div class="text-[10px] font-black text-slate-300 uppercase">Q</div>
                    <div class="text-[10px] font-black text-slate-300 uppercase">Q</div>
                    <div class="text-[10px] font-black text-slate-300 uppercase">S</div>
                    <div class="text-[10px] font-black text-slate-300 uppercase">S</div>
                </div>
                <div class="grid grid-cols-7 gap-1">
                    ${diasHtml}
                </div>
            </div>
        `;
    },

    /**
     * Renderiza o formulário de edição do plano de aula.
     */
    renderEditor() {
        const [ano, mes, dia] = this.currentDate.split('-');
        const dataFormatada = `${dia}/${mes}/${ano}`;
        const sugestoes = model.getSugestoesDoMes(this.currentTurmaId, this.currentDate);
        
        return `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative h-full">
                <div class="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap justify-between items-center sticky top-0 z-10 gap-3">
                    <div class="flex items-center gap-2">
                        <div class="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold text-slate-700 shadow-sm flex items-center">
                            <i class="far fa-calendar mr-2 text-primary"></i> ${dataFormatada}
                        </div>
                        <input type="hidden" id="diario-data" value="${this.currentDate}">
                    </div>
                    
                    <div class="flex gap-2">
                        <button onclick="diarioView.imprimirPlano()" class="px-3 py-2 text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-wider transition flex items-center gap-1">
                            <i class="fas fa-print"></i> <span class="hidden sm:inline">Imprimir</span>
                        </button>
                        <button onclick="controller.salvarDiario()" class="bg-primary hover:bg-opacity-90 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-md transition transform active:scale-95 flex items-center gap-2">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                    </div>
                </div>
                <div class="p-6 md:p-8 space-y-6">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Tema da Aula</label>
                        <input type="text" id="plan-tema" placeholder="O que será ensinado hoje?" 
                               class="autosave-input w-full text-xl md:text-2xl font-bold text-slate-800 border-b-2 border-slate-100 pb-2 outline-none focus:border-primary transition-colors placeholder:text-slate-300">
                    </div>
                    <div>
                        <div class="flex justify-between items-end mb-2">
                            <label class="block text-xs font-bold text-slate-400 uppercase">Habilidades BNCC</label>
                            
                            <button onclick="controller.openSeletorBnccDiario('${this.currentTurmaId}')" 
                                    class="text-[10px] font-bold text-primary hover:bg-slate-50 px-2 py-1 rounded transition border border-primary/20 flex items-center gap-1">
                                <i class="fas fa-search"></i> Buscar na Base Completa
                            </button>
                        </div>
                        <textarea id="plan-bncc" rows="3" class="autosave-input w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-primary focus:bg-white transition-all resize-none custom-scrollbar" placeholder="Códigos e descrições das habilidades..."></textarea>
                    </div>
                    ${sugestoes.length > 0 ? `
                        <div class="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
                            <h4 class="text-xs font-bold text-yellow-700 flex items-center gap-2 mb-2">
                                <i class="fas fa-lightbulb"></i> Sugestões do Planejamento Mensal
                            </h4>
                            <div class="flex flex-wrap gap-2">
                                ${sugestoes.map(h => `
                                    <button onclick="diarioView.copiarHabilidade('${h.codigo}', '${h.descricao.replace(/'/g, "")}')"
                                            class="bg-white border border-yellow-200 text-yellow-800 text-[10px] px-2 py-1 rounded hover:bg-yellow-100 transition shadow-sm text-left max-w-full truncate"
                                            title="${window.escapeHTML(h.descricao)}">
                                        <strong>${h.codigo}</strong> <i class="fas fa-plus ml-1 opacity-50"></i>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Objetivos de Aprendizagem</label>
                            <textarea id="plan-objetivos" rows="5" class="autosave-input w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-primary focus:bg-white transition-all resize-none custom-scrollbar" placeholder="O que o aluno deve ser capaz de fazer..."></textarea>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Recursos Didáticos</label>
                            <textarea id="plan-recursos" rows="5" class="autosave-input w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-primary focus:bg-white transition-all resize-none custom-scrollbar" placeholder="Materiais necessários..."></textarea>
                        </div>
                    </div>
                    <div>
                        <div class="flex justify-between items-end mb-2">
                            <label class="block text-xs font-bold text-slate-400 uppercase">Metodologia</label>
                            <button id="btn-mic-plan-metodologia" onclick="diarioView.startDictation('plan-metodologia')" class="text-slate-400 hover:text-primary transition" title="Ditar texto">
                                <i class="fas fa-microphone"></i>
                            </button>
                        </div>
                        <textarea id="plan-metodologia" rows="8" class="autosave-input w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-primary focus:bg-white transition-all resize-none custom-scrollbar" placeholder="Passo a passo da aula..."></textarea>
                    </div>
                    <div>
                        <div class="flex justify-between items-end mb-2">
                            <label class="block text-xs font-bold text-slate-400 uppercase">Avaliação / Tarefa</label>
                            <button id="btn-mic-plan-avaliacao" onclick="diarioView.startDictation('plan-avaliacao')" class="text-slate-400 hover:text-primary transition" title="Ditar texto">
                                <i class="fas fa-microphone"></i>
                            </button>
                        </div>
                        <textarea id="plan-avaliacao" rows="3" class="autosave-input w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-primary focus:bg-white transition-all resize-none custom-scrollbar" placeholder="Como será avaliado? Tarefa de casa?"></textarea>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Preenche os campos do formulário com os dados salvos.
     */
    preencherCampos() {
        const plano = model.getPlanoDiario(this.currentDate, this.currentTurmaId);
        const campos = ['plan-tema', 'plan-bncc', 'plan-objetivos', 'plan-recursos', 'plan-metodologia', 'plan-avaliacao'];
        const valores = {
            'plan-tema': plano ? plano.tema : '',
            'plan-bncc': plano ? plano.bncc : '',
            'plan-objetivos': plano ? plano.objetivos : '',
            'plan-recursos': plano ? plano.recursos : '',
            'plan-metodologia': plano ? plano.metodologia : '',
            'plan-avaliacao': plano ? plano.avaliacao : ''
        };
        campos.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = valores[id] || '';
        });
    },

    /**
     * Adiciona uma habilidade sugerida ao campo de BNCC.
     * @param {string} codigo 
     * @param {string} descricao 
     */
    copiarHabilidade(codigo, descricao) {
        const campoObj = document.getElementById('plan-bncc');
        const textoAtual = campoObj.value;
        const novoTexto = `[${codigo}] ${descricao}`;
        
        campoObj.value = textoAtual ? textoAtual + "\n\n" + novoTexto : novoTexto;
        
        // Feedback visual
        campoObj.classList.add('ring-2', 'ring-yellow-400', 'bg-yellow-50');
        setTimeout(() => campoObj.classList.remove('ring-2', 'ring-yellow-400', 'bg-yellow-50'), 500);
        
        // Dispara evento para o autosave detectar mudança
        campoObj.dispatchEvent(new Event('input'));
    },

    estadoVazio() {
        return `
            <div class="text-center py-20">
                <i class="fas fa-school text-4xl text-slate-300 mb-4"></i>
                <h3 class="text-xl font-bold text-slate-600">Nenhuma turma encontrada</h3>
                <p class="text-slate-400">Cadastre suas turmas para começar a planejar.</p>
                <button onclick="controller.navigate('turmas')" class="text-primary font-bold mt-2 hover:underline">Ir para Turmas</button>
            </div>
        `;
    },

    /**
     * Inicia o ditado por voz para um campo específico.
     * @param {string} targetId ID do elemento alvo (textarea).
     */
    startDictation(targetId) {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Seu navegador não suporta ditado por voz. Tente usar o Google Chrome.");
            return;
        }

        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        const el = document.getElementById(targetId);
        const btn = document.getElementById(`btn-mic-${targetId}`);
        const originalColor = btn ? btn.className : '';

        if (btn) {
            btn.className = 'text-red-500 animate-pulse';
        }

        recognition.start();

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (el) {
                const currentText = el.value;
                el.value = currentText ? currentText + " " + transcript : transcript;
                el.dispatchEvent(new Event('input')); // Dispara autosave
            }
        };

        recognition.onerror = (event) => {
            console.error("Erro no reconhecimento de voz:", event.error);
            if (event.error === 'not-allowed') {
                alert("Permissão de microfone negada.");
            }
        };

        recognition.onend = () => {
            if (btn) {
                btn.className = "text-slate-400 hover:text-primary transition";
            }
        };
    },

    /**
     * Abre uma nova janela para impressão do plano de aula.
     */
    imprimirPlano() {
        const tema = document.getElementById('plan-tema').value || 'Sem título';
        const bncc = document.getElementById('plan-bncc').value;
        const objetivos = document.getElementById('plan-objetivos').value;
        const metodologia = document.getElementById('plan-metodologia').value;
        const recursos = document.getElementById('plan-recursos').value;
        const avaliacao = document.getElementById('plan-avaliacao').value;
        const [ano, mes, dia] = this.currentDate.split('-');
        const dataFormatada = `${dia}/${mes}/${ano}`;
        
        const turma = model.state.turmas.find(t => String(t.id) === String(this.currentTurmaId));
        const nomeTurma = turma ? turma.nome : 'Turma';
        
        let nomeProf = model.state.userConfig.profName || 'Docente';
        if ((!model.state.userConfig.profName || model.state.userConfig.profName.trim() === "") && model.currentUser) {
            nomeProf = model.currentUser.displayName;
        }

        const conteudo = `
            <html>
            <head>
                <title>Plano de Aula - ${window.escapeHTML(tema)}</title>
                <style>
                    body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
                    .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                    h1 { font-size: 24px; margin: 0; color: #000; }
                    .meta { color: #666; font-size: 14px; margin-top: 5px; }
                    .section { margin-bottom: 25px; }
                    .label { font-weight: bold; text-transform: uppercase; font-size: 12px; color: #666; border-bottom: 1px solid #eee; display: block; margin-bottom: 8px; padding-bottom: 2px; }
                    .content { font-size: 15px; line-height: 1.6; white-space: pre-wrap; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${window.escapeHTML(tema)}</h1>
                    <div class="meta">Data: ${dataFormatada} | Turma: ${window.escapeHTML(nomeTurma)}</div>
                    <div class="meta">Professor(a): ${window.escapeHTML(nomeProf)}</div>
                </div>
                <div class="section"><span class="label">Habilidades BNCC</span><div class="content">${window.escapeHTML(bncc) || '-'}</div></div>
                <div class="section"><span class="label">Objetivos</span><div class="content">${window.escapeHTML(objetivos) || '-'}</div></div>
                <div class="section"><span class="label">Metodologia</span><div class="content">${window.escapeHTML(metodologia) || '-'}</div></div>
                <div class="section"><span class="label">Recursos</span><div class="content">${window.escapeHTML(recursos) || '-'}</div></div>
                <div class="section"><span class="label">Avaliação</span><div class="content">${window.escapeHTML(avaliacao) || '-'}</div></div>
                <script>window.print();</script>
            </body>
            </html>
        `;
        
        const win = window.open('', '_blank');
        win.document.write(conteudo);
        win.document.close();
    }
};