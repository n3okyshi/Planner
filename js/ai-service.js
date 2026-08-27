
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
        { id: 'gemini-1.5-pro', v: 'v1beta' },
        { id: 'gemini-3.5-flash', v: 'v1beta' },
        { id: 'gemini-3-flash-preview', v: 'v1beta' },
        { id: 'gemini-2.5-flash', v: 'v1beta' },
        { id: 'gemini-2.5-flash-lite', v: 'v1beta' },
        { id: 'gemini-2.5-pro', v: 'v1beta' },
        // 1. Linha de Frente: Mais rápidos e recomendados pelo console para substituir os antigos
        { id: 'gemini-3.6-flash', v: 'v1beta' },
        { id: 'gemini-3.7-flash', v: 'v1beta' }, // Modelo mais recente disponível na sua lista
        { id: 'gemini-3.5-flash', v: 'v1beta' },

        // 2. Tarefas Complexas: Substitutos do antigo Pro
        { id: 'gemini-3.1-pro-preview', v: 'v1beta' }, // O próprio erro do 2.5 pediu para usar este

        // 3. Modelos Leves (Lite) para respostas muito curtas
        { id: 'gemini-3.5-flash-lite', v: 'v1beta' },
        { id: 'gemini-3.1-flash-lite', v: 'v1beta' },

        // 4. Aliases Dinâmicos (Sempre apontam para as versões mais novas no servidor do Google)
        { id: 'gemini-flash-latest', v: 'v1beta' },
        { id: 'gemini-pro-latest', v: 'v1beta' },

        // 5. Fallbacks de última geração da família 2.5 que ainda estão ativos na sua conta
        { id: 'gemini-2.5-flash', v: 'v1beta' },
        { id: 'gemini-2.5-pro', v: 'v1beta' }
    ],

    _contarQuestoesNoHTML(html) {
        if (!html) return 0;

        // 1. Busca termos explícitos: Questão X, Exercício X, Item X
        const matchesQ = html.match(/(?:Quest[ãa]o|Exerc[íi]cio|Item)\s*\d+/gi) || [];
        if (matchesQ.length > 0) {
            return new Set(matchesQ.map(m => m.toLowerCase().replace(/\s+/g, ''))).size;
        }

        // 2. Busca por numerações no início de elementos: "01.", "1.", "1)", "01)"
        const matchesNum = html.match(/(?:<p>|<h[1-6]>|<div>|<li>)\s*(?:<strong>|<b>)?\s*(\d{1,2})[\.\)\-]/gi) || [];
        if (matchesNum.length > 0) {
            return new Set(matchesNum.map(m => m.replace(/\D/g, ''))).size;
        }

        // 3. Fallback: Contagem de itens <li> em listas ordenadas <ol>
        const matchesLi = html.match(/<li>/gi) || [];
        if (matchesLi.length > 0 && html.includes('<ol')) {
            return matchesLi.length;
        }

        return 0;
    },

    async _validarERefinarMaterial(resultadoInicial, idFerramenta, dados, qtdRequerida = 0) {
        if (!resultadoInicial || !resultadoInicial.conteudo_html) return resultadoInicial;

        // Auditoria de 2ª camada de IA desativada para otimização do consumo de tokens do usuário.
        console.log("ℹ️ Retornando resultado direto da IA (2ª camada de auditoria desativada para economia de tokens).");
        return resultadoInicial;
    },
    _esperar: (ms) => new Promise(res => setTimeout(res, ms)),

    /**
     * Núcleo unificado de requisições HTTP para a API do Gemini com rotatividade de modelos e tratamento de Rate Limit (429).
     * @private
     */
    async _fazerRequisicaoModelosGemini(partsPayload, maxTokens = 4096, temperature = 0.7) {
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
                        contents: [{ parts: partsPayload }],
                        generationConfig: {
                            temperature: temperature,
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
                let cleanJson = textResponse
                    .replace(/```json/gi, "")
                    .replace(/```/g, "")
                    .trim();
                const firstBrace = cleanJson.indexOf('{');
                const lastBrace = cleanJson.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
                }
                const finalResult = JSON.parse(cleanJson);
                console.log(`✅ Sucesso na requisição IA com: ${modelInfo.id}`);
                return finalResult;
            } catch (error) {
                if (i === this.MODELOS.length - 1) {
                    console.error("❌ Falha crítica: Todos os modelos de IA falharam.");
                    throw new Error(`Não foi possível gerar no momento. Detalhe: ${ultimoErro || error.message}`);
                }
            }
        }
    },

    async _executarPromptGemini(prompt, maxTokens = 4096) {
        return this._fazerRequisicaoModelosGemini([{ text: prompt }], maxTokens, 0.7);
    },

    async _executarPromptMultimodalGemini(prompt, imagemBase64, mimeType = 'image/jpeg', maxTokens = 4096) {
        const base64Data = imagemBase64.includes(',')
            ? imagemBase64.split(',')[1]
            : imagemBase64;
        const partsPayload = [
            { text: prompt },
            {
                inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                }
            }
        ];
        return this._fazerRequisicaoModelosGemini(partsPayload, maxTokens, 0.1);
    },
    /**
     * Analisa visualmente uma foto ou digitalização de cartão-resposta/gabarito e extrai as alternativas marcadas com alta precisão.
     * @param {Object} params - { imagemBase64, mimeType, totalQuestoes, gabaritoOficial, letrasAlternativas }
     * @returns {Promise<Object>}
     */
    async analisarCartaoRespostaOMR({ imagemBase64, mimeType = 'image/jpeg', totalQuestoes = 10, gabaritoOficial = [], letrasAlternativas = ['A', 'B', 'C', 'D', 'E'] }) {
        const total = parseInt(totalQuestoes, 10) || (gabaritoOficial ? gabaritoOficial.length : 10);
        const listaLetras = Array.isArray(letrasAlternativas) && letrasAlternativas.length > 0 ? letrasAlternativas : ['A', 'B', 'C', 'D', 'E'];
        const letrasStr = listaLetras.join(', ');
        const numBolhas = listaLetras.length;

        const prompt = `
            Você é um leitor óptico de altíssima precisão especializado em OMR (Optical Mark Recognition) e visão computacional de avaliações escolares.
            Analise a imagem da folha de respostas/cartão-resposta ou prova em anexo.

            MISSÃO:
            Identificar as marcações preenchidas pelo estudante para EXATAMENTE ${total} questões (da Questão 1 até a Questão ${total}). Cada questão possui ${numBolhas} alternativas (${letrasStr}).

            DIRETRIZES DE INSPEÇÃO ÓPTICA PASSO A PASSO:
            1. LOCALIZAÇÃO E ANCORAGEM:
               - Localize a tabela ou colunas de respostas (observe os marcadores de ancoragem ⬛ nos cantos, cabeçalho e números de questão).
               - Varra sequencialmente as linhas da Questão 1 até a Questão ${total}.

            2. CRITÉRIOS DE DIFERENCIAÇÃO DE PREENCHIMENTO:
               - BOLHA VAZIA / NÃO MARCADA: O contorno circular está visível e o interior do círculo está claro/branco, mostrando a letra impressa (${letrasStr}) sem preenchimento de caneta.
               - BOLHA PREENCHIDA / MARCADA: O interior do círculo está escurecido/pintado com caneta (azul ou preta) ou grafite de lápis, cobrindo a letra interna ou apresentando traço firme/X evidente.
               - QUESTÃO EM BRANCO: Se nenhuma das ${numBolhas} bolhas da linha (${letrasStr}) estiver preenchida, retorne OBRIGATORIAMENTE "EM_BRANCO" no campo "resposta" e status "em_branco".
               - QUESTÃO ANULADA / DUPLA: Se houver 2 ou mais bolhas preenchidas na mesma questão sem clara distinção de correção, retorne OBRIGATORIAMENTE "ANULADA" no campo "resposta" e status "anulada".
               - RASURA COM CORREÇÃO EVIDENTE: Se uma bolha foi claramente riscada/rabiscada para anular e outra bolha foi preenchida com firmeza, considere a bolha preenchida como a resposta intencional.

            3. RIGOR:
               - NÃO deduza respostas com base em suposição de acertos.
               - Responda EXATAMENTE ${total} itens no array "respostas", sem pular nenhum número de questão (de 1 a ${total}).

            4. FORMATO DA RESPOSTA:
               - Responda EXCLUSIVAMENTE um objeto JSON puro, sem blocos de código markdown (\`\`\`json).

            ESTRUTURA DO JSON DE RETORNO:
            {
                "totalQuestoesIdentificadas": ${total},
                "respostas": [
                    {
                        "questao": 1,
                        "resposta": "A", // ${listaLetras.map(l => `"${l}"`).join(', ')}, "EM_BRANCO" ou "ANULADA"
                        "status": "marcada", // "marcada", "em_branco" ou "anulada"
                        "confianca": "alta", // "alta", "media" ou "baixa"
                        "motivo": "" // Opcional, detalha caso a confiança seja média/baixa
                    }
                ],
                "observacoes": "Breve comentário sobre nitidez, alinhamento e legibilidade do cartão"
            }
        `;

        return await this._executarPromptMultimodalGemini(prompt, imagemBase64, mimeType, 3000);
    },

    /**
     * Avalia rigorosamente uma redação dissertativa-argumentativa de acordo com os critérios oficiais das 5 competências do ENEM (0 a 1000 pontos).
     * @param {Object} params - { tema, texto }
     * @returns {Promise<Object>} - { notaTotal, competencias: [{ numero, nome, nota, comentario }], feedbackGeral }
     */
    async avaliarRedacaoEnem({ tema = "Tema Livre", texto }) {
        if (!texto || texto.trim().length < 50) {
            throw new Error("O texto da redação é muito curto para uma avaliação do ENEM.");
        }

        const prompt = `
            Atue como um corretor sênior de redações do ENEM (Exame Nacional do Ensino Médio) do INEP.
            Avalie criteriosamente o texto enviado de acordo com os padrões oficiais de correção do ENEM.

            PROPOSTA / TEMA DA REDAÇÃO:
            "${tema}"

            TEXTO DA REDAÇÃO DO ESTUDANTE:
            """
            ${texto}
            """

            DIRETRIZES DE AVALIAÇÃO DAS 5 COMPETÊNCIAS DO ENEM (0 a 200 pontos por competência):
            - Competência 1: Domínio da modalidade escrita formal da língua portuguesa (gramática, ortografia, pontuação, sintaxe, concordância, regência). Notas possíveis: 0, 40, 80, 120, 160, 200.
            - Competência 2: Compreensão da proposta de redação e aplicação de conceitos das várias áreas do conhecimento (respeito à estrutura dissertativo-argumentativa, presença de repertório sociocultural legitimado e produtivo). Notas possíveis: 0, 40, 80, 120, 160, 200.
            - Competência 3: Seleção, relação, organização e interpretação de informações, fatos, opiniões e argumentos em defesa de um ponto de vista (projeto de texto estratégico e coerência). Notas possíveis: 0, 40, 80, 120, 160, 200.
            - Competência 4: Conhecimento dos mecanismos linguísticos para construção da argumentação (coesão textual, conectivos inter e intraparágrafos, variedade de conectores sem repetições). Notas possíveis: 0, 40, 80, 120, 160, 200.
            - Competência 5: Elaboração de proposta de intervenção para o problema abordado, respeitando os direitos humanos. Avalie os 5 elementos essenciais: Agente, Ação, Meio/Modo, Efeito e Detalhamento. Se contiver os 5 elementos e respeitar direitos humanos = 200 pontos. Notas possíveis: 0, 40, 80, 120, 160, 200.

            REGRA DE NOTA TOTAL:
            notaTotal = (Nota C1) + (Nota C2) + (Nota C3) + (Nota C4) + (Nota C5).
            Se o texto for excelente (nota 1000), atribua 200 em todas as competências.

            REGRAS OBRIGATÓRIAS DE FORMATO:
            1. Responda EXCLUSIVAMENTE um objeto JSON puro. Sem markdown, sem blocos \`\`\`json.
            2. Estrutura exata do JSON de retorno:
            {
                "notaTotal": 1000,
                "competencias": [
                    {
                        "numero": 1,
                        "nome": "Domínio da Norma Culta",
                        "nota": 200,
                        "comentario": "Análise crítica detalhada da norma culta, gramática e sintaxe."
                    },
                    {
                        "numero": 2,
                        "nome": "Compreensão do Tema e Repertório",
                        "nota": 200,
                        "comentario": "Análise da adequação ao tema, tipo textual e repertório sociocultural."
                    },
                    {
                        "numero": 3,
                        "nome": "Projeto de Texto e Argumentação",
                        "nota": 200,
                        "comentario": "Análise da organização de argumentos e defesa do ponto de vista."
                    },
                    {
                        "numero": 4,
                        "nome": "Mecanismos de Coesão Textual",
                        "nota": 200,
                        "comentario": "Análise do uso de conectivos inter e intraparágrafos."
                    },
                    {
                        "numero": 5,
                        "nome": "Proposta de Intervenção Detalhada",
                        "nota": 200,
                        "comentario": "Análise dos 5 elementos (Agente, Ação, Modo/Meio, Efeito, Detalhamento) e Direitos Humanos."
                    }
                ],
                "feedbackGeral": "Síntese geral pedagógica com elogios aos pontos fortes e recomendações específicas de aprimoramento."
            }
        `;

        return await this._executarPromptGemini(prompt, 3000);
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

        let instrucaoEspecifica = '';
        if (idFerramenta === 'rubrica-avaliacao') {
            instrucaoEspecifica = `
            ESPECIFICAÇÃO DE RUBRICA DE AVALIAÇÃO:
            - Gere uma MATRIZ ANALÍTICA COMPLETA em tabela HTML formatada com a classe 'rubrica-matrix'.
            - Colunas da tabela: Critério Avaliativo | Insuficiente | Regular | Bom | Excelente | Pontuação Máxima.
            - Cada nível de desempenho deve conter descritores claros e objetivos de aprendizagem com valor numérico em pontos.
            - No topo, inclua orientações para o avaliador e autoavaliação do estudante.
            `;
        } else if (idFerramenta === 'jogos-rpg') {
            instrucaoEspecifica = `
            ESPECIFICAÇÃO DE JOGOS & RPG / ESCAPE ROOM:
            - Estruture: 1. História/Cenário Imersivo e Missão Principal; 2. Preparação da Sala e Materiais; 3. Regras e Mecânica do Jogo; 4. Cartas de Desafios, Pistas e Enigmas Pedagógicos; 5. Condições de Vitória e Desfecho Educativo; 6. Conexão curricular com a BNCC.
            `;
        } else if (idFerramenta === 'diario-laboratorio') {
            instrucaoEspecifica = `
            ESPECIFICAÇÃO DE DIÁRIO DE LABORATÓRIO / AULA PRÁTICA:
            - Estruture: 1. Problema Investigativo e Hipóteses Iniciais; 2. Lista de Materiais e Equipamentos (com foco em itens acessíveis); 3. Normas e Cuidados de Segurança; 4. Procedimento Passo a Passo Ilustrativo; 5. Tabela de Coleta e Registro de Dados para o aluno preencher; 6. Quatro Questões Investigativas Reflexivas para Conclusão.
            `;
        }

        let qtdRequerida = 0;
        Object.entries(dados).forEach(([k, v]) => {
            const kl = String(k).toLowerCase();
            if (kl.includes('quantidade') || kl.includes('questões') || kl.includes('questoes') || kl.includes('qtd') || kl.includes('número') || kl.includes('numero') || kl.includes('nº') || kl.includes('itens') || kl.includes('exercícios') || kl.includes('exercicios')) {
                const num = parseInt(String(v).replace(/\D/g, ''), 10);
                if (!isNaN(num) && num > 0) qtdRequerida = num;
            }
        });

        const instrucaoQuantidade = qtdRequerida > 0
            ? `\n\nGARANTIA ABSOLUTA DE QUANTIDADE (OBRIGATÓRIO E CRÍTICO):\nO professor solicitou EXATAMENTE ${qtdRequerida} questões/exercícios. Você DEVE obrigatoriamente criar e numerar ${qtdRequerida} itens completos (Questão 1, Questão 2, ..., Questão ${qtdRequerida}). É ESTRITAMENTE PROIBIDO resumir, truncar ou entregar menos de ${qtdRequerida} questões. Se foram pedidas ${qtdRequerida} questões, crie todas as ${qtdRequerida}.${qtdRequerida >= 8 ? ' OBSERVAÇÃO DE CONCISÃO: Para garantir que todas as ' + qtdRequerida + ' questões caibam perfeitamente sem truncar, mantenha os enunciados e opções diretos, focados e objetivos.' : ''}`
            : '';

        const prompt = `
            Atue como um professor especialista e coordenador pedagógico.
            Crie um material do tipo: ${idFerramenta.toUpperCase()}.
            
            Baseie-se rigorosamente nestes parâmetros fornecidos:
            ${parametros}
            ${secaoContexto}
            ${instrucaoEspecifica}
            ${instrucaoQuantidade}
            
            REGRAS OBRIGATÓRIAS:
            1. Responda APENAS um objeto JSON puro. Sem formatação markdown, sem blocos \`\`\`json.
            2. REGRAS ESTRITAS DE LaTeX E SÍMBOLOS MATEMÁTICOS:
               - NUNCA insira cifrões soltos ou no final de frases/unidades (EXEMPLO PROIBIDO: "hab./km^2$" ou "$ 320 \text{ kg}").
               - Toda expressão matemática no meio do texto DEVE ser envolvida em \(...\) (LaTeX inline) e equações em destaque em \[...\] (LaTeX em bloco). NUNCA use cifrões soltos ou $...$ / $$...$$.
               - Para valores monetários em reais, escreva sempre "R$ 1.200,00" (como texto corrido normal, sem delimitadores TeX ou barras invertidas).
            3. Garanta que todas as tags HTML sejam puras, bem formadas e abertas/fechadas corretamente (<p>, <ul>, <li>, <div>). NUNCA inicie blocos com </p> solto ou entidades escapadas (&lt;p&gt;).
            4. O JSON DEVE ter a seguinte estrutura exata:
            {
                "titulo": "Um título criativo e direto para o material",
                "disciplina": "A disciplina informada",
                "serie": "A série informada",
                "tipo": "${idFerramenta}",
                "conteudo_html": "O conteúdo completo do material formatado em tags HTML nativas (h3, p, ul, li, strong, table, thead, tbody, tr, th, td, etc) pronto para exibição. IMPORTANTE: 1. Para avaliações, listas ou atividades com exercícios, envolva toda a seção de gabarito e respostas dentro da tag <div class='gabarito-bloco'><h3>Gabarito e Expectativa de Resposta</h3>...</div> para possibilitar a separação automática entre a Versão do Aluno e a Versão do Professor. 2. Para qualquer fórmula matemática, equação, fração, expoente ou expressão científica, utilize OBRIGATORIAMENTE notação TeX/LaTeX padrão entre \[ ... \] (para fórmulas em destaque/bloco) ou \( ... \) (para fórmulas no meio do texto)."
            }
        `;

        const resultadoInicial = await this._executarPromptGemini(prompt, 8192);
        return await this._validarERefinarMaterial(resultadoInicial, idFerramenta, dados, qtdRequerida);
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
    },

    async gerarRoteiroPratico({ disciplina, assunto, materiaisDisponiveis = '', nivelTurma = 'Ensino Fundamental II', tempoEstimado = '50 min (1 aula)', baixoCusto = true, contextoDocumento = '' }) {
        const secaoContexto = contextoDocumento && contextoDocumento.trim() !== ''
            ? `\n\nMATERIAL E CONTEXTO DE BASE (ARQUIVO ANEXADO):\n${contextoDocumento}`
            : '';

        const prompt = `
            Atue como um professor especialista em experimentação científica, laboratório escolar, metodologia investigativa e BNCC para a disciplina de ${disciplina || 'Ciências/Biologia/Química/Física'}.
            Crie um ROTEIRO DE AULA PRÁTICA E EXPERIMENTAÇÃO COMPLETO sobre o assunto: "${assunto}".
            Público-alvo/Nível: ${nivelTurma}.
            Duração estimada: ${tempoEstimado}.
            Foco em materiais de baixo custo / do cotidiano: ${baixoCusto ? 'SIM (priorize materiais acessíveis, garrafas, alimentos, copos, itens de cozinha/casa)' : 'NÃO (pode incluir reagentes e vidrarias padrão de laboratório)'}.
            Materiais informados pelo professor: ${materiaisDisponiveis || 'Materiais comuns do cotidiano'}.
            ${secaoContexto}

            REGRAS OBRIGATÓRIAS:
            1. Responda APENAS um objeto JSON puro. Sem blocos \`\`\`json, sem markdown.
            2. Para fórmulas químicas, reações ou equações matemáticas, use notação TeX/LaTeX padrão ($...$ ou $$...$$).
            3. No campo "conteudo_html", formate o documento completo com tags HTML nativas contendo:
               - Cabeçalho de identificação com Nome da Prática, Disciplina, Duração e Habilidade BNCC.
               - Caixa de destaque: <div class="laboratorio-seguranca"><h3>⚠️ Segurança no Laboratório & EPIs</h3><ul>...regras de cuidado...</ul></div>
               - Lista de Materiais por Grupo de Alunos.
               - Procedimento Experimental Passo a Passo (<div class="etapa-experimento"><h4>Etapa 1: ...</h4><p>...</p></div>).
               - Tabela de Coleta de Dados e Observações (<table class="tabela-experimento"><thead><tr><th>Amostra/Variável</th><th>Observação Visual</th><th>Resultado/Medição</th><th>Conclusão Preliminar</th></tr></thead><tbody>...linhas vazias ou com amostras para preenchimento...</tbody></table>).
               - Questões Investigativas e de Discussão em Grupo.
               - Gabarito e Expectativa de Resposta do Professor (OBRIGATORIAMENTE dentro de <div class="gabarito-bloco"><h3>Gabarito & Expectativa de Resposta (Professor)</h3>...respostas detalhadas...</div>).
            4. Estrutura exata do JSON:
            {
                "titulo": "Nome chamativo e investigativo para a aula prática",
                "disciplina": "${disciplina || 'Ciências'}",
                "serie": "${nivelTurma}",
                "tipo": "pratica-laboratorio",
                "assunto": "${assunto}",
                "objetivo": "Objetivo pedagógico claro alinhado à BNCC",
                "conteudo_html": "HTML completo formatado rigorosamente conforme instruções acima."
            }
        `;

        return await this._executarPromptGemini(prompt, 3800);
    },

    /**
     * Gera um Plano Individualizado de Recuperação Paralela baseado no histórico de notas e habilidades da BNCC.
     * @param {Object} params - { aluno, turma, disciplina, avaliacoes, habilidadesBNCC, mediaAtual }
     * @returns {Promise<Object>}
     */
    async gerarPlanoRecuperacao({ aluno, turma, disciplina = 'Geral', avaliacoes = [], habilidadesBNCC = [], mediaAtual = 0 }) {
        const alunoNome = typeof aluno === 'object' ? aluno.nome : aluno;
        const turmaNome = typeof turma === 'object' ? turma.nome : turma;
        const discNome = disciplina || (typeof turma === 'object' ? turma.disciplina : 'Matemática');

        const habTexto = Array.isArray(habilidadesBNCC) && habilidadesBNCC.length > 0
            ? habilidadesBNCC.map(h => `- ${h.codigo || ''}: ${h.descricao || ''}`).join('\n')
            : 'Foco nas habilidades fundamentais de raciocínio, fixação e resolução de problemas da série.';

        const avalTexto = Array.isArray(avaliacoes) && avaliacoes.length > 0
            ? avaliacoes.map(a => `- ${a.titulo || a.nome || 'Avaliação'}: Nota ${a.nota || 'N/A'}`).join('\n')
            : `Média Atual no período: ${Number(mediaAtual).toFixed(1)} (Abaixo da média padrão de 6,0).`;

        const prompt = `
            Atue como um Especialista Pedagógico em Avaliação Formativa, Recomposição de Aprendizagem e BNCC.
            Elabore um PLANO DE RECUPERAÇÃO PARALELA INDIVIDUALIZADO E PRÁTICO para o seguinte estudante:

            - Nome do Estudante: ${alunoNome}
            - Turma/Série: ${turmaNome}
            - Disciplina: ${discNome}
            - Desempenho e Avaliações:
            ${avalTexto}
            - Habilidades Trabalhadas no Período:
            ${habTexto}

            DIRETRIZES PEDAGÓGICAS E REGRAS:
            1. Responda APENAS um objeto JSON puro, sem blocos \`\`\`json, sem markdown externo.
            2. Para fórmulas matemáticas, notações científicas e equações, utilize notação TeX/LaTeX padrão ($...$ ou $$...$$).
            3. O plano deve conter:
               - "diagnostico": Análise formativa das principais dificuldades conceituais observadas e competências a recuperar.
               - "habilidadesFoco": Lista com código e descrição das habilidades prioritárias da BNCC.
               - "roteiroEstudos": Array com 3 etapas pedagógicas progressivas (Revisão Conceitual, Prática Guiada e Fixação Autônoma).
               - "questoesPraticas": Array com EXATAMENTE 3 questões práticas inéditas, diagnósticas e progressivas (Fácil, Média, Desafiadora), acompanhadas de resolução detalhada passo a passo e gabarito.
            4. Estrutura exata do JSON:
            {
                "aluno": "${alunoNome}",
                "disciplina": "${discNome}",
                "turma": "${turmaNome}",
                "mediaAtual": ${Number(mediaAtual).toFixed(1)},
                "diagnostico": "Diagnóstico pedagógico claro e acolhedor...",
                "habilidadesFoco": [
                    { "codigo": "EF...", "descricao": "Descrição da habilidade foco..." }
                ],
                "roteiroEstudos": [
                    {
                        "etapa": 1,
                        "titulo": "1. Recomposição Conceitual",
                        "conteudo": "Orientações de leitura e síntese...",
                        "sugestaoAtividade": "Elaboração de resumo ou mapa mental..."
                    },
                    {
                        "etapa": 2,
                        "titulo": "2. Prática Dirigida",
                        "conteudo": "Exercícios comentados...",
                        "sugestaoAtividade": "Resolução guiada..."
                    },
                    {
                        "etapa": 3,
                        "titulo": "3. Autoavaliação & Verificação",
                        "conteudo": "Aplicação das questões práticas...",
                        "sugestaoAtividade": "Checagem com gabarito comentado..."
                    }
                ],
                "questoesPraticas": [
                    {
                        "numero": 1,
                        "nivel": "Fácil",
                        "enunciado": "Enunciado claro da questão 1...",
                        "resolucaoPassoAPasso": "Passo 1: ...\\nPasso 2: ...",
                        "gabarito": "Resposta final esperada"
                    },
                    {
                        "numero": 2,
                        "nivel": "Médio",
                        "enunciado": "Enunciado claro da questão 2...",
                        "resolucaoPassoAPasso": "Passo 1: ...\\nPasso 2: ...",
                        "gabarito": "Resposta final esperada"
                    },
                    {
                        "numero": 3,
                        "nivel": "Desafiador",
                        "enunciado": "Enunciado claro da questão 3...",
                        "resolucaoPassoAPasso": "Passo 1: ...\\nPasso 2: ...",
                        "gabarito": "Resposta final esperada"
                    }
                ]
            }
        `;

        return await this._executarPromptGemini(prompt, 3800);
    },

    /**
     * Gera uma Apresentação Pedagógica completa de Slides usando a API do Gemini.
     * Suporta enriquecimento por Habilidade BNCC e arquivo de contexto anexado.
     */
    async gerarApresentacaoSlides(tema, disciplina = 'Geral', quantidadeSlides = 5, habilidadeBncc = null, textoContextoArquivo = '') {
        let bnccContext = '';
        if (habilidadeBncc) {
            const codigo = habilidadeBncc.codigo || habilidadeBncc.code || '';
            const desc = habilidadeBncc.descricao || habilidadeBncc.description || habilidadeBncc.nome || '';
            bnccContext = `\nHabilidade BNCC Relacionada: ${codigo} - ${desc}`;
        }

        let fileContext = '';
        if (textoContextoArquivo && textoContextoArquivo.trim()) {
            fileContext = `\n\nMaterial do Professor / Conteúdo Base Fornecido:\n"""\n${textoContextoArquivo.substring(0, 10000)}\n"""`;
        }

        const prompt = `
            Você é um especialista pedagógico em criação de apresentações escolares interativas para professores da Educação Básica.
            Gere uma apresentação didática, estruturada e engajante com exatamente ${quantidadeSlides} slides sobre o tema abaixo.

            DADOS DA AULA:
            - Tema / Assunto: ${tema}
            - Disciplina: ${disciplina}${bnccContext}${fileContext}

            INSTRUÇÕES PARA OS SLIDES:
            1. O primeiro slide (index 0) DEVE ser do tipo "capa".
            2. Inclua pelo menos um slide do tipo "topicos-animados" com 3 a 5 pontos marcantes de revelação passo a passo.
            3. Se a disciplina for Exatas, Ciências ou Matemática, inclua um slide do tipo "katex" com uma fórmula em sintaxe KaTeX (ex: \\frac{a}{b} = c).
            4. Inclua um slide do tipo "quiz" com uma pergunta desafiadora de fixação, 3 opções e o índice da resposta correta (0, 1 ou 2).
            5. Cada slide DEVE ter "notasProfessor" com roteiro didático de orientação para o docente falar em sala.

            FORMATO DE RESPOSTA (Exclusivamente JSON válido sem texto adicional antes ou depois):
            {
                "titulo": "Título Curto da Apresentação",
                "subtitulo": "Subtítulo explicativo pedagógico",
                "disciplina": "${disciplina}",
                "slides": [
                    {
                        "id": "slide_1",
                        "tipoLayout": "capa",
                        "titulo": "Título Principal da Capa",
                        "subtitulo": "Subtítulo da Capa",
                        "conteudo": "Descrição introdutória da aula...",
                        "topicos": [],
                        "notasProfessor": "Boas-vindas aos alunos...",
                        "animacaoEntrada": "zoom-in"
                    },
                    {
                        "id": "slide_2",
                        "tipoLayout": "topicos-animados",
                        "titulo": "Pontos Chave de Aprendizagem",
                        "subtitulo": "Tópicos de reflexão",
                        "conteudo": "",
                        "topicos": [
                            "Primeiro conceito fundamental",
                            "Segundo conceito com aplicação prática",
                            "Terceiro ponto de síntese"
                        ],
                        "notasProfessor": "Explicar cada ponto à medida que for revelando...",
                        "animacaoEntrada": "fade-up"
                    },
                    {
                        "id": "slide_3",
                        "tipoLayout": "titulo-texto",
                        "titulo": "Aprofundamento",
                        "subtitulo": "Conceito Central",
                        "conteudo": "Explicação detalhada em texto...",
                        "topicos": [],
                        "notasProfessor": "Conectar este conceito com os assuntos vistos na aula anterior...",
                        "animacaoEntrada": "slide-right"
                    },
                    {
                        "id": "slide_4",
                        "tipoLayout": "quiz",
                        "titulo": "Desafio de Fixação",
                        "subtitulo": "Pergunta Rápida",
                        "conteudo": "Qual das opções descreve corretamente...",
                        "opcoesQuiz": [
                            "Opção A com explicação...",
                            "Opção B com explicação...",
                            "Opção C com explicação..."
                        ],
                        "respostaCorreta": 1,
                        "topicos": [],
                        "notasProfessor": "Dar 1 minuto para pensarem antes de revelar a resposta...",
                        "animacaoEntrada": "fade-up"
                    }
                ]
            }
        `;

        return await this._executarPromptGemini(prompt, 4000);
    },

    async gerarPlanoAula5Es({ disciplina = 'Geral', anoSerie = 'Ensino Fundamental', tema = '', habilidadeBNCC = '' }) {
        const prompt = `Atue como um Especialista Pedagógico especialista no Modelo 5Es de Metodologias Ativas (Engajar, Explorar, Explicar, Elaborar, Avaliar) e na BNCC.
Crie um Plano de Aula completo e inovador para:
- Disciplina: ${disciplina}
- Ano/Série: ${anoSerie}
- Tema Principal: ${tema}
- Habilidade BNCC: ${habilidadeBNCC || 'Alinhada ao ano escolar'}

Responda exclusivamente com um objeto JSON estruturado da seguinte forma:
{
  "titulo": "Título da Aula",
  "habilidade": "Código e descrição da habilidade BNCC",
  "engajar": "Atividade de sensibilização e gancho inicial (5-10 min)",
  "explorar": "Desafio prático e investigação em grupos (15-20 min)",
  "explicar": "Sintetização dos conceitos e mediação docente (15 min)",
  "elaborar": "Aplicação em novo contexto ou projeto (15-20 min)",
  "avaliar": "Critérios de avaliação formativa (10 min)"
}`;

        return await this._executarPromptGemini(prompt, 3000);
    }
};

if (typeof window !== 'undefined') {
    window.aiService = aiService;
}

