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
    const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
    if (!turma) return null;
    const aluno = turma.alunos.find(a => String(a.id) === String(alunoId));
    if (!aluno) return null;

    const atual = aluno.frequencia?.[dataIso];
    let novo = null;

    if (!atual) novo = 'P';
    else if (atual === 'P') novo = 'F';
    else if (atual === 'F') novo = 'J';
    else novo = null;

    // Chama a função unificada
    this.registrarFrequencia(turmaId, alunoId, dataIso, novo);
    
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
    },
    setFrequencia(turmaId, alunoId, dataIso, status) {
    const turmas = this.state.turmas;
    const turmaIndex = turmas.findIndex(t => String(t.id) === String(turmaId));
    
    if (turmaIndex === -1) return;

    const alunoIndex = turmas[turmaIndex].alunos.findIndex(a => String(a.id) === String(alunoId));
    if (alunoIndex === -1) return;

    // Garante que o objeto de frequência existe
    if (!turmas[turmaIndex].alunos[alunoIndex].frequencia) {
        turmas[turmaIndex].alunos[alunoIndex].frequencia = {};
    }

    // Grava o dado
    turmas[turmaIndex].alunos[alunoIndex].frequencia[dataIso] = status;

    // --- O SEGREDO DA PERSISTÊNCIA ---
    // 1. Salva no LocalStorage imediatamente
    this.saveLocal(); 
    
    // 2. Sincroniza a turma específica no Firebase (se houver usuário logado)
    if (this.currentUser && window.firebaseService?.saveTurma) {
        window.firebaseService.saveTurma(this.currentUser.uid, turmas[turmaIndex]);
    } else {
        // Fallback: salva o estado inteiro se não houver função granular
        this.saveCloudRoot();
    }
    
    console.log(`💾 Salvo: Aluno ${alunoId} -> ${status} em ${dataIso}`);
},
/**
 * FUNÇÃO UNIFICADA DE FREQUÊNCIA
 * Usada tanto pelo Swipe quanto pelo Clique na Tabela.
 * @param {string} turmaId 
 * @param {string} alunoId 
 * @param {string} dataIso 
 * @param {string|null} status - 'P', 'F', 'J' ou null
 */
async registrarFrequencia(turmaId, alunoId, dataIso, status) {
    // 1. Localiza a turma e o aluno no estado local (RAM)
    const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
    if (!turma) return;

    const aluno = turma.alunos.find(a => String(a.id) === String(alunoId));
    if (!aluno) return;

    // 2. Atualiza o estado local
    if (!aluno.frequencia) aluno.frequencia = {};
    
    if (status) {
        aluno.frequencia[dataIso] = status;
    } else {
        delete aluno.frequencia[dataIso];
    }

    // 3. PERSISTÊNCIA LOCAL (Previne perda no F5 imediato)
    this.saveLocal();

    // 4. PERSISTÊNCIA CLOUD (Unificada)
    // Usamos a função granular do firebase-service que você já tem!
    if (this.currentUser && window.firebaseService?.saveFrequenciaAluno) {
        try {
            await window.firebaseService.saveFrequenciaAluno(
                this.currentUser.uid, 
                turmaId, 
                alunoId, 
                aluno.frequencia // Envia o mapa completo de datas do aluno
            );
            console.log(`☁️ Cloud sync: Aluno ${aluno.nome} -> ${status || 'Limpado'}`);
        } catch (error) {
            console.error("Erro na sincronização cloud:", error);
        }
    }
},
};