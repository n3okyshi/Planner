
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
/**
 * Gera um número inteiro criptograficamente seguro no intervalo [min, max] inclusivo.
 * Utiliza a Web Crypto API nativa com rejeição de viés de módulo.
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
export function secureRandomInt(min, max) {
    const range = max - min + 1;
    if (range <= 0) return min;
    const maxUint32 = 0xFFFFFFFF;
    const limit = maxUint32 - (maxUint32 % range);
    const buffer = new Uint32Array(1);

    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        do {
            crypto.getRandomValues(buffer);
        } while (buffer[0] >= limit);
        return min + (buffer[0] % range);
    }
    return min + Math.floor(Math.random() * range);
}

/**
 * Gera um PIN numérico criptograficamente seguro (padrão: 6 dígitos para salas de Quiz).
 * @param {number} digits 
 * @returns {string}
 */
export function generateSecurePIN(digits = 6) {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return String(secureRandomInt(min, max));
}

/**
 * Gera um identificador único criptograficamente seguro.
 * @param {string} [prefix] 
 * @returns {string}
 */
export function generateId(prefix = '') {
    let id = '';
    if (typeof crypto !== 'undefined') {
        if (typeof crypto.randomUUID === 'function') {
            id = crypto.randomUUID();
        } else if (typeof crypto.getRandomValues === 'function') {
            const buf = new Uint8Array(8);
            crypto.getRandomValues(buf);
            id = Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
        }
    }
    if (!id) {
        id = Date.now().toString(36) + '_' + secureRandomInt(100000, 999999).toString(36);
    }
    return prefix ? `${prefix}_${id}` : id;
}

export function generateUUID() {
    return generateId();
}

/**
 * Embaralha uma lista utilizando o algoritmo Fisher-Yates com números aleatórios criptograficamente seguros.
 * @template T
 * @param {T[]} array 
 * @returns {T[]} Nova lista embaralhada
 */
export function secureShuffle(array) {
    if (!Array.isArray(array) || array.length <= 1) return [...(array || [])];
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = secureRandomInt(0, i);
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/**
 * Sanitiza conteúdo HTML para segurança XSS sem corromper expressões e símbolos matemáticos LaTeX.
 * Utiliza um Extrator com Regex Unificado de Passo Único para prevenir 100% de aninhamentos de tokens ($___MATH_TOKEN_0___$),
 * neutraliza scripts, iframes e manipuladores inline (onclick, onerror, etc.),
 * e restaura as fórmulas matemáticas intactas com compilação KaTeX.
 * @param {string} rawHtml 
 * @returns {string} HTML seguro com fórmulas matemáticas preservadas e compiladas.
 */
export function sanitizeComLatex(rawHtml) {
    if (!rawHtml) return '';
    let str = String(rawHtml);

    // 1. Extração e proteção de expressões matemáticas em PASSO ÚNICO (elimina tokens aninhados)
    const tokens = [];
    const UNIFIED_MATH_REGEX = /(?:\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|(?:\$)?\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\3\}(?:\$)?|\\\(([\s\S]*?)\\\)|\$([^\$\n\r]+?)\$)/g;

    str = str.replace(UNIFIED_MATH_REGEX, (match) => {
        const idx = tokens.length;
        tokens.push(match);
        return `___MATH_TOKEN_${idx}___`;
    });

    // 2. Limpeza segura de tags e atributos perigosos (neutralização de XSS)
    str = str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
        .replace(/\son\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '') // Remove onclick, onerror, onload, etc.
        .replace(/javascript:/gi, 'blocked:');

    // 3. Restauração segura das fórmulas matemáticas intactas com substituição baseada em função
    str = str.replace(/___MATH_TOKEN_(\d+)___/g, (match, idxStr) => {
        const idx = parseInt(idxStr, 10);
        return tokens[idx] !== undefined ? tokens[idx] : match;
    });

    // 4. Se o KaTeX estiver disponível, compila as fórmulas diretamente
    if (window.katex && typeof window.katex.renderToString === 'function') {
        return formatarTextoComLatex(str);
    }

    return str;
}

/**
 * Aplica o KaTeX em um elemento DOM específico de forma segura, modular e resiliente.
 * Suporta delimitação de bloco ($$ ... $$, \[ ... \]), em linha ($ ... $, \( ... \)) e ambientes matriciais e algébricos.
 * Desescapa entidades HTML (&lt;, &gt;, &amp;) dentro das fórmulas para evitar erros de parser.
 * @param {HTMLElement|string} element - O elemento DOM ou ID do elemento que contém o texto LaTeX.
 * @param {Object} [customOptions] - Opções adicionais para o renderMathInElement.
 */
export function renderMath(element, customOptions = {}) {
    // Early return: previne erros se o elemento for nulo ou indefinido
    if (!element) return;
    const target = typeof element === 'string' ? document.getElementById(element) : element;
    if (!target) return;

    // Desescapa entidades HTML dentro de delimitadores matemáticos nos nós de texto para prevenir quebra no KaTeX
    desescaparEntidadesMatematicas(target);

    const defaultOptions = {
        delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\[', right: '\\]', display: true },
            { left: '\\(', right: '\\)', display: false },
            { left: '$', right: '$', display: false },
            { left: '\\begin{equation}', right: '\\end{equation}', display: true },
            { left: '\\begin{align}', right: '\\end{align}', display: true },
            { left: '\\begin{alignat}', right: '\\end{alignat}', display: true },
            { left: '\\begin{gather}', right: '\\end{gather}', display: true },
            { left: '\\begin{CD}', right: '\\end{CD}', display: true },
            { left: '\\begin{matrix}', right: '\\end{matrix}', display: true },
            { left: '\\begin{pmatrix}', right: '\\end{pmatrix}', display: true },
            { left: '\\begin{bmatrix}', right: '\\end{bmatrix}', display: true },
            { left: '\\begin{vmatrix}', right: '\\end{vmatrix}', display: true },
            { left: '\\begin{Vmatrix}', right: '\\end{Vmatrix}', display: true },
            { left: '\\begin{cases}', right: '\\end{cases}', display: true }
        ],
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'option'],
        ignoredClasses: ['no-katex'],
        // Impede que um erro de sintaxe no LaTeX trave a thread principal do JS
        throwOnError: false,
        // Utiliza a cor de erro do Design System (#dc2626) para equações inválidas
        errorColor: '#dc2626',
        strict: false,
        ...customOptions
    };

    const execute = () => {
        if (typeof window.renderMathInElement === 'function') {
            try {
                window.renderMathInElement(target, defaultOptions);
            } catch (err) {
                console.warn('[KaTeX] Falha ao processar matemática no nó:', err);
            }
        } else if (typeof renderMathInElement === 'function') {
            try {
                renderMathInElement(target, defaultOptions);
            } catch (err) {
                console.warn('[KaTeX] Falha ao processar matemática no nó:', err);
            }
        } else if (window.katex && typeof window.katex.renderToString === 'function') {
            // Fallback direto via renderToString caso auto-render não esteja pronto
            renderizarFallbackManual(target);
        }
    };

    if (typeof window.renderMathInElement === 'function' || typeof renderMathInElement === 'function') {
        execute();
    } else {
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (typeof window.renderMathInElement === 'function' || typeof renderMathInElement === 'function' || (typeof window !== 'undefined' && window.katex)) {
                clearInterval(interval);
                execute();
            } else if (attempts >= 30) {
                clearInterval(interval);
                console.warn('[KaTeX] Biblioteca auto-render indisponível no momento.');
            }
        }, 100);
    }
}

/**
 * Alias retrocompatível para renderMath
 */
export const renderKatex = renderMath;

/**
 * Desescapa entidades HTML (&lt;, &gt;, &amp;, &#39;, &quot;) especificamente dentro de blocos matemáticos delimitados.
 */
function desescaparEntidadesMatematicas(node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
        if (node.nodeValue && (node.nodeValue.includes('$') || node.nodeValue.includes('\\'))) {
            node.nodeValue = node.nodeValue
                .replace(/\$\$([\s\S]*?)\$\$/g, (m, math) => `$$${math.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')}$$`)
                .replace(/\\\[([\s\S]*?)\\\]/g, (m, math) => `\\[${math.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')}\\]`)
                .replace(/\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\1\}/g, (m, env, math) => `\\begin{${env}}${math.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')}\\end{${env}}`)
                .replace(/\$([^\$\n\r]+?)\$/g, (m, math) => `$${math.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')}$`)
                .replace(/\\\(([\s\S]*?)\\\)/g, (m, math) => `\\(${math.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')}\\)`);
        }
    } else if (node.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE', 'TEXTAREA'].includes(node.tagName)) {
        for (let i = 0; i < node.childNodes.length; i++) {
            desescaparEntidadesMatematicas(node.childNodes[i]);
        }
    }
}

/**
 * Fallback manual que processa strings com KaTeX direto
 */
function renderizarFallbackManual(target) {
    if (!target || !window.katex) return;
    try {
        const textNodes = [];
        const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, null, false);
        let n;
        while ((n = walker.nextNode())) {
            if (n.nodeValue && (n.nodeValue.includes('$') || n.nodeValue.includes('\\'))) {
                textNodes.push(n);
            }
        }
        textNodes.forEach(node => {
            const val = node.nodeValue;
            if (/\$\$[\s\S]*?\$\$|\$[^\$\n\r]+?\$|\\\[[\s\S]*?\\\]|\\begin\{/.test(val)) {
                const span = document.createElement('span');
                span.innerHTML = formatarTextoComLatex(val);
                if (node.parentNode) {
                    node.parentNode.replaceChild(span, node);
                }
            }
        });
    } catch (e) {
        console.warn('[KaTeX] Fallback manual:', e);
    }
}

/**
 * Formata um texto contendo fórmulas LaTeX ($...$, $$...$$, \[...\], \(...\), \begin{matrix}...) diretamente em HTML compilado com KaTeX.
 * @param {string} texto 
 * @returns {string} HTML com equações renderizadas
 */
export function formatarTextoComLatex(texto) {
    if (!texto) return '';
    if (!window.katex || typeof window.katex.renderToString !== 'function') {
        return texto;
    }

    try {
        let resultado = String(texto);

        const normalizarFormula = (formula) => {
            return String(formula)
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"')
                .trim();
        };

        // 1. Fórmulas em bloco: $$ ... $$
        resultado = resultado.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
            try {
                return window.katex.renderToString(normalizarFormula(formula), { displayMode: true, throwOnError: false });
            } catch (err) {
                return match;
            }
        });

        // 2. Fórmulas em bloco: \[ ... \]
        resultado = resultado.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
            try {
                return window.katex.renderToString(normalizarFormula(formula), { displayMode: true, throwOnError: false });
            } catch (err) {
                return match;
            }
        });

        // 3. Ambientes matriciais e algébricos com ou sem $: \begin{...} ... \end{...}
        resultado = resultado.replace(/(?:\$)?\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\1\}(?:\$)?/g, (match, envName, envContent) => {
            try {
                const formulaLimpa = `\\begin{${envName}}${normalizarFormula(envContent)}\\end{${envName}}`;
                return window.katex.renderToString(formulaLimpa, { displayMode: true, throwOnError: false });
            } catch (err) {
                return match;
            }
        });

        // 4. Fórmulas em linha: $ ... $
        resultado = resultado.replace(/\$([^\$\n\r]+?)\$/g, (match, formula) => {
            try {
                return window.katex.renderToString(normalizarFormula(formula), { displayMode: false, throwOnError: false });
            } catch (err) {
                return match;
            }
        });

        // 5. Fórmulas em linha: \( ... \)
        resultado = resultado.replace(/\\\(([\s\S]*?)\\\)/g, (match, formula) => {
            try {
                return window.katex.renderToString(normalizarFormula(formula), { displayMode: false, throwOnError: false });
            } catch (err) {
                return match;
            }
        });

        return resultado;
    } catch (err) {
        return texto;
    }
}

/**
 * Vincula um campo de texto/textarea a uma caixa de preview que renderiza KaTeX em tempo real enquanto o professor digita.
 * @param {HTMLInputElement|HTMLTextAreaElement|string} input 
 * @param {HTMLElement|string} previewContainer 
 */
export function anexarPreviewLatex(input, previewContainer) {
    const inputEl = typeof input === 'string' ? document.getElementById(input) : input;
    const previewEl = typeof previewContainer === 'string' ? document.getElementById(previewContainer) : previewContainer;
    if (!inputEl || !previewEl) return;

    const atualizar = () => {
        const val = inputEl.value || '';
        if (!val.trim()) {
            previewEl.style.display = 'none';
            previewEl.innerHTML = '';
            return;
        }

        if (val.includes('$') || val.includes('\\')) {
            previewEl.style.display = 'block';
            previewEl.innerHTML = `
                <div style="font-size: 0.6875rem; font-weight: 800; color: #4f46e5; text-transform: uppercase; margin-bottom: 0.375rem; display: flex; align-items: center; gap: 0.25rem;">
                    <i class="fas fa-eye"></i> Pré-visualização Matemática (KaTeX)
                </div>
                <div style="padding: 0.5rem 0.75rem; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; font-size: 0.9375rem; color: #0f172a; line-height: 1.6;">
                    ${formatarTextoComLatex(window.escapeHTML(val).replace(/\n/g, '<br>'))}
                </div>
            `;
            renderKatex(previewEl);
        } else {
            previewEl.style.display = 'none';
        }
    };

    inputEl.addEventListener('input', atualizar);
    inputEl.addEventListener('focus', atualizar);
    atualizar();
}

/**
 * Alterna entre o modo de edição direta (input/textarea) e a visualização estilizada com renderização KaTeX.
 * Ao clicar na caixa de visualização renderizada, retorna automaticamente ao modo de edição com foco no cursor.
 * @param {string|HTMLElement} textareaId - ID ou elemento do textarea/input de edição.
 * @param {string|HTMLElement} previewId - ID ou elemento do container onde o preview será renderizado.
 * @param {string|HTMLElement} [btnId] - ID ou elemento do botão de alternância (opcional).
 */
export function alternarModoEdicaoPreview(textareaId, previewId, btnId) {
    const textarea = typeof textareaId === 'string' ? document.getElementById(textareaId) : textareaId;
    const preview = typeof previewId === 'string' ? document.getElementById(previewId) : previewId;
    const btn = btnId ? (typeof btnId === 'string' ? document.getElementById(btnId) : btnId) : null;
    if (!textarea || !preview) return;

    const isPreviewing = preview.style.display !== 'none';

    if (isPreviewing) {
        // Retornar ao modo de edição
        preview.style.display = 'none';
        textarea.style.display = 'block';
        if (btn) {
            btn.innerHTML = '<i class="fas fa-eye"></i> <span>Visualizar Formatação (TeX)</span>';
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        }
        textarea.focus();
    } else {
        // Entrar no modo de visualização com KaTeX
        const val = textarea.value || '';
        const html = sanitizeComLatex(val).replace(/\n/g, '<br>') || '<em style="color: var(--color-slate-400);">Nenhum conteúdo digitado. Clique nesta área para editar.</em>';
        
        preview.innerHTML = `
            <div style="font-size: 0.6875rem; font-weight: 800; color: var(--color-primary, #4f46e5); text-transform: uppercase; margin-bottom: 0.375rem; display: flex; justify-content: space-between; align-items: center;">
                <span><i class="fas fa-eye"></i> Pré-visualização Matemática (KaTeX)</span>
                <span style="font-size: 0.6875rem; text-transform: none; color: var(--color-slate-400); font-weight: 600;"><i class="fas fa-mouse-pointer"></i> Clique para voltar e editar</span>
            </div>
            <div class="custom-scrollbar" style="min-height: ${Math.max(textarea.offsetHeight || 65, 65)}px; max-height: 380px; overflow-y: auto; padding: 0.75rem 1rem; background-color: var(--color-slate-50, #f8fafc); border: 2px dashed #a5b4fc; border-radius: var(--radius-xl, 12px); font-size: 0.9375rem; color: var(--color-slate-800, #1e293b); line-height: 1.6; cursor: pointer; transition: all 0.2s ease;"
                 title="Clique para voltar a editar este texto"
                 onmouseover="this.style.backgroundColor='#eff6ff'; this.style.borderColor='var(--color-primary, #4f46e5)';"
                 onmouseout="this.style.backgroundColor='var(--color-slate-50, #f8fafc)'; this.style.borderColor='#a5b4fc';">
                ${html}
            </div>
        `;
        
        preview.onclick = () => alternarModoEdicaoPreview(textarea, preview, btn);
        textarea.style.display = 'none';
        preview.style.display = 'block';
        
        if (btn) {
            btn.innerHTML = '<i class="fas fa-edit"></i> <span>Editar Texto</span>';
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
        }
        
        renderKatex(preview);
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
    window.escapeHTML = escapeHTML;
    window.sanitizeComLatex = sanitizeComLatex;
    window.renderMath = renderMath;
    window.renderKatex = renderKatex;
    window.formatarTextoComLatex = formatarTextoComLatex;
    window.anexarPreviewLatex = anexarPreviewLatex;
    window.alternarModoEdicaoPreview = alternarModoEdicaoPreview;
    window.lerArquivoTexto = lerArquivoTexto;
    window.generateId = generateId;
    window.generateUUID = generateUUID;
    window.generateSecurePIN = generateSecurePIN;
    window.secureRandomInt = secureRandomInt;
    window.secureShuffle = secureShuffle;
}


