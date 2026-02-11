/**
 * @file logger.js
 * @description Sistema de logging estruturado
 * @module logger
 * @example
 * logger.info('turmaView', 'Turmas carregadas', { total: 5 });
 * logger.error('turmaModel', 'Erro ao salvar', err, { turmaId: 't123' });
 * logger.debug('controller', 'Estado atualizado', model.state);
 */

/**
 * Níveis de log
 */
const NIVEIS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

/**
 * Cores para console (para melhor visualização)
 */
const CORES = {
    DEBUG: '%c[DEBUG]',
    INFO: '%c[INFO]',
    WARN: '%c[WARN]',
    ERROR: '%c[ERROR]'
};

const ESTILOS = {
    DEBUG: 'color: #888; font-weight: bold;',
    INFO: 'color: #0891b2; font-weight: bold;',
    WARN: 'color: #f59e0b; font-weight: bold;',
    ERROR: 'color: #dc2626; font-weight: bold;'
};

/**
 * Gerenciador de logging
 */
export const logger = {
    // Nível mínimo de log (pode ser alterado em runtime)
    nivelMinimo: NIVEIS.INFO,

    // Ativar/desativar logging
    ativo: true,

    // Buffer de logs (para enviar ao servidor depois)
    buffer: [],
    maxBufferSize: 100,

    /**
     * Log de informação
     * @param {string} modulo - Nome do módulo/arquivo
     * @param {string} mensagem - Mensagem principal
     * @param {*} dados - Dados adicionais
     */
    info(modulo, mensagem, dados = {}) {
        this._log(NIVEIS.INFO, modulo, mensagem, dados);
    },

    /**
     * Log de erro
     * @param {string} modulo - Nome do módulo
     * @param {string} mensagem - Mensagem
     * @param {Error} erro - Objeto de erro
     * @param {Object} contexto - Contexto adicional
     */
    error(modulo, mensagem, erro, contexto = {}) {
        const dados = {
            errorName: erro?.name || 'Unknown',
            errorCode: erro?.codigo || 'UNKNOWN',
            errorMessage: erro?.message || String(erro),
            stack: erro?.stack,
            contexto
        };
        this._log(NIVEIS.ERROR, modulo, mensagem, dados);
    },

    /**
     * Log de aviso
     * @param {string} modulo
     * @param {string} mensagem
     * @param {*} dados
     */
    warn(modulo, mensagem, dados = {}) {
        this._log(NIVEIS.WARN, modulo, mensagem, dados);
    },

    /**
     * Log de debug (apenas em desenvolvimento)
     * @param {string} modulo
     * @param {string} mensagem
     * @param {*} dados
     */
    debug(modulo, mensagem, dados = {}) {
        if (window.DEBUG_MODE || this.nivelMinimo === NIVEIS.DEBUG) {
            this._log(NIVEIS.DEBUG, modulo, mensagem, dados);
        }
    },

    /**
     * Log de performance
     * @param {string} modulo
     * @param {string} operacao
     * @param {number} tempoMs - Tempo em milissegundos
     */
    perf(modulo, operacao, tempoMs) {
        const nivel = tempoMs > 1000 ? NIVEIS.WARN : NIVEIS.DEBUG;
        this._log(nivel, modulo, `[PERF] ${operacao}: ${tempoMs}ms`, { tempoMs });
    },

    /**
     * Implementação interna de log
     * @private
     */
    _log(nivel, modulo, mensagem, dados) {
        if (!this.ativo || nivel < this.nivelMinimo) return;

        const timestamp = new Date().toISOString();
        const nivelNome = Object.keys(NIVEIS).find(k => NIVEIS[k] === nivel);

        // Objeto de log estruturado
        const logObj = {
            timestamp,
            nivel: nivelNome,
            modulo,
            mensagem,
            dados,
            url: window.location.pathname,
            userAgent: navigator.userAgent
        };

        // Console (visual)
        console.log(
            `${CORES[nivelNome]} %s %s`,
            ESTILOS[nivelNome],
            `${timestamp} [${modulo}]`,
            mensagem
        );

        if (Object.keys(dados).length > 0) {
            console.log(dados);
        }

        // Buffer (para enviar depois)
        this._addToBuffer(logObj);
    },

    /**
     * Adiciona log ao buffer
     * @private
     */
    _addToBuffer(logObj) {
        this.buffer.push(logObj);

        // Limpar buffer se muito grande
        if (this.buffer.length > this.maxBufferSize) {
            this.buffer = this.buffer.slice(-this.maxBufferSize);
        }

        // Enviar ao servidor se for erro
        if (logObj.nivel === 'ERROR') {
            this.flushErrors();
        }
    },

    /**
     * Envia apenas erros para o servidor
     */
    flushErrors() {
        const erros = this.buffer.filter(log => log.nivel === 'ERROR');

        if (erros.length === 0) return;

        // TODO: Implementar envio para servidor
        // fetch('/api/logs', { 
        //     method: 'POST',
        //     body: JSON.stringify({ logs: erros })
        // }).catch(() => {
        //     // Falha silenciosa - não quebrar o app por erro de logging
        // });
    },

    /**
     * Retorna todo o buffer de logs
     */
    getAllLogs() {
        return [...this.buffer];
    },

    /**
     * Retorna apenas logs de erro
     */
    getErrorLogs() {
        return this.buffer.filter(log => log.nivel === 'ERROR');
    },

    /**
     * Limpa o buffer
     */
    clear() {
        this.buffer = [];
    },

    /**
     * Baixa logs como arquivo JSON (para debug)
     */
    downloadLogs() {
        const data = JSON.stringify(this.buffer, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Ativa modo debug (mostra todos os logs)
     */
    enableDebug() {
        this.nivelMinimo = NIVEIS.DEBUG;
        this.info('logger', 'Modo debug ativado');
    },

    /**
     * Desativa modo debug
     */
    disableDebug() {
        this.nivelMinimo = NIVEIS.INFO;
        this.info('logger', 'Modo debug desativado');
    }
};

export default logger;
