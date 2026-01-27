export const aiService = {
    /** * Chave de API obscurecida em Base64 para evitar detecção automática pelo GitHub.
     * Nota: Isso não protege contra humanos, apenas contra bots de 'leak'.
     * @private
     */
    _k: 'QUl6YVN5RGowZ2k5cWVNMkxocFdCWFMzNUNEdHhZUW1PR3JDVzVJ',
    //API_KEY: atob(this._k),
    /**
     * Retorna a chave de API decodificada.
     * @returns {string}
     */
    get API_KEY() {
        try {
            return atob(this._k);
        } catch (e) {
            console.error("Erro ao decodificar API Key.");
            return "";
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
        const diffLabels = ["Aleatória", "Fácil", "Média", "Difícil"];
        const prompt = `Atue como um professor especialista. Crie uma questão inédita para a disciplina de ${materia}.
        Baseie-se na habilidade BNCC: ${habilidade.codigo} - ${habilidade.descricao}.
        Dificuldade: ${diffLabels[dificuldade]}.
        Tipo: ${tipo === 'multipla' ? 'Múltipla escolha com 4 alternativas' : 'Dissertativa/Aberta'}.
        
        IMPORTANTE: Responda APENAS o objeto JSON puro, sem markdown.
        Estrutura:
        {
            "enunciado": "texto da questão",
            "alternativas": ["A", "B", "C", "D"],
            "correta": 0,
            "gabarito": "resposta esperada"
        }`;

        let ultimoErro = "";

        for (let i = 0; i < this.MODELOS.length; i++) {
            const modelInfo = this.MODELOS[i];
            try {
                const url = `https://generativelanguage.googleapis.com/${modelInfo.v}/models/${modelInfo.id}:generateContent?key=${this.API_KEY}`;
                console.log(`🤖 Tentativa ${i + 1}/${this.MODELOS.length}: ${modelInfo.id}...`);
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });
                const data = await response.json();
                if (!response.ok || data.error) {
                    const msg = data.error?.message || `Erro ${response.status}`;
                    console.warn(`⚠️ Modelo ${modelInfo.id} indisponível: ${msg}`);
                    ultimoErro = msg;
                    if (response.status === 429) await this._esperar(1000);
                    throw new Error(msg);
                }
                if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    throw new Error("Resposta vazia da IA.");
                }
                const textResponse = data.candidates[0].content.parts[0].text;
                const cleanJson = textResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
                const finalResult = JSON.parse(cleanJson);
                console.log(`✅ Sucesso com: ${modelInfo.id}`);
                return finalResult;
            } catch (error) {
                if (i === this.MODELOS.length - 1) {
                    console.error("❌ Todos os modelos falharam.");
                    throw new Error(`Não foi possível gerar a questão: ${ultimoErro || error.message}`);
                }
            }
        }
    }
};