import { model } from '../model.js';
import { controller } from '../controller.js';
export const turmasView = {
    confirmandoExclusao: null,
    periodoAtivo: 1,
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        this.confirmandoExclusao = null;
        const turmas = model.state.turmas || [];

        const html = `
            <div class="fade-in pb-20">
                <div class="view-header animate-enter">
                    <div>
                        <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Minhas Turmas</h2>
                        <p class="text-slate-500 mt-1">Gerencie alunos, notas e avaliações.</p>
                    </div>
                    <button type="button" onclick="controller.openAddTurma()" class="btn-primary interactive-element flex items-center gap-2" style="background-color: #4f46e5; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.25);">
                        <i class="fas fa-plus"></i> <span>Nova Turma</span>
                    </button>
                </div>
                ${turmas.length === 0
                ? `<div class="tool-empty-state animate-enter">
                          <div class="tool-empty-state__icon-wrap">
                             <i class="fas fa-users"></i>
                          </div>
                          <h3 class="tool-empty-state__title">Nenhuma turma encontrada</h3>
                          <p class="tool-empty-state__desc">Comece criando sua primeira turma para registrar alunos e notas.</p>
                          <button type="button" onclick="controller.openAddTurma()" class="btn-primary interactive-element" style="background-color: #4f46e5;">Criar Turma Agora</button>
                        </div>`
                : `<div class="stat-grid stat-grid--3 animate-enter">
                            ${turmas.map(t => this._renderCardTurma(t)).join('')}
                        </div>`
            }
            </div>
        `;

        container.innerHTML = html;
    },
    _renderCardTurma(turma) {
        const serieNum = turma.serie ? turma.serie.replace(/\D/g, '') : '?';

        return `
            <div onclick="controller.views['turmas'].renderDetalhesTurma('view-container', '${turma.id}')"
                  class="stat-card interactive-element cursor-pointer group relative overflow-hidden">
                <div class="flex justify-between items-start mb-4">
                    <div style="background-color: #eef2ff; color: #4f46e5; width: 3rem; height: 3rem; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 700;">
                        ${serieNum}
                    </div>
                    <div class="text-right">
                        <span class="text-xs-micro font-bold uppercase tracking-wider text-slate-400 block">${window.escapeHTML(turma.nivel)}</span>
                        <span class="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md mt-1 inline-block">${turma.alunos.length} alunos</span>
                    </div>
                </div>
                <h3 class="font-bold text-slate-800 text-lg mb-1 group-hover:text-indigo-600 transition-colors">${window.escapeHTML(turma.nome)}</h3>
                <p class="text-xs text-slate-400 truncate">${window.escapeHTML(turma.serie)} - ${window.escapeHTML(turma.identificador)}</p>
                <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: linear-gradient(to right, #4f46e5, #06b6d4); opacity: 0; transition: opacity 0.2s;" class="group-hover:opacity-100"></div>
            </div>
        `;
    },
    iniciarExclusao(id) {
        this.confirmandoExclusao = id;
        this.renderDetalhesTurma('view-container', id);
    },
    cancelarExclusao(id) {
        this.confirmandoExclusao = null;
        this.renderDetalhesTurma('view-container', id);
    },
    gerarBotaoExcluir(turmaId) {
        if (this.confirmandoExclusao === turmaId) {
            return `
                <div style="display: flex; align-items: center; gap: var(--spacing-2); animation: bounceIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;">
                    <button onclick="controller.deleteTurma('${turmaId}')" class="btn-primary" style="background-color: #ef4444; box-shadow: var(--shadow-md); display: flex; align-items: center; gap: var(--spacing-2);">
                        <i class="fas fa-exclamation-circle"></i> Confirmar?
                    </button>
                    <button onclick="turmasView.cancelarExclusao('${turmaId}')" class="btn-icon" style="background-color: var(--color-slate-100); color: var(--color-slate-500);" title="Cancelar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }
        return `
            <button onclick="turmasView.iniciarExclusao('${turmaId}')" class="btn-icon" style="background-color: #fef2f2; color: #ef4444;" title="Excluir Turma">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
    },
    renderDetalhesTurma(container, turmaId) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return controller.navigate('turmas');
        const tipoConfig = (model.state.userConfig && model.state.userConfig.periodType) || 'bimestre';
        const numPeriodos = tipoConfig === 'bimestre' ? 4 : tipoConfig === 'trimestre' ? 3 : 2;
        const avaliacoesFiltradas = (turma.avaliacoes || []).filter(av => Number(av.periodo || 1) === this.periodoAtivo);
        const statsPeriodo = this._calcularEstatisticas(turma, avaliacoesFiltradas);
        const statsGeral = this._calcularEstatisticas(turma, turma.avaliacoes || []);
        const gradientPeriodo = this._gerarGradientDonut(statsPeriodo);
        const gradientGeral = this._gerarGradientDonut(statsGeral);

        const html = `
            <div class="fade-in" style="padding-bottom: 5rem;">
                <div style="display: flex; flex-direction: row; gap: var(--spacing-4); justify-content: space-between; align-items: center; margin-bottom: var(--spacing-8); flex-wrap: wrap;">
                    <button onclick="controller.navigate('turmas')" style="color: var(--color-slate-400); font-weight: 700; display: flex; align-items: center; gap: var(--spacing-2); font-size: 0.875rem; background: none; border: none; cursor: pointer; transition: color var(--transition-fast);" onmouseover="this.style.color='var(--color-slate-700)'" onmouseout="this.style.color='var(--color-slate-400)'">
                        <i class="fas fa-arrow-left"></i> Voltar
                    </button>
                    <div style="flex: 1; min-width: 250px;">
                        <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--color-slate-800);"><span style="color: var(--color-primary);">${window.escapeHTML(turma.nome)}</span></h2>
                        <div style="display: flex; gap: var(--spacing-4); font-size: 0.75rem; font-weight: 700; color: var(--color-slate-500); margin-top: 0.25rem;">
                            <span><i class="fas fa-graduation-cap" style="margin-right: 0.25rem;"></i> ${window.escapeHTML(turma.nivel)}</span>
                            <span><i class="fas fa-users" style="margin-right: 0.25rem;"></i> ${turma.alunos.length} Alunos</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: var(--spacing-2); align-items: center; flex-wrap: wrap;">
                         <button onclick="controller.navigate('notas-anuais')" class="btn-outline" style="height: 2.5rem; color: #4f46e5; background-color: #eef2ff; border-color: #e0e7ff;" onmouseover="this.style.backgroundColor='#e0e7ff'" onmouseout="this.style.backgroundColor='#eef2ff'">
                            <i class="fas fa-award" style="margin-right: 0.5rem;"></i> Notas Anuais
                        </button>
                         <button onclick="controller.openAddAvaliacao('${turmaId}')" class="btn-outline" style="height: 2.5rem;">
                            <i class="fas fa-file-alt" style="margin-right: 0.5rem;"></i> Nova Avaliação
                        </button>
                        <button onclick="controller.openAddAluno('${turmaId}')" class="btn-primary" style="height: 2.5rem;">
                            <i class="fas fa-user-plus" style="margin-right: 0.5rem;"></i> Novo Aluno
                        </button>
                        ${this.gerarBotaoExcluir(turmaId)}
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: var(--spacing-2); margin-bottom: var(--spacing-6); padding: var(--spacing-1); background-color: var(--color-slate-100); border-radius: var(--radius-2xl); width: fit-content; border: 1px solid var(--color-slate-200); overflow-x: auto;">
                    ${Array.from({ length: numPeriodos }, (_, i) => `
                        <button onclick="turmasView.mudarPeriodo('${turmaId}', ${i + 1})"
                                 style="padding: 0.5rem 1.5rem; border-radius: var(--radius-xl); font-size: 0.75rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; transition: all var(--transition-fast); cursor: pointer; border: none; white-space: nowrap; ${this.periodoAtivo === (i + 1) ? 'background-color: var(--color-white); color: var(--color-primary); box-shadow: var(--shadow-sm);' : 'background-color: transparent; color: var(--color-slate-500);'}"
                                 onmouseover="if(${this.periodoAtivo !== (i + 1)}) this.style.color='var(--color-slate-700)'"
                                 onmouseout="if(${this.periodoAtivo !== (i + 1)}) this.style.color='var(--color-slate-500)'">
                            ${i + 1}º ${tipoConfig.slice(0, 3)}
                        </button>
                    `).join('')}
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--spacing-6); margin-bottom: var(--spacing-8);">
                    <!-- ESTATÍSTICA DO PERÍODO -->
                    <div class="card" style="padding: var(--spacing-6); position: relative; overflow: hidden;">
                        <h3 style="font-size: 0.875rem; font-weight: 800; color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--spacing-4); border-bottom: 1px solid rgba(var(--color-primary-rgb), 0.1); padding-bottom: var(--spacing-2);">
                            <i class="fas fa-chart-pie" style="margin-right: 0.5rem;"></i> Desempenho: ${this.periodoAtivo}º Período
                        </h3>
                        <div style="display: flex; flex-direction: row; align-items: center; gap: var(--spacing-6); flex-wrap: wrap;">
                            <div style="position: relative; flex-shrink: 0;">
                                <div id="grafico-rosca" class="chart-donut" style="${gradientPeriodo}"></div>
                                <div class="chart-center-text">
                                    <span id="media-rosca" style="font-size: 1.75rem; font-weight: 900; color: var(--color-slate-800); line-height: 1;">${statsPeriodo.mediaGeral}</span>
                                    <span style="font-size: 0.625rem; font-weight: 800; color: var(--color-slate-400); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.125rem;">Média</span>
                                </div>
                            </div>
                            <div style="flex: 1; width: 100%;">
                                <div id="legenda-rosca" style="display: grid; grid-template-columns: 1fr 1fr; row-gap: var(--spacing-3); column-gap: var(--spacing-4);">
                                    ${this._renderLegenda(statsPeriodo)}
                                </div>
                                ${statsPeriodo.distribuicao.vermelho > 0 || statsPeriodo.distribuicao.laranja > 0 ? `
                                    <div style="margin-top: var(--spacing-4); background-color: #fff7ed; border: 1px solid #ffedd5; padding: var(--spacing-3); border-radius: var(--radius-xl); display: flex; align-items: flex-start; gap: var(--spacing-3);">
                                        <i class="fas fa-exclamation-triangle" style="color: #f97316; margin-top: 0.125rem;"></i>
                                        <div>
                                            <p style="font-size: 0.75rem; font-weight: 700; color: #c2410c;">Atenção no Período</p>
                                            <p style="font-size: 0.625rem; color: #ea580c; line-height: 1.625;">
                                                Há <strong>${statsPeriodo.distribuicao.vermelho + statsPeriodo.distribuicao.laranja} alunos</strong> abaixo de 5,0.
                                            </p>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <!-- ESTATÍSTICA GERAL -->
                    <div class="card" style="padding: var(--spacing-6); position: relative; overflow: hidden;">
                        <h3 style="font-size: 0.875rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--spacing-4); border-bottom: 1px solid var(--color-slate-100); padding-bottom: var(--spacing-2);">
                            <i class="fas fa-globe" style="margin-right: 0.5rem;"></i> Desempenho Geral (Ano Letivo)
                        </h3>
                        <div style="display: flex; flex-direction: row; align-items: center; gap: var(--spacing-6); flex-wrap: wrap;">
                            <div style="position: relative; flex-shrink: 0;">
                                <div id="grafico-rosca-geral" class="chart-donut" style="${gradientGeral}"></div>
                                <div class="chart-center-text">
                                    <span id="media-rosca-geral" style="font-size: 1.75rem; font-weight: 900; color: var(--color-slate-800); line-height: 1;">${statsGeral.mediaGeral}</span>
                                    <span style="font-size: 0.625rem; font-weight: 800; color: var(--color-slate-400); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.125rem;">Média</span>
                                </div>
                            </div>
                            <div style="flex: 1; width: 100%;">
                                <div id="legenda-rosca-geral" style="display: grid; grid-template-columns: 1fr 1fr; row-gap: var(--spacing-3); column-gap: var(--spacing-4);">
                                    ${this._renderLegenda(statsGeral)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="background-color: var(--color-white); border-radius: var(--radius-2xl); box-shadow: var(--shadow-sm); border: 1px solid var(--color-slate-200); overflow: hidden;">
                    <div style="padding: var(--spacing-4); background-color: var(--color-slate-50); border-bottom: 1px solid var(--color-slate-200); display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="font-weight: 700; color: var(--color-slate-700); font-size: 0.875rem;">Diário de Notas - ${this.periodoAtivo}º Período</h3>
                        <div style="font-size: 0.75rem; color: var(--color-slate-400); text-transform: uppercase; font-weight: 700; letter-spacing: -0.05em;">
                             Calculado base 10
                        </div>
                    </div>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; text-align: left; border-collapse: collapse;">
                            <thead>
                                <tr style="background-color: rgba(248, 250, 252, 0.5);">
                                    <th style="padding: var(--spacing-4); font-size: 0.75rem; font-weight: 700; color: var(--color-slate-500); text-transform: uppercase; width: 2.5rem;">#</th>
                                    <th style="padding: var(--spacing-4); font-size: 0.75rem; font-weight: 700; color: var(--color-slate-500); text-transform: uppercase; min-width: 200px;">Nome do Aluno</th>
                                    ${avaliacoesFiltradas.map(av => `
                                        <th style="padding: var(--spacing-2); text-align: center; min-width: 100px; position: relative;" class="hover-group">
                                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                                <span style="font-size: 0.625rem; font-weight: 700; color: var(--color-slate-400); text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px;" title="${window.escapeHTML(av.nome)}">${window.escapeHTML(av.nome)}</span>
                                                <div style="display: flex; align-items: center; gap: 0.25rem; margin-top: 0.125rem;">
                                                    <span style="font-size: 0.5625rem; color: var(--color-slate-400); background-color: var(--color-slate-100); padding: 0 0.375rem; border-radius: 0.25rem;">${av.periodo || 1}º Per.</span>
                                                    <span style="font-size: 0.5625rem; color: var(--color-slate-300);">Max: ${av.max}</span>
                                                </div>
                                            </div>
                                            <button onclick="controller.deleteAvaliacao('${turmaId}', '${av.id}')" style="position: absolute; top: 0.25rem; right: 0.25rem; color: var(--color-slate-300); background: none; border: none; cursor: pointer; transition: color var(--transition-fast);" class="hover-show" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='var(--color-slate-300)'">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        </th>
                                    `).join('')}
                                    <th style="padding: var(--spacing-4); font-size: 0.75rem; font-weight: 700; color: var(--color-slate-500); text-transform: uppercase; text-align: center; width: 6rem; background-color: var(--color-slate-50); border-left: 1px solid var(--color-slate-100);">Soma Per.</th>
                                    <th style="padding: var(--spacing-4); width: 2.5rem;"></th>
                                </tr>
                            </thead>
                            <tbody style="border-top: 1px solid var(--color-slate-100);">
                                ${turma.alunos.length === 0
                ? '<tr><td colspan="100%" style="padding: 2rem; text-align: center; color: var(--color-slate-400); font-size: 0.875rem;">Nenhum aluno cadastrado.</td></tr>'
                : turma.alunos.map((aluno, idx) => {

                    const status = aluno.status || 'cursando';
                    const chamada = aluno.chamada || (idx + 1);
                    const matricula = aluno.matricula || '';
                    let statusBadge = '';
                    let rowStyle = 'transition: background-color var(--transition-fast);';
                    let opacityInputs = '';
                    let rowClass = 'hover-row-default';
                    if (status === 'transferido') {
                        statusBadge = `<span style="background-color: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; font-size: 0.5625rem; padding: 0 0.5rem; border-radius: 0.25rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.1em; margin-left: 0.5rem;">Transferido</span>`;
                        rowClass = 'hover-row-red';
                        opacityInputs = 'opacity: 0.5; filter: grayscale(1); cursor: not-allowed;';
                    } else if (status === 'realocado') {
                        statusBadge = `<span style="background-color: #fffbeb; color: #d97706; border: 1px solid #fef3c7; font-size: 0.5625rem; padding: 0 0.5rem; border-radius: 0.25rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.1em; margin-left: 0.5rem;">Realocado</span>`;
                        rowClass = 'hover-row-amber';
                        opacityInputs = 'opacity: 0.5; filter: grayscale(1); cursor: not-allowed;';
                    }
                    const somaPeriodo = avaliacoesFiltradas.reduce((acc, av) => acc + (Number(aluno.notas?.[av.id]) || 0), 0);
                    const freq = this._calcularFrequencia(aluno);
                    const totalDistribuido = avaliacoesFiltradas.reduce((acc, av) => acc + Number(av.max), 0);
                    const mediaPerc = totalDistribuido > 0 ? (somaPeriodo / totalDistribuido) * 100 : 100;

                    const riscoFrequencia = freq < 75;
                    const riscoNota = totalDistribuido > 0 && mediaPerc < 60;

                    let alertaHtml = '';
                    if ((riscoFrequencia || riscoNota) && status === 'cursando') {
                        const motivos = [];
                        if (riscoFrequencia) motivos.push(`Freq: ${freq.toFixed(0)}%`);
                        if (riscoNota) motivos.push('Nota Baixa');
                        alertaHtml = `<div style="font-size: 0.625rem; font-weight: 700; color: #ef4444; background-color: #fef2f2; padding: 0.25rem 0.5rem; border-radius: 0.25rem; border: 1px solid #fee2e2; margin-top: 0.5rem; width: fit-content; display: flex; align-items: center; gap: 0.25rem;" title="Alerta de Risco Preventivo"><i class="fas fa-exclamation-circle"></i> ${motivos.join(', ')}</div>`;
                    }
                    return `
                                            <tr class="${rowClass}" style="border-bottom: 1px solid var(--color-slate-100);">
                                                <td style="padding: var(--spacing-4); font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); text-align: center;">${window.escapeHTML(String(chamada))}</td>
                                                <td style="padding: var(--spacing-4);">
                                                    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.25rem;">
                                                        <div style="font-weight: 700; font-size: 0.875rem; ${status === 'cursando' ? 'color: var(--color-slate-700);' : 'color: var(--color-slate-500); text-decoration: line-through;'}">${window.escapeHTML(aluno.nome)}</div>
                                                        ${statusBadge}
                                                    </div>
                                                    ${matricula ? `<div style="font-size: 0.625rem; color: var(--color-slate-400); font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 0.25rem;">MAT: ${window.escapeHTML(matricula)}</div>` : ''}
                                                    ${alertaHtml}
                                                </td>
                                                
                                                ${avaliacoesFiltradas.map(av => {
                        const nota = aluno.notas && aluno.notas[av.id] !== undefined ? aluno.notas[av.id] : '';
                        return `
                                                        <td style="padding: var(--spacing-2); text-align: center;">
                                                            <input type="number" 
                                                                    ${status !== 'cursando' ? 'disabled title="Aluno inativo"' : ''}
                                                                    value="${nota}" 
                                                                    placeholder="-"
                                                                    onchange="controller.updateNota('${turmaId}', '${aluno.id}', '${av.id}', this.value)"
                                                                    class="input-notas" style="width: 4rem; text-align: center; background-color: var(--color-white); border: 1px solid var(--color-slate-200); border-radius: var(--radius-lg); padding: 0.375rem 0; font-size: 0.875rem; font-weight: 700; color: var(--color-slate-700); transition: all var(--transition-fast); outline: none; ${opacityInputs}">
                                                        </td>
                                                    `;
                    }).join('')}
                                                
                                                <td style="padding: var(--spacing-2); text-align: center; border-left: 1px solid var(--color-slate-100); background-color: rgba(248, 250, 252, 0.3);">
                                                    <!-- ID soma-ALUNO_ID adicionado aqui -->
                                                    <div id="soma-${aluno.id}" style="width: 3rem; margin: 0 auto; padding: 0.25rem 0; border-radius: var(--radius-lg); font-weight: 900; font-size: 0.875rem; transition: all 0.3s; ${status === 'cursando' ? 'color: var(--color-primary);' : 'color: var(--color-slate-400);'}">
                                                        ${somaPeriodo.toFixed(1)}
                                                    </div>
                                                </td>
                                                
                                                <td style="padding: var(--spacing-4); text-align: center;">
                                                    <div style="display: flex; align-items: center; justify-content: center; gap: var(--spacing-2);">
                                                        <button onclick="controller.openAddAluno('${turmaId}', '${aluno.id}')" style="color: var(--color-slate-300); background: none; border: none; cursor: pointer; transition: color var(--transition-fast);" onmouseover="this.style.color='#3b82f6'" onmouseout="this.style.color='var(--color-slate-300)'" title="Editar Estudante">
                                                            <i class="fas fa-edit"></i>
                                                        </button>
                                                        <button onclick="controller.deleteAluno('${turmaId}', '${aluno.id}')" style="color: var(--color-slate-300); background: none; border: none; cursor: pointer; transition: color var(--transition-fast);" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='var(--color-slate-300)'" title="Excluir Estudante">
                                                            <i class="fas fa-trash-alt"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                }).join('')
            }
                            </tbody>
                        </table>
                    </div>
                    <div style="padding: var(--spacing-4); background-color: var(--color-slate-50); border-top: 1px solid var(--color-slate-200); display: flex; justify-content: flex-end;">
                         <button onclick="controller.openAddAlunoLote('${turmaId}')" style="font-size: 0.75rem; font-weight: 700; color: var(--color-primary); background: none; border: none; cursor: pointer; transition: color var(--transition-fast);" onmouseover="this.style.color='#1d4ed8'" onmouseout="this.style.color='var(--color-primary)'">
                            <i class="fas fa-file-import" style="margin-right: 0.25rem;"></i> Importar Lista
                         </button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },
    mudarPeriodo(turmaId, num) {
        this.periodoAtivo = num;
        this.renderDetalhesTurma('view-container', turmaId);
    },
    _calcularMediaAluno(aluno, avaliacoes) {
        if (!aluno.notas || avaliacoes.length === 0) return null;
        let totalPontos = 0;
        let totalMax = 0;
        let temNota = false;

        avaliacoes.forEach(av => {
            if (aluno.notas[av.id] !== undefined && aluno.notas[av.id] !== "") {
                totalPontos += parseFloat(aluno.notas[av.id]);
                totalMax += parseFloat(av.max);
                temNota = true;
            }
        });

        if (!temNota || totalMax === 0) return null;
        return (totalPontos / totalMax) * 10;
    },
    _calcularEstatisticas(turma, avaliacoesParaCalcular) {
        let stats = {
            totalAlunos: 0,
            mediaGeral: '-',
            distribuicao: { vermelho: 0, laranja: 0, azul: 0, ciano: 0, verde: 0 }
        };

        if (!turma.alunos || turma.alunos.length === 0 || !avaliacoesParaCalcular || avaliacoesParaCalcular.length === 0) return stats;

        let somaMedias = 0;
        let alunosComNota = 0;

        turma.alunos.forEach(aluno => {
            if (aluno.status === 'transferido') return;
            const media = this._calcularMediaAluno(aluno, avaliacoesParaCalcular);
            if (media !== null) {
                alunosComNota++;
                somaMedias += media;

                if (media < 3) stats.distribuicao.vermelho++;
                else if (media < 5) stats.distribuicao.laranja++;
                else if (media < 7) stats.distribuicao.azul++;
                else if (media < 9) stats.distribuicao.ciano++;
                else stats.distribuicao.verde++;
            }
        });

        stats.totalAlunos = alunosComNota;
        if (alunosComNota > 0) {
            stats.mediaGeral = (somaMedias / alunosComNota).toFixed(1);
        }

        return stats;
    },
    _gerarGradientDonut(stats) {
        let gradientParts = [];
        let currentPerc = 0;
        const cores = [
            { id: 'vermelho', cor: '#ef4444' },
            { id: 'laranja', cor: '#f97316' },
            { id: 'azul', cor: '#3b82f6' },
            { id: 'ciano', cor: '#06b6d4' },
            { id: 'verde', cor: '#10b981' }
        ];

        cores.forEach(c => {
            const count = stats.distribuicao ? (stats.distribuicao[c.id] || 0) : 0;
            const perc = stats.totalAlunos > 0 ? (count / stats.totalAlunos) * 100 : 0;
            if (perc > 0) {
                const start = currentPerc.toFixed(1);
                const end = (currentPerc + perc).toFixed(1);
                gradientParts.push(`${c.cor} ${start}% ${end}%`);
                currentPerc += perc;
            }
        });

        return gradientParts.length > 0
            ? `background: conic-gradient(${gradientParts.join(', ')});`
            : 'background: conic-gradient(#e2e8f0 0% 100%);';
    },
    _renderLegenda(stats) {
        const cores = [
            { id: 'vermelho', cor: '#ef4444', label: '1 - 2,99' },
            { id: 'laranja', cor: '#f97316', label: '3 - 4,99' },
            { id: 'azul', cor: '#3b82f6', label: '5 - 6,99' },
            { id: 'ciano', cor: '#06b6d4', label: '7 - 8,99' },
            { id: 'verde', cor: '#10b981', label: '9 - 10' }
        ];
        return cores.map(c => {
            const count = stats.distribuicao[c.id];
            const perc = stats.totalAlunos > 0 ? Math.round((count / stats.totalAlunos) * 100) : 0;
            const opacityStyle = count === 0 ? 'opacity: 0.4; filter: grayscale(1);' : '';
            return `
                <div style="display: flex; align-items: center; gap: var(--spacing-3); ${opacityStyle}">
                    <div style="width: 0.75rem; height: 0.75rem; border-radius: 50%; flex-shrink: 0; box-shadow: var(--shadow-sm); background-color: ${c.cor}"></div>
                    <div>
                        <p style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-700);">${c.label}</p>
                        <p style="font-size: 0.625rem; color: var(--color-slate-400); font-weight: 500;">${count} alunos (${perc}%)</p>
                    </div>
                </div>
            `;
        }).join('');
    },
    _calcularFrequencia(aluno) {
        if (!aluno.frequencia) return 100;

        const registros = Object.values(aluno.frequencia);
        const presencas = registros.filter(s => s === 'P').length;
        const faltas = registros.filter(s => s === 'F').length;
        const totalAulas = presencas + faltas;

        if (totalAulas === 0) return 100;
        return (presencas / totalAulas) * 100;
    },
    renderBoletimAnual(turmaId) {
        const turma = model.state.turmas.find(t => t.id == turmaId);
        if (!turma) return "";
        const tipo = model.state.userConfig.periodType || 'bimestre';
        const colunas = tipo === 'bimestre' ? 4 : tipo === 'trimestre' ? 3 : 2;
        return `
        <table style="width: 100%; font-size: 0.875rem; text-align: left; border: 1px solid var(--color-slate-100); border-collapse: collapse;">
            <thead style="background-color: var(--color-slate-50); color: var(--color-slate-500); text-transform: uppercase; font-size: 0.625rem; font-weight: 700;">
                <tr>
                    <th style="padding: var(--spacing-4);">Aluno</th>
                    ${Array.from({ length: colunas }, (_, i) => `<th style="padding: var(--spacing-4); text-align: center;">${i + 1}º</th>`).join('')}
                    <th style="padding: var(--spacing-4); text-align: center; color: var(--color-primary);">Média</th>
                </tr>
            </thead>
            <tbody>
                ${turma.alunos.map(aluno => {
            const resumo = model.getResumoAcademico(turma.id, aluno.id, turma, aluno);
            if (!resumo) return "";
            return `
                        <tr style="border-bottom: 1px solid var(--color-slate-100); transition: background-color var(--transition-fast);" onmouseover="this.style.backgroundColor='var(--color-slate-50)'" onmouseout="this.style.backgroundColor='transparent'">
                            <td style="padding: var(--spacing-4); font-weight: 500; color: var(--color-slate-700);">${window.escapeHTML(aluno.nome)}</td>
                            ${Array.from({ length: colunas }, (_, i) => {
                const nota = resumo.periodos[i + 1] || 0;
                return `<td style="padding: var(--spacing-4); text-align: center; color: ${nota < 6 ? '#ef4444' : 'var(--color-slate-600)'}">${nota.toFixed(1)}</td>`;
            }).join('')}
                            <td style="padding: var(--spacing-4); text-align: center; font-weight: 700; color: var(--color-primary);">${resumo.mediaAnual.toFixed(1)}</td>
                        </tr>
                    `;
        }).join('')}
            </tbody>
        </table>
    `;
    }
};
if (typeof window !== 'undefined') {
    window.turmasView = turmasView;
}
