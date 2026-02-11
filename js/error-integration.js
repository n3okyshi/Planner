/**
 * @file error-integration.js
 * @description Integração entre validators, error-handler e logger
 * @module error-integration
 * @example
 * import { setupErrorHandling, withErrorHandling } from './error-integration.js';
 * 
 * // Em controller principal
 * setupErrorHandling();
 * 
 * // Em funções
 * const salvarTurma = withErrorHandling(async (dados) => {
 *     return await turmaModel.save(dados);
 * }, 'turmaController', 'salvarTurma');
 */

import { errorHandler } from './error-handler.js';
import { logger } from './logger.js';

/**
 * Wrapper para funções assíncronas com erro handling automático
 * @param {Function} fn - Função a executar
 * @param {string} modulo - Nome do módulo
 * @param {string} funcao - Nome da função
 * @returns {Function}
 */
export function withErrorHandling(fn, modulo, funcao) {
    return async function wrapped(...args) {
        try {
            logger.debug(modulo, `Executando ${funcao}`, { argsCount: args.length });
            const resultado = await fn(...args);
            logger.info(modulo, `${funcao} completada com sucesso`);
            return resultado;
        } catch (erro) {
            logger.error(modulo, `Erro em ${funcao}`, erro, { args });
            errorHandler.handle(erro, modulo, funcao);
            throw erro; // Re-lançar para caller tratar se necessário
        }
    };
}

/**
 * Wrapper para funções síncronas com erro handling automático
 * @param {Function} fn - Função a executar
 * @param {string} modulo - Nome do módulo
 * @param {string} funcao - Nome da função
 * @returns {Function}
 */
export function withSyncErrorHandling(fn, modulo, funcao) {
    return function wrapped(...args) {
        try {
            logger.debug(modulo, `Executando ${funcao}`, { argsCount: args.length });
            const resultado = fn(...args);
            logger.info(modulo, `${funcao} completada com sucesso`);
            return resultado;
        } catch (erro) {
            logger.error(modulo, `Erro em ${funcao}`, erro, { args });
            errorHandler.handle(erro, modulo, funcao);
            throw erro;
        }
    };
}

/**
 * Setup global de error handling
 */
export function setupErrorHandling() {
    // Interceptar erros não capturados
    window.addEventListener('error', (event) => {
        logger.error('global', 'Erro não capturado', event.error, {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    });

    // Interceptar promise rejections não tratadas
    window.addEventListener('unhandledrejection', (event) => {
        logger.error('global', 'Promise rejection não tratada', event.reason, {
            promise: event.promise
        });
    });

    // Integração com Firebase (se disponível)
    if (window.firebase) {
        window.firebase.auth().onAuthStateChanged(
            () => {
                logger.debug('firebase', 'Auth state changed');
            },
            (error) => {
                logger.error('firebase', 'Auth error', error);
            }
        );
    }

    logger.info('system', 'Error handling setup concluído');
}

/**
 * Helper para validar entrada em formulários
 * @param {string} campo - Nome do campo
 * @param {*} valor - Valor a validar
 * @param {Function} validador - Função validadora
 * @returns {*} Valor validado
 * @throws Mostra toast ao usuário se inválido
 */
export function validateFormField(campo, valor, validador) {
    try {
        return validador(valor);
    } catch (erro) {
        logger.warn('form', `Validação falhou: ${campo}`, { valor, erro: erro.message });
        errorHandler.handle(erro, 'form', campo);
        return null;
    }
}

/**
 * Helper para executar múltiplas validações
 * @param {Object} dados - Dados a validar { campo: valor }
 * @param {Object} schema - Schema de validação { campo: funcaoValidadora }
 * @returns {Object|null} Dados validados ou null se houver erros
 */
export function validateFormData(dados, schema) {
    const erros = [];
    const validados = {};

    for (const [campo, validador] of Object.entries(schema)) {
        if (!(campo in dados)) continue;

        try {
            validados[campo] = validador(dados[campo]);
        } catch (erro) {
            erros.push({
                campo,
                erro: erro.message,
                codigo: erro.codigo
            });
        }
    }

    if (erros.length > 0) {
        logger.warn('form', 'Validação de formulário falhou', { erros });
        
        // Mostrar todos os erros
        erros.forEach(({ campo, erro }) => {
            errorHandler.handle(new Error(erro), 'form', campo);
        });
        
        return null;
    }

    logger.info('form', 'Formulário validado com sucesso');
    return validados;
}

/**
 * Retry automático com backoff exponencial
 * @param {Function} fn - Função a executar
 * @param {number} maxTentativas - Máximo de tentativas
 * @param {number} delayBase - Delay inicial em ms
 * @param {string} modulo - Módulo para logging
 */
export async function withRetry(fn, maxTentativas = 3, delayBase = 1000, modulo = 'retry') {
    let ultimoErro;

    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
        try {
            logger.debug(modulo, `Tentativa ${tentativa}/${maxTentativas}`);
            return await fn();
        } catch (erro) {
            ultimoErro = erro;
            
            if (tentativa === maxTentativas) {
                logger.error(modulo, `Falhou após ${maxTentativas} tentativas`, erro);
                throw erro;
            }

            const delay = delayBase * Math.pow(2, tentativa - 1);
            logger.warn(modulo, `Tentativa ${tentativa} falhou, retry em ${delay}ms`, { 
                erro: erro.message 
            });

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw ultimoErro;
}

export default {
    withErrorHandling,
    withSyncErrorHandling,
    setupErrorHandling,
    validateFormField,
    validateFormData,
    withRetry
};
