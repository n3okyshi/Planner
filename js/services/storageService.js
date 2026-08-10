const STORAGE_PREFIX = 'planner_pro_docente_2026';

export const storageService = {
    namespace: STORAGE_PREFIX,
    load() {
        try {
            const payload = localStorage.getItem(this.namespace);
            return payload ? JSON.parse(payload) : null;
        } catch (error) {
            console.warn('[storageService] Falha ao ler cache local:', error);
            return null;
        }
    },
    save(value) {
        try {
            localStorage.setItem(this.namespace, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('[storageService] Falha ao persistir cache local:', error);
            return false;
        }
    },
    clear() {
        localStorage.removeItem(this.namespace);
    },
    exportBackup(data) {
        const payload = JSON.stringify(data, null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `backup_planner_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    }
};

if (typeof window !== 'undefined') {
    window.storageService = storageService;
}
