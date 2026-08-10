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
    'feriado_nac': { label: 'Feriado Nacional', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
    'feriado_est': { label: 'Feriado Estadual', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
    'feriado_mun': { label: 'Feriado Municipal', bg: '#ffe4e6', color: '#be123c', border: '#fda4af' },
    'recesso': { label: 'Recesso Escolar', bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' },
    'ferias': { label: 'Férias Escolares', bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
    'retorno_adm': { label: 'Retorno Admin.', bg: '#e2e8f0', color: '#334155', border: '#cbd5e1' },
    'modulacao': { label: 'Modulação', bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' },
    'plan_pedag': { label: 'Planej. Pedagógico', bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
    'reuniao_ped': { label: 'Reunião Pedagógica', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
    'conselho': { label: 'Conselho de Classe', bg: '#d1fae5', color: '#047857', border: '#a7f3d0' },
    'reuniao_pais': { label: 'Reunião de Pais', bg: '#ccfbf1', color: '#0f766e', border: '#99f6e4' },
    'avaliacao': { label: 'Avaliação Periódica', bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff' },
    'inicio_per': { label: 'Início do Período', bg: '#ecfccb', color: '#3f6212', border: '#d9f99d' },
    'aula': { label: 'Dia Letivo', bg: '#ffffff', color: '#334155', border: '#e2e8f0' }
};
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
    materiaisGerados: [],
    quizzes: [],
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