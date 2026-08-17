import { uiController } from './controllers/uiController.js';

export const routeRegistry = {
    dashboard: { label: 'Visão Geral', navId: 'nav-dashboard' },
    biblioteca: { label: 'Meus materiais', navId: 'nav-biblioteca' },
    'criar-material': { label: 'Criar Material', navId: 'nav-criar-material' },
    turmas: { label: 'Turmas', navId: 'nav-turmas' },
    'quiz-gestor': { label: 'Quiz ao vivo', navId: 'nav-quiz-gestor' },
    correcao: { label: 'Correção IA', navId: 'nav-correcao' },
    simuladores: { label: 'Simulações', navId: 'nav-simuladores' },
    periodo: { label: 'Planejamento / Por Período', navId: 'nav-periodo' },
    mensal: { label: 'Planejamento / Mensal', navId: 'nav-mensal' },
    dia: { label: 'Planejamento / Diário', navId: 'nav-dia' },
    provas: { label: 'Acadêmico / Gerador de Provas', navId: 'nav-provas' },
    'stats-provas': { label: 'Estatísticas de Avaliações', navId: 'nav-provas' },
    bncc: { label: 'Acadêmico / BNCC', navId: 'nav-bncc' },
    bimestralizacao: { label: 'Bimestralizações (Formosa)', navId: 'nav-bimestralizacao' },
    comunidade: { label: 'Comunidade / Banco de Questões', navId: 'nav-comunidade' },
    frequencia: { label: 'Acadêmico / Frequência', navId: 'nav-frequencia' },
    horario: { label: 'Grade Horária', navId: 'nav-horario' },
    mapa: { label: 'Acadêmico / Mapa de Sala', navId: 'nav-mapa' },
    'notas-anuais': { label: 'Notas Anuais', navId: 'nav-notas-anuais' },
    'ata-conselho': { label: 'Ata do Conselho de Classe', navId: 'nav-ata-conselho' },
    'conteudo-gerado': { label: 'Material Pedagógico', navId: 'nav-biblioteca' },
    'quiz-player': { label: 'Apresentação de Quiz', navId: 'nav-quiz-gestor' },
    'quiz-aluno': { label: 'Participar de Quiz', navId: 'nav-quiz-gestor' },
    'estudos-visuais': { label: 'Flashcards & Mapas Mentais', navId: 'nav-estudos-visuais' },
    apresentacoes: { label: 'Apresentações Animadas', navId: 'nav-apresentacoes' },
    'apresentador-player': { label: 'Player de Apresentação', navId: 'nav-apresentacoes' },
    config: { label: 'Configurações', navId: 'nav-config' }
};

export const routeAliases = {
    planejamento: 'periodo',
    diario: 'dia',
    sala: 'mapa',
    settings: 'config',
    'mapa-sala': 'mapa',
    'conselho-classe': 'ata-conselho',
    'conselho': 'ata-conselho',
    bimestralizacoes: 'bimestralizacao',
    'bimestralizacao-formosa': 'bimestralizacao',
    'material-gerado': 'conteudo-gerado',
    'quiz-game': 'quiz-player',
    'quiz-entrar': 'quiz-aluno',
    'quiz-participar': 'quiz-aluno',
    flashcards: 'estudos-visuais',
    mindmaps: 'estudos-visuais',
    'mapas-mentais': 'estudos-visuais',
    slides: 'apresentacoes',
    powerpoint: 'apresentacoes',
    pptx: 'apresentacoes'
};

export const router = {
    routes: routeRegistry,
    aliases: routeAliases,
    resolve(viewName = 'dashboard') {
        const alias = this.aliases[viewName];
        const target = alias || viewName;
        return this.routes[target] ? target : 'dashboard';
    },
    getLabel(viewName) {
        const resolved = this.resolve(viewName);
        return this.routes[resolved]?.label || 'Página';
    },
    initNavigation() {
        if (!document || !document.querySelectorAll) return;
        document.querySelectorAll('[data-route]').forEach(el => {
            el.addEventListener('click', () => {
                const route = el.getAttribute('data-route');
                if (route && window.controller && typeof window.controller.navigate === 'function') {
                    window.controller.navigate(route);
                }
            });
        });
    }
};

if (typeof window !== 'undefined') {
    window.appRouter = router;
}
