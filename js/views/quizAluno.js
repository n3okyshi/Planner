import { firebaseService } from '../firebase-service.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';

export const quizAlunoView = {
    pin: '',
    playerId: '',
    nomeJogador: '',
    avatar: '🎓',
    sessaoData: null,
    unsubscribe: null,
    broadcastChannel: null,
    lastAnswerQuestionIndex: -1,
    tempoInicioQuestao: 0,
    avataresDisponiveis: ['🦊', '🦁', '🚀', '🐼', '⚡', '🌟', '🦄', '🎯', '🐯', '🦉', '🎓', '🐲', '🐬', '🎨', '⚽', '🎸'],

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        // Auto-preenchimento de PIN caso venha pela URL (#quiz-entrar?pin=123456)
        const hash = window.location.hash || '';
        if (hash.includes('pin=')) {
            const queryPart = hash.substring(hash.indexOf('?'));
            const urlParams = new URLSearchParams(queryPart);
            const pinParam = urlParams.get('pin');
            if (pinParam && !this.sessaoData) {
                this.pin = pinParam;
            }
        }

        // Se já está em uma sessão conectada, renderiza o estado atual do jogo
        if (this.sessaoData && this.pin) {
            return this.renderEstadoJogo(container);
        }

        // Caso contrário, tela de Entrada com PIN
        this.renderTelaEntrada(container);
    },

    renderTelaEntrada(container) {
        const html = `
            <div class="animate-enter" style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: var(--spacing-4);">
                <div class="card" style="width: 100%; max-width: 440px; padding: var(--spacing-8); display: flex; flex-direction: column; gap: var(--spacing-6); box-shadow: var(--shadow-xl); border: 2px solid var(--color-slate-200); border-radius: var(--radius-2xl);">
                    
                    <div style="text-align: center;">
                        <div style="width: 4.5rem; height: 4.5rem; border-radius: var(--radius-2xl); background: linear-gradient(135deg, #4f46e5, #9333ea); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 2.25rem; margin: 0 auto 1rem; box-shadow: 0 10px 25px -5px rgba(79,70,229,0.4);">
                            <i class="fas fa-gamepad"></i>
                        </div>
                        <h2 style="font-size: 1.625rem; font-weight: 900; color: var(--color-slate-800); letter-spacing: -0.025em;">
                            Entrar no Quiz ao Vivo
                        </h2>
                        <p style="font-size: 0.875rem; color: var(--color-slate-500); margin-top: 0.25rem;">
                            Digite o PIN da sala e seu nome para participar da partida.
                        </p>
                    </div>

                    <form onsubmit="event.preventDefault(); quizAlunoView.conectarSessao();" style="display: flex; flex-direction: column; gap: var(--spacing-4);">
                        <div>
                            <label class="form-label" style="font-weight: 800; font-size: 0.8125rem;">PIN DO JOGO (6 DÍGITOS)</label>
                            <input type="text" id="aluno-pin-input" class="form-input" 
                                   placeholder="Ex: 482910" maxlength="6" 
                                   style="font-size: 1.5rem; font-weight: 900; letter-spacing: 0.25em; text-align: center; text-transform: uppercase;"
                                   value="${this.pin}" required autofocus>
                        </div>

                        <div>
                            <label class="form-label" style="font-weight: 800; font-size: 0.8125rem;">SEU NOME OU APELIDO</label>
                            <input type="text" id="aluno-nome-input" class="form-input" 
                                   placeholder="Como você quer aparecer no ranking?" maxlength="25" 
                                   style="font-size: 1.125rem; font-weight: 700;"
                                   value="${window.escapeHTML(this.nomeJogador)}" required>
                        </div>

                        <div>
                            <label class="form-label" style="font-weight: 800; font-size: 0.8125rem;">ESCOLHA SEU AVATAR</label>
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; padding: 0.5rem; background-color: var(--color-slate-50); border-radius: var(--radius-xl); border: 1px solid var(--color-slate-200);">
                                ${this.avataresDisponiveis.map(av => `
                                    <button type="button" onclick="quizAlunoView.selecionarAvatar('${av}')" 
                                            class="avatar-select-btn interactive-element"
                                            data-avatar="${av}"
                                            style="width: 2.5rem; height: 2.5rem; border-radius: var(--radius-lg); font-size: 1.25rem; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid ${this.avatar === av ? 'var(--color-primary)' : 'transparent'}; background-color: ${this.avatar === av ? '#eef2ff' : '#fff'}; transition: all 0.2s;">
                                        ${av}
                                    </button>
                                `).join('')}
                            </div>
                        </div>

                        <button type="submit" id="btn-conectar-aluno" class="btn-primary" style="padding: 1rem; justify-content: center; font-size: 1.125rem; font-weight: 900; background: linear-gradient(to right, #4f46e5, #7c3aed); border-radius: var(--radius-xl); margin-top: 0.5rem;">
                            <span>Entrar na Partida</span> <i class="fas fa-arrow-right"></i>
                        </button>
                    </form>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    selecionarAvatar(av) {
        this.avatar = av;
        const pinEl = document.getElementById('aluno-pin-input');
        const nomeEl = document.getElementById('aluno-nome-input');
        if (pinEl) this.pin = pinEl.value;
        if (nomeEl) this.nomeJogador = nomeEl.value;

        document.querySelectorAll('.avatar-select-btn').forEach(btn => {
            if (btn.getAttribute('data-avatar') === av) {
                btn.style.borderColor = 'var(--color-primary)';
                btn.style.backgroundColor = '#eef2ff';
            } else {
                btn.style.borderColor = 'transparent';
                btn.style.backgroundColor = '#fff';
            }
        });
    },

    async conectarSessao() {
        const pinInput = document.getElementById('aluno-pin-input')?.value.trim();
        const nomeInput = document.getElementById('aluno-nome-input')?.value.trim();

        if (!pinInput || pinInput.length < 5) {
            return Toast.show("Digite um PIN de jogo válido.", "warning");
        }
        if (!nomeInput) {
            return Toast.show("Digite o seu nome ou apelido.", "warning");
        }

        this.pin = pinInput;
        this.nomeJogador = nomeInput;
        if (!this.playerId) {
            this.playerId = 'aluno_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
        }

        const btn = document.getElementById('btn-conectar-aluno');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Conectando...`;
        }

        try {
            await firebaseService.entrarSessaoQuiz(this.pin, this.playerId, this.nomeJogador, this.avatar);
            Toast.show(`Bem-vindo(a), ${this.nomeJogador}! Você entrou na sala.`, "success");

            if (typeof BroadcastChannel !== 'undefined') {
                if (this.broadcastChannel) this.broadcastChannel.close();
                this.broadcastChannel = new BroadcastChannel('quiz_sync_' + this.pin);
                this.broadcastChannel.onmessage = (event) => {
                    if (event.data && event.data.type === 'SESSION_UPDATE') {
                        this.processarAtualizacaoSessao(event.data.session);
                    }
                };
                this.broadcastChannel.postMessage({
                    type: 'PLAYER_JOIN',
                    player: {
                        id: this.playerId,
                        nome: this.nomeJogador,
                        avatar: this.avatar,
                        score: 0,
                        streak: 0,
                        totalCorrect: 0
                    }
                });
            }

            if (this.unsubscribe) this.unsubscribe();
            this.unsubscribe = firebaseService.ouvirSessaoQuiz(this.pin, (dados) => {
                if (dados) {
                    this.processarAtualizacaoSessao(dados);
                }
            });
        } catch (error) {
            console.warn("Aviso na conexão:", error.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span>Entrar na Partida</span> <i class="fas fa-arrow-right"></i>`;
            }
        }
    },

    processarAtualizacaoSessao(dados) {
        if (!dados) return;

        // Se o professor encerrou a partida de verdade, fechar a janela
        if (dados.status === 'CLOSED') {
            const container = document.getElementById('view-container');
            if (container) {
                container.innerHTML = `
                    <div class="card animate-enter" style="text-align: center; padding: 4rem 2rem; max-width: 440px; margin: 2rem auto;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">👋</div>
                        <h3 style="font-size: 1.5rem; font-weight: 900; color: var(--color-slate-800);">Partida Encerrada</h3>
                        <p style="color: var(--color-slate-500); margin-top: 0.5rem;">O professor finalizou esta sessão de quiz. Fechando a janela...</p>
                    </div>
                `;
            }
            setTimeout(() => {
                window.close();
                setTimeout(() => { window.location.href = 'about:blank'; }, 1000);
            }, 2000);
            return;
        }

        this.sessaoData = dados;
        this.render('view-container');
    },

    renderEstadoJogo(container) {
        const sessao = this.sessaoData || { status: 'LOBBY' };
        const status = sessao.status || 'LOBBY';

        let conteudo = '';
        switch (status) {
            case 'LOBBY':
                conteudo = this.renderLobbyAluno();
                break;
            case 'COUNTDOWN':
                conteudo = this.renderCountdownAluno();
                break;
            case 'QUESTION':
                conteudo = this.renderPerguntaAluno();
                break;
            case 'FEEDBACK':
                conteudo = this.renderFeedbackAluno();
                break;
            case 'LEADERBOARD':
            case 'PODIUM':
            case 'FINISHED':
                conteudo = this.renderPodioAluno();
                break;
            default:
                conteudo = this.renderLobbyAluno();
        }

        container.innerHTML = `
            <div id="quiz-aluno-game-container" style="min-height: 85vh; display: flex; flex-direction: column; justify-content: space-between; max-width: 600px; margin: 0 auto; padding: var(--spacing-4);">
                <!-- BARRA SUPERIOR DO ALUNO -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background-color: #ffffff; border-radius: var(--radius-xl); border: 1px solid var(--color-slate-200); box-shadow: var(--shadow-sm);">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.5rem;">${this.avatar}</span>
                        <div>
                            <h4 style="font-size: 0.875rem; font-weight: 800; color: var(--color-slate-800); line-height: 1;">${window.escapeHTML(this.nomeJogador)}</h4>
                            <span style="font-size: 0.6875rem; color: var(--color-slate-400); font-weight: 700;">PIN: ${this.pin}</span>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="text-align: right;">
                            <span style="font-size: 0.6875rem; font-weight: 800; text-transform: uppercase; color: var(--color-slate-400);">Pontos</span>
                            <h4 style="font-size: 1rem; font-weight: 900; color: var(--color-primary);">${this.obterScoreAtual()}</h4>
                        </div>
                        <button onclick="quizAlunoView.sairSessao()" class="btn-icon" style="color: var(--color-slate-400);" title="Sair da sala">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                </div>

                <!-- CORPO DO ESTADO -->
                <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; margin: 1.5rem 0;">
                    ${conteudo}
                </div>
            </div>
        `;
    },

    obterScoreAtual() {
        if (!this.sessaoData || !this.sessaoData.players || !this.sessaoData.players[this.playerId]) return 0;
        return this.sessaoData.players[this.playerId].score || 0;
    },

    obterPlayerData() {
        if (!this.sessaoData || !this.sessaoData.players) return null;
        return this.sessaoData.players[this.playerId] || null;
    },

    renderLobbyAluno() {
        return `
            <div class="card animate-enter" style="padding: 3rem 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.25rem;">
                <div style="width: 5.5rem; height: 5.5rem; border-radius: 50%; background-color: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center; font-size: 2.75rem; animation: pulse 2s infinite;">
                    ${this.avatar}
                </div>
                <div>
                    <h3 style="font-size: 1.375rem; font-weight: 900; color: var(--color-slate-800);">Você está dentro!</h3>
                    <p style="font-size: 0.875rem; color: var(--color-slate-500); margin-top: 0.25rem;">
                        Veja seu nome na tela principal. O jogo começará assim que o professor iniciar.
                    </p>
                </div>
                <div style="background-color: var(--color-slate-50); padding: 0.75rem 1.25rem; border-radius: var(--radius-full); border: 1px solid var(--color-slate-200); font-size: 0.8125rem; font-weight: 700; color: var(--color-slate-600); display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-spinner fa-spin" style="color: var(--color-primary);"></i> Aguardando o professor...
                </div>
            </div>
        `;
    },

    renderCountdownAluno() {
        return `
            <div style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <span style="font-size: 1.25rem; font-weight: 800; color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1rem;">Prepare-se!</span>
                <div style="font-size: 6rem; font-weight: 900; color: var(--color-slate-800); line-height: 1;">
                    🚀
                </div>
                <p style="color: var(--color-slate-500); font-weight: 700; margin-top: 1rem;">A pergunta vai aparecer na tela!</p>
            </div>
        `;
    },

    renderPerguntaAluno() {
        const sessao = this.sessaoData;
        const currentIdx = sessao.currentQuestionIndex || 0;
        const pergunta = sessao.perguntas && sessao.perguntas[currentIdx];

        // Se o aluno já respondeu ESTA questão específica
        if (this.lastAnswerQuestionIndex === currentIdx) {
            return `
                <div class="card animate-enter" style="padding: 3rem 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem;">
                    <div style="width: 5rem; height: 5rem; border-radius: 50%; background-color: #e0e7ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 2.25rem;">
                        <i class="fas fa-check"></i>
                    </div>
                    <h3 style="font-size: 1.5rem; font-weight: 900; color: var(--color-slate-800);">Resposta Enviada!</h3>
                    <p style="font-size: 0.875rem; color: var(--color-slate-500);">
                        Aguarde o encerramento do tempo para ver o gabarito na tela.
                    </p>
                    <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; font-weight: 700; color: var(--color-slate-400);">
                        <i class="fas fa-clock"></i> Tempo em contagem regressiva...
                    </div>
                </div>
            `;
        }

        if (!pergunta) {
            return `<div style="text-align: center; color: var(--color-slate-400);">Carregando questão...</div>`;
        }

        const tipo = pergunta.tipo || 'multipla';

        if (tipo === 'verdadeiro_falso') {
            return `
                <div style="display: grid; grid-template-columns: 1fr; gap: 1rem; width: 100%;">
                    <button onclick="quizAlunoView.enviarResposta(0, true)" class="interactive-element"
                            style="background: linear-gradient(135deg, #059669, #10b981); border: none; border-radius: 1.5rem; padding: 2.5rem 1.5rem; color: white; font-size: 1.75rem; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 1rem; box-shadow: 0 10px 25px -5px rgba(16,185,129,0.5);">
                        <i class="fas fa-check-circle" style="font-size: 2.5rem;"></i>
                        <span>VERDADEIRO</span>
                    </button>
                    <button onclick="quizAlunoView.enviarResposta(1, false)" class="interactive-element"
                            style="background: linear-gradient(135deg, #dc2626, #ef4444); border: none; border-radius: 1.5rem; padding: 2.5rem 1.5rem; color: white; font-size: 1.75rem; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 1rem; box-shadow: 0 10px 25px -5px rgba(239,68,68,0.5);">
                        <i class="fas fa-times-circle" style="font-size: 2.5rem;"></i>
                        <span>FALSO</span>
                    </button>
                </div>
            `;
        }

        // Alternativas Kahoot-style
        const botoes = [
            { bg: '#dc2626', icon: '▲', label: 'Opção A', index: 0 },
            { bg: '#2563eb', icon: '◆', label: 'Opção B', index: 1 },
            { bg: '#d97706', icon: '●', label: 'Opção C', index: 2 },
            { bg: '#059669', icon: '■', label: 'Opção D', index: 3 },
            { bg: '#7c3aed', icon: '★', label: 'Opção E', index: 4 }
        ];

        const totalAlts = (pergunta.alternativas && pergunta.alternativas.length) || 4;
        const altsExibidas = botoes.slice(0, totalAlts);

        return `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; width: 100%;">
                ${altsExibidas.map((btn) => `
                    <button onclick="quizAlunoView.enviarResposta(${btn.index})" class="interactive-element"
                            style="background-color: ${btn.bg}; border: none; border-radius: 1.5rem; min-height: 140px; color: white; font-size: 2.5rem; font-weight: 900; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: 0 8px 20px rgba(0,0,0,0.15);">
                        <span>${btn.icon}</span>
                        <span style="font-size: 0.875rem; font-weight: 800; opacity: 0.85;">${btn.label}</span>
                    </button>
                `).join('')}
            </div>
        `;
    },

    async enviarResposta(indexEscolhido, valorVF = null) {
        if (!this.sessaoData || !this.pin) return;
        const currentIdx = this.sessaoData.currentQuestionIndex || 0;
        const pergunta = this.sessaoData.perguntas && this.sessaoData.perguntas[currentIdx];
        if (!pergunta) return;

        let isCorrect = false;
        if (pergunta.tipo === 'verdadeiro_falso') {
            const corretaVF = pergunta.is_verdadeiro !== false;
            isCorrect = (valorVF === corretaVF);
        } else {
            const corretaIdx = pergunta.correta !== undefined ? pergunta.correta : 0;
            isCorrect = (indexEscolhido === corretaIdx);
        }

        let pontosGanhos = 0;
        if (isCorrect) {
            const tempoLimite = (pergunta.tempo || 30) * 1000;
            const tempoInicio = this.sessaoData.questionStartTime || Date.now();
            const tempoDecorrido = Math.max(0, Date.now() - tempoInicio);
            const fatorTempo = Math.max(0.5, 1 - (tempoDecorrido / (tempoLimite * 1.5)));
            pontosGanhos = Math.round(1000 * fatorTempo);
        }

        // Registra que esta questão atual foi respondida
        this.lastAnswerQuestionIndex = currentIdx;

        try {
            await firebaseService.enviarRespostaQuiz(this.pin, this.playerId, indexEscolhido, isCorrect, pontosGanhos);
            
            if (this.broadcastChannel) {
                this.broadcastChannel.postMessage({
                    type: 'PLAYER_ANSWER',
                    playerId: this.playerId,
                    questionIndex: currentIdx,
                    answerIndex: indexEscolhido,
                    isCorrect,
                    pointsEarned: pontosGanhos
                });
            }

            if (this.sessaoData && this.sessaoData.players && this.sessaoData.players[this.playerId]) {
                this.sessaoData.players[this.playerId].lastAnswerIndex = indexEscolhido;
                this.sessaoData.players[this.playerId].lastAnswerQuestionIndex = currentIdx;
                this.sessaoData.players[this.playerId].isCorrect = isCorrect;
                this.sessaoData.players[this.playerId].score = (this.sessaoData.players[this.playerId].score || 0) + pontosGanhos;
            }
            this.render('view-container');
        } catch (e) {
            console.error("Erro ao enviar resposta:", e);
            Toast.show("Erro ao registrar resposta.", "error");
        }
    },

    renderFeedbackAluno() {
        const player = this.obterPlayerData();
        const isAcerto = player && player.isCorrect === true;

        if (isAcerto) {
            return `
                <div class="card animate-enter" style="padding: 3rem 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 2px solid #6ee7b7;">
                    <div style="width: 5rem; height: 5rem; border-radius: 50%; background-color: #059669; color: white; display: flex; align-items: center; justify-content: center; font-size: 2.5rem;">
                        <i class="fas fa-check"></i>
                    </div>
                    <div>
                        <h3 style="font-size: 1.75rem; font-weight: 900; color: #065f46;">Correto!</h3>
                        <p style="font-size: 1.125rem; font-weight: 800; color: #047857; margin-top: 0.25rem;">
                            Pontos somados ao seu placar!
                        </p>
                    </div>
                    ${player && player.streak > 1 ? `
                        <div style="background-color: #fef3c7; color: #b45309; padding: 0.375rem 0.875rem; border-radius: var(--radius-full); font-weight: 800; font-size: 0.8125rem; display: flex; align-items: center; gap: 0.375rem;">
                            <i class="fas fa-fire" style="color: #f59e0b;"></i> Sequência de ${player.streak} acertos!
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            return `
                <div class="card animate-enter" style="padding: 3rem 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; background: linear-gradient(135deg, #fef2f2, #fee2e2); border: 2px solid #fca5a5;">
                    <div style="width: 5rem; height: 5rem; border-radius: 50%; background-color: #dc2626; color: white; display: flex; align-items: center; justify-content: center; font-size: 2.5rem;">
                        <i class="fas fa-times"></i>
                    </div>
                    <div>
                        <h3 style="font-size: 1.75rem; font-weight: 900; color: #991b1b;">Não foi dessa vez!</h3>
                        <p style="font-size: 0.9375rem; color: #7f1d1d; margin-top: 0.25rem;">
                            Veja a explicação pedagógica na tela do professor.
                        </p>
                    </div>
                </div>
            `;
        }
    },

    renderPodioAluno() {
        const player = this.obterPlayerData();
        const scoreFinal = player ? player.score : 0;
        const totalAcertos = player ? player.totalCorrect : 0;

        return `
            <div class="card animate-enter" style="padding: 3rem 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem;">
                <div style="width: 5.5rem; height: 5.5rem; border-radius: 50%; background: linear-gradient(135deg, #fbbf24, #d97706); color: white; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; box-shadow: 0 10px 25px rgba(245,158,11,0.4);">
                    <i class="fas fa-trophy"></i>
                </div>
                <div>
                    <h3 style="font-size: 1.75rem; font-weight: 900; color: var(--color-slate-800);">Partida Concluída!</h3>
                    <p style="font-size: 0.875rem; color: var(--color-slate-500); margin-top: 0.25rem;">
                        Parabéns pelo seu desempenho no quiz!
                    </p>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; width: 100%; max-width: 320px;">
                    <div style="padding: 1rem; background-color: var(--color-slate-50); border-radius: var(--radius-xl); border: 1px solid var(--color-slate-200);">
                        <span style="font-size: 1.5rem; font-weight: 900; color: var(--color-primary);">${scoreFinal}</span>
                        <p style="font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-400); text-transform: uppercase;">Pontos</p>
                    </div>
                    <div style="padding: 1rem; background-color: var(--color-slate-50); border-radius: var(--radius-xl); border: 1px solid var(--color-slate-200);">
                        <span style="font-size: 1.5rem; font-weight: 900; color: #059669;">${totalAcertos}</span>
                        <p style="font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-400); text-transform: uppercase;">Acertos</p>
                    </div>
                </div>

                <button onclick="quizAlunoView.sairSessao()" class="btn-primary" style="padding: 0.875rem 2rem; border-radius: var(--radius-xl);">
                    Voltar ao Início
                </button>
            </div>
        `;
    },

    sairSessao() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
            this.broadcastChannel = null;
        }
        this.pin = '';
        this.sessaoData = null;
        this.lastAnswerQuestionIndex = -1;
        window.location.hash = '';
        controller.navigate('dashboard');
    }
};

if (typeof window !== 'undefined') {
    window.quizAlunoView = quizAlunoView;
}
