
import { firebaseService } from './firebase-service.js';
import { Toast } from './components/toast.js';
export const aiService = {
    _cachedKey: null,
    async getApiKey() {
        if (this._cachedKey) return this._cachedKey;
        try {
            if (!firebaseService.db) {
                throw new Error("Conexão com o banco de dados não estabelecida.");
            }
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
        { id: 'gemini-flash-lite-latest', v: 'v1beta' },
        { id: 'gemini-2.0-flash', v: 'v1beta' },
        { id: 'gemini-1.5-flash', v: 'v1beta' },
        { id: 'gemini-1.5-flash-8b', v: 'v1beta' },
        { id: 'gemini-2.0-flash-lite-preview-02-05', v: 'v1beta' },
        { id: 'gemini-1.5-pro', v: 'v1beta' }
    ],
    _esperar: (ms) => new Promise(res => setTimeout(res, ms)),
    async _executarPromptGemini(prompt, maxTokens = 2048) {
        if (!navigator.onLine) {
            Toast.show("Você está offline. Conecte-se para usar a IA.", "warning");
            throw new Error("Sem conexão com a internet.");
        }
        let ultimoErro = "";
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
                            maxOutputTokens: maxTokens,
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
                    throw new Error(`Não foi possível gerar no momento. Detalhe: ${ultimoErro || error.message}`);
                }
            }
        }
    },
    async gerarQuestao({ materia, habilidade, dificuldade, tipo = 'multipla', contextoDocumento = '' }) {
        const diffLabels = ["Aleatória", "Fácil", "Média", "Difícil"];
        const tipoDesc = {
            'multipla': 'Múltipla escolha (4 ou 5 alternativas)',
            'lacuna': 'Complete a frase ou conceito (com lacunas sublinhadas ___ e termos corretos)',
            'identificacao': 'Qual o nome do evento/conceito ("Quem sou eu? / Identificação" com pistas e nome exato)',
            'verdadeiro_falso': 'Verdadeiro ou Falso (afirmações para classificar com justificativa)',
            'associacao': 'Associação/Relacione as colunas (Termos vs Definições)',
            'aberta': 'Dissertativa / Aberta com expectativa de resposta'
        }[tipo] || 'Múltipla escolha';

        const secaoContexto = contextoDocumento && contextoDocumento.trim() !== ''
            ? `\n\nMATERIAL E CONTEXTO DE BASE OBRIGATÓRIO (NOTEBOOKLM / DOCUMENTO):\n${contextoDocumento}\n(Importante: Crie a questão estritamente baseada no material acima).`
            : '';

        const prompt = `
            Atue como um professor especialista e elaborador de itens pedagógicos.
            Crie uma questão inédita para a disciplina de ${materia}.
            ${habilidade && habilidade.codigo ? `Baseie-se na habilidade BNCC: ${habilidade.codigo} - ${habilidade.descricao}.` : ''}
            Dificuldade: ${diffLabels[dificuldade] || 'Média'}.
            Formato da questão: ${tipoDesc}.
            ${secaoContexto}

            REGRAS OBRIGATÓRIAS:
            1. Responda APENAS o objeto JSON puro. Sem formatação markdown, sem blocos \`\`\`json.
            2. Para fórmulas, expressões científicas, frações e equações, use notação TeX/LaTeX padrão ($...$ ou $$...$$).
            3. Estrutura do JSON de retorno:
            {
                "tipo": "${tipo}",
                "enunciado": "texto claro e completo da questão",
                "alternativas": ["A", "B", "C", "D"], // Se múltipla escolha, identificação ou lacuna
                "correta": 0, // Índice da alternativa correta (0 a 3/4) se aplicável
                "resposta_correta": "termo exato ou conceito caso seja identificação ou lacuna",
                "afirmativas": [ // Apenas se verdadeiro_falso
                    { "texto": "afirmação 1", "correta": true, "justificativa": "explicação" },
                    { "texto": "afirmação 2", "correta": false, "justificativa": "explicação da correção" }
                ],
                "colunas": { // Apenas se associacao
                    "colunaA": ["Item 1", "Item 2", "Item 3"],
                    "colunaB": ["Definição B", "Definição A", "Definição C"],
                    "pares_corretos": [[0, 1], [1, 0], [2, 2]]
                },
                "gabarito": "resposta esperada e justificativa pedagógica detalhada"
            }
        `;

        return await this._executarPromptGemini(prompt, 1500);
    },
    async gerarQuizMultiFormato({ disciplina, serie, assunto, quantidade = 5, formato = 'misto', contextoDocumento = '' }) {
        const secaoContexto = contextoDocumento && contextoDocumento.trim() !== ''
            ? `\n\nMATERIAL E CONTEXTO DE BASE (NOTEBOOKLM / DOCUMENTO ANEXADO):\n${contextoDocumento}\n(Importante: O quiz deve ser construído rigorosamente com base neste conteúdo).`
            : '';

        const orientacaoFormato = {
            'multipla': 'Todas as questões devem ser do tipo "multipla" (4 alternativas A, B, C, D com índice correto 0-3).',
            'lacuna': 'Todas as questões devem ser do tipo "lacuna" (enunciado com ___ e 4 opções de termos para preencher).',
            'identificacao': 'Todas as questões devem ser do tipo "identificacao" ("Qual o nome do evento/conceito?" com pistas e 4 alternativas de nomes).',
            'verdadeiro_falso': 'Todas as questões devem ser do tipo "verdadeiro_falso" (enunciado com uma afirmação central e se é Verdadeira ou Falsa, com justificativa).',
            'misto': 'Misture pedagogicamente os formatos: Alternativas (multipla), Complete a Frase (lacuna), Qual o nome do Conceito/Evento (identificacao) e Verdadeiro ou Falso (verdadeiro_falso).'
        }[formato] || 'Formato misto dinâmico.';

        const prompt = `
            Atue como um professor especialista em gamificação e avaliação interativa em sala de aula.
            Crie um QUIZ INTERATIVO completo para a disciplina de ${disciplina} (${serie}).
            Tema / Assunto: ${assunto}.
            Quantidade de perguntas: ${quantidade}.
            Formato: ${orientacaoFormato}
            ${secaoContexto}

            REGRAS OBRIGATÓRIAS:
            1. Responda APENAS um objeto JSON puro. Sem formatação markdown, sem blocos \`\`\`json.
            2. Para fórmulas matemáticas, físicas ou químicas, use TeX/LaTeX padrão ($...$ ou $$...$$).
            3. Estrutura exata do JSON de retorno:
            {
                "titulo": "${assunto} - ${serie}",
                "disciplina": "${disciplina}",
                "serie": "${serie}",
                "perguntas": [
                    {
                        "tipo": "multipla" | "lacuna" | "identificacao" | "verdadeiro_falso",
                        "enunciado": "Enunciado da pergunta",
                        "alternativas": ["Opção A", "Opção B", "Opção C", "Opção D"], // Para multipla, lacuna, identificacao
                        "correta": 0, // Índice da alternativa correta (0 a 3) para multipla, lacuna, identificacao
                        "resposta_correta": "Texto da resposta correta",
                        "is_verdadeiro": true, // Apenas para verdadeiro_falso (true para Verdadeiro, false para Falso)
                        "justificativa": "Explicação pedagógica da resposta",
                        "tempo": 30, // Tempo em segundos (30, 45 ou 60)
                        "pontos": 1000
                    }
                ]
            }
        `;

        return await this._executarPromptGemini(prompt, 3000);
    },
    async gerarMaterial(idFerramenta, dados, contextoDocumento = '') {
        const parametros = Object.entries(dados)
            .map(([chave, valor]) => `- ${chave.toUpperCase()}: ${valor}`)
            .join('\n');

        const secaoContexto = contextoDocumento && contextoDocumento.trim() !== ''
            ? `\n\nMATERIAL E CONTEXTO DE BASE OBRIGATÓRIO (NOTEBOOKLM / ARQUIVO ANEXADO):\n${contextoDocumento}\n(Importante: Desenvolva o material totalmente fundamentado e alinhado ao conteúdo acima).`
            : '';

        const prompt = `
            Atue como um professor especialista e coordenador pedagógico.
            Crie um material do tipo: ${idFerramenta.toUpperCase()}.
            
            Baseie-se rigorosamente nestes parâmetros fornecidos:
            ${parametros}
            ${secaoContexto}
            
            REGRAS OBRIGATÓRIAS:
            1. Responda APENAS um objeto JSON puro. Sem formatação markdown, sem blocos \`\`\`json.
            2. O JSON DEVE ter a seguinte estrutura exata:
            {
                "titulo": "Um título criativo e direto para o material",
                "disciplina": "A disciplina informada",
                "serie": "A série informada",
                "tipo": "${idFerramenta}",
                "conteudo_html": "O conteúdo completo do material formatado em tags HTML nativas (h3, p, ul, li, strong, etc) pronto para exibição. IMPORTANTE: 1. Para avaliações, listas ou atividades com exercícios, envolva toda a seção de gabarito e respostas dentro da tag <div class='gabarito-bloco'><h3>Gabarito e Expectativa de Resposta</h3>...</div> para possibilitar a separação automática entre a Versão do Aluno e a Versão do Professor. 2. Para qualquer fórmula matemática, equação, fração, expoente ou expressão científica, utilize OBRIGATORIAMENTE notação TeX/LaTeX padrão entre $$ ... $$ (para fórmulas em destaque/bloco) ou $ ... $ (para fórmulas no meio do texto)."
            }
        `;

        return await this._executarPromptGemini(prompt, 3000);
    },
    async gerarFlashcards({ disciplina, serie, assunto, quantidade = 8, nivel = 'Médio', contextoDocumento = '' }) {
        const secaoContexto = contextoDocumento && contextoDocumento.trim() !== ''
            ? `\n\nMATERIAL E CONTEXTO DE BASE OBRIGATÓRIO (NOTEBOOKLM / ARQUIVO ANEXADO):\n${contextoDocumento}\n(Importante: Crie os flashcards estritamente baseados nas informações e conceitos do texto acima).`
            : '';

        const prompt = `
            Atue como um professor especialista em técnicas de repetição espaçada e memorização ativa.
            Crie um baralho de FLASHCARDS PEDAGÓGICOS sobre o tema: "${assunto}" para a disciplina de ${disciplina} (${serie || 'Geral'}).
            Quantidade de cartas: ${quantidade}.
            Nível de profundidade: ${nivel}.
            ${secaoContexto}

            REGRAS OBRIGATÓRIAS:
            1. Responda APENAS um objeto JSON puro. Sem blocos \`\`\`json, sem markdown.
            2. Cada carta deve conter:
               - "frente": Pergunta instigante, conceito, termo ou problema direto.
               - "verso": Resposta clara, definição explicativa e síntese pedagógica.
               - "dica": Uma breve pista mnemônica ou palavra-chave de apoio.
            3. Para fórmulas matemáticas, científicas, frações ou equações, use notação TeX/LaTeX padrão ($...$ ou $$...$$).
            4. Estrutura exata do JSON:
            {
                "titulo": "${assunto} - ${serie || 'Geral'}",
                "disciplina": "${disciplina}",
                "serie": "${serie || 'Geral'}",
                "assunto": "${assunto}",
                "cards": [
                    {
                        "frente": "Texto da frente do cartão",
                        "verso": "Texto do verso com explicação clara",
                        "dica": "Pista rápida"
                    }
                ]
            }
        `;

        return await this._executarPromptGemini(prompt, 3000);
    },
    async gerarMindmap({ disciplina, serie, assunto, profundidade = 3, contextoDocumento = '' }) {
        const secaoContexto = contextoDocumento && contextoDocumento.trim() !== ''
            ? `\n\nMATERIAL E CONTEXTO DE BASE OBRIGATÓRIO (NOTEBOOKLM / ARQUIVO ANEXADO):\n${contextoDocumento}\n(Importante: O mapa mental/conceitual deve refletir com fidelidade a taxonomia e termos do texto acima).`
            : '';

        const prompt = `
            Atue como um designer instrucional e especialista em mapas conceituais e aprendizagem visual.
            Crie um MAPA MENTAL / CONCEITUAL completo e hierarquizado sobre o tema: "${assunto}" para ${disciplina} (${serie || 'Geral'}).
            Profundidade de níveis: ${profundidade} níveis (Nó Raiz -> Ramos Principais -> Subconceitos -> Detalhes/Exemplos).
            ${secaoContexto}

            REGRAS OBRIGATÓRIAS:
            1. Responda APENAS um objeto JSON puro. Sem blocos \`\`\`json, sem comentários.
            2. Para fórmulas matemáticas ou químicas, utilize notação TeX/LaTeX padrão ($...$).
            3. Cada nó DEVE ter:
               - "id": Identificador único simples (ex: "root", "n1", "n1_1", "n2", etc).
               - "label": Nome curto e claro do conceito (máximo 40 caracteres).
               - "detalhes": (Opcional) Explicação curta complementar.
               - "color": (Apenas nos ramos principais nível 1, ex: "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4").
               - "children": Array com os nós filhos (ou array vazio [] se for folha).
            4. Estrutura exata do JSON:
            {
                "titulo": "${assunto} - ${serie || 'Geral'}",
                "disciplina": "${disciplina}",
                "serie": "${serie || 'Geral'}",
                "root": {
                    "id": "root",
                    "label": "${assunto}",
                    "detalhes": "Conceito central",
                    "color": "#4f46e5",
                    "children": [
                        {
                            "id": "node_1",
                            "label": "Ramo Principal 1",
                            "color": "#3b82f6",
                            "detalhes": "Descrição do ramo",
                            "children": [
                                {
                                    "id": "node_1_1",
                                    "label": "Subconceito A",
                                    "children": []
                                }
                            ]
                        }
                    ]
                }
            }
        `;

        return await this._executarPromptGemini(prompt, 3500);
    }
};
