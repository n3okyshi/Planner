window.salaView = {
    currentTurmaId: null,
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        const turmas = (model.state && model.state.turmas) ? model.state.turmas : [];
        if (this.currentTurmaId && !turmas.find(t => t.id == this.currentTurmaId)) {
            this.currentTurmaId = null;
        }
        if (!this.currentTurmaId && turmas.length > 0) {
            this.currentTurmaId = turmas[0].id;
        }
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
                            class="md:col-span-3 border border-slate-200 p-4 rounded-xl bg-white focus:border-primary outline-none font-medium transition-all shadow-sm cursor-pointer">
                        ${turmas.length > 0
                            ? turmas.map(t => `<option value="${t.id}" ${t.id == this.currentTurmaId ? 'selected' : ''}>${t.nome}</option>`).join('')
                            : '<option value="">Nenhuma turma cadastrada</option>'
                        }
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
                            <p>Carregando mapa...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
        if (this.currentTurmaId) {
            this.carregarMapa(this.currentTurmaId);
        } else {
            const grid = document.getElementById('room-grid');
            if (grid) {
                grid.innerHTML = `
                    <div class="col-span-full py-20 text-center text-slate-400 italic flex flex-col items-center gap-2">
                        <i class="fas fa-chair text-4xl opacity-50"></i>
                        <p>Cadastre uma turma para visualizar o mapa.</p>
                    </div>
                `;
            }
        }
    },
    carregarMapa(turmaId) {
        if (!turmaId) return;
        this.currentTurmaId = turmaId;
        const grid = document.getElementById('room-grid');
        const turma = model.state.turmas.find(t => t.id == turmaId);
        if (!turma || !grid) return;
        let assentosHtml = '';
        for (let i = 1; i <= 36; i++) {
            const aluno = turma.alunos.find(a => a.posicao === i);
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
                <div onclick="salaView.vincularAluno('${turmaId}', ${i})" 
                     class="aspect-square rounded-lg flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 ${bgClass} relative group print:border print:border-black print:shadow-none">
                    ${content}
                    ${!aluno ? '<i class="fas fa-plus absolute text-primary opacity-0 group-hover:opacity-100 transition-opacity"></i>' : ''}
                </div>
            `;
        }
        grid.innerHTML = assentosHtml;
    },
    vincularAluno(turmaId, posicao) {
        const turma = model.state.turmas.find(t => t.id == turmaId);
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
                                <button onclick="salaView.salvarPosicao('${turmaId}', '${aluno.id}', ${posicao})" 
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
                        <button onclick="salaView.salvarPosicao('${turmaId}', null, ${posicao})" 
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
        turma.alunos.forEach(a => {
            if (a.posicao === posicao) delete a.posicao;
        });
        if (alunoId) {
            const aluno = turma.alunos.find(a => a.id == alunoId);
            turma.alunos.forEach(a => { if (a.id == alunoId) delete a.posicao; });
            if (aluno) aluno.posicao = posicao;
        }
        model.save();
        controller.closeModal();
        this.carregarMapa(turmaId);
    }
};