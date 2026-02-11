/**
 * @file utils.js
 * @description Funções utilitárias de uso geral e helpers para a aplicação.
 * @module utils
 */

/**
 * Cria uma versão "debounced" de uma função, que adia sua execução até que
 * tenha decorrido um determinado tempo desde a última vez que foi invocada.
 * Útil para otimizar eventos frequentes como digitação (search) ou resize.
 *
 * @param {Function} func - A função a ser executada.
 * @param {number} wait - Tempo de espera em milissegundos.
 * @returns {Function} Uma nova função encapsulada que controla a execução.
 */
export function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/**
 * Normaliza uma string removendo acentos e convertendo para minúsculas.
 * Essencial para mecanismos de busca insensíveis a acentos.
 *
 * @param {string} text - O texto a ser normalizado.
 * @returns {string} O texto sem acentos e em caixa baixa.
 * @example normalizeText("Ação Pedagógica") // retorna "acao pedagogica"
 */
export function normalizeText(text) {
    if (!text) return "";
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Sanitiza uma string convertendo caracteres especiais em entidades HTML.
 * Previne ataques de injeção de código (XSS) ao renderizar dados do usuário.
 *
 * @param {string} str - A string potencialmente insegura.
 * @returns {string} A string segura para renderização no DOM.
 */
export function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (match) {
        const escape = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return escape[match];
    });
}

/**
 * Gera um ID único simples (UUID v4 se disponível).
 * Útil para criação de objetos temporários antes de enviar ao banco.
 * @returns {string} ID único.
 */
export function generateUUID() {
    if (typeof crypto !== 'undefined') {
        if (crypto.randomUUID) {
            return crypto.randomUUID();
        }
        if (crypto.getRandomValues) {
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        }
    }
    // Fallback inseguro apenas se crypto não estiver disponível
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
