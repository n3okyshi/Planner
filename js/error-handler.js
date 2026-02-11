/**
 * @file error-handler.js
 * @description Sistema centralizado de tratamento de erros
 * @module error-handler
 * @example
 * try {
 *     await turmaModel.saveTurma(dados);
 * } catch (err) {
 *     errorHandler.handle(err, 'turmaController', 'saveTurma');
 * }
 */

import { Toast } from './components/toast.js';

/**
 * Classe de erro da aplicação
 */
export class AppError extends Error {
    constructor(codigo, mensagem, statusCode = 500, detalhes = {}) {
        super(mensagem);
        this.name = 'AppError';
        this.codigo = codigo;
        this.statusCode = statusCode;
        this.detalhes = detalhes;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Classe de erro de validação
 */
export class ValidationError extends Error {
    constructor(codigo, mensagem, detalhes = {}) {
        super(mensagem);
        this.name = 'ValidationError';
        this.codigo = codigo;
        this.statusCode = 400;
        this.detalhes = detalhes;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Classe de erro de autenticação
 */
export class AuthenticationError extends Error {
    constructor(codigo, mensagem = 'Falha na autenticação', detalhes = {}) {
        super(mensagem);
        this.name = 'AuthenticationError';
        this.codigo = codigo;
        this.statusCode = 401;
        this.detalhes = detalhes;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Classe de erro de autorização
 */
export class AuthorizationError extends Error {
    constructor(codigo, mensagem = 'Acesso não autorizado', detalhes = {}) {
        super(mensagem);
        this.name = 'AuthorizationError';
        this.codigo = codigo;
        this.statusCode = 403;
        this.detalhes = detalhes;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Mapeamento de mensagens amigáveis por código de erro
 */
const MENSAGENS_AMIGAVEIS = {
    // Validação
    'NOME_VAZIO': 'Preencha o nome corretamente',
    'NOME_INVALIDO': 'O nome contém caracteres não permitidos',
    'NOME_MUITO_LONGO': 'O nome é muito longo',
    'TURMA_ID_VAZIO': 'Selecione uma turma',
    'ALUNO_ID_VAZIO': 'Selecione um aluno',
    'EMAIL_INVALIDO': 'Email inválido',
    'NOTA_INTERVALO': 'Nota deve estar entre 0 e 10',
    'DATA_INVALIDA': 'Data inválida',

    // Autenticação
    'AUTH_REQUIRED': 'Faça login para continuar',
    'INVALID_CREDENTIALS': 'Email ou senha incorretos',
    'USER_NOT_FOUND': 'Usuário não encontrado',

    // Autorização
    'UNAUTHORIZED': 'Você não tem permissão para isso',
    'OWNER_ONLY': 'Apenas o proprietário pode fazer isso',

    // Negócio
    'TURMA_NOT_FOUND': 'Turma não encontrada',
    'ALUNO_NOT_FOUND': 'Aluno não encontrado',
    'QUESTAO_NOT_FOUND': 'Questão não encontrada',
    'TURMA_JA_EXISTE': 'Já existe uma turma com esse nome',
    'ALUNO_JA_EXISTE': 'Aluno já está na turma',
    'ALUNO_DUPLICADO': 'Aluno duplicado nesta lista',

    // Servidor
    'DATABASE_ERROR': 'Erro ao acessar o banco de dados',
    'SYNC_ERROR': 'Erro ao sincronizar com a nuvem',
    'API_ERROR': 'Erro ao comunicar com o servidor',

    // Padrão
    'UNKNOWN_ERROR': 'Algo deu errado. Tente novamente.'
};

/**
 * Gerenciador centralizado de erros
 */
export const errorHandler = {
    /**
     * Processa e exibe um erro
     * @param {Error} err - Erro a processar
     * @param {string} modulo - Nome do módulo onde ocorreu
     * @param {string} funcao - Nome da função onde ocorreu
     * @param {Object} contexto - Contexto adicional
     */
    handle(err, modulo = 'app', funcao = 'unknown', contexto = {}) {
        // Log detalhado no console
        this.log(err, modulo, funcao, contexto);

        // Mensagem amigável para usuário
        const mensagemAmigavel = this.getMensagemAmigavel(err);

        // Tipo de notificação
        const tipoToast = this.getTipoToast(err);

        // Exibir toast
        Toast.show(mensagemAmigavel, tipoToast);

        // Retornar objeto de erro normalizado
        return this.normalizeError(err, modulo, funcao);
    },

    /**
     * Log detalhado de erro
     * @private
     */
    log(err, modulo, funcao, contexto) {
        const logObj = {
            timestamp: new Date().toISOString(),
            modulo,
            funcao,
            errorName: err.name,
            errorCode: err.codigo || 'UNKNOWN',
            message: err.message,
            stack: err.stack,
            contexto
        };

        if (window.DEBUG_MODE || err.statusCode >= 500) {
            console.error('[APP_ERROR]', logObj);
        } else {
            console.warn('[APP_WARN]', logObj);
        }

        // Em produção, enviar para servidor de logs
        if (window.location.hostname !== 'localhost') {
            this.sendToLogServer(logObj);
        }
    },

    /**
     * Envia erro para servidor de logs (futuro)
     * @private
     */
    sendToLogServer(logObj) {
        // TODO: Implementar envio para servidor de logs
        // fetch('/api/logs', { method: 'POST', body: JSON.stringify(logObj) });
    },

    /**
     * Obtém mensagem amigável para usuário
     * @private
     */
    getMensagemAmigavel(err) {
        // Se tem mensagem customizada, usar
        if (err.codigo && MENSAGENS_AMIGAVEIS[err.codigo]) {
            return MENSAGENS_AMIGAVEIS[err.codigo];
        }

        // Se é erro de validação, mostrar mensagem original
        if (err.name === 'ValidationError') {
            return err.message;
        }

        // Se é AppError, mostrar mensagem original
        if (err.name === 'AppError') {
            return err.message;
        }

        // Padrão
        return MENSAGENS_AMIGAVEIS['UNKNOWN_ERROR'];
    },

    /**
     * Determina tipo de toast baseado no erro
     * @private
     */
    getTipoToast(err) {
        if (err.statusCode === 400 || err.name === 'ValidationError') {
            return 'warning';
        }
        if (err.statusCode === 401 || err.name === 'AuthenticationError') {
            return 'error';
        }
        if (err.statusCode === 403 || err.name === 'AuthorizationError') {
            return 'error';
        }
        if (err.statusCode >= 500) {
            return 'error';
        }
        return 'error';
    },

    /**
     * Normaliza erro para formato padrão
     * @private
     */
    normalizeError(err, modulo, funcao) {
        return {
            codigo: err.codigo || 'UNKNOWN_ERROR',
            mensagem: err.message,
            statusCode: err.statusCode || 500,
            tipo: err.name || 'Error',
            modulo,
            funcao,
            timestamp: err.timestamp || new Date().toISOString(),
            detalhes: err.detalhes || {}
        };
    },

    /**
     * Cria erro de validação
     */
    validation(codigo, mensagem, detalhes = {}) {
        return new ValidationError(codigo, mensagem, detalhes);
    },

    /**
     * Cria erro de autenticação
     */
    authentication(codigo, mensagem = 'Falha na autenticação', detalhes = {}) {
        return new AuthenticationError(codigo, mensagem, detalhes);
    },

    /**
     * Cria erro de autorização
     */
    authorization(codigo, mensagem = 'Acesso não autorizado', detalhes = {}) {
        return new AuthorizationError(codigo, mensagem, detalhes);
    },

    /**
     * Cria erro da aplicação
     */
    appError(codigo, mensagem, statusCode = 500, detalhes = {}) {
        return new AppError(codigo, mensagem, statusCode, detalhes);
    }
};

/**
 * Wrapper para operações assíncronas com error handling automático
 * @param {Function} fn - Função assíncrona
 * @param {string} modulo - Nome do módulo
 * @param {string} funcao - Nome da função
 * @returns {Function} Função wrappada
 * @example
 * const salvarTurma = asyncHandler(
 *     async (dados) => { await turmaModel.save(dados); },
 *     'turmaController',
 *     'salvarTurma'
 * );
 */
export function asyncHandler(fn, modulo, funcao) {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (err) {
            errorHandler.handle(err, modulo, funcao);
            throw err;
        }
    };
}

/**
 * Wrapper para operações síncronas com error handling automático
 */
export function syncHandler(fn, modulo, funcao) {
    return (...args) => {
        try {
            return fn(...args);
        } catch (err) {
            errorHandler.handle(err, modulo, funcao);
            throw err;
        }
    };
}

export default errorHandler;
