/**
 * VIEW - Turmas e Notas
 * Responsável por: Listagem de turmas, gestão de alunos e planilha de notas.
 */
const turmasView = {
    /**
     * 1. Renderiza a listagem inicial de turmas (Grid de Cards)
     */
    render(containerId) {
        const container = document.getElementById(containerId);
        // Proteção contra dados nulos
        const turmas = (model.state && model.state.turmas) ? model.state.turmas : [];

        // Cabeçalho da Página
        const headerHtml = `
            <div class="flex flex-wrap justify-between items-end mb-8 gap-4">
                <div>
                    <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Acadêmico</h2>
                    <p class="text-slate-500">Gerencie suas turmas, alunos e lançamentos de notas.</p>
                </div>
                <button onclick="controller.openAddTurma()" 
                        class="btn-primary px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                    <i class="fas fa-plus"></i> Nova Turma
                </button>
            </div>
        `;

        // Conteúdo (Grid ou Vazio)
        let contentHtml = '';
        if (turmas.length > 0) {
            contentHtml = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${turmas.map(t => this.gerarCardTurma(t)).join('')}
                </div>
            `;
        } else {
            contentHtml = this.estadoVazio();
        }

        container.innerHTML = `<div class="fade-in pb-24">${headerHtml}${contentHtml}</div>`;
    },

    /**
     * 2. Gera o HTML de um Card de Turma individual
     */
    gerarCardTurma(turma) {
        // Contagens para exibição
        const qtdAlunos = turma.alunos ? turma.alunos.length : 0;
        const qtdAtividades = turma.avaliacoes ? turma.avaliacoes.length : 0;
        const nivelShort = turma.nivel === 'Ensino Médio' ? 'EM' : 'EF';

        return `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all group relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-400"></div>

                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-3">
                        <div class="bg-primary/10 w-10 h-10 rounded-lg flex items-center justify-center text-primary">
                            <i class="fas fa-users text-lg"></i>
                        </div>
                        <span class="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase tracking-wider">
                            ${nivelShort}
                        </span>
                    </div>
                    
                    <button onclick="controller.deleteTurma(${turma.id})" 
                            class="text-slate-300 hover:text-red-500 transition p-2" title="Excluir Turma">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>

                <h3 class="text-xl font-bold text-slate-800 mb-2 truncate" title="${turma.nome}">${turma.nome}</h3>
                
                <div class="flex gap-4 text-sm text-slate-500 mb-6 border-b border-slate-50 pb-4">
                    <span class="flex items-center gap-1.5"><i class="far fa-user text-xs"></i> ${qtdAlunos} Alunos</span>
                    <span class="flex items-center gap-1.5"><i class="far fa-file-alt text-xs"></i> ${qtdAtividades} Ativ.</span>
                </div>

                <button onclick="View.renderDetalhesTurma('view-container', ${turma.id})" 
                        class="w-full py-3 rounded-xl border border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2 group/btn">
                    <span>Abrir Diário</span>
                    <i class="fas fa-arrow-right text-xs group-hover/btn:translate-x-1 transition-transform"></i>
                </button>
            </div>
        `;
    },

    /**
     * 3. Renderiza a Planilha de Notas (Detalhes da Turma)
     */
    renderDetalhesTurma(containerId, turmaId) {
        const turma = model.state.turmas.find(t => t.id === turmaId);
        
        // --- Proteção de Sincronização ---
        // Se a turma não for encontrada (foi deletada na nuvem), volta para a lista
        if (!turma) {
            console.warn("Turma não encontrada (possível sync delete). Voltando para lista.");
            this.render(containerId);
            return;
        }

        const container = document.getElementById(containerId);

        // Filtra alunos válidos (com nome)
        const alunosValidos = (turma.alunos || []).filter(a => a.nome && a.nome.trim().length > 0);

        const html = `
            <div class="fade-in pb-20">
                <div class="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div class="flex items-center gap-4">
                        <button onclick="controller.navigate('turmas')" class="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-white hover:shadow-sm transition-all bg-white">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <div>
                            <h2 class="text-3xl font-bold text-slate-800">${turma.nome}</h2>
                            <p class="text-slate-500 text-sm">${alunosValidos.length} alunos matriculados</p>
                        </div>
                    </div>
                    
                    <div class="flex gap-2">
                        <div class="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                            <button onclick="controller.openAddAlunoLote(${turma.id})" 
                                    class="px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition flex items-center gap-2"
                                    title="Importar lista de nomes">
                                <i class="fas fa-file-import"></i> Importar
                            </button>
                            <div class="w-px bg-slate-200 my-1"></div>
                            <button onclick="controller.openAddAluno(${turma.id})" 
                                    class="px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition flex items-center gap-2">
                                <i class="fas fa-user-plus"></i> Novo Aluno
                            </button>
                        </div>

                        <button onclick="controller.openAddAvaliacao(${turma.id})" 
                                class="btn-primary px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md shadow-primary/20">
                            <i class="fas fa-plus-circle"></i> Criar Atividade
                        </button>
                    </div>
                </div>

                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col max-h-[70vh]">
                    <div class="overflow-auto custom-scrollbar flex-1">
                        <table class="w-full text-left border-collapse relative">
                            <thead class="bg-slate-50 text-slate-500 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th class="p-4 text-[10px] font-black uppercase tracking-wider w-16 text-center border-b border-slate-200 bg-slate-50">Nº</th>
                                    <th class="p-4 text-[10px] font-black uppercase tracking-wider min-w-[200px] border-b border-slate-200 bg-slate-50">Nome do Aluno</th>
                                    
                                    ${turma.avaliacoes.map(av => `
                                        <th class="p-3 min-w-[100px] text-center border-l border-b border-slate-200 bg-slate-50 group cursor-help relative">
                                            <div class="flex flex-col items-center">
                                                <span class="text-[10px] font-bold text-slate-700 truncate max-w-[120px]" title="${av.nome}">${av.nome}</span>
                                                <span class="text-[9px] font-bold text-slate-400 bg-slate-200 px-1.5 rounded mt-1">Peso ${av.max}</span>
                                            </div>
                                            <button onclick="controller.deleteAvaliacao(${turma.id}, ${av.id})" 
                                                    class="absolute top-1 right-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <i class="fas fa-times-circle"></i>
                                            </button>
                                        </th>
                                    `).join('')}

                                    <th class="p-4 text-[10px] font-black uppercase tracking-wider w-24 text-center text-primary border-l border-b border-primary/20 bg-primary/5">Total</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 bg-white">
                                ${alunosValidos.length > 0
                                    ? alunosValidos.map((aluno, index) => this.gerarLinhaAluno(aluno, index, turma)).join('')
                                    : `<tr><td colspan="100" class="p-10 text-center text-slate-400 italic">Nenhum aluno cadastrado nesta turma.</td></tr>`
                                }
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="bg-slate-50 border-t border-slate-200 p-3 text-xs text-slate-500 text-center font-medium">
                        Dica: As notas são salvas automaticamente ao sair do campo.
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    /**
     * 4. Gera o HTML de uma linha da tabela (Aluno)
     */
    gerarLinhaAluno(aluno, index, turma) {
        // Calcula o total das notas
        const totalNotas = Object.values(aluno.notas || {}).reduce((acc, nota) => acc + Number(nota), 0);
        
        // Define cor da nota final
        const totalDistribuido = turma.avaliacoes.reduce((acc, av) => acc + Number(av.max), 0);
        const porcentagem = totalDistribuido > 0 ? (totalNotas / totalDistribuido) * 100 : 0;
        const corNota = porcentagem >= 60 ? 'text-emerald-600' : (totalDistribuido === 0 ? 'text-slate-400' : 'text-red-500');

        return `
            <tr class="hover:bg-slate-50/80 transition-colors group">
                <td class="p-3 text-center text-slate-400 font-mono text-xs">${index + 1}</td>
                <td class="p-3 font-semibold text-slate-700 text-sm whitespace-nowrap flex items-center justify-between gap-2">
                    ${aluno.nome}
                    <button onclick="controller.deleteAluno(${turma.id}, ${aluno.id})" 
                            class="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" 
                            title="Remover Aluno">
                        <i class="far fa-trash-alt"></i>
                    </button>
                </td>
                
                ${turma.avaliacoes.map(av => `
                    <td class="p-0 border-l border-slate-100 relative">
                        <input type="number" 
                               value="${aluno.notas[av.id] || ''}" 
                               placeholder="-"
                               min="0" max="${av.max}" step="0.1"
                               onchange="controller.updateNota(${turma.id}, ${aluno.id}, ${av.id}, this.value)"
                               class="w-full h-full py-3 text-center bg-transparent focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-blue-200 outline-none font-medium text-slate-600 transition-all placeholder:text-slate-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">
                    </td>
                `).join('')}
                
                <td class="p-3 text-center font-bold ${corNota} bg-primary/5 border-l border-primary/10">
                    ${totalNotas > 0 ? totalNotas.toFixed(1).replace('.0', '') : '-'}
                </td>
            </tr>
        `;
    },

    /**
     * Tela para quando não há turmas
     */
    estadoVazio() {
        return `
            <div class="col-span-full flex flex-col items-center justify-center p-16 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center shadow-sm">
                <div class="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 text-slate-300">
                    <i class="fas fa-chalkboard-teacher text-3xl"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-700 mb-2">Vamos começar?</h3>
                <p class="text-slate-500 max-w-md mx-auto mb-8">
                    Crie sua primeira turma para começar a gerenciar alunos, lançar notas e organizar seu diário.
                </p>
                <button onclick="controller.openAddTurma()" class="btn-primary px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                    Criar Primeira Turma
                </button>
            </div>
        `;
    }
};

// Integração Global (Essencial para o Controller funcionar)
window.View = window.View || {};
window.View.renderTurmas = (id, data) => turmasView.render(id, data);
window.View.renderDetalhesTurma = (id, turmaId) => turmasView.renderDetalhesTurma(id, turmaId);