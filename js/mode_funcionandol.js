/**
 * MODEL - Camada de Dados (Refatorada)
 * Responsável por: CRUD, Persistência (LocalStorage) e Regras de Negócio.
 */
const model = {
    STORAGE_KEY: 'planner_pro_docente_2026',
    currentUser: null, // usuario começa vazio
    // Estado Inicial Padrão
    state: {
        userConfig: {
            themeColor: '#0891b2',
            periodType: 'bimestre', // bimestre, trimestre, semestre
            schoolName: '',
            profName: ''
        },
        turmas: [],           // Lista de turmas com alunos e notas
        questoes: [],         // Banco de questões
        eventos: {},          // Calendário
        // Estruturas de suporte (opcionais, mas boas para cache)
        lastUpdate: null
    },

    /**
     * 1. INICIALIZAÇÃO E PERSISTÊNCIA
     */
    init() {
        const savedData = localStorage.getItem(this.STORAGE_KEY);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                // Merge inteligente: Mantém o estado atual e sobrescreve com o salvo
                // Isso garante que novos campos adicionados no código não quebrem dados antigos
                this.state = {
                    ...this.state,
                    ...parsed,
                    userConfig: { ...this.state.userConfig, ...parsed.userConfig }
                };
            } catch (e) {
                console.error("Erro ao carregar dados (resetando para padrão):", e);
                this.save();
            }
        } else {
            this.save(); // Salva o estado inicial se for o primeiro acesso
        }
    },

    save() {
        this.state.lastUpdate = new Date().toISOString();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    },

    // --- 2. CONFIGURAÇÕES E UTILITÁRIOS ---

    updateConfig(key, value) {
        if (this.state.userConfig.hasOwnProperty(key)) {
            this.state.userConfig[key] = value;
            this.save();
        }
    },

    exportData() {
        const dataStr = JSON.stringify(this.state, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_planner_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },

    // --- 3. GESTÃO DE TURMAS ---

    addTurma(nome, nivel, serie, identificador) {
        const novaTurma = {
            id: Date.now(),
            nome: nome.trim(),
            nivel: nivel,
            serie: serie || '',
            identificador: identificador || '',
            alunos: [],
            avaliacoes: [],       // Lista de atividades/provas
            planejamento: {},     // Bimestral
            planejamentoMensal: {} // Mensal
        };
        this.state.turmas.push(novaTurma);
        this.save();
        return novaTurma;
    },

    deleteTurma(id) {
        this.state.turmas = this.state.turmas.filter(t => t.id !== id);
        this.save();
    },

    // --- 4. GESTÃO DE ALUNOS ---

    addAluno(turmaId, nomeAluno) {
        const turma = this.state.turmas.find(t => t.id === turmaId);
        if (turma && nomeAluno.trim()) {
            turma.alunos.push({
                id: Date.now() + Math.floor(Math.random() * 1000), // ID único
                nome: nomeAluno.trim(),
                notas: {} // Objeto mapa: { idAvaliacao: nota }
            });
            // Ordena alfabeticamente
            turma.alunos.sort((a, b) => a.nome.localeCompare(b.nome));
            this.save();
        }
    },

    deleteAluno(turmaId, alunoId) {
        const turma = this.state.turmas.find(t => t.id === turmaId);
        if (turma) {
            turma.alunos = turma.alunos.filter(a => a.id !== alunoId);
            this.save();
        }
    },

    // --- 5. AVALIAÇÕES E NOTAS (Faltava isso no código antigo!) ---

    addAvaliacao(turmaId, nome, pesoMax) {
        const turma = this.state.turmas.find(t => t.id === turmaId);
        if (turma) {
            turma.avaliacoes.push({
                id: Date.now(),
                nome: nome,
                max: Number(pesoMax)
            });
            this.save();
        }
    },

    deleteAvaliacao(turmaId, avaliacaoId) {
        const turma = this.state.turmas.find(t => t.id === turmaId);
        if (turma) {
            // Remove a avaliação da lista
            turma.avaliacoes = turma.avaliacoes.filter(av => av.id !== avaliacaoId);

            // Limpeza: Remove as notas associadas a essa avaliação dos alunos
            turma.alunos.forEach(aluno => {
                if (aluno.notas && aluno.notas[avaliacaoId]) {
                    delete aluno.notas[avaliacaoId];
                }
            });
            this.save();
        }
    },

    updateNota(turmaId, alunoId, avaliacaoId, valor) {
        const turma = this.state.turmas.find(t => t.id === turmaId);
        if (turma) {
            const aluno = turma.alunos.find(a => a.id === alunoId);
            if (aluno) {
                if (!aluno.notas) aluno.notas = {};
                aluno.notas[avaliacaoId] = valor; // Salva como string ou number
                this.save();
            }
        }
    },

    // --- 6. PLANEJAMENTO (BNCC) ---

    // Bimestral/Trimestral
    addHabilidadePlanejamento(turmaId, periodo, habilidade) {
        const turma = this.state.turmas.find(t => t.id === turmaId);
        if (!turma) return;

        if (!turma.planejamento) turma.planejamento = {};
        if (!turma.planejamento[periodo]) turma.planejamento[periodo] = [];

        // Evita duplicidade no mesmo período
        const existe = turma.planejamento[periodo].some(h => h.codigo === habilidade.codigo);
        if (!existe) {
            turma.planejamento[periodo].push(habilidade);
            this.save();
        }
    },

    removeHabilidadePlanejamento(turmaId, periodo, codigo) {
        const turma = this.state.turmas.find(t => t.id === turmaId);
        if (turma && turma.planejamento && turma.planejamento[periodo]) {
            turma.planejamento[periodo] = turma.planejamento[periodo].filter(h => h.codigo !== codigo);
            this.save();
        }
    },

    // Mensal (Cronograma)
    addHabilidadeMensal(turmaId, mes, habilidade) {
        const turma = this.state.turmas.find(t => t.id === turmaId);
        if (!turma) return;

        if (!turma.planejamentoMensal) turma.planejamentoMensal = {};
        if (!turma.planejamentoMensal[mes]) turma.planejamentoMensal[mes] = [];

        const existe = turma.planejamentoMensal[mes].some(h => h.codigo === habilidade.codigo);
        if (!existe) {
            turma.planejamentoMensal[mes].push(habilidade);
            this.save();
        }
    },

    removeHabilidadeMensal(turmaId, mes, codigo) {
        const turma = this.state.turmas.find(t => t.id === turmaId);
        if (turma && turma.planejamentoMensal && turma.planejamentoMensal[mes]) {
            turma.planejamentoMensal[mes] = turma.planejamentoMensal[mes].filter(h => h.codigo !== codigo);
            this.save();
        }
    },

    // --- 7. BANCO DE QUESTÕES ---

    addQuestao(questaoObj) {
        const questao = {
            id: Date.now(),
            ...questaoObj,
            createdAt: new Date().toISOString()
        };
        this.state.questoes.push(questao);
        this.save();
    },

    deleteQuestao(id) {
        this.state.questoes = this.state.questoes.filter(q => q.id !== id);
        this.save();
    },

    // --- 8. CALENDÁRIO ---

    setEvento(data, tipo, descricao) {
        if (!tipo) {
            delete this.state.eventos[data];
        } else {
            this.state.eventos[data] = { tipo, descricao };
        }
        this.save();
    },
    // --- MÉTODOS DE PLANEJAMENTO DIÁRIO (Atualizado) ---

    savePlanoDiario(data, turmaId, conteudo) {
        // Garante que a estrutura exista
        if (!this.state.planosDiarios) this.state.planosDiarios = {};
        if (!this.state.planosDiarios[data]) this.state.planosDiarios[data] = {};

        // Salva o conteúdo específico daquela turma naquela data
        this.state.planosDiarios[data][turmaId] = conteudo;
        this.save();
    },

    getPlanoDiario(data, turmaId) {
        if (this.state.planosDiarios &&
            this.state.planosDiarios[data] &&
            this.state.planosDiarios[data][turmaId]) {
            return this.state.planosDiarios[data][turmaId];
        }
        return null; // Retorna nulo se não houver plano
    },

    // Recupera o que foi planejado no MENSAL para sugerir no diário
    getSugestoesDoMes(turmaId, dataIso) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma || !turma.planejamentoMensal) return [];

        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const mesIndex = parseInt(dataIso.split('-')[1]) - 1;
        const nomeMes = meses[mesIndex];

        return turma.planejamentoMensal[nomeMes] || [];
    },
};

// Inicialização automática ao carregar o script
// (Garante que os dados estejam prontos antes de qualquer View tentar renderizar)
model.init();