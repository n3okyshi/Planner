/**
 * @file ai-service.js
 * @description Módulo responsável pela comunicação com a IA do Google (Gemini) para geração automática de conteúdo.
 * @module services/aiService
 */

export const aiService = {
    /** * Chave de API obscurecida em Base64 para evitar detecção automática por scrapers simples.
     * Nota: Isso não é criptografia de segurança, apenas ofuscação.
     * @private
     * @type {string}
     */
    _k: 'QUl6YVN5RGowZ2k5cWVNMkxocFdCWFMzNUNEdHhZUW1PR3JDVzVJ',

    /**
     * Retorna a chave de API decodificada em tempo de execução.
     * @returns {string} A chave da API decodificada ou string vazia se falhar.
     */
    get API_KEY() {
        try {
            return atob(this._k);
        } catch (e) {
            console.error("Erro ao decodificar API Key:", e);
            return "";
        }
    },

    /** * Lista de modelos disponíveis para estratégia de fallback (tentativa e erro).
     * Se o primeiro falhar (ex: rate limit), tenta o próximo.
     * @type {Array<{id: string, v: string}>}
     */
    MODELOS: [
        { id: 'gemini-2.5-flash-lite', v: 'v1beta' },
        { id: 'gemini-3-flash-preview', v: 'v1beta' },
        { id: 'gemini-2.5-flash', v: 'v1beta' },
        { id: 'gemini-flash-lite-latest', v: 'v1beta' }
    ],

    /**
     * Pausa a execução por um tempo determinado (útil para backoff exponencial).
     * @private
     * @param {number} ms - Milissegundos para esperar.
     * @returns {Promise<void>}
     */
    _esperar: (ms) => new Promise(res => setTimeout(res, ms)),

    /**
     * Gera uma questão inédita baseada nos parâmetros pedagógicos fornecidos.
     * Utiliza uma estratégia de rotação de modelos para garantir alta disponibilidade.
     * @async
     * @param {Object} params - Parâmetros da questão.
     * @param {string} params.materia - Disciplina escolar (ex: Matemática).
     * @param {Object} params.habilidade - Objeto contendo {codigo, descricao} da BNCC.
     * @param {number} params.dificuldade - Nível de dificuldade (1=Fácil a 3=Difícil).
     * @param {string} params.tipo - 'multipla' ou 'aberta'.
     * @returns {Promise<Object>} Objeto da questão formatado com enunciado e alternativas/gabarito.
     * @throws {Error} Se todos os modelos falharem.
     */
    async gerarQuestao({ materia, habilidade, dificuldade, tipo }) {
        const diffLabels = ["Aleatória", "Fácil", "Média", "Difícil"];

        // Prompt otimizado para gerar JSON puro
        const prompt = `
            Atue como um professor especialista. Crie uma questão inédita para a disciplina de ${materia}.
            Baseie-se na habilidade BNCC: ${habilidade.codigo} - ${habilidade.descricao}.
            Dificuldade: ${diffLabels[dificuldade]}.
            Tipo: ${tipo === 'multipla' ? 'Múltipla escolha com 4 ou 5 alternativas' : 'Dissertativa/Aberta'}.
            
            REGRAS OBRIGATÓRIAS:
            1. Responda APENAS o objeto JSON puro.
            2. NÃO use markdown (como \`\`\`json).
            3. NÃO adicione texto antes ou depois do JSON.
            
            Estrutura do JSON de retorno:
            {
                "enunciado": "texto da questão",
                "alternativas": ["A", "B", "C", "D"],
                "correta": 0, // Índice da alternativa correta (0 a 3/4) - Apenas se múltipla escolha
                "gabarito": "resposta esperada ou explicação"
            }
        `;

        let ultimoErro = "";

        // Loop de Tentativas (Fallback Strategy)
        for (let i = 0; i < this.MODELOS.length; i++) {
            const modelInfo = this.MODELOS[i];

            try {
                const url = `https://generativelanguage.googleapis.com/${modelInfo.v}/models/${modelInfo.id}:generateContent?key=${this.API_KEY}`;

                console.log(`🤖 Tentativa IA ${i + 1}/${this.MODELOS.length}: Usando ${modelInfo.id}...`);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.7, // Criatividade controlada
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 1024,
                        }
                    })
                });

                const data = await response.json();

                // Tratamento de Erros da API
                if (!response.ok || data.error) {
                    const msg = data.error?.message || `Erro HTTP ${response.status}`;
                    console.warn(`⚠️ Modelo ${modelInfo.id} falhou: ${msg}`);
                    ultimoErro = msg;

                    // Se for erro de limite (429), espera um pouco antes de tentar o próximo
                    if (response.status === 429) await this._esperar(1000);

                    throw new Error(msg); // Força ir para o catch e tentar o próximo loop
                }

                // Validação da Resposta
                if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    throw new Error("Resposta vazia da IA.");
                }

                const textResponse = data.candidates[0].content.parts[0].text;

                // Limpeza do JSON (caso a IA insista em markdown)
                const cleanJson = textResponse
                    .replace(/```json/gi, "")
                    .replace(/```/g, "")
                    .trim();

                const finalResult = JSON.parse(cleanJson);

                console.log(`✅ Sucesso na geração com: ${modelInfo.id}`);
                return finalResult;

            } catch (error) {
                // Se foi a última tentativa, lança o erro para o usuário
                if (i === this.MODELOS.length - 1) {
                    console.error("❌ Falha crítica: Todos os modelos de IA falharam.");
                    throw new Error(`Não foi possível gerar a questão no momento. Tente novamente. Detalhe: ${ultimoErro || error.message}`);
                }
                // Se não foi a última, o loop continua e tenta o próximo modelo
            }
        }
    },
    /**
     * Gera um material pedagógico (plano, dinâmica, cruzadinha) com base nos dados do formulário.
     * @async
     * @param {string} idFerramenta - Qual ferramenta está sendo usada.
     * @param {Object} dados - O objeto com os dados preenchidos no formulário.
     * @returns {Promise<Object>} JSON com o material gerado.
     */
    async gerarMaterial(idFerramenta, dados) {
        // Converte os dados do formulário em texto legível para o prompt
        const parametros = Object.entries(dados)
            .map(([chave, valor]) => `- ${chave.toUpperCase()}: ${valor}`)
            .join('\n');

        const prompt = `
            Atue como um professor especialista e coordenador pedagógico.
            Crie um material do tipo: ${idFerramenta.toUpperCase()}.
            
            Baseie-se rigorosamente nestes parâmetros fornecidos:
            ${parametros}
            
            REGRAS OBRIGATÓRIAS:
            1. Responda APENAS um objeto JSON puro. Sem formatação markdown, sem blocos \`\`\`json.
            2. O JSON DEVE ter a seguinte estrutura exata:
            {
                "titulo": "Um título criativo e direto para o material",
                "disciplina": "A disciplina informada",
                "serie": "A série informada",
                "tipo": "${idFerramenta}",
                "conteudo_html": "O conteúdo completo do material formatado em tags HTML nativas (h3, p, ul, li, strong, etc) pronto para ser exibido em tela. Seja super detalhado no plano ou na dinâmica."
            }
        `;

        let ultimoErro = "";

        // Estratégia de Fallback (Igual ao gerarQuestao)
        for (let i = 0; i < this.MODELOS.length; i++) {
            const modelInfo = this.MODELOS[i];
            try {
                const url = `https://generativelanguage.googleapis.com/${modelInfo.v}/models/${modelInfo.id}:generateContent?key=${this.API_KEY}`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 2048 }
                    })
                });

                const data = await response.json();
                if (!response.ok || data.error) {
                    const msg = data.error?.message || `Erro HTTP ${response.status}`;
                    ultimoErro = msg;
                    if (response.status === 429) await this._esperar(1000);
                    throw new Error(msg);
                }

                if (!data.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error("Resposta vazia.");

                const cleanJson = data.candidates[0].content.parts[0].text.replace(/```json/gi, "").replace(/```/g, "").trim();
                return JSON.parse(cleanJson);

            } catch (error) {
                if (i === this.MODELOS.length - 1) {
                    throw new Error(`Não foi possível gerar. Tente novamente. Detalhe: ${ultimoErro || error.message}`);
                }
            }
        }
    }
};