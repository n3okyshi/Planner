export const Toast = {
    container: null,

    init() {
        const existing = document.getElementById('toast-container');
        if (existing) existing.remove();
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        Object.assign(this.container.style, {
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: '2147483647',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center',
            pointerEvents: 'none',
            width: '100%',
            maxWidth: '420px',
            margin: '0',
            padding: '0'
        });
        document.documentElement.appendChild(this.container);
    },
    show(message, type = 'info', duration = 3000, action = null) {
        if (!this.container || !document.getElementById('toast-container')) {
            this.init();
        }
        const configs = {
            success: { icon: 'fa-check-circle', color: '#10b981' },
            error: { icon: 'fa-times-circle', color: '#ef4444' },
            info: { icon: 'fa-info-circle', color: '#1e293b' },
            warning: { icon: 'fa-exclamation-triangle', color: '#f59e0b' }
        };
        const config = configs[type] || configs.info;
        const toast = document.createElement('div');
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
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            opacity: '0',
            transform: 'translateY(-20px)',
            pointerEvents: 'auto',
            minWidth: '320px',
            border: '1px solid rgba(255,255,255,0.1)',
            fontFamily: 'sans-serif'
        });
        let actionBtnHtml = action ? `
            <button class="toast-action-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 14px; border-radius: 10px; font-size: 10px; font-weight: 800; cursor: pointer; text-transform: uppercase; white-space: nowrap;">
                ${action.label}
            </button>` : '';

        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas ${config.icon}" style="font-size: 18px;"></i>
                <span style="font-weight: 600; font-size: 14px; line-height: 1.2;">${message}</span>
            </div>
            ${actionBtnHtml}
        `;
        if (action) {
            const btn = toast.querySelector('.toast-action-btn');
            btn.onclick = (e) => {
                e.stopPropagation();
                action.callback();
                this.dismiss(toast);
            };
        }
        this.container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);

        let timer = setTimeout(() => this.dismiss(toast), action ? 6000 : duration);
        toast.onmouseenter = () => clearTimeout(timer);
    },
    dismiss(toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px) scale(0.95)';
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 400);
    }
};

window.Toast = Toast;