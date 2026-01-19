/**
 * VIEW - Mapa de Sala (Espelho de Classe)
 * Responsável por: Renderizar o layout da sala e gerenciar a posição dos alunos.
 */
const salaView = {
    render(containerId) {
        const container = document.getElementById(containerId);

        // Garante que model.state.turmas exista e seja um array
        const turmas = (model.state && model.state.turmas) ? model.state.turmas : [];

        const html = `
            <div class="fade-in pb-20">
                <div class="flex flex-wrap justify-between items-center mb-8 gap-4 no-print">
                    <div>
                        <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Mapa de Sala</h2>
                        <p class="text-slate-500">Organize a disposição dos estudantes no ambiente.</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 no-print">
                    <select id="map-select-turma" onchange="salaView.carregarMapa(this.value)" 
                            class="md:col-span-3 border border-slate-200 p-4 rounded-xl bg-white focus:border-primary outline-none font-medium transition-all shadow-sm">
                        <option value="">Selecione uma turma para visualizar o mapa...</option>
                        ${turmas.map(t => `<option value="${t.id}">${t.nome}</option>`).join('')}
                    </select>
                    <button onclick="window.print()" class="bg-slate-800 text-white rounded-xl font-bold hover:bg-black transition flex items-center justify-center gap-2 shadow-md">
                        <i class="fas fa-print"></i> Imprimir
                    </button>
                </div>

                <div id="mapa-container" class="bg-slate-100 p-8 md:p-12 rounded-[2rem] relative min-h-[600px] border-4 border-slate-200 shadow-inner print:border-none print:bg-white print:p-0">
                    
                    <div class="w-full max-w-xl mx-auto h-16 bg-white rounded-xl shadow-sm mb-12 flex items-center justify-center font-black text-slate-300 border-b-4 border-slate-200 tracking-[0.5em] uppercase print:border print:border-black">
                        Quadro / Professor
                    </div>

                    <div class="grid grid-cols-6 gap-3 md:gap-6 max-w-4xl mx-auto" id="room-grid">
                        <div class="col-span-full py-20 text-center text-slate-400 italic flex flex-col items-center gap-2">
                            <i class="fas fa-chair text-4xl opacity-50"></i>
                            <p>Selecione uma turma acima para carregar o mapa.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    /**
     * Renderiza os 36 assentos padrão (6x6)
     */
    carregarMapa(turmaId) {
        if (!turmaId) return;

        const grid = document.getElementById('room-grid');
        const turma = model.state.turmas.find(t => t.id == turmaId);

        // Se a turma não existir (ex: foi deletada), para aqui
        if (!turma) return;

        let assentosHtml = '';

        // Loop para criar 36 carteiras
        for (let i = 1; i <= 36; i++) {
            const aluno = turma.alunos.find(a => a.posicao === i);

            // Estilos condicionais
            const bgClass = aluno ? 'bg-white border-l-4 border-primary shadow-md' : 'bg-slate-50 border-2 border-dashed border-slate-300 hover:border-primary hover:bg-white';
            const content = aluno
                ? `
                    <div class="flex flex-col items-center justify-center h-full w-full p-1 text-center">
                        <span class="font-bold text-slate-700 text-[10px] md:text-xs leading-tight line-clamp-2 w-full break-words">
                            ${aluno.nome.split(' ')[0]} ${aluno.nome.split(' ')[1] ? aluno.nome.split(' ')[1].charAt(0) + '.' : ''}
                        </span>
                    </div>
                  `
                : `<span class="text-[10px] font-bold text-slate-300">${i}</span>`;

            assentosHtml += `
                <div onclick="salaView.vincularAluno(${turmaId}, ${i})" 
                     class="aspect-square rounded-lg flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 ${bgClass} relative group print:border print:border-black print:shadow-none">
                    ${content}
                    
                    ${!aluno ? '<i class="fas fa-plus absolute text-primary opacity-0 group-hover:opacity-100 transition-opacity"></i>' : ''}
                </div>
            `;
        }

        grid.innerHTML = assentosHtml;
    },

    /**
     * Modal para escolher qual aluno sentará naquela posição
     */
    vincularAluno(turmaId, posicao) {
        const turma = model.state.turmas.find(t => t.id == turmaId);

        // Filtra alunos que NÃO têm lugar ou que JÁ estão neste lugar (para poder remover)
        const alunosDisponiveis = turma.alunos.filter(a => !a.posicao || a.posicao === posicao);
        const alunoAtual = turma.alunos.find(a => a.posicao === posicao);

        controller.openModal(`Assento ${posicao}`, `
            <div class="p-4">
                <p class="text-sm text-slate-500 mb-4">Escolha um aluno para sentar aqui:</p>
                
                <div class="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 mb-4 pr-1">
                    ${alunosDisponiveis.length > 0
                ? alunosDisponiveis
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                    .map(aluno => `
                                <button onclick="salaView.salvarPosicao(${turmaId}, ${aluno.id}, ${posicao})" 
                                        class="w-full text-left p-3 rounded-xl hover:bg-blue-50 hover:text-primary transition font-medium border border-slate-100 flex justify-between items-center group">
                                    <span>${aluno.nome}</span>
                                    ${aluno.posicao === posicao ? '<i class="fas fa-check text-green-500"></i>' : '<i class="fas fa-chair opacity-0 group-hover:opacity-50"></i>'}
                                </button>
                            `).join('')
                : '<div class="text-center text-slate-400 text-xs py-4">Todos os alunos já têm lugar.</div>'
            }
                </div>

                ${alunoAtual ? `
                    <div class="pt-4 border-t border-slate-100">
                        <button onclick="salaView.salvarPosicao(${turmaId}, null, ${posicao})" 
                                class="w-full py-2.5 text-red-500 text-sm font-bold hover:bg-red-50 rounded-lg transition flex items-center justify-center gap-2">
                            <i class="fas fa-user-slash"></i> Desocupar Assento
                        </button>
                    </div>
                ` : ''}
            </div>
        `);
    },

    salvarPosicao(turmaId, alunoId, posicao) {
        const turma = model.state.turmas.find(t => t.id == turmaId);

        // 1. Limpa: Se alguém já estava sentado AQUI, levanta.
        turma.alunos.forEach(a => {
            if (a.posicao === posicao) delete a.posicao;
        });

        // 2. Senta: Se um aluno foi selecionado, ele senta AQUI (e sai de onde estava antes).
        if (alunoId) {
            // Se o aluno já estava sentado em outro lugar, o passo 1 não pegou ele (pois pos !== posicao anterior)
            // Mas precisamos garantir que ele não fique em dois lugares.
            // O aluno selecionado agora terá posicao = posicao atual.
            const aluno = turma.alunos.find(a => a.id == alunoId);

            // Remove o aluno de qualquer outro lugar que ele estivesse
            turma.alunos.forEach(a => { if (a.id === alunoId) delete a.posicao; });

            aluno.posicao = posicao;
        }

        model.save();
        controller.closeModal();
        this.carregarMapa(turmaId);
    }
};

// Integração Global (Obrigatório para o Controller funcionar)
// Mapeia tanto renderMapa quanto renderSala para garantir compatibilidade
window.View = window.View || {};
window.View.renderSala = (id) => salaView.render(id);
window.View.renderMapa = (id) => salaView.render(id);