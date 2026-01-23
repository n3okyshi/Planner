export const Toast = {
    container: null,

    init() {
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    },

    /**
     * Exibe um toast na tela.
     * @param {string} message - A mensagem a ser exibida.
     * @param {'success'|'error'|'info'|'warning'} type - O tipo do alerta.
     * @param {number} duration - Tempo em ms (padrão 3000).
     */
    show(message, type = 'info', duration = 3000) {
        if (!this.container) this.init();

        // Ícones baseados no FontAwesome
        const icons = {
            success: '<i class="fas fa-check"></i>',
            error: '<i class="fas fa-times"></i>',
            info: '<i class="fas fa-info"></i>',
            warning: '<i class="fas fa-exclamation"></i>'
        };

        const toast = document.createElement('div');
        toast.className = `toast-item toast-${type}`;
        
        toast.innerHTML = `
            <div class="toast-icon">
                ${icons[type] || icons.info}
            </div>
            <div class="flex-1 leading-tight">
                ${message}
            </div>
        `;

        this.container.appendChild(toast);

        // Força o reflow para ativar a animação CSS
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Remove após o tempo determinado
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }, duration);
    }
};