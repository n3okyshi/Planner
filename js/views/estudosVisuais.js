import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';
import { aiService } from '../ai-service.js';
import { renderKatex, formatarTextoComLatex, sanitizeComLatex, alternarModoEdicaoPreview, lerArquivoTexto, secureShuffle } from '../utils.js';
import { uiController } from '../controllers/uiController.js';

export const estudosVisuaisView = {
    abaAtiva: 'flashcards', // 'flashcards' | 'mindmaps'
    contextoDocumentoTemp: '',
    
    // Estado Flashcards
    currentDeck: null,
    currentCardIndex: 0,
    isCardFlipped: false,
    estudoScores: {}, // { index: 'acerto' | 'medio' | 'erro' }
    modoEstudoAtivo: false,
    baralhosSelecionados: new Set(),

    // Estado Mindmaps
    currentMindmap: null,
    zoomLevel: 1,
    panX: 100,
    panY: 250,
    isPanning: false,
    startX: 0,
    startY: 0,
    collapsedNodes: new Set(),
    selectedNodeId: null,
    draggingNodeId: null,
    dragStartMouseX: 0,
    dragStartMouseY: 0,
    dragStartNodeX: 0,
    dragStartNodeY: 0,
    posMapCache: new Map(),

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const html = `
            <div class="animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8);">
                
                <!-- TOP HEADER & TABS -->
                <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em; display: flex; align-items: center; gap: var(--spacing-2);">
                            <i class="fas fa-brain" style="color: var(--color-primary);"></i> Recursos Visuais & Memorização
                        </h2>
                        <p style="font-size: 0.875rem; color: var(--color-slate-500);">Crie e estude com Flashcards 3D e Mapas Mentais conceituais com apoio de IA e seus documentos.</p>
                    </div>

                    <!-- ABAS DE NAVEGAÇÃO -->
                    <div style="display: flex; background-color: var(--color-slate-100); padding: 0.25rem; border-radius: var(--radius-xl); gap: 0.25rem;">
                        <button type="button" onclick="estudosVisuaisView.mudarAba('flashcards')" class="btn-secondary" style="padding: 0.5rem 1.25rem; font-size: 0.875rem; font-weight: 800; border-radius: var(--radius-lg); ${this.abaAtiva === 'flashcards' ? 'background-color: #ffffff; color: var(--color-primary); box-shadow: var(--shadow-sm);' : 'background: transparent; border: none; color: var(--color-slate-600);'}">
                            <i class="fas fa-layer-group"></i> <span>Flashcards</span>
                        </button>
                        <button type="button" onclick="estudosVisuaisView.mudarAba('mindmaps')" class="btn-secondary" style="padding: 0.5rem 1.25rem; font-size: 0.875rem; font-weight: 800; border-radius: var(--radius-lg); ${this.abaAtiva === 'mindmaps' ? 'background-color: #ffffff; color: var(--color-primary); box-shadow: var(--shadow-sm);' : 'background: transparent; border: none; color: var(--color-slate-600);'}">
                            <i class="fas fa-project-diagram"></i> <span>Mapas Mentais</span>
                        </button>
                    </div>
                </div>

                <!-- CONTEÚDO DA ABA SELECIONADA -->
                <div id="estudos-visuais-content">
                    ${this.abaAtiva === 'flashcards' ? this.renderFlashcardsAba() : this.renderMindmapsAba()}
                </div>
            </div>
        `;

        container.innerHTML = html;
        uiController.initAllDropdowns(container);
        renderKatex(container);
    },

    mudarAba(aba) {
        this.abaAtiva = aba;
        this.modoEstudoAtivo = false;
        this.currentDeck = null;
        this.currentMindmap = null;
        this.render('view-container');
    },

    voltarParaGaleria(aba = null) {
        if (aba) this.abaAtiva = aba;
        this.currentDeck = null;
        this.currentMindmap = null;
        this.modoEstudoAtivo = false;
        this.render('view-container');
    },

    // =========================================================================
    // SEÇÃO: FLASHCARDS
    // =========================================================================

    renderFlashcardsAba() {
        if (this.modoEstudoAtivo && this.currentDeck) {
            return this.renderModoEstudo();
        }
        if (this.currentDeck) {
            return this.renderEditorDeck();
        }

        const decks = model.state.flashcards || [];
        const selecionadosCount = this.baralhosSelecionados.size;

        // Calcular total de cartas selecionadas
        let totalCartasSelecionadas = 0;
        decks.forEach(d => {
            if (this.baralhosSelecionados.has(d.id)) {
                totalCartasSelecionadas += (d.cards?.length || 0);
            }
        });

        return `
            <div style="display: flex; flex-direction: column; gap: var(--spacing-6);">
                <!-- TOOLBAR FLASHCARDS -->
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-3);">
                    <div>
                        <h3 style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-800);">Meus Baralhos de Flashcards</h3>
                        <p style="font-size: 0.8125rem; color: var(--color-slate-500);">${decks.length} baralho(s) cadastrado(s)</p>
                    </div>
                    <div style="display: flex; gap: var(--spacing-3);">
                        <button type="button" onclick="estudosVisuaisView.abrirModalIAFlashcards()" class="btn-secondary" style="background-color: #f8fafc; border-color: #cbd5e1;">
                            <i class="fas fa-robot" style="color: var(--color-primary);"></i> <span>Gerar com IA / Arquivo</span>
                        </button>
                        <button type="button" onclick="estudosVisuaisView.criarNovoDeck()" class="btn-primary">
                            <i class="fas fa-plus"></i> <span>Novo Baralho</span>
                        </button>
                    </div>
                </div>

                <!-- BANNER DE SELEÇÃO MULTI-BARALHOS -->
                ${selecionadosCount > 0 ? `
                    <div class="card animate-enter" style="padding: var(--spacing-4) var(--spacing-6); background: linear-gradient(135deg, #eef2ff, #f5f3ff); border: 2px solid #c7d2fe; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-3);">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="width: 2.5rem; height: 2.5rem; border-radius: 50%; background-color: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800;">
                                ${selecionadosCount}
                            </div>
                            <div>
                                <h4 style="font-size: 1rem; font-weight: 800; color: var(--color-slate-800);">${selecionadosCount} Baralho(s) Selecionado(s)</h4>
                                <p style="font-size: 0.8125rem; color: var(--color-slate-600);">${totalCartasSelecionadas} cartas prontas para estudo combinado.</p>
                            </div>
                        </div>

                        <div style="display: flex; gap: 0.5rem;">
                            <button type="button" onclick="estudosVisuaisView.desmarcarTodosBaralhos()" class="btn-secondary" style="padding: 0.5rem 0.875rem;">
                                Limpar Seleção
                            </button>
                            <button type="button" onclick="estudosVisuaisView.iniciarEstudoCombinado()" class="btn-primary" style="padding: 0.5rem 1.25rem; background-color: #4f46e5;" ${totalCartasSelecionadas === 0 ? 'disabled' : ''}>
                                <i class="fas fa-play"></i> <span>Estudar Selecionados</span>
                            </button>
                        </div>
                    </div>
                ` : ''}

                <!-- GRID DE BARALHOS -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--spacing-6);">
                    ${decks.length > 0 ? decks.map(d => this.cardDeckHTML(d)).join('') : this.emptyStateFlashcards()}
                </div>
            </div>
        `;
    },

    cardDeckHTML(deck) {
        const totalCards = deck.cards?.length || 0;
        const isSelected = this.baralhosSelecionados.has(deck.id);

        return `
            <div class="card interactive-element animate-enter" style="padding: 1.25rem; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; gap: var(--spacing-4); border: 2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-slate-200)'}; background-color: ${isSelected ? '#f8faff' : '#ffffff'}; box-shadow: var(--shadow-sm);">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-2);">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="estudosVisuaisView.toggleSelecionarBaralho('${deck.id}', this.checked)" style="width: 1.125rem; height: 1.125rem; cursor: pointer; accent-color: var(--color-primary);" title="Selecionar para estudo combinado">
                            <span class="badge" style="background-color: var(--color-primary-light); color: var(--color-primary); font-weight: 800; text-transform: uppercase;">
                                ${window.escapeHTML(deck.disciplina || 'Geral')}
                            </span>
                        </div>
                        <div style="display: flex; gap: 0.25rem;">
                            <button type="button" onclick="estudosVisuaisView.editarDeck('${deck.id}')" class="btn-icon" title="Editar Cartas">
                                <i class="fas fa-pencil-alt" style="font-size: 0.875rem;"></i>
                            </button>
                            <button type="button" onclick="estudosVisuaisView.excluirDeck('${deck.id}')" class="btn-icon" style="color: #ef4444;" title="Excluir Baralho">
                                <i class="fas fa-trash-alt" style="font-size: 0.875rem;"></i>
                            </button>
                        </div>
                    </div>

                    <h3 style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${window.escapeHTML(deck.titulo)}
                    </h3>
                    <p style="font-size: 0.8125rem; color: var(--color-slate-500); font-weight: 600;">
                        ${totalCards} cartas de memorização
                    </p>
                </div>

                <div style="display: flex; gap: 0.5rem;">
                    <button type="button" onclick="estudosVisuaisView.iniciarEstudo('${deck.id}')" class="btn-primary" style="flex: 1; justify-content: center; padding: 0.625rem; background-color: #4f46e5;" ${totalCards === 0 ? 'disabled' : ''}>
                        <i class="fas fa-play"></i> <span>Estudar / Praticar</span>
                    </button>
                </div>
            </div>
        `;
    },

    toggleSelecionarBaralho(deckId, isChecked) {
        if (isChecked) {
            this.baralhosSelecionados.add(deckId);
        } else {
            this.baralhosSelecionados.delete(deckId);
        }
        this.render('view-container');
    },

    desmarcarTodosBaralhos() {
        this.baralhosSelecionados.clear();
        this.render('view-container');
    },

    iniciarEstudoCombinado() {
        const decks = model.state.flashcards || [];
        const selectedDecks = decks.filter(d => this.baralhosSelecionados.has(d.id));
        
        let allCards = [];
        selectedDecks.forEach(d => {
            if (d.cards && Array.isArray(d.cards)) {
                allCards = allCards.concat(d.cards.map(c => ({ ...c, deckOrigem: d.titulo })));
            }
        });

        if (allCards.length === 0) {
            return Toast.show("Nenhuma carta encontrada nos baralhos selecionados.", "warning");
        }

        this.currentDeck = {
            id: 'combo_' + Date.now().toString(36),
            titulo: `Estudo Combinado (${selectedDecks.length} baralhos)`,
            disciplina: 'Múltiplas',
            cards: allCards
        };
        this.currentCardIndex = 0;
        this.isCardFlipped = false;
        this.estudoScores = {};
        this.modoEstudoAtivo = true;
        this.render('view-container');
    },

    emptyStateFlashcards() {
        return `
            <div class="card" style="grid-column: 1 / -1; padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 2px dashed var(--color-slate-200);">
                <div style="width: 4rem; height: 4rem; border-radius: var(--radius-full); background-color: var(--color-slate-100); color: var(--color-slate-400); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; margin-bottom: 1rem;">
                    <i class="fas fa-layer-group"></i>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.5rem;">Nenhum Baralho de Flashcards</h3>
                <p style="color: var(--color-slate-500); font-size: 0.875rem; max-width: 440px; margin-bottom: 1.5rem;">Crie baralhos de repetição espaçada manualmente ou gere com IA a partir de arquivos e cadernos do NotebookLM.</p>
                <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center;">
                    <button type="button" onclick="estudosVisuaisView.abrirModalIAFlashcards()" class="btn-secondary">
                        <i class="fas fa-robot"></i> <span>Gerar com IA / Upload</span>
                    </button>
                    <button type="button" onclick="estudosVisuaisView.criarNovoDeck()" class="btn-primary">
                        <i class="fas fa-plus"></i> <span>Criar Manualmente</span>
                    </button>
                </div>
            </div>
        `;
    },

    abrirModalIAFlashcards() {
        this.contextoDocumentoTemp = '';
        const html = `
            <div style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4); max-height: 75vh; overflow-y: auto;" class="custom-scrollbar">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4);">
                    <div>
                        <label class="form-label">Disciplina</label>
                        <select id="fc-ai-disciplina" class="form-select" onchange="if(this.value==='__OUTRA__'){ document.getElementById('fc-disciplina-custom-wrap').style.display='block'; document.getElementById('fc-disciplina-custom').focus(); } else { document.getElementById('fc-disciplina-custom-wrap').style.display='none'; }">
                            <option value="Matemática">Matemática</option>
                            <option value="Língua Portuguesa">Língua Portuguesa</option>
                            <option value="Ciências" selected>Ciências</option>
                            <option value="História">História</option>
                            <option value="Geografia">Geografia</option>
                            <option value="Física">Física</option>
                            <option value="Química">Química</option>
                            <option value="Biologia">Biologia</option>
                            <option value="Língua Inglesa">Língua Inglesa</option>
                            <option value="Arte">Arte</option>
                            <option value="Educação Física">Educação Física</option>
                            <option value="Filosofia">Filosofia</option>
                            <option value="Sociologia">Sociologia</option>
                            <option value="Ensino Religioso">Ensino Religioso</option>
                            <option value="Literatura">Literatura</option>
                            <option value="Redação">Redação</option>
                            <option value="Projeto de Vida">Projeto de Vida</option>
                            <option value="Robótica / Tecnologia">Robótica / Tecnologia</option>
                            <option value="Culinária / Gastronomia">Culinária / Gastronomia</option>
                            <option value="__OUTRA__">+ Outra disciplina (digitar)...</option>
                        </select>
                        <div id="fc-disciplina-custom-wrap" style="display: none; margin-top: 0.5rem;">
                            <input type="text" id="fc-disciplina-custom" class="form-input" placeholder="Digite o nome da disciplina...">
                        </div>
                    </div>
                    <div>
                        <label class="form-label">Série / Segmento</label>
                        <select id="fc-ai-serie" class="form-select" onchange="if(this.value==='__OUTRA__'){ document.getElementById('fc-serie-custom-wrap').style.display='block'; document.getElementById('fc-serie-custom').focus(); } else { document.getElementById('fc-serie-custom-wrap').style.display='none'; }">
                            <option value="Educação Infantil">Educação Infantil</option>
                            <option value="1º Ano — Fundamental I">1º Ano — Fundamental I</option>
                            <option value="2º Ano — Fundamental I">2º Ano — Fundamental I</option>
                            <option value="3º Ano — Fundamental I">3º Ano — Fundamental I</option>
                            <option value="4º Ano — Fundamental I">4º Ano — Fundamental I</option>
                            <option value="5º Ano — Fundamental I">5º Ano — Fundamental I</option>
                            <option value="6º Ano — Fundamental II">6º Ano — Fundamental II</option>
                            <option value="7º Ano — Fundamental II">7º Ano — Fundamental II</option>
                            <option value="8º Ano — Fundamental II">8º Ano — Fundamental II</option>
                            <option value="9º Ano — Fundamental II" selected>9º Ano — Fundamental II</option>
                            <option value="1ª Série — Ensino Médio">1ª Série — Ensino Médio</option>
                            <option value="2ª Série — Ensino Médio">2ª Série — Ensino Médio</option>
                            <option value="3ª Série — Ensino Médio">3ª Série — Ensino Médio</option>
                            <option value="Ensino Superior / Faculdade">Ensino Superior / Faculdade</option>
                            <option value="EJA (Jovens e Adultos)">EJA (Jovens e Adultos)</option>
                            <option value="Pré-Vestibular / Concurso">Pré-Vestibular / Concurso</option>
                            <option value="__OUTRA__">+ Outro segmento (digitar)...</option>
                        </select>
                        <div id="fc-serie-custom-wrap" style="display: none; margin-top: 0.5rem;">
                            <input type="text" id="fc-serie-custom" class="form-input" placeholder="Digite o segmento / ano...">
                        </div>
                    </div>
                </div>

                <div>
                    <label class="form-label">Tema / Conceito Central</label>
                    <input type="text" id="fc-ai-assunto" class="form-input" placeholder="Ex: Ciclo de Krebs, Primeira Guerra Mundial, Leis de Newton...">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4);">
                    <div>
                        <label class="form-label">Quantidade de Cartões</label>
                        <select id="fc-ai-qtd" class="form-select">
                            <option value="5">5 Cartões</option>
                            <option value="8" selected>8 Cartões</option>
                            <option value="12">12 Cartões</option>
                            <option value="16">16 Cartões</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Nível de Dificuldade</label>
                        <select id="fc-ai-nivel" class="form-select">
                            <option value="Fundamental / Básico">Fundamental / Básico</option>
                            <option value="Médio / Conceitual" selected>Médio / Conceitual</option>
                            <option value="Aprofundado / Vestibular">Aprofundado / Vestibular</option>
                        </select>
                    </div>
                </div>

                <!-- CONTEXTO DOCUMENTAL / NOTEBOOKLM -->
                <div style="background-color: var(--color-slate-50); border: 1px solid var(--color-slate-200); border-radius: var(--radius-xl); padding: var(--spacing-4); display: flex; flex-direction: column; gap: var(--spacing-3);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.8125rem; font-weight: 800; color: var(--color-slate-700); display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-file-upload" style="color: var(--color-primary);"></i> Contexto Específico (Arquivo / NotebookLM)
                        </span>
                        <span id="fc-badge-contexto" style="font-size: 0.6875rem; font-weight: 700; color: var(--color-slate-400);">Opcional</span>
                    </div>

                    <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                        <label class="btn-outline interactive-element" style="cursor: pointer; padding: 0.5rem 0.875rem; font-size: 0.75rem; display: flex; align-items: center; gap: 0.375rem; background-color: #fff;">
                            <i class="fas fa-paperclip"></i> <span>Anexar Arquivo (PDF / TXT / MD)</span>
                            <input type="file" id="fc-file-input" accept=".txt,.md,.pdf,.csv,.json" style="display: none;" onchange="estudosVisuaisView.carregarArquivoFlashcards(this)">
                        </label>
                        <span id="fc-nome-arquivo" style="font-size: 0.75rem; color: var(--color-slate-500); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;"></span>
                    </div>

                    <div>
                        <label class="form-label" style="font-size: 0.75rem; color: var(--color-slate-500);">Ou cole o Link / Resumo do NotebookLM:</label>
                        <textarea id="fc-contexto-texto" rows="2" class="form-input custom-scrollbar" placeholder="Cole aqui o link ou texto do seu caderno no Google NotebookLM..." style="font-size: 0.8125rem; resize: vertical;"></textarea>
                    </div>
                </div>

                <div id="fc-ai-loading" style="display: none; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem; text-align: center;">
                    <i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--color-primary); margin-bottom: 0.75rem;"></i>
                    <p style="font-size: 0.875rem; font-weight: 800; color: var(--color-primary);">Elaborando os cartões de memorização com IA...</p>
                </div>

                <div style="display: flex; gap: var(--spacing-3); margin-top: var(--spacing-2); padding-top: var(--spacing-4); border-top: 1px solid var(--color-slate-100);">
                    <button type="button" onclick="controller.closeModal()" class="btn-secondary" style="flex: 1; justify-content: center; padding: 0.75rem;">Cancelar</button>
                    <button type="button" onclick="estudosVisuaisView.gerarFlashcardsComIA()" class="btn-primary" style="flex: 1; justify-content: center; padding: 0.75rem;">
                        <i class="fas fa-magic"></i> <span>Gerar Flashcards</span>
                    </button>
                </div>
            </div>
        `;
        controller.openModal('Gerar Baralho de Flashcards com IA', html, 'large');
    },

    async carregarArquivoFlashcards(input) {
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        const nomeEl = document.getElementById('fc-nome-arquivo');
        const badgeEl = document.getElementById('fc-badge-contexto');

        try {
            if (nomeEl) nomeEl.innerText = `Lendo ${file.name}...`;
            const texto = await lerArquivoTexto(file);
            this.contextoDocumentoTemp = texto;

            if (nomeEl) nomeEl.innerText = `📄 ${file.name} (${texto.length} carac.)`;
            if (badgeEl) {
                badgeEl.innerText = `✅ Arquivo Carregado`;
                badgeEl.style.color = '#059669';
            }
            Toast.show(`Arquivo "${file.name}" carregado com sucesso!`, 'success');
        } catch (e) {
            console.error(e);
            if (nomeEl) nomeEl.innerText = 'Erro ao ler';
            Toast.show('Não foi possível ler o arquivo anexado.', 'error');
        }
    },

    async gerarFlashcardsComIA() {
        let disciplina = document.getElementById('fc-ai-disciplina')?.value;
        if (disciplina === '__OUTRA__') {
            disciplina = document.getElementById('fc-disciplina-custom')?.value.trim();
        }
        let serie = document.getElementById('fc-ai-serie')?.value;
        if (serie === '__OUTRA__') {
            serie = document.getElementById('fc-serie-custom')?.value.trim();
        }
        const assunto = document.getElementById('fc-ai-assunto')?.value.trim();
        const qtd = parseInt(document.getElementById('fc-ai-qtd')?.value || '8');
        const nivel = document.getElementById('fc-ai-nivel')?.value || 'Médio';
        const textoManual = document.getElementById('fc-contexto-texto')?.value.trim() || '';

        if (!disciplina || !assunto) return Toast.show("Preencha a disciplina e o assunto.", "warning");

        const contextoFinal = (this.contextoDocumentoTemp ? `${this.contextoDocumentoTemp}\n\n` : '') + textoManual;

        const loadingEl = document.getElementById('fc-ai-loading');
        if (loadingEl) loadingEl.style.display = 'flex';

        try {
            const resultado = await aiService.gerarFlashcards({
                disciplina,
                serie,
                assunto,
                quantidade: qtd,
                nivel,
                contextoDocumento: contextoFinal
            });

            const novoDeck = {
                id: 'deck_' + Date.now().toString(36),
                titulo: resultado.titulo || `${assunto} - ${serie || 'Geral'}`,
                disciplina: resultado.disciplina || disciplina,
                serie: resultado.serie || serie || 'Geral',
                assunto: resultado.assunto || assunto,
                cards: Array.isArray(resultado.cards) ? resultado.cards : []
            };

            await model.saveFlashcardDeck(novoDeck);
            controller.closeModal();
            Toast.show("Baralho gerado com sucesso!", "success");
            this.render('view-container');
        } catch (error) {
            console.error(error);
            Toast.show(error.message || "Erro ao gerar Flashcards via IA.", "error");
        } finally {
            if (loadingEl) loadingEl.style.display = 'none';
        }
    },

    async criarNovoDeck() {
        const novoDeck = {
            id: 'deck_' + Date.now().toString(36),
            titulo: 'Novo Baralho Sem Título',
            disciplina: 'Geral',
            serie: '',
            cards: [
                { frente: "Pergunta ou Conceito 1", verso: "Definição ou Resposta explicada", dica: "" }
            ]
        };
        await model.saveFlashcardDeck(novoDeck);
        this.editarDeck(novoDeck.id);
    },

    async excluirDeck(deckId) {
        if (confirm("Deseja realmente excluir este baralho de Flashcards?")) {
            await model.deleteFlashcardDeck(deckId);
            this.baralhosSelecionados.delete(deckId);
            Toast.show("Baralho removido.", "info");
            this.render('view-container');
        }
    },

    editarDeck(id) {
        this.currentDeck = (model.state.flashcards || []).find(d => String(d.id) === String(id));
        if (!this.currentDeck) return;
        this.render('view-container');
    },

    renderEditorDeck() {
        const deck = this.currentDeck;
        const cards = deck.cards || [];

        return `
            <div style="display: flex; flex-direction: column; gap: var(--spacing-6);">
                <!-- HEADER DO EDITOR -->
                <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div style="display: flex; align-items: center; gap: var(--spacing-4); flex: 1;">
                        <button onclick="estudosVisuaisView.voltarParaGaleria('flashcards')" class="btn-secondary" style="padding: 0.5rem 0.875rem;">
                            <i class="fas fa-arrow-left"></i> <span>Voltar</span>
                        </button>
                        <input type="text" id="deck-titulo-edit" value="${window.escapeHTML(deck.titulo)}" 
                               class="form-input" style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); max-width: 480px;"
                               onchange="estudosVisuaisView.salvarTituloDeck(this.value)">
                    </div>

                    <div style="display: flex; gap: 0.5rem;">
                        <button onclick="estudosVisuaisView.adicionarCartaVazia()" class="btn-secondary">
                            <i class="fas fa-plus"></i> <span>Adicionar Carta</span>
                        </button>
                        <button onclick="estudosVisuaisView.iniciarEstudo('${deck.id}')" class="btn-primary" style="background-color: #4f46e5;">
                            <i class="fas fa-play"></i> <span>Iniciar Estudo</span>
                        </button>
                    </div>
                </div>

                <!-- LISTA DE CARTAS -->
                <div style="display: flex; flex-direction: column; gap: var(--spacing-4);">
                    ${cards.map((c, i) => `
                        <div class="card" style="padding: var(--spacing-5); border-left: 6px solid var(--color-primary);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-3);">
                                <span style="font-size: 0.875rem; font-weight: 800; color: var(--color-slate-700);">
                                    Carta ${i + 1}
                                </span>
                                <button onclick="estudosVisuaisView.removerCarta(${i})" class="btn-icon" style="color: #ef4444;" title="Excluir carta">
                                    <i class="fas fa-trash-alt" style="font-size: 0.875rem;"></i>
                                </button>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4);">
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                        <label class="form-label" style="margin-bottom: 0;">Frente (Pergunta / Conceito)</label>
                                        <button type="button" onclick="alternarModoEdicaoPreview('deck-frente-${i}', 'preview-deck-frente-${i}', 'btn-prev-frente-${i}')" id="btn-prev-frente-${i}" class="btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.6875rem;">
                                            <i class="fas fa-eye"></i> Visualizar (TeX)
                                        </button>
                                    </div>
                                    <textarea id="deck-frente-${i}" rows="3" class="form-input custom-scrollbar" style="resize: vertical;" onchange="estudosVisuaisView.salvarCarta(${i})">${window.escapeHTML(c.frente || '')}</textarea>
                                    <div id="preview-deck-frente-${i}" style="display: none;"></div>
                                </div>
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                        <label class="form-label" style="margin-bottom: 0;">Verso (Resposta / Definição)</label>
                                        <button type="button" onclick="alternarModoEdicaoPreview('deck-verso-${i}', 'preview-deck-verso-${i}', 'btn-prev-verso-${i}')" id="btn-prev-verso-${i}" class="btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.6875rem;">
                                            <i class="fas fa-eye"></i> Visualizar (TeX)
                                        </button>
                                    </div>
                                    <textarea id="deck-verso-${i}" rows="3" class="form-input custom-scrollbar" style="resize: vertical;" onchange="estudosVisuaisView.salvarCarta(${i})">${window.escapeHTML(c.verso || '')}</textarea>
                                    <div id="preview-deck-verso-${i}" style="display: none;"></div>
                                </div>
                            </div>
                            
                            <div style="margin-top: var(--spacing-3);">
                                <label class="form-label" style="font-size: 0.75rem; color: var(--color-slate-400);">Dica / Pista Mnemônica (Opcional)</label>
                                <input type="text" id="deck-dica-${i}" value="${window.escapeHTML(c.dica || '')}" class="form-input" placeholder="Ex: Lembrar do prefixo..." onchange="estudosVisuaisView.salvarCarta(${i})">
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    async salvarTituloDeck(novoTitulo) {
        if (!this.currentDeck) return;
        this.currentDeck.titulo = novoTitulo;
        await model.saveFlashcardDeck(this.currentDeck);
        Toast.show("Título salvo!", "success");
    },

    async adicionarCartaVazia() {
        if (!this.currentDeck) return;
        if (!this.currentDeck.cards) this.currentDeck.cards = [];
        this.currentDeck.cards.push({ frente: "", verso: "", dica: "" });
        await model.saveFlashcardDeck(this.currentDeck);
        this.render('view-container');
    },

    async removerCarta(index) {
        if (!this.currentDeck) return;
        this.currentDeck.cards.splice(index, 1);
        await model.saveFlashcardDeck(this.currentDeck);
        this.render('view-container');
    },

    async salvarCarta(index) {
        if (!this.currentDeck || !this.currentDeck.cards[index]) return;
        const frente = document.getElementById(`deck-frente-${index}`)?.value || '';
        const verso = document.getElementById(`deck-verso-${index}`)?.value || '';
        const dica = document.getElementById(`deck-dica-${index}`)?.value || '';

        this.currentDeck.cards[index] = { frente, verso, dica };
        await model.saveFlashcardDeck(this.currentDeck);
        Toast.show("Carta atualizada!", "success");
    },

    // --- MODO ESTUDO FLASHCARDS (3D FLIP PLAYER) ---
    iniciarEstudo(deckId) {
        const deck = (model.state.flashcards || []).find(d => String(d.id) === String(deckId));
        if (!deck || !deck.cards || deck.cards.length === 0) {
            return Toast.show("Este baralho não possui cartas para estudar.", "warning");
        }
        this.currentDeck = deck;
        this.currentCardIndex = 0;
        this.isCardFlipped = false;
        this.estudoScores = {};
        this.modoEstudoAtivo = true;
        this.render('view-container');
    },

    virarCarta() {
        const cardEl = document.getElementById('flashcard-card-element');
        if (cardEl) {
            this.isCardFlipped = !this.isCardFlipped;
            if (this.isCardFlipped) {
                cardEl.classList.add('is-flipped');
            } else {
                cardEl.classList.remove('is-flipped');
            }
            if (window.renderKatex) {
                window.renderKatex(cardEl);
            }
        }
    },

    proximaCarta() {
        if (this.currentCardIndex < this.currentDeck.cards.length - 1) {
            this.currentCardIndex++;
            this.isCardFlipped = false;
            this.render('view-container');
        } else {
            this.mostrarResumoEstudo();
        }
    },

    cartaAnterior() {
        if (this.currentCardIndex > 0) {
            this.currentCardIndex--;
            this.isCardFlipped = false;
            this.render('view-container');
        }
    },

    avaliarCarta(score) { // 'acerto' | 'medio' | 'erro'
        this.estudoScores[this.currentCardIndex] = score;
        this.proximaCarta();
    },

    embaralharCartas() {
        if (!this.currentDeck || !this.currentDeck.cards) return;
        this.currentDeck.cards = secureShuffle(this.currentDeck.cards);
        this.currentCardIndex = 0;
        this.isCardFlipped = false;
        this.estudoScores = {};
        Toast.show("Cartas embaralhadas!", "info");
        this.render('view-container');
    },

    // --- CÓPIA DE CARTA PARA OUTRO BARALHO (ex: 'Dificuldades') ---
    async salvarEmDificuldades() {
        if (!this.currentDeck || !this.currentDeck.cards || !this.currentDeck.cards[this.currentCardIndex]) return;
        const cardAtual = this.currentDeck.cards[this.currentCardIndex];

        let baralhoDif = (model.state.flashcards || []).find(d => (d.titulo || '').toLowerCase() === 'dificuldades');
        if (!baralhoDif) {
            baralhoDif = {
                id: 'deck_dif_' + Date.now().toString(36),
                titulo: 'Dificuldades',
                disciplina: 'Revisão Prioritária',
                serie: 'Geral',
                cards: []
            };
        }

        // Verifica se a carta já existe no baralho de dificuldades
        const jaExiste = baralhoDif.cards.some(c => c.frente === cardAtual.frente && c.verso === cardAtual.verso);
        if (jaExiste) {
            return Toast.show("Esta carta já está no baralho 'Dificuldades'.", "info");
        }

        baralhoDif.cards.push({ ...cardAtual });
        await model.saveFlashcardDeck(baralhoDif);
        Toast.show("⭐ Carta adicionada ao baralho 'Dificuldades'!", "success");
    },

    abrirModalCopiarCarta() {
        if (!this.currentDeck || !this.currentDeck.cards || !this.currentDeck.cards[this.currentCardIndex]) return;
        const cardAtual = this.currentDeck.cards[this.currentCardIndex];
        const todosDecks = model.state.flashcards || [];

        const html = `
            <div style="padding: var(--spacing-5); display: flex; flex-direction: column; gap: var(--spacing-4);">
                <div>
                    <h4 style="font-size: 0.9375rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.25rem;">Carta Selecionada:</h4>
                    <p style="font-size: 0.8125rem; color: var(--color-slate-600); background-color: var(--color-slate-50); padding: 0.75rem; border-radius: var(--radius-lg); border: 1px solid var(--color-slate-200);">
                        <strong>Frente:</strong> ${window.escapeHTML(cardAtual.frente)}
                    </p>
                </div>

                <div>
                    <label class="form-label">Copiar para qual baralho existente?</label>
                    <select id="modal-copiar-target-deck" class="form-select">
                        <option value="__NOVO_DIF__">⭐ Baralho "Dificuldades" (Criar ou Adicionar)</option>
                        ${todosDecks.map(d => `<option value="${d.id}">${window.escapeHTML(d.titulo)} (${d.cards?.length || 0} cartas)</option>`).join('')}
                    </select>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem;">
                    <button type="button" onclick="controller.closeModal()" class="btn-secondary">Cancelar</button>
                    <button type="button" onclick="estudosVisuaisView.confirmarCopiaCarta()" class="btn-primary">
                        <i class="fas fa-copy"></i> <span>Copiar Carta</span>
                    </button>
                </div>
            </div>
        `;

        controller.openModal('Copiar Carta para Outro Baralho', html);
    },

    async confirmarCopiaCarta() {
        const targetId = document.getElementById('modal-copiar-target-deck')?.value;
        const cardAtual = this.currentDeck.cards[this.currentCardIndex];

        if (targetId === '__NOVO_DIF__') {
            await this.salvarEmDificuldades();
            controller.closeModal();
            return;
        }

        const targetDeck = (model.state.flashcards || []).find(d => String(d.id) === String(targetId));
        if (!targetDeck) return;
        if (!targetDeck.cards) targetDeck.cards = [];

        targetDeck.cards.push({ ...cardAtual });
        await model.saveFlashcardDeck(targetDeck);
        controller.closeModal();
        Toast.show(`Carta copiada com sucesso para "${targetDeck.titulo}"!`, "success");
    },

    renderModoEstudo() {
        const deck = this.currentDeck;
        const total = deck.cards.length;
        const index = this.currentCardIndex;
        const card = deck.cards[index];
        const progressoPercent = Math.round(((index + 1) / total) * 100);

        return `
            <div style="display: flex; flex-direction: column; gap: var(--spacing-6); max-width: 800px; margin: 0 auto;">
                <!-- BARRA SUPERIOR DE ESTUDO -->
                <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-3);">
                    <button onclick="estudosVisuaisView.voltarParaGaleria('flashcards')" class="btn-secondary" style="padding: 0.5rem 0.875rem;">
                        <i class="fas fa-times"></i> <span>Encerrar Estudo</span>
                    </button>

                    <div style="text-align: center;">
                        <span style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--color-slate-400); letter-spacing: 0.05em;">Progresso</span>
                        <h4 style="font-size: 1.125rem; font-weight: 900; color: var(--color-slate-800);">${index + 1} de ${total}</h4>
                    </div>

                    <div style="display: flex; gap: 0.5rem;">
                        <button onclick="estudosVisuaisView.salvarEmDificuldades()" class="btn-secondary" style="color: #b45309; border-color: #fde68a; background-color: #fffbeb;" title="Salvar rapidamente no baralho de dificuldades">
                            <i class="fas fa-star" style="color: #f59e0b;"></i> <span>Dificuldade</span>
                        </button>
                        <button onclick="estudosVisuaisView.abrirModalCopiarCarta()" class="btn-secondary" title="Copiar carta para outro baralho">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button onclick="estudosVisuaisView.embaralharCartas()" class="btn-secondary" title="Embaralhar cartas">
                            <i class="fas fa-random"></i>
                        </button>
                    </div>
                </div>

                <!-- BARRA DE PROGRESSO -->
                <div style="width: 100%; height: 0.5rem; background-color: var(--color-slate-200); border-radius: 9999px; overflow: hidden;">
                    <div style="height: 100%; width: ${progressoPercent}%; background: linear-gradient(to right, #4f46e5, #10b981); transition: width 0.3s ease;"></div>
                </div>

                <!-- CENA FLASHCARD 3D -->
                <div class="flashcard-scene" onclick="estudosVisuaisView.virarCarta()">
                    <div id="flashcard-card-element" class="flashcard-card ${this.isCardFlipped ? 'is-flipped' : ''}">
                        
                        <!-- FRENTE -->
                        <div class="flashcard-face flashcard-face--front">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--color-primary); background-color: var(--color-primary-light); padding: 0.25rem 0.5rem; border-radius: var(--radius-md);">
                                    ${card.deckOrigem ? `${window.escapeHTML(card.deckOrigem)} • ` : ''}FRENTE
                                </span>
                                <span style="font-size: 0.75rem; color: var(--color-slate-400);"><i class="fas fa-sync-alt"></i> Clique para virar</span>
                            </div>

                            <div style="flex: 1; display: flex; align-items: center; justify-content: center; text-align: center; padding: 1rem;">
                                <h3 style="font-size: 1.625rem; font-weight: 800; color: var(--color-slate-800); line-height: 1.4;">
                                    ${window.formatarTextoComLatex ? window.formatarTextoComLatex(window.escapeHTML(card.frente)) : window.escapeHTML(card.frente)}
                                </h3>
                            </div>

                            <div style="text-align: center;">
                                ${card.dica ? `<p style="font-size: 0.8125rem; color: var(--color-slate-400); font-style: italic;"><i class="far fa-lightbulb"></i> Dica: ${window.formatarTextoComLatex ? window.formatarTextoComLatex(window.escapeHTML(card.dica)) : window.escapeHTML(card.dica)}</p>` : ''}
                            </div>
                        </div>

                        <!-- VERSO -->
                        <div class="flashcard-face flashcard-face--back">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #059669; background-color: #d1fae5; padding: 0.25rem 0.5rem; border-radius: var(--radius-md);">VERSO / RESPOSTA</span>
                                <span style="font-size: 0.75rem; color: var(--color-slate-400);"><i class="fas fa-sync-alt"></i> Clique para desvirar</span>
                            </div>

                            <div style="flex: 1; display: flex; align-items: center; justify-content: center; text-align: center; padding: 1rem;">
                                <p style="font-size: 1.375rem; font-weight: 700; color: var(--color-slate-800); line-height: 1.5;">
                                    ${window.formatarTextoComLatex ? window.formatarTextoComLatex(window.escapeHTML(card.verso)) : window.escapeHTML(card.verso)}
                                </p>
                            </div>

                            <div style="text-align: center; color: var(--color-slate-400); font-size: 0.75rem;">
                                Avalie seu domínio abaixo
                            </div>
                        </div>
                    </div>
                </div>

                <!-- CONTROLES E AUTOAVALIAÇÃO -->
                <div style="display: flex; flex-direction: column; gap: var(--spacing-3); align-items: center;">
                    <div style="display: flex; gap: 1rem; width: 100%; max-width: 600px;">
                        <button onclick="estudosVisuaisView.avaliarCarta('erro')" class="btn-secondary" style="flex: 1; padding: 0.875rem; justify-content: center; color: #dc2626; border-color: #fecaca; background-color: #fef2f2; font-weight: 800;">
                            <i class="fas fa-times-circle"></i> <span>Errei / Difícil</span>
                        </button>
                        <button onclick="estudosVisuaisView.avaliarCarta('medio')" class="btn-secondary" style="flex: 1; padding: 0.875rem; justify-content: center; color: #d97706; border-color: #fde68a; background-color: #fffbeb; font-weight: 800;">
                            <i class="fas fa-minus-circle"></i> <span>Médio</span>
                        </button>
                        <button onclick="estudosVisuaisView.avaliarCarta('acerto')" class="btn-primary" style="flex: 1; padding: 0.875rem; justify-content: center; background-color: #059669; font-weight: 800;">
                            <i class="fas fa-check-circle"></i> <span>Acertei / Fácil</span>
                        </button>
                    </div>

                    <div style="display: flex; gap: 1rem;">
                        <button onclick="estudosVisuaisView.cartaAnterior()" class="btn-secondary" style="padding: 0.5rem 1rem;" ${index === 0 ? 'disabled' : ''}>
                            <i class="fas fa-chevron-left"></i> Anterior
                        </button>
                        <button onclick="estudosVisuaisView.virarCarta()" class="btn-secondary" style="padding: 0.5rem 1.5rem; font-weight: 800;">
                            <i class="fas fa-redo-alt"></i> Virar Cartão
                        </button>
                        <button onclick="estudosVisuaisView.proximaCarta()" class="btn-secondary" style="padding: 0.5rem 1rem;">
                            Próximo <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    mostrarResumoEstudo() {
        const scores = Object.values(this.estudoScores);
        const acertos = scores.filter(s => s === 'acerto').length;
        const medios = scores.filter(s => s === 'medio').length;
        const erros = scores.filter(s => s === 'erro').length;
        const total = this.currentDeck.cards.length;

        const html = `
            <div style="padding: var(--spacing-6); text-align: center; display: flex; flex-direction: column; gap: var(--spacing-4);">
                <div style="width: 4.5rem; height: 4.5rem; border-radius: 50%; background-color: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto;">
                    <i class="fas fa-award"></i>
                </div>
                <h3 style="font-size: 1.5rem; font-weight: 900; color: var(--color-slate-800);">Sessão Concluída!</h3>
                <p style="color: var(--color-slate-500); font-size: 0.875rem;">Você revisou todas as ${total} cartas deste baralho.</p>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1rem 0;">
                    <div style="padding: 1rem; background-color: #ecfdf5; border-radius: var(--radius-xl); border: 1px solid #a7f3d0;">
                        <span style="font-size: 1.5rem; font-weight: 900; color: #059669;">${acertos}</span>
                        <p style="font-size: 0.75rem; font-weight: 700; color: #047857; text-transform: uppercase;">Dominadas</p>
                    </div>
                    <div style="padding: 1rem; background-color: #fffbeb; border-radius: var(--radius-xl); border: 1px solid #fde68a;">
                        <span style="font-size: 1.5rem; font-weight: 900; color: #d97706;">${medios}</span>
                        <p style="font-size: 0.75rem; font-weight: 700; color: #b45309; text-transform: uppercase;">Médias</p>
                    </div>
                    <div style="padding: 1rem; background-color: #fef2f2; border-radius: var(--radius-xl); border: 1px solid #fecaca;">
                        <span style="font-size: 1.5rem; font-weight: 900; color: #dc2626;">${erros}</span>
                        <p style="font-size: 0.75rem; font-weight: 700; color: #b91c1c; text-transform: uppercase;">A Revisar</p>
                    </div>
                </div>

                <div style="display: flex; gap: 0.75rem; justify-content: center; margin-top: 1rem;">
                    <button onclick="controller.closeModal(); estudosVisuaisView.iniciarEstudo('${this.currentDeck.id}')" class="btn-secondary" style="padding: 0.75rem 1.5rem;">
                        <i class="fas fa-redo"></i> Estudar Novamente
                    </button>
                    <button onclick="controller.closeModal(); estudosVisuaisView.voltarParaGaleria('flashcards')" class="btn-primary" style="padding: 0.75rem 1.5rem;">
                        Concluir
                    </button>
                </div>
            </div>
        `;
        controller.openModal('Desempenho da Sessão', html);
    },

    // =========================================================================
    // SEÇÃO: MAPAS MENTAIS & CONCEITUAIS (MINDMAPS)
    // =========================================================================

    renderMindmapsAba() {
        if (this.currentMindmap) {
            return this.renderVisualizadorMindmap();
        }

        const mindmaps = model.state.mindmaps || [];

        return `
            <div style="display: flex; flex-direction: column; gap: var(--spacing-6);">
                <!-- TOOLBAR MAPAS MENTAIS -->
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-3);">
                    <div>
                        <h3 style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-800);">Meus Mapas Mentais & Conceituais</h3>
                        <p style="font-size: 0.8125rem; color: var(--color-slate-500);">${mindmaps.length} mapa(s) estruturado(s)</p>
                    </div>
                    <div style="display: flex; gap: var(--spacing-3);">
                        <button type="button" onclick="estudosVisuaisView.abrirModalIAMindmap()" class="btn-secondary" style="background-color: #f8fafc; border-color: #cbd5e1;">
                            <i class="fas fa-robot" style="color: var(--color-primary);"></i> <span>Gerar com IA / Arquivo</span>
                        </button>
                        <button type="button" onclick="estudosVisuaisView.criarNovoMindmap()" class="btn-primary">
                            <i class="fas fa-plus"></i> <span>Novo Mapa</span>
                        </button>
                    </div>
                </div>

                <!-- GRID DE MAPAS MENTAIS -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--spacing-6);">
                    ${mindmaps.length > 0 ? mindmaps.map(m => this.cardMindmapHTML(m)).join('') : this.emptyStateMindmaps()}
                </div>
            </div>
        `;
    },

    cardMindmapHTML(mapa) {
        const totalNos = this.contarNos(mapa.root);
        return `
            <div class="card interactive-element animate-enter" style="padding: 1.25rem; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; gap: var(--spacing-4); box-shadow: var(--shadow-sm); border: 1px solid var(--color-slate-200);">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-2);">
                        <span class="badge" style="background-color: var(--color-primary-light); color: var(--color-primary); font-weight: 800; text-transform: uppercase;">
                            ${window.escapeHTML(mapa.disciplina || 'Geral')}
                        </span>
                        <div style="display: flex; gap: 0.25rem;">
                            <button type="button" onclick="estudosVisuaisView.abrirMindmap('${mapa.id}')" class="btn-icon" title="Abrir Mapa">
                                <i class="fas fa-external-link-alt" style="font-size: 0.875rem;"></i>
                            </button>
                            <button type="button" onclick="estudosVisuaisView.excluirMindmap('${mapa.id}')" class="btn-icon" style="color: #ef4444;" title="Excluir Mapa">
                                <i class="fas fa-trash-alt" style="font-size: 0.875rem;"></i>
                            </button>
                        </div>
                    </div>

                    <h3 style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${window.escapeHTML(mapa.titulo)}
                    </h3>
                    <p style="font-size: 0.8125rem; color: var(--color-slate-500); font-weight: 600;">
                        ${totalNos} conceitos conectados
                    </p>
                </div>

                <button type="button" onclick="estudosVisuaisView.abrirMindmap('${mapa.id}')" class="btn-primary" style="width: 100%; justify-content: center; padding: 0.625rem; background-color: var(--color-slate-800);">
                    <i class="fas fa-project-diagram"></i> <span>Abrir Canvas Interativo</span>
                </button>
            </div>
        `;
    },

    contarNos(node) {
        if (!node) return 0;
        let count = 1;
        if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
                count += this.contarNos(child);
            }
        }
        return count;
    },

    emptyStateMindmaps() {
        return `
            <div class="card" style="grid-column: 1 / -1; padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 2px dashed var(--color-slate-200);">
                <div style="width: 4rem; height: 4rem; border-radius: var(--radius-full); background-color: var(--color-slate-100); color: var(--color-slate-400); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; margin-bottom: 1rem;">
                    <i class="fas fa-project-diagram"></i>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.5rem;">Nenhum Mapa Mental Criado</h3>
                <p style="color: var(--color-slate-500); font-size: 0.875rem; max-width: 440px; margin-bottom: 1.5rem;">Estruture ideias e conceitos hierárquicos em um canvas interativo com suporte a IA e upload de arquivos.</p>
                <div style="display: gap: 0.75rem; flex-wrap: wrap; justify-content: center;">
                    <button type="button" onclick="estudosVisuaisView.abrirModalIAMindmap()" class="btn-secondary">
                        <i class="fas fa-robot"></i> <span>Gerar com IA / Upload</span>
                    </button>
                    <button type="button" onclick="estudosVisuaisView.criarNovoMindmap()" class="btn-primary">
                        <i class="fas fa-plus"></i> <span>Criar Manualmente</span>
                    </button>
                </div>
            </div>
        `;
    },

    abrirModalIAMindmap() {
        this.contextoDocumentoTemp = '';
        const html = `
            <div style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4); max-height: 75vh; overflow-y: auto;" class="custom-scrollbar">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4);">
                    <div>
                        <label class="form-label">Disciplina</label>
                        <select id="mm-ai-disciplina" class="form-select" onchange="if(this.value==='__OUTRA__'){ document.getElementById('mm-disciplina-custom-wrap').style.display='block'; document.getElementById('mm-disciplina-custom').focus(); } else { document.getElementById('mm-disciplina-custom-wrap').style.display='none'; }">
                            <option value="Matemática">Matemática</option>
                            <option value="Língua Portuguesa">Língua Portuguesa</option>
                            <option value="Ciências">Ciências</option>
                            <option value="História">História</option>
                            <option value="Geografia" selected>Geografia</option>
                            <option value="Física">Física</option>
                            <option value="Química">Química</option>
                            <option value="Biologia">Biologia</option>
                            <option value="Língua Inglesa">Língua Inglesa</option>
                            <option value="Arte">Arte</option>
                            <option value="Educação Física">Educação Física</option>
                            <option value="Filosofia">Filosofia</option>
                            <option value="Sociologia">Sociologia</option>
                            <option value="Ensino Religioso">Ensino Religioso</option>
                            <option value="Literatura">Literatura</option>
                            <option value="Redação">Redação</option>
                            <option value="Projeto de Vida">Projeto de Vida</option>
                            <option value="Robótica / Tecnologia">Robótica / Tecnologia</option>
                            <option value="Culinária / Gastronomia">Culinária / Gastronomia</option>
                            <option value="__OUTRA__">+ Outra disciplina (digitar)...</option>
                        </select>
                        <div id="mm-disciplina-custom-wrap" style="display: none; margin-top: 0.5rem;">
                            <input type="text" id="mm-disciplina-custom" class="form-input" placeholder="Digite o nome da disciplina...">
                        </div>
                    </div>
                    <div>
                        <label class="form-label">Série / Segmento</label>
                        <select id="mm-ai-serie" class="form-select" onchange="if(this.value==='__OUTRA__'){ document.getElementById('mm-serie-custom-wrap').style.display='block'; document.getElementById('mm-serie-custom').focus(); } else { document.getElementById('mm-serie-custom-wrap').style.display='none'; }">
                            <option value="Educação Infantil">Educação Infantil</option>
                            <option value="1º Ano — Fundamental I">1º Ano — Fundamental I</option>
                            <option value="2º Ano — Fundamental I">2º Ano — Fundamental I</option>
                            <option value="3º Ano — Fundamental I">3º Ano — Fundamental I</option>
                            <option value="4º Ano — Fundamental I">4º Ano — Fundamental I</option>
                            <option value="5º Ano — Fundamental I">5º Ano — Fundamental I</option>
                            <option value="6º Ano — Fundamental II">6º Ano — Fundamental II</option>
                            <option value="7º Ano — Fundamental II" selected>7º Ano — Fundamental II</option>
                            <option value="8º Ano — Fundamental II">8º Ano — Fundamental II</option>
                            <option value="9º Ano — Fundamental II">9º Ano — Fundamental II</option>
                            <option value="1ª Série — Ensino Médio">1ª Série — Ensino Médio</option>
                            <option value="2ª Série — Ensino Médio">2ª Série — Ensino Médio</option>
                            <option value="3ª Série — Ensino Médio">3ª Série — Ensino Médio</option>
                            <option value="Ensino Superior / Faculdade">Ensino Superior / Faculdade</option>
                            <option value="EJA (Jovens e Adultos)">EJA (Jovens e Adultos)</option>
                            <option value="Pré-Vestibular / Concurso">Pré-Vestibular / Concurso</option>
                            <option value="__OUTRA__">+ Outro segmento (digitar)...</option>
                        </select>
                        <div id="mm-serie-custom-wrap" style="display: none; margin-top: 0.5rem;">
                            <input type="text" id="mm-serie-custom" class="form-input" placeholder="Digite o segmento / ano...">
                        </div>
                    </div>
                </div>

                <div>
                    <label class="form-label">Tema / Conceito Raiz do Mapa</label>
                    <input type="text" id="mm-ai-assunto" class="form-input" placeholder="Ex: Climas do Brasil, Tabela Periódica, Feudalismo...">
                </div>

                <div>
                    <label class="form-label">Nível de Profundidade</label>
                    <select id="mm-ai-profundidade" class="form-select">
                        <option value="2">2 Níveis (Tema Central e Ramos Principais)</option>
                        <option value="3" selected>3 Níveis (Tema, Ramos e Subconceitos - Recomendado)</option>
                        <option value="4">4 Níveis (Completo e Aprofundado)</option>
                    </select>
                </div>

                <!-- CONTEXTO DOCUMENTAL / NOTEBOOKLM -->
                <div style="background-color: var(--color-slate-50); border: 1px solid var(--color-slate-200); border-radius: var(--radius-xl); padding: var(--spacing-4); display: flex; flex-direction: column; gap: var(--spacing-3);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.8125rem; font-weight: 800; color: var(--color-slate-700); display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-file-upload" style="color: var(--color-primary);"></i> Contexto / Apostila / NotebookLM
                        </span>
                        <span id="mm-badge-contexto" style="font-size: 0.6875rem; font-weight: 700; color: var(--color-slate-400);">Opcional</span>
                    </div>

                    <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                        <label class="btn-outline interactive-element" style="cursor: pointer; padding: 0.5rem 0.875rem; font-size: 0.75rem; display: flex; align-items: center; gap: 0.375rem; background-color: #fff;">
                            <i class="fas fa-paperclip"></i> <span>Anexar Arquivo (PDF / TXT / MD)</span>
                            <input type="file" id="mm-file-input" accept=".txt,.md,.pdf,.csv,.json" style="display: none;" onchange="estudosVisuaisView.carregarArquivoMindmap(this)">
                        </label>
                        <span id="mm-nome-arquivo" style="font-size: 0.75rem; color: var(--color-slate-500); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;"></span>
                    </div>

                    <div>
                        <label class="form-label" style="font-size: 0.75rem; color: var(--color-slate-500);">Ou cole notas do Google NotebookLM:</label>
                        <textarea id="mm-contexto-texto" rows="2" class="form-input custom-scrollbar" placeholder="Cole aqui notas ou o link do caderno..." style="font-size: 0.8125rem; resize: vertical;"></textarea>
                    </div>
                </div>

                <div id="mm-ai-loading" style="display: none; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem; text-align: center;">
                    <i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--color-primary); margin-bottom: 0.75rem;"></i>
                    <p style="font-size: 0.875rem; font-weight: 800; color: var(--color-primary);">Construindo a árvore conceitual do Mapa Mental...</p>
                </div>

                <div style="display: flex; gap: var(--spacing-3); margin-top: var(--spacing-2); padding-top: var(--spacing-4); border-top: 1px solid var(--color-slate-100);">
                    <button type="button" onclick="controller.closeModal()" class="btn-secondary" style="flex: 1; justify-content: center; padding: 0.75rem;">Cancelar</button>
                    <button type="button" onclick="estudosVisuaisView.gerarMindmapComIA()" class="btn-primary" style="flex: 1; justify-content: center; padding: 0.75rem;">
                        <i class="fas fa-magic"></i> <span>Gerar Mapa</span>
                    </button>
                </div>
            </div>
        `;
        controller.openModal('Gerar Mapa Mental com IA', html, 'large');
    },

    async carregarArquivoMindmap(input) {
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        const nomeEl = document.getElementById('mm-nome-arquivo');
        const badgeEl = document.getElementById('mm-badge-contexto');

        try {
            if (nomeEl) nomeEl.innerText = `Lendo ${file.name}...`;
            const texto = await lerArquivoTexto(file);
            this.contextoDocumentoTemp = texto;

            if (nomeEl) nomeEl.innerText = `📄 ${file.name} (${texto.length} carac.)`;
            if (badgeEl) {
                badgeEl.innerText = `✅ Carregado`;
                badgeEl.style.color = '#059669';
            }
            Toast.show(`Arquivo "${file.name}" carregado!`, 'success');
        } catch (e) {
            console.error(e);
            if (nomeEl) nomeEl.innerText = 'Erro ao ler';
            Toast.show('Não foi possível ler o arquivo anexado.', 'error');
        }
    },

    async gerarMindmapComIA() {
        let disciplina = document.getElementById('mm-ai-disciplina')?.value;
        if (disciplina === '__OUTRA__') {
            disciplina = document.getElementById('mm-disciplina-custom')?.value.trim();
        }
        let serie = document.getElementById('mm-ai-serie')?.value;
        if (serie === '__OUTRA__') {
            serie = document.getElementById('mm-serie-custom')?.value.trim();
        }
        const assunto = document.getElementById('mm-ai-assunto')?.value.trim();
        const profundidade = parseInt(document.getElementById('mm-ai-profundidade')?.value || '3');
        const textoManual = document.getElementById('mm-contexto-texto')?.value.trim() || '';

        if (!disciplina || !assunto) return Toast.show("Preencha a disciplina e o assunto.", "warning");

        const contextoFinal = (this.contextoDocumentoTemp ? `${this.contextoDocumentoTemp}\n\n` : '') + textoManual;

        const loadingEl = document.getElementById('mm-ai-loading');
        if (loadingEl) loadingEl.style.display = 'flex';

        try {
            const resultado = await aiService.gerarMindmap({
                disciplina,
                serie,
                assunto,
                profundidade,
                contextoDocumento: contextoFinal
            });

            const novoMindmap = {
                id: 'map_' + Date.now().toString(36),
                titulo: resultado.titulo || `${assunto} - ${serie || 'Geral'}`,
                disciplina: resultado.disciplina || disciplina,
                serie: resultado.serie || serie || 'Geral',
                root: resultado.root || {
                    id: 'root',
                    label: assunto,
                    color: '#4f46e5',
                    children: []
                }
            };

            await model.saveMindmap(novoMindmap);
            controller.closeModal();
            Toast.show("Mapa Mental gerado com sucesso!", "success");
            this.abrirMindmap(novoMindmap.id);
        } catch (error) {
            console.error(error);
            Toast.show(error.message || "Erro ao gerar Mapa Mental via IA.", "error");
        } finally {
            if (loadingEl) loadingEl.style.display = 'none';
        }
    },

    async criarNovoMindmap() {
        const novoMindmap = {
            id: 'map_' + Date.now().toString(36),
            titulo: 'Novo Mapa Mental',
            disciplina: 'Geral',
            serie: '',
            root: {
                id: 'root',
                label: 'Ideia Central',
                color: '#4f46e5',
                children: [
                    { id: 'node_1', label: 'Tópico 1', color: '#3b82f6', children: [] },
                    { id: 'node_2', label: 'Tópico 2', color: '#10b981', children: [] }
                ]
            }
        };
        await model.saveMindmap(novoMindmap);
        this.abrirMindmap(novoMindmap.id);
    },

    async excluirMindmap(mapaId) {
        if (confirm("Deseja realmente excluir este Mapa Mental?")) {
            await model.deleteMindmap(mapaId);
            Toast.show("Mapa Mental removido.", "info");
            this.render('view-container');
        }
    },

    abrirMindmap(id) {
        this.currentMindmap = (model.state.mindmaps || []).find(m => String(m.id) === String(id));
        if (!this.currentMindmap) return;
        this.zoomLevel = 1;
        this.panX = 80;
        this.panY = 220;
        this.collapsedNodes.clear();
        this.render('view-container');
        this.setupMindmapEvents();
    },

    renderVisualizadorMindmap() {
        const mapa = this.currentMindmap;

        return `
            <div style="display: flex; flex-direction: column; gap: var(--spacing-4);">
                <!-- TOOLBAR DO MAPA MENTAL -->
                <div class="card" style="padding: var(--spacing-3) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-3);">
                    <div style="display: flex; align-items: center; gap: var(--spacing-4); flex: 1;">
                        <button onclick="estudosVisuaisView.voltarParaGaleria('mindmaps')" class="btn-secondary" style="padding: 0.5rem 0.875rem;">
                            <i class="fas fa-arrow-left"></i> <span>Voltar</span>
                        </button>
                        <input type="text" id="mapa-titulo-edit" value="${window.escapeHTML(mapa.titulo)}" 
                               class="form-input" style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); max-width: 420px;"
                               onchange="estudosVisuaisView.salvarTituloMindmap(this.value)">
                    </div>

                    <div style="display: flex; gap: 0.5rem;">
                        <button onclick="estudosVisuaisView.centralizarMindmap()" class="btn-secondary" title="Centralizar visão">
                            <i class="fas fa-crosshairs"></i> <span>Centralizar</span>
                        </button>
                        <button onclick="estudosVisuaisView.exportarSVG()" class="btn-secondary" title="Exportar como SVG Completo">
                            <i class="fas fa-download"></i> <span>Exportar SVG</span>
                        </button>
                        <button onclick="window.print()" class="btn-primary" style="background-color: #4f46e5;" title="Imprimir / PDF">
                            <i class="fas fa-print"></i> <span>Imprimir</span>
                        </button>
                    </div>
                </div>

                <!-- VIEWPORT DO MAPA MENTAL COM PAN/ZOOM -->
                <div id="mindmap-viewport-el" class="mindmap-viewport">
                    
                    <div id="mindmap-world-el" class="mindmap-world" style="transform: translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel});">
                        <!-- CAMADA SVG DE CONEXÕES -->
                        <svg id="mindmap-svg-el" class="mindmap-svg-layer"></svg>

                        <!-- CAMADA HTML DE NÓS -->
                        <div id="mindmap-nodes-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                            <!-- Renderizado dinamicamente via JS -->
                        </div>
                    </div>

                    <!-- CONTROLES FLUTUANTES DE ZOOM -->
                    <div class="mindmap-controls-panel">
                        <button onclick="estudosVisuaisView.ajustarZoom(0.15)" class="btn-icon" title="Zoom In">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button onclick="estudosVisuaisView.ajustarZoom(-0.15)" class="btn-icon" title="Zoom Out">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button onclick="estudosVisuaisView.resetarZoom()" class="btn-icon" title="Resetar Zoom (100%)">
                            <i class="fas fa-compress-arrows-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    async salvarTituloMindmap(novoTitulo) {
        if (!this.currentMindmap) return;
        this.currentMindmap.titulo = novoTitulo;
        await model.saveMindmap(this.currentMindmap);
        Toast.show("Título do mapa salvo!", "success");
    },

    setupMindmapEvents() {
        const viewport = document.getElementById('mindmap-viewport-el');
        if (!viewport) return;

        // Desenhar árvore
        this.renderArvoreMindmap();

        let animFrameScheduled = false;
        let pendingNodeX = 0;
        let pendingNodeY = 0;

        // Drag / Pan no canvas (fundo)
        viewport.onmousedown = (e) => {
            if (e.target.closest('.mindmap-node-card') || e.target.closest('.mindmap-controls-panel')) return;
            this.isPanning = true;
            this.startX = e.clientX - this.panX;
            this.startY = e.clientY - this.panY;
        };

        window.onmousemove = (e) => {
            if (this.isPanning) {
                this.panX = e.clientX - this.startX;
                this.panY = e.clientY - this.startY;
                if (!animFrameScheduled) {
                    animFrameScheduled = true;
                    requestAnimationFrame(() => {
                        animFrameScheduled = false;
                        this.atualizarTransformCanvas();
                    });
                }
            } else if (this.draggingNodeId) {
                const deltaX = (e.clientX - this.dragStartMouseX) / this.zoomLevel;
                const deltaY = (e.clientY - this.dragStartMouseY) / this.zoomLevel;
                pendingNodeX = Math.round(this.dragStartNodeX + deltaX);
                pendingNodeY = Math.round(this.dragStartNodeY + deltaY);

                const node = this.encontrarNo(this.currentMindmap.root, this.draggingNodeId);
                if (node) {
                    node.customX = pendingNodeX;
                    node.customY = pendingNodeY;
                }

                if (!animFrameScheduled) {
                    animFrameScheduled = true;
                    requestAnimationFrame(() => {
                        animFrameScheduled = false;
                        const nodeEl = document.getElementById(`mm-node-el-${this.draggingNodeId}`);
                        if (nodeEl) {
                            nodeEl.style.left = `${pendingNodeX}px`;
                            nodeEl.style.top = `${pendingNodeY}px`;
                        }
                        this.redesenharLinhasSVG();
                    });
                }
            }
        };

        window.onmouseup = async () => {
            if (this.isPanning) {
                this.isPanning = false;
            }
            if (this.draggingNodeId) {
                this.draggingNodeId = null;
                await model.saveMindmap(this.currentMindmap);
            }
        };

        // Scroll wheel Zoom
        viewport.onwheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.08 : 0.08;
            this.ajustarZoom(delta);
        };
    },

    iniciarArrasteNo(e, nodeId) {
        e.stopPropagation();
        if (e.target.closest('.btn-icon') || e.target.closest('.mindmap-node-toggle')) return;
        
        const pos = this.posMapCache.get(nodeId);
        if (!pos) return;

        this.draggingNodeId = nodeId;
        this.dragStartMouseX = e.clientX;
        this.dragStartMouseY = e.clientY;
        this.dragStartNodeX = pos.x;
        this.dragStartNodeY = pos.y;
    },

    ajustarZoom(delta) {
        this.zoomLevel = Math.min(Math.max(0.3, this.zoomLevel + delta), 2.5);
        this.atualizarTransformCanvas();
    },

    resetarZoom() {
        this.zoomLevel = 1;
        this.atualizarTransformCanvas();
    },

    centralizarMindmap() {
        this.zoomLevel = 1;
        this.panX = 80;
        this.panY = 220;
        this.atualizarTransformCanvas();
    },

    atualizarTransformCanvas() {
        const world = document.getElementById('mindmap-world-el');
        if (world) {
            world.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
        }
    },

    // --- ALGORITMO DE LAYOUT DA ÁRVORE CONCEITUAL ---
    renderArvoreMindmap() {
        const nodesLayer = document.getElementById('mindmap-nodes-layer');
        const svgLayer = document.getElementById('mindmap-svg-el');
        if (!nodesLayer || !svgLayer || !this.currentMindmap) return;

        nodesLayer.innerHTML = '';
        svgLayer.innerHTML = '';

        const root = this.currentMindmap.root;
        this.posMapCache.clear();

        let currentY = 50;
        const HORIZONTAL_GAP = 230;
        const VERTICAL_GAP = 70;

        // Função recursiva para calcular posições
        const calcularPosicoes = (node, level = 0, startX = 50) => {
            const hasChildren = node.children && node.children.length > 0 && !this.collapsedNodes.has(node.id);
            let x = node.customX !== undefined ? node.customX : (startX + (level * HORIZONTAL_GAP));
            let y;

            if (!hasChildren) {
                y = node.customY !== undefined ? node.customY : currentY;
                if (node.customY === undefined) currentY += VERTICAL_GAP;
                this.posMapCache.set(node.id, { x, y, node, level });
                return y;
            }

            const childYs = [];
            for (const child of node.children) {
                childYs.push(calcularPosicoes(child, level + 1, startX));
            }

            const minY = Math.min(...childYs);
            const maxY = Math.max(...childYs);
            const defaultY = (minY + maxY) / 2;

            y = node.customY !== undefined ? node.customY : defaultY;
            this.posMapCache.set(node.id, { x, y, node, level });
            return y;
        };

        calcularPosicoes(root);

        // Renderizar Cartões HTML
        let nodesHtml = '';

        this.posMapCache.forEach((pos, id) => {
            const { x, y, node, level } = pos;
            const isRoot = level === 0;
            const isBranch = level === 1;
            const hasChildren = node.children && node.children.length > 0;
            const isCollapsed = this.collapsedNodes.has(id);
            const corRamo = node.color || (isRoot ? '#4f46e5' : '#3b82f6');

            // Gerar card HTML do nó
            const cardClass = isRoot ? 'mindmap-node-card mindmap-node-card--root' : isBranch ? 'mindmap-node-card mindmap-node-card--branch' : 'mindmap-node-card';
            const borderStyle = isBranch ? `border-left-color: ${corRamo};` : '';

            nodesHtml += `
                <div id="mm-node-el-${id}" class="${cardClass}" style="left: ${x}px; top: ${y}px; ${borderStyle} cursor: grab;" 
                     onmousedown="estudosVisuaisView.iniciarArrasteNo(event, '${id}')"
                     onclick="estudosVisuaisView.selecionarNo('${id}')">
                    <span style="font-weight: 800;">${formatarTextoComLatex(sanitizeComLatex(node.label))}</span>

                    ${hasChildren ? `
                        <div class="mindmap-node-toggle" onclick="event.stopPropagation(); estudosVisuaisView.toggleRecolherNo('${id}')" title="${isCollapsed ? 'Expandir ramo' : 'Recolher ramo'}">
                            <i class="fas ${isCollapsed ? 'fa-plus' : 'fa-minus'}"></i>
                        </div>
                    ` : ''}

                    <div style="display: inline-flex; gap: 0.25rem; margin-left: 0.375rem;">
                        <button onclick="event.stopPropagation(); estudosVisuaisView.adicionarFilho('${id}')" class="btn-icon" style="padding: 0.2rem; font-size: 0.625rem; color: var(--color-slate-400);" title="Adicionar subconceito">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button onclick="event.stopPropagation(); estudosVisuaisView.editarNoModal('${id}')" class="btn-icon" style="padding: 0.2rem; font-size: 0.625rem; color: var(--color-slate-400);" title="Editar texto">
                            <i class="fas fa-pen"></i>
                        </button>
                        ${!isRoot ? `
                            <button onclick="event.stopPropagation(); estudosVisuaisView.excluirNo('${id}')" class="btn-icon" style="padding: 0.2rem; font-size: 0.625rem; color: #ef4444;" title="Excluir nó">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        nodesLayer.innerHTML = nodesHtml;
        this.redesenharLinhasSVG();
        renderKatex(nodesLayer);
    },

    redesenharLinhasSVG() {
        const svgLayer = document.getElementById('mindmap-svg-el');
        if (!svgLayer) return;

        let svgPathsHtml = '';

        this.posMapCache.forEach((pos, id) => {
            const { node, level } = pos;
            const nodeX = node.customX !== undefined ? node.customX : pos.x;
            const nodeY = node.customY !== undefined ? node.customY : pos.y;
            const hasChildren = node.children && node.children.length > 0;
            const isCollapsed = this.collapsedNodes.has(id);
            const isRoot = level === 0;
            const corRamo = node.color || (isRoot ? '#4f46e5' : '#3b82f6');

            if (hasChildren && !isCollapsed) {
                for (const child of node.children) {
                    const childPos = this.posMapCache.get(child.id);
                    if (childPos) {
                        const childX = child.customX !== undefined ? child.customX : childPos.x;
                        const childY = child.customY !== undefined ? child.customY : childPos.y;

                        const startX = nodeX + 160;
                        const startY = nodeY + 20;
                        const endX = childX;
                        const endY = childY + 20;
                        const controlX1 = startX + (endX - startX) / 2;
                        const controlY1 = startY;
                        const controlX2 = startX + (endX - startX) / 2;
                        const controlY2 = endY;

                        const strokeColor = child.color || corRamo || '#94a3b8';
                        svgPathsHtml += `
                            <path d="M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}" 
                                  class="mindmap-path" stroke="${strokeColor}" stroke-width="2.5" />
                        `;
                    }
                }
            }
        });

        svgLayer.innerHTML = svgPathsHtml;
    },

    toggleRecolherNo(id) {
        if (this.collapsedNodes.has(id)) {
            this.collapsedNodes.delete(id);
        } else {
            this.collapsedNodes.add(id);
        }
        this.renderArvoreMindmap();
    },

    encontrarNo(node, targetId) {
        if (node.id === targetId) return node;
        if (node.children) {
            for (const child of node.children) {
                const found = this.encontrarNo(child, targetId);
                if (found) return found;
            }
        }
        return null;
    },

    encontrarPai(node, targetId) {
        if (node.children) {
            for (const child of node.children) {
                if (child.id === targetId) return node;
                const found = this.encontrarPai(child, targetId);
                if (found) return found;
            }
        }
        return null;
    },

    async adicionarFilho(parentId) {
        const parent = this.encontrarNo(this.currentMindmap.root, parentId);
        if (!parent) return;
        if (!parent.children) parent.children = [];

        const novoId = 'node_' + Date.now().toString(36);
        parent.children.push({
            id: novoId,
            label: 'Novo Subconceito',
            children: []
        });

        this.collapsedNodes.delete(parentId);
        await model.saveMindmap(this.currentMindmap);
        this.renderArvoreMindmap();
        this.editarNoModal(novoId);
    },

    async excluirNo(nodeId) {
        if (nodeId === 'root') return;
        if (confirm("Excluir este conceito e seus sub-ramos?")) {
            const pai = this.encontrarPai(this.currentMindmap.root, nodeId);
            if (pai && pai.children) {
                pai.children = pai.children.filter(c => c.id !== nodeId);
                await model.saveMindmap(this.currentMindmap);
                this.renderArvoreMindmap();
            }
        }
    },

    editarNoModal(nodeId) {
        const node = this.encontrarNo(this.currentMindmap.root, nodeId);
        if (!node) return;

        const html = `
            <div style="padding: var(--spacing-5); display: flex; flex-direction: column; gap: var(--spacing-4);">
                <div>
                    <label class="form-label">Nome do Conceito / Texto do Nó</label>
                    <input type="text" id="edit-node-label" value="${window.escapeHTML(node.label)}" class="form-input" style="font-size: 1rem; font-weight: 700;">
                </div>

                <div>
                    <label class="form-label">Detalhes / Nota Explicativa (Opcional)</label>
                    <textarea id="edit-node-detalhes" rows="2" class="form-input custom-scrollbar">${window.escapeHTML(node.detalhes || '')}</textarea>
                </div>

                ${node.id !== 'root' ? `
                    <div>
                        <label class="form-label">Cor do Ramo</label>
                        <div style="display: flex; gap: 0.5rem;">
                            ${['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#475569'].map(c => `
                                <div onclick="document.getElementById('edit-node-color').value='${c}'; this.style.transform='scale(1.2)';" 
                                     style="width: 2rem; height: 2rem; border-radius: 50%; background-color: ${c}; cursor: pointer; transition: transform 0.2s;"></div>
                            `).join('')}
                        </div>
                        <input type="hidden" id="edit-node-color" value="${node.color || '#3b82f6'}">
                    </div>
                ` : ''}

                <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
                    <button type="button" onclick="controller.closeModal()" class="btn-secondary">Cancelar</button>
                    <button type="button" onclick="estudosVisuaisView.salvarEdicaoNo('${nodeId}')" class="btn-primary">Salvar Alterações</button>
                </div>
            </div>
        `;

        controller.openModal('Editar Conceito do Mapa', html);
    },

    async salvarEdicaoNo(nodeId) {
        const node = this.encontrarNo(this.currentMindmap.root, nodeId);
        if (!node) return;

        const label = document.getElementById('edit-node-label')?.value.trim();
        const detalhes = document.getElementById('edit-node-detalhes')?.value.trim();
        const color = document.getElementById('edit-node-color')?.value;

        if (!label) return Toast.show("O conceito precisa ter um nome.", "warning");

        node.label = label;
        node.detalhes = detalhes;
        if (color) node.color = color;

        await model.saveMindmap(this.currentMindmap);
        controller.closeModal();
        Toast.show("Conceito atualizado!", "success");
        this.renderArvoreMindmap();
    },

    selecionarNo(nodeId) {
        this.selectedNodeId = nodeId;
    },

    // --- EXPORTAÇÃO SVG VETORIAL COMPLETA (CAIXAS, TEXTOS E CONEXÕES) ---
    exportarSVG() {
        if (!this.currentMindmap) return;

        Toast.show("Gerando arquivo SVG vetorial de alta definição...", "info");

        // Calcular limites de coordenadas de todos os nós
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.posMapCache.forEach(pos => {
            const x = pos.node.customX !== undefined ? pos.node.customX : pos.x;
            const y = pos.node.customY !== undefined ? pos.node.customY : pos.y;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x + 220 > maxX) maxX = x + 220;
            if (y + 80 > maxY) maxY = y + 80;
        });

        const padding = 60;
        const width = Math.max(1200, (maxX - minX) + (padding * 2));
        const height = Math.max(800, (maxY - minY) + (padding * 2));
        const offsetX = padding - minX;
        const offsetY = padding - minY;

        // Gerar caminhos SVG com offset
        let pathsSvg = '';
        this.posMapCache.forEach((pos, id) => {
            const { node, level } = pos;
            const nodeX = (node.customX !== undefined ? node.customX : pos.x) + offsetX;
            const nodeY = (node.customY !== undefined ? node.customY : pos.y) + offsetY;
            const hasChildren = node.children && node.children.length > 0;
            const isCollapsed = this.collapsedNodes.has(id);
            const isRoot = level === 0;
            const corRamo = node.color || (isRoot ? '#4f46e5' : '#3b82f6');

            if (hasChildren && !isCollapsed) {
                for (const child of node.children) {
                    const childPos = this.posMapCache.get(child.id);
                    if (childPos) {
                        const childX = (child.customX !== undefined ? child.customX : childPos.x) + offsetX;
                        const childY = (child.customY !== undefined ? child.customY : childPos.y) + offsetY;

                        const startX = nodeX + 160;
                        const startY = nodeY + 22;
                        const endX = childX;
                        const endY = childY + 22;
                        const controlX1 = startX + (endX - startX) / 2;
                        const controlY1 = startY;
                        const controlX2 = startX + (endX - startX) / 2;
                        const controlY2 = endY;

                        const strokeColor = child.color || corRamo || '#94a3b8';
                        pathsSvg += `
                            <path d="M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}" 
                                  fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" />
                        `;
                    }
                }
            }
        });

        // Gerar caixas e textos de cada nó
        let nodesSvg = '';
        this.posMapCache.forEach((pos) => {
            const { node, level } = pos;
            const isRoot = level === 0;
            const isBranch = level === 1;
            const corRamo = node.color || (isRoot ? '#4f46e5' : '#3b82f6');
            const x = (node.customX !== undefined ? node.customX : pos.x) + offsetX;
            const y = (node.customY !== undefined ? node.customY : pos.y) + offsetY;

            const boxWidth = isRoot ? 200 : 175;
            const boxHeight = 44;
            const fillBg = isRoot ? '#4f46e5' : '#ffffff';
            const textColor = isRoot ? '#ffffff' : '#1e293b';
            const strokeColor = isBranch ? corRamo : '#cbd5e1';
            const strokeWidth = isBranch ? 3 : 1.5;

            // Escapar texto para XML
            const cleanLabel = (node.label || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            nodesSvg += `
                <g transform="translate(${x}, ${y})">
                    <rect width="${boxWidth}" height="${boxHeight}" rx="12" ry="12" 
                          fill="${fillBg}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
                    <text x="14" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
                          font-size="${isRoot ? 14 : 12.5}" font-weight="700" fill="${textColor}">
                        ${cleanLabel}
                    </text>
                </g>
            `;
        });

        const tituloEscapado = (this.currentMindmap.titulo || 'Mapa Mental')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        const svgCompleto = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <rect width="100%" height="100%" fill="#f8fafc" />
    <text x="30" y="40" font-size="20" font-weight="900" fill="#1e293b">${tituloEscapado}</text>
    <text x="30" y="60" font-size="12" font-weight="600" fill="#64748b">${(this.currentMindmap.disciplina || 'Geral')} — Planner Pro</text>
    
    <g id="conexoes-ramos">
        ${pathsSvg}
    </g>
    
    <g id="caixas-conceitos">
        ${nodesSvg}
    </g>
</svg>`;

        const blob = new Blob([svgCompleto], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(this.currentMindmap.titulo || 'Mapa_Mental').replace(/[^a-zA-Z0-9_-]/g, '_')}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Toast.show("SVG vetorial completo exportado com sucesso!", "success");
    }
};

if (typeof window !== 'undefined') {
    window.estudosVisuaisView = estudosVisuaisView;
}
