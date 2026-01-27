export const aiService = {
    API_KEY: 'AIzaSyDrO8df2XMMNridY9ZW0EqHb5do75B5cPo',
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',

    async gerarQuestao({ materia, habilidade, dificuldade, tipo }) {
        const diffLabels = ["Aleatória", "Fácil", "Média", "Difícil"];

        const prompt = `Atue como um professor especialista. Crie uma questão inédita para a disciplina de ${materia}.
        Baseie-se na habilidade BNCC: ${habilidade.codigo} - ${habilidade.descricao}.
        Dificuldade: ${diffLabels[dificuldade]}.
        Tipo: ${tipo === 'multipla' ? 'Múltipla escolha com 4 alternativas' : 'Dissertativa/Aberta'}.
        
        IMPORTANTE: Responda APENAS o objeto JSON puro, sem explicações e sem markdown.
        Estrutura:
        {
            "enunciado": "texto da questão",
            "alternativas": ["A", "B", "C", "D"],
            "correta": 0,
            "gabarito": "resposta esperada"
        }`;
        try {
            const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });
            const data = await response.json();
            if (response.status === 429 || data.error?.status === 'RESOURCE_EXHAUSTED') {
                const retryMatch = data.error?.message?.match(/(\d+\.?\d*)s/);
                const segundos = retryMatch ? Math.ceil(retryMatch[1]) : "alguns";
                throw new Error(`Limite de uso atingido. Por favor, aguarde ${segundos} segundos antes de gerar uma nova questão.`);
            }
            if (data.error) {
                throw new Error(`Erro na API: ${data.error.message}`);
            }
            if (!data.candidates || !data.candidates[0].content) {
                throw new Error("A IA não gerou conteúdo. Tente um tema diferente.");
            }
            const textResponse = data.candidates[0].content.parts[0].text;
            const cleanJson = textResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
            return JSON.parse(cleanJson);
        } catch (error) {
            console.error("Erro detalhado na IA:", error);
            throw error;
        }
    }
};