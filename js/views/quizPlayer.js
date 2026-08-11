import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';
import { renderKatex } from '../utils.js';

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
        const quiz = (model.state.quizzes || []).find(q => String(q.id) === String(quizId));
        if (!quiz || !quiz.perguntas || quiz.perguntas.length === 0) {
            Toast.show("Quiz não possui perguntas cadastradas.", "warning");
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
        const pin = Math.floor(100000 + Math.random() * 900000);
        container.innerHTML = `
            <div class="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-center">
                <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-indigo-300 text-sm font-bold mb-6 backdrop-blur-sm">
                    <i class="fas fa-gamepad"></i> Quiz Interativo
                </div>
                <h1 class="text-5xl md:text-6xl font-black mb-4 tracking-tight max-w-4xl text-white drop-shadow-md">
                    ${window.escapeHTML(this.quiz.titulo)}
                </h1>
                <p class="text-xl text-indigo-200 mb-8 font-medium">
                    ${window.escapeHTML(this.quiz.disciplina || 'Geral')} • ${this.quiz.perguntas.length} Questões
                </p>
                
                <div class="bg-black/40 border border-white/10 px-8 py-6 rounded-3xl backdrop-blur-md mb-10 flex flex-col items-center shadow-2xl">
                    <span class="text-xs uppercase tracking-widest text-slate-400 font-bold mb-2">PIN DA SALA DE JOGO</span>
                    <span class="text-5xl md:text-7xl font-black tracking-widest text-yellow-400 font-mono drop-shadow-[0_0_20px_rgba(250,204,21,0.4)]">
                        ${pin}
                    </span>
                </div>

                <div class="flex gap-4">
                    <button onclick="quizPlayerView.encerrar()" class="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-lg transition-all text-white">
                        <i class="fas fa-times mr-2"></i> Sair
                    </button>
                    <button onclick="quizPlayerView.avancarEstado('COUNTDOWN')" class="px-12 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(99,102,241,0.4)]">
                        <i class="fas fa-play mr-2"></i> Iniciar Quiz
                    </button>
                </div>
            </div>
        `;
    },

    renderCountdown(container) {
        container.innerHTML = `
            <div class="flex-1 flex flex-col items-center justify-center bg-indigo-600 text-white">
                <span class="text-xl font-bold uppercase tracking-widest opacity-75 mb-4">Prepare-se!</span>
                <div id="countdown-number" class="text-9xl font-black animate-bounce-in drop-shadow-2xl">3</div>
            </div>
        `;

        let counter = 3;
        const numberEl = document.getElementById('countdown-number');
        const interval = setInterval(() => {
            counter--;
            if (counter > 0) {
                if (numberEl) {
                    numberEl.innerText = counter;
                    numberEl.classList.remove('animate-bounce-in');
                    void numberEl.offsetWidth;
                    numberEl.classList.add('animate-bounce-in');
                }
            } else {
                clearInterval(interval);
                this.avancarEstado('QUESTION');
            }
        }, 1000);
    },

    renderPergunta(container) {
        const pergunta = this.quiz.perguntas[this.indicePerguntaAtual];
        this.tempoRestante = pergunta.tempo || 30;
        const tipo = pergunta.tipo || 'multipla';

        const tipoBadgeLabels = {
            'multipla': 'Alternativas',
            'lacuna': 'Complete a Frase',
            'identificacao': 'Qual é o Conceito / Evento?',
            'verdadeiro_falso': 'Verdadeiro ou Falso'
        };

        let respostasHtml = '';

        if (tipo === 'verdadeiro_falso') {
            respostasHtml = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; width: 100%; max-width: 900px; margin: 0 auto; padding: 1rem;">
                    <button onclick="quizPlayerView.responderVF(true)" style="background: linear-gradient(135deg, #059669, #10b981); border: none; border-radius: 1.5rem; padding: 2.5rem 1.5rem; color: white; font-size: 1.75rem; font-weight: 900; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; box-shadow: 0 10px 25px -5px rgba(16,185,129,0.5); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                        <i class="fas fa-check-circle" style="font-size: 3.5rem;"></i>
                        <span>VERDADEIRO</span>
                    </button>
                    <button onclick="quizPlayerView.responderVF(false)" style="background: linear-gradient(135deg, #dc2626, #ef4444); border: none; border-radius: 1.5rem; padding: 2.5rem 1.5rem; color: white; font-size: 1.75rem; font-weight: 900; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; box-shadow: 0 10px 25px -5px rgba(239,68,68,0.5); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                        <i class="fas fa-times-circle" style="font-size: 3.5rem;"></i>
                        <span>FALSO</span>
                    </button>
                </div>
            `;
        } else {
            const alts = pergunta.alternativas && pergunta.alternativas.length > 0 ? pergunta.alternativas : ["Opção A", "Opção B", "Opção C", "Opção D"];
            const bgCores = ['#dc2626', '#2563eb', '#d97706', '#059669', '#7c3aed'];
            respostasHtml = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; width: 100%; max-width: 1000px; margin: 0 auto; padding: 1rem;">
                    ${alts.map((alt, i) => `
                        <button onclick="quizPlayerView.responderAlternativa(${i})" style="background-color: ${bgCores[i % bgCores.length]}; border: none; border-radius: 1.25rem; padding: 1.75rem 1.25rem; color: white; font-size: 1.25rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 1rem; text-align: left; box-shadow: 0 4px 15px rgba(0,0,0,0.3); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            <span style="width: 2.5rem; height: 2.5rem; border-radius: 50%; background-color: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 900; flex-shrink: 0;">
                                ${['A', 'B', 'C', 'D', 'E'][i] || i + 1}
                            </span>
                            <span style="flex: 1;">${window.escapeHTML(alt)}</span>
                        </button>
                    `).join('')}
                </div>
            `;
        }

        container.innerHTML = `
            <div class="flex-1 flex flex-col justify-between p-6 bg-slate-900 text-white select-none">
                <!-- Cabeçalho -->
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; max-width: 1100px; margin: 0 auto;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 1.125rem; font-weight: 800; color: #94a3b8;">
                            Questão ${this.indicePerguntaAtual + 1} de ${this.quiz.perguntas.length}
                        </span>
                        <span style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; background-color: rgba(99,102,241,0.2); color: #818cf8; padding: 0.25rem 0.625rem; border-radius: 9999px; border: 1px solid rgba(99,102,241,0.4);">
                            ${tipoBadgeLabels[tipo] || 'Quiz'}
                        </span>
                    </div>

                    <!-- Temporizador Circular -->
                    <div style="position: relative; width: 4.5rem; height: 4.5rem; display: flex; align-items: center; justify-content: center;">
                        <svg style="width: 4.5rem; height: 4.5rem; transform: rotate(-90deg);">
                            <circle cx="36" cy="36" r="30" fill="none" stroke="#334155" stroke-width="6"></circle>
                            <circle id="timer-circle" cx="36" cy="36" r="30" fill="none" stroke="#6366f1" stroke-width="6" stroke-dasharray="188" stroke-dashoffset="0" style="transition: stroke-dashoffset 1s linear, stroke 0.3s;"></circle>
                        </svg>
                        <span id="timer-text" style="position: absolute; font-size: 1.375rem; font-weight: 900; color: white;">${this.tempoRestante}</span>
                    </div>

                    <button onclick="quizPlayerView.forcarPulo()" class="btn-secondary" style="padding: 0.5rem 1.25rem; background-color: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); color: white;">
                        Pular <i class="fas fa-forward ml-1"></i>
                    </button>
                </div>

                <!-- Enunciado -->
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; text-align: center; max-width: 1000px; margin: 1rem auto; width: 100%;">
                    <h2 style="font-size: 2rem; font-weight: 800; line-height: 1.35; color: #f8fafc; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                        ${window.escapeHTML(pergunta.enunciado)}
                    </h2>
                </div>

                <!-- Barra de Progresso -->
                <div style="width: 100%; max-width: 1000px; height: 0.375rem; background-color: #334155; margin: 0 auto 1.5rem; border-radius: 9999px; overflow: hidden;">
                    <div id="time-progress-bar" style="height: 100%; background-color: #6366f1; transition: width 1s linear; width: 100%;"></div>
                </div>

                <!-- Respostas -->
                ${respostasHtml}
            </div>
        `;

        this.iniciarTimer();
    },

    responderAlternativa(indice) {
        this.avancarEstado('FEEDBACK');
    },

    responderVF(valorEscolhido) {
        this.avancarEstado('FEEDBACK');
    },

    iniciarTimer() {
        const tempoTotal = this.tempoRestante;
        const textEl = document.getElementById('timer-text');
        const circleEl = document.getElementById('timer-circle');
        const barEl = document.getElementById('time-progress-bar');
        const perimetro = 188;

        this.intervaloTimer = setInterval(() => {
            this.tempoRestante--;
            if (textEl && circleEl && barEl) {
                textEl.innerText = this.tempoRestante;
                const ratio = this.tempoRestante / tempoTotal;
                circleEl.style.strokeDashoffset = perimetro - (ratio * perimetro);
                barEl.style.width = (ratio * 100) + '%';
                if (this.tempoRestante <= 5) {
                    circleEl.setAttribute('stroke', '#ef4444');
                    textEl.style.color = '#ef4444';
                    barEl.style.backgroundColor = '#ef4444';
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
        const tipo = pergunta.tipo || 'multipla';

        let resultadoGabaritoHtml = '';

        if (tipo === 'verdadeiro_falso') {
            const isVerdadeiro = pergunta.is_verdadeiro !== false;
            resultadoGabaritoHtml = `
                <div style="background-color: ${isVerdadeiro ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; border: 2px solid ${isVerdadeiro ? '#10b981' : '#ef4444'}; border-radius: 1.5rem; padding: 2rem; max-width: 700px; margin: 0 auto; text-align: center;">
                    <div style="display: inline-flex; align-items: center; gap: 0.75rem; font-size: 2.25rem; font-weight: 900; color: ${isVerdadeiro ? '#10b981' : '#ef4444'}; margin-bottom: 1rem;">
                        <i class="fas ${isVerdadeiro ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                        <span>${isVerdadeiro ? 'VERDADEIRO' : 'FALSO'}</span>
                    </div>
                    ${pergunta.justificativa ? `
                        <p style="font-size: 1.125rem; color: #cbd5e1; line-height: 1.6; margin-top: 1rem;">
                            <strong>Explicação:</strong> ${window.escapeHTML(pergunta.justificativa)}
                        </p>
                    ` : ''}
                </div>
            `;
        } else {
            const alts = pergunta.alternativas || [];
            const indiceCorreto = pergunta.correta !== undefined ? pergunta.correta : 0;
            const respostaCorreta = alts[indiceCorreto] || pergunta.resposta_correta || '';

            resultadoGabaritoHtml = `
                <div style="background-color: rgba(16, 185, 129, 0.15); border: 2px solid #10b981; border-radius: 1.5rem; padding: 2rem; max-width: 700px; margin: 0 auto; text-align: center;">
                    <span style="font-size: 0.875rem; font-weight: 800; text-transform: uppercase; color: #34d399; letter-spacing: 0.1em; display: block; margin-bottom: 0.5rem;">Resposta Correta</span>
                    <h3 style="font-size: 2rem; font-weight: 900; color: #ffffff; margin-bottom: 1rem;">
                        ${window.escapeHTML(respostaCorreta)}
                    </h3>
                    ${pergunta.justificativa ? `
                        <p style="font-size: 1.0625rem; color: #cbd5e1; line-height: 1.6; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem; margin-top: 1rem;">
                            <strong>Comentário pedagógico:</strong> ${window.escapeHTML(pergunta.justificativa)}
                        </p>
                    ` : ''}
                </div>
            `;
        }

        container.innerHTML = `
            <div class="flex-1 flex flex-col justify-between p-8 bg-slate-900 text-white select-none">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <span style="font-size: 0.875rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8;">Gabarito e Explicação</span>
                    <h2 style="font-size: 1.5rem; font-weight: 800; color: #ffffff; margin-top: 0.5rem;">
                        ${window.escapeHTML(pergunta.enunciado)}
                    </h2>
                </div>

                <div style="flex: 1; display: flex; align-items: center; justify-content: center;">
                    ${resultadoGabaritoHtml}
                </div>

                <div style="display: flex; justify-content: flex-end; max-width: 1000px; margin: 2rem auto 0; width: 100%;">
                    <button onclick="quizPlayerView.proximaPergunta()" class="btn-primary" style="padding: 1rem 2.5rem; font-size: 1.25rem; font-weight: 900; background-color: #6366f1; box-shadow: 0 10px 25px -5px rgba(99,102,241,0.5);">
                        ${this.indicePerguntaAtual < this.quiz.perguntas.length - 1 ? 'Próxima Questão <i class="fas fa-chevron-right ml-2"></i>' : 'Ver Pódio Final <i class="fas fa-trophy ml-2"></i>'}
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
            <div class="flex-1 flex flex-col items-center justify-between p-8 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white select-none">
                <div style="text-align: center; margin-top: 2rem;">
                    <div style="display: inline-flex; align-items: center; gap: 0.5rem; font-size: 1rem; font-weight: 800; color: #fbbf24; background-color: rgba(251,191,36,0.15); padding: 0.5rem 1.25rem; border-radius: 9999px; margin-bottom: 1rem;">
                        <i class="fas fa-crown"></i> Parabéns a todos!
                    </div>
                    <h1 class="text-5xl md:text-6xl font-black text-white tracking-tight">
                        Quiz Concluído!
                    </h1>
                    <p class="text-slate-400 text-lg mt-2">${window.escapeHTML(this.quiz.titulo)}</p>
                </div>

                <div style="display: flex; align-items: flex-end; justify-content: center; gap: 1.5rem; width: 100%; max-width: 600px; margin: 2rem auto;">
                    <!-- 2º Lugar -->
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                        <span style="font-weight: 800; font-size: 1.125rem; margin-bottom: 0.5rem; color: #cbd5e1;">2º Lugar</span>
                        <div style="width: 100%; height: 140px; background: linear-gradient(to top, #475569, #64748b); border-radius: 1rem 1rem 0 0; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: 900; color: #e2e8f0; box-shadow: 0 10px 20px rgba(0,0,0,0.3);">
                            2
                        </div>
                    </div>

                    <!-- 1º Lugar -->
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                        <i class="fas fa-crown" style="font-size: 2rem; color: #f59e0b; margin-bottom: 0.5rem; animation: bounce 1s infinite;"></i>
                        <span style="font-weight: 900; font-size: 1.25rem; margin-bottom: 0.5rem; color: #fef08a;">1º Lugar</span>
                        <div style="width: 100%; height: 200px; background: linear-gradient(to top, #d97706, #fbbf24); border-radius: 1rem 1rem 0 0; display: flex; align-items: center; justify-content: center; font-size: 3.5rem; font-weight: 900; color: #78350f; box-shadow: 0 0 35px rgba(251,191,36,0.5);">
                            1
                        </div>
                    </div>

                    <!-- 3º Lugar -->
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                        <span style="font-weight: 800; font-size: 1.125rem; margin-bottom: 0.5rem; color: #cbd5e1;">3º Lugar</span>
                        <div style="width: 100%; height: 100px; background: linear-gradient(to top, #78350f, #b45309); border-radius: 1rem 1rem 0 0; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 900; color: #fde68a; box-shadow: 0 10px 20px rgba(0,0,0,0.3);">
                            3
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 2rem;">
                    <button onclick="quizPlayerView.encerrar()" class="btn-primary" style="padding: 1rem 3rem; font-size: 1.125rem; font-weight: 900; background-color: #ffffff; color: #0f172a;">
                        <i class="fas fa-arrow-left mr-2"></i> Voltar ao Painel de Quizzes
                    </button>
                </div>
            </div>
        `;
    },

    avancarEstado(novoEstado) {
        this.estadoAtual = novoEstado;
        this.atualizarEstado();
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
