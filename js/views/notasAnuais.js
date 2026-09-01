// js/views/notasAnuais.js
/**
 * ==========================================================================
 * CONSOLIDADO ANUAL DE NOTAS, PARECERES E METAS IDEB (NOTAS ANUAIS VIEW)
 * Padrão: Vanilla MVC, ES Modules, Event Delegation (data-action), LaTeX Estrito.
 * ==========================================================================
 */

import { model } from '../model.js';
import { controller } from '../controller.js';
import { uiController } from '../controllers/uiController.js';
import { aiService } from '../ai-service.js';
import { Toast } from '../components/toast.js';
import { renderKatex } from '../utils.js';
import { gradeCalculatorService } from '../services/gradeCalculatorService.js';
import { attendanceCalculatorService } from '../services/attendanceCalculatorService.js';
import { EventDelegator } from '../utils/eventDelegator.js';

export const notasAnuaisView = {
    turmaIdSelecionada: null,
    criterioOrdenacao: 'nome_asc',
    _cleanupDelegators: null,

    mudarOrdenacao(criterio) {
        this.criterioOrdenacao = criterio;
        this.render('view-container');
    },

    async render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }

        const turmas = model.state.turmas || [];
        if (this.turmaIdSelecionada && !turmas.find(t => String(t.id) === String(this.turmaIdSelecionada))) {
            this.turmaIdSelecionada = null;
        }
        if (!this.turmaIdSelecionada && turmas.length > 0) {
            this.turmaIdSelecionada = turmas[0].id;
        }

        const turmaAtual = turmas.find(t => String(t.id) === String(this.turmaIdSelecionada));

        const html = `
            <div class="animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8);">
                
                <!-- TOP HEADER & CONTROLES -->
                <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em; display: flex; align-items: center; gap: var(--spacing-2);">
                            <i class="fas fa-award" style="color: var(--color-primary);"></i> Consolidado Anual de Notas
                        </h2>
                        <p style="font-size: 0.875rem; color: var(--color-slate-500);">
                            Acompanhamento do rendimento por período, pareceres e planos de recuperação paralela.
                        </p>
                    </div>

                    <div style="display: flex; align-items: center; gap: var(--spacing-3); flex-wrap: wrap;">
                        <button type="button" data-action="imprimir-a4-btn" class="btn-secondary" style="padding: 0.4rem 0.875rem; font-size: 0.8125rem;" title="Imprimir Consolidado Anual de Notas em A4">
                            <i class="fas fa-print"></i> <span>Imprimir A4</span>
                        </button>

                        <!-- SELETOR DE ORDENAÇÃO -->
                        <div style="display: flex; align-items: center; gap: 0.35rem;">
                            <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted);">
                                <i class="fas fa-sort-amount-down"></i> Ordenar:
                            </label>
                            <select data-action="mudar-ordenacao-select" class="form-input" style="padding: 0.35rem 0.625rem; font-size: 0.75rem; width: auto; border-radius: var(--radius-lg); background: var(--bg-surface); font-weight: 600;">
                                <option value="nome_asc" ${this.criterioOrdenacao === 'nome_asc' ? 'selected' : ''}>Nome (A - Z)</option>
                                <option value="nome_desc" ${this.criterioOrdenacao === 'nome_desc' ? 'selected' : ''}>Nome (Z - A)</option>
                                <option value="chamada_asc" ${this.criterioOrdenacao === 'chamada_asc' ? 'selected' : ''}>Nº Chamada (1, 2, 3...)</option>
                                <option value="matricula_asc" ${this.criterioOrdenacao === 'matricula_asc' ? 'selected' : ''}>Matrícula / ID</option>
                                <option value="status_nome" ${this.criterioOrdenacao === 'status_nome' ? 'selected' : ''}>Situação + Nome (Ativos 1º)</option>
                            </select>
                        </div>

                        <div class="custom-dropdown" style="min-width: 200px;">
                            <input type="hidden" id="select-turma-notas" data-action="mudar-turma-notas" value="${this.turmaIdSelecionada || ''}">
                            <button type="button" class="dropdown-button">
                                <i class="fas fa-users" style="color: var(--color-slate-400); margin-right: var(--spacing-2);"></i>
                                <span class="dropdown-label">${turmaAtual ? window.escapeHTML(turmaAtual.nome) : 'Selecionar Turma...'}</span>
                                <i class="fas fa-chevron-down" style="color: var(--color-slate-400); font-size: 0.75rem; margin-left: auto;"></i>
                            </button>
                            <ul class="dropdown-menu hidden custom-scrollbar">
                                ${turmas.length > 0
                                    ? turmas.map(t => `<li class="dropdown-item ${String(t.id) === String(this.turmaIdSelecionada) ? 'dropdown-item--selected' : ''}" data-value="${t.id}">${window.escapeHTML(t.nome)}</li>`).join('')
                                    : '<li class="p-3 text-slate-400 text-sm text-center">Nenhuma turma cadastrada</li>'
                                }
                            </ul>
                        </div>
                    </div>
                </div>

                ${turmaAtual ? this.renderTabelaTurma(turmaAtual) : this.renderEstadoVazio()}
            </div>
        `;

        container.innerHTML = html;

        const unbindClick = EventDelegator.bind(container, {
            'imprimir-a4-btn': () => this.imprimir(),
            'imprimir-relatorio-ideb': () => this.imprimirRelatorioIDEB(),
            'gerar-dossie-aluno': (e, target) => {
                const tId = target.getAttribute('data-turma');
                const aId = target.getAttribute('data-aluno');
                if (tId && aId) uiController.gerarDossieAluno(tId, aId);
            },
            'gerar-parecer-ia-btn': (e, target) => {
                const tId = target.getAttribute('data-turma');
                const aId = target.getAttribute('data-aluno');
                if (tId && aId) this.gerarParecerIA(tId, aId);
            },
            'gerar-recuperacao-ia-btn': (e, target) => {
                const tId = target.getAttribute('data-turma');
                const aId = target.getAttribute('data-aluno');
                if (tId && aId) this.gerarRecuperacaoIA(tId, aId);
            },
            'navigate-turmas': () => controller.navigate('turmas')
        }, 'click');

        const unbindChange = EventDelegator.bind(container, {
            'mudar-ordenacao-select': (e, target) => {
                this.mudarOrdenacao(target.value);
            },
            'mudar-turma-notas': (e, target) => {
                this.selecionarTurma(target.value);
            }
        }, 'change');

        this._cleanupDelegators = () => {
            if (typeof unbindClick === 'function') unbindClick();
            if (typeof unbindChange === 'function') unbindChange();
        };

        uiController.initAllDropdowns(container);
    },

    destroy() {
        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }
    },

    onLeave() {
        this.destroy();
    },

    selecionarTurma(turmaId) {
        this.turmaIdSelecionada = turmaId;
        this.render('view-container');
    },

    renderTabelaTurma(turma) {
        const config = model.state.userConfig || {};
        const tipo = config.tipoPeriodo || 'bimestre';
        const numPeriodos = tipo === 'bimestre' ? 4 : tipo === 'trimestre' ? 3 : 2;

        const stats = gradeCalculatorService.calcularEstatisticasTurma(turma);
        const mediaGeral = stats.mediaGeral ?? stats.mediaTurma ?? 0;
        const taxaAprovacao = stats.taxaAprovacao ?? 0;
        const idebEstimado = stats.idebEstimado ?? 0;

        const idebBannerHtml = `
            <div class="card p-4" style="margin-bottom: var(--spacing-4); background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%); border: 1px solid #c7d2fe; border-radius: var(--radius-xl);">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 3.5rem; height: 3.5rem; border-radius: var(--radius-xl); background: #4338ca; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 900; box-shadow: 0 4px 12px rgba(67, 56, 202, 0.25);">
                            ${idebEstimado.toFixed(1)}
                        </div>
                        <div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <h3 style="font-size: 1rem; font-weight: 800; color: #1e1b4b; margin: 0;">Projeção do Índice IDEB da Turma</h3>
                                <span class="badge" style="background: ${idebEstimado >= 6.0 ? '#d1fae5' : '#fee2e2'}; color: ${idebEstimado >= 6.0 ? '#047857' : '#b91c1c'}; font-weight: 800;">
                                    ${idebEstimado >= 6.0 ? 'Meta Superada' : 'Abaixo da Meta Nacional'}
                                </span>
                            </div>
                            <p style="font-size: 0.75rem; color: #4338ca; margin: 0.25rem 0 0 0;">
                                Taxa de Aprovação: <strong>${(taxaAprovacao * 100).toFixed(0)}%</strong> &nbsp;|&nbsp; Proficiência Média: <strong>${mediaGeral.toFixed(1)}</strong>
                            </p>
                        </div>
                    </div>
                    <button type="button" data-action="imprimir-relatorio-ideb" class="btn-secondary" style="background: white; border: 1px solid #c7d2fe; color: #4338ca; font-weight: 800; font-size: 0.75rem;">
                        <i class="fas fa-chart-line"></i> <span>Relatório A4 Metas IDEB</span>
                    </button>
                </div>
            </div>
        `;

        const alunosOrdenados = window.ordenarEstudantes
            ? window.ordenarEstudantes(turma.alunos || [], this.criterioOrdenacao)
            : (turma.alunos || []);

        return `
            ${idebBannerHtml}
            <div class="card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column;">
                <div class="custom-scrollbar" style="overflow-x: auto;">
                    <table style="width: 100%; text-align: left; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: var(--color-slate-50); border-bottom: 1px solid var(--color-slate-200);">
                                <th style="padding: var(--spacing-4) var(--spacing-6); font-size: 0.75rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase; letter-spacing: 0.05em; min-width: 220px;">Estudante</th>
                                ${Array.from({ length: numPeriodos }, (_, i) => `
                                    <th style="padding: var(--spacing-4); text-align: center; font-size: 0.75rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase; letter-spacing: 0.05em; min-width: 90px;">${i + 1}º Per.</th>
                                `).join('')}
                                <th style="padding: var(--spacing-4) var(--spacing-6); text-align: center; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-primary); background-color: var(--color-primary-light); min-width: 110px;">Média Final</th>
                                <th style="padding: var(--spacing-4) var(--spacing-6); text-align: center; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-slate-500); min-width: 110px;">Situação</th>
                                <th style="padding: var(--spacing-4); text-align: center; font-size: 0.75rem; font-weight: 800; color: #4338ca; text-transform: uppercase; letter-spacing: 0.05em; min-width: 120px;">Parecer IA</th>
                                <th style="padding: var(--spacing-4); text-align: center; font-size: 0.75rem; font-weight: 800; color: #b45309; text-transform: uppercase; letter-spacing: 0.05em; min-width: 150px;">Recuperação IA</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${alunosOrdenados.length > 0 ? alunosOrdenados.map(aluno => {
                                const resumo = model.getResumoAcademico ? model.getResumoAcademico(turma.id, aluno.id, turma, aluno) : null;
                                const mediaAnual = resumo?.mediaAnual || 0;
                                const statusInfo = gradeCalculatorService.obterStatusAprovacao(mediaAnual);
                                const isAprovado = statusInfo.status === 'aprovado';
                                const temParecerSalvo = !!aluno.parecerDescritivo;
                                const temPlanoSalvo = !!aluno.planoRecuperacao;

                                return `
                                    <tr style="border-bottom: 1px solid var(--color-slate-100); transition: background-color var(--transition-fast);">
                                        <td style="padding: var(--spacing-4) var(--spacing-6);">
                                            <div style="display: flex; align-items: center; gap: 0.375rem;">
                                                <div style="font-weight: 700; color: var(--color-slate-800); font-size: 0.875rem;">${window.escapeHTML(aluno.nome)}</div>
                                                <button type="button" data-action="gerar-dossie-aluno" data-turma="${turma.id}" data-aluno="${aluno.id}" style="background: none; border: none; cursor: pointer; color: var(--color-slate-400); padding: 0.1rem 0.25rem; border-radius: 0.25rem; transition: all 120ms ease;" title="Gerar Ficha Individual / Dossiê (PDF)">
                                                    <i class="fas fa-file-invoice" style="font-size: 0.8125rem;"></i>
                                                </button>
                                            </div>
                                            <div style="font-size: 0.6875rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Matrícula: ${aluno.matricula || aluno.id.slice(-6)}</div>
                                        </td>
                                        ${Array.from({ length: numPeriodos }, (_, i) => {
                                            const nota = resumo?.periodos ? (resumo.periodos[i + 1] || 0) : 0;
                                            const corNota = nota < 6 ? 'color: #ef4444; background-color: #fef2f2; border: 1px solid #fee2e2;' : 'color: var(--color-slate-700); background-color: var(--color-slate-100);';
                                            return `
                                                <td style="padding: var(--spacing-4); text-align: center;">
                                                    <span style="display: inline-block; padding: 0.25rem 0.625rem; border-radius: var(--radius-lg); font-family: monospace; font-weight: 800; font-size: 0.875rem; ${corNota}">
                                                        ${nota.toFixed(1)}
                                                    </span>
                                                </td>
                                            `;
                                        }).join('')}
                                        <td style="padding: var(--spacing-4) var(--spacing-6); text-align: center; background-color: rgba(238, 242, 255, 0.4);">
                                            <span style="font-size: 1.125rem; font-weight: 900; color: ${isAprovado ? 'var(--color-primary)' : '#dc2626'};">
                                                ${mediaAnual.toFixed(1)}
                                            </span>
                                        </td>
                                        <td style="padding: var(--spacing-4) var(--spacing-6); text-align: center;">
                                            <span class="badge" style="background-color: ${isAprovado ? '#d1fae5' : '#fee2e2'}; color: ${isAprovado ? '#059669' : '#dc2626'}; font-weight: 800;">
                                                ${statusInfo.rotulo}
                                            </span>
                                        </td>
                                        <td style="padding: var(--spacing-4); text-align: center;">
                                            <button type="button" data-action="gerar-parecer-ia-btn" data-turma="${turma.id}" data-aluno="${aluno.id}"
                                                    class="btn-secondary" 
                                                    style="padding: 0.35rem 0.75rem; font-size: 0.75rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.35rem; color: #4338ca; background-color: #e0e7ff; border: 1px solid #c7d2fe; border-radius: 0.5rem; cursor: pointer;" 
                                                    title="${temParecerSalvo ? 'Ver ou Reavaliar Parecer Descritivo com IA' : 'Gerar Parecer Descritivo com IA'}">
                                                <i class="fas ${temParecerSalvo ? 'fa-check-circle text-emerald-600' : 'fa-robot'}"></i> 
                                                <span>${temParecerSalvo ? 'Ver Parecer' : 'Parecer IA'}</span>
                                            </button>
                                        </td>
                                        <td style="padding: var(--spacing-4); text-align: center;">
                                            ${!isAprovado || temPlanoSalvo ? `
                                                <button type="button" data-action="gerar-recuperacao-ia-btn" data-turma="${turma.id}" data-aluno="${aluno.id}"
                                                        class="btn-primary" 
                                                        style="padding: 0.35rem 0.75rem; font-size: 0.75rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.35rem; background: linear-gradient(135deg, #d97706, #b45309); border: none; border-radius: 0.5rem; color: #fff; cursor: pointer; box-shadow: 0 2px 6px rgba(217, 119, 6, 0.25);" 
                                                        title="Gerar Plano Individualizado de Recuperação Paralela com IA">
                                                    <i class="fas ${temPlanoSalvo ? 'fa-book-reader' : 'fa-magic'}"></i> 
                                                    <span>${temPlanoSalvo ? 'Ver Plano' : 'Recuperação IA'}</span>
                                                </button>
                                            ` : `
                                                <span style="font-size: 0.75rem; color: var(--color-slate-400); font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem;">
                                                    <i class="fas fa-check text-emerald-500"></i> Regular
                                                </span>
                                            `}
                                        </td>
                                    </tr>
                                `;
                            }).join('') : `
                                <tr>
                                    <td colspan="100%" style="padding: 3rem; text-align: center; color: var(--color-slate-400);">Nenhum aluno cadastrado nesta turma.</td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    async gerarParecerIA(turmaId, alunoId) {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        const aluno = (turma.alunos || []).find(a => String(a.id) === String(alunoId));
        if (!aluno) return;

        const resumo = model.getResumoAcademico ? model.getResumoAcademico(turma.id, aluno.id, turma, aluno) : null;
        const mediaAnual = resumo?.mediaAnual || 0;
        const notasPeriodos = resumo?.periodos ? Object.entries(resumo.periodos).map(([p, n]) => `${p}º Período: ${Number(n).toFixed(1)}`).join(', ') : 'Sem notas detalhadas';

        const totaisPresenca = attendanceCalculatorService.calcularTotaisAluno(aluno.frequencia || {});
        const totalReg = totaisPresenca.totalRegistros;
        const totalFaltas = totaisPresenca.faltas;
        const freqPct = totalReg > 0 ? Math.round(((totalReg - totalFaltas) / totalReg) * 100) : 100;

        if (aluno.parecerDescritivo) {
            this.exibirModalParecerPronto(turma, aluno, aluno.parecerDescritivo);
            return;
        }

        const loadingHtml = `
            <div style="padding: 2.5rem 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                <div style="width: 4rem; height: 4rem; border-radius: 1.25rem; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; box-shadow: 0 10px 25px rgba(79,70,229,0.3); animation: pulse 2s infinite;">
                    <i class="fas fa-robot"></i>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0;">Redigindo Parecer Descritivo...</h3>
                <p style="font-size: 0.875rem; color: #64748b; max-width: 420px; margin: 0.25rem 0 0 0;">
                    A IA pedagógica está sintetizando as notas, assiduidade e perfil de <strong>${window.escapeHTML(aluno.nome)}</strong>.
                </p>
                <div style="display: flex; gap: 0.5rem; color: #4f46e5; font-size: 1.25rem; margin-top: 0.5rem;">
                    <i class="fas fa-circle-notch fa-spin"></i>
                </div>
            </div>
        `;
        controller.openModal('Parecer Descritivo com IA', loadingHtml);

        const prompt = `
Você é um especialista em avaliação educacional, BNCC e legislação pedagógica brasileira (LDB).
Redija um Parecer Descritivo Formativo individual de alto nível para o seguinte estudante:

- Nome do Aluno: ${aluno.nome}
- Turma/Série: ${turma.nome} (${turma.nivel || 'Ensino Fundamental'})
- Histórico de Notas: ${notasPeriodos} (Média Final: ${mediaAnual.toFixed(1)})
- Frequência Escolar: ${freqPct}% de presença
- Observações do Aluno: ${aluno.observacoes || 'Participação regular nas atividades escolares'}

Estruture o parecer em 3 parágrafos claros, técnicos e humanizados:
1. Aspectos Cognitivos e Desenvolvimento de Aprendizagem (desempenho nas avaliações e habilidades consolidadas).
2. Aspectos Socioemocionais, Participação e Frequência (engajamento, colaboração e assiduidade).
3. Recomendações e Metas para o Próximo Período Letivo (orientações construtivas para família e estudante).

Escreva em texto corrido e formal, pronto para inserção no diário oficial ou boletim escolar.
        `.trim();

        try {
            const resultado = await aiService._executarPromptGemini(prompt, 2048);
            let textoParecer = typeof resultado === 'string' ? resultado : (resultado.texto || JSON.stringify(resultado));
            textoParecer = textoParecer.replace(/```json/gi, '').replace(/```/g, '').trim();
            this.exibirModalParecerPronto(turma, aluno, textoParecer);
        } catch (err) {
            console.error("Erro ao gerar parecer com IA:", err);
            controller.closeModal();
            Toast.show("Não foi possível gerar o parecer no momento. Tente novamente.", "error");
        }
    },

    exibirModalParecerPronto(turma, aluno, textoParecer) {
        const modalProntoHtml = `
            <div id="modal-parecer-wrap" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; max-width: 650px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 0.5rem; margin: 0;">
                            <i class="fas fa-file-alt text-indigo-600"></i> Parecer Descritivo Individual
                        </h3>
                        <p style="font-size: 0.8125rem; color: #64748b; margin: 0.25rem 0 0 0;">
                            Estudante: <strong>${window.escapeHTML(aluno.nome)}</strong> • Turma: <strong>${window.escapeHTML(turma.nome)}</strong>
                        </p>
                    </div>
                    <span class="badge" style="background: #e0e7ff; color: #4338ca; font-weight: 800; font-size: 0.75rem; padding: 0.35rem 0.75rem; border-radius: 9999px;">
                        <i class="fas fa-sparkles"></i> Parecer Formativo
                    </span>
                </div>

                <div>
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 800; color: #475569; text-transform: uppercase;">Texto do Parecer (Editável)</label>
                    <textarea id="texto-parecer-ia" class="form-input custom-scrollbar" 
                              style="width: 100%; height: 260px; font-size: 0.9375rem; line-height: 1.6; padding: 0.875rem; border-radius: 0.75rem; border: 1.5px solid #cbd5e1; font-family: inherit; resize: vertical;">${window.escapeHTML(textoParecer)}</textarea>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.5rem;">
                    <button type="button" data-action="copiar-parecer-btn" class="btn-secondary" style="font-size: 0.875rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-copy"></i> Copiar Texto
                    </button>

                    <div style="display: flex; gap: 0.75rem;">
                        <button type="button" data-action="fechar-modal-btn" class="btn-secondary" style="font-size: 0.875rem;">
                            Fechar
                        </button>
                        <button type="button" data-action="salvar-parecer-btn" data-turma="${turma.id}" data-aluno="${aluno.id}" class="btn-primary" style="font-size: 0.875rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.5rem; background: #059669; border-color: #059669;">
                            <i class="fas fa-save"></i> Salvar na Ficha do Aluno
                        </button>
                    </div>
                </div>
            </div>
        `;
        controller.openModal('Parecer Descritivo', modalProntoHtml);

        const modalWrap = document.getElementById('modal-parecer-wrap');
        if (modalWrap) {
            EventDelegator.bind(modalWrap, {
                'copiar-parecer-btn': () => this.copiarParecer(),
                'fechar-modal-btn': () => controller.closeModal(),
                'salvar-parecer-btn': (e, target) => {
                    const tId = target.getAttribute('data-turma');
                    const aId = target.getAttribute('data-aluno');
                    if (tId && aId) this.salvarParecerAluno(tId, aId);
                }
            }, 'click');
        }
    },

    copiarParecer() {
        const textEl = document.getElementById('texto-parecer-ia');
        if (!textEl) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textEl.value).then(() => {
                Toast.show("📋 Parecer copiado para a área de transferência!", "success");
            }).catch(() => {
                textEl.select();
                document.execCommand('copy');
                Toast.show("📋 Parecer copiado!", "success");
            });
        } else {
            textEl.select();
            document.execCommand('copy');
            Toast.show("📋 Parecer copiado!", "success");
        }
    },

    salvarParecerAluno(turmaId, alunoId) {
        const textEl = document.getElementById('texto-parecer-ia');
        if (!textEl) return;
        const texto = textEl.value.trim();

        const turma = (model.state.turmas || []).find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        const aluno = (turma.alunos || []).find(a => String(a.id) === String(alunoId));
        if (!aluno) return;

        aluno.parecerDescritivo = texto;
        aluno.parecerAtualizadoEm = new Date().toISOString();

        if (model.saveTurma) {
            model.saveTurma(turma);
        } else {
            model.saveLocal();
        }

        controller.closeModal();
        Toast.show(`✅ Parecer de ${aluno.nome} salvo na ficha escolar!`, "success");
        this.render('view-container');
    },

    async gerarRecuperacaoIA(turmaId, alunoId) {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        const aluno = (turma.alunos || []).find(a => String(a.id) === String(alunoId));
        if (!aluno) return;

        if (aluno.planoRecuperacao && typeof aluno.planoRecuperacao === 'object') {
            this.exibirModalPlanoRecuperacao(turma, aluno, aluno.planoRecuperacao);
            return;
        }

        const resumo = model.getResumoAcademico ? model.getResumoAcademico(turma.id, aluno.id, turma, aluno) : null;
        const mediaAtual = resumo?.mediaAnual || 0;

        controller.openModal(`
            <div style="padding: 2.5rem; text-align: center; max-width: 500px; margin: 0 auto;">
                <div style="font-size: 3rem; color: #d97706; margin-bottom: 1rem;" class="animate-bounce">
                    <i class="fas fa-magic"></i>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.5rem;">
                    Elaborando Plano de Recuperação...
                </h3>
                <p style="color: var(--color-slate-500); font-size: 0.875rem; margin-bottom: 1.5rem; line-height: 1.5;">
                    Cruzando o histórico de rendimento de <strong>${window.escapeHTML(aluno.nome)}</strong> com as habilidades da BNCC e gerando questões práticas com resolução passo a passo.
                </p>
                <div style="width: 100%; height: 6px; background: #fef3c7; border-radius: 9999px; overflow: hidden;">
                    <div style="width: 60%; height: 100%; background: #d97706; border-radius: 9999px; animation: pulse 1.5s infinite;"></div>
                </div>
            </div>
        `);

        try {
            const habilidadesTurma = (turma.planejamentos || []).flatMap(p => p.habilidades || []);
            const plano = await aiService.gerarPlanoRecuperacao({
                aluno: aluno.nome,
                turma: turma.nome,
                disciplina: turma.disciplina || 'Geral',
                avaliacoes: aluno.notas || [],
                habilidadesBNCC: habilidadesTurma,
                mediaAtual
            });

            this.exibirModalPlanoRecuperacao(turma, aluno, plano);
        } catch (error) {
            console.error('[notasAnuais] Erro ao gerar plano de recuperação:', error);
            controller.closeModal();
            Toast.show("Erro ao gerar plano de recuperação com IA: " + (error.message || "Tente novamente."), "error");
        }
    },

    exibirModalPlanoRecuperacao(turma, aluno, plano) {
        if (!plano) return;

        const roteiroHtml = (plano.roteiroEstudos || []).map(etapa => `
            <div style="background: var(--color-slate-50); border: 1px solid var(--color-slate-200); border-radius: var(--radius-lg); padding: 1rem; margin-bottom: 0.75rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 9999px; background: #d97706; color: #fff; font-size: 0.75rem; font-weight: 800;">
                        ${etapa.etapa || '•'}
                    </span>
                    <strong style="font-size: 0.9375rem; color: var(--color-slate-800);">${window.escapeHTML(etapa.titulo || '')}</strong>
                </div>
                <p style="font-size: 0.875rem; color: var(--color-slate-600); margin: 0 0 0.5rem 0; line-height: 1.4;">
                    ${window.escapeHTML(etapa.conteudo || '')}
                </p>
                ${etapa.sugestaoAtividade ? `
                    <div style="font-size: 0.75rem; color: #b45309; font-weight: 700; background: #fffbeb; padding: 0.4rem 0.6rem; border-radius: var(--radius-md); border-left: 3px solid #d97706;">
                        💡 Sugestão: ${window.escapeHTML(etapa.sugestaoAtividade)}
                    </div>
                ` : ''}
            </div>
        `).join('');

        const questoesHtml = (plano.questoesPraticas || []).map((q, idx) => `
            <div style="border: 1px solid var(--color-slate-200); border-radius: var(--radius-lg); padding: 1rem; margin-bottom: 1rem; background: #fff;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <strong style="font-size: 0.875rem; color: var(--color-slate-800);">
                        Questão ${q.numero || idx + 1}
                    </strong>
                    <span style="font-size: 0.6875rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 9999px; background: #f1f5f9; color: var(--color-slate-600);">
                        Nível: ${window.escapeHTML(q.nivel || 'Prática')}
                    </span>
                </div>
                <div class="katex-renderable" style="font-size: 0.875rem; color: var(--color-slate-700); margin-bottom: 0.75rem; line-height: 1.5;">
                    ${window.escapeHTML(q.enunciado || '')}
                </div>
                <details style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: var(--radius-md); padding: 0.6rem 0.8rem; font-size: 0.8125rem;">
                    <summary style="font-weight: 700; color: #4338ca; cursor: pointer;">
                        <i class="fas fa-key mr-1"></i> Ver Resolução Passo a Passo & Gabarito
                    </summary>
                    <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e2e8f0; color: var(--color-slate-600);">
                        <div class="katex-renderable" style="white-space: pre-line; margin-bottom: 0.5rem;">
                            <strong>Resolução:</strong>\n${window.escapeHTML(q.resolucaoPassoAPasso || '')}
                        </div>
                        <div class="katex-renderable" style="color: #059669; font-weight: 800;">
                            <strong>Gabarito:</strong> ${window.escapeHTML(q.gabarito || '')}
                        </div>
                    </div>
                </details>
            </div>
        `).join('');

        const modalHtml = `
            <div id="modal-plano-recuperacao" style="max-width: 780px; width: 100%; max-height: 85vh; display: flex; flex-direction: column;">
                <!-- HEADER DO MODAL -->
                <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--color-slate-200); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(to right, #fffbeb, #fff);">
                    <div>
                        <span style="font-size: 0.6875rem; font-weight: 800; text-transform: uppercase; color: #b45309; letter-spacing: 0.05em;">
                            Recomposição de Aprendizagem
                        </span>
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); margin: 0.125rem 0 0 0; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-book-reader" style="color: #d97706;"></i> Plano de Recuperação: ${window.escapeHTML(aluno.nome)}
                        </h3>
                    </div>
                    <button type="button" data-action="fechar-plano-btn" style="border: none; background: transparent; font-size: 1.25rem; color: var(--color-slate-400); cursor: pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- CORPO COM ROLAGEM -->
                <div class="custom-scrollbar" style="padding: 1.5rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1.25rem;">
                    
                    <!-- DIAGNÓSTICO FORMATIVO -->
                    <div style="background: #fff; border: 1px solid #fde68a; border-left: 4px solid #d97706; border-radius: var(--radius-lg); padding: 1rem 1.25rem;">
                        <h4 style="font-size: 0.875rem; font-weight: 800; color: #92400e; margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.35rem;">
                            <i class="fas fa-stethoscope"></i> Diagnóstico Pedagógico
                        </h4>
                        <p class="katex-renderable" style="font-size: 0.875rem; color: var(--color-slate-700); margin: 0; line-height: 1.5;">
                            ${window.escapeHTML(plano.diagnostico || '')}
                        </p>
                    </div>

                    <!-- ROTEIRO DE ESTUDOS EM ETAPAS -->
                    <div>
                        <h4 style="font-size: 0.9375rem; font-weight: 800; color: var(--color-slate-800); margin: 0 0 0.75rem 0; display: flex; align-items: center; gap: 0.35rem;">
                            <i class="fas fa-route" style="color: #d97706;"></i> Roteiro de Estudos Progressivo
                        </h4>
                        ${roteiroHtml}
                    </div>

                    <!-- 3 QUESTÕES PRÁTICAS -->
                    <div>
                        <h4 style="font-size: 0.9375rem; font-weight: 800; color: var(--color-slate-800); margin: 0 0 0.75rem 0; display: flex; align-items: center; gap: 0.35rem;">
                            <i class="fas fa-tasks" style="color: #4338ca;"></i> Questões Práticas Diagnósticas (com Resolução e Gabarito)
                        </h4>
                        ${questoesHtml}
                    </div>
                </div>

                <!-- FOOTER COM AÇÕES -->
                <div style="padding: 1rem 1.5rem; border-top: 1px solid var(--color-slate-200); background: var(--color-slate-50); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                    <button type="button" data-action="regenerar-recuperacao-ia" data-turma="${turma.id}" data-aluno="${aluno.id}" class="btn-secondary" style="font-size: 0.8125rem;">
                        <i class="fas fa-sync-alt"></i> <span>Regenerar com IA</span>
                    </button>

                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" data-action="imprimir-plano-btn" class="btn-secondary" style="font-size: 0.8125rem;">
                            <i class="fas fa-print"></i> <span>Imprimir Plano</span>
                        </button>
                        <button type="button" data-action="salvar-plano-btn" data-turma="${turma.id}" data-aluno="${aluno.id}" class="btn-primary" style="font-size: 0.8125rem; background: #059669;">
                            <i class="fas fa-save"></i> <span>Salvar na Ficha do Aluno</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        controller.openModal(modalHtml);
        const modalContainer = document.getElementById('modal-plano-recuperacao');
        if (modalContainer) {
            renderKatex(modalContainer);

            EventDelegator.bind(modalContainer, {
                'fechar-plano-btn': () => controller.closeModal(),
                'regenerar-recuperacao-ia': (e, target) => {
                    const tId = target.getAttribute('data-turma');
                    const aId = target.getAttribute('data-aluno');
                    if (tId && aId) this.gerarRecuperacaoIA(tId, aId);
                },
                'imprimir-plano-btn': () => window.print(),
                'salvar-plano-btn': (e, target) => {
                    const tId = target.getAttribute('data-turma');
                    const aId = target.getAttribute('data-aluno');
                    if (tId && aId) this.salvarPlanoRecuperacao(tId, aId, plano);
                }
            }, 'click');
        }
    },

    salvarPlanoRecuperacao(turmaId, alunoId, plano) {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        const aluno = (turma.alunos || []).find(a => String(a.id) === String(alunoId));
        if (!aluno) return;

        aluno.planoRecuperacao = plano;
        aluno.planoRecuperacaoAtualizadoEm = new Date().toISOString();

        if (model.saveTurma) {
            model.saveTurma(turma);
        } else {
            model.saveLocal();
        }

        controller.closeModal();
        Toast.show(`✅ Plano de Recuperação de ${aluno.nome} vinculado à ficha do aluno!`, "success");
        this.render('view-container');
    },

    renderEstadoVazio() {
        return `
            <div class="card" style="padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 2px dashed var(--color-slate-200); max-width: 600px; margin: 2rem auto;">
                <div style="width: 4rem; height: 4rem; border-radius: var(--radius-full); background-color: var(--color-slate-100); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; color: var(--color-slate-400); font-size: 1.5rem;">
                    <i class="fas fa-award"></i>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.5rem;">Nenhuma turma selecionada</h3>
                <p style="color: var(--color-slate-500); font-size: 0.875rem; margin-bottom: 1.5rem;">Cadastre ou selecione uma turma para ver o consolidado anual de notas.</p>
                <button type="button" data-action="navigate-turmas" class="btn-primary">
                    <i class="fas fa-plus"></i> <span>Cadastrar Turmas</span>
                </button>
            </div>
        `;
    },

    // =========================================================================
    // IMPRESSÃO DO CONSOLIDADO ANUAL DE NOTAS (A4 PORTRAIT)
    // =========================================================================

    imprimir() {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(this.turmaIdSelecionada));
        if (!turma) return Toast.show("Selecione uma turma para imprimir o consolidado anual.", "warning");

        const config = model.state.userConfig || {};
        const escola = config.school || config.escola || 'Unidade Escolar';
        const anoLetivo = config.anoLetivo || new Date().getFullYear();
        const alunos = window.ordenarEstudantes ? window.ordenarEstudantes(turma.alunos || [], this.criterioOrdenacao) : (turma.alunos || []);

        let linhasHtml = '';
        alunos.forEach((aluno, idx) => {
            const numChamada = aluno.chamada || (idx + 1);
            const resumo = model.getResumoAcademico ? model.getResumoAcademico(turma.id, aluno.id, turma, aluno) : null;
            const n1 = resumo?.periodos?.[1] || 0;
            const n2 = resumo?.periodos?.[2] || 0;
            const n3 = resumo?.periodos?.[3] || 0;
            const n4 = resumo?.periodos?.[4] || 0;
            const mediaVal = resumo?.mediaAnual || 0;
            const media = Number(mediaVal).toFixed(1);
            const statusInfo = gradeCalculatorService.obterStatusAprovacao(mediaVal);
            const corStatus = statusInfo.status === 'aprovado' ? '#15803d' : '#dc2626';

            linhasHtml += `
                <tr>
                    <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-weight: 700; font-size: 0.75rem;">${numChamada}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 4px; font-weight: 600; font-size: 0.75rem;">${window.escapeHTML(aluno.nome)}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-size: 0.75rem;">${n1 > 0 ? Number(n1).toFixed(1) : '-'}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-size: 0.75rem;">${n2 > 0 ? Number(n2).toFixed(1) : '-'}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-size: 0.75rem;">${n3 > 0 ? Number(n3).toFixed(1) : '-'}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-size: 0.75rem;">${n4 > 0 ? Number(n4).toFixed(1) : '-'}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-weight: 800; font-size: 0.8rem; background: #f8fafc;">${media}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-weight: 700; font-size: 0.75rem; color: ${corStatus};">${statusInfo.rotulo}</td>
                </tr>
            `;
        });

        const printWindow = window.open('', '_blank');
        if (!printWindow) return Toast.show("Permita pop-ups para visualizar a impressão.", "warning");

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Consolidado Anual de Notas — ${window.escapeHTML(turma.nome)}</title>
                <style>
                    @page { size: A4 portrait; margin: 10mm; }
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 0; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 12px; }
                    .header h2 { margin: 0; font-size: 1.1rem; text-transform: uppercase; }
                    .header p { margin: 2px 0 0 0; font-size: 0.8rem; color: #475569; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
                    th { background-color: #f1f5f9; color: #1e293b; font-weight: 800; }
                    .footer { display: flex; justify-content: space-between; font-size: 0.75rem; color: #64748b; margin-top: 14px; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h2>${window.escapeHTML(escola)} — Consolidado Anual de Rendimento</h2>
                        <p><strong>Turma:</strong> ${window.escapeHTML(turma.nome)} &nbsp;|&nbsp; <strong>Ano Letivo:</strong> ${anoLetivo}</p>
                    </div>
                    <div style="text-align: right; font-size: 0.75rem; color: #475569;">
                        <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="border: 1px solid #cbd5e1; padding: 4px; width: 35px;">Nº</th>
                            <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: left;">Estudante</th>
                            <th style="border: 1px solid #cbd5e1; padding: 4px; width: 50px;">1º B</th>
                            <th style="border: 1px solid #cbd5e1; padding: 4px; width: 50px;">2º B</th>
                            <th style="border: 1px solid #cbd5e1; padding: 4px; width: 50px;">3º B</th>
                            <th style="border: 1px solid #cbd5e1; padding: 4px; width: 50px;">4º B</th>
                            <th style="border: 1px solid #cbd5e1; padding: 4px; width: 60px;">Média</th>
                            <th style="border: 1px solid #cbd5e1; padding: 4px; width: 120px;">Situação</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasHtml}
                    </tbody>
                </table>

                <div class="footer">
                    <span>Emissão Oficial Planner Pro Docente</span>
                    <span>Assinatura do Professor: _____________________________________</span>
                </div>

                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    // =========================================================================
    // RELATÓRIO SINTÉTICO DE PROJEÇÃO DE METAS IDEB / SAEB (A4 PORTRAIT)
    // =========================================================================

    imprimirRelatorioIDEB() {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(this.turmaIdSelecionada));
        if (!turma) return Toast.show("Selecione uma turma.", "warning");

        const config = model.state.userConfig || {};
        const escola = config.school || config.escola || 'Unidade Escolar';
        const anoLetivo = config.anoLetivo || new Date().getFullYear();
        const stats = gradeCalculatorService.calcularEstatisticasTurma(turma);

        const total = stats.totalAlunos || 0;
        const aprovados = stats.aprovados || 0;
        const proficiencia = stats.mediaGeral ?? stats.mediaTurma ?? 0;
        const taxaAprovacao = stats.taxaAprovacao ?? 0;
        const idebEstimado = stats.idebEstimado ?? 0;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return Toast.show("Permita pop-ups para visualizar o relatório.", "warning");

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Relatório Sintético de Projeção IDEB — ${window.escapeHTML(turma.nome)}</title>
                <style>
                    @page { size: A4 portrait; margin: 12mm; }
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 0; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 16px; }
                    .header h2 { margin: 0; font-size: 1.1rem; text-transform: uppercase; }
                    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
                    .kpi-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; }
                    .kpi-val { font-size: 1.8rem; font-weight: 900; color: #1e1b4b; }
                    .kpi-lbl { font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-top: 4px; }
                    .section-title { font-size: 0.85rem; font-weight: 800; text-transform: uppercase; border-bottom: 1.5px solid #0f172a; padding-bottom: 4px; margin-bottom: 10px; color: #0f172a; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 0.75rem; }
                    th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: center; }
                    th { background: #f1f5f9; font-weight: 800; }
                    .footer { font-size: 0.7rem; color: #64748b; margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 6px; display: flex; justify-content: space-between; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h2>${window.escapeHTML(escola)} — PROJEÇÃO DE DESEMPENHO IDEB / SAEB</h2>
                        <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #475569;"><strong>Turma:</strong> ${window.escapeHTML(turma.nome)} &nbsp;|&nbsp; <strong>Ano Letivo:</strong> ${anoLetivo}</p>
                    </div>
                    <div style="text-align: right; font-size: 0.75rem; color: #475569;">
                        Data: ${new Date().toLocaleDateString('pt-BR')}
                    </div>
                </div>

                <div class="kpi-grid">
                    <div class="kpi-card" style="border-color: #818cf8; background: #eef2ff;">
                        <div class="kpi-val" style="color: #4338ca;">${idebEstimado.toFixed(1)}</div>
                        <div class="kpi-lbl">IDEB Estimado da Turma</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-val">${(taxaAprovacao * 100).toFixed(0)}%</div>
                        <div class="kpi-lbl">Taxa de Aprovação (P)</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-val">${proficiencia.toFixed(1)}</div>
                        <div class="kpi-lbl">Proficiência Média (N)</div>
                    </div>
                </div>

                <div class="section-title">Diagnóstico Estratégico & Plano de Ação Pedagógica</div>
                <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; font-size: 0.8rem; color: #334155; line-height: 1.5; margin-bottom: 20px;">
                    <p style="margin: 0 0 8px 0;"><strong>Análise da Turma:</strong> A turma possui <strong>${aprovados} de ${total} estudantes</strong> com média dentro da meta estipulada (\\(\\ge 6.0\\)). O indicador IDEB é diretamente influenciado pela retenção de alunos e lacunas nos descritores avaliados.</p>
                    <p style="margin: 0 0 8px 0;"><strong>Recomendações da Equipe Pedagógica:</strong></p>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li>Intensificar oficinas de reforço paralelo com os ${total - aprovados} estudantes em risco.</li>
                        <li>Aplicar simulação periódica de descritores SAEB de Língua Portuguesa (Leitura/Inferência) e Matemática (Resolução de Problemas).</li>
                        <li>Acompanhar assiduidade semanal para evitar evasão ou infrequência > 25%.</li>
                    </ul>
                </div>

                <div class="footer">
                    <span>Relatório emitido via Planner Pro Docente em ${new Date().toLocaleDateString('pt-BR')}</span>
                    <span>Visto da Orientação Pedagógica: _____________________________________</span>
                </div>

                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
};

if (typeof window !== 'undefined') {
    window.notasAnuaisView = notasAnuaisView;
}