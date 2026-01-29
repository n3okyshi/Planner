/**
 * @file state.js
 * @description Define o estado inicial da aplicação (Store), tipos globais e configurações estáticas.
 * @module models/state
 */

// =============================================================================
// DEFINIÇÕES DE TIPOS (JSDoc)
// =============================================================================

/**
 * @typedef {Object} BNCC
 * @property {string} codigo - Ex: EF01LP01
 * @property {string} descricao - Texto descritivo da habilidade.
 */

/**
 * @typedef {Object} Questao
 * @property {string} id - Identificador único.
 * @property {string} enunciado - Texto da questão.
 * @property {string} [materia] - Disciplina.
 * @property {string} [ano] - Ano escolar.
 * @property {string} tipo - 'multipla' | 'aberta'.
 * @property {number} dificuldade - 0 (não definida), 1 (fácil), 2 (média), 3 (difícil).
 * @property {string[]} [alternativas] - Lista de opções (se múltipla).
 * @property {number|null} [correta] - Índice da alternativa correta.
 * @property {string} [gabarito] - Texto de resposta ou explicação.
 * @property {BNCC} [bncc] - Habilidade vinculada.
 * @property {boolean} [compartilhada] - Se está pública na comunidade.
 * @property {string} [createdAt] - Data ISO de criação.
 * @property {string} [updatedAt] - Data ISO da última edição.
 */

/**
 * @typedef {Object} Aluno
 * @property {string} id
 * @property {string} nome
 * @property {Object.<string, number|string>} notas - Mapa de ID da avaliação -> Nota.
 * @property {Object.<string, string>} frequencia - Mapa de Data ISO -> Status ('P', 'F', 'J').
 */

/**
 * @typedef {Object} Avaliacao
 * @property {string} id
 * @property {string} nome
 * @property {number} max - Nota máxima.
 * @property {number|string} periodo - Bimestre/Trimestre ao qual pertence.
 */

/**
 * @typedef {Object} Turma
 * @property {string} id
 * @property {string} nome - Nome exibido (ex: "6º Ano A").
 * @property {string} nivel - Ex: "Ensino Fundamental".
 * @property {string} serie - Ex: "6º Ano".
 * @property {string} identificador - Ex: "A".
 * @property {Aluno[]} alunos
 * @property {Avaliacao[]} avaliacoes
 * @property {Object.<string, BNCC[]>} planejamento - Mapa de Periodo -> Lista de Habilidades.
 * @property {Object.<string, BNCC[]>} planejamentoMensal - Mapa de Mês -> Lista de Habilidades.
 */

/**
 * @typedef {Object} UserConfig
 * @property {string} themeColor - Cor primária do tema (Hex).
 * @property {string} periodType - 'bimestre' | 'trimestre' | 'semestre'.
 * @property {string} [profName]
 * @property {string} [schoolName]
 */

/**
 * @typedef {Object} AppState
 * @property {UserConfig} userConfig
 * @property {Turma[]} turmas
 * @property {Questao[]} questoes
 * @property {Object} eventos
 * @property {Object} planosDiarios
 * @property {Object} horario
 * @property {Object} periodosDatas
 * @property {Questao[]} questoesSistema
 * @property {boolean} isCloudSynced
 * @property {string} lastUpdate
 */

// =============================================================================
// CONFIGURAÇÕES ESTÁTICAS
// =============================================================================

/**
 * Mapeamento de cores padrão para cada componente curricular (BNCC).
 * Utilizado em badges, etiquetas e gráficos.
 * @constant
 */
export const coresComponentes = {
    "O eu, o outro e o nós": "#4f46e5", // Indigo
    "Corpo, gestos e movimentos": "#0891b2", // Cyan
    "Traços, sons, cores e formas": "#db2777", // Pink
    "Escuta, fala, pensamento e imaginação": "#7c3aed", // Violet
    "Espaços, tempos, quantidades, relações e transformações": "#059669", // Emerald
    "Língua Portuguesa": "#2563eb", // Blue
    "Arte": "#db2777", // Pink
    "Educação Física": "#ea580c", // Orange
    "Língua Inglesa": "#475569", // Slate
    "Matemática": "#dc2626", // Red
    "Ciências": "#16a34a", // Green
    "Geografia": "#ca8a04", // Yellow
    "História": "#9333ea", // Purple
    "Ensino Religioso": "#0d9488", // Teal
    "Linguagens e suas Tecnologias": "#2563eb",
    "Matemática e suas Tecnologias": "#dc2626",
    "Ciências da Natureza e suas Tecnologias": "#16a34a",
    "Ciências Humanas e Sociais Aplicadas": "#9333ea"
};

/**
 * Definições visuais e textuais para os tipos de eventos do calendário.
 * @constant
 */
export const tiposEventos = {
    'feriado_nac': { label: 'Feriado Nacional', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
    'feriado_est': { label: 'Feriado Estadual', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
    'feriado_mun': { label: 'Feriado Municipal', bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-200' },
    'recesso': { label: 'Recesso Escolar', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    'ferias': { label: 'Férias Escolares', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    'retorno_adm': { label: 'Retorno Admin.', bg: 'bg-slate-200', text: 'text-slate-700', border: 'border-slate-300' },
    'modulacao': { label: 'Modulação', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
    'plan_pedag': { label: 'Planej. Pedagógico', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    'reuniao_ped': { label: 'Reunião Pedagógica', bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
    'conselho': { label: 'Conselho de Classe', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    'reuniao_pais': { label: 'Reunião de Pais', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
    'avaliacao': { label: 'Avaliação Periódica', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    'inicio_per': { label: 'Início do Período', bg: 'bg-lime-100', text: 'text-lime-800', border: 'border-lime-200' },
    'aula': { label: 'Dia Letivo', bg: 'bg-white', text: 'text-slate-600', border: 'border-slate-200' }
};

// =============================================================================
// ESTADO INICIAL (STORE)
// =============================================================================

/**
 * Estado inicial da aplicação.
 * Serve como base para o 'model.state' e para resetar dados.
 * @type {AppState}
 */
export const initialState = {
    userConfig: {
        themeColor: '#0891b2',
        periodType: 'bimestre',
        profName: '',
        schoolName: ''
    },
    turmas: [],
    questoes: [],
    eventos: {},
    planosDiarios: {},
    horario: {
        config: { matutino: [], vespertino: [], noturno: [] },
        grade: { matutino: {}, vespertino: {}, noturno: {} }
    },
    // Datas pré-configuradas para o ano letivo de 2026
    periodosDatas: {
        'bimestre': [
            { nome: '1º Bimestre', inicio: '2026-01-16', fim: '2026-04-01' },
            { nome: '2º Bimestre', inicio: '2026-04-06', fim: '2026-06-30' },
            { nome: '3º Bimestre', inicio: '2026-08-03', fim: '2026-10-01' },
            { nome: '4º Bimestre', inicio: '2026-10-02', fim: '2026-12-22' }
        ],
        'trimestre': [
            { nome: '1º Trimestre', inicio: '2026-02-02', fim: '2026-05-15' },
            { nome: '2º Trimestre', inicio: '2026-05-18', fim: '2026-08-28' },
            { nome: '3º Trimestre', inicio: '2026-08-31', fim: '2026-12-18' }
        ],
        'semestre': [
            { nome: '1º Semestre', inicio: '2026-02-02', fim: '2026-07-03' },
            { nome: '2º Semestre', inicio: '2026-07-27', fim: '2026-12-18' }
        ]
    },
    questoesSistema: [],
    isCloudSynced: false,
    lastUpdate: new Date(0).toISOString()
};