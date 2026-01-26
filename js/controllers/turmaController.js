// js/controllers/turmaController.js
import { model } from '../model.js';
import { Toast } from '../components/toast.js';
import { firebaseService } from '../firebase-service.js';

export const turmaController = {
    // --- Gerenciamento de Turmas ---
    openAddTurma() { 
        window.controller.openModal('Nova Turma', this._getAddTurmaHtml()); 
    },

    _getAddTurmaHtml() {
        return `
            <div class="p-6 space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Nível</label>
                        <select id="input-nivel" onchange="controller.updateSerieOptions(this.value)" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary bg-white">
                            <option value="">Selecione...</option>
                            <option value="Educação Infantil">Educação Infantil</option>
                            <option value="Ensino Fundamental">Ensino Fundamental</option>
                            <option value="Ensino Médio">Ensino Médio</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Série</label>
                        <select id="input-serie" disabled class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary bg-slate-50 transition-colors">
                            <option value="">Aguardando nível...</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Identificador</label>
                    <input type="text" id="input-id-turma" placeholder="Ex: A, B, Matutino" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary">
                </div>
                <div class="flex justify-end pt-4">
                    <button onclick="controller.saveTurma()" class="btn-primary px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20">Criar Turma</button>
                </div>
            </div>
        `;
    },

    updateSerieOptions(nivel) {
        const select = document.getElementById('input-serie');
        const opcoes = {
            'Educação Infantil': ['G1', 'G2', 'G3', 'G4', 'G5'],
            'Ensino Fundamental': ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano'],
            'Ensino Médio': ['1ª Série', '2ª Série', '3ª Série']
        };
        if (opcoes[nivel]) {
            select.innerHTML = opcoes[nivel].map(op => `<option value="${op}">${op}</option>`).join('');
            select.disabled = false;
            select.classList.remove('bg-slate-50');
            select.classList.add('bg-white');
        } else {
            select.innerHTML = '<option value="">Aguardando nível...</option>';
            select.disabled = true;
        }
    },

    saveTurma() {
        const nivel = document.getElementById('input-nivel').value;
        const serie = document.getElementById('input-serie').value;
        const id = document.getElementById('input-id-turma').value;
        if (nivel && serie && id) {
            model.addTurma(`${serie} ${id}`, nivel, serie, id);
            window.controller.closeModal();
            window.controller.navigate('turmas');
            Toast.show('Turma criada com sucesso!', 'success');
        } else {
            Toast.show("Por favor, preencha todos os campos.", 'warning');
        }
    },

    deleteTurma(id) {
        window.controller.confirmarAcao(
            'Excluir Turma?',
            'Esta ação apagará todos os alunos, notas e planejamentos vinculados. <strong>Não pode ser desfeita.</strong>',
            () => {
                model.deleteTurma(id);
                window.controller.navigate('turmas');
                Toast.show("Turma excluída permanentemente.", 'success');
            }
        );
    },

    // --- Gerenciamento de Alunos ---
    openAddAluno(turmaId) {
        window.controller.openModal('Novo Aluno', `
            <div class="p-6">
                <input type="text" id="input-aluno-nome" placeholder="Nome Completo" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary mb-4">
                <button onclick="controller.saveAluno('${turmaId}')" class="btn-primary w-full py-3 rounded-xl font-bold">Salvar</button>
            </div>
        `);
        setTimeout(() => document.getElementById('input-aluno-nome').focus(), 100);
    },

    saveAluno(turmaId) {
        const nome = document.getElementById('input-aluno-nome').value;
        if (nome) {
            model.addAluno(turmaId, nome);
            window.controller.closeModal();
            this._refreshTurmaView(turmaId);
        }
    },

    deleteAluno(turmaId, alunoId) {
        const turma = model.state.turmas.find(t => t.id == turmaId);
        const aluno = turma ? turma.alunos.find(a => a.id == alunoId) : null;
        if (!aluno) return;

        model.deleteAluno(turmaId, alunoId);
        this._refreshTurmaView(turmaId);

        Toast.show(`Aluno removido.`, 'info', 5000, {
            label: 'DESFAZER',
            callback: () => {
                const t = model.state.turmas.find(t => t.id == turmaId);
                if (t) {
                    t.alunos.push(aluno);
                    t.alunos.sort((a, b) => a.nome.localeCompare(b.nome));
                    model.saveLocal();
                    if (model.currentUser) firebaseService.saveAluno(model.currentUser.uid, turmaId, aluno);
                    this._refreshTurmaView(turmaId);
                    Toast.show('Aluno restaurado!', 'success');
                }
            }
        });
    },

    openAddAlunoLote(turmaId) {
        window.controller.openModal('Importar Alunos', `
            <div class="p-6">
                <p class="text-xs text-slate-500 mb-2">Cole a lista de nomes (um por linha):</p>
                <textarea id="input-lote" rows="10" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary text-sm"></textarea>
                <button onclick="controller.saveAlunoLote('${turmaId}')" class="btn-primary w-full py-3 rounded-xl font-bold mt-4">Importar</button>
            </div>
        `);
    },

    saveAlunoLote(turmaId) {
        const text = document.getElementById('input-lote').value;
        if (text) {
            const nomes = text.split('\n').map(n => n.trim()).filter(n => n.length > 0);
            nomes.forEach(nome => model.addAluno(turmaId, nome));
            window.controller.closeModal();
            this._refreshTurmaView(turmaId);
            Toast.show(`${nomes.length} alunos importados.`, 'success');
        }
    },

    // --- Avaliações e Notas ---
    openAddAvaliacao(turmaId) {
        window.controller.openModal('Nova Atividade Avaliativa', `
            <div class="p-6 space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Nome da Atividade</label>
                    <input type="text" id="av-nome" placeholder="Ex: Prova Mensal, Trabalho..." class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Peso / Nota Máxima</label>
                    <input type="number" id="av-max" value="10" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary">
                </div>
                <button onclick="controller.saveAvaliacao('${turmaId}')" class="btn-primary w-full py-3 rounded-xl font-bold mt-2">Criar Atividade</button>
            </div>
        `);
    },

    saveAvaliacao(turmaId) {
        const nome = document.getElementById('av-nome').value;
        const max = document.getElementById('av-max').value;
        if (nome && max) {
            model.addAvaliacao(turmaId, nome, max);
            window.controller.closeModal();
            this._refreshTurmaView(turmaId);
        }
    },

    deleteAvaliacao(turmaId, avId) {
        window.controller.confirmarAcao("Excluir Avaliação?", "Isso apagará todas as notas lançadas para esta atividade.", () => {
            model.deleteAvaliacao(turmaId, avId);
            this._refreshTurmaView(turmaId);
            Toast.show("Avaliação excluída.", 'success');
        });
    },

    updateNota(turmaId, alunoId, avId, valor) {
        model.updateNota(turmaId, alunoId, avId, valor);
    },

    // Auxiliar para atualizar a tela específica da turma
    _refreshTurmaView(turmaId) {
        if (window.controller.currentView === 'turmas' && window.turmasView.renderDetalhesTurma) {
            window.turmasView.renderDetalhesTurma(document.getElementById('view-container'), turmaId);
        } else {
            window.controller.navigate('turmas');
        }
    }
};