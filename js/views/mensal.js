import { model } from '../model.js';
import { controller } from '../controller.js';
import { uiController } from '../controllers/uiController.js';
import { Toast } from '../components/toast.js';

export const mensalView = {
    currentMes: null,
    currentTurmaId: null,
    meses: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],

    render(container, turmaId = null) {
        if (typeof container === 'string') container = document.getElementById(container);

        // Se o contêiner de abas do planejamento (#subarea-planejamento-content) existir no DOM,
        // renderiza a view mensal dentro dele para não apagar o cabeçalho com as abas ("Por Período", "Mensal", "Diário").
        const subarea = document.getElementById('subarea-planejamento-content');
        if (subarea && (container === document.getElementById('view-container') || !container)) {
            container = subarea;
        } else if (!subarea && (container === document.getElementById('view-container') || !container)) {
            if (window.planejamentoView) {
                window.planejamentoView.abaAtiva = 'mensal';
                window.planejamentoView.render('view-container');
                return;
            }
        }

        if (!container) return;
        if (turmaId) this.currentTurmaId = turmaId;

        const turmas = model.state.turmas || [];

        if (this.currentTurmaId && !turmas.find(t => String(t.id) === String(this.currentTurmaId))) {
            this.currentTurmaId = null;
        }
        if (!this.currentTurmaId && turmas.length > 0) {
            this.currentTurmaId = turmas[0].id;
        }

        if (!this.currentMes) {
            const mesIndex = new Date().getMonth();
            this.currentMes = this.meses[mesIndex];
        }

        if (turmas.length === 0) {
            container.innerHTML = `
                <div class="card" style="padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 2px dashed var(--color-slate-200); max-width: 600px; margin: 2rem auto;">
                    <div style="width: 4rem; height: 4rem; border-radius: var(--radius-full); background-color: var(--color-slate-100); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; color: var(--color-slate-400); font-size: 1.5rem;">
                        <i class="fas fa-calendar-alt"></i>
                    </div>
                    <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.5rem;">Nenhuma turma cadastrada</h3>
                    <p style="color: var(--color-slate-500); font-size: 0.875rem; margin-bottom: 1.5rem;">Cadastre uma turma para organizar o planejamento mensal.</p>
                    <button onclick="controller.navigate('turmas')" class="btn-primary">
                        <i class="fas fa-plus"></i> <span>Cadastrar Turmas</span>
                    </button>
                </div>
            `;
            return;
        }

        const turmaAtual = turmas.find(t => String(t.id) === String(this.currentTurmaId));
        const periodoSugestao = this.identificarPeriodo(this.currentMes);

        const habilidadesDoPeriodo = turmaAtual.planejamento && turmaAtual.planejamento[periodoSugestao]
        const periodosDoMes = (model.getPeriodosDoMes ? model.getPeriodosDoMes(this.currentMes) : [periodoSugestao]) || [periodoSugestao];
        const habilidadesDoMes = turmaAtual.planejamentoMensal && turmaAtual.planejamentoMensal[this.currentMes]
            ? [...turmaAtual.planejamentoMensal[this.currentMes]]
            : [];

        habilidadesDoMes.sort((a, b) => {
            const codA = String(a.codigo || "");
            const codB = String(b.codigo || "");
            return codA.localeCompare(codB, undefined, { numeric: true });
        });

        const codigosNoMes = new Set(habilidadesDoMes.map(h => h.codigo));

        // Agrupa sugestões por cada período que intersecta o mês atual
        const blocosSugestoes = periodosDoMes.map(p => {
            const habsPeriodo = (turmaAtual.planejamento && turmaAtual.planejamento[p]) ? [...turmaAtual.planejamento[p]] : [];
            const filtradas = habsPeriodo.filter(h => !codigosNoMes.has(h.codigo));
            return {
                periodo: p,
                total: habsPeriodo.length,
                sugestoes: filtradas
            };
        });

        const totalSugestoesDisponiveis = blocosSugestoes.reduce((acc, b) => acc + b.sugestoes.length, 0);

        const html = `
            <div class="animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8);">
                
                <!-- TOP HEADER & CONTROLS TOOLBAR -->
                <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em; display: flex; align-items: center; gap: var(--spacing-2);">
                            <i class="far fa-calendar-alt" style="color: var(--color-primary);"></i> Planejamento Mensal
                        </h2>
                        <p style="font-size: 0.875rem; color: var(--color-slate-500);">Habilidades programadas para <strong>${this.currentMes}</strong> (${periodosDoMes.map(p => `${p}º`).join(' e ')} ${model.state.userConfig?.periodType || 'Bimestre'}).</p>
                    </div>

                    <div style="display: flex; align-items: center; gap: var(--spacing-3); flex-wrap: wrap;">
                        <button type="button" onclick="controller.abrirModalCopiarPlanejamento('${turmaAtual.id}')" class="btn-secondary interactive-element" title="Copiar planejamento para outra turma">
                            <i class="fas fa-copy"></i> <span>Replicar</span>
                        </button>

                        <div class="custom-dropdown" style="min-width: 240px;">
                            <input type="hidden" id="select-turma-global" onchange="mensalView.mudarTurma(this.value)" value="${this.currentTurmaId || ''}">
                            <button type="button" class="dropdown-button">
                                <i class="fas fa-users" style="color: var(--color-slate-400); margin-right: var(--spacing-2);"></i>
                                <span class="dropdown-label">${turmas.find(t => String(t.id) === String(this.currentTurmaId))?.nome || 'Selecionar Turma...'}</span>
                                <i class="fas fa-chevron-down" style="color: var(--color-slate-400); font-size: 0.75rem; margin-left: auto;"></i>
                            </button>
                            <ul class="dropdown-menu hidden custom-scrollbar">
                                ${turmas.map(t => `<li class="dropdown-item ${String(t.id) === String(this.currentTurmaId) ? 'dropdown-item--selected' : ''}" data-value="${t.id}">${window.escapeHTML(t.nome)}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- MONTHS HORIZONTAL PILL SELECTOR -->
                <div class="card" style="padding: var(--spacing-3); overflow-x: auto;" class="custom-scrollbar">
                    <div style="display: flex; align-items: center; gap: var(--spacing-2); min-width: max-content;">
                        ${this.meses.map(mes => `
                            <button type="button" onclick="mensalView.mudarMes('${mes}')" 
                                    class="pill-item interactive-element ${this.currentMes === mes ? 'pill-item--active' : ''}" style="white-space: nowrap;">
                                ${window.escapeHTML(mes)}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- SIDE-BY-SIDE MAIN CONTENT GRID -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: var(--spacing-6); align-items: start;">
                    
                    <!-- LEFT COLUMN: HABILIDADES DO MÊS (2 fr) -->
                    <div style="display: flex; flex-direction: column; gap: var(--spacing-4); flex: 2; min-width: 320px;">
                        
                        <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; background-color: var(--color-white);">
                            <h3 style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-800); display: flex; align-items: center; gap: var(--spacing-2);">
                                <i class="far fa-calendar-check" style="color: var(--color-primary);"></i> 
                                Planejado para ${this.currentMes}
                                <span class="badge" style="background-color: var(--color-primary-light); color: var(--color-primary); font-weight: 800;">${habilidadesDoMes.length}</span>
                            </h3>

                            <button type="button" onclick="controller.openSeletorBnccMensal('${turmaAtual.id}', '${this.currentMes}', '${turmaAtual.nivel}', '${turmaAtual.serie}')" class="btn-primary" style="padding: 0.5rem 1rem; font-size: 0.8125rem;">
                                <i class="fas fa-search"></i> <span>Buscar na BNCC</span>
                            </button>
                        </div>

                        ${habilidadesDoMes.length > 0 ? `
                            <div style="display: flex; flex-direction: column; gap: var(--spacing-3);">
                                ${habilidadesDoMes.map(h => this.gerarCardHabilidade(h, turmaAtual.id, this.currentMes)).join('')}
                            </div>
                        ` : `
                            <div class="card" style="padding: 3rem 1.5rem; text-align: center; border: 2px dashed var(--color-slate-200); background-color: var(--color-slate-50); display: flex; flex-direction: column; align-items: center;">
                                <div style="width: 3.5rem; height: 3.5rem; border-radius: var(--radius-full); background-color: var(--color-white); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; color: var(--color-slate-300); font-size: 1.25rem; box-shadow: var(--shadow-sm);">
                                    <i class="fas fa-wind"></i>
                                </div>
                                <h4 style="font-size: 1rem; font-weight: 800; color: var(--color-slate-700); margin-bottom: 0.25rem;">Mês Livre</h4>
                                <p style="color: var(--color-slate-500); font-size: 0.875rem; max-width: 320px;">Adicione habilidades clicando nas sugestões ao lado ou buscando na BNCC.</p>
                            </div>
                        `}
                    </div>

                    <!-- RIGHT COLUMN: SUGESTÕES DO PERÍODO (1 fr) -->
                    <div style="flex: 1; min-width: 300px; position: sticky; top: 5.5rem;">
                        <div class="card" style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4); border: 1px solid #fef3c7; background-color: #fffbeb;">
                            
                            <div style="display: flex; align-items: center; gap: var(--spacing-3); padding-bottom: var(--spacing-3); border-bottom: 1px solid #fde68a;">
                                <div style="width: 2.5rem; height: 2.5rem; border-radius: var(--radius-lg); background-color: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 1rem; box-shadow: var(--shadow-sm);">
                                    <i class="fas fa-lightbulb"></i>
                                </div>
                                <div>
                                    <h3 style="font-size: 0.9375rem; font-weight: 800; color: var(--color-slate-800);">Sugestões do Planejamento Periódico</h3>
                                    <p style="font-size: 0.6875rem; color: #b45309; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                                        ${periodosDoMes.map(p => `${p}º ${model.state.userConfig?.periodType || 'Bimestre'}`).join(' / ')}
                                    </p>
                                </div>
                            </div>

                            ${totalSugestoesDisponiveis > 0 ? `
                                <div class="custom-scrollbar" style="display: flex; flex-direction: column; gap: var(--spacing-3); max-height: 55vh; overflow-y: auto; padding-right: 0.25rem;">
                                    ${blocosSugestoes.map(bloco => bloco.sugestoes.length > 0 ? `
                                        <div>
                                            <div style="font-size: 0.6875rem; font-weight: 800; color: #92400e; text-transform: uppercase; margin-bottom: 0.35rem; display: flex; justify-content: space-between;">
                                                <span>${bloco.periodo}º ${model.state.userConfig?.periodType || 'Bimestre'}</span>
                                                <span>${bloco.sugestoes.length} disp.</span>
                                            </div>
                                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                                ${bloco.sugestoes.map(h => `
                                                    <div class="card interactive-element" style="padding: var(--spacing-3); background-color: var(--color-white); border: 1px solid #fde68a; cursor: pointer; display: flex; flex-direction: column; gap: 0.375rem;"
                                                         onclick="mensalView.adicionarSugestao('${h.codigo}')"
                                                         title="Clique para adicionar a ${this.currentMes}">
                                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                                            <span style="font-size: 0.6875rem; font-weight: 800; color: #b45309; background-color: #fef3c7; padding: 0.125rem 0.375rem; border-radius: var(--radius-sm);">
                                                                ${window.escapeHTML(h.codigo)}
                                                            </span>
                                                            <i class="fas fa-plus-circle" style="color: #f59e0b; font-size: 1rem;"></i>
                                                        </div>
                                                        <p style="font-size: 0.75rem; color: var(--color-slate-600); line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                                            ${window.escapeHTML(h.descricao)}
                                                        </p>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                    ` : '').join('')}
                                </div>
                                <p style="font-size: 0.6875rem; text-align: center; color: var(--color-slate-400); font-weight: 600;">
                                    <i class="fas fa-mouse-pointer" style="margin-right: 0.25rem;"></i> Clique na habilidade para programá-la no mês
                                </p>
                            ` : `
                                <div style="text-align: center; padding: 2rem 1rem;">
                                    <p style="font-size: 0.8125rem; color: var(--color-slate-500); margin-bottom: 0.75rem;">
                                        Nenhuma habilidade pendente do período para sugerir.
                                    </p>
                                    <button onclick="controller.navigate('planejamento')" class="btn-secondary" style="padding: 0.375rem 0.875rem; font-size: 0.75rem;">
                                        Gerenciar Período
                                    </button>
                                </div>
                            `}
                        </div>
                    </div>

                </div>
            </div>
        `;

        container.innerHTML = html;
        uiController.initAllDropdowns(container);
    },

    gerarCardHabilidade(habilidade, turmaId, mes) {
        if (!habilidade) return '';
        const cor = habilidade.cor || (model.coresComponentes && model.coresComponentes[habilidade.componente]) || "#64748b";
        const codigoSafe = String(habilidade.codigo || "").replace(/'/g, "");
        const eixo = habilidade.objeto || habilidade.eixo || habilidade.componente || "Habilidade";

        return `
            <div class="card" style="padding: var(--spacing-4); border-left: 4px solid ${cor}; display: flex; flex-direction: column; gap: var(--spacing-2); transition: all var(--transition-fast);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--spacing-3);">
                    <div>
                        <span style="display: inline-block; padding: 0.125rem 0.375rem; border-radius: var(--radius-sm); font-size: 0.625rem; font-weight: 900; color: white; text-transform: uppercase; letter-spacing: 0.05em; background-color: ${cor}; margin-bottom: 0.25rem;">
                            ${window.escapeHTML(habilidade.codigo)}
                        </span>
                        <p style="font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-400); text-transform: uppercase; letter-spacing: 0.05em;">
                            ${window.escapeHTML(eixo)}
                        </p>
                    </div>

                    <button onclick="controller.removeHabilidadeMensal('${turmaId}', '${mes}', '${codigoSafe}')" 
                            class="btn-icon" style="color: var(--color-slate-300); padding: 0.375rem;"
                            onmouseover="this.style.color='#ef4444'; this.style.backgroundColor='#fee2e2';"
                            onmouseout="this.style.color='var(--color-slate-300)'; this.style.backgroundColor='transparent';"
                            title="Remover do mês">
                        <i class="fas fa-trash-alt" style="font-size: 0.875rem;"></i>
                    </button>
                </div>

                <p style="font-size: 0.875rem; color: var(--color-slate-700); line-height: 1.5; font-weight: 500;">
                    ${window.escapeHTML(habilidade.descricao)}
                </p>
            </div>
        `;
    },

    mudarTurma(id) {
        this.currentTurmaId = id;
        this.render('view-container');
    },

    mudarMes(mes) {
        this.currentMes = mes;
        this.render('view-container');
    },

    identificarPeriodo(mesNome) {
        try {
            const mesIndex = this.meses.indexOf(mesNome);
            const ano = new Date().getFullYear();
            const dataTeste = `${ano}-${String(mesIndex + 1).padStart(2, '0')}-15`;
            const periodo = model.getPeriodoPorData(dataTeste);
            return periodo || "1";
        } catch (e) {
            console.error("Erro ao identificar período:", e);
            return "1";
        }
    },

    adicionarSugestao(codigoHabilidade) {
        const turma = model.state.turmas.find(t => String(t.id) === String(this.currentTurmaId));
        if (!turma) return;

        const periodo = this.identificarPeriodo(this.currentMes);
        const habilidade = turma.planejamento?.[periodo]?.find(h => h.codigo === codigoHabilidade);

        if (habilidade) {
            model.addHabilidadeMensal(turma.id, this.currentMes, habilidade);
            Toast.show(`Habilidade ${codigoHabilidade} adicionada a ${this.currentMes}!`, 'success');
            this.render('view-container');
        }
    }
};
