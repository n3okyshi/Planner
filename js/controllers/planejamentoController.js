
import { model } from '../model.js';
import { controller } from '../controller.js';
import { diarioView } from '../views/diario.js';
import { bnccView } from '../views/bncc.js';
import { mensalView } from '../views/mensal.js';
import { planejamentoView } from '../views/planejamento.js';
import { Toast } from '../components/toast.js';
import { debounce } from '../utils.js';
import { EventDelegator } from '../utils/eventDelegator.js';

export const planejamentoController = {
    initDiarioAutosave() {
        const inputs = document.querySelectorAll('.autosave-input');
        if (inputs.length === 0) return;
        const autoSalvar = debounce(() => {
            this.salvarDiario(true);
        }, 2000);
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                const statusEl = document.getElementById('status-salvamento');
                if (statusEl) statusEl.innerText = 'Digitando...';
                autoSalvar();
            });
        });
    },
    mudarTurmaDiario(novoId) {
        if (diarioView) {
            if (diarioView.selecionarTurma) {
                diarioView.selecionarTurma(novoId);
            } else {
                diarioView.currentTurmaId = novoId;
                diarioView.render('view-container');
            }
        }
    },
    abrirModalCopiarPlanejamento(turmaIdAtual) {
        const turmaAtual = model.state.turmas.find(t => String(t.id) === String(turmaIdAtual));
        if (!turmaAtual) return;
        const outrasTurmas = model.state.turmas.filter(t => String(t.id) !== String(turmaIdAtual));
        if (outrasTurmas.length === 0) {
            Toast.show("Você não possui outras turmas cadastradas.", "warning");
            return;
        }
        const optionsHtml = outrasTurmas.map(t => {
            const isMesmaSerie = t.serie === turmaAtual.serie;
            const destaque = isMesmaSerie ? 'dropdown-item--selected' : '';
            const nomeEsc = window.escapeHTML ? window.escapeHTML(t.nome) : t.nome;
            return `<li class="dropdown-item ${destaque}" data-value="${window.escapeHTML(t.id)}">${nomeEsc} ${isMesmaSerie ? '(Mesma Série)' : ''}</li>`;
        }).join('');
        controller.openModal('Replicar Planejamento', `
    <div id="modal-copiar-plan-wrap" style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
        <div class="alert alert--info">
            <p><i class="fas fa-info-circle"></i> Copiando de <strong>${window.escapeHTML ? window.escapeHTML(turmaAtual.nome) : turmaAtual.nome}</strong>.</p>
        </div>
        <div>
            <label class="form-label">Para a Turma</label>
            <div class="custom-dropdown">
                <input type="hidden" id="select-turma-destino" value="${outrasTurmas[0]?.id || ''}">
                <button type="button" class="dropdown-button">
                    <span class="dropdown-label">${outrasTurmas[0] ? (window.escapeHTML ? window.escapeHTML(outrasTurmas[0].nome) : outrasTurmas[0].nome) : 'Selecione...'}</span>
                    <i class="fas fa-chevron-down text-slate-400 text-xs ml-2"></i>
                </button>
                <ul class="dropdown-menu hidden">
                    ${optionsHtml}
                </ul>
            </div>
        </div>
        <div class="alert alert--danger mt-2">
            <i class="fas fa-exclamation-triangle"></i> Substituirá todo o planejamento da turma destino.
        </div>
        <button type="button" data-action="confirmar-copia-planejamento" data-id="${window.escapeHTML(turmaIdAtual)}" class="btn-primary" style="width: 100%; justify-content: center; padding: 0.875rem; margin-top: var(--spacing-2);">Confirmar Cópia</button>
    </div>
`);
        const modalWrap = document.getElementById('modal-copiar-plan-wrap');
        if (modalWrap) {
            EventDelegator.bind(modalWrap, {
                'confirmar-copia-planejamento': (e, target) => {
                    const idOrigem = target.getAttribute('data-id');
                    if (idOrigem) this.confirmarCopiaPlanejamento(idOrigem);
                }
            }, 'click');
        }
    },
    confirmarCopiaPlanejamento(idOrigem) {
        const idDestino = document.getElementById('select-turma-destino')?.value;
        if (idOrigem && idDestino) {
            controller.confirmarAcao("Tem certeza?", "O planejamento da turma de destino será substituído.", () => {
                const sucesso = model.copiarPlanejamentoEntreTurmas(idOrigem, idDestino);
                if (sucesso) {
                    controller.closeModal();
                    Toast.show("Planejamento copiado!", "success");
                } else {
                    Toast.show("Erro ao copiar.", "error");
                }
            });
        }
    },
    openSeletorBncc(turmaId, periodoIdx, nivelHtml, serieHtml) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        const callback = (habilidade) => {
            model.addHabilidadePlanejamento(turmaId, String(periodoIdx), habilidade);
            if (planejamentoView) planejamentoView.render('view-container');
        };
        controller.openModal(`BNCC - ${periodoIdx}º Período (${turma.nome})`,
            `<div id="modal-bncc-planejamento" style="width: 100%; max-height: 80vh; overflow-y: auto; padding: var(--spacing-4);"><div class="spinner-container"><i class="fas fa-spinner spinner-icon"></i></div></div>`,
            'xl'
        );
        setTimeout(() => {
            if (bnccView) bnccView.render('modal-bncc-planejamento', turma.nivel || nivelHtml, turma.serie || serieHtml, callback);
        }, 100);
    },
    removeHabilidade(turmaId, periodoIdx, codigoHabilidade) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma || !turma.planejamento || !turma.planejamento[periodoIdx]) return;
        const habilidadeRemovida = turma.planejamento[periodoIdx].find(h => h.codigo === codigoHabilidade);
        model.removeHabilidadePlanejamento(turmaId, periodoIdx, codigoHabilidade);
        if (planejamentoView) planejamentoView.render('view-container');
        if (habilidadeRemovida) {
            Toast.show(`Habilidade removida.`, 'info', 4000, {
                label: 'DESFAZER',
                callback: () => {
                    model.addHabilidadePlanejamento(turmaId, periodoIdx, habilidadeRemovida);
                    if (planejamentoView) planejamentoView.render('view-container');
                }
            });
        }
    },
    openSeletorBnccMensal(turmaId, mes, nivelHtml, serieHtml) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        const callback = (habilidade) => {
            model.addHabilidadeMensal(turmaId, mes, habilidade);
            if (mensalView) mensalView.render();
        };
        controller.openModal(`BNCC - ${mes} (${turma.nome})`, '<div id="modal-bncc-container" style="width: 100%; max-height: 80vh; overflow-y: auto; padding: var(--spacing-4);"></div>', 'xl');
        setTimeout(() => {
            if (bnccView) bnccView.render('modal-bncc-container', turma.nivel || nivelHtml, turma.serie || serieHtml, callback);
        }, 50);
    },
    openSeletorBnccDiario(turmaId) {
        const turmas = model.state.turmas || [];
        const turma = turmas.find(t => String(t.id) === String(turmaId)) || turmas[0];
        const callback = (habilidade) => {
            const campoBncc = document.getElementById('plan-bncc');
            if (campoBncc) {
                const textoAtual = campoBncc.value.trim();
                const novoItem = `(${habilidade.codigo}) ${habilidade.descricao}`;
                if (textoAtual) {
                    campoBncc.value = `${textoAtual}\n\n${novoItem}`;
                } else {
                    campoBncc.value = novoItem;
                }
                campoBncc.dispatchEvent(new Event('input', { bubbles: true }));
                campoBncc.dispatchEvent(new Event('change', { bubbles: true }));
                Toast.show(`Habilidade ${habilidade.codigo} anexada ao diário!`, 'success');
            }
            if (controller && controller.closeModal) {
                controller.closeModal();
            }
        };
        const nomeTurma = turma ? turma.nome : 'Geral';
        const nivel = turma ? turma.nivel : null;
        const serie = turma ? turma.serie : null;

        controller.openModal(`Consultar BNCC - ${nomeTurma}`, '<div id="modal-bncc-diario" style="width: 100%; max-height: 80vh; overflow-y: auto; padding: var(--spacing-4);"></div>', 'xl');
        setTimeout(() => {
            if (bnccView) bnccView.render('modal-bncc-diario', nivel, serie, callback);
        }, 50);
    },
    removeHabilidadeMensal(turmaId, mes, codigo) {
        controller.confirmarAcao("Remover?", "Deseja remover esta habilidade do mês?", () => {
            model.removeHabilidadeMensal(turmaId, mes, codigo);
            if (mensalView) {
                mensalView.render();
            }
            if (window.Toast) window.Toast.show("Habilidade removida do planejamento mensal.", "info");
        });
    },

    openModalCriarHabilidadePersonalizada(turmaId, periodoIdx, habilidadeExistente = null) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;

        const isEdit = !!habilidadeExistente;
        const codVal = habilidadeExistente?.codigo || '';
        const discVal = habilidadeExistente?.componente || habilidadeExistente?.disciplina || turma.disciplina || 'Geral';
        const eixoVal = habilidadeExistente?.unidadeTematica || habilidadeExistente?.objeto || habilidadeExistente?.eixo || '';
        const descVal = habilidadeExistente?.descricao || '';
        const codOriginal = habilidadeExistente?.codigo || '';

        const listaDisciplinas = [
            'Língua Portuguesa', 'Matemática', 'Ciências', 'História', 'Geografia', 
            'Arte', 'Educação Física', 'Língua Inglesa', 'Ensino Religioso', 
            'Biologia', 'Física', 'Química', 'Filosofia', 'Sociologia', 
            'Robótica & Maker', 'Projeto de Vida', 'Educação Financeira', 'Geral'
        ];

        const optionsDisc = listaDisciplinas.map(d => `
            <option value="${d}" ${d.toLowerCase() === discVal.toLowerCase() ? 'selected' : ''}>${d}</option>
        `).join('');

        controller.openModal(`${isEdit ? 'Editar Habilidade Personalizada' : 'Nova Habilidade Personalizada'} - ${periodoIdx}º Período`, `
            <div id="modal-hab-custom-wrap" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; max-width: 560px;">
                <div class="alert alert--info" style="font-size: 0.8125rem;">
                    <i class="fas fa-info-circle mr-1"></i> Cadastre ou edite objetivos curriculares municipais, institucionais ou tópicos próprios fora da base BNCC.
                </div>

                <div style="grid-template-columns: 1fr 1fr; gap: 0.75rem; display: grid;">
                    <div>
                        <label class="form-label" style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase;">Código / Identificador</label>
                        <input type="text" id="hab-custom-codigo" class="form-input" value="${window.escapeHTML(codVal)}" placeholder="Ex: HAB-MAT-01 ou CURR-04" style="width: 100%; text-transform: uppercase; font-weight: 800;">
                    </div>
                    <div>
                        <label class="form-label" style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase;">Disciplina / Componente</label>
                        <select id="hab-custom-disciplina" class="form-input" style="width: 100%; font-weight: 700;">
                            ${optionsDisc}
                        </select>
                    </div>
                </div>

                <div>
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase;">Unidade Temática / Eixo Temático</label>
                    <input type="text" id="hab-custom-eixo" class="form-input" value="${window.escapeHTML(eixoVal)}" placeholder="Ex: Educação Financeira / Robótica / Produção Textual" style="width: 100%; font-weight: 600;">
                </div>

                <div>
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase;">Descrição Detalhada do Objetivo / Habilidade</label>
                    <textarea id="hab-custom-desc" class="form-input" rows="4" placeholder="Descreva claramente o que o estudante deve aprender ou desenvolver..." style="width: 100%; resize: vertical; font-weight: 500;">${window.escapeHTML(descVal)}</textarea>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem;">
                    <button type="button" data-action="fechar-modal" class="btn-secondary">Cancelar</button>
                    <button type="button" data-action="salvar-habilidade-custom" data-turma-id="${turmaId}" data-periodo="${periodoIdx}" data-cod="${codOriginal}" class="btn-primary" style="background-color: #7c3aed;">
                        <i class="fas fa-check mr-1"></i> ${isEdit ? 'Salvar Alterações' : 'Adicionar ao Planejamento'}
                    </button>
                </div>
            </div>
        `);

        const modalHabWrap = document.getElementById('modal-hab-custom-wrap');
        if (modalHabWrap) {
            EventDelegator.bind(modalHabWrap, {
                'fechar-modal': () => controller.closeModal(),
                'salvar-habilidade-custom': (e, target) => {
                    const tId = target.getAttribute('data-turma-id');
                    const pIdx = parseInt(target.getAttribute('data-periodo'), 10);
                    const cOrig = target.getAttribute('data-cod') || '';
                    this.salvarHabilidadePersonalizada(tId, pIdx, cOrig);
                }
            }, 'click');
        }
    },

    openModalEditarHabilidadePersonalizada(turmaId, periodoIdx, codigoHabilidade) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma || !turma.planejamento) return;

        const habsPeriodo = turma.planejamento[periodoIdx] || [];
        const habExistente = habsPeriodo.find(h => (h.codigo || '').toUpperCase() === (codigoHabilidade || '').toUpperCase());

        if (!habExistente) {
            Toast.show("Habilidade não encontrada para edição.", "error");
            return;
        }

        this.openModalCriarHabilidadePersonalizada(turmaId, periodoIdx, habExistente);
    },

    salvarHabilidadePersonalizada(turmaId, periodoIdx, codigoOriginal = '') {
        const cod = document.getElementById('hab-custom-codigo')?.value.trim().toUpperCase();
        const disc = document.getElementById('hab-custom-disciplina')?.value;
        const eixo = document.getElementById('hab-custom-eixo')?.value.trim();
        const desc = document.getElementById('hab-custom-desc')?.value.trim();

        if (!cod) {
            return Toast.show("Por favor, informe um código ou identificador para a habilidade.", "warning");
        }
        if (!desc) {
            return Toast.show("Por favor, informe a descrição detalhada do objetivo de aprendizagem.", "warning");
        }

        const habObj = {
            codigo: cod,
            descricao: desc,
            disciplina: disc,
            componente: disc,
            unidadeTematica: eixo || 'Conteúdo Institucional / Específico',
            objeto: eixo || 'Conteúdo Institucional / Específico',
            eixo: eixo || 'Conteúdo Institucional / Específico',
            personalizada: true,
            criadaEm: new Date().toISOString()
        };

        const sucesso = model.adicionarHabilidadePersonalizada(turmaId, periodoIdx, habObj, codigoOriginal);
        if (sucesso) {
            controller.closeModal();
            if (planejamentoView && typeof planejamentoView.render === 'function') {
                planejamentoView.render('view-container');
            }
        }
    },

    exportarBimestralizacao(turmaId) {
        const sucesso = model.exportarPlanejamentoTurma(turmaId);
        if (sucesso) {
            Toast.show("Arquivo de planejamento exportado com sucesso!", "success");
        } else {
            Toast.show("Não foi possível exportar o planejamento.", "error");
        }
    },

    abrirModalImportarBimestralizacao(turmaId) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;

        controller.openModal(`Importar Bimestralização (JSON)`, `
            <div id="modal-importar-bimest-wrap" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; max-width: 520px;">
                <div class="alert alert--info" style="font-size: 0.8125rem;">
                    <i class="fas fa-file-import mr-1"></i> Selecione um arquivo <strong>.json</strong> de bimestralização exportado anteriormente do Planner Pro.
                </div>

                <div style="border: 2px dashed var(--color-slate-300); border-radius: var(--radius-xl); padding: 2rem 1.5rem; text-align: center; background-color: var(--color-slate-50);">
                    <i class="fas fa-cloud-upload-alt text-3xl text-indigo-500" style="margin-bottom: 0.75rem;"></i>
                    <p style="font-size: 0.875rem; font-weight: 700; color: var(--color-slate-700); margin-bottom: 0.5rem;">Escolha o arquivo JSON</p>
                    <input type="file" id="input-json-bimestralizacao" accept=".json" style="font-size: 0.8125rem;">
                </div>

                <div class="alert alert--danger" style="font-size: 0.75rem;">
                    <i class="fas fa-exclamation-triangle mr-1"></i> A importação substituirá o planejamento periódico atual da turma <strong>${window.escapeHTML(turma.nome)}</strong>.
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                    <button type="button" data-action="fechar-modal" class="btn-secondary">Cancelar</button>
                    <button type="button" data-action="processar-importacao-bimest" data-turma-id="${turmaId}" class="btn-primary">
                        <i class="fas fa-check mr-1"></i> Importar e Aplicar
                    </button>
                </div>
            </div>
        `);

        const modalBimestWrap = document.getElementById('modal-importar-bimest-wrap');
        if (modalBimestWrap) {
            EventDelegator.bind(modalBimestWrap, {
                'fechar-modal': () => controller.closeModal(),
                'processar-importacao-bimest': (e, target) => {
                    const tId = target.getAttribute('data-turma-id');
                    if (tId) this.processarImportacaoBimestralizacao(tId);
                }
            }, 'click');
        }
    },

    processarImportacaoBimestralizacao(turmaId) {
        const fileInput = document.getElementById('input-json-bimestralizacao');
        const file = fileInput?.files?.[0];

        if (!file) {
            return Toast.show("Selecione um arquivo .json para importar.", "warning");
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const dados = JSON.parse(e.target.result);
                const sucesso = model.importarPlanejamentoTurma(turmaId, dados);
                if (sucesso) {
                    controller.closeModal();
                    Toast.show("Bimestralização importada com sucesso!", "success");
                    if (planejamentoView) {
                        planejamentoView.render('view-container');
                    }
                } else {
                    Toast.show("Formato de arquivo inválido para bimestralização.", "error");
                }
            } catch (err) {
                console.error("Erro ao analisar JSON:", err);
                Toast.show("Erro ao ler arquivo JSON. Verifique a integridade.", "error");
            }
        };
        reader.readAsText(file);
    },

    salvarDiario(silent = false) {
        const dataEl = document.getElementById('diario-data');
        const turmaEl = document.getElementById('select-turma-global') || document.getElementById('diario-turma');
        const turmaId = turmaEl?.value || diarioView?.currentTurmaId;
        const data = dataEl?.value || diarioView?.currentDate || new Date().toISOString().split('T')[0];

        if (!data || !turmaId) {
            if (!silent && typeof Toast !== 'undefined') Toast.show("Selecione uma data e uma turma!", "warning");
            return false;
        }

        const conteudo = {
            tema: document.getElementById('plan-tema')?.value || '',
            bncc: document.getElementById('plan-bncc')?.value || '',
            objetivos: document.getElementById('plan-objetivos')?.value || '',
            recursos: document.getElementById('plan-recursos')?.value || '',
            metodologia: document.getElementById('plan-metodologia')?.value || '',
            avaliacao: document.getElementById('plan-avaliacao')?.value || ''
        };

        model.savePlanoDiario(data, turmaId, conteudo);
        if (silent) {
            const statusEl = document.getElementById('status-salvamento');
            if (statusEl) statusEl.innerHTML = '<i class="fas fa-check text-green-500"></i> Salvo';
        } else {
            if (typeof Toast !== 'undefined') Toast.show("Planejamento salvo com sucesso!", 'success');
        }
        return true;
    },
    mudarDataDiario(novaData) {
        if (diarioView) {
            if (controller?.currentView === 'dia' && diarioView.selecionarData) {
                diarioView.selecionarData(novaData);
            } else {
                diarioView.currentDate = novaData;
                const [ano, mes] = novaData.split('-');
                diarioView.viewDate = new Date(parseInt(ano), parseInt(mes) - 1, 1);
                controller.navigate('dia');
            }
        }
    },
    mudarMesDiario(delta) {
        if (diarioView) {
            if (controller?.currentView === 'dia' && diarioView.mudarMes) {
                diarioView.mudarMes(delta);
            } else {
                const novaData = new Date(diarioView.viewDate);
                novaData.setMonth(novaData.getMonth() + delta);
                diarioView.viewDate = novaData;
                controller.navigate('dia');
            }
        }
    },
    abrirModalReplicarPlanoDiario(dataAtual, turmaOrigemId) {
        this.salvarDiario(true);

        dataAtual = dataAtual || (diarioView && (diarioView.currentDate || diarioView.currentData)) || new Date().toISOString().split('T')[0];
        turmaOrigemId = turmaOrigemId || (diarioView && diarioView.currentTurmaId) || (model.state.turmas?.[0]?.id);

        const turmas = model.state.turmas || [];
        const turmaOrigem = turmas.find(t => String(t.id) === String(turmaOrigemId));
        if (!turmaOrigem) {
            return Toast.show("Selecione a turma de origem.", "warning");
        }

        const planoOrigem = model.getPlanoDiario(dataAtual, turmaOrigemId);
        const temConteudo = planoOrigem && (
            (planoOrigem.tema && planoOrigem.tema.trim()) ||
            (planoOrigem.bncc && planoOrigem.bncc.trim()) ||
            (planoOrigem.objetivos && planoOrigem.objetivos.trim()) ||
            (planoOrigem.metodologia && planoOrigem.metodologia.trim())
        );

        if (!temConteudo) {
            return Toast.show("O plano de aula desta data está vazio. Preencha o plano antes de replicar.", "warning");
        }

        const turmasMesmaSerie = turmas.filter(t => 
            String(t.id) !== String(turmaOrigemId) && 
            t.serie && turmaOrigem.serie && 
            t.serie.trim().toLowerCase() === turmaOrigem.serie.trim().toLowerCase()
        );

        let linhasIniciaisHtml = '';
        if (turmasMesmaSerie.length > 0) {
            linhasIniciaisHtml = turmasMesmaSerie.map(t => this.gerarHtmlLinhaDestino(t.id, dataAtual, turmaOrigemId)).join('');
        } else {
            const outraTurma = turmas.find(t => String(t.id) !== String(turmaOrigemId)) || turmaOrigem;
            linhasIniciaisHtml = this.gerarHtmlLinhaDestino(outraTurma.id, dataAtual, turmaOrigemId);
        }

        const dataFmt = dataAtual.split('-').reverse().join('/');
        const temaSafe = window.escapeHTML(planoOrigem.tema || 'Plano de Aula');

        window.controller.openModal(`Replicar Plano de Aula Diário`, `
            <div id="modal-replicar-plano-wrap" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; max-width: 680px;">
                <div class="card" style="padding: 1rem 1.25rem; background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%); border: 1px solid #dbeafe; border-radius: var(--radius-xl);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
                        <div>
                            <span class="badge" style="background: #e0e7ff; color: #4338ca; font-weight: 800; margin-bottom: 0.35rem;">
                                <i class="far fa-calendar mr-1"></i> ${dataFmt} • ${window.escapeHTML(turmaOrigem.nome)} (${window.escapeHTML(turmaOrigem.serie || 'Série')})
                            </span>
                            <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--color-slate-800); margin: 0.25rem 0;">
                                ${temaSafe}
                            </h4>
                        </div>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <label style="font-size: 0.875rem; font-weight: 800; color: var(--color-slate-700);">
                        Destinos de Replicação (Turmas e Datas)
                    </label>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button type="button" data-action="adicionar-todas-serie" data-origem="${turmaOrigemId}" data-data="${dataAtual}" class="btn-secondary" style="padding: 0.375rem 0.75rem; font-size: 0.75rem;" title="Adicionar todas as turmas compatíveis da mesma série">
                            <i class="fas fa-layer-group mr-1"></i> Todas da Série
                        </button>
                        <button type="button" data-action="adicionar-proxima-semana" class="btn-secondary" style="padding: 0.375rem 0.75rem; font-size: 0.75rem;" title="Duplicar destinos para a próxima semana (+7 dias)">
                            <i class="fas fa-calendar-plus mr-1"></i> +7 Dias
                        </button>
                        <button type="button" data-action="adicionar-linha-destino" data-origem="${turmaOrigemId}" data-data="${dataAtual}" class="btn-primary" style="padding: 0.375rem 0.75rem; font-size: 0.75rem; background: #4f46e5;">
                            <i class="fas fa-plus mr-1"></i> + Mais Data/Turma
                        </button>
                    </div>
                </div>

                <div id="container-destinos-replicacao" style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 320px; overflow-y: auto; padding-right: 0.25rem;" class="custom-scrollbar">
                    ${linhasIniciaisHtml}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-slate-100); padding-top: 1rem; margin-top: 0.5rem;">
                    <button type="button" data-action="fechar-modal" class="btn-secondary">
                        Cancelar
                    </button>
                    <button type="button" data-action="confirmar-replicacao-plano" data-origem="${turmaOrigemId}" data-data="${dataAtual}" class="btn-primary" style="padding: 0.625rem 1.5rem; font-weight: 800;">
                        <i class="fas fa-check mr-1"></i> Confirmar Replicação
                    </button>
                </div>
            </div>
        `, 'medium');

        const modalReplicarWrap = document.getElementById('modal-replicar-plano-wrap');
        if (modalReplicarWrap) {
            EventDelegator.bind(modalReplicarWrap, {
                'fechar-modal': () => window.controller.closeModal(),
                'adicionar-todas-serie': (e, target) => {
                    const tOrigem = target.getAttribute('data-origem');
                    const dt = target.getAttribute('data-data');
                    this.adicionarTodasDaSerieReplicacao(tOrigem, dt);
                },
                'adicionar-proxima-semana': () => this.adicionarProximaSemanaReplicacao(),
                'adicionar-linha-destino': (e, target) => {
                    const tOrigem = target.getAttribute('data-origem');
                    const dt = target.getAttribute('data-data');
                    this.adicionarLinhaDestinoReplicacao('', dt, tOrigem);
                },
                'remover-linha-destino': (e, target) => {
                    this.removerLinhaDestinoReplicacao(target);
                },
                'confirmar-replicacao-plano': (e, target) => {
                    const tOrigem = target.getAttribute('data-origem');
                    const dt = target.getAttribute('data-data');
                    this.confirmarReplicacaoPlanoDiario(dt, tOrigem);
                }
            }, 'click');
        }
    },

    gerarHtmlLinhaDestino(turmaSelecionadaId, data, turmaOrigemId) {
        const turmas = model.state.turmas || [];
        const opcoesTurmas = turmas.map(t => {
            const isSelected = String(t.id) === String(turmaSelecionadaId) ? 'selected' : '';
            const isOrigem = String(t.id) === String(turmaOrigemId) ? ' (Atual)' : '';
            return `<option value="${t.id}" ${isSelected}>${window.escapeHTML(t.nome)} (${window.escapeHTML(t.serie || 'Série')})${isOrigem}</option>`;
        }).join('');

        return `
            <div class="linha-destino-replicacao card animate-enter" style="padding: 0.75rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; background: var(--color-white); border: 1px solid var(--color-slate-200); border-radius: var(--radius-xl); box-shadow: var(--shadow-sm);">
                <div style="flex: 1.3; min-width: 140px;">
                    <label style="font-size: 0.6875rem; font-weight: 700; color: var(--color-slate-500); display: block; margin-bottom: 0.25rem;">Turma Destino</label>
                    <select class="form-select select-destino-turma" style="padding: 0.375rem 0.5rem; font-size: 0.8125rem; font-weight: 600; width: 100%;">
                        ${opcoesTurmas}
                    </select>
                </div>
                <div style="flex: 1; min-width: 130px;">
                    <label style="font-size: 0.6875rem; font-weight: 700; color: var(--color-slate-500); display: block; margin-bottom: 0.25rem;">Data da Aula</label>
                    <input type="date" class="form-input input-destino-data" value="${data}" style="padding: 0.375rem 0.5rem; font-size: 0.8125rem; font-weight: 600; width: 100%;">
                </div>
                <div style="display: flex; align-items: flex-end; padding-top: 1.125rem;">
                    <button type="button" data-action="remover-linha-destino" class="btn-icon" style="width: 2rem; height: 2rem; color: #ef4444; border-radius: var(--radius-md);" title="Remover este destino">
                        <i class="fas fa-trash-alt" style="font-size: 0.875rem;"></i>
                    </button>
                </div>
            </div>
        `;
    },

    adicionarLinhaDestinoReplicacao(turmaPadraoId = '', dataPadrao = '', turmaOrigemId = '') {
        const container = document.getElementById('container-destinos-replicacao');
        if (!container) return;

        const turmas = model.state.turmas || [];
        if (!turmaPadraoId && turmas.length > 0) {
            turmaPadraoId = turmas[0].id;
        }
        if (!dataPadrao) {
            dataPadrao = new Date().toISOString().split('T')[0];
        }

        const div = document.createElement('div');
        div.innerHTML = this.gerarHtmlLinhaDestino(turmaPadraoId, dataPadrao, turmaOrigemId);
        container.appendChild(div.firstElementChild);
        container.scrollTop = container.scrollHeight;
    },

    removerLinhaDestinoReplicacao(btn) {
        const linha = btn.closest('.linha-destino-replicacao');
        const container = document.getElementById('container-destinos-replicacao');
        if (linha && container) {
            const totalLinhas = container.querySelectorAll('.linha-destino-replicacao').length;
            if (totalLinhas <= 1) {
                return Toast.show("Mantenha ao menos um destino para replicação.", "info");
            }
            linha.remove();
        }
    },

    adicionarTodasDaSerieReplicacao(turmaOrigemId, dataAtual) {
        const container = document.getElementById('container-destinos-replicacao');
        if (!container) return;

        const turmas = model.state.turmas || [];
        const turmaOrigem = turmas.find(t => String(t.id) === String(turmaOrigemId));
        if (!turmaOrigem || !turmaOrigem.serie) {
            return Toast.show("Turma de origem não possui série definida.", "warning");
        }

        const compativeis = turmas.filter(t => 
            String(t.id) !== String(turmaOrigemId) && 
            t.serie && t.serie.trim().toLowerCase() === turmaOrigem.serie.trim().toLowerCase()
        );

        if (compativeis.length === 0) {
            return Toast.show(`Não há outras turmas cadastradas na mesma série (${turmaOrigem.serie}).`, "info");
        }

        compativeis.forEach(t => {
            this.adicionarLinhaDestinoReplicacao(t.id, dataAtual, turmaOrigemId);
        });
        Toast.show(`${compativeis.length} turma(s) adicionada(s)!`, "success");
    },

    adicionarProximaSemanaReplicacao() {
        const container = document.getElementById('container-destinos-replicacao');
        if (!container) return;

        const linhasAtuais = container.querySelectorAll('.linha-destino-replicacao');
        if (linhasAtuais.length === 0) return;

        let adicionadas = 0;
        linhasAtuais.forEach(linha => {
            const turmaId = linha.querySelector('.select-destino-turma')?.value;
            const dataInput = linha.querySelector('.input-destino-data')?.value;
            if (turmaId && dataInput) {
                const dt = new Date(dataInput + 'T12:00:00');
                dt.setDate(dt.getDate() + 7);
                const proxData = dt.toISOString().split('T')[0];
                this.adicionarLinhaDestinoReplicacao(turmaId, proxData);
                adicionadas++;
            }
        });

        if (adicionadas > 0) {
            Toast.show(`+${adicionadas} destino(s) adicionados para a próxima semana!`, "success");
        }
    },

    confirmarReplicacaoPlanoDiario(dataOrigem, turmaOrigemId) {
        const container = document.getElementById('container-destinos-replicacao');
        if (!container) return;

        const linhas = container.querySelectorAll('.linha-destino-replicacao');
        if (linhas.length === 0) {
            return Toast.show("Adicione ao menos um destino.", "warning");
        }

        const destinos = [];
        const chavesUnicas = new Set();

        linhas.forEach(linha => {
            const turmaId = linha.querySelector('.select-destino-turma')?.value;
            const data = linha.querySelector('.input-destino-data')?.value;
            if (turmaId && data) {
                const chave = `${data}_${turmaId}`;
                if (!chavesUnicas.has(chave)) {
                    chavesUnicas.add(chave);
                    destinos.push({ turmaId, data });
                }
            }
        });

        if (destinos.length === 0) {
            return Toast.show("Verifique os campos de turma e data dos destinos.", "warning");
        }

        const total = model.replicarPlanoDiario(turmaOrigemId, dataOrigem, destinos);
        if (total > 0) {
            controller.closeModal();
            Toast.show(`Plano diário replicado para ${total} destino${total > 1 ? 's' : ''} com sucesso!`, "success");
            
            if (controller && controller.currentView === 'dia' && diarioView) {
                diarioView.render('view-container');
            }
        } else {
            Toast.show("Não foi possível replicar o plano.", "error");
        }
    }
};

if (typeof window !== 'undefined') {
    window.planejamentoController = planejamentoController;
}