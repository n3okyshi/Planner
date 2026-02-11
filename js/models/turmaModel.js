/**
 * @file turmaModel.js
 * @description Módulo responsável pela gestão de Turmas, Alunos, Avaliações e Frequência.
 * @module models/turmaModel
 */

/**
 * Métodos do Model para gestão de Turmas e Alunos.
 * @namespace turmaMethods
 */
export const turmaMethods = {

    /**
     * Adiciona uma nova turma ao estado.
     * @param {string} nome - Nome composto (ex: "6º Ano A").
     * @param {string} nivel - Nível de ensino.
     * @param {string} serie - Série escolar.
     * @param {string} identificador - Identificador da turma (A, B, Única).
     */
    addTurma(nome, nivel, serie, identificador) {
        const novaTurma = {
            id: String(Date.now()),
            nome: nome.trim(),
            nivel,
            serie,
            identificador,
            alunos: [],
            avaliacoes: [],
            planejamento: {},
            planejamentoMensal: {}
        };

        this.state.turmas.push(novaTurma);

        this.saveLocal();

        if (this.currentUser && window.firebaseService) {
            window.firebaseService.saveTurma(this.currentUser.uid, novaTurma);
        }
    },

    /**
     * Remove uma turma e seus dados vinculados.
     * @param {string|number} id - ID da turma.
     */
    deleteTurma(id) {
        this.state.turmas = this.state.turmas.filter(t => String(t.id) !== String(id));

        this.saveLocal();

        if (this.currentUser && window.firebaseService) {
            window.firebaseService.deleteTurma(this.currentUser.uid, id);
        }
    },

    /**
     * Adiciona um aluno a uma turma específica e ordena a lista alfabeticamente.
     * @param {string} turmaId 
     * @param {string} nomeAluno 
     */
    addAluno(turmaId, nomeAluno) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));

        if (turma && nomeAluno.trim()) {
            const novoAluno = {
                id: String(Date.now() + Math.floor(Math.random() * 1000)),
                nome: nomeAluno.trim(),
                notas: {},
                frequencia: {},
                posicao: null
            };

            turma.alunos.push(novoAluno);
            turma.alunos.sort((a, b) => a.nome.localeCompare(b.nome));

            this.saveLocal();

            if (this.currentUser && window.firebaseService) {
                window.firebaseService.saveAluno(this.currentUser.uid, turmaId, novoAluno);
            }
        }
    },

    /**
     * Remove um aluno de uma turma.
     * @param {string} turmaId 
     * @param {string} alunoId 
     */
    deleteAluno(turmaId, alunoId) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));

        if (turma) {
            turma.alunos = turma.alunos.filter(a => String(a.id) !== String(alunoId));

            this.saveLocal();

            if (this.currentUser && window.firebaseService) {
                window.firebaseService.deleteAluno(this.currentUser.uid, turmaId, alunoId);
            }
        }
    },

    /**
     * Cria uma nova avaliação vinculada a um período (Bimestre/Trimestre).
     * @param {string} turmaId 
     * @param {string} nome 
     * @param {number} max 
     * @param {number} periodo 
     */
    addAvaliacao(turmaId, nome, max, periodo) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));

        if (turma) {
            const novaAv = {
                id: String(Date.now()),
                nome: nome.trim(),
                max: Number(max),
                periodo: Number(periodo) || 1
            };

            turma.avaliacoes.push(novaAv);

            this.saveLocal();

            if (this.currentUser && window.firebaseService) {
                window.firebaseService.saveAvaliacao(this.currentUser.uid, turmaId, novaAv);
            }
        }
    },

    /**
     * Remove uma avaliação e limpa as notas vinculadas nos objetos dos alunos.
     * @param {string} turmaId 
     * @param {string} avId 
     */
    deleteAvaliacao(turmaId, avId) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));

        if (turma) {
            turma.avaliacoes = turma.avaliacoes.filter(av => String(av.id) !== String(avId));

            // Limpeza de notas órfãs
            turma.alunos.forEach(aluno => {
                if (aluno.notas && aluno.notas[avId] !== undefined) {
                    delete aluno.notas[avId];
                }
            });

            this.saveLocal();

            if (this.currentUser && window.firebaseService) {
                window.firebaseService.deleteAvaliacao(this.currentUser.uid, turmaId, avId);
            }
        }
    },

    /**
     * Atualiza a nota de um aluno em uma avaliação específica.
     * Trata conversão de vírgula para ponto.
     * @param {string} turmaId 
     * @param {string} alunoId 
     * @param {string} avId 
     * @param {number|string} valor 
     */
    updateNota(turmaId, alunoId, avId, valor) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));

        if (turma) {
            const aluno = turma.alunos.find(a => String(a.id) === String(alunoId));

            if (aluno) {
                if (!aluno.notas) aluno.notas = {};

                // Aceita vazio, substitui vírgula por ponto e garante número
                if (valor === "" || valor === null) {
                    aluno.notas[avId] = "";
                } else {
                    const valorFormatado = String(valor).replace(',', '.');
                    aluno.notas[avId] = Number(valorFormatado);
                }

                this.saveLocal();

                if (this.currentUser && window.firebaseService) {
                    window.firebaseService.saveAluno(this.currentUser.uid, turmaId, aluno);
                }
            }
        }
    },

    /**
     * Alterna o estado de frequência (Logica de Toggle: P -> F -> J -> null).
     * @param {string} turmaId 
     * @param {string} alunoId 
     * @param {string} dataIso 
     * @returns {string|null} Novo estado da frequência.
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
        else novo = null; // Remove (limpa)

        // Reutiliza a função unificada de registro
        this.registrarFrequencia(turmaId, alunoId, dataIso, novo);

        return novo;
    },

    /**
     * Define frequência manualmente (Compatibilidade).
     * Redireciona para registrarFrequencia para manter o código DRY.
     * @param {string} turmaId 
     * @param {string} alunoId 
     * @param {string} dataIso 
     * @param {string} status 
     */
    setFrequencia(turmaId, alunoId, dataIso, status) {
        this.registrarFrequencia(turmaId, alunoId, dataIso, status);
    },

    /**
     * FUNÇÃO UNIFICADA DE FREQUÊNCIA.
     * Salva localmente e sincroniza de forma granular com a nuvem.
     * @param {string} turmaId 
     * @param {string} alunoId 
     * @param {string} dataIso 
     * @param {string|null} status - 'P', 'F', 'J' ou null.
     */
    async registrarFrequencia(turmaId, alunoId, dataIso, status) {
        // 1. Busca Segura
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

        // 3. Persistência Local Imediata (UX)
        this.saveLocal();

        // 4. Persistência Cloud Granular
        if (this.currentUser && window.firebaseService?.saveFrequenciaAluno) {
            try {
                await window.firebaseService.saveFrequenciaAluno(
                    this.currentUser.uid,
                    turmaId,
                    alunoId,
                    aluno.frequencia // Envia o mapa completo para merge seguro
                );
                // console.log(`☁️ Frequência salva: ${aluno.nome}`);
            } catch (error) {
                console.error("Erro na sincronização de frequência:", error);
            }
        }
    },

    /**
     * Calcula o resumo de notas de um aluno (Períodos e Média Anual).
     * @param {string} turmaId 
     * @param {string} alunoId 
     * @param {Object|null} turmaObj - Otimização: Objeto da turma já carregado.
     * @param {Object|null} alunoObj - Otimização: Objeto do aluno já carregado.
     * @returns {Object|null} Objeto contendo médias por período e anual.
     */
    getResumoAcademico(turmaId, alunoId, turmaObj = null, alunoObj = null) {
        const turma = turmaObj || this.state.turmas.find(t => String(t.id) === String(turmaId));
        const aluno = alunoObj || turma?.alunos.find(a => String(a.id) === String(alunoId));

        if (!turma || !aluno) return null;

        const tipoPeriodo = this.state.userConfig?.periodType || 'bimestre';
        const totalPeriodos = tipoPeriodo === 'bimestre' ? 4 : tipoPeriodo === 'trimestre' ? 3 : 2;

        const resumo = {
            periodos: {},
            mediaAnual: 0,
            somaAnual: 0
        };

        for (let i = 1; i <= totalPeriodos; i++) {
            const avsDoPeriodo = turma.avaliacoes.filter(av => Number(av.periodo) === i);

            const somaPeriodo = avsDoPeriodo.reduce((acc, av) => {
                const nota = aluno.notas?.[av.id];
                return acc + (Number(nota) || 0);
            }, 0);

            resumo.periodos[i] = somaPeriodo;
            resumo.somaAnual += somaPeriodo;
        }

        resumo.mediaAnual = totalPeriodos > 0 ? resumo.somaAnual / totalPeriodos : 0;
        return resumo;
    },

    /**
     * Utilitário para garantir que avaliações antigas tenham um período definido.
     */
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
            console.log("♻️ Avaliações migradas para conter período.");
        }
    },
    /**
         * Atualiza a posição (assento) de um aluno na sala.
         * @param {string} turmaId 
         * @param {string} alunoId 
         * @param {number} novaPosicao 
         */
    /**
     * Atualiza a posição (assento) de um aluno na sala.
     * @param {string} turmaId 
     * @param {string} alunoId 
     * @param {number} novaPosicao 
     */
    movimentarAluno(turmaId, alunoId, novaPosicao) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;

        const alunoOcupante = turma.alunos.find(a => a.posicao === novaPosicao);
        if (alunoOcupante) {
            alunoOcupante.posicao = null;
            if (this.currentUser && window.firebaseService) {
                window.firebaseService.saveAluno(this.currentUser.uid, turmaId, alunoOcupante);
            }
        }

        const aluno = turma.alunos.find(a => String(a.id) === String(alunoId));
        if (aluno) {
            aluno.posicao = novaPosicao;
            this.saveLocal();

            if (this.currentUser && window.firebaseService) {
                window.firebaseService.saveAluno(this.currentUser.uid, turmaId, aluno);
            }
        }
    },

    /**
     * Remove um aluno de uma posição específica.
     * @param {string} turmaId 
     * @param {number} posicao 
     */
    desocuparPosicao(turmaId, posicao) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;

        const aluno = turma.alunos.find(a => a.posicao === posicao);
        if (aluno) {
            aluno.posicao = null;
            this.saveLocal();
            if (this.currentUser && window.firebaseService) {
                window.firebaseService.saveAluno(this.currentUser.uid, turmaId, aluno);
            }
        }
    },
    /**
     * Atualiza dados cadastrais de um aluno (ex: correção de nome).
     * @param {string} turmaId 
     * @param {string} alunoId 
     * @param {Object} novosDados 
     */
    updateAluno(turmaId, alunoId, novosDados) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));

        if (turma) {
            const index = turma.alunos.findIndex(a => String(a.id) === String(alunoId));

            if (index !== -1) {
                // Preserva dados existentes e sobrescreve com os novos
                turma.alunos[index] = { ...turma.alunos[index], ...novosDados };

                // Reordena se o nome mudou
                if (novosDados.nome) {
                    turma.alunos.sort((a, b) => a.nome.localeCompare(b.nome));
                }

                this.saveLocal();

                if (this.currentUser && window.firebaseService) {
                    window.firebaseService.saveAluno(this.currentUser.uid, turmaId, turma.alunos[index]);
                }
            }
        }
    },
    movimentarAluno(turmaId, alunoId, novaPosicao) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;

        // Se o lugar já está ocupado, desocupa (swap)
        const alunoOcupante = turma.alunos.find(a => a.posicao === novaPosicao);
        if (alunoOcupante) {
            alunoOcupante.posicao = null;
            if (this.currentUser && window.firebaseService) {
                window.firebaseService.saveAluno(this.currentUser.uid, turmaId, alunoOcupante);
            }
        }

        const aluno = turma.alunos.find(a => String(a.id) === String(alunoId));
        if (aluno) {
            aluno.posicao = novaPosicao;
            this.saveLocal();

            // Salva o aluno específico na nuvem
            if (this.currentUser && window.firebaseService) {
                window.firebaseService.saveAluno(this.currentUser.uid, turmaId, aluno);
            }
        }
    },

    desocuparPosicao(turmaId, posicao) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;

        const aluno = turma.alunos.find(a => a.posicao === posicao);
        if (aluno) {
            aluno.posicao = null;
            this.saveLocal();
            if (this.currentUser && window.firebaseService) {
                window.firebaseService.saveAluno(this.currentUser.uid, turmaId, aluno);
            }
        }
    }
};