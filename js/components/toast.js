/**
 * @file toast.js
 * @description Módulo de notificações flutuantes (Toasts) para feedback do usuário.
 * @module components/Toast
 */

/**
 * @typedef {'success'|'error'|'info'|'warning'} ToastType
 * Tipos de notificação suportados que definem a cor e o ícone.
 */

/**
 * @typedef {Object} ToastAction
 * @property {string} label - O texto que aparecerá no botão.
 * @property {Function} callback - A função a ser executada ao clicar.
 */

/**
 * Gerenciador global de notificações Toast.
 * Utiliza o padrão Singleton para manter apenas um container no DOM.
 * @namespace Toast
 */
export const Toast = {
    /** * @type {HTMLElement|null} 
     * @private
     * Referência ao elemento container no DOM.
     */
    container: null,

    /**
     * Inicializa o container de toasts no DOM.
     * Cria a estrutura HTML e define os estilos base CSS-in-JS.
     * @returns {void}
     */
    init() {
        // Evita duplicidade de containers
        const existing = document.getElementById('toast-container');
        if (existing) existing.remove();

        this.container = document.createElement('div');
        this.container.id = 'toast-container';

        // Estilos do container (Centralizado no topo)
        Object.assign(this.container.style, {
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: '2147483647', // Valor máximo de z-index seguro
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center',
            pointerEvents: 'none', // Permite clicar através do container (vazio)
            width: '100%',
            maxWidth: '420px',
            margin: '0',
            padding: '0'
        });

        document.documentElement.appendChild(this.container);
    },

    /**
     * Exibe uma nova notificação na tela.
     * * @param {string} message - A mensagem de texto a ser exibida.
     * @param {ToastType} [type='info'] - O tipo da notificação (define cor/ícone).
     * @param {number} [duration=3000] - Tempo em ms antes de desaparecer (padrão: 3s).
     * @param {ToastAction|null} [action=null] - Botão de ação opcional.
     * @returns {void}
     * * @example
     * Toast.show("Salvo com sucesso!", "success");
     * Toast.show("Erro de conexão", "error", 5000, { label: "Tentar", callback: retry });
     */
    show(message, type = 'info', duration = 3000, action = null) {
        // Garante que o container existe antes de adicionar
        if (!this.container || !document.getElementById('toast-container')) {
            this.init();
        }

        /** * Mapa de configurações visuais baseadas no tipo.
         * @type {Object.<string, {icon: string, color: string}>} 
         */
        const configs = {
            success: { icon: 'fa-check-circle', color: '#10b981' }, // Emerald-500
            error:   { icon: 'fa-times-circle', color: '#ef4444' }, // Red-500
            info:    { icon: 'fa-info-circle',  color: '#1e293b' }, // Slate-800
            warning: { icon: 'fa-exclamation-triangle', color: '#f59e0b' } // Amber-500
        };

        // Fallback para 'info' se o tipo passado for inválido
        const config = configs[type] || configs.info;
        
        // Criação do Elemento Toast
        const toast = document.createElement('div');

        // Aplicação de Estilos
        Object.assign(toast.style, {
            backgroundColor: config.color,
            color: 'white',
            padding: '14px 24px',
            borderRadius: '18px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '15px',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Efeito elástico suave
            opacity: '0',
            transform: 'translateY(-20px)',
            pointerEvents: 'auto', // O toast deve ser clicável
            minWidth: '320px',
            border: '1px solid rgba(255,255,255,0.1)',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif'
        });

        // Construção do HTML interno (Ícone + Texto + Botão opcional)
        let actionBtnHtml = '';
        if (action && action.label) {
            actionBtnHtml = `
            <button class="toast-action-btn" style="
                background: rgba(255,255,255,0.2); 
                border: none; 
                color: white; 
                padding: 6px 14px; 
                border-radius: 10px; 
                font-size: 10px; 
                font-weight: 800; 
                cursor: pointer; 
                text-transform: uppercase; 
                white-space: nowrap;
                margin-left: 8px;">
                ${window.escapeHTML(action.label)}
            </button>`;
        }

        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas ${config.icon}" style="font-size: 18px;"></i>
                <span style="font-weight: 600; font-size: 14px; line-height: 1.2;">${window.escapeHTML(message)}</span>
            </div>
            ${actionBtnHtml}
        `;

        // Configuração do evento de clique da ação
        if (action && action.callback) {
            const btn = toast.querySelector('.toast-action-btn');
            if (btn) {
                btn.onclick = (e) => {
                    e.stopPropagation(); // Evita fechar ao clicar no botão (se houver lógica de clique no toast)
                    action.callback();
                    this.dismiss(toast);
                };
            }
        }

        this.container.appendChild(toast);

        // Animação de Entrada (Next Tick)
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // Configuração do Timer de Auto-Remoção
        // Se tiver ação, damos mais tempo (6s) ou o dobro da duração padrão
        const finalDuration = action ? Math.max(duration, 6000) : duration;
        
        let timer = setTimeout(() => this.dismiss(toast), finalDuration);

        // Pausa o timer quando o mouse está em cima para facilitar a leitura
        toast.onmouseenter = () => clearTimeout(timer);
        toast.onmouseleave = () => {
             timer = setTimeout(() => this.dismiss(toast), finalDuration / 2);
        };
    },

    /**
     * Remove um toast específico com animação de saída.
     * @param {HTMLElement} toast - O elemento DOM do toast a ser removido.
     */
    dismiss(toast) {
        if (!toast) return;
        
        // Animação de saída
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px) scale(0.95)';
        
        // Remove do DOM após a animação CSS terminar
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 400);
    }
};

// Exposição global para uso em arquivos sem suporte a módulos ES6
if (typeof window !== 'undefined') {
    window.Toast = Toast;
}