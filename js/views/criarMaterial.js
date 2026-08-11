import { model } from '../model.js';
import { controller } from '../controller.js';
import { aiService } from '../ai-service.js';
import { Toast } from '../components/toast.js';
import { lerArquivoTexto } from '../utils.js';

export const criarMaterialView = {
    ferramentaAtiva: null,
    contextoArquivoTexto: '',
    categoriasMenu: [
        {
            titulo: 'PLANEJAR',
            itens: [
                { id: 'planejamento', label: 'Planejamento', icone: 'far fa-calendar-alt', cor: 'text-indigo-500' }
            ]
        },
        {
            titulo: 'APLICAR EM SALA',
            itens: [
                { id: 'dinamica-jogo', label: 'Dinâmica e Jogo', icone: 'fas fa-users', cor: 'text-blue-500' },
                { id: 'situacao-problema', label: 'Situação-Problema', icone: 'far fa-lightbulb', cor: 'text-amber-500' },
                { id: 'atividade-investigativa', label: 'Atividade Investigativa', icone: 'fas fa-microscope', cor: 'text-purple-500' },
                { id: 'atividade-imprimivel', label: 'Atividade Imprimível', icone: 'fas fa-print', cor: 'text-emerald-500' },
                { id: 'apresentacao', label: 'Apresentação Animada', icone: 'fas fa-desktop', cor: 'text-slate-300', badge: 'EM BREVE', disabled: true }
            ]
        },
        {
            titulo: "Prática de Laboratório",
            itens: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Fenômeno a ser investigado', placeholder: 'Ex: Leis de Newton, Células, Eletricidade...' },
                { id: 'materiais', tipo: 'text', label: 'Materiais Disponíveis', placeholder: 'Ex: Simulador PhET, Garrafas PET, Água, Sal...' },
                { id: 'abordagem', tipo: 'pills', label: 'Abordagem Investigativa', opcoes: ['Guiada (Passo a Passo)', 'Aberta (Alunos criam o método)'], default: 'Guiada (Passo a Passo)' },
                { id: 'adaptacao', tipo: 'inclusao' }
            ]
        },
        {
            titulo: 'AVALIAR',
            itens: [
                { id: 'avaliacao-prova', label: 'Avaliação / Prova', icone: 'fas fa-clipboard-list', cor: 'text-orange-500' },
                { id: 'lista-exercicios', label: 'Lista de Exercícios', icone: 'far fa-file-alt', cor: 'text-blue-600' },
                { id: 'atividade-intervencao', label: 'Atividade de Intervenção', icone: 'fas fa-bullseye', cor: 'text-indigo-500' }
            ]
        },
        {
            titulo: 'ADAPTAÇÕES',
            itens: [
                { id: 'adaptacao-tea', label: 'Adaptação TEA', icone: 'far fa-heart', cor: 'text-pink-500' },
                { id: 'adaptacao-tdah', label: 'Adaptação TDAH', icone: 'fas fa-bolt', cor: 'text-violet-500' },
                { id: 'pei', label: 'PEI', icone: 'fas fa-user-shield', cor: 'text-indigo-600' }
            ]
        },
        {
            titulo: 'EDUCAÇÃO INFANTIL',
            itens: [
                { id: 'sequencia-didatica', label: 'Sequência Didática', icone: 'fas fa-list-ol', cor: 'text-blue-400' },
                { id: 'rotina-semanal', label: 'Rotina Semanal', icone: 'far fa-smile', cor: 'text-emerald-400' },
                { id: 'proposta-brincadeira', label: 'Proposta de Brincadeira', icone: 'far fa-calendar', cor: 'text-purple-400' }
            ]
        }
    ],
    formConfig: {
        'pratica-laboratorio': {
            titulo: 'Prática de Laboratório',
            descricao: 'Roteiros guiados pelo Método Científico com simulações interativas',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Fenômeno a ser investigado', placeholder: 'Ex: Leis de Newton, Células, Eletricidade...' },
                { id: 'materiais', tipo: 'text', label: 'Materiais Disponíveis', placeholder: 'Ex: Simulador PhET, Garrafas PET, Água, Sal...' },
                { id: 'abordagem', tipo: 'pills', label: 'Abordagem Investigativa', opcoes: ['Guiada (Passo a Passo)', 'Aberta (Alunos criam o método)'], default: 'Guiada (Passo a Passo)' }
            ]
        },
        'planejamento': {
            titulo: 'Planejamento',
            descricao: 'Crie planos de aula, semanais, mensais, bimestrais e mais',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Tema', placeholder: 'Ex: Ecossistemas, Divisão Celular, Física Clássica...' },
                { id: 'tipo-plano', tipo: 'pills', label: 'TIPO DE PLANEJAMENTO', opcoes: ['Aula', 'Semanal', 'Mensal', 'Bimestral', 'Trimestral', 'Semestral', 'Anual'], default: 'Semanal' },
                { id: 'duracao', tipo: 'number', label: 'DURAÇÃO (MINUTOS)', default: 50 },
                { id: 'objetivos', tipo: 'text', label: 'Objetivos de aprendizagem', placeholder: 'Ex: Compreender a fotossíntese...' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EF06CI05' }
            ]
        },
        'dinamica-jogo': {
            titulo: 'Dinâmica e Jogo',
            descricao: 'Roteiros estruturados de dinâmicas de grupo pra usar em sala',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Tema', placeholder: 'Ex: Astronomia, Corpo Humano...' },
                {
                    id: 'estilo', tipo: 'pills-icon', label: 'ESTILO DA DINÂMICA', opcoes: [
                        { label: 'Quiz Batalha', icon: 'fas fa-bolt' }, { label: 'Jigsaw', icon: 'fas fa-puzzle-piece' },
                        { label: 'Simulação', icon: 'fas fa-masks-theater' }, { label: 'Gincana', icon: 'fas fa-flag-checkered' }
                    ], default: 'Quiz Batalha'
                },
                { id: 'tempo', tipo: 'pills', label: 'TEMPO DISPONÍVEL', opcoes: ['15 min', '30 min', 'Aula completa'], default: '30 min' },
                { id: 'tamanho', tipo: 'pills', label: 'TAMANHO DA TURMA', opcoes: ['Pequena', 'Média', 'Grande'], default: 'Média' }
            ]
        },
        'situacao-problema': {
            titulo: 'Situação-Problema',
            descricao: 'Problema contextualizado em escada de dificuldade — PBL com habilidades vinculadas',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Tema', placeholder: 'Ex: Frações, Eletricidade...' },
                { id: 'qtd-questoes', tipo: 'pills', label: 'NÚMERO DE QUESTÕES', opcoes: ['4', '5', '6', '7', '8'], default: '5' },
                { id: 'complexidade', tipo: 'pills', label: 'NÍVEL DE COMPLEXIDADE', opcoes: ['Básico', 'Intermediário', 'Avançado'], default: 'Intermediário' },
                { id: 'cenario', tipo: 'text', label: 'CENÁRIO SUGERIDO (opcional)', placeholder: 'Ex: feira livre do bairro, viagem de ônibus...' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EF05MA01' }
            ]
        },
        'atividade-investigativa': {
            titulo: 'Atividade Investigativa',
            descricao: 'Roteiros de experimentos ou pesquisas guiadas (Mão na Massa)',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Tema da Investigação', placeholder: 'Ex: Fotossíntese, Reações Químicas...' },
                { id: 'recursos', tipo: 'pills', label: 'RECURSOS DISPONÍVEIS', opcoes: ['Sala de Aula', 'Laboratório', 'Ar Livre', 'Casa'], default: 'Sala de Aula' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EF06CI05' }
            ]
        },
        'atividade-imprimivel': {
            titulo: 'Atividade Imprimível',
            descricao: 'Caça-palavras, cruzadinha, bingo, sudoku — em PDF para imprimir',
            campos: [
                {
                    id: 'tipo-atividade', tipo: 'grid-cards', label: 'Atividade Imprimível *', default: 'caca-palavras', opcoes: [
                        { id: 'caca-palavras', titulo: 'Caça-Palavras', desc: 'Encontre palavras', icone: 'fas fa-search', cor: 'text-indigo-500', bg: 'bg-indigo-50' },
                        { id: 'cruzadinha', titulo: 'Cruzadinha', desc: 'Palavras com dicas', icone: 'fas fa-hashtag', cor: 'text-teal-500', bg: 'bg-teal-50' },
                        { id: 'lacunas', titulo: 'Complete as Lacunas', desc: 'Preencher palavras', icone: 'far fa-file-alt', cor: 'text-emerald-500', bg: 'bg-emerald-50' },
                        { id: 'bingo', titulo: 'Bingo Pedagógico', desc: 'Cartelas de termos', icone: 'fas fa-th', cor: 'text-orange-500', bg: 'bg-orange-50' }
                    ]
                },
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'serie', tipo: 'select-serie' }, { id: 'disciplina', tipo: 'select-disciplina' }] },
                { id: 'modo-geracao', tipo: 'toggle-ia', label: 'Como deseja preencher o conteúdo?', default: 'ia' },
                { id: 'tema', tipo: 'text', label: 'Tema', placeholder: 'Ex: Viroses, Sistema Solar...', condicao: { campo: 'modo-geracao', valor: 'ia' } },
                { id: 'palavras-dinamicas', tipo: 'dynamic-words', label: 'Palavras', desc: 'Mínimo 4 palavras.', condicao: { campo: 'modo-geracao', valor: 'ia' } },
                { id: 'conteudo-manual', tipo: 'textarea', label: 'Suas Palavras ou Texto Base', placeholder: 'Ex: Mitocôndria - Respiração celular\nRibossomo - Síntese de proteínas...', condicao: { campo: 'modo-geracao', valor: 'manual' } }
            ]
        },
        'avaliacao-prova': {
            titulo: 'Avaliação / Prova',
            descricao: 'Crie provas completas com questões objetivas e dissertativas com gabarito.',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Tema', placeholder: 'Ex: Funções e Gráficos, Eletromagnetismo...' },
                { id: 'quantidade', tipo: 'number', label: 'QUANTIDADE DE QUESTÕES', default: 10 },
                { id: 'tipo-questao', tipo: 'pills', label: 'TIPO DE QUESTÃO', opcoes: ['Múltipla escolha', 'Dissertativa', 'Mista (ambas)'], default: 'Múltipla escolha' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EF08MA07' }
            ]
        },
        'lista-exercicios': {
            titulo: 'Lista de Exercícios',
            descricao: 'Gere listas de exercícios personalizadas com resoluções comentadas passo a passo.',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Tema', placeholder: 'Ex: Equações do 2º grau...' },
                { id: 'quantidade', tipo: 'number', label: 'QUANTIDADE DE EXERCÍCIOS', default: 10 },
                { id: 'tipo-questao', tipo: 'pills', label: 'TIPO DE EXERCÍCIO', opcoes: ['Múltipla escolha', 'Dissertativa', 'Mista (ambas)'], default: 'Múltipla escolha' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EF09MA06' }
            ]
        },
        'adaptacao-tea': {
            titulo: 'Adaptação TEA',
            descricao: 'Adapte atividades para alunos com autismo (TEA) focando em apoios visuais e linguagem literal.',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Tema ou Título do Material', placeholder: 'Ex: Revolução Industrial' },
                { id: 'conteudo-base', tipo: 'textarea', label: 'Conteúdo Original (Cole a atividade aqui)', placeholder: 'Cole o texto, prova ou questões que deseja adaptar...' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EF08HI01' }
            ]
        },
        'adaptacao-tdah': {
            titulo: 'Adaptação TDAH',
            descricao: 'Adapte atividades para alunos com TDAH, usando blocos curtos, transições sinalizadas e reforço frequente.',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Tema ou Título do Material', placeholder: 'Ex: Ligações Químicas' },
                { id: 'conteudo-base', tipo: 'textarea', label: 'Conteúdo Original (Cole a atividade aqui)', placeholder: 'Cole o texto ou questões que deseja adaptar...' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EF09CI01' }
            ]
        },
        'pei': {
            titulo: 'PEI',
            descricao: 'Plano de Ensino Individualizado para alunos com necessidades específicas de aprendizagem.',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Objetivo de Aprendizagem Geral', placeholder: 'Ex: Alfabetização matemática, Socialização...' },
                { id: 'perfil-aluno', tipo: 'textarea', label: 'Perfil do Estudante (Diagnóstico / Interesses)', placeholder: 'Descreva os interesses, habilidades e desafios do aluno...' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EF01MA01' }
            ]
        },
        'sequencia-didatica': {
            titulo: 'Sequência Didática',
            descricao: 'Conjunto de propostas encadeadas em torno de um tema integrador para a educação infantil.',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Tema Integrador', placeholder: 'Ex: O mundo das cores, Os animais da floresta...' },
                { id: 'duracao-dias', tipo: 'number', label: 'DURAÇÃO (DIAS)', default: 5 },
                { id: 'bncc', tipo: 'text', label: 'Campo de Experiência BNCC (opcional)', placeholder: 'Ex: EI02CG01' }
            ]
        },
        'rotina-semanal': {
            titulo: 'Rotina Semanal',
            descricao: 'Organização da semana com acolhimento, rodas, alimentação, descanso, propostas e parque.',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Foco Semanal', placeholder: 'Ex: Adaptação, Higiene...' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EI03CG01' }
            ]
        },
        'proposta-brincadeira': {
            titulo: 'Proposta de Brincadeira',
            descricao: 'Brincadeira com intencionalidade pedagógica: agrupamento, espaço, materiais e observação.',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Foco da Brincadeira', placeholder: 'Ex: Coordenação motora fina, Reconhecimento das cores...' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EI02TS01' }
            ]
        }
    },
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        container.innerHTML = `
            <div class="fade-in" style="padding-bottom: 6rem; display: flex; flex-direction: column; height: 100%;">
                <div style="margin-bottom: 1.5rem;">
                    <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Criar Conteúdo</h2>
                    <p class="text-slate-500 mt-1">Escolha uma ferramenta para começar a criar materiais com IA</p>
                </div>
                <div style="display: flex; flex-direction: row; gap: 1.5rem; align-items: flex-start; flex: 1; position: relative; min-height: 0;">
                    <aside class="tool-sidebar custom-scrollbar">
                        ${this.gerarMenuLateral()}
                    </aside>
                    <main id="form-area" class="tool-main-panel animate-enter">
                        ${this.gerarHTMLEmptyState()}
                    </main>
                </div>
            </div>
        `;
    },
    gerarMenuLateral() {
        return this.categoriasMenu.map(categoria => `
            <div class="tool-sidebar__section">
                <h4 class="tool-sidebar__title">${categoria.titulo}</h4>
                <div class="space-y-1">
                    ${categoria.itens.map(item => {
            const isAtivo = this.ferramentaAtiva === item.id;
            const activeClass = isAtivo ? 'tool-nav-btn--active' : '';
            return `
                        <button type="button" onclick="criarMaterialView.selecionarFerramenta('${item.id}', this)" class="tool-nav-btn interactive-element ${activeClass}" ${item.disabled ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                            <div class="tool-nav-btn__left">
                                <div class="tool-nav-btn__icon ${item.cor}"><i class="${item.icone}"></i></div>
                                <span>${item.label}</span>
                            </div>
                            ${item.badge ? `<span class="tool-nav-btn__badge">${item.badge}</span>` : ''}
                        </button>`;
        }).join('')}
                </div>
            </div>
        `).join('');
    },
    gerarHTMLEmptyState() {
        return `
            <div class="tool-empty-state animate-enter">
                <div class="tool-empty-state__icon-wrap">
                    <i class="fas fa-magic"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-800 mb-2">Pronto para criar?</h3>
                <p class="text-slate-500 text-sm">Selecione uma das ferramentas no menu lateral para configurar e gerar o conteúdo pedagógico.</p>
            </div>
        `;
    },
    selecionarFerramenta(idFerramenta, btnElement) {
        this.ferramentaAtiva = idFerramenta;
        document.querySelectorAll('.tool-nav-btn').forEach(b => {
            b.classList.remove('tool-nav-btn--active');
        });
        if (btnElement) {
            btnElement.classList.add('tool-nav-btn--active');
        }
        const formArea = document.getElementById('form-area');
        if (!formArea) return;

        formArea.innerHTML = this.renderizarFormularioDaFerramenta();

        if (window.uiController && typeof window.uiController.initAllDropdowns === 'function') {
            window.uiController.initAllDropdowns();
        }
    },
    renderizarFormularioDaFerramenta() {
        const config = this.formConfig[this.ferramentaAtiva];
        if (!config) return `<div class="tool-empty-state"><p class="text-slate-400">Em desenvolvimento ou sem configuração.</p></div>`;
        return `
            <div class="tool-main-panel__header animate-enter">
                <h3 class="tool-main-panel__title">${config.titulo}</h3>
                <p class="tool-main-panel__subtitle">${config.descricao}</p>
            </div>
            
            <form id="dynamic-form" class="space-y-6 flex-1 animate-enter">
                ${config.campos.map(campo => this.gerarHtmlInput(campo)).join('')}

                <!-- CONTEXTO ADICIONAL / NOTEBOOKLM & UPLOAD -->
                <div style="background-color: var(--color-slate-50); border: 1px solid var(--color-slate-200); border-radius: var(--radius-xl); padding: var(--spacing-4); margin-top: 1.5rem; display: flex; flex-direction: column; gap: var(--spacing-3);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.8125rem; font-weight: 800; color: var(--color-slate-700); display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-file-upload" style="color: var(--color-primary);"></i> Contexto de Apoio (Upload de Arquivo / NotebookLM)
                        </span>
                        <span id="mat-badge-contexto" style="font-size: 0.6875rem; font-weight: 700; color: var(--color-slate-400);">Opcional</span>
                    </div>

                    <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                        <label class="btn-outline interactive-element" style="cursor: pointer; padding: 0.5rem 0.875rem; font-size: 0.75rem; display: flex; align-items: center; gap: 0.375rem; background-color: #fff;">
                            <i class="fas fa-paperclip"></i> <span>Anexar Arquivo (PDF / TXT / MD)</span>
                            <input type="file" id="mat-file-input" accept=".txt,.md,.pdf,.csv,.json" style="display: none;" onchange="criarMaterialView.carregarArquivoContexto(this)">
                        </label>
                        <span id="mat-nome-arquivo" style="font-size: 0.75rem; color: var(--color-slate-500); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 260px;"></span>
                    </div>

                    <div>
                        <label class="form-label" style="font-size: 0.75rem; color: var(--color-slate-500);">Ou cole o Link / Resumo do Google NotebookLM:</label>
                        <textarea id="mat-contexto-texto" rows="2" class="form-input custom-scrollbar" placeholder="Cole anotações ou dados do seu caderno no NotebookLM..." style="font-size: 0.8125rem; resize: vertical;"></textarea>
                    </div>
                </div>
            </form>
            <div class="mt-8 pt-6 border-t border-slate-100 flex items-center gap-4 sticky bottom-0 bg-white z-10 pb-2">
                <button type="button" onclick="criarMaterialView.submeterFormulario(this)" class="btn-primary interactive-element w-full flex-1 py-3.5 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2" style="background-color: #4f46e5; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.25);">
                    <i class="fas fa-layer-group"></i> Gerar conteúdo com IA
                </button>
            </div>
        `;
    },
    renderizarResultadoA4(material) {
        const formArea = document.getElementById('form-area');
        if (!formArea) return;
        formArea.innerHTML = `
            <div class="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 animate-enter flex-wrap gap-4">
                <button onclick="criarMaterialView.selecionarFerramenta('${material.tipo}', document.querySelector('.tool-nav-btn--active'))" class="btn-outline interactive-element text-sm">
                    <i class="fas fa-arrow-left"></i> Voltar e criar outro
                </button>
                <div class="flex gap-3">
                    <button onclick="criarMaterialView.salvarNaBiblioteca()" class="btn-secondary interactive-element text-sm flex items-center gap-2">
                        <i class="far fa-save"></i> Salvar na Biblioteca
                    </button>
                    <!-- O Botão Mágico de Imprimir -->
                    <button id="btn-imprimir-material" class="btn-primary interactive-element text-sm flex items-center gap-2" style="background-color: #4f46e5; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.25);">
                        <i class="fas fa-print"></i> Gerar PDF / Imprimir
                    </button>
                </div>
            </div>
            <!-- Visualizador A4 -->
            <div class="a4-preview-wrapper custom-scrollbar animate-enter">
                <div id="folha-a4-preview" class="a4-sheet">
                    
                    <!-- Cabeçalho da Folha -->
                    <div style="border-bottom: 2px solid #1e293b; padding-bottom: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: flex-end;">
                        <div>
                            <h2 style="font-size: 1.5rem; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em;">${window.escapeHTML(material.titulo)}</h2>
                            <p style="font-size: 0.875rem; font-weight: 700; color: #64748b; margin-top: 0.25rem;">${window.escapeHTML(material.disciplina)} • ${window.escapeHTML(material.serie)}</p>
                        </div>
                    </div>
                    <!-- Conteúdo renderizado pela IA -->
                    <div style="line-height: 1.7; text-align: justify;" class="prose">
                        ${material.conteudo_html}
                    </div>
                </div>
            </div>
        `;
        document.getElementById('btn-imprimir-material')?.addEventListener('click', () => {
            this.imprimirMaterialA4(material);
        });
    },
    imprimirMaterialA4(material) {
        const config = model.state.userConfig || {};
        const nomeProf = config.profName ? config.profName : 'Professor(a)';
        const nomeEscola = config.escolaName ? config.escolaName : 'Nome da Escola';
        const dataHoje = new Date().toLocaleDateString('pt-BR');
        const conteudo = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>${window.escapeHTML(material.titulo)} - PDF</title>
                <style>
                    /* Reset básico e tipografia de impressão */
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                    
                    body { 
                        font-family: 'Inter', sans-serif; 
                        color: #000; 
                        background: #fff; 
                        line-height: 1.6;
                        margin: 0;
                        padding: 0;
                    }
                    /* Configuração estrita para folha A4 */
                    @page {
                        size: A4;
                        margin: 20mm;
                    }
                    /* Cabeçalho da Escola */
                    .header { 
                        border-bottom: 3px solid #000; 
                        padding-bottom: 15px; 
                        margin-bottom: 25px; 
                    }
                    .header h1 { 
                        font-size: 20px; 
                        font-weight: 900; 
                        text-transform: uppercase; 
                        margin: 0 0 5px 0; 
                    }
                    .header .meta-info {
                        display: flex;
                        justify-content: space-between;
                        font-size: 12px;
                        font-weight: 700;
                    }
                    /* Estilização do Conteúdo da IA */
                    .content h3 { font-size: 18px; margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
                    .content p { font-size: 14px; text-align: justify; margin-bottom: 10px; }
                    .content ul, .content ol { font-size: 14px; margin-bottom: 10px; padding-left: 20px; }
                    .content li { margin-bottom: 5px; }
                    .content strong { color: #000; }
                    /* Garante que tabelas ou blocos não quebrem na metade entre duas páginas */
                    .content h3, .content ul, .content table {
                        page-break-inside: avoid;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${window.escapeHTML(nomeEscola)}</h1>
                    <div class="meta-info">
                        <span>PROFESSOR(A): ${window.escapeHTML(nomeProf)}</span>
                        <span>DISCIPLINA: ${window.escapeHTML(material.disciplina)}</span>
                    </div>
                    <div class="meta-info" style="margin-top: 4px;">
                        <span>SÉRIE/ANO: ${window.escapeHTML(material.serie)}</span>
                        <span>DATA: ${dataHoje}</span>
                    </div>
                </div>
                <div class="content">
                    <h2 style="text-align: center; text-transform: uppercase; margin-bottom: 30px;">
                        ${window.escapeHTML(material.titulo)}
                    </h2>
                    ${material.conteudo_html}
                </div>
                <script>
                    // Dispara a impressão automaticamente assim que a página carregar
                    window.onload = () => {
                        window.print();
                        // Opcional: fechar a aba após imprimir
                        // setTimeout(() => window.close(), 500); 
                    };
                </script>
            </body>
            </html>
        `;
        const printWindow = window.open('', '_blank');
        printWindow.document.open();
        printWindow.document.write(conteudo);
        printWindow.document.close();
    },
    gerarHtmlInput(campo) {
        if (campo.tipo === 'row') return `<div class="form-row-grid" data-cols="${campo.colunas.length}">${campo.colunas.map(col => this.gerarHtmlInput(col)).join('')}</div>`;
        const temCondicao = campo.condicao !== undefined;
        let wrapperClass = temCondicao ? 'conditional-wrapper hidden animate-enter' : '';
        let htmlComponente = '';
        switch (campo.tipo) {
            case 'select-disciplina': htmlComponente = `
    <div class="w-full">
        <label class="form-label">Disciplina</label>
        <div class="custom-dropdown relative w-full">
            <input type="hidden" data-field="Disciplina" value="Ciências">
            <button type="button" class="dropdown-button w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-300 rounded-xl shadow-sm text-sm font-medium text-slate-700 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-50">
                <span class="dropdown-label truncate">Ciências</span>
                <i class="fas fa-chevron-down text-slate-400 text-xs ml-2"></i>
            </button>
            <ul class="dropdown-menu hidden absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar p-1.5 animate-enter origin-top text-left font-normal">
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Ciências">Ciências</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Biologia">Biologia</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Física">Física</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Matemática">Matemática</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Educação Infantil">Educação Infantil</li>
            </ul>
        </div>
    </div>`; break;
            case 'select-serie': htmlComponente = `
    <div class="w-full">
        <label class="form-label">Série / Ano</label>
        <div class="custom-dropdown relative w-full">
            <input type="hidden" data-field="Série" value="6º Ano EF">
            <button type="button" class="dropdown-button w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-300 rounded-xl shadow-sm text-sm font-medium text-slate-700 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-50">
                <span class="dropdown-label truncate">6º Ano — EF II</span>
                <i class="fas fa-chevron-down text-slate-400 text-xs ml-2"></i>
            </button>
            <ul class="dropdown-menu hidden absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar p-1.5 animate-enter origin-top text-left font-normal">
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Educação Infantil">Educação Infantil (Maternal/Pré)</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="6º Ano EF">6º Ano — EF II</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="7º Ano EF">7º Ano — EF II</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="8º Ano EF">8º Ano — EF II</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="9º Ano EF">9º Ano — EF II</li>
            </ul>
        </div>
    </div>`; break;
            case 'text': {
                const isBncc = campo.id === 'bncc' || (campo.label && campo.label.toLowerCase().includes('bncc'));
                if (isBncc) {
                    htmlComponente = `
                        <div class="w-full">
                            <label class="form-label">${campo.label}</label>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <input type="text" data-field="${campo.label}" placeholder="${campo.placeholder || 'Ex: EF06CI05'}" class="form-input" style="flex: 1;">
                                <button type="button" onclick="criarMaterialView.abrirSeletorBNCC('${window.escapeHTML(campo.label)}')" class="btn-primary interactive-element" style="white-space: nowrap; padding: 0.625rem 1rem; font-size: 0.8125rem; display: flex; align-items: center; gap: 0.375rem; box-shadow: var(--shadow-sm);" title="Consultar e selecionar habilidade na BNCC">
                                    <i class="fas fa-search"></i> <span>Buscar na BNCC</span>
                                </button>
                            </div>
                        </div>`;
                } else {
                    htmlComponente = `
                        <div class="w-full">
                            <label class="form-label">${campo.label}</label>
                            <input type="text" data-field="${campo.label}" placeholder="${campo.placeholder || ''}" class="form-input">
                        </div>`;
                }
                break;
            }
            case 'textarea': htmlComponente = `
                <div class="w-full">
                    <label class="form-label">${campo.label}</label>
                    <textarea data-field="${campo.label}" placeholder="${campo.placeholder || ''}" rows="5" class="form-input resize-none custom-scrollbar"></textarea>
                </div>`; break;
            case 'number': htmlComponente = `
                <div>
                    <label class="form-label">${campo.label}</label>
                    <input type="number" data-field="${campo.label}" value="${campo.default}" class="form-input" style="width: 6rem; text-align: center; font-size: 1.125rem; font-weight: 900;">
                </div>`; break;
            case 'pills':
            case 'pills-icon': htmlComponente = `
                    <div>
                        <label class="form-label" style="margin-bottom: 0.75rem;">${campo.label}</label>
                        <input type="hidden" data-field="${campo.label}" id="hidden-${campo.id}" value="${campo.default}">
                        <div class="pill-group" id="group-${campo.id}">
                            ${campo.opcoes.map(opt => {
                const val = typeof opt === 'string' ? opt : opt.label;
                const isSelected = val === campo.default;
                const activeClass = isSelected ? 'pill-item--active' : '';
                return `<button type="button" onclick="criarMaterialView.selectPill('${campo.id}', '${val}', this)" class="pill-item interactive-element ${activeClass}">${typeof opt !== 'string' ? `<i class="${opt.icon}"></i>` : ''} ${val}</button>`;
            }).join('')}
                        </div>
                    </div>`; break;
            case 'grid-cards': htmlComponente = `
                    <div class="w-full">
                        <label class="form-label" style="font-size: 0.875rem; font-weight: 700; color: #1e293b; margin-bottom: 0.75rem;">${campo.label}</label>
                        <input type="hidden" data-field="${campo.label}" id="hidden-${campo.id}" value="${campo.default}">
                        <div class="tool-card-grid" id="group-${campo.id}">
                            ${campo.opcoes.map(opt => {
                const isSelected = opt.id === campo.default;
                const activeClass = isSelected ? 'tool-card-item--active' : '';
                return `
                                <button type="button" onclick="criarMaterialView.selectCard('${campo.id}', '${opt.id}', '${opt.titulo}', this)" class="tool-card-item interactive-element ${activeClass}">
                                    <div class="tool-card-item__check ${isSelected ? '' : 'hidden'}"><i class="fas fa-check"></i></div>
                                    <div class="tool-card-item__icon-wrap ${opt.bg} ${opt.cor}"><i class="${opt.icone}"></i></div>
                                    <div><h4 style="font-weight: 700; color: #1e293b; font-size: 0.875rem; line-height: 1.25;">${opt.titulo}</h4></div>
                                </button>`;
            }).join('')}
                        </div>
                    </div>`; break;
            case 'toggle-ia': htmlComponente = `
                    <div class="w-full">
                        <label class="form-label" style="font-size: 0.75rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">${campo.label}</label>
                        <input type="hidden" data-field="${campo.label}" id="hidden-modo-geracao" value="${campo.default}" class="toggle-control">
                        <div class="mode-toggle-group">
                            <button type="button" id="btn-modo-ia" onclick="criarMaterialView.setModoGeracao('ia')" class="mode-toggle-btn interactive-element ${campo.default === 'ia' ? 'mode-toggle-btn--active' : ''}">
                                <i class="fas fa-magic"></i> Gerar com IA
                                <span style="font-size: 0.5625rem; color: #94a3b8; font-weight: 400; text-transform: uppercase; letter-spacing: 0.05em; margin-left: 0.25rem;">(A partir do tema)</span>
                            </button>
                            <button type="button" id="btn-modo-manual" onclick="criarMaterialView.setModoGeracao('manual')" class="mode-toggle-btn interactive-element ${campo.default === 'manual' ? 'mode-toggle-btn--active' : ''}">
                                <i class="fas fa-pencil-alt"></i> Personalizar
                                <span style="font-size: 0.5625rem; color: #94a3b8; font-weight: 400; text-transform: uppercase; letter-spacing: 0.05em; margin-left: 0.25rem;">(Escrever eu mesmo)</span>
                            </button>
                        </div>
                    </div>
                    <!-- Aciona a verificação inicial logo após a injeção no DOM -->
                    <img src onerror="criarMaterialView.processarCondicionais()" style="display:none;">`; break;
            case 'dynamic-words': htmlComponente = `
                    <div class="dynamic-box">
                        <label class="form-label" style="font-size: 0.875rem; font-weight: 700; color: #1e293b; margin-bottom: 1rem;">${campo.label}</label>
                        <div class="dynamic-words-grid" id="dynamic-words-list">
                            <input type="text" placeholder="Palavra 1" class="word-val form-input">
                            <input type="text" placeholder="Palavra 2" class="word-val form-input">
                            <button type="button" onclick="criarMaterialView.addPalavra()" class="btn-outline interactive-element" style="width: 100%; border-style: dashed; justify-content: center;">
                                <i class="fas fa-plus"></i> Adicionar
                            </button>
                        </div>
                    </div>`; break;
            default: return '';
        }
        if (temCondicao) {
            return `<div class="${wrapperClass}" data-condicao-campo="${campo.condicao.campo}" data-condicao-valor="${campo.condicao.valor}">${htmlComponente}</div>`;
        }
        return htmlComponente;
    },
    selectPill(campoId, valor, btnElement) {
        document.getElementById(`hidden-${campoId}`).value = valor;
        const container = document.getElementById(`group-${campoId}`);
        container.querySelectorAll('.pill-item').forEach(b => {
            b.classList.remove('pill-item--active');
        });
        btnElement.classList.add('pill-item--active');
    },
    selectCard(campoId, idValor, titulo, btnElement) {
        document.getElementById(`hidden-${campoId}`).value = titulo;
        const container = document.getElementById(`group-${campoId}`);
        container.querySelectorAll('.tool-card-item').forEach(c => {
            c.classList.remove('tool-card-item--active');
            c.querySelector('.tool-card-item__check')?.classList.add('hidden');
        });
        btnElement.classList.add('tool-card-item--active');
        btnElement.querySelector('.tool-card-item__check')?.classList.remove('hidden');
    },
    addPalavra() {
        const container = document.getElementById('dynamic-words-list');
        const addBtn = container.lastElementChild;
        const count = container.querySelectorAll('input').length + 1;
        const wrap = document.createElement('div');
        wrap.className = "relative animate-enter";
        wrap.innerHTML = `<input type="text" placeholder="Palavra ${count}" class="word-val form-input pr-8"><i class="fas fa-times absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 cursor-pointer" onclick="this.parentElement.remove()"></i>`;
        container.insertBefore(wrap, addBtn);
    },
    setModoGeracao(modo) {
        const inputHidden = document.getElementById('hidden-modo-geracao');
        if (inputHidden) inputHidden.value = modo;
        const btnIa = document.getElementById('btn-modo-ia');
        const btnManual = document.getElementById('btn-modo-manual');
        if (modo === 'ia') {
            btnIa?.classList.add('mode-toggle-btn--active');
            btnManual?.classList.remove('mode-toggle-btn--active');
        } else {
            btnManual?.classList.add('mode-toggle-btn--active');
            btnIa?.classList.remove('mode-toggle-btn--active');
        }
        this.processarCondicionais();
    },
    processarCondicionais() {
        const wrappers = document.querySelectorAll('.conditional-wrapper');
        const toggleVal = document.getElementById('hidden-modo-geracao')?.value || 'ia';
        wrappers.forEach(w => {
            if (w.dataset.condicaoCampo === 'modo-geracao') {
                if (w.dataset.condicaoValor === toggleVal) {
                    w.classList.remove('hidden');
                } else {
                    w.classList.add('hidden');
                }
            }
        });
    },
    async carregarArquivoContexto(input) {
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        const nomeEl = document.getElementById('mat-nome-arquivo');
        const badgeEl = document.getElementById('mat-badge-contexto');

        try {
            if (nomeEl) nomeEl.innerText = `Lendo ${file.name}...`;
            const texto = await lerArquivoTexto(file);
            this.contextoArquivoTexto = texto;

            if (nomeEl) nomeEl.innerText = `📄 ${file.name} (${texto.length} caracteres)`;
            if (badgeEl) {
                badgeEl.innerText = `✅ Arquivo carregado`;
                badgeEl.style.color = '#059669';
            }
            Toast.show(`Arquivo "${file.name}" carregado com sucesso!`, 'success');
        } catch (e) {
            console.error(e);
            if (nomeEl) nomeEl.innerText = 'Erro ao ler arquivo';
            Toast.show('Não foi possível ler o arquivo anexado.', 'error');
        }
    },
    async submeterFormulario(btn) {
        const iconOriginal = btn.innerHTML;
        const dadosExtrahidos = {};
        document.querySelectorAll('.conditional-wrapper:not(.hidden) .form-input, form > .w-full > .form-input, form > div > div > .form-input').forEach(input => {
            if (input.value.trim() !== '') dadosExtrahidos[input.dataset.field] = input.value;
        });
        document.querySelectorAll('input[type="hidden"][data-field]').forEach(input => {
            dadosExtrahidos[input.dataset.field] = input.value;
        });
        const wrapperPalavras = document.getElementById('dynamic-words-list');
        if (wrapperPalavras && !wrapperPalavras.closest('.hidden')) {
            const palavrasInputs = wrapperPalavras.querySelectorAll('.word-val');
            const palavras = Array.from(palavrasInputs).map(i => i.value.trim()).filter(v => v !== '');
            if (palavras.length > 0) dadosExtrahidos["Palavras Listadas"] = palavras.join(', ');
        }
        if (Object.keys(dadosExtrahidos).length < 2) return Toast.show("Preencha os campos essenciais antes de gerar.", "warning");
        
        const textoNotebookLM = document.getElementById('mat-contexto-texto')?.value.trim() || '';
        const contextoFinal = (this.contextoArquivoTexto ? `${this.contextoArquivoTexto}\n\n` : '') + textoNotebookLM;

        try {
            btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Processando com IA...`;
            btn.disabled = true;
            const materialPronto = await aiService.gerarMaterial(this.ferramentaAtiva, dadosExtrahidos, contextoFinal);
            const salvo = await model.saveMaterial(materialPronto);
            Toast.show("Material gerado com sucesso!", "success");
            if (window.conteudoGeradoView) {
                window.conteudoGeradoView.setMaterial(salvo.id);
            }
            controller.navigate('conteudo-gerado');
        } catch (err) {
            Toast.show(err.message, "error");
            btn.innerHTML = iconOriginal;
            btn.disabled = false;
        }
    },

    abrirSeletorBNCC(fieldLabel = 'Código BNCC (opcional)') {
        controller.openModal('Selecionar Habilidade BNCC', '<div id="modal-bncc-container" style="width: 100%; max-height: 80vh; min-height: 500px; overflow-y: auto;"></div>', 'xl');
        setTimeout(() => {
            if (window.bnccView) {
                window.bnccView.render('modal-bncc-container', null, null, (habilidadeEscolhida) => {
                    const inputs = document.querySelectorAll(`input[data-field="${fieldLabel}"], input[data-field="Código BNCC (opcional)"], input[data-field="Campo de Experiência BNCC (opcional)"]`);
                    if (inputs && inputs.length > 0) {
                        inputs.forEach(inp => {
                            inp.value = habilidadeEscolhida.codigo;
                            inp.dispatchEvent(new Event('input', { bubbles: true }));
                            inp.dispatchEvent(new Event('change', { bubbles: true }));
                        });
                    }
                    controller.closeModal();
                    Toast.show(`Habilidade ${habilidadeEscolhida.codigo} selecionada!`, 'success');
                });
            }
        }, 50);
    }
};
if (typeof window !== 'undefined') window.criarMaterialView = criarMaterialView;