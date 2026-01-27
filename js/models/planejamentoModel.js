/**
 * @typedef {Object} HabilidadeBNCC
 * @property {string} codigo
 * @property {string} descricao
 */

/**
 * Módulo de lógica para Planejamento, Diário, BNCC e Calendário
 */
export const planejamentoMethods = {

    /**
     * Salva o registro de aula (conteúdo) de uma turma em uma data específica
     * @param {string} data - Formato ISO (YYYY-MM-DD)
     * @param {string} turmaId 
     * @param {string} conteudo 
     */
    savePlanoDiario(data, turmaId, conteudo) {
        if (!this.state.planosDiarios) this.state.planosDiarios = {};
        if (!this.state.planosDiarios[data]) this.state.planosDiarios[data] = {};
        
        this.state.planosDiarios[data][turmaId] = conteudo;
        
        this.saveLocal();
        this.saveCloudRoot();
    },

    /**
     * Recupera o plano de aula salvo
     * @param {string} data 
     * @param {string} turmaId 
     * @returns {string|null}
     */
    getPlanoDiario(data, turmaId) { 
        return this.state.planosDiarios?.[data]?.[turmaId] || null; 
    },

    /**
     * Adiciona uma habilidade da BNCC ao planejamento de um período específico
     * @param {string} turmaId 
     * @param {number|string} periodoIdx 
     * @param {HabilidadeBNCC} habilidade 
     */
    addHabilidadePlanejamento(turmaId, periodoIdx, habilidade) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma) return;
        
        if (!turma.planejamento) turma.planejamento = {};
        const chavePeriodo = String(periodoIdx);
        
        if (!turma.planejamento[chavePeriodo]) turma.planejamento[chavePeriodo] = [];
        
        // Evita duplicatas de habilidades no mesmo período
        if (!turma.planejamento[chavePeriodo].some(h => h.codigo === habilidade.codigo)) {
            turma.planejamento[chavePeriodo].push(habilidade);
            this.saveLocal();
            if (this.currentUser) window.firebaseService.saveTurma(this.currentUser.uid, turma);
        }
    },

    /**
     * Remove uma habilidade do planejamento por período
     * @param {string} turmaId 
     * @param {number|string} periodoIdx 
     * @param {string} codigoHabilidade 
     */
    removeHabilidadePlanejamento(turmaId, periodoIdx, codigoHabilidade) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma || !turma.planejamento || !turma.planejamento[periodoIdx]) return;
        
        turma.planejamento[periodoIdx] = turma.planejamento[periodoIdx].filter(h => h.codigo !== codigoHabilidade);
        this.saveLocal();
        if (this.currentUser) window.firebaseService.saveTurma(this.currentUser.uid, turma);
    },

    /**
     * Adiciona habilidade ao planejamento macro (Mensal)
     * @param {string} turmaId 
     * @param {string} mes - Nome do mês
     * @param {HabilidadeBNCC} habilidade 
     */
    addHabilidadeMensal(turmaId, mes, habilidade) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma) return;
        
        if (!turma.planejamentoMensal) turma.planejamentoMensal = {};
        if (!turma.planejamentoMensal[mes]) turma.planejamentoMensal[mes] = [];
        
        if (!turma.planejamentoMensal[mes].some(h => h.codigo === habilidade.codigo)) {
            turma.planejamentoMensal[mes].push(habilidade);
            this.saveLocal();
            if (this.currentUser) window.firebaseService.saveTurma(this.currentUser.uid, turma);
        }
    },

    /**
     * Define ou remove um evento no calendário escolar
     * @param {string} data - ISO YYYY-MM-DD
     * @param {string|null} tipo - ID do tipo de evento (feriado, conselho, etc)
     * @param {string} descricao 
     */
    setEvento(data, tipo, descricao) {
        if (!tipo) {
            delete this.state.eventos[data];
        } else {
            this.state.eventos[data] = { tipo, descricao };
        }
        this.saveLocal();
        this.saveCloudRoot();
    },

    /**
     * Determina o período letivo (1º, 2º...) baseado em uma data
     * @param {string} dataIso 
     * @returns {string} Numero do período em string
     */
    getPeriodoPorData(dataIso) {
        const periodosDatas = this.state.periodosDatas || {};
        const tipo = this.state.userConfig.periodType || 'bimestre';
        const periodos = periodosDatas[tipo] || [];
        const index = periodos.findIndex(p => dataIso >= p.inicio && dataIso <= p.fim);
        return index !== -1 ? String(index + 1) : "1";
    },

    /**
     * Recupera as habilidades planejadas para o mês de uma data específica
     * para sugerir no diário de classe.
     * @param {string} turmaId 
     * @param {string} dataIso 
     * @returns {HabilidadeBNCC[]}
     */
    getSugestoesDoMes(turmaId, dataIso) {
        const turma = this.state.turmas.find(t => t.id == turmaId);
        if (!turma?.planejamentoMensal) return [];
        
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const mesIndex = parseInt(dataIso.split('-')[1]) - 1;
        return turma.planejamentoMensal[meses[mesIndex]] || [];
    },

    /**
     * Salva a configuração de slots de horários de um turno
     * @param {string} turno - 'matutino' | 'vespertino' | 'noturno'
     * @param {Array} slots 
     */
    saveHorarioConfig(turno, slots) {
        if (!this.state.horario) this.state.horario = { config: {}, grade: {} };
        this.state.horario.config[turno] = slots;
        this.saveLocal();
        this.saveCloudRoot();
    }
};