// js/controllers/turmaController.js
import { model } from '../model.js';
import { controller } from '../controller.js';
import { turmasView } from '../views/turmas.js';
import { Toast } from '../components/toast.js';

export const turmaController = {

    // --- GESTÃO DE TURMAS ---

    openAddTurma() {
        const html = `
            <div class="p-6 space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Nome da Turma</label>
                    <input type="text" id="t-nome" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary" placeholder="Ex: 9º Ano A">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Nível</label>
                        <select id="t-nivel" onchange="controller.updateSerieOptions(this.value)" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary bg-white">
                            <option value="Fundamental 2">Fundamental 2</option>
                            <option value="Ensino Médio">Ensino Médio</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Série</label>
                        <select id="t-serie" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary bg-white">
                            <option value="6º Ano">6º Ano</option>
                            <option value="7º Ano">7º Ano</option>
                            <option value="8º Ano">8º Ano</option>
                            <option value="9º Ano">9º Ano</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Identificador Único</label>
                    <input type="text" id="t-ident" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary" placeholder="Ex: MAT-2026">
                </div>
                <div class="flex justify-end gap-3 pt-4">
                    <button onclick="controller.closeModal()" class="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition">Cancelar</button>
                    <button onclick="controller.saveTurma()" class="btn-primary px-8 py-2 rounded-xl font-bold shadow-lg shadow-primary/20">Criar Turma</button>
                </div>
            </div>
        `;
        controller.openModal('Nova Turma', html);
    },

    saveTurma() {
        const nome = document.getElementById('t-nome').value;
        const nivel = document.getElementById('t-nivel').value;
        const serie = document.getElementById('t-serie').value;
        const ident = document.getElementById('t-ident').value;

        if (!nome || !ident) return Toast.show("Preencha todos os campos obrigatórios.", "error");

        model.addTurma(nome, nivel, serie, ident);
        controller.closeModal();
        controller.navigate('turmas');
        Toast.show("Turma criada com sucesso!", "success");
    },

    deleteTurma(id) {
        model.deleteTurma(id);
        controller.navigate('turmas');
        Toast.show("Turma removida com sucesso.", "info");
    },

    updateSerieOptions(nivel) {
        const serieSelect = document.getElementById('t-serie');
        if (!serieSelect) return;

        let options = '';
        if (nivel === 'Fundamental 2') {
            options = `
                <option value="6º Ano">6º Ano</option>
                <option value="7º Ano">7º Ano</option>
                <option value="8º Ano">8º Ano</option>
                <option value="9º Ano">9º Ano</option>
            `;
        } else {
            options = `
                <option value="1ª Série">1ª Série</option>
                <option value="2ª Série">2ª Série</option>
                <option value="3ª Série">3ª Série</option>
            `;
        }
        serieSelect.innerHTML = options;
    },

    // --- GESTÃO DE ALUNOS ---

    // --- GESTÃO DE ALUNOS ---

    openAddAluno(turmaId, alunoId = null) {
        // Busca os dados se for uma Edição
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        const aluno = alunoId ? turma.alunos.find(a => String(a.id) === String(alunoId)) : null;

        const isEdit = !!aluno;

        // Fallbacks de compatibilidade para alunos antigos
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

        if (alunoId) {
            // LÓGICA DE EDIÇÃO
            const aluno = turma.alunos.find(a => String(a.id) === String(alunoId));
            if (aluno) {
                aluno.nome = nome;
                aluno.chamada = chamada;
                aluno.matricula = matricula;
                aluno.status = status;

                model.saveLocal(); // Persiste no LocalStorage
                // Sincroniza o aluno modificado com o Firebase Granular se aplicável
                if (model.persist && window.firebaseService) {
                    model.persist(() => firebaseService.saveAluno(model.currentUser.uid, turmaId, aluno));
                }
                Toast.show("Dados do estudante atualizados!", "success");
            }
        } else {
            // LÓGICA DE CRIAÇÃO
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

            if (model.persist && window.firebaseService) {
                model.persist(() => firebaseService.saveAluno(model.currentUser.uid, turmaId, novoAluno));
            }
            Toast.show("Estudante adicionado!", "success");
        }

        controller.closeModal();
        // Atualiza a tabela dinamicamente
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

        // 1. Limpa, remove strings vazias e usa Regex para arrancar prefixos numéricos ("01.", "1 -", etc)
        let nomes = texto.split('\n')
            .map(n => n.trim())
            .map(n => n.replace(/^(\d+[\.\-\)\]]\s*)/, '')) // Limpa formatação suja
            .filter(n => n !== "");

        if (nomes.length === 0) return Toast.show("A lista informada está vazia.", "warning");

        // 2. Ordem Alfabética (se selecionado)
        if (ordenar) {
            nomes.sort((a, b) => a.localeCompare(b));
        }

        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;

        // 3. Descobre o último número de chamada para dar sequência
        let ultimoNumeroChamada = 0;
        turma.alunos.forEach(a => {
            const num = parseInt(a.chamada);
            if (!isNaN(num) && num > ultimoNumeroChamada) {
                ultimoNumeroChamada = num;
            }
        });

        // 4. Cria os alunos com os dados atualizados
        nomes.forEach((nome, index) => {
            const numChamada = String(ultimoNumeroChamada + index + 1).padStart(2, '0'); // Ex: "01", "09", "12"

            const novoAluno = {
                id: 'aluno_' + Date.now().toString(36) + '_' + index, // "_index" previne bugs de loop super-rápido no milissegundo
                nome: nome,
                chamada: numChamada,
                matricula: '',
                status: 'cursando',
                notas: {},
                frequencia: {}
            };
            turma.alunos.push(novoAluno);
        });

        // 5. Salva na nuvem (Como é em lote, enviamos a turma inteira de uma vez para poupar a cota do Firebase)
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

    // --- GESTÃO DE AVALIAÇÕES E NOTAS ---

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
                        <div>
    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Período Letivo</label>
    <div class="custom-dropdown relative w-full">
        <input type="hidden" id="av-periodo" value="${turmasView.periodoAtivo}">
        <button type="button" class="dropdown-button w-full flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-xl shadow-sm text-sm font-bold text-indigo-600 transition-all focus:outline-none">
            <span class="dropdown-label truncate">${turmasView.periodoAtivo}º ${tipoConfig.charAt(0).toUpperCase() + tipoConfig.slice(1, 3)}</span>
            <i class="fas fa-chevron-down text-slate-400 text-xs ml-2"></i>
        </button>
        <ul class="dropdown-menu hidden absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar p-1.5 animate-slide-up origin-top text-left font-normal">
            ${Array.from({ length: numPeriodos }, (_, i) => `
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors ${turmasView.periodoAtivo === (i + 1) ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'}" data-value="${i + 1}">
                    ${i + 1}º ${tipoConfig.charAt(0).toUpperCase() + tipoConfig.slice(1, 3)}
                </li>
            `).join('')}
        </ul>
    </div>
</div>
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

        // Atualiza a view para o período em que a nota foi criada para dar feedback visual
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
        // Sanitização rápida: se vazio, mantém vazio, se não, converte para número
        const notaLimpa = valor === "" ? "" : Number(valor);
        model.updateNota(turmaId, alunoId, avId, notaLimpa);

        // Não renderizamos a tela toda para não perder o foco do input,
        // apenas atualizamos a soma/média visualmente via DOM se necessário.
        // O próximo render natural já trará os dados certos.
    }
};

window.turmaController = turmaController;