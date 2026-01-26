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
    tiposEventos: {
        'feriado_nac': { label: 'Feriado Nacional', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
        'feriado_est': { label: 'Feriado Estadual', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
        'feriado_mun': { label: 'Feriado Municipal', bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-200' },
        'recesso': { label: 'Recesso Escolar', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
        'ferias': { label: 'Férias Escolares', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
        'retorno_adm': { label: 'Retorno Admin.', bg: 'bg-slate-200', text: 'text-slate-700', border: 'border-slate-300' },
        'modulacao': { label: 'Modulação', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
        'plan_pedag': { label: 'Planej. Pedagógico', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
        'reuniao_ped': { label: 'Reunião Pedagógica', bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
        'conselho': { label: 'Conselho de Classe', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
        'reuniao_pais': { label: 'Reunião de Pais', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
        'avaliacao': { label: 'Avaliação Periódica', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
        'inicio_per': { label: 'Início do Período', bg: 'bg-lime-100', text: 'text-lime-800', border: 'border-lime-200' },
        'aula': { label: 'Dia Letivo', bg: 'bg-white', text: 'text-slate-600', border: 'border-slate-200' }
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
            config: { matutino: [], vespertino: [], noturno: [] },
            grade: { matutino: {}, vespertino: {}, noturno: {} }
        },
        periodosDatas: {
            'bimestre': [
                { nome: '1º Bimestre', inicio: '2026-01-16', fim: '2026-04-01' },
                { nome: '2º Bimestre', inicio: '2026-04-06', fim: '2026-06-30' },
                { nome: '3º Bimestre', inicio: '2026-08-03', fim: '2026-10-01' },
                { nome: '4º Bimestre', inicio: '2026-10-02', fim: '2026-12-22' }
            ],
            'trimestre': [
                { nome: '1º Trimestre', inicio: '2026-02-02', fim: '2026-05-15' },
                { nome: '2º Trimestre', inicio: '2026-05-18', fim: '2026-08-28' },
                { nome: '3º Trimestre', inicio: '2026-08-31', fim: '2026-12-18' }
            ],
            'semestre': [
                { nome: '1º Semestre', inicio: '2026-02-02', fim: '2026-07-03' },
                { nome: '2º Semestre', inicio: '2026-07-27', fim: '2026-12-18' }
            ]
        },
        questoesSistema: [],
        isCloudSynced: false,
        lastUpdate: new Date(0).toISOString()
    },

    init() {
        const savedData = localStorage.getItem(this.STORAGE_KEY);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                this.state = { ...this.state, ...parsed };
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
                if (localTemDados && !cloudTemDados) { horarioFinal = localHorario; }
                this.state = {
                    ...this.state,
                    ...cloudData,
                    horario: horarioFinal
                };
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
        firebaseService.subscribeToUserChanges(this.currentUser.uid, (newData) => {
            this.onCloudUpdate(newData);
        });
    },

    onCloudUpdate(newData) {
        if (!newData) return;
        const horarioMudou = JSON.stringify(this.state.horario) !== JSON.stringify(newData.horario);
        if (horarioMudou && newData.horario) {
            this.state.horario = newData.horario;
            this.state.lastUpdate = newData.lastUpdate;
            this.saveLocal();
            if (window.controller && window.controller.currentView === 'horario') {
                window.horarioView.render('view-container');
                window.Toast.show("Horário atualizado remotamente!", "info");
            }
        }
    },

    saveLocal() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    },

    saveCloudRoot() {
        if (!this.isCloudSynced) return Promise.reject("Sincronização pendente");
        if (this.currentUser) {
            this.updateStatusCloud('<i class="fas fa-sync fa-spin"></i> Salvando...', 'text-yellow-600');
            return firebaseService.saveRoot(this.currentUser.uid, this.state)
                .then(() => {
                    this.updateStatusCloud('<i class="fas fa-check"></i> Salvo', 'text-emerald-600');
                    return true;
                })
                .catch(err => {
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

    addAvaliacao(turmaId, nome, max, periodo) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (turma) {
            const novaAv = {
                id: String(Date.now()),
                nome: nome.trim(),
                max: Number(max),
                periodo: Number(periodo) || 1
            };
            turma.avaliacoes.push(novaAv);
            this.saveLocal();
            if (this.currentUser) firebaseService.saveAvaliacao(this.currentUser.uid, turmaId, novaAv);
        }
    },

    migrarAvaliacoesAntigas() {
        let houveMudanca = false;
        this.state.turmas.forEach(turma => {
            if (turma.avaliacoes) {
                turma.avaliacoes.forEach(av => {
                    if (av.periodo === undefined) {
                        av.periodo = 1;
                        houveMudanca = true;
                    }
                });
            }
        });
        if (houveMudanca) {
            this.saveLocal();
            this.saveCloudRoot();
            console.log("✅ Migração de períodos concluída.");
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

    copiarPlanejamentoEntreTurmas(idOrigem, idDestino) {
        const origem = this.state.turmas.find(t => t.id == idOrigem);
        const destino = this.state.turmas.find(t => t.id == idDestino);
        if (!origem || !destino) return false;
        if (origem.planejamento) destino.planejamento = JSON.parse(JSON.stringify(origem.planejamento));
        if (origem.planejamentoMensal) destino.planejamentoMensal = JSON.parse(JSON.stringify(origem.planejamentoMensal));
        this.saveLocal();
        if (this.currentUser) firebaseService.saveTurma(this.currentUser.uid, destino);
        return true;
    },

    addHabilidadePlanejamento(turmaId, periodoIdx, habilidade) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma) return;
        if (!turma.planejamento) turma.planejamento = {};
        const chavePeriodo = String(periodoIdx);
        if (!turma.planejamento[chavePeriodo]) turma.planejamento[chavePeriodo] = [];
        if (!turma.planejamento[chavePeriodo].some(h => h.codigo === habilidade.codigo)) {
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

    getPeriodoPorData(dataIso) {
        const periodosDatas = this.state.periodosDatas || {};
        const tipo = this.state.userConfig.periodType || 'bimestre';
        const periodos = periodosDatas[tipo] || [];
        const index = periodos.findIndex(p => dataIso >= p.inicio && dataIso <= p.fim);
        return index !== -1 ? String(index + 1) : "1";
    },

    savePlanoDiario(data, turmaId, conteudo) {
        if (!this.state.planosDiarios) this.state.planosDiarios = {};
        if (!this.state.planosDiarios[data]) this.state.planosDiarios[data] = {};
        this.state.planosDiarios[data][turmaId] = conteudo;
        this.saveLocal();
        this.saveCloudRoot();
    },

    getPlanoDiario(data, turmaId) { return this.state.planosDiarios?.[data]?.[turmaId] || null; },

    toggleFrequencia(turmaId, alunoId, dataIso) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma) return;
        const aluno = turma.alunos.find(a => a.id == alunoId);
        if (!aluno) return;
        if (!aluno.frequencia) aluno.frequencia = {};
        const atual = aluno.frequencia[dataIso];
        let novo = !atual ? 'P' : atual === 'P' ? 'F' : atual === 'F' ? 'J' : null;
        if (novo) aluno.frequencia[dataIso] = novo;
        else delete aluno.frequencia[dataIso];
        this.saveLocal();
        if (this.currentUser) firebaseService.saveFrequenciaAluno(this.currentUser.uid, turmaId, alunoId, aluno.frequencia);
        return novo;
    },

    saveHorarioConfig(turno, slots) {
        if (!this.state.horario) this.state.horario = { config: {}, grade: {} };
        this.state.horario.config[turno] = slots;
        this.saveLocal();
        this.saveCloudRoot();
    },

    saveGradeHoraria(turno, dia, slotIndex, turmaId, disciplina = null) {
        if (!this.state.horario) this.state.horario = { config: {}, grade: {} };
        if (!this.state.horario.grade[turno]) this.state.horario.grade[turno] = {};
        if (!this.state.horario.grade[turno][dia]) this.state.horario.grade[turno][dia] = [];
        while (this.state.horario.grade[turno][dia].length <= slotIndex) {
            this.state.horario.grade[turno][dia].push(null);
        }
        this.state.horario.grade[turno][dia][slotIndex] = {
            turmaId: turmaId,
            disciplina: disciplina
        };
        this.saveLocal();
        this.saveCloudRoot();
    },

    async saveHorarioCompleto(novoHorario) {
        this.state.horario = novoHorario;
        this.saveLocal();
        if (this.isCloudSynced && this.currentUser) {
            try {
                this.updateStatusCloud('<i class="fas fa-sync fa-spin"></i> Salvando Horário...', 'text-yellow-600');
                await firebaseService.saveHorarioOnly(this.currentUser.uid, this.state.horario);
                this.updateStatusCloud('<i class="fas fa-check"></i> Salvo', 'text-emerald-600');
                return true;
            } catch (error) {
                this.updateStatusCloud('Erro ao salvar', 'text-red-500');
                return false;
            }
        }
        return false;
    },

    async carregarQuestoesSistema() {
        try {
            const manifestRes = await fetch('./assets/data/manifest.json');
            const listaArquivos = await manifestRes.json();
            const buscas = listaArquivos.map(arquivo => fetch(`./assets/data/${arquivo}`).then(res => res.json()));
            const resultados = await Promise.all(buscas);
            this.state.questoesSistema = resultados.flat().map(q => ({
                ...q,
                id: q.id || `sys_${Math.random().toString(36).substr(2, 9)}`,
                preDefinida: true
            }));
            console.log(`✅ Banco Global carregado.`);
        } catch (e) {
            console.error("❌ Erro no banco de questões:", e);
        }
    },

    saveQuestao(questao) {
        if (!questao.id) {
            questao.id = "prof_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
            questao.createdAt = new Date().toISOString();
        }
        const index = this.state.questoes.findIndex(q => String(q.id) === String(questao.id));
        if (index !== -1) {
            this.state.questoes[index] = { ...this.state.questoes[index], ...questao };
        } else {
            this.state.questoes.push({ ...questao });
        }
        this.saveLocal();
        this.saveCloudRoot();
    },

    async compartilharQuestao(questaoId) {
        const questao = this.state.questoes.find(q => String(q.id) === String(questaoId));
        if (!questao) return;

        const enunciadoNormalizado = (questao.enunciado || "").trim();

        try {
            const jaExiste = await firebaseService.verificarDuplicataComunidade(enunciadoNormalizado);
            if (jaExiste) {
                window.Toast.show("Essa questão já foi compartilhada.", "warning");
                questao.compartilhada = true;
                this.saveLocal();
                if (window.provasView) window.provasView.render('view-container');
                return;
            }

            const qPublica = {
                enunciado: enunciadoNormalizado,
                alternativas: questao.alternativas || null,
                correta: (questao.correta !== undefined && questao.correta !== null) ? Number(questao.correta) : null,
                gabarito: questao.gabarito || null,
                gabarito_comentado: questao.gabarito_comentado || null,
                materia: questao.materia || 'Geral',
                ano: questao.ano || '2026',
                tipo: questao.tipo || 'aberta',
                suporte: questao.suporte || null,
                bncc: questao.bncc || null,
                autor: this.currentUser?.displayName || "Professor(a)",
                uid_autor: this.currentUser?.uid || null,
                id_local_origem: String(questao.id),
                data_partilha: new Date().toISOString()
            };

            await firebaseService.publicarQuestaoComunidade(qPublica);
            questao.compartilhada = true;
            this.saveLocal();
            
            // Sincroniza com a coleção privada do professor
            if (this.currentUser) {
                await firebaseService.saveRoot(this.currentUser.uid, {
                    questoes: this.state.questoes,
                    lastUpdate: new Date().toISOString()
                });
            }

            window.Toast.show("Compartilhado com sucesso!", "success");
            if (window.provasView) window.provasView.render('view-container');

        } catch (error) {
            console.error("❌ Erro ao compartilhar:", error);
            window.Toast.show("Falha ao compartilhar.", "error");
        }
    },

    async removerDaComunidade(questaoId) {
        try {
            await firebaseService.removerQuestaoComunidade(this.currentUser.uid, questaoId);
            const questao = this.state.questoes.find(q => String(q.id) === String(questaoId));
            if (questao) {
                delete questao.compartilhada;
                this.saveLocal();
                await this.saveCloudRoot();
                window.Toast.show("Questão retirada da comunidade!", "info");
                if (window.controller.currentView === 'provas' && window.provasView) {
                    window.provasView.render('view-container');
                }
            }
        } catch (error) {
            console.error("Erro ao remover:", error);
            window.Toast.show("Não foi possível retirar a questão.", "error");
        }
    },

    deleteQuestao(id) {
        this.state.questoes = this.state.questoes.filter(q => String(q.id) !== String(id));
        this.saveLocal();
        this.saveCloudRoot();
    },

    desocuparPosicao(turmaId, posicao) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma) return;
        const alunoNoLugar = turma.alunos.find(a => a.posicao === posicao);
        if (alunoNoLugar) {
            alunoNoLugar.posicao = null;
            this.saveLocal();
            if (this.currentUser) firebaseService.saveAluno(this.currentUser.uid, turmaId, alunoNoLugar);
        }
    },

    movimentarAluno(turmaId, alunoId, novaPosicao) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma) return;
        const alunoOrigem = turma.alunos.find(a => a.id == alunoId);
        if (!alunoOrigem) return;

        const posicaoAntiga = alunoOrigem.posicao;

        if (novaPosicao !== null) {
            const alunoDestino = turma.alunos.find(a => a.posicao === novaPosicao && a.id !== alunoId);
            alunoOrigem.posicao = novaPosicao;
            if (alunoDestino) alunoDestino.posicao = posicaoAntiga || null;
            this.saveLocal();
            if (this.currentUser) {
                firebaseService.saveAluno(this.currentUser.uid, turmaId, alunoOrigem);
                if (alunoDestino) firebaseService.saveAluno(this.currentUser.uid, turmaId, alunoDestino);
            }
        } else {
            alunoOrigem.posicao = null;
            this.saveLocal();
            if (this.currentUser) firebaseService.saveAluno(this.currentUser.uid, turmaId, alunoOrigem);
        }
    },

    exportData() {
        const dataStr = JSON.stringify(this.state, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `backup_planner_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    },

    getSugestoesDoMes(turmaId, dataIso) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma?.planejamentoMensal) return [];
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const mesIndex = parseInt(dataIso.split('-')[1]) - 1;
        return turma.planejamentoMensal[meses[mesIndex]] || [];
    },

    getResumoAcademico(turmaId, alunoId) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        const aluno = turma?.alunos.find(a => a.id == alunoId);
        if (!turma || !aluno) return null;

        const tipoPeriodo = this.state.userConfig.periodType || 'bimestre';
        const totalPeriodos = tipoPeriodo === 'bimestre' ? 4 : tipoPeriodo === 'trimestre' ? 3 : 2;

        const resumo = {
            periodos: {},
            mediaAnual: 0,
            somaAnual: 0
        };

        for (let i = 1; i <= totalPeriodos; i++) {
            const avsDoPeriodo = turma.avaliacoes.filter(av => Number(av.periodo) === i);
            const somaPeriodo = avsDoPeriodo.reduce((acc, av) => acc + (Number(aluno.notas?.[av.id]) || 0), 0);
            resumo.periodos[i] = somaPeriodo;
            resumo.somaAnual += somaPeriodo;
        }

        resumo.mediaAnual = totalPeriodos > 0 ? resumo.somaAnual / totalPeriodos : 0;
        return resumo;
    }
};

if (typeof window !== 'undefined') {
    model.init();
    window.model = model;
}