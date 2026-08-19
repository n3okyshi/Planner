import { model } from '../model.js';
import { controller } from '../controller.js';
import { aiService } from '../ai-service.js';
import { Toast } from '../components/toast.js';
import { lerArquivoTexto, renderKatex, formatarTextoComLatex, sanitizeComLatex } from '../utils.js';

export const criarMaterialView = {
    abaAtiva: 'meus', // 'meus', 'templates', 'comunidade'
    selecionadas: new Set(),
    termoBusca: '',
    filtros: {
        disciplina: '',
        serie: '',
        tipo: ''
    },
    paginaAtual: 1,
    itensPorPagina: 25,
    ferramentaAtiva: null,
    contextoArquivoTexto: '',
    disciplinas: [
        "Língua Portuguesa", "Matemática", "Ciências", "História", "Geografia",
        "Arte", "Educação Física", "Língua Inglesa", "Física", "Química",
        "Biologia", "Filosofia", "Sociologia"
    ],
    seriesDisponiveis: [
        "Educação Infantil", "1º Ano EF", "2º Ano EF", "3º Ano EF", "4º Ano EF", 
        "5º Ano EF", "6º Ano EF", "7º Ano EF", "8º Ano EF", "9º Ano EF", "Ensino Médio"
    ],
    categoriasMenu: [
        {
            titulo: 'PLANEJAR',
            itens: [
                { id: 'planejamento', label: 'Planejamento', icone: 'far fa-calendar-alt', cor: 'text-indigo-500' }
            ]
        },
        {
            titulo: 'APLICAR EM SALA & METODOLOGIAS',
            itens: [
                { id: 'dinamica-jogo', label: 'Dinâmica e Jogo', icone: 'fas fa-users', cor: 'text-blue-500' },
                { id: 'jogos-rpg', label: 'Jogos, RPGs & Escape Rooms', icone: 'fas fa-dice-d20', cor: 'text-rose-500' },
                { id: 'situacao-problema', label: 'Situação-Problema', icone: 'far fa-lightbulb', cor: 'text-amber-500' },
                { id: 'atividade-imprimivel', label: 'Atividade Imprimível', icone: 'fas fa-print', cor: 'text-emerald-500' },
                { id: 'apresentacao', label: 'Apresentação Animada', icone: 'fas fa-desktop', cor: 'text-slate-300', badge: 'EM BREVE', disabled: true }
            ]
        },
        {
            titulo: 'CIÊNCIAS & EXPERIMENTAÇÃO',
            itens: [
                { id: 'diario-laboratorio', label: 'Diário de Laboratório & Prática', icone: 'fas fa-vial', cor: 'text-teal-500' },
                { id: 'pratica-laboratorio', label: 'Roteiro de Aula Prática', icone: 'fas fa-flask', cor: 'text-emerald-500' },
                { id: 'atividade-investigativa', label: 'Atividade Investigativa', icone: 'fas fa-microscope', cor: 'text-purple-500' }
            ]
        },
        {
            titulo: 'AVALIAR',
            itens: [
                { id: 'rubrica-avaliacao', label: 'Rubrica com Matriz IA', icone: 'fas fa-table-cells', cor: 'text-fuchsia-600' },
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
        'jogos-rpg': {
            titulo: 'Templates de Jogos, RPGs & Escape Rooms',
            descricao: 'Roteiros estruturados de jogos de tabuleiro, desafios de escape room e missões de RPG com cartas, enigmas e regras completas',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Tema / Conteúdo do Jogo ou Missão', placeholder: 'Ex: A Conquista do Espaço, A Jornada da Célula, Frações em Ação, Revolução Industrial...' },
                { id: 'estilo-jogo', tipo: 'pills', label: 'FORMATO DO JOGO', opcoes: ['Escape Room em Sala', 'RPG de Missões / Narrativa', 'Jogo de Tabuleiro com Cartas', 'Gincana Investigativa'], default: 'Escape Room em Sala' },
                { id: 'tempo', tipo: 'pills', label: 'TEMPO ESTIMADO', opcoes: ['30 min', '50 min (1 aula)', '100 min (2 aulas)'], default: '50 min (1 aula)' },
                { id: 'tamanho-grupo', tipo: 'pills', label: 'ORGANIZAÇÃO DOS ALUNOS', opcoes: ['Em Duplas', 'Equipes de 4 a 5', 'Turma Toda'], default: 'Equipes de 4 a 5' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EF07CI01' }
            ]
        },
        'diario-laboratorio': {
            titulo: 'Diário de Laboratório & Aula Prática',
            descricao: 'Roteiros estruturados para aulas práticas e experimentos investigativos com materiais acessíveis, tabela de coleta de dados e perguntas reflexivas',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Fenômeno / Conceito a Investigar', placeholder: 'Ex: Densidade dos Líquidos, pH de substâncias, Extração de DNA, Circuitos Elétricos...' },
                { id: 'tipo-materiais', tipo: 'pills', label: 'FOCO DOS MATERIAIS', opcoes: ['Materiais de Baixo Custo / Cotidiano', 'Vidrarias e Reagentes de Laboratório', 'Misto'], default: 'Materiais de Baixo Custo / Cotidiano' },
                { id: 'tempo', tipo: 'pills', label: 'DURAÇÃO DA PRÁTICA', opcoes: ['30 min', '50 min (1 aula)', '100 min (2 aulas)'], default: '50 min (1 aula)' },
                { id: 'seguranca', tipo: 'text', label: 'Orientações de Segurança Específicas (opcional)', placeholder: 'Ex: Uso de luvas, não ingerir amostras, cuidado com água quente...' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EF08CI02' }
            ]
        },
        'rubrica-avaliacao': {
            titulo: 'Gerador de Rubricas de Avaliação com Matriz IA',
            descricao: 'Matriz analítica cruzando critérios de aprendizagem com níveis de desempenho (Insuficiente, Regular, Bom, Excelente) e pesos para pontuação automática',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Atividade / Produção a ser Avaliada', placeholder: 'Ex: Apresentação de Seminário, Redação Argumentativa, Projeto Maker, Experimento em Grupo...' },
                { id: 'pontuacao-maxima', tipo: 'pills', label: 'PONTUAÇÃO MÁXIMA', opcoes: ['10 pontos', '20 pontos', '100 pontos'], default: '10 pontos' },
                { id: 'criterios-foco', tipo: 'text', label: 'Critérios Especiais em Foco (opcional)', placeholder: 'Ex: Domínio Conceitual, Clareza na Comunicação, Trabalho em Equipe, Criatividade...' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EM13LP01' }
            ]
        },
        'pratica-laboratorio': {
            titulo: 'Roteiro de Aula Prática & Laboratório',
            descricao: 'Roteiros de experimentação científica com materiais de baixo custo ou laboratório, tabelas de observação e normas de segurança',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Assunto / Fenômeno a ser Investigado', placeholder: 'Ex: Densidade dos Líquidos, Reações Químicas, Leis de Newton, Células Vegetais...' },
                { id: 'materiais', tipo: 'text', label: 'Materiais Disponíveis ou em Foco', placeholder: 'Ex: Garrafas PET, Água, Óleo, Detergente, Copos, Balança...' },
                { id: 'baixo-custo', tipo: 'pills', label: 'FOCO DOS MATERIAIS', opcoes: ['Materiais de Baixo Custo / Cotidiano', 'Equipamentos de Laboratório'], default: 'Materiais de Baixo Custo / Cotidiano' },
                { id: 'tempo', tipo: 'pills', label: 'DURAÇÃO DA PRÁTICA', opcoes: ['30 min', '50 min (1 aula)', '100 min (2 aulas)'], default: '50 min (1 aula)' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EF06CI02' }
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
    mudarAba(novaAba) {
        this.abaAtiva = novaAba;
        this.filtros = { disciplina: '', serie: '', tipo: '' };
        this.termoBusca = '';
        this.paginaAtual = 1;
        this.render('view-container');
    },

    atualizarFiltro(campo, valor) {
        this.filtros[campo] = valor;
        this.paginaAtual = 1;
        this.render('view-container');
    },

    atualizarBusca(valor) {
        this.termoBusca = valor || '';
        this.paginaAtual = 1;
        this.render('view-container');
    },

    mudarQtdPagina(qtd) {
        this.itensPorPagina = qtd === 'all' ? 'all' : Number(qtd);
        this.paginaAtual = 1;
        this.render('view-container');
    },

    proximaPagina() {
        this.paginaAtual++;
        this.render('view-container');
    },

    paginaAnterior() {
        if (this.paginaAtual > 1) {
            this.paginaAtual--;
            this.render('view-container');
        }
    },

    filtrarMateriais(todas) {
        return (todas || []).filter(m => {
            const termo = (this.termoBusca || '').toLowerCase();
            const matchBusca = !termo ||
                (m.titulo && m.titulo.toLowerCase().includes(termo)) ||
                (m.tema && m.tema.toLowerCase().includes(termo)) ||
                (m.disciplina && m.disciplina.toLowerCase().includes(termo)) ||
                (m.serie && m.serie.toLowerCase().includes(termo)) ||
                (m.bncc && m.bncc.toLowerCase().includes(termo)) ||
                (m.conteudo_html && m.conteudo_html.toLowerCase().includes(termo));
            
            const matchDisciplina = !this.filtros.disciplina || m.disciplina === this.filtros.disciplina;
            const matchSerie = !this.filtros.serie || (m.serie && m.serie.includes(this.filtros.serie));
            const matchTipo = !this.filtros.tipo || m.tipo === this.filtros.tipo;

            return matchBusca && matchDisciplina && matchSerie && matchTipo;
        });
    },

    toggleSelecao(id) {
        const idStr = String(id);
        if (this.selecionadas.has(idStr)) {
            this.selecionadas.delete(idStr);
        } else {
            this.selecionadas.add(idStr);
        }
        this.render('view-container');
    },

    selecionarTodos(listaPaginada) {
        const todosMarcados = listaPaginada.every(m => this.selecionadas.has(String(m.id)));
        if (todosMarcados) {
            listaPaginada.forEach(m => this.selecionadas.delete(String(m.id)));
        } else {
            listaPaginada.forEach(m => this.selecionadas.add(String(m.id)));
        }
        this.render('view-container');
    },

    limparSelecao() {
        this.selecionadas.clear();
        this.render('view-container');
    },

    async compilarPacoteSelecionados() {
        if (this.selecionadas.size === 0) return;
        const defaultTitle = `Pacote Integrado (${this.selecionadas.size} materiais)`;
        const titulo = prompt("Digite o título para o novo Pacote Compilado de Materiais:", defaultTitle);
        if (!titulo || !titulo.trim()) return;

        const novoPacote = await model.compilarMateriaisEmPacote(Array.from(this.selecionadas), titulo.trim());
        if (novoPacote && window.conteudoGeradoView) {
            this.selecionadas.clear();
            window.conteudoGeradoView.setMaterial(novoPacote.id);
            controller.navigate('conteudo-gerado');
        }
    },

    baixarWordSelecionados() {
        if (this.selecionadas.size === 0) return;
        const selecionadosList = (model.state.materiaisGerados || []).filter(m => this.selecionadas.has(String(m.id)));
        if (!selecionadosList.length) return;

        let htmlLote = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Coletânea de Materiais - Planner Pro</title>
                <style>
                    body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; padding: 30px; color: #1e293b; }
                    h1 { color: #1e293b; font-size: 20pt; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
                    h2 { color: #334155; font-size: 16pt; margin-top: 20px; }
                    p, li { line-height: 1.6; color: #334155; font-size: 11pt; }
                    .secao-material { page-break-after: always; margin-bottom: 40px; }
                </style>
            </head>
            <body>
        `;

        selecionadosList.forEach((m, idx) => {
            const tituloSafe = window.escapeHTML ? window.escapeHTML(m.titulo || m.tema || 'Material') : (m.titulo || 'Material');
            htmlLote += `
                <div class="secao-material">
                    <h1>${idx + 1}. ${tituloSafe}</h1>
                    <p><strong>Disciplina:</strong> ${window.escapeHTML(m.disciplina || 'Geral')} | <strong>Série:</strong> ${window.escapeHTML(m.serie || 'Geral')}</p>
                    <hr>
                    ${m.conteudo_html || ''}
                </div>
            `;
        });

        htmlLote += "</body></html>";

        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(htmlLote);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = `coletanea_materiais_${Date.now().toString(36)}.doc`;
        fileDownload.click();
        document.body.removeChild(fileDownload);
        if (Toast) Toast.show(`${selecionadosList.length} materiais exportados para Word!`, "success");
    },

    imprimirPDFSelecionados() {
        if (this.selecionadas.size === 0) return;
        const selecionadosList = (model.state.materiaisGerados || []).filter(m => this.selecionadas.has(String(m.id)));
        if (!selecionadosList.length) return;

        const config = model.state.userConfig || {};
        const nomeProf = config.profName ? config.profName : 'Professor(a)';
        const nomeEscola = config.escolaName ? config.escolaName : 'Nome da Escola';
        const dataHoje = new Date().toLocaleDateString('pt-BR');

        let corpoImpressao = '';
        selecionadosList.forEach((m, idx) => {
            const conteudoLimpo = window.prepararHTMLParaExportacao 
                ? window.prepararHTMLParaExportacao(m.conteudo_html || '', 'professor')
                : (m.conteudo_html || '');
            
            corpoImpressao += `
                <div class="secao-impressao-item" style="page-break-before: ${idx > 0 ? 'always' : 'auto'}; margin-bottom: 30px;">
                    <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold;">
                            <span>${window.escapeHTML(nomeEscola)}</span>
                            <span>PROFESSOR(A): ${window.escapeHTML(nomeProf)}</span>
                        </div>
                        <h2 style="font-size: 18px; font-weight: 900; margin: 10px 0 5px 0; text-transform: uppercase;">${window.escapeHTML(m.titulo || m.tema || 'Material')}</h2>
                        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569;">
                            <span>DISCIPLINA: ${window.escapeHTML(m.disciplina || 'Geral')} • SÉRIE: ${window.escapeHTML(m.serie || 'Geral')}</span>
                            <span>DATA: ${dataHoje}</span>
                        </div>
                    </div>
                    <div class="content" style="line-height: 1.6;">
                        ${conteudoLimpo}
                    </div>
                </div>
            `;
        });

        const htmlDocumento = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Lote de Materiais Pedagógicos - Impressão</title>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                    body { font-family: 'Inter', sans-serif; color: #1e293b; background: #fff; padding: 0; margin: 0; }
                    @page { size: A4; margin: 15mm; }
                    .content h3 { font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
                    .content p { font-size: 13px; text-align: justify; margin-bottom: 8px; }
                    .content ul, .content ol { font-size: 13px; padding-left: 20px; }
                    .gabarito-bloco, .gabarito { background-color: #ecfdf5; border: 1px solid #a7f3d0; border-left: 4px solid #059669; padding: 10px 14px; margin: 12px 0; border-radius: 6px; }
                </style>
            </head>
            <body>
                ${corpoImpressao}
                <script>
                    window.onload = () => { window.print(); };
                </script>
            </body>
            </html>
        `;

        const printWin = window.open('', '_blank');
        printWin.document.open();
        printWin.document.write(htmlDocumento);
        printWin.document.close();
    },

    compartilharSelecionados() {
        if (this.selecionadas.size === 0) return;
        model.compartilharMateriaisEmMassa(Array.from(this.selecionadas));
    },

    excluirSelecionados() {
        if (this.selecionadas.size === 0) return;
        const qtd = this.selecionadas.size;
        const acao = () => {
            model.deleteMateriaisEmMassa(Array.from(this.selecionadas));
            this.selecionadas.clear();
        };

        if (window.uiController && window.uiController.confirmarAcao) {
            window.uiController.confirmarAcao(
                "Excluir Materiais Selecionados",
                `Tem certeza que deseja apagar ${qtd} materiais da sua biblioteca? Esta ação é irreversível.`,
                acao
            );
        } else if (confirm(`Tem certeza que deseja apagar ${qtd} materiais?`)) {
            acao();
        }
    },

    cardMaterial(m) {
        const isSelected = this.selecionadas.has(String(m.id));
        const tituloSafe = window.escapeHTML ? window.escapeHTML(m.titulo || m.tema || 'Material sem título') : (m.titulo || m.tema || 'Material sem título');
        const disciplinaSafe = window.escapeHTML ? window.escapeHTML(m.disciplina || 'Geral') : (m.disciplina || 'Geral');
        const serieSafe = window.escapeHTML ? window.escapeHTML(m.serie || 'Série não informada') : (m.serie || 'Série não informada');
        const tipoLabel = (m.tipo || 'geral').replace(/-/g, ' ').toUpperCase();
        const dataFormatada = new Date(m.createdAt || Date.now()).toLocaleDateString('pt-BR');

        const colorMap = {
            'planejamento': { i: 'far fa-calendar-alt', c: '#4f46e5', bg: '#eef2ff' },
            'dinamica-jogo': { i: 'fas fa-users', c: '#2563eb', bg: '#eff6ff' },
            'jogos-rpg': { i: 'fas fa-dice-d20', c: '#e11d48', bg: '#fff1f2' },
            'atividade-imprimivel': { i: 'fas fa-print', c: '#059669', bg: '#ecfdf5' },
            'avaliacao-prova': { i: 'fas fa-clipboard-list', c: '#ea580c', bg: '#fff7ed' },
            'rubrica-avaliacao': { i: 'fas fa-table-cells', c: '#c026d3', bg: '#fdf4ff' },
            'diario-laboratorio': { i: 'fas fa-vial', c: '#0d9488', bg: '#f0fdfa' },
            'pacote-compilado': { i: 'fas fa-layer-group', c: '#7c3aed', bg: '#f3e8ff' }
        };
        const style = colorMap[m.tipo] || { i: 'fas fa-file-alt', c: '#64748b', bg: '#f8fafc' };

        // Process preview snippet with latex
        let previewTexto = (m.conteudo_html || '').replace(/<[^>]*>?/gm, '');
        if (previewTexto.length > 140) previewTexto = previewTexto.substring(0, 140) + '...';
        const previewSafe = window.sanitizeComLatex ? window.sanitizeComLatex(previewTexto) : window.escapeHTML(previewTexto);

        return `
            <div class="material-card-unified interactive-element ${isSelected ? 'material-card-unified--selected' : ''}">
                <!-- CAPA & SELEÇÃO -->
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} 
                               onchange="criarMaterialView.toggleSelecao('${m.id}')"
                               style="width: 1.25rem; height: 1.25rem; accent-color: #4f46e5; cursor: pointer; border-radius: 0.375rem;">
                        <div style="width: 2.25rem; height: 2.25rem; border-radius: 0.75rem; background-color: ${style.bg}; color: ${style.c}; display: flex; align-items: center; justify-content: center; font-size: 1rem;">
                            <i class="${style.i}"></i>
                        </div>
                        <div>
                            <span class="badge" style="background-color: ${style.bg}; color: ${style.c}; font-size: 0.6875rem; font-weight: 800;">${tipoLabel}</span>
                        </div>
                    </div>
                    ${m.compartilhado ? `
                        <span class="badge" style="background-color: #f3e8ff; color: #7c3aed; font-size: 0.625rem; font-weight: 800;" title="Público na Comunidade">
                            <i class="fas fa-globe"></i> Público
                        </span>
                    ` : ''}
                </div>

                <!-- TÍTULO & DETALHES -->
                <div>
                    <h4 style="font-weight: 800; color: #1e293b; font-size: 1.05rem; margin-bottom: 0.25rem; line-height: 1.3;">${tituloSafe}</h4>
                    <p style="font-size: 0.75rem; color: #64748b; font-weight: 600; margin-bottom: 0.5rem;">
                        <i class="fas fa-book-open" style="color: #94a3b8; margin-right: 0.25rem;"></i> ${disciplinaSafe} • ${serieSafe}
                    </p>
                    <div style="font-size: 0.8125rem; color: #475569; background-color: #f8fafc; padding: 0.625rem; border-radius: 0.75rem; border: 1px solid #f1f5f9; min-height: 2.75rem; max-height: 3.5rem; overflow: hidden;" class="katex-render-area">
                        ${previewSafe || '<em style="color: #94a3b8;">Sem prévia de conteúdo.</em>'}
                    </div>
                </div>

                <!-- METADADOS & AÇÕES -->
                <div style="margin-top: auto; padding-top: 0.75rem; border-top: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                    <span style="font-size: 0.6875rem; color: #94a3b8; font-weight: 500;">
                        <i class="far fa-clock"></i> ${dataFormatada}
                    </span>
                    
                    <div style="display: flex; align-items: center; gap: 0.375rem;">
                        <button type="button" onclick="conteudoGeradoView.setMaterial('${m.id}'); controller.navigate('conteudo-gerado');" 
                                class="btn-primary interactive-element" 
                                style="padding: 0.45rem 0.875rem; font-size: 0.75rem; background-color: #4f46e5; border-radius: 0.625rem; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
                            <i class="fas fa-eye"></i> Abrir
                        </button>
                        
                        <button type="button" onclick="model.duplicarMaterial('${m.id}')" 
                                class="interactive-element" 
                                style="width: 2rem; height: 2rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; background: #fff; color: #64748b; display: flex; align-items: center; justify-content: center; cursor: pointer;" 
                                title="Duplicar Material">
                            <i class="far fa-clone" style="font-size: 0.75rem;"></i>
                        </button>

                        ${m.compartilhado ? `
                            <button type="button" onclick="model.removerMaterialDaComunidade('${m.id}')" 
                                    class="interactive-element" 
                                    style="width: 2rem; height: 2rem; border-radius: 0.5rem; border: 1px solid #ddd6fe; background: #f3e8ff; color: #7c3aed; display: flex; align-items: center; justify-content: center; cursor: pointer;" 
                                    title="Público (Clique para retirar da comunidade)">
                                <i class="fas fa-globe" style="font-size: 0.75rem;"></i>
                            </button>
                        ` : `
                            <button type="button" onclick="model.compartilharMaterial('${m.id}')" 
                                    class="interactive-element" 
                                    style="width: 2rem; height: 2rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; background: #fff; color: #94a3b8; display: flex; align-items: center; justify-content: center; cursor: pointer;" 
                                    title="Compartilhar com a Comunidade">
                                <i class="fas fa-globe" style="font-size: 0.75rem;"></i>
                            </button>
                        `}

                        <button type="button" onclick="model.deleteMaterial('${m.id}')" 
                                class="interactive-element" 
                                style="width: 2rem; height: 2rem; border-radius: 0.5rem; border: 1px solid #fee2e2; background: #fef2f2; color: #ef4444; display: flex; align-items: center; justify-content: center; cursor: pointer;" 
                                title="Excluir Material">
                            <i class="fas fa-trash-alt" style="font-size: 0.75rem;"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    floatingActionBar() {
        return `
            <div class="floating-action-bar">
                <div class="floating-action-bar__counter">
                    <span class="floating-action-bar__badge">${this.selecionadas.size}</span>
                    <span>selecionados</span>
                </div>

                <button type="button" onclick="criarMaterialView.compilarPacoteSelecionados()" class="floating-action-bar__btn floating-action-bar__btn--primary" title="Compilar materiais selecionados em um único arquivo integrado com capa e sumário">
                    <i class="fas fa-layer-group"></i> Compilar em Pacote
                </button>

                <button type="button" onclick="criarMaterialView.baixarWordSelecionados()" class="floating-action-bar__btn floating-action-bar__btn--secondary" title="Exportar materiais selecionados em arquivo Word (.doc)">
                    <i class="far fa-file-word"></i> Baixar Word
                </button>

                <button type="button" onclick="criarMaterialView.imprimirPDFSelecionados()" class="floating-action-bar__btn floating-action-bar__btn--secondary" title="Imprimir / Gerar PDF dos materiais selecionados">
                    <i class="fas fa-print"></i> PDF / Imprimir
                </button>

                <button type="button" onclick="criarMaterialView.compartilharSelecionados()" class="floating-action-bar__btn floating-action-bar__btn--secondary" title="Publicar selecionados na Comunidade">
                    <i class="fas fa-globe"></i> Compartilhar
                </button>

                <button type="button" onclick="criarMaterialView.excluirSelecionados()" class="floating-action-bar__btn floating-action-bar__btn--danger" title="Excluir selecionados">
                    <i class="fas fa-trash-alt"></i> Excluir
                </button>

                <button type="button" onclick="criarMaterialView.limparSelecao()" class="floating-action-bar__btn floating-action-bar__btn--secondary" style="margin-left: auto;" title="Cancelar seleção">
                    <i class="fas fa-times"></i> Limpar
                </button>
            </div>
        `;
    },

    renderMeusMateriais(materiaisPaginados, totalItens, totalPaginas) {
        const todosMarcados = materiaisPaginados.length > 0 && materiaisPaginados.every(m => this.selecionadas.has(String(m.id)));

        return `
            <div class="animate-enter">
                <!-- BARRA DE FILTROS & BUSCA (PADRÃO BANCO DE QUESTÕES) -->
                <div class="dynamic-box" style="padding: 1.25rem; margin-bottom: 1.5rem;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
                        <div>
                            <label class="form-label">Disciplina</label>
                            <select onchange="criarMaterialView.atualizarFiltro('disciplina', this.value)" class="form-select">
                                <option value="">Todas as Disciplinas</option>
                                ${this.disciplinas.map(d => `<option value="${d}" ${this.filtros.disciplina === d ? 'selected' : ''}>${d}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Série / Ano</label>
                            <select onchange="criarMaterialView.atualizarFiltro('serie', this.value)" class="form-select">
                                <option value="">Todas as Séries</option>
                                ${this.seriesDisponiveis.map(s => `<option value="${s}" ${this.filtros.serie === s ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Tipo de Material</label>
                            <select onchange="criarMaterialView.atualizarFiltro('tipo', this.value)" class="form-select">
                                <option value="">Todos os Tipos</option>
                                <option value="planejamento" ${this.filtros.tipo === 'planejamento' ? 'selected' : ''}>Planejamento</option>
                                <option value="dinamica-jogo" ${this.filtros.tipo === 'dinamica-jogo' ? 'selected' : ''}>Dinâmica e Jogo</option>
                                <option value="jogos-rpg" ${this.filtros.tipo === 'jogos-rpg' ? 'selected' : ''}>Jogos e RPG</option>
                                <option value="atividade-imprimivel" ${this.filtros.tipo === 'atividade-imprimivel' ? 'selected' : ''}>Atividade Imprimível</option>
                                <option value="avaliacao-prova" ${this.filtros.tipo === 'avaliacao-prova' ? 'selected' : ''}>Avaliação / Prova</option>
                                <option value="rubrica-avaliacao" ${this.filtros.tipo === 'rubrica-avaliacao' ? 'selected' : ''}>Rubrica de Avaliação</option>
                                <option value="diario-laboratorio" ${this.filtros.tipo === 'diario-laboratorio' ? 'selected' : ''}>Diário de Laboratório</option>
                                <option value="pacote-compilado" ${this.filtros.tipo === 'pacote-compilado' ? 'selected' : ''}>Pacote Compilado</option>
                            </select>
                        </div>
                    </div>

                    <div style="position: relative; margin-top: 1rem;">
                        <i class="fas fa-search" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--color-slate-400);"></i>
                        <input type="text" placeholder="Pesquisar por título, assunto, palavra-chave ou código BNCC..." 
                               class="form-input" style="padding-left: 2.75rem; width: 100%;"
                               oninput="criarMaterialView.atualizarBusca(this.value)" value="${this.termoBusca}">
                    </div>
                </div>

                <!-- CONTROLES SUPERIORES DE SELEÇÃO E PAGINAÇÃO -->
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; gap: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <button type="button" onclick="criarMaterialView.selecionarTodos(criarMaterialView.filtrarMateriais(model.state.materiaisGerados || []))"
                                class="btn-secondary interactive-element" style="padding: 0.4rem 0.875rem; font-size: 0.75rem; font-weight: 700;">
                            <i class="${todosMarcados ? 'fas fa-check-square' : 'far fa-square'}"></i>
                            ${todosMarcados ? 'Desmarcar Todos' : 'Marcar Todos'}
                        </button>
                        <span style="font-size: 0.75rem; font-weight: 700; color: #94a3b8;">Exibindo <strong style="color: #475569;">${materiaisPaginados.length}</strong> de <strong style="color: #475569;">${totalItens}</strong> materiais</span>
                    </div>

                    <div style="display: flex; align-items: center; background-color: #ffffff; border-radius: 0.75rem; border: 1px solid #e2e8f0; padding: 0.25rem 0.75rem; box-shadow: var(--shadow-sm);">
                        <label class="form-label" style="margin-bottom: 0; margin-right: 0.5rem; font-size: 0.75rem;">Exibir por pág:</label>
                        <select onchange="criarMaterialView.mudarQtdPagina(this.value)" class="form-select" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; width: 5.5rem; border: none; background: transparent;">
                            <option value="25" ${this.itensPorPagina === 25 ? 'selected' : ''}>25</option>
                            <option value="50" ${this.itensPorPagina === 50 ? 'selected' : ''}>50</option>
                            <option value="100" ${this.itensPorPagina === 100 ? 'selected' : ''}>100</option>
                            <option value="all" ${this.itensPorPagina === 'all' ? 'selected' : ''}>Todos</option>
                        </select>
                    </div>
                </div>

                <!-- GRID DE CARDS UNIFICADOS -->
                ${materiaisPaginados.length > 0 ? `
                    <div class="materials-workspace-grid">
                        ${materiaisPaginados.map(m => this.cardMaterial(m)).join('')}
                    </div>
                ` : this.gerarHTMLEmptyStateWorkspace()}

                <!-- PAGINAÇÃO INFERIOR -->
                ${totalPaginas > 1 ? `
                    <div style="display: flex; margin-top: 2rem; justify-content: space-between; align-items: center; background-color: var(--color-white); padding: 1rem; border-radius: var(--radius-2xl); border: 1px solid var(--color-slate-200); box-shadow: var(--shadow-sm);">
                        <button onclick="criarMaterialView.paginaAnterior()" ${this.paginaAtual === 1 ? 'disabled' : ''}
                                class="btn-secondary interactive-element" style="padding: 0.5rem 1rem; font-size: 0.8125rem;">
                            <i class="fas fa-chevron-left"></i> Anterior
                        </button>
                        
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase;">
                            Página <span style="color: #4f46e5; font-size: 0.875rem; font-weight: 900;">${this.paginaAtual}</span> de ${totalPaginas}
                        </span>
                        
                        <button onclick="criarMaterialView.proximaPagina()" ${this.paginaAtual === totalPaginas ? 'disabled' : ''}
                                class="btn-primary interactive-element" style="padding: 0.5rem 1rem; font-size: 0.8125rem; background-color: #4f46e5;">
                            Próxima <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    gerarHTMLEmptyStateWorkspace() {
        return `
            <div class="tool-empty-state animate-enter" style="max-width: 32rem; padding: 4rem 2rem; background-color: var(--color-white); border-radius: 1.5rem; border: 1px solid #f1f5f9; box-shadow: var(--shadow-sm); margin: 2rem auto; text-align: center;">
                <div class="tool-empty-state__icon-wrap" style="width: 5rem; height: 5rem; margin: 0 auto 1.25rem;">
                    <i class="fas fa-folder-open" style="font-size: 2rem; color: #94a3b8;"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-800 mb-2">Nenhum material encontrado</h3>
                <p class="text-slate-500 text-sm mb-6">Tente ajustar seus filtros de busca ou crie um novo conteúdo pedagógico com IA.</p>
                <button type="button" onclick="criarMaterialView.mudarAba('templates')" class="btn-primary interactive-element" style="padding: 0.75rem 1.5rem; background-color: #4f46e5; display: inline-flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-magic"></i> + Criar com IA agora
                </button>
            </div>
        `;
    },

    renderTemplatesIA() {
        return `
            <div class="animate-enter" style="display: flex; flex-direction: row; gap: 1.5rem; align-items: flex-start; position: relative; min-height: 550px;">
                <aside class="tool-sidebar custom-scrollbar" style="width: 280px; flex-shrink: 0;">
                    ${this.gerarMenuLateral()}
                </aside>
                <main id="form-area" class="tool-main-panel animate-enter" style="flex: 1;">
                    ${this.ferramentaAtiva ? this.renderizarFormularioDaFerramenta() : this.gerarHTMLEmptyState()}
                </main>
            </div>
        `;
    },

    renderComunidadeMateriais() {
        setTimeout(() => {
            if (window.comunidadeView && window.comunidadeView.render) {
                window.comunidadeView.render('area-comunidade-materiais');
            }
        }, 30);

        return `
            <div class="animate-enter">
                <div id="area-comunidade-materiais">
                    <div style="text-align: center; padding: 4rem 2rem;">
                        <i class="fas fa-circle-notch fa-spin text-indigo-600 text-3xl"></i>
                        <p class="text-slate-500 mt-2">Carregando acervo compartilhado da comunidade...</p>
                    </div>
                </div>
            </div>
        `;
    },

    abrirModalCriarMaterial() {
        const modalContent = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; max-height: 70vh; overflow-y: auto; padding: 0.5rem;" class="custom-scrollbar">
                ${this.categoriasMenu.map(cat => `
                    <div style="grid-column: 1 / -1; margin-top: 0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem;">
                        <h4 style="font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase;">${cat.titulo}</h4>
                    </div>
                    ${cat.itens.map(item => `
                        <button type="button" 
                                onclick="controller.closeModal(); criarMaterialView.mudarAba('templates'); criarMaterialView.selecionarFerramenta('${item.id}', null);"
                                class="interactive-element" 
                                ${item.disabled ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
                                style="display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.875rem; text-align: left; transition: all var(--transition-fast);"
                                onmouseover="this.style.borderColor='#818cf8'; this.style.backgroundColor='#ffffff';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.backgroundColor='#f8fafc';">
                            <div style="width: 2.25rem; height: 2.25rem; border-radius: 0.625rem; background-color: #ffffff; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <i class="${item.icone} ${item.cor}"></i>
                            </div>
                            <div>
                                <h5 style="font-weight: 700; font-size: 0.875rem; color: #1e293b; line-height: 1.2;">${item.label}</h5>
                            </div>
                        </button>
                    `).join('')}
                `).join('')}
            </div>
        `;
        controller.openModal('Selecionar Ferramenta de Geração por IA', modalContent, 'xl');
    },

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const meusMateriais = model.state.materiaisGerados || [];
        const materiaisFiltrados = this.filtrarMateriais(meusMateriais);
        const totalItens = materiaisFiltrados.length;

        let totalPaginas = this.itensPorPagina === 'all' ? 1 : Math.ceil(totalItens / this.itensPorPagina);
        if (totalPaginas === 0) totalPaginas = 1;
        if (this.paginaAtual > totalPaginas) this.paginaAtual = totalPaginas;

        let materiaisPaginados = materiaisFiltrados;
        if (this.itensPorPagina !== 'all') {
            const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
            const fim = inicio + this.itensPorPagina;
            materiaisPaginados = materiaisFiltrados.slice(inicio, fim);
        }

        const todosIds = new Set(meusMateriais.map(m => String(m.id)));
        for (const id of this.selecionadas) {
            if (!todosIds.has(String(id))) this.selecionadas.delete(id);
        }

        let conteudoAba = '';
        if (this.abaAtiva === 'meus') {
            conteudoAba = this.renderMeusMateriais(materiaisPaginados, totalItens, totalPaginas);
        } else if (this.abaAtiva === 'templates') {
            conteudoAba = this.renderTemplatesIA();
        } else if (this.abaAtiva === 'comunidade') {
            conteudoAba = this.renderComunidadeMateriais();
        }

        const html = `
            <div class="fade-in print-hidden" style="padding-bottom: 6rem;">
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; gap: 1rem;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Gerador & Acervo de Materiais</h2>
                            <span class="badge" style="background-color: #eef2ff; color: #4338ca; font-weight: 800; padding: 0.35rem 0.75rem; border-radius: 9999px; font-size: 0.75rem;">
                                ${meusMateriais.length} materiais salvos
                            </span>
                        </div>
                        <p class="text-slate-500 mt-1">Crie materiais pedagógicos com IA, organize em coleções e exporte pacotes prontos para aula.</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <button type="button" onclick="criarMaterialView.mudarAba('comunidade')" 
                                class="btn-secondary interactive-element"
                                style="background-color: #4f46e5; color: #ffffff; padding: 0.75rem 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.25);">
                            <i class="fas fa-globe"></i> Explorar Comunidade
                        </button>
                        <button type="button" onclick="criarMaterialView.abrirModalCriarMaterial()" 
                                class="btn-primary interactive-element" style="padding: 0.75rem 1.5rem; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.25);">
                            <i class="fas fa-magic"></i> + Novo Material com IA
                        </button>
                    </div>
                </div>

                <div class="mode-toggle-group" style="width: fit-content; margin-bottom: 1.5rem;">
                    <button type="button" onclick="criarMaterialView.mudarAba('meus')" 
                            class="mode-toggle-btn interactive-element ${this.abaAtiva === 'meus' ? 'mode-toggle-btn--active' : ''}">
                        <i class="fas fa-folder-open" style="margin-right: 0.375rem;"></i> Meus Materiais (${meusMateriais.length})
                    </button>
                    <button type="button" onclick="criarMaterialView.mudarAba('templates')" 
                            class="mode-toggle-btn interactive-element ${this.abaAtiva === 'templates' ? 'mode-toggle-btn--active' : ''}">
                        <i class="fas fa-magic" style="margin-right: 0.375rem;"></i> Gerar com IA / Templates
                    </button>
                    <button type="button" onclick="criarMaterialView.mudarAba('comunidade')" 
                            class="mode-toggle-btn interactive-element ${this.abaAtiva === 'comunidade' ? 'mode-toggle-btn--active' : ''}">
                        <i class="fas fa-users-rectangle" style="margin-right: 0.375rem;"></i> Acervo da Comunidade
                    </button>
                </div>

                ${conteudoAba}

                ${this.selecionadas.size > 0 ? this.floatingActionBar() : ''}
            </div>
        `;

        container.innerHTML = html;

        if (window.renderKatex) {
            window.renderKatex(container);
        }
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

        const conteudoLimpo = window.prepararHTMLParaExportacao 
            ? window.prepararHTMLParaExportacao(material.conteudo_html || '', 'professor')
            : formatarTextoComLatex(material.conteudo_html || '');

        const conteudo = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>${window.escapeHTML(material.titulo)} - PDF</title>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
                <style>
                    /* Reset básico e tipografia de impressão */
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                    
                    body { 
                        font-family: 'Inter', sans-serif; 
                        color: #1e293b; 
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
                    .content h3 { font-size: 18px; margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 4px; color: #0f172a; }
                    .content p { font-size: 14px; text-align: justify; margin-bottom: 10px; color: #334155; }
                    .content ul, .content ol { font-size: 14px; margin-bottom: 10px; padding-left: 24px; }
                    .content li { margin-bottom: 6px; color: #334155; }
                    .content strong { color: #000; }
                    .gabarito-bloco, .gabarito { background-color: #ecfdf5; border: 1px solid #a7f3d0; border-left: 5px solid #059669; padding: 14px 18px; margin: 15px 0; border-radius: 8px; page-break-inside: avoid; }
                    .gabarito-bloco h3, .gabarito-bloco h4 { color: #065f46; margin-top: 0; }
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
                    ${conteudoLimpo}
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

            let materialPronto;
            if (this.ferramentaAtiva === 'pratica-laboratorio') {
                materialPronto = await aiService.gerarRoteiroPratico({
                    disciplina: dadosExtrahidos["Disciplina"] || "Ciências",
                    assunto: dadosExtrahidos["Assunto / Fenômeno a ser Investigado"] || dadosExtrahidos["Tema"] || "Investigação Científica",
                    materiaisDisponiveis: dadosExtrahidos["Materiais Disponíveis ou em Foco"] || "",
                    nivelTurma: dadosExtrahidos["Série / Ano"] || "Ensino Fundamental II",
                    tempoEstimado: dadosExtrahidos["DURAÇÃO DA PRÁTICA"] || "50 min (1 aula)",
                    baixoCusto: (dadosExtrahidos["FOCO DOS MATERIAIS"] || '').includes('Baixo Custo'),
                    contextoDocumento: contextoFinal
                });
            } else {
                materialPronto = await aiService.gerarMaterial(this.ferramentaAtiva, dadosExtrahidos, contextoFinal);
            }

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