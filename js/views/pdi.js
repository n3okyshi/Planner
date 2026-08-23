import { model } from '../model.js';
import { EventDelegator } from '../utils/eventDelegator.js';
import { escapeHTML } from '../utils.js';
import { Toast } from '../components/toast.js';

export const pdiView = {
    _cleanupDelegators: null,

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }

        const pdis = model.state.pdis || [];
        const turmas = model.state.turmas || [];

        const html = `
            <div class="fade-in" style="padding-bottom: 5rem; display: flex; flex-direction: column; gap: var(--spacing-6);">
                
                <!-- Cabeçalho -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-slate-200); padding-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.02em; display: flex; align-items: center; gap: 0.75rem;">
                            <i class="fas fa-universal-access" style="color: #8b5cf6;"></i>
                            Plano de Desenvolvimento Individualizado (PDI / PEI)
                        </h1>
                        <p style="color: var(--color-slate-500); font-size: 0.875rem; margin-top: 0.25rem;">
                            Atendimento Educacional Especializado (AEE) e adequação curricular para alunos neurodivergentes e PCD.
                        </p>
                    </div>
                    <button type="button" data-action="novo-pdi" class="btn-primary" style="background: #8b5cf6; border: none; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);">
                        <i class="fas fa-plus"></i> Novo PDI / PEI
                    </button>
                </div>

                <!-- Formulário Inline / Modal de Cadastro -->
                <div id="card-form-pdi" class="card" style="padding: 1.5rem; display: none; background: #faf5ff; border: 1px solid #e9d5ff;">
                    <h3 id="titulo-form-pdi" style="font-size: 1.125rem; font-weight: 700; color: #5b21b6; margin-bottom: 1rem;">
                        Cadastrar Novo PDI / PEI
                    </h3>
                    <form id="form-pdi-item" style="display: flex; flex-direction: column; gap: 1rem;">
                        <input type="hidden" id="pdi-id" value="">
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--color-slate-700); margin-bottom: 0.25rem;">Seleção da Turma</label>
                                <select id="pdi-turma-select" required style="width: 100%; padding: 0.5rem; border-radius: 0.5rem; border: 1px solid var(--color-slate-300); background: #fff;">
                                    <option value="">Selecione a turma...</option>
                                    ${turmas.map(t => `<option value="${t.id}">${escapeHTML(t.nome)} (${escapeHTML(t.serie || t.nivel || '')})</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--color-slate-700); margin-bottom: 0.25rem;">Nome do Aluno</label>
                                <input type="text" id="pdi-aluno-nome" required placeholder="Nome completo do estudante..." style="width: 100%; padding: 0.5rem; border-radius: 0.5rem; border: 1px solid var(--color-slate-300);">
                            </div>
                        </div>

                        <div>
                            <label style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--color-slate-700); margin-bottom: 0.25rem;">Diagnóstico / Laudo / Especificidade</label>
                            <input type="text" id="pdi-diagnostico" required placeholder="Ex: Transtorno do Espectro Autista (TEA), TDAH, Baixa Visão..." style="width: 100%; padding: 0.5rem; border-radius: 0.5rem; border: 1px solid var(--color-slate-300);">
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--color-slate-700); margin-bottom: 0.25rem;">Habilidades e Objetivos Prioritários (BNCC Adaptada)</label>
                                <textarea id="pdi-habilidades" rows="3" placeholder="Descreva os objetivos educacionais específicos adaptados..." style="width: 100%; padding: 0.5rem; border-radius: 0.5rem; border: 1px solid var(--color-slate-300);"></textarea>
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--color-slate-700); margin-bottom: 0.25rem;">Adaptações Metodológicas e Recursos de AEE</label>
                                <textarea id="pdi-adaptacoes" rows="3" placeholder="Material ampliado, apoio visual, tempo estendido, recursos assistivos..." style="width: 100%; padding: 0.5rem; border-radius: 0.5rem; border: 1px solid var(--color-slate-300);"></textarea>
                            </div>
                        </div>

                        <div>
                            <label style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--color-slate-700); margin-bottom: 0.25rem;">Parecer de Acompanhamento / Evolução</label>
                            <textarea id="pdi-parecer" rows="2" placeholder="Observações periódicas sobre o desenvolvimento do aluno..." style="width: 100%; padding: 0.5rem; border-radius: 0.5rem; border: 1px solid var(--color-slate-300);"></textarea>
                        </div>

                        <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem;">
                            <button type="button" data-action="cancelar-pdi" class="btn-secondary">Cancelar</button>
                            <button type="submit" class="btn-primary" style="background: #8b5cf6;">Salvar PDI</button>
                        </div>
                    </form>
                </div>

                <!-- Lista de PDIs Cadastrados -->
                <div class="card" style="padding: 1.5rem;">
                    <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--color-slate-800); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-folder-open" style="color: #8b5cf6;"></i>
                        Planos Registrados (${pdis.length})
                    </h3>

                    ${pdis.length === 0 ? `
                        <div style="text-align: center; padding: 2.5rem; color: var(--color-slate-500); background: var(--color-slate-50); border-radius: 0.75rem; border: 1px dashed var(--color-slate-200);">
                            <i class="fas fa-hand-holding-heart" style="font-size: 2.5rem; color: #a855f7; margin-bottom: 0.5rem;"></i>
                            <p style="font-weight: 600; margin: 0;">Nenhum Plano PDI / PEI cadastrado ainda.</p>
                            <p style="font-size: 0.8125rem; color: var(--color-slate-400); margin-top: 0.25rem;">Clique no botão acima para registrar a adaptação curricular de um estudante.</p>
                        </div>
                    ` : `
                        <div id="container-lista-pdi" style="display: flex; flex-direction: column; gap: 1rem;"></div>
                    `}
                </div>

            </div>
        `;

        container.innerHTML = html;
        this._renderListaPdi(pdis);
        this._setupEvents(container);
    },

    _renderListaPdi(pdis) {
        const listContainer = document.getElementById('container-lista-pdi');
        if (!listContainer || pdis.length === 0) return;

        const fragment = document.createDocumentFragment();
        pdis.forEach(p => {
            const card = document.createElement('div');
            card.style.cssText = 'border: 1px solid var(--color-slate-200); border-radius: 0.75rem; padding: 1.25rem; background: #fff; display: flex; flex-direction: column; gap: 0.75rem; border-left: 4px solid #8b5cf6;';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                        <h4 style="font-size: 1rem; font-weight: 800; color: var(--color-slate-800); margin: 0;">
                            ${escapeHTML(p.alunoNome)}
                        </h4>
                        <span style="font-size: 0.8125rem; color: #6b21a8; font-weight: 600; background: #f3e8ff; padding: 0.15rem 0.5rem; border-radius: 0.375rem; margin-top: 0.25rem; display: inline-block;">
                            ${escapeHTML(p.turmaNome || 'Turma')} | ${escapeHTML(p.diagnostico || 'Sem laudo')}
                        </span>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" data-action="editar-pdi" data-id="${p.id}" class="btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button type="button" data-action="excluir-pdi" data-id="${p.id}" class="btn-secondary" style="color: #ef4444; border-color: #fca5a5; padding: 0.3rem 0.6rem; font-size: 0.75rem;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.75rem; font-size: 0.8125rem;">
                    <div style="background: var(--color-slate-50); padding: 0.75rem; border-radius: 0.5rem;">
                        <strong style="color: var(--color-slate-700); display: block; margin-bottom: 0.25rem;">Metas e Habilidades:</strong>
                        <p style="color: var(--color-slate-600); margin: 0;">${escapeHTML(p.habilidadesPrioritarias || 'Não informado.')}</p>
                    </div>
                    <div style="background: var(--color-slate-50); padding: 0.75rem; border-radius: 0.5rem;">
                        <strong style="color: var(--color-slate-700); display: block; margin-bottom: 0.25rem;">Adaptações / Recursos AEE:</strong>
                        <p style="color: var(--color-slate-600); margin: 0;">${escapeHTML(p.adaptacoesMetodologicas || 'Não informado.')}</p>
                    </div>
                </div>

                ${p.parecerEvolutivo ? `
                    <div style="font-size: 0.8125rem; color: var(--color-slate-600); italic; border-top: 1px solid var(--color-slate-100); padding-top: 0.5rem;">
                        <strong>Parecer Evolutivo:</strong> "${escapeHTML(p.parecerEvolutivo)}"
                    </div>
                ` : ''}
            `;
            fragment.appendChild(card);
        });

        listContainer.appendChild(fragment);
    },

    _setupEvents(container) {
        const formCard = container.querySelector('#card-form-pdi');
        const form = container.querySelector('#form-pdi-item');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const pdiId = document.getElementById('pdi-id').value;
                const turmaSelect = document.getElementById('pdi-turma-select');
                const turmaId = turmaSelect.value;
                const turmaObj = model.state.turmas.find(t => String(t.id) === String(turmaId));

                const pdiData = {
                    id: pdiId || null,
                    turmaId: turmaId,
                    turmaNome: turmaObj ? turmaObj.nome : '',
                    alunoNome: document.getElementById('pdi-aluno-nome').value.trim(),
                    diagnostico: document.getElementById('pdi-diagnostico').value.trim(),
                    habilidadesPrioritarias: document.getElementById('pdi-habilidades').value.trim(),
                    adaptacoesMetodologicas: document.getElementById('pdi-adaptacoes').value.trim(),
                    parecerEvolutivo: document.getElementById('pdi-parecer').value.trim()
                };

                model.savePdi(pdiData);
                Toast.show("Plano PDI / PEI salvo com sucesso!", "success");
                this.render(container);
            });
        }

        this._cleanupDelegators = EventDelegator.bind(container, {
            'novo-pdi': () => {
                if (formCard) {
                    formCard.style.display = 'block';
                    form.reset();
                    document.getElementById('pdi-id').value = '';
                    document.getElementById('titulo-form-pdi').innerText = 'Cadastrar Novo PDI / PEI';
                    formCard.scrollIntoView({ behavior: 'smooth' });
                }
            },
            'cancelar-pdi': () => {
                if (formCard) formCard.style.display = 'none';
            },
            'editar-pdi': (el) => {
                const id = el.dataset.id;
                const pdi = model.getPdi(id);
                if (!pdi) return;

                if (formCard) {
                    formCard.style.display = 'block';
                    document.getElementById('pdi-id').value = pdi.id;
                    document.getElementById('pdi-turma-select').value = pdi.turmaId || '';
                    document.getElementById('pdi-aluno-nome').value = pdi.alunoNome || '';
                    document.getElementById('pdi-diagnostico').value = pdi.diagnostico || '';
                    document.getElementById('pdi-habilidades').value = pdi.habilidadesPrioritarias || '';
                    document.getElementById('pdi-adaptacoes').value = pdi.adaptacoesMetodologicas || '';
                    document.getElementById('pdi-parecer').value = pdi.parecerEvolutivo || '';
                    document.getElementById('titulo-form-pdi').innerText = 'Editar PDI / PEI';
                    formCard.scrollIntoView({ behavior: 'smooth' });
                }
            },
            'excluir-pdi': (el) => {
                const id = el.dataset.id;
                if (confirm("Tem certeza que deseja excluir este Plano PDI / PEI?")) {
                    model.removePdi(id);
                    Toast.show("PDI excluído com sucesso.", "info");
                    this.render(container);
                }
            }
        });
    }
};
