export const Toast = {
    container: null,

    init() {
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            // Ajustado para ficar fixo no topo e centralizado, independente de rolagem
            this.container.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 pointer-events-none items-center';
            document.body.appendChild(this.container);
        }
    },

    /**
     * Exibe um toast na tela.
     * @param {string} message - A mensagem a ser exibida.
     * @param {'success'|'error'|'info'|'warning'} type - O tipo do alerta.
     * @param {number} duration - Tempo em ms.
     * @param {object|null} action - Objeto opcional { label: 'Botão', callback: () => {} }
     */
    show(message, type = 'info', duration = 3000, action = null) {
        if (!this.container) this.init();

        const configs = {
            success: { icon: '<i class="fas fa-check-circle"></i>', classes: 'bg-emerald-600 shadow-emerald-900/20' },
            error: { icon: '<i class="fas fa-times-circle"></i>', classes: 'bg-red-600 shadow-red-900/20' },
            info: { icon: '<i class="fas fa-info-circle"></i>', classes: 'bg-slate-800 shadow-slate-900/20' },
            warning: { icon: '<i class="fas fa-exclamation-triangle"></i>', classes: 'bg-amber-500 shadow-amber-900/20' }
        };

        const config = configs[type] || configs.info;
        if (action) duration = 6000; // Mais tempo se houver botão de ação

        const toast = document.createElement('div');
        // Adicionada a classe pointer-events-auto para o botão funcionar
        toast.className = `flex items-center gap-4 px-6 py-3 rounded-xl shadow-2xl text-white transition-all duration-300 transform opacity-0 translate-y-[-20px] pointer-events-auto min-w-[320px] ${config.classes}`;

        let actionButtonHtml = '';
        if (action) {
            actionButtonHtml = `
                <button class="ml-auto text-[10px] font-black uppercase tracking-widest bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors js-toast-action">
                    ${action.label}
                </button>
            `;
        }

        toast.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-lg">${config.icon}</span>
                <span class="font-medium text-sm">${message}</span>
            </div>
            ${actionButtonHtml}
        `;

        if (action) {
            const btn = toast.querySelector('.js-toast-action');
            if (btn) {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    action.callback();
                    this.dismiss(toast);
                };
            }
        }

        this.container.appendChild(toast);

        // Força o navegador a processar o frame para a animação de entrada funcionar
        requestAnimationFrame(() => {
            toast.classList.remove('opacity-0', 'translate-y-[-20px]');
        });

        let timer = setTimeout(() => this.dismiss(toast), duration);

        toast.onmouseenter = () => clearTimeout(timer);
        toast.onmouseleave = () => {
            if (!action) timer = setTimeout(() => this.dismiss(toast), 1500);
        };
    },

    dismiss(toast) {
        toast.classList.add('opacity-0', 'scale-95');
        toast.addEventListener('transitionend', () => {
            if (toast.parentElement) toast.remove();
        });
    }
};