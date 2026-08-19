import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';
import { aiService } from '../ai-service.js';
import { renderKatex, formatarTextoComLatex, sanitizeComLatex, alternarModoEdicaoPreview, lerArquivoTexto } from '../utils.js';
import { uiController } from '../controllers/uiController.js';

export const quizGestorView = {
    currentQuiz: null,
    contextoDocumentoTemp: '',

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
                            <i class="fas fa-gamepad" style="color: var(--color-primary);"></i> Quiz & Atividades Interativas
                        </h2>
                        <p style="font-size: 0.875rem; color: var(--color-slate-500);">Engaje seus estudantes com quizzes em vários formatos: Alternativas, Lacunas, V/F e Identificação de Conceitos.</p>
                    </div>

                    <div style="display: flex; align-items: center; gap: var(--spacing-3); flex-wrap: wrap;">
                        <button type="button" onclick="window.open('aluno.html', '_blank')" class="btn-secondary interactive-element" style="background-color: #f0fdf4; border-color: #bbf7d0; color: #15803d; font-weight: 800;" title="Abrir portal do estudante">
                            <i class="fas fa-external-link-alt"></i> <span>Portal do Aluno (aluno.html)</span>
                        </button>
                        <button type="button" onclick="quizGestorView.abrirGeradorIA()" class="btn-secondary interactive-element" style="background-color: #f8fafc; border-color: #cbd5e1;">
                            <i class="fas fa-robot" style="color: var(--color-primary);"></i> <span>Gerar com IA / Arquivo</span>
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
        uiController.initAllDropdowns(container);
    },

    cardQuiz(quiz) {
        const totalPerguntas = quiz.perguntas?.length || 0;
        const tiposContagem = {};
        (quiz.perguntas || []).forEach(p => {
            const t = p.tipo || 'multipla';
            tiposContagem[t] = (tiposContagem[t] || 0) + 1;
        });

        const badgesTipos = Object.entries(tiposContagem).map(([tipo, qtd]) => {
            const labels = {
                'multipla': 'Alternativas',
                'lacuna': 'Lacunas',
                'identificacao': 'Identificação',
                'verdadeiro_falso': 'V / F'
            };
            return `<span style="font-size: 0.625rem; font-weight: 700; background-color: var(--color-slate-100); color: var(--color-slate-600); padding: 0.125rem 0.375rem; border-radius: var(--radius-sm);">${qtd} ${labels[tipo] || tipo}</span>`;
        }).join(' ');

        return `
            <div class="card interactive-element" style="padding: var(--spacing-6); display: flex; flex-direction: column; justify-content: space-between; gap: var(--spacing-4); transition: all var(--transition-fast);">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-3);">
                        <span class="badge" style="background-color: var(--color-primary-light); color: var(--color-primary); font-weight: 800; text-transform: uppercase;">
                            ${window.escapeHTML(quiz.disciplina || 'Geral')}
                        </span>
                        <div style="display: flex; gap: 0.25rem;">
                            <button type="button" onclick="quizGestorView.imprimirQuiz('${quiz.id}')" class="btn-icon" title="Imprimir Lista / Prova em PDF">
                                <i class="fas fa-print" style="font-size: 0.875rem; color: var(--color-slate-500);"></i>
                            </button>
                            <button type="button" onclick="quizGestorView.editarQuiz('${quiz.id}')" class="btn-icon" title="Editar Quiz">
                                <i class="fas fa-pencil-alt" style="font-size: 0.875rem;"></i>
                            </button>
                            <button type="button" onclick="quizGestorView.excluirQuiz('${quiz.id}')" class="btn-icon" style="color: #ef4444;" title="Excluir Quiz">
                                <i class="fas fa-trash-alt" style="font-size: 0.875rem;"></i>
                            </button>
                        </div>
                    </div>

                    <h3 style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${window.escapeHTML(quiz.titulo)}
                    </h3>
                    <p style="font-size: 0.8125rem; color: var(--color-slate-500); font-weight: 600; margin-bottom: 0.5rem;">
                        ${totalPerguntas} questões cadastradas
                    </p>
                    <div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
                        ${badgesTipos}
                    </div>
                </div>

                <div style="display: flex; gap: 0.5rem; flex-direction: column;">
                    <button type="button" onclick="controller.navigate('quiz-player'); setTimeout(() => window.quizPlayerView?.start('${quiz.id}'), 100);" class="btn-primary" style="width: 100%; justify-content: center; padding: 0.75rem; background: linear-gradient(135deg, #4f46e5, #7c3aed);">
                        <i class="fas fa-gamepad mr-1"></i> <span>Apresentar ao Vivo (com PIN)</span>
                    </button>
                </div>
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
                <p style="color: var(--color-slate-500); font-size: 0.875rem; max-width: 450px; margin-bottom: 1.5rem;">Crie quizzes em vários formatos pedagógicos (Alternativas, Lacunas, V/F, Identificação) ou gere automaticamente via IA a partir de arquivos ou notas do NotebookLM.</p>
                <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center;">
                    <button type="button" onclick="quizGestorView.abrirGeradorIA()" class="btn-secondary">
                        <i class="fas fa-robot"></i> <span>Gerar com IA / Upload</span>
                    </button>
                    <button type="button" onclick="quizGestorView.criarNovoQuiz()" class="btn-primary">
                        <i class="fas fa-plus"></i> <span>Criar Manualmente</span>
                    </button>
                </div>
            </div>
        `;
    },

    abrirGeradorIA() {
        this.contextoDocumentoTemp = '';
        const html = `
            <div style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4); max-height: 75vh; overflow-y: auto;" class="custom-scrollbar">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4);">
                    <div>
                        <label class="form-label">Disciplina</label>
                        <select id="ai-disciplina" class="form-select" onchange="if(this.value==='__OUTRA__'){ document.getElementById('ai-disciplina-custom-wrap').style.display='block'; document.getElementById('ai-disciplina-custom').focus(); } else { document.getElementById('ai-disciplina-custom-wrap').style.display='none'; }">
                            <option value="Matemática">Matemática</option>
                            <option value="Língua Portuguesa">Língua Portuguesa</option>
                            <option value="Ciências" selected>Ciências</option>
                            <option value="História">História</option>
                            <option value="Geografia">Geografia</option>
                            <option value="Física">Física</option>
                            <option value="Química">Química</option>
                            <option value="Biologia">Biologia</option>
                            <option value="Língua Inglesa">Língua Inglesa</option>
                            <option value="Arte">Arte</option>
                            <option value="Educação Física">Educação Física</option>
                            <option value="Filosofia">Filosofia</option>
                            <option value="Sociologia">Sociologia</option>
                            <option value="Ensino Religioso">Ensino Religioso</option>
                            <option value="Literatura">Literatura</option>
                            <option value="Redação">Redação</option>
                            <option value="Projeto de Vida">Projeto de Vida</option>
                            <option value="Robótica / Tecnologia">Robótica / Tecnologia</option>
                            <option value="Culinária / Gastronomia">Culinária / Gastronomia</option>
                            <option value="__OUTRA__">+ Outra disciplina (digitar)...</option>
                        </select>
                        <div id="ai-disciplina-custom-wrap" style="display: none; margin-top: 0.5rem;">
                            <input type="text" id="ai-disciplina-custom" class="form-input" placeholder="Digite o nome da disciplina...">
                        </div>
                    </div>
                    <div>
                        <label class="form-label">Série / Segmento</label>
                        <select id="ai-serie" class="form-select" onchange="if(this.value==='__OUTRA__'){ document.getElementById('ai-serie-custom-wrap').style.display='block'; document.getElementById('ai-serie-custom').focus(); } else { document.getElementById('ai-serie-custom-wrap').style.display='none'; }">
                            <option value="Educação Infantil">Educação Infantil</option>
                            <option value="1º Ano — Fundamental I">1º Ano — Fundamental I</option>
                            <option value="2º Ano — Fundamental I">2º Ano — Fundamental I</option>
                            <option value="3º Ano — Fundamental I">3º Ano — Fundamental I</option>
                            <option value="4º Ano — Fundamental I">4º Ano — Fundamental I</option>
                            <option value="5º Ano — Fundamental I">5º Ano — Fundamental I</option>
                            <option value="6º Ano — Fundamental II" selected>6º Ano — Fundamental II</option>
                            <option value="7º Ano — Fundamental II">7º Ano — Fundamental II</option>
                            <option value="8º Ano — Fundamental II">8º Ano — Fundamental II</option>
                            <option value="9º Ano — Fundamental II">9º Ano — Fundamental II</option>
                            <option value="1ª Série — Ensino Médio">1ª Série — Ensino Médio</option>
                            <option value="2ª Série — Ensino Médio">2ª Série — Ensino Médio</option>
                            <option value="3ª Série — Ensino Médio">3ª Série — Ensino Médio</option>
                            <option value="Ensino Superior / Faculdade">Ensino Superior / Faculdade</option>
                            <option value="EJA (Jovens e Adultos)">EJA (Jovens e Adultos)</option>
                            <option value="Pré-Vestibular / Concurso">Pré-Vestibular / Concurso</option>
                            <option value="__OUTRA__">+ Outro segmento (digitar)...</option>
                        </select>
                        <div id="ai-serie-custom-wrap" style="display: none; margin-top: 0.5rem;">
                            <input type="text" id="ai-serie-custom" class="form-input" placeholder="Digite o segmento / ano...">
                        </div>
                    </div>
                </div>

                <div>
                    <label class="form-label">Assunto / Tema do Quiz</label>
                    <input type="text" id="ai-assunto" class="form-input" placeholder="Ex: Fotossíntese, Revolução Industrial, Equações...">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4);">
                    <div>
                        <label class="form-label">Quantidade de Questões</label>
                        <select id="ai-qtd" class="form-select">
                            <option value="3">3 Questões</option>
                            <option value="5" selected>5 Questões</option>
                            <option value="8">8 Questões</option>
                            <option value="10">10 Questões</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Formato Pedagógico</label>
                        <select id="ai-formato" class="form-select">
                            <option value="misto" selected>🎲 Formato Misto (Vários tipos)</option>
                            <option value="multipla">🔘 Alternativas (Múltipla Escolha)</option>
                            <option value="lacuna">✍️ Complete a Frase / Lacunas</option>
                            <option value="identificacao">🔍 Qual o Nome do Conceito/Evento</option>
                            <option value="verdadeiro_falso">⚖️ Verdadeiro ou Falso (V/F)</option>
                        </select>
                    </div>
                </div>

                <!-- UPLOAD DE ARQUIVO E CONTEXTO NOTEBOOKLM -->
                <div style="background-color: var(--color-slate-50); border: 1px solid var(--color-slate-200); border-radius: var(--radius-xl); padding: var(--spacing-4); display: flex; flex-direction: column; gap: var(--spacing-3);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.8125rem; font-weight: 800; color: var(--color-slate-700); display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-file-upload" style="color: var(--color-primary);"></i> Contexto Específico (Arquivo / NotebookLM)
                        </span>
                        <span id="quiz-badge-contexto" style="font-size: 0.6875rem; font-weight: 700; color: var(--color-slate-400);">Opcional</span>
                    </div>

                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <label class="btn-outline interactive-element" style="cursor: pointer; padding: 0.5rem 0.875rem; font-size: 0.75rem; display: flex; align-items: center; gap: 0.375rem; background-color: #fff;">
                            <i class="fas fa-paperclip"></i> <span>Anexar Arquivo (PDF / TXT / MD)</span>
                            <input type="file" id="ai-file-input" accept=".txt,.md,.pdf,.csv,.json" style="display: none;" onchange="quizGestorView.carregarArquivo(this)">
                        </label>
                        <span id="ai-nome-arquivo" style="font-size: 0.75rem; color: var(--color-slate-500); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;"></span>
                    </div>

                    <div>
                        <label class="form-label" style="font-size: 0.75rem; color: var(--color-slate-500);">Ou cole o Link / Resumo do NotebookLM:</label>
                        <textarea id="ai-contexto-texto" rows="2" class="form-input custom-scrollbar" placeholder="Cole aqui o link do seu caderno ou anotações exportadas do Google NotebookLM..." style="font-size: 0.8125rem; resize: vertical;"></textarea>
                    </div>
                </div>

                <div id="ai-loading" style="display: none; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem; text-align: center;">
                    <i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--color-primary); margin-bottom: 0.75rem;"></i>
                    <p style="font-size: 0.875rem; font-weight: 800; color: var(--color-primary);">A IA está elaborando o Quiz com base no contexto...</p>
                </div>

                <div style="display: flex; gap: var(--spacing-3); margin-top: var(--spacing-2); padding-top: var(--spacing-4); border-top: 1px solid var(--color-slate-100);">
                    <button type="button" onclick="controller.closeModal()" class="btn-secondary" style="flex: 1; justify-content: center; padding: 0.75rem;">Cancelar</button>
                    <button type="button" onclick="quizGestorView.gerarComIA()" class="btn-primary" style="flex: 1; justify-content: center; padding: 0.75rem;">
                        <i class="fas fa-magic"></i> <span>Gerar Quiz</span>
                    </button>
                </div>
            </div>
        `;
        controller.openModal('Gerar Quiz Pedagógico com IA', html, 'large');
    },

    async carregarArquivo(input) {
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        const nomeEl = document.getElementById('ai-nome-arquivo');
        const badgeEl = document.getElementById('quiz-badge-contexto');

        try {
            if (nomeEl) nomeEl.innerText = `Carregando ${file.name}...`;
            const texto = await lerArquivoTexto(file);
            this.contextoDocumentoTemp = texto;

            if (nomeEl) nomeEl.innerText = `📄 ${file.name} (${texto.length} caracteres)`;
            if (badgeEl) {
                badgeEl.innerText = `✅ Arquivo carregado`;
                badgeEl.style.color = '#059669';
            }
            Toast.show(`Arquivo "${file.name}" carregado com sucesso!`, 'success');
        } catch (e) {
            console.error(e);
            if (nomeEl) nomeEl.innerText = 'Erro ao ler arquivo';
            Toast.show('Não foi possível ler o arquivo anexado.', 'error');
        }
    },

    async gerarComIA() {
        let disciplina = document.getElementById('ai-disciplina')?.value;
        if (disciplina === '__OUTRA__') {
            disciplina = document.getElementById('ai-disciplina-custom')?.value.trim();
        }
        let serie = document.getElementById('ai-serie')?.value;
        if (serie === '__OUTRA__') {
            serie = document.getElementById('ai-serie-custom')?.value.trim();
        }
        const assunto = document.getElementById('ai-assunto')?.value.trim();
        const qtd = parseInt(document.getElementById('ai-qtd')?.value || '5');
        const formato = document.getElementById('ai-formato')?.value || 'misto';
        const textoContextoManual = document.getElementById('ai-contexto-texto')?.value.trim() || '';

        if (!disciplina || !assunto) return Toast.show("Preencha a disciplina e o assunto.", "warning");

        const contextoFinal = (this.contextoDocumentoTemp ? `${this.contextoDocumentoTemp}\n\n` : '') + textoContextoManual;

        const loadingEl = document.getElementById('ai-loading');
        if (loadingEl) loadingEl.style.display = 'flex';

        try {
            const resultado = await aiService.gerarQuizMultiFormato({
                disciplina,
                serie: serie || 'Geral',
                assunto,
                quantidade: qtd,
                formato,
                contextoDocumento: contextoFinal
            });

            const novoQuiz = {
                id: 'quiz_' + Date.now().toString(36),
                titulo: resultado.titulo || `${assunto} - ${serie || 'Geral'}`,
                disciplina: resultado.disciplina || disciplina,
                serie: resultado.serie || serie || 'Geral',
                perguntas: (resultado.perguntas && Array.isArray(resultado.perguntas)) ? resultado.perguntas : []
            };

            await model.saveQuiz(novoQuiz);
            controller.closeModal();
            Toast.show("Quiz gerado com sucesso!", "success");
            this.render('view-container');
        } catch (error) {
            console.error(error);
            Toast.show(error.message || "Erro ao gerar Quiz via IA.", "error");
        } finally {
            if (loadingEl) loadingEl.style.display = 'none';
        }
    },

    async criarNovoQuiz() {
        const novoQuiz = {
            id: 'quiz_' + Date.now().toString(36),
            titulo: 'Novo Quiz Sem Título',
            disciplina: 'Geral',
            serie: '',
            perguntas: []
        };
        await model.saveQuiz(novoQuiz);
        this.render('view-container');
        this.editarQuiz(novoQuiz.id);
    },

    async excluirQuiz(quizId) {
        const acao = async () => {
            await model.deleteQuiz(quizId);
            Toast.show("Quiz removido.", "info");
            this.render('view-container');
        };
        if (window.controller && typeof window.controller.confirmarAcao === 'function') {
            window.controller.confirmarAcao(
                "Excluir Quiz",
                "Deseja realmente excluir este Quiz?",
                acao
            );
        } else if (confirm("Deseja realmente excluir este Quiz?")) {
            acao();
        }
    },

    editarQuiz(id) {
        this.currentQuiz = (model.state.quizzes || []).find(q => String(q.id) === String(id));
        if (!this.currentQuiz) return;
        if (!this.currentQuiz.perguntas) this.currentQuiz.perguntas = [];
        this.renderEditor();
    },

    renderEditor() {
        const container = document.getElementById('view-container');
        if (!container) return;

        const tiposLabels = {
            'multipla': 'Alternativas',
            'lacuna': 'Lacuna',
            'identificacao': 'Identificação',
            'verdadeiro_falso': 'V / F'
        };

        let htmlPerguntas = this.currentQuiz.perguntas.map((p, i) => `
            <div class="card interactive-element" style="padding: var(--spacing-3); margin-bottom: 0.5rem; background-color: var(--color-slate-50); cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="quizGestorView.editarPergunta(${i})">
                <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 75%;">
                    <span style="font-size: 0.625rem; font-weight: 800; text-transform: uppercase; background-color: var(--color-primary-light); color: var(--color-primary); padding: 0.1rem 0.375rem; border-radius: var(--radius-sm); margin-right: 0.375rem;">
                        ${tiposLabels[p.tipo] || 'Alt'}
                    </span>
                    <span style="font-weight: 700; color: var(--color-slate-700); font-size: 0.8125rem;">
                        ${i + 1}. ${window.escapeHTML(p.enunciado || 'Nova Pergunta')}
                    </span>
                </div>
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

                    <div style="display: flex; gap: 0.5rem;">
                        <button onclick="quizGestorView.adicionarPerguntaVazia('multipla')" class="btn-secondary" style="padding: 0.5rem 0.875rem; font-size: 0.8125rem;" title="Adicionar questão de alternativas">
                            <i class="fas fa-list-ol"></i> <span>+ Alternativas</span>
                        </button>
                        <button onclick="quizGestorView.adicionarPerguntaVazia('lacuna')" class="btn-secondary" style="padding: 0.5rem 0.875rem; font-size: 0.8125rem;" title="Adicionar questão complete a frase">
                            <i class="fas fa-pen-nib"></i> <span>+ Lacunas</span>
                        </button>
                        <button onclick="quizGestorView.adicionarPerguntaVazia('identificacao')" class="btn-secondary" style="padding: 0.5rem 0.875rem; font-size: 0.8125rem;" title="Adicionar questão 'Qual o nome do conceito?'">
                            <i class="fas fa-search"></i> <span>+ Conceito</span>
                        </button>
                        <button onclick="quizGestorView.adicionarPerguntaVazia('verdadeiro_falso')" class="btn-secondary" style="padding: 0.5rem 0.875rem; font-size: 0.8125rem;" title="Adicionar questão Verdadeiro ou Falso">
                            <i class="fas fa-check-double"></i> <span>+ V / F</span>
                        </button>
                    </div>
                </div>

                <!-- SIDE-BY-SIDE EDITOR (QUESTIONS LIST + EDIT PANE) -->
                <div style="display: grid; grid-template-columns: minmax(280px, 320px) 1fr; gap: var(--spacing-6); align-items: start;">
                    
                    <!-- LEFT COLUMN: QUESTIONS LIST (320px) -->
                    <div class="card" style="padding: var(--spacing-4); max-height: 75vh; overflow-y: auto;" class="custom-scrollbar">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-3);">
                            <h3 style="font-size: 0.75rem; font-weight: 800; color: var(--color-slate-400); text-transform: uppercase; letter-spacing: 0.05em;">
                                Questões (${this.currentQuiz.perguntas.length})
                            </h3>
                        </div>
                        ${htmlPerguntas || '<p style="font-size: 0.8125rem; color: var(--color-slate-400); text-align: center; padding: 2rem 0;">Nenhuma questão adicionada.</p>'}
                    </div>

                    <!-- RIGHT COLUMN: QUESTION EDIT FORM -->
                    <div class="card" style="padding: var(--spacing-6);" id="quiz-editor-area">
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; color: var(--color-slate-400); text-align: center;">
                            <i class="fas fa-hand-pointer" style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--color-slate-300);"></i>
                            <p style="font-weight: 600;">Selecione uma questão ao lado para editar ou escolha um formato acima para adicionar.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        uiController.initAllDropdowns(container);
    },

    async salvarTitulo(novoTitulo) {
        this.currentQuiz.titulo = novoTitulo;
        await model.saveQuiz(this.currentQuiz);
        Toast.show("Título salvo!", "success");
    },

    async adicionarPerguntaVazia(tipo = 'multipla') {
        const novaPergunta = {
            tipo,
            enunciado: "",
            alternativas: tipo === 'verdadeiro_falso' ? [] : ["", "", "", ""],
            correta: 0,
            resposta_correta: "",
            is_verdadeiro: true,
            justificativa: "",
            tempo: 30
        };

        if (tipo === 'lacuna') {
            novaPergunta.enunciado = "O processo em que plantas convertem luz solar em energia chama-se ___.";
            novaPergunta.resposta_correta = "Fotossíntese";
            novaPergunta.alternativas = ["Fotossíntese", "Respiração Celular", "Fermentação", "Quimiossíntese"];
        } else if (tipo === 'identificacao') {
            novaPergunta.enunciado = "Qual é o nome do evento histórico ocorrido em 1789 que marcou o fim do Antigo Regime na França?";
            novaPergunta.resposta_correta = "Revolução Francesa";
            novaPergunta.alternativas = ["Revolução Francesa", "Revolução Industrial", "Guerra dos Cem Anos", "Iluminismo"];
        } else if (tipo === 'verdadeiro_falso') {
            novaPergunta.enunciado = "A Terra realiza o movimento de rotação em torno do Sol.";
            novaPergunta.is_verdadeiro = false;
            novaPergunta.justificativa = "A rotação é em torno do seu próprio eixo. O movimento em torno do Sol é a translação.";
        }

        this.currentQuiz.perguntas.push(novaPergunta);
        await model.saveQuiz(this.currentQuiz);
        this.renderEditor();
        this.editarPergunta(this.currentQuiz.perguntas.length - 1);
    },

    async excluirPergunta(index) {
        const acao = async () => {
            this.currentQuiz.perguntas.splice(index, 1);
            await model.saveQuiz(this.currentQuiz);
            this.renderEditor();
        };
        if (window.controller && typeof window.controller.confirmarAcao === 'function') {
            window.controller.confirmarAcao(
                "Excluir Pergunta",
                "Excluir esta questão do quiz?",
                acao
            );
        } else if (confirm("Excluir esta questão do quiz?")) {
            acao();
        }
    },

    editarPergunta(index) {
        const p = this.currentQuiz.perguntas[index];
        const editorArea = document.getElementById('quiz-editor-area');
        if (!editorArea) return;

        const tipoAtual = p.tipo || 'multipla';

        let corpoFormatoHtml = '';

        if (tipoAtual === 'verdadeiro_falso') {
            const isV = p.is_verdadeiro !== false;
            corpoFormatoHtml = `
                <div>
                    <label class="form-label">Classificação da Afirmativa</label>
                    <div style="display: flex; gap: 1rem; margin-bottom: var(--spacing-4);">
                        <label style="flex: 1; padding: 1rem; border: 2px solid ${isV ? '#10b981' : 'var(--color-slate-200)'}; background-color: ${isV ? '#ecfdf5' : '#fff'}; border-radius: var(--radius-xl); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 800; font-size: 1rem; color: #059669;">
                            <input type="radio" name="quiz-vf" value="true" ${isV ? 'checked' : ''} onchange="quizGestorView.mudarVF(true)" style="accent-color: #10b981;">
                            <i class="fas fa-check-circle"></i> VERDADEIRO
                        </label>
                        <label style="flex: 1; padding: 1rem; border: 2px solid ${!isV ? '#ef4444' : 'var(--color-slate-200)'}; background-color: ${!isV ? '#fef2f2' : '#fff'}; border-radius: var(--radius-xl); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 800; font-size: 1rem; color: #dc2626;">
                            <input type="radio" name="quiz-vf" value="false" ${!isV ? 'checked' : ''} onchange="quizGestorView.mudarVF(false)" style="accent-color: #ef4444;">
                            <i class="fas fa-times-circle"></i> FALSO
                        </label>
                    </div>
                </div>

                <div>
                    <label class="form-label">Justificativa Pedagógica / Explicação do Gabarito</label>
                    <textarea id="quiz-justificativa" rows="2" class="form-input custom-scrollbar" placeholder="Explique por que a afirmação é verdadeira ou falsa...">${window.escapeHTML(p.justificativa || '')}</textarea>
                </div>
            `;
        } else {
            const alts = p.alternativas && p.alternativas.length > 0 ? p.alternativas : ["", "", "", ""];
            let alternativasHtml = alts.map((alt, i) => `
                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                    <div style="display: flex; align-items: center; gap: var(--spacing-3);">
                        <input type="radio" name="quiz-correta" value="${i}" ${p.correta === i ? 'checked' : ''} style="width: 1.25rem; height: 1.25rem; accent-color: #10b981; cursor: pointer;" title="Marcar como alternativa correta">
                        <div style="width: 2rem; height: 2rem; border-radius: 50%; background-color: var(--color-slate-100); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; color: var(--color-slate-600); flex-shrink: 0;">
                            ${['A', 'B', 'C', 'D', 'E'][i] || i + 1}
                        </div>
                        <input type="text" id="quiz-alt-${i}" value="${window.escapeHTML(alt)}" class="form-input" style="flex: 1;" placeholder="Opção ${['A', 'B', 'C', 'D', 'E'][i] || i + 1} (suporta LaTeX $...$)">
                    </div>
                    <div id="preview-quiz-alt-${i}" style="display: none; margin-left: 3.25rem;"></div>
                </div>
            `).join('');

            corpoFormatoHtml = `
                <div>
                    <label class="form-label">${tipoAtual === 'lacuna' ? 'Opções de Preenchimento (Marque a que preenche a lacuna)' : tipoAtual === 'identificacao' ? 'Nomes Possíveis (Marque o Conceito/Evento correto)' : 'Alternativas (Marque o botão circular na alternativa correta)'}</label>
                    <div style="display: flex; flex-direction: column; gap: var(--spacing-3);">
                        ${alternativasHtml}
                    </div>
                </div>

                <div>
                    <label class="form-label">Justificativa / Comentário (Opcional)</label>
                    <input type="text" id="quiz-justificativa" value="${window.escapeHTML(p.justificativa || '')}" class="form-input" placeholder="Comentário sobre a resposta certa...">
                </div>
            `;
        }

        editorArea.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-4); padding-bottom: var(--spacing-3); border-bottom: 1px solid var(--color-slate-100); flex-wrap: wrap; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <h3 style="font-size: 1rem; font-weight: 800; color: var(--color-slate-800);">Questão ${index + 1}</h3>
                    <select id="quiz-tipo-select" class="form-select" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; font-weight: 700;" onchange="quizGestorView.alterarTipoPergunta(${index}, this.value)">
                        <option value="multipla" ${tipoAtual === 'multipla' ? 'selected' : ''}>🔘 Alternativas (Múltipla Escolha)</option>
                        <option value="lacuna" ${tipoAtual === 'lacuna' ? 'selected' : ''}>✍️ Complete a Frase / Lacunas</option>
                        <option value="identificacao" ${tipoAtual === 'identificacao' ? 'selected' : ''}>🔍 Qual o Nome do Conceito/Evento</option>
                        <option value="verdadeiro_falso" ${tipoAtual === 'verdadeiro_falso' ? 'selected' : ''}>⚖️ Verdadeiro ou Falso (V/F)</option>
                    </select>
                </div>

                <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem;">
                    <i class="far fa-clock" style="color: var(--color-slate-400);"></i>
                    <select id="quiz-tempo" class="form-select" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                        <option value="15" ${p.tempo == 15 ? 'selected' : ''}>15 segundos</option>
                        <option value="30" ${p.tempo == 30 ? 'selected' : ''}>30 segundos</option>
                        <option value="45" ${p.tempo == 45 ? 'selected' : ''}>45 segundos</option>
                        <option value="60" ${p.tempo == 60 ? 'selected' : ''}>1 minuto</option>
                    </select>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: var(--spacing-5);">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                        <label class="form-label" style="margin-bottom: 0;">${tipoAtual === 'lacuna' ? 'Frase com Lacuna (Use ___)' : tipoAtual === 'identificacao' ? 'Pistas e Contexto' : 'Enunciado da Questão'}</label>
                        <button type="button" onclick="alternarModoEdicaoPreview('quiz-enunciado', 'preview-quiz-enunciado', 'btn-prev-quiz-enunciado')" id="btn-prev-quiz-enunciado" class="btn-secondary" style="padding: 0.25rem 0.625rem; font-size: 0.6875rem;">
                            <i class="fas fa-eye"></i> Visualizar Formatação (TeX)
                        </button>
                    </div>
                    <textarea id="quiz-enunciado" rows="3" class="form-input custom-scrollbar" style="resize: vertical; font-size: 1rem;">${window.escapeHTML(p.enunciado || '')}</textarea>
                    <div id="preview-quiz-enunciado" style="display: none;"></div>
                </div>

                ${corpoFormatoHtml}

                <div style="display: flex; justify-content: flex-end; padding-top: var(--spacing-4); border-top: 1px solid var(--color-slate-100);">
                    <button onclick="quizGestorView.salvarEdicaoPergunta(${index})" class="btn-primary" style="background-color: #059669; padding: 0.625rem 1.5rem;">
                        <i class="fas fa-save"></i> <span>Salvar Questão</span>
                    </button>
                </div>
            </div>
        `;

        renderKatex(editorArea);

        setTimeout(() => {
            if (window.anexarPreviewLatex) {
                window.anexarPreviewLatex('quiz-enunciado', 'preview-quiz-enunciado');
                if (tipoAtual !== 'verdadeiro_falso') {
                    const alts = p.alternativas && p.alternativas.length > 0 ? p.alternativas : ["", "", "", ""];
                    alts.forEach((_, i) => {
                        window.anexarPreviewLatex(`quiz-alt-${i}`, `preview-quiz-alt-${i}`);
                    });
                }
            }
        }, 30);
    },

    alterarTipoPergunta(index, novoTipo) {
        const p = this.currentQuiz.perguntas[index];
        p.tipo = novoTipo;
        if (novoTipo === 'verdadeiro_falso') {
            p.is_verdadeiro = true;
        } else if (!p.alternativas || p.alternativas.length === 0) {
            p.alternativas = ["", "", "", ""];
        }
        this.editarPergunta(index);
    },

    mudarVF(valor) {
        const radios = document.querySelectorAll('input[name="quiz-vf"]');
        radios.forEach(r => {
            const parent = r.closest('label');
            if (parent) {
                if (r.value === String(valor)) {
                    parent.style.borderColor = valor ? '#10b981' : '#ef4444';
                    parent.style.backgroundColor = valor ? '#ecfdf5' : '#fef2f2';
                } else {
                    parent.style.borderColor = 'var(--color-slate-200)';
                    parent.style.backgroundColor = '#fff';
                }
            }
        });
    },

    async salvarEdicaoPergunta(index) {
        const p = this.currentQuiz.perguntas[index];
        const enunciado = document.getElementById('quiz-enunciado')?.value.trim();
        const tempo = parseInt(document.getElementById('quiz-tempo')?.value || '30');
        const tipoSelect = document.getElementById('quiz-tipo-select')?.value || p.tipo || 'multipla';
        const justificativa = document.getElementById('quiz-justificativa')?.value.trim() || '';

        if (!enunciado) return Toast.show("O enunciado não pode ser vazio.", "error");

        p.enunciado = enunciado;
        p.tempo = tempo;
        p.tipo = tipoSelect;
        p.justificativa = justificativa;

        if (tipoSelect === 'verdadeiro_falso') {
            const vfChecked = document.querySelector('input[name="quiz-vf"]:checked');
            p.is_verdadeiro = vfChecked ? vfChecked.value === 'true' : true;
            p.alternativas = [];
            p.correta = p.is_verdadeiro ? 0 : 1;
        } else {
            const alternativas = [];
            for (let i = 0; i < 4; i++) {
                const altEl = document.getElementById(`quiz-alt-${i}`);
                if (altEl) alternativas.push(altEl.value);
            }
            const radioCorreta = document.querySelector('input[name="quiz-correta"]:checked');
            p.alternativas = alternativas;
            p.correta = radioCorreta ? parseInt(radioCorreta.value) : 0;
            p.resposta_correta = alternativas[p.correta] || '';
        }

        await model.saveQuiz(this.currentQuiz);
        Toast.show("Questão salva!", "success");
        this.renderEditor();
    },

    imprimirQuiz(quizId) {
        const quiz = (model.state.quizzes || []).find(q => String(q.id) === String(quizId));
        if (!quiz || !quiz.perguntas || quiz.perguntas.length === 0) {
            return Toast.show("Este quiz não possui perguntas para imprimir.", "warning");
        }

        const janela = window.open('', '_blank');
        if (!janela) return Toast.show("Permita pop-ups para imprimir o quiz.", "warning");

        const perguntasHtml = quiz.perguntas.map((p, i) => {
            const tipo = p.tipo || 'multipla';
            let opcoesHtml = '';

            if (tipo === 'verdadeiro_falso') {
                opcoesHtml = `
                    <div style="margin-top: 8px; display: flex; gap: 24px; font-weight: bold;">
                        <span>( &nbsp; ) VERDADEIRO</span>
                        <span>( &nbsp; ) FALSO</span>
                    </div>
                `;
            } else {
                const alts = p.alternativas || [];
                const letras = ['A', 'B', 'C', 'D', 'E'];
                opcoesHtml = `
                    <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
                        ${alts.map((alt, idx) => `
                            <div>( &nbsp; ) <strong>${letras[idx]})</strong> ${window.escapeHTML(alt)}</div>
                        `).join('')}
                    </div>
                `;
            }

            return `
                <div style="margin-bottom: 24px; page-break-inside: avoid;">
                    <div style="font-weight: bold; font-size: 15px; margin-bottom: 6px;">
                        Questão ${i + 1}:
                    </div>
                    <div style="font-size: 14px; line-height: 1.5; color: #1e293b;">
                        ${window.escapeHTML(p.enunciado)}
                    </div>
                    ${opcoesHtml}
                </div>
            `;
        }).join('');

        const gabaritoHtml = quiz.perguntas.map((p, i) => {
            const tipo = p.tipo || 'multipla';
            let resp = '';
            if (tipo === 'verdadeiro_falso') {
                resp = p.is_verdadeiro !== false ? 'VERDADEIRO' : 'FALSO';
            } else {
                const letras = ['A', 'B', 'C', 'D', 'E'];
                resp = `${letras[p.correta || 0]}) ${p.alternativas ? p.alternativas[p.correta || 0] : ''}`;
            }
            return `<tr><td style="padding: 6px 12px; border: 1px solid #cbd5e1; font-weight: bold; text-align: center;">${i + 1}</td><td style="padding: 6px 12px; border: 1px solid #cbd5e1;">${window.escapeHTML(resp)}</td></tr>`;
        }).join('');

        const docHtml = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>${window.escapeHTML(quiz.titulo)} - Planner Pro</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 30px; color: #0f172a; }
                    .header-box { border: 2px solid #0f172a; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
                    .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; }
                    h1 { font-size: 20px; text-align: center; margin: 0 0 12px 0; text-transform: uppercase; }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                        .page-break { page-break-before: always; }
                    }
                </style>
            </head>
            <body>
                <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end;">
                    <button onclick="window.print()" style="padding: 10px 24px; background-color: #4f46e5; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;">
                        🖨️ Imprimir / Salvar como PDF
                    </button>
                </div>

                <div class="header-box">
                    <h1>${window.escapeHTML(quiz.titulo)}</h1>
                    <div class="header-grid">
                        <div><strong>Disciplina:</strong> ${window.escapeHTML(quiz.disciplina || 'Geral')}</div>
                        <div><strong>Data:</strong> ____/____/________</div>
                        <div><strong>Estudante:</strong> _________________________________________________</div>
                        <div><strong>Turma:</strong> ____________ &nbsp;&nbsp; <strong>Nota:</strong> _________</div>
                    </div>
                </div>

                <div class="questions-list">
                    ${perguntasHtml}
                </div>

                <div class="page-break" style="margin-top: 40px;">
                    <h2 style="font-size: 16px; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 6px;">Gabarito do Professor</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px;">
                        <thead>
                            <tr style="background-color: #f1f5f9;">
                                <th style="padding: 6px 12px; border: 1px solid #cbd5e1; width: 60px;">Item</th>
                                <th style="padding: 6px 12px; border: 1px solid #cbd5e1; text-align: left;">Resposta Correta</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${gabaritoHtml}
                        </tbody>
                    </table>
                </div>
            </body>
            </html>
        `;

        janela.document.write(docHtml);
        janela.document.close();
    }
};

if (typeof window !== 'undefined') {
    window.quizGestorView = quizGestorView;
}
