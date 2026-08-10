import { firebaseService } from '../firebase-service.js';
import { planejamentoService } from '../services/planejamentoService.js';
import { turmaService } from '../services/turmaService.js';

export const planejamentoMethods = {
    savePlanoDiario(data, turmaId, conteudo) {
        if (!this.state.planosDiarios) this.state.planosDiarios = {};
        if (!this.state.planosDiarios[data]) this.state.planosDiarios[data] = {};
        this.state.planosDiarios[data][turmaId] = conteudo;
        this.saveLocal();
    },
    getPlanoDiario(data, turmaId) {
        return this.state.planosDiarios?.[data]?.[turmaId] || null;
    },
    addHabilidadePlanejamento(turmaId, periodoIdx, habilidade) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        if (!turma.planejamento) turma.planejamento = {};

        const chavePeriodo = String(periodoIdx);
        if (!turma.planejamento[chavePeriodo]) turma.planejamento[chavePeriodo] = [];
        const jaExiste = turma.planejamento[chavePeriodo].some(h => h.codigo === habilidade.codigo);

        if (!jaExiste) {
            turma.planejamento[chavePeriodo].push(habilidade);

            console.log(`💾 Salvando habilidade ${habilidade.codigo} no período ${chavePeriodo}`);

            this.saveLocal();

            if (this.currentUser && firebaseService?.saveTurma) {
                planejamentoService.saveTurma(this.currentUser.uid, turma);
            }
        }
    },
    removeHabilidadePlanejamento(turmaId, periodoIdx, codigoHabilidade) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));

        if (!turma || !turma.planejamento || !Array.isArray(turma.planejamento[periodoIdx])) return;
        turma.planejamento[periodoIdx] = turma.planejamento[periodoIdx].filter(h => h.codigo !== codigoHabilidade);

        this.saveLocal();

        if (this.currentUser && firebaseService?.saveTurma) {
            planejamentoService.saveTurma(this.currentUser.uid, turma);
        }
    },
    addHabilidadeMensal(turmaId, mes, habilidade) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        if (!turma.planejamentoMensal) turma.planejamentoMensal = {};
        if (!turma.planejamentoMensal[mes]) turma.planejamentoMensal[mes] = [];
        const jaExiste = turma.planejamentoMensal[mes].some(h => h.codigo === habilidade.codigo);
        if (!jaExiste) {
            turma.planejamentoMensal[mes].push(habilidade);

            this.saveLocal();

            if (this.currentUser && firebaseService?.saveTurma) {
                planejamentoService.saveTurma(this.currentUser.uid, turma);
            }
        }
    },
    setEvento(data, tipo, descricao) {
        if (!tipo) {
            delete this.state.eventos[data];
        } else {
            this.state.eventos[data] = { tipo, descricao };
        }

        this.saveLocal();
    },
    getPeriodoPorData(dataIso) {
        const periodosDatas = this.state.periodosDatas || {};
        const tipo = this.state.userConfig?.periodType || 'bimestre';
        const periodos = periodosDatas[tipo] || [];

        const index = periodos.findIndex(p => dataIso >= p.inicio && dataIso <= p.fim);
        return index !== -1 ? String(index + 1) : "1";
    },
    getSugestoesDoMes(turmaId, dataIso) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma?.planejamentoMensal) return [];
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const mesIndex = parseInt(dataIso.split('-')[1]) - 1;

        return turma.planejamentoMensal[meses[mesIndex]] || [];
    },
    saveHorarioConfig(turno, slots) {
        if (!this.state.horario) this.state.horario = { config: {}, grade: {} };
        this.state.horario.config[turno] = slots;

        this.saveLocal();
    },
    buscarHabilidadesBNCC(termo) {
        if (!termo || termo.length < 3) return [];

        const normalizar = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const termoBusca = normalizar(termo);

        if (!window.bnccData) return [];

        return window.bnccData.filter(h =>
            normalizar(h.codigo).includes(termoBusca) ||
            normalizar(h.descricao).includes(termoBusca)
        ).slice(0, 15);
    },
    removeHabilidadeMensal(turmaId, mes, codigoHabilidade) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));

        if (!turma || !turma.planejamentoMensal || !turma.planejamentoMensal[mes]) {
            console.warn("RemoveHabilidadeMensal: Turma ou mês não encontrados.");
            return;
        }
        const listaOriginal = turma.planejamentoMensal[mes];
        const novaLista = listaOriginal.filter(h => {
            const codExistente = String(h.codigo || "").trim();
            const codRemover = String(codigoHabilidade || "").trim();
            return codExistente !== codRemover;
        });
        turma.planejamentoMensal[mes] = novaLista;
        this.saveLocal();

        if (this.currentUser && firebaseService?.saveTurma) {
            planejamentoService.saveTurma(this.currentUser.uid, turma);
        }

        console.log(`✅ Habilidade ${codigoHabilidade} removida com sucesso de ${mes}.`);
    },
    copiarPlanejamentoEntreTurmas(idOrigem, idDestino) {
        const origem = this.state.turmas.find(t => String(t.id) === String(idOrigem));
        const destino = this.state.turmas.find(t => String(t.id) === String(idDestino));
        if (!origem || !destino) return false;

        destino.planejamento = JSON.parse(JSON.stringify(origem.planejamento || {}));
        destino.planejamentoMensal = JSON.parse(JSON.stringify(origem.planejamentoMensal || {}));
        this.saveLocal();

        if (this.currentUser && firebaseService?.saveTurma) {
            planejamentoService.saveTurma(this.currentUser.uid, destino);
        }
        return true;
    }
};