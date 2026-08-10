import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';
import { aiService } from '../ai-service.js';

export const quizGestorView = {
    currentQuiz: null,

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const quizzes = model.state.quizzes || [];

        const html = `
            <div class="animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8);">
                
                <!-- TOP HEADER & CONTROLS TOOLBAR -->
                <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em; display: flex; align-items: center; gap: var(--spacing-2);">
                            <i class="fas fa-gamepad" style="color: var(--color-primary);"></i> Quiz Interativo em Sala
                        </h2>
                        <p style="font-size: 0.875rem; color: var(--color-slate-500);">Engaje seus estudantes com competições interativas e gamificadas em tempo real.</p>
                    </div>

                    <div style="display: flex; align-items: center; gap: var(--spacing-3); flex-wrap: wrap;">
                        <button type="button" onclick="quizGestorView.abrirGeradorIA()" class="btn-secondary interactive-element">
                            <i class="fas fa-robot"></i> <span>Gerar com IA</span>
                        </button>
                        <button type="button" onclick="quizGestorView.criarNovoQuiz()" class="btn-primary interactive-element">
                            <i class="fas fa-plus"></i> <span>Novo Quiz</span>
                        </button>
                    </div>
                </div>

                <!-- QUIZZES GRID -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--spacing-6);">
                    ${quizzes.length > 0 ? quizzes.map(q => this.cardQuiz(q)).join('') : this.estadoVazio()}
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    cardQuiz(quiz) {
        return `
            <div class="card interactive-element" style="padding: var(--spacing-6); display: flex; flex-direction: column; justify-content: space-between; gap: var(--spacing-4); transition: all var(--transition-fast);">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-3);">
                        <span class="badge" style="background-color: var(--color-primary-light); color: var(--color-primary); font-weight: 800; text-transform: uppercase;">
                            ${window.escapeHTML(quiz.disciplina || 'Geral')}
                        </span>
                        <button type="button" onclick="quizGestorView.editarQuiz('${quiz.id}')" class="btn-icon" title="Editar Quiz">
                            <i class="fas fa-pencil-alt" style="font-size: 0.875rem;"></i>
                        </button>
                    </div>

                    <h3 style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${window.escapeHTML(quiz.titulo)}
                    </h3>
                    <p style="font-size: 0.8125rem; color: var(--color-slate-500); font-weight: 600;">
                        ${quiz.perguntas?.length || 0} questões cadastradas
                    </p>
                </div>

                <button type="button" onclick="controller.navigate('quiz-player'); setTimeout(() => window.quizPlayerView?.start('${quiz.id}'), 100);" class="btn-primary" style="width: 100%; justify-content: center; padding: 0.75rem; background-color: var(--color-slate-800);">
                    <i class="fas fa-play"></i> <span>Apresentar em Sala</span>
                </button>
            </div>
        `;
    },

    estadoVazio() {
        return `
            <div class="card" style="grid-column: 1 / -1; padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 2px dashed var(--color-slate-200);">
                <div style="width: 4rem; height: 4rem; border-radius: var(--radius-full); background-color: var(--color-slate-100); color: var(--color-slate-400); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; margin-bottom: 1rem;">
                    <i class="fas fa-gamepad"></i>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.5rem;">Nenhum Quiz criado ainda</h3>
                <p style="color: var(--color-slate-500); font-size: 0.875rem; max-width: 380px; margin-bottom: 1.5rem;">Crie quizzes manualmente ou utilize a IA para gerar perguntas dinâmicas e engajadoras.</p>
                <div style="display: flex; gap: 0.75rem;">
                    <button type="button" onclick="quizGestorView.abrirGeradorIA()" class="btn-secondary">
                        <i class="fas fa-robot"></i> <span>Gerar com IA</span>
                    </button>
                    <button type="button" onclick="quizGestorView.criarNovoQuiz()" class="btn-primary">
                        <i class="fas fa-plus"></i> <span>Criar Manualmente</span>
                    </button>
                </div>
            </div>
        `;
    },

    abrirGeradorIA() {
        const html = `
            <div style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4);">
                    <div>
                        <label class="form-label">Disciplina</label>
                        <input type="text" id="ai-disciplina" class="form-input" placeholder="Ex: Matemática, História...">
                    </div>
                    <div>
                        <label class="form-label">Série / Ano</label>
                        <input type="text" id="ai-serie" class="form-input" placeholder="Ex: 8º Ano, Ensino Médio...">
                    </div>
                </div>

                <div>
                    <label class="form-label">Assunto / Tema do Quiz</label>
                    <input type="text" id="ai-assunto" class="form-input" placeholder="Ex: Equações de 1º Grau, Revolução Francesa...">
                </div>

                <div>
                    <label class="form-label">Quantidade de Perguntas</label>
                    <select id="ai-qtd" class="form-select">
                        <option value="3">3 Perguntas</option>
                        <option value="5" selected>5 Perguntas</option>
                        <option value="10">10 Perguntas</option>
                    </select>
                </div>

                <div id="ai-loading" style="display: none; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem; text-align: center;">
                    <i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--color-primary); margin-bottom: 0.75rem;"></i>
                    <p style="font-size: 0.875rem; font-weight: 800; color: var(--color-primary);">A IA está elaborando as perguntas do Quiz...</p>
                </div>

                <div style="display: flex; gap: var(--spacing-3); margin-top: var(--spacing-2); padding-top: var(--spacing-4); border-top: 1px solid var(--color-slate-100);">
                    <button type="button" onclick="controller.closeModal()" class="btn-secondary" style="flex: 1; justify-content: center; padding: 0.75rem;">Cancelar</button>
                    <button type="button" onclick="quizGestorView.gerarComIA()" class="btn-primary" style="flex: 1; justify-content: center; padding: 0.75rem;">
                        <i class="fas fa-magic"></i> <span>Gerar Quiz</span>
                    </button>
                </div>
            </div>
        `;
        controller.openModal('Gerar Quiz com Inteligência Artificial', html);
    },

    async gerarComIA() {
        const disciplina = document.getElementById('ai-disciplina').value;
        const serie = document.getElementById('ai-serie').value;
        const assunto = document.getElementById('ai-assunto').value;
        const qtd = parseInt(document.getElementById('ai-qtd').value);

        if (!disciplina || !assunto) return Toast.show("Preencha a disciplina e o assunto.", "warning");

        const loadingEl = document.getElementById('ai-loading');
        if (loadingEl) loadingEl.style.display = 'flex';

        try {
            const promptDados = {
                disciplina,
                serie,
                assunto,
                quantidade: qtd,
                formato: "Retorne ESTRITAMENTE um array de objetos JSON contendo: enunciado (aceita KaTeX), alternativas (array de 4 strings), correta (índice 0-3), tempo (30), pontos (1000)."
            };

            const resultado = await aiService.gerarMaterial('quiz_multipla_escolha', promptDados);

            const novoQuiz = {
                id: 'quiz_' + Date.now(),
                titulo: `${assunto} - ${serie}`,
                disciplina,
                perguntas: resultado.perguntas || resultado
            };

            if (!model.state.quizzes) model.state.quizzes = [];
            model.state.quizzes.push(novoQuiz);
            model.saveLocal();
            controller.closeModal();
            Toast.show("Quiz gerado com sucesso!", "success");
            this.render('view-container');
        } catch (error) {
            console.error(error);
            Toast.show("Erro ao gerar Quiz via IA.", "error");
        } finally {
            if (loadingEl) loadingEl.style.display = 'none';
        }
    },

    criarNovoQuiz() {
        const novoQuiz = {
            id: 'quiz_' + Date.now(),
            titulo: 'Novo Quiz Sem Título',
            disciplina: 'Geral',
            perguntas: []
        };
        if (!model.state.quizzes) model.state.quizzes = [];
        model.state.quizzes.push(novoQuiz);
        model.saveLocal();
        this.render('view-container');
        this.editarQuiz(novoQuiz.id);
    },

    editarQuiz(id) {
        this.currentQuiz = model.state.quizzes.find(q => q.id === id);
        if (!this.currentQuiz) return;
        if (!this.currentQuiz.perguntas) this.currentQuiz.perguntas = [];
        this.renderEditor();
    },

    renderEditor() {
        const container = document.getElementById('view-container');
        if (!container) return;

        let htmlPerguntas = this.currentQuiz.perguntas.map((p, i) => `
            <div class="card interactive-element" style="padding: var(--spacing-3); margin-bottom: 0.5rem; background-color: var(--color-slate-50); cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="quizGestorView.editarPergunta(${i})">
                <span style="font-weight: 700; color: var(--color-slate-700); font-size: 0.8125rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80%;">
                    ${i + 1}. ${window.escapeHTML(p.enunciado || 'Nova Pergunta')}
                </span>
                <button onclick="event.stopPropagation(); quizGestorView.excluirPergunta(${i})" class="btn-icon" style="color: var(--color-slate-400);" title="Excluir pergunta">
                    <i class="fas fa-trash-alt" style="font-size: 0.75rem;"></i>
                </button>
            </div>
        `).join('');

        const html = `
            <div class="animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8);">
                
                <!-- TOP TOOLBAR -->
                <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div style="display: flex; align-items: center; gap: var(--spacing-4); flex: 1;">
                        <button onclick="quizGestorView.render('view-container')" class="btn-secondary" style="padding: 0.5rem 0.875rem;">
                            <i class="fas fa-arrow-left"></i> <span>Voltar</span>
                        </button>
                        <input type="text" id="quiz-titulo-edit" value="${window.escapeHTML(this.currentQuiz.titulo)}" 
                               class="form-input" style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); max-width: 480px;"
                               onchange="quizGestorView.salvarTitulo(this.value)">
                    </div>

                    <button onclick="quizGestorView.adicionarPerguntaVazia()" class="btn-primary">
                        <i class="fas fa-plus"></i> <span>Adicionar Questão</span>
                    </button>
                </div>

                <!-- SIDE-BY-SIDE EDITOR (QUESTIONS LIST + EDIT PANE) -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--spacing-6); align-items: start;">
                    
                    <!-- LEFT COLUMN: QUESTIONS LIST (300px) -->
                    <div class="card" style="padding: var(--spacing-4); max-width: 360px; max-height: 70vh; overflow-y: auto;" class="custom-scrollbar">
                        <h3 style="font-size: 0.75rem; font-weight: 800; color: var(--color-slate-400); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--spacing-3);">
                            Questões Cadastradas (${this.currentQuiz.perguntas.length})
                        </h3>
                        ${htmlPerguntas || '<p style="font-size: 0.8125rem; color: var(--color-slate-400); text-align: center; padding: 2rem 0;">Nenhuma questão adicionada.</p>'}
                    </div>

                    <!-- RIGHT COLUMN: QUESTION EDIT FORM -->
                    <div class="card" style="padding: var(--spacing-6); flex: 1; min-width: 320px;" id="quiz-editor-area">
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; color: var(--color-slate-400); text-align: center;">
                            <i class="fas fa-hand-pointer" style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--color-slate-300);"></i>
                            <p style="font-weight: 600;">Selecione uma questão ao lado para editar ou adicione uma nova.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    salvarTitulo(novoTitulo) {
        this.currentQuiz.titulo = novoTitulo;
        model.saveLocal();
        Toast.show("Título salvo!", "success");
    },

    adicionarPerguntaVazia() {
        this.currentQuiz.perguntas.push({
            enunciado: "",
            alternativas: ["", "", "", ""],
            correta: 0,
            tempo: 30
        });
        model.saveLocal();
        this.renderEditor();
        this.editarPergunta(this.currentQuiz.perguntas.length - 1);
    },

    excluirPergunta(index) {
        if (confirm("Excluir esta questão do quiz?")) {
            this.currentQuiz.perguntas.splice(index, 1);
            model.saveLocal();
            this.renderEditor();
        }
    },

    editarPergunta(index) {
        const p = this.currentQuiz.perguntas[index];
        const editorArea = document.getElementById('quiz-editor-area');
        if (!editorArea) return;

        let alternativasHtml = p.alternativas.map((alt, i) => `
            <div style="display: flex; align-items: center; gap: var(--spacing-3);">
                <input type="radio" name="quiz-correta" value="${i}" ${p.correta === i ? 'checked' : ''} style="width: 1.25rem; height: 1.25rem; accent-color: #10b981; cursor: pointer;">
                <div style="width: 2rem; height: 2rem; border-radius: 50%; background-color: var(--color-slate-100); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; color: var(--color-slate-600); flex-shrink: 0;">
                    ${['A', 'B', 'C', 'D'][i]}
                </div>
                <input type="text" id="quiz-alt-${i}" value="${window.escapeHTML(alt)}" class="form-input" style="flex: 1;" placeholder="Alternativa ${['A', 'B', 'C', 'D'][i]}...">
            </div>
        `).join('');

        editorArea.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-4); padding-bottom: var(--spacing-3); border-bottom: 1px solid var(--color-slate-100);">
                <h3 style="font-size: 1rem; font-weight: 800; color: var(--color-slate-800);">Editando Questão ${index + 1}</h3>
                <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem;">
                    <i class="far fa-clock" style="color: var(--color-slate-400);"></i>
                    <select id="quiz-tempo" class="form-select" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                        <option value="15" ${p.tempo == 15 ? 'selected' : ''}>15 segundos</option>
                        <option value="30" ${p.tempo == 30 ? 'selected' : ''}>30 segundos</option>
                        <option value="60" ${p.tempo == 60 ? 'selected' : ''}>1 minuto</option>
                    </select>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: var(--spacing-5);">
                <div>
                    <label class="form-label">Enunciado da Questão (Suporta KaTeX com $$)</label>
                    <textarea id="quiz-enunciado" rows="3" class="form-input custom-scrollbar" style="resize: vertical; font-size: 1rem;">${window.escapeHTML(p.enunciado)}</textarea>
                </div>

                <div>
                    <label class="form-label">Alternativas (Marque o botão circular na alternativa correta)</label>
                    <div style="display: flex; flex-direction: column; gap: var(--spacing-3);">
                        ${alternativasHtml}
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; padding-top: var(--spacing-4); border-top: 1px solid var(--color-slate-100);">
                    <button onclick="quizGestorView.salvarEdicaoPergunta(${index})" class="btn-primary" style="background-color: #059669; padding: 0.625rem 1.5rem;">
                        <i class="fas fa-save"></i> <span>Salvar Questão</span>
                    </button>
                </div>
            </div>
        `;
    },

    salvarEdicaoPergunta(index) {
        const enunciado = document.getElementById('quiz-enunciado').value;
        const tempo = parseInt(document.getElementById('quiz-tempo').value);
        const radioCorreta = document.querySelector('input[name="quiz-correta"]:checked');

        if (!enunciado) return Toast.show("O enunciado não pode ser vazio.", "error");

        const alternativas = [];
        for (let i = 0; i < 4; i++) {
            alternativas.push(document.getElementById(`quiz-alt-${i}`).value);
        }

        this.currentQuiz.perguntas[index] = {
            enunciado,
            alternativas,
            correta: radioCorreta ? parseInt(radioCorreta.value) : 0,
            tempo
        };

        model.saveLocal();
        Toast.show("Questão salva!", "success");
        this.renderEditor();
    }
};

if (typeof window !== 'undefined') {
    window.quizGestorView = quizGestorView;
}
