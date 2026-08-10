import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';
export const quizPlayerView = {
    quiz: null,
    estadoAtual: 'LOBBY',
    indicePerguntaAtual: 0,
    tempoRestante: 0,
    intervaloTimer: null,
    coresAlternativas: ['bg-red-500', 'bg-blue-500', 'bg-amber-500', 'bg-emerald-500'],
    async render(container, quizId = null) {
        if (quizId) {
            return this.start(quizId);
        }
        if (this.quiz && this.quiz.id) {
            return this.start(this.quiz.id);
        }
        const quizzes = model.state.quizzes || [];
        if (quizzes.length > 0) {
            return this.start(quizzes[0].id);
        }
        if (typeof container === 'string') container = document.getElementById(container);
        if (container) {
            container.innerHTML = `
                <div class="card" style="padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; max-width: 600px; margin: 2rem auto;">
                    <i class="fas fa-gamepad text-5xl text-slate-300 mb-4"></i>
                    <h3 class="text-xl font-bold text-slate-700 mb-2">Nenhum Quiz em Execução</h3>
                    <p class="text-sm text-slate-500 mb-6">Selecione ou crie um quiz no Gestor de Quizzes para iniciar a apresentação ao vivo.</p>
                    <button onclick="controller.navigate('quiz-gestor')" class="btn-primary">
                        <i class="fas fa-arrow-left"></i> <span>Ir para Gestor de Quizzes</span>
                    </button>
                </div>
            `;
        }
    },
    async start(quizId) {
        const quiz = (model.state.quizzes || []).find(q => q.id === quizId);
        if (!quiz) {
            Toast.show("Quiz não encontrado.", "error");
            return controller.navigate('quiz-gestor');
        }
        this.quiz = quiz;
        this.estadoAtual = 'LOBBY';
        this.indicePerguntaAtual = 0;
        this.renderTelaCheia();
    },
    renderTelaCheia() {
        const container = document.getElementById('view-container');
        if (!container) return;
        container.innerHTML = `
            <div id="game-fullscreen-container" class="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col font-sans overflow-hidden">
            </div>
        `;
        this.atualizarEstado();
    },
    atualizarEstado() {
        const gameContainer = document.getElementById('game-fullscreen-container');
        if (!gameContainer) return;
        clearInterval(this.intervaloTimer);
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
        renderKatex(gameContainer);
    },
    renderLobby(container) {
        container.innerHTML = `
            <div class="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-indigo-900 to-purple-900">
                <h1 class="text-6xl font-black mb-4 tracking-tighter">${window.escapeHTML(this.quiz.titulo)}</h1>
                <p class="text-2xl text-indigo-200 mb-12">Acesse: <span class="font-mono bg-black/30 px-4 py-2 rounded-xl text-white">planner.app/jogar</span> e digite o PIN</p>
                
                <div class="text-hero-giant font-black tracking-widest text-white drop-shadow-glow mb-12">
                    ${Math.floor(100000 + Math.random() * 900000)} <!-- Mock PIN -->
                </div>
                <div class="flex gap-4">
                    <button onclick="quizPlayerView.encerrar()" class="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-xl transition-all">Sair</button>
                    <button onclick="quizPlayerView.avancarEstado('COUNTDOWN')" class="px-12 py-4 bg-white text-indigo-900 rounded-2xl font-black text-xl hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.3)]">Iniciar Quiz</button>
                </div>
            </div>
        `;
    },
    renderCountdown(container) {
        container.innerHTML = `
            <div class="flex-1 flex items-center justify-center bg-indigo-600">
                <div id="countdown-number" class="text-hero-mega font-black animate-bounce-in drop-shadow-2xl">5</div>
            </div>
        `;
        let counter = 5;
        const numberEl = document.getElementById('countdown-number');
        const interval = setInterval(() => {
            counter--;
            if (counter > 0) {
                numberEl.innerText = counter;
                numberEl.classList.remove('animate-bounce-in');
                void numberEl.offsetWidth;
                numberEl.classList.add('animate-bounce-in');
            } else {
                clearInterval(interval);
                this.avancarEstado('QUESTION');
            }
        }, 1000);
    },
    renderPergunta(container) {
        const pergunta = this.quiz.perguntas[this.indicePerguntaAtual];
        this.tempoRestante = pergunta.tempo || 30;
        container.innerHTML = `
            <div class="quiz-player-screen">
                <!-- Cabeçalho -->
                <div class="quiz-player-header">
                    <span style="font-size: 1.25rem; font-weight: 700; color: var(--color-slate-400);">
                        Pergunta ${this.indicePerguntaAtual + 1} / ${this.quiz.perguntas.length}
                    </span>
                    
                    <!-- Temporizador Circular -->
                    <div class="quiz-timer-container">
                        <svg class="quiz-timer-svg">
                            <circle cx="40" cy="40" r="36" fill="none" stroke="#e2e8f0" stroke-width="8"></circle>
                            <circle id="timer-circle" cx="40" cy="40" r="36" fill="none" stroke="#6366f1" stroke-width="8" stroke-dasharray="226" stroke-dashoffset="0" style="transition: all 1s linear;"></circle>
                        </svg>
                        <span id="timer-text" style="font-size: 1.5rem; font-weight: 900; z-index: 10;">${this.tempoRestante}</span>
                    </div>
                    
                    <button onclick="quizPlayerView.forcarPulo()" class="btn-secondary" style="padding: 0.5rem 1.5rem;">Pular</button>
                </div>

                <!-- Enunciado -->
                <div class="quiz-question-container">
                    <h2 class="quiz-question-title">${window.escapeHTML(pergunta.enunciado)}</h2>
                </div>

                <!-- Barra de Progresso -->
                <div style="width: 100%; height: 0.5rem; background-color: var(--color-slate-200);">
                    <div id="time-progress-bar" style="height: 100%; background-color: var(--color-primary); transition: width 1s linear; width: 100%;"></div>
                </div>

                <!-- Alternativas Grid 2x2 -->
                <div class="quiz-answers-grid">
                    ${pergunta.alternativas.map((alt, i) => `
                        <div class="quiz-answer-card ${this.coresAlternativas[i]}" onclick="quizPlayerView.avancarEstado('FEEDBACK')">
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
        const perimetro = 226;
        this.intervaloTimer = setInterval(() => {
            this.tempoRestante--;
            if (textEl && circleEl && barEl) {
                textEl.innerText = this.tempoRestante;
                const ratio = this.tempoRestante / tempoTotal;
                circleEl.style.strokeDashoffset = perimetro - (ratio * perimetro);
                barEl.style.width = (ratio * 100) + '%';
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
            const barHeight = Math.random() * 80 + 10;
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
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            }
        } catch (e) {
            console.log("Ignorando erro de exitFullscreen.");
        }
        const container = document.getElementById('view-container');
        if (container) container.innerHTML = '';
        controller.navigate('quiz-gestor');
    }
};
if (typeof window !== 'undefined') {
    window.quizPlayerView = quizPlayerView;
}
