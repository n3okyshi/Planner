/**
 * @file ai-service.js
 * @description Módulo responsável pela comunicação com a IA do Google (Gemini) para geração automática de conteúdo.
 * @module services/aiService
 */

import { firebaseService } from './firebase-service.js';
import { Toast } from './components/toast.js';

export const aiService = {
    _cachedKey: null,

    /**
     * Busca a chave de API dinamicamente no Firestore (Protegida por Auth).
     * Não há fallback chumbado no código. Se falhar, a IA não executa.
     * @returns {Promise<string>} A chave da API.
     */
    async getApiKey() {
        // Se já buscou nesta sessão, usa o cache de memória para não gastar leitura no Firestore
        if (this._cachedKey) return this._cachedKey;

        try {
            if (!firebaseService.db) {
                throw new Error("Conexão com o banco de dados não estabelecida.");
            }

            // Tenta buscar do banco de dados (Seguro, pois exige que o professor esteja logado)
            const doc = await firebaseService.db.collection('system_config').doc('api_keys').get();
            
            if (doc.exists && doc.data().gemini) {
                this._cachedKey = doc.data().gemini;
                return this._cachedKey;
            } else {
                throw new Error("Chave de API não configurada no banco de dados.");
            }
        } catch (error) {
            console.error("🔒 Bloqueio de Segurança: Não foi possível obter a chave da IA.", error.message);
            throw new Error("Erro de autenticação interna. A inteligência artificial está temporariamente indisponível.");
        }
    },

    MODELOS: [
        { id: 'gemini-2.5-flash-lite', v: 'v1beta' },
        { id: 'gemini-3-flash-preview', v: 'v1beta' },
        { id: 'gemini-2.5-flash', v: 'v1beta' },
        { id: 'gemini-flash-lite-latest', v: 'v1beta' }
    ],

    _esperar: (ms) => new Promise(res => setTimeout(res, ms)),

    async gerarQuestao({ materia, habilidade, dificuldade, tipo }) {
        if (!navigator.onLine) {
            Toast.show("Você está offline. Conecte-se para usar a IA.", "warning");
            throw new Error("Sem conexão com a internet.");
        }

        const diffLabels = ["Aleatória", "Fácil", "Média", "Difícil"];

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
        
        // Puxa a chave do banco antes de iniciar o loop
        const apiKeyAtual = await this.getApiKey();

        for (let i = 0; i < this.MODELOS.length; i++) {
            const modelInfo = this.MODELOS[i];

            try {
                const url = `https://generativelanguage.googleapis.com/${modelInfo.v}/models/${modelInfo.id}:generateContent?key=${apiKeyAtual}`;

                console.log(`🤖 Tentativa IA ${i + 1}/${this.MODELOS.length}: Usando ${modelInfo.id}...`);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.7,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 1024,
                        }
                    })
                });

                const data = await response.json();

                if (!response.ok || data.error) {
                    const msg = data.error?.message || `Erro HTTP ${response.status}`;
                    console.warn(`⚠️ Modelo ${modelInfo.id} falhou: ${msg}`);
                    ultimoErro = msg;

                    if (response.status === 429) await this._esperar(1000);
                    throw new Error(msg);
                }

                if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    throw new Error("Resposta vazia da IA.");
                }

                const textResponse = data.candidates[0].content.parts[0].text;

                const cleanJson = textResponse
                    .replace(/```json/gi, "")
                    .replace(/```/g, "")
                    .trim();

                const finalResult = JSON.parse(cleanJson);
                console.log(`✅ Sucesso na geração com: ${modelInfo.id}`);
                return finalResult;

            } catch (error) {
                if (i === this.MODELOS.length - 1) {
                    console.error("❌ Falha crítica: Todos os modelos de IA falharam.");
                    throw new Error(`Não foi possível gerar a questão no momento. Tente novamente. Detalhe: ${ultimoErro || error.message}`);
                }
            }
        }
    },

    async gerarMaterial(idFerramenta, dados) {
        if (!navigator.onLine) {
            Toast.show("Você está offline. Conecte-se para usar a IA.", "warning");
            throw new Error("Sem conexão com a internet.");
        }

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
        
        // Puxa a chave do banco antes de iniciar o loop
        const apiKeyAtual = await this.getApiKey();

        for (let i = 0; i < this.MODELOS.length; i++) {
            const modelInfo = this.MODELOS[i];
            try {
                const url = `https://generativelanguage.googleapis.com/${modelInfo.v}/models/${modelInfo.id}:generateContent?key=${apiKeyAtual}`;

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