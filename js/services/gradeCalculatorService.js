// js/services/gradeCalculatorService.js
/**
 * ==========================================================================
 * SERVIÇO PURO DE CÁLCULO DE NOTAS E BOLETIM (GRADE CALCULATOR SERVICE)
 * Princípios: SRP (Single Responsibility), DRY (Don't Repeat Yourself), KISS, Pure Functions.
 * 100% livre de referências ao DOM (sem document, window ou tags HTML).
 * ==========================================================================
 */

export const gradeCalculatorService = {
    /**
     * Converte com segurança qualquer entrada (string com vírgula, número ou undefined) em float válido
     * @param {number|string|null|undefined} valor 
     * @returns {number|null} Retorna o número válido ou null se for vazio/inválido
     */
    parseNota(valor) {
        if (valor === null || valor === undefined || valor === '') return null;
        if (typeof valor === 'number') return isNaN(valor) ? null : valor;
        const str = String(valor).replace(',', '.').trim();
        const num = parseFloat(str);
        return isNaN(num) ? null : num;
    },

    /**
     * Formata um valor numérico para exibição padronizada com 1 casa decimal (ex: 7.5 ou '-')
     * @param {number|null|undefined} nota 
     * @param {number} [casasDecimais=1] 
     * @returns {string}
     */
    formatarNota(nota, casasDecimais = 1) {
        if (nota === null || nota === undefined || isNaN(nota)) return '-';
        return Number(nota).toFixed(casasDecimais).replace('.', ',');
    },

    /**
     * Calcula a soma das notas de avaliações de um período específico
     * @param {Array<Object>} avaliacoes - Lista de avaliações com { valor, periodo, ... }
     * @param {number|string} [periodoAlvo] - Período a ser filtrado (opcional)
     * @returns {number}
     */
    calcularSomaPeriodo(avaliacoes = [], periodoAlvo = null) {
        if (!Array.isArray(avaliacoes) || avaliacoes.length === 0) return 0;

        return avaliacoes.reduce((acum, av) => {
            if (periodoAlvo !== null && periodoAlvo !== undefined && String(av.periodo) !== String(periodoAlvo)) {
                return acum;
            }
            const nota = this.parseNota(av.nota ?? av.valor);
            return nota !== null ? acum + nota : acum;
        }, 0);
    },

    /**
     * Calcula a média das notas de múltiplos períodos ou avaliações
     * @param {Array<number|null>} notas - Array com notas numéricas
     * @param {Object} [opcoes]
     * @param {string} [opcoes.tipo='aritmetica'] - 'aritmetica' | 'ponderada' | 'somatoria'
     * @param {Array<number>} [opcoes.pesos] - Pesos caso seja ponderada
     * @param {number} [opcoes.divisorFixo] - Divisor fixo se configurado (ex: 4 bimestres)
     * @returns {number|null}
     */
    calcularMedia(notas = [], opcoes = {}) {
        if (!Array.isArray(notas) || notas.length === 0) return null;

        const { tipo = 'aritmetica', pesos = [], divisorFixo = null } = opcoes;
        const notasValidas = notas.map(n => this.parseNota(n));

        if (tipo === 'somatoria') {
            const soma = notasValidas.reduce((acc, n) => acc + (n || 0), 0);
            return Math.round(soma * 10) / 10;
        }

        if (tipo === 'ponderada' && Array.isArray(pesos) && pesos.length > 0) {
            let somaPonderada = 0;
            let somaPesos = 0;

            notasValidas.forEach((nota, idx) => {
                const peso = pesos[idx] || 1;
                if (nota !== null) {
                    somaPonderada += nota * peso;
                    somaPesos += peso;
                }
            });

            if (somaPesos === 0) return null;
            return Math.round((somaPonderada / somaPesos) * 10) / 10;
        }

        // Padrão: Média Aritmética
        const preenchidas = notasValidas.filter(n => n !== null);
        if (preenchidas.length === 0) return null;

        const soma = preenchidas.reduce((acc, n) => acc + n, 0);
        const divisor = divisorFixo && divisorFixo > 0 ? divisorFixo : preenchidas.length;

        return Math.round((soma / divisor) * 10) / 10;
    },

    /**
     * Determina o status pedagógico de aprovação do aluno
     * @param {number|null} media - Média final ou parcial
     * @param {Object} [regras]
     * @param {number} [regras.mediaMinima=6.0] 
     * @param {number} [regras.recuperacaoMinima=4.0] 
     * @param {number|null} [regras.frequenciaPercentual] 
     * @param {number} [regras.frequenciaMinima=75] 
     * @returns {{ status: string, codigo: string, cor: string }}
     */
    obterStatusAprovacao(media, regras = {}) {
        const {
            mediaMinima = 6.0,
            recuperacaoMinima = 4.0,
            frequenciaPercentual = null,
            frequenciaMinima = 75
        } = regras;

        if (frequenciaPercentual !== null && frequenciaPercentual < frequenciaMinima) {
            return {
                status: 'Reprovado por Falta',
                codigo: 'reprovado_falta',
                cor: '#ef4444'
            };
        }

        if (media === null || media === undefined || isNaN(media)) {
            return {
                status: 'Em Andamento',
                codigo: 'em_andamento',
                cor: '#64748b'
            };
        }

        if (media >= mediaMinima) {
            return {
                status: 'Aprovado',
                codigo: 'aprovado',
                cor: '#10b981'
            };
        } else if (media >= recuperacaoMinima) {
            return {
                status: 'Recuperação',
                codigo: 'recuperacao',
                cor: '#f59e0b'
            };
        } else {
            return {
                status: 'Reprovado',
                codigo: 'reprovado',
                cor: '#ef4444'
            };
        }
    },

    /**
     * Calcula estatísticas analíticas consolidadas de uma turma ou lista de alunos
     * @param {Object|Array<Object>} turmaOuAlunos - Objeto da turma ou lista de alunos
     * @param {Function} [extrairMediaAluno=null] - Função pura que extrai a média de um aluno
     * @returns {Object} { mediaTurma, mediaGeral, taxaAprovacao, idebEstimado, maiorNota, menorNota, totalAlunos, aprovados, recuperacao, reprovados }
     */
    calcularEstatisticasTurma(turmaOuAlunos = [], extrairMediaAluno = null) {
        const alunos = Array.isArray(turmaOuAlunos)
            ? turmaOuAlunos
            : (turmaOuAlunos && Array.isArray(turmaOuAlunos.alunos) ? turmaOuAlunos.alunos : []);

        const alunosValidos = alunos.filter(a => a && a.status !== 'transferido' && a.status !== 'realocado' && a.status !== 'evadido');

        if (alunosValidos.length === 0) {
            return {
                mediaTurma: 0,
                mediaGeral: 0,
                taxaAprovacao: 0,
                idebEstimado: 0,
                maiorNota: 0,
                menorNota: 0,
                totalAlunos: 0,
                aprovados: 0,
                recuperacao: 0,
                reprovados: 0
            };
        }

        const medias = [];
        let aprovados = 0;
        let recuperacao = 0;
        let reprovados = 0;

        alunosValidos.forEach(aluno => {
            let m = null;
            if (typeof extrairMediaAluno === 'function') {
                m = extrairMediaAluno(aluno);
            } else {
                m = this.parseNota(aluno.mediaFinal ?? aluno.mediaAnual ?? aluno.media);
                if (m === null && aluno.notas && typeof aluno.notas === 'object') {
                    const valores = Object.values(aluno.notas).map(v => this.parseNota(v)).filter(v => v !== null);
                    if (valores.length > 0) {
                        m = valores.reduce((a, b) => a + b, 0) / valores.length;
                    }
                }
            }

            if (m !== null && !isNaN(m)) {
                medias.push(m);
                if (m >= 6.0) aprovados++;
                else if (m >= 4.0) recuperacao++;
                else reprovados++;
            }
        });

        if (medias.length === 0) {
            return {
                mediaTurma: 0,
                mediaGeral: 0,
                taxaAprovacao: 0,
                idebEstimado: 0,
                maiorNota: 0,
                menorNota: 0,
                totalAlunos: alunosValidos.length,
                aprovados: 0,
                recuperacao: 0,
                reprovados: 0
            };
        }

        const soma = medias.reduce((acc, v) => acc + v, 0);
        const mediaTurma = Math.round((soma / medias.length) * 10) / 10;
        const mediaGeral = mediaTurma;
        const taxaAprovacao = alunosValidos.length > 0 ? (aprovados / alunosValidos.length) : 0;
        const idebEstimado = Math.round((mediaGeral * (taxaAprovacao > 0 ? taxaAprovacao : 1)) * 10) / 10;
        const maiorNota = Math.max(...medias);
        const menorNota = Math.min(...medias);

        return {
            mediaTurma,
            mediaGeral,
            taxaAprovacao,
            idebEstimado,
            maiorNota,
            menorNota,
            totalAlunos: alunosValidos.length,
            aprovados,
            recuperacao,
            reprovados
        };
    }
};
