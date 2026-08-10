import { firebaseService } from '../firebase-service.js';
import { turmaService } from '../services/turmaService.js';

export const turmaMethods = {
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
        if (this.currentUser && firebaseService?.saveTurma) {
            turmaService.saveTurma(this.currentUser.uid, novaTurma);
        }
    },
    deleteTurma(id) {
        this.state.turmas = this.state.turmas.filter(t => String(t.id) !== String(id));
        this.saveLocal();
        if (this.currentUser && firebaseService?.deleteTurma) {
            turmaService.deleteTurma(this.currentUser.uid, id);
        }
    },
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
            if (this.currentUser && firebaseService?.saveAluno) {
                turmaService.saveAluno(this.currentUser.uid, turmaId, novoAluno);
            }
        }
    },
    deleteAluno(turmaId, alunoId) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (turma) {
            turma.alunos = turma.alunos.filter(a => String(a.id) !== String(alunoId));
            this.saveLocal();
            if (this.currentUser && firebaseService?.deleteAluno) {
                turmaService.deleteAluno(this.currentUser.uid, turmaId, alunoId);
            }
        }
    },
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
            if (this.currentUser && firebaseService?.saveAvaliacao) {
                turmaService.saveAvaliacao(this.currentUser.uid, turmaId, novaAv);
            }
        }
    },
    deleteAvaliacao(turmaId, avId) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (turma) {
            turma.avaliacoes = turma.avaliacoes.filter(av => String(av.id) !== String(avId));
            turma.alunos.forEach(aluno => {
                if (aluno.notas && aluno.notas[avId] !== undefined) {
                    delete aluno.notas[avId];
                }
            });
            this.saveLocal();
            if (this.currentUser && firebaseService?.deleteAvaliacao) {
                turmaService.deleteAvaliacao(this.currentUser.uid, turmaId, avId);
            }
        }
    },
    updateNota(turmaId, alunoId, avId, valor) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (turma) {
            const aluno = turma.alunos.find(a => String(a.id) === String(alunoId));
            if (aluno) {
                if (!aluno.notas) aluno.notas = {};
                if (valor === "" || valor === null) {
                    aluno.notas[avId] = "";
                } else {
                    const valorFormatado = String(valor).replace(',', '.');
                    aluno.notas[avId] = Number(valorFormatado);
                }
                this.saveLocal();
                if (this.currentUser && firebaseService?.saveAluno) {
                    turmaService.saveAluno(this.currentUser.uid, turmaId, aluno);
                }
            }
        }
    },
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
        this.registrarFrequencia(turmaId, alunoId, dataIso, novo);
        return novo;
    },
    setFrequencia(turmaId, alunoId, dataIso, status) {
        this.registrarFrequencia(turmaId, alunoId, dataIso, status);
    },
    async registrarFrequencia(turmaId, alunoId, dataIso, status) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        const aluno = turma.alunos.find(a => String(a.id) === String(alunoId));
        if (!aluno) return;
        if (!aluno.frequencia) aluno.frequencia = {};
        if (status) {
            aluno.frequencia[dataIso] = status;
        } else {
            delete aluno.frequencia[dataIso];
        }
        this.saveLocal();
        if (this.currentUser && firebaseService?.saveFrequenciaAluno) {
            try {
                await turmaService.saveFrequenciaAluno(
                    this.currentUser.uid,
                    turmaId,
                    alunoId,
                    aluno.frequencia
                );
            } catch (error) {
                console.error("Erro na sincronização de frequência:", error);
            }
        }
    },
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
    movimentarAluno(turmaId, alunoId, novaPosicao) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        const alunoOcupante = turma.alunos.find(a => a.posicao === novaPosicao);
        if (alunoOcupante) {
            alunoOcupante.posicao = null;
            if (this.currentUser && firebaseService?.saveAluno) {
                turmaService.saveAluno(this.currentUser.uid, turmaId, alunoOcupante);
            }
        }
        const aluno = turma.alunos.find(a => String(a.id) === String(alunoId));
        if (aluno) {
            aluno.posicao = novaPosicao;
            this.saveLocal();
            if (this.currentUser && firebaseService?.saveAluno) {
                turmaService.saveAluno(this.currentUser.uid, turmaId, aluno);
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
            if (this.currentUser && firebaseService?.saveAluno) {
                turmaService.saveAluno(this.currentUser.uid, turmaId, aluno);
            }
        }
    },
    updateAluno(turmaId, alunoId, novosDados) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (turma) {
            const index = turma.alunos.findIndex(a => String(a.id) === String(alunoId));
            if (index !== -1) {
                turma.alunos[index] = { ...turma.alunos[index], ...novosDados };
                if (novosDados.nome) {
                    turma.alunos.sort((a, b) => a.nome.localeCompare(b.nome));
                }
                this.saveLocal();
                if (this.currentUser && firebaseService?.saveAluno) {
                    turmaService.saveAluno(this.currentUser.uid, turmaId, turma.alunos[index]);
                }
            }
        }
    }
};