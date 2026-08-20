import { firebaseService } from '../firebase-service.js';
import { dataProxy } from '../services/dataProxy.js';
import { generateId } from '../utils.js';

export const turmaMethods = {
    addTurma(nome, nivel, serie, identificador) {
        const novaTurma = {
            id: generateId('turma'),
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
            dataProxy.saveTurma(this.currentUser.uid, novaTurma);
        }
    },
    deleteTurma(id) {
        this.state.turmas = this.state.turmas.filter(t => String(t.id) !== String(id));
        this.saveLocal();
        if (this.currentUser && firebaseService?.deleteTurma) {
            dataProxy.deleteTurma(this.currentUser.uid, id);
        }
    },
    addAluno(turmaId, nomeAluno) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (turma && nomeAluno.trim()) {
            const novoAluno = {
                id: generateId('aluno'),
                nome: nomeAluno.trim(),
                notas: {},
                frequencia: {},
                posicao: null
            };
            turma.alunos.push(novoAluno);
            turma.alunos.sort((a, b) => a.nome.localeCompare(b.nome));
            this.saveLocal();
            if (this.currentUser && firebaseService?.saveAluno) {
                dataProxy.saveAluno(this.currentUser.uid, turmaId, novoAluno);
            }
        }
    },
    deleteAluno(turmaId, alunoId) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (turma) {
            turma.alunos = turma.alunos.filter(a => String(a.id) !== String(alunoId));
            this.saveLocal();
            if (this.currentUser && firebaseService?.deleteAluno) {
                dataProxy.deleteAluno(this.currentUser.uid, turmaId, alunoId);
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
                dataProxy.saveAvaliacao(this.currentUser.uid, turmaId, novaAv);
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
                dataProxy.deleteAvaliacao(this.currentUser.uid, turmaId, avId);
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
                    dataProxy.saveAluno(this.currentUser.uid, turmaId, aluno);
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
                await dataProxy.saveFrequenciaAluno(
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
                dataProxy.saveAluno(this.currentUser.uid, turmaId, alunoOcupante);
            }
        }
        const aluno = turma.alunos.find(a => String(a.id) === String(alunoId));
        if (aluno) {
            aluno.posicao = novaPosicao;
            this.saveLocal();
            if (this.currentUser && firebaseService?.saveAluno) {
                dataProxy.saveAluno(this.currentUser.uid, turmaId, aluno);
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
                dataProxy.saveAluno(this.currentUser.uid, turmaId, aluno);
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
                    dataProxy.saveAluno(this.currentUser.uid, turmaId, turma.alunos[index]);
                }
            }
        }
    },
    trocarPosicoesAlunos(turmaId, posOrigem, posDestino) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma || posOrigem === posDestino) return;

        const alunoOrigem = turma.alunos.find(a => a.posicao === posOrigem);
        const alunoDestino = turma.alunos.find(a => a.posicao === posDestino);

        if (alunoOrigem) alunoOrigem.posicao = posDestino;
        if (alunoDestino) alunoDestino.posicao = posOrigem;

        this.saveLocal();
        if (this.currentUser && firebaseService?.saveAluno) {
            if (alunoOrigem) dataProxy.saveAluno(this.currentUser.uid, turmaId, alunoOrigem);
            if (alunoDestino) dataProxy.saveAluno(this.currentUser.uid, turmaId, alunoDestino);
        }
    },
    setMapaConfig(turmaId, config) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        turma.mapaConfig = {
            linhas: Math.max(2, Math.min(10, Number(config.linhas) || 6)),
            colunas: Math.max(2, Math.min(10, Number(config.colunas) || 6)),
            visaoCalor: !!config.visaoCalor
        };
        this.saveLocal();
        if (this.currentUser && firebaseService?.saveTurma) {
            dataProxy.saveTurma(this.currentUser.uid, turma);
        }
    },
    addOcorrenciaDossie(turmaId, alunoId, ocorrencia) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return false;
        const aluno = turma.alunos.find(a => String(a.id) === String(alunoId));
        if (!aluno) return false;

        if (!Array.isArray(aluno.dossie)) {
            aluno.dossie = [];
        }

        const novaOcorrencia = {
            id: 'occ_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4),
            data: ocorrencia.data || new Date().toISOString().split('T')[0],
            tipo: ocorrencia.tipo || 'positivo', // 'positivo', 'indisciplina', 'familia', 'coordenacao', 'observacao'
            titulo: (ocorrencia.titulo || '').trim(),
            descricao: (ocorrencia.descricao || '').trim(),
            providencia: (ocorrencia.providencia || '').trim(),
            autor: ocorrencia.autor || this.state.userConfig?.profName || 'Docente',
            createdAt: Date.now()
        };

        aluno.dossie.unshift(novaOcorrencia);
        this.saveLocal();
        if (this.currentUser && firebaseService?.saveAluno) {
            dataProxy.saveAluno(this.currentUser.uid, turmaId, aluno);
        }
        return novaOcorrencia;
    },
    deleteOcorrenciaDossie(turmaId, alunoId, ocorrenciaId) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return false;
        const aluno = turma.alunos.find(a => String(a.id) === String(alunoId));
        if (!aluno || !Array.isArray(aluno.dossie)) return false;

        aluno.dossie = aluno.dossie.filter(o => String(o.id) !== String(ocorrenciaId));
        this.saveLocal();
        if (this.currentUser && firebaseService?.saveAluno) {
            dataProxy.saveAluno(this.currentUser.uid, turmaId, aluno);
        }
        return true;
    },
    replicarAvaliacaoParaTurmas(turmaOrigemId, avaliacaoId, turmasDestinoIds) {
        const turmaOrigem = this.state.turmas.find(t => String(t.id) === String(turmaOrigemId));
        if (!turmaOrigem || !Array.isArray(turmaOrigem.avaliacoes)) return { sucesso: 0, falhas: 0 };
        const av = turmaOrigem.avaliacoes.find(a => String(a.id) === String(avaliacaoId));
        if (!av) return { sucesso: 0, falhas: 0 };

        let sucesso = 0;
        turmasDestinoIds.forEach(tDestId => {
            const tDest = this.state.turmas.find(t => String(t.id) === String(tDestId));
            if (tDest) {
                if (!Array.isArray(tDest.avaliacoes)) tDest.avaliacoes = [];
                // Cria uma nova avaliação idêntica com ID único para a turma destino
                const novaAv = {
                    id: String(Date.now()) + '_' + Math.random().toString(36).substr(2, 4),
                    nome: av.nome,
                    max: Number(av.max) || 10,
                    periodo: Number(av.periodo) || 1
                };
                tDest.avaliacoes.push(novaAv);
                sucesso++;
                if (this.currentUser && firebaseService?.saveAvaliacao) {
                    dataProxy.saveAvaliacao(this.currentUser.uid, tDest.id, novaAv);
                }
            }
        });

        this.saveLocal();
        return { sucesso, falhas: turmasDestinoIds.length - sucesso };
    },
    alocarAlunoAssento(turmaId, alunoId, posicao) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return false;
        
        // Se a posição já estiver ocupada por outro aluno, desocupa o anterior
        const ocupanteAtual = (turma.alunos || []).find(a => a.posicao === posicao);
        if (ocupanteAtual && String(ocupanteAtual.id) !== String(alunoId)) {
            ocupanteAtual.posicao = null;
            if (this.currentUser && firebaseService?.saveAluno) {
                dataProxy.saveAluno(this.currentUser.uid, turmaId, ocupanteAtual);
            }
        }

        const aluno = (turma.alunos || []).find(a => String(a.id) === String(alunoId));
        if (aluno) {
            aluno.posicao = posicao;
            this.saveLocal();
            if (this.currentUser && firebaseService?.saveAluno) {
                dataProxy.saveAluno(this.currentUser.uid, turmaId, aluno);
            }
            return true;
        }
        return false;
    },
    desalocarAlunoAssento(turmaId, posicaoOuAlunoId) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return false;

        const aluno = (turma.alunos || []).find(a => a.posicao === posicaoOuAlunoId || String(a.id) === String(posicaoOuAlunoId));
        if (aluno) {
            aluno.posicao = null;
            this.saveLocal();
            if (this.currentUser && firebaseService?.saveAluno) {
                dataProxy.saveAluno(this.currentUser.uid, turmaId, aluno);
            }
            return true;
        }
        return false;
    }
};