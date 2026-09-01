/**
 * Controlador da Paleta de Comandos Global (Ctrl + K / Cmd + K)
 * Oferece busca instantânea e execução de atalhos em Vanilla JS.
 */
import { controller } from '../controller.js';
import { uiController } from './uiController.js';
import { provasView } from '../views/provas.js';
import { criarMaterialView } from '../views/criarMaterial.js';

export const commandPaletteController = {
    isOpen: false,
    selectedIndex: 0,
    filteredItems: [],

    actions: [
        // Ações Rápidas
        { id: 'nova-questao', title: 'Criar Nova Questão de Prova', icon: 'fas fa-plus-circle', category: 'Ações Rápidas', badge: 'Prova', action: () => { controller.navigate('provas'); setTimeout(() => provasView?.abrirModalCriacaoManual?.(), 200); } },
        { id: 'novo-diario', title: 'Lançar Novo Diário de Classe', icon: 'fas fa-book-open', category: 'Ações Rápidas', badge: 'Diário', action: () => controller.navigate('dia') },
        { id: 'toggle-theme', title: 'Alternar Tema Claro / Escuro', icon: 'fas fa-moon', category: 'Ações Rápidas', badge: 'Aparência', action: () => uiController.toggleTema() },
        { id: 'toggle-zen', title: 'Modo Apresentação / Foco (Projetor)', icon: 'fas fa-tv', category: 'Ações Rápidas', badge: 'Sala de Aula', action: () => uiController.toggleZenMode() },
        { id: 'backup-json', title: 'Fazer Backup Completo (JSON)', icon: 'fas fa-download', category: 'Ações Rápidas', badge: 'Backup', action: () => controller.exportData() },
        { id: 'imprimir', title: 'Imprimir / Gerar PDF da Página', icon: 'fas fa-print', category: 'Ações Rápidas', badge: 'PDF', action: () => window.print() },

        // Navegação
        { id: 'nav-dashboard', title: 'Painel Inicial (Dashboard)', icon: 'fas fa-home', category: 'Navegação', badge: 'Tela', action: () => controller.navigate('dashboard') },
        { id: 'nav-provas', title: 'Gerador de Provas & Avaliações', icon: 'fas fa-file-alt', category: 'Navegação', badge: 'Tela', action: () => controller.navigate('provas') },
        { id: 'nav-frequencia', title: 'Registro de Frequência & Chamada', icon: 'fas fa-check-double', category: 'Navegação', badge: 'Tela', action: () => controller.navigate('frequencia') },
        { id: 'nav-turmas', title: 'Gestão de Turmas & Estudantes', icon: 'fas fa-users', category: 'Navegação', badge: 'Tela', action: () => controller.navigate('turmas') },
        { id: 'nav-notas-anuais', title: 'Matriz de Notas & Recuperação', icon: 'fas fa-award', category: 'Navegação', badge: 'Tela', action: () => controller.navigate('notas-anuais') },
        { id: 'nav-ata-conselho', title: 'Ata do Conselho de Classe', icon: 'fas fa-clipboard-check', category: 'Navegação', badge: 'Tela', action: () => controller.navigate('ata-conselho') },
        { id: 'dashboard', title: 'Visão Geral / Dashboard', icon: 'fas fa-home', category: 'Navegação', badge: 'Tela', execute: () => controller.navigate('dashboard') },
        { id: 'planejamento', title: 'Planejamento de Aulas', icon: 'fas fa-calendar-alt', category: 'Navegação', badge: 'Tela', execute: () => controller.navigate('planejamento') },
        { id: 'diario', title: 'Diário de Classe', icon: 'fas fa-book', category: 'Navegação', badge: 'Tela', execute: () => controller.navigate('dia') },
        { id: 'mensal', title: 'Planejamento Mensal', icon: 'fas fa-calendar', category: 'Navegação', badge: 'Tela', execute: () => controller.navigate('mensal') },
        { id: 'horario', title: 'Grade de Horários', icon: 'fas fa-clock', category: 'Navegação', badge: 'Tela', execute: () => controller.navigate('horario') },
        { id: 'turmas', title: 'Gestão de Turmas e Alunos', icon: 'fas fa-users', category: 'Navegação', badge: 'Tela', execute: () => controller.navigate('turmas') },
        { id: 'notas-anuais', title: 'Notas Anuais e Boletim', icon: 'fas fa-chart-line', category: 'Navegação', badge: 'Tela', execute: () => controller.navigate('notas-anuais') },
        { id: 'bncc', title: 'Explorador da BNCC', icon: 'fas fa-graduation-cap', category: 'Navegação', badge: 'Tela', execute: () => controller.navigate('bncc') },
        { id: 'provas', title: 'Banco de Questões e Avaliações', icon: 'fas fa-file-signature', category: 'Navegação', badge: 'Tela', execute: () => controller.navigate('provas') },
        { id: 'criar-material', title: 'Estúdio de Criação de Materiais (IA)', icon: 'fas fa-magic', category: 'Navegação', badge: 'Tela', execute: () => controller.navigate('criar-material') },
        { id: 'estudos-visuais', title: 'Flashcards e Mapas Mentais', icon: 'fas fa-brain', category: 'Navegação', badge: 'Tela', execute: () => controller.navigate('estudos-visuais') },
        { id: 'simuladores', title: 'Laboratório e Simuladores Interativos', icon: 'fas fa-flask', category: 'Navegação', badge: 'Tela', execute: () => controller.navigate('simuladores') },
        { id: 'rubricas', title: 'Rubricas Avaliativas', icon: 'fas fa-table-list', category: 'Navegação', badge: 'Tela', execute: () => controller.navigate('rubricas') },
        { id: 'comunidade', title: 'Acervo da Comunidade Docente', icon: 'fas fa-globe', category: 'Navegação', badge: 'Tela', execute: () => controller.navigate('comunidade') },
        { id: 'relatorios', title: 'Relatórios e Pareceres Pedagógicos', icon: 'fas fa-file-alt', category: 'Navegação', badge: 'Tela', execute: () => controller.navigate('relatorios') },
        { id: 'correcao-automatica', title: 'Correção Automática de Redações e Textos', icon: 'fas fa-highlighter', category: 'Navegação', badge: 'Tela', execute: () => controller.navigate('correcao-automatica') },
        { id: 'novo-material', title: 'Criar Novo Material com IA...', icon: 'fas fa-wand-magic-sparkles', category: 'Ações Rápidas', badge: 'Ação', execute: () => { controller.navigate('criar-material'); setTimeout(() => { if (criarMaterialView) criarMaterialView.abrirModalCriarMaterial(); }, 150); } },
        { id: 'nova-questao', title: 'Criar Nova Questão...', icon: 'fas fa-plus-circle', category: 'Ações Rápidas', badge: 'Ação', execute: () => { controller.navigate('provas'); setTimeout(() => { if (provasView) provasView.abrirModalCriacaoManual(); }, 150); } },
        { id: 'importar-arquivo', title: 'Importar Arquivo Word / PDF / TXT...', icon: 'fas fa-file-import', category: 'Ações Rápidas', badge: 'Ação', execute: () => { controller.navigate('criar-material'); setTimeout(() => { if (criarMaterialView) criarMaterialView.modalImportarMaterial(); }, 150); } },
        { id: 'logout', title: 'Encerrar Sessão / Logout', icon: 'fas fa-sign-out-alt', category: 'Sistema', badge: 'Conta', execute: () => { if (controller && controller.handleLogout) controller.handleLogout(); } }
    ],

    init() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                this.toggle();
            }
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
            // Atalhos diretos de navegação Alt + 1 a Alt + 6
            if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                const rotasAlt = {
                    '1': 'dashboard',
                    '2': 'turmas',
                    '3': 'frequencia',
                    '4': 'dia',
                    '5': 'provas',
                    '6': 'criar-material'
                };
                if (rotasAlt[e.key]) {
                    e.preventDefault();
                    if (this.isOpen) this.close();
                    controller.navigate(rotasAlt[e.key]);
                }
            }
        });
    },

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    open() {
        this.isOpen = true;
        this.selectedIndex = 0;
        let container = document.getElementById('global-command-palette');
        if (!container) {
            container = document.createElement('div');
            container.id = 'global-command-palette';
            document.body.appendChild(container);
        }

        container.innerHTML = `
            <div class="cmd-palette-backdrop" data-action="cmd-palette-backdrop">
                <div class="cmd-palette-modal">
                    <div class="cmd-palette-header">
                        <i class="fas fa-search"></i>
                        <input type="text" id="cmd-palette-input" class="cmd-palette-input" placeholder="Digite um comando ou tela... (ex: provas, diário, bncc)" autocomplete="off" autofocus>
                        <span class="cmd-kbd">ESC</span>
                    </div>
                    <div id="cmd-palette-results" class="cmd-palette-body custom-scrollbar">
                    </div>
                    <div class="cmd-palette-footer">
                        <div style="display: flex; gap: 0.75rem; align-items: center;">
                            <span><span class="cmd-kbd">↑</span> <span class="cmd-kbd">↓</span> Navegar</span>
                            <span><span class="cmd-kbd">ENTER</span> Executar</span>
                        </div>
                        <span>Planner Pro v2.4</span>
                    </div>
                </div>
            </div>
        `;

        const input = document.getElementById('cmd-palette-input');
        if (input) {
            input.focus();
            input.addEventListener('input', (e) => this.filter(e.target.value));
            input.addEventListener('keydown', (e) => this.handleKeyDown(e));
        }

        if (typeof this._cleanupDelegator === 'function') {
            this._cleanupDelegator();
            this._cleanupDelegator = null;
        }

        this._cleanupDelegator = EventDelegator.bind(container, {
            'cmd-palette-backdrop': (e, target) => {
                if (e.target.classList.contains('cmd-palette-backdrop')) {
                    this.close();
                }
            },
            'cmd-palette-select': (e, target) => {
                const idx = parseInt(target.getAttribute('data-index'), 10);
                if (!isNaN(idx)) this.selectAndExecute(idx);
            }
        }, 'click');

        this.filter('');
    },

    close() {
        this.isOpen = false;
        if (typeof this._cleanupDelegator === 'function') {
            this._cleanupDelegator();
            this._cleanupDelegator = null;
        }
        const container = document.getElementById('global-command-palette');
        if (container) {
            container.innerHTML = '';
        }
    },

    filter(query) {
        const q = query.trim().toLowerCase();
        if (!q) {
            this.filteredItems = [...this.actions];
        } else {
            this.filteredItems = this.actions.filter(item => 
                item.title.toLowerCase().includes(q) || 
                item.category.toLowerCase().includes(q) ||
                item.badge.toLowerCase().includes(q)
            );
        }

        if (this.selectedIndex >= this.filteredItems.length) {
            this.selectedIndex = 0;
        }

        this.renderResults();
    },

    renderResults() {
        const resultsEl = document.getElementById('cmd-palette-results');
        if (!resultsEl) return;

        if (this.filteredItems.length === 0) {
            resultsEl.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">
                    <i class="fas fa-search" style="font-size: 1.5rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                    <p>Nenhum comando ou tela encontrada.</p>
                </div>
            `;
            return;
        }

        let html = '';
        let currentCategory = '';

        this.filteredItems.forEach((item, index) => {
            if (item.category !== currentCategory) {
                currentCategory = item.category;
                html += `<div class="cmd-palette-group-title">${window.escapeHTML ? window.escapeHTML(currentCategory) : currentCategory}</div>`;
            }

            const isSelected = index === this.selectedIndex;
            html += `
                <div class="cmd-palette-item ${isSelected ? 'active' : ''}" 
                     data-action="cmd-palette-select" data-index="${index}">
                    <div class="cmd-palette-item-left">
                        <div class="cmd-palette-item-icon">
                            <i class="${item.icon}"></i>
                        </div>
                        <span>${window.escapeHTML ? window.escapeHTML(item.title) : item.title}</span>
                    </div>
                    <span class="cmd-palette-item-badge">${window.escapeHTML ? window.escapeHTML(item.badge) : item.badge}</span>
                </div>
            `;
        });

        resultsEl.innerHTML = html;

        // Garante que o item ativo esteja visível no scroll
        const activeItem = resultsEl.querySelector('.cmd-palette-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest' });
        }
    },

    handleKeyDown(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.filteredItems.length > 0) {
                this.selectedIndex = (this.selectedIndex + 1) % this.filteredItems.length;
                this.renderResults();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.filteredItems.length > 0) {
                this.selectedIndex = (this.selectedIndex - 1 + this.filteredItems.length) % this.filteredItems.length;
                this.renderResults();
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            this.selectAndExecute(this.selectedIndex);
        }
    },

    setSelectedIndex(index) {
        this.selectedIndex = index;
        const resultsEl = document.getElementById('cmd-palette-results');
        if (!resultsEl) return;
        const items = resultsEl.querySelectorAll('.cmd-palette-item');
        items.forEach((it, idx) => {
            if (idx === index) it.classList.add('active');
            else it.classList.remove('active');
        });
    },

    selectAndExecute(index) {
        const item = this.filteredItems[index];
        if (item && typeof item.action === 'function') {
            this.close();
            try {
                item.action();
            } catch (err) {
                console.error('[CommandPalette] Erro ao executar ação:', err);
            }
        }
    }
};
