// js/router.js
/**
 * ==========================================================================
 * ROUTER & ROUTE GUARDS (VANILLA MVC)
 * Gerenciamento centralizado de rotas, aliases, lazy-loading e Route Guards.
 * ==========================================================================
 */

import { firebaseService } from './firebase-service.js';

export const routeRegistry = {
    dashboard: { label: 'Visão Geral', navId: 'nav-dashboard', requiresAuth: false, offlineSupported: true },
    'materiais-comunidade': { label: 'Materiais & Comunidade', navId: 'nav-materiais-comunidade', requiresAuth: false, offlineSupported: true },
    biblioteca: { label: 'Meus materiais', navId: 'nav-materiais-comunidade', requiresAuth: false, offlineSupported: true },
    'criar-material': { label: 'Criar Material', navId: 'nav-materiais-comunidade', requiresAuth: false, offlineSupported: true },
    turmas: { label: 'Turmas', navId: 'nav-turmas', requiresAuth: false, offlineSupported: true },
    interatividades: { label: 'Interatividades Pedagógicas', navId: 'nav-interatividades', requiresAuth: false, offlineSupported: true },
    'quiz-gestor': { label: 'Quiz ao vivo', navId: 'nav-interatividades', requiresAuth: true, offlineSupported: false, authMessage: 'Para gerenciar sessões de Quiz ao vivo em tempo real, conecte sua conta Google.' },
    correcao: { label: 'Correção IA', navId: 'nav-correcao', requiresAuth: false, offlineSupported: true },
    simuladores: { label: 'Simulações', navId: 'nav-interatividades', requiresAuth: false, offlineSupported: true },
    periodo: { label: 'Planejamento / Por Período', navId: 'nav-periodo', requiresAuth: false, offlineSupported: true },
    mensal: { label: 'Planejamento / Mensal', navId: 'nav-mensal', requiresAuth: false, offlineSupported: true },
    dia: { label: 'Planejamento / Diário', navId: 'nav-dia', requiresAuth: false, offlineSupported: true },
    provas: { label: 'Acadêmico / Gerador de Provas', navId: 'nav-provas', requiresAuth: false, offlineSupported: true },
    'stats-provas': { label: 'Estatísticas de Avaliações', navId: 'nav-provas', requiresAuth: false, offlineSupported: true },
    bncc: { label: 'Acadêmico / BNCC', navId: 'nav-bncc', requiresAuth: false, offlineSupported: true },
    bimestralizacao: { label: 'Bimestralizações (Formosa)', navId: 'nav-bimestralizacao', requiresAuth: false, offlineSupported: true },
    comunidade: { label: 'Comunidade / Banco de Questões', navId: 'nav-materiais-comunidade', requiresAuth: false, offlineSupported: true },
    frequencia: { label: 'Acadêmico / Frequência', navId: 'nav-frequencia', requiresAuth: false, offlineSupported: true },
    horario: { label: 'Grade Horária', navId: 'nav-horario', requiresAuth: false, offlineSupported: true },
    mapa: { label: 'Acadêmico / Mapa de Sala', navId: 'nav-turmas', requiresAuth: false, offlineSupported: true },
    'notas-anuais': { label: 'Notas Anuais', navId: 'nav-notas-anuais', requiresAuth: false, offlineSupported: true },
    'ata-conselho': { label: 'Ata do Conselho de Classe', navId: 'nav-ata-conselho', requiresAuth: false, offlineSupported: true },
    'conteudo-gerado': { label: 'Material Pedagógico', navId: 'nav-materiais-comunidade', requiresAuth: false, offlineSupported: true },
    'quiz-player': { label: 'Apresentação de Quiz', navId: 'nav-interatividades', requiresAuth: false, offlineSupported: true },
    'quiz-aluno': { label: 'Participar de Quiz', navId: 'nav-interatividades', requiresAuth: false, offlineSupported: true },
    'estudos-visuais': { label: 'Flashcards & Mapas Mentais', navId: 'nav-estudos-visuais', requiresAuth: false, offlineSupported: true },
    apresentacoes: { label: 'Apresentações Animadas', navId: 'nav-interatividades', requiresAuth: false, offlineSupported: true },
    'apresentador-player': { label: 'Player de Apresentação', navId: 'nav-interatividades', requiresAuth: false, offlineSupported: true },
    coordenacao: { label: 'Coordenação Pedagógica', navId: 'nav-coordenacao', requiresAuth: false, offlineSupported: true },
    pdi: { label: 'Plano de Desenvolvimento Individual (PDI/PEI)', navId: 'nav-pdi', requiresAuth: false, offlineSupported: true },
    config: { label: 'Configurações', navId: 'nav-config', requiresAuth: false, offlineSupported: true }
};

export const routeAliases = {
    interatividade: 'interatividades',
    'quiz-gestor': 'interatividades',
    apresentacoes: 'interatividades',
    simuladores: 'interatividades',
    slides: 'interatividades',
    powerpoint: 'interatividades',
    pptx: 'interatividades',
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
    'mapas-mentais': 'estudos-visuais'
};

export const viewModuleMap = {
    dashboard: () => import('./views/dashboard.js'),
    'materiais-comunidade': () => import('./views/criarMaterial.js'),
    biblioteca: () => import('./views/criarMaterial.js'),
    'criar-material': () => import('./views/criarMaterial.js'),
    turmas: () => import('./views/turmas.js'),
    interatividades: () => import('./views/interatividades.js'),
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
    _guards: [],

    /**
     * Resolve o nome canônico de uma rota a partir de um alias.
     * @param {string} viewName 
     * @returns {string}
     */
    resolve(viewName = 'dashboard') {
        const alias = this.aliases[viewName];
        const target = alias || viewName;
        return this.routes[target] ? target : 'dashboard';
    },

    /**
     * Registra um middleware / guard de navegação que executa antes da troca de view.
     * @param {Function} guardFn (targetRoute, routeConfig) => boolean | Promise<boolean>
     */
    beforeEach(guardFn) {
        if (typeof guardFn === 'function') {
            this._guards.push(guardFn);
        }
    },

    /**
     * Avalia se a rota pode ser ativada com base no estado de autenticação e rede.
     * @param {string} viewName 
     * @returns {Promise<{ canActivate: boolean, redirect?: string, message?: string }>}
     */
    async canActivate(viewName) {
        const resolved = this.resolve(viewName);
        const config = this.routes[resolved] || {};

        // 1. Verificação de autenticação para rotas estritamente de nuvem
        if (config.requiresAuth) {
            const currentUser = firebaseService?.auth?.currentUser;
            if (!currentUser) {
                return {
                    canActivate: false,
                    redirect: 'dashboard',
                    message: config.authMessage || 'Esta funcionalidade requer autenticação com conta Google.'
                };
            }
        }

        // 2. Executa guardas customizados registrados
        for (const guard of this._guards) {
            try {
                const result = await guard(resolved, config);
                if (result === false) {
                    return { canActivate: false, redirect: 'dashboard' };
                }
                if (typeof result === 'object' && result.canActivate === false) {
                    return result;
                }
            } catch (err) {
                console.warn(`[router] Erro no guard de rota para '${resolved}':`, err);
            }
        }

        return { canActivate: true };
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
