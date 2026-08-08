/**
 * @file criarMaterial.js
 * @description View do Hub gerador de materiais com IA. Totalmente interativo com renderização condicional.
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

    // 2. FÁBRICA DE FORMULÁRIOS
    formConfig: {
        'pratica-laboratorio': {
            titulo: 'Prática de Laboratório',
            descricao: 'Roteiros guiados pelo Método Científico com simulações interativas',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Fenômeno a ser investigado', placeholder: 'Ex: Leis de Newton, Células, Eletricidade...' },
                { id: 'materiais', tipo: 'text', label: 'Materiais Disponíveis', placeholder: 'Ex: Simulador PhET, Garrafas PET, Água, Sal...' },
                { id: 'abordagem', tipo: 'pills', label: 'Abordagem Investigativa', opcoes: ['Guiada (Passo a Passo)', 'Aberta (Alunos criam o método)'], default: 'Guiada (Passo a Passo)' },
                { id: 'adaptacao', tipo: 'inclusao' }
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
        'situacao-problema': {
            titulo: 'Situação-Problema',
            descricao: 'Problema contextualizado em escada de dificuldade — PBL com habilidades vinculadas',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Tema', placeholder: 'Ex: Frações, Eletricidade...' },
                { id: 'qtd-questoes', tipo: 'pills', label: 'NÚMERO DE QUESTÕES', opcoes: ['4', '5', '6', '7', '8'], default: '5' },
                { id: 'complexidade', tipo: 'pills', label: 'NÍVEL DE COMPLEXIDADE', opcoes: ['Básico', 'Intermediário', 'Avançado'], default: 'Intermediário' },
                { id: 'cenario', tipo: 'text', label: 'CENÁRIO SUGERIDO (opcional)', placeholder: 'Ex: feira livre do bairro, viagem de ônibus...' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EF05MA01' },
                { id: 'adaptacao', tipo: 'inclusao' }
            ]
        },
        'atividade-investigativa': {
            titulo: 'Atividade Investigativa',
            descricao: 'Roteiros de experimentos ou pesquisas guiadas (Mão na Massa)',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Tema da Investigação', placeholder: 'Ex: Fotossíntese, Reações Químicas...' },
                { id: 'recursos', tipo: 'pills', label: 'RECURSOS DISPONÍVEIS', opcoes: ['Sala de Aula', 'Laboratório', 'Ar Livre', 'Casa'], default: 'Sala de Aula' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EF06CI05' },
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
                        { id: 'lacunas', titulo: 'Complete as Lacunas', desc: 'Preencher palavras', icone: 'far fa-file-alt', cor: 'text-emerald-500', bg: 'bg-emerald-50' },
                        { id: 'bingo', titulo: 'Bingo Pedagógico', desc: 'Cartelas de termos', icone: 'fas fa-th', cor: 'text-orange-500', bg: 'bg-orange-50' }
                    ]
                },
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'serie', tipo: 'select-serie' }, { id: 'disciplina', tipo: 'select-disciplina' }] },
                { id: 'modo-geracao', tipo: 'toggle-ia', label: 'Como deseja preencher o conteúdo?', default: 'ia' },

                // RENDERS CONDICIONAIS - Baseados no valor de 'modo-geracao'
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
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EF08MA07' },
                { id: 'adaptacao', tipo: 'inclusao' }
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
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EF09MA06' },
                { id: 'adaptacao', tipo: 'inclusao' }
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
                { id: 'bncc', tipo: 'text', label: 'Campo de Experiência BNCC (opcional)', placeholder: 'Ex: EI02CG01' },
                { id: 'adaptacao', tipo: 'inclusao' }
            ]
        },
        'rotina-semanal': {
            titulo: 'Rotina Semanal',
            descricao: 'Organização da semana com acolhimento, rodas, alimentação, descanso, propostas e parque.',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Foco Semanal', placeholder: 'Ex: Adaptação, Higiene...' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EI03CG01' },
                { id: 'adaptacao', tipo: 'inclusao' }
            ]
        },
        'proposta-brincadeira': {
            titulo: 'Proposta de Brincadeira',
            descricao: 'Brincadeira com intencionalidade pedagógica: agrupamento, espaço, materiais e observação.',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Foco da Brincadeira', placeholder: 'Ex: Coordenação motora fina, Reconhecimento das cores...' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EI02TS01' },
                { id: 'adaptacao', tipo: 'inclusao' }
            ]
        }
    },

    // 3. LAYOUT BASE E NAVEGAÇÃO
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
                    <aside class="w-full md:w-64 shrink-0 space-y-6 sticky top-24 pr-2 overflow-y-auto custom-scrollbar max-h-[calc(100vh-150px)]">
                        ${this.gerarMenuLateral()}
                    </aside>
                    <main id="form-area" class="flex-1 w-full bg-white border border-slate-100 shadow-sm rounded-3xl p-6 md:p-8 min-h-[500px] flex flex-col relative transition-all">
                        ${this.gerarHTMLEmptyState()}
                    </main>
                </div>
            </div>
        `;
    },

    gerarMenuLateral() {
        return this.categoriasMenu.map(categoria => `
            <div>
                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">${categoria.titulo}</h4>
                <div class="space-y-1">
                    ${categoria.itens.map(item => {
            const isAtivo = this.ferramentaAtiva === item.id;
            const btnClass = isAtivo ? 'bg-indigo-50 border-indigo-100 text-indigo-700 font-bold' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium';
            return `
                        <button onclick="criarMaterialView.selecionarFerramenta('${item.id}', this)" class="btn-sidebar w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-sm ${btnClass}">
                            <div class="flex items-center gap-3">
                                <div class="w-6 flex justify-center ${isAtivo ? 'text-indigo-600' : item.cor}"><i class="${item.icone}"></i></div>
                                <span>${item.label}</span>
                            </div>
                            ${item.badge ? `<span class="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">${item.badge}</span>` : ''}
                        </button>`;
        }).join('')}
                </div>
            </div>
        `).join('');
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

            // Restaura cor original do ícone (simples heurística)
            const iconDiv = b.querySelector('.w-6');
            if (iconDiv.classList.contains('text-indigo-600')) {
                iconDiv.classList.remove('text-indigo-600');
            }
        });

        if (btnElement) {
            btnElement.classList.add('bg-indigo-50', 'border-indigo-100', 'text-indigo-700', 'font-bold');
            btnElement.classList.remove('border-transparent', 'text-slate-500', 'font-medium');
            btnElement.querySelector('.w-6').classList.add('text-indigo-600');
        }

        // Atualiza a área de formulário
        const formArea = document.getElementById('form-area');
        formArea.classList.remove('animate-slide-in');
        void formArea.offsetWidth;
        formArea.classList.add('animate-slide-in');
        formArea.innerHTML = this.renderizarFormularioDaFerramenta();
    },

    renderizarFormularioDaFerramenta() {
        const config = this.formConfig[this.ferramentaAtiva];
        if (!config) return `<div class="m-auto text-slate-400">Em desenvolvimento ou sem configuração.</div>`;

        return `
            <div class="mb-6 pb-6 border-b border-slate-100">
                <h3 class="text-xl font-bold text-slate-800">${config.titulo}</h3>
                <p class="text-xs text-slate-500 mt-1">${config.descricao}</p>
            </div>
            
            <form id="dynamic-form" class="space-y-6 flex-1">
                ${config.campos.map(campo => this.gerarHtmlInput(campo)).join('')}
            </form>

            <div class="mt-8 pt-6 border-t border-slate-100 flex items-center gap-4 sticky bottom-0 bg-white z-10 pb-2">
                <button type="button" onclick="criarMaterialView.submeterFormulario(this)" class="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-3.5 px-6 rounded-xl font-bold transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 active:scale-[0.98]">
                    <i class="fas fa-layer-group"></i> Gerar conteúdo
                </button>
            </div>
        `;
    },

    /**
     * Renderiza o resultado da IA simulando uma folha A4 em tela.
     */
    renderizarResultadoA4(material) {
        const formArea = document.getElementById('form-area');
        if (!formArea) return;

        // Limpa a tela atual e exibe o preview
        formArea.innerHTML = `
            <div class="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <button onclick="criarMaterialView.selecionarFerramenta('${material.tipo}', document.querySelector('.bg-indigo-50'))" class="text-slate-400 hover:text-indigo-600 font-bold flex items-center gap-2 text-sm transition-colors">
                    <i class="fas fa-arrow-left"></i> Voltar e criar outro
                </button>
                <div class="flex gap-3">
                    <button onclick="criarMaterialView.salvarNaBiblioteca()" class="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold hover:bg-slate-50 transition shadow-sm text-sm flex items-center gap-2">
                        <i class="far fa-save"></i> Salvar na Biblioteca
                    </button>
                    <!-- O Botão Mágico de Imprimir -->
                    <button id="btn-imprimir-material" class="bg-indigo-600 text-white px-5 py-2 rounded-xl font-bold shadow-md shadow-indigo-200 hover:bg-indigo-700 transition flex items-center gap-2">
                        <i class="fas fa-print"></i> Gerar PDF
                    </button>
                </div>
            </div>

            <!-- Visualizador A4 (Tailwind trick) -->
            <div class="bg-slate-100 p-4 sm:p-8 rounded-2xl overflow-y-auto custom-scrollbar flex-1 flex justify-center">
                <div id="folha-a4-preview" class="bg-white shadow-xl rounded-sm w-full max-w-[21cm] min-h-[29.7cm] p-8 sm:p-12 text-slate-800">
                    
                    <!-- Cabeçalho Fictício da Folha -->
                    <div class="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-end">
                        <div>
                            <h2 class="text-2xl font-black uppercase tracking-tight">${window.escapeHTML(material.titulo)}</h2>
                            <p class="text-sm font-bold text-slate-500 mt-1">${window.escapeHTML(material.disciplina)} • ${window.escapeHTML(material.serie)}</p>
                        </div>
                    </div>

                    <!-- Conteúdo renderizado pela IA -->
                    <div class="prose prose-slate max-w-none text-justify leading-relaxed">
                        ${material.conteudo_html}
                    </div>

                </div>
            </div>
        `;

        // Atrela o evento de impressão (Passo 3)
        document.getElementById('btn-imprimir-material').addEventListener('click', () => {
            this.imprimirMaterialA4(material);
        });
    },

    /**
     * Abre uma nova janela e aciona o motor de PDF/Impressora do navegador.
     */
    imprimirMaterialA4(material) {
        // Busca os dados do professor do Model
        const config = model.state.userConfig || {};
        const nomeProf = config.profName ? config.profName : 'Professor(a)';
        const nomeEscola = config.escolaName ? config.escolaName : 'Nome da Escola';

        // Pega a data de hoje formatada
        const dataHoje = new Date().toLocaleDateString('pt-BR');

        // Cria a estrutura HTML que a impressora vai ler
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

        // Abre uma janela fantasma (escondida do usuário mobile/desktop)
        const printWindow = window.open('', '_blank');
        printWindow.document.open();
        printWindow.document.write(conteudo);
        printWindow.document.close();
    },

    // 4. RENDERIZADOR NATIVO DE COMPONENTES E CONDICIONAIS
    gerarHtmlInput(campo) {
        if (campo.tipo === 'row') return `<div class="grid grid-cols-1 md:grid-cols-${campo.colunas.length} gap-4">${campo.colunas.map(col => this.gerarHtmlInput(col)).join('')}</div>`;

        // Renderização com Wrapper para suporte a condições (esconder/mostrar dinamincamente)
        const temCondicao = campo.condicao !== undefined;
        let wrapperClass = temCondicao ? 'conditional-wrapper hidden animate-slide-in' : '';
        let htmlComponente = '';

        switch (campo.tipo) {
            case 'select-disciplina': htmlComponente = `
    <div class="w-full">
        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Disciplina</label>
        <div class="custom-dropdown relative w-full">
            <input type="hidden" data-field="Disciplina" value="Ciências">
            <button type="button" class="dropdown-button w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-300 rounded-xl shadow-sm text-sm font-medium text-slate-700 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-50">
                <span class="dropdown-label truncate">Ciências</span>
                <i class="fas fa-chevron-down text-slate-400 text-xs ml-2"></i>
            </button>
            <ul class="dropdown-menu hidden absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar p-1.5 animate-slide-up origin-top text-left font-normal">
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
        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Série / Ano</label>
        <div class="custom-dropdown relative w-full">
            <input type="hidden" data-field="Série" value="6º Ano EF">
            <button type="button" class="dropdown-button w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-300 rounded-xl shadow-sm text-sm font-medium text-slate-700 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-50">
                <span class="dropdown-label truncate">6º Ano — EF II</span>
                <i class="fas fa-chevron-down text-slate-400 text-xs ml-2"></i>
            </button>
            <ul class="dropdown-menu hidden absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar p-1.5 animate-slide-up origin-top text-left font-normal">
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Educação Infantil">Educação Infantil (Maternal/Pré)</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="6º Ano EF">6º Ano — EF II</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="7º Ano EF">7º Ano — EF II</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="8º Ano EF">8º Ano — EF II</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="9º Ano EF">9º Ano — EF II</li>
            </ul>
        </div>
    </div>`; break;
            case 'text': htmlComponente = `
                <div class="w-full">
                    <label class="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">${campo.label}</label>
                    <input type="text" data-field="${campo.label}" placeholder="${campo.placeholder || ''}" class="form-input w-full p-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium text-slate-700 shadow-sm">
                </div>`; break;
            case 'textarea': htmlComponente = `
                <div class="w-full">
                    <label class="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">${campo.label}</label>
                    <textarea data-field="${campo.label}" placeholder="${campo.placeholder || ''}" rows="5" class="form-input w-full p-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium text-slate-700 shadow-sm resize-none custom-scrollbar"></textarea>
                </div>`; break;
            case 'number': htmlComponente = `
                <div>
                    <label class="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">${campo.label}</label>
                    <input type="number" data-field="${campo.label}" value="${campo.default}" class="form-input w-24 p-3 border border-slate-200 rounded-xl text-center font-black text-slate-800 text-lg outline-none focus:border-indigo-500 shadow-sm">
                </div>`; break;
            case 'pills':
            case 'pills-icon': htmlComponente = `
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
                    </div>`; break;
            case 'grid-cards': htmlComponente = `
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
                    </div>`; break;
            case 'toggle-ia': htmlComponente = `
                    <div class="w-full">
                        <label class="block text-xs font-bold text-slate-800 mb-2">${campo.label}</label>
                        <input type="hidden" data-field="${campo.label}" id="hidden-modo-geracao" value="${campo.default}" class="toggle-control">
                        <div class="flex p-1 bg-slate-50 border border-slate-200 rounded-2xl">
                            <button type="button" id="btn-modo-ia" onclick="criarMaterialView.setModoGeracao('ia')" class="flex-1 py-3 px-4 ${campo.default === 'ia' ? 'bg-white shadow-sm border border-slate-100 text-indigo-600' : 'text-slate-500 hover:text-slate-700'} rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm">
                                <i class="fas fa-magic"></i> Gerar com IA
                                <span class="block text-[9px] text-slate-400 font-normal uppercase tracking-wide ml-2 hidden sm:inline">A partir do tema</span>
                            </button>
                            <button type="button" id="btn-modo-manual" onclick="criarMaterialView.setModoGeracao('manual')" class="flex-1 py-3 px-4 ${campo.default === 'manual' ? 'bg-white shadow-sm border border-slate-100 text-indigo-600' : 'text-slate-500 hover:text-slate-700'} rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm">
                                <i class="fas fa-pencil-alt"></i> Personalizar
                                <span class="block text-[9px] text-slate-400 font-normal uppercase tracking-wide ml-2 hidden sm:inline">Escrever eu mesmo</span>
                            </button>
                        </div>
                    </div>
                    <!-- Aciona a verificação inicial logo após a injeção no DOM -->
                    <img src onerror="criarMaterialView.processarCondicionais()" style="display:none;">`; break;
            case 'dynamic-words': htmlComponente = `
                    <div class="w-full p-5 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                        <label class="block text-sm font-bold text-slate-800 mb-4">${campo.label}</label>
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4" id="dynamic-words-list">
                            <input type="text" placeholder="Palavra 1" class="word-val w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 shadow-sm">
                            <input type="text" placeholder="Palavra 2" class="word-val w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 shadow-sm">
                            <button type="button" onclick="criarMaterialView.addPalavra()" class="w-full p-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm font-bold text-slate-400 hover:text-indigo-500 hover:border-indigo-300 transition-all flex items-center justify-center gap-2"><i class="fas fa-plus"></i> Adicionar</button>
                        </div>
                    </div>`; break;
            case 'inclusao': htmlComponente = `
                    <div class="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <h4 class="font-bold text-slate-800 text-sm mb-4">Adaptar para inclusão (Opcional)</h4>
                        <label class="flex items-center gap-3 cursor-pointer"><input type="checkbox" id="check-tea" class="w-4 h-4 text-indigo-600 rounded border-slate-300"><span class="text-sm font-bold text-slate-700">Aluno com TEA</span></label>
                        <label class="flex items-center gap-3 cursor-pointer mt-3"><input type="checkbox" id="check-tdah" class="w-4 h-4 text-indigo-600 rounded border-slate-300"><span class="text-sm font-bold text-slate-700">Aluno com TDAH</span></label>
                    </div>`; break;
            default: return '';
        }

        // Se tem condição, engloba na div controladora
        if (temCondicao) {
            return `<div class="${wrapperClass}" data-condicao-campo="${campo.condicao.campo}" data-condicao-valor="${campo.condicao.valor}">${htmlComponente}</div>`;
        }
        return htmlComponente;
    },

    // 5. LÓGICAS DE INTERAÇÃO E ESTADOS
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
        document.getElementById(`hidden-${campoId}`).value = titulo;
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

    setModoGeracao(modo) {
        const inputHidden = document.getElementById('hidden-modo-geracao');
        if (inputHidden) inputHidden.value = modo;

        const btnIa = document.getElementById('btn-modo-ia');
        const btnManual = document.getElementById('btn-modo-manual');

        if (modo === 'ia') {
            btnIa.className = "btn-modo flex-1 py-3 px-4 bg-white shadow-sm border border-slate-100 text-indigo-600 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm";
            btnManual.className = "btn-modo flex-1 py-3 px-4 text-slate-500 hover:text-slate-700 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm";
        } else {
            btnManual.className = "btn-modo flex-1 py-3 px-4 bg-white shadow-sm border border-slate-100 text-indigo-600 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm";
            btnIa.className = "btn-modo flex-1 py-3 px-4 text-slate-500 hover:text-slate-700 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm";
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

    // 6. ENGENHARIA DE SUBMISSÃO E IA
    async submeterFormulario(btn) {
        const iconOriginal = btn.innerHTML;
        const dadosExtrahidos = {};

        // Extrai apenas dos campos visíveis (para ignorar o Tema se estiver no modo manual, por exemplo)
        document.querySelectorAll('.conditional-wrapper:not(.hidden) .form-input, form > .w-full > .form-input, form > div > div > .form-input').forEach(input => {
            if (input.value.trim() !== '') dadosExtrahidos[input.dataset.field] = input.value;
        });

        // Extrai Hidden inputs (Pills e Cards)
        document.querySelectorAll('input[type="hidden"][data-field]').forEach(input => {
            dadosExtrahidos[input.dataset.field] = input.value;
        });

        // Extrai Palavras dinâmicas (se visíveis)
        const wrapperPalavras = document.getElementById('dynamic-words-list');
        if (wrapperPalavras && !wrapperPalavras.closest('.hidden')) {
            const palavrasInputs = wrapperPalavras.querySelectorAll('.word-val');
            const palavras = Array.from(palavrasInputs).map(i => i.value.trim()).filter(v => v !== '');
            if (palavras.length > 0) dadosExtrahidos["Palavras Listadas"] = palavras.join(', ');
        }

        // Extrai Inclusão
        const adaptaTEA = document.getElementById('check-tea')?.checked;
        const adaptaTDAH = document.getElementById('check-tdah')?.checked;
        if (adaptaTEA || adaptaTDAH) {
            dadosExtrahidos["Adaptações Inclusivas Obrigatórias"] = `${adaptaTEA ? 'Autismo (TEA)' : ''} ${adaptaTDAH ? 'TDAH' : ''}`;
        }

        // Validação Mínima
        if (Object.keys(dadosExtrahidos).length < 2) return Toast.show("Preencha os campos essenciais antes de gerar.", "warning");

        try {
            btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Processando com IA...`;
            btn.disabled = true;

            const materialPronto = await aiService.gerarMaterial(this.ferramentaAtiva, dadosExtrahidos);
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
    }
};

if (typeof window !== 'undefined') window.criarMaterialView = criarMaterialView;