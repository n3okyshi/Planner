const model = {
    STORAGE_KEY: 'planner_pro_docente_2026',
    currentUser: null,
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
    save() {
        this.state.lastUpdate = new Date().toISOString();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
        if (this.currentUser && window.firebaseService) {
            this.updateStatusCloud('<i class="fas fa-sync fa-spin"></i> Salvando...', 'text-yellow-600');
            window.firebaseService.saveData(this.currentUser.uid, this.state)
                .then(() => {
                    this.updateStatusCloud('<i class="fas fa-check"></i> Salvo na Nuvem', 'text-emerald-600');
                })
                .catch(() => {
                    this.updateStatusCloud('<i class="fas fa-exclamation-triangle"></i> Erro ao salvar', 'text-red-500');
                });
        }
    },
    async onLogin(user) {
        this.currentUser = user;
        this.updateStatusCloud('<i class="fas fa-download"></i> Sincronizando...', 'text-blue-600');
        this.reloadCurrentView();
        if (window.firebaseService) {
            try {
                const cloudData = await window.firebaseService.getData(user.uid);
                if (cloudData) {
                    const localTime = new Date(this.state.lastUpdate || 0).getTime();
                    const cloudTime = new Date(cloudData.lastUpdate || 0).getTime();
                    if (cloudTime > (localTime + 1000)) {
                        console.log("☁️ Nuvem é mais recente. Atualizando este dispositivo.");
                        this.state = cloudData;
                        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
                        this.reloadCurrentView();
                        alert("Seus dados foram atualizados com a versão mais recente da nuvem!");
                    } else if (localTime > (cloudTime + 1000)) {
                        console.log("💻 Local é mais recente. Enviando para a nuvem.");
                        this.save();
                    } else {
                        console.log("✅ Dados já estão sincronizados.");
                    }
                } else {
                    console.log("🆕 Conta nova ou sem dados na nuvem. Criando backup inicial.");
                    this.save();
                }
                this.updateStatusCloud('<i class="fas fa-cloud"></i> Sincronizado', 'text-emerald-600');
            } catch (e) {
                console.error("Erro Sync:", e);
                this.updateStatusCloud('Erro de Conexão', 'text-red-500');
            }
        }
    },
    onLogout() {
        this.currentUser = null;
        this.reloadCurrentView();
        setTimeout(() => location.reload(), 100);
    },
    updateStatusCloud(html, colorClass) {
        const el = document.getElementById('cloud-status');
        if (el) {
            el.innerHTML = html;
            el.className = `flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-100 text-xs font-bold transition-all shadow-sm ${colorClass}`;
        }
    },
    reloadCurrentView() {
        if (window.controller && controller.currentTab) {
            controller.aplicarTema();
            controller.navigate(controller.currentTab);
        }
    },
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
        a.download = `backup_docente_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
        this.state.turmas = this.state.turmas.filter(t => t.id !== id);
        this.save();
    },
    addAluno(turmaId, nomeAluno) {
        const turma = this.state.turmas.find(t => t.id === turmaId);
        if (turma && nomeAluno.trim()) {
            turma.alunos.push({ id: Date.now() + Math.floor(Math.random() * 1000), nome: nomeAluno.trim(), notas: {} });
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
    addAvaliacao(turmaId, nome, max) {
        const turma = this.state.turmas.find(t => t.id === turmaId);
        if (turma) {
            turma.avaliacoes.push({ id: Date.now(), nome, max: Number(max) });
            this.save();
        }
    },
    deleteAvaliacao(turmaId, avId) {
        const turma = this.state.turmas.find(t => t.id === turmaId);
        if (turma) {
            turma.avaliacoes = turma.avaliacoes.filter(av => av.id !== avId);
            turma.alunos.forEach(aluno => { if (aluno.notas) delete aluno.notas[avId]; });
            this.save();
        }
    },
    updateNota(turmaId, alunoId, avId, valor) {
        const turma = this.state.turmas.find(t => t.id === turmaId);
        if (turma) {
            const aluno = turma.alunos.find(a => a.id === alunoId);
            if (aluno) {
                if (!aluno.notas) aluno.notas = {};
                aluno.notas[avId] = valor;
                this.save();
            }
        }
    },
    addHabilidadePlanejamento(turmaId, periodo, habilidade) {
        const turma = this.state.turmas.find(t => t.id === turmaId);
        if (!turma) return;
        if (!turma.planejamento) turma.planejamento = {};
        if (!turma.planejamento[periodo]) turma.planejamento[periodo] = [];

        if (!turma.planejamento[periodo].some(h => h.codigo === habilidade.codigo)) {
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
    addHabilidadeMensal(turmaId, mes, habilidade) {
        const turma = this.state.turmas.find(t => t.id === turmaId);
        if (!turma) return;
        if (!turma.planejamentoMensal) turma.planejamentoMensal = {};
        if (!turma.planejamentoMensal[mes]) turma.planejamentoMensal[mes] = [];
        if (!turma.planejamentoMensal[mes].some(h => h.codigo === habilidade.codigo)) {
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
    addQuestao(obj) {
        this.state.questoes.push({ id: Date.now(), ...obj, createdAt: new Date().toISOString() });
        this.save();
    },
    deleteQuestao(id) {
        this.state.questoes = this.state.questoes.filter(q => q.id !== id);
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
model.init();