/**
 * @file planejamentoModel.js
 * @description Módulo responsável pela lógica de negócios do Planejamento, Diário de Classe, Integração BNCC e Calendário.
 * @module models/planejamentoModel
 */

/**
 * @typedef {Object} HabilidadeBNCC
 * @property {string} codigo - Código alfanumérico da habilidade (ex: EF01LP01).
 * @property {string} descricao - Texto descritivo da habilidade.
 */

/**
 * Métodos do Model para gestão de Planejamento e Diário.
 * @namespace planejamentoMethods
 */
export const planejamentoMethods = {

    /**
     * Salva o registro de aula (conteúdo ministrado) de uma turma em uma data específica.
     * @param {string} data - Data no formato ISO (YYYY-MM-DD).
     * @param {string} turmaId - ID da turma.
     * @param {Object|string} conteudo - Objeto com os campos do diário ou string (legado).
     */
    savePlanoDiario(data, turmaId, conteudo) {
        if (!this.state.planosDiarios) this.state.planosDiarios = {};
        if (!this.state.planosDiarios[data]) this.state.planosDiarios[data] = {};

        this.state.planosDiarios[data][turmaId] = conteudo;

        this.saveLocal();
    },

    /**
     * Recupera o conteúdo do plano de aula salvo.
     * @param {string} data - Data no formato ISO (YYYY-MM-DD).
     * @param {string} turmaId - ID da turma.
     * @returns {Object|string|null} O conteúdo salvo ou null se não existir.
     */
    getPlanoDiario(data, turmaId) {
        return this.state.planosDiarios?.[data]?.[turmaId] || null;
    },

    /**
     * Adiciona uma habilidade da BNCC ao planejamento de um período específico (Bimestre/Trimestre).
     * @param {string} turmaId - ID da turma.
     * @param {number|string} periodoIdx - Índice do período (1, 2, 3, 4).
     * @param {HabilidadeBNCC} habilidade - Objeto da habilidade BNCC.
     */
    addHabilidadePlanejamento(turmaId, periodoIdx, habilidade) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;

        if (!turma.planejamento) turma.planejamento = {};
        
        // FORÇA STRING para consistência de chave JSON
        const chavePeriodo = String(periodoIdx);

        if (!turma.planejamento[chavePeriodo]) turma.planejamento[chavePeriodo] = [];

        // Evita duplicatas exatas
        const jaExiste = turma.planejamento[chavePeriodo].some(h => h.codigo === habilidade.codigo);
        
        if (!jaExiste) {
            turma.planejamento[chavePeriodo].push(habilidade);
            
            console.log(`💾 Salvando habilidade ${habilidade.codigo} no período ${chavePeriodo}`);
            
            this.saveLocal(); // Persistência imediata
            
            if (this.currentUser && window.firebaseService) {
                window.firebaseService.saveTurma(this.currentUser.uid, turma);
            }
        }
    },

    /**
     * Remove uma habilidade do planejamento por período.
     * @param {string} turmaId 
     * @param {number|string} periodoIdx 
     * @param {string} codigoHabilidade 
     */
    removeHabilidadePlanejamento(turmaId, periodoIdx, codigoHabilidade) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        
        // Verificação robusta: garante que o array do período existe antes de filtrar
        if (!turma || !turma.planejamento || !Array.isArray(turma.planejamento[periodoIdx])) return;

        turma.planejamento[periodoIdx] = turma.planejamento[periodoIdx].filter(h => h.codigo !== codigoHabilidade);
        
        this.saveLocal();
        
        if (this.currentUser && window.firebaseService) {
            window.firebaseService.saveTurma(this.currentUser.uid, turma);
        }
    },

    /**
     * Adiciona habilidade ao planejamento macro (Mensal).
     * @param {string} turmaId 
     * @param {string} mes - Nome do mês (ex: "Janeiro").
     * @param {HabilidadeBNCC} habilidade 
     */
    addHabilidadeMensal(turmaId, mes, habilidade) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;

        if (!turma.planejamentoMensal) turma.planejamentoMensal = {};
        if (!turma.planejamentoMensal[mes]) turma.planejamentoMensal[mes] = [];

        const jaExiste = turma.planejamentoMensal[mes].some(h => h.codigo === habilidade.codigo);

        if (!jaExiste) {
            turma.planejamentoMensal[mes].push(habilidade);
            
            this.saveLocal();
            
            if (this.currentUser && window.firebaseService) {
                window.firebaseService.saveTurma(this.currentUser.uid, turma);
            }
        }
    },

    /**
     * Define ou remove um evento no calendário escolar.
     * @param {string} data - Data no formato ISO (YYYY-MM-DD).
     * @param {string|null} tipo - ID do tipo de evento (feriado, conselho, etc) ou null para remover.
     * @param {string} descricao - Descrição do evento.
     */
    setEvento(data, tipo, descricao) {
        if (!tipo) {
            delete this.state.eventos[data];
        } else {
            this.state.eventos[data] = { tipo, descricao };
        }
        
        this.saveLocal();
    },

    /**
     * Determina o período letivo (1º, 2º...) baseado em uma data e na configuração do usuário.
     * @param {string} dataIso - Data ISO.
     * @returns {string} Numero do período em string ("1", "2", etc).
     */
    getPeriodoPorData(dataIso) {
        const periodosDatas = this.state.periodosDatas || {};
        const tipo = this.state.userConfig?.periodType || 'bimestre';
        const periodos = periodosDatas[tipo] || [];
        
        const index = periodos.findIndex(p => dataIso >= p.inicio && dataIso <= p.fim);
        return index !== -1 ? String(index + 1) : "1";
    },

    /**
     * Recupera as habilidades planejadas para o mês de uma data específica.
     * Útil para sugerir autocompletar no diário de classe.
     * @param {string} turmaId 
     * @param {string} dataIso 
     * @returns {HabilidadeBNCC[]} Lista de habilidades.
     */
    getSugestoesDoMes(turmaId, dataIso) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma?.planejamentoMensal) return [];

        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const mesIndex = parseInt(dataIso.split('-')[1]) - 1;
        
        return turma.planejamentoMensal[meses[mesIndex]] || [];
    },

    /**
     * Salva a configuração de slots de horários de um turno.
     * @param {string} turno - 'matutino' | 'vespertino' | 'noturno'.
     * @param {Array} slots - Array de objetos definindo horários.
     */
    saveHorarioConfig(turno, slots) {
        if (!this.state.horario) this.state.horario = { config: {}, grade: {} };
        this.state.horario.config[turno] = slots;
        
        this.saveLocal();
    },

    /**
     * Realiza uma busca global de habilidades na base da BNCC carregada em memória.
     * @param {string} termo - Texto ou código para busca.
     * @returns {HabilidadeBNCC[]} Lista de habilidades encontradas (limitada a 15).
     */
    buscarHabilidadesBNCC(termo) {
        if (!termo || termo.length < 3) return [];
        
        const normalizar = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const termoBusca = normalizar(termo);
        
        if (!window.bnccData) return [];
        
        return window.bnccData.filter(h =>
            normalizar(h.codigo).includes(termoBusca) ||
            normalizar(h.descricao).includes(termoBusca)
        ).slice(0, 15); // Limita a 15 resultados para performance
    },

    /**
     * Remove uma habilidade do planejamento mensal de forma definitiva.
     * @param {string} turmaId 
     * @param {string} mes 
     * @param {string} codigoHabilidade 
     */
    removeHabilidadeMensal(turmaId, mes, codigoHabilidade) {
        // 1. Busca a turma de forma segura
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        
        if (!turma || !turma.planejamentoMensal || !turma.planejamentoMensal[mes]) {
            console.warn("RemoveHabilidadeMensal: Turma ou mês não encontrados.");
            return;
        }

        // 2. Filtro rigoroso com higienização de strings
        const listaOriginal = turma.planejamentoMensal[mes];
        const novaLista = listaOriginal.filter(h => {
            const codExistente = String(h.codigo || "").trim();
            const codRemover = String(codigoHabilidade || "").trim();
            return codExistente !== codRemover;
        });

        // 3. Atualiza a referência no estado local
        turma.planejamentoMensal[mes] = novaLista;

        // 4. PERSISTÊNCIA COMPLETA
        this.saveLocal(); 
        
        if (this.currentUser && window.firebaseService) {
            window.firebaseService.saveTurma(this.currentUser.uid, turma);
        }
        
        console.log(`✅ Habilidade ${codigoHabilidade} removida com sucesso de ${mes}.`);
    }
};