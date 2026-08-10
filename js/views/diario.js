import { model } from '../model.js';
import { controller } from '../controller.js';

export const diarioView = {
    currentDate: new Date().toISOString().split('T')[0],
    viewDate: new Date(),
    currentTurmaId: null,

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const turmas = (model.state && model.state.turmas) ? model.state.turmas : [];

        if (this.currentTurmaId && !turmas.find(t => String(t.id) === String(this.currentTurmaId))) {
            this.currentTurmaId = null;
        }
        if (!this.currentTurmaId && turmas.length > 0) {
            this.currentTurmaId = turmas[0].id;
        }

        const html = `
            <div class="animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8);">
                
                <!-- TOP HEADER & TOOLBAR -->
                <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div style="display: flex; align-items: center; gap: var(--spacing-4);">
                        <div style="background-color: var(--color-primary-light); color: var(--color-primary); width: 2.75rem; height: 2.75rem; border-radius: var(--radius-xl); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                            <i class="fas fa-book-reader"></i>
                        </div>
                        <div>
                            <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em;">Diário de Classe</h2>
                            <p style="font-size: 0.875rem; color: var(--color-slate-500);">Registro diário de aulas, metodologia e habilidades desenvolvidas.</p>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: var(--spacing-3); flex-wrap: wrap;">
                        <div class="custom-dropdown" style="min-width: 240px;">
                            <input type="hidden" id="select-turma-global" onchange="controller.mudarTurmaDiario(this.value)" value="${this.currentTurmaId || ''}">
                            <button type="button" class="dropdown-button">
                                <i class="fas fa-users" style="color: var(--color-slate-400); margin-right: var(--spacing-2);"></i>
                                <span class="dropdown-label">${turmas.find(t => String(t.id) === String(this.currentTurmaId))?.nome || 'Selecionar Turma...'}</span>
                                <i class="fas fa-chevron-down" style="color: var(--color-slate-400); font-size: 0.75rem; margin-left: auto;"></i>
                            </button>
                            <ul class="dropdown-menu hidden custom-scrollbar">
                                ${turmas.length > 0
                ? turmas.map(t => `<li class="dropdown-item ${String(t.id) === String(this.currentTurmaId) ? 'dropdown-item--selected' : ''}" data-value="${t.id}">${window.escapeHTML(t.nome)}</li>`).join('')
                : '<li class="p-3 text-slate-400 text-sm text-center">Nenhuma turma cadastrada</li>'
            }
                            </ul>
                        </div>
                        <div id="status-salvamento" style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-400); min-width: 80px; text-align: right;"></div>
                    </div>
                </div>

                <!-- MAIN SIDE-BY-SIDE GRID (CALENDAR + LESSON PLAN EDITOR) -->
                ${turmas.length === 0 ? this.estadoVazio() : `
                    <div style="display: grid; grid-template-columns: minmax(320px, 360px) 1fr; gap: var(--spacing-4); align-items: start;">
                        
                        <!-- LEFT COLUMN: MINI CALENDAR & TIPS (360px) -->
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-4); width: 100%;">
                            ${this.gerarMiniCalendario()}
                            
                            <div class="card" style="padding: var(--spacing-4); background-color: #eff6ff; border: 1px solid #dbeafe; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.8125rem; color: #1e40af; line-height: 1.5;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 800;">
                                    <i class="fas fa-info-circle"></i> Como funciona:
                                </div>
                                <ol style="padding-left: 1.25rem; margin: 0; display: flex; flex-direction: column; gap: 0.25rem;">
                                    <li>Selecione a data no calendário acima.</li>
                                    <li>Preencha os campos da aula ao lado.</li>
                                    <li>O salvamento ocorre automaticamente.</li>
                                </ol>
                            </div>
                        </div>

                        <!-- RIGHT COLUMN: LESSON PLAN EDITOR -->
                        <div style="width: 100%; min-width: 0;">
                            ${this.renderEditor()}
                        </div>
                    </div>
                `}
            </div>
        `;

        container.innerHTML = html;

        if (turmas.length > 0) {
            this.preencherCampos();
            if (window.planejamentoController?.initDiarioAutosave) {
                window.planejamentoController.initDiarioAutosave();
            }
        }
    },

    gerarMiniCalendario() {
        const ano = this.viewDate.getFullYear();
        const mes = this.viewDate.getMonth();
        const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
        const totalDias = new Date(ano, mes + 1, 0).getDate();

        let diasHtml = '';

        for (let i = 0; i < primeiroDiaSemana; i++) {
            diasHtml += `<div style="height: 2.5rem;"></div>`;
        }

        for (let dia = 1; dia <= totalDias; dia++) {
            const dataIso = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const isSelected = dataIso === this.currentDate;
            const temPlano = model.getPlanoDiario(dataIso, this.currentTurmaId);

            const indicadorHtml = temPlano
                ? `<span style="position: absolute; bottom: 4px; width: 5px; height: 5px; border-radius: 50%; background-color: #10b981;"></span>`
                : '';

            const bgStyle = isSelected
                ? 'background-color: var(--color-slate-800); color: white; box-shadow: var(--shadow-sm);'
                : 'background-color: var(--color-white); color: var(--color-slate-700); border: 1px solid var(--color-slate-100);';

            diasHtml += `
                <button type="button" onclick="controller.mudarDataDiario('${dataIso}')" 
                        class="interactive-element"
                        style="height: 2.5rem; width: 100%; border-radius: var(--radius-lg); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; font-size: 0.8125rem; font-weight: 700; cursor: pointer; ${bgStyle}"
                        onmouseover="if(!${isSelected}) this.style.backgroundColor='var(--color-slate-50)'"
                        onmouseout="if(!${isSelected}) this.style.backgroundColor='var(--color-white)'">
                    ${dia}
                    ${indicadorHtml}
                </button>
            `;
        }

        return `
            <div class="card" style="padding: var(--spacing-4); display: flex; flex-direction: column; gap: var(--spacing-3);">
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--spacing-3); border-bottom: 1px solid var(--color-slate-100);">
                    <button type="button" onclick="controller.mudarMesDiario(-1)" class="btn-icon" style="width: 2rem; height: 2rem;" title="Mês Anterior">
                        <i class="fas fa-chevron-left" style="font-size: 0.75rem;"></i>
                    </button>
                    
                    <div style="display: flex; align-items: center; gap: var(--spacing-2);">
                        <span style="font-size: 0.9375rem; font-weight: 800; color: var(--color-slate-800);">${nomesMeses[mes]} ${ano}</span>
                        <button type="button" onclick="controller.mudarDataDiario(new Date().toISOString().split('T')[0])" 
                                class="badge" style="background-color: var(--color-primary-light); color: var(--color-primary); font-weight: 800; cursor: pointer; border: none;"
                                title="Voltar para Hoje">
                            Hoje
                        </button>
                    </div>

                    <button type="button" onclick="controller.mudarMesDiario(1)" class="btn-icon" style="width: 2rem; height: 2rem;" title="Próximo Mês">
                        <i class="fas fa-chevron-right" style="font-size: 0.75rem;"></i>
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.25rem; text-align: center;">
                    <div style="font-size: 0.6875rem; font-weight: 900; color: #ef4444; padding: 0.25rem 0;">D</div>
                    <div style="font-size: 0.6875rem; font-weight: 900; color: var(--color-slate-400); padding: 0.25rem 0;">S</div>
                    <div style="font-size: 0.6875rem; font-weight: 900; color: var(--color-slate-400); padding: 0.25rem 0;">T</div>
                    <div style="font-size: 0.6875rem; font-weight: 900; color: var(--color-slate-400); padding: 0.25rem 0;">Q</div>
                    <div style="font-size: 0.6875rem; font-weight: 900; color: var(--color-slate-400); padding: 0.25rem 0;">Q</div>
                    <div style="font-size: 0.6875rem; font-weight: 900; color: var(--color-slate-400); padding: 0.25rem 0;">S</div>
                    <div style="font-size: 0.6875rem; font-weight: 900; color: var(--color-slate-400); padding: 0.25rem 0;">S</div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.25rem;">
                    ${diasHtml}
                </div>
            </div>
        `;
    },

    renderEditor() {
        const [ano, mes, dia] = this.currentDate.split('-');
        const dataFormatada = `${dia}/${mes}/${ano}`;
        const sugestoes = model.getSugestoesDoMes(this.currentTurmaId, this.currentDate);

        return `
            <div class="card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column;">
                
                <!-- EDITOR HEADER -->
                <div style="padding: var(--spacing-4) var(--spacing-6); background-color: var(--color-slate-50); border-bottom: 1px solid var(--color-slate-200); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-3);">
                    <div style="display: flex; align-items: center; gap: var(--spacing-2);">
                        <span class="badge" style="background-color: var(--color-white); color: var(--color-slate-700); font-weight: 800; padding: 0.375rem 0.75rem; border: 1px solid var(--color-slate-200); box-shadow: var(--shadow-sm); font-size: 0.875rem;">
                            <i class="far fa-calendar" style="color: var(--color-primary); margin-right: 0.375rem;"></i> ${dataFormatada}
                        </span>
                        <input type="hidden" id="diario-data" value="${this.currentDate}">
                    </div>

                    <div style="display: flex; align-items: center; gap: var(--spacing-2);">
                        <button type="button" onclick="diarioView.imprimirPlano()" class="btn-secondary" style="padding: 0.5rem 0.875rem; font-size: 0.8125rem;">
                            <i class="fas fa-print"></i> <span>Imprimir</span>
                        </button>
                        <button type="button" onclick="controller.salvarDiario()" class="btn-primary" style="padding: 0.5rem 1.25rem; font-size: 0.8125rem;">
                            <i class="fas fa-save"></i> <span>Salvar</span>
                        </button>
                    </div>
                </div>

                <!-- FORM FIELDS -->
                <div style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-5);">
                    <div>
                        <label class="form-label">Tema da Aula</label>
                        <input type="text" id="plan-tema" placeholder="Qual o tema principal desta aula?" 
                               class="autosave-input form-input" style="font-size: 1.125rem; font-weight: 700; color: var(--color-slate-800);">
                    </div>

                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-2);">
                            <label class="form-label" style="margin-bottom: 0;">Habilidades BNCC</label>
                            <button type="button" onclick="controller.openSeletorBnccDiario('${this.currentTurmaId}')" 
                                    class="btn-primary interactive-element" style="padding: 0.375rem 0.75rem; font-size: 0.75rem; border-radius: var(--radius-lg);">
                                <i class="fas fa-search"></i> <span>Consultar BNCC</span>
                            </button>
                        </div>
                        <textarea id="plan-bncc" rows="2" class="autosave-input form-input custom-scrollbar" style="resize: vertical;" placeholder="Códigos e descrições das habilidades trabalhadas..."></textarea>
                    </div>

                    ${sugestoes.length > 0 ? `
                        <div style="padding: var(--spacing-4); background-color: #fefce8; border: 1px solid #fef08a; border-radius: var(--radius-xl); display: flex; flex-direction: column; gap: var(--spacing-2);">
                            <h4 style="font-size: 0.8125rem; font-weight: 800; color: #854d0e; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-lightbulb"></i> Sugestões do Planejamento Mensal
                            </h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                ${sugestoes.map(h => `
                                    <button type="button" onclick="diarioView.adicionarHabilidadeTexto('${window.escapeHTML(h.codigo)} - ${window.escapeHTML(h.descricao)}')"
                                            class="pill-item" style="font-size: 0.75rem; background-color: white; border: 1px solid #fde047; color: #854d0e;">
                                        <i class="fas fa-plus-circle" style="margin-right: 0.25rem;"></i> ${window.escapeHTML(h.codigo)}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--spacing-4);">
                        <div>
                            <label class="form-label">Objetivos de Aprendizagem</label>
                            <textarea id="plan-objetivos" rows="3" class="autosave-input form-input custom-scrollbar" style="resize: vertical;" placeholder="O que os estudantes deverão assimilar..."></textarea>
                        </div>
                        <div>
                            <label class="form-label">Metodologia e Dinâmica</label>
                            <textarea id="plan-metodologia" rows="3" class="autosave-input form-input custom-scrollbar" style="resize: vertical;" placeholder="Estratégias de ensino, atividades em grupo..."></textarea>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--spacing-4);">
                        <div>
                            <label class="form-label">Recursos Didáticos</label>
                            <textarea id="plan-recursos" rows="2" class="autosave-input form-input custom-scrollbar" style="resize: vertical;" placeholder="Livro, projetor, materiais de laboratório..."></textarea>
                        </div>
                        <div>
                            <label class="form-label">Avaliação Contínua</label>
                            <textarea id="plan-avaliacao" rows="2" class="autosave-input form-input custom-scrollbar" style="resize: vertical;" placeholder="Instrumentos de verificação e critérios..."></textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    preencherCampos() {
        const plano = model.getPlanoDiario(this.currentDate, this.currentTurmaId) || {};
        const tema = document.getElementById('plan-tema');
        const bncc = document.getElementById('plan-bncc');
        const objetivos = document.getElementById('plan-objetivos');
        const recursos = document.getElementById('plan-recursos');
        const metodologia = document.getElementById('plan-metodologia');
        const avaliacao = document.getElementById('plan-avaliacao');

        if (tema) tema.value = plano.tema || '';
        if (bncc) bncc.value = plano.bncc || '';
        if (objetivos) objetivos.value = plano.objetivos || '';
        if (recursos) recursos.value = plano.recursos || '';
        if (metodologia) metodologia.value = plano.metodologia || '';
        if (avaliacao) avaliacao.value = plano.avaliacao || '';
    },

    adicionarHabilidadeTexto(texto) {
        const bnccEl = document.getElementById('plan-bncc');
        if (bnccEl) {
            const atual = bnccEl.value.trim();
            bnccEl.value = atual ? `${atual}\n${texto}` : texto;
            bnccEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
    },

    imprimirPlano() {
        window.print();
    },

    estadoVazio() {
        return `
            <div class="card" style="padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 2px dashed var(--color-slate-200); max-width: 600px; margin: 2rem auto;">
                <div style="width: 4rem; height: 4rem; border-radius: var(--radius-full); background-color: var(--color-slate-100); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; color: var(--color-slate-400); font-size: 1.5rem;">
                    <i class="fas fa-edit"></i>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.5rem;">Nenhuma turma selecionada</h3>
                <p style="color: var(--color-slate-500); font-size: 0.875rem; margin-bottom: 1.5rem;">Cadastre suas turmas para iniciar o diário de classe.</p>
                <button onclick="controller.navigate('turmas')" class="btn-primary">
                    <i class="fas fa-plus"></i> <span>Cadastrar Turmas</span>
                </button>
            </div>
        `;
    }
};