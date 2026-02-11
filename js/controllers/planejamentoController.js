/**
 * @file planejamentoController.js
 * @description Gerencia as interações de UI relacionadas ao Diário de Classe, Planejamento Anual e Mensal.
 * @module controllers/planejamentoController
 */

import { model } from '../model.js';
import { diarioView } from '../views/diario.js';
import { bnccView } from '../views/bncc.js';
import { mensalView } from '../views/mensal.js';
import { planejamentoView } from '../views/planejamento.js';
import { Toast } from '../components/toast.js';
import { debounce } from '../utils.js';


/**
 * Controlador de Planejamento e Diário.
 * @namespace planejamentoController
 */
export const planejamentoController = {

    // --- Diário e Planejamento Diário ---

    /**
     * Inicializa os ouvintes de eventos para o salvamento automático (Autosave).
     * Aplica debounce para evitar excesso de escritas no banco.
     * @returns {void}
     */
    initDiarioAutosave() {
        const inputs = document.querySelectorAll('.autosave-input');
        if (inputs.length === 0) return;

        // Cria a função debounced (espera 2s após parar de digitar)
        const autoSalvar = debounce(() => {
            this.salvarDiario(true); // Passa true para modo silencioso
        }, 2000);

        inputs.forEach(input => {
            input.addEventListener('input', () => {
                const statusEl = document.getElementById('status-salvamento');
                if (statusEl) statusEl.innerText = 'Digitando...';
                autoSalvar();
            });
        });
    },

    /**
     * Coleta dados do formulário e salva o planejamento do dia no model.
     * @param {boolean} [silent=false] - Se true, não exibe Toast (usado no autosave).
     * @returns {void}
     */
    salvarDiario(silent = false) {
        const dataEl = document.getElementById('diario-data');
        const turmaEl = document.getElementById('diario-turma');

        // Validação defensiva
        if (!dataEl || !turmaEl) return;

        const data = dataEl.value;
        const turmaId = turmaEl.value;

        if (!data || !turmaId) {
            if (!silent) Toast.show("Selecione uma data e uma turma!", "warning");
            return;
        }

        // Coleta segura dos valores (usando encadeamento opcional caso algum campo falte no HTML)
        const conteudo = {
            tema: document.getElementById('plan-tema')?.value || '',
            bncc: document.getElementById('plan-bncc')?.value || '',
            objetivos: document.getElementById('plan-objetivos')?.value || '',
            recursos: document.getElementById('plan-recursos')?.value || '',
            metodologia: document.getElementById('plan-metodologia')?.value || '',
            avaliacao: document.getElementById('plan-avaliacao')?.value || ''
        };

        // Salva no Model (apenas uma vez)
        model.savePlanoDiario(data, turmaId, conteudo);

        // Feedback Visual
        if (silent) {
            // Feedback discreto no rodapé/cabeçalho
            const statusEl = document.getElementById('status-salvamento');
            if (statusEl) statusEl.innerHTML = '<i class="fas fa-check text-green-500"></i> Salvo';
        } else {
            // Feedback explícito via Toast
            Toast.show("Planejamento salvo com sucesso!", 'success');
        }
    },

    /**
     * Altera a data focada no diário e navega para a visão diária.
     * @param {string} novaData - Data no formato YYYY-MM-DD.
     */
    mudarDataDiario(novaData) {
        if (window.diarioView) {
            window.diarioView.currentDate = novaData;

            // Atualiza também a referência visual do calendário
            const [ano, mes] = novaData.split('-');
            window.diarioView.viewDate = new Date(parseInt(ano), parseInt(mes) - 1, 1);

            window.controller.navigate('dia');
        }
    },

    /**
     * Navega entre meses na visão do diário.
     * @param {number} delta - Valor para somar/subtrair do mês (-1 ou +1).
     */
    mudarMesDiario(delta) {
        if (window.diarioView) {
            const novaData = new Date(window.diarioView.viewDate);
            novaData.setMonth(novaData.getMonth() + delta);
            window.diarioView.viewDate = novaData;
            window.controller.navigate('dia');
        }
    },

    /**
     * Troca a turma ativa no diário.
     * @param {string} novoId - ID da nova turma.
     */
    mudarTurmaDiario(novoId) {
        if (window.diarioView) {
            window.diarioView.currentTurmaId = novoId;
            window.controller.navigate('dia');
        }
    },

    // --- Lógica de Replicação (Copiar Planejamento) ---

    /**
     * Abre o modal para copiar planejamento de uma turma para outra.
     * @param {string} turmaIdAtual - ID da turma de origem.
     */
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
            const destaque = isMesmaSerie ? 'font-bold text-blue-600' : '';
            const nomeEsc = window.escapeHTML ? window.escapeHTML(t.nome) : t.nome;
            return `<option value="${window.escapeHTML(t.id)}" class="${destaque}">${nomeEsc} ${isMesmaSerie ? '(Mesma Série)' : ''}</option>`;
        }).join('');

        window.controller.openModal('Replicar Planejamento', `
            <div class="p-6 space-y-4">
                <div class="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4">
                    <p class="text-sm text-blue-800"><i class="fas fa-info-circle mr-1"></i> Copiando de <strong>${window.escapeHTML ? window.escapeHTML(turmaAtual.nome) : turmaAtual.nome}</strong>.</p>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Para a Turma</label>
                    <select id="select-turma-destino" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary bg-white">${optionsHtml}</select>
                </div>
                <div class="bg-red-50 border border-red-100 p-3 rounded-xl text-xs text-red-600 mt-2">
                    <i class="fas fa-exclamation-triangle"></i> Substituirá todo o planejamento da turma destino.
                </div>
                <button onclick="planejamentoController.confirmarCopiaPlanejamento('${window.escapeHTML(turmaIdAtual)}')" class="btn-primary w-full py-3 rounded-xl font-bold shadow-lg mt-2">Confirmar Cópia</button>
            </div>
        `);
    },

    /**
     * Executa a cópia do planejamento após confirmação.
     * @param {string} idOrigem - ID da turma de origem.
     */
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

    // --- Integração BNCC ---

    /**
     * Abre o modal seletor da BNCC para o Planejamento Periódico.
     * @param {string} turmaId
     * @param {string|number} periodoIdx
     * @param {string} nivelHtml - Nome do nível (para display).
     * @param {string} serieHtml - Nome da série (para display).
     */
    openSeletorBncc(turmaId, periodoIdx, nivelHtml, serieHtml) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;

        const callback = (habilidade) => {
            model.addHabilidadePlanejamento(turmaId, String(periodoIdx), habilidade);
            if (window.planejamentoView) window.planejamentoView.render('view-container');
        };

        window.controller.openModal(`BNCC - ${periodoIdx}º Período`,
            `<div id="modal-bncc-planejamento" class="w-full h-full min-h-[500px]"><div class="flex items-center justify-center h-full"><i class="fas fa-spinner fa-spin text-2xl text-slate-300"></i></div></div>`,
            'large'
        );

        // Timeout necessário para aguardar a renderização do modal no DOM
        setTimeout(() => {
            if (window.bnccView) window.bnccView.render('modal-bncc-planejamento', turma.nivel || nivelHtml, turma.serie || serieHtml, callback);
        }, 100);
    },

    /**
     * Remove habilidade do planejamento anual com opção de "Desfazer".
     * @param {string} turmaId
     * @param {string|number} periodoIdx
     * @param {string} codigoHabilidade
     */
    removeHabilidade(turmaId, periodoIdx, codigoHabilidade) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma || !turma.planejamento || !turma.planejamento[periodoIdx]) return;

        // Guarda cópia para o "Desfazer"
        const habilidadeRemovida = turma.planejamento[periodoIdx].find(h => h.codigo === codigoHabilidade);

        // Remove
        model.removeHabilidadePlanejamento(turmaId, periodoIdx, codigoHabilidade);

        if (window.planejamentoView) window.planejamentoView.render('view-container');

        // Mostra Toast com ação
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

    /**
     * Abre o seletor BNCC para o Planejamento Mensal.
     * @param {string} turmaId
     * @param {string} mes - Nome do mês (ex: "Março").
     * @param {string} nivelHtml
     * @param {string} serieHtml
     */
    openSeletorBnccMensal(turmaId, mes, nivelHtml, serieHtml) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;

        const callback = (habilidade) => {
            model.addHabilidadeMensal(turmaId, mes, habilidade);
            if (window.mensalView) window.mensalView.render('view-container');
        };

        window.controller.openModal(`BNCC - ${mes}`, '<div id="modal-bncc-container" class="h-full"></div>', 'large');

        setTimeout(() => {
            if (window.bnccView) window.bnccView.render('modal-bncc-container', turma.nivel || nivelHtml, turma.serie || serieHtml, callback);
        }, 50);
    },

    /**
     * Remove uma habilidade do planejamento mensal.
     * @param {string} turmaId
     * @param {string} mes
     * @param {string} codigo
     */
    removeHabilidadeMensal(turmaId, mes, codigo) {
        window.controller.confirmarAcao("Remover?", "Deseja remover esta habilidade do mês?", () => {

            model.removeHabilidadeMensal(turmaId, mes, codigo);

            // Re-renderiza a view se estiver nela
            if (window.controller.currentView === 'mensal' && window.mensalView) {
                window.mensalView.render('view-container');
            }

            if (window.Toast) window.Toast.show("Habilidade removida do planejamento mensal.", "info");
        });
    }
};

// Exposição global para chamadas via HTML onclick
if (typeof window !== 'undefined') {
    window.planejamentoController = planejamentoController;
}
