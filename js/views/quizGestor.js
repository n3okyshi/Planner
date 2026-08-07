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
            <div class="fade-in pb-24">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h2 class="text-3xl font-bold text-slate-800">Quiz ao Vivo</h2>
                        <p class="text-slate-500">Engaje seus alunos com competições em tempo real.</p>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="quizGestorView.abrirGeradorIA()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:scale-105 transition-transform flex items-center gap-2">
                            <i class="fas fa-robot"></i> Gerar com IA
                        </button>
                        <button onclick="quizGestorView.criarNovoQuiz()" class="btn-primary px-5 py-2.5 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                            <i class="fas fa-plus"></i> Novo Quiz
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${quizzes.length > 0 ? quizzes.map(q => this.cardQuiz(q)).join('') : this.estadoVazio()}
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    cardQuiz(quiz) {
        return `
            <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group animate-slide-up">
                <div class="flex justify-between items-start mb-4">
                    <span class="px-3 py-1 bg-blue-50 text-primary text-[10px] font-bold uppercase rounded-full">${quiz.disciplina || 'Geral'}</span>
                    <button onclick="quizGestorView.editarQuiz('${quiz.id}')" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-blue-50 transition-colors">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                </div>
                <h3 class="text-lg font-bold text-slate-800 mb-2 truncate">${window.escapeHTML(quiz.titulo)}</h3>
                <p class="text-xs text-slate-500 font-medium mb-6">${quiz.perguntas?.length || 0} questões</p>
                
                <button onclick="controller.navigate('quiz-player'); setTimeout(() => window.quizPlayerView.start('${quiz.id}'), 100);" class="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors flex items-center justify-center gap-2">
                    <i class="fas fa-play"></i> Iniciar Apresentação
                </button>
            </div>
        `;
    },

    estadoVazio() {
        return `
            <div class="col-span-full py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem]">
                <i class="fas fa-gamepad text-4xl text-slate-300 mb-4"></i>
                <h3 class="text-xl font-bold text-slate-600">Nenhum Quiz criado</h3>
                <p class="text-slate-400 text-sm mt-2">Crie manualmente ou use a IA para gerar perguntas.</p>
            </div>
        `;
    },

    // --- EDITOR WYSIWYG E LÓGICA DE IA ---
    abrirGeradorIA() {
        const html = `
            <div class="p-6 space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Disciplina</label>
                        <input type="text" id="ai-disciplina" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary" placeholder="Ex: Matemática">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Série</label>
                        <input type="text" id="ai-serie" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary" placeholder="Ex: 8º Ano">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Assunto / Tema</label>
                    <input type="text" id="ai-assunto" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary" placeholder="Ex: Equações de 1º Grau">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Quantidade de Perguntas</label>
                    <select id="ai-qtd" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary">
                        <option value="3">3 Perguntas</option>
                        <option value="5">5 Perguntas</option>
                        <option value="10">10 Perguntas</option>
                    </select>
                </div>
                
                <div id="ai-loading" class="hidden flex-col items-center justify-center p-4">
                    <i class="fas fa-circle-notch fa-spin text-3xl text-indigo-600 mb-2"></i>
                    <p class="text-sm font-bold text-indigo-600 animate-pulse">A IA está formulando o Quiz...</p>
                </div>

                <div class="flex gap-2 pt-4">
                    <button onclick="controller.closeModal()" class="flex-1 py-3 text-slate-500 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition">Cancelar</button>
                    <button onclick="quizGestorView.gerarComIA()" class="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition">Gerar Quiz</button>
                </div>
            </div>
        `;
        controller.openModal('Gerar Quiz com IA', html);
    },

    async gerarComIA() {
        const disciplina = document.getElementById('ai-disciplina').value;
        const serie = document.getElementById('ai-serie').value;
        const assunto = document.getElementById('ai-assunto').value;
        const qtd = parseInt(document.getElementById('ai-qtd').value);

        if(!disciplina || !assunto) return Toast.show("Preencha a disciplina e o assunto.", "warning");

        document.getElementById('ai-loading').classList.remove('hidden');
        
        try {
            // Reaproveitando o método gerarMaterial do ai-service
            const promptDados = { 
                disciplina, 
                serie, 
                assunto, 
                quantidade: qtd, 
                formato: "Retorne ESTRITAMENTE um array de objetos JSON contendo: enunciado (aceita KaTeX), alternativas (array de 4 strings), correta (índice 0-3), tempo (30), pontos (1000)."
            };
            
            const resultado = await aiService.gerarMaterial('quiz_multipla_escolha', promptDados);
            
            // Cria e salva o Quiz
            const novoQuiz = {
                id: 'quiz_' + Date.now(),
                titulo: `${assunto} - ${serie}`,
                disciplina,
                perguntas: resultado.perguntas || resultado // Dependendo de como a IA estruturar
            };

            if(!model.state.quizzes) model.state.quizzes = [];
            model.state.quizzes.push(novoQuiz);
            model.saveLocal(); // Persiste dados offline/cloud

            controller.closeModal();
            Toast.show("Quiz gerado com sucesso!", "success");
            this.render('view-container');

        } catch (error) {
            console.error(error);
            Toast.show("Erro ao gerar Quiz via IA.", "error");
        } finally {
            document.getElementById('ai-loading')?.classList.add('hidden');
        }
    },

    criarNovoQuiz() {
        const novoQuiz = {
            id: 'quiz_' + Date.now(),
            titulo: 'Novo Quiz Sem Título',
            disciplina: 'Geral',
            perguntas: []
        };
        if(!model.state.quizzes) model.state.quizzes = [];
        model.state.quizzes.push(novoQuiz);
        model.saveLocal();
        this.render('view-container');
        this.editarQuiz(novoQuiz.id);
    },

    editarQuiz(id) {
        this.currentQuiz = model.state.quizzes.find(q => q.id === id);
        if(!this.currentQuiz.perguntas) this.currentQuiz.perguntas = [];
        this.renderEditor();
    },

    renderEditor() {
        const container = document.getElementById('view-container');
        
        let htmlPerguntas = this.currentQuiz.perguntas.map((p, i) => `
            <div class="p-4 border border-slate-200 rounded-xl mb-3 bg-slate-50 hover:border-primary cursor-pointer transition flex justify-between items-center group" onclick="quizGestorView.editarPergunta(${i})">
                <span class="font-bold text-slate-700 text-sm truncate max-w-[80%]">${i+1}. ${window.escapeHTML(p.enunciado || 'Nova Pergunta')}</span>
                <button onclick="event.stopPropagation(); quizGestorView.excluirPergunta(${i})" class="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');

        const html = `
            <div class="fade-in pb-24">
                <button onclick="quizGestorView.render('view-container')" class="mb-4 text-xs font-bold text-primary flex items-center gap-2 hover:underline">
                    <i class="fas fa-arrow-left"></i> Voltar aos Quizzes
                </button>
                
                <div class="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
                    <input type="text" id="quiz-titulo-edit" value="${window.escapeHTML(this.currentQuiz.titulo)}" class="text-3xl font-bold text-slate-800 bg-transparent outline-none border-b-2 border-transparent focus:border-primary w-2/3" onchange="quizGestorView.salvarTitulo(this.value)">
                    <button onclick="quizGestorView.adicionarPerguntaVazia()" class="btn-primary px-5 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2">
                        <i class="fas fa-plus"></i> Adicionar Pergunta
                    </button>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Lista Lateral -->
                    <div class="lg:col-span-1 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 h-fit max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Questões (${this.currentQuiz.perguntas.length})</h3>
                        ${htmlPerguntas || '<p class="text-xs text-slate-400 text-center py-4">Nenhuma pergunta ainda.</p>'}
                    </div>

                    <!-- Editor Central -->
                    <div class="lg:col-span-2 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100" id="quiz-editor-area">
                        <div class="flex flex-col items-center justify-center h-full text-slate-300 py-20">
                            <i class="fas fa-hand-pointer text-4xl mb-4"></i>
                            <p class="font-medium">Selecione uma pergunta na lista para editar ou adicione uma nova.</p>
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
        if(confirm("Excluir esta pergunta?")) {
            this.currentQuiz.perguntas.splice(index, 1);
            model.saveLocal();
            this.renderEditor();
        }
    },

    editarPergunta(index) {
        const p = this.currentQuiz.perguntas[index];
        const editorArea = document.getElementById('quiz-editor-area');
        
        let alternativasHtml = p.alternativas.map((alt, i) => `
            <div class="flex items-center gap-3">
                <input type="radio" name="quiz-correta" value="${i}" ${p.correta === i ? 'checked' : ''} class="w-5 h-5 accent-emerald-500 cursor-pointer">
                <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">${['A','B','C','D'][i]}</div>
                <input type="text" id="quiz-alt-${i}" value="${window.escapeHTML(alt)}" class="flex-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-primary text-sm font-medium" placeholder="Digite a alternativa...">
            </div>
        `).join('');

        editorArea.innerHTML = `
            <h3 class="text-sm font-bold text-slate-700 mb-4 flex justify-between items-center">
                <span>Editando Pergunta ${index + 1}</span>
                <div class="flex items-center gap-2 text-xs">
                    <i class="far fa-clock text-slate-400"></i>
                    <select id="quiz-tempo" class="border-slate-200 border rounded-lg p-1 outline-none text-slate-600">
                        <option value="15" ${p.tempo == 15 ? 'selected' : ''}>15s</option>
                        <option value="30" ${p.tempo == 30 ? 'selected' : ''}>30s</option>
                        <option value="60" ${p.tempo == 60 ? 'selected' : ''}>1 min</option>
                    </select>
                </div>
            </h3>
            
            <div class="space-y-6">
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Enunciado (Use $$ para KaTeX)</label>
                    <textarea id="quiz-enunciado" rows="4" class="w-full border-2 border-slate-100 p-4 rounded-xl outline-none focus:border-primary font-medium text-slate-700 resize-none text-lg">${window.escapeHTML(p.enunciado)}</textarea>
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Alternativas (Selecione a correta)</label>
                    <div class="space-y-3">
                        ${alternativasHtml}
                    </div>
                </div>

                <div class="pt-6 border-t border-slate-100 flex justify-end">
                    <button onclick="quizGestorView.salvarEdicaoPergunta(${index})" class="bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition flex items-center gap-2">
                        <i class="fas fa-save"></i> Salvar Pergunta
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
        for(let i=0; i<4; i++) {
            alternativas.push(document.getElementById(`quiz-alt-${i}`).value);
        }

        this.currentQuiz.perguntas[index] = {
            enunciado,
            alternativas,
            correta: radioCorreta ? parseInt(radioCorreta.value) : 0,
            tempo
        };

        model.saveLocal();
        Toast.show("Pergunta salva!", "success");
        this.renderEditor(); // Recarrega a lista
    },
};

// No final de quizGestor.js
if (typeof window !== 'undefined') {
    window.quizGestorView = quizGestorView;
}