import { firebaseService } from './firebase-service.js';

export const model = {
    STORAGE_KEY: 'planner_pro_docente_2026',
    currentUser: null,
    coresComponentes: {
        "O eu, o outro e o nós": "#4f46e5",
        "Corpo, gestos e movimentos": "#0891b2",
        "Traços, sons, cores e formas": "#db2777",
        "Escuta, fala, pensamento e imaginação": "#7c3aed",
        "Espaços, tempos, quantidades, relações e transformações": "#059669",
        "Língua Portuguesa": "#2563eb",
        "Arte": "#db2777",
        "Educação Física": "#ea580c",
        "Língua Inglesa": "#475569",
        "Matemática": "#dc2626",
        "Ciências": "#16a34a",
        "Geografia": "#ca8a04",
        "História": "#9333ea",
        "Ensino Religioso": "#0d9488",
        "Linguagens e suas Tecnologias": "#2563eb",
        "Matemática e suas Tecnologias": "#dc2626",
        "Ciências da Natureza e suas Tecnologias": "#16a34a",
        "Ciências Humanas e Sociais Aplicadas": "#9333ea"
    },
    state: {
        userConfig: {
            themeColor: '#0891b2',
            periodType: 'bimestre'
        },
        turmas: [],
        questoes: [],
        eventos: {},
        planosDiarios: {},
        horario: {
            config: {
                matutino: [],
                vespertino: [],
                noturno: []
            },
            grade: {
                matutino: {},
                vespertino: {},
                noturno: {}
            }
        },
        isCloudSynced: false,
        lastUpdate: new Date(0).toISOString()

    },
    init() {
        const savedData = localStorage.getItem(this.STORAGE_KEY);
        if (savedData) {
            try {
                this.state = { ...this.state, ...JSON.parse(savedData) };
                if (this.state.questoes) {
                    this.state.questoes.forEach(q => {
                        if (q.id) q.id = Number(q.id);
                    });
                }
            } catch (e) {
                console.error("Erro cache local", e);
            }
        }
    },
    async loadUserData() {
        if (!firebaseService.auth.currentUser) return;
        this.currentUser = firebaseService.auth.currentUser;
        this.updateStatusCloud('<i class="fas fa-download"></i> Baixando...', 'text-blue-600');
        try {
            const cloudData = await firebaseService.loadFullData(this.currentUser.uid);
            if (cloudData) {
                const cloudHorario = cloudData.horario || { config: {}, grade: {} };
                const localHorario = this.state.horario || { config: {}, grade: {} };
                const cloudTemDados = cloudHorario.config && Object.keys(cloudHorario.config).length > 0;
                const localTemDados = localHorario.config && Object.keys(localHorario.config).length > 0;
                let horarioFinal = cloudHorario;
                if (localTemDados && !cloudTemDados) {
                    console.warn("Recuperação: Mantendo horário local (nuvem vazia). Aguardando salvamento manual pelo usuário.");
                    horarioFinal = localHorario;
                }
                this.state = {
                    ...this.state,
                    ...cloudData,
                    horario: horarioFinal
                };
                if (this.state.questoes) {
                    this.state.questoes.forEach(q => {
                        if (q.id) q.id = Number(q.id);
                    });
                }
                this.saveLocal();
                this.updateStatusCloud('<i class="fas fa-check"></i> Sincronizado', 'text-emerald-600');
            } else {
                this.isCloudSynced = true;
                this.saveCloudRoot();
            }
        } catch (e) {
            console.error("Erro no sync:", e);
            this.updateStatusCloud('Erro de conexão', 'text-red-500');
        } finally {
            this.isCloudSynced = true;
        }
    },
    saveLocal() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    },
    saveCloudRoot() {
        if (!this.isCloudSynced) {
            console.warn("Salvamento na nuvem bloqueado: aguardando sincronização inicial.");
            return Promise.reject("Sincronização pendente");
        }
        if (this.currentUser) {
            this.updateStatusCloud('<i class="fas fa-sync fa-spin"></i> Salvando...', 'text-yellow-600');
            return firebaseService.saveRoot(this.currentUser.uid, this.state)
                .then(() => {
                    this.updateStatusCloud('<i class="fas fa-check"></i> Salvo', 'text-emerald-600');
                    return true;
                })
                .catch(err => {
                    console.error("Erro ao salvar na nuvem:", err);
                    this.updateStatusCloud('Erro ao salvar', 'text-red-500');
                    throw err;
                });
        }
        return Promise.resolve(false);
    },
    updateStatusCloud(html, colorClass) {
        const el = document.getElementById('cloud-status');
        if (el) {
            el.innerHTML = html;
            el.className = `flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-100 text-xs font-bold transition-all shadow-sm ${colorClass}`;
        }
    },
    updateConfig(key, value) {
        this.state.userConfig[key] = value;
        this.saveLocal();
        this.saveCloudRoot();
    },
    addTurma(nome, nivel, serie, identificador) {
        const novaTurma = {
            id: String(Date.now()),
            nome: nome.trim(),
            nivel, serie, identificador,
            alunos: [],
            avaliacoes: [],
            planejamento: {},
            planejamentoMensal: {}
        };
        this.state.turmas.push(novaTurma);
        this.saveLocal();
        if (this.currentUser) firebaseService.saveTurma(this.currentUser.uid, novaTurma);
    },
    deleteTurma(id) {
        this.state.turmas = this.state.turmas.filter(t => t.id != id);
        this.saveLocal();
        if (this.currentUser) firebaseService.deleteTurma(this.currentUser.uid, id);
    },
    addAluno(turmaId, nomeAluno) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (turma && nomeAluno.trim()) {
            const novoAluno = {
                id: String(Date.now() + Math.floor(Math.random() * 1000)),
                nome: nomeAluno.trim(),
                notas: {}
            };
            turma.alunos.push(novoAluno);
            turma.alunos.sort((a, b) => a.nome.localeCompare(b.nome));
            this.saveLocal();
            if (this.currentUser) firebaseService.saveAluno(this.currentUser.uid, turmaId, novoAluno);
        }
    },
    deleteAluno(turmaId, alunoId) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (turma) {
            turma.alunos = turma.alunos.filter(a => a.id != alunoId);
            this.saveLocal();
            if (this.currentUser) firebaseService.deleteAluno(this.currentUser.uid, turmaId, alunoId);
        }
    },
    addAvaliacao(turmaId, nome, max) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (turma) {
            const novaAv = { id: String(Date.now()), nome, max: Number(max) };
            turma.avaliacoes.push(novaAv);
            this.saveLocal();
            if (this.currentUser) firebaseService.saveAvaliacao(this.currentUser.uid, turmaId, novaAv);
        }
    },
    deleteAvaliacao(turmaId, avId) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (turma) {
            turma.avaliacoes = turma.avaliacoes.filter(av => av.id != avId);
            turma.alunos.forEach(aluno => { if (aluno.notas) delete aluno.notas[avId]; });
            this.saveLocal();
            if (this.currentUser) firebaseService.deleteAvaliacao(this.currentUser.uid, turmaId, avId);
        }
    },
    updateNota(turmaId, alunoId, avId, valor) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (turma) {
            const aluno = turma.alunos.find(a => a.id == alunoId);
            if (aluno) {
                if (!aluno.notas) aluno.notas = {};
                aluno.notas[avId] = valor;
                this.saveLocal();
                if (this.currentUser) firebaseService.saveAluno(this.currentUser.uid, turmaId, aluno);
            }
        }
    },
    addHabilidadePlanejamento(turmaId, periodoIdx, habilidade) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma) return;
        if (!turma.planejamento) turma.planejamento = {};
        const chavePeriodo = String(periodoIdx);
        if (!turma.planejamento[chavePeriodo]) turma.planejamento[chavePeriodo] = [];
        const existe = turma.planejamento[chavePeriodo].some(h => h.codigo === habilidade.codigo);
        if (!existe) {
            turma.planejamento[chavePeriodo].push(habilidade);
            this.saveLocal();
            if (this.currentUser) firebaseService.saveTurma(this.currentUser.uid, turma);
        }
    },
    removeHabilidadePlanejamento(turmaId, periodoIdx, codigoHabilidade) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma || !turma.planejamento || !turma.planejamento[periodoIdx]) return;
        turma.planejamento[periodoIdx] = turma.planejamento[periodoIdx].filter(h => h.codigo !== codigoHabilidade);
        this.saveLocal();
        if (this.currentUser) firebaseService.saveTurma(this.currentUser.uid, turma);
    },
    addHabilidadeMensal(turmaId, mes, habilidade) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma) return;
        if (!turma.planejamentoMensal) turma.planejamentoMensal = {};
        if (!turma.planejamentoMensal[mes]) turma.planejamentoMensal[mes] = [];
        if (!turma.planejamentoMensal[mes].some(h => h.codigo === habilidade.codigo)) {
            turma.planejamentoMensal[mes].push(habilidade);
            this.saveLocal();
            if (this.currentUser) firebaseService.saveTurma(this.currentUser.uid, turma);
        }
    },
    removeHabilidadeMensal(turmaId, mes, codigo) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (turma && turma.planejamentoMensal && turma.planejamentoMensal[mes]) {
            turma.planejamentoMensal[mes] = turma.planejamentoMensal[mes].filter(h => h.codigo !== codigo);
            this.saveLocal();
            if (this.currentUser) firebaseService.saveTurma(this.currentUser.uid, turma);
        }
    },
    setEvento(data, tipo, descricao) {
        if (!tipo) delete this.state.eventos[data];
        else this.state.eventos[data] = { tipo, descricao };
        this.saveLocal();
        this.saveCloudRoot();
    },
    savePlanoDiario(data, turmaId, conteudo) {
        if (!this.state.planosDiarios) this.state.planosDiarios = {};
        if (!this.state.planosDiarios[data]) this.state.planosDiarios[data] = {};
        this.state.planosDiarios[data][turmaId] = conteudo;
        this.saveLocal();
        this.saveCloudRoot();
    },
    getPlanoDiario(data, turmaId) {
        if (this.state.planosDiarios && this.state.planosDiarios[data] && this.state.planosDiarios[data][turmaId]) {
            return this.state.planosDiarios[data][turmaId];
        }
        return null;
    },
    toggleFrequencia(turmaId, alunoId, dataIso) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma) return;
        const aluno = turma.alunos.find(a => a.id == alunoId);
        if (!aluno) return;
        if (!aluno.frequencia) aluno.frequencia = {};
        const atual = aluno.frequencia[dataIso];
        let novo = 'P';
        if (!atual) novo = 'P';
        else if (atual === 'P') novo = 'F';
        else if (atual === 'F') novo = 'J';
        else if (atual === 'J') novo = null;
        if (novo) {
            aluno.frequencia[dataIso] = novo;
        } else {
            delete aluno.frequencia[dataIso];
        }
        this.saveLocal();
        if (this.currentUser) {
            firebaseService.saveFrequenciaAluno(this.currentUser.uid, turmaId, alunoId, aluno.frequencia);
        }
        return novo;
    },
    saveHorarioConfig(turno, slots) {
        if (!this.state.horario) this.state.horario = { config: {}, grade: {} };
        if (!this.state.horario.config) this.state.horario.config = {};
        this.state.horario.config[turno] = slots;
        this.saveLocal();
        this.saveCloudRoot();
    },
    saveGradeHoraria(turno, dia, slotIndex, turmaId) {
        if (!this.state.horario) this.state.horario = { config: {}, grade: {} };
        if (!this.state.horario.grade) this.state.horario.grade = {};
        if (!this.state.horario.grade[turno]) this.state.horario.grade[turno] = {};
        if (!this.state.horario.grade[turno][dia]) this.state.horario.grade[turno][dia] = [];
        while (this.state.horario.grade[turno][dia].length <= slotIndex) {
            this.state.horario.grade[turno][dia].push(null);
        }
        this.state.horario.grade[turno][dia][slotIndex] = turmaId;
        this.saveLocal();
        this.saveCloudRoot();
    },
    async saveHorarioCompleto(novoHorario) {
        this.state.horario = novoHorario;
        this.saveLocal();
        if (this.isCloudSynced) {
            try {
                await this.saveCloudRoot();
                return true;
            } catch (error) {
                console.error("Falha ao enviar horário para nuvem:", error);
                return false;
            }
        } else {
            console.warn("Salvamento na nuvem pendente: aguardando sincronização.");
            return false;
        }
    },
    addQuestao(obj) {
        this.state.questoes.push({ id: Date.now(), ...obj, createdAt: new Date().toISOString() });
        this.saveLocal();
        this.saveCloudRoot();
    },
    updateQuestao(id, dadosAtualizados) {
        const idNum = Number(id);
        const index = this.state.questoes.findIndex(q => q.id == idNum);
        if (index !== -1) {
            this.state.questoes[index] = {
                ...this.state.questoes[index],
                ...dadosAtualizados,
                id: idNum
            };
            this.saveLocal();
            this.saveCloudRoot();
        }
    },
    deleteQuestao(id) {
        const idNum = Number(id);
        this.state.questoes = this.state.questoes.filter(q => q.id != idNum);
        this.saveLocal();
        this.saveCloudRoot();
    },
    updatePosicaoMapa(turmaId, alunoId, posicao) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma) return;
        const alunosModificados = new Set();
        turma.alunos.forEach(a => {
            if (a.posicao === posicao) {
                delete a.posicao;
                alunosModificados.add(a);
            }
        });
        if (alunoId) {
            const aluno = turma.alunos.find(a => a.id == alunoId);
            if (aluno) {
                aluno.posicao = posicao;
                alunosModificados.add(aluno);
            }
        }
        this.saveLocal();
        if (this.currentUser) {
            alunosModificados.forEach(aluno => {
                firebaseService.saveAluno(this.currentUser.uid, turmaId, aluno);
            });
        }
    },
    movimentarAluno(turmaId, alunoId, novaPosicao) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma) return;
        const alunoOrigem = turma.alunos.find(a => a.id == alunoId);
        if (!alunoOrigem) return;
        const posicaoAntiga = alunoOrigem.posicao;
        const alunoDestino = turma.alunos.find(a => a.posicao === novaPosicao && a.id !== alunoId);
        alunoOrigem.posicao = novaPosicao;
        if (alunoDestino) {
            if (posicaoAntiga) {
                alunoDestino.posicao = posicaoAntiga;
            } else {
                delete alunoDestino.posicao;
            }
        }
        this.saveLocal();
        if (this.currentUser) {
            firebaseService.saveAluno(this.currentUser.uid, turmaId, alunoOrigem);
            if (alunoDestino) {
                firebaseService.saveAluno(this.currentUser.uid, turmaId, alunoDestino);
            }
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
    getSugestoesDoMes(turmaId, dataIso) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma || !turma.planejamentoMensal) return [];
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const mesIndex = parseInt(dataIso.split('-')[1]) - 1;
        return turma.planejamentoMensal[meses[mesIndex]] || [];
    }
};
if (typeof window !== 'undefined') {
    model.init();
}
