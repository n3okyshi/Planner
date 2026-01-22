const model = {
    STORAGE_KEY: 'planner_pro_docente_2026',
    currentUser: null,
    coresComponentes: {
        // Educação Infantil
        "O eu, o outro e o nós": "#4f46e5",
        "Corpo, gestos e movimentos": "#0891b2",
        "Traços, sons, cores e formas": "#db2777",
        "Escuta, fala, pensamento e imaginação": "#7c3aed",
        "Espaços, tempos, quantidades, relações e transformações": "#059669",
        // Ensino Fundamental
        "Língua Portuguesa": "#2563eb",
        "Arte": "#db2777",
        "Educação Física": "#ea580c",
        "Língua Inglesa": "#475569",
        "Matemática": "#dc2626",
        "Ciências": "#16a34a",
        "Geografia": "#ca8a04",
        "História": "#9333ea",
        "Ensino Religioso": "#0d9488",
        // Ensino Médio
        "Linguagens e suas Tecnologias": "#2563eb",
        "Matemática e suas Tecnologias": "#dc2626",
        "Ciências da Natureza e suas Tecnologias": "#16a34a",
        "Ciências Humanas e Sociais Aplicadas": "#9333ea"
    },
    state: {
        userConfig: {
            themeColor: '#0891b2',
            periodType: 'bimestre',
            schoolName: '',
            profName: ''
        },
        turmas: [],
        questoes: [],
        eventos: {},
        planosDiarios: {},
        lastUpdate: new Date(0).toISOString()
    },
    init() {
        const savedData = localStorage.getItem(this.STORAGE_KEY);
        if (savedData) {
            try {
                this.state = { ...this.state, ...JSON.parse(savedData) };
            } catch (e) {
                console.error("Erro cache local", e);
            }
        }
    },
    async loadUserData() {
        if (!window.firebaseService || !firebaseService.auth.currentUser) return;
        this.currentUser = firebaseService.auth.currentUser;
        this.updateStatusCloud('<i class="fas fa-download"></i> Verificando nuvem...', 'text-blue-600');
        try {
            const cloudData = await firebaseService.getData(this.currentUser.uid);
            if (cloudData) {
                const localTime = new Date(this.state.lastUpdate || 0).getTime();
                const cloudTime = new Date(cloudData.lastUpdate || 0).getTime();
                if (cloudTime > (localTime + 1000)) {
                    console.log("☁️ Nuvem é mais recente. Atualizando local.");
                    this.state = { ...this.state, ...cloudData };
                    this.saveLocal(); 
                    this.updateStatusCloud('<i class="fas fa-check"></i> Dados atualizados', 'text-emerald-600');
                } 
                else if (localTime > (cloudTime + 1000)) {
                    console.log("💻 Local é mais recente. Enviando para a nuvem.");
                    this.save(); 
                } 
                else {
                    console.log("✅ Dados sincronizados.");
                    this.updateStatusCloud('<i class="fas fa-check"></i> Sincronizado', 'text-emerald-600');
                }
            } else {
                console.log("🆕 Novo usuário na nuvem. Criando backup inicial.");
                this.save();
            }
        } catch (e) {
            console.error("Erro no sync:", e);
            this.updateStatusCloud('Erro de conexão', 'text-red-500');
        }
    },
    save() {
        this.state.lastUpdate = new Date().toISOString();
        this.saveLocal();
        if (this.currentUser && window.firebaseService) {
            this.updateStatusCloud('<i class="fas fa-sync fa-spin"></i> Salvando...', 'text-yellow-600');
            window.firebaseService.saveData(this.currentUser.uid, this.state)
                .then(() => {
                    this.updateStatusCloud('<i class="fas fa-check"></i> Salvo na Nuvem', 'text-emerald-600');
                })
                .catch((e) => {
                    console.error("Erro cloud save:", e);
                    this.updateStatusCloud('<i class="fas fa-wifi"></i> Salvo apenas localmente', 'text-orange-500');
                });
        }
    },
    saveLocal() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    },
    updateStatusCloud(html, colorClass) {
        const el = document.getElementById('cloud-status');
        if (el) {
            el.innerHTML = html;
            el.className = `flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-100 text-xs font-bold transition-all shadow-sm ${colorClass}`;
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
    updateConfig(key, value) {
        if (this.state.userConfig.hasOwnProperty(key)) {
            this.state.userConfig[key] = value;
            this.save();
        }
    },
    addTurma(nome, nivel, serie, identificador) {
        const novaTurma = {
            id: Date.now(),
            nome: nome.trim(),
            nivel, serie, identificador,
            alunos: [], avaliacoes: [], planejamento: {}, planejamentoMensal: {}
        };
        this.state.turmas.push(novaTurma);
        this.save();
    },
    deleteTurma(id) {
        this.state.turmas = this.state.turmas.filter(t => t.id != id); 
        this.save();
    },
    addAluno(turmaId, nomeAluno) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (turma && nomeAluno.trim()) {
            turma.alunos.push({ 
                id: Date.now() + Math.floor(Math.random() * 1000), 
                nome: nomeAluno.trim(), 
                notas: {} 
            });
            turma.alunos.sort((a, b) => a.nome.localeCompare(b.nome));
            this.save();
        }
    },
    deleteAluno(turmaId, alunoId) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (turma) {
            turma.alunos = turma.alunos.filter(a => a.id != alunoId);
            this.save();
        }
    },
    addAvaliacao(turmaId, nome, max) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (turma) {
            turma.avaliacoes.push({ id: Date.now(), nome, max: Number(max) });
            this.save();
        }
    },
    deleteAvaliacao(turmaId, avId) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (turma) {
            turma.avaliacoes = turma.avaliacoes.filter(av => av.id != avId);
            turma.alunos.forEach(aluno => { if (aluno.notas) delete aluno.notas[avId]; });
            this.save();
        }
    },
    updateNota(turmaId, alunoId, avId, valor) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (turma) {
            const aluno = turma.alunos.find(a => a.id == alunoId);
            if (aluno) {
                if (!aluno.notas) aluno.notas = {};
                aluno.notas[avId] = valor;
                this.save();
            }
        }
    },
    addHabilidadePlanejamento(turmaId, periodoIdx, habilidade) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma) return;
        if (!turma.planejamento) {
            turma.planejamento = {};
        }
        const chavePeriodo = String(periodoIdx);
        if (!turma.planejamento[chavePeriodo]) {
            turma.planejamento[chavePeriodo] = [];
        }
        const existe = turma.planejamento[chavePeriodo].some(h => h.codigo === habilidade.codigo);
        if (!existe) {
            turma.planejamento[chavePeriodo].push(habilidade);
            this.save();
            console.log(`Habilidade ${habilidade.codigo} salva no período ${chavePeriodo} da turma ${turma.nome}`);
        }
    },
    removeHabilidadePlanejamento(turmaId, periodoIdx, codigoHabilidade) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma || !turma.planejamento || !turma.planejamento[periodoIdx]) return;

        turma.planejamento[periodoIdx] = turma.planejamento[periodoIdx].filter(h => h.codigo !== codigoHabilidade);
        this.save();
    },
    addHabilidadeMensal(turmaId, mes, habilidade) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma) return;
        if (!turma.planejamentoMensal) turma.planejamentoMensal = {};
        if (!turma.planejamentoMensal[mes]) turma.planejamentoMensal[mes] = [];
        if (!turma.planejamentoMensal[mes].some(h => h.codigo === habilidade.codigo)) {
            turma.planejamentoMensal[mes].push(habilidade);
            this.save();
        }
    },
    removeHabilidadeMensal(turmaId, mes, codigo) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (turma && turma.planejamentoMensal && turma.planejamentoMensal[mes]) {
            turma.planejamentoMensal[mes] = turma.planejamentoMensal[mes].filter(h => h.codigo !== codigo);
            this.save();
        }
    },
    addQuestao(obj) {
        this.state.questoes.push({ id: Date.now(), ...obj, createdAt: new Date().toISOString() });
        this.save();
    },
    deleteQuestao(id) {
        this.state.questoes = this.state.questoes.filter(q => q.id != id);
        this.save();
    },
    setEvento(data, tipo, descricao) {
        if (!tipo) delete this.state.eventos[data];
        else this.state.eventos[data] = { tipo, descricao };
        this.save();
    },
    savePlanoDiario(data, turmaId, conteudo) {
        if (!this.state.planosDiarios) this.state.planosDiarios = {};
        if (!this.state.planosDiarios[data]) this.state.planosDiarios[data] = {};
        this.state.planosDiarios[data][turmaId] = conteudo;
        this.save();
    },
    getPlanoDiario(data, turmaId) {
        if (this.state.planosDiarios && this.state.planosDiarios[data] && this.state.planosDiarios[data][turmaId]) {
            return this.state.planosDiarios[data][turmaId];
        }
        return null;
    },
    getSugestoesDoMes(turmaId, dataIso) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma || !turma.planejamentoMensal) return [];
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const mesIndex = parseInt(dataIso.split('-')[1]) - 1;
        return turma.planejamentoMensal[meses[mesIndex]] || [];
    }
};
window.model = model;
model.init();