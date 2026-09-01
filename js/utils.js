
export { EventDelegator } from './utils/eventDelegator.js';

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

export const generateUUID = generateId;

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
 * Normaliza e sanitiza expressões TeX/LaTeX no texto, convertendo delimitadores de cifrão ($...$ e $$...$$) 
 * para a sintaxe moderna \(...\) e \[...\], tratando rigorosamente homóglifos Unicode (barras e parênteses de PDFs),
 * caracteres invisíveis e protegendo valores monetários (ex: R$ 100,00 ou US$ 50).
 * @param {string} texto 
 * @returns {string} Texto com delimitadores TeX modernizados e moedas protegidas.
 */
export function normalizarDelimitadoresLatex(texto) {
    if (!texto) return '';
    let str = String(texto);

    // 1. Limpeza de caracteres invisíveis e soft hyphens que PDFs e Notebooks inserem
    str = str
        .replace(/[\u200B\u200C\u200D\uFEFF\u00AD]/g, '') // Zero-width spaces & soft hyphens
        .replace(/\u00A0/g, ' '); // Non-breaking space

    // 2. Normalização de homóglifos Unicode para barras e delimitadores matemáticos
    // Converte barras invertidas especiais: \u2216 (∖), \uFE68 (﹨), \uFF3C (＼) para ASCII '\'
    str = str.replace(/[\u2216\uFE68\uFF3C]/g, '\\');
    // Converte parênteses largos: \uFF08 (（), \uFF09 (）) para '(' e ')'
    str = str.replace(/\uFF08/g, '(').replace(/\uFF09/g, ')');
    // Converte colchetes largos: \uFF3B (［), \uFF3D (］) para '[' e ']'
    str = str.replace(/\uFF3B/g, '[').replace(/\uFF3D/g, ']');

    // Normalização de símbolos Delta Unicode (∆ / Δ) para comando TeX \Delta
    str = str.replace(/[\u2206\u0394]/g, '\\Delta ');

    // 3. Normalização de múltiplos backslashes antes de delimitadores TeX (ex: "\\(" -> "\(" e "\\)" -> "\)")
    str = str
        .replace(/\\+\(/g, '\\(')
        .replace(/\\+\)/g, '\\)')
        .replace(/\\+\[/g, '\\[')
        .replace(/\\+\]/g, '\\]');

    // 4. Normalização de espaçamentos anômalos em delimitadores (ex: "\ (" -> "\(" e "\ )" -> "\)")
    str = str
        .replace(/\\\s+\(/g, '\\(')
        .replace(/\\\s+\)/g, '\\)')
        .replace(/\\\s+\[/g, '\\[')
        .replace(/\\\s+\]/g, '\\]');

    // 5. Proteção de valores monetários para evitar colisão com delimitadores de cifrão
    const moedasProtegidas = [];
    str = str.replace(/\b(?:R\$|US\$|\$)\s*\d+(?:[.,]\d+)?\b/gi, (match) => {
        const idx = moedasProtegidas.length;
        moedasProtegidas.push(match);
        return `___MOEDA_PROTEGIDA_${idx}___`;
    });

    // 6. Conversão de blocos $$ ... $$ para \[ ... \]
    str = str.replace(/\$\$\s*([\s\S]+?)\s*\$\$/g, '\\[$1\\]');

    // 7. Conversão de inline $ ... $ para \( ... \)
    str = str.replace(/(^|[^\\])\$([^\$\n\r]+?)\$/g, '$1\\($2\\)');

    // 8. Restauração das moedas protegidas
    str = str.replace(/___MOEDA_PROTEGIDA_(\d+)___/g, (match, idxStr) => {
        const idx = parseInt(idxStr, 10);
        return moedasProtegidas[idx] !== undefined ? moedasProtegidas[idx] : match;
    });

    return str;
}

/**
 * Sanitiza conteúdo HTML para segurança XSS sem corromper expressões e símbolos matemáticos LaTeX.
 * Utiliza um Extrator com Regex Unificado de Passo Único para prevenir 100% de aninhamentos de tokens,
 * neutraliza scripts, iframes e manipuladores inline, e restaura as fórmulas matemáticas intactas com compilação KaTeX.
 * @param {string} rawHtml 
 * @returns {string} HTML seguro com fórmulas matemáticas preservadas e compiladas.
 */
export function sanitizeComLatex(rawHtml) {
    if (!rawHtml) return '';
    let str = normalizarDelimitadoresLatex(String(rawHtml));

    // 1. Extração e proteção de expressões matemáticas em PASSO ÚNICO (elimina tokens aninhados)
    const tokens = [];
    const UNIFIED_MATH_REGEX = /(?:\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\3\})/g;

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

    // 3. Restauração segura das fórmulas matemáticas intactas
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
 * Suporta estritamente delimitação de bloco (\[ ... \]), em linha (\( ... \)) e ambientes matemáticos.
 * Desescapa entidades HTML (&lt;, &gt;, &amp;) dentro das fórmulas para evitar erros de parser.
 * @param {HTMLElement|string} element - O elemento DOM ou ID do elemento que contém o texto LaTeX.
 * @param {Object} [customOptions] - Opções adicionais para o renderMathInElement.
 */
export function renderMath(element, customOptions = {}) {
    if (!element) return;
    const target = typeof element === 'string' ? document.getElementById(element) : element;
    if (!target) return;

    // Otimização de Performance: Se o container não contiver nenhum delimitador LaTeX, retorna imediatamente
    const htmlContent = target.innerHTML || target.textContent || '';
    if (!htmlContent.includes('\\(') && !htmlContent.includes('\\[') && !htmlContent.includes('\\begin') && !htmlContent.includes('\\Delta')) {
        return;
    }

    desescaparEntidadesMatematicas(target);

    const defaultOptions = {
        delimiters: [
            { left: '\\[', right: '\\]', display: true },
            { left: '\\(', right: '\\)', display: false },
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
        throwOnError: false,
        errorColor: '#dc2626',
        strict: 'ignore', // Silencia avisos não-fatais de métricas de caracteres como Delta/Unicode
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
 * Converte uma expressão LaTeX pura para MathML estruturado compatível com Microsoft Word / OMML.
 * @param {string} latex 
 * @param {boolean} displayMode 
 * @returns {string} Código MathML
 */
export function converterLatexParaMathML(latex, displayMode = false) {
    if (!latex) return '';
    let limpo = String(latex).trim()
        .replace(/^\\\(|\\\)$/g, '')
        .replace(/^\\\[|\\\]$/g, '')
        .replace(/[\u2206\u0394]/g, '\\Delta ');

    if (window.katex && typeof window.katex.renderToString === 'function') {
        try {
            const raw = window.katex.renderToString(limpo, {
                displayMode: displayMode,
                output: 'mathml',
                throwOnError: false,
                strict: 'ignore'
            });
            const mathMatch = raw.match(/<math[\s\S]*?<\/math>/i);
            if (mathMatch) {
                return mathMatch[0];
            }
            return raw;
        } catch (e) {
            console.warn("Erro ao converter LaTeX para MathML via KaTeX:", e);
        }
    }

    return `<math xmlns="http://www.w3.org/1998/Math/MathML" ${displayMode ? 'display="block"' : ''}><mtext>${escapeHTML(limpo)}</mtext></math>`;
}

/**
 * Converte todo o conteúdo HTML contendo fórmulas LaTeX \( \) e \[ \] em equações nativas do Word (MathML).
 * Higieniza elementos KaTeX pré-renderizados para evitar duplicação de texto e MathML no Office/Word.
 * @param {string} html 
 * @returns {string} HTML com equações MathML nativas limpas (OMML)
 */
export function converterHtmlLatexParaWordEquations(html) {
    if (!html) return '';
    let str = String(html);

    // 1. Remove qualquer bloco katex-html duplicado antes de tudo
    str = str.replace(/<span[^>]*class="[^"]*katex-html[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '');

    // 2. Extrai LaTeX de annotations do KaTeX já renderizado (<span class="katex">)
    str = str.replace(/<span[^>]*class="[^"]*katex(?:-display)?[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, (match) => {
        const annotationMatch = match.match(/<annotation[^>]*encoding="application\/x-tex"[^>]*>([\s\S]*?)<\/annotation>/i);
        if (annotationMatch && annotationMatch[1]) {
            const display = match.includes('katex-display');
            return converterLatexParaMathML(annotationMatch[1], display);
        }
        const mathMatch = match.match(/<math[\s\S]*?<\/math>/i);
        return mathMatch ? mathMatch[0] : '';
    });

    // 3. Normaliza delimitadores estritos e converte LaTeX restante
    str = normalizarDelimitadoresLatex(str);

    // Converte blocos \[ ... \] para MathML de exibição em bloco
    str = str.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
        return converterLatexParaMathML(formula, true);
    });

    // Converte ambientes \begin{...} ... \end{...}
    str = str.replace(/\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\1\}/g, (match) => {
        return converterLatexParaMathML(match, true);
    });

    // Converte inline \( ... \) para MathML em linha
    str = str.replace(/\\\(([\s\S]*?)\\\)/g, (match, formula) => {
        return converterLatexParaMathML(formula, false);
    });

    return str;
}

/**
 * Utilitário leve de cálculo de CRC32 em Vanilla JS puro (Tabela IEEE 802.3)
 */
function calcularCRC32(bytes) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < bytes.length; i++) {
        crc = (crc >>> 8) ^ _tabelaCRC[(crc ^ bytes[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
}

const _tabelaCRC = (() => {
    let c;
    const table = [];
    for (let n = 0; n < 256; n++) {
        c = n;
        for (let k = 0; k < 8; k++) {
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        table[n] = c;
    }
    return table;
})();

/**
 * Empacotador ZIP Binário Ultraleve (100% Vanilla JS ES6+ - Sem dependências externas)
 * Cria arquivos .zip / .docx válidos no navegador usando Uint8Array.
 * @param {Object.<string, string|Uint8Array>} arquivosMap - Mapeamento de caminho relativo para conteúdo
 * @returns {Blob}
 */
export function criarZipBinario(arquivosMap) {
    const encoder = new TextEncoder();
    const entradas = [];
    let offsetLocal = 0;

    for (const [nome, conteudo] of Object.entries(arquivosMap)) {
        const nomeBytes = encoder.encode(nome);
        const dadosBytes = typeof conteudo === 'string' ? encoder.encode(conteudo) : conteudo;
        const tamanho = dadosBytes.length;
        const crc = calcularCRC32(dadosBytes);

        // Local File Header (30 bytes + nome + dados)
        const cabecalhoLocal = new Uint8Array(30 + nomeBytes.length + tamanho);
        const viewLocal = new DataView(cabecalhoLocal.buffer);

        viewLocal.setUint32(0, 0x04034b50, true); // Local header signature
        viewLocal.setUint16(4, 20, true);         // Version needed to extract (2.0)
        viewLocal.setUint16(6, 0x0800, true);     // General purpose bit flag (UTF-8)
        viewLocal.setUint16(8, 0, true);          // Compression method (0 = Store)
        viewLocal.setUint16(10, 0, true);         // Last mod file time
        viewLocal.setUint16(12, 0, true);         // Last mod file date
        viewLocal.setUint32(14, crc, true);       // CRC-32
        viewLocal.setUint32(18, tamanho, true);   // Compressed size
        viewLocal.setUint32(22, tamanho, true);   // Uncompressed size
        viewLocal.setUint16(26, nomeBytes.length, true); // File name length
        viewLocal.setUint16(28, 0, true);         // Extra field length

        cabecalhoLocal.set(nomeBytes, 30);
        cabecalhoLocal.set(dadosBytes, 30 + nomeBytes.length);

        entradas.push({
            nomeBytes,
            tamanho,
            crc,
            offset: offsetLocal,
            dados: cabecalhoLocal
        });

        offsetLocal += cabecalhoLocal.length;
    }

    // Central Directory Headers
    const centralHeaders = [];
    let tamanhoCentral = 0;

    for (const e of entradas) {
        const cabCentral = new Uint8Array(46 + e.nomeBytes.length);
        const viewCentral = new DataView(cabCentral.buffer);

        viewCentral.setUint32(0, 0x02014b50, true); // Central directory header signature
        viewCentral.setUint16(4, 20, true);          // Version made by
        viewCentral.setUint16(6, 20, true);          // Version needed
        viewCentral.setUint16(8, 0x0800, true);      // General purpose bit flag (UTF-8)
        viewCentral.setUint16(10, 0, true);          // Compression method (0 = Store)
        viewCentral.setUint16(12, 0, true);          // Mod time
        viewCentral.setUint16(14, 0, true);          // Mod date
        viewCentral.setUint32(16, e.crc, true);      // CRC-32
        viewCentral.setUint32(20, e.tamanho, true);  // Compressed size
        viewCentral.setUint32(24, e.tamanho, true);  // Uncompressed size
        viewCentral.setUint16(28, e.nomeBytes.length, true); // File name length
        viewCentral.setUint16(30, 0, true);          // Extra field length
        viewCentral.setUint16(32, 0, true);          // Comment length
        viewCentral.setUint16(34, 0, true);          // Disk number start
        viewCentral.setUint16(36, 0, true);          // Internal file attributes
        viewCentral.setUint32(38, 0, true);          // External file attributes
        viewCentral.setUint32(42, e.offset, true);   // Relative offset of local header

        cabCentral.set(e.nomeBytes, 46);
        centralHeaders.push(cabCentral);
        tamanhoCentral += cabCentral.length;
    }

    // End of Central Directory Record (22 bytes)
    const eocd = new Uint8Array(22);
    const vEocd = new DataView(eocd.buffer);
    vEocd.setUint32(0, 0x06054b50, true); // EOCD signature
    vEocd.setUint16(4, 0, true);          // disk number
    vEocd.setUint16(6, 0, true);          // start disk
    vEocd.setUint16(8, entradas.length, true);  // entries on disk
    vEocd.setUint16(10, entradas.length, true); // total entries
    vEocd.setUint32(12, tamanhoCentral, true);  // size of central directory
    vEocd.setUint32(16, offsetLocal, true);     // offset of central directory
    vEocd.setUint16(20, 0, true);               // comment length

    const partes = [];
    for (const e of entradas) partes.push(e.dados);
    for (const c of centralHeaders) partes.push(c);
    partes.push(eocd);

    return new Blob(partes, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

/**
 * Exporta conteúdo em arquivo .docx genuíno (OpenXML + OMML) ou .doc padrão
 * @param {string} htmlDoc 
 * @param {string} nomeBase 
 * @param {string} [formato='docx'] - 'docx' ou 'doc'
 */
export function exportarMaterialWord(htmlDoc, nomeBase = 'material_pedagogico', formato = 'docx') {
    if (!htmlDoc) return;
    const nomeLimpo = (nomeBase || 'material_pedagogico')
        .replace(/[\/\\:\*\?"<>\|]/g, '_')
        .replace(/\s+/g, '_')
        .trim();

    const htmlComEquacoes = converterHtmlLatexParaWordEquations(htmlDoc);

    const htmlCompletoWord = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #1e293b; }
h1 { font-size: 18pt; font-weight: bold; margin-bottom: 12pt; color: #0f172a; }
h2 { font-size: 14pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; color: #334155; }
h3 { font-size: 12pt; font-weight: bold; margin-top: 8pt; margin-bottom: 4pt; }
table { border-collapse: collapse; width: 100%; margin: 10pt 0; }
th, td { border: 1px solid #cbd5e1; padding: 5pt 8pt; vertical-align: top; }
th { background-color: #f1f5f9; font-weight: bold; }
mark { background-color: #fef08a; padding: 1pt 3pt; }
.gabarito-bloco { background-color: #f0fdf4; border: 1.5pt solid #22c55e; padding: 8pt; margin: 10pt 0; }
.comentario-professor { background-color: #eff6ff; border-left: 3pt solid #3b82f6; padding: 8pt; margin: 10pt 0; }
math { font-family: 'Cambria Math', 'Cambria', serif; }
</style>
</head>
<body>
${htmlComEquacoes}
</body>
</html>`;

    if (formato === 'doc') {
        const blob = new Blob(['\ufeff' + htmlCompletoWord], {
            type: 'application/msword;charset=utf-8'
        });
        _dispararDownload(blob, `${nomeLimpo}.doc`);
        return;
    }

    // Geração de pacote DOCX padrão OpenXML com documento HTML embutido / OMML
    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="html" ContentType="text/html"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="afchunk.html"/>
</Relationships>`;

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:altChunk r:id="rId1"/>
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    const arquivosDocx = {
        '[Content_Types].xml': contentTypesXml,
        '_rels/.rels': relsXml,
        'word/_rels/document.xml.rels': docRelsXml,
        'word/document.xml': documentXml,
        'word/afchunk.html': htmlCompletoWord
    };

    const blobDocx = criarZipBinario(arquivosDocx);
    _dispararDownload(blobDocx, `${nomeLimpo}.docx`);
}

function _dispararDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Copia o conteúdo com suporte completo a MathML para a área de transferência.
 * Ao colar no Microsoft Word (Office 365, Word 2019/2016), as fórmulas se tornam equações nativas editáveis.
 * @param {string|HTMLElement} conteudo 
 * @returns {Promise<boolean>}
 */
export async function copiarParaWordComEquacoes(conteudo) {
    try {
        let htmlStr = typeof conteudo === 'string' ? conteudo : (conteudo.innerHTML || conteudo.innerText || '');
        const htmlWord = converterHtmlLatexParaWordEquations(htmlStr);

        if (navigator.clipboard && window.ClipboardItem) {
            const blobHtml = new Blob([htmlWord], { type: 'text/html' });
            const blobText = new Blob([htmlStr.replace(/<[^>]*>/g, '')], { type: 'text/plain' });
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': blobHtml,
                    'text/plain': blobText
                })
            ]);
            return true;
        } else {
            await navigator.clipboard.writeText(htmlStr);
            return true;
        }
    } catch (e) {
        console.warn("Falha na cópia rica para o Word. Utilizando fallback:", e);
        return false;
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
        if (node.nodeValue && (node.nodeValue.includes('\\') || node.nodeValue.includes('$'))) {
            node.nodeValue = normalizarDelimitadoresLatex(node.nodeValue)
                .replace(/\\\[([\s\S]*?)\\\]/g, (m, math) => `\\[${math.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')}\\]`)
                .replace(/\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\1\}/g, (m, env, math) => `\\begin{${env}}${math.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')}\\end{${env}}`)
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
            if (n.nodeValue && n.nodeValue.includes('\\')) {
                textNodes.push(n);
            }
        }
        textNodes.forEach(node => {
            const val = node.nodeValue;
            if (/\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\\begin\{/.test(val)) {
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
 * Formata um texto contendo fórmulas LaTeX (\[...\], \(...\), \begin{matrix}...) diretamente em HTML compilado com KaTeX.
 * @param {string} texto 
 * @returns {string} HTML com equações renderizadas
 */
export function formatarTextoComLatex(texto) {
    if (!texto) return '';
    if (!window.katex || typeof window.katex.renderToString !== 'function') {
        return normalizarDelimitadoresLatex(texto);
    }

    try {
        let resultado = normalizarDelimitadoresLatex(String(texto));

        const normalizarFormula = (formula) => {
            return String(formula)
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"')
                .trim();
        };

        // 1. Fórmulas em bloco: \[ ... \]
        resultado = resultado.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
            try {
                return window.katex.renderToString(normalizarFormula(formula), { displayMode: true, throwOnError: false });
            } catch (err) {
                return match;
            }
        });

        // 2. Ambientes matriciais e algébricos: \begin{...} ... \end{...}
        resultado = resultado.replace(/\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\1\}/g, (match, envName, envContent) => {
            try {
                const formulaLimpa = `\\begin{${envName}}${normalizarFormula(envContent)}\\end{${envName}}`;
                return window.katex.renderToString(formulaLimpa, { displayMode: true, throwOnError: false });
            } catch (err) {
                return match;
            }
        });

        // 3. Fórmulas em linha: \( ... \)
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
 * Desescapa entidades HTML, normaliza delimitadores de fórmulas e pré-compila a matemática
 * em HTML estático fiel para garantir exportação perfeita em PDF/Impressão e Word (.doc).
 * @param {string} rawHtml - HTML bruto do material
 * @param {string} [modo='professor'] - 'professor' ou 'aluno'
 * @returns {string} HTML limpo, pré-compilado e estilizado para exportação
 */
export function prepararHTMLParaExportacao(rawHtml, modo = 'professor') {
    if (!rawHtml) return '';
    let str = String(rawHtml);

    // 1. Desescapa entidades HTML se a string vier escapada como &lt;div...
    if (str.includes('&lt;') && str.includes('&gt;')) {
        str = str
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&');
    }

    // 2. Normaliza moedas com escape TeX (ex: R\$1.200, 00 ou R\$ 480 -> R$ 1.200,00)
    str = str.replace(/R\\?\$ /gi, 'R$ ');
    str = str.replace(/R\\?\$/gi, 'R$ ');
    str = str.replace(/(R\$\s*\d+(?:[\.,]\d+)?)\s*,\s*(\d{2})/g, '$1,$2');

    // 3. Remove tags orfãs de fechamento soltas como </p> no início de listas ou antes de <ul> / <ol> / <div
    str = str.replace(/<\/p>\s*<ul>/gi, '<ul>');
    str = str.replace(/<\/p>\s*<ol>/gi, '<ol>');
    str = str.replace(/<\/p>\s*<div/gi, '<div');
    str = str.replace(/<\/p>\s*<p>/gi, '<p>');

    // 4. Proteção e preservação de R$ e cifrão monetário
    const currencyTokens = [];
    str = str.replace(/(?:R\$\s*|\$\s*)(\d+(?:[\.,]\d+)?)/g, (match, val) => {
        const idx = currencyTokens.length;
        const isReais = match.startsWith('R');
        currencyTokens.push(isReais ? `R$ ${val}` : `$ ${val}`);
        return `___REAL_CURRENCY_TOKEN_${idx}___`;
    });

    // 5. Restauração de moedas com função replacer segura
    str = str.replace(/___REAL_CURRENCY_TOKEN_(\d+)___/g, (match, idxStr) => {
        const idx = parseInt(idxStr, 10);
        return currencyTokens[idx] !== undefined ? currencyTokens[idx] : match;
    });

    // 6. Processamento para modo Aluno vs Professor (remover/estilizar gabarito)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = str;

    // Limpa atributos parasitas de MathJax colados de sites externos (role="presentation", etc.)
    tempDiv.querySelectorAll('[role="presentation"], .MathJax_Preview, .mjx-chtml').forEach(el => {
        if (el.hasAttribute('role')) el.removeAttribute('role');
        const style = el.getAttribute('style') || '';
        if (style.includes('scroll-behavior') || style.includes('max-width: none')) {
            el.removeAttribute('style');
        }
    });

    // Limpa fundo branco estático de filhos do gabarito para não tampar o destaque verde (#f0fdf4)
    tempDiv.querySelectorAll('.gabarito-bloco, [data-gabarito="true"]').forEach(gab => {
        gab.querySelectorAll('*').forEach(child => {
            if (child.style) {
                const bg = (child.style.backgroundColor || child.style.background || '').toLowerCase().replace(/\s/g, '');
                if (bg === '#fff' || bg === '#ffffff' || bg === 'rgb(255,255,255)' || bg === 'white' || bg === 'transparent') {
                    child.style.backgroundColor = '';
                    child.style.background = '';
                }
            }
        });
    });

    if (modo === 'aluno') {
        const seletoresRemover = [
            '.gabarito',
            '.gabarito-block',
            '.respostas',
            '.gabarito-bloco',
            '.respostas-bloco',
            '.comentario-professor',
            '.resolucao-professor',
            '[data-gabarito="true"]'
        ];
        tempDiv.querySelectorAll(seletoresRemover.join(', ')).forEach(el => el.remove());

        const headers = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, strong, p');
        headers.forEach(h => {
            const text = (h.textContent || '').trim().toLowerCase();
            if (text.startsWith('gabarito') ||
                text.startsWith('respostas esperadas') ||
                text.startsWith('critérios de correção') ||
                text.startsWith('resolução comentada') ||
                text.startsWith('gabarito comentado')) {

                let next = h.nextElementSibling;
                while (next && !['H1', 'H2', 'H3', 'H4'].includes(next.tagName)) {
                    const toRemove = next;
                    next = next.nextElementSibling;
                    toRemove.remove();
                }
                h.remove();
            }
        });
    } else {
        const gabaritos = tempDiv.querySelectorAll('.gabarito, .respostas, .gabarito-bloco, [data-gabarito="true"]');
        gabaritos.forEach(g => {
            g.classList.add('gabarito-bloco');
        });
    }

    let htmlLimpo = tempDiv.innerHTML;
    return htmlLimpo;
}

/**
 * Sanitiza e limpa HTML colado de sites externos (Brasil Escola, Toda Matéria, SuperPro, etc.)
 * Remove MathJax parasita (role="presentation"), backgrounds brancos sobrepostos e tags quebradas.
 */
export function sanitizarEFormatadorHTMLColado(html) {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Remove MathJax/KaTeX DOM residual externo
    tempDiv.querySelectorAll('[role="presentation"], .MathJax, .MathJax_Display, .mjx-chtml').forEach(node => {
        node.removeAttribute('role');
        node.removeAttribute('tabindex');
        const styleAttr = node.getAttribute('style') || '';
        if (styleAttr.includes('scroll-behavior') || styleAttr.includes('max-width: none')) {
            node.removeAttribute('style');
        }
    });

    // Remove fundos brancos brutos que anulam a cor verde do Gabarito ou amarela do Destaque
    tempDiv.querySelectorAll('*').forEach(el => {
        if (el.style) {
            const bg = (el.style.backgroundColor || el.style.background || '').toLowerCase().replace(/\s/g, '');
            if (bg === '#fff' || bg === '#ffffff' || bg === 'rgb(255,255,255)' || bg === 'white' || bg === 'transparent') {
                el.style.backgroundColor = '';
                el.style.background = '';
            }
        }
        if (!el.getAttribute('style') || el.getAttribute('style').trim() === '') {
            el.removeAttribute('style');
        }
    });

    return tempDiv.innerHTML;
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

        if (val.trim()) {
            previewEl.style.display = 'block';

            // Processa linha a linha antes da compilação KaTeX para evitar injetar <br> em atributos SVG d de raiz quadrada
            const linhasProcessadas = val.split('\n').map(linha => {
                let txt = window.escapeHTML ? window.escapeHTML(linha) : linha;
                if (window.criarMaterialView && typeof window.criarMaterialView.formatarFormatacaoInLine === 'function') {
                    txt = window.criarMaterialView.formatarFormatacaoInLine(txt);
                }
                return formatarTextoComLatex(txt);
            }).join('<br>');

            previewEl.innerHTML = `
                <div style="font-size: 0.6875rem; font-weight: 800; color: #4f46e5; text-transform: uppercase; margin-bottom: 0.375rem; display: flex; align-items: center; gap: 0.25rem;">
                    <i class="fas fa-eye"></i> Pré-visualização Pedagógica ao Vivo (KaTeX)
                </div>
                <div style="padding: 0.875rem 1rem; background-color: #ffffff; border: 1px dashed #cbd5e1; border-radius: 8px; font-size: 0.9375rem; color: #0f172a; line-height: 1.6; min-height: 60px;">
                    ${linhasProcessadas}
                </div>
            `;
            renderMath(previewEl);
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
            <div class="custom-scrollbar preview-katex-box" style="min-height: ${Math.max(textarea.offsetHeight || 65, 65)}px; max-height: 380px; overflow-y: auto; padding: 0.75rem 1rem; background-color: var(--color-slate-50, #f8fafc); border: 2px dashed #a5b4fc; border-radius: var(--radius-xl, 12px); font-size: 0.9375rem; color: var(--color-slate-800, #1e293b); line-height: 1.6; cursor: pointer; transition: all 0.2s ease;"
                 title="Clique para voltar a editar este texto">
                ${html}
            </div>
        `;

        const clickHandler = () => {
            preview.removeEventListener('click', clickHandler);
            alternarModoEdicaoPreview(textarea, preview, btn);
        };
        preview.addEventListener('click', clickHandler, { once: true });
        textarea.style.display = 'none';
        preview.style.display = 'block';

        if (btn) {
            btn.innerHTML = '<i class="fas fa-edit"></i> <span>Editar Texto</span>';
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
        }

        renderMath(preview);
    }
}

/**
 * Extrai texto e estrutura HTML de um arquivo .docx utilizando descompressão nativa DecompressionStream
 * e DOMParser sem qualquer dependência externa ou biblioteca npm.
 * @param {File|Blob|ArrayBuffer} fileOuBuffer 
 * @returns {Promise<{ texto: string, html: string }>}
 */
export async function extrairTextoDocx(fileOuBuffer) {
    try {
        let buffer;
        if (fileOuBuffer instanceof ArrayBuffer) {
            buffer = fileOuBuffer;
        } else if (fileOuBuffer && typeof fileOuBuffer.arrayBuffer === 'function') {
            buffer = await fileOuBuffer.arrayBuffer();
        } else {
            return { texto: "", html: "" };
        }

        const uint8 = new Uint8Array(buffer);
        const dataView = new DataView(buffer);
        let offset = 0;
        let documentXmlBytes = null;
        let compressionMethod = 0;

        // Itera pelos cabeçalhos locais do arquivo ZIP (PK\x03\x04 = 0x04034b50 em little endian)
        while (offset < uint8.length - 30) {
            if (dataView.getUint32(offset, true) === 0x04034b50) {
                const compMethod = dataView.getUint16(offset + 8, true);
                const compressedSize = dataView.getUint32(offset + 18, true);
                const fileNameLen = dataView.getUint16(offset + 26, true);
                const extraFieldLen = dataView.getUint16(offset + 28, true);

                const fileNameBytes = uint8.slice(offset + 30, offset + 30 + fileNameLen);
                const fileName = new TextDecoder('utf-8').decode(fileNameBytes);

                const dataStart = offset + 30 + fileNameLen + extraFieldLen;

                if (fileName === 'word/document.xml') {
                    compressionMethod = compMethod;
                    if (compressedSize > 0) {
                        documentXmlBytes = uint8.slice(dataStart, dataStart + compressedSize);
                    } else {
                        let nextHeader = dataStart;
                        while (nextHeader < uint8.length - 4) {
                            const sig = dataView.getUint32(nextHeader, true);
                            if (sig === 0x04034b50 || sig === 0x02014b50 || sig === 0x08074b50) break;
                            nextHeader++;
                        }
                        documentXmlBytes = uint8.slice(dataStart, nextHeader);
                    }
                    break;
                }

                offset = dataStart + (compressedSize > 0 ? compressedSize : 0);
                if (compressedSize === 0) offset += 1;
            } else {
                offset++;
            }
        }

        if (!documentXmlBytes || documentXmlBytes.length === 0) {
            return { texto: "", html: "" };
        }

        let xmlString = "";
        if (compressionMethod === 8) {
            if (typeof DecompressionStream !== 'undefined') {
                const ds = new DecompressionStream('deflate-raw');
                const stream = new Blob([documentXmlBytes]).stream().pipeThrough(ds);
                xmlString = await new Response(stream).text();
            } else {
                xmlString = new TextDecoder('utf-8').decode(documentXmlBytes);
            }
        } else {
            xmlString = new TextDecoder('utf-8').decode(documentXmlBytes);
        }

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");
        const paragraphs = xmlDoc.getElementsByTagName("w:p");

        const paragrafosTexto = [];
        const paragrafosHtml = [];

        for (let i = 0; i < paragraphs.length; i++) {
            const p = paragraphs[i];
            const textNodes = p.getElementsByTagName("w:t");
            let pText = "";
            for (let j = 0; j < textNodes.length; j++) {
                pText += textNodes[j].textContent || "";
            }
            pText = pText.trim();
            if (!pText) continue;

            paragrafosTexto.push(pText);

            const pStyle = p.getElementsByTagName("w:pStyle")[0];
            const styleVal = pStyle ? (pStyle.getAttribute("w:val") || "") : "";

            if (styleVal.toLowerCase().includes("heading1") || styleVal.toLowerCase().includes("título1")) {
                paragrafosHtml.push(`<h2>${escapeHTML(pText)}</h2>`);
            } else if (styleVal.toLowerCase().includes("heading") || styleVal.toLowerCase().includes("título")) {
                paragrafosHtml.push(`<h3>${escapeHTML(pText)}</h3>`);
            } else if (p.getElementsByTagName("w:numPr").length > 0) {
                paragrafosHtml.push(`<li>${escapeHTML(pText)}</li>`);
            } else {
                paragrafosHtml.push(`<p>${escapeHTML(pText)}</p>`);
            }
        }

        return {
            texto: paragrafosTexto.join("\n\n"),
            html: paragrafosHtml.join("\n")
        };
    } catch (err) {
        console.warn("⚠️ Extração nativa de .docx encontrou um aviso:", err);
        return { texto: "", html: "" };
    }
}

/**
 * Extrai texto e HTML formatado de qualquer documento suportado (.docx, .doc, .pdf, .txt, .md).
 * @param {File} file 
 * @returns {Promise<{ titulo: string, texto: string, html: string, sucesso: boolean, aviso: string, extensao: string, tamanhoBytes: number }>}
 */
export async function extrairDocumentoCompleto(file) {
    if (!file) return { titulo: "", texto: "", html: "", sucesso: false, aviso: "Nenhum arquivo fornecido.", extensao: "", tamanhoBytes: 0 };

    const nomeOriginal = file.name || "Material_Importado";
    const partesNome = nomeOriginal.split('.');
    const extensao = partesNome.length > 1 ? partesNome.pop().toLowerCase() : "";
    const tituloSugerido = partesNome.join('.').replace(/[-_]/g, ' ').trim();
    const tamanhoBytes = file.size || 0;

    try {
        if (extensao === 'docx') {
            const res = await extrairTextoDocx(file);
            if (res.texto && res.texto.trim().length > 0) {
                return {
                    titulo: tituloSugerido,
                    texto: res.texto,
                    html: res.html || res.texto.split('\n\n').map(p => `<p>${escapeHTML(p)}</p>`).join('\n'),
                    sucesso: true,
                    aviso: "",
                    extensao,
                    tamanhoBytes
                };
            }
        }

        if (extensao === 'doc') {
            // Verifica se é arquivo .doc baseado em HTML (formato gerado pelo Planner Pro / Word Web)
            const conteudoRaw = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result || "");
                reader.onerror = reject;
                reader.readAsText(file, 'utf-8');
            });

            if (conteudoRaw.includes('<html') || conteudoRaw.includes('<body') || conteudoRaw.includes('<p>')) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(conteudoRaw, 'text/html');
                const bodyHtml = doc.body ? doc.body.innerHTML : conteudoRaw;
                const textContent = (doc.body ? doc.body.textContent : conteudoRaw).replace(/\s+/g, ' ').trim();
                return {
                    titulo: tituloSugerido,
                    texto: textContent,
                    html: bodyHtml,
                    sucesso: true,
                    aviso: "",
                    extensao,
                    tamanhoBytes
                };
            } else {
                // Fallback para arquivo binário antigo Word 97-2003
                const textoExtraido = conteudoRaw.replace(/[^\x20-\x7E\u00A0-\u00FF\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
                return {
                    titulo: tituloSugerido,
                    texto: textoExtraido,
                    html: textoExtraido ? textoExtraido.split('\n\n').map(p => `<p>${escapeHTML(p)}</p>`).join('\n') : `<p>${escapeHTML(nomeOriginal)}</p>`,
                    sucesso: Boolean(textoExtraido),
                    aviso: textoExtraido ? "" : "Arquivo .doc binário legado. Recomendamos salvar como .docx para melhor formatação.",
                    extensao,
                    tamanhoBytes
                };
            }
        }

        if (extensao === 'pdf') {
            const rawContent = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result || "");
                reader.onerror = reject;
                reader.readAsBinaryString(file);
            });

            const textMatches = rawContent.match(/\(([^)]+)\)\s*Tj|\[([^\]]+)\]\s*TJ/g);
            let textoExtraido = "";
            if (textMatches && textMatches.length > 0) {
                textoExtraido = textMatches.map(m => m.replace(/[()[\]TjTJ]/g, '').trim()).join(' ');
            } else {
                textoExtraido = rawContent.replace(/[^\x20-\x7E\u00A0-\u00FF\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
            }

            // Remove fragmentos técnicos de PDF se não houver texto legível
            const palavrasLegiveis = (textoExtraido.match(/[A-Za-zÀ-ÿ]{3,}/g) || []).length;
            const isScanned = palavrasLegiveis < 5;

            return {
                titulo: tituloSugerido,
                texto: isScanned ? "" : textoExtraido.substring(0, 45000),
                html: isScanned ? "" : textoExtraido.substring(0, 45000).split('\n\n').map(p => `<p>${escapeHTML(p)}</p>`).join('\n'),
                sucesso: !isScanned,
                aviso: isScanned ? "Este arquivo PDF parece ser uma imagem digitalizada sem camada de texto pesquisável (OCR). O arquivo foi anexado ao seu acervo e pode ser organizado em pastas." : "",
                extensao,
                tamanhoBytes
            };
        }

        // TXT, MD, CSV, JSON
        const textoPlano = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result || "");
            reader.onerror = reject;
            reader.readAsText(file, 'utf-8');
        });

        const paragrafos = textoPlano.split(/\r?\n\r?\n/).filter(p => p.trim());
        const htmlGerado = paragrafos.map(p => {
            if (p.startsWith('# ')) return `<h1>${escapeHTML(p.replace(/^#\s+/, ''))}</h1>`;
            if (p.startsWith('## ')) return `<h2>${escapeHTML(p.replace(/^##\s+/, ''))}</h2>`;
            if (p.startsWith('### ')) return `<h3>${escapeHTML(p.replace(/^###\s+/, ''))}</h3>`;
            if (p.startsWith('- ') || p.startsWith('* ')) return `<li>${escapeHTML(p.replace(/^[-*]\s+/, ''))}</li>`;
            return `<p>${escapeHTML(p)}</p>`;
        }).join('\n');

        return {
            titulo: tituloSugerido,
            texto: textoPlano,
            html: htmlGerado,
            sucesso: true,
            aviso: "",
            extensao,
            tamanhoBytes
        };
    } catch (e) {
        console.error("Erro na extração de documento:", e);
        return {
            titulo: tituloSugerido,
            texto: "",
            html: "",
            sucesso: false,
            aviso: `Não foi possível extrair o conteúdo do arquivo ${nomeOriginal}.`,
            extensao,
            tamanhoBytes
        };
    }
}

/**
 * Lê o conteúdo textual de um arquivo (TXT, MD, CSV, JSON, DOCX, DOC, PDF) no navegador.
 * @param {File} file 
 * @returns {Promise<string>}
 */
export async function lerArquivoTexto(file) {
    if (!file) return "";
    const doc = await extrairDocumentoCompleto(file);
    return doc.texto || "";
}

/**
 * Ordena uma lista de estudantes de acordo com diferentes critérios pedagógicos e administrativos.
 * Critérios suportados:
 * - 'chamada_asc': Número de chamada crescente (1, 2, 3...)
 * - 'chamada_desc': Número de chamada decrescente
 * - 'nome_asc': Ordem alfabética pelo nome (A - Z)
 * - 'nome_desc': Ordem alfabética inversa (Z - A)
 * - 'matricula_asc': Matrícula ou ID institucional
 * - 'status_nome': Situação ('cursando' no topo) + Ordem alfabética simultaneamente
 * @param {Array} estudantes - Array de objetos de estudantes.
 * @param {string} [criterio='chamada_asc'] - Critério de ordenação.
 * @returns {Array} Nova array com os estudantes ordenados.
 */
export function ordenarEstudantes(estudantes, criterio = 'chamada_asc') {
    if (!Array.isArray(estudantes)) return [];
    const lista = [...estudantes];

    const extrairNumeroChamada = (val) => {
        if (val === null || val === undefined) return 999999;
        const n = parseInt(String(val).replace(/\D/g, ''), 10);
        return isNaN(n) ? 999999 : n;
    };

    switch (criterio) {
        case 'nome_asc':
            return lista.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
        case 'nome_desc':
            return lista.sort((a, b) => (b.nome || '').localeCompare(a.nome || '', 'pt-BR', { sensitivity: 'base' }));
        case 'chamada_asc':
            return lista.sort((a, b) => {
                const nA = extrairNumeroChamada(a.chamada || a.numero);
                const nB = extrairNumeroChamada(b.chamada || b.numero);
                if (nA !== nB) return nA - nB;
                return (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' });
            });
        case 'chamada_desc':
            return lista.sort((a, b) => {
                const nA = extrairNumeroChamada(a.chamada || a.numero);
                const nB = extrairNumeroChamada(b.chamada || b.numero);
                if (nA !== nB) return nB - nA;
                return (b.nome || '').localeCompare(a.nome || '', 'pt-BR', { sensitivity: 'base' });
            });
        case 'matricula_asc':
            return lista.sort((a, b) => (a.matricula || a.id || '').localeCompare(b.matricula || b.id || '', 'pt-BR', { numeric: true }));
        case 'status_nome':
            // Prioridade de status: 'cursando' (0), outros (1)
            return lista.sort((a, b) => {
                const stA = (a.status || 'cursando').toLowerCase();
                const stB = (b.status || 'cursando').toLowerCase();
                const pesoA = stA === 'cursando' ? 0 : 1;
                const pesoB = stB === 'cursando' ? 0 : 1;
                if (pesoA !== pesoB) return pesoA - pesoB;
                return (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' });
            });
        default:
            return lista;
    }
}

/**
 * Comprime e redimensiona imagens client-side usando Canvas nativo (Zero dependências).
 * Reduz arquivos pesados (ex: fotos de 10MB da câmera) para ~150KB - 300KB com fidelidade visual ótima,
 * evitando estouro de memória RAM (OOM Crash) e timeouts de rede na comunicação com a IA.
 * 
 * @param {File|Blob|HTMLCanvasElement|HTMLImageElement|string} origem - Arquivo, Blob, Canvas, Image ou DataURL
 * @param {Object} [opcoes={}] - Configurações de compressão
 * @param {number} [opcoes.maxDimensao=1400] - Maior dimensão permitida (largura ou altura)
 * @param {number} [opcoes.qualidade=0.82] - Qualidade do JPEG (0.1 a 1.0)
 * @param {string} [opcoes.tipo='image/jpeg'] - Formato de saída ('image/jpeg', 'image/webp')
 * @returns {Promise<{base64: string, base64Pura: string, mimeType: string, tamanhoOriginalKB: number, tamanhoFinalKB: number, percentualReducao: number, largura: number, altura: number}>}
 */
export async function comprimirERedimensionarImagem(origem, opcoes = {}) {
    const maxDimensao = opcoes.maxDimensao || 1400;
    const qualidade = typeof opcoes.qualidade === 'number' ? opcoes.qualidade : 0.82;
    const tipo = opcoes.tipo || 'image/jpeg';

    let tamanhoOriginalBytes = 0;
    let imgElement = null;
    let urlTemporaria = null;
    let isBitmap = false;

    try {
        if (origem instanceof HTMLCanvasElement) {
            tamanhoOriginalBytes = origem.width * origem.height * 4;
            imgElement = origem;
        } else if (origem instanceof HTMLImageElement) {
            tamanhoOriginalBytes = (origem.naturalWidth || origem.width) * (origem.naturalHeight || origem.height) * 4;
            imgElement = origem;
        } else if (typeof ImageBitmap !== 'undefined' && origem instanceof ImageBitmap) {
            tamanhoOriginalBytes = origem.width * origem.height * 4;
            imgElement = origem;
            isBitmap = true;
        } else if (origem instanceof Blob || origem instanceof File) {
            tamanhoOriginalBytes = origem.size;

            // Camada 1: createImageBitmap nativo (mais rápido e assíncrono fora da main-thread)
            if (typeof createImageBitmap === 'function') {
                try {
                    imgElement = await createImageBitmap(origem);
                    isBitmap = true;
                } catch (bitmapErr) {
                    console.warn("createImageBitmap falhou, utilizando fallback FileReader DataURL:", bitmapErr);
                    imgElement = null;
                }
            }

            // Camada 2: Fallback via FileReader readAsDataURL (compatível com CSP data:)
            if (!imgElement) {
                try {
                    const dataUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = () => reject(new Error("Falha ao ler arquivo com FileReader."));
                        reader.readAsDataURL(origem);
                    });

                    imgElement = await new Promise((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.onerror = () => reject(new Error("Falha ao decodificar DataURL da imagem."));
                        img.src = dataUrl;
                    });
                } catch (dataUrlErr) {
                    // Camada 3: Fallback via URL.createObjectURL (autorizado com blob: no CSP)
                    urlTemporaria = URL.createObjectURL(origem);
                    imgElement = await new Promise((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.onerror = () => reject(new Error("Falha ao carregar arquivo de imagem."));
                        img.src = urlTemporaria;
                    });
                }
            }
        } else if (typeof origem === 'string' && origem.startsWith('data:image/')) {
            tamanhoOriginalBytes = Math.round((origem.length * 3) / 4);
            imgElement = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error("Falha ao decodificar Base64 da imagem."));
                img.src = origem;
            });
        } else {
            throw new Error("Formato de origem inválido para compressão de imagem.");
        }

        const srcWidth = imgElement.naturalWidth || imgElement.videoWidth || imgElement.width || 800;
        const srcHeight = imgElement.naturalHeight || imgElement.videoHeight || imgElement.height || 600;

        let targetWidth = srcWidth;
        let targetHeight = srcHeight;

        if (srcWidth > maxDimensao || srcHeight > maxDimensao) {
            if (srcWidth >= srcHeight) {
                targetWidth = maxDimensao;
                targetHeight = Math.round((srcHeight * maxDimensao) / srcWidth);
            } else {
                targetHeight = maxDimensao;
                targetWidth = Math.round((srcWidth * maxDimensao) / srcHeight);
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });

        if (!ctx) {
            throw new Error("Não foi possível obter contexto 2D para processamento de imagem.");
        }

        // Fundo branco sólido para compatibilidade com JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(imgElement, 0, 0, targetWidth, targetHeight);

        // Aplica filtro de scanner de documentos caso especificado
        if (opcoes.filtroScanner && opcoes.filtroScanner !== 'original') {
            processarFiltroDocumentScanner(canvas, opcoes.filtroScanner, opcoes);
        }

        const base64Data = canvas.toDataURL(tipo, qualidade);
        const base64Pura = base64Data.split(',')[1] || base64Data;
        const tamanhoFinalBytes = Math.round((base64Pura.length * 3) / 4);

        const tamanhoOriginalKB = Math.round((tamanhoOriginalBytes / 1024) * 10) / 10 || (tamanhoFinalBytes / 1024);
        const tamanhoFinalKB = Math.round((tamanhoFinalBytes / 1024) * 10) / 10;
        const percentualReducao = tamanhoOriginalKB > tamanhoFinalKB
            ? Math.round(((tamanhoOriginalKB - tamanhoFinalKB) / tamanhoOriginalKB) * 1000) / 10
            : 0;

        // Desalocação ativa de memória do canvas temporário
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        canvas.width = 0;
        canvas.height = 0;

        return {
            base64: base64Data,
            base64Pura,
            mimeType: tipo,
            tamanhoOriginalKB,
            tamanhoFinalKB,
            percentualReducao,
            largura: targetWidth,
            altura: targetHeight
        };
    } finally {
        if (urlTemporaria) {
            URL.revokeObjectURL(urlTemporaria);
        }
        if (isBitmap && imgElement && typeof imgElement.close === 'function') {
            imgElement.close();
        }
    }
}

/**
 * Aplica filtros de digitalização de alta fidelidade (Scanner de Documentos) em um Canvas
 * em puro Vanilla JS, nivelando sombras desiguais, eliminando o fundo escuro/bege do papel
 * e maximizando o contraste óptico para leitura OMR e visão computacional.
 *
 * Modos suportados:
 * - 'scan_otimizado': Scanner Inteligente com remoção de sombras, fundo branco limpo e realce de tinta.
 * - 'scan_pb': Scanner Preto & Branco de alto contraste (estilo fotocopiadora/scanner de mesa).
 * - 'scan_binario': Limiarização adaptativa pura (binarização OMR estrita).
 * - 'original': Mantém a imagem original sem modificações.
 *
 * @param {HTMLCanvasElement} canvas - Elemento canvas a ser processado
 * @param {string} [modo='scan_otimizado'] - Modo de filtro desejado
 * @param {Object} [opcoes={}] - Configurações opcionais
 * @returns {HTMLCanvasElement} O próprio canvas modificado
 */
export function processarFiltroDocumentScanner(canvas, modo = 'scan_otimizado', opcoes = {}) {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) return canvas;
    if (modo === 'original') return canvas;

    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return canvas;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // 1. Matriz de amostragem em grade para estimativa do fundo da folha (eliminação de sombras de celular)
    const gridSize = Math.max(24, Math.min(48, Math.round(Math.min(width, height) / 25)));
    const gridCols = Math.ceil(width / gridSize);
    const gridRows = Math.ceil(height / gridSize);
    const bgMap = new Float32Array(gridCols * gridRows);

    // Amostra a luminância média/percentil alto em cada bloco para estimar a superfície do papel
    for (let gy = 0; gy < gridRows; gy++) {
        for (let gx = 0; gx < gridCols; gx++) {
            const startX = gx * gridSize;
            const startY = gy * gridSize;
            const endX = Math.min(width, startX + gridSize);
            const endY = Math.min(height, startY + gridSize);

            const samples = [];

            // Amostragem com passo 2 para processamento ultrarrápido (<10ms)
            for (let y = startY; y < endY; y += 2) {
                for (let x = startX; x < endX; x += 2) {
                    const idx = (y * width + x) * 4;
                    const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                    samples.push(lum);
                }
            }

            // Seleciona o percentil ~80 da célula (superfície iluminada do papel, descartando traços escuros de caneta)
            if (samples.length > 0) {
                samples.sort((a, b) => a - b);
                const p80 = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.82))];
                bgMap[gy * gridCols + gx] = Math.max(60, p80);
            } else {
                bgMap[gy * gridCols + gx] = 200;
            }
        }
    }

    // Interpolação bilinear suave da iluminação de fundo local
    const getBgLum = (x, y) => {
        const gx = (x / gridSize) - 0.5;
        const gy = (y / gridSize) - 0.5;
        const x0 = Math.max(0, Math.min(gridCols - 1, Math.floor(gx)));
        const y0 = Math.max(0, Math.min(gridRows - 1, Math.floor(gy)));
        const x1 = Math.min(gridCols - 1, x0 + 1);
        const y1 = Math.min(gridRows - 1, y0 + 1);
        const fx = Math.max(0, Math.min(1, gx - x0));
        const fy = Math.max(0, Math.min(1, gy - y0));

        const top = bgMap[y0 * gridCols + x0] * (1 - fx) + bgMap[y0 * gridCols + x1] * fx;
        const bottom = bgMap[y1 * gridCols + x0] * (1 - fx) + bgMap[y1 * gridCols + x1] * fx;
        return top * (1 - fy) + bottom * fy;
    };

    // 2. Aplicação da transformação de pixel
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const origLum = 0.299 * r + 0.587 * g + 0.114 * b;
            const localBg = getBgLum(x, y);

            // Nivelamento do fundo: normaliza a intensidade dividindo pela iluminação local
            const normLum = Math.min(255, (origLum / Math.max(40, localBg)) * 245);

            if (modo === 'scan_binario') {
                // Binarização estrita: marcas escuras tornam-se 0 (preto), papel vira 255 (branco)
                const isInk = normLum < 185;
                const val = isInk ? 0 : 255;
                data[idx] = val;
                data[idx + 1] = val;
                data[idx + 2] = val;
            } else if (modo === 'scan_pb') {
                // Scanner Preto & Branco com curva de alto contraste
                let finalVal;
                if (normLum >= 210) {
                    finalVal = 255;
                } else if (normLum <= 120) {
                    finalVal = Math.max(0, Math.round(normLum * 0.7));
                } else {
                    const t = (normLum - 120) / (210 - 120);
                    finalVal = Math.round(84 + t * (255 - 84));
                }
                data[idx] = finalVal;
                data[idx + 1] = finalVal;
                data[idx + 2] = finalVal;
            } else {
                // 'scan_otimizado' (Scanner Inteligente / Magic Color):
                // Limpa o fundo do papel para branco e intensifica caneta preta/azul
                let boostLum;
                if (normLum >= 205) {
                    boostLum = 255;
                } else if (normLum <= 130) {
                    boostLum = Math.max(0, Math.round(normLum * 0.75));
                } else {
                    const t = (normLum - 130) / (205 - 130);
                    boostLum = Math.round(97 + t * (255 - 97));
                }

                if (boostLum === 255) {
                    data[idx] = 255;
                    data[idx + 1] = 255;
                    data[idx + 2] = 255;
                } else {
                    const scale = origLum > 0 ? boostLum / origLum : 1;
                    data[idx] = Math.min(255, Math.max(0, Math.round(r * scale)));
                    data[idx + 1] = Math.min(255, Math.max(0, Math.round(g * scale)));
                    data[idx + 2] = Math.min(255, Math.max(0, Math.round(b * scale)));
                }
            }
        }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
}

/**
 * Adiciona um novo código BNCC a uma string de códigos existentes separados por vírgula.
 * Evita duplicidades (case-insensitive) e formata com vírgula e espaço.
 * @param {string} stringAtual 
 * @param {string} novoCodigo 
 * @returns {string}
 */
export function adicionarCodigoBNCC(stringAtual, novoCodigo) {
    if (!novoCodigo) return stringAtual || '';
    const codLimpo = String(novoCodigo).trim();
    if (!codLimpo) return stringAtual || '';
    if (!stringAtual || !String(stringAtual).trim()) {
        return codLimpo;
    }

    const existentes = String(stringAtual)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    const codUpper = codLimpo.toUpperCase();
    if (!existentes.some(c => c.toUpperCase() === codUpper)) {
        existentes.push(codLimpo);
    }
    return existentes.join(', ');
}

/**
 * Realiza busca multi-termo separada por vírgulas (lógica AND independente de ordem / permutação)
 * em campos textuais de um objeto de material ou questão.
 * @param {Object} item - Objeto do material/questão
 * @param {Array<string>} fields - Lista de propriedades a verificar
 * @param {string} queryStr - Busca do usuário (ex: "EF09MA07, EF09MA01")
 * @returns {boolean}
 */
export function matchMultiTermos(item, fields, queryStr) {
    if (!queryStr || !String(queryStr).trim()) return true;
    if (!item) return false;

    const termos = String(queryStr)
        .split(',')
        .map(t => normalizeText(t.trim()))
        .filter(Boolean);

    if (termos.length === 0) return true;

    const textoCompleto = fields
        .map(f => normalizeText(String(item[f] || '')))
        .join(' ');

    return termos.every(termo => textoCompleto.includes(termo));
}

/**
 * Verifica especificamente se o campo BNCC de um material contém todas as habilidades especificadas na busca.
 * @param {string} materialBnccStr 
 * @param {string} queryStr 
 * @returns {boolean}
 */
export function matchBNCC(materialBnccStr, queryStr) {
    if (!queryStr || !String(queryStr).trim()) return true;
    if (!materialBnccStr || !String(materialBnccStr).trim()) return false;

    const bnccTexto = normalizeText(String(materialBnccStr));
    const termos = String(queryStr)
        .split(',')
        .map(t => normalizeText(t.trim()))
        .filter(Boolean);

    if (termos.length === 0) return true;

    return termos.every(termo => bnccTexto.includes(termo));
}

/**
 * Sanitiza nomes de arquivos para download (PDF, Word), removendo caracteres proibidos por sistemas de arquivos.
 * @param {string} nome - Nome bruto do arquivo
 * @returns {string} Nome sanitizado seguro para o SO
 */
export function sanitizarNomeArquivo(nome) {
    if (!nome) return 'documento_pedagogico';
    return String(nome)
        .replace(/[\/\\:\*\?"<>\|]/g, '_')
        .replace(/\s+/g, '_')
        .trim();
}

if (typeof window !== 'undefined') {
    window.escapeHTML = escapeHTML;
    window.sanitizeComLatex = sanitizeComLatex;
    window.renderMath = renderMath;
    window.renderKatex = renderKatex;
    window.formatarTextoComLatex = formatarTextoComLatex;
    window.prepararHTMLParaExportacao = prepararHTMLParaExportacao;
    window.anexarPreviewLatex = anexarPreviewLatex;
    window.alternarModoEdicaoPreview = alternarModoEdicaoPreview;
    window.extrairTextoDocx = extrairTextoDocx;
    window.extrairDocumentoCompleto = extrairDocumentoCompleto;
    window.lerArquivoTexto = lerArquivoTexto;
    window.generateId = generateId;
    window.generateUUID = generateUUID;
    window.generateSecurePIN = generateSecurePIN;
    window.secureRandomInt = secureRandomInt;
    window.converterLatexParaMathML = converterLatexParaMathML;
    window.converterHtmlLatexParaWordEquations = converterHtmlLatexParaWordEquations;
    window.copiarParaWordComEquacoes = copiarParaWordComEquacoes;
    window.secureShuffle = secureShuffle;
    window.ordenarEstudantes = ordenarEstudantes;
    window.comprimirERedimensionarImagem = comprimirERedimensionarImagem;
    window.processarFiltroDocumentScanner = processarFiltroDocumentScanner;
    window.adicionarCodigoBNCC = adicionarCodigoBNCC;
    window.matchMultiTermos = matchMultiTermos;
    window.matchBNCC = matchBNCC;
    window.sanitizarNomeArquivo = sanitizarNomeArquivo;
    window.exportarMaterialWord = exportarMaterialWord;
    window.criarZipBinario = criarZipBinario;
    window.EventDelegator = EventDelegator;
}




