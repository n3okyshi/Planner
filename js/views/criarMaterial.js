import { model } from '../model.js';
import { controller } from '../controller.js';
import { aiService } from '../ai-service.js';
import { Toast } from '../components/toast.js';
import { ModalComponent } from '../components/modal.js';
import { PaginatorComponent } from '../components/paginator.js';
import { FilterBarComponent } from '../components/filterBar.js';
import { EventDelegator } from '../utils/eventDelegator.js';
import { lerArquivoTexto, renderKatex, formatarTextoComLatex, sanitizeComLatex } from '../utils.js';
import { tableHelper } from '../utils/tableHelper.js';
import { imageHelper } from '../utils/imageHelper.js';
import { EditorToolbar } from '../components/editorToolbar.js';

export const criarMaterialView = {
    abaAtiva: 'meus', // 'meus', 'templates', 'comunidade', 'lixeira'
    modoGeracaoForm: 'ia', // 'ia' | 'manual'
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
        "Berçário I", "Berçário II", "Maternal I", "Maternal II", "Jardim I", "Jardim II",
        "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano", "6º Ano", "7º Ano", "8º Ano", "9º Ano",
        "1ª Série (EM)", "2ª Série (EM)", "3ª Série (EM)"
    ],
    bimestresDisponiveis: [
        "1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre",
        "1º Trimestre", "2º Trimestre", "3º Trimestre",
        "1º Semestre", "2º Semestre"
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
                { id: 'atividade-imprimivel', label: 'Atividade Imprimível', icone: 'fas fa-print', cor: 'text-emerald-500' }
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
        'atividade-intervencao': {
            titulo: 'Atividade de Intervenção Pedagógica',
            descricao: 'Atividades focadas na recomposição de aprendizagens, remediar defasagens e reforçar conceitos chave.',
            campos: [
                { id: 'linha-1', tipo: 'row', colunas: [{ id: 'disciplina', tipo: 'select-disciplina' }, { id: 'serie', tipo: 'select-serie' }] },
                { id: 'tema', tipo: 'text', label: 'Dificuldade / Habilidade a Intervir', placeholder: 'Ex: Operações fundamentais, Leitura de gráficos, Concordância verbal...' },
                { id: 'tipo-intervencao', tipo: 'pills', label: 'FOCO DA INTERVENÇÃO', opcoes: ['Reforço de Conceito', 'Resolução Guiada', 'Atividade Remediativa', 'Leitura e Interpretação'], default: 'Reforço de Conceito' },
                { id: 'bncc', tipo: 'text', label: 'Código BNCC (opcional)', placeholder: 'Ex: EF04MA05' }
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
        const isLixeiraTab = this.abaAtiva === 'lixeira';
        const isMeusTab = this.abaAtiva === 'meus' || !this.abaAtiva;

        return (todas || []).filter(m => {
            const naLixeira = Boolean(m.naLixeira);
            if (isLixeiraTab && !naLixeira) return false;
            if (!isLixeiraTab && naLixeira) return false;

            // Filtragem por pasta ativa na navegação de "Meus Materiais"
            if (isMeusTab && !this.termoBusca) {
                const matPastaId = String(m.pastaId || '');
                const currPastaId = String(this.pastaAtualId || '');
                if (matPastaId !== currPastaId) return false;
            }

            const matchBusca = (window.matchMultiTermos || matchMultiTermos)(m, ['titulo', 'tema', 'disciplina', 'serie', 'bncc', 'habilidade_bncc', 'habilidade', 'codigo_bncc', 'conteudo_html'], this.termoBusca);

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
                    body { font-family: 'Inter', sans-serif; color: #1e293b; background: #fff; padding: 20px; margin: 0; }
                    @page { size: A4; margin: 15mm; }
                    .content h3 { font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
                    .content p { font-size: 12px; text-align: justify; margin-bottom: 8px; }
                    .content ul, .content ol { font-size: 12px; padding-left: 20px; }
                    .gabarito-bloco, .gabarito { background-color: #ecfdf5; border: 1px solid #a7f3d0; border-left: 4px solid #059669; padding: 10px 14px; margin: 12px 0; border-radius: 6px; }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
                <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"><\/script>
                <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"><\/script>
            </head>
            <body>
                ${corpoImpressao}
                <script>
                    window.onload = () => {
                        if (typeof renderMathInElement === 'function') {
                            try {
                                renderMathInElement(document.body, {
                                    delimiters: [
                                        { left: '\\\\[', right: '\\\\]', display: true },
                                        { left: '\\\\(', right: '\\\\)', display: false },
                                        { left: '$$', right: '$$', display: true },
                                        { left: '$', right: '$', display: false }
                                    ],
                                    throwOnError: false
                                });
                            } catch (e) { console.warn(e); }
                        }
                        setTimeout(() => window.print(), 350);
                    };
                <\/script>
            </body>
            </html>
        `;

        const printWin = window.open('', '_blank');
        if (printWin) {
            const safeHtml = window.sanitizeComLatex ? window.sanitizeComLatex(htmlDocumento) : htmlDocumento;
            printWin.document.open();
            printWin.document.write(safeHtml);
            printWin.document.close();
        }
    },

    compartilharSelecionados() {
        if (this.selecionadas.size === 0) return;
        model.compartilharMateriaisEmMassa(Array.from(this.selecionadas));
    },

    excluirMaterial(id) {
        if (window.controller && typeof window.controller.confirmarAcao === 'function') {
            window.controller.confirmarAcao(
                "Mover para a Lixeira",
                "Tem certeza que deseja deletar esse material? Ele será enviado para a lixeira.",
                async () => {
                    await model.moverMaterialParaLixeira(id);
                    this.selecionadas.delete(String(id));
                    this.render('view-container');
                }
            );
        } else {
            model.moverMaterialParaLixeira(id);
            this.selecionadas.delete(String(id));
            this.render('view-container');
        }
    },

    async restaurarMaterial(id) {
        await model.restaurarMaterialDaLixeira(id);
        this.selecionadas.delete(String(id));
        this.render('view-container');
    },

    excluirPermanente(id) {
        if (window.controller && typeof window.controller.confirmarAcao === 'function') {
            window.controller.confirmarAcao(
                "Excluir Definitivamente",
                "Tem certeza que deseja excluir permanentemente este material? Esta ação não pode ser desfeita.",
                async () => {
                    await model.deleteMaterialPermanente(id);
                    this.selecionadas.delete(String(id));
                    this.render('view-container');
                }
            );
        } else {
            model.deleteMaterialPermanente(id);
            this.selecionadas.delete(String(id));
            this.render('view-container');
        }
    },

    pastaAtualId: null,

    setPastaAtual(id) {
        this.pastaAtualId = id || null;
        this.render('view-container');
    },

    modalCriarPasta() {
        const modalHtml = `
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                <p style="font-size: 0.9375rem; color: var(--color-slate-600); font-weight: 500; margin: 0;">
                    Digite o nome da nova pasta para organizar seus materiais pedagógicos:
                </p>
                <div style="display: flex; flex-direction: column; gap: 0.375rem;">
                    <label class="form-label" for="input-nome-pasta-material" style="font-size: 0.8125rem; font-weight: 700;">Nome da Pasta</label>
                    <input type="text" id="input-nome-pasta-material" class="form-input" 
                           placeholder="ex: Matemática 9º Ano, Avaliações 2026..." 
                           style="width: 100%; padding: 0.625rem 0.875rem; font-size: 0.9375rem;" autofocus />
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem; padding-top: 1rem; border-top: 1px solid var(--color-slate-200);">
                    <button type="button" data-action="fechar-modal" class="btn-secondary" style="padding: 0.5rem 1.25rem; font-weight: 700;">Cancelar</button>
                    <button type="button" data-action="confirmar-criar-pasta-material" class="btn-primary" style="padding: 0.5rem 1.5rem; font-weight: 800; background-color: #059669;">
                        <i class="fas fa-folder-plus mr-1"></i> Criar Pasta
                    </button>
                </div>
            </div>
        `;
        controller.openModal('Nova Pasta de Materiais', modalHtml, 'small');

        setTimeout(() => {
            const modalEl = document.getElementById('global-modal');
            const inputEl = document.getElementById('input-nome-pasta-material');
            if (inputEl) inputEl.focus();

            if (modalEl) {
                EventDelegator.bind(modalEl, {
                    'confirmar-criar-pasta-material': () => {
                        const val = inputEl ? inputEl.value.trim() : '';
                        if (val) {
                            model.criarPastaMaterial(val, this.pastaAtualId);
                            controller.closeModal();
                            this.render('view-container');
                        }
                    },
                    'fechar-modal': () => controller.closeModal()
                }, 'click');
            }
        }, 50);
    },

    moverMaterialModal(materialId) {
        const mat = (model.state.materiaisGerados || []).find(m => String(m.id) === String(materialId));
        const currPastaId = mat ? String(mat.pastaId || '') : '';
        const pastas = model.state.pastasMateriais || [];

        let optionsHtml = `<option value="" ${!currPastaId ? 'selected' : ''}>📁 Raiz (Nenhuma Pasta)</option>`;
        pastas.forEach(p => {
            const caminhoCompleto = model.obterCaminhoCompletoPasta ? model.obterCaminhoCompletoPasta(p.id) : p.nome;
            optionsHtml += `<option value="${p.id}" ${String(p.id) === currPastaId ? 'selected' : ''}>📁 ${window.escapeHTML(caminhoCompleto)}</option>`;
        });

        const modalHtml = `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <p style="font-size: 0.9375rem; color: #475569; font-weight: 600;">Selecione a pasta de destino para organizar este material:</p>
                <select id="select-dest-pasta" class="form-select" style="font-size: 0.9375rem; padding: 0.6rem;">
                    ${optionsHtml}
                </select>
                <div style="display: flex; justify-content: flex-end; gap: var(--spacing-3); margin-top: var(--spacing-6); padding-top: var(--spacing-4); border-top: 1px solid var(--color-slate-200);">
                    <button type="button" data-action="fechar-modal" class="btn-secondary">Cancelar</button>
                    <button type="button" data-action="mover-para-pasta-modal" data-id="${materialId}" class="btn-primary" style="background-color: #4f46e5;">
                        Mover Material
                    </button>
                </div>
            </div>
        `;
        controller.openModal('Organizar em Pasta', modalHtml, 'md');

        setTimeout(() => {
            const modalEl = document.getElementById('global-modal');
            if (modalEl) {
                EventDelegator.bind(modalEl, {
                    'mover-para-pasta-modal': (e, target) => {
                        const mId = target.getAttribute('data-id');
                        const pId = document.getElementById('select-dest-pasta')?.value;
                        model.moverMaterialParaPasta(mId, pId);
                        controller.closeModal();
                        this.render('view-container');
                    },
                    'fechar-modal': () => controller.closeModal()
                }, 'click');
            }
        }, 50);
    },

    esvaziarLixeira() {
        if (window.controller && typeof window.controller.confirmarAcao === 'function') {
            window.controller.confirmarAcao(
                "Esvaziar Lixeira",
                "Tem certeza que deseja apagar permanentemente todos os materiais da lixeira?",
                async () => {
                    await model.esvaziarLixeira();
                    this.selecionadas.clear();
                    this.render('view-container');
                }
            );
        }
    },

    excluirSelecionados() {
        if (this.selecionadas.size === 0) return;
        const qtd = this.selecionadas.size;
        const isLixeira = this.abaAtiva === 'lixeira';

        if (isLixeira) {
            const acao = async () => {
                await model.deleteMateriaisPermanentesEmMassa(Array.from(this.selecionadas));
                this.selecionadas.clear();
                this.render('view-container');
            };
            if (window.controller && window.controller.confirmarAcao) {
                window.controller.confirmarAcao(
                    "Excluir Definitivamente",
                    `Tem certeza que deseja apagar permanentemente ${qtd} materiais da lixeira? Esta ação não pode ser desfeita.`,
                    acao
                );
            } else if (confirm(`Deseja apagar permanentemente ${qtd} materiais?`)) {
                acao();
            }
        } else {
            const acao = async () => {
                await model.moverMateriaisParaLixeiraEmMassa(Array.from(this.selecionadas));
                this.selecionadas.clear();
                this.render('view-container');
            };
            if (window.controller && window.controller.confirmarAcao) {
                window.controller.confirmarAcao(
                    "Mover para a Lixeira",
                    `Tem certeza que deseja enviar ${qtd} materiais para a lixeira?`,
                    acao
                );
            } else if (confirm(`Enviar ${qtd} materiais para a lixeira?`)) {
                acao();
            }
        }
    },

    cardMaterial(m) {
        const isSelected = this.selecionadas.has(String(m.id));
        const tituloSafe = window.escapeHTML ? window.escapeHTML(m.titulo || m.tema || 'Material sem título') : (m.titulo || m.tema || 'Material sem título');
        const disciplinaSafe = window.escapeHTML ? window.escapeHTML(m.disciplina || 'Geral') : (m.disciplina || 'Geral');
        const serieSafe = window.escapeHTML ? window.escapeHTML(m.serie || 'Série não informada') : (m.serie || 'Série não informada');
        const tipoLabel = (m.tipo || 'geral').replace(/-/g, ' ').toUpperCase();
        const dataFormatada = new Date(m.createdAt || Date.now()).toLocaleDateString('pt-BR');
        const naLixeira = Boolean(m.naLixeira);

        const colorMap = {
            'planejamento': { i: 'far fa-calendar-alt', c: '#4f46e5', bg: '#eef2ff' },
            'dinamica-jogo': { i: 'fas fa-users', c: '#2563eb', bg: '#eff6ff' },
            'jogos-rpg': { i: 'fas fa-dice-d20', c: '#e11d48', bg: '#fff1f2' },
            'atividade-imprimivel': { i: 'fas fa-print', c: '#059669', bg: '#ecfdf5' },
            'avaliacao-prova': { i: 'fas fa-clipboard-list', c: '#ea580c', bg: '#fff7ed' },
            'rubrica-avaliacao': { i: 'fas fa-table-cells', c: '#c026d3', bg: '#fdf4ff' },
            'diario-laboratorio': { i: 'fas fa-vial', c: '#0d9488', bg: '#f0fdfa' },
            'atividade-intervencao': { i: 'fas fa-bullseye', c: '#4f46e5', bg: '#eef2ff' },
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
                        <div style="display: flex; gap: 0.25rem; align-items: center; flex-wrap: wrap;">
                            <span class="badge" style="background-color: ${style.bg}; color: ${style.c}; font-size: 0.6875rem; font-weight: 800;">${tipoLabel}</span>
                            ${m.criadoManualmente ? `
                                <span class="badge" style="background-color: #ecfdf5; color: #059669; font-size: 0.625rem; font-weight: 800;" title="Criado Manualmente">
                                    <i class="fas fa-pen-to-square"></i> Manual
                                </span>
                            ` : `
                                <span class="badge" style="background-color: #eef2ff; color: #4338ca; font-size: 0.625rem; font-weight: 800;" title="Gerado com IA">
                                    <i class="fas fa-robot"></i> IA
                                </span>
                            `}
                        </div>
                    </div>
                    ${m.compartilhado ? `
                        <span class="badge" style="background-color: #f3e8ff; color: #7c3aed; font-size: 0.625rem; font-weight: 800;" title="Público na Comunidade">
                            <i class="fas fa-globe"></i> Público
                        </span>
                    ` : ''}
                </div>

                <!-- TÍTULO & DETALHES (CLICÁVEL PARA ABRIR MATERIAL) -->
                <div data-action="ver-material" data-id="${m.id}" style="cursor: pointer;" title="Clique para abrir este material">
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
                        ${naLixeira ? `
                            <button type="button" onclick="model.restaurarMaterialDaLixeira('${m.id}')" 
                                    class="interactive-element" 
                                    style="width: 2rem; height: 2rem; border-radius: 0.5rem; border: 1px solid #bbf7d0; background: #f0fdf4; color: #16a34a; display: flex; align-items: center; justify-content: center; cursor: pointer;" 
                                    title="Restaurar Material">
                                <i class="fas fa-undo" style="font-size: 0.75rem;"></i>
                            </button>

                            <button type="button" onclick="criarMaterialView.excluirMaterialDefinitivo('${m.id}')" 
                                    class="interactive-element" 
                                    style="width: 2rem; height: 2rem; border-radius: 0.5rem; border: 1px solid #fee2e2; background: #fef2f2; color: #ef4444; display: flex; align-items: center; justify-content: center; cursor: pointer;" 
                                    title="Excluir Definitivamente">
                                <i class="fas fa-trash-alt" style="font-size: 0.75rem;"></i>
                            </button>
                        ` : `
                            <button type="button" data-action="ver-material" data-id="${m.id}" 
                                    class="interactive-element" 
                                    style="width: 2rem; height: 2rem; border-radius: 0.5rem; border: 1px solid #93c5fd; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; cursor: pointer;" 
                                    title="Visualizar / Abrir Material">
                                <i class="fas fa-eye" style="font-size: 0.75rem;"></i>
                            </button>

                            <button type="button" onclick="criarMaterialView.editarMaterialManual('${m.id}')" 
                                    class="interactive-element" 
                                    style="width: 2rem; height: 2rem; border-radius: 0.5rem; border: 1px solid #c7d2fe; background: #eef2ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; cursor: pointer;" 
                                    title="Editar Material Manualmente">
                                <i class="fas fa-pen-to-square" style="font-size: 0.75rem;"></i>
                            </button>

                            <button type="button" onclick="criarMaterialView.moverMaterialModal('${m.id}')" 
                                    class="interactive-element" 
                                    style="width: 2rem; height: 2rem; border-radius: 0.5rem; border: 1px solid #fed7aa; background: #fff7ed; color: #ea580c; display: flex; align-items: center; justify-content: center; cursor: pointer;" 
                                    title="Mover / Organizar em Pasta">
                                <i class="fas fa-folder-open" style="font-size: 0.75rem;"></i>
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

                            <button type="button" onclick="criarMaterialView.excluirMaterial('${m.id}')" 
                                    class="interactive-element" 
                                    style="width: 2rem; height: 2rem; border-radius: 0.5rem; border: 1px solid #fee2e2; background: #fef2f2; color: #ef4444; display: flex; align-items: center; justify-content: center; cursor: pointer;" 
                                    title="Mover para a Lixeira">
                                <i class="fas fa-trash-alt" style="font-size: 0.75rem;"></i>
                            </button>
                        `}
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

        const todasPastas = model.state.pastasMateriais || [];
        const pastaAtual = todasPastas.find(p => String(p.id) === String(this.pastaAtualId));
        const pastasNoNivel = todasPastas.filter(p => String(p.parentId || '') === String(this.pastaAtualId || ''));
        const cadeiaHierarquica = model.obterCadeiaHierarquicaPasta ? model.obterCadeiaHierarquicaPasta(this.pastaAtualId) : (pastaAtual ? [{ id: pastaAtual.id, nome: pastaAtual.nome }] : []);

        return `
            <div class="animate-enter">
                <!-- BARRA DE GERENCIAMENTO DE PASTAS & BREADCRUMB -->
                <div class="card" style="padding: 1rem 1.25rem; margin-bottom: 1.25rem; background: #ffffff; border-radius: var(--radius-xl); border: 1px solid var(--color-slate-200); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                    <!-- BREADCRUMB -->
                    <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; font-size: 0.9375rem; font-weight: 700; color: #334155;">
                        <button type="button" onclick="criarMaterialView.setPastaAtual(null)" class="btn-secondary interactive-element" style="padding: 0.35rem 0.75rem; font-size: 0.8125rem; font-weight: 800; background-color: #f1f5f9; color: #475569;" title="Ir para a Raiz">
                            <i class="fas fa-folder"></i> Meus Materiais (Raiz)
                        </button>
                        ${cadeiaHierarquica.map((p, idx) => {
            const isUltimo = idx === cadeiaHierarquica.length - 1;
            return `
                                <i class="fas fa-chevron-right" style="font-size: 0.75rem; color: #94a3b8;"></i>
                                ${isUltimo ? `
                                    <span style="color: #4f46e5; font-weight: 800; background: #eef2ff; padding: 0.35rem 0.75rem; border-radius: var(--radius-lg); border: 1px solid #c7d2fe; display: inline-flex; align-items: center; gap: 0.35rem;">
                                        <i class="fas fa-folder-open"></i> ${window.escapeHTML(p.nome)}
                                    </span>
                                ` : `
                                    <button type="button" onclick="criarMaterialView.setPastaAtual('${p.id}')" class="btn-secondary interactive-element" style="padding: 0.35rem 0.75rem; font-size: 0.8125rem; font-weight: 800; background-color: #ffffff; color: #334155; border: 1px solid #cbd5e1; display: inline-flex; align-items: center; gap: 0.35rem;" title="Ir para ${window.escapeHTML(p.nome)}">
                                        <i class="fas fa-folder" style="color: #d97706;"></i> ${window.escapeHTML(p.nome)}
                                    </button>
                                `}
                            `;
        }).join('')}
                    </div>

                    <!-- AÇÕES DO TOPO: IMPORTAR ARQUIVO E NOVA PASTA -->
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        <button type="button" onclick="criarMaterialView.modalImportarMaterial()" class="btn-secondary interactive-element" style="padding: 0.45rem 1rem; font-size: 0.8125rem; background: #ffffff; border: 1.5px solid #c7d2fe; color: #4f46e5; font-weight: 800; display: inline-flex; align-items: center; gap: 0.4rem; box-shadow: var(--shadow-sm);" title="Importar arquivos Word (.docx, .doc), PDF ou TXT">
                            <i class="fas fa-file-import"></i> Importar Arquivo
                        </button>
                        <button type="button" onclick="criarMaterialView.modalCriarPasta()" class="btn-primary interactive-element" style="padding: 0.45rem 1rem; font-size: 0.8125rem; background: linear-gradient(135deg, #059669, #047857); box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);">
                            <i class="fas fa-folder-plus"></i> + Nova Pasta
                        </button>
                    </div>
                </div>

                <!-- GRID DE PASTAS LOCAIS -->
                ${pastasNoNivel.length > 0 ? `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                        ${pastasNoNivel.map(p => {
            const qtdItens = model.contarMateriaisPastaRecursivo ? model.contarMateriaisPastaRecursivo(p.id) : (model.state.materiaisGerados || []).filter(m => String(m.pastaId) === String(p.id) && !m.naLixeira).length;
            return `
                                <div class="interactive-element" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: var(--radius-xl); padding: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; transition: all 0.2s;"
                                     onclick="criarMaterialView.setPastaAtual('${p.id}')">
                                    <div style="display: flex; align-items: center; gap: 0.75rem; overflow: hidden;">
                                        <div style="width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background-color: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 1.125rem; flex-shrink: 0;">
                                            <i class="fas fa-folder"></i>
                                        </div>
                                        <div style="overflow: hidden;">
                                            <h5 style="font-size: 0.875rem; font-weight: 800; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0;">${window.escapeHTML(p.nome)}</h5>
                                            <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">${qtdItens} itens</span>
                                        </div>
                                    </div>
                                    <button type="button" onclick="event.stopPropagation(); model.excluirPastaMaterial('${p.id}'); criarMaterialView.render('view-container');" class="interactive-element" style="border: none; background: transparent; color: #94a3b8; padding: 0.25rem; cursor: pointer;" title="Excluir Pasta">
                                        <i class="fas fa-trash-alt" style="font-size: 0.75rem;"></i>
                                    </button>
                                </div>
                            `;
        }).join('')}
                    </div>
                ` : ''}

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
        if (!this.ferramentaAtiva) {
            this.ferramentaAtiva = 'avaliacao';
        }

        return `
            <div class="animate-enter" style="display: flex; flex-direction: row; gap: 1.5rem; align-items: flex-start; position: relative; min-height: 550px;">
                <aside class="tool-sidebar custom-scrollbar" style="width: 280px; flex-shrink: 0;">
                    ${this.gerarMenuLateral()}
                </aside>
                <main id="form-area" class="tool-main-panel animate-enter" style="flex: 1;">
                    ${this.renderizarFormularioDaFerramenta()}
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
            <div style="margin-bottom: 1rem; padding: 0.75rem 1rem; background-color: #f8fafc; border-radius: 0.875rem; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                <span style="font-size: 0.8125rem; font-weight: 800; color: #475569;">
                    <i class="fas fa-magic" style="color: #4f46e5;"></i> Como você deseja criar este material?
                </span>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button type="button" onclick="controller.closeModal(); criarMaterialView.modalImportarMaterial()" class="btn-secondary interactive-element" style="padding: 0.3rem 0.75rem; font-size: 0.75rem; font-weight: 800; background: #eef2ff; color: #4f46e5; border: 1px solid #c7d2fe;">
                        <i class="fas fa-file-import"></i> Importar Arquivo (.docx / .doc / .pdf)
                    </button>
                    <button type="button" onclick="criarMaterialView.setModoGeracao('ia')" class="btn-secondary interactive-element" style="padding: 0.3rem 0.75rem; font-size: 0.75rem; font-weight: 800; ${this.modoGeracaoForm === 'ia' ? 'background: #4f46e5; color: #fff;' : ''}">
                        <i class="fas fa-robot"></i> Gerar com IA
                    </button>
                    <button type="button" onclick="criarMaterialView.setModoGeracao('manual')" class="btn-secondary interactive-element" style="padding: 0.3rem 0.75rem; font-size: 0.75rem; font-weight: 800; ${this.modoGeracaoForm === 'manual' ? 'background: #10b981; color: #fff;' : ''}">
                        <i class="fas fa-pen"></i> Escrever Manualmente
                    </button>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; max-height: 65vh; overflow-y: auto; padding: 0.5rem;" class="custom-scrollbar">
                ${this.categoriasMenu.map(cat => `
                    <div style="grid-column: 1 / -1; margin-top: 0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem;">
                        <h4 style="font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase;">${cat.titulo}</h4>
                    </div>
                    ${cat.itens.map(item => `
                        <div style="display: flex; flex-direction: column; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.875rem; padding: 0.75rem; gap: 0.5rem;">
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <div style="width: 2.25rem; height: 2.25rem; border-radius: 0.625rem; background-color: #ffffff; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                    <i class="${item.icone} ${item.cor}"></i>
                                </div>
                                <div style="flex: 1;">
                                    <h5 style="font-weight: 700; font-size: 0.875rem; color: #1e293b; line-height: 1.2;">${item.label}</h5>
                                </div>
                            </div>
                            <div style="display: flex; gap: 0.375rem; margin-top: 0.25rem;">
                                <button type="button" 
                                        onclick="controller.closeModal(); criarMaterialView.setModoGeracao('ia'); criarMaterialView.mudarAba('templates'); criarMaterialView.selecionarFerramenta('${item.id}', null);"
                                        class="interactive-element" 
                                        ${item.disabled ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
                                        style="flex: 1; padding: 0.35rem 0.5rem; font-size: 0.75rem; font-weight: 700; background: #ffffff; border: 1px solid #c7d2fe; color: #4f46e5; border-radius: 0.5rem; cursor: pointer; text-align: center;">
                                    <i class="fas fa-robot"></i> Com IA
                                </button>
                                <button type="button" 
                                        onclick="controller.closeModal(); criarMaterialView.setModoGeracao('manual'); criarMaterialView.mudarAba('templates'); criarMaterialView.selecionarFerramenta('${item.id}', null);"
                                        class="interactive-element" 
                                        ${item.disabled ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
                                        style="flex: 1; padding: 0.35rem 0.5rem; font-size: 0.75rem; font-weight: 700; background: #ffffff; border: 1px solid #a7f3d0; color: #059669; border-radius: 0.5rem; cursor: pointer; text-align: center;">
                                    <i class="fas fa-pen"></i> Escrever
                                </button>
                            </div>
                        </div>
                    `).join('')}
                `).join('')}
            </div>
        `;
        controller.openModal('Selecionar Ferramenta de Criação de Material', modalContent, 'xl');
    },

    cardFlashcardLixeira(deck) {
        return `
            <div class="card interactive-element animate-enter" style="padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid var(--color-slate-200); background: var(--color-white); box-shadow: var(--shadow-sm);">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span class="badge" style="background: #fee2e2; color: #dc2626; font-weight: 800;">
                            <i class="fas fa-layer-group"></i> Flashcard (Lixeira)
                        </span>
                        <span style="font-size: 0.75rem; color: var(--color-slate-500); font-weight: 700;">${deck.cards?.length || 0} cartas</span>
                    </div>
                    <h3 style="font-size: 1rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${window.escapeHTML(deck.titulo)}</h3>
                    <p style="font-size: 0.75rem; color: var(--color-slate-500); font-weight: 600;">${window.escapeHTML(deck.disciplina || 'Geral')} ${deck.serie ? `• ${window.escapeHTML(deck.serie)}` : ''}</p>
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <button type="button" onclick="model.restaurarFlashcardDaLixeira('${deck.id}')" class="btn-secondary interactive-element" style="flex: 1; padding: 0.4rem; font-size: 0.75rem; font-weight: 700; color: #15803d; border-color: #bbf7d0; background: #f0fdf4;">
                        <i class="fas fa-undo"></i> Restaurar
                    </button>
                    <button type="button" onclick="criarMaterialView.excluirFlashcardPermanente('${deck.id}')" class="btn-danger interactive-element" style="padding: 0.4rem 0.75rem; font-size: 0.75rem; font-weight: 700; background: #e11d48; color: #fff; border: none; border-radius: 0.5rem;">
                        <i class="fas fa-times"></i> Excluir
                    </button>
                </div>
            </div>
        `;
    },

    cardMindmapLixeira(mapa) {
        return `
            <div class="card interactive-element animate-enter" style="padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid var(--color-slate-200); background: var(--color-white); box-shadow: var(--shadow-sm);">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span class="badge" style="background: #fee2e2; color: #dc2626; font-weight: 800;">
                            <i class="fas fa-project-diagram"></i> Mapa Mental (Lixeira)
                        </span>
                        <span style="font-size: 0.75rem; color: var(--color-slate-500); font-weight: 700;">Árvore Conceitual</span>
                    </div>
                    <h3 style="font-size: 1rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${window.escapeHTML(mapa.titulo)}</h3>
                    <p style="font-size: 0.75rem; color: var(--color-slate-500); font-weight: 600;">${window.escapeHTML(mapa.disciplina || 'Geral')} ${mapa.serie ? `• ${window.escapeHTML(mapa.serie)}` : ''}</p>
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <button type="button" onclick="model.restaurarMindmapDaLixeira('${mapa.id}')" class="btn-secondary interactive-element" style="flex: 1; padding: 0.4rem; font-size: 0.75rem; font-weight: 700; color: #15803d; border-color: #bbf7d0; background: #f0fdf4;">
                        <i class="fas fa-undo"></i> Restaurar
                    </button>
                    <button type="button" onclick="criarMaterialView.excluirMindmapPermanente('${mapa.id}')" class="btn-danger interactive-element" style="padding: 0.4rem 0.75rem; font-size: 0.75rem; font-weight: 700; background: #e11d48; color: #fff; border: none; border-radius: 0.5rem;">
                        <i class="fas fa-times"></i> Excluir
                    </button>
                </div>
            </div>
        `;
    },

    excluirFlashcardPermanente(id) {
        if (window.controller && typeof window.controller.confirmarAcao === 'function') {
            window.controller.confirmarAcao(
                "Excluir Baralho",
                "Tem certeza que deseja excluir permanentemente este baralho de flashcards?",
                async () => {
                    await model.deleteFlashcardDeckPermanente(id);
                    this.render('view-container');
                }
            );
        } else {
            model.deleteFlashcardDeckPermanente(id);
            this.render('view-container');
        }
    },

    excluirMindmapPermanente(id) {
        if (window.controller && typeof window.controller.confirmarAcao === 'function') {
            window.controller.confirmarAcao(
                "Excluir Mapa Mental",
                "Tem certeza que deseja excluir permanentemente este mapa mental?",
                async () => {
                    await model.deleteMindmapPermanente(id);
                    this.render('view-container');
                }
            );
        } else {
            model.deleteMindmapPermanente(id);
            this.render('view-container');
        }
    },

    renderLixeira(materiaisPaginados, totalItens, totalPaginas) {
        const todosMarcados = materiaisPaginados.length > 0 && materiaisPaginados.every(m => this.selecionadas.has(String(m.id)));
        const lixeiraFlashcards = (model.state.flashcards || []).filter(d => d.naLixeira);
        const lixeiraMindmaps = (model.state.mindmaps || []).filter(m => m.naLixeira);
        const temAlgumItem = totalItens > 0 || lixeiraFlashcards.length > 0 || lixeiraMindmaps.length > 0;

        return `
            <div class="animate-enter">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; background: #fff1f2; border: 1px solid #fecdd3; padding: 1rem 1.25rem; border-radius: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background-color: #ffe4e6; color: #e11d48; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                            <i class="fas fa-trash-alt"></i>
                        </div>
                        <div>
                            <h3 style="font-size: 1rem; font-weight: 800; color: #9f1239; margin: 0;">Lixeira de Materiais</h3>
                            <p style="font-size: 0.75rem; color: #be123c; margin: 0;">Materiais pedagógicos, flashcards e mapas mentais salvos na lixeira podem ser restaurados ou excluídos definitivamente.</p>
                        </div>
                    </div>
                    ${temAlgumItem ? `
                        <button type="button" onclick="criarMaterialView.esvaziarLixeira()" 
                                class="btn-danger interactive-element" style="padding: 0.5rem 1rem; font-size: 0.75rem; font-weight: 800; border-radius: 0.75rem; background-color: #e11d48; color: #fff; border: none; cursor: pointer;">
                            <i class="fas fa-dumpster"></i> Esvaziar Lixeira
                        </button>
                    ` : ''}
                </div>

                ${temAlgumItem ? `
                    <div class="materials-workspace-grid">
                        ${materiaisPaginados.map(m => this.cardMaterial(m)).join('')}
                        ${lixeiraFlashcards.map(d => this.cardFlashcardLixeira(d)).join('')}
                        ${lixeiraMindmaps.map(m => this.cardMindmapLixeira(m)).join('')}
                    </div>
                ` : `
                    <div class="tool-empty-state animate-enter" style="max-width: 32rem; padding: 4rem 2rem; background-color: var(--color-white); border-radius: 1.5rem; border: 1px solid #f1f5f9; box-shadow: var(--shadow-sm); margin: 2rem auto; text-align: center;">
                        <div class="tool-empty-state__icon-wrap" style="width: 5rem; height: 5rem; margin: 0 auto 1.25rem; background-color: #f1f5f9; color: #94a3b8; display: flex; align-items: center; justify-content: center; border-radius: 1rem;">
                            <i class="fas fa-trash" style="font-size: 2rem;"></i>
                        </div>
                        <h3 class="text-xl font-bold text-slate-800 mb-2">Sua Lixeira está vazia</h3>
                        <p class="text-slate-500 text-sm">Materiais que você excluir da biblioteca serão mantidos aqui para você restaurar quando quiser.</p>
                    </div>
                `}

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

    setModoGeracao(modo) {
        // Preservar dados preenchidos no formulário manual antes de alternar
        const inputTitulo = document.getElementById('manual-titulo')?.value;
        const selectDisc = document.getElementById('manual-disciplina')?.value;
        const selectSerie = document.getElementById('manual-serie')?.value;
        const inputBncc = document.getElementById('manual-bncc')?.value;
        const areaConteudo = document.getElementById('manual-conteudo-html')?.value;

        if (inputTitulo || areaConteudo) {
            this.rascunhoFormManual = {
                titulo: inputTitulo || '',
                disciplina: selectDisc || '',
                serie: selectSerie || '',
                bncc: inputBncc || '',
                conteudo: areaConteudo || ''
            };
        }

        this.modoGeracaoForm = modo;
        if (!this.ferramentaAtiva) {
            this.ferramentaAtiva = 'avaliacao';
        }
        const formArea = document.getElementById('form-area');
        if (formArea) {
            formArea.innerHTML = this.renderizarFormularioDaFerramenta();
            if (window.uiController && typeof window.uiController.initAllDropdowns === 'function') {
                window.uiController.initAllDropdowns();
            }

            // Restaurar rascunho se voltando ao modo manual
            if (modo === 'manual' && this.rascunhoFormManual) {
                const elTitulo = document.getElementById('manual-titulo');
                const elDisc = document.getElementById('manual-disciplina');
                const elSerie = document.getElementById('manual-serie');
                const elBncc = document.getElementById('manual-bncc');
                const elConteudo = document.getElementById('manual-conteudo-html');

                if (elTitulo && this.rascunhoFormManual.titulo) elTitulo.value = this.rascunhoFormManual.titulo;
                if (elDisc && this.rascunhoFormManual.disciplina) elDisc.value = this.rascunhoFormManual.disciplina;
                if (elSerie && this.rascunhoFormManual.serie) elSerie.value = this.rascunhoFormManual.serie;
                if (elBncc && this.rascunhoFormManual.bncc) elBncc.value = this.rascunhoFormManual.bncc;
                if (elConteudo && this.rascunhoFormManual.conteudo) elConteudo.value = this.rascunhoFormManual.conteudo;
            }
        }
    },

    modelosEstruturadosManuais: {
        'avaliacao-prova': `## AVALIAÇÃO / PROVA DE DESEMPENHO
Escola: ___________________________________________________
Professor(a): ______________________ Data: ___/___/______
Aluno(a): ___________________________________ Turma: _________

### INSTRUÇÕES GERAIS:
- Leia atentamente todas as questões antes de responder.
- Respostas objetivas devem ser marcadas com clareza.
- Utilize caneta azul ou preta.

### PARTE 1 — QUESTÕES OBJETIVAS:
1. Digite aqui o enunciado da primeira questão objetiva...
  a) Alternativa A
  b) Alternativa B
  c) Alternativa C
  d) Alternativa D

### PARTE 2 — QUESTÕES DISCURSIVAS:
2. Considere a equação \({x^2 + y^2 = r^2}\). Explique o significado geométrico dos termos...
_____
_____
_____

GABARITO:
1. Alternativa A
2. A equação representa uma circunferência de raio r centrada na origem.`,

        'rubrica-avaliacao': `## RUBRICA ANALÍTICA DE AVALIAÇÃO DE DESEMPENHO
Atividade Avaliada: ________________________________________
Pontuação Máxima: 10.0 pontos

### CRITÉRIOS DE AVALIAÇÃO:
- **1. Domínio Conceitual (Peso 4.0):**
  - Excelente (100%): Demonstra domínio completo dos conceitos.
  - Bom (75%): Compreende a maioria dos conceitos com falhas pontuais.
  - Regular (50%): Compreensão parcial; erros em conceitos básicos.
  - Insuficiente (25%): Não demonstra compreensão do tema.

- **2. Organização e Clareza (Peso 3.0):**
  - Excelente (100%): Apresentação lógica, organizada e altamente fluida.
  - Bom (75%): Estrutura clara com pequenos desvios de organização.
  - Regular (50%): Apresentação confusa em partes do desenvolvimento.
  - Insuficiente (25%): Desorganizado e de difícil compreensão.`,

        'lista-exercicios': `## LISTA DE EXERCÍCIOS & RESOLUÇÕES
Disciplina / Assunto: ________________________________________

### EXERCÍCIOS DE FIXAÇÃO:
1. Escreva aqui o enunciado do primeiro exercício de fixação...
_____
_____

2. Calcule a raiz da função linear dada por \({f(x) = ax + b}\), sabendo que \({a = 2}\) e \({b = -4}\).
_____
_____

GABARITO:
1. Passo a passo da solução do exercício 1...
2. Para \({f(x) = 0}\), temos \({2x - 4 = 0 \\Rightarrow 2x = 4 \\Rightarrow x = 2}\).`,

        'planejamento': `## PLANO DE AULA SEMANAL / PEDAGÓGICO
Tema Central: ________________________________________
Duração Estimada: 50 minutos (1 aula)

### 1. OBJETIVOS DE APRENDIZAGEM
- Compreender o conceito principal abordado na aula.
- Identificar relações e aplicações práticas no cotidiano.

### 2. BNCC & HABILIDADES
- Código / Descrição: EF08MA07 - Analisar e resolver problemas...

### 3. DESENVOLVIMENTO DAS ETAPAS
- **Introdução / Acolhimento (10 min):** Apresentação do tema e problematização inicial.
- **Desenvolvimento Prático (30 min):** Exposição dialogada e realização de atividades.
- **Fechamento & Síntese (10 min):** Sistematização coletiva dos aprendizados.

### 4. AVALIAÇÃO
- Observação contínua da participação e registro nas atividades propostas.`,

        'diario-laboratorio': `## ROTEIRO DE AULA PRÁTICA DE LABORATÓRIO
Título do Experimento: ________________________________________
Equipe / Integrantes: ________________________________________

### 1. OBJETIVOS
- Observar e analisar experimentalmente o fenômeno investigado.

### 2. MATERIAIS NECESSÁRIOS
- Béquer 250ml e proveta graduada
- Termômetro digital ou sensor de temperatura
- Amostras de teste e água destilada

### 3. PROCEDIMENTO EXPERIMENTAL
1. Prepare a bancada organizando os equipamentos em segurança.
2. Adicione as amostras e registre a variação observada a cada 2 minutos.

### 4. REGISTRO DE DADOS
- Etapa 1: Temperatura Inicial = \({T_1}\) °C
- Etapa 2: Temperatura Final = \({T_2}\) °C
- Variação observada: \({\\Delta T = T_2 - T_1}\)`,

        'pratica-laboratorio': `## GUIA DE EXPERIMENTAÇÃO CIENTÍFICA
Tema da Prática: ________________________________________

### 1. HIPÓTESE CIENTÍFICA
- O que a turma espera observar ao final do experimento?

### 2. NORMAS DE SEGURANÇA
NOTA: Uso obrigatório de jaleco, óculos de proteção e atenção ao manuseio dos materiais.

### 3. ETAPAS DE EXECUÇÃO
1. Montagem do sistema experimental.
2. Coleta sistemática de dados e medições.
3. Análise dos resultados obtidos.`,

        'jogos-rpg': `## FICHA DE MISSÃO RPG / ESCAPE ROOM PEDAGÓGICO
Nome da Missão: ________________________________________
Nível dos Jogadores: Turma dividida em equipes de 4 participantes

NOTA: Contexto Narrativo: Descreva aqui a história de introdução que engaja os estudantes na missão...

### DESAFIO 1 (ENIGMA DE CONCEITOS)
- Pista a ser desvendada com base nos conhecimentos estudados...

### DESAFIO 2 (CÓDIGO DE LIBERAÇÃO)
- Resolva o problema matemático/científico para obter a senha de 4 dígitos: \({2^4 + 5 = ?}\)`,

        'dinamica-jogo': `## ROTEIRO DE DINÂMICA DE GRUPO E JOGO
Nome da Dinâmica: ________________________________________
Duração: 30 a 50 minutos

### 1. REGRAS DO JOGO
- Regra 1: Cada equipe terá 2 minutos para responder cada rodada.
- Regra 2: Respostas corretas somam 10 pontos.

### 2. PONTUAÇÃO E MEDIAÇÃO
- Como o professor conduzirá o debate ao final de cada rodada.`,

        'situacao-problema': `## DESAFIO PBL — SITUAÇÃO-PROBLEMA CONTEXTUALIZADA
Cenário Realista: ________________________________________

### DESAFIO PRINCIPAL:
- Como resolver o problema hipotético apresentado utilizando os conhecimentos da disciplina?

### ETAPAS DE RESOLUÇÃO:
1. Levantamento de hipóteses e causas principais.
2. Proposta de intervenção ou solução prática viável.`,

        'atividade-investigativa': `## ROTEIRO DE PESQUISA E INVESTIGAÇÃO ORIENTADA
Pergunta Norteadora: ________________________________________

### 1. LEVANTAMENTO DE FONTES
- Quais dados, gráficos ou textos devem ser analisados pelos alunos?

### 2. SÍNTESE E CONCLUSÃO
- Redija uma conclusão justificando com evidências encontradas durante a investigação.`,

        'atividade-imprimivel': `## ATIVIDADE PEDAGÓGICA IMPRIMÍVEL
Disciplina: ___________________ Série/Ano: _________

### TEXTO BASE PARA LEITURA:
Leia o texto com atenção antes de responder às questões propostas a seguir...

### QUESTÕES DE COMPREENSÃO:
1. Qual é a ideia central apresentada no texto?
_____
_____

2. Identifique os elementos principais citados no segundo parágrafo.
_____
_____`,

        'atividade-intervencao': `## ATIVIDADE DE RECOMPOSIÇÃO DE APRENDIZAGEM
Foco de Intervenção: ________________________________________

NOTA: Atividade focada na consolidação de habilidades essenciais não atingidas previamente.

### EXERCÍCIO GUIADO (PASSO A PASSO):
1. Observe o exemplo resolvido a seguir...
2. Agora é a sua vez: Resolva a expressão \({3x + 6 = 18}\).
_____
_____`,

        'adaptacao-tea': `## ATIVIDADE ADAPTADA — INCLUSÃO (TEA)
Estudante: ___________________ Data: ___/___/______

NOTA: Atividade estruturada com linguagem direta, instruções curtas e apoio visual facilitado.

### ETAPA 1 — OBSERVE E RELACIONE:
- Ligue a palavra à figura correspondente.
- Marque com um X a resposta correta.

### ETAPA 2 — ATIVIDADE PRÁTICA:
1. Escolha a opção que completa a frase corretamente.`,

        'adaptacao-tdah': `## ATIVIDADE ADAPTADA — FOCO E ATENÇÃO (TDAH)
Estudante: ___________________ Tempo Recomendado: 15 min por bloco

NOTA: Tarefas divididas em pequenos blocos para evitar sobrecarga cognitiva.

### BLOCO 1 (DURAÇÃO: 10 MINUTOS)
- Responda apenas à questão 1. Faça uma pausa de 2 minutos antes de continuar.

1. Responda de forma direta...
_____

### BLOCO 2 (DURAÇÃO: 10 MINUTOS)
2. Marque a alternativa correta...`,

        'pei': `## PLANO DE DESENVOLVIMENTO INDIVIDUALIZADO (PEI)
Nome do Estudante: ________________________________________
Diagnóstico / Acompanhamento: ________________________________________

### 1. METAS A CURTO PRAZO (30 DIAS)
- Desenvolver a habilidade de...

### 2. METAS A MÉDIO PRAZO (90 DIAS)
- Consolidar o aprendizado em...

### 3. ADAPTAÇÕES CURRICULARES E RECURSOS
- Utilização de material concreto e suporte visual reforçado.`,

        'sequencia-didatica': `## SEQUÊNCIA DIDÁTICA ESTRUTURADA
Componente Curricular: ________________________________________
Tema Geral: ________________________________________

### AULA 1 — MOBILIZAÇÃO E CONHECIMENTOS PRÉVIOS
- Objetivos: Diagnosticar o conhecimento da turma.
- Atividade: Roda de conversa e tempestade de ideias.

### AULA 2 — APROFUNDAMENTO CONCEITUAL
- Objetivos: Apresentar o conceito central e exemplos práticos.

### AULA 3 — APLICAÇÃO E AVALIAÇÃO SÍNTESE
- Objetivos: Elaboração de síntese individual ou em grupo.`,

        'rotina-semanal': `## ROTINA SEMANAL — EDUCAÇÃO INFANTIL
Semana: ___/___ a ___/___

### SEGUNDA-FEIRA
- Acolhimento e Roda de Histórias
- Campo de Experiência: Escuta, fala, pensamento e imaginação

### TERÇA-FEIRA
- Atividade Sensorial e Jogos de Movimento
- Campo de Experiência: Corpo, gestos e movimentos`,

        'proposta-brincadeira': `## PROPOSTA DE ATIVIDADE LÚDICA E SENSORIAL
Nome da Brincadeira: ________________________________________
Faixa Etária Recomendada: ________________________________________

### 1. OBJETIVOS DE DESENVOLVIMENTO
- Estimular a coordenação motora fina e a cooperação em grupo.

### 2. MATERIAIS E ORGANIZAÇÃO DO ESPAÇO
- Espaço amplo e materiais coloridos não estruturados.

### 3. COMO CONDUZIR A BRINCADEIRA
1. Reúna as crianças em círculo para explicar as regras de forma lúdica.
2. Inicie a atividade incentivando a participação de todos.`,

        'geral': `## CONTEÚDO PEDAGÓGICO
Digite aqui a introdução ou visão geral do seu material...

### SEÇÃO 1
Desenvolva seu texto, explicações, fórmulas TeX ou atividades aqui...`
    },

    converterMarkdownParaHtml(texto) {
        if (!texto) return '';
        let str = texto.trim();
        let linhas = str.split('\n');
        let htmlLinhas = [];
        let emLista = false;

        for (let i = 0; i < linhas.length; i++) {
            let linha = linhas[i].trim();

            if (!linha) {
                if (emLista) { htmlLinhas.push('</ul>'); emLista = false; }
                htmlLinhas.push('<div style="height: 0.5rem;"></div>');
                continue;
            }

            if (linha.toUpperCase().startsWith('GABARITO:') || linha.toUpperCase().startsWith('[GABARITO]')) {
                if (emLista) { htmlLinhas.push('</ul>'); emLista = false; }
                const rest = linha.replace(/^(GABARITO:|\[GABARITO\])/i, '').trim();
                htmlLinhas.push(`<div class="gabarito-block" style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 1rem 1.25rem; border-radius: 0.75rem; margin-top: 1.5rem; color: #166534;"><h4 style="color: #15803d; font-weight: 800; font-size: 1rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;"><i class="fas fa-key"></i> GABARITO & CRITÉRIOS DE CORREÇÃO</h4>${rest ? `<p>${this.formatarFormatacaoInLine(rest)}</p>` : ''}`);
                continue;
            }

            if (linha.toUpperCase().startsWith('NOTA:') || linha.toUpperCase().startsWith('DICA:') || linha.toUpperCase().startsWith('[NOTA]') || linha.toUpperCase().startsWith('[DICA]')) {
                if (emLista) { htmlLinhas.push('</ul>'); emLista = false; }
                const textNota = linha.replace(/^(NOTA:|DICA:|\[NOTA\]|\[DICA\])/i, '').trim();
                htmlLinhas.push(`<div style="background: #eef2ff; border-left: 4px solid #4f46e5; padding: 0.875rem 1rem; border-radius: 0.5rem; margin: 1rem 0; color: #3730a3; font-size: 0.875rem;"><strong><i class="fas fa-info-circle"></i> NOTA / OBSERVAÇÃO:</strong> ${this.formatarFormatacaoInLine(textNota)}</div>`);
                continue;
            }

            if (linha.startsWith('## ')) {
                if (emLista) { htmlLinhas.push('</ul>'); emLista = false; }
                const title = linha.replace(/^##\s+/, '');
                htmlLinhas.push(`<h2 style="font-size: 1.35rem; font-weight: 800; color: #1e293b; margin-top: 1.5rem; margin-bottom: 0.75rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.35rem;">${this.formatarFormatacaoInLine(title)}</h2>`);
                continue;
            }

            if (linha.startsWith('### ')) {
                if (emLista) { htmlLinhas.push('</ul>'); emLista = false; }
                const title = linha.replace(/^###\s+/, '');
                htmlLinhas.push(`<h3 style="font-size: 1.1rem; font-weight: 700; color: #334155; margin-top: 1.25rem; margin-bottom: 0.5rem;">${this.formatarFormatacaoInLine(title)}</h3>`);
                continue;
            }

            if (/^_{3,}$/.test(linha) || /^_{2,}/.test(linha)) {
                if (emLista) { htmlLinhas.push('</ul>'); emLista = false; }
                htmlLinhas.push(`<p style="border-bottom: 1px dashed #cbd5e1; height: 1.6rem; margin: 0.25rem 0;"></p>`);
                continue;
            }

            if (linha.startsWith('- ') || linha.startsWith('* ')) {
                if (!emLista) {
                    htmlLinhas.push('<ul style="margin-left: 1.25rem; margin-bottom: 0.75rem; list-style-type: disc;">');
                    emLista = true;
                }
                const item = linha.replace(/^[-*]\s+/, '');
                htmlLinhas.push(`<li style="margin-bottom: 0.35rem; line-height: 1.5;">${this.formatarFormatacaoInLine(item)}</li>`);
                continue;
            }

            if (emLista) {
                htmlLinhas.push('</ul>');
                emLista = false;
            }

            htmlLinhas.push(`<p style="margin-bottom: 0.75rem; line-height: 1.65; color: #334155;">${this.formatarFormatacaoInLine(linha)}</p>`);
        }

        if (emLista) htmlLinhas.push('</ul>');

        let res = htmlLinhas.join('\n');
        if (res.includes('<div class="gabarito-block"') && !res.includes('</div>\n') && !res.endsWith('</div>')) {
            res += '</div>';
        }
        return res;
    },

    formatarFormatacaoInLine(texto) {
        if (!texto) return '';
        let out = texto.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        out = out.replace(/\*(.*?)\*/g, '<em>$1</em>');
        return out;
    },

    carregarModeloEstruturadoManual() {
        const areaConteudo = document.getElementById('manual-conteudo-html');
        if (!areaConteudo) return;
        const tipo = this.ferramentaAtiva || 'geral';
        const modelo = this.modelosEstruturadosManuais[tipo] || this.modelosEstruturadosManuais['geral'];

        if (areaConteudo.value.trim() !== '') {
            if (!confirm('Deseja substituir o conteúdo atual pelo modelo estruturado recomendado?')) {
                return;
            }
        }
        areaConteudo.value = modelo;
        if (Toast) Toast.show('Modelo estruturado carregado com sucesso!', 'info');
    },

    abrirPrevisualizacaoManual() {
        const titulo = document.getElementById('manual-titulo')?.value.trim() || 'Material sem Título';
        const disciplina = document.getElementById('manual-disciplina')?.value || 'Geral';
        const serie = document.getElementById('manual-serie')?.value || 'Geral';
        const bncc = document.getElementById('manual-bncc')?.value.trim() || '';
        const rawConteudo = document.getElementById('manual-conteudo-html')?.value.trim() || 'Nenhum conteúdo digitado ainda.';

        let conteudoHtml = rawConteudo;
        if (!rawConteudo.includes('<h2') && !rawConteudo.includes('<h3') && !rawConteudo.includes('<div')) {
            conteudoHtml = this.converterMarkdownParaHtml(rawConteudo);
        }

        const modalContent = `
            <div style="max-height: 75vh; overflow-y: auto; padding: 1rem; background-color: #f1f5f9;" class="custom-scrollbar">
                <div style="background: #ffffff; width: 100%; max-width: 800px; min-height: 600px; margin: 0 auto; padding: 2.5rem; border-radius: 0.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.1); color: #1e293b; font-family: inherit;">
                    <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
                        <div>
                            <h2 style="font-size: 1.5rem; font-weight: 800; color: #1e293b; margin: 0; line-height: 1.2;">${window.escapeHTML(titulo)}</h2>
                            <p style="font-size: 0.875rem; color: #475569; margin-top: 0.35rem; font-weight: 600;">
                                <i class="fas fa-book-open" style="color: #4f46e5;"></i> ${window.escapeHTML(disciplina)} • ${window.escapeHTML(serie)}
                            </p>
                        </div>
                        ${bncc ? `<span style="background: #eef2ff; color: #4338ca; font-weight: 800; font-size: 0.75rem; padding: 0.35rem 0.75rem; border-radius: 0.5rem;">BNCC: ${window.escapeHTML(bncc)}</span>` : ''}
                    </div>

                    <div class="katex-render-area" style="line-height: 1.7; font-size: 0.9375rem;">
                        ${conteudoHtml}
                    </div>
                </div>
            </div>
        `;

        if (ModalComponent && typeof ModalComponent.show === 'function') {
            ModalComponent.show({
                titulo: `<i class="fas fa-file-invoice"></i> Pré-visualização do Material (Modo A4)`,
                conteudo: modalContent,
                tamanho: 'xl'
            });
        } else if (controller && typeof controller.openModal === 'function') {
            controller.openModal('Pré-visualização do Material (Modo A4)', modalContent, 'xl');
        }

        setTimeout(() => {
            if (window.renderKatex) {
                const modalEl = document.querySelector('.modal-container') || document.body;
                window.renderKatex(modalEl);
            }
        }, 100);
    },

    editarMaterialManual(materialId) {
        const mat = (model.state.materiaisGerados || []).find(m => String(m.id) === String(materialId));
        if (!mat) return;
        this.materialEmEdicaoId = mat.id;
        this.ferramentaAtiva = mat.tipo || 'avaliacao';
        this.modoGeracaoForm = 'manual';
        this.mudarAba('templates');

        setTimeout(() => {
            const inputTitulo = document.getElementById('manual-titulo');
            const selectDisc = document.getElementById('manual-disciplina');
            const selectSerie = document.getElementById('manual-serie');
            const inputBncc = document.getElementById('manual-bncc');
            const areaConteudo = document.getElementById('manual-conteudo-html');

            if (inputTitulo) inputTitulo.value = mat.titulo || mat.tema || '';
            if (selectDisc && mat.disciplina) selectDisc.value = mat.disciplina;
            if (selectSerie && mat.serie) selectSerie.value = mat.serie;
            if (inputBncc && mat.bncc) inputBncc.value = mat.bncc;
            if (areaConteudo) areaConteudo.value = mat.raw_markdown || mat.conteudo_html || '';
        }, 50);
    },

    async salvarMaterialManual() {
        const titulo = document.getElementById('manual-titulo')?.value.trim();
        const disciplina = document.getElementById('manual-disciplina')?.value;
        const serie = document.getElementById('manual-serie')?.value;
        const bncc = document.getElementById('manual-bncc')?.value.trim() || '';

        const wysiwyg = document.getElementById('manual-conteudo-wysiwyg');
        const textareaConteudo = document.getElementById('manual-conteudo-html');

        let rawConteudo = '';
        if (wysiwyg && wysiwyg.innerHTML.trim() !== '') {
            rawConteudo = wysiwyg.innerHTML.trim();
        } else if (textareaConteudo) {
            rawConteudo = textareaConteudo.value.trim();
        }

        if (!titulo) {
            if (Toast) Toast.show("Por favor, preencha o título do material.", "warning");
            return;
        }
        if (!rawConteudo) {
            if (Toast) Toast.show("Por favor, insira o conteúdo do material.", "warning");
            return;
        }

        let conteudoHtml = rawConteudo;
        if (!rawConteudo.includes('<h2') && !rawConteudo.includes('<h3') && !rawConteudo.includes('<div') && !rawConteudo.includes('<p>')) {
            conteudoHtml = this.converterMarkdownParaHtml(rawConteudo);
        }

        let salvo;
        const dadosMaterial = {
            tipo: this.ferramentaAtiva || 'geral',
            titulo,
            tema: titulo,
            disciplina,
            serie,
            bncc,
            pastaId: this.pastaAtualId || null,
            conteudo_html: conteudoHtml,
            raw_markdown: rawConteudo,
            criadoManualmente: true,
            naLixeira: false
        };

        if (this.materialEmEdicaoId) {
            salvo = await model.updateMaterial(this.materialEmEdicaoId, dadosMaterial);
            this.materialEmEdicaoId = null;
            if (Toast) Toast.show("Material editado e salvo com sucesso!", "success");
        } else {
            salvo = await model.saveMaterial(dadosMaterial);
            if (Toast) Toast.show("Material criado e salvo com sucesso!", "success");
        }

        if (salvo && window.conteudoGeradoView) {
            window.conteudoGeradoView.setMaterial(salvo.id);
            controller.navigate('conteudo-gerado');
        } else {
            this.mudarAba('meus');
        }
    },

    uploadImagemNoEditor(targetId = 'manual-conteudo-wysiwyg') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 3 * 1024 * 1024) {
                    if (Toast) Toast.show("A imagem deve ser menor que 3MB.", "warning");
                    return;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                    const dataUrl = event.target.result;
                    const imgHtml = `<p style="text-align: center; margin: 1rem 0;"><img src="${dataUrl}" style="max-width: 90%; max-height: 400px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" class="material-img"></p><p>&nbsp;</p>`;
                    const editor = (typeof targetId === 'string' ? document.getElementById(targetId) : targetId) || document.getElementById('manual-conteudo-wysiwyg') || document.getElementById('editor-mat-wysiwyg') || document.getElementById('manual-conteudo-html');

                    if (editor) {
                        if (editor.isContentEditable || editor.contentEditable === 'true') {
                            editor.focus();
                            document.execCommand('insertHTML', false, imgHtml);
                        } else if (editor.value !== undefined) {
                            const start = editor.selectionStart || 0;
                            const end = editor.selectionEnd || 0;
                            editor.value = editor.value.substring(0, start) + `\n${imgHtml}\n` + editor.value.substring(end);
                            editor.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    },

    vincularRastreamentoSelecao(editorId = 'manual-conteudo-wysiwyg') {
        const editor = typeof editorId === 'string' ? document.getElementById(editorId) : editorId;
        if (!editor || editor.dataset.selectionTracked === 'true') return;

        editor.dataset.selectionTracked = 'true';
        const salvarSelecao = () => {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                if (editor.contains(range.commonAncestorContainer)) {
                    editor._savedRange = range.cloneRange();
                }
            }
        };

        editor.addEventListener('mouseup', salvarSelecao);
        editor.addEventListener('keyup', salvarSelecao);
        editor.addEventListener('blur', salvarSelecao);
    },

    aplicarTamanhoFonteSelecao(editor, tamPx) {
        if (!editor || !tamPx) return;
        const targetEditor = (typeof editor === 'string' ? document.getElementById(editor) : editor) || document.getElementById('manual-conteudo-wysiwyg') || document.getElementById('editor-mat-wysiwyg');
        if (!targetEditor) return;

        targetEditor.focus();
        let sel = window.getSelection();

        // Se a seleção foi perdida no blur do select mas existe o _savedRange salvo, restaura
        if (targetEditor._savedRange) {
            if (!sel.rangeCount || !targetEditor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
                sel.removeAllRanges();
                sel.addRange(targetEditor._savedRange);
                sel = window.getSelection();
            }
        }

        if (!sel || !sel.rangeCount) {
            targetEditor.style.fontSize = tamPx;
            return;
        }

        const range = sel.getRangeAt(0);

        if (!range.collapsed) {
            // HÁ TEXTO SELECIONADO: encapsula no span com fontSize
            const fragment = range.extractContents();
            const span = document.createElement('span');
            span.style.fontSize = tamPx;
            span.style.lineHeight = '1.35';
            span.appendChild(fragment);
            range.insertNode(span);

            // Re-seleciona para permitir novas formatações
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            sel.removeAllRanges();
            sel.addRange(newRange);
            targetEditor._savedRange = newRange.cloneRange();
        } else {
            // CURSOR PARADO: aplica ao bloco pai (p, li, h1-h6, td, th, div) ou ao container
            let parentBlock = range.startContainer.nodeType === Node.ELEMENT_NODE 
                ? range.startContainer 
                : range.startContainer.parentElement;

            while (parentBlock && parentBlock !== targetEditor && !['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TD', 'TH', 'DIV'].includes(parentBlock.tagName)) {
                parentBlock = parentBlock.parentElement;
            }

            if (parentBlock && parentBlock !== targetEditor) {
                parentBlock.style.fontSize = tamPx;
                parentBlock.style.lineHeight = '1.35';
            } else {
                targetEditor.style.fontSize = tamPx;
            }
        }
    },

    async colarTextoLimpo(targetId = 'manual-conteudo-wysiwyg') {
        const editor = (typeof targetId === 'string' ? document.getElementById(targetId) : targetId) || document.getElementById('manual-conteudo-wysiwyg') || document.getElementById('editor-mat-wysiwyg');
        if (!editor) return;

        try {
            let texto = '';
            if (navigator.clipboard && navigator.clipboard.readText) {
                texto = await navigator.clipboard.readText();
            } else {
                texto = prompt("Cole o texto aqui para remover formatações externas:");
            }

            if (texto) {
                const htmlLimpo = window.escapeHTML ? window.escapeHTML(texto).split('\n').map(l => l.trim() ? `<p>${l}</p>` : '').join('') : texto;
                editor.focus();
                if (editor.isContentEditable || editor.contentEditable === 'true') {
                    document.execCommand('insertHTML', false, htmlLimpo);
                } else if (editor.value !== undefined) {
                    const start = editor.selectionStart || 0;
                    const end = editor.selectionEnd || 0;
                    editor.value = editor.value.substring(0, start) + texto + editor.value.substring(end);
                }
                if (window.Toast) Toast.show("Texto colado sem formatação!", "success");
            }
        } catch (err) {
            console.error("Erro ao colar texto limpo:", err);
            const texto = prompt("Cole o texto abaixo para remover a formatação:");
            if (texto) {
                const htmlLimpo = window.escapeHTML ? window.escapeHTML(texto).split('\n').map(l => l.trim() ? `<p>${l}</p>` : '').join('') : texto;
                editor.focus();
                document.execCommand('insertHTML', false, htmlLimpo);
            }
        }
    },

    vincularSanitizadorPaste(editorId = 'manual-conteudo-wysiwyg') {
        const editor = typeof editorId === 'string' ? document.getElementById(editorId) : editorId;
        if (!editor || editor.dataset.pasteBound === 'true') return;

        editor.dataset.pasteBound = 'true';
        editor.addEventListener('paste', (e) => {
            e.preventDefault();
            const clipboardData = e.clipboardData || window.clipboardData;
            const pastedHtml = clipboardData ? clipboardData.getData('text/html') : null;
            const pastedText = clipboardData ? clipboardData.getData('text/plain') : null;

            if (pastedHtml && window.sanitizarEFormatadorHTMLColado) {
                const htmlLimpo = window.sanitizarEFormatadorHTMLColado(pastedHtml);
                document.execCommand('insertHTML', false, htmlLimpo);
            } else if (pastedText) {
                const textLimpo = window.escapeHTML ? window.escapeHTML(pastedText).replace(/\n/g, '<br>') : pastedText;
                document.execCommand('insertHTML', false, textLimpo);
            }
        });
    },

    inserirSnippet(tipo, targetId = 'manual-conteudo-wysiwyg', val = null) {
        const editor = (typeof targetId === 'string' ? document.getElementById(targetId) : targetId) || document.getElementById('manual-conteudo-wysiwyg') || document.getElementById('editor-mat-wysiwyg') || document.getElementById('manual-conteudo-html') || document.getElementById('editor-mat-conteudo');
        if (!editor) return;

        editor.focus();
        const isEditable = editor.isContentEditable || editor.contentEditable === 'true';

        if (isEditable) {
            document.execCommand('styleWithCSS', false, true);

            switch (tipo) {
                case 'h2': document.execCommand('formatBlock', false, '<h2>'); break;
                case 'h3': document.execCommand('formatBlock', false, '<h3>'); break;
                case 'bold': document.execCommand('bold', false, null); break;
                case 'italic': document.execCommand('italic', false, null); break;
                case 'underline': document.execCommand('underline', false, null); break;
                case 'fontsize':
                    if (val) this.aplicarTamanhoFonteSelecao(editor, val);
                    break;
                case 'fontfamily':
                    if (val) document.execCommand('fontName', false, val);
                    break;
                case 'forecolor':
                    if (val) document.execCommand('foreColor', false, val);
                    break;
                case 'hilitecolor':
                case 'backcolor':
                    if (val) document.execCommand('hiliteColor', false, val);
                    break;
                case 'removeformat':
                    document.execCommand('removeFormat', false, null);
                    break;
                case 'colar':
                    this.colarTextoLimpo(editor);
                    break;
                case 'lista': document.execCommand('insertUnorderedList', false, null); break;
                case 'frac': document.execCommand('insertHTML', false, ' \\(\\frac{a}{b}\\) '); break;
                case 'superscript': document.execCommand('superscript', false, null); break;
                case 'subscript': document.execCommand('subscript', false, null); break;
                case 'sqrt': document.execCommand('insertHTML', false, ' \\(\\sqrt{x}\\) '); break;
                case 'symbol_neq': document.execCommand('insertHTML', false, ' ≠ '); break;
                case 'symbol_times': document.execCommand('insertHTML', false, ' × '); break;
                case 'symbol_div': document.execCommand('insertHTML', false, ' ÷ '); break;
                case 'symbol_alpha': document.execCommand('insertHTML', false, ' α '); break;
                case 'symbol_beta': document.execCommand('insertHTML', false, ' β '); break;
                case 'symbol_pi': document.execCommand('insertHTML', false, ' π '); break;
                case 'symbol_delta': document.execCommand('insertHTML', false, ' Δ '); break;
                case 'symbol_theta': document.execCommand('insertHTML', false, ' θ '); break;
                case 'symbol_infty': document.execCommand('insertHTML', false, ' ∞ '); break;
                case 'symbol_pm': document.execCommand('insertHTML', false, ' ± '); break;
                case 'symbol_approx': document.execCommand('insertHTML', false, ' ≈ '); break;
                case 'gabarito': window.conteudoGeradoView.inserirBlocoGabarito(editor); break;
                case 'destaque': window.conteudoGeradoView.inserirComentarioProfessor(editor); break;
                case 'linhas': window.conteudoGeradoView.inserirLinhasResposta(editor); break;
                case 'tabela': tableHelper.abrirModalInserirTabela(editor); break;
                case 'imagem': this.uploadImagemNoEditor(editor); break;
                default:
                    if (val) document.execCommand('insertHTML', false, val);
            }
            if (typeof renderKatex === 'function') renderKatex(editor);
            return;
        }

        const start = editor.selectionStart || 0;
        const end = editor.selectionEnd || 0;
        const selectedText = editor.value.substring(start, end);

        let snippet = '';
        switch (tipo) {
            case 'h2': snippet = selectedText ? `\n## ${selectedText}\n` : '\n## Título da Seção\n'; break;
            case 'h3': snippet = selectedText ? `\n### ${selectedText}\n` : '\n### Subtítulo da Seção\n'; break;
            case 'bold': snippet = selectedText ? `**${selectedText}**` : '**Texto em Negrito**'; break;
            case 'italic': snippet = selectedText ? `*${selectedText}*` : '*Texto em Itálico*'; break;
            case 'underline': snippet = selectedText ? `<u>${selectedText}</u>` : '<u>Texto Sublinhado</u>'; break;
            case 'fontsize': snippet = selectedText ? `<span style="font-size: ${val || '16px'};">${selectedText}</span>` : `<span style="font-size: ${val || '16px'};">Texto com tamanho ajustado</span>`; break;
            case 'fontfamily': snippet = selectedText ? `<span style="font-family: ${val || 'Roboto, sans-serif'};">${selectedText}</span>` : `<span style="font-family: ${val || 'Roboto, sans-serif'};">Texto com fonte ajustada</span>`; break;
            case 'lista': snippet = '\n- Item 1\n- Item 2\n- Item 3\n'; break;
            case 'frac': snippet = ' \\(\\frac{a}{b}\\) '; break;
            case 'superscript': snippet = selectedText ? ` \\(${selectedText}^2\\) ` : ' \\(x^2\\) '; break;
            case 'subscript': snippet = selectedText ? ` \\(${selectedText}_i\\) ` : ' \\(x_i\\) '; break;
            case 'sqrt': snippet = selectedText ? ` \\(\\sqrt{${selectedText}}\\) ` : ' \\(\\sqrt{x}\\) '; break;
            case 'symbol_neq': snippet = ' \\(\\ne\\) '; break;
            case 'symbol_times': snippet = ' \\(\\times\\) '; break;
            case 'symbol_div': snippet = ' \\(\\div\\) '; break;
            case 'symbol_alpha': snippet = ' α '; break;
            case 'symbol_beta': snippet = ' β '; break;
            case 'symbol_pi': snippet = ' π '; break;
            case 'symbol_delta': snippet = ' Δ '; break;
            case 'symbol_theta': snippet = ' θ '; break;
            case 'symbol_infty': snippet = ' ∞ '; break;
            case 'symbol_pm': snippet = ' ± '; break;
            case 'symbol_approx': snippet = ' ≈ '; break;
            case 'imagem': this.uploadImagemNoEditor(editor); break;
            default: snippet = val || '';
        }

        const oldVal = editor.value;
        editor.value = oldVal.substring(0, start) + snippet + oldVal.substring(end);
        editor.focus();
        editor.selectionStart = start + snippet.length;
        editor.selectionEnd = start + snippet.length;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    },

    filtrarMateriais(lista) {
        if (!Array.isArray(lista)) return [];
        const isLixeira = this.abaAtiva === 'lixeira';
        const busca = (this.termoBusca || '').toLowerCase().trim();

        return lista.filter(m => {
            if (isLixeira) {
                if (!m.naLixeira) return false;
            } else {
                if (m.naLixeira) return false;
                if (!busca && String(m.pastaId || '') !== String(this.pastaAtualId || '')) {
                    return false;
                }
            }

            if (this.filtros.disciplina && m.disciplina !== this.filtros.disciplina) return false;
            if (this.filtros.serie && m.serie !== this.filtros.serie) return false;
            if (this.filtros.tipo && m.tipo !== this.filtros.tipo) return false;

            if (busca) {
                const matchBusca = (window.matchMultiTermos || matchMultiTermos)(m, ['titulo', 'tema', 'disciplina', 'serie', 'bncc', 'habilidade_bncc', 'habilidade', 'codigo_bncc', 'conteudo_html'], busca);
                if (!matchBusca) return false;
            }

            return true;
        });
    },

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const todosMateriais = model.state.materiaisGerados || [];
        const meusMateriais = todosMateriais.filter(m => !m.naLixeira);
        const lixeiraMateriais = todosMateriais.filter(m => m.naLixeira);
        const lixeiraFlashcards = (model.state.flashcards || []).filter(d => d.naLixeira);
        const lixeiraMindmaps = (model.state.mindmaps || []).filter(m => m.naLixeira);
        const totalLixeira = lixeiraMateriais.length + lixeiraFlashcards.length + lixeiraMindmaps.length;

        const materiaisFiltrados = this.filtrarMateriais(todosMateriais);
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

        const todosIds = new Set(todosMateriais.map(m => String(m.id)));
        for (const id of this.selecionadas) {
            if (!todosIds.has(String(id))) this.selecionadas.delete(id);
        }

        let conteudoAba = '';
        if (this.abaAtiva === 'meus') {
            conteudoAba = this.renderMeusMateriais(materiaisPaginados, totalItens, totalPaginas);
        } else if (this.abaAtiva === 'estudos-visuais') {
            conteudoAba = `<div id="area-estudos-visuais-integ" class="animate-enter"></div>`;
            setTimeout(() => {
                if (window.estudosVisuaisView && window.estudosVisuaisView.render) {
                    window.estudosVisuaisView.render('area-estudos-visuais-integ');
                }
            }, 30);
        } else if (this.abaAtiva === 'templates') {
            conteudoAba = this.renderTemplatesIA();
        } else if (this.abaAtiva === 'comunidade') {
            conteudoAba = this.renderComunidadeMateriais();
        } else if (this.abaAtiva === 'lixeira') {
            conteudoAba = this.renderLixeira(materiaisPaginados, totalItens, totalPaginas);
        }

        const html = `
            <div class="fade-in print-hidden" style="padding-bottom: 6rem;">
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; gap: 1rem;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Materiais & Comunidade</h2>
                            <span class="badge" style="background-color: #eef2ff; color: #4338ca; font-weight: 800; padding: 0.35rem 0.75rem; border-radius: 9999px; font-size: 0.75rem;">
                                ${meusMateriais.length} materiais salvos
                            </span>
                        </div>
                        <p class="text-slate-500 mt-1">Crie materiais pedagógicos com IA ou manualmente, consulte o acervo e organize seus arquivos.</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <button type="button" data-action="mudar-aba" data-aba="comunidade" 
                                class="btn-secondary interactive-element"
                                style="background-color: #4f46e5; color: #ffffff; padding: 0.75rem 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.25);">
                            <i class="fas fa-globe"></i> Explorar Comunidade
                        </button>
                        <button type="button" data-action="abrir-modal-criar-material" 
                                class="btn-primary interactive-element" style="padding: 0.75rem 1.5rem; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.25);">
                            <i class="fas fa-magic"></i> + Criar Material
                        </button>
                    </div>
                </div>

                <div class="mode-toggle-group" style="width: fit-content; margin-bottom: 1.5rem;">
                    <button type="button" data-action="mudar-aba" data-aba="meus" 
                            class="mode-toggle-btn interactive-element ${this.abaAtiva === 'meus' ? 'mode-toggle-btn--active' : ''}">
                        <i class="fas fa-folder-open" style="margin-right: 0.375rem;"></i> Meus Materiais (${meusMateriais.length})
                    </button>
                    <button type="button" data-action="mudar-aba" data-aba="estudos-visuais" 
                            class="mode-toggle-btn interactive-element ${this.abaAtiva === 'estudos-visuais' ? 'mode-toggle-btn--active' : ''}">
                        <i class="fas fa-brain" style="margin-right: 0.375rem;"></i> Flashcards & Mapas
                    </button>
                    <button type="button" data-action="mudar-aba" data-aba="templates" 
                            class="mode-toggle-btn interactive-element ${this.abaAtiva === 'templates' ? 'mode-toggle-btn--active' : ''}">
                        <i class="fas fa-wand-magic-sparkles" style="margin-right: 0.375rem;"></i> Gerar com IA / Templates
                    </button>
                    <button type="button" data-action="mudar-aba" data-aba="comunidade" 
                            class="mode-toggle-btn interactive-element ${this.abaAtiva === 'comunidade' ? 'mode-toggle-btn--active' : ''}">
                        <i class="fas fa-users-rectangle" style="margin-right: 0.375rem;"></i> Acervo da Comunidade
                    </button>
                    <button type="button" data-action="mudar-aba" data-aba="lixeira" 
                            class="mode-toggle-btn interactive-element ${this.abaAtiva === 'lixeira' ? 'mode-toggle-btn--active' : ''}">
                        <i class="fas fa-trash-alt" style="margin-right: 0.375rem;"></i> Lixeira (${totalLixeira})
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

        this._setupListeners(container);
    },

    _setupListeners(container) {
        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
        }
        this._cleanupDelegators = EventDelegator.bind(container, {
            'mudar-aba': (e, target) => {
                const aba = target.getAttribute('data-aba');
                if (aba) this.mudarAba(aba);
            },
            'abrir-modal-criar-material': () => this.abrirModalCriarMaterial(),
            'excluir-pasta': (e, target) => {
                e.stopPropagation();
                const id = target.getAttribute('data-id');
                if (id) {
                    model.excluirPastaMaterial(id);
                    this.render('view-container');
                }
            },
            'ver-material': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) {
                    if (window.conteudoGeradoView) window.conteudoGeradoView.setMaterial(id);
                    controller.navigate('conteudo-gerado');
                }
            },
            'restaurar-material': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) this.restaurarMaterial(id);
            },
            'excluir-permanente': (e, target) => {
                const id = target.getAttribute('data-id');
                if (id) this.excluirPermanente(id);
            },
            'mover-para-pasta-modal': (e, target) => {
                const materialId = target.getAttribute('data-id');
                const pId = document.getElementById('select-dest-pasta')?.value;
                model.moverMaterialParaPasta(materialId, pId);
                controller.closeModal();
                this.render('view-container');
            },
            'fechar-modal': () => controller.closeModal()
        }, 'click');
    },

    destroy() {
        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }
    },

    onLeave() {
        this.destroy();
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
                <p class="text-slate-500 text-sm">Selecione uma das ferramentas no menu lateral para configurar e gerar ou escrever o conteúdo pedagógico.</p>
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

        // Se estiver no modo manual, pré-carregar modelo recomendado se o campo estiver vazio
        if (this.modoGeracaoForm === 'manual') {
            const areaConteudo = document.getElementById('manual-conteudo-html');
            if (areaConteudo && areaConteudo.value.trim() === '') {
                const modelo = this.modelosEstruturadosManuais[idFerramenta] || this.modelosEstruturadosManuais['geral'];
                if (modelo) {
                    areaConteudo.value = modelo;
                }
            }
            setTimeout(() => {
                anexarPreviewLatex('manual-conteudo-html', 'manual-preview-live');
            }, 50);
        }
    },

    modoGeracaoForm: 'ia',

    setModoGeracao(modo) {
        this.modoGeracaoForm = modo;
        const formArea = document.getElementById('form-area');
        if (formArea) {
            formArea.innerHTML = this.renderizarFormularioDaFerramenta();
            if (modo === 'manual') {
                setTimeout(() => {
                    const wysiwyg = document.getElementById('manual-conteudo-wysiwyg');
                    if (wysiwyg) {
                        this.vincularRastreamentoSelecao(wysiwyg);
                        this.vincularSanitizadorPaste(wysiwyg);
                        if (typeof tableHelper !== 'undefined') tableHelper.inicializarInspetorTabelas(wysiwyg);
                        if (typeof imageHelper !== 'undefined') imageHelper.inicializarInspetorImagens(wysiwyg);
                    }
                    anexarPreviewLatex('manual-conteudo-html', 'manual-preview-live');
                }, 50);
            }
        }
    },
    renderizarFormularioDaFerramenta() {
        const config = this.formConfig[this.ferramentaAtiva];
        if (!config) return `<div class="tool-empty-state"><p class="text-slate-400">Em desenvolvimento ou sem configuração.</p></div>`;

        const toggleBar = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; background: #f8fafc; padding: 0.5rem 0.75rem; border-radius: 1rem; border: 1px solid #e2e8f0; flex-wrap: wrap; gap: 0.5rem;">
                <span style="font-size: 0.8125rem; font-weight: 800; color: #475569; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-sliders" style="color: #4f46e5;"></i> Modo de Criação:
                </span>
                <div style="display: flex; gap: 0.375rem; background-color: #e2e8f0; padding: 0.25rem; border-radius: 0.75rem;">
                    <button type="button" onclick="criarMaterialView.setModoGeracao('ia')" 
                            class="interactive-element" 
                            style="padding: 0.35rem 0.875rem; font-size: 0.75rem; font-weight: 800; border-radius: 0.625rem; border: none; cursor: pointer; transition: all 0.2s; ${this.modoGeracaoForm === 'ia' ? 'background-color: #4f46e5; color: #ffffff; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);' : 'background-color: transparent; color: #64748b;'}">
                        <i class="fas fa-robot"></i> Gerar com IA
                    </button>
                    <button type="button" onclick="criarMaterialView.setModoGeracao('manual')" 
                            class="interactive-element" 
                            style="padding: 0.35rem 0.875rem; font-size: 0.75rem; font-weight: 800; border-radius: 0.625rem; border: none; cursor: pointer; transition: all 0.2s; ${this.modoGeracaoForm === 'manual' ? 'background-color: #10b981; color: #ffffff; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);' : 'background-color: transparent; color: #64748b;'}">
                        <i class="fas fa-pen-to-square"></i> Escrever Meu Material
                    </button>
                </div>
            </div>
        `;

        if (this.modoGeracaoForm === 'manual') {
            return `
                ${toggleBar}
                <div class="tool-main-panel__header animate-enter">
                    <h3 class="tool-main-panel__title">${config.titulo} (Criação Própria / Manual)</h3>
                    <p class="tool-main-panel__subtitle">Escreva ou cole seu próprio material pedagógico para salvá-lo diretamente na sua biblioteca.</p>
                </div>

                <form id="manual-material-form" class="space-y-4 animate-enter flex-1" onsubmit="event.preventDefault(); criarMaterialView.salvarMaterialManual();">
                    <div class="form-group">
                        <label class="form-label" style="font-weight: 700;">Título do Material *</label>
                        <input type="text" id="manual-titulo" class="form-input" placeholder="Ex: ${config.titulo} de Língua Portuguesa..." required>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <div class="form-group">
                            <label class="form-label" style="font-weight: 700;">Disciplina *</label>
                            <select id="manual-disciplina" class="form-select">
                                ${this.disciplinas.map(d => `<option value="${d}">${d}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label" style="font-weight: 700;">Série / Ano *</label>
                            <select id="manual-serie" class="form-select">
                                ${this.seriesDisponiveis.map(s => `<option value="${s}">${s}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" style="font-weight: 700;">Código BNCC (Opcional)</label>
                        <input type="text" id="manual-bncc" class="form-input" placeholder="Ex: EF08MA07">
                    </div>

                    <div class="form-group">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
                            <label class="form-label" style="font-weight: 700; margin: 0;">Conteúdo do Material (Texto, Questões ou Gabarito) *</label>
                            <div style="display: flex; gap: 0.375rem; flex-wrap: wrap;">
                                <button type="button" onclick="criarMaterialView.carregarModeloEstruturadoManual()" class="btn-secondary interactive-element" style="padding: 0.25rem 0.6rem; font-size: 0.75rem; background: #eef2ff; color: #4338ca; border-color: #c7d2fe; font-weight: 700;" title="Carregar modelo de estrutura recomendado para esta ferramenta">
                                    <i class="fas fa-wand-magic-sparkles"></i> Modelo Pronto
                                </button>
                                <button type="button" onclick="criarMaterialView.abrirPrevisualizacaoManual()" class="btn-secondary interactive-element" style="padding: 0.25rem 0.6rem; font-size: 0.75rem; background: #f0fdf4; color: #15803d; border-color: #bbf7d0; font-weight: 700;" title="Pré-visualizar folha impressa A4">
                                    <i class="fas fa-eye"></i> Pré-visualizar A4
                                </button>
                            </div>
                        </div>

                        <!-- BARRA DE FERRAMENTAS MODULAR (RIBBON COMPLETO) -->
                        ${EditorToolbar.render('manual-conteudo-wysiwyg')}

                        <!-- CAIXA VISUAL TIPO WORD (CONTENTEDITABLE) -->
                        <div id="manual-conteudo-wysiwyg" contenteditable="true" class="custom-scrollbar" style="display: block; width: 100%; min-height: 280px; max-height: 55vh; overflow-y: auto; background-color: #ffffff; color: #0f172a; padding: 1.25rem; border-radius: 0 0 0.75rem 0.75rem; border: 1px solid #cbd5e1; border-top: none; line-height: 1.7; font-size: 0.95rem; outline: none;"></div>
                    </div>

                    <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                        <button type="button" onclick="criarMaterialView.abrirPrevisualizacaoManual()" class="btn-secondary interactive-element py-3 px-5 rounded-xl font-bold flex items-center gap-2" style="background-color: #f8fafc; color: #475569; border-color: #cbd5e1;">
                            <i class="fas fa-eye"></i> Pré-visualizar A4
                        </button>

                        <button type="submit" class="btn-primary interactive-element py-3.5 px-6 rounded-xl font-bold text-white flex items-center gap-2" style="background-color: #10b981; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.25);">
                            <i class="fas fa-save"></i> Salvar Material na Biblioteca
                        </button>
                    </div>
                </form>
            `;
        }

        return `
            ${toggleBar}
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
    imprimirMaterialA4(material, opts = {}) {
        const config = model.state.userConfig || {};
        const nomeProf = config.profName ? config.profName : (model.currentUser?.displayName || 'Professor(a)');
        const nomeEscola = config.escolaName || config.schoolName || 'Nome da Escola';
        const dataHoje = new Date().toLocaleDateString('pt-BR');

        const tamanhoFonte = opts.tamanhoFonte || 'normal';
        let fontSizeStr = '11.5pt';
        if (tamanhoFonte === 'compacto') fontSizeStr = '10pt';
        else if (tamanhoFonte === 'amplo' || opts.tipo === 'acessivel') fontSizeStr = '13.5pt';
        else if (opts.tipo === 'acessivel') fontSizeStr = '14pt';

        let lineHeight = '1.35';
        let marginAntes = '4pt';
        let marginDepois = '2pt';
        if (opts.espacamento === 'maxima_1_1') {
            lineHeight = '1.05';
            marginAntes = '1pt';
            marginDepois = '1pt';
        } else if (opts.espacamento === 'compacto_2_1') {
            lineHeight = '1.15';
            marginAntes = '2pt';
            marginDepois = '1.5pt';
        } else if (opts.espacamento === 'confortavel_6_4' || opts.tipo === 'acessivel') {
            lineHeight = '1.6';
            marginAntes = '6pt';
            marginDepois = '4pt';
        }

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
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
                    
                    * { box-sizing: border-box; }
                    body { 
                        font-family: 'Inter', Arial, sans-serif; 
                        color: #1e293b; 
                        background: #fff; 
                        line-height: ${lineHeight};
                        font-size: ${fontSizeStr};
                        margin: 0;
                        padding: 0;
                    }
                    /* Configuração estrita para folha A4 */
                    @page {
                        size: A4;
                        margin: 15mm 20mm;
                    }
                    /* Cabeçalho da Escola */
                    .header { 
                        border-bottom: 2px solid #000; 
                        padding-bottom: 10px; 
                        margin-bottom: 20px; 
                    }
                    .header h1 { 
                        font-size: 18px; 
                        font-weight: 900; 
                        text-transform: uppercase; 
                        margin: 0 0 4px 0; 
                    }
                    .header .meta-info {
                        display: flex;
                        justify-content: space-between;
                        font-size: 11px;
                        font-weight: 700;
                    }
                    /* Estilização do Conteúdo com herança tipográfica fluida */
                    .content {
                        font-size: ${fontSizeStr};
                        line-height: ${lineHeight};
                    }
                    .content h2 { font-size: 16px; margin-top: 16px; margin-bottom: 8px; color: #0f172a; }
                    .content h3 { font-size: 14.5px; margin-top: 14px; margin-bottom: 6px; border-bottom: 1px solid #eee; padding-bottom: 3px; color: #0f172a; }
                    .content h4 { font-size: 13px; margin-top: 10px; margin-bottom: 4px; color: #0f172a; }
                    .content p { font-size: inherit; text-align: justify; margin-top: ${marginAntes}; margin-bottom: ${marginDepois}; color: #334155; line-height: inherit; }
                    .content ul, .content ol { font-size: inherit; margin-top: ${marginAntes}; margin-bottom: ${marginDepois}; padding-left: 20px; }
                    .content li { margin-bottom: ${marginDepois}; color: #334155; font-size: inherit; line-height: inherit; }
                    .content strong { color: #000; }
                    .gabarito-bloco, .gabarito { background-color: #ecfdf5; border: 1px solid #a7f3d0; border-left: 5px solid #059669; padding: 14px 18px; margin: 15px 0; border-radius: 8px; page-break-inside: avoid; }
                    .gabarito-bloco h3, .gabarito-bloco h4 { color: #065f46; margin-top: 0; }
                    /* Garante que tabelas ou blocos não quebrem na metade entre duas páginas */
                    .content h3, .content ul, .content table, table, tr, tbody, thead, .planner-table-wrapper {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    table {
                        width: 100% !important;
                        max-width: 100% !important;
                        border-collapse: collapse;
                        margin: 12px 0;
                        box-sizing: border-box !important;
                        table-layout: auto;
                        font-size: 13px;
                    }
                    th, td {
                        border: 1px solid #cbd5e1;
                        padding: 6px 10px;
                        text-align: left;
                        vertical-align: middle;
                        box-sizing: border-box;
                        word-break: normal;
                        overflow-wrap: anywhere;
                    }
                    th {
                        background-color: #f1f5f9;
                        font-weight: bold;
                        color: #0f172a;
                    }
                    .planner-table-zebra tbody tr:nth-child(even) { background-color: #f8fafc; }
                    .planner-table-horizontal th, .planner-table-horizontal td { border: none; border-top: 1px solid #94a3b8; border-bottom: 1px solid #94a3b8; }
                    .planner-table-horizontal thead tr th { border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; background: transparent; }
                    .planner-table-horizontal tbody tr:last-child td { border-bottom: 2px solid #0f172a; }
                    .planner-table-clean th, .planner-table-clean td { border: none; border-bottom: 1px solid #e2e8f0; }
                    .planner-table-clean thead th { border-bottom: 2px solid #cbd5e1; background: transparent; }
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
        if (printWindow) {
            const safeHtml = window.sanitizeComLatex ? window.sanitizeComLatex(conteudo) : conteudo;
            printWindow.document.open();
            printWindow.document.write(safeHtml);
            printWindow.document.close();
        }
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
            <ul class="dropdown-menu hidden absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-56 overflow-y-auto custom-scrollbar p-1.5 animate-enter origin-top text-left font-normal">
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Língua Portuguesa">Língua Portuguesa</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Matemática">Matemática</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Ciências">Ciências</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="História">História</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Geografia">Geografia</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Arte">Arte</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Educação Física">Educação Física</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Língua Inglesa">Língua Inglesa</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Física">Física</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Química">Química</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Biologia">Biologia</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Filosofia">Filosofia</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Sociologia">Sociologia</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Educação Infantil">Educação Infantil / Geral</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Ensino Religioso">Ensino Religioso</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Tecnologia & Computação">Tecnologia & Computação</li>
            </ul>
        </div>
    </div>`; break;
            case 'select-serie': htmlComponente = `
    <div class="w-full">
        <label class="form-label">Série / Ano</label>
        <div class="custom-dropdown relative w-full">
            <input type="hidden" data-field="Série" value="6º Ano EF">
            <button type="button" class="dropdown-button w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-300 rounded-xl shadow-sm text-sm font-medium text-slate-700 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-50">
                <span class="dropdown-label truncate">6º Ano — EF II (11 anos)</span>
                <i class="fas fa-chevron-down text-slate-400 text-xs ml-2"></i>
            </button>
            <ul class="dropdown-menu hidden absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-64 overflow-y-auto custom-scrollbar p-1.5 animate-enter origin-top text-left font-normal">
                <!-- EDUCAÇÃO INFANTIL (0 A 5 ANOS) -->
                <li class="dropdown-item-header p-1.5 font-bold text-xs text-indigo-600 bg-indigo-50/70 rounded uppercase">Educação Infantil (0 a 5 anos)</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Berçário (0 a 1 ano)">Berçário (0 a 1 ano)</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Maternal I (1 a 2 anos)">Maternal I (1 a 2 anos)</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Maternal II (2 a 3 anos)">Maternal II (2 a 3 anos)</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Pré-Escola I (4 anos)">Pré-Escola I / Infantil 4 (4 anos)</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="Pré-Escola II (5 anos)">Pré-Escola II / Infantil 5 (5 anos)</li>
                
                <!-- ENSINO FUNDAMENTAL I (6 A 10 ANOS) -->
                <li class="dropdown-item-header p-1.5 font-bold text-xs text-indigo-600 bg-indigo-50/70 rounded uppercase mt-1">Ensino Fundamental I (Anos Iniciais)</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="1º Ano EF">1º Ano — EF I (6 anos)</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="2º Ano EF">2º Ano — EF I (7 anos)</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="3º Ano EF">3º Ano — EF I (8 anos)</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="4º Ano EF">4º Ano — EF I (9 anos)</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="5º Ano EF">5º Ano — EF I (10 anos)</li>
                
                <!-- ENSINO FUNDAMENTAL II (11 A 14 ANOS) -->
                <li class="dropdown-item-header p-1.5 font-bold text-xs text-indigo-600 bg-indigo-50/70 rounded uppercase mt-1">Ensino Fundamental II (Anos Finais)</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="6º Ano EF">6º Ano — EF II (11 anos)</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="7º Ano EF">7º Ano — EF II (12 anos)</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="8º Ano EF">8º Ano — EF II (13 anos)</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="9º Ano EF">9º Ano — EF II (14 anos)</li>
                
                <!-- ENSINO MÉDIO (15 A 17 ANOS) -->
                <li class="dropdown-item-header p-1.5 font-bold text-xs text-indigo-600 bg-indigo-50/70 rounded uppercase mt-1">Ensino Médio (15 a 17 anos)</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="1º Ano EM">1º Ano — Ensino Médio (15 anos)</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="2º Ano EM">2º Ano — Ensino Médio (16 anos)</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="3º Ano EM">3º Ano — Ensino Médio (17 anos)</li>
                
                <!-- EJA & EDUCAÇÃO INCLUSIVA -->
                <li class="dropdown-item-header p-1.5 font-bold text-xs text-indigo-600 bg-indigo-50/70 rounded uppercase mt-1">EJA & Educação Inclusiva</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="EJA - Fund.">EJA — Ensino Fundamental</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="EJA - Médio">EJA — Ensino Médio</li>
                <li class="dropdown-item p-2.5 hover:bg-slate-50 rounded-lg text-sm cursor-pointer transition-colors text-slate-600" data-value="AEE / PEI">AEE / Educação Inclusiva (Adaptado)</li>
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
                            <button type="button" id="btn-modo-ia" onclick="criarMaterialView.setModoToggleIAField('ia')" class="mode-toggle-btn interactive-element ${campo.default === 'ia' ? 'mode-toggle-btn--active' : ''}">
                                <i class="fas fa-magic"></i> Gerar com IA
                                <span style="font-size: 0.5625rem; color: #94a3b8; font-weight: 400; text-transform: uppercase; letter-spacing: 0.05em; margin-left: 0.25rem;">(A partir do tema)</span>
                            </button>
                            <button type="button" id="btn-modo-manual" onclick="criarMaterialView.setModoToggleIAField('manual')" class="mode-toggle-btn interactive-element ${campo.default === 'manual' ? 'mode-toggle-btn--active' : ''}">
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
    setModoToggleIAField(modo) {
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
            if (materialPronto && this.pastaAtualId) {
                materialPronto.pastaId = this.pastaAtualId;
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
        const modalContainer = document.createElement('div');
        modalContainer.id = 'modal-bncc-container';
        modalContainer.style.cssText = 'width: 100%; max-height: 75vh; min-height: 480px; overflow-y: auto;';

        const modal = new ModalComponent({
            title: 'Selecionar Habilidade BNCC',
            icon: 'fa-search',
            maxWidth: '850px',
            content: modalContainer
        });

        modal.open();

        setTimeout(() => {
            if (window.bnccView) {
                window.bnccView.render(modalContainer, null, null, (habilidadeEscolhida) => {
                    const inputs = document.querySelectorAll(`input[data-field="${fieldLabel}"], input[data-field="Código BNCC (opcional)"], input[data-field="Campo de Experiência BNCC (opcional)"]`);
                    if (inputs && inputs.length > 0) {
                        inputs.forEach(inp => {
                            inp.value = habilidadeEscolhida.codigo;
                            inp.dispatchEvent(new Event('input', { bubbles: true }));
                            inp.dispatchEvent(new Event('change', { bubbles: true }));
                        });
                    }
                    modal.close();
                    Toast.show(`Habilidade ${habilidadeEscolhida.codigo} selecionada!`, 'success');
                });
            }
        }, 50);
    },
    modalImportarMaterial() {
        const todasPastas = model.state.pastasMateriais || [];
        const optionsPastas = `
            <option value="">Raiz (Sem pasta)</option>
            ${todasPastas.map(p => `<option value="${p.id}" ${String(p.id) === String(this.pastaAtualId) ? 'selected' : ''}>📁 ${window.escapeHTML(p.nome)}</option>`).join('')}
        `;

        const modalHtml = `
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-xl); padding: 1.25rem; text-align: center;">
                    <div id="dropzone-import" style="border: 2px dashed #cbd5e1; border-radius: var(--radius-lg); padding: 2rem 1rem; background-color: #ffffff; cursor: pointer; transition: all 0.2s;"
                         onclick="document.getElementById('input-arquivo-import').click()"
                         ondragover="event.preventDefault(); this.style.borderColor='#4f46e5'; this.style.backgroundColor='#eef2ff';"
                         ondragleave="this.style.borderColor='#cbd5e1'; this.style.backgroundColor='#ffffff';"
                         ondrop="event.preventDefault(); this.style.borderColor='#cbd5e1'; this.style.backgroundColor='#ffffff'; if (event.dataTransfer.files.length) criarMaterialView.processarArquivoUpload(event.dataTransfer.files[0]);">
                        <input type="file" id="input-arquivo-import" accept=".doc,.docx,.pdf,.txt,.md" style="display: none;" onchange="if (this.files.length) criarMaterialView.processarArquivoUpload(this.files[0])">
                        <i class="fas fa-cloud-arrow-up" style="font-size: 2.5rem; color: #4f46e5; margin-bottom: 0.75rem;"></i>
                        <h4 style="font-size: 1rem; font-weight: 800; color: #1e293b; margin: 0 0 0.25rem 0;">Clique ou arraste seu arquivo aqui</h4>
                        <p style="font-size: 0.8125rem; color: #64748b; margin: 0;">Formatos suportados: <strong>Word (.docx, .doc)</strong>, <strong>PDF (.pdf)</strong>, <strong>Texto (.txt, .md)</strong></p>
                    </div>
                </div>

                <div id="import-processamento" class="hidden" style="text-align: center; padding: 1rem; background-color: #eef2ff; border-radius: var(--radius-lg);">
                    <i class="fas fa-circle-notch fa-spin" style="color: #4f46e5; margin-right: 0.5rem;"></i>
                    <span style="font-size: 0.8125rem; font-weight: 700; color: #4f46e5;">Extraindo conteúdo do documento...</span>
                </div>

                <div id="import-aviso-scanned" class="hidden" style="background-color: #fefce8; border: 1px solid #fef08a; padding: 0.875rem; border-radius: var(--radius-lg); font-size: 0.8125rem; color: #854d0e; display: flex; align-items: flex-start; gap: 0.5rem;">
                    <i class="fas fa-info-circle" style="color: #ca8a04; margin-top: 0.125rem; flex-shrink: 0;"></i>
                    <span id="import-aviso-texto"></span>
                </div>

                <div id="form-detalhes-import" class="hidden" style="display: flex; flex-direction: column; gap: 1rem;">
                    <!-- ESCOLHA DO MODO DE IMPORTAÇÃO -->
                    <div>
                        <label class="form-label" style="font-weight: 800; color: #334155; margin-bottom: 0.5rem;">Como você deseja salvar este material?</label>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem;">
                            <label id="label-modo-editavel" style="border: 2px solid #4f46e5; background-color: #eef2ff; border-radius: var(--radius-lg); padding: 0.75rem; cursor: pointer; display: flex; flex-direction: column; gap: 0.25rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <input type="radio" name="modo-importacao" value="editavel" checked onchange="criarMaterialView.alternarModoImport(this.value)">
                                    <strong style="font-size: 0.8125rem; color: #4f46e5;"><i class="fas fa-file-pen"></i> Material Editável</strong>
                                </div>
                                <span style="font-size: 0.6875rem; color: #64748b; margin-left: 1.5rem;">Converte o texto para edição, formatação LaTeX, IA e impressão.</span>
                            </label>

                            <label id="label-modo-documento" style="border: 2px solid #e2e8f0; background-color: #ffffff; border-radius: var(--radius-lg); padding: 0.75rem; cursor: pointer; display: flex; flex-direction: column; gap: 0.25rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <input type="radio" name="modo-importacao" value="documento" onchange="criarMaterialView.alternarModoImport(this.value)">
                                    <strong style="font-size: 0.8125rem; color: #334155;"><i class="fas fa-folder-tree"></i> Documento / Acervo</strong>
                                </div>
                                <span style="font-size: 0.6875rem; color: #64748b; margin-left: 1.5rem;">Arquiva o arquivo para organização e consulta do professor.</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label class="form-label">Título do Material</label>
                        <input type="text" id="import-titulo" class="form-input" placeholder="Ex: Avaliação Bimestral de Matemática">
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem;">
                        <div>
                            <label class="form-label">Disciplina</label>
                            <select id="import-disciplina" class="form-select">
                                ${(this.disciplinas || []).map(d => `<option value="${d}">${d}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Série / Ano</label>
                            <select id="import-serie" class="form-select">
                                ${(this.seriesDisponiveis || []).map(s => `<option value="${s}">${s}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Bimestre</label>
                            <select id="import-bimestre" class="form-select">
                                <option value="">Sem Bimestre</option>
                                ${(this.bimestresDisponiveis || []).map(b => `<option value="${b}">${b}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Organizar na Pasta</label>
                            <select id="import-pasta" class="form-select">
                                ${optionsPastas}
                            </select>
                        </div>
                    </div>

                    <!-- PRÉVIA DO TEXTO EXTRAÍDO -->
                    <div>
                        <label class="form-label" style="display: flex; justify-content: space-between;">
                            <span>Conteúdo Extraído (Prévia)</span>
                            <span id="import-tamanho-caracteres" style="font-size: 0.6875rem; color: #94a3b8;"></span>
                        </label>
                        <textarea id="import-preview-texto" class="form-input custom-scrollbar" rows="5" style="font-size: 0.8125rem; line-height: 1.5; font-family: monospace;"></textarea>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem;">
                        <button type="button" onclick="controller.closeModal()" class="btn-secondary">Cancelar</button>
                        <button type="button" id="btn-confirmar-import" onclick="criarMaterialView.salvarMaterialImportado()" class="btn-primary" style="background-color: #4f46e5;">
                            <i class="fas fa-check"></i> Concluir Importação
                        </button>
                    </div>
                </div>
            </div>
        `;

        controller.openModal('Importar Material (.docx, .doc, .pdf, .txt)', modalHtml);
    },

    async processarArquivoUpload(file) {
        if (!file) return;
        const procEl = document.getElementById('import-processamento');
        const formEl = document.getElementById('form-detalhes-import');
        const avisoScannedEl = document.getElementById('import-aviso-scanned');
        const avisoTextoEl = document.getElementById('import-aviso-texto');
        const dropzone = document.getElementById('dropzone-import');

        if (procEl) procEl.classList.remove('hidden');
        if (formEl) formEl.classList.add('hidden');
        if (avisoScannedEl) avisoScannedEl.classList.add('hidden');

        try {
            const doc = await extrairDocumentoCompleto(file);
            this.docImportadoTemp = { file, doc };

            if (procEl) procEl.classList.add('hidden');
            if (formEl) formEl.classList.remove('hidden');

            const tituloEl = document.getElementById('import-titulo');
            const previewEl = document.getElementById('import-preview-texto');
            const caracEl = document.getElementById('import-tamanho-caracteres');

            if (tituloEl) tituloEl.value = doc.titulo || file.name;
            if (previewEl) previewEl.value = doc.texto || doc.html || "";
            if (caracEl) caracEl.textContent = `${(doc.texto || '').length} caracteres extraídos`;

            if (dropzone) {
                dropzone.innerHTML = `
                    <i class="fas fa-file-circle-check" style="font-size: 2rem; color: #059669; margin-bottom: 0.5rem;"></i>
                    <h4 style="font-size: 0.9375rem; font-weight: 800; color: #065f46; margin: 0;">${window.escapeHTML(file.name)}</h4>
                    <p style="font-size: 0.75rem; color: #047857; margin: 0.25rem 0 0 0;">${(file.size / 1024).toFixed(1)} KB • Clique para trocar de arquivo</p>
                `;
            }

            if (doc.aviso) {
                if (avisoScannedEl && avisoTextoEl) {
                    avisoTextoEl.textContent = doc.aviso;
                    avisoScannedEl.classList.remove('hidden');
                }
                if (!doc.sucesso) {
                    this.alternarModoImport('documento');
                    const radioDoc = document.querySelector('input[name="modo-importacao"][value="documento"]');
                    if (radioDoc) radioDoc.checked = true;
                }
            }
        } catch (err) {
            console.error("Erro no processamento do upload:", err);
            if (procEl) procEl.classList.add('hidden');
            Toast.show("Erro ao ler o arquivo fornecido.", "error");
        }
    },

    alternarModoImport(modo) {
        const labelEditavel = document.getElementById('label-modo-editavel');
        const labelDoc = document.getElementById('label-modo-documento');
        if (modo === 'editavel') {
            if (labelEditavel) { labelEditavel.style.borderColor = '#4f46e5'; labelEditavel.style.backgroundColor = '#eef2ff'; }
            if (labelDoc) { labelDoc.style.borderColor = '#e2e8f0'; labelDoc.style.backgroundColor = '#ffffff'; }
        } else {
            if (labelEditavel) { labelEditavel.style.borderColor = '#e2e8f0'; labelEditavel.style.backgroundColor = '#ffffff'; }
            if (labelDoc) { labelDoc.style.borderColor = '#4f46e5'; labelDoc.style.backgroundColor = '#eef2ff'; }
        }
    },

    async salvarMaterialImportado() {
        if (!this.docImportadoTemp || !this.docImportadoTemp.file) {
            return Toast.show("Nenhum arquivo carregado para importação.", "warning");
        }
        const { file, doc } = this.docImportadoTemp;
        const titulo = document.getElementById('import-titulo')?.value.trim() || doc.titulo || file.name;
        const disciplina = document.getElementById('import-disciplina')?.value || 'Geral';
        const serie = document.getElementById('import-serie')?.value || 'Geral';
        const bimestre = document.getElementById('import-bimestre')?.value || '';
        const pastaId = document.getElementById('import-pasta')?.value || null;
        const modo = document.querySelector('input[name="modo-importacao"]:checked')?.value || 'editavel';
        const previewEditado = document.getElementById('import-preview-texto')?.value || doc.texto || '';

        const htmlConteudo = modo === 'editavel'
            ? (doc.html && previewEditado === doc.texto ? doc.html : previewEditado.split('\n\n').map(p => `<p>${window.escapeHTML(p)}</p>`).join('\n'))
            : `
                <div class="documento-importado-card" style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="width: 3rem; height: 3rem; border-radius: 0.75rem; background-color: #eef2ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                                <i class="fas fa-file-lines"></i>
                            </div>
                            <div>
                                <h3 style="margin: 0; font-size: 1.125rem; font-weight: 800; color: #1e293b;">${window.escapeHTML(file.name)}</h3>
                                <p style="margin: 0.25rem 0 0 0; font-size: 0.8125rem; color: #64748b;">
                                    Tamanho: ${(file.size / 1024).toFixed(1)} KB • Formato: .${doc.extensao.toUpperCase()} • Importado em: ${new Date().toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="documento-importado-texto" style="line-height: 1.6; color: #334155;">
                    ${previewEditado ? previewEditado.split('\n\n').map(p => `<p>${window.escapeHTML(p)}</p>`).join('\n') : '<p style="color: #94a3b8; font-style: italic;">Documento arquivado no acervo.</p>'}
                </div>
            `;

        const novoMaterial = {
            id: generateId('mat_imp'),
            titulo: titulo,
            tema: titulo,
            disciplina: disciplina,
            serie: serie,
            bimestre: bimestre,
            tipo: modo === 'editavel' ? 'atividade-imprimivel' : 'documento-importado',
            pastaId: pastaId || null,
            modoImportacao: modo,
            arquivoOriginalNome: file.name,
            arquivoTamanho: file.size,
            arquivoExtensao: doc.extensao,
            conteudo_html: htmlConteudo,
            criadoEm: new Date().toISOString(),
            data: new Date().toLocaleDateString('pt-BR'),
            origem: 'importado'
        };

        await model.salvarMaterialGerado(novoMaterial);
        Toast.show("Material importado e salvo com sucesso!", "success");
        controller.closeModal();
        this.docImportadoTemp = null;

        if (this.abaAtiva === 'meus') {
            this.render('view-container');
        } else {
            this.mudarAba('meus');
        }

        if (modo === 'editavel' && window.conteudoGeradoView) {
            window.conteudoGeradoView.setMaterial(novoMaterial.id);
            controller.navigate('conteudo-gerado');
        }
    }
};
if (typeof window !== 'undefined') window.criarMaterialView = criarMaterialView;

