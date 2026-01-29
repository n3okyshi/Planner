/**
 * @file turmaController.js
 * @description Gerencia o ciclo de vida das Turmas, Alunos e Avaliações.
 * @module controllers/turmaController
 */

import { model } from '../model.js';
import { Toast } from '../components/toast.js';
import { firebaseService } from '../firebase-service.js';

/**
 * Controlador de Turmas.
 * @namespace turmaController
 */
export const turmaController = {
    
    // =========================================================================
    // GESTÃO DE TURMAS
    // =========================================================================

    /**
     * Abre o modal para cadastro de nova turma.
     */
    openAddTurma() { 
        window.controller.openModal('Nova Turma', this._getAddTurmaHtml()); 
    },

    /**
     * Gera o HTML do formulário de turma.
     * @private
     * @returns {string} HTML string.
     */
    _getAddTurmaHtml() {
        return `
            <div class="p-6 space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Nível</label>
                        <select id="input-nivel" onchange="turmaController.updateSerieOptions(this.value)" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary bg-white">
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
                    <button onclick="turmaController.saveTurma()" class="btn-primary px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20">Criar Turma</button>
                </div>
            </div>
        `;
    },

    /**
     * Atualiza as opções do select de série baseado no nível escolhido.
     * @param {string} nivel - O nível de ensino selecionado.
     */
    updateSerieOptions(nivel) {
        const select = document.getElementById('input-serie');
        if (!select) return;

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

    /**
     * Salva a nova turma no model.
     */
    saveTurma() {
        const nivel = document.getElementById('input-nivel')?.value;
        const serie = document.getElementById('input-serie')?.value;
        const id = document.getElementById('input-id-turma')?.value;

        if (nivel && serie && id) {
            // Cria um nome amigável composto, ex: "6º Ano A"
            model.addTurma(`${serie} ${id}`, nivel, serie, id);
            
            window.controller.closeModal();
            window.controller.navigate('turmas');
            Toast.show('Turma criada com sucesso!', 'success');
        } else {
            Toast.show("Por favor, preencha todos os campos.", 'warning');
        }
    },

    /**
     * Exclui uma turma permanentemente.
     * @param {string} id - ID da turma.
     */
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

    // =========================================================================
    // GESTÃO DE ALUNOS
    // =========================================================================

    /**
     * Abre modal para adicionar um único aluno.
     * @param {string} turmaId 
     */
    openAddAluno(turmaId) {
        window.controller.openModal('Novo Aluno', `
            <div class="p-6">
                <input type="text" id="input-aluno-nome" placeholder="Nome Completo" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary mb-4">
                <button onclick="turmaController.saveAluno('${turmaId}')" class="btn-primary w-full py-3 rounded-xl font-bold">Salvar</button>
            </div>
        `);
        // Foco automático para agilidade
        setTimeout(() => document.getElementById('input-aluno-nome')?.focus(), 100);
    },

    /**
     * Salva o aluno individualmente.
     * @param {string} turmaId 
     */
    saveAluno(turmaId) {
        const nome = document.getElementById('input-aluno-nome')?.value;
        if (nome) {
            model.addAluno(turmaId, nome);
            window.controller.closeModal();
            this._refreshTurmaView(turmaId);
            Toast.show("Estudante adicionado!", "success");
        } else {
            Toast.show("Digite o nome do aluno.", "warning");
        }
    },

    /**
     * Remove um aluno com possibilidade de desfazer (Undo).
     * @param {string} turmaId 
     * @param {string} alunoId 
     */
    deleteAluno(turmaId, alunoId) {
        // Busca dados para backup antes de excluir
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        const aluno = turma ? turma.alunos.find(a => String(a.id) === String(alunoId)) : null;
        
        if (!aluno) return;

        // Executa a exclusão
        model.deleteAluno(turmaId, alunoId);
        this._refreshTurmaView(turmaId);

        // Toast com lógica de Restauração
        Toast.show(`Aluno removido.`, 'info', 5000, {
            label: 'DESFAZER',
            callback: () => {
                const t = model.state.turmas.find(t => String(t.id) === String(turmaId));
                if (t) {
                    // Reinsere o objeto exato (preservando ID e notas)
                    t.alunos.push(aluno);
                    t.alunos.sort((a, b) => a.nome.localeCompare(b.nome));
                    
                    model.saveLocal();
                    
                    // Sincroniza restauração se logado
                    if (model.currentUser && firebaseService.saveAluno) {
                        firebaseService.saveAluno(model.currentUser.uid, turmaId, aluno);
                    }
                    
                    // Atualiza tela
                    window.turmaController._refreshTurmaView(turmaId);
                    Toast.show('Aluno restaurado!', 'success');
                }
            }
        });
    },

    /**
     * Abre modal para importação em lote (copy-paste).
     * @param {string} turmaId 
     */
    openAddAlunoLote(turmaId) {
        window.controller.openModal('Importar Alunos', `
            <div class="p-6">
                <p class="text-xs text-slate-500 mb-2">Cole a lista de nomes (um por linha):</p>
                <textarea id="input-lote" rows="10" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary text-sm placeholder:text-slate-300" placeholder="Ana Silva&#10;Bruno Souza&#10;Carlos..."></textarea>
                <button onclick="turmaController.saveAlunoLote('${turmaId}')" class="btn-primary w-full py-3 rounded-xl font-bold mt-4">Importar</button>
            </div>
        `);
    },

    /**
     * Processa a lista de nomes e salva em lote.
     * @param {string} turmaId 
     */
    saveAlunoLote(turmaId) {
        const text = document.getElementById('input-lote')?.value;
        if (text) {
            const nomes = text.split('\n').map(n => n.trim()).filter(n => n.length > 0);
            
            if (nomes.length === 0) {
                Toast.show("Nenhum nome identificado.", "warning");
                return;
            }

            nomes.forEach(nome => model.addAluno(turmaId, nome));
            
            window.controller.closeModal();
            this._refreshTurmaView(turmaId);
            Toast.show(`${nomes.length} alunos importados.`, 'success');
        }
    },

    // =========================================================================
    // AVALIAÇÕES E NOTAS
    // =========================================================================

    /**
     * Abre modal para criar avaliação.
     * Adicionado seletor de período obrigatório.
     * @param {string} turmaId 
     */
    openAddAvaliacao(turmaId) {
        // Determina tipo de período (Bimestre/Trimestre) baseado na config ou padrão
        const tipoPeriodo = model.state.userConfig?.periodType || 'bimestre';
        const qtdPeriodos = tipoPeriodo === 'trimestre' ? 3 : 4;
        
        let optionsPeriodo = '';
        for(let i=1; i<=qtdPeriodos; i++) {
            optionsPeriodo += `<option value="${i}">${i}º ${tipoPeriodo === 'trimestre' ? 'Trimestre' : 'Bimestre'}</option>`;
        }

        window.controller.openModal('Nova Atividade Avaliativa', `
            <div class="p-6 space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Nome da Atividade</label>
                    <input type="text" id="av-nome" placeholder="Ex: Prova Mensal, Trabalho..." class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Nota Máxima</label>
                        <input type="number" id="av-max" value="10" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Período</label>
                        <select id="av-periodo" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary bg-white">
                            ${optionsPeriodo}
                        </select>
                    </div>
                </div>
                <button onclick="turmaController.saveAvaliacao('${turmaId}')" class="btn-primary w-full py-3 rounded-xl font-bold mt-2">Criar Atividade</button>
            </div>
        `);
    },

    /**
     * Salva a avaliação vinculando ao período correto.
     * @param {string} turmaId 
     */
    saveAvaliacao(turmaId) {
        const nome = document.getElementById('av-nome')?.value;
        const max = document.getElementById('av-max')?.value;
        const periodo = document.getElementById('av-periodo')?.value;

        if (nome && max && periodo) {
            model.addAvaliacao(turmaId, nome, max, periodo);
            window.controller.closeModal();
            this._refreshTurmaView(turmaId);
            Toast.show("Avaliação criada.", "success");
        } else {
            Toast.show("Preencha todos os dados.", "warning");
        }
    },

    /**
     * Exclui uma avaliação e suas notas.
     * @param {string} turmaId 
     * @param {string} avId 
     */
    deleteAvaliacao(turmaId, avId) {
        window.controller.confirmarAcao("Excluir Avaliação?", "Isso apagará todas as notas lançadas para esta atividade.", () => {
            model.deleteAvaliacao(turmaId, avId);
            this._refreshTurmaView(turmaId);
            Toast.show("Avaliação excluída.", 'success');
        });
    },

    /**
     * Atualiza a nota de um aluno (disparado via onblur ou enter).
     * @param {string} turmaId 
     * @param {string} alunoId 
     * @param {string} avId 
     * @param {string|number} valor 
     */
    updateNota(turmaId, alunoId, avId, valor) {
        model.updateNota(turmaId, alunoId, avId, valor);
    },

    // =========================================================================
    // AUXILIARES
    // =========================================================================

    /**
     * Helper para recarregar a visão de detalhes da turma sem perder o contexto.
     * @private
     * @param {string} turmaId 
     */
    _refreshTurmaView(turmaId) {
        // Verifica se a view de turmas está acessível globalmente
        if (window.controller.currentView === 'turmas' && window.turmasView && window.turmasView.renderDetalhesTurma) {
            window.turmasView.renderDetalhesTurma(document.getElementById('view-container'), turmaId);
        } else {
            window.controller.navigate('turmas');
        }
    }
};

// Exposição global para chamadas via HTML (onclick)
if (typeof window !== 'undefined') {
    window.turmaController = turmaController;
}