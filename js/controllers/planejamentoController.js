// js/controllers/planejamentoController.js
import { model } from '../model.js';
import { Toast } from '../components/toast.js';

/**
 * CONTROLADOR DE PLANEJAMENTO
 * Gerencia as ações de Diário, Planejamento Periódico, Mensal e integrações BNCC.
 * @namespace planejamentoController
 */
export const planejamentoController = {
    
    // --- Diário e Planejamento Diário ---
    
    /**
     * Coleta dados do formulário e salva o planejamento do dia no model.
     */
    salvarDiario() {
        const data = document.getElementById('diario-data').value;
        const turmaId = document.getElementById('diario-turma').value;
        
        const conteudo = {
            tema: document.getElementById('plan-tema').value,
            bncc: document.getElementById('plan-bncc').value,
            objetivos: document.getElementById('plan-objetivos').value,
            recursos: document.getElementById('plan-recursos').value,
            metodologia: document.getElementById('plan-metodologia').value,
            avaliacao: document.getElementById('plan-avaliacao').value
        };

        model.savePlanoDiario(data, turmaId, conteudo);
        Toast.show("Planejamento salvo com sucesso!", 'success');
    },

    /**
     * Altera a data focada no diário e navega para a visão diária.
     * @param {string} novaData - Data no formato YYYY-MM-DD.
     */
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

    // --- Lógica de Replicação (Copiar Planejamento) ---

    abrirModalCopiarPlanejamento(turmaIdAtual) {
        const turmaAtual = model.state.turmas.find(t => t.id == turmaIdAtual);
        if (!turmaAtual) return;
        
        const outrasTurmas = model.state.turmas.filter(t => t.id != turmaIdAtual);
        if (outrasTurmas.length === 0) {
            Toast.show("Você não possui outras turmas cadastradas.", "warning");
            return;
        }

        const optionsHtml = outrasTurmas.map(t => {
            const isMesmaSerie = t.serie === turmaAtual.serie;
            const destaque = isMesmaSerie ? 'font-bold text-blue-600' : '';
            return `<option value="${t.id}" class="${destaque}">${t.nome} ${isMesmaSerie ? '(Mesma Série)' : ''}</option>`;
        }).join('');

        window.controller.openModal('Replicar Planejamento', `
            <div class="p-6 space-y-4">
                <div class="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4">
                    <p class="text-sm text-blue-800"><i class="fas fa-info-circle mr-1"></i> Copiando de <strong>${turmaAtual.nome}</strong>.</p>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Para a Turma</label>
                    <select id="select-turma-destino" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary bg-white">${optionsHtml}</select>
                </div>
                <div class="bg-red-50 border border-red-100 p-3 rounded-xl text-xs text-red-600 mt-2">
                    <i class="fas fa-exclamation-triangle"></i> Substituirá todo o planejamento da turma destino.
                </div>
                <button onclick="controller.confirmarCopiaPlanejamento('${turmaIdAtual}')" class="btn-primary w-full py-3 rounded-xl font-bold shadow-lg mt-2">Confirmar Cópia</button>
            </div>
        `);
    },

    confirmarCopiaPlanejamento(idOrigem) {
        const idDestino = document.getElementById('select-turma-destino').value;
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

    openSeletorBncc(turmaId, periodoIdx, nivelHtml, serieHtml) {
        const turma = model.state.turmas.find(t => t.id == turmaId);
        if (!turma) return;

        const callback = (habilidade) => {
            model.addHabilidadePlanejamento(turmaId, periodoIdx, habilidade);
            if (window.planejamentoView) window.planejamentoView.render('view-container');
        };

        window.controller.openModal(`BNCC - ${periodoIdx}º Período`,
            `<div id="modal-bncc-planejamento" class="w-full h-full min-h-[500px]"><div class="flex items-center justify-center h-full"><i class="fas fa-spinner fa-spin text-2xl text-slate-300"></i></div></div>`,
            'large'
        );

        setTimeout(() => {
            if (window.bnccView) window.bnccView.render('modal-bncc-planejamento', turma.nivel || nivelHtml, turma.serie || serieHtml, callback);
        }, 100);
    },

    /**
     * Remove habilidade do planejamento anual com opção de desfazer.
     */
    removeHabilidade(turmaId, periodoIdx, codigoHabilidade) {
        const turma = model.state.turmas.find(t => t.id == turmaId);
        if (!turma || !turma.planejamento[periodoIdx]) return;
        
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
        const turma = model.state.turmas.find(t => t.id == turmaId);
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
     * Remove uma habilidade do planejamento mensal com confirmação e fallback de segurança.
     * @param {string} turmaId 
     * @param {string} mes 
     * @param {string} codigo 
     */
    removeHabilidadeMensal(turmaId, mes, codigo) {
    window.controller.confirmarAcao("Remover?", "Deseja remover esta habilidade do mês?", () => {
        // Chama o model para apagar DE VERDADE
        model.removeHabilidadeMensal(turmaId, mes, codigo);
        
        // Dá um pequeno tempo para o processamento e re-renderiza
        if (window.controller.currentView === 'mensal') {
            window.mensalView.render('view-container');
        }
        
        window.Toast?.show("Habilidade removida do planejamento mensal.", "info");
    });
},

    /**
     * Lógica de emergência para garantir a remoção mesmo em falhas de injeção de métodos.
     * @private
     */
    _fallbackRemoveHabilidadeMensal(turmaId, mes, codigo) {
        try {
            const turmas = model.state.turmas || [];
            const turma = turmas.find(t => String(t.id) === String(turmaId));
            
            if (turma && turma.planejamentoMensal && turma.planejamentoMensal[mes]) {
                // Filtro rigoroso para garantir a exclusão
                turma.planejamentoMensal[mes] = turma.planejamentoMensal[mes].filter(h => String(h.codigo).trim() !== String(codigo).trim());
                
                // Persistência manual via model
                model.saveLocal();
                model.saveCloudRoot();
                
                if (window.controller.currentView === 'mensal') {
                    window.mensalView.render('view-container');
                }
                window.Toast?.show("Habilidade removida (FB).", "info");
            }
        } catch (err) {
            console.error("Falha no fallback de remoção:", err);
            Toast.show("Erro ao remover habilidade.", "error");
        }
    }
};