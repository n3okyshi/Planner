/**
 * @typedef {Object} BNCC
 * @property {string} codigo
 * @property {string} descricao
 */

/**
 * @typedef {Object} Questao
 * @property {string} id
 * @property {string} enunciado
 * @property {string} [materia]
 * @property {string} [ano]
 * @property {string} tipo - 'multipla' | 'aberta'
 * @property {number} dificuldade - 0 (não definida), 1 (fácil), 2 (média), 3 (difícil)
 * @property {string[]} [alternativas]
 * @property {number} [correta]
 * @property {string} [gabarito]
 * @property {BNCC} [bncc]
 * @property {boolean} [compartilhada]
 */

/**
 * @typedef {Object} UserConfig
 * @property {string} themeColor
 * @property {string} periodType - 'bimestre' | 'trimestre' | 'semestre'
 * @property {string} [profName]
 * @property {string} [schoolName]
 */
export const coresComponentes = {
    "O eu, o outro e o nós": "#4f46e5",
    "Corpo, gestos e movimentos": "#0891b2",
    "Traços, sons, cores e formas": "#db2777",
    "Escuta, fala, pensamento e imaginação": "#7c3aed",
    "Espaços, tempos, quantidades, relações e transformações": "#059669",
    "Língua Portuguesa": "#2563eb",
    "Arte": "#db2777",
    "Educação Física": "#ea580c",
    "Língua Inglesa": "#475569",
    "Matemática": "#dc2626",
    "Ciências": "#16a34a",
    "Geografia": "#ca8a04",
    "História": "#9333ea",
    "Ensino Religioso": "#0d9488",
    "Linguagens e suas Tecnologias": "#2563eb",
    "Matemática e suas Tecnologias": "#dc2626",
    "Ciências da Natureza e suas Tecnologias": "#16a34a",
    "Ciências Humanas e Sociais Aplicadas": "#9333ea"
};
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


export const initialState = {
    /** @type {UserConfig} */
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