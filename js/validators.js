/**
 * @file validators.js
 * @description Validadores reutilizáveis para entrada de dados
 * @module validators
 * @example
 * try {
 *     const nomeProf = validators.nomeProf(input);
 *     const turmaId = validators.turmaId(selectedValue);
 * } catch (err) {
 *     Toast.show(err.message, 'error');
 * }
 */

export const validators = {
    /**
     * Valida nome de professor
     * @param {string} nome
     * @returns {string} Nome validado e trimado
     * @throws {ValidationError} Se inválido
     */
    nomeProf(nome) {
        if (!nome || typeof nome !== 'string') {
            throw new ValidationError('NOME_VAZIO', 'Nome do professor é obrigatório');
        }

        const nomeTrimado = nome.trim();

        if (nomeTrimado.length === 0) {
            throw new ValidationError('NOME_VAZIO', 'Nome do professor não pode ser vazio');
        }

        if (nomeTrimado.length > 150) {
            throw new ValidationError(
                'NOME_MUITO_LONGO',
                'Nome do professor deve ter no máximo 150 caracteres'
            );
        }

        // Apenas letras, números, espaço, hífen, apóstrofo
        if (!/^[a-záéíóúâêôãõç\s\-']+$/i.test(nomeTrimado)) {
            throw new ValidationError(
                'NOME_INVALIDO',
                'Nome contém caracteres não permitidos'
            );
        }

        return nomeTrimado;
    },

    /**
     * Valida nome de escola
     * @param {string} nome
     * @returns {string} Nome validado
     * @throws {ValidationError}
     */
    nomeEscola(nome) {
        if (!nome || typeof nome !== 'string') {
            return ''; // Opcional
        }

        const nomeTrimado = nome.trim();

        if (nomeTrimado.length > 200) {
            throw new ValidationError(
                'NOME_ESCOLA_MUITO_LONGO',
                'Nome da escola deve ter no máximo 200 caracteres'
            );
        }

        if (nomeTrimado && !/^[a-záéíóúâêôãõç0-9\s\-.,()]+$/i.test(nomeTrimado)) {
            throw new ValidationError(
                'NOME_ESCOLA_INVALIDO',
                'Nome da escola contém caracteres não permitidos'
            );
        }

        return nomeTrimado;
    },

    /**
     * Valida nome de turma
     * @param {string} nome
     * @returns {string} Nome validado
     * @throws {ValidationError}
     */
    nomeTurma(nome) {
        if (!nome || typeof nome !== 'string') {
            throw new ValidationError('TURMA_NOME_VAZIO', 'Nome da turma é obrigatório');
        }

        const nomeTrimado = nome.trim();

        if (nomeTrimado.length === 0) {
            throw new ValidationError('TURMA_NOME_VAZIO', 'Nome da turma não pode ser vazio');
        }

        if (nomeTrimado.length > 100) {
            throw new ValidationError(
                'TURMA_NOME_LONGO',
                'Nome da turma deve ter no máximo 100 caracteres'
            );
        }

        return nomeTrimado;
    },

    /**
     * Valida nome de aluno
     * @param {string} nome
     * @returns {string} Nome validado
     * @throws {ValidationError}
     */
    nomeAluno(nome) {
        if (!nome || typeof nome !== 'string') {
            throw new ValidationError('ALUNO_NOME_VAZIO', 'Nome do aluno é obrigatório');
        }

        const nomeTrimado = nome.trim();

        if (nomeTrimado.length === 0) {
            throw new ValidationError('ALUNO_NOME_VAZIO', 'Nome do aluno não pode ser vazio');
        }

        if (nomeTrimado.length > 150) {
            throw new ValidationError(
                'ALUNO_NOME_LONGO',
                'Nome do aluno deve ter no máximo 150 caracteres'
            );
        }

        if (!/^[a-záéíóúâêôãõç\s\-']+$/i.test(nomeTrimado)) {
            throw new ValidationError('ALUNO_NOME_INVALIDO', 'Nome contém caracteres não permitidos');
        }

        return nomeTrimado;
    },

    /**
     * Valida ID de turma
     * @param {any} id
     * @returns {string} ID validado
     * @throws {ValidationError}
     */
    turmaId(id) {
        if (!id) {
            throw new ValidationError('TURMA_ID_VAZIO', 'ID da turma é obrigatório');
        }

        const idString = String(id).trim();

        if (idString.length === 0) {
            throw new ValidationError('TURMA_ID_VAZIO', 'ID da turma não pode ser vazio');
        }

        return idString;
    },

    /**
     * Valida ID de aluno
     * @param {any} id
     * @returns {string} ID validado
     * @throws {ValidationError}
     */
    alunoId(id) {
        if (!id) {
            throw new ValidationError('ALUNO_ID_VAZIO', 'ID do aluno é obrigatório');
        }

        const idString = String(id).trim();

        if (idString.length === 0) {
            throw new ValidationError('ALUNO_ID_VAZIO', 'ID do aluno não pode ser vazio');
        }

        return idString;
    },

    /**
     * Valida email
     * @param {string} email
     * @returns {string} Email validado
     * @throws {ValidationError}
     */
    email(email) {
        if (!email || typeof email !== 'string') {
            throw new ValidationError('EMAIL_VAZIO', 'Email é obrigatório');
        }

        const emailTrimado = email.trim().toLowerCase();
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!regex.test(emailTrimado)) {
            throw new ValidationError('EMAIL_INVALIDO', 'Email inválido');
        }

        if (emailTrimado.length > 254) {
            throw new ValidationError('EMAIL_MUITO_LONGO', 'Email muito longo');
        }

        return emailTrimado;
    },

    /**
     * Valida nota (0-10)
     * @param {number} nota
     * @returns {number} Nota validada
     * @throws {ValidationError}
     */
    nota(nota) {
        const notaNum = Number(nota);

        if (isNaN(notaNum)) {
            throw new ValidationError('NOTA_INVALIDA', 'Nota deve ser um número');
        }

        if (notaNum < 0 || notaNum > 10) {
            throw new ValidationError('NOTA_INTERVALO', 'Nota deve estar entre 0 e 10');
        }

        return notaNum;
    },

    /**
     * Valida percentual (0-100)
     * @param {number} valor
     * @returns {number} Percentual validado
     * @throws {ValidationError}
     */
    percentual(valor) {
        const valorNum = Number(valor);

        if (isNaN(valorNum)) {
            throw new ValidationError('PERCENTUAL_INVALIDO', 'Percentual deve ser um número');
        }

        if (valorNum < 0 || valorNum > 100) {
            throw new ValidationError('PERCENTUAL_INTERVALO', 'Percentual deve estar entre 0 e 100');
        }

        return valorNum;
    },

    /**
     * Valida data em formato ISO (YYYY-MM-DD)
     * @param {string} dataIso
     * @returns {string} Data validada
     * @throws {ValidationError}
     */
    dataIso(dataIso) {
        if (!dataIso || typeof dataIso !== 'string') {
            throw new ValidationError('DATA_VAZIA', 'Data é obrigatória');
        }

        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dataIso)) {
            throw new ValidationError('DATA_FORMATO', 'Data deve estar em formato YYYY-MM-DD');
        }

        const data = new Date(dataIso);
        if (isNaN(data.getTime())) {
            throw new ValidationError('DATA_INVALIDA', 'Data inválida');
        }

        return dataIso;
    },

    /**
     * Valida tipo de questão
     * @param {string} tipo - 'multipla' ou 'aberta'
     * @returns {string} Tipo validado
     * @throws {ValidationError}
     */
    tipoQuestao(tipo) {
        const tiposPermitidos = ['multipla', 'aberta'];

        if (!tipo || !tiposPermitidos.includes(tipo)) {
            throw new ValidationError(
                'TIPO_QUESTAO_INVALIDO',
                `Tipo deve ser um de: ${tiposPermitidos.join(', ')}`
            );
        }

        return tipo;
    },

    /**
     * Valida dificuldade (1-3)
     * @param {number} dificuldade
     * @returns {number} Dificuldade validada
     * @throws {ValidationError}
     */
    dificuldade(dificuldade) {
        const dificuldadeNum = Number(dificuldade);

        if (isNaN(dificuldadeNum) || dificuldadeNum < 1 || dificuldadeNum > 3) {
            throw new ValidationError(
                'DIFICULDADE_INVALIDA',
                'Dificuldade deve ser 1 (fácil), 2 (média) ou 3 (difícil)'
            );
        }

        return dificuldadeNum;
    },

    /**
     * Valida enunciado de questão
     * @param {string} enunciado
     * @returns {string} Enunciado validado
     * @throws {ValidationError}
     */
    enunciado(enunciado) {
        if (!enunciado || typeof enunciado !== 'string') {
            throw new ValidationError('ENUNCIADO_VAZIO', 'Enunciado é obrigatório');
        }

        const enunciadoTrimado = enunciado.trim();

        if (enunciadoTrimado.length < 10) {
            throw new ValidationError('ENUNCIADO_CURTO', 'Enunciado deve ter no mínimo 10 caracteres');
        }

        if (enunciadoTrimado.length > 5000) {
            throw new ValidationError('ENUNCIADO_LONGO', 'Enunciado deve ter no máximo 5000 caracteres');
        }

        return enunciadoTrimado;
    },

    /**
     * Valida alternativa de múltipla escolha
     * @param {string} alternativa
     * @returns {string} Alternativa validada
     * @throws {ValidationError}
     */
    alternativa(alternativa) {
        if (!alternativa || typeof alternativa !== 'string') {
            throw new ValidationError('ALTERNATIVA_VAZIA', 'Alternativa é obrigatória');
        }

        const alternativaTrimada = alternativa.trim();

        if (alternativaTrimada.length < 2) {
            throw new ValidationError('ALTERNATIVA_CURTA', 'Alternativa deve ter no mínimo 2 caracteres');
        }

        if (alternativaTrimada.length > 500) {
            throw new ValidationError('ALTERNATIVA_LONGA', 'Alternativa deve ter no máximo 500 caracteres');
        }

        return alternativaTrimada;
    },

    /**
     * Valida gabarito (índice de alternativa correta)
     * @param {number} gabarito - Índice da alternativa (0-4)
     * @param {number} quantidadeAlternativas - Total de alternativas
     * @returns {number} Gabarito validado
     * @throws {ValidationError}
     */
    gabarito(gabarito, quantidadeAlternativas) {
        const gabaritoNum = Number(gabarito);

        if (isNaN(gabaritoNum)) {
            throw new ValidationError('GABARITO_INVALIDO', 'Gabarito deve ser um número');
        }

        if (gabaritoNum < 0 || gabaritoNum >= quantidadeAlternativas) {
            throw new ValidationError(
                'GABARITO_INTERVALO',
                `Gabarito deve estar entre 0 e ${quantidadeAlternativas - 1}`
            );
        }

        return gabaritoNum;
    },

    /**
     * Valida descrição
     * @param {string} descricao
     * @param {Object} opcoes
     * @param {number} opcoes.minLength - Mínimo de caracteres (default: 5)
     * @param {number} opcoes.maxLength - Máximo de caracteres (default: 1000)
     * @returns {string} Descrição validada
     * @throws {ValidationError}
     */
    descricao(descricao, opcoes = {}) {
        const { minLength = 5, maxLength = 1000 } = opcoes;

        if (!descricao || typeof descricao !== 'string') {
            throw new ValidationError('DESCRICAO_VAZIA', 'Descrição é obrigatória');
        }

        const descricaoTrimada = descricao.trim();

        if (descricaoTrimada.length < minLength) {
            throw new ValidationError(
                'DESCRICAO_CURTA',
                `Descrição deve ter no mínimo ${minLength} caracteres`
            );
        }

        if (descricaoTrimada.length > maxLength) {
            throw new ValidationError(
                'DESCRICAO_LONGA',
                `Descrição deve ter no máximo ${maxLength} caracteres`
            );
        }

        return descricaoTrimada;
    },

    /**
     * Valida URL
     * @param {string} url
     * @returns {string} URL validada
     * @throws {ValidationError}
     */
    url(url) {
        if (!url || typeof url !== 'string') {
            throw new ValidationError('URL_VAZIA', 'URL é obrigatória');
        }

        try {
            new URL(url);
            return url;
        } catch (err) {
            throw new ValidationError('URL_INVALIDA', 'URL inválida');
        }
    },

    /**
     * Valida múltiplos campos de forma batch
     * @param {Object} dados - Objeto com dados a validar
     * @param {Object} schema - Schema de validação { campo: validador }
     * @returns {Object} Dados validados
     * @throws {ValidationError}
     * @example
     * const dados = validators.batch({
     *     nomeProf: 'João',
     *     nomeEscola: 'Escola X',
     *     email: 'joao@example.com'
     * }, {
     *     nomeProf: validators.nomeProf,
     *     nomeEscola: validators.nomeEscola,
     *     email: validators.email
     * });
     */
    batch(dados, schema) {
        const resultado = {};
        const erros = [];

        for (const [campo, validador] of Object.entries(schema)) {
            try {
                resultado[campo] = validador(dados[campo]);
            } catch (err) {
                erros.push(`${campo}: ${err.message}`);
            }
        }

        if (erros.length > 0) {
            throw new ValidationError(
                'VALIDACAO_BATCH',
                `Erros de validação: ${erros.join('; ')}`,
                { erros }
            );
        }

        return resultado;
    }
};

/**
 * Classe de erro de validação
 */
export class ValidationError extends Error {
    constructor(codigo, mensagem, detalhes = {}) {
        super(mensagem);
        this.name = 'ValidationError';
        this.codigo = codigo;
        this.detalhes = detalhes;
        this.timestamp = new Date().toISOString();
    }
}

// Exportar como default também
export default validators;
