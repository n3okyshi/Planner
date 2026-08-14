import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';
import { aiService } from '../ai-service.js';
import { comprimirERedimensionarImagem, processarFiltroDocumentScanner, escapeHTML } from '../utils.js';

export const correcaoAutomaticaView = {
    abaAtiva: 'redacao',
    videoStream: null,
    gabaritoOficial: ['A', 'B', 'C', 'D', 'E', 'A', 'B', 'C', 'D', 'E'],
    resultadoScanner: null,
    filtroScanner: 'scan_otimizado', // 'scan_otimizado' | 'scan_pb' | 'scan_binario' | 'original'
    canvasOriginal: null, // Canvas de backup da imagem original capturada/carregada
    imagemOtimizadaOriginal: null,

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const html = `
            <div class="animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8);">
                
                <!-- TOP HEADER & TABS TOOLBAR -->
                <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em; display: flex; align-items: center; gap: var(--spacing-2);">
                            <i class="fas fa-magic" style="color: var(--color-primary);"></i> Correção Automática & OMR
                        </h2>
                        <p style="font-size: 0.875rem; color: var(--color-slate-500);">Avalie redações com critérios do ENEM ou digitalize gabaritos pela câmera/foto.</p>
                    </div>

                    <div class="mode-toggle-group">
                        <button type="button" onclick="correcaoAutomaticaView.mudarAba('redacao')" class="mode-toggle-btn interactive-element ${this.abaAtiva === 'redacao' ? 'mode-toggle-btn--active' : ''}">
                            <i class="fas fa-pen-nib"></i> <span>Redação ENEM</span>
                        </button>
                        <button type="button" onclick="correcaoAutomaticaView.mudarAba('camera')" class="mode-toggle-btn interactive-element ${this.abaAtiva === 'camera' ? 'mode-toggle-btn--active' : ''}">
                            <i class="fas fa-camera"></i> <span>Leitor de Gabarito (OMR)</span>
                        </button>
                    </div>
                </div>

                <!-- MAIN TAB CONTENT -->
                ${this.abaAtiva === 'redacao' ? this.renderRedacao() : this.renderCamera()}
            </div>
        `;

        container.innerHTML = html;
        if (this.abaAtiva === 'camera' && this.resultadoScanner) {
            this.exibirResultadoOMR();
        }
    },

    mudarAba(aba) {
        this.limparRecursosMemoria();
        this.abaAtiva = aba;
        this.render('view-container');
    },

    limparRecursosMemoria() {
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }
        this.canvasOriginal = null;
        const canvas = document.getElementById('omr-canvas-scanner');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = 0;
            canvas.height = 0;
        }
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
            const resultado = await aiService.avaliarRedacaoEnem({ tema, texto });

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
                        <div style="font-size: 2rem; font-weight: 900; color: var(--color-primary);">${resultado.notaTotal !== undefined ? resultado.notaTotal : 0} pts</div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: var(--spacing-3);">
                    ${(resultado.competencias || []).map(c => `
                        <div style="padding: var(--spacing-3); background-color: var(--color-slate-50); border: 1px solid var(--color-slate-100); border-radius: var(--radius-xl);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                <span style="font-size: 0.75rem; font-weight: 800; color: var(--color-slate-700); text-transform: uppercase;">
                                    Competência ${c.numero}${c.nome ? `: ${c.nome}` : ''}
                                </span>
                                <span class="badge" style="background-color: var(--color-primary-light); color: var(--color-primary); font-weight: 800;">${c.nota || 0} pts</span>
                            </div>
                            <p style="font-size: 0.8125rem; color: var(--color-slate-700); line-height: 1.4; margin: 0;">${c.comentario || 'Sem observações.'}</p>
                        </div>
                    `).join('')}
                </div>

                <div style="padding: var(--spacing-4); background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: var(--radius-xl);">
                    <h4 style="font-size: 0.8125rem; font-weight: 800; color: #1e40af; margin-bottom: 0.25rem;">Comentário Geral & Dicas de Melhoria</h4>
                    <p style="font-size: 0.8125rem; color: #1e3a8a; line-height: 1.5; margin: 0;">${resultado.feedbackGeral || 'Avaliação concluída.'}</p>
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
        const totalQ = this.gabaritoOficial.length;
        return `
            <!-- GUIA RÁPIDO & AÇÕES DE SUPORTE -->
            <div class="card" style="padding: 1.25rem 1.5rem; background: linear-gradient(135deg, #eef2ff, #f8fafc); border: 1px solid #c7d2fe; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 2.75rem; height: 2.75rem; border-radius: 0.75rem; background: var(--color-primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);">
                        <i class="fas fa-camera"></i>
                    </div>
                    <div>
                        <h3 style="font-size: 1rem; font-weight: 800; color: #1e1b4b; margin: 0;">Como Utilizar a Correção Automática (OMR)</h3>
                        <p style="font-size: 0.8125rem; color: #4338ca; margin: 0.25rem 0 0 0;">
                            <strong>1.</strong> Ajuste a quantidade de questões &bull; 
                            <strong>2.</strong> Imprima as folhas A4 &bull; 
                            <strong>3.</strong> Defina o gabarito &bull; 
                            <strong>4.</strong> Fotografe e lance.
                        </p>
                    </div>
                </div>

                <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                    <button type="button" onclick="correcaoAutomaticaView.imprimirCartaoResposta()" class="btn-secondary" style="padding: 0.625rem 1.25rem; font-size: 0.8125rem; font-weight: 800; background: white; border: 1px solid #c7d2fe; color: #4338ca; display: inline-flex; align-items: center; gap: 0.5rem;" title="Gerar e Imprimir Folhas de Cartão-Resposta A4 para os alunos">
                        <i class="fas fa-print" style="color: #4f46e5;"></i> <span id="omr-print-btn-text">Imprimir Cartões-Resposta (${totalQ}Q)</span>
                    </button>
                    <button type="button" onclick="correcaoAutomaticaView.testarGabaritoExemplo()" class="btn-primary" style="padding: 0.625rem 1.25rem; font-size: 0.8125rem; font-weight: 800; background: linear-gradient(135deg, #059669, #047857); border: none; display: inline-flex; align-items: center; gap: 0.5rem;" title="Executar teste rápido com folha simulada">
                        <i class="fas fa-vial"></i> <span id="omr-test-btn-text">Testar Exemplo (${totalQ}Q)</span>
                    </button>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--spacing-6); align-items: start;">
                
                <!-- GABARITO OFICIAL & CONFIGURAÇÕES -->
                <div class="card" style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
                    
                    <!-- CONFIGURADOR DE QUANTIDADE DE QUESTÕES -->
                    <div style="background: #f8fafc; padding: 1rem; border-radius: var(--radius-xl); border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                            <label style="font-size: 0.8125rem; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 0.35rem;">
                                <i class="fas fa-list-ol text-indigo-600"></i> Quantidade de Questões da Prova:
                            </label>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <input type="number" id="omr-qtd-questoes" min="1" max="100" value="${totalQ}" 
                                       onchange="correcaoAutomaticaView.alterarQuantidadeQuestoes(this.value)" 
                                       class="form-input" 
                                       style="width: 5.5rem; text-align: center; font-size: 1rem; font-weight: 800; color: var(--color-primary); padding: 0.35rem 0.5rem; border-radius: var(--radius-lg); background: white;">
                                <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">(1 a 100)</span>
                            </div>
                        </div>

                        <!-- ATALHOS RÁPIDOS DE VOLUME -->
                        <div id="omr-atalhos-container" style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                            <span style="font-size: 0.6875rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-right: 0.25rem;">Atalhos:</span>
                            ${[5, 10, 15, 20, 30, 45, 50, 90, 100].map(q => `
                                <button type="button" data-qtd="${q}" onclick="correcaoAutomaticaView.alterarQuantidadeQuestoes(${q})" 
                                        style="padding: 0.2rem 0.5rem; font-size: 0.6875rem; font-weight: 800; border-radius: 0.375rem; cursor: pointer; border: 1px solid ${totalQ === q ? '#4f46e5' : '#cbd5e1'}; background: ${totalQ === q ? '#4f46e5' : 'white'}; color: ${totalQ === q ? 'white' : '#475569'}; transition: all 120ms ease;">
                                    ${q}Q ${q === 90 ? '(ENEM)' : ''}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h3 id="omr-gabarito-title-count" style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-800); display: flex; align-items: center; gap: 0.5rem; margin: 0;">
                                <i class="fas fa-check-double text-indigo-600"></i> Gabarito Oficial (${totalQ} Questões)
                            </h3>
                            <p style="font-size: 0.75rem; color: var(--color-slate-500); margin: 0.25rem 0 0 0;">
                                Clique nas alternativas corretas da chave:
                            </p>
                        </div>
                        <button type="button" onclick="correcaoAutomaticaView.preencherGabaritoRapido()" class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.6875rem;" title="Preencher aleatoriamente para testes">
                            <i class="fas fa-random"></i> Aleatório
                        </button>
                    </div>

                    <!-- GRADE COM SCROLLBAR DINÂMICA (ATUALIZADA SEM FULL-PAGE RELOAD) -->
                    <div id="omr-gabarito-oficial-grid" class="custom-scrollbar" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.5rem; background: #f8fafc; padding: 0.875rem; border-radius: var(--radius-xl); border: 1px solid #e2e8f0; max-height: 380px; overflow-y: auto;">
                        ${this.obterHTMLGradeGabaritoOficial()}
                    </div>

                    <!-- MÉTODOS DE CAPTURA -->
                    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                        <button type="button" onclick="correcaoAutomaticaView.iniciarCamera()" class="btn-primary" style="flex: 1; justify-content: center; padding: 0.75rem;">
                            <i class="fas fa-video"></i> <span>Abrir Câmera</span>
                        </button>
                        <label class="btn-secondary" style="flex: 1; justify-content: center; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem;">
                            <i class="fas fa-file-image"></i> <span>Enviar Foto do Aluno</span>
                            <input type="file" accept="image/*" style="display: none;" onchange="correcaoAutomaticaView.carregarFotoArquivo(this)">
                        </label>
                    </div>
                </div>

                <!-- SCANNER VIEWPORT / PREVIEW -->
                <div class="card" style="padding: var(--spacing-6); display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 420px; background-color: var(--color-slate-900); border-radius: var(--radius-2xl); position: relative; overflow: hidden; box-shadow: var(--shadow-lg);">
                    
                    <div style="position: relative; width: 100%; display: flex; justify-content: center; align-items: center; min-height: 300px; background: #000; border-radius: var(--radius-xl); overflow: hidden;">
                        <video id="omr-video-feed" playsinline autoplay style="width: 100%; height: auto; max-height: 70vh; object-fit: contain; border-radius: var(--radius-xl); display: none; background: #000;"></video>
                        
                        <!-- MOLDURA DE MIRA E ENQUADRAMENTO DA CÂMERA DE ALTA PRECISÃO -->
                        <div id="omr-camera-viewfinder" class="omr-viewfinder-overlay" style="display: none;">
                            <div class="omr-viewfinder-corner omr-viewfinder-tl"></div>
                            <div class="omr-viewfinder-corner omr-viewfinder-tr"></div>
                            <div class="omr-viewfinder-corner omr-viewfinder-bl"></div>
                            <div class="omr-viewfinder-corner omr-viewfinder-br"></div>
                            <div class="omr-viewfinder-tip">
                                <i class="fas fa-expand-arrows-alt"></i> Enquadre os 4 cantos ⬛ do cartão aqui
                            </div>
                        </div>

                        <canvas id="omr-canvas-scanner" style="width: 100%; height: auto; max-height: 70vh; object-fit: contain; border-radius: var(--radius-xl); display: none; background: #000;"></canvas>
                    </div>

                    <div id="omr-placeholder-view" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #94a3b8; padding: 2rem;">
                        <div style="width: 4.5rem; height: 4.5rem; border-radius: 50%; background: rgba(56, 189, 248, 0.15); display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #38bdf8; margin-bottom: 1rem; border: 1px solid rgba(56, 189, 248, 0.3);">
                            <i class="fas fa-qrcode"></i>
                        </div>
                        <h4 style="color: white; font-size: 1.125rem; font-weight: 800; margin: 0 0 0.5rem 0;">Aguardando Imagem do Cartão</h4>
                        <p style="font-size: 0.8125rem; max-width: 320px; margin: 0; color: #cbd5e1; line-height: 1.5;">
                            Tire uma foto ou carregue a folha de respostas preenchida com caneta azul/preta pelo aluno (${totalQ} questões).
                        </p>
                    </div>

                    <div id="omr-camera-controls" style="display: none; margin-top: 1rem; width: 100%; justify-content: center; gap: 0.75rem;">
                        <button type="button" onclick="correcaoAutomaticaView.capturarEAnalisar()" class="btn-primary" style="background: #10b981; border-color: #10b981; font-weight: 800; padding: 0.75rem 1.5rem;">
                            <i class="fas fa-camera"></i> Capturar & Corrigir Agora
                        </button>
                    </div>

                    <!-- BARRA DE SELEÇÃO DE FILTROS DE SCANNER (ATIVADA APÓS CAPTURA/FOTO) -->
                    <div id="omr-filter-toolbar" class="omr-filter-toolbar" style="display: none;">
                        <span style="font-size: 0.75rem; font-weight: 800; color: #94a3b8; margin-right: 0.25rem;">
                            <i class="fas fa-sliders-h text-indigo-400"></i> Filtro:
                        </span>
                        <button type="button" onclick="correcaoAutomaticaView.trocarFiltroScanner('scan_otimizado')" id="omr-btn-filtro-scan_otimizado" class="omr-filter-btn ${this.filtroScanner === 'scan_otimizado' ? 'active' : ''}" title="Scanner Inteligente (Remove sombras e limpa fundo)">
                            ✨ Inteligente
                        </button>
                        <button type="button" onclick="correcaoAutomaticaView.trocarFiltroScanner('scan_pb')" id="omr-btn-filtro-scan_pb" class="omr-filter-btn ${this.filtroScanner === 'scan_pb' ? 'active' : ''}" title="Scanner P&B (Alto contraste documental)">
                            📄 Scanner P&B
                        </button>
                        <button type="button" onclick="correcaoAutomaticaView.trocarFiltroScanner('scan_binario')" id="omr-btn-filtro-scan_binario" class="omr-filter-btn ${this.filtroScanner === 'scan_binario' ? 'active' : ''}" title="Binarizado OMR (Preto no branco estrito)">
                            🔲 Binarizado
                        </button>
                        <button type="button" onclick="correcaoAutomaticaView.trocarFiltroScanner('original')" id="omr-btn-filtro-original" class="omr-filter-btn ${this.filtroScanner === 'original' ? 'active' : ''}" title="Foto Original sem filtro">
                            📷 Original
                        </button>
                        <button type="button" onclick="correcaoAutomaticaView.reanalisarComFiltroAtual()" class="omr-filter-btn" style="background: rgba(16, 185, 129, 0.25); color: #34d399; border-color: rgba(16, 185, 129, 0.5); margin-left: 0.25rem;" title="Reprocessar e reanalisar com o filtro selecionado">
                            <i class="fas fa-sync-alt"></i> Reanalisar
                        </button>
                    </div>
                </div>

            </div>

            <!-- RESULTADO DA LEITURA DO GABARITO -->
            <div id="omr-resultado-container" style="display: none; margin-top: var(--spacing-6);" class="animate-enter">
                <!-- Injetado dinamicamente -->
            </div>
        `;
    },

    /**
     * Retorna a string HTML para a grade do gabarito oficial
     */
    obterHTMLGradeGabaritoOficial() {
        const letras = ['A', 'B', 'C', 'D', 'E'];
        return this.gabaritoOficial.map((gab, idx) => `
            <div id="omr-gab-item-${idx}" style="display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 0.5rem; background: white; border-radius: 0.5rem; border: 1px solid #cbd5e1;">
                <span style="font-size: 0.75rem; font-weight: 800; color: #475569;">Q${(idx + 1).toString().padStart(2, '0')}</span>
                <div style="display: flex; gap: 0.15rem;">
                    ${letras.map(l => `
                        <button type="button" onclick="correcaoAutomaticaView.definirGabaritoItem(${idx}, '${l}')" 
                                style="width: 1.35rem; height: 1.35rem; border-radius: 0.25rem; font-size: 0.625rem; font-weight: 800; cursor: pointer; border: 1px solid ${gab === l ? '#4f46e5' : '#cbd5e1'}; background: ${gab === l ? '#4f46e5' : '#f8fafc'}; color: ${gab === l ? '#ffffff' : '#64748b'}; transition: all 100ms ease;">
                            ${l}
                        </button>
                    `).join('')}
                </div>
            </div>
        `).join('');
    },

    /**
     * Atualiza a grade do gabarito oficial no DOM sem re-renderizar a tela toda (zero scroll jump)
     */
    renderGradeGabaritoOficial() {
        const grid = document.getElementById('omr-gabarito-oficial-grid');
        if (!grid) return;
        grid.innerHTML = this.obterHTMLGradeGabaritoOficial();
    },

    alterarQuantidadeQuestoes(novaQtd) {
        const qtd = Math.max(1, Math.min(100, parseInt(novaQtd, 10) || 10));
        const letras = ['A', 'B', 'C', 'D', 'E'];
        const novoGabarito = [];
        for (let i = 0; i < qtd; i++) {
            novoGabarito.push(this.gabaritoOficial[i] || letras[i % letras.length]);
        }
        this.gabaritoOficial = novoGabarito;

        // Atualização suave de elementos no DOM
        const inputQtd = document.getElementById('omr-qtd-questoes');
        if (inputQtd) inputQtd.value = qtd;

        const titleCount = document.getElementById('omr-gabarito-title-count');
        if (titleCount) titleCount.innerHTML = `<i class="fas fa-check-double text-indigo-600"></i> Gabarito Oficial (${qtd} Questões)`;

        const printBtnText = document.getElementById('omr-print-btn-text');
        if (printBtnText) printBtnText.innerText = `Imprimir Cartões-Resposta (${qtd}Q)`;

        const testBtnText = document.getElementById('omr-test-btn-text');
        if (testBtnText) testBtnText.innerText = `Testar Exemplo (${qtd}Q)`;

        const atalhosContainer = document.getElementById('omr-atalhos-container');
        if (atalhosContainer) {
            atalhosContainer.querySelectorAll('button').forEach(btn => {
                const btnQ = parseInt(btn.dataset.qtd, 10);
                const isActive = (btnQ === qtd);
                btn.style.borderColor = isActive ? '#4f46e5' : '#cbd5e1';
                btn.style.background = isActive ? '#4f46e5' : 'white';
                btn.style.color = isActive ? 'white' : '#475569';
            });
        }

        this.renderGradeGabaritoOficial();

        // Se houver scanner ativo, sincroniza os detalhes e recalcula métricas
        if (this.resultadoScanner && Array.isArray(this.resultadoScanner.detalhes)) {
            const novosDetalhes = [];
            for (let i = 0; i < qtd; i++) {
                const existing = this.resultadoScanner.detalhes[i];
                if (existing) {
                    existing.gabarito = this.gabaritoOficial[i];
                    novosDetalhes.push(existing);
                } else {
                    novosDetalhes.push({
                        questao: i + 1,
                        gabarito: this.gabaritoOficial[i],
                        resposta: 'EM_BRANCO',
                        status: 'em_branco',
                        isEmBranco: true,
                        isAnulada: false,
                        correta: false,
                        confianca: 'baixa',
                        editadoManualmente: false
                    });
                }
            }
            this.resultadoScanner.detalhes = novosDetalhes;
            this.resultadoScanner.totalQ = qtd;
            this.recalcularMetricasScanner();
            this.exibirResultadoOMR();
        }

        Toast.show(`Gabarito ajustado para ${qtd} questões.`, "info", 1200);
    },

    definirGabaritoItem(index, letra) {
        this.gabaritoOficial[index] = letra;

        // Atualiza pontualmente os botões da linha no DOM sem recarregar a página
        const row = document.getElementById(`omr-gab-item-${index}`);
        if (row) {
            const letras = ['A', 'B', 'C', 'D', 'E'];
            const btns = row.querySelectorAll('button');
            btns.forEach((btn, i) => {
                const l = letras[i];
                const isSelected = (l === letra);
                btn.style.borderColor = isSelected ? '#4f46e5' : '#cbd5e1';
                btn.style.background = isSelected ? '#4f46e5' : '#f8fafc';
                btn.style.color = isSelected ? '#ffffff' : '#64748b';
            });
        } else {
            this.renderGradeGabaritoOficial();
        }

        // Se já existir resultado escaneado, atualiza o gabarito da questão e recalcula instantaneamente
        if (this.resultadoScanner && Array.isArray(this.resultadoScanner.detalhes)) {
            if (this.resultadoScanner.detalhes[index]) {
                this.resultadoScanner.detalhes[index].gabarito = letra;
            }
            this.recalcularMetricasScanner();
            this.atualizarPainelResultadoOMR(index + 1);
        }
    },

    preencherGabaritoRapido() {
        const letras = ['A', 'B', 'C', 'D', 'E'];
        this.gabaritoOficial = this.gabaritoOficial.map(() => letras[Math.floor(Math.random() * letras.length)]);
        this.renderGradeGabaritoOficial();

        if (this.resultadoScanner && Array.isArray(this.resultadoScanner.detalhes)) {
            this.recalcularMetricasScanner();
            this.exibirResultadoOMR();
        }
        Toast.show(`Gabarito de ${this.gabaritoOficial.length} questões preenchido com sucesso!`, "info", 1200);
    },

    async iniciarCamera() {
        const video = document.getElementById('omr-video-feed');
        const placeholder = document.getElementById('omr-placeholder-view');
        const controls = document.getElementById('omr-camera-controls');
        const canvas = document.getElementById('omr-canvas-scanner');
        const viewfinder = document.getElementById('omr-camera-viewfinder');
        const filterBar = document.getElementById('omr-filter-toolbar');

        if (!video || !placeholder) return;

        try {
            if (this.videoStream) {
                this.videoStream.getTracks().forEach(t => t.stop());
            }
            this.videoStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" }, width: { ideal: 1920, max: 3840 }, height: { ideal: 1080, max: 2160 } }
            });

            video.srcObject = this.videoStream;
            video.style.display = 'block';
            placeholder.style.display = 'none';
            if (canvas) canvas.style.display = 'none';
            if (viewfinder) viewfinder.style.display = 'flex';
            if (controls) controls.style.display = 'flex';
            if (filterBar) filterBar.style.display = 'none';

            Toast.show("Câmera ativada. Enquadre o cartão-resposta.", "info");
        } catch (err) {
            console.error("Erro ao acessar câmera:", err);
            Toast.show("Não foi possível acessar a câmera. Verifique as permissões do navegador.", "error");
        }
    },

    async carregarFotoArquivo(input) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];
        input.value = ''; // Libera o ponteiro do arquivo no DOM imediatamente para descarte do buffer original

        const video = document.getElementById('omr-video-feed');
        const placeholder = document.getElementById('omr-placeholder-view');
        const controls = document.getElementById('omr-camera-controls');
        const canvas = document.getElementById('omr-canvas-scanner');
        const viewfinder = document.getElementById('omr-camera-viewfinder');
        const filterBar = document.getElementById('omr-filter-toolbar');

        if (video) video.style.display = 'none';
        if (placeholder) placeholder.style.display = 'none';
        if (controls) controls.style.display = 'none';
        if (viewfinder) viewfinder.style.display = 'none';
        if (filterBar) filterBar.style.display = 'flex';

        try {
            Toast.show("Otimizando e preparando imagem...", "info", 1500);
            const otimizada = await comprimirERedimensionarImagem(file, { maxDimensao: 1400, qualidade: 0.85 });

            if (canvas) {
                canvas.style.display = 'block';
                canvas.width = otimizada.largura;
                canvas.height = otimizada.altura;
                const ctx = canvas.getContext('2d');
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // Cria cópia de backup da imagem pura para alternância fluida de filtros
                    const backupCanvas = document.createElement('canvas');
                    backupCanvas.width = canvas.width;
                    backupCanvas.height = canvas.height;
                    const bCtx = backupCanvas.getContext('2d');
                    bCtx.drawImage(canvas, 0, 0);
                    this.canvasOriginal = backupCanvas;

                    // Aplica o filtro de scanner ativo
                    if (this.filtroScanner !== 'original') {
                        processarFiltroDocumentScanner(canvas, this.filtroScanner);
                    }

                    this.processarImagemCanvas(canvas);
                };
                img.src = otimizada.base64;
            }
        } catch (err) {
            console.error("Erro ao carregar e comprimir foto:", err);
            Toast.show("Erro ao processar imagem. Tente novamente.", "error");
        }
    },

    async capturarEAnalisar() {
        const video = document.getElementById('omr-video-feed');
        const canvas = document.getElementById('omr-canvas-scanner');
        const viewfinder = document.getElementById('omr-camera-viewfinder');
        const filterBar = document.getElementById('omr-filter-toolbar');
        if (!video || !canvas) return;

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        video.style.display = 'none';
        canvas.style.display = 'block';
        if (viewfinder) viewfinder.style.display = 'none';
        if (filterBar) filterBar.style.display = 'flex';

        if (this.videoStream) {
            this.videoStream.getTracks().forEach(t => t.stop());
            this.videoStream = null;
        }
        const controls = document.getElementById('omr-camera-controls');
        if (controls) controls.style.display = 'none';

        try {
            // Cria cópia de backup não filtrada para troca instantânea de filtros
            const backupCanvas = document.createElement('canvas');
            backupCanvas.width = canvas.width;
            backupCanvas.height = canvas.height;
            const bCtx = backupCanvas.getContext('2d');
            bCtx.drawImage(canvas, 0, 0);
            this.canvasOriginal = backupCanvas;

            // Aplica o filtro de scanner ativo
            if (this.filtroScanner !== 'original') {
                processarFiltroDocumentScanner(canvas, this.filtroScanner);
            }

            this.processarImagemCanvas(canvas);
        } catch (err) {
            console.error("Erro no processamento da captura da câmera:", err);
            this.processarImagemCanvas(canvas);
        }
    },

    trocarFiltroScanner(modo) {
        this.filtroScanner = modo;

        // Atualiza botões no DOM
        ['scan_otimizado', 'scan_pb', 'scan_binario', 'original'].forEach(f => {
            const btn = document.getElementById(`omr-btn-filtro-${f}`);
            if (btn) {
                if (f === modo) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        });

        const canvas = document.getElementById('omr-canvas-scanner');
        if (canvas && this.canvasOriginal) {
            canvas.width = this.canvasOriginal.width;
            canvas.height = this.canvasOriginal.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this.canvasOriginal, 0, 0);

            if (modo !== 'original') {
                processarFiltroDocumentScanner(canvas, modo);
            }
            Toast.show(`Filtro "${this.obterNomeFiltro(modo)}" aplicado na imagem.`, "info", 1000);
        }
    },

    obterNomeFiltro(modo) {
        switch (modo) {
            case 'scan_otimizado': return 'Scanner Inteligente';
            case 'scan_pb': return 'Scanner P&B';
            case 'scan_binario': return 'Binarizado OMR';
            default: return 'Foto Original';
        }
    },

    reanalisarComFiltroAtual() {
        const canvas = document.getElementById('omr-canvas-scanner');
        if (!canvas || canvas.width === 0) return Toast.show("Nenhuma imagem disponível para reanalisar.", "warning");
        this.processarImagemCanvas(canvas);
    },

    /**
     * Executa teste simulado instantâneo com geração de folha preenchida no Canvas seguindo o padrão oficial OMR
     */
    testarGabaritoExemplo() {
        const canvas = document.getElementById('omr-canvas-scanner');
        const video = document.getElementById('omr-video-feed');
        const placeholder = document.getElementById('omr-placeholder-view');
        const controls = document.getElementById('omr-camera-controls');
        const filterBar = document.getElementById('omr-filter-toolbar');
        const viewfinder = document.getElementById('omr-camera-viewfinder');

        if (video) video.style.display = 'none';
        if (placeholder) placeholder.style.display = 'none';
        if (controls) controls.style.display = 'none';
        if (viewfinder) viewfinder.style.display = 'none';
        if (filterBar) filterBar.style.display = 'flex';

        if (canvas) {
            const totalQ = this.gabaritoOficial.length;
            canvas.style.display = 'block';

            // Determina a quantidade de colunas (máximo 4 colunas em todas as situações)
            let colunas = 1;
            if (totalQ > 50) colunas = 4;
            else if (totalQ > 30) colunas = 3;
            else if (totalQ > 15) colunas = 2;
            else colunas = totalQ > 8 ? 2 : 1;

            const porColuna = Math.ceil(totalQ / colunas);

            // Calibra dimensões HD do Canvas
            canvas.width = Math.max(680, colunas * 195 + 60);
            canvas.height = Math.max(480, 150 + porColuna * 28 + 35);
            const ctx = canvas.getContext('2d');

            // Fundo da folha (branco puro)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Borda externa preta grossa
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

            // Função para desenhar marcador fiduciário idêntico ao padrão OMR (⬛ com anel concêntrico)
            const desenharMarcadorFiduciario = (x, y) => {
                ctx.fillStyle = '#000000';
                ctx.fillRect(x, y, 20, 20);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x + 4, y + 4, 12, 12);
                ctx.fillStyle = '#000000';
                ctx.fillRect(x + 7, y + 7, 6, 6);
            };

            desenharMarcadorFiduciario(12, 12); // TL
            desenharMarcadorFiduciario(canvas.width - 32, 12); // TR
            desenharMarcadorFiduciario(12, canvas.height - 32); // BL
            desenharMarcadorFiduciario(canvas.width - 32, canvas.height - 32); // BR

            // Cabeçalho da folha
            ctx.fillStyle = '#000000';
            ctx.font = '900 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`PLANNER PRO - CARTÃO-RESPOSTA OMR (${totalQ}Q)`, 42, 30);

            ctx.font = '700 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#333333';
            ctx.fillText('Preencha totalmente a bolha com caneta preta ou azul escura (ex: ●)', 42, 45);

            // Badge no topo direito
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(canvas.width - 145, 18, 105, 24);
            ctx.fillStyle = '#000000';
            ctx.font = '900 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('LEITURA ÓTICA', canvas.width - 92, 34);
            ctx.textAlign = 'left';

            // Linha divisória do cabeçalho
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(38, 54);
            ctx.lineTo(canvas.width - 38, 54);
            ctx.stroke();

            // Metadados do Estudante
            ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#000000';
            ctx.fillText('Estudante: __________________________________________________', 42, 72);
            ctx.fillText('Turma: 9º Ano A    Data: ' + new Date().toLocaleDateString('pt-BR'), canvas.width - 250, 72);

            // Linha fina separando metadados
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(38, 84);
            ctx.lineTo(canvas.width - 38, 84);
            ctx.stroke();

            // Respostas simuladas: acerta ~80% das questões, erra algumas e deixa 1 em branco
            const letras = ['A', 'B', 'C', 'D', 'E'];
            const respostasAluno = [];
            for (let q = 0; q < totalQ; q++) {
                if (q === 1) {
                    respostasAluno.push('EM_BRANCO'); // Simula questão em branco
                } else if (q % 6 === 0 && q > 0) {
                    const gab = this.gabaritoOficial[q];
                    const erradas = letras.filter(l => l !== gab);
                    respostasAluno.push(erradas[0]);
                } else {
                    respostasAluno.push(this.gabaritoOficial[q]);
                }
            }

            // Renderiza as colunas de questões (máximo 4 colunas)
            const margemEsq = 40;
            const espacoUtilX = canvas.width - 80;
            const larguraCol = espacoUtilX / colunas;
            const topGrid = 98;
            const alturaLinha = 26;

            for (let q = 0; q < totalQ; q++) {
                const colIdx = Math.floor(q / porColuna);
                const rowIdx = q % porColuna;
                const colX = margemEsq + colIdx * larguraCol;
                const rowY = topGrid + rowIdx * alturaLinha;
                const colW = larguraCol - 12;

                // Caixa da linha da questão
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(colX, rowY - 14, colW, 23);
                ctx.strokeStyle = '#999999';
                ctx.lineWidth = 1;
                ctx.strokeRect(colX, rowY - 14, colW, 23);

                // Número da questão (Q01, Q02, ...)
                ctx.fillStyle = '#000000';
                ctx.font = '900 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(`Q${(q + 1).toString().padStart(2, '0')}`, colX + 6, rowY + 2);

                const respAluno = respostasAluno[q];
                const startBolhas = colX + 38;
                const espacoBolhas = (colW - 44) / 5;

                letras.forEach((l, idxLetra) => {
                    const bx = startBolhas + idxLetra * espacoBolhas + espacoBolhas / 2;
                    const by = rowY - 2.5;
                    const isMarcada = (respAluno !== 'EM_BRANCO' && l === respAluno);

                    ctx.beginPath();
                    ctx.arc(bx, by, 8.5, 0, Math.PI * 2);

                    if (isMarcada) {
                        ctx.fillStyle = '#0f172a'; // Tinta escura de caneta
                        ctx.fill();
                        ctx.strokeStyle = '#000000';
                        ctx.lineWidth = 1.4;
                        ctx.stroke();
                        ctx.fillStyle = '#ffffff';
                    } else {
                        ctx.fillStyle = '#ffffff';
                        ctx.fill();
                        ctx.strokeStyle = '#000000';
                        ctx.lineWidth = 1.3;
                        ctx.stroke();
                        ctx.fillStyle = '#000000';
                    }

                    ctx.font = '900 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(l, bx, by);
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'alphabetic';
                });
            }

            // Linha inferior de sincronismo OMR
            const ySinc = canvas.height - 22;
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(38, ySinc - 10);
            ctx.lineTo(canvas.width - 38, ySinc - 10);
            ctx.stroke();
            ctx.setLineDash([]); // Restaura linha sólida

            ctx.font = '700 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#444444';
            ctx.fillText('■ ■ ■ ■ ■ (Marca de Sincronismo OMR)', 42, ySinc);
            ctx.textAlign = 'right';
            ctx.fillText(`CÓDIGO: OMR-Q${totalQ}-PPRO`, canvas.width - 42, ySinc);
            ctx.textAlign = 'left';

            // Cria cópia de backup do canvas não filtrado para o seletor de filtros
            const backupCanvas = document.createElement('canvas');
            backupCanvas.width = canvas.width;
            backupCanvas.height = canvas.height;
            const bCtx = backupCanvas.getContext('2d');
            bCtx.drawImage(canvas, 0, 0);
            this.canvasOriginal = backupCanvas;

            // Aplica o filtro de scanner ativo caso não seja original
            if (this.filtroScanner !== 'original') {
                processarFiltroDocumentScanner(canvas, this.filtroScanner);
            }

            this.processarImagemCanvas(canvas, respostasAluno);
            Toast.show(`Gabarito oficial de ${totalQ} questões renderizado com marcadores de ancoragem!`, "success");
        }
    },

    async processarImagemCanvas(canvas, respostasForcadas = null, imagemOtimizada = null) {
        const container = document.getElementById('omr-resultado-container');
        const totalQ = this.gabaritoOficial.length;

        // Se o container de resultados existir, exibe estado de carregamento profissional com badge de otimização
        if (container) {
            container.style.display = 'block';
            container.innerHTML = `
                <div class="card animate-enter" style="padding: 2.5rem 1.5rem; text-align: center; background: white; border: 1px solid var(--color-slate-200); box-shadow: var(--shadow-md);">
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem;">
                        <div style="width: 3.5rem; height: 3.5rem; border-radius: 50%; background: #eef2ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);">
                            <i class="fas fa-circle-notch fa-spin"></i>
                        </div>
                        <div>
                            <h4 style="font-size: 1.125rem; font-weight: 800; color: #1e293b; margin: 0 0 0.25rem 0;">
                                🤖 IA Vision Analisando Cartão-Resposta...
                            </h4>
                            <p style="font-size: 0.8125rem; color: #64748b; margin: 0; max-width: 420px; line-height: 1.5;">
                                Identificando marcações das bolhas com filtro "${this.obterNomeFiltro(this.filtroScanner)}", verificando questões em branco e comparando com o gabarito oficial (${totalQ} questões)...
                            </p>
                            ${imagemOtimizada && imagemOtimizada.percentualReducao > 0 ? `
                                <div style="display: flex; justify-content: center; margin-top: 0.75rem;">
                                    <span class="badge" style="background: #ecfdf5; color: #059669; font-weight: 800; font-size: 0.75rem; padding: 0.25rem 0.75rem; border-radius: 9999px; border: 1px solid #a7f3d0;">
                                        <i class="fas fa-bolt"></i> Imagem otimizada: ${imagemOtimizada.tamanhoOriginalKB.toFixed(0)} KB → ${imagemOtimizada.tamanhoFinalKB.toFixed(0)} KB (-${imagemOtimizada.percentualReducao}%)
                                    </span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        try {
            let mapaRespostasIA = null;
            let observacoesIA = "";

            if (respostasForcadas && Array.isArray(respostasForcadas)) {
                // Fluxo de Teste Exemplo / Simulado instantâneo
                mapaRespostasIA = {};
                respostasForcadas.forEach((resp, idx) => {
                    mapaRespostasIA[idx + 1] = {
                        resposta: resp || 'EM_BRANCO',
                        status: (resp === 'EM_BRANCO' || !resp) ? 'em_branco' : (resp === 'ANULADA' ? 'anulada' : 'marcada'),
                        confianca: 'alta'
                    };
                });
                observacoesIA = "Teste simulado executado com sucesso.";
            } else {
                // Fluxo Real com Foto da Câmera ou Arquivo: Otimiza imagem e invoca o Gemini Vision
                Toast.show("Enviando imagem tratada pelo scanner para análise óptica com IA...", "info");

                let base64Data;
                if (imagemOtimizada && imagemOtimizada.base64) {
                    base64Data = imagemOtimizada.base64;
                } else {
                    const otimizada = await comprimirERedimensionarImagem(canvas, { maxDimensao: 1400, qualidade: 0.85 });
                    base64Data = otimizada.base64;
                }

                const resultadoIA = await aiService.analisarCartaoRespostaOMR({
                    imagemBase64: base64Data,
                    mimeType: 'image/jpeg',
                    totalQuestoes: totalQ,
                    gabaritoOficial: this.gabaritoOficial
                });

                if (resultadoIA && Array.isArray(resultadoIA.respostas)) {
                    mapaRespostasIA = {};
                    resultadoIA.respostas.forEach(r => {
                        const num = parseInt(r.questao, 10);
                        if (!isNaN(num)) {
                            let respStr = String(r.resposta || '').toUpperCase().trim();
                            mapaRespostasIA[num] = {
                                resposta: respStr,
                                status: r.status || (respStr === 'EM_BRANCO' ? 'em_branco' : respStr === 'ANULADA' ? 'anulada' : 'marcada'),
                                confianca: r.confianca || 'alta',
                                motivo: r.motivo || ''
                            };
                        }
                    });
                    observacoesIA = resultadoIA.observacoes || "";
                } else {
                    throw new Error("A IA não retornou a lista de respostas estruturada.");
                }
            }

            // Constrói os detalhes iniciais
            const detalhes = this.gabaritoOficial.map((gab, idx) => {
                const questaoNum = idx + 1;
                const itemDetectado = mapaRespostasIA && mapaRespostasIA[questaoNum]
                    ? mapaRespostasIA[questaoNum]
                    : { resposta: 'EM_BRANCO', status: 'em_branco', confianca: 'baixa', motivo: '' };

                let resp = (itemDetectado.resposta || 'EM_BRANCO').toUpperCase().trim();
                if (resp === '-' || resp === '' || resp === 'BLANK' || resp === 'VAZIO' || resp === 'NULO') {
                    resp = 'EM_BRANCO';
                }

                return {
                    questao: questaoNum,
                    gabarito: gab,
                    resposta: resp,
                    status: 'marcada',
                    isEmBranco: false,
                    isAnulada: false,
                    correta: false,
                    confianca: itemDetectado.confianca || 'alta',
                    motivo: itemDetectado.motivo || '',
                    editadoManualmente: false
                };
            });

            this.resultadoScanner = {
                totalQ,
                acertos: 0,
                erros: 0,
                emBranco: 0,
                anuladas: 0,
                notaFinal: 0,
                observacoes: observacoesIA,
                detalhes
            };

            // Recalcula métricas com rigor
            this.recalcularMetricasScanner();
            this.exibirResultadoOMR();
            Toast.show(`Análise concluída: ${this.resultadoScanner.acertos}/${totalQ} acertos.`, "success", 3000);
        } catch (error) {
            console.error("Erro na leitura de gabarito com IA:", error);
            if (container) {
                container.style.display = 'block';
                container.innerHTML = `
                    <div class="card animate-enter" style="padding: 2rem; text-align: center; background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius-xl);">
                        <div style="width: 3.5rem; height: 3.5rem; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin: 0 auto 1rem auto;">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h4 style="font-size: 1.125rem; font-weight: 800; color: #991b1b; margin: 0 0 0.5rem 0;">Falha na Leitura com IA</h4>
                        <p style="font-size: 0.875rem; color: #b91c1c; margin: 0 0 1.25rem 0; max-width: 460px; margin-inline: auto;">
                            ${window.escapeHTML(error.message || "Não foi possível processar a imagem do cartão. Verifique a iluminação, enquadramento ou sua conexão.")}
                        </p>
                        <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
                            <button type="button" onclick="correcaoAutomaticaView.iniciarCamera()" class="btn-primary" style="background: #dc2626; border-color: #dc2626; font-size: 0.8125rem;">
                                <i class="fas fa-redo"></i> Tentar Novamente
                            </button>
                            <button type="button" onclick="correcaoAutomaticaView.testarGabaritoExemplo()" class="btn-secondary" style="font-size: 0.8125rem;">
                                <i class="fas fa-vial"></i> Testar Exemplo Simulado
                            </button>
                        </div>
                    </div>
                `;
            }
            Toast.show("Erro ao analisar imagem com IA. Tente novamente.", "error");
        }
    },

    /**
     * Recalcula de forma centralizada e pura todas as métricas do gabarito escaneado
     */
    recalcularMetricasScanner() {
        if (!this.resultadoScanner || !Array.isArray(this.resultadoScanner.detalhes)) return;
        const totalQ = this.resultadoScanner.detalhes.length;
        let acertos = 0;
        let emBrancoCount = 0;
        let anuladasCount = 0;

        this.resultadoScanner.detalhes.forEach((d, idx) => {
            // Sincroniza gabarito oficial atualizado
            if (this.gabaritoOficial[idx]) {
                d.gabarito = this.gabaritoOficial[idx];
            }
            const resp = String(d.resposta || 'EM_BRANCO').toUpperCase().trim();
            d.isEmBranco = (resp === 'EM_BRANCO' || resp === '-' || resp === '' || resp === 'BLANK' || resp === 'VAZIO' || resp === 'NULO');
            d.isAnulada = (resp === 'ANULADA' || resp === 'DUPLA' || resp === 'INVALIDA');
            d.correta = (!d.isEmBranco && !d.isAnulada && resp === d.gabarito);
            d.status = d.isEmBranco ? 'em_branco' : d.isAnulada ? 'anulada' : 'marcada';

            if (d.correta) {
                acertos++;
            } else if (d.isEmBranco) {
                emBrancoCount++;
            } else if (d.isAnulada) {
                anuladasCount++;
            }
        });

        const erros = totalQ - acertos;
        const notaFinal = Number(((acertos / totalQ) * 10).toFixed(1));

        this.resultadoScanner.totalQ = totalQ;
        this.resultadoScanner.acertos = acertos;
        this.resultadoScanner.erros = erros;
        this.resultadoScanner.emBranco = emBrancoCount;
        this.resultadoScanner.anuladas = anuladasCount;
        this.resultadoScanner.notaFinal = notaFinal;
    },

    /**
     * Atualiza o painel de resultados de forma granular e fluida (sem scroll jump)
     */
    atualizarPainelResultadoOMR(questaoNumeroAlvo = null) {
        if (!this.resultadoScanner) return;
        const res = this.resultadoScanner;

        // Atualiza contadores no Scoreboard Header
        const notaEl = document.getElementById('omr-score-nota-val');
        if (notaEl) {
            notaEl.innerText = res.notaFinal.toFixed(1);
            notaEl.style.color = res.notaFinal >= 6 ? '#059669' : '#dc2626';
        }

        const acertosEl = document.getElementById('omr-score-acertos-val');
        if (acertosEl) acertosEl.innerText = `${res.acertos}/${res.totalQ}`;

        const errosEl = document.getElementById('omr-score-erros-val');
        if (errosEl) errosEl.innerText = `${res.erros - (res.emBranco || 0) - (res.anuladas || 0)}`;

        const brancoEl = document.getElementById('omr-score-branco-val');
        if (brancoEl) brancoEl.innerText = `${res.emBranco || 0}`;

        const anuladasEl = document.getElementById('omr-score-anuladas-val');
        if (anuladasEl) anuladasEl.innerText = `${res.anuladas || 0}`;

        // Se uma questão específica foi informada, atualiza pontualmente o card dela no DOM
        if (questaoNumeroAlvo !== null) {
            const idx = questaoNumeroAlvo - 1;
            const d = res.detalhes[idx];
            const card = document.getElementById(`omr-card-q-${questaoNumeroAlvo}`);
            if (d && card) {
                let corBorda = d.correta ? '#a7f3d0' : d.isEmBranco ? '#fde68a' : d.isAnulada ? '#e9d5ff' : '#fecaca';
                let corFundo = d.correta ? '#f0fdf4' : d.isEmBranco ? '#fffbeb' : d.isAnulada ? '#faf5ff' : '#fff5f5';
                let badgeTexto = d.correta ? 'ACERTO' : d.isEmBranco ? 'EM BRANCO' : d.isAnulada ? 'ANULADA' : 'ERRO';
                let badgeCor = d.correta ? '#059669' : d.isEmBranco ? '#d97706' : d.isAnulada ? '#7c3aed' : '#dc2626';
                let badgeBg = d.correta ? '#d1fae5' : d.isEmBranco ? '#fef3c7' : d.isAnulada ? '#f3e8ff' : '#fee2e2';

                card.style.borderColor = corBorda;
                card.style.backgroundColor = corFundo;

                const badgeEl = card.querySelector('.omr-q-badge');
                if (badgeEl) {
                    badgeEl.innerText = badgeTexto;
                    badgeEl.style.color = badgeCor;
                    badgeEl.style.backgroundColor = badgeBg;
                }

                const confBadge = card.querySelector('.omr-q-conf-badge');
                if (confBadge) {
                    if (d.confianca === 'media' || d.confianca === 'baixa') {
                        confBadge.style.display = 'inline-flex';
                        confBadge.innerText = '⚠️ Revisar';
                    } else {
                        confBadge.style.display = 'none';
                    }
                }

                const gabValEl = card.querySelector('.omr-q-gab-val');
                if (gabValEl) gabValEl.innerText = d.gabarito;

                const lidoValEl = card.querySelector('.omr-q-lido-val');
                if (lidoValEl) {
                    lidoValEl.innerText = d.isEmBranco ? '—' : d.isAnulada ? '⚠️' : d.resposta;
                    lidoValEl.style.color = badgeCor;
                }

                const editIcon = card.querySelector('.omr-q-edit-icon');
                if (editIcon) {
                    editIcon.style.display = d.editadoManualmente ? 'inline-block' : 'none';
                }

                const opcoesLetras = ['A', 'B', 'C', 'D', 'E'];
                opcoesLetras.forEach(l => {
                    const btnL = card.querySelector(`.omr-btn-opt-${l}`);
                    if (btnL) {
                        const isSel = (d.resposta === l);
                        btnL.style.borderColor = isSel ? '#4f46e5' : '#cbd5e1';
                        btnL.style.backgroundColor = isSel ? '#4f46e5' : 'white';
                        btnL.style.color = isSel ? 'white' : '#475569';
                    }
                });

                const btnBranco = card.querySelector('.omr-btn-opt-branco');
                if (btnBranco) {
                    btnBranco.style.borderColor = d.isEmBranco ? '#d97706' : '#cbd5e1';
                    btnBranco.style.backgroundColor = d.isEmBranco ? '#d97706' : 'white';
                    btnBranco.style.color = d.isEmBranco ? 'white' : '#64748b';
                }

                const btnAnulada = card.querySelector('.omr-btn-opt-anulada');
                if (btnAnulada) {
                    btnAnulada.style.borderColor = d.isAnulada ? '#7c3aed' : '#cbd5e1';
                    btnAnulada.style.backgroundColor = d.isAnulada ? '#7c3aed' : 'white';
                    btnAnulada.style.color = d.isAnulada ? 'white' : '#64748b';
                }
                return;
            }
        }

        // Se múltiplos cards mudaram ou o container ainda não existe, renderiza a tela de resultados
        this.exibirResultadoOMR();
    },

    /**
     * Permite ao professor alterar manualmente a resposta detectada de uma questão na interface de auditoria
     */
    alterarRespostaQuestao(questaoNumero, novaResposta) {
        if (!this.resultadoScanner || !this.resultadoScanner.detalhes) return;
        const idx = questaoNumero - 1;
        const d = this.resultadoScanner.detalhes[idx];
        if (!d) return;

        d.resposta = novaResposta;
        d.editadoManualmente = true;
        d.confianca = 'alta'; // Após intervenção do professor, a confiança é absoluta
        this.recalcularMetricasScanner();
        this.atualizarPainelResultadoOMR(questaoNumero);

        Toast.show(`Q${questaoNumero.toString().padStart(2, '0')} definida como: ${novaResposta === 'EM_BRANCO' ? 'Em Branco' : novaResposta === 'ANULADA' ? 'Anulada' : novaResposta}`, "info", 1000);
    },

    exibirResultadoOMR() {
        const container = document.getElementById('omr-resultado-container');
        if (!container || !this.resultadoScanner) return;

        const res = this.resultadoScanner;
        const turmas = model.state.turmas || [];
        const opcoesLetras = ['A', 'B', 'C', 'D', 'E'];

        container.style.display = 'block';
        container.innerHTML = `
            <div class="card" style="padding: var(--spacing-6); background: white; border: 1px solid var(--color-slate-200); box-shadow: var(--shadow-md);">
                
                <!-- CABEÇALHO DO RESULTADO COM NOTA E MÉTRICAS REATIVAS -->
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 1.25rem;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            <span class="badge" style="background: #d1fae5; color: #059669; font-weight: 800; font-size: 0.75rem; padding: 0.25rem 0.75rem; border-radius: 9999px;">
                                <i class="fas fa-check-circle"></i> Leitura Óptica Concluída (${res.totalQ} Questões)
                            </span>
                            <span class="badge" style="background: #e0e7ff; color: #4338ca; font-size: 0.6875rem; font-weight: 800; padding: 0.25rem 0.6rem; border-radius: 0.375rem;">
                                <i class="fas fa-filter"></i> ${this.obterNomeFiltro(this.filtroScanner)}
                            </span>
                            ${res.observacoes ? `
                                <span class="badge" style="background: #eff6ff; color: #3b82f6; font-size: 0.6875rem; font-weight: 700; padding: 0.25rem 0.5rem; border-radius: 0.375rem;">
                                    <i class="fas fa-info-circle"></i> ${window.escapeHTML(res.observacoes)}
                                </span>
                            ` : ''}
                        </div>
                        <h3 style="font-size: 1.5rem; font-weight: 900; color: #0f172a; margin: 0.35rem 0 0 0;">
                            Nota Calculada: <span id="omr-score-nota-val" style="color: ${res.notaFinal >= 6 ? '#059669' : '#dc2626'};">${res.notaFinal.toFixed(1)}</span> / 10.0
                        </h3>
                        <p style="font-size: 0.75rem; color: #64748b; margin: 0.2rem 0 0 0;">
                            <i class="fas fa-hand-pointer"></i> Clique nas opções de cada questão abaixo para auditar ou corrigir qualquer marcação.
                        </p>
                    </div>

                    <!-- CARDS DE RESUMO REATIVOS (ACERTOS, ERROS, EM BRANCO, ANULADAS) -->
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <div style="text-align: center; padding: 0.5rem 0.75rem; background: #ecfdf5; border-radius: 0.75rem; border: 1px solid #a7f3d0; min-width: 70px;">
                            <span style="font-size: 0.625rem; font-weight: 800; color: #065f46; text-transform: uppercase;">Acertos</span>
                            <div id="omr-score-acertos-val" style="font-size: 1.125rem; font-weight: 900; color: #059669;">${res.acertos}/${res.totalQ}</div>
                        </div>
                        <div style="text-align: center; padding: 0.5rem 0.75rem; background: #fef2f2; border-radius: 0.75rem; border: 1px solid #fecaca; min-width: 70px;">
                            <span style="font-size: 0.625rem; font-weight: 800; color: #991b1b; text-transform: uppercase;">Erros</span>
                            <div id="omr-score-erros-val" style="font-size: 1.125rem; font-weight: 900; color: #dc2626;">${res.erros - (res.emBranco || 0) - (res.anuladas || 0)}</div>
                        </div>
                        <div style="text-align: center; padding: 0.5rem 0.75rem; background: #fffbeb; border-radius: 0.75rem; border: 1px solid #fde68a; min-width: 70px;">
                            <span style="font-size: 0.625rem; font-weight: 800; color: #92400e; text-transform: uppercase;">Em Branco</span>
                            <div id="omr-score-branco-val" style="font-size: 1.125rem; font-weight: 900; color: #d97706;">${res.emBranco || 0}</div>
                        </div>
                        <div style="text-align: center; padding: 0.5rem 0.75rem; background: #faf5ff; border-radius: 0.75rem; border: 1px solid #e9d5ff; min-width: 70px;">
                            <span style="font-size: 0.625rem; font-weight: 800; color: #6b21a8; text-transform: uppercase;">Anuladas</span>
                            <div id="omr-score-anuladas-val" style="font-size: 1.125rem; font-weight: 900; color: #7c3aed;">${res.anuladas || 0}</div>
                        </div>
                    </div>
                </div>

                <!-- GRADE INTERATIVA DE QUESTÕES CORRIGIDAS -->
                <div class="custom-scrollbar" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 0.625rem; margin-bottom: 1.5rem; max-height: 380px; overflow-y: auto; padding: 0.25rem;">
                    ${res.detalhes.map(d => {
                        let corBorda = d.correta ? '#a7f3d0' : d.isEmBranco ? '#fde68a' : d.isAnulada ? '#e9d5ff' : '#fecaca';
                        let corFundo = d.correta ? '#f0fdf4' : d.isEmBranco ? '#fffbeb' : d.isAnulada ? '#faf5ff' : '#fff5f5';
                        let badgeTexto = d.correta ? 'ACERTO' : d.isEmBranco ? 'EM BRANCO' : d.isAnulada ? 'ANULADA' : 'ERRO';
                        let badgeCor = d.correta ? '#059669' : d.isEmBranco ? '#d97706' : d.isAnulada ? '#7c3aed' : '#dc2626';
                        let badgeBg = d.correta ? '#d1fae5' : d.isEmBranco ? '#fef3c7' : d.isAnulada ? '#f3e8ff' : '#fee2e2';
                        let precisaRevisao = (d.confianca === 'media' || d.confianca === 'baixa');

                        return `
                            <div id="omr-card-q-${d.questao}" style="padding: 0.625rem; border-radius: 0.625rem; border: 1.5px solid ${corBorda}; background: ${corFundo}; display: flex; flex-direction: column; gap: 0.4rem; transition: background-color 150ms ease, border-color 150ms ease;">
                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.25rem;">
                                    <span style="font-weight: 900; font-size: 0.8125rem; color: #1e293b;">
                                        Q${d.questao.toString().padStart(2, '0')}
                                        <i class="fas fa-pen omr-q-edit-icon" style="font-size: 0.625rem; color: #4f46e5; margin-left: 0.25rem; display: ${d.editadoManualmente ? 'inline-block' : 'none'};" title="Editado manualmente pelo professor"></i>
                                    </span>
                                    <div style="display: flex; align-items: center; gap: 0.25rem;">
                                        <span class="omr-q-conf-badge badge ${d.confianca === 'baixa' ? 'omr-confidence-badge--baixa' : 'omr-confidence-badge--media'}" style="display: ${precisaRevisao ? 'inline-flex' : 'none'}; font-size: 0.5625rem; font-weight: 800; padding: 0.1rem 0.35rem; border-radius: 0.25rem;" title="${window.escapeHTML(d.motivo || 'Verifique a marcação no cartão')}">
                                            ⚠️ Revisar
                                        </span>
                                        <span class="omr-q-badge" style="font-size: 0.625rem; font-weight: 800; padding: 0.15rem 0.4rem; border-radius: 0.25rem; background: ${badgeBg}; color: ${badgeCor};">
                                            ${badgeTexto}
                                        </span>
                                    </div>
                                </div>

                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
                                    <span style="color: #64748b;">Gab: <b class="omr-q-gab-val" style="color: #1e293b;">${d.gabarito}</b></span>
                                    <span style="color: #64748b;">Lido: <b class="omr-q-lido-val" style="color: ${badgeCor}; font-size: 0.875rem;">${d.isEmBranco ? '—' : d.isAnulada ? '⚠️' : d.resposta}</b></span>
                                </div>

                                <!-- SELETOR RÁPIDO DE AUDITORIA MANUAL -->
                                <div style="display: flex; gap: 0.2rem; align-items: center; justify-content: space-between; border-top: 1px dashed rgba(0,0,0,0.08); padding-top: 0.35rem; margin-top: 0.2rem;">
                                    ${opcoesLetras.map(l => `
                                        <button type="button" 
                                                class="omr-btn-opt-${l}"
                                                onclick="correcaoAutomaticaView.alterarRespostaQuestao(${d.questao}, '${l}')"
                                                style="width: 1.35rem; height: 1.35rem; border-radius: 0.25rem; font-size: 0.625rem; font-weight: 800; cursor: pointer; border: 1px solid ${d.resposta === l ? '#4f46e5' : '#cbd5e1'}; background: ${d.resposta === l ? '#4f46e5' : 'white'}; color: ${d.resposta === l ? 'white' : '#475569'}; padding: 0; transition: all 100ms ease;"
                                                title="Definir Q${d.questao} como ${l}">
                                            ${l}
                                        </button>
                                    `).join('')}
                                    <button type="button" 
                                            class="omr-btn-opt-branco"
                                            onclick="correcaoAutomaticaView.alterarRespostaQuestao(${d.questao}, 'EM_BRANCO')"
                                            style="padding: 0 0.3rem; height: 1.35rem; border-radius: 0.25rem; font-size: 0.5625rem; font-weight: 800; cursor: pointer; border: 1px solid ${d.isEmBranco ? '#d97706' : '#cbd5e1'}; background: ${d.isEmBranco ? '#d97706' : 'white'}; color: ${d.isEmBranco ? 'white' : '#64748b'}; transition: all 100ms ease;"
                                            title="Definir como Em Branco">
                                        ⚪
                                    </button>
                                    <button type="button" 
                                            class="omr-btn-opt-anulada"
                                            onclick="correcaoAutomaticaView.alterarRespostaQuestao(${d.questao}, 'ANULADA')"
                                            style="padding: 0 0.3rem; height: 1.35rem; border-radius: 0.25rem; font-size: 0.5625rem; font-weight: 800; cursor: pointer; border: 1px solid ${d.isAnulada ? '#7c3aed' : '#cbd5e1'}; background: ${d.isAnulada ? '#7c3aed' : 'white'}; color: ${d.isAnulada ? 'white' : '#64748b'}; transition: all 100ms ease;"
                                            title="Definir como Anulada/Dupla">
                                        ⚠️
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- LANÇAMENTO DIRETO NA TURMA -->
                <div style="padding: 1.25rem; background: #f8fafc; border-radius: 1rem; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
                        <div>
                            <label class="form-label" style="font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase;">Turma</label>
                            <select id="omr-target-turma" class="form-input" style="padding: 0.5rem 0.75rem; border-radius: 0.5rem;" onchange="correcaoAutomaticaView.atualizarAlunosTurma(this.value)">
                                ${turmas.map(t => `<option value="${t.id}">${window.escapeHTML(t.nome)}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="form-label" style="font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase;">Estudante</label>
                            <select id="omr-target-aluno" class="form-input" style="padding: 0.5rem 0.75rem; border-radius: 0.5rem;">
                                ${turmas[0]?.alunos?.map(a => `<option value="${a.id}">${window.escapeHTML(a.nome)}</option>`).join('') || '<option>Nenhum aluno</option>'}
                            </select>
                        </div>
                    </div>

                    <button type="button" onclick="correcaoAutomaticaView.salvarNotaNaTurma()" class="btn-primary" style="background: #059669; border-color: #059669; font-weight: 800; padding: 0.75rem 1.75rem; font-size: 0.9375rem; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.25);">
                        <i class="fas fa-save"></i> Gravar Nota no Diário
                    </button>
                </div>

            </div>
        `;
    },

    atualizarAlunosTurma(turmaId) {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(turmaId));
        const alunoSelect = document.getElementById('omr-target-aluno');
        if (!turma || !alunoSelect) return;

        const alunosOrdenados = window.ordenarEstudantes ? window.ordenarEstudantes(turma.alunos, 'nome_asc') : (turma.alunos || []);
        alunoSelect.innerHTML = alunosOrdenados.map(a => `<option value="${a.id}">${window.escapeHTML(a.nome)}</option>`).join('');
    },

    salvarNotaNaTurma() {
        const turmaSelect = document.getElementById('omr-target-turma');
        const alunoSelect = document.getElementById('omr-target-aluno');
        if (!turmaSelect || !alunoSelect || !this.resultadoScanner) return;

        const turmaId = turmaSelect.value;
        const alunoId = alunoSelect.value;

        const turma = (model.state.turmas || []).find(t => String(t.id) === String(turmaId));
        if (!turma) return Toast.show("Turma não encontrada.", "error");

        const aluno = (turma.alunos || []).find(a => String(a.id) === String(alunoId));
        if (!aluno) return Toast.show("Aluno não encontrado.", "error");

        // Cria ou atribui avaliação
        let av = (turma.avaliacoes || []).find(a => a.nome.includes('Gabarito') || a.nome.includes('Prova'));
        if (!av) {
            av = {
                id: 'av_omr_' + Date.now(),
                nome: `Avaliação Gabarito (${this.resultadoScanner.totalQ}Q)`,
                max: 10,
                periodo: 1
            };
            if (!turma.avaliacoes) turma.avaliacoes = [];
            turma.avaliacoes.push(av);
        }

        if (!aluno.notas) aluno.notas = {};
        aluno.notas[av.id] = this.resultadoScanner.notaFinal;

        model.saveLocal();
        if (model.currentUser && window.turmaService) {
            window.turmaService.saveTurma(model.currentUser.uid, turma);
        }

        Toast.show(`✅ Nota ${this.resultadoScanner.notaFinal} gravada para ${aluno.nome} com sucesso!`, "success", 4000);
    },

    /**
     * Gera o marcador fiduciário vetorial SVG para ancoragem precisa nos 4 cantos do cartão
     */
    obterSVGCantoFiduciario(posicao = 'tl', tamanho = 18) {
        const styleMap = {
            'tl': 'top: 5px; left: 5px;',
            'tr': 'top: 5px; right: 5px;',
            'bl': 'bottom: 5px; left: 5px;',
            'br': 'bottom: 5px; right: 5px;'
        };
        return `
            <svg width="${tamanho}" height="${tamanho}" viewBox="0 0 20 20" style="position: absolute; ${styleMap[posicao] || ''} display: block; z-index: 10;" xmlns="http://www.w3.org/2000/svg">
                <rect width="20" height="20" fill="#000000" />
                <rect x="4" y="4" width="12" height="12" fill="#ffffff" />
                <rect x="7" y="7" width="6" height="6" fill="#000000" />
            </svg>
        `;
    },

    /**
     * Gera o HTML de um cartão-resposta individual com proporção e densidade óptica calibradas
     */
    obterHTMLCartaoIndividual({ numVia = 1, totalQuestoes = 10, colunasInternas = 2, porColuna = 5, compacto = false, totalVias = 1 }) {
        const letras = ['A', 'B', 'C', 'D', 'E'];
        const isGrandeVolume = totalQuestoes >= 45;
        const fontTitle = compacto ? '0.75rem' : isGrandeVolume ? '0.875rem' : '0.9375rem';
        const paddingCard = compacto ? '0.65rem 0.65rem 0.5rem 0.65rem' : '0.875rem 0.875rem 0.65rem 0.875rem';
        const bubbleSize = compacto ? '0.95rem' : isGrandeVolume ? '1.05rem' : '1.15rem';
        const fontSizeBubble = compacto ? '0.5rem' : isGrandeVolume ? '0.5625rem' : '0.625rem';
        const rowPadding = compacto ? '0.08rem 0.25rem' : '0.12rem 0.35rem';
        const qNumWidth = compacto ? '1.25rem' : '1.5rem';

        return `
            <div class="omr-card-printable" style="position: relative; border: 2.5px solid #000000; padding: ${paddingCard}; border-radius: 4px; background: #ffffff; color: #000000; page-break-inside: avoid; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; width: 100%; height: 100%; box-shadow: none;">
                
                <!-- MARCADORES DE ANCORAGEM FIDUCIÁRIOS VETORIAIS ⬛ NOS 4 CANTOS -->
                ${this.obterSVGCantoFiduciario('tl')}
                ${this.obterSVGCantoFiduciario('tr')}
                ${this.obterSVGCantoFiduciario('bl')}
                ${this.obterSVGCantoFiduciario('br')}

                <!-- CABEÇALHO DO CARTÃO -->
                <div style="border-bottom: 2px solid #000000; padding-bottom: 0.3rem; margin-bottom: 0.35rem; padding-left: 1.5rem; padding-right: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4 style="margin: 0; font-size: ${fontTitle}; font-weight: 900; color: #000000; text-transform: uppercase; letter-spacing: -0.01em;">
                            PLANNER PRO - CARTÃO-RESPOSTA OMR (${totalQuestoes}Q)
                        </h4>
                        <div style="font-size: 0.5625rem; color: #333333; font-weight: 700; margin-top: 1px;">
                            Preencha totalmente a bolha com caneta preta ou azul escura (ex: ●)
                        </div>
                    </div>
                    ${totalVias > 1 ? `
                        <div style="font-size: 0.625rem; font-weight: 900; color: #000000; border: 1.5px solid #000000; padding: 0.1rem 0.35rem; border-radius: 2px;">
                            VIA #${numVia}
                        </div>
                    ` : `
                        <div style="font-size: 0.5625rem; font-weight: 800; color: #000000; border: 1px solid #000000; padding: 0.1rem 0.35rem; border-radius: 2px; text-transform: uppercase;">
                            LEITURA ÓTICA
                        </div>
                    `}
                </div>

                <!-- DADOS DO ESTUDANTE -->
                <div style="display: grid; grid-template-columns: ${compacto ? '1fr' : '2fr 1fr'}; gap: 0.35rem; font-size: ${compacto ? '0.625rem' : '0.6875rem'}; margin-bottom: 0.4rem; padding-left: 1.5rem; padding-right: 1.5rem;">
                    <div style="border-bottom: 1px solid #666666; padding-bottom: 0.15rem; white-space: nowrap; overflow: hidden;">
                        <b>Estudante:</b> ____________________________________
                    </div>
                    <div style="border-bottom: 1px solid #666666; padding-bottom: 0.15rem; white-space: nowrap;">
                        <b>Turma:</b> _______ <b>Data:</b> ___/___/___
                    </div>
                </div>

                <!-- GRADE DE QUESTÕES MULTICOLUNAS -->
                <div style="display: grid; grid-template-columns: repeat(${colunasInternas}, 1fr); gap: 0.4rem; background: #ffffff; padding: 0.25rem 1.25rem; border-radius: 2px; flex: 1; align-content: start;">
                    ${Array.from({ length: colunasInternas }, (_, colIdx) => {
                        const inicio = colIdx * porColuna;
                        const fim = Math.min(totalQuestoes, inicio + porColuna);
                        let htmlCol = '<div style="display: flex; flex-direction: column; gap: 0.15rem;">';
                        for (let q = inicio; q < fim; q++) {
                            htmlCol += `
                                <div style="display: flex; align-items: center; justify-content: space-between; padding: ${rowPadding}; background: #ffffff; border: 1px solid #999999; border-radius: 2px;">
                                    <span style="font-weight: 900; font-size: ${fontSizeBubble}; color: #000000; min-width: ${qNumWidth};">Q${(q + 1).toString().padStart(2, '0')}</span>
                                    <div style="display: flex; gap: 0.18rem;">
                                        ${letras.map(l => `
                                            <span style="width: ${bubbleSize}; height: ${bubbleSize}; border-radius: 50%; border: 1.3px solid #000000; display: inline-flex; align-items: center; justify-content: center; font-size: ${fontSizeBubble}; font-weight: 900; color: #000000; background: #ffffff;">
                                                ${l}
                                            </span>
                                        `).join('')}
                                    </div>
                                </div>
                            `;
                        }
                        htmlCol += '</div>';
                        return htmlCol;
                    }).join('')}
                </div>

                <!-- LINHA INFERIOR DE SINCRONISMO -->
                <div style="border-top: 1px dashed #666666; margin-top: 0.3rem; padding-top: 0.15rem; display: flex; justify-content: space-between; align-items: center; padding-left: 1.5rem; padding-right: 1.5rem; font-size: 0.5rem; color: #444444;">
                    <span>■ ■ ■ ■ ■ (Marca de Sincronismo OMR)</span>
                    <span>CÓDIGO: OMR-Q${totalQuestoes}-PPRO</span>
                </div>
            </div>
        `;
    },

    /**
     * Monta o documento HTML completo e isolado para impressão em A4 exata (sem qualquer elemento do App ou Modal)
     */
    obterDocumentoImpressaoCompleto(totalQuestoes = this.gabaritoOficial.length) {
        let numVias = 4;
        let colunasInternas = 1;
        let layoutClasse = 'grid-4-vias';
        let compacto = false;

        if (totalQuestoes > 50) {
            numVias = 1;
            colunasInternas = 4;
            layoutClasse = 'via-unica';
            compacto = true;
        } else if (totalQuestoes > 30) {
            numVias = 1;
            colunasInternas = 3;
            layoutClasse = 'via-unica';
            compacto = false;
        } else if (totalQuestoes > 15) {
            numVias = 2;
            colunasInternas = 2;
            layoutClasse = 'grid-2-vias';
            compacto = false;
        } else {
            numVias = 4;
            colunasInternas = totalQuestoes > 8 ? 2 : 1;
            layoutClasse = 'grid-4-vias';
            compacto = true;
        }

        const porColuna = Math.ceil(totalQuestoes / colunasInternas);

        return `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="utf-8">
                <title>Cartão-Resposta OMR (${totalQuestoes}Q) - Planner Pro</title>
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 6mm 8mm;
                    }
                    * {
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    html, body {
                        margin: 0;
                        padding: 0;
                        background: #ffffff;
                        color: #000000;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                        width: 100%;
                        height: 100%;
                    }
                    .folha-a4 {
                        width: 100%;
                        height: 100%;
                        max-height: 275mm;
                        box-sizing: border-box;
                        page-break-inside: avoid;
                        page-break-after: avoid;
                        overflow: hidden;
                    }
                    .grid-4-vias {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        grid-template-rows: 1fr 1fr;
                        gap: 6mm;
                        height: 100%;
                    }
                    .grid-2-vias {
                        display: flex;
                        flex-direction: column;
                        gap: 8mm;
                        height: 100%;
                    }
                    .via-unica {
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                    }
                </style>
            </head>
            <body>
                <div class="folha-a4 ${layoutClasse}">
                    ${Array.from({ length: numVias }, (_, idx) => 
                        this.obterHTMLCartaoIndividual({ 
                            numVia: idx + 1, 
                            totalQuestoes, 
                            colunasInternas, 
                            porColuna, 
                            compacto, 
                            totalVias: numVias 
                        })
                    ).join('')}
                </div>
            </body>
            </html>
        `;
    },

    /**
     * Executa a impressão direta e limpa através de iframe isolado (sem botões ou cabeçalhos do modal)
     */
    executarImpressaoCartao(totalQuestoes = this.gabaritoOficial.length) {
        const htmlDoc = this.obterDocumentoImpressaoCompleto(totalQuestoes);

        let iframe = document.getElementById('omr-print-iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'omr-print-iframe';
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.style.visibility = 'hidden';
            document.body.appendChild(iframe);
        }

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(htmlDoc);
        doc.close();

        iframe.contentWindow.focus();
        setTimeout(() => {
            try {
                iframe.contentWindow.print();
            } catch (e) {
                console.warn("Fallback de impressão por janela popup:", e);
                const win = window.open('', '_blank');
                win.document.open();
                win.document.write(htmlDoc);
                win.document.close();
                win.focus();
                win.print();
            }
        }, 300);
    },

    /**
     * Abre a visualização modal para conferência prévia dos Cartões-Resposta OMR
     */
    imprimirCartaoResposta(totalQuestoes = this.gabaritoOficial.length) {
        const modal = document.getElementById('global-modal');
        if (!modal) return;

        let numVias = 4;
        let explicacao = 'A folha foi otimizada para renderizar <strong>4 cartões econômicos por página A4 (Grade 2x2)</strong> com marcadores vetoriais ⬛.';
        if (totalQuestoes > 50) {
            numVias = 1;
            explicacao = 'Para provas extensas (51 a 100 questões), o layout de alta densidade óptica foi calibrado para caber <strong>100% em EXATAMENTE 1 folha A4</strong>, sem cortes ou páginas extras.';
        } else if (totalQuestoes > 30) {
            numVias = 1;
            explicacao = 'Para provas de 31 a 50 questões, a folha foi formatada como <strong>1 prova completa em página A4 inteira (3 colunas)</strong>.';
        } else if (totalQuestoes > 15) {
            numVias = 2;
            explicacao = 'Para provas médias (16 a 30 questões), a folha foi formatada para renderizar <strong>2 cartões por página A4</strong>.';
        }

        let colunasInternas = 1;
        let compacto = false;
        if (totalQuestoes > 50) { colunasInternas = 4; compacto = true; }
        else if (totalQuestoes > 30) { colunasInternas = 3; compacto = false; }
        else if (totalQuestoes > 15) { colunasInternas = 2; compacto = false; }
        else { colunasInternas = totalQuestoes > 8 ? 2 : 1; compacto = true; }

        const porColuna = Math.ceil(totalQuestoes / colunasInternas);

        modal.innerHTML = `
            <div class="modal animate-scale" style="max-width: 900px; max-height: 90vh; display: flex; flex-direction: column;">
                <div class="modal__header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding: 1rem 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-print" style="color: var(--color-primary); font-size: 1.25rem;"></i>
                        <h3 class="modal__title" style="margin: 0; font-size: 1.125rem; font-weight: 800;">Folha de Cartão-Resposta OMR com Ancoragem (${totalQuestoes} Questões)</h3>
                    </div>
                    <button type="button" onclick="controller.closeModal()" class="btn-icon" style="border: none; background: none; cursor: pointer; font-size: 1.125rem;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="modal__body custom-scrollbar" style="overflow-y: auto; padding: 1.5rem; flex: 1; background: #f8fafc;">
                    <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 0.5rem; padding: 0.75rem 1rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                        <span style="font-size: 0.8125rem; color: #3730a3;">
                            <i class="fas fa-info-circle"></i> ${explicacao}
                        </span>
                        <span class="badge" style="background: #ffffff; color: #4338ca; font-weight: 800; border: 1px solid #c7d2fe;">
                            ${numVias} via(s) por página A4
                        </span>
                    </div>
                    
                    <div id="cartao-resposta-preview-area" style="background: white; padding: 1rem; border-radius: 0.5rem; border: 1px solid #cbd5e1; box-shadow: var(--shadow-sm); display: ${numVias === 4 ? 'grid' : 'flex'}; grid-template-columns: ${numVias === 4 ? '1fr 1fr' : 'none'}; flex-direction: ${numVias !== 4 ? 'column' : 'none'}; gap: 1rem;">
                        ${Array.from({ length: numVias }, (_, idx) => 
                            this.obterHTMLCartaoIndividual({ 
                                numVia: idx + 1, 
                                totalQuestoes, 
                                colunasInternas, 
                                porColuna, 
                                compacto, 
                                totalVias: numVias 
                            })
                        ).join('')}
                    </div>
                </div>

                <div class="modal__footer" style="display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); background: white;">
                    <button type="button" onclick="controller.closeModal()" class="btn-secondary">Fechar</button>
                    <button type="button" onclick="correcaoAutomaticaView.executarImpressaoCartao(${totalQuestoes})" class="btn-primary" style="background: #4f46e5; font-weight: 800; padding: 0.625rem 1.5rem;">
                        <i class="fas fa-print"></i> Imprimir Folha A4
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    }
};

if (typeof window !== 'undefined') window.correcaoAutomaticaView = correcaoAutomaticaView;