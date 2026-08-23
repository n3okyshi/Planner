import { firebaseService } from '../firebase-service.js';
import { dataProxy } from '../services/dataProxy.js';

export const planejamentoMethods = {
    savePlanoDiario(data, turmaId, conteudo) {
        if (!data || !turmaId) return;
        if (!this.state.planosDiarios) this.state.planosDiarios = {};
        if (!this.state.planosDiarios[data]) this.state.planosDiarios[data] = {};
        this.state.planosDiarios[data][String(turmaId)] = conteudo;
        this.saveLocal();
        if (this.currentUser) {
            dataProxy.saveRoot(this.currentUser.uid, { planosDiarios: this.state.planosDiarios });
        }
    },
    getPlanoDiario(data, turmaId) {
        if (!this.state.planosDiarios || !data || !turmaId) return null;
        const planosDoDia = this.state.planosDiarios[data];
        if (!planosDoDia) return null;
        return planosDoDia[String(turmaId)] || planosDoDia[turmaId] || null;
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
                dataProxy.saveTurma(this.currentUser.uid, turma);
            }
        }
    },
    removeHabilidadePlanejamento(turmaId, periodoIdx, codigoHabilidade) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));

        if (!turma || !turma.planejamento || !Array.isArray(turma.planejamento[periodoIdx])) return;
        turma.planejamento[periodoIdx] = turma.planejamento[periodoIdx].filter(h => h.codigo !== codigoHabilidade);

        this.saveLocal();

        if (this.currentUser && firebaseService?.saveTurma) {
            dataProxy.saveTurma(this.currentUser.uid, turma);
        }
    },
    editarHabilidadePlanejamento(turmaId, periodoIdx, codigoOriginal, novaHabilidade) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma || !turma.planejamento) return false;

        const chavePeriodo = String(periodoIdx);
        if (!Array.isArray(turma.planejamento[chavePeriodo])) return false;

        const idx = turma.planejamento[chavePeriodo].findIndex(h => h.codigo === codigoOriginal);
        if (idx !== -1) {
            turma.planejamento[chavePeriodo][idx] = {
                ...turma.planejamento[chavePeriodo][idx],
                ...novaHabilidade
            };
            this.saveLocal();
            if (this.currentUser && firebaseService?.saveTurma) {
                dataProxy.saveTurma(this.currentUser.uid, turma);
            }
            return true;
        }
        return false;
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
                dataProxy.saveTurma(this.currentUser.uid, turma);
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
    getPeriodosDoMes(mesNome) {
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const mesIndex = meses.indexOf(mesNome);
        if (mesIndex === -1) return ["1"];

        const ano = new Date().getFullYear();
        const diasNoMes = new Date(ano, mesIndex + 1, 0).getDate();
        const periodosDatas = this.state.periodosDatas || {};
        const tipo = this.state.userConfig?.periodType || 'bimestre';
        const periodos = periodosDatas[tipo] || [];

        const periodosEncontrados = new Set();
        // Checa início, meio e fim do mês para identificar transições de bimestre
        const datasTeste = [
            `${ano}-${String(mesIndex + 1).padStart(2, '0')}-01`,
            `${ano}-${String(mesIndex + 1).padStart(2, '0')}-10`,
            `${ano}-${String(mesIndex + 1).padStart(2, '0')}-15`,
            `${ano}-${String(mesIndex + 1).padStart(2, '0')}-20`,
            `${ano}-${String(mesIndex + 1).padStart(2, '0')}-${String(diasNoMes).padStart(2, '0')}`
        ];

        datasTeste.forEach(d => {
            const pIdx = periodos.findIndex(p => d >= p.inicio && d <= p.fim);
            if (pIdx !== -1) {
                periodosEncontrados.add(String(pIdx + 1));
            }
        });

        if (periodosEncontrados.size === 0) return ["1"];
        return Array.from(periodosEncontrados).sort((a, b) => Number(a) - Number(b));
    },
    getSugestoesDoMes(turmaId, dataIso) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma?.planejamentoMensal) return [];
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const mesIndex = parseInt(dataIso.split('-')[1]) - 1;

        return turma.planejamentoMensal[meses[mesIndex]] || [];
    },
    getHabilidadesDoPeriodo(turmaId, dataIso) {
        const turma = (this.state.turmas || []).find(t => String(t.id) === String(turmaId));
        if (!turma || !turma.planejamento) return { periodoNum: "1", habilidades: [] };

        const periodoNum = this.getPeriodoPorData(dataIso) || "1";
        const habilidades = turma.planejamento[periodoNum] || turma.planejamento[Number(periodoNum)] || [];

        return {
            periodoNum,
            habilidades
        };
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
            dataProxy.saveTurma(this.currentUser.uid, turma);
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
            dataProxy.saveTurma(this.currentUser.uid, destino);
        }
        return true;
    },
    exportarPlanejamentoTurma(turmaId) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return null;

        const payload = {
            versao: '1.0',
            geradoEm: new Date().toISOString(),
            tipoPeriodo: this.state.userConfig?.periodType || 'bimestre',
            turmaInfo: {
                nome: turma.nome,
                nivel: turma.nivel,
                serie: turma.serie,
                identificador: turma.identificador
            },
            planejamento: turma.planejamento || {},
            planejamentoMensal: turma.planejamentoMensal || {}
        };

        const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
        const downloadAnchor = document.createElement('a');
        const nomeArquivo = `planejamento_${(turma.nome || 'turma').replace(/\s+/g, '_').toLowerCase()}_${new Date().getFullYear()}.json`;
        downloadAnchor.setAttribute("href", jsonString);
        downloadAnchor.setAttribute("download", nomeArquivo);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        return true;
    },
    importarPlanejamentoTurma(turmaId, dadosImportados) {
        const turma = this.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma || !dadosImportados || typeof dadosImportados !== 'object') return false;

        if (dadosImportados.planejamento) {
            turma.planejamento = JSON.parse(JSON.stringify(dadosImportados.planejamento));
        }
        if (dadosImportados.planejamentoMensal) {
            turma.planejamentoMensal = JSON.parse(JSON.stringify(dadosImportados.planejamentoMensal));
        }

        this.saveLocal();
        if (this.currentUser && firebaseService?.saveTurma) {
            dataProxy.saveTurma(this.currentUser.uid, turma);
        }
        return true;
    },
    replicarPlanoDiario(turmaOrigemId, dataOrigem, destinos, planoOverride = null) {
        const planoOrigem = planoOverride || this.getPlanoDiario(dataOrigem, turmaOrigemId);
        if (!planoOrigem || !Array.isArray(destinos) || destinos.length === 0) return 0;

        let sucesso = 0;
        if (!this.state.planosDiarios) this.state.planosDiarios = {};

        destinos.forEach(({ turmaId, data }) => {
            if (turmaId && data) {
                if (!this.state.planosDiarios[data]) this.state.planosDiarios[data] = {};
                this.state.planosDiarios[data][turmaId] = JSON.parse(JSON.stringify(planoOrigem));
                sucesso++;
            }
        });

        if (sucesso > 0) {
            this.saveLocal();
            if (this.currentUser) {
                dataProxy.saveRoot(this.currentUser.uid, { planosDiarios: this.state.planosDiarios });
            }
        }
        return sucesso;
    },
    // ---- Módulos de Gestão de PDI / PEI (Educação Inclusiva) ----
    savePdi(pdiData) {
        if (!pdiData || typeof pdiData !== 'object') return null;
        if (!Array.isArray(this.state.pdis)) this.state.pdis = [];
        
        let pdiItem;
        if (pdiData.id) {
            const idx = this.state.pdis.findIndex(p => String(p.id) === String(pdiData.id));
            if (idx !== -1) {
                pdiItem = { ...this.state.pdis[idx], ...pdiData, updatedAt: new Date().toISOString() };
                this.state.pdis[idx] = pdiItem;
            }
        }
        if (!pdiItem) {
            pdiItem = {
                id: 'pdi_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
                alunoId: pdiData.alunoId || '',
                alunoNome: pdiData.alunoNome || '',
                turmaId: pdiData.turmaId || '',
                turmaNome: pdiData.turmaNome || '',
                diagnostico: pdiData.diagnostico || '',
                habilidadesPrioritarias: pdiData.habilidadesPrioritarias || '',
                metasAprendizagem: pdiData.metasAprendizagem || '',
                adaptacoesMetodologicas: pdiData.adaptacoesMetodologicas || '',
                recursosAee: pdiData.recursosAee || '',
                parecerEvolutivo: pdiData.parecerEvolutivo || '',
                status: pdiData.status || 'ativo',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.state.pdis.unshift(pdiItem);
        }
        this.saveLocal();
        if (this.currentUser && firebaseService?.saveRoot) {
            dataProxy.saveRoot(this.currentUser.uid, { pdis: this.state.pdis });
        }
        return pdiItem;
    },
    getPdi(id) {
        if (!Array.isArray(this.state.pdis)) return null;
        return this.state.pdis.find(p => String(p.id) === String(id)) || null;
    },
    getPdisPorTurma(turmaId) {
        if (!Array.isArray(this.state.pdis)) return [];
        return this.state.pdis.filter(p => String(p.turmaId) === String(turmaId));
    },
    removePdi(id) {
        if (!Array.isArray(this.state.pdis)) return false;
        const countAntes = this.state.pdis.length;
        this.state.pdis = this.state.pdis.filter(p => String(p.id) !== String(id));
        if (this.state.pdis.length !== countAntes) {
            this.saveLocal();
            if (this.currentUser && firebaseService?.saveRoot) {
                dataProxy.saveRoot(this.currentUser.uid, { pdis: this.state.pdis });
            }
            return true;
        }
        return false;
    },
    // ---- Workflow de Validação de Planos pela Coordenação ----
    submeterPlanoValidacao(dataIso, turmaId, mensagemProf = '') {
        const plano = this.getPlanoDiario(dataIso, turmaId);
        if (!plano) return false;
        const planoObj = (typeof plano === 'string') ? { conteudo: plano } : { ...plano };
        planoObj.validacao = {
            status: 'enviado', // 'rascunho' | 'enviado' | 'aprovado' | 'com_ressalvas'
            enviadoEm: new Date().toISOString(),
            mensagemProf: mensagemProf || ''
        };
        this.savePlanoDiario(dataIso, turmaId, planoObj);
        return true;
    },
    avaliarPlanoValidacao(dataIso, turmaId, status, parecerCoordenador = '') {
        const plano = this.getPlanoDiario(dataIso, turmaId);
        if (!plano) return false;
        const planoObj = (typeof plano === 'string') ? { conteudo: plano } : { ...plano };
        if (!planoObj.validacao) planoObj.validacao = {};
        planoObj.validacao.status = status; // 'aprovado' | 'com_ressalvas' | 'rascunho'
        planoObj.validacao.parecerCoordenador = parecerCoordenador || '';
        planoObj.validacao.avaliadoEm = new Date().toISOString();
        this.savePlanoDiario(dataIso, turmaId, planoObj);
        return true;
    }
};