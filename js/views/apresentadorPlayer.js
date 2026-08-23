import { model } from '../model.js';
import { apresentacaoController } from '../controllers/apresentacaoController.js';
import { escapeHTML, renderMath } from '../utils.js';
import { EventDelegator } from '../utils/eventDelegator.js';

/**
 * View do Player de Apresentação em Tela Cheia (Engine Nativa & PPTX)
 * Totalmente integrada ao Padrão MVC e Design System Vanilla CSS
 */
export const apresentadorPlayerView = {
    showNotesPanel: false,
    canvasDrawing: false,
    ctx: null,
    _cleanupDelegators: null,

    async render(container) {
        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }

        const apresId = apresentacaoController.activeApresentacaoId;
        const apres = model.getApresentacaoById(apresId);

        let targetContainer = document.getElementById('apresentador-player-root');
        if (!targetContainer) {
            targetContainer = document.createElement('div');
            targetContainer.id = 'apresentador-player-root';
            targetContainer.style.cssText = "position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; z-index: 999999; background: #090d16; overflow: hidden;";
            document.body.appendChild(targetContainer);
        }

        document.body.classList.add('presentation-mode-active');

        if (!apres || !apres.slides || apres.slides.length === 0) {
            targetContainer.innerHTML = `
                <div class="apresentador-player" style="justify-content: center; align-items: center; text-align: center; padding: 2rem;">
                    <p style="font-size: 1.25rem; font-weight: 700; color: #f87171; margin-bottom: 1rem;">Nenhuma apresentação ativa para exibir.</p>
                    <button type="button" data-action="sair-player" class="btn-primary">
                        Voltar para Apresentações
                    </button>
                </div>
            `;
            this._bindDelegators(targetContainer);
            return;
        }

        targetContainer.innerHTML = this._buildFullPlayerHTML(apres);
        this._bindDelegators(targetContainer);
        this._initListeners(targetContainer, apres);
        this._initCanvas(targetContainer);

        // Renderiza expressões KaTeX se houver
        setTimeout(() => renderMath(targetContainer), 100);
    },

    _bindDelegators(container) {
        this._cleanupDelegators = EventDelegator.bind(container, {
            'sair-player': () => this.sairPlayer(),
            'toggle-blackout': () => apresentacaoController.toggleBlackout(),
            'toggle-whiteboard': () => apresentacaoController.toggleWhiteboard(),
            'toggle-notes': () => this.toggleNotes(),
            'toggle-pointer': () => apresentacaoController.togglePointer(),
            'limpar-desenhos': () => this.limparDesenhos(),
            'passo-anterior': () => apresentacaoController.passoAnterior(),
            'proximo-passo': () => apresentacaoController.proximoPasso()
        }, 'click');
    },

    /**
     * Atualiza o DOM sutilmente durante a navegação entre passos/slides sem reconstruir o container inteiro
     */
    updateDOM() {
        const apresId = apresentacaoController.activeApresentacaoId;
        const apres = model.getApresentacaoById(apresId);
        if (apres) {
            this.render();
        }
    },

    _buildFullPlayerHTML(apres) {
        const currIdx = apresentacaoController.currentSlideIndex;
        const currStep = apresentacaoController.currentStepIndex;
        const slide = apres.slides[currIdx] || apres.slides[0];
        const nextSlide = apres.slides[currIdx + 1];

        // Estados de Blackout / Whiteboard / Pointer
        if (apresentacaoController.isBlackout) {
            return `
                <div id="player-screen" class="apresentador-player" style="background-color: #000000; justify-content: center; align-items: center; cursor: pointer;" data-action="toggle-blackout">
                    <span style="font-size: 0.875rem; font-family: monospace; opacity: 0.5; color: #94a3b8;">TELA EM BLACKOUT (Pressione 'B' ou clique para voltar)</span>
                </div>
            `;
        }

        if (apresentacaoController.isWhiteboard) {
            return `
                <div id="player-screen" class="apresentador-player" style="background-color: #ffffff; color: #0f172a; justify-content: center; align-items: center; cursor: pointer;" data-action="toggle-whiteboard">
                    <span style="font-size: 0.875rem; font-family: monospace; opacity: 0.5;">LOUSA BRANCA (Pressione 'W' ou clique para voltar)</span>
                </div>
            `;
        }

        return `
            <div id="player-screen" class="apresentador-player">
                <!-- CANVAS OVERLAY PARA ANOTAÇÕES / LASER POINTER -->
                <canvas id="presenter-canvas" style="position: absolute; inset: 0; z-index: 20; ${apresentacaoController.isPointerActive ? 'cursor: crosshair; pointer-events: auto;' : 'pointer-events: none;'}"></canvas>

                <!-- SLIDE VIEWPORT (16:9 CENTRADO) -->
                <div class="apresentador-player__viewport">
                    <div class="apresentador-player__stage animate-${slide.animacaoEntrada || 'fade-up'}">
                        ${this._renderSlideContentHTML(slide, currStep)}
                    </div>
                </div>

                <!-- PAINEL DE NOTAS DO PROFESSOR (FLUTUANTE) -->
                ${this.showNotesPanel ? `
                    <div style="position: absolute; bottom: 5rem; right: 1.5rem; z-index: 30; width: 320px; background-color: rgba(15, 23, 42, 0.95); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: var(--radius-2xl); padding: var(--spacing-4); box-shadow: var(--shadow-2xl); backdrop-filter: blur(10px); display: flex; flex-direction: column; gap: 0.75rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 0.5rem;">
                            <span style="font-size: 0.75rem; font-weight: 700; color: #fbbf24; display: flex; align-items: center; gap: 0.375rem;">
                                <i class="fas fa-clipboard-question"></i> Modo Apresentador
                            </span>
                            <button type="button" data-action="toggle-notes" style="background: none; border: none; color: #94a3b8; font-size: 0.875rem; cursor: pointer;">&times;</button>
                        </div>
                        <div style="font-size: 0.75rem; color: #cbd5e1; max-height: 140px; overflow-y: auto; line-height: 1.5;">
                            ${escapeHTML(slide.notasProfessor || 'Sem notas para este slide.')}
                        </div>
                        ${nextSlide ? `
                            <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 0.5rem;">
                                <span style="font-size: 0.625rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 0.25rem;">Próximo Slide:</span>
                                <p style="font-size: 0.75rem; font-weight: 500; color: #a5b4fc; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(nextSlide.titulo)}</p>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                <!-- BARRA INFERIOR DE CONTROLE E NAVEGAÇÃO -->
                <div class="apresentador-player__toolbar">
                    <div style="display: flex; align-items: center; gap: 1rem; font-size: 0.75rem; font-weight: 500; color: #94a3b8;">
                        <button type="button" data-action="sair-player" class="btn-secondary" style="padding: 0.375rem 0.75rem; font-size: 0.75rem; background: transparent; border-color: rgba(255,255,255,0.2); color: #e2e8f0;">
                            <i class="fas fa-xmark"></i> Sair (Esc)
                        </button>
                        <span style="height: 1rem; width: 1px; background-color: rgba(255,255,255,0.15);"></span>
                        <span style="color: #818cf8; font-weight: 700;">Slide ${currIdx + 1} de ${apres.slides.length}</span>
                        <span style="height: 1rem; width: 1px; background-color: rgba(255,255,255,0.15);"></span>
                        <span id="presenter-timer" style="font-family: monospace; color: #e2e8f0;">00:00</span>
                    </div>

                    <!-- BOTÕES DE ATALHO DA BARRA -->
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <button type="button" data-action="toggle-pointer" class="btn-secondary" style="padding: 0.375rem 0.75rem; font-size: 0.75rem; ${apresentacaoController.isPointerActive ? 'background-color: #dc2626; color: #ffffff; border-color: #dc2626;' : 'background: rgba(255,255,255,0.08); color: #e2e8f0; border-color: rgba(255,255,255,0.15);'}" title="Caneta / Laser Pointer (L)">
                            <i class="fas fa-pen-nib"></i> Caneta (L)
                        </button>

                        <button type="button" data-action="limpar-desenhos" class="btn-secondary" style="padding: 0.375rem 0.75rem; font-size: 0.75rem; background: rgba(255,255,255,0.08); color: #e2e8f0; border-color: rgba(255,255,255,0.15);" title="Limpar Anotações na Tela">
                            <i class="fas fa-eraser"></i>
                        </button>

                        <button type="button" data-action="toggle-blackout" class="btn-secondary" style="padding: 0.375rem 0.75rem; font-size: 0.75rem; background: rgba(255,255,255,0.08); color: #e2e8f0; border-color: rgba(255,255,255,0.15);" title="Tela Preta (B)">
                            <i class="fas fa-moon"></i> Blackout (B)
                        </button>

                        <button type="button" data-action="toggle-notes" class="btn-secondary" style="padding: 0.375rem 0.75rem; font-size: 0.75rem; ${this.showNotesPanel ? 'background-color: #d97706; color: #ffffff; border-color: #d97706;' : 'background: rgba(255,255,255,0.08); color: #e2e8f0; border-color: rgba(255,255,255,0.15);'}" title="Notas do Apresentador">
                            <i class="fas fa-sticky-note"></i> Notas
                        </button>
                    </div>

                    <!-- SETAS DE CONTROLE -->
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <button type="button" data-action="passo-anterior" class="btn-secondary" style="padding: 0.5rem 0.75rem; background: rgba(255,255,255,0.1); color: #ffffff; border-color: rgba(255,255,255,0.2);">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button type="button" data-action="proximo-passo" class="btn-primary" style="padding: 0.5rem 1rem; font-size: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                            Próximo <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renderiza o conteúdo interno de acordo com a categoria do layout
     */
    _renderSlideContentHTML(slide, currStep) {
        if (slide.tipoLayout === 'capa') {
            return `
                <div style="margin: auto 0; text-align: center; display: flex; flex-direction: column; gap: 1.5rem;">
                    <div>
                        <span style="padding: 0.375rem 1rem; background-color: rgba(99, 102, 241, 0.2); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.3); border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block;">
                            Apresentação Pedagógica
                        </span>
                    </div>
                    <h1 style="font-size: 3rem; font-weight: 800; color: #ffffff; margin: 0; line-height: 1.1; text-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                        ${escapeHTML(slide.titulo)}
                    </h1>
                    <p style="font-size: 1.25rem; color: #cbd5e1; max-width: 800px; margin: 0 auto; font-weight: 300; line-height: 1.6;">
                        ${escapeHTML(slide.subtitulo || slide.conteudo)}
                    </p>
                </div>
            `;
        }

        if (slide.tipoLayout === 'topicos-animados') {
            const topicos = slide.topicos || [];
            return `
                <div style="display: flex; flex-direction: column; gap: 1.5rem; height: 100%;">
                    <div>
                        <h2 style="font-size: 2.25rem; font-weight: 700; color: #ffffff; margin: 0 0 0.5rem 0;">${escapeHTML(slide.titulo)}</h2>
                        <p style="font-size: 1rem; color: #818cf8; font-weight: 500; margin: 0;">${escapeHTML(slide.subtitulo || '')}</p>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 1rem; margin: auto 0;">
                        ${topicos.map((topico, idx) => {
                            const estaVisivel = idx < currStep;
                            return `
                                <div style="display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; border-radius: var(--radius-xl); border: 1px solid ${estaVisivel ? 'rgba(99, 102, 241, 0.4)' : 'transparent'}; background-color: ${estaVisivel ? 'rgba(30, 41, 59, 0.7)' : 'transparent'}; opacity: ${estaVisivel ? '1' : '0.15'}; transform: ${estaVisivel ? 'translateX(0)' : 'translateX(10px)'}; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
                                    <div style="width: 2rem; height: 2rem; border-radius: var(--radius-full); background-color: ${estaVisivel ? '#4f46e5' : '#334155'}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.875rem; flex-shrink: 0;">
                                        ${idx + 1}
                                    </div>
                                    <p style="font-size: 1.125rem; color: #f1f5f9; font-weight: 500; margin: 0; line-height: 1.5;">
                                        ${escapeHTML(topico)}
                                    </p>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        if (slide.tipoLayout === 'katex') {
            return `
                <div style="margin: auto 0; text-align: center; display: flex; flex-direction: column; gap: 2rem;">
                    <div>
                        <h2 style="font-size: 2.25rem; font-weight: 700; color: #ffffff; margin: 0 0 0.5rem 0;">${escapeHTML(slide.titulo)}</h2>
                        <p style="font-size: 1.125rem; color: #cbd5e1; margin: 0;">${escapeHTML(slide.subtitulo || '')}</p>
                    </div>

                    <div style="padding: 2.5rem; background-color: rgba(15, 23, 42, 0.9); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: var(--radius-2xl); box-shadow: var(--shadow-2xl); display: inline-block; max-width: 800px; margin: 0 auto;">
                        <div style="font-size: 2.5rem; font-family: monospace; color: #818cf8;" class="math-katex">
                            $${slide.formulaKatex || '\\frac{a}{b} = c'}$
                        </div>
                    </div>

                    <p style="font-size: 1.125rem; color: #cbd5e1; max-width: 700px; margin: 0 auto; line-height: 1.6;">
                        ${escapeHTML(slide.conteudo)}
                    </p>
                </div>
            `;
        }

        if (slide.tipoLayout === 'quiz') {
            const opcoes = slide.opcoesQuiz || [];
            const revelado = currStep > 0;
            return `
                <div style="display: flex; flex-direction: column; gap: 1.5rem; height: 100%;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="padding: 0.25rem 0.75rem; background-color: rgba(168, 85, 247, 0.2); color: #d8b4fe; border: 1px solid rgba(168, 85, 247, 0.3); border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700;">
                            <i class="fas fa-puzzle-piece" style="margin-right: 0.25rem;"></i> Quiz em Sala
                        </span>
                    </div>
                    <h2 style="font-size: 1.75rem; font-weight: 700; color: #ffffff; margin: 0;">${escapeHTML(slide.titulo)}</h2>
                    <p style="font-size: 1.125rem; color: #e2e8f0; margin: 0;">${escapeHTML(slide.conteudo)}</p>

                    <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: auto;">
                        ${opcoes.map((op, idx) => {
                            const eCorreta = idx === slide.respostaCorreta;
                            let styleBg = "background-color: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); color: #f1f5f9;";
                            if (revelado) {
                                if (eCorreta) styleBg = "background-color: rgba(5, 150, 105, 0.3); border: 1px solid #10b981; color: #a7f3d0; font-weight: 700;";
                                else styleBg = "background-color: rgba(15, 23, 42, 0.4); border: 1px solid rgba(255, 255, 255, 0.05); color: #64748b; opacity: 0.5;";
                            }
                            return `
                                <div style="padding: 1rem; border-radius: var(--radius-xl); display: flex; align-items: center; gap: 1rem; transition: all 0.3s; ${styleBg}">
                                    <span style="width: 2rem; height: 2rem; border-radius: var(--radius-lg); background-color: rgba(255, 255, 255, 0.1); font-weight: 700; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                        ${String.fromCharCode(65 + idx)}
                                    </span>
                                    <span style="font-size: 1.125rem;">${escapeHTML(op)}</span>
                                    ${revelado && eCorreta ? '<i class="fas fa-check-circle" style="color: #34d399; font-size: 1.25rem; margin-left: auto;"></i>' : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        // Default: Título e Texto / Imagem
        return `
            <div style="margin: auto 0; display: flex; flex-direction: column; gap: 1.25rem;">
                <h2 style="font-size: 2.25rem; font-weight: 700; color: #ffffff; margin: 0;">${escapeHTML(slide.titulo)}</h2>
                ${slide.subtitulo ? `<p style="font-size: 1.125rem; color: #818cf8; font-weight: 500; margin: 0;">${escapeHTML(slide.subtitulo)}</p>` : ''}
                
                ${slide.imagemUrl ? `
                    <div style="width: 100%; max-height: 280px; border-radius: var(--radius-2xl); overflow: hidden; margin: 0.5rem 0; border: 1px solid rgba(255, 255, 255, 0.1);">
                        <img src="${slide.imagemUrl}" style="width: 100%; height: 100%; object-fit: contain; background-color: #0f172a;">
                    </div>
                ` : ''}

                <div style="font-size: 1.125rem; color: #e2e8f0; leading-relaxed; font-weight: 300; white-space: pre-line;">
                    ${escapeHTML(slide.conteudo)}
                </div>
            </div>
        `;
    },

    _initListeners(container, apres) {
        // Evento de Teclado Global durante a Apresentação
        const keyHandler = (e) => {
            if (window.controller?.currentView !== 'apresentador-player') return;

            if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
                e.preventDefault();
                apresentacaoController.proximoPasso();
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {
                e.preventDefault();
                apresentacaoController.passoAnterior();
            } else if (e.key === 'b' || e.key === 'B') {
                apresentacaoController.toggleBlackout();
            } else if (e.key === 'w' || e.key === 'W') {
                apresentacaoController.toggleWhiteboard();
            } else if (e.key === 'l' || e.key === 'L') {
                apresentacaoController.togglePointer();
            } else if (e.key === 'Escape') {
                this.sairPlayer();
            }
        };

        window.removeEventListener('keydown', this._currentKeyHandler);
        this._currentKeyHandler = keyHandler;
        window.addEventListener('keydown', keyHandler);
    },

    _initCanvas(container) {
        const canvas = container.querySelector('#presenter-canvas');
        if (!canvas) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.ctx = canvas.getContext('2d');
        this.ctx.strokeStyle = '#ef4444'; // Vermelho laser
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';

        let desenhando = false;

        canvas.addEventListener('mousedown', (e) => {
            if (!apresentacaoController.isPointerActive) return;
            desenhando = true;
            this.ctx.beginPath();
            this.ctx.moveTo(e.clientX, e.clientY);
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!desenhando || !apresentacaoController.isPointerActive) return;
            this.ctx.lineTo(e.clientX, e.clientY);
            this.ctx.stroke();
        });

        canvas.addEventListener('mouseup', () => desenhando = false);
    },

    limparDesenhos() {
        if (this.ctx) {
            const canvas = document.getElementById('presenter-canvas');
            if (canvas) this.ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    },

    toggleNotes() {
        this.showNotesPanel = !this.showNotesPanel;
        this.updateDOM();
    },

    destroy() {
        apresentacaoController.stopTimer();
        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }
        if (this._currentKeyHandler) {
            window.removeEventListener('keydown', this._currentKeyHandler);
            this._currentKeyHandler = null;
        }
        document.body.classList.remove('presentation-mode-active');
        const playerElem = document.getElementById('apresentador-player-root');
        if (playerElem) {
            playerElem.remove();
        }
    },

    onLeave() {
        this.destroy();
    },

    sairPlayer() {
        this.destroy();
        if (window.controller && typeof window.controller.navigate === 'function') {
            window.controller.navigate('apresentacoes');
        }
    }
};

if (typeof window !== 'undefined') {
    window.apresentadorPlayerView = apresentadorPlayerView;
}
