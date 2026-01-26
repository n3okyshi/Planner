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

    openAddAluno(turmaId) {
        const html = `
            <div class="p-6 space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Estudante</label>
                    <input type="text" id="al-nome" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary" placeholder="Nome completo...">
                </div>
                <div class="flex justify-end gap-3 pt-4">
                    <button onclick="controller.closeModal()" class="px-6 py-2 text-slate-500 font-bold">Cancelar</button>
                    <button onclick="controller.saveAluno('${turmaId}')" class="btn-primary px-8 py-2 rounded-xl font-bold">Adicionar</button>
                </div>
            </div>
        `;
        controller.openModal('Novo Aluno', html);
    },

    saveAluno(turmaId) {
        const nome = document.getElementById('al-nome').value;
        if (!nome) return Toast.show("O nome é obrigatório.", "error");

        model.addAluno(turmaId, nome);
        controller.closeModal();
        turmasView.renderDetalhesTurma('view-container', turmaId);
        Toast.show("Estudante adicionado!", "success");
    },

    openAddAlunoLote(turmaId) {
        const html = `
            <div class="p-6 space-y-4">
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Cole a lista de nomes (um por linha)</label>
                <textarea id="al-lista" rows="10" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary text-sm font-mono" placeholder="João Silva\nMaria Oliveira..."></textarea>
                <div class="flex justify-end gap-3">
                    <button onclick="controller.closeModal()" class="px-6 py-2 text-slate-500 font-bold">Cancelar</button>
                    <button onclick="controller.saveAlunoLote('${turmaId}')" class="btn-primary px-8 py-2 rounded-xl font-bold">Importar Lista</button>
                </div>
            </div>
        `;
        controller.openModal('Importar Alunos', html);
    },

    saveAlunoLote(turmaId) {
        const texto = document.getElementById('al-lista').value;
        const nomes = texto.split('\n').filter(n => n.trim() !== "");
        
        if (nomes.length === 0) return Toast.show("Lista vazia.", "error");

        nomes.forEach(nome => model.addAluno(turmaId, nome.trim()));
        controller.closeModal();
        turmasView.renderDetalhesTurma('view-container', turmaId);
        Toast.show(`${nomes.length} alunos importados com sucesso!`, "success");
    },

    deleteAluno(turmaId, alunoId) {
        if(confirm("Deseja remover este estudante? As notas e frequência serão perdidas.")) {
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
        
        // Atualiza a view para o período em que a nota foi criada para dar feedback visual
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
        // Sanitização rápida: se vazio, mantém vazio, se não, converte para número
        const notaLimpa = valor === "" ? "" : Number(valor);
        model.updateNota(turmaId, alunoId, avId, notaLimpa);
        
        // Não renderizamos a tela toda para não perder o foco do input,
        // apenas atualizamos a soma/média visualmente via DOM se necessário.
        // O próximo render natural já trará os dados certos.
    }
};

window.turmaController = turmaController;