/**
 * @file uiController.js
 * @description Gerencia a interface do usuário (Modais, Sidebar, Navegação e Temas).
 * @module controllers/uiController
 */

import { model } from '../model.js';
import { Toast } from '../components/toast.js';

/**
 * Controlador de Interface do Usuário.
 * @namespace uiController
 */
export const uiController = {

    /**
     * Abre um modal global com conteúdo dinâmico.
     * @param {string} titulo - Título do modal.
     * @param {string} conteudo - String HTML do conteúdo.
     * @param {'small'|'medium'|'large'} [tamanho='medium'] - Largura do modal.
     */
    openModal(titulo, conteudo, tamanho = 'medium') {
        const modal = document.getElementById('global-modal');
        if (!modal) return;

        const tamanhos = {
            'small': 'max-w-md',
            'medium': 'max-w-2xl',
            'large': 'max-w-6xl' // Aumentei levemente o large para melhor aproveitamento em telas wide
        };

        const classeTamanho = tamanhos[tamanho] || tamanhos['medium'];

        modal.innerHTML = `
        <div class="bg-white w-full ${classeTamanho} rounded-[2.5rem] shadow-2xl overflow-hidden animate-pop-in relative border border-slate-100 mx-4 md:mx-0 flex flex-col max-h-[90vh]">
            <div class="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 shrink-0">
                <h3 class="text-xl font-black text-slate-800 tracking-tight">${titulo}</h3>
                <button onclick="uiController.closeModal()" class="w-10 h-10 rounded-full hover:bg-white hover:shadow-sm flex items-center justify-center text-slate-400 hover:text-red-500 transition-all">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="overflow-y-auto custom-scrollbar p-0 flex-1 relative">
                ${conteudo}
            </div>
        </div>
        `;
        
        modal.classList.remove('hidden');
        modal.style.zIndex = '50'; // Garante que fique acima de tudo
        document.body.style.overflow = 'hidden'; // Trava o scroll do fundo
    },

    /**
     * Fecha o modal global e restaura o scroll da página.
     */
    closeModal() {
        const modal = document.getElementById('global-modal');
        if (modal) {
            modal.classList.add('hidden');
            // Limpa o conteúdo para economizar memória e parar vídeos/iframes se houver
            setTimeout(() => { modal.innerHTML = ''; }, 300); 
        }
        document.body.style.overflow = '';
    },

    /**
     * Exibe um modal de confirmação padronizado.
     * @param {string} titulo 
     * @param {string} mensagem 
     * @param {Function} callbackConfirmacao - Função executada ao confirmar.
     */
    confirmarAcao(titulo, mensagem, callbackConfirmacao) {
        const html = `
            <div class="p-8 text-center">
                <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-800 mb-2">${titulo}</h3>
                <p class="text-slate-500 mb-8 leading-relaxed">${mensagem}</p>
                <div class="flex gap-3 justify-center">
                    <button onclick="uiController.closeModal()" class="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition">Cancelar</button>
                    <button id="btn-confirm-action" class="px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition shadow-lg shadow-red-500/30">Confirmar</button>
                </div>
            </div>
        `;
        
        this.openModal('Confirmação', html, 'small');
        
        // Timeout para garantir que o elemento existe no DOM antes de atrelar o evento
        setTimeout(() => {
            const btn = document.getElementById('btn-confirm-action');
            if (btn) {
                btn.onclick = () => {
                    callbackConfirmacao();
                    this.closeModal();
                };
                // Foco automático no botão de confirmar para acessibilidade e rapidez
                btn.focus();
            }
        }, 50);
    },

    /**
     * Alterna a visibilidade/tamanho da barra lateral (Sidebar).
     */
    toggleSidebar() {
        const sidebar = document.getElementById('app-sidebar');
        const main = document.getElementById('main-content');
        const icon = document.getElementById('sidebar-toggle-icon');
        
        if (!sidebar || !main) return;

        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            sidebar.classList.toggle('mobile-open');
            // Remove 'collapsed' se estiver abrindo no mobile
            if (sidebar.classList.contains('mobile-open')) {
                sidebar.classList.remove('collapsed');
            }
        } else {
            sidebar.classList.toggle('collapsed');
            main.classList.toggle('expanded-content');
        }

        // Atualiza o ícone do botão de toggle
        if (icon) {
            const isCollapsed = sidebar.classList.contains('collapsed');
            const isMobileOpen = sidebar.classList.contains('mobile-open');
            
            icon.className = (isCollapsed && !isMobileOpen) ? 'fas fa-bars' : 'fas fa-chevron-left';
        }
    },

    /**
     * Atualiza o destaque visual do botão de navegação ativo.
     * @param {string} viewName - Nome da view atual (ex: 'dashboard', 'turmas').
     */
    updateNavHighlight(viewName) {
        // Remove destaque de todos
        document.querySelectorAll('nav button').forEach(btn => {
            btn.classList.remove('bg-white/10', 'text-white', 'shadow-inner');
            btn.classList.add('text-slate-400', 'hover:bg-white/5');
        });

        // Mapeamento de sub-rotas para botões principais
        const mapId = { 
            'periodo': 'planejamento', 
            'dia': 'diario', 
            'mapa': 'sala', 
            'frequencia': 'frequencia', 
            'config': 'settings',
            'mensal': 'mensal' 
        };

        // Tenta encontrar o botão direto ou via mapa
        let activeBtn = document.getElementById(`nav-${viewName}`);
        if (!activeBtn && mapId[viewName]) {
            activeBtn = document.getElementById(`nav-${mapId[viewName]}`);
        }

        // Aplica destaque
        if (activeBtn) {
            activeBtn.classList.add('bg-white/10', 'text-white', 'shadow-inner');
            activeBtn.classList.remove('text-slate-400', 'hover:bg-white/5');
        }
    },

    /**
     * Atualiza o texto do Breadcrumb (caminho de navegação).
     * @param {string} viewName 
     */
    updateBreadcrumb(viewName) {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;

        const map = {
            'dashboard': 'Visão Geral',
            'mensal': 'Planejamento / Mensal',
            'periodo': 'Planejamento / Por Período',
            'dia': 'Planejamento / Diário',
            'turmas': 'Acadêmico / Turmas',
            'bncc': 'Acadêmico / BNCC',
            'mapa': 'Acadêmico / Mapa de Sala',
            'provas': 'Acadêmico / Gerador de Provas',
            'frequencia': 'Acadêmico / Frequência',
            'comunidade': 'Comunidade / Banco de Questões',
            'estatisticas': 'Analytics / Desempenho',
            'config': 'Configurações'
        };

        const label = map[viewName] || viewName.charAt(0).toUpperCase() + viewName.slice(1);
        breadcrumb.innerHTML = `<i class="fas fa-home text-slate-300"></i> <span class="text-slate-300 mx-2">/</span> ${label}`;
    },

    /**
     * Renderiza esqueletos de carregamento (Loading Skeletons) enquanto os dados não chegam.
     * @param {HTMLElement} container 
     * @param {string} viewName 
     */
    renderSkeleton(container, viewName) {
        if (!container) return;

        const skeletons = {
            dashboard: `
                <div class="animate-pulse space-y-4 fade-in">
                    <div class="h-8 bg-slate-200 rounded w-1/3 mb-6"></div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="h-32 bg-slate-200 rounded-2xl"></div>
                        <div class="h-32 bg-slate-200 rounded-2xl"></div>
                        <div class="h-32 bg-slate-200 rounded-2xl"></div>
                    </div>
                    <div class="h-64 bg-slate-200 rounded-2xl mt-6"></div>
                </div>`,
            
            turmas: `
                <div class="animate-pulse fade-in">
                    <div class="flex justify-between items-center mb-6">
                        <div class="h-8 bg-slate-200 rounded w-48"></div>
                        <div class="h-10 bg-slate-200 rounded w-32"></div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div class="h-40 bg-slate-200 rounded-2xl"></div>
                        <div class="h-40 bg-slate-200 rounded-2xl"></div>
                        <div class="h-40 bg-slate-200 rounded-2xl"></div>
                    </div>
                </div>`,
            
            generic: `
                <div class="animate-pulse p-4 fade-in">
                    <div class="h-8 bg-slate-200 rounded w-1/4 mb-8"></div>
                    <div class="space-y-4">
                        <div class="h-4 bg-slate-200 rounded w-3/4"></div>
                        <div class="h-4 bg-slate-200 rounded w-full"></div>
                        <div class="h-4 bg-slate-200 rounded w-5/6"></div>
                    </div>
                </div>`
        };

        container.innerHTML = skeletons[viewName] || skeletons.generic;
    },

    /**
     * Aplica a cor de tema definida pelo usuário nas variáveis CSS globais.
     */
    aplicarTema() {
        if (model?.state?.userConfig?.themeColor) {
            document.documentElement.style.setProperty('--primary-color', model.state.userConfig.themeColor);
            
            // Opcional: Calcular cor de hover/fundo baseado na primária se necessário
            // document.documentElement.style.setProperty('--primary-hover', adjustColor(model.state.userConfig.themeColor, -20));
        }
    }
};

// Exposição global para chamadas HTML (onclick="uiController.closeModal()")
if (typeof window !== 'undefined') {
    window.uiController = uiController;
}