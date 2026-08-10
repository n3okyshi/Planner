import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';
import { aiService } from '../ai-service.js';

export const correcaoAutomaticaView = {
    abaAtiva: 'redacao',

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const html = `
            <div class="animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8);">
                
                <!-- TOP HEADER & TABS TOOLBAR -->
                <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em; display: flex; align-items: center; gap: var(--spacing-2);">
                            <i class="fas fa-magic" style="color: var(--color-primary);"></i> Correção Automática com IA
                        </h2>
                        <p style="font-size: 0.875rem; color: var(--color-slate-500);">Avalie redações com os critérios das 5 competências do ENEM ou digitalize gabaritos.</p>
                    </div>

                    <div class="mode-toggle-group">
                        <button type="button" onclick="correcaoAutomaticaView.mudarAba('redacao')" class="mode-toggle-btn interactive-element ${this.abaAtiva === 'redacao' ? 'mode-toggle-btn--active' : ''}">
                            <i class="fas fa-pen-nib"></i> <span>Redação ENEM</span>
                        </button>
                        <button type="button" onclick="correcaoAutomaticaView.mudarAba('camera')" class="mode-toggle-btn interactive-element ${this.abaAtiva === 'camera' ? 'mode-toggle-btn--active' : ''}">
                            <i class="fas fa-camera"></i> <span>Gabarito por Foto</span>
                        </button>
                    </div>
                </div>

                <!-- MAIN TAB CONTENT -->
                ${this.abaAtiva === 'redacao' ? this.renderRedacao() : this.renderCamera()}
            </div>
        `;

        container.innerHTML = html;
    },

    mudarAba(aba) {
        this.abaAtiva = aba;
        this.render('view-container');
    },

    renderRedacao() {
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: var(--spacing-6); align-items: start;">
                
                <!-- LEFT COLUMN: ESSAY INPUT FORM -->
                <div class="card" style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
                    <div>
                        <label class="form-label">Tema da Proposta de Redação</label>
                        <input type="text" id="tema-redacao" placeholder="Ex: Caminhos para combater a intolerância religiosa no Brasil..." class="form-input">
                    </div>

                    <div>
                        <label class="form-label">Texto da Redação do Estudante</label>
                        <textarea id="texto-redacao" rows="14" class="form-input custom-scrollbar" style="resize: vertical; font-size: 0.9375rem; line-height: 1.6;" placeholder="Cole ou digite a redação completa do aluno aqui..."></textarea>
                    </div>

                    <button type="button" onclick="correcaoAutomaticaView.corrigirRedacao()" class="btn-primary" style="width: 100%; justify-content: center; padding: 0.875rem; font-size: 1rem;">
                        <i class="fas fa-magic"></i> <span>Avaliar 5 Competências</span>
                    </button>
                </div>

                <!-- RIGHT COLUMN: CORRECTION RESULTS PANE -->
                <div id="resultado-redacao" class="card" style="padding: var(--spacing-6); display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 440px; text-align: center; border: 2px dashed var(--color-slate-200); background-color: var(--color-slate-50);">
                    <div style="width: 4rem; height: 4rem; border-radius: var(--radius-full); background-color: var(--color-white); color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 1rem; box-shadow: var(--shadow-sm);">
                        <i class="fas fa-clipboard-check"></i>
                    </div>
                    <h3 style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-700); margin-bottom: 0.25rem;">Aguardando Redação</h3>
                    <p style="font-size: 0.875rem; color: var(--color-slate-500); max-width: 340px;">Insira o tema e o texto do aluno e clique em "Avaliar" para receber notas e comentários detalhados.</p>
                </div>

            </div>
        `;
    },

    async corrigirRedacao() {
        const tema = document.getElementById('tema-redacao').value || "Tema Livre";
        const texto = document.getElementById('texto-redacao').value;
        const resultadoContainer = document.getElementById('resultado-redacao');

        if (!texto || texto.length < 50) return Toast.show("O texto precisa ter ao menos 50 caracteres para avaliação.", "warning");

        resultadoContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 0; color: var(--color-primary); text-align: center;">
                <i class="fas fa-circle-notch fa-spin" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
                <p style="font-size: 1rem; font-weight: 800;">Avaliando competências, sintaxe e repertório sociocultural...</p>
                <span style="font-size: 0.8125rem; color: var(--color-slate-400); margin-top: 0.5rem;">Isso pode levar alguns segundos.</span>
            </div>
        `;

        try {
            const resultado = await aiService.gerarMaterial('correcao_enem', {
                tema,
                texto,
                formato: "Retorne um JSON exato contendo { 'notaTotal': numero, 'competencias': [{ 'numero': 1 a 5, 'nota': numero, 'comentario': 'texto' }], 'feedbackGeral': 'texto' }"
            });

            resultadoContainer.className = "card animate-enter";
            resultadoContainer.style.border = "1px solid var(--color-slate-200)";
            resultadoContainer.style.backgroundColor = "var(--color-white)";
            resultadoContainer.style.textAlign = "left";
            resultadoContainer.style.display = "flex";
            resultadoContainer.style.flexDirection = "column";
            resultadoContainer.style.gap = "var(--spacing-4)";

            resultadoContainer.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--spacing-3); border-bottom: 1px solid var(--color-slate-100);">
                    <div>
                        <h3 style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-800);">Resultado da Avaliação</h3>
                        <p style="font-size: 0.75rem; color: var(--color-slate-400); font-weight: 600;">Critérios oficiais do ENEM (0 a 1000)</p>
                    </div>

                    <div style="text-align: right;">
                        <span style="font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-400); text-transform: uppercase;">Nota Total</span>
                        <div style="font-size: 2rem; font-weight: 900; color: var(--color-primary);">${resultado.notaTotal || 0}</div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: var(--spacing-3);">
                    ${(resultado.competencias || []).map(c => `
                        <div style="padding: var(--spacing-3); background-color: var(--color-slate-50); border: 1px solid var(--color-slate-100); border-radius: var(--radius-xl);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                <span style="font-size: 0.75rem; font-weight: 800; color: var(--color-slate-600); text-transform: uppercase;">Competência ${c.numero}</span>
                                <span class="badge" style="background-color: var(--color-primary-light); color: var(--color-primary); font-weight: 800;">${c.nota} pts</span>
                            </div>
                            <p style="font-size: 0.8125rem; color: var(--color-slate-700); line-height: 1.4; margin: 0;">${c.comentario}</p>
                        </div>
                    `).join('')}
                </div>

                <div style="padding: var(--spacing-4); background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: var(--radius-xl);">
                    <h4 style="font-size: 0.8125rem; font-weight: 800; color: #1e40af; margin-bottom: 0.25rem;">Comentário Geral & Dicas de Melhoria</h4>
                    <p style="font-size: 0.8125rem; color: #1e3a8a; line-height: 1.5; margin: 0;">${resultado.feedbackGeral}</p>
                </div>
            `;

            Toast.show("Redação avaliada com sucesso!", "success");
        } catch (error) {
            console.error(error);
            resultadoContainer.innerHTML = `<div style="padding: 2rem; text-align: center; color: #ef4444;"><p>Erro ao avaliar a redação. Tente novamente.</p></div>`;
            Toast.show("Erro na geração da IA.", "error");
        }
    },

    renderCamera() {
        return `
            <div class="card" style="max-width: 600px; margin: 2rem auto; padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 2px dashed var(--color-slate-200);">
                <div style="width: 4.5rem; height: 4.5rem; border-radius: var(--radius-full); background-color: var(--color-slate-100); color: var(--color-slate-400); display: flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 1rem;">
                    <i class="fas fa-camera-retro"></i>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.5rem;">Leitor de Gabarito por Foto</h3>
                <p style="font-size: 0.875rem; color: var(--color-slate-500); max-width: 400px; margin-bottom: 1.5rem;">Aponte a câmera do celular para o cartão de respostas para corrigir até 50 questões automaticamente por visão computacional.</p>
                <button type="button" disabled class="btn-secondary" style="opacity: 0.6; cursor: not-allowed;">
                    <i class="fas fa-lock"></i> <span>Módulo em Desenvolvimento</span>
                </button>
            </div>
        `;
    }
};

if (typeof window !== 'undefined') window.correcaoAutomaticaView = correcaoAutomaticaView;