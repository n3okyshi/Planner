import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';
import { renderKatex, formatarTextoComLatex, sanitizeComLatex, generateSecurePIN, secureRandomInt } from '../utils.js';
import { firebaseService } from '../firebase-service.js';
import { EventDelegator } from '../utils/eventDelegator.js';

export const quizPlayerView = {
    quiz: null,
    pin: '',
    sessaoData: null,
    unsubscribe: null,
    broadcastChannel: null,
    estadoAtual: 'LOBBY',
    indicePerguntaAtual: 0,
    tempoRestante: 0,
    intervaloTimer: null,
    coresAlternativas: ['#dc2626', '#2563eb', '#d97706', '#059669', '#7c3aed'],
    _cleanupDelegators: null,

    async render(container, quizId = null) {
        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }
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
                    <i class="fas fa-gamepad" style="font-size: 3rem; color: var(--color-slate-300); margin-bottom: 1rem;"></i>
                    <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-700); margin-bottom: 0.5rem;">Nenhum Quiz em Execução</h3>
                    <p style="font-size: 0.875rem; color: var(--color-slate-500); margin-bottom: 1.5rem;">Selecione ou crie um quiz no Gestor de Quizzes para iniciar a apresentação ao vivo.</p>
                    <button type="button" data-action="ir-gestor-quizzes" class="btn-primary">
                        <i class="fas fa-arrow-left"></i> <span>Ir para Gestor de Quizzes</span>
                    </button>
                </div>
            `;
        }
    },

    embaralharQuestoesEAlternativas(perguntasOriginais) {
        return (perguntasOriginais || []).map(p => {
            const copia = JSON.parse(JSON.stringify(p));
            const tipo = copia.tipo || 'multipla';

            // Embaralhar alternativas para múltipla escolha, lacuna ou identificação
            if ((tipo === 'multipla' || tipo === 'lacuna' || tipo === 'identificacao') && Array.isArray(copia.alternativas) && copia.alternativas.length > 1) {
                const altsComIndices = copia.alternativas.map((alt, idx) => ({
                    texto: alt,
                    eraCorreta: (idx === (copia.correta !== undefined ? copia.correta : 0))
                }));

                // Algoritmo Fisher-Yates para embaralhamento justo usando CSPRNG
                for (let i = altsComIndices.length - 1; i > 0; i--) {
                    const j = secureRandomInt(0, i);
                    [altsComIndices[i], altsComIndices[j]] = [altsComIndices[j], altsComIndices[i]];
                }

                copia.alternativas = altsComIndices.map(item => item.texto);
                copia.correta = altsComIndices.findIndex(item => item.eraCorreta);
            }
            return copia;
        });
    },

    async start(quizId) {
        const quiz = (model.state.quizzes || []).find(q => String(q.id) === String(quizId));
        if (!quiz || !quiz.perguntas || quiz.perguntas.length === 0) {
            Toast.show("Este quiz não possui perguntas cadastradas.", "warning");
            return controller.navigate('quiz-gestor');
        }

        // Embaralha alternativas a cada nova partida
        const perguntasEmbaralhadas = this.embaralharQuestoesEAlternativas(quiz.perguntas);

        this.quiz = {
            ...quiz,
            perguntas: perguntasEmbaralhadas
        };

        this.estadoAtual = 'LOBBY';
        this.indicePerguntaAtual = 0;
        this.pin = generateSecurePIN(6);

        // Inicializa dados da sessão
        this.sessaoData = {
            pin: this.pin,
            quizId: this.quiz.id,
            titulo: this.quiz.titulo,
            disciplina: this.quiz.disciplina || 'Geral',
            status: 'LOBBY',
            currentQuestionIndex: 0,
            perguntas: this.quiz.perguntas,
            players: {},
            createdAt: Date.now()
        };

        // Inicia canal de sincronização local (BroadcastChannel)
        if (typeof BroadcastChannel !== 'undefined') {
            if (this.broadcastChannel) this.broadcastChannel.close();
            this.broadcastChannel = new BroadcastChannel('quiz_sync_' + this.pin);
            this.broadcastChannel.onmessage = (event) => {
                const data = event.data;
                if (!data) return;

                if (data.type === 'PLAYER_JOIN' && data.player) {
                    if (!this.sessaoData.players) this.sessaoData.players = {};
                    this.sessaoData.players[data.player.id] = data.player;
                    this.atualizarInterfaceTempoReal();
                    this.enviarSincronizacaoLocal();
                } else if (data.type === 'PLAYER_ANSWER') {
                    if (this.sessaoData.players && this.sessaoData.players[data.playerId]) {
                        const p = this.sessaoData.players[data.playerId];
                        p.lastAnswerIndex = data.answerIndex;
                        p.lastAnswerQuestionIndex = data.questionIndex;
                        p.isCorrect = data.isCorrect;
                        p.score = (p.score || 0) + (data.pointsEarned || 0);
                        if (data.isCorrect) p.totalCorrect = (p.totalCorrect || 0) + 1;
                        this.atualizarInterfaceTempoReal();
                        this.verificarSeTodosResponderam();
                    }
                }
            };
        }

        try {
            const pinCriado = await firebaseService.criarSessaoQuiz(this.quiz);
            if (pinCriado) this.pin = pinCriado;

            if (this.unsubscribe) this.unsubscribe();
            this.unsubscribe = firebaseService.ouvirSessaoQuiz(this.pin, (dados) => {
                if (dados) {
                    this.sessaoData = dados;
                    this.atualizarInterfaceTempoReal();
                    this.verificarSeTodosResponderam();
                }
            });
        } catch (e) {
            console.warn("Aviso na inicialização do Firestore:", e.message);
        }

        this.renderTelaCheia();
    },

    verificarSeTodosResponderam() {
        if (this.estadoAtual !== 'QUESTION') return;
        const players = Object.values(this.sessaoData?.players || {});
        if (players.length === 0) return;

        const totalRespondidos = players.filter(p => p.lastAnswerQuestionIndex === this.indicePerguntaAtual).length;
        if (totalRespondidos >= players.length) {
            clearInterval(this.intervaloTimer);
            this.concluirPergunta();
        }
    },

    enviarSincronizacaoLocal() {
        if (this.broadcastChannel && this.sessaoData) {
            this.broadcastChannel.postMessage({
                type: 'SESSION_UPDATE',
                session: this.sessaoData
            });
        }
    },

    renderTelaCheia() {
        const container = document.getElementById('view-container');
        if (!container) return;
        container.innerHTML = `
            <div id="game-fullscreen-container" style="position: fixed; inset: 0; z-index: 50; background-color: #0f172a; color: #ffffff; display: flex; flex-direction: column; font-family: system-ui, -apple-system, sans-serif; overflow: hidden;">
            </div>
        `;
        this.atualizarEstado();
    },

    atualizarInterfaceTempoReal() {
        if (this.estadoAtual === 'LOBBY') {
            const listaJogadoresEl = document.getElementById('lobby-players-grid');
            const contadorEl = document.getElementById('lobby-player-count');
            const players = Object.values(this.sessaoData?.players || {});
            
            if (contadorEl) {
                contadorEl.innerText = `${players.length} Aluno(s) Conectado(s)`;
            }
            if (listaJogadoresEl) {
                listaJogadoresEl.innerHTML = players.map(p => `
                    <div class="animate-bounce-in" style="background-color: rgba(255,255,255,0.1); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2); padding: 0.5rem 1rem; border-radius: 9999px; display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-size: 1rem;">
                        <span style="font-size: 1.25rem;">${p.avatar || '🎓'}</span>
                        <span>${window.escapeHTML(p.nome)}</span>
                    </div>
                `).join('');
            }
        } else if (this.estadoAtual === 'QUESTION') {
            const contadorRespostasEl = document.getElementById('question-responses-counter');
            const players = Object.values(this.sessaoData?.players || {});
            const totalPlayers = players.length;
            const totalRespondidos = players.filter(p => p.lastAnswerQuestionIndex === this.indicePerguntaAtual).length;

            if (contadorRespostasEl) {
                contadorRespostasEl.innerText = `${totalRespondidos} de ${totalPlayers} responderam`;
            }
        }
    },

    atualizarEstado() {
        const gameContainer = document.getElementById('game-fullscreen-container');
        if (!gameContainer) return;
        clearInterval(this.intervaloTimer);

        if (this.sessaoData) {
            this.sessaoData.status = this.estadoAtual;
            this.sessaoData.currentQuestionIndex = this.indicePerguntaAtual;
            this.enviarSincronizacaoLocal();
        }

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
            case 'LEADERBOARD':
                this.renderLeaderboard(gameContainer);
                break;
            case 'PODIUM':
                this.renderPodio(gameContainer);
                break;
        }
        renderKatex(gameContainer);
        this._bindDelegators(gameContainer);
    },

    _bindDelegators(container) {
        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
        }
        this._cleanupDelegators = EventDelegator.bind(container, {
            'ir-gestor-quizzes': () => controller.navigate('quiz-gestor'),
            'copiar-link-sala': () => this.copiarLinkSala(),
            'encerrar-quiz': () => this.encerrar(),
            'iniciar-partida': () => this.iniciarPartida(),
            'forcar-pulo': () => this.forcarPulo(),
            'confirmar-encerramento': () => this.confirmarEncerramentoAntecipado(),
            'avancar-leaderboard': () => this.avancarParaLeaderboard(),
            'proxima-pergunta': () => this.proximaPergunta(),
            'abrir-modal-notas': () => this.abrirModalLancarNotas(),
            'fechar-modal': () => controller.closeModal(),
            'salvar-notas': () => this.salvarLancamentoNotas()
        }, 'click');
    },

    destroy() {
        if (this.intervaloTimer) clearInterval(this.intervaloTimer);
        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }
    },

    onLeave() {
        this.destroy();
    },

    obterUrlAluno() {
        // Redireciona o link oficial diretamente para o portal isolado aluno.html
        const baseUrl = window.location.href.split('index.html')[0].split('#')[0].split('?')[0];
        const alunoUrl = baseUrl.endsWith('/') ? `${baseUrl}aluno.html` : `${baseUrl}/aluno.html`;
        return `${alunoUrl}?pin=${this.pin}`;
    },

    copiarLinkSala() {
        const link = this.obterUrlAluno();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(link).then(() => {
                Toast.show("📋 Link do aluno copiado com sucesso!", "success");
            }).catch(() => {
                prompt("Copie o link do aluno:", link);
            });
        } else {
            prompt("Copie o link do aluno:", link);
        }
    },

    renderLobby(container) {
        const urlEntrada = this.obterUrlAluno();
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(urlEntrada)}`;
        const players = Object.values(this.sessaoData?.players || {});

        container.innerHTML = `
            <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 2rem 3rem; background: radial-gradient(circle at center, #1e1b4b, #0f172a); text-align: center;">
                
                <!-- TOPO -->
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span class="badge" style="background-color: rgba(99,102,241,0.25); color: #a5b4fc; font-size: 0.875rem; font-weight: 800; padding: 0.5rem 1rem; border-radius: 9999px; border: 1px solid rgba(99,102,241,0.4);">
                            <i class="fas fa-gamepad mr-1"></i> QUIZ AO VIVO
                        </span>
                        <span style="color: #94a3b8; font-weight: 700; font-size: 1rem;">
                            ${window.escapeHTML(this.quiz.disciplina || 'Geral')}
                        </span>
                    </div>

                    <div style="display: flex; gap: 0.75rem;">
                        <button type="button" data-action="copiar-link-sala" class="btn-secondary" style="background-color: rgba(255,255,255,0.1); color: white; border: none; padding: 0.5rem 1.25rem;">
                            <i class="fas fa-link mr-2"></i> Copiar Link do Aluno
                        </button>
                        <button type="button" data-action="encerrar-quiz" class="btn-secondary" style="background-color: rgba(239,68,68,0.2); color: #fca5a5; border: none; padding: 0.5rem 1.25rem;">
                            <i class="fas fa-times mr-2"></i> Encerrar Quiz
                        </button>
                    </div>
                </div>

                <!-- CENTRO: PIN E QR CODE -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 1.5rem; max-width: 900px; margin: 0 auto; width: 100%;">
                    <div>
                        <h1 style="font-size: 3rem; font-weight: 900; color: #ffffff; letter-spacing: -0.025em; line-height: 1.1; margin-bottom: 0.5rem;">
                            ${window.escapeHTML(this.quiz.titulo)}
                        </h1>
                        <p style="font-size: 1.125rem; color: #cbd5e1; font-weight: 600; margin-bottom: 0.5rem;">
                            Acesse <span style="color: #facc15; font-weight: 800;">aluno.html</span> ou escaneie o QR Code
                        </p>
                        <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #6ee7b7; font-size: 0.8125rem; font-weight: 700; padding: 0.375rem 0.875rem; border-radius: 9999px;">
                            <i class="fas fa-shield-alt"></i> Modo Foco & Anti-Trapaça Ativo
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: center; gap: 3rem; flex-wrap: wrap; background-color: rgba(0,0,0,0.4); padding: 2rem 3.5rem; border-radius: 2rem; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
                        <!-- QR Code -->
                        <div style="background-color: #ffffff; padding: 0.75rem; border-radius: 1.25rem; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
                            <img src="${qrCodeUrl}" alt="QR Code de Acesso" style="width: 160px; height: 160px; display: block; border-radius: 0.5rem;" onerror="this.style.display='none'; document.getElementById('qr-fallback-btn').style.display='flex';">
                            <div id="qr-fallback-btn" style="display: none; width: 160px; height: 160px; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; text-align: center; color: #0f172a; font-weight: 800; font-size: 0.75rem;">
                                <i class="fas fa-qrcode text-4xl text-indigo-600"></i>
                                <span>PIN: ${this.pin}</span>
                            </div>
                        </div>

                        <!-- PIN GIGANTE -->
                        <div style="display: flex; flex-direction: column; align-items: center;">
                            <span style="font-size: 0.875rem; font-weight: 900; letter-spacing: 0.2em; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.25rem;">
                                PIN DA SALA
                            </span>
                            <span style="font-size: 5.5rem; font-weight: 900; letter-spacing: 0.15em; font-family: monospace; color: #facc15; text-shadow: 0 0 30px rgba(250,204,21,0.5); line-height: 1;">
                                ${this.pin}
                            </span>
                            <span id="lobby-player-count" style="font-size: 1.125rem; font-weight: 800; color: #a5b4fc; margin-top: 0.75rem;">
                                ${players.length} Aluno(s) Conectado(s)
                            </span>
                        </div>
                    </div>

                    <!-- GRID DE JOGADORES CONECTADOS -->
                    <div id="lobby-players-grid" style="display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; max-height: 140px; overflow-y: auto; width: 100%; padding: 0.5rem;" class="custom-scrollbar">
                        ${players.map(p => `
                            <div class="animate-bounce-in" style="background-color: rgba(255,255,255,0.1); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2); padding: 0.5rem 1rem; border-radius: 9999px; display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-size: 1rem;">
                                <span style="font-size: 1.25rem;">${p.avatar || '🎓'}</span>
                                <span>${window.escapeHTML(p.nome)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- CONTROLE INFERIOR -->
                <div>
                    <button type="button" data-action="iniciar-partida" class="btn-primary" style="padding: 1.25rem 4rem; font-size: 1.5rem; font-weight: 900; background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 1.5rem; box-shadow: 0 10px 30px rgba(79,70,229,0.5);">
                        <i class="fas fa-play mr-2"></i> Iniciar Quiz
                    </button>
                </div>
            </div>
        `;
    },

    async iniciarPartida() {
        try {
            await firebaseService.atualizarStatusSessao(this.pin, 'COUNTDOWN');
        } catch (e) {
            console.warn("Aviso Firestore ao iniciar:", e.message);
        }
        this.avancarEstado('COUNTDOWN');
    },

    renderCountdown(container) {
        container.innerHTML = `
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #4338ca, #312e81); text-align: center;">
                <span style="font-size: 1.5rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #c7d2fe; margin-bottom: 1rem;">Prepare-se!</span>
                <div id="countdown-number" style="font-size: 10rem; font-weight: 900; color: #ffffff; text-shadow: 0 0 40px rgba(255,255,255,0.5);" class="animate-bounce-in">3</div>
            </div>
        `;

        let counter = 3;
        const numberEl = document.getElementById('countdown-number');
        const interval = setInterval(async () => {
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
                try {
                    await firebaseService.atualizarStatusSessao(this.pin, 'QUESTION', this.indicePerguntaAtual, Date.now());
                } catch (e) {
                    console.warn("Aviso Firestore na pergunta:", e.message);
                }
                this.avancarEstado('QUESTION');
            }
        }, 1000);
    },

    renderPergunta(container) {
        const pergunta = this.quiz.perguntas[this.indicePerguntaAtual];
        this.tempoRestante = pergunta.tempo || 30;
        const tipo = pergunta.tipo || 'multipla';

        const totalPlayers = Object.keys(this.sessaoData?.players || {}).length;

        let respostasHtml = '';

        if (tipo === 'verdadeiro_falso') {
            respostasHtml = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; width: 100%; max-width: 1000px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #059669, #10b981); border-radius: 1.5rem; padding: 2.5rem 1.5rem; color: white; font-size: 2rem; font-weight: 900; display: flex; align-items: center; justify-content: center; gap: 1rem; box-shadow: 0 10px 25px -5px rgba(16,185,129,0.5);">
                        <i class="fas fa-check-circle" style="font-size: 3rem;"></i>
                        <span>VERDADEIRO</span>
                    </div>
                    <div style="background: linear-gradient(135deg, #dc2626, #ef4444); border-radius: 1.5rem; padding: 2.5rem 1.5rem; color: white; font-size: 2rem; font-weight: 900; display: flex; align-items: center; justify-content: center; gap: 1rem; box-shadow: 0 10px 25px -5px rgba(239,68,68,0.5);">
                        <i class="fas fa-times-circle" style="font-size: 3rem;"></i>
                        <span>FALSO</span>
                    </div>
                </div>
            `;
        } else {
            const alts = pergunta.alternativas && pergunta.alternativas.length > 0 ? pergunta.alternativas : ["Opção A", "Opção B", "Opção C", "Opção D"];
            const bgCores = ['#dc2626', '#2563eb', '#d97706', '#059669', '#7c3aed'];
            const icones = ['▲', '◆', '●', '■', '★'];

            respostasHtml = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem; width: 100%; max-width: 1100px; margin: 0 auto;">
                    ${alts.map((alt, i) => `
                        <div style="background-color: ${bgCores[i % bgCores.length]}; border-radius: 1.5rem; padding: 1.75rem 1.5rem; color: white; font-size: 1.35rem; font-weight: 800; display: flex; align-items: center; gap: 1.25rem; box-shadow: 0 8px 25px rgba(0,0,0,0.3);">
                            <span style="width: 3rem; height: 3rem; border-radius: 50%; background-color: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 900; flex-shrink: 0;">
                                ${icones[i] || i + 1}
                            </span>
                            <span style="flex: 1; line-height: 1.3;">${formatarTextoComLatex(sanitizeComLatex(alt))}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        container.innerHTML = `
            <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 2rem 3rem; background-color: #0f172a; text-align: center;">
                
                <!-- TOPO COM TEMPORIZADOR, BOTOES E CONTADOR DE RESPOSTAS -->
                <div style="display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; width: 100%; gap: 1rem; flex-wrap: wrap;">
                    <div style="text-align: left;">
                        <span style="font-size: 1.125rem; font-weight: 800; color: #94a3b8;">
                            Questão ${this.indicePerguntaAtual + 1} de ${this.quiz.perguntas.length}
                        </span>
                        <h4 id="question-responses-counter" style="font-size: 1rem; font-weight: 800; color: #a5b4fc; margin-top: 0.25rem;">
                            0 de ${totalPlayers} responderam
                        </h4>
                    </div>

                    <!-- Temporizador Circular -->
                    <div style="position: relative; width: 5.5rem; height: 5.5rem; display: flex; align-items: center; justify-content: center;">
                        <svg style="width: 5.5rem; height: 5.5rem; transform: rotate(-90deg);">
                            <circle cx="44" cy="44" r="38" fill="none" stroke="#334155" stroke-width="8"></circle>
                            <circle id="timer-circle" cx="44" cy="44" r="38" fill="none" stroke="#6366f1" stroke-width="8" stroke-dasharray="238" stroke-dashoffset="0" style="transition: stroke-dashoffset 1s linear, stroke 0.3s;"></circle>
                        </svg>
                        <span id="timer-text" style="position: absolute; font-size: 1.75rem; font-weight: 900; color: white;">${this.tempoRestante}</span>
                    </div>

                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <button type="button" data-action="forcar-pulo" class="btn-secondary" style="background-color: rgba(255,255,255,0.1); border: none; color: white; padding: 0.65rem 1.25rem; font-weight: 800; font-size: 0.875rem;">
                            Pular <i class="fas fa-forward ml-1"></i>
                        </button>
                        <button type="button" data-action="confirmar-encerramento" class="btn-secondary" style="background-color: rgba(239, 68, 68, 0.25); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; padding: 0.65rem 1.25rem; font-weight: 800; font-size: 0.875rem;" title="Encerrar jogo e mostrar pódio atual">
                            <i class="fas fa-stop-circle mr-1"></i> Encerrar Jogo
                        </button>
                    </div>
                </div>

                <!-- ENUNCIADO GIGANTE -->
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; max-width: 1100px; margin: 1rem auto; width: 100%;">
                    <h2 style="font-size: 2.25rem; font-weight: 900; color: #f8fafc; line-height: 1.35; text-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                        ${formatarTextoComLatex(sanitizeComLatex(pergunta.enunciado))}
                    </h2>
                </div>

                <!-- BARRA DE PROGRESSO DO TEMPO -->
                <div style="width: 100%; max-width: 1100px; height: 0.5rem; background-color: #334155; margin: 0 auto 1.5rem; border-radius: 9999px; overflow: hidden;">
                    <div id="time-progress-bar" style="height: 100%; background-color: #6366f1; transition: width 1s linear; width: 100%;"></div>
                </div>

                <!-- ALTERNATIVAS -->
                ${respostasHtml}
            </div>
        `;

        this.iniciarTimer();
    },

    iniciarTimer() {
        const tempoTotal = this.tempoRestante;
        const textEl = document.getElementById('timer-text');
        const circleEl = document.getElementById('timer-circle');
        const barEl = document.getElementById('time-progress-bar');
        const perimetro = 238;

        this.intervaloTimer = setInterval(async () => {
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
                await this.concluirPergunta();
            }
        }, 1000);
    },

    async forcarPulo() {
        clearInterval(this.intervaloTimer);
        await this.concluirPergunta();
    },

    async confirmarEncerramentoAntecipado() {
        clearInterval(this.intervaloTimer);
        try {
            await firebaseService.atualizarStatusSessao(this.pin, 'PODIUM');
        } catch (e) {
            console.warn("Aviso Firestore no encerramento antecipado:", e.message);
        }
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({
                type: 'SESSION_UPDATE',
                session: { ...this.sessaoData, status: 'PODIUM' }
            });
        }
        Toast.show("Partida encerrada antecipadamente! Apresentando o Pódio.", "info");
        this.avancarEstado('PODIUM');
    },

    async concluirPergunta() {
        try {
            await firebaseService.atualizarStatusSessao(this.pin, 'FEEDBACK');
        } catch (e) {
            console.warn("Aviso Firestore no feedback:", e.message);
        }
        this.avancarEstado('FEEDBACK');
    },

    renderFeedback(container) {
        clearInterval(this.intervaloTimer);
        const pergunta = this.quiz.perguntas[this.indicePerguntaAtual];
        const tipo = pergunta.tipo || 'multipla';
        const players = Object.values(this.sessaoData?.players || {});

        // Contagem de votos por alternativa na questão ATUAL
        const contagemVotos = {};
        players.forEach(p => {
            if (p.lastAnswerQuestionIndex === this.indicePerguntaAtual && p.lastAnswerIndex !== null && p.lastAnswerIndex !== undefined) {
                contagemVotos[p.lastAnswerIndex] = (contagemVotos[p.lastAnswerIndex] || 0) + 1;
            }
        });

        const totalVotos = players.filter(p => p.lastAnswerQuestionIndex === this.indicePerguntaAtual).length || 1;

        let graficoBarrasHtml = '';
        if (tipo === 'verdadeiro_falso') {
            const votosV = contagemVotos[0] || 0;
            const votosF = contagemVotos[1] || 0;
            const isVerdadeiro = pergunta.is_verdadeiro !== false;

            graficoBarrasHtml = `
                <div style="display: flex; gap: 2rem; align-items: flex-end; justify-content: center; height: 180px; margin: 1.5rem 0;">
                    <div style="display: flex; flex-direction: column; align-items: center; width: 140px;">
                        <span style="font-size: 1.5rem; font-weight: 900; margin-bottom: 0.5rem;">${votosV}</span>
                        <div style="width: 100%; height: ${Math.max(20, (votosV / totalVotos) * 140)}px; background: ${isVerdadeiro ? '#10b981' : '#64748b'}; border-radius: 1rem 1rem 0 0; display: flex; align-items: center; justify-content: center; border: 2px solid ${isVerdadeiro ? '#34d399' : 'transparent'};">
                            ${isVerdadeiro ? '<i class="fas fa-check text-white text-2xl"></i>' : ''}
                        </div>
                        <span style="font-weight: 800; margin-top: 0.5rem; color: #cbd5e1;">VERDADEIRO</span>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center; width: 140px;">
                        <span style="font-size: 1.5rem; font-weight: 900; margin-bottom: 0.5rem;">${votosF}</span>
                        <div style="width: 100%; height: ${Math.max(20, (votosF / totalVotos) * 140)}px; background: ${!isVerdadeiro ? '#10b981' : '#64748b'}; border-radius: 1rem 1rem 0 0; display: flex; align-items: center; justify-content: center; border: 2px solid ${!isVerdadeiro ? '#34d399' : 'transparent'};">
                            ${!isVerdadeiro ? '<i class="fas fa-check text-white text-2xl"></i>' : ''}
                        </div>
                        <span style="font-weight: 800; margin-top: 0.5rem; color: #cbd5e1;">FALSO</span>
                    </div>
                </div>
            `;
        } else {
            const alts = pergunta.alternativas || [];
            const indiceCorreto = pergunta.correta !== undefined ? pergunta.correta : 0;
            const bgCores = ['#dc2626', '#2563eb', '#d97706', '#059669', '#7c3aed'];

            graficoBarrasHtml = `
                <div style="display: flex; gap: 1.5rem; align-items: flex-end; justify-content: center; height: 180px; margin: 1.5rem 0;">
                    ${alts.map((alt, i) => {
                        const votos = contagemVotos[i] || 0;
                        const isCorreta = (i === indiceCorreto);
                        const altura = Math.max(24, Math.round((votos / totalVotos) * 140));
                        return `
                            <div style="display: flex; flex-direction: column; align-items: center; width: 110px;">
                                <span style="font-size: 1.25rem; font-weight: 900; margin-bottom: 0.25rem;">${votos}</span>
                                <div style="width: 100%; height: ${altura}px; background-color: ${isCorreta ? '#10b981' : bgCores[i % bgCores.length]}; opacity: ${isCorreta ? 1 : 0.45}; border-radius: 0.75rem 0.75rem 0 0; display: flex; align-items: center; justify-content: center; border: ${isCorreta ? '3px solid #34d399' : 'none'}; box-shadow: ${isCorreta ? '0 0 20px rgba(16,185,129,0.6)' : 'none'};">
                                    ${isCorreta ? '<i class="fas fa-check text-white text-xl"></i>' : ''}
                                </div>
                                <span style="font-weight: 800; font-size: 0.875rem; margin-top: 0.5rem; color: ${isCorreta ? '#34d399' : '#94a3b8'};">
                                    ${['A', 'B', 'C', 'D', 'E'][i]}
                                </span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        container.innerHTML = `
            <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 2rem 3rem; background-color: #0f172a; text-align: center;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; width: 100%;">
                    <div style="text-align: left;">
                        <span style="font-size: 0.875rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; color: #94a3b8;">
                            Resultado da Turma
                        </span>
                        <h2 style="font-size: 1.5rem; font-weight: 900; color: #ffffff; margin-top: 0.25rem; max-width: 800px;">
                            ${formatarTextoComLatex(sanitizeComLatex(pergunta.enunciado))}
                        </h2>
                    </div>
                    <button type="button" data-action="confirmar-encerramento" class="btn-secondary" style="background-color: rgba(239, 68, 68, 0.25); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; padding: 0.65rem 1.25rem; font-weight: 800; font-size: 0.875rem;">
                        <i class="fas fa-stop-circle mr-1"></i> Encerrar Jogo
                    </button>
                </div>

                <!-- GRÁFICO DE BARRAS DE RESPOSTAS DA TURMA -->
                <div>
                    ${graficoBarrasHtml}
                </div>

                <!-- COMENTÁRIO PEDAGÓGICO -->
                ${pergunta.justificativa ? `
                    <div style="background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 1.5rem; padding: 1.25rem 2rem; max-width: 800px; margin: 0 auto; text-align: left;">
                        <strong style="color: #38bdf8;"><i class="fas fa-chalkboard-teacher mr-2"></i>Explicação Pedagógica:</strong>
                        <p style="color: #cbd5e1; font-size: 1rem; margin-top: 0.375rem; line-height: 1.5;">${formatarTextoComLatex(sanitizeComLatex(pergunta.justificativa))}</p>
                    </div>
                ` : ''}

                <!-- BOTÃO PRÓXIMO -->
                <div>
                    <button type="button" data-action="avancar-leaderboard" class="btn-primary" style="padding: 1rem 3rem; font-size: 1.25rem; font-weight: 900; background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 1.25rem; box-shadow: 0 10px 25px rgba(79,70,229,0.4);">
                        Ver Placar de Líderes <i class="fas fa-trophy ml-2"></i>
                    </button>
                </div>
            </div>
        `;
    },

    async avancarParaLeaderboard() {
        try {
            await firebaseService.atualizarStatusSessao(this.pin, 'LEADERBOARD');
        } catch (e) {
            console.warn("Aviso Firestore no leaderboard:", e.message);
        }
        this.avancarEstado('LEADERBOARD');
    },

    renderLeaderboard(container) {
        const players = Object.values(this.sessaoData?.players || {});
        players.sort((a, b) => (b.score || 0) - (a.score || 0));
        const top5 = players.slice(0, 5);

        container.innerHTML = `
            <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 2.5rem 3rem; background: radial-gradient(circle at center, #1e1b4b, #0f172a); text-align: center;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; max-width: 1000px; margin: 0 auto; width: 100%;">
                    <div style="text-align: left;">
                        <span style="font-size: 0.875rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #fbbf24;">
                            <i class="fas fa-crown mr-1"></i> Ranking Parcial
                        </span>
                        <h1 style="font-size: 2.5rem; font-weight: 900; color: #ffffff; margin-top: 0.25rem;">
                            Placar de Líderes
                        </h1>
                    </div>
                    <button type="button" data-action="confirmar-encerramento" class="btn-secondary" style="background-color: rgba(239, 68, 68, 0.25); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; padding: 0.65rem 1.25rem; font-weight: 800; font-size: 0.875rem;">
                        <i class="fas fa-stop-circle mr-1"></i> Encerrar Jogo
                    </button>
                </div>

                <!-- LISTA TOP 5 -->
                <div style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 650px; margin: 0 auto; width: 100%;">
                    ${top5.map((p, i) => `
                        <div class="animate-enter" style="animation-delay: ${i * 100}ms; background-color: ${i === 0 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.08)'}; border: 2px solid ${i === 0 ? '#fbbf24' : 'rgba(255,255,255,0.15)'}; border-radius: 1.25rem; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 8px 20px rgba(0,0,0,0.25);">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <span style="font-size: 1.5rem; font-weight: 900; color: ${i === 0 ? '#fbbf24' : '#94a3b8'}; width: 2rem;">
                                    #${i + 1}
                                </span>
                                <span style="font-size: 1.75rem;">${p.avatar || '🎓'}</span>
                                <span style="font-size: 1.25rem; font-weight: 800; color: #ffffff;">
                                    ${window.escapeHTML(p.nome)}
                                </span>
                            </div>

                            <span style="font-size: 1.5rem; font-weight: 900; color: #facc15;">
                                ${p.score || 0} pts
                            </span>
                        </div>
                    `).join('')}
                </div>

                <!-- CONTROLE -->
                <div>
                    <button type="button" data-action="proxima-pergunta" class="btn-primary" style="padding: 1rem 3.5rem; font-size: 1.25rem; font-weight: 900; background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 1.25rem; box-shadow: 0 10px 25px rgba(79,70,229,0.4);">
                        ${this.indicePerguntaAtual < this.quiz.perguntas.length - 1 ? 'Próxima Questão <i class="fas fa-chevron-right ml-2"></i>' : 'Ver Grande Pódio Final <i class="fas fa-trophy ml-2"></i>'}
                    </button>
                </div>
            </div>
        `;
    },

    async proximaPergunta() {
        this.indicePerguntaAtual++;
        if (this.indicePerguntaAtual >= this.quiz.perguntas.length) {
            try {
                await firebaseService.atualizarStatusSessao(this.pin, 'PODIUM');
            } catch (e) {
                console.warn("Aviso Firestore no podio:", e.message);
            }
            this.avancarEstado('PODIUM');
        } else {
            try {
                await firebaseService.atualizarStatusSessao(this.pin, 'COUNTDOWN');
            } catch (e) {
                console.warn("Aviso Firestore countdown:", e.message);
            }
            this.avancarEstado('COUNTDOWN');
        }
    },

    renderPodio(container) {
        const players = Object.values(this.sessaoData?.players || {});
        players.sort((a, b) => (b.score || 0) - (a.score || 0));

        const p1 = players[0] || { nome: '---', score: 0, avatar: '🥇' };
        const p2 = players[1] || { nome: '---', score: 0, avatar: '🥈' };
        const p3 = players[2] || { nome: '---', score: 0, avatar: '🥉' };

        container.innerHTML = `
            <div style="flex: 1; display: flex; flex-direction: column; items: center; justify-content: space-between; padding: 2.5rem 3rem; background: radial-gradient(circle at center, #311042, #0f172a); text-align: center;">
                
                <div>
                    <div style="display: inline-flex; align-items: center; gap: 0.5rem; font-size: 1.125rem; font-weight: 900; color: #fbbf24; background-color: rgba(251,191,36,0.15); padding: 0.5rem 1.5rem; border-radius: 9999px; margin-bottom: 0.5rem;">
                        <i class="fas fa-crown"></i> Parabéns a todos os participantes!
                    </div>
                    <h1 style="font-size: 3.5rem; font-weight: 900; color: #ffffff; letter-spacing: -0.025em;">
                        Pódio dos Campeões
                    </h1>
                    <p style="color: #cbd5e1; font-size: 1.125rem;">${window.escapeHTML(this.quiz.titulo)}</p>
                </div>

                <!-- PÓDIO 3D -->
                <div style="display: flex; align-items: flex-end; justify-content: center; gap: 2rem; width: 100%; max-width: 800px; margin: 1rem auto;">
                    <!-- 2º Lugar -->
                    <div class="animate-enter" style="animation-delay: 200ms; flex: 1; display: flex; flex-direction: column; align-items: center;">
                        <span style="font-size: 2.5rem; margin-bottom: 0.25rem;">${p2.avatar || '🥈'}</span>
                        <span style="font-weight: 900; font-size: 1.25rem; color: #e2e8f0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;">${window.escapeHTML(p2.nome)}</span>
                        <span style="font-weight: 800; font-size: 1rem; color: #94a3b8; margin-bottom: 0.75rem;">${p2.score} pts</span>
                        <div style="width: 100%; height: 160px; background: linear-gradient(to top, #475569, #94a3b8); border-radius: 1.5rem 1.5rem 0 0; display: flex; align-items: center; justify-content: center; font-size: 3.5rem; font-weight: 900; color: #f8fafc; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                            2
                        </div>
                    </div>

                    <!-- 1º Lugar -->
                    <div class="animate-enter" style="flex: 1.2; display: flex; flex-direction: column; align-items: center;">
                        <i class="fas fa-crown" style="font-size: 2.5rem; color: #f59e0b; margin-bottom: 0.25rem; animation: bounce 1s infinite;"></i>
                        <span style="font-size: 3.5rem; margin-bottom: 0.25rem;">${p1.avatar || '🥇'}</span>
                        <span style="font-weight: 900; font-size: 1.5rem; color: #fef08a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px;">${window.escapeHTML(p1.nome)}</span>
                        <span style="font-weight: 900; font-size: 1.25rem; color: #fde047; margin-bottom: 0.75rem;">${p1.score} pts</span>
                        <div style="width: 100%; height: 230px; background: linear-gradient(to top, #d97706, #fbbf24); border-radius: 1.5rem 1.5rem 0 0; display: flex; align-items: center; justify-content: center; font-size: 5rem; font-weight: 900; color: #78350f; box-shadow: 0 0 45px rgba(251,191,36,0.6);">
                            1
                        </div>
                    </div>

                    <!-- 3º Lugar -->
                    <div class="animate-enter" style="animation-delay: 400ms; flex: 1; display: flex; flex-direction: column; align-items: center;">
                        <span style="font-size: 2.5rem; margin-bottom: 0.25rem;">${p3.avatar || '🥉'}</span>
                        <span style="font-weight: 900; font-size: 1.25rem; color: #fed7aa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;">${window.escapeHTML(p3.nome)}</span>
                        <span style="font-weight: 800; font-size: 1rem; color: #fdba74; margin-bottom: 0.75rem;">${p3.score} pts</span>
                        <div style="width: 100%; height: 120px; background: linear-gradient(to top, #7c2d12, #c2410c); border-radius: 1.5rem 1.5rem 0 0; display: flex; align-items: center; justify-content: center; font-size: 3rem; font-weight: 900; color: #ffedd5; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                            3
                        </div>
                    </div>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button type="button" data-action="abrir-modal-notas" class="btn-primary" 
                            style="padding: 1rem 2.5rem; font-size: 1.125rem; font-weight: 900; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; border-radius: 1.25rem; box-shadow: 0 10px 25px rgba(16,185,129,0.4); display: inline-flex; align-items: center; gap: 0.5rem; border: none; cursor: pointer;">
                        <i class="fas fa-file-invoice"></i> Lançar Resultados no Diário
                    </button>
                    <button type="button" data-action="encerrar-quiz" class="btn-secondary" 
                            style="padding: 1rem 2.5rem; font-size: 1.125rem; font-weight: 900; background-color: rgba(255,255,255,0.15); color: #ffffff; border: 1px solid rgba(255,255,255,0.25); border-radius: 1.25rem; display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <i class="fas fa-times-circle"></i> Encerrar Partida
                    </button>
                </div>
            </div>
        `;
    },

    abrirModalLancarNotas() {
        const turmas = model.state.turmas || [];
        if (turmas.length === 0) {
            return Toast.show("Nenhuma turma cadastrada no sistema. Cadastre uma turma primeiro.", "warning");
        }

        const players = Object.values(this.sessaoData?.players || {});
        if (players.length === 0) {
            return Toast.show("Nenhum participante conectado nesta partida.", "warning");
        }

        const totalPerguntas = this.quiz?.perguntas?.length || 1;
        const defaultTurma = turmas[0];

        const html = `
            <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; max-width: 620px;">
                <div>
                    <h3 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-file-invoice text-emerald-600"></i> Lançar Resultados do Quiz
                    </h3>
                    <p style="font-size: 0.8125rem; color: #64748b; margin-top: 0.25rem;">
                        Transfira os acertos e pontuação dos alunos diretamente para o diário de classe.
                    </p>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <label class="form-label" style="font-size: 0.75rem; font-weight: 800; color: #475569; text-transform: uppercase;">Turma de Destino</label>
                        <select id="modal-quiz-turma" class="form-input" style="width: 100%; padding: 0.625rem 0.875rem; border-radius: 0.75rem; border: 1.5px solid #cbd5e1; font-weight: 700;" data-action="mudar-turma-preview">
                            ${turmas.map(t => `<option value="${t.id}">${window.escapeHTML(t.nome)} (${t.alunos?.length || 0} alunos)</option>`).join('')}
                        </select>
                    </div>

                    <div>
                        <label class="form-label" style="font-size: 0.75rem; font-weight: 800; color: #475569; text-transform: uppercase;">Tipo de Registro</label>
                        <select id="modal-quiz-tipo" class="form-input" style="width: 100%; padding: 0.625rem 0.875rem; border-radius: 0.75rem; border: 1.5px solid #cbd5e1; font-weight: 700;">
                            <option value="avaliacao">Nova Avaliação no Diário (0 a 10)</option>
                            <option value="xp">Pontos de Gamificação / XP</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 800; color: #475569; text-transform: uppercase;">Nome da Avaliação no Diário</label>
                    <input type="text" id="modal-quiz-nome-av" class="form-input" 
                           style="width: 100%; padding: 0.625rem 0.875rem; border-radius: 0.75rem; border: 1.5px solid #cbd5e1; font-weight: 700;" 
                           value="Quiz: ${window.escapeHTML(this.quiz.titulo || 'Atividade')}">
                </div>

                <!-- PREVIEW DE ALUNOS MAPEADOS -->
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span style="font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase;">Mapeamento de Alunos na Turma</span>
                        <span id="modal-quiz-match-count" style="font-size: 0.75rem; font-weight: 800; color: #059669;"></span>
                    </div>
                    <div id="modal-quiz-preview-list" class="custom-scrollbar" 
                         style="max-height: 180px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 0.75rem; background: #f8fafc; padding: 0.5rem;">
                        <!-- Preenchido dinamicamente -->
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem;">
                    <button type="button" data-action="fechar-modal" class="btn-secondary" style="padding: 0.625rem 1.25rem;">
                        Cancelar
                    </button>
                    <button type="button" data-action="salvar-notas" class="btn-primary" style="background: #059669; border-color: #059669; padding: 0.625rem 1.5rem; font-weight: 800;">
                        <i class="fas fa-check"></i> Confirmar e Gravar Notas
                    </button>
                </div>
            </div>
        `;

        controller.openModal('Lançamento no Diário', html);
        const modalEl = document.getElementById('global-modal');
        if (modalEl) {
            EventDelegator.bind(modalEl, {
                'mudar-turma-preview': (e, target) => {
                    this.atualizarPreviewTurma(target.value);
                }
            }, 'change');
            EventDelegator.bind(modalEl, {
                'fechar-modal': () => controller.closeModal(),
                'salvar-notas': () => this.confirmarLancamentoNotas()
            }, 'click');
        }
        this.atualizarPreviewTurma(defaultTurma.id);
    },

    atualizarPreviewTurma(turmaId) {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(turmaId));
        const listEl = document.getElementById('modal-quiz-preview-list');
        const countEl = document.getElementById('modal-quiz-match-count');
        if (!turma || !listEl) return;

        const players = Object.values(this.sessaoData?.players || {});
        const totalPerguntas = this.quiz?.perguntas?.length || 1;

        let matchCount = 0;
        const norm = (str) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

        const htmlItems = players.map(p => {
            const playerNorm = norm(p.nome);
            const alunoMatch = (turma.alunos || []).find(a => {
                const aNorm = norm(a.nome);
                return aNorm === playerNorm || aNorm.includes(playerNorm) || playerNorm.includes(aNorm);
            });

            if (alunoMatch) matchCount++;
            const corretas = p.totalCorrect || 0;
            const notaCalc = ((corretas / totalPerguntas) * 10).toFixed(1);

            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.375rem 0.625rem; border-bottom: 1px solid #edf2f7; font-size: 0.8125rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span>${p.avatar || '🎓'}</span>
                        <span style="font-weight: 700; color: #1e293b;">${window.escapeHTML(p.nome)}</span>
                        ${alunoMatch 
                            ? `<span style="font-size: 0.6875rem; color: #059669; font-weight: 800;"><i class="fas fa-link"></i> ${window.escapeHTML(alunoMatch.nome)}</span>`
                            : `<span style="font-size: 0.6875rem; color: #eab308; font-weight: 700;"><i class="fas fa-question-circle"></i> Não vinculado</span>`
                        }
                    </div>
                    <div style="font-weight: 900; color: #4338ca;">
                        ${corretas}/${totalPerguntas} acertos (${notaCalc})
                    </div>
                </div>
            `;
        }).join('');

        listEl.innerHTML = htmlItems;
        if (countEl) countEl.innerText = `${matchCount} de ${players.length} alunos vinculados`;
    },

    salvarLancamentoNotas() {
        const turmaSelect = document.getElementById('modal-quiz-turma');
        const tipoSelect = document.getElementById('modal-quiz-tipo');
        const nomeAvInput = document.getElementById('modal-quiz-nome-av');

        if (!turmaSelect) return;
        const turmaId = turmaSelect.value;
        const tipo = tipoSelect?.value || 'avaliacao';
        const nomeAv = (nomeAvInput?.value || 'Quiz').trim();

        const turma = (model.state.turmas || []).find(t => String(t.id) === String(turmaId));
        if (!turma) return Toast.show("Turma não encontrada.", "error");

        const players = Object.values(this.sessaoData?.players || {});
        const totalPerguntas = this.quiz?.perguntas?.length || 1;
        const norm = (str) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

        let alunosAtualizados = 0;

        if (tipo === 'avaliacao') {
            // Criar nova avaliação na turma
            const novaAv = {
                id: 'av_quiz_' + Date.now(),
                nome: nomeAv,
                max: 10,
                periodo: 1
            };
            if (!turma.avaliacoes) turma.avaliacoes = [];
            turma.avaliacoes.push(novaAv);

            players.forEach(p => {
                const playerNorm = norm(p.nome);
                const aluno = (turma.alunos || []).find(a => {
                    const aNorm = norm(a.nome);
                    return aNorm === playerNorm || aNorm.includes(playerNorm) || playerNorm.includes(aNorm);
                });
                if (aluno) {
                    if (!aluno.notas) aluno.notas = {};
                    const corretas = p.totalCorrect || 0;
                    aluno.notas[novaAv.id] = Number(((corretas / totalPerguntas) * 10).toFixed(1));
                    alunosAtualizados++;
                }
            });
        } else {
            // Adicionar pontos de XP
            players.forEach(p => {
                const playerNorm = norm(p.nome);
                const aluno = (turma.alunos || []).find(a => {
                    const aNorm = norm(a.nome);
                    return aNorm === playerNorm || aNorm.includes(playerNorm) || playerNorm.includes(aNorm);
                });
                if (aluno) {
                    const pts = p.score || 0;
                    aluno.xp = (aluno.xp || 0) + pts;
                    alunosAtualizados++;
                }
            });
        }

        model.saveLocal();
        if (model.currentUser && window.turmaService) {
            window.turmaService.saveTurma(model.currentUser.uid, turma);
        }

        controller.closeModal();
        Toast.show(`✅ Sucesso! Resultados lançados para ${alunosAtualizados} aluno(s) na turma ${turma.nome}.`, "success", 5000);
    },

    avancarEstado(novoEstado) {
        this.estadoAtual = novoEstado;
        this.atualizarEstado();
    },

    async encerrar() {
        if (this.intervaloTimer) clearInterval(this.intervaloTimer);
        
        // Notifica canal local que a sala foi FECHADA (faz todos os alunos fecharem suas abas)
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({
                type: 'SESSION_UPDATE',
                session: { status: 'CLOSED' }
            });
            this.broadcastChannel.close();
            this.broadcastChannel = null;
        }

        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        if (this.pin) {
            try {
                // Atualiza Firestore para CLOSED via serviço encapsulado
                await firebaseService.encerrarSessaoQuiz(this.pin);
            } catch (e) {
                console.warn("Aviso ao encerrar sessão:", e.message);
            }
        }

        const container = document.getElementById('view-container');
        if (container) container.innerHTML = '';
        window.location.hash = '';
        controller.navigate('quiz-gestor');
        Toast.show("Partida de Quiz encerrada com sucesso.", "info");
    },

    destroy() {
        if (this.intervaloTimer) clearInterval(this.intervaloTimer);
        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
            this.broadcastChannel = null;
        }
    },

    onLeave() {
        this.destroy();
    }
};

if (typeof window !== 'undefined') {
    window.quizPlayerView = quizPlayerView;
}
