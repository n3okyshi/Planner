import { uiController } from './controllers/uiController.js';

export const routeRegistry = {
    dashboard: { label: 'Visão Geral', navId: 'nav-dashboard' },
    'materiais-comunidade': { label: 'Materiais & Comunidade', navId: 'nav-materiais-comunidade' },
    biblioteca: { label: 'Meus materiais', navId: 'nav-materiais-comunidade' },
    'criar-material': { label: 'Criar Material', navId: 'nav-materiais-comunidade' },
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
    comunidade: { label: 'Comunidade / Banco de Questões', navId: 'nav-materiais-comunidade' },
    frequencia: { label: 'Acadêmico / Frequência', navId: 'nav-frequencia' },
    horario: { label: 'Grade Horária', navId: 'nav-horario' },
    mapa: { label: 'Acadêmico / Mapa de Sala', navId: 'nav-mapa' },
    'notas-anuais': { label: 'Notas Anuais', navId: 'nav-notas-anuais' },
    'ata-conselho': { label: 'Ata do Conselho de Classe', navId: 'nav-ata-conselho' },
    'conteudo-gerado': { label: 'Material Pedagógico', navId: 'nav-materiais-comunidade' },
    'quiz-player': { label: 'Apresentação de Quiz', navId: 'nav-quiz-gestor' },
    'quiz-aluno': { label: 'Participar de Quiz', navId: 'nav-quiz-gestor' },
    'estudos-visuais': { label: 'Flashcards & Mapas Mentais', navId: 'nav-estudos-visuais' },
    apresentacoes: { label: 'Apresentações Animadas', navId: 'nav-apresentacoes' },
    'apresentador-player': { label: 'Player de Apresentação', navId: 'nav-apresentacoes' },
    coordenacao: { label: 'Coordenação Pedagógica', navId: 'nav-coordenacao' },
    pdi: { label: 'Plano de Desenvolvimento Individual (PDI/PEI)', navId: 'nav-pdi' },
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
    coordenador: 'coordenacao',
    pei: 'pdi',
    bimestralizacoes: 'bimestralizacao',
    'bimestralizacao-formosa': 'bimestralizacao',
    'material-gerado': 'conteudo-gerado',
    'meus-materiais': 'materiais-comunidade',
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

export const viewModuleMap = {
    dashboard: () => import('./views/dashboard.js'),
    'materiais-comunidade': () => import('./views/criarMaterial.js'),
    biblioteca: () => import('./views/criarMaterial.js'),
    'criar-material': () => import('./views/criarMaterial.js'),
    turmas: () => import('./views/turmas.js'),
    provas: () => import('./views/provas.js'),
    'stats-provas': () => import('./views/estatisticasProva.js'),
    correcao: () => import('./views/correcaoAutomatica.js'),
    simuladores: () => import('./views/simuladores.js'),
    periodo: () => import('./views/planejamento.js'),
    mensal: () => import('./views/mensal.js'),
    dia: () => import('./views/diario.js'),
    bncc: () => import('./views/bncc.js'),
    bimestralizacao: () => import('./views/bimestralizacao.js'),
    comunidade: () => import('./views/comunidade.js'),
    frequencia: () => import('./views/frequencia.js'),
    horario: () => import('./views/horario.js'),
    mapa: () => import('./views/sala.js'),
    'notas-anuais': () => import('./views/notasAnuais.js'),
    'ata-conselho': () => import('./views/ataConselho.js'),
    'conteudo-gerado': () => import('./views/conteudoGerado.js'),
    'quiz-gestor': () => import('./views/quizGestor.js'),
    'quiz-player': () => import('./views/quizPlayer.js'),
    'quiz-aluno': () => import('./views/quizAluno.js'),
    'estudos-visuais': () => import('./views/estudosVisuais.js'),
    apresentacoes: () => import('./views/apresentacoes.js'),
    'apresentador-player': () => import('./views/apresentadorPlayer.js'),
    coordenacao: () => import('./views/coordenacao.js'),
    pdi: () => import('./views/pdi.js'),
    config: () => import('./views/settings.js')
};

export const router = {
    routes: routeRegistry,
    aliases: routeAliases,
    modules: viewModuleMap,

    resolve(viewName = 'dashboard') {
        const alias = this.aliases[viewName];
        const target = alias || viewName;
        return this.routes[target] ? target : 'dashboard';
    },

    /**
     * Carrega dinamicamente o módulo JS da View sob demanda (Lazy-Loading)
     * @param {string} viewName 
     * @returns {Promise<Object|null>}
     */
    async loadViewModule(viewName) {
        const resolved = this.resolve(viewName);
        const loader = this.modules[resolved];
        if (typeof loader === 'function') {
            try {
                const module = await loader();
                return module;
            } catch (err) {
                console.warn(`[router] Erro no lazy-loading da view "${resolved}":`, err);
                return null;
            }
        }
        return null;
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
