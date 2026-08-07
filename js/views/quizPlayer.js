import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';

export const quizPlayerView = {
    quiz: null,
    estadoAtual: 'LOBBY', // LOBBY, COUNTDOWN, QUESTION, FEEDBACK, PODIUM
    indicePerguntaAtual: 0,
    tempoRestante: 0,
    intervaloTimer: null,
    coresAlternativas: ['bg-red-500', 'bg-blue-500', 'bg-amber-500', 'bg-emerald-500'],

    async start(quizId) {
        const quizzes = model.state.quizzes || [];
        this.quiz = quizzes.find(q => q.id === quizId);

        if (!this.quiz || !this.quiz.perguntas || this.quiz.perguntas.length === 0) {
            Toast.show("Quiz inválido ou sem perguntas.", "error");
            return controller.navigate('quiz-gestor');
        }

        this.indicePerguntaAtual = 0;
        this.estadoAtual = 'LOBBY';

        const container = document.getElementById('view-container');

        // Pede Fullscreen nativo na div principal[cite: 1]
        try {
            if (container.requestFullscreen) {
                await container.requestFullscreen();
            }
        } catch (err) {
            console.warn("Fullscreen bloqueado pelo navegador. Prosseguindo em janela.");
        }

        // Isola a UI - Substitui o container principal temporariamente
        container.innerHTML = `<div id="quiz-game-container" class="w-full h-screen bg-slate-900 text-white flex flex-col fixed inset-0 z-[9999] font-sans"></div>`;

        this.atualizarMaquinaEstados();
    },

    // --- MÁQUINA DE ESTADOS DO GAME LOOP ---
    atualizarMaquinaEstados() {
        const gameContainer = document.getElementById('quiz-game-container');
        if (!gameContainer) return;

        switch (this.estadoAtual) {
            case 'LOBBY':
                this.renderLobby(gameContainer);
                break;
            case 'COUNTDOWN':
                this.renderCountdown(gameContainer);
                break;
            case 'QUESTION':
                this.renderPergunta(gameContainer);
                break;
            case 'FEEDBACK':
                this.renderFeedback(gameContainer);
                break;
            case 'PODIUM':
                this.renderPodio(gameContainer);
                break;
        }

        // Renderiza matemática se houver KaTeX disponível no escopo global[cite: 1]
        if (window.renderMathInElement) {
            renderMathInElement(gameContainer, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false }
                ],
                throwOnError: false
            });
        }
    },

    // 1. TELA DE LOBBY (Aguardando Jogadores)
    renderLobby(container) {
        container.innerHTML = `
            <div class="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-indigo-900 to-purple-900">
                <h1 class="text-6xl font-black mb-4 tracking-tighter">${window.escapeHTML(this.quiz.titulo)}</h1>
                <p class="text-2xl text-indigo-200 mb-12">Acesse: <span class="font-mono bg-black/30 px-4 py-2 rounded-xl text-white">planner.app/jogar</span> e digite o PIN</p>
                
                <div class="text-[8rem] font-black tracking-widest text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] mb-12">
                    ${Math.floor(100000 + Math.random() * 900000)} <!-- Mock PIN -->
                </div>

                <div class="flex gap-4">
                    <button onclick="quizPlayerView.encerrar()" class="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-xl transition-all">Sair</button>
                    <button onclick="quizPlayerView.avancarEstado('COUNTDOWN')" class="px-12 py-4 bg-white text-indigo-900 rounded-2xl font-black text-xl hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.3)]">Iniciar Quiz</button>
                </div>
            </div>
        `;
    },

    // 2. CONTAGEM REGRESSIVA
    renderCountdown(container) {
        container.innerHTML = `
            <div class="flex-1 flex items-center justify-center bg-indigo-600">
                <div id="countdown-number" class="text-[15rem] font-black animate-bounce-in drop-shadow-2xl">5</div>
            </div>
        `;
        let counter = 5;
        const numberEl = document.getElementById('countdown-number');
        const interval = setInterval(() => {
            counter--;
            if (counter > 0) {
                numberEl.innerText = counter;
                // Reseta animação
                numberEl.classList.remove('animate-bounce-in');
                void numberEl.offsetWidth;
                numberEl.classList.add('animate-bounce-in');
            } else {
                clearInterval(interval);
                this.avancarEstado('QUESTION');
            }
        }, 1000);
    },

    // 3. TELA DA PERGUNTA (O Jogo Rodando)
    renderPergunta(container) {
        const pergunta = this.quiz.perguntas[this.indicePerguntaAtual];
        this.tempoRestante = pergunta.tempo || 30;

        container.innerHTML = `
            <div class="flex flex-col h-full bg-slate-50 text-slate-800">
                <!-- Cabeçalho -->
                <div class="flex justify-between items-center p-6 bg-white shadow-sm">
                    <span class="text-xl font-bold text-slate-400">Pergunta ${this.indicePerguntaAtual + 1} / ${this.quiz.perguntas.length}</span>
                    
                    <!-- Temporizador Circular Otimizado -->
                    <div class="relative w-20 h-20 flex items-center justify-center">
                        <svg class="absolute inset-0 w-full h-full transform -rotate-90">
                            <circle cx="40" cy="40" r="36" fill="none" stroke="#e2e8f0" stroke-width="8"></circle>
                            <circle id="timer-circle" cx="40" cy="40" r="36" fill="none" stroke="#6366f1" stroke-width="8" stroke-dasharray="226" stroke-dashoffset="0" class="transition-all duration-1000 ease-linear"></circle>
                        </svg>
                        <span id="timer-text" class="text-2xl font-black z-10">${this.tempoRestante}</span>
                    </div>
                    
                    <button onclick="quizPlayerView.forcarPulo()" class="px-6 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold transition-colors">Pular</button>
                </div>

                <!-- Enunciado -->
                <div class="flex-1 flex items-center justify-center p-10 text-center">
                    <h2 class="text-4xl md:text-5xl font-bold leading-tight">${window.escapeHTML(pergunta.enunciado)}</h2>
                </div>

                <!-- Barra de Progresso (Visual de Tempo extra) -->
                <div class="w-full h-2 bg-slate-200">
                    <div id="time-progress-bar" class="h-full bg-indigo-500 transition-all duration-1000 ease-linear w-full"></div>
                </div>

                <!-- Alternativas Grid 2x2 -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-8 h-[40vh]">
                    ${pergunta.alternativas.map((alt, i) => `
                        <div class="flex items-center justify-center p-6 rounded-2xl ${this.coresAlternativas[i]} text-white text-3xl font-bold shadow-lg shadow-black/10 cursor-pointer active:scale-95 transition-transform" onclick="quizPlayerView.avancarEstado('FEEDBACK')">
                            ${window.escapeHTML(alt)}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.iniciarTimer();
    },

    iniciarTimer() {
        const tempoTotal = this.tempoRestante;
        const textEl = document.getElementById('timer-text');
        const circleEl = document.getElementById('timer-circle');
        const barEl = document.getElementById('time-progress-bar');
        const perimetro = 226; // 2 * pi * r (36)

        this.intervaloTimer = setInterval(() => {
            this.tempoRestante--;

            if (textEl && circleEl && barEl) {
                textEl.innerText = this.tempoRestante;

                const ratio = this.tempoRestante / tempoTotal;
                circleEl.style.strokeDashoffset = perimetro - (ratio * perimetro);

                // Linha corrigida usando concatenação simples:
                barEl.style.width = (ratio * 100) + '%';

                // Alerta de tempo acabando (vermelho)
                if (this.tempoRestante <= 5) {
                    circleEl.setAttribute('stroke', '#ef4444');
                    textEl.classList.add('text-red-500', 'animate-pulse');
                    barEl.classList.replace('bg-indigo-500', 'bg-red-500');
                }
            }

            if (this.tempoRestante <= 0) {
                clearInterval(this.intervaloTimer);
                this.avancarEstado('FEEDBACK');
            }
        }, 1000);
    },

    forcarPulo() {
        clearInterval(this.intervaloTimer);
        this.avancarEstado('FEEDBACK');
    },

    // 4. TELA DE FEEDBACK (Gabarito da Pergunta)
    renderFeedback(container) {
        clearInterval(this.intervaloTimer);
        const pergunta = this.quiz.perguntas[this.indicePerguntaAtual];

        container.innerHTML = `
            <div class="flex-1 flex flex-col bg-slate-900 p-8">
                <h2 class="text-4xl font-bold text-white text-center mb-12">Resultados</h2>
                
                <!-- Mockup de Gráfico de Barras Nativas -->
                <div class="flex-1 flex items-end justify-center gap-8 max-w-4xl mx-auto w-full border-b border-slate-700 pb-4">
                    ${pergunta.alternativas.map((alt, i) => {
            const isCorrect = i === pergunta.correta;
            const barHeight = Math.random() * 80 + 10; // Mock de votos (10 a 90%)

            return `
                        <div class="flex flex-col items-center gap-4 flex-1">
                            <span class="text-xl font-bold ${isCorrect ? 'text-emerald-400' : 'text-slate-500'}">
                                ${isCorrect ? '<i class="fas fa-check mb-2 text-3xl"></i>' : ''}
                            </span>
                            <div class="w-full rounded-t-xl transition-all duration-1000 ease-out flex items-start justify-center pt-4 ${isCorrect ? 'bg-emerald-500' : 'bg-slate-700'}" style="height: ${barHeight}%;">
                            </div>
                            <div class="${this.coresAlternativas[i]} w-full h-4 rounded-full"></div>
                        </div>
                    `}).join('')}
                </div>

                <div class="flex justify-end mt-12">
                    <button onclick="quizPlayerView.proximaPergunta()" class="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xl hover:bg-indigo-500 transition-colors">
                        ${this.indicePerguntaAtual < this.quiz.perguntas.length - 1 ? 'Próxima Pergunta <i class="fas fa-chevron-right ml-2"></i>' : 'Ver Pódio <i class="fas fa-trophy ml-2"></i>'}
                    </button>
                </div>
            </div>
        `;
    },

    proximaPergunta() {
        this.indicePerguntaAtual++;
        if (this.indicePerguntaAtual >= this.quiz.perguntas.length) {
            this.avancarEstado('PODIUM');
        } else {
            this.avancarEstado('QUESTION');
        }
    },

    // 5. PÓDIO FINAL
    renderPodio(container) {
        container.innerHTML = `
            <div class="flex-1 flex flex-col items-center justify-end p-8 bg-gradient-to-b from-slate-900 to-indigo-900">
                <h1 class="text-6xl font-black text-yellow-400 mb-16 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]"><i class="fas fa-crown"></i> PÓDIO</h1>
                
                <!-- Estrutura nativa CSS do Pódio -->
                <div class="flex items-end gap-2 md:gap-6 w-full max-w-2xl h-[40vh] border-b-4 border-slate-800">
                    <!-- 2º Lugar -->
                    <div class="flex-1 flex flex-col items-center animate-slide-up" style="animation-delay: 0.5s">
                        <span class="text-2xl font-bold mb-2">Maria</span>
                        <div class="w-full bg-slate-300 rounded-t-2xl flex justify-center pt-4 h-[60%] shadow-lg">
                            <span class="text-4xl font-black text-slate-500">2</span>
                        </div>
                    </div>
                    <!-- 1º Lugar -->
                    <div class="flex-1 flex flex-col items-center animate-slide-up" style="animation-delay: 1s">
                        <span class="text-3xl font-black text-yellow-400 mb-2">João</span>
                        <div class="w-full bg-yellow-400 rounded-t-2xl flex justify-center pt-4 h-[90%] shadow-[0_0_30px_rgba(250,204,21,0.4)] z-10">
                            <span class="text-5xl font-black text-yellow-600">1</span>
                        </div>
                    </div>
                    <!-- 3º Lugar -->
                    <div class="flex-1 flex flex-col items-center animate-slide-up" style="animation-delay: 0s">
                        <span class="text-xl font-bold mb-2">Ana</span>
                        <div class="w-full bg-amber-700 rounded-t-2xl flex justify-center pt-4 h-[40%] shadow-lg">
                            <span class="text-3xl font-black text-amber-900">3</span>
                        </div>
                    </div>
                </div>

                <button onclick="quizPlayerView.encerrar()" class="mt-16 px-8 py-4 bg-white text-indigo-900 rounded-xl font-bold text-lg hover:scale-105 transition-transform">Voltar ao Painel</button>
            </div>
        `;
    },

    avancarEstado(novoEstado) {
        this.estadoAtual = novoEstado;
        this.atualizarMaquinaEstados();
    },

    async encerrar() {
        if (this.intervaloTimer) clearInterval(this.intervaloTimer);

        // Remove Fullscreen[cite: 1]
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            }
        } catch (e) {
            console.log("Ignorando erro de exitFullscreen.");
        }

        // Restaura a renderização normal via Controller MVC global
        const container = document.getElementById('view-container');
        if (container) container.innerHTML = '';
        controller.navigate('quiz-gestor');
    }
};

if (typeof window !== 'undefined') {
    window.quizPlayerView = quizPlayerView;
}