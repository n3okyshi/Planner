/**
 * @file criarMaterial.js
 * @description View do Hub gerador de materiais com IA. Padrão de Fábrica de Formulários.
 * @module views/criarMaterialView
 */
import { model } from '../model.js';
import { controller } from '../controller.js';
import { aiService } from '../ai-service.js';
import { Toast } from '../components/toast.js';

export const criarMaterialView = {
    ferramentaAtiva: null,

    // 1. MENU LATERAL
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

    // 2. FÁBRICA DE FORMULÁRIOS (Mapeamento de Ferramentas)
    // Aqui definimos os campos necessários para cada IA
    formConfig: {
        'planejamento': {
            titulo: 'Planejamento',
            descricao: 'Crie planos de aula, semanais, mensais, bimestrais e mais',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Tema', placeholder: 'Ex: Ecossistemas, Divisão Celular, Física Clássica...' },
                { id: 'tipo-plano', tipo: 'pills', label: 'TIPO DE PLANEJAMENTO', opcoes: ['Aula', 'Semanal', 'Mensal', 'Bimestral', 'Trimestral', 'Semestral', 'Anual'], default: 'Semanal' },
                { id: 'duracao', tipo: 'number', label: 'DURAÇÃO (MINUTOS)', default: 50 },
                { id: 'objetivos', tipo: 'text', label: 'Objetivos de aprendizagem', placeholder: 'Ex: Compreender a fotossíntese...' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EF06CI05' },
                { id: 'adaptacao', tipo: 'inclusao' }
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
                { id: 'tamanho', tipo: 'pills', label: 'TAMANHO DA TURMA', opcoes: ['Pequena', 'Média', 'Grande'], default: 'Média' },
                { id: 'adaptacao', tipo: 'inclusao' }
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
                        { id: 'bingo', titulo: 'Bingo Pedagógico', desc: 'Cartelas de termos', icone: 'fas fa-th', cor: 'text-orange-500', bg: 'bg-orange-50' }
                    ]
                },
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'serie', tipo: 'select-serie' }, { id: 'disciplina', tipo: 'select-disciplina' }] },
                { id: 'tema', tipo: 'text', label: 'Tema', placeholder: 'Ex: Viroses, Sistema Solar...' },
                { id: 'palavras-dinamicas', tipo: 'dynamic-words', label: 'Palavras', desc: 'Mínimo 4 palavras.' }
            ]
        }
    },

    'situacao-problema': {
        descricao: 'Problema contextualizado em escada de dificuldade — PBL com habilidades vinculadas',
        campos: [
            { id: 'disciplina', tipo: 'select-disciplina' },
            { id: 'serie', tipo: 'select-serie' },
            { id: 'tema', tipo: 'text', label: 'Tema', placeholder: 'Ex: Frações, Revolução Francesa...' },
            { id: 'qtd-questoes', tipo: 'pills', label: 'NÚMERO DE QUESTÕES', opcoes: ['4', '5', '6', '7', '8'], default: '5' },
            { id: 'complexidade', tipo: 'pills', label: 'NÍVEL DE COMPLEXIDADE', opcoes: ['Básico', 'Intermediário', 'Avançado'], default: 'Intermediário' },
            { id: 'cenario', tipo: 'text', label: 'CENÁRIO SUGERIDO (opcional)', placeholder: 'Ex: feira livre do bairro, viagem de ônibus, festa junina' },
            { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EF05MA01' },
            { id: 'adaptacao', tipo: 'inclusao' }
        ]
    },
    'avaliacao-prova': {
        descricao: 'Crie provas completas com questões objetivas e dissertativas',
        campos: [
            { id: 'disciplina', tipo: 'select-disciplina' },
            { id: 'serie', tipo: 'select-serie' },
            { id: 'tema', tipo: 'text', label: 'Tema', placeholder: 'Ex: Frações, Revolução Francesa...' },
            { id: 'quantidade', tipo: 'number', label: 'QUANTIDADE', default: 10 },
            { id: 'tipo-questao', tipo: 'pills', label: 'TIPO DE QUESTÃO', opcoes: ['Múltipla escolha', 'Dissertativa', 'Mista (ambas)'], default: 'Múltipla escolha' },
            { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EF05MA01' },
            { id: 'adaptacao', tipo: 'inclusao' }
        ]
    },

    /**
     * Renderiza o layout base
     */
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        container.innerHTML = `
            <div class="fade-in pb-24 h-full flex flex-col">
                <div class="mb-6">
                    <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Criar Conteúdo</h2>
                    <p class="text-slate-500 mt-1">Escolha uma ferramenta para começar</p>
                </div>
                <div class="flex flex-col md:flex-row gap-6 items-start flex-1 relative">
                    <aside class="w-full md:w-64 shrink-0 space-y-6 sticky top-24 pr-2">
                        <div>
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">PLANEJAR E APLICAR</h4>
                            <div class="space-y-1">
                                ${this.gerarBotaoSidebar('planejamento', 'Planejamento', 'far fa-calendar-alt', 'text-indigo-500')}
                                ${this.gerarBotaoSidebar('dinamica-jogo', 'Dinâmica e Jogo', 'fas fa-users', 'text-blue-500')}
                                ${this.gerarBotaoSidebar('atividade-imprimivel', 'Atividade Imprimível', 'fas fa-print', 'text-emerald-500')}
                            </div>
                        </div>
                    </aside>
                    <main id="form-area" class="flex-1 w-full bg-white border border-slate-100 shadow-sm rounded-3xl p-6 md:p-8 min-h-[500px] flex flex-col relative transition-all">
                        ${this.gerarHTMLEmptyState()}
                    </main>
                </div>
            </div>
        `;
    },

    /**
     * Barra Lateral de navegação
     */
    gerarHTMLSidebar() {
        return this.categoriasMenu.map(categoria => `
            <div>
                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">${categoria.titulo}</h4>
                <div class="space-y-1">
                    ${categoria.itens.map(item => {
            const isAtivo = this.ferramentaAtiva === item.id;
            const btnClass = isAtivo
                ? 'bg-indigo-50 border-indigo-100 text-indigo-700 shadow-sm font-bold'
                : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium';

            const cursorClass = item.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer';

            return `
                            <button 
                                ${item.disabled ? 'disabled' : `onclick="criarMaterialView.selecionarFerramenta('${item.id}')"`}
                                class="w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-sm ${btnClass} ${cursorClass}">
                                
                                <div class="flex items-center gap-3">
                                    <div class="w-6 flex justify-center ${isAtivo ? 'text-indigo-600' : item.cor}">
                                        <i class="${item.icone}"></i>
                                    </div>
                                    <span>${item.label}</span>
                                </div>
                                
                                ${item.badge ? `<span class="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">${item.badge}</span>` : ''}
                            </button>
                        `;
        }).join('')}
                </div>
            </div>
        `).join('');
    },

    gerarBotaoSidebar(id, label, icone, cor) {
        return `
            <button onclick="criarMaterialView.selecionarFerramenta('${id}', this)" class="btn-sidebar w-full flex items-center justify-between p-2.5 rounded-xl border border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium transition-all text-sm">
                <div class="flex items-center gap-3">
                    <div class="w-6 flex justify-center ${cor}"><i class="${icone}"></i></div>
                    <span>${label}</span>
                </div>
            </button>
        `;
    },

    gerarHTMLEmptyState() {
        return `
            <div class="m-auto flex flex-col items-center justify-center text-center max-w-sm animate-pop-in">
                <div class="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 text-indigo-500 shadow-inner"><i class="fas fa-magic text-3xl"></i></div>
                <h3 class="text-xl font-bold text-slate-800 mb-2">Pronto para criar?</h3>
                <p class="text-slate-500 text-sm">Selecione uma das ferramentas no menu lateral para iniciar.</p>
            </div>
        `;
    },

    selecionarFerramenta(idFerramenta, btnElement) {
        this.ferramentaAtiva = idFerramenta;

        // Estiliza o menu lateral ativo
        document.querySelectorAll('.btn-sidebar').forEach(b => {
            b.classList.remove('bg-indigo-50', 'border-indigo-100', 'text-indigo-700', 'font-bold');
            b.classList.add('border-transparent', 'text-slate-500', 'font-medium');
        });
        btnElement.classList.add('bg-indigo-50', 'border-indigo-100', 'text-indigo-700', 'font-bold');
        btnElement.classList.remove('border-transparent', 'text-slate-500', 'font-medium');

        // Atualiza a área de formulário
        const formArea = document.getElementById('form-area');
        formArea.classList.remove('animate-slide-in');
        void formArea.offsetWidth;
        formArea.classList.add('animate-slide-in');
        formArea.innerHTML = this.renderizarFormularioDaFerramenta();
    },

    /**
     * MOTOR DE RENDERIZAÇÃO: Lê o JSON e cria o formulário
     */
    renderizarFormularioDaFerramenta() {
        let ferramentaInfo = null;
        for (const cat of this.categoriasMenu) {
            const found = cat.itens.find(i => i.id === this.ferramentaAtiva);
            if (found) ferramentaInfo = found;
        }

        const config = this.formConfig[this.ferramentaAtiva];

        // Se a ferramenta não foi configurada ainda no formConfig, exibe em construção
        if (!config) {
            return `
                <div class="border-b border-slate-100 pb-4 mb-6">
                    <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <i class="${ferramentaInfo.icone} ${ferramentaInfo.cor}"></i> ${ferramentaInfo.label}
                    </h3>
                </div>
                <div class="flex-1 flex flex-col items-center justify-center text-slate-400 italic">
                    <i class="fas fa-tools text-4xl mb-4 opacity-30"></i>
                    <p>Módulo em desenvolvimento.</p>
                </div>
            `;
        }

        const cotaRestante = 10; // Placeholder: buscaremos do model depois

        return `
            <div class="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center ${ferramentaInfo.cor}">
                    <i class="${ferramentaInfo.icone} text-lg"></i>
                </div>
                <div>
                    <h3 class="text-xl font-bold text-slate-800">${ferramentaInfo.label}</h3>
                    <p class="text-xs text-slate-500">${config.descricao}</p>
                </div>
            </div>
            
            <div class="space-y-6 flex-1">
                ${config.campos.map(campo => this.gerarHtmlInput(campo)).join('')}
            </div>

            <!-- Botão Fixo de Ação -->
            <div class="mt-8 pt-6 border-t border-slate-100 flex items-center gap-4 sticky bottom-0 bg-white z-10 pb-2">
                <button onclick="criarMaterialView.gerarConteudoIA()" class="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-3.5 px-6 rounded-xl font-bold transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 active:scale-[0.98]">
                    <i class="fas fa-layer-group"></i> Gerar conteúdo
                </button>
                <span class="text-xs font-medium text-slate-400 w-32 text-center">Restam <strong class="text-slate-600">${cotaRestante}</strong> gerações este mês</span>
            </div>
        `;
    },

    renderizarFormularioDaFerramenta() {
        const config = this.formConfig[this.ferramentaAtiva];
        if (!config) return `<div class="m-auto text-slate-400">Em desenvolvimento.</div>`;

        return `
            <div class="mb-6 pb-6 border-b border-slate-100">
                <h3 class="text-xl font-bold text-slate-800">${config.titulo}</h3>
                <p class="text-xs text-slate-500 mt-1">${config.descricao}</p>
            </div>
            
            <form id="dynamic-form" class="space-y-6 flex-1">
                ${config.campos.map(campo => this.gerarHtmlInput(campo)).join('')}
            </form>

            <div class="mt-8 pt-6 border-t border-slate-100 flex items-center gap-4 sticky bottom-0 bg-white z-10 pb-2">
                <button type="button" onclick="criarMaterialView.submeterFormulario(this)" class="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-3.5 px-6 rounded-xl font-bold transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2">
                    <i class="fas fa-layer-group"></i> Gerar conteúdo
                </button>
            </div>
        `;
    },

    /**
     * Renderizador Específico de cada tipo de input (A Fábrica)
     */
    gerarHtmlInput(campo) {
        // Suporte a layout em colunas (ex: Série e Disciplina lado a lado)
        if (campo.tipo === 'row') {
            return `
                <div class="grid grid-cols-1 md:grid-cols-${campo.colunas.length} gap-4">
                    ${campo.colunas.map(col => this.gerarHtmlInput(col)).join('')}
                </div>
            `;
        }

        switch (campo.tipo) {
            case 'select-disciplina':
                return `
                    <div class="w-full">
                        <label class="block text-xs font-bold text-slate-800 mb-2">Disciplina</label>
                        <select id="input-${campo.id}" class="w-full p-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm font-medium text-slate-700 cursor-pointer shadow-sm">
                            <option value="">Selecione a disciplina</option>
                            <option value="matematica">Matemática</option>
                            <option value="ciencias">Ciências</option>
                        </select>
                    </div>`;

            case 'select-serie':
                return `
                    <div class="w-full">
                        <label class="block text-xs font-bold text-slate-800 mb-2">Série / Ano</label>
                        <select id="input-${campo.id}" class="w-full p-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm font-medium text-slate-700 cursor-pointer shadow-sm">
                            <option value="">Selecione a série</option>
                            <option value="6ano">6º Ano — EF II</option>
                            <option value="7ano">7º Ano — EF II</option>
                        </select>
                    </div>`;

            case 'text':
                return `
                    <div class="w-full">
                        <label class="block text-xs font-bold text-slate-800 mb-2">${campo.label}</label>
                        <input type="text" id="input-${campo.id}" placeholder="${campo.placeholder || ''}" class="w-full p-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm font-medium text-slate-700 placeholder:text-slate-300 shadow-sm">
                    </div>`;

            case 'grid-cards':
                // O layout de grade de botões (Caça-palavras, Cruzadinha, etc.)
                const cardsHtml = campo.opcoes.map(opt => {
                    // Para o exemplo Vanilla JS, usamos um onclick inline simples que altera a borda visualmente
                    const isActive = opt.id === campo.default;
                    const borderClass = isActive ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-indigo-300';
                    const bgClass = isActive ? 'bg-indigo-50/10' : 'bg-white';
                    const iconCheck = isActive ? `<div class="absolute top-2 right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] shadow-sm"><i class="fas fa-check"></i></div>` : '';

                    return `
                        <button type="button" onclick="document.querySelectorAll('.card-act').forEach(e => {e.classList.remove('border-indigo-600', 'ring-1', 'ring-indigo-600'); e.querySelector('.check-icon').innerHTML=''}); this.classList.add('border-indigo-600', 'ring-1', 'ring-indigo-600'); this.querySelector('.check-icon').innerHTML='<div class=\\'absolute top-2 right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] shadow-sm\\'><i class=\\'fas fa-check\\'></i></div>';" 
                                class="card-act relative p-4 rounded-2xl border transition-all text-left flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md h-36 ${borderClass} ${bgClass}">
                            <div class="check-icon">${iconCheck}</div>
                            <div class="w-12 h-12 rounded-2xl ${opt.bg} ${opt.cor} flex items-center justify-center text-2xl mb-1 shadow-sm">
                                <i class="${opt.icone}"></i>
                            </div>
                            <div class="text-center">
                                <h4 class="font-bold text-slate-800 text-sm leading-tight">${opt.titulo}</h4>
                                <p class="text-[10px] text-slate-400 mt-1 leading-tight line-clamp-2">${opt.desc}</p>
                            </div>
                        </button>
                    `;
                }).join('');

                return `
                    <div class="w-full">
                        <label class="block text-sm font-bold text-slate-800 mb-3">${campo.label}</label>
                        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            ${cardsHtml}
                        </div>
                    </div>`;

            case 'toggle-ia':
                // O botão duplo "Gerar com IA / Personalizar"
                return `
                    <div class="w-full">
                        <label class="block text-xs font-bold text-slate-800 mb-2">${campo.label}</label>
                        <div class="flex p-1 bg-slate-50 border border-slate-200 rounded-2xl">
                            <button type="button" class="flex-1 py-3 px-4 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center gap-2 text-indigo-600 font-bold transition-all text-sm">
                                <i class="fas fa-magic"></i> Gerar com IA
                                <span class="block text-[9px] text-slate-400 font-normal uppercase tracking-wide ml-2 hidden sm:inline">A partir do tema</span>
                            </button>
                            <button type="button" class="flex-1 py-3 px-4 text-slate-500 hover:text-slate-700 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm">
                                <i class="fas fa-pencil-alt"></i> Personalizar
                                <span class="block text-[9px] text-slate-400 font-normal uppercase tracking-wide ml-2 hidden sm:inline">Escrever eu mesmo</span>
                            </button>
                        </div>
                    </div>`;

            case 'dynamic-words':
                // A lista de palavras com botão adicionar (Palavra 1, Palavra 2...)
                return `
                    <div class="w-full p-5 bg-slate-50 rounded-2xl border border-slate-200">
                        <div class="flex items-center justify-between mb-4">
                            <label class="block text-sm font-bold text-slate-800">${campo.label} <span class="text-slate-400 font-normal">(4)</span></label>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4" id="lista-palavras-dinamicas">
                            <!-- Renderizamos 4 inputs padrão -->
                            <div class="relative">
                                <input type="text" placeholder="Palavra 1" class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 shadow-sm pr-8">
                                <i class="fas fa-times absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 cursor-pointer"></i>
                            </div>
                            <div class="relative">
                                <input type="text" placeholder="Palavra 2" class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 shadow-sm pr-8">
                                <i class="fas fa-times absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 cursor-pointer"></i>
                            </div>
                            <div class="relative">
                                <input type="text" placeholder="Palavra 3" class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 shadow-sm pr-8">
                                <i class="fas fa-times absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 cursor-pointer"></i>
                            </div>
                            <div class="relative">
                                <input type="text" placeholder="Palavra 4" class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 shadow-sm pr-8">
                                <i class="fas fa-times absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 cursor-pointer"></i>
                            </div>
                            
                            <!-- Botão Adicionar que age como um card pontilhado -->
                            <button type="button" class="w-full p-2.5 bg-transparent border-2 border-dashed border-slate-300 rounded-xl text-sm font-bold text-slate-400 hover:text-indigo-500 hover:border-indigo-300 transition-all flex items-center justify-center gap-2">
                                <i class="fas fa-plus"></i> Adicionar
                            </button>
                        </div>
                        <p class="text-xs text-slate-500">${campo.desc}</p>
                    </div>`;

            case 'number':
                return `
                    <div>
                        <label class="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">${campo.label}</label>
                        <div class="flex items-center justify-between border border-slate-200 rounded-xl bg-white p-2">
                            <button class="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-700 rounded-lg"><i class="fas fa-minus"></i></button>
                            <input type="number" id="input-${campo.id}" value="${campo.default}" class="w-20 text-center font-black text-slate-800 text-lg outline-none border-none">
                            <button class="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-700 rounded-lg"><i class="fas fa-plus"></i></button>
                        </div>
                    </div>`;

            case 'pills':
                // Renders radio-button-like pills
                const pillsHtml = campo.opcoes.map(opt => {
                    const isSelected = opt === campo.default;
                    const style = isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200';
                    return `<button class="px-4 py-2 rounded-full text-sm font-bold transition-all ${style}">${opt}</button>`;
                }).join('');

                return `
                    <div>
                        <label class="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-3">${campo.label}</label>
                        <div class="flex flex-wrap gap-2">${pillsHtml}</div>
                    </div>`;

            case 'pills-icon':
                // Renders pills but with icons
                const pillsIconHtml = campo.opcoes.map(opt => {
                    const isSelected = opt.label === campo.default;
                    const style = isSelected ? 'bg-indigo-600 text-white shadow-md border-indigo-600' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200';
                    return `
                        <button class="px-4 py-2.5 rounded-xl border text-sm font-bold transition-all flex items-center gap-2 ${style}">
                            <i class="${opt.icon} ${isSelected ? 'text-white' : 'text-slate-400'}"></i> ${opt.label}
                        </button>`;
                }).join('');

                return `
                    <div>
                        <label class="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-3">${campo.label}</label>
                        <div class="flex flex-wrap gap-2">${pillsIconHtml}</div>
                    </div>`;

            case 'inclusao':
                // Checkboxes that are standard across almost all forms
                return `
                    <div class="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                        <div class="mb-4">
                            <h4 class="font-bold text-slate-800 text-sm">Adaptar para inclusão <span class="font-normal text-slate-400 italic ml-1">opcional</span></h4>
                            <p class="text-xs text-slate-500 mt-1">Gere o material já com sugestões pedagógicas embutidas para alunos atípicos — sem simplificar o conteúdo para o resto da turma.</p>
                        </div>
                        <div class="space-y-3">
                            <label class="flex items-start gap-3 cursor-pointer group">
                                <div class="relative flex items-center justify-center w-5 h-5 rounded border border-slate-300 bg-white mt-0.5 group-hover:border-indigo-400 transition-colors">
                                    <input type="checkbox" id="input-tea" class="peer sr-only">
                                    <i class="fas fa-check text-xs text-white opacity-0 peer-checked:opacity-100 transition-opacity absolute"></i>
                                    <div class="absolute inset-0 rounded bg-indigo-500 opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                                </div>
                                <div>
                                    <span class="font-bold text-slate-700 text-sm">Aluno com TEA</span>
                                    <p class="text-xs text-slate-500">Transtorno do Espectro Autista — apoios visuais, linguagem literal, rotina previsível</p>
                                </div>
                            </label>

                            <label class="flex items-start gap-3 cursor-pointer group">
                                <div class="relative flex items-center justify-center w-5 h-5 rounded border border-slate-300 bg-white mt-0.5 group-hover:border-indigo-400 transition-colors">
                                    <input type="checkbox" id="input-tdah" class="peer sr-only">
                                    <i class="fas fa-check text-xs text-white opacity-0 peer-checked:opacity-100 transition-opacity absolute"></i>
                                    <div class="absolute inset-0 rounded bg-indigo-500 opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                                </div>
                                <div>
                                    <span class="font-bold text-slate-700 text-sm">Aluno com TDAH</span>
                                    <p class="text-xs text-slate-500">Déficit de atenção e hiperatividade — blocos curtos, transições sinalizadas, reforço frequente</p>
                                </div>
                            </label>
                        </div>
                    </div>`;

            default:
                return '';
        }
    },

    // o bloco abaixo é uma ideia que a ia retornou, não meu código, o meu é o bloco acima

    gerarHtmlInput(campo) {
        if (campo.tipo === 'row') return `<div class="grid grid-cols-1 md:grid-cols-${campo.colunas.length} gap-4">${campo.colunas.map(col => this.gerarHtmlInput(col)).join('')}</div>`;

        switch (campo.tipo) {
            case 'select-disciplina': return `
                <div class="w-full">
                    <label class="block text-xs font-bold text-slate-800 mb-2">Disciplina</label>
                    <select data-field="Disciplina" class="form-input w-full p-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium text-slate-700 shadow-sm">
                        <option value="Ciências">Ciências</option>
                        <option value="Biologia">Biologia</option>
                        <option value="Física">Física</option>
                        <option value="Matemática">Matemática</option>
                    </select>
                </div>`;
            case 'select-serie': return `
                <div class="w-full">
                    <label class="block text-xs font-bold text-slate-800 mb-2">Série / Ano</label>
                    <select data-field="Série" class="form-input w-full p-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium text-slate-700 shadow-sm">
                        <option value="6º Ano EF">6º Ano — EF II</option>
                        <option value="7º Ano EF">7º Ano — EF II</option>
                        <option value="8º Ano EF">8º Ano — EF II</option>
                        <option value="9º Ano EF">9º Ano — EF II</option>
                    </select>
                </div>`;
            case 'text': return `
                <div class="w-full">
                    <label class="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">${campo.label}</label>
                    <input type="text" data-field="${campo.label}" placeholder="${campo.placeholder || ''}" class="form-input w-full p-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium text-slate-700 shadow-sm">
                </div>`;
            case 'number': return `
                <div>
                    <label class="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">${campo.label}</label>
                    <input type="number" data-field="${campo.label}" value="${campo.default}" class="form-input w-24 p-3 border border-slate-200 rounded-xl text-center font-black text-slate-800 text-lg outline-none focus:border-indigo-500">
                </div>`;
            case 'pills':
            case 'pills-icon':
                return `
                    <div>
                        <label class="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-3">${campo.label}</label>
                        <input type="hidden" data-field="${campo.label}" id="hidden-${campo.id}" value="${campo.default}">
                        <div class="flex flex-wrap gap-2" id="group-${campo.id}">
                            ${campo.opcoes.map(opt => {
                    const val = typeof opt === 'string' ? opt : opt.label;
                    const isSelected = val === campo.default;
                    const style = isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200';
                    return `<button type="button" onclick="criarMaterialView.selectPill('${campo.id}', '${val}', this)" class="px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${style}">${typeof opt !== 'string' ? `<i class="${opt.icon} mr-1"></i>` : ''} ${val}</button>`;
                }).join('')}
                        </div>
                    </div>`;
            case 'grid-cards':
                return `
                    <div class="w-full">
                        <label class="block text-sm font-bold text-slate-800 mb-3">${campo.label}</label>
                        <input type="hidden" data-field="${campo.label}" id="hidden-${campo.id}" value="${campo.default}">
                        <div class="grid grid-cols-2 lg:grid-cols-3 gap-4" id="group-${campo.id}">
                            ${campo.opcoes.map(opt => {
                    const isSelected = opt.id === campo.default;
                    const border = isSelected ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-slate-200';
                    return `
                                <button type="button" onclick="criarMaterialView.selectCard('${campo.id}', '${opt.id}', '${opt.titulo}', this)" class="card-btn relative p-4 rounded-2xl border transition-all text-left flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md h-36 bg-white ${border}">
                                    <div class="check-icon absolute top-2 right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] ${isSelected ? '' : 'hidden'}"><i class="fas fa-check"></i></div>
                                    <div class="w-12 h-12 rounded-2xl ${opt.bg} ${opt.cor} flex items-center justify-center text-2xl mb-1 shadow-sm"><i class="${opt.icone}"></i></div>
                                    <div class="text-center"><h4 class="font-bold text-slate-800 text-sm leading-tight">${opt.titulo}</h4></div>
                                </button>`;
                }).join('')}
                        </div>
                    </div>`;
            case 'dynamic-words':
                return `
                    <div class="w-full p-5 bg-slate-50 rounded-2xl border border-slate-200">
                        <label class="block text-sm font-bold text-slate-800 mb-4">${campo.label}</label>
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4" id="dynamic-words-list">
                            <input type="text" placeholder="Palavra 1" class="word-val w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 shadow-sm">
                            <input type="text" placeholder="Palavra 2" class="word-val w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 shadow-sm">
                            <button type="button" onclick="criarMaterialView.addPalavra()" class="w-full p-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm font-bold text-slate-400 hover:text-indigo-500 hover:border-indigo-300 transition-all flex items-center justify-center gap-2"><i class="fas fa-plus"></i> Adicionar</button>
                        </div>
                    </div>`;
            case 'inclusao': return `
                    <div class="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                        <h4 class="font-bold text-slate-800 text-sm mb-4">Adaptar para inclusão (Opcional)</h4>
                        <label class="flex items-center gap-3 cursor-pointer"><input type="checkbox" id="check-tea" class="w-4 h-4 text-indigo-600 rounded border-slate-300"><span class="text-sm font-bold text-slate-700">Aluno com TEA</span></label>
                        <label class="flex items-center gap-3 cursor-pointer mt-3"><input type="checkbox" id="check-tdah" class="w-4 h-4 text-indigo-600 rounded border-slate-300"><span class="text-sm font-bold text-slate-700">Aluno com TDAH</span></label>
                    </div>`;
            default: return '';
        }
    },

    selectPill(campoId, valor, btnElement) {
        document.getElementById(`hidden-${campoId}`).value = valor;
        const container = document.getElementById(`group-${campoId}`);
        container.querySelectorAll('button').forEach(b => {
            b.classList.remove('bg-indigo-600', 'text-white', 'shadow-md', 'border-indigo-600');
            b.classList.add('bg-white', 'text-slate-600', 'border-slate-200');
        });
        btnElement.classList.add('bg-indigo-600', 'text-white', 'shadow-md', 'border-indigo-600');
        btnElement.classList.remove('bg-white', 'text-slate-600', 'border-slate-200');
    },

    selectCard(campoId, idValor, titulo, btnElement) {
        document.getElementById(`hidden-${campoId}`).value = titulo; // Salvamos o Título visual pro prompt
        const container = document.getElementById(`group-${campoId}`);
        container.querySelectorAll('.card-btn').forEach(c => {
            c.classList.remove('border-indigo-600', 'ring-1', 'ring-indigo-600');
            c.querySelector('.check-icon').classList.add('hidden');
        });
        btnElement.classList.add('border-indigo-600', 'ring-1', 'ring-indigo-600');
        btnElement.querySelector('.check-icon').classList.remove('hidden');
    },

    addPalavra() {
        const container = document.getElementById('dynamic-words-list');
        const addBtn = container.lastElementChild;
        const count = container.querySelectorAll('input').length + 1;

        const wrap = document.createElement('div');
        wrap.className = "relative animate-slide-in";
        wrap.innerHTML = `<input type="text" placeholder="Palavra ${count}" class="word-val w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 shadow-sm pr-8"><i class="fas fa-times absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 cursor-pointer" onclick="this.parentElement.remove()"></i>`;

        container.insertBefore(wrap, addBtn);
    },

    // 5. SUBMISSÃO PARA A IA
    async submeterFormulario(btn) {
        const iconOriginal = btn.innerHTML;
        const dadosExtrahidos = {};

        // 1. Extrai inputs de texto/selects padrão
        document.querySelectorAll('.form-input').forEach(input => {
            if (input.value.trim() !== '') dadosExtrahidos[input.dataset.field] = input.value;
        });

        // 2. Extrai Hidden inputs (Pills e Cards)
        document.querySelectorAll('input[type="hidden"][data-field]').forEach(input => {
            dadosExtrahidos[input.dataset.field] = input.value;
        });

        // 3. Extrai Palavras dinâmicas
        const palavras = Array.from(document.querySelectorAll('.word-val')).map(i => i.value.trim()).filter(v => v !== '');
        if (palavras.length > 0) dadosExtrahidos["Palavras Listadas"] = palavras.join(', ');

        // 4. Extrai Inclusão
        const adaptaTEA = document.getElementById('check-tea')?.checked;
        const adaptaTDAH = document.getElementById('check-tdah')?.checked;
        if (adaptaTEA || adaptaTDAH) {
            dadosExtrahidos["Adaptações Inclusivas Obrigatórias"] = `${adaptaTEA ? 'Autismo (TEA)' : ''} ${adaptaTDAH ? 'TDAH' : ''}`;
        }

        // Validação Mínima
        if (Object.keys(dadosExtrahidos).length < 2) return Toast.show("Preencha alguns campos antes de gerar.", "warning");

        try {
            btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Processando com IA...`;
            btn.disabled = true;

            // Chama o Cérebro (IA) e a Memória (Model) que atualizamos nos passos 1 e 2
            const materialPronto = await aiService.gerarMaterial(this.ferramentaAtiva, dadosExtrahidos);
            await model.saveMaterial(materialPronto);

            Toast.show("Material salvo na sua Biblioteca!", "success");
            controller.navigate('biblioteca');

        } catch (err) {
            Toast.show(err.message, "error");
            btn.innerHTML = iconOriginal;
            btn.disabled = false;
        }
    },
    // Ação fictícia do botão "Gerar conteúdo"
    gerarConteudoIA() {
        const btn = event.currentTarget;
        const textoOriginal = btn.innerHTML;

        btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Gerando magia...`;
        btn.classList.add('opacity-80', 'cursor-not-allowed');

        // Simulação de chamada para aiService.js
        setTimeout(() => {
            btn.innerHTML = textoOriginal;
            btn.classList.remove('opacity-80', 'cursor-not-allowed');
            window.Toast?.show("Material gerado e salvo na Biblioteca!", "success");

            // Navega para a tela de Resultado (que construiremos depois)
            controller.navigate('biblioteca');
        }, 2000);
    }
};

if (typeof window !== 'undefined') {
    window.criarMaterialView = criarMaterialView;
}