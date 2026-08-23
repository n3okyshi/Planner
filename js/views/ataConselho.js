/**
 * @file ataConselho.js
 * @description View responsável pela Ata Eletrônica de Resultados Finais e Conselho de Classe.
 * Consolida frequência, médias bimestrais, cálculo automático de risco pedagógico,
 * exportação estruturada (CSV/JSON para SED/SIGE/Censo) e folha de impressão A4 oficial (@media print).
 * @module views/ataConselhoView
 */

import { model } from '../model.js';
import { controller } from '../controller.js';
import { uiController } from '../controllers/uiController.js';
import { storageService } from '../services/storageService.js';
import { Toast } from '../components/toast.js';
import { renderKatex } from '../utils.js';

export const ataConselhoView = {
    turmaIdSelecionada: null,
    filtroRisco: 'todos', // 'todos' | 'critico' | 'rendimento' | 'frequencia' | 'aprovado'

    async render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const turmas = model.state.turmas || [];
        const config = model.state.userConfig || {};
        const escolaNome = config.school || config.escola || 'Unidade Escolar';
        const anoLetivo = config.anoLetivo || new Date().getFullYear();

        if (this.turmaIdSelecionada && !turmas.find(t => String(t.id) === String(this.turmaIdSelecionada))) {
            this.turmaIdSelecionada = null;
        }
        if (!this.turmaIdSelecionada && turmas.length > 0) {
            this.turmaIdSelecionada = turmas[0].id;
        }

        const turmaAtual = turmas.find(t => String(t.id) === String(this.turmaIdSelecionada));
        const dadosConselho = turmaAtual ? this._calcularDadosConselho(turmaAtual) : [];

        // Estatísticas para os cards
        const totalEstudantes = dadosConselho.length;
        const totalAprovados = dadosConselho.filter(d => d.statusGeral === 'aprovado').length;
        const totalCritico = dadosConselho.filter(d => d.riscoTipo === 'critico').length;
        const totalRendimento = dadosConselho.filter(d => d.riscoTipo === 'rendimento').length;
        const totalInfrequencia = dadosConselho.filter(d => d.riscoTipo === 'frequencia').length;
        const mediaTurma = totalEstudantes > 0 
            ? (dadosConselho.reduce((acc, d) => acc + d.mediaFinal, 0) / totalEstudantes).toFixed(1) 
            : '0.0';

        const taxaAprovacao = totalEstudantes > 0 ? Math.round((totalAprovados / totalEstudantes) * 100) : 0;

        const html = `
            <div class="animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8);">
                
                <!-- TOP HEADER & TOOLBAR (Não impresso) -->
                <div class="card no-print" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em; display: flex; align-items: center; gap: var(--spacing-2);">
                            <i class="fas fa-clipboard-check" style="color: var(--color-primary);"></i> Ata Eletrônica do Conselho de Classe
                        </h2>
                        <p style="font-size: 0.875rem; color: var(--color-slate-500);">
                            Consolidação oficial de rendimento, frequência e deliberações do corpo docente.
                        </p>
                    </div>

                    <div style="display: flex; align-items: center; gap: var(--spacing-3); flex-wrap: wrap;">
                        <!-- Seletor de Turma -->
                        <div class="custom-dropdown" style="min-width: 220px;">
                            <input type="hidden" id="select-turma-conselho" onchange="ataConselhoView.selecionarTurma(this.value)" value="${this.turmaIdSelecionada || ''}">
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

                        <!-- Botão Imprimir / Gerar PDF Nativo -->
                        <button type="button" onclick="ataConselhoView.imprimir()" class="btn-primary" title="Imprimir Ata Oficial ou Salvar como PDF">
                            <i class="fas fa-print"></i> <span>Imprimir Ata Oficial</span>
                        </button>

                        <!-- Botão Exportar CSV (SED/SIGE) -->
                        <button type="button" onclick="ataConselhoView.exportarCSV()" class="btn-secondary" title="Exportar CSV compatível com Excel e SED/SIGE">
                            <i class="fas fa-file-csv text-emerald-600"></i> <span>Exportar CSV (SED)</span>
                        </button>

                        <!-- Botão Ata de Reunião de Pais -->
                        <button type="button" onclick="ataConselhoView.abrirModalAtaReuniaoPais()" class="btn-secondary" title="Gerar Ata de Reunião de Pais com Lista de Presença para Assinatura (A4)">
                            <i class="fas fa-users" style="color: var(--color-primary);"></i> <span>Ata Reunião de Pais</span>
                        </button>

                        <!-- Botão Exportar JSON -->
                        <button type="button" onclick="ataConselhoView.exportarJSON()" class="btn-secondary" title="Exportar JSON para o Censo Escolar">
                            <i class="fas fa-file-code text-indigo-600"></i> <span>JSON</span>
                        </button>
                    </div>
                </div>

                <!-- CARDS DE RESUMO ESTRATÉGICO (Não impresso) -->
                <div class="no-print" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-4);">
                    <div class="card" style="padding: var(--spacing-4); display: flex; align-items: center; gap: var(--spacing-3);">
                        <div style="width: 3rem; height: 3rem; border-radius: var(--radius-xl); background-color: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                            <i class="fas fa-user-graduate"></i>
                        </div>
                        <div>
                            <span style="font-size: 1.5rem; font-weight: 800; color: var(--color-slate-800);">${totalEstudantes}</span>
                            <p style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase;">Total de Alunos</p>
                        </div>
                    </div>

                    <div class="card" style="padding: var(--spacing-4); display: flex; align-items: center; gap: var(--spacing-3);">
                        <div style="width: 3rem; height: 3rem; border-radius: var(--radius-xl); background-color: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div>
                            <span style="font-size: 1.5rem; font-weight: 800; color: #059669;">${taxaAprovacao}%</span>
                            <p style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase;">Aprovação Direta (${totalAprovados})</p>
                        </div>
                    </div>

                    <div class="card" style="padding: var(--spacing-4); display: flex; align-items: center; gap: var(--spacing-3);">
                        <div style="width: 3rem; height: 3rem; border-radius: var(--radius-xl); background-color: #fef2f2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div>
                            <span style="font-size: 1.5rem; font-weight: 800; color: #dc2626;">${totalCritico + totalRendimento + totalInfrequencia}</span>
                            <p style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase;">Alunos em Risco</p>
                        </div>
                    </div>

                    <div class="card" style="padding: var(--spacing-4); display: flex; align-items: center; gap: var(--spacing-3);">
                        <div style="width: 3rem; height: 3rem; border-radius: var(--radius-xl); background-color: #f5f3ff; color: #7c3aed; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div>
                            <span style="font-size: 1.5rem; font-weight: 800; color: #7c3aed;">${mediaTurma}</span>
                            <p style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase;">Média Global da Turma</p>
                        </div>
                    </div>
                </div>

                <!-- CABEÇALHO OFICIAL DE IMPRESSÃO (Visível apenas na impressão) -->
                <div class="print-header" style="border-bottom: 2px solid #0f172a; padding-bottom: 0.75rem; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h1 style="font-size: 1.25rem; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase;">
                                ${window.escapeHTML(escolaNome)}
                            </h1>
                            <p style="font-size: 0.8125rem; color: #475569; margin: 0.2rem 0 0 0;">
                                <strong>ATA DE DELIBERAÇÃO FINAL DO CONSELHO DE CLASSE — ANO LETIVO ${anoLetivo}</strong>
                            </p>
                        </div>
                        <div style="text-align: right; font-size: 0.75rem; color: #64748b;">
                            <div><strong>Turma:</strong> ${turmaAtual ? window.escapeHTML(turmaAtual.nome) : '-'}</div>
                            <div><strong>Componente/Área:</strong> ${turmaAtual ? window.escapeHTML(turmaAtual.disciplina || 'Geral') : '-'}</div>
                            <div><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</div>
                        </div>
                    </div>
                </div>

                <!-- TABELA CONSOLIDADA DE RESULTADOS -->
                <div class="card" style="padding: 0; overflow: hidden; border-radius: var(--radius-xl);">
                    <div class="custom-scrollbar" style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem;">
                            <thead>
                                <tr style="background-color: var(--color-slate-50); border-bottom: 1px solid var(--color-slate-200);">
                                    <th style="padding: 0.75rem 1rem; font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase;">Nº / Matrícula</th>
                                    <th style="padding: 0.75rem 1rem; font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase; min-width: 180px;">Estudante</th>
                                    <th style="padding: 0.75rem 0.5rem; text-align: center; font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase;">1º B</th>
                                    <th style="padding: 0.75rem 0.5rem; text-align: center; font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase;">2º B</th>
                                    <th style="padding: 0.75rem 0.5rem; text-align: center; font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase;">3º B</th>
                                    <th style="padding: 0.75rem 0.5rem; text-align: center; font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase;">4º B</th>
                                    <th style="padding: 0.75rem 0.75rem; text-align: center; font-size: 0.6875rem; font-weight: 800; color: #4338ca; background-color: #e0e7ff; text-transform: uppercase;">Média Final</th>
                                    <th style="padding: 0.75rem 0.5rem; text-align: center; font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase;">Freq (%)</th>
                                    <th style="padding: 0.75rem 0.75rem; text-align: center; font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase;">Risco Pedagógico</th>
                                    <th style="padding: 0.75rem 1rem; font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase; min-width: 220px;">Deliberação do Conselho</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${dadosConselho.length > 0 ? dadosConselho.map((aluno, idx) => {
                                    const corMedia = aluno.mediaFinal < 6.0 ? '#dc2626' : '#059669';
                                    const corFreq = aluno.freqPct < 75 ? '#dc2626' : '#1e293b';

                                    let badgeRisco = '';
                                    if (aluno.riscoTipo === 'critico') {
                                        badgeRisco = '<span style="display: inline-block; padding: 0.2rem 0.5rem; border-radius: 9999px; background-color: #fee2e2; color: #991b1b; font-weight: 800; font-size: 0.6875rem;">🔴 Crítico (Nota & Freq)</span>';
                                    } else if (aluno.riscoTipo === 'rendimento') {
                                        badgeRisco = '<span style="display: inline-block; padding: 0.2rem 0.5rem; border-radius: 9999px; background-color: #ffedd5; color: #9a3412; font-weight: 800; font-size: 0.6875rem;">🟠 Rendimento (&lt; 6.0)</span>';
                                    } else if (aluno.riscoTipo === 'frequencia') {
                                        badgeRisco = '<span style="display: inline-block; padding: 0.2rem 0.5rem; border-radius: 9999px; background-color: #fef9c3; color: #854d0e; font-weight: 800; font-size: 0.6875rem;">🟡 Infrequência (&lt; 75%)</span>';
                                    } else {
                                        badgeRisco = '<span style="display: inline-block; padding: 0.2rem 0.5rem; border-radius: 9999px; background-color: #d1fae5; color: #065f46; font-weight: 800; font-size: 0.6875rem;">🟢 Aprovado</span>';
                                    }

                                    return `
                                        <tr style="border-bottom: 1px solid var(--color-slate-100); transition: background-color var(--transition-fast);">
                                            <td style="padding: 0.75rem 1rem; color: var(--color-slate-400); font-family: monospace; font-size: 0.75rem;">
                                                ${aluno.matricula || String(idx + 1).padStart(2, '0')}
                                            </td>
                                            <td style="padding: 0.75rem 1rem;">
                                                <strong style="color: var(--color-slate-800); font-size: 0.875rem;">${window.escapeHTML(aluno.nome)}</strong>
                                            </td>
                                            <td style="padding: 0.75rem 0.5rem; text-align: center; font-family: monospace; font-weight: 700; color: ${aluno.n1 < 6 ? '#dc2626' : 'inherit'};">
                                                ${aluno.n1 !== null ? Number(aluno.n1).toFixed(1) : '-'}
                                            </td>
                                            <td style="padding: 0.75rem 0.5rem; text-align: center; font-family: monospace; font-weight: 700; color: ${aluno.n2 < 6 ? '#dc2626' : 'inherit'};">
                                                ${aluno.n2 !== null ? Number(aluno.n2).toFixed(1) : '-'}
                                            </td>
                                            <td style="padding: 0.75rem 0.5rem; text-align: center; font-family: monospace; font-weight: 700; color: ${aluno.n3 < 6 ? '#dc2626' : 'inherit'};">
                                                ${aluno.n3 !== null ? Number(aluno.n3).toFixed(1) : '-'}
                                            </td>
                                            <td style="padding: 0.75rem 0.5rem; text-align: center; font-family: monospace; font-weight: 700; color: ${aluno.n4 < 6 ? '#dc2626' : 'inherit'};">
                                                ${aluno.n4 !== null ? Number(aluno.n4).toFixed(1) : '-'}
                                            </td>
                                            <td style="padding: 0.75rem 0.75rem; text-align: center; background-color: rgba(224, 231, 255, 0.4); font-family: monospace; font-size: 1rem; font-weight: 900; color: ${corMedia};">
                                                ${aluno.mediaFinal.toFixed(1)}
                                            </td>
                                            <td style="padding: 0.75rem 0.5rem; text-align: center; font-family: monospace; font-weight: 800; color: ${corFreq};">
                                                ${aluno.freqPct}%
                                            </td>
                                            <td style="padding: 0.75rem 0.75rem; text-align: center;">
                                                ${badgeRisco}
                                            </td>
                                            <td style="padding: 0.5rem 1rem;">
                                                <input type="text" 
                                                       class="form-input print-deliberacao-input" 
                                                       style="padding: 0.35rem 0.5rem; font-size: 0.8125rem;" 
                                                       value="${window.escapeHTML(aluno.deliberacao || '')}" 
                                                       placeholder="Observações do Conselho..."
                                                       onchange="ataConselhoView.salvarDeliberacao('${turmaAtual.id}', '${aluno.id}', this.value)">
                                            </td>
                                        </tr>
                                    `;
                                }).join('') : `
                                    <tr>
                                        <td colspan="10" style="padding: 3rem; text-align: center; color: var(--color-slate-400);">
                                            Nenhum estudante matriculado nesta turma.
                                        </td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- SEÇÃO DE ASSINATURAS FORMAIS (Visível apenas na impressão) -->
                <div class="print-signatures" style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #cbd5e1;">
                    <p style="font-size: 0.75rem; color: #64748b; text-align: justify; margin-bottom: 2rem; line-height: 1.4;">
                        Aos ${new Date().toLocaleDateString('pt-BR')}, reuniu-se o Conselho de Classe para analisar o desempenho pedagógico e a assiduidade dos estudantes acima relacionados. Lavrada a presente ata que, após lida e aprovada, vai assinada pelos membros do Conselho.
                    </p>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2rem; text-align: center; font-size: 0.75rem;">
                        <div style="border-top: 1px solid #0f172a; padding-top: 0.5rem;">
                            <strong>Professor(a) Regente</strong>
                            <p style="color: #64748b; margin-top: 0.125rem;">Docente Titular</p>
                        </div>
                        <div style="border-top: 1px solid #0f172a; padding-top: 0.5rem;">
                            <strong>Coordenação Pedagógica</strong>
                            <p style="color: #64748b; margin-top: 0.125rem;">Gestão de Aprendizagem</p>
                        </div>
                        <div style="border-top: 1px solid #0f172a; padding-top: 0.5rem;">
                            <strong>Direção Escolar</strong>
                            <p style="color: #64748b; margin-top: 0.125rem;">Gestão Escolar</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        uiController.initAllDropdowns(container);
        renderKatex(container);
    },

    _calcularDadosConselho(turma) {
        if (!turma || !Array.isArray(turma.alunos)) return [];

        return turma.alunos.map(aluno => {
            const resumo = model.getResumoAcademico ? model.getResumoAcademico(turma.id, aluno.id, turma, aluno) : null;
            const periodos = resumo?.periodos || {};
            const n1 = periodos[1] !== undefined ? Number(periodos[1]) : null;
            const n2 = periodos[2] !== undefined ? Number(periodos[2]) : null;
            const n3 = periodos[3] !== undefined ? Number(periodos[3]) : null;
            const n4 = periodos[4] !== undefined ? Number(periodos[4]) : null;
            const mediaFinal = resumo?.mediaAnual !== undefined ? Number(resumo.mediaAnual) : 0;

            const freqObj = aluno.frequencia || {};
            let totalReg = 0, totalFaltas = 0;
            Object.values(freqObj).forEach(v => {
                if (v === 'P' || v === 'F' || v === 'J') totalReg++;
                if (v === 'F') totalFaltas++;
            });
            const freqPct = totalReg > 0 ? Math.round(((totalReg - totalFaltas) / totalReg) * 100) : 100;

            let riscoTipo = 'aprovado';
            let riscoLabel = 'Satisfatório';

            if (mediaFinal < 6.0 && freqPct < 75) {
                riscoTipo = 'critico';
                riscoLabel = 'Risco Crítico (Nota & Freq)';
            } else if (mediaFinal < 6.0) {
                riscoTipo = 'rendimento';
                riscoLabel = 'Risco de Rendimento (< 6.0)';
            } else if (freqPct < 75) {
                riscoTipo = 'frequencia';
                riscoLabel = 'Risco de Infrequência (< 75%)';
            }

            const statusGeral = (mediaFinal >= 6.0 && freqPct >= 75) ? 'aprovado' : 'recuperacao';

            return {
                id: aluno.id,
                matricula: aluno.matricula || aluno.id.slice(-6).toUpperCase(),
                nome: aluno.nome || 'Sem Nome',
                n1, n2, n3, n4,
                mediaFinal,
                totalAulas: totalReg,
                totalFaltas,
                freqPct,
                riscoTipo,
                risco: riscoLabel,
                situacao: statusGeral === 'aprovado' ? 'Aprovado' : 'Conselho / Recuperação',
                deliberacao: aluno.deliberacaoConselho || (statusGeral === 'aprovado' ? 'Aprovado por rendimento e assiduidade regular.' : 'Encaminhado para recuperação final / deliberação pedagógica.')
            };
        });
    },

    selecionarTurma(turmaId) {
        this.turmaIdSelecionada = turmaId;
        this.render('view-container');
    },

    async salvarDeliberacao(turmaId, alunoId, texto) {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        const aluno = (turma.alunos || []).find(a => String(a.id) === String(alunoId));
        if (!aluno) return;

        aluno.deliberacaoConselho = texto;
        if (model.saveTurma) {
            await model.saveTurma(turma);
        }
        Toast.show("Deliberação registrada.", "success");
    },

    exportarCSV() {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(this.turmaIdSelecionada));
        if (!turma) return Toast.show("Selecione uma turma.", "warning");

        const dados = this._calcularDadosConselho(turma);
        const config = model.state.userConfig || {};
        storageService.exportarAtaConselhoCSV(turma, dados, {
            escola: config.school || config.escola || 'Unidade Escolar',
            anoLetivo: config.anoLetivo || 2026
        });
        Toast.show("Arquivo CSV exportado com sucesso!", "success");
    },

    exportarJSON() {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(this.turmaIdSelecionada));
        if (!turma) return Toast.show("Selecione uma turma.", "warning");

        const dados = this._calcularDadosConselho(turma);
        const config = model.state.userConfig || {};
        storageService.exportarAtaConselhoJSON(turma, dados, {
            escola: config.school || config.escola || 'Unidade Escolar',
            anoLetivo: config.anoLetivo || 2026,
            estatisticas: {
                totalEstudantes: dados.length,
                aprovados: dados.filter(d => d.situacao === 'Aprovado').length,
                emRisco: dados.filter(d => d.riscoTipo !== 'aprovado').length
            }
        });
        Toast.show("Arquivo JSON gerado para interoperabilidade.", "success");
    },

    // =========================================================================
    // IMPRESSÃO DE ATA OFICIAL DO CONSELHO DE CLASSE (A4 LANDSCAPE)
    // =========================================================================

    imprimir() {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(this.turmaIdSelecionada));
        if (!turma) return Toast.show("Selecione uma turma para imprimir a Ata do Conselho.", "warning");

        const config = model.state.userConfig || {};
        const escola = config.school || config.escola || 'Unidade Escolar';
        const anoLetivo = config.anoLetivo || new Date().getFullYear();
        const dados = this._calcularDadosConselho(turma);

        let linhasHtml = '';
        dados.forEach((d, idx) => {
            const numChamada = idx + 1;
            const corStatus = d.situacao === 'Aprovado' ? '#15803d' : '#dc2626';

            linhasHtml += `
                <tr>
                    <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-weight: 700; font-size: 0.75rem;">${numChamada}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 4px; font-weight: 600; font-size: 0.75rem;">${window.escapeHTML(d.nome)}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-size: 0.75rem;">${d.mediaFinal.toFixed(1)}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-size: 0.75rem;">${d.totalFaltas}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-size: 0.75rem;">${d.freqPct}%</td>
                    <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-weight: 700; font-size: 0.75rem; color: ${corStatus};">${d.situacao}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 4px; font-size: 0.7rem; color: #475569;">${window.escapeHTML(d.deliberacao)}</td>
                </tr>
            `;
        });

        const printWindow = window.open('', '_blank');
        if (!printWindow) return Toast.show("Permita pop-ups para visualizar a impressão.", "warning");

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Ata Eletrônica do Conselho de Classe — ${window.escapeHTML(turma.nome)}</title>
                <style>
                    @page { size: A4 landscape; margin: 10mm; }
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 0; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 12px; }
                    .header h2 { margin: 0; font-size: 1.1rem; text-transform: uppercase; }
                    .header p { margin: 2px 0 0 0; font-size: 0.8rem; color: #475569; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
                    th { background-color: #f1f5f9; color: #1e293b; font-weight: 800; }
                    .assinaturas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 20px; text-align: center; font-size: 0.75rem; color: #475569; }
                    .linha-ass { border-top: 1px solid #0f172a; margin-top: 25px; padding-top: 4px; font-weight: 700; }
                    .footer { display: flex; justify-content: space-between; font-size: 0.7rem; color: #64748b; margin-top: 14px; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h2>${window.escapeHTML(escola)} — Ata de Resultados Finais do Conselho de Classe</h2>
                        <p><strong>Turma:</strong> ${window.escapeHTML(turma.nome)} &nbsp;|&nbsp; <strong>Ano Letivo:</strong> ${anoLetivo}</p>
                    </div>
                    <div style="text-align: right; font-size: 0.75rem; color: #475569;">
                        <p>Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="border: 1px solid #cbd5e1; padding: 4px; width: 35px;">Nº</th>
                            <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: left; width: 180px;">Estudante</th>
                            <th style="border: 1px solid #cbd5e1; padding: 4px; width: 55px;">Média</th>
                            <th style="border: 1px solid #cbd5e1; padding: 4px; width: 55px;">Faltas</th>
                            <th style="border: 1px solid #cbd5e1; padding: 4px; width: 60px;">Freq %</th>
                            <th style="border: 1px solid #cbd5e1; padding: 4px; width: 110px;">Resultado</th>
                            <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: left;">Parecer / Deliberação do Conselho</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasHtml}
                    </tbody>
                </table>

                <div class="assinaturas">
                    <div>
                        <div class="linha-ass">Professor(a) Regente / Titular</div>
                    </div>
                    <div>
                        <div class="linha-ass">Coordenação Pedagógica</div>
                    </div>
                    <div>
                        <div class="linha-ass">Direção Escolar</div>
                    </div>
                </div>

                <div class="footer">
                    <span>Documento Oficial Registrado via Planner Pro Docente</span>
                    <span>Página 1 de 1</span>
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
    // ATA OFICIAL DE REUNIÃO DE PAIS E MESTRES (A4 PORTRAIT)
    // =========================================================================

    abrirModalAtaReuniaoPais() {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(this.turmaIdSelecionada));
        if (!turma) return Toast.show("Selecione uma turma.", "warning");

        const modalHtml = `
            <div id="modal-ata-pais" class="modal-overlay modal-enter" style="display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 9999;">
                <div class="card p-6" style="max-width: 560px; width: 90%; background: var(--color-white); border-radius: var(--radius-2xl); box-shadow: var(--shadow-2xl); border: 1px solid var(--color-slate-200);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-users" style="color: var(--color-primary);"></i> Ata de Reunião de Pais & Mestres
                        </h3>
                        <button type="button" onclick="document.getElementById('modal-ata-pais').remove()" class="btn-icon" style="border: none; background: none; cursor: pointer; color: var(--color-slate-400);">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <p style="font-size: 0.875rem; color: var(--color-slate-600); margin-bottom: 1rem;">
                        Turma: <strong>${window.escapeHTML(turma.nome)}</strong>
                    </p>

                    <form id="form-ata-pais" onsubmit="event.preventDefault(); ataConselhoView.gerarAtaPaisA4('${turma.id}');">
                        <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div>
                                    <label class="form-label" style="font-weight: 700;">Data da Reunião</label>
                                    <input type="date" id="ap-data" class="form-input" required value="${new Date().toISOString().split('T')[0]}" />
                                </div>
                                <div>
                                    <label class="form-label" style="font-weight: 700;">Bimestre / Período</label>
                                    <input type="text" id="ap-periodo" class="form-input" required placeholder="Ex: 1º Bimestre" value="1º Bimestre" />
                                </div>
                            </div>

                            <div>
                                <label class="form-label" style="font-weight: 700;">Pauta & Assuntos Tratados</label>
                                <textarea id="ap-pauta" class="form-input" rows="3" required placeholder="Descreva os pontos principais apresentados aos pais..."></textarea>
                            </div>

                            <div>
                                <label class="form-label" style="font-weight: 700;">Combinados com as Famílias</label>
                                <textarea id="ap-combinados" class="form-input" rows="2" placeholder="Ex: Acompanhamento das tarefas de casa, horários de chegada..."></textarea>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                            <button type="button" onclick="document.getElementById('modal-ata-pais').remove()" class="btn-secondary">Cancelar</button>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-print"></i> Imprimir Ata A4 (com Lista)
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    gerarAtaPaisA4(turmaId) {
        const turma = (model.state.turmas || []).find(t => String(t.id) === String(turmaId));
        if (!turma) return;

        const dataVal = document.getElementById('ap-data')?.value || new Date().toISOString().split('T')[0];
        const periodoVal = document.getElementById('ap-periodo')?.value.trim() || '1º Bimestre';
        const pautaVal = document.getElementById('ap-pauta')?.value.trim() || '';
        const combinadosVal = document.getElementById('ap-combinados')?.value.trim() || '';

        if (!pautaVal) return Toast.show("Preencha a pauta da reunião.", "warning");

        const config = model.state.userConfig || {};
        const escola = config.school || config.escola || 'Unidade Escolar';
        const anoLetivo = config.anoLetivo || new Date().getFullYear();
        const alunos = turma.alunos || [];

        const dataFormatada = new Date(dataVal + 'T00:00:00').toLocaleDateString('pt-BR');

        const modal = document.getElementById('modal-ata-pais');
        if (modal) modal.remove();

        const printWindow = window.open('', '_blank');
        if (!printWindow) return Toast.show("Permita pop-ups para visualizar a impressão.", "warning");

        const linhasAlunos = alunos.map((a, idx) => `
            <tr>
                <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: 700;">${window.escapeHTML(a.nome)}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px; color: #64748b;">${window.escapeHTML(a.responsavel || 'Pai / Mãe / Responsável')}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px; width: 220px;"></td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Ata de Reunião de Pais — ${window.escapeHTML(turma.nome)}</title>
                <style>
                    @page { size: A4 portrait; margin: 12mm; }
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 0; }
                    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 14px; }
                    .header h2 { margin: 0; font-size: 1.1rem; text-transform: uppercase; }
                    .header p { margin: 2px 0 0 0; font-size: 0.8rem; color: #475569; }
                    .title-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; text-align: center; font-weight: 800; font-size: 0.9rem; text-transform: uppercase; margin-bottom: 14px; color: #1e293b; }
                    .section { margin-bottom: 14px; }
                    .section-title { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; color: #1e293b; }
                    .box { border: 1px solid #cbd5e1; padding: 8px; border-radius: 4px; font-size: 0.78rem; color: #334155; line-height: 1.4; background: #f8fafc; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.75rem; }
                    th { background: #f1f5f9; font-weight: 800; border: 1px solid #cbd5e1; padding: 6px; text-align: center; }
                    .assinaturas { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; margin-top: 40px; text-align: center; font-size: 0.75rem; }
                    .linha-ass { border-top: 1px solid #0f172a; padding-top: 4px; font-weight: 700; }
                    .footer { font-size: 0.65rem; color: #94a3b8; margin-top: 20px; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>${window.escapeHTML(escola)}</h2>
                    <p>Ano Letivo: ${anoLetivo} &nbsp;|&nbsp; Turma: ${window.escapeHTML(turma.nome)} &nbsp;|&nbsp; Data: ${dataFormatada} (${periodoVal})</p>
                </div>

                <div class="title-box">
                    ATA OFICIAL DE REUNIÃO DE PAIS E MESTRES
                </div>

                <div class="section">
                    <div class="section-title">1. Pauta & Assuntos Tratados</div>
                    <div class="box">${window.escapeHTML(pautaVal)}</div>
                </div>

                ${combinadosVal ? `
                <div class="section">
                    <div class="section-title">2. Combinados Pedagógicos com as Famílias</div>
                    <div class="box">${window.escapeHTML(combinadosVal)}</div>
                </div>
                ` : ''}

                <div class="section">
                    <div class="section-title">3. Lista de Presença e Termo de Ciência dos Responsáveis</div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 35px;">Nº</th>
                                <th style="text-align: left;">Estudante</th>
                                <th style="text-align: left;">Responsável Legal</th>
                                <th>Assinatura do Responsável</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${linhasAlunos}
                        </tbody>
                    </table>
                </div>

                <div class="assinaturas">
                    <div><div class="linha-ass">Professor(a) Regente</div></div>
                    <div><div class="linha-ass">Coordenação Pedagógica</div></div>
                </div>

                <div class="footer">
                    Ata emitida via Planner Pro Docente em ${new Date().toLocaleDateString('pt-BR')}
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
    window.ataConselhoView = ataConselhoView;
}
