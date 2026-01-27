export const turmaMethods = {
    
    /**
     * Adiciona uma nova turma ao estado
     * @param {string} nome 
     * @param {string} nivel 
     * @param {string} serie 
     * @param {string} identificador 
     */
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
        if (this.currentUser) window.firebaseService.saveTurma(this.currentUser.uid, novaTurma);
    },

    /**
     * Remove uma turma e seus dados vinculados
     * @param {string|number} id 
     */
    deleteTurma(id) {
        this.state.turmas = this.state.turmas.filter(t => t.id != id);
        this.saveLocal();
        if (this.currentUser) window.firebaseService.deleteTurma(this.currentUser.uid, id);
    },

    /**
     * Adiciona um aluno a uma turma específica e ordena a lista alfabeticamente
     * @param {string} turmaId 
     * @param {string} nomeAluno 
     */
    addAluno(turmaId, nomeAluno) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (turma && nomeAluno.trim()) {
            const novoAluno = {
                id: String(Date.now() + Math.floor(Math.random() * 1000)),
                nome: nomeAluno.trim(),
                notas: {},
                frequencia: {}
            };
            turma.alunos.push(novoAluno);
            turma.alunos.sort((a, b) => a.nome.localeCompare(b.nome));
            this.saveLocal();
            if (this.currentUser) window.firebaseService.saveAluno(this.currentUser.uid, turmaId, novoAluno);
        }
    },

    /**
     * Remove um aluno de uma turma
     * @param {string} turmaId 
     * @param {string} alunoId 
     */
    deleteAluno(turmaId, alunoId) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (turma) {
            turma.alunos = turma.alunos.filter(a => a.id != alunoId);
            this.saveLocal();
            if (this.currentUser) window.firebaseService.deleteAluno(this.currentUser.uid, turmaId, alunoId);
        }
    },

    /**
     * Cria uma nova avaliação vinculada a um período (Bimestre/Trimestre)
     * @param {string} turmaId 
     * @param {string} nome 
     * @param {number} max 
     * @param {number} periodo 
     */
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
            if (this.currentUser) window.firebaseService.saveAvaliacao(this.currentUser.uid, turmaId, novaAv);
        }
    },

    /**
     * Remove uma avaliação e limpa as notas vinculadas nos objetos dos alunos
     * @param {string} turmaId 
     * @param {string} avId 
     */
    deleteAvaliacao(turmaId, avId) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (turma) {
            turma.avaliacoes = turma.avaliacoes.filter(av => av.id != avId);
            turma.alunos.forEach(aluno => { if (aluno.notas) delete aluno.notas[avId]; });
            this.saveLocal();
            if (this.currentUser) window.firebaseService.deleteAvaliacao(this.currentUser.uid, turmaId, avId);
        }
    },

    /**
     * Atualiza a nota de um aluno em uma avaliação específica
     * @param {string} turmaId 
     * @param {string} alunoId 
     * @param {string} avId 
     * @param {number|string} valor 
     */
    updateNota(turmaId, alunoId, avId, valor) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (turma) {
            const aluno = turma.alunos.find(a => a.id == alunoId);
            if (aluno) {
                if (!aluno.notas) aluno.notas = {};
                aluno.notas[avId] = valor === "" ? "" : Number(valor);
                this.saveLocal();
                if (this.currentUser) window.firebaseService.saveAluno(this.currentUser.uid, turmaId, aluno);
            }
        }
    },

    /**
     * Alterna o estado de frequência (P -> F -> J -> null)
     * @param {string} turmaId 
     * @param {string} alunoId 
     * @param {string} dataIso 
     * @returns {string|null} Novo estado da frequência
     */
    toggleFrequencia(turmaId, alunoId, dataIso) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        const aluno = turma?.alunos.find(a => a.id == alunoId);
        if (!aluno) return null;

        if (!aluno.frequencia) aluno.frequencia = {};
        const atual = aluno.frequencia[dataIso];
        let novo = !atual ? 'P' : atual === 'P' ? 'F' : atual === 'F' ? 'J' : null;
        
        if (novo) aluno.frequencia[dataIso] = novo;
        else delete aluno.frequencia[dataIso];

        this.saveLocal();
        if (this.currentUser) window.firebaseService.saveFrequenciaAluno(this.currentUser.uid, turmaId, alunoId, aluno.frequencia);
        return novo;
    },

    /**
     * Calcula o resumo de notas de um aluno (Períodos e Média Anual)
     * @param {string} turmaId 
     * @param {string} alunoId 
     * @returns {Object|null}
     */
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
        }
    }
};