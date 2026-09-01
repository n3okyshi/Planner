// js/services/attendanceCalculatorService.js
/**
 * ==========================================================================
 * SERVIÇO PURO DE CÁLCULO DE FREQUÊNCIA E INFREQUÊNCIA (ATTENDANCE CALCULATOR)
 * Princípios: SRP (Single Responsibility), DRY, Pure Functions.
 * 100% desacoplado do DOM.
 * ==========================================================================
 */

export const attendanceCalculatorService = {
    /**
     * Calcula o percentual de frequência arredondado
     * @param {number} presencas 
     * @param {number} totalAulas 
     * @returns {number} Percentual entre 0 e 100
     */
    calcularPercentual(presencas, totalAulas) {
        if (!totalAulas || totalAulas <= 0) return 100;
        const perc = (presencas / totalAulas) * 100;
        return Math.min(100, Math.max(0, Math.round(perc * 10) / 10));
    },

    /**
     * Calcula os totais de presença, faltas e percentual para um aluno específico
     * @param {Array<Object>} registrosFrequencia - Lista de chamadas registradas
     * @param {string|number} alunoId - ID do aluno
     * @returns {{ presencas: number, faltas: number, faltasJustificadas: number, totalAulas: number, percentual: number, emRisco: boolean }}
     */
    calcularTotaisAluno(registrosFrequencia = [], alunoId) {
        if (!Array.isArray(registrosFrequencia) || !alunoId) {
            return {
                presencas: 0,
                faltas: 0,
                faltasJustificadas: 0,
                totalAulas: 0,
                percentual: 100,
                emRisco: false
            };
        }

        let presencas = 0;
        let faltas = 0;
        let faltasJustificadas = 0;
        let totalAulas = 0;

        registrosFrequencia.forEach(registro => {
            const status = registro.statusAlunos?.[String(alunoId)] || registro.alunos?.[String(alunoId)];
            const pesoAula = registro.qtdAulas || 1;

            if (status) {
                totalAulas += pesoAula;
                if (status === 'P' || status === 'presente') {
                    presencas += pesoAula;
                } else if (status === 'F' || status === 'falta') {
                    faltas += pesoAula;
                } else if (status === 'FJ' || status === 'justificada') {
                    faltasJustificadas += pesoAula;
                    presencas += pesoAula; // Falta justificada conta como presença pedagógica
                }
            }
        });

        const percentual = this.calcularPercentual(presencas, totalAulas);
        const emRisco = totalAulas > 0 && percentual < 75;

        return {
            presencas,
            faltas,
            faltasJustificadas,
            totalAulas,
            percentual,
            emRisco
        };
    },

    /**
     * Identifica todos os alunos de uma turma que estão com frequência abaixo do limite legal (75%)
     * @param {Array<Object>} alunos - Lista de alunos da turma
     * @param {Array<Object>} registrosFrequencia - Lista de registros de frequência
     * @param {number} [limiteMinimo=75] - Limite percentual mínimo
     * @returns {Array<Object>} Alunos em risco com seus respectivos percentuais
     */
    obterAlunosEmRisco(alunos = [], registrosFrequencia = [], limiteMinimo = 75) {
        if (!Array.isArray(alunos) || alunos.length === 0) return [];

        return alunos.map(aluno => {
            const totais = this.calcularTotaisAluno(registrosFrequencia, aluno.id);
            return {
                ...aluno,
                ...totais
            };
        }).filter(aluno => aluno.totalAulas > 0 && aluno.percentual < limiteMinimo);
    }
};
