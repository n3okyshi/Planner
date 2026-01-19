/**
 * VIEW - Planejamento Diário (Plano de Aula)
 */
const diarioView = {
    currentDate: new Date().toISOString().split('T')[0],
    currentTurmaId: null,

    render(containerId) {
        const container = document.getElementById(containerId);
        const turmas = (model.state && model.state.turmas) ? model.state.turmas : [];

        // Define turma padrão se não houver
        if (!this.currentTurmaId && turmas.length > 0) {
            this.currentTurmaId = turmas[0].id;
        }

        const html = `
            <div class="fade-in pb-24">
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center justify-between sticky top-0 z-20">
                    <div class="flex items-center gap-4 flex-1">
                        
                        <div class="relative">
                            <input type="date" id="diario-data" value="${this.currentDate}" 
                                   onchange="controller.mudarDataDiario(this.value)"
                                   class="bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl px-4 py-2 outline-none focus:border-primary">
                        </div>

                        <select id="diario-turma" onchange="controller.mudarTurmaDiario(this.value)"
                                class="bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl px-4 py-2 outline-none focus:border-primary">
                            ${turmas.length > 0 
                                ? turmas.map(t => `<option value="${t.id}" ${t.id == this.currentTurmaId ? 'selected' : ''}>${t.nome}</option>`).join('')
                                : '<option value="">Nenhuma turma cadastrada</option>'
                            }
                        </select>
                    </div>

                    <div class="flex gap-2">
                        <button onclick="diarioView.imprimirPlano()" class="text-slate-500 hover:text-slate-800 px-3 py-2 font-bold transition">
                            <i class="fas fa-print mr-1"></i> Imprimir
                        </button>
                        <button onclick="controller.salvarDiario()" class="btn-primary px-6 py-2 rounded-xl font-bold shadow-lg shadow-primary/20">
                            <i class="fas fa-save mr-1"></i> Salvar
                        </button>
                    </div>
                </div>

                ${turmas.length === 0 ? this.estadoVazio() : this.renderEditor()}
            </div>
        `;

        container.innerHTML = html;
        
        // Carrega dados se existirem
        if (turmas.length > 0) {
            this.preencherCampos();
        }
    },

    renderEditor() {
        // Busca sugestões do mês para exibir na lateral
        const sugestoes = model.getSugestoesDoMes(this.currentTurmaId, this.currentDate);

        return `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                <div class="lg:col-span-2 space-y-6">
                    
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Tema da Aula</label>
                        <input type="text" id="plan-tema" placeholder="Ex: Introdução à Revolução Francesa" 
                               class="w-full text-lg font-bold text-slate-800 border-b-2 border-slate-100 pb-2 outline-none focus:border-primary transition-colors placeholder:font-normal">
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Objetivos de Aprendizagem</label>
                            <textarea id="plan-objetivos" rows="4" class="w-full text-sm text-slate-600 outline-none resize-none custom-scrollbar" placeholder="O que o aluno deve aprender?"></textarea>
                        </div>
                        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Recursos Didáticos</label>
                            <textarea id="plan-recursos" rows="4" class="w-full text-sm text-slate-600 outline-none resize-none custom-scrollbar" placeholder="Livro, Datashow, Mapa..."></textarea>
                        </div>
                    </div>

                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Desenvolvimento / Metodologia</label>
                        <textarea id="plan-metodologia" rows="8" class="w-full text-sm text-slate-600 outline-none resize-none custom-scrollbar" placeholder="Passo a passo da aula..."></textarea>
                    </div>

                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Avaliação / Para Casa</label>
                        <textarea id="plan-avaliacao" rows="3" class="w-full text-sm text-slate-600 outline-none resize-none custom-scrollbar" placeholder="Como será avaliado? Tarefa de casa?"></textarea>
                    </div>

                </div>

                <div class="lg:col-span-1 sticky top-28 space-y-4">
                    <div class="bg-slate-800 text-white p-4 rounded-xl shadow-md">
                        <h4 class="font-bold text-sm flex items-center gap-2">
                            <i class="fas fa-lightbulb text-yellow-400"></i> Planejado para o Mês
                        </h4>
                        <p class="text-[10px] text-slate-400 mt-1">Habilidades da BNCC definidas no Planejamento Mensal.</p>
                    </div>

                    <div class="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                        ${sugestoes.length > 0 
                            ? sugestoes.map(h => `
                                <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-primary group cursor-pointer transition-all"
                                     onclick="diarioView.copiarHabilidade('${h.codigo}', '${h.descricao.replace(/'/g, "")}')">
                                    <div class="flex justify-between items-start mb-1">
                                        <span class="text-[9px] font-black text-white px-1.5 py-0.5 rounded uppercase" style="background-color: ${h.cor}">${h.codigo}</span>
                                        <i class="fas fa-plus text-slate-300 group-hover:text-primary text-xs"></i>
                                    </div>
                                    <p class="text-[10px] text-slate-600 line-clamp-3">${h.descricao}</p>
                                </div>
                            `).join('')
                            : `<div class="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                                 Nenhuma habilidade neste mês. <br>
                                 <a onclick="controller.navigate('mensal')" class="text-primary font-bold cursor-pointer hover:underline">Ir para Mensal</a>
                               </div>`
                        }
                    </div>
                </div>

            </div>
        `;
    },

    preencherCampos() {
        const plano = model.getPlanoDiario(this.currentDate, this.currentTurmaId);
        if (plano) {
            document.getElementById('plan-tema').value = plano.tema || '';
            document.getElementById('plan-objetivos').value = plano.objetivos || '';
            document.getElementById('plan-recursos').value = plano.recursos || '';
            document.getElementById('plan-metodologia').value = plano.metodologia || '';
            document.getElementById('plan-avaliacao').value = plano.avaliacao || '';
        } else {
            // Limpa campos se não houver plano salvo
            ['plan-tema', 'plan-objetivos', 'plan-recursos', 'plan-metodologia', 'plan-avaliacao'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.value = '';
            });
        }
    },

    copiarHabilidade(codigo, descricao) {
        const campoObj = document.getElementById('plan-objetivos');
        const textoAtual = campoObj.value;
        const novoTexto = `[${codigo}] ${descricao}`;
        
        if (textoAtual) {
            campoObj.value = textoAtual + "\n\n" + novoTexto;
        } else {
            campoObj.value = novoTexto;
        }
        
        // Efeito visual de feedback
        campoObj.classList.add('ring-2', 'ring-primary', 'bg-primary/5');
        setTimeout(() => campoObj.classList.remove('ring-2', 'ring-primary', 'bg-primary/5'), 500);
    },

    estadoVazio() {
        return `
            <div class="text-center py-20">
                <i class="fas fa-school text-4xl text-slate-300 mb-4"></i>
                <h3 class="text-xl font-bold text-slate-600">Nenhuma turma encontrada</h3>
                <p class="text-slate-400">Cadastre suas turmas para começar a planejar.</p>
            </div>
        `;
    },

    imprimirPlano() {
        const tema = document.getElementById('plan-tema').value || 'Sem título';
        const objetivos = document.getElementById('plan-objetivos').value;
        const metodologia = document.getElementById('plan-metodologia').value;
        const recursos = document.getElementById('plan-recursos').value;
        const avaliacao = document.getElementById('plan-avaliacao').value;
        
        // Formata data
        const [ano, mes, dia] = this.currentDate.split('-');
        const dataFormatada = `${dia}/${mes}/${ano}`;
        
        // Busca nome da turma
        const turma = model.state.turmas.find(t => t.id == this.currentTurmaId);
        const nomeTurma = turma ? turma.nome : 'Turma';

        const conteudo = `
            <html>
            <head>
                <title>Plano de Aula - ${tema}</title>
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
                    <h1>${tema}</h1>
                    <div class="meta">Data: ${dataFormatada} | Turma: ${nomeTurma}</div>
                    <div class="meta">Professor(a): ${model.state.userConfig.profName || 'Docente'}</div>
                </div>

                <div class="section">
                    <span class="label">Objetivos de Aprendizagem</span>
                    <div class="content">${objetivos || 'Não definido'}</div>
                </div>

                <div class="section">
                    <span class="label">Desenvolvimento / Metodologia</span>
                    <div class="content">${metodologia || 'Não definido'}</div>
                </div>

                <div class="section">
                    <span class="label">Recursos Didáticos</span>
                    <div class="content">${recursos || 'Não definido'}</div>
                </div>

                <div class="section">
                    <span class="label">Avaliação</span>
                    <div class="content">${avaliacao || 'Não definido'}</div>
                </div>
                
                <script>window.print();</script>
            </body>
            </html>
        `;
        
        const win = window.open('', '_blank');
        win.document.write(conteudo);
        win.document.close();
    }
};

window.View = window.View || {};
window.View.renderDiario = (id) => diarioView.render(id);