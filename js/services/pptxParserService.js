import { generateId, escapeHTML } from '../utils.js';

/**
 * Módulo de Serviços para Leitura e Descompactação de Arquivos PowerPoint (.pptx) Client-Side
 * Utiliza JSZip para ler a estrutura OpenXML do arquivo .pptx diretamente no navegador.
 */
export const pptxParserService = {
    /**
     * Verifica se a biblioteca JSZip está disponível
     */
    isSupported() {
        return typeof window !== 'undefined' && typeof window.JSZip !== 'undefined';
    },

    /**
     * Carrega e converte um arquivo File (.pptx) para a estrutura nativa de Apresentação do Planner Pro
     * @param {File} file Arquivo .pptx
     * @returns {Promise<Object>} Estrutura pronta da apresentação
     */
    async parsePPTXFile(file) {
        if (!this.isSupported()) {
            throw new Error("A biblioteca JSZip não está carregada no sistema. Verifique a conexão com a CDN.");
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const zip = await window.JSZip.loadAsync(arrayBuffer);

            // 1. Identifica arquivos de slides e ordenação
            const slideFiles = Object.keys(zip.files).filter(path => /^ppt\/slides\/slide\d+\.xml$/i.test(path));
            
            // Ordena numericamente slide1.xml, slide2.xml ... slide10.xml
            slideFiles.sort((a, b) => {
                const numA = parseInt(a.match(/slide(\d+)\.xml/i)[1], 10);
                const numB = parseInt(b.match(/slide(\d+)\.xml/i)[1], 10);
                return numA - numB;
            });

            if (slideFiles.length === 0) {
                throw new Error("Nenhum slide válido encontrado dentro do arquivo PPTX.");
            }

            const nomeSemExtensao = file.name.replace(/\.[^/.]+$/, "");
            const slidesConvertidos = [];

            // Extrai imagens associadas
            const mediaFiles = Object.keys(zip.files).filter(path => path.startsWith('ppt/media/'));
            const imageMap = new Map(); // relId/path -> dataUrl

            for (const mediaPath of mediaFiles) {
                try {
                    const imgBlob = await zip.files[mediaPath].async('blob');
                    const dataUrl = await this._blobToDataURL(imgBlob);
                    imageMap.set(mediaPath, dataUrl);
                } catch (e) {
                    console.warn(`Erro ao extrair imagem ${mediaPath}:`, e);
                }
            }

            // 2. Itera sobre cada arquivo de slide
            for (let i = 0; i < slideFiles.length; i++) {
                const slidePath = slideFiles[i];
                const slideXmlText = await zip.files[slidePath].async('text');
                const slideRelsPath = slidePath.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
                
                let relsMap = new Map();
                if (zip.files[slideRelsPath]) {
                    const relsXmlText = await zip.files[slideRelsPath].async('text');
                    relsMap = this._parseRelsXml(relsXmlText);
                }

                const slideObj = this._parseSlideXml(slideXmlText, i, relsMap, imageMap);
                slidesConvertidos.push(slideObj);
            }

            // 3. Monta o objeto de apresentação
            const tituloApresentacao = slidesConvertidos[0]?.titulo || nomeSemExtensao || 'Apresentação PPTX Importada';

            return {
                titulo: tituloApresentacao,
                subtitulo: `Importado de ${file.name}`,
                disciplina: 'Geral',
                temaVisual: 'modern-dark',
                transicao: 'slide',
                modoOrigem: 'pptx',
                slides: slidesConvertidos,
                notasGerais: `Arquivo importado em ${new Date().toLocaleDateString('pt-BR')} via Planner PPTX Reader.`
            };
        } catch (error) {
            console.error("❌ Erro ao decodificar arquivo PPTX:", error);
            throw new Error(`Não foi possível processar o PPTX: ${error.message}`);
        }
    },

    /**
     * Converte um Blob de imagem em DataURL (Base64)
     */
    _blobToDataURL(blob, isSvg = false) {
        return new Promise((resolve, reject) => {
            if (isSvg || (blob.type && blob.type.includes('svg'))) {
                const reader = new FileReader();
                reader.onload = () => {
                    const text = reader.result;
                    const encoded = btoa(unescape(encodeURIComponent(text)));
                    resolve(`data:image/svg+xml;base64,${encoded}`);
                };
                reader.onerror = reject;
                reader.readAsText(blob);
            } else {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }
        });
    },

    /**
     * Processa arquivo _rels do slide para associar IDs de relação a caminhos de mídia
     */
    _parseRelsXml(relsXmlText) {
        const relsMap = new Map();
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(relsXmlText, "text/xml");
            const relationships = xmlDoc.getElementsByTagName("Relationship");

            for (let i = 0; i < relationships.length; i++) {
                const id = relationships[i].getAttribute("Id");
                const target = relationships[i].getAttribute("Target");
                if (id && target) {
                    const cleanTarget = target.replace(/^(\.\.\/)+/, 'ppt/');
                    relsMap.set(id, cleanTarget);
                }
            }
        } catch (e) {
            console.warn("Erro ao ler relações do slide:", e);
        }
        return relsMap;
    },

    /**
     * Decodifica a estrutura XML de um slide individual (<p:sld>)
     */
    _parseSlideXml(xmlText, index, relsMap, imageMap) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        let titulo = '';
        let subtitulo = '';
        const paragrafosTextos = [];
        const topicosList = [];
        let imagemUrlSlide = '';
        let tabelaHtmlSlide = '';

        // 1. Extração de formas de texto (<p:sp>)
        const shapes = xmlDoc.getElementsByTagName("p:sp");
        for (let i = 0; i < shapes.length; i++) {
            const sp = shapes[i];
            const textNodes = sp.getElementsByTagName("a:t");
            const textParts = [];

            for (let j = 0; j < textNodes.length; j++) {
                const val = textNodes[j].textContent;
                if (val && val.trim()) {
                    textParts.push(val.trim());
                }
            }

            if (textParts.length > 0) {
                const fullText = textParts.join(' ');
                
                const phElem = sp.getElementsByTagName("p:ph")[0];
                const type = phElem ? phElem.getAttribute("type") : "";

                if ((type === "title" || type === "ctrTitle" || !titulo) && index === 0) {
                    if (!titulo) titulo = fullText;
                    else if (!subtitulo) subtitulo = fullText;
                } else if ((type === "title" || type === "subTitle") && !titulo) {
                    titulo = fullText;
                } else {
                    if (!titulo) {
                        titulo = fullText;
                    } else {
                        topicosList.push(fullText);
                        paragrafosTextos.push(fullText);
                    }
                }
            }
        }

        // 2. Extração de Tabelas Complexas (<a:tbl>)
        const tables = xmlDoc.getElementsByTagName("a:tbl");
        if (tables.length > 0) {
            const rowsHtml = [];
            for (let t = 0; t < tables.length; t++) {
                const trs = tables[t].getElementsByTagName("a:tr");
                for (let r = 0; r < trs.length; r++) {
                    const tcs = trs[r].getElementsByTagName("a:tc");
                    const cellHtmls = [];
                    for (let c = 0; c < tcs.length; c++) {
                        const cellTexts = [];
                        const textNodes = tcs[c].getElementsByTagName("a:t");
                        for (let k = 0; k < textNodes.length; k++) {
                            if (textNodes[k].textContent && textNodes[k].textContent.trim()) {
                                cellTexts.push(escapeHTML(textNodes[k].textContent.trim()));
                            }
                        }
                        const cellContent = cellTexts.join(' ') || '&nbsp;';
                        const isHeader = (r === 0);
                        const tag = isHeader ? 'th' : 'td';
                        const style = isHeader 
                            ? 'padding: 8px; border: 1px solid rgba(255,255,255,0.2); background-color: rgba(99,102,241,0.2); color: #ffffff; font-weight: bold; text-align: left;'
                            : 'padding: 8px; border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1;';
                        cellHtmls.push(`<${tag} style="${style}">${cellContent}</${tag}>`);
                    }
                    if (cellHtmls.length > 0) {
                        rowsHtml.push(`<tr>${cellHtmls.join('')}</tr>`);
                    }
                }
            }
            if (rowsHtml.length > 0) {
                tabelaHtmlSlide = `<table style="width: 100%; border-collapse: collapse; margin: 1rem 0; border: 1px solid rgba(255,255,255,0.15); border-radius: var(--radius-lg); overflow: hidden;"><tbody>${rowsHtml.join('')}</tbody></table>`;
                paragrafosTextos.push("[Tabela Importada]");
            }
        }

        // 3. Extração de Imagens e Vetores SVG (<p:pic> e <asvg:svgBlip>)
        const blips = xmlDoc.querySelectorAll("blip, svgBlip, a\\:blip, asvg\\:svgBlip");
        for (let b = 0; b < blips.length; b++) {
            const blip = blips[b];
            const embedId = blip.getAttribute("r:embed") || blip.getAttribute("r:link");
            if (embedId && relsMap.has(embedId)) {
                const mediaPath = relsMap.get(embedId);
                if (imageMap.has(mediaPath)) {
                    imagemUrlSlide = imageMap.get(mediaPath);
                    break;
                }
            }
        }

        // Fallback p:pic convencional
        if (!imagemUrlSlide) {
            const pics = xmlDoc.getElementsByTagName("p:pic");
            if (pics.length > 0) {
                const blip = pics[0].getElementsByTagName("a:blip")[0];
                if (blip) {
                    const embedId = blip.getAttribute("r:embed");
                    if (embedId && relsMap.has(embedId)) {
                        const mediaPath = relsMap.get(embedId);
                        if (imageMap.has(mediaPath)) {
                            imagemUrlSlide = imageMap.get(mediaPath);
                        }
                    }
                }
            }
        }

        // Título default caso ausente
        if (!titulo) {
            titulo = index === 0 ? "Apresentação Pedagógica" : `Slide ${index + 1}`;
        }

        // Layout sugestivo
        let tipoLayout = 'titulo-texto';
        if (index === 0) {
            tipoLayout = 'capa';
        } else if (topicosList.length >= 2) {
            tipoLayout = 'topicos-animados';
        } else if (imagemUrlSlide) {
            tipoLayout = 'imagem';
        }

        const conteudoFinalText = paragrafosTextos.join('\n\n') + (tabelaHtmlSlide ? `\n\n${tabelaHtmlSlide}` : '');

        return {
            id: generateId('slide'),
            tipoLayout,
            titulo: escapeHTML(titulo),
            subtitulo: escapeHTML(subtitulo),
            conteudo: conteudoFinalText,
            topicos: topicosList.map(t => escapeHTML(t)),
            imagemUrl: imagemUrlSlide,
            tabelaHtml: tabelaHtmlSlide,
            notasProfessor: `Slide ${index + 1} importado do PowerPoint.`,
            animacaoEntrada: 'fade-up'
        };
    }
};
