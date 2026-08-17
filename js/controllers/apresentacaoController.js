import { model } from '../model.js';
import { Toast } from '../components/toast.js';
import { pptxParserService } from '../services/pptxParserService.js';
import { generateId } from '../utils.js';
import { aiService } from '../ai-service.js';

/**
 * Controller responsável pela lógica de negócios das Apresentações Animadas
 */
export const apresentacaoController = {
    activeApresentacaoId: null,
    currentSlideIndex: 0,
    currentStepIndex: 0, // Para revelação gradual de tópicos
    isBlackout: false,
    isWhiteboard: false,
    isPointerActive: false,
    timerSeconds: 0,
    timerInterval: null,

    /**
     * Inicializa uma nova apresentação no modelo
     */
    criarApresentacao(dados) {
        try {
            const nova = model.addApresentacao(dados);
            if (Toast) Toast.show("Apresentação criada com sucesso!", "success");
            return nova;
        } catch (e) {
            console.error("Erro ao criar apresentação:", e);
            if (Toast) Toast.show("Erro ao criar apresentação.", "error");
            return null;
        }
    },

    /**
     * Abre a modal padronizada do sistema para criar nova apresentação sem prompt nativo
     */
    abrirModalNovaApresentacao(callbackSucesso) {
        const modalContent = `
            <div style="padding: var(--spacing-2); display: flex; flex-direction: column; gap: var(--spacing-4);">
                <div>
                    <label for="modal-nova-apres-titulo" class="form-label">Título da Apresentação *</label>
                    <input type="text" id="modal-nova-apres-titulo" placeholder="Ex: História da Trigonometria" class="form-input" style="width: 100%;">
                </div>
                <div>
                    <label for="modal-nova-apres-subtitulo" class="form-label">Subtítulo / Descrição Curta</label>
                    <input type="text" id="modal-nova-apres-subtitulo" placeholder="Ex: Apresentação Interativa Pedagógica" class="form-input" style="width: 100%;">
                </div>
                <div>
                    <label for="modal-nova-apres-disciplina" class="form-label">Disciplina</label>
                    <input type="text" id="modal-nova-apres-disciplina" placeholder="Ex: Matemática, História..." class="form-input" style="width: 100%;">
                </div>
                <div style="display: flex; justify-content: flex-end; gap: var(--spacing-3); margin-top: var(--spacing-2);">
                    <button type="button" onclick="controller.closeModal()" class="btn-secondary">Cancelar</button>
                    <button type="button" id="btn-salvar-nova-apres-modal" class="btn-primary">Criar Apresentação</button>
                </div>
            </div>
        `;

        if (window.controller && typeof window.controller.openModal === 'function') {
            window.controller.openModal('Nova Apresentação Pedagógica', modalContent, 'md');
            
            setTimeout(() => {
                const btnSalvar = document.getElementById('btn-salvar-nova-apres-modal');
                if (btnSalvar) {
                    btnSalvar.addEventListener('click', () => {
                        const inputTitulo = document.getElementById('modal-nova-apres-titulo');
                        const inputSub = document.getElementById('modal-nova-apres-subtitulo');
                        const inputDisc = document.getElementById('modal-nova-apres-disciplina');

                        const titulo = inputTitulo?.value?.trim();
                        if (!titulo) {
                            if (Toast) Toast.show("Digite o título da apresentação.", "warning");
                            return;
                        }

                        const nov = this.criarApresentacao({
                            titulo,
                            subtitulo: inputSub?.value?.trim() || 'Apresentação Interativa Pedagógica',
                            disciplina: inputDisc?.value?.trim() || 'Geral'
                        });

                        window.controller.closeModal();
                        if (nov && typeof callbackSucesso === 'function') {
                            callbackSucesso(nov);
                        }
                    });
                }
            }, 100);
        }
    },

    /**
     * Inicia a reprodução da apresentação no Player Fullscreen
     */
    iniciarPlayer(apresentacaoId) {
        const apres = model.getApresentacaoById(apresentacaoId);
        if (!apres || !apres.slides || apres.slides.length === 0) {
            if (Toast) Toast.show("Apresentação inválida ou sem slides.", "warning");
            return;
        }

        this.activeApresentacaoId = apres.id;
        this.currentSlideIndex = 0;
        this.currentStepIndex = 0;
        this.isBlackout = false;
        this.isWhiteboard = false;
        this.isPointerActive = false;
        this.startTimer();

        if (window.controller && typeof window.controller.navigate === 'function') {
            window.controller.navigate('apresentador-player');
        }
    },

    /**
     * Avança para o próximo passo (tópico animado) ou próximo slide
     */
    proximoPasso() {
        const apres = model.getApresentacaoById(this.activeApresentacaoId);
        if (!apres) return;

        const slideAtual = apres.slides[this.currentSlideIndex];
        
        // Se o slide possui tópicos animados e ainda há tópicos para revelar
        if (slideAtual && slideAtual.tipoLayout === 'topicos-animados' && Array.isArray(slideAtual.topicos)) {
            if (this.currentStepIndex < slideAtual.topicos.length) {
                this.currentStepIndex++;
                this._notificarAtualizacaoPlayer();
                return;
            }
        }

        // Caso contrário, passa para o próximo slide
        if (this.currentSlideIndex < apres.slides.length - 1) {
            this.currentSlideIndex++;
            this.currentStepIndex = 0;
            this._notificarAtualizacaoPlayer();
        } else {
            if (Toast) Toast.show("Fim da apresentação.", "info");
        }
    },

    /**
     * Volta para o passo anterior ou slide anterior
     */
    passoAnterior() {
        const apres = model.getApresentacaoById(this.activeApresentacaoId);
        if (!apres) return;

        if (this.currentStepIndex > 0) {
            this.currentStepIndex--;
            this._notificarAtualizacaoPlayer();
            return;
        }

        if (this.currentSlideIndex > 0) {
            this.currentSlideIndex--;
            const slideAnterior = apres.slides[this.currentSlideIndex];
            // Se o slide anterior tinha tópicos, vai direto para o último tópico revelado
            if (slideAnterior && slideAnterior.tipoLayout === 'topicos-animados' && Array.isArray(slideAnterior.topicos)) {
                this.currentStepIndex = slideAnterior.topicos.length;
            } else {
                this.currentStepIndex = 0;
            }
            this._notificarAtualizacaoPlayer();
        }
    },

    /**
     * Vai diretamente para um slide específico
     */
    irParaSlide(index) {
        const apres = model.getApresentacaoById(this.activeApresentacaoId);
        if (!apres || index < 0 || index >= apres.slides.length) return;

        this.currentSlideIndex = index;
        this.currentStepIndex = 0;
        this._notificarAtualizacaoPlayer();
    },

    /**
     * Alterna modo Blackout (tela preta)
     */
    toggleBlackout() {
        this.isBlackout = !this.isBlackout;
        if (this.isBlackout) this.isWhiteboard = false;
        this._notificarAtualizacaoPlayer();
    },

    /**
     * Alterna modo Lousa Branca (Whiteboard)
     */
    toggleWhiteboard() {
        this.isWhiteboard = !this.isWhiteboard;
        if (this.isWhiteboard) this.isBlackout = false;
        this._notificarAtualizacaoPlayer();
    },

    /**
     * Alterna ativação da Caneta / Laser Pointer
     */
    togglePointer() {
        this.isPointerActive = !this.isPointerActive;
        this._notificarAtualizacaoPlayer();
    },

    /**
     * Inicia o cronômetro do apresentador
     */
    startTimer() {
        this.stopTimer();
        this.timerSeconds = 0;
        this.timerInterval = setInterval(() => {
            this.timerSeconds++;
            const timerElem = document.getElementById('presenter-timer');
            if (timerElem) {
                const mins = Math.floor(this.timerSeconds / 60).toString().padStart(2, '0');
                const secs = (this.timerSeconds % 60).toString().padStart(2, '0');
                timerElem.textContent = `${mins}:${secs}`;
            }
        }, 1000);
    },

    /**
     * Para o cronômetro
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    /**
     * Processa a importação de arquivo PPTX enviado pelo usuário
     */
    async importarPPTX(file) {
        if (!file) return null;
        if (Toast) Toast.show("Processando arquivo PowerPoint...", "info");

        try {
            const apresDados = await pptxParserService.parsePPTXFile(file);
            const novaApres = model.addApresentacao(apresDados);
            if (Toast) Toast.show(`Apresentação "${novaApres.titulo}" importada com sucesso!`, "success");
            return novaApres;
        } catch (error) {
            console.error("Erro na importação PPTX:", error);
            if (Toast) Toast.show(`Falha ao importar PPTX: ${error.message}`, "error");
            return null;
        }
    },

    /**
     * Gerador de Apresentação com Inteligência Artificial
     */
    async gerarApresentacaoIA(tema, disciplina = 'Geral', quantidadeSlides = 5, habilidadeBncc = null, textoContextoArquivo = '') {
        if (!tema || !tema.trim()) {
            if (Toast) Toast.show("Por favor, digite um tema para a IA gerar os slides.", "warning");
            return null;
        }

        if (Toast) Toast.show("IA gerando slides pedagógicos animados...", "info");

        try {
            const serviceIA = window.aiService || aiService;
            if (serviceIA && typeof serviceIA.gerarApresentacaoSlides === 'function') {
                const resultadoIA = await serviceIA.gerarApresentacaoSlides(tema, disciplina, quantidadeSlides, habilidadeBncc, textoContextoArquivo);
                if (resultadoIA && resultadoIA.slides) {
                    const novaApres = model.addApresentacao({
                        titulo: resultadoIA.titulo || `Apresentação: ${tema}`,
                        subtitulo: `Gerado por IA sobre ${tema}`,
                        disciplina,
                        temaVisual: 'glassmorphism',
                        modoOrigem: 'ia',
                        slides: resultadoIA.slides
                    });
                    if (Toast) Toast.show("Slides gerados com sucesso pela IA!", "success");
                    return novaApres;
                }
            }

            // Fallback inteligente caso a API de IA esteja offline ou simulada
            const slidesFallback = this._gerarSlidesFallbackIA(tema, disciplina, quantidadeSlides);
            const novaApres = model.addApresentacao({
                titulo: `Apresentação: ${tema.trim()}`,
                subtitulo: `Conteúdo Pedagógico - ${disciplina}`,
                disciplina,
                temaVisual: 'glassmorphism',
                modoOrigem: 'ia',
                slides: slidesFallback
            });

            if (Toast) Toast.show("Apresentação gerada com sucesso!", "success");
            return novaApres;
        } catch (error) {
            console.error("Erro ao gerar IA:", error);
            if (Toast) Toast.show("Erro ao gerar slides com IA.", "error");
            return null;
        }
    },


    /**
     * Gera uma estrutura inteligente pedagógica fallback de slides
     */
    _gerarSlidesFallbackIA(tema, disciplina, qtd) {
        const slides = [
            {
                id: generateId('slide'),
                tipoLayout: 'capa',
                titulo: tema,
                subtitulo: `Unidade de Ensino - ${disciplina}`,
                conteudo: 'Exploração completa dos conceitos principais com foco em fixação e aplicações práticas.',
                topicos: [],
                notasProfessor: 'Introduzir o tema da aula com perguntas disparadoras.',
                animacaoEntrada: 'zoom-in'
            },
            {
                id: generateId('slide'),
                tipoLayout: 'topicos-animados',
                titulo: 'Objetivos de Aprendizagem',
                subtitulo: 'O que aprenderemos nesta aula',
                conteudo: '',
                topicos: [
                    `Compreender os fundamentos de ${tema}`,
                    'Analisar exemplos práticos do cotidiano',
                    'Resolver problemas e responder perguntas desafiadoras'
                ],
                notasProfessor: 'Destacar a importância do tema para as avaliações e para o dia a dia.',
                animacaoEntrada: 'fade-up'
            },
            {
                id: generateId('slide'),
                tipoLayout: 'katex',
                titulo: 'Fundamentos e Fórmulas',
                subtitulo: 'Definição e representação matemática / formal',
                conteudo: 'Abaixo temos a expressão fundamental relacionada ao tema:',
                formulaKatex: '\\Rightarrow E = m \\cdot c^2 \\quad \\text{ou} \\quad f(x) = a \\cdot x + b',
                topicos: [],
                notasProfessor: 'Explicar a importância de cada variável na fórmula.',
                animacaoEntrada: 'slide-right'
            },
            {
                id: generateId('slide'),
                tipoLayout: 'quiz',
                titulo: 'Desafio Interativo',
                subtitulo: 'Teste rápido de fixação com a turma',
                conteudo: `Qual das opções melhor descreve a aplicação de ${tema}?`,
                opcoesQuiz: [
                    'Opção A: É um conceito puramente teórico sem aplicação',
                    'Opção B: Permite otimizar e resolver problemas fundamentais da disciplina',
                    'Opção C: Ocorre apenas em laboratórios avançados'
                ],
                respostaCorreta: 1,
                notasProfessor: 'Dar 1 minuto para a turma pensar antes de revelar a resposta certa.',
                animacaoEntrada: 'fade-up'
            },
            {
                id: generateId('slide'),
                tipoLayout: 'titulo-texto',
                titulo: 'Conclusão e Síntese',
                subtitulo: 'Resumo dos pontos chaves',
                conteudo: `Revisamos os principais pilares de ${tema}. Lembre-se de revisar suas anotações e realizar os exercícios propostos no aplicativo Planner Pro Docente.`,
                topicos: [],
                notasProfessor: 'Encerrar abrindo espaço para dúvidas dos alunos.',
                animacaoEntrada: 'zoom-in'
            }
        ];

        return slides.slice(0, Math.max(2, qtd));
    },

    /**
     * Atualiza a renderização da View do Player se estiver ativa
     */
    _notificarAtualizacaoPlayer() {
        if (window.apresentadorPlayerView && typeof window.apresentadorPlayerView.updateDOM === 'function') {
            window.apresentadorPlayerView.updateDOM();
        }
    }
};

if (typeof window !== 'undefined') {
    window.apresentacaoController = apresentacaoController;
}
