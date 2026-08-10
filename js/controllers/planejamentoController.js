
import { model } from '../model.js';
import { diarioView } from '../views/diario.js';
import { bnccView } from '../views/bncc.js';
import { mensalView } from '../views/mensal.js';
import { planejamentoView } from '../views/planejamento.js';
import { Toast } from '../components/toast.js';
import { debounce } from '../utils.js';
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
    salvarDiario(silent = false) {
        const dataEl = document.getElementById('diario-data');
        const turmaEl = document.getElementById('diario-turma');
        if (!dataEl || !turmaEl) return;
        const data = dataEl.value;
        const turmaId = turmaEl.value;
        if (!data || !turmaId) {
            if (!silent) Toast.show("Selecione uma data e uma turma!", "warning");
            return;
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
            Toast.show("Planejamento salvo com sucesso!", 'success');
        }
    },
    mudarDataDiario(novaData) {
        if (window.diarioView) {
            window.diarioView.currentDate = novaData;
            const [ano, mes] = novaData.split('-');
            window.diarioView.viewDate = new Date(parseInt(ano), parseInt(mes) - 1, 1);
            window.controller.navigate('dia');
        }
    },
    mudarMesDiario(delta) {
        if (window.diarioView) {
            const novaData = new Date(window.diarioView.viewDate);
            novaData.setMonth(novaData.getMonth() + delta);
            window.diarioView.viewDate = novaData;
            window.controller.navigate('dia');
        }
    },
    mudarTurmaDiario(novoId) {
        if (window.diarioView) {
            window.diarioView.currentTurmaId = novoId;
            window.controller.navigate('dia');
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
        window.controller.openModal('Replicar Planejamento', `
    <div style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
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
        <button onclick="planejamentoController.confirmarCopiaPlanejamento('${window.escapeHTML(turmaIdAtual)}')" class="btn-primary" style="width: 100%; justify-content: center; padding: 0.875rem; margin-top: var(--spacing-2);">Confirmar Cópia</button>
    </div>
`);
    },
    confirmarCopiaPlanejamento(idOrigem) {
        const idDestino = document.getElementById('select-turma-destino')?.value;
        if (idOrigem && idDestino) {
            window.controller.confirmarAcao("Tem certeza?", "O planejamento da turma de destino será substituído.", () => {
                const sucesso = model.copiarPlanejamentoEntreTurmas(idOrigem, idDestino);
                if (sucesso) {
                    window.controller.closeModal();
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
            if (window.planejamentoView) window.planejamentoView.render('view-container');
        };
        window.controller.openModal(`BNCC - ${periodoIdx}º Período (${turma.nome})`,
            `<div id="modal-bncc-planejamento" style="width: 100%; max-height: 80vh; overflow-y: auto; padding: var(--spacing-4);"><div class="spinner-container"><i class="fas fa-spinner spinner-icon"></i></div></div>`,
            'xl'
        );
        setTimeout(() => {
            if (window.bnccView) window.bnccView.render('modal-bncc-planejamento', turma.nivel || nivelHtml, turma.serie || serieHtml, callback);
        }, 100);
    },
    removeHabilidade(turmaId, periodoIdx, codigoHabilidade) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma || !turma.planejamento || !turma.planejamento[periodoIdx]) return;
        const habilidadeRemovida = turma.planejamento[periodoIdx].find(h => h.codigo === codigoHabilidade);
        model.removeHabilidadePlanejamento(turmaId, periodoIdx, codigoHabilidade);
        if (window.planejamentoView) window.planejamentoView.render('view-container');
        if (habilidadeRemovida) {
            Toast.show(`Habilidade removida.`, 'info', 4000, {
                label: 'DESFAZER',
                callback: () => {
                    model.addHabilidadePlanejamento(turmaId, periodoIdx, habilidadeRemovida);
                    if (window.planejamentoView) window.planejamentoView.render('view-container');
                }
            });
        }
    },
    openSeletorBnccMensal(turmaId, mes, nivelHtml, serieHtml) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        const callback = (habilidade) => {
            model.addHabilidadeMensal(turmaId, mes, habilidade);
            if (window.mensalView) window.mensalView.render('view-container');
        };
        window.controller.openModal(`BNCC - ${mes} (${turma.nome})`, '<div id="modal-bncc-container" style="width: 100%; max-height: 80vh; overflow-y: auto; padding: var(--spacing-4);"></div>', 'xl');
        setTimeout(() => {
            if (window.bnccView) window.bnccView.render('modal-bncc-container', turma.nivel || nivelHtml, turma.serie || serieHtml, callback);
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
            if (window.controller && window.controller.closeModal) {
                window.controller.closeModal();
            }
        };
        const nomeTurma = turma ? turma.nome : 'Geral';
        const nivel = turma ? turma.nivel : null;
        const serie = turma ? turma.serie : null;

        window.controller.openModal(`Consultar BNCC - ${nomeTurma}`, '<div id="modal-bncc-diario" style="width: 100%; max-height: 80vh; overflow-y: auto; padding: var(--spacing-4);"></div>', 'xl');
        setTimeout(() => {
            if (window.bnccView) window.bnccView.render('modal-bncc-diario', nivel, serie, callback);
        }, 50);
    },
    removeHabilidadeMensal(turmaId, mes, codigo) {
        window.controller.confirmarAcao("Remover?", "Deseja remover esta habilidade do mês?", () => {
            model.removeHabilidadeMensal(turmaId, mes, codigo);
            if (window.controller.currentView === 'mensal' && window.mensalView) {
                window.mensalView.render('view-container');
            }
            if (window.Toast) window.Toast.show("Habilidade removida do planejamento mensal.", "info");
        });
    }
};
if (typeof window !== 'undefined') {
    window.planejamentoController = planejamentoController;
}