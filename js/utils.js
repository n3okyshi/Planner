
export function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}
export function normalizeText(text) {
    if (!text) return "";
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
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
export function generateUUID() {
    if (typeof crypto !== 'undefined') {
        if (crypto.randomUUID) {
            return crypto.randomUUID();
        }
        if (crypto.getRandomValues) {
            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        }
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Utilitário Universal para Renderização de TeX / LaTeX com KaTeX.
 * Suporta delimitação de bloco ($$ ... $$, \[ ... \]) e em linha ($ ... $, \( ... \)).
 * Possui mecanismo de retry resiliente caso a biblioteca ainda esteja carregando via CDN.
 * @param {HTMLElement|string} element - Elemento DOM ou ID do elemento.
 * @param {Object} [customOptions] - Opções adicionais para o renderMathInElement.
 */
export function renderKatex(element, customOptions = {}) {
    if (!element) return;
    const target = typeof element === 'string' ? document.getElementById(element) : element;
    if (!target) return;

    const defaultOptions = {
        delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\[', right: '\\]', display: true },
            { left: '\\(', right: '\\)', display: false },
            { left: '$', right: '$', display: false }
        ],
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
        ignoredClasses: ['no-katex'],
        throwOnError: false,
        errorColor: '#ef4444',
        strict: false,
        ...customOptions
    };

    const execute = () => {
        if (typeof window.renderMathInElement === 'function') {
            try {
                window.renderMathInElement(target, defaultOptions);
            } catch (err) {
                console.warn('Erro ao renderizar KaTeX:', err);
            }
        }
    };

    if (typeof window.renderMathInElement === 'function') {
        execute();
    } else {
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (typeof window.renderMathInElement === 'function') {
                clearInterval(interval);
                execute();
            } else if (attempts >= 25) {
                clearInterval(interval);
            }
        }, 100);
    }
}

/**
 * Lê o conteúdo textual de um arquivo (TXT, MD, CSV, JSON, PDF simples) no navegador.
 * @param {File} file 
 * @returns {Promise<string>}
 */
export async function lerArquivoTexto(file) {
    if (!file) return "";
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const ext = file.name.split('.').pop().toLowerCase();

        if (ext === 'pdf') {
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    // Extração de texto de fluxos PDF sem dependências externas
                    const textMatches = content.match(/\(([^)]+)\)\s*Tj|\[([^\]]+)\]\s*TJ/g);
                    if (textMatches && textMatches.length > 0) {
                        const cleanText = textMatches.map(m => m.replace(/[()[\]TjTJ]/g, '').trim()).join(' ');
                        resolve(cleanText.substring(0, 35000));
                    } else {
                        // Fallback: extrai cadeias legíveis
                        const rawText = content.replace(/[^\x20-\x7E\u00A0-\u00FF\n\r]/g, ' ').replace(/\s+/g, ' ');
                        resolve(rawText.substring(0, 35000));
                    }
                } catch (err) {
                    resolve(`[Arquivo PDF: ${file.name}]`);
                }
            };
            reader.onerror = reject;
            reader.readAsBinaryString(file);
        } else {
            reader.onload = function(e) {
                const text = e.target.result || "";
                resolve(text.substring(0, 35000));
            };
            reader.onerror = reject;
            reader.readAsText(file, 'UTF-8');
        }
    });
}

if (typeof window !== 'undefined') {
    window.renderKatex = renderKatex;
    window.lerArquivoTexto = lerArquivoTexto;
}

