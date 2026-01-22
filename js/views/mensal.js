window.mensalView = {
    currentTurmaId: null,

    meses: [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ],

    // Mapa de cores para garantir consistência visual com a BNCC
    coresComponentes: {
        // Educação Infantil
        "O eu, o outro e o nós": "#4f46e5",
        "Corpo, gestos e movimentos": "#0891b2",
        "Traços, sons, cores e formas": "#db2777",
        "Escuta, fala, pensamento e imaginação": "#7c3aed",
        "Espaços, tempos, quantidades, relações e transformações": "#059669",

        // Ensino Fundamental
        "Língua Portuguesa": "#2563eb",
        "Arte": "#db2777",
        "Educação Física": "#ea580c",
        "Língua Inglesa": "#475569",
        "Matemática": "#dc2626",
        "Ciências": "#16a34a",
        "Geografia": "#ca8a04",
        "História": "#9333ea",
        "Ensino Religioso": "#0d9488",

        // Ensino Médio
        "Linguagens e suas Tecnologias": "#2563eb",
        "Matemática e suas Tecnologias": "#dc2626",
        "Ciências da Natureza e suas Tecnologias": "#16a34a",
        "Ciências Humanas e Sociais Aplicadas": "#9333ea"
    },

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        // Recupera dados do estado global
        const turmas = (model.state && model.state.turmas) ? model.state.turmas : [];

        // Validação da turma selecionada
        if (this.currentTurmaId && !turmas.find(t => t.id == this.currentTurmaId)) {
            this.currentTurmaId = null;
        }
        if (!this.currentTurmaId && turmas.length > 0) {
            this.currentTurmaId = turmas[0].id;
        }

        const turmaSelecionada = turmas.find(t => t.id == this.currentTurmaId);

        const html = `
            <div class="fade-in pb-24">
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-30">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Cronograma Anual</h2>
                        <p class="text-xs text-slate-500">Distribuição de habilidades mês a mês.</p>
                    </div>
                    
                    <div class="relative w-full md:w-72">
                        <i class="fas fa-users absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        
                        <select id="mensal-selecao-turma" name="mensal-selecao-turma" aria-label="Selecionar Turma"
                                onchange="mensalView.mudarTurma(this.value)" 
                                class="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl pl-10 pr-4 py-2 outline-none focus:border-primary cursor-pointer hover:bg-slate-100 transition-colors">
                            ${turmas.length > 0
                                ? turmas.map(t => `<option value="${t.id}" ${t.id == this.currentTurmaId ? 'selected' : ''}>${t.nome} - ${t.disciplina || 'Geral'}</option>`).join('')
                                : '<option value="">Nenhuma turma cadastrada</option>'
                            }
                        </select>
                    </div>
                </div>

                <div class="space-y-6">
                    ${turmas.length > 0 && turmaSelecionada
                        ? this.gerarGradeMeses(turmaSelecionada)
                        : this.estadoVazio()
                    }
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    mudarTurma(id) {
        this.currentTurmaId = id;
        this.render('view-container');
    },

    gerarGradeMeses(turma) {
        const plan = turma.planejamentoMensal || {};

        const colunasHtml = this.meses.map(mes => {
            const habilidades = plan[mes] || [];
            const isVazio = habilidades.length === 0;

            const btnAdicionar = `
                <button onclick="controller.openSeletorBnccMensal('${turma.id}', '${mes}', '${turma.nivel}', '${turma.serie}')" 
                        class="w-full h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-lg hover:border-indigo-400 hover:bg-white hover:text-indigo-500 transition-all opacity-60 hover:opacity-100 group/empty p-4">
                    <i class="fas fa-plus mb-1 group-hover/empty:scale-110 transition-transform text-xl"></i>
                    <span class="text-[9px] font-bold">Adicionar Habilidade</span>
                </button>
            `;

            return `
                <div class="flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden group/col hover:border-slate-300 transition-colors h-[400px] shadow-sm">
                    <div class="p-3 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm z-10 sticky top-0">
                        <span class="text-xs font-black text-slate-600 tracking-widest pl-1">${mes}</span>
                        <div class="flex items-center gap-1">
                            ${!isVazio ? `<span class="bg-indigo-50 text-indigo-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-indigo-100">${habilidades.length}</span>` : ''}
                            
                            <button onclick="controller.openSeletorBnccMensal('${turma.id}', '${mes}', '${turma.nivel}', '${turma.serie}')" 
                                    class="w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 text-slate-400 hover:bg-indigo-600 hover:text-white border border-slate-200 hover:border-indigo-600 transition-all"
                                    title="Adicionar Habilidade">
                                <i class="fas fa-plus text-[10px]"></i>
                            </button>
                        </div>
                    </div>

                    <div class="p-2 flex-1 overflow-y-auto custom-scrollbar space-y-2 bg-slate-100/50">
                        ${!isVazio 
                            ? habilidades.map(h => this.gerarMiniCard(h, turma.id, mes)).join('') 
                            : btnAdicionar
                        }
                    </div>
                </div>
            `;
        }).join('');

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

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    ${colunasHtml}
                </div>
            </div>
        `;
    },

    gerarMiniCard(habilidade, turmaId, mes) {
        const codigoSafe = (habilidade.codigo || "").replace(/'/g, "");
        const descSafe = (habilidade.descricao || "").replace(/"/g, '&quot;');

        const eixo = habilidade.objeto || habilidade.eixo || habilidade.componente || "Habilidade";

        // LÓGICA DE COR ATUALIZADA:
        // 1. Tenta a cor que veio salva no objeto (se houver)
        // 2. Se não, tenta achar a cor pelo nome do componente no mapa local
        // 3. Fallback para cinza
        const cor = habilidade.cor || this.coresComponentes[habilidade.componente] || "#64748b";

        return `
            <div class="bg-white p-2.5 rounded-lg border-l-[3px] shadow-sm relative group hover:shadow-md hover:-translate-y-0.5 transition-all cursor-help border border-slate-200" 
                 style="border-left-color: ${cor} !important;" 
                 title="${descSafe}">
                
                <div class="flex justify-between items-start mb-1 gap-2">
                    <span class="text-[9px] font-black text-white px-1.5 py-0.5 rounded uppercase tracking-wider" 
                          style="background-color: ${cor}">
                        ${habilidade.codigo}
                    </span>
                    <button onclick="controller.removeHabilidadeMensal('${turmaId}', '${mes}', '${codigoSafe}')" 
                            class="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remover">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </div>
                
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate mb-1">
                    ${eixo}
                </p>
                
                <p class="text-[10px] text-slate-600 line-clamp-3 leading-snug font-medium border-t border-slate-50 pt-1">
                    ${habilidade.descricao}
                </p>
            </div>
        `;
    },

    estadoVazio() {
        return `
            <div class="flex flex-col items-center justify-center p-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center mx-auto max-w-2xl mt-10">
                <i class="far fa-calendar-times text-4xl text-slate-300 mb-4"></i>
                <h3 class="text-xl font-bold text-slate-700 mb-2">Comece por aqui</h3>
                <p class="text-slate-500 text-sm mb-6">Cadastre suas turmas na aba "Turmas" para iniciar o cronograma mensal.</p>
                <button onclick="controller.navigate('turmas')" class="btn-primary px-6 py-2 rounded-xl font-bold shadow-lg shadow-primary/20">
                    Ir para Turmas
                </button>
            </div>
        `;
    }
};