import { model } from '../model.js';
import { Toast } from '../components/toast.js';

export const uiController = {
    // No seu uiController.js
openModal(titulo, conteudo, tamanho = 'medium') {
    const modal = document.getElementById('global-modal');
    if (!modal) return;

    const tamanhos = {
        'small': 'max-w-md',
        'medium': 'max-w-2xl',
        'large': 'max-w-5xl'
    };

    modal.innerHTML = `
        <div class="bg-white w-full ${tamanhos[tamanho]} rounded-[2.5rem] shadow-2xl overflow-hidden animate-pop-in relative border border-slate-100">
            <div class="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <h3 class="text-xl font-black text-slate-800 tracking-tight">${titulo}</h3>
                <button onclick="controller.closeModal()" class="w-10 h-10 rounded-full hover:bg-white hover:shadow-sm flex items-center justify-center text-slate-400 hover:text-red-500 transition-all">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="max-h-[80vh] overflow-y-auto custom-scrollbar">
                ${conteudo}
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    // Forçamos o body a não ter scroll enquanto o modal estiver aberto
    document.body.style.overflow = 'hidden';
},

closeModal() {
    const modal = document.getElementById('global-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
},

    confirmarAcao(titulo, mensagem, callbackConfirmacao) {
        const html = `
            <div class="p-8 text-center">
                <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-800 mb-2">${titulo}</h3>
                <p class="text-slate-500 mb-8 leading-relaxed">${mensagem}</p>
                <div class="flex gap-3 justify-center">
                    <button onclick="controller.closeModal()" class="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition">Cancelar</button>
                    <button id="btn-confirm-action" class="px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition shadow-lg shadow-red-500/30">Confirmar</button>
                </div>
            </div>
        `;
        this.openModal('Confirmação', html);
        setTimeout(() => {
            const btn = document.getElementById('btn-confirm-action');
            if (btn) {
                btn.onclick = () => {
                    callbackConfirmacao();
                    this.closeModal();
                };
            }
        }, 50);
    },

    // --- Navegação e UX ---
    toggleSidebar() {
        const sidebar = document.getElementById('app-sidebar');
        const main = document.getElementById('main-content');
        const icon = document.getElementById('sidebar-toggle-icon');
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            sidebar.classList.toggle('mobile-open');
            sidebar.classList.toggle('collapsed', !sidebar.classList.contains('mobile-open'));
        } else {
            sidebar.classList.toggle('collapsed');
            main.classList.toggle('expanded-content');
        }
        if (icon) {
            icon.className = (sidebar.classList.contains('collapsed') && !sidebar.classList.contains('mobile-open')) ? 'fas fa-bars' : 'fas fa-chevron-left';
        }
    },

    updateNavHighlight(viewName) {
        document.querySelectorAll('nav button').forEach(btn => {
            btn.classList.remove('bg-white/10', 'text-white');
            btn.classList.add('text-slate-400');
        });
        let activeBtn = document.getElementById(`nav-${viewName}`);
        if (!activeBtn) {
            const mapId = { 'periodo': 'planejamento', 'dia': 'diario', 'mapa': 'sala', 'frequencia': 'frequencia', 'config': 'settings' };
            if (mapId[viewName]) activeBtn = document.getElementById(`nav-${mapId[viewName]}`);
        }
        if (activeBtn) {
            activeBtn.classList.add('bg-white/10', 'text-white');
            activeBtn.classList.remove('text-slate-400');
        }
    },

    updateBreadcrumb(viewName) {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;
        const map = {
            'dashboard': 'Visão Geral', 'mensal': 'Planejamento / Mensal',
            'periodo': 'Planejamento / Por Período', 'dia': 'Planejamento / Diário',
            'turmas': 'Acadêmico / Turmas', 'bncc': 'Acadêmico / BNCC',
            'mapa': 'Acadêmico / Mapa de Sala', 'provas': 'Acadêmico / Gerador de Provas',
            'config': 'Configurações'
        };
        breadcrumb.innerHTML = `<i class="fas fa-home text-slate-300"></i> <span class="text-slate-300">/</span> ${map[viewName] || viewName}`;
    },

    renderSkeleton(container, viewName) {
        const skeletons = {
            dashboard: `<div class="animate-pulse space-y-4 fade-in"><div class="h-8 bg-slate-200 rounded w-1/3 mb-6"></div><div class="grid grid-cols-1 md:grid-cols-3 gap-6"><div class="h-32 bg-slate-200 rounded-2xl"></div><div class="h-32 bg-slate-200 rounded-2xl"></div><div class="h-32 bg-slate-200 rounded-2xl"></div></div><div class="h-64 bg-slate-200 rounded-2xl mt-6"></div></div>`,
            turmas: `<div class="animate-pulse fade-in"><div class="flex justify-between items-center mb-6"><div class="h-8 bg-slate-200 rounded w-48"></div><div class="h-10 bg-slate-200 rounded w-32"></div></div><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><div class="h-40 bg-slate-200 rounded-2xl"></div><div class="h-40 bg-slate-200 rounded-2xl"></div><div class="h-40 bg-slate-200 rounded-2xl"></div></div></div>`,
            generic: `<div class="animate-pulse p-4 fade-in"><div class="h-8 bg-slate-200 rounded w-1/4 mb-8"></div><div class="space-y-4"><div class="h-4 bg-slate-200 rounded w-3/4"></div><div class="h-4 bg-slate-200 rounded w-full"></div><div class="h-4 bg-slate-200 rounded w-5/6"></div></div></div>`
        };
        container.innerHTML = skeletons[viewName] || skeletons.generic;
    },

    aplicarTema() {
        if (model.state.userConfig && model.state.userConfig.themeColor) {
            document.documentElement.style.setProperty('--primary-color', model.state.userConfig.themeColor);
        }
    }
};