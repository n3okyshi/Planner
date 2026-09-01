/**
 * Utilitário de Delegação de Eventos (EventDelegator) para Vanilla JS ES6+
 * Permite capturar eventos em seletores 'data-action' ou classes dentro de um contêiner pai,
 * eliminando a necessidade de expor funções globais na 'window' ou anexar múltiplos event listeners.
 */
export class EventDelegator {
    /**
     * Anexa um delegado de eventos a um contêiner DOM.
     * @param {HTMLElement|string} container - O elemento pai ou ID
     * @param {Object<string, Function>} handlers - Mapeamento de ações para callbacks { 'salvar': (e, target) => {} }
     * @param {string} [eventType='click'] - Tipo do evento DOM ('click', 'change', 'submit', 'keydown', 'wheel')
     * @param {boolean|AddEventListenerOptions} [options=false] - Opções do addEventListener (ex: { passive: false })
     * @returns {Function} Função para remover o listener quando a View for destruída
     */
    static bind(container, handlers = {}, eventType = 'click', options = false) {
        const parent = typeof container === 'string' ? document.getElementById(container) : container;
        if (!parent) return () => {};

        const listener = (event) => {
            const target = event.target.closest('[data-action]');
            if (!target || !parent.contains(target)) return;

            const action = target.getAttribute('data-action');
            if (action && typeof handlers[action] === 'function') {
                handlers[action](event, target);
            }
        };

        parent.addEventListener(eventType, listener, options);

        return () => {
            if (parent) {
                parent.removeEventListener(eventType, listener, options);
            }
        };
    }
}

if (typeof window !== 'undefined') {
    window.EventDelegator = EventDelegator;
}

