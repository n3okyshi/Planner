import { model } from '../model.js';
import { controller } from '../controller.js';
import { EventDelegator } from '../utils/eventDelegator.js';
import { escapeHTML } from '../utils.js';
import { Toast } from '../components/toast.js';

export const coordenacaoView = {
    _cleanupDelegators: null,

    destroy() {
        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }
    },

    onLeave() {
        this.destroy();
    },

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        this.destroy();

        const turmas = model.state.turmas || [];
        const planosDiarios = model.state.planosDiarios || {};
        const pdis = model.state.pdis || [];
        const currentRole = model.state.userConfig?.role || 'docente';

        // Coleta planos pendentes de validação
        const planosPendentes = [];
        Object.keys(planosDiarios).forEach(dataIso => {
            const turmasDoDia = planosDiarios[dataIso] || {};
            Object.keys(turmasDoDia).forEach(turmaId => {
                const plano = turmasDoDia[turmaId];
                if (plano && typeof plano === 'object' && plano.validacao && plano.validacao.status === 'enviado') {
                    const turmaObj = turmas.find(t => String(t.id) === String(turmaId));
                    planosPendentes.push({
                        dataIso,
                        turmaId,
                        turmaNome: turmaObj ? turmaObj.nome : `Turma #${turmaId}`,
                        disciplina: turmaObj?.disciplina || 'Geral',
                        conteudo: plano.conteudo || plano.objetivos || 'Plano de Aula sem texto',
                        enviadoEm: plano.validacao.enviadoEm,
                        mensagemProf: plano.validacao.mensagemProf || ''
                    });
                }
            });
        });

        // Coleta todos os planos para o histórico
        const todosPlanosValidacao = [];
        Object.keys(planosDiarios).forEach(dataIso => {
            const turmasDoDia = planosDiarios[dataIso] || {};
            Object.keys(turmasDoDia).forEach(turmaId => {
                const plano = turmasDoDia[turmaId];
                if (plano && typeof plano === 'object' && plano.validacao) {
                    const turmaObj = turmas.find(t => String(t.id) === String(turmaId));
                    todosPlanosValidacao.push({
                        dataIso,
                        turmaId,
                        turmaNome: turmaObj ? turmaObj.nome : `Turma #${turmaId}`,
                        status: plano.validacao.status,
                        parecerCoordenador: plano.validacao.parecerCoordenador || '',
                        avaliadoEm: plano.validacao.avaliadoEm
                    });
                }
            });
        });

        const html = `
            <div class="fade-in" style="padding-bottom: 5rem; display: flex; flex-direction: column; gap: var(--spacing-6);">
                
                <!-- Cabeçalho com Seletor de Perfil -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-slate-200); padding-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.02em; display: flex; align-items: center; gap: 0.75rem;">
                            <i class="fas fa-user-shield" style="color: var(--color-primary);"></i>
                            Painel da Coordenação Pedagógica
                        </h1>
                        <p style="color: var(--color-slate-500); font-size: 0.875rem; margin-top: 0.25rem;">
                            Supervisão de planos de aula, monitoramento curricular BNCC e acompanhamento de inclusão.
                        </p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <button type="button" data-action="abrir-comunicados" class="btn-primary" style="background: #3b82f6; border: none;" title="Gerar Comunicados para Pais e Cartas de Recomendação">
                            <i class="fas fa-envelope-open-text"></i> Comunicados & Cartas
                        </button>
                        <div style="display: flex; align-items: center; gap: 0.75rem; background: var(--color-slate-100); padding: 0.375rem 0.75rem; border-radius: 0.75rem;">
                            <span style="font-size: 0.8125rem; font-weight: 600; color: var(--color-slate-600);">Perfil Atual:</span>
                            <select id="select-role-perfil" style="padding: 0.35rem 0.75rem; border-radius: 0.5rem; border: 1px solid var(--color-slate-300); font-weight: 700; background: #fff; cursor: pointer;">
                                <option value="coordenador" ${currentRole === 'coordenador' ? 'selected' : ''}>Coordenador Pedagógico</option>
                                <option value="docente" ${currentRole === 'docente' ? 'selected' : ''}>Professor (Docente)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Cards Indicadores da Escola -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
                    <div class="card" style="padding: 1.25rem; border-left: 4px solid #3b82f6;">
                        <div style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-500); text-transform: uppercase;">Planos Pendentes</div>
                        <div style="font-size: 1.875rem; font-weight: 800; color: #1e40af; margin-top: 0.25rem;">${planosPendentes.length}</div>
                        <div style="font-size: 0.75rem; color: var(--color-slate-500); margin-top: 0.25rem;">Aguardando aprovação</div>
                    </div>
                    <div class="card" style="padding: 1.25rem; border-left: 4px solid #10b981;">
                        <div style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-500); text-transform: uppercase;">Total de Turmas</div>
                        <div style="font-size: 1.875rem; font-weight: 800; color: #065f46; margin-top: 0.25rem;">${turmas.length}</div>
                        <div style="font-size: 0.75rem; color: var(--color-slate-500); margin-top: 0.25rem;">Sob supervisão</div>
                    </div>
                    <div class="card" style="padding: 1.25rem; border-left: 4px solid #8b5cf6;">
                        <div style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-500); text-transform: uppercase;">Alunos em PDI (AEE)</div>
                        <div style="font-size: 1.875rem; font-weight: 800; color: #5b21b6; margin-top: 0.25rem;">${pdis.length}</div>
                        <div style="font-size: 0.75rem; color: var(--color-slate-500); margin-top: 0.25rem;">Educação Inclusiva</div>
                    </div>
                    <div class="card" style="padding: 1.25rem; border-left: 4px solid #f59e0b;">
                        <div style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-500); text-transform: uppercase;">Aprovados no Mês</div>
                        <div style="font-size: 1.875rem; font-weight: 800; color: #92400e; margin-top: 0.25rem;">
                            ${todosPlanosValidacao.filter(p => p.status === 'aprovado').length}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--color-slate-500); margin-top: 0.25rem;">Planos homologados</div>
                    </div>
                </div>

                <!-- Seção 1: Planos de Aula para Validação -->
                <div class="card" style="padding: 1.5rem;">
                    <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--color-slate-800); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-clipboard-check" style="color: #3b82f6;"></i>
                        Fila de Planos de Aula para Validação
                    </h3>

                    ${planosPendentes.length === 0 ? `
                        <div style="text-align: center; padding: 2.5rem; color: var(--color-slate-500); background: var(--color-slate-50); border-radius: 0.75rem; border: 1px dashed var(--color-slate-200);">
                            <i class="fas fa-check-circle" style="font-size: 2.5rem; color: #10b981; margin-bottom: 0.5rem;"></i>
                            <p style="font-weight: 600; margin: 0;">Nenhum plano pendente de aprovação no momento.</p>
                            <p style="font-size: 0.8125rem; color: var(--color-slate-400); margin-top: 0.25rem;">Todos os planos submetidos foram validados.</p>
                        </div>
                    ` : `
                        <div style="display: flex; flex-direction: column; gap: 1rem;" id="container-planos-pendentes"></div>
                    `}
                </div>

                <!-- Seção 2: Desempenho Consolidado das Turmas -->
                <div class="card" style="padding: 1.5rem;">
                    <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--color-slate-800); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-chart-line" style="color: #10b981;"></i>
                        Consolidado de Desempenho das Turmas
                    </h3>

                    ${turmas.length === 0 ? `
                        <p style="color: var(--color-slate-500); font-size: 0.875rem;">Nenhuma turma cadastrada no sistema.</p>
                    ` : `
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem;">
                                <thead>
                                    <tr style="border-bottom: 2px solid var(--color-slate-200); color: var(--color-slate-600);">
                                        <th style="padding: 0.75rem;">Turma</th>
                                        <th style="padding: 0.75rem;">Série / Nível</th>
                                        <th style="padding: 0.75rem;">Qtd. Alunos</th>
                                        <th style="padding: 0.75rem;">Frequência Média</th>
                                        <th style="padding: 0.75rem;">Situação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${turmas.map(t => {
                                        const qtdAlunos = Array.isArray(t.alunos) ? t.alunos.length : 0;
                                        return `
                                            <tr style="border-bottom: 1px solid var(--color-slate-100);">
                                                <td style="padding: 0.75rem; font-weight: 700; color: var(--color-slate-800);">${escapeHTML(t.nome || '')}</td>
                                                <td style="padding: 0.75rem; color: var(--color-slate-600);">${escapeHTML(t.serie || t.nivel || 'Geral')}</td>
                                                <td style="padding: 0.75rem; font-weight: 600;">${qtdAlunos}</td>
                                                <td style="padding: 0.75rem; color: #10b981; font-weight: 700;">94%</td>
                                                <td style="padding: 0.75rem;">
                                                    <span style="background: #dcfce7; color: #166534; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 700;">Normal</span>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>
        `;

        container.innerHTML = html;
        this._renderPlanosPendentes(planosPendentes);
        this._setupEvents(container);
    },

    _renderPlanosPendentes(planos) {
        const listContainer = document.getElementById('container-planos-pendentes');
        if (!listContainer || planos.length === 0) return;

        const fragment = document.createDocumentFragment();
        planos.forEach(p => {
            const card = document.createElement('div');
            card.style.cssText = 'border: 1px solid var(--color-slate-200); border-radius: 0.75rem; padding: 1.25rem; background: #fff; display: flex; flex-direction: column; gap: 0.75rem;';

            const dataFormatada = p.dataIso.split('-').reverse().join('/');
            const enviadoEmFormatado = p.enviadoEm ? new Date(p.enviadoEm).toLocaleString('pt-BR') : '';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                        <span style="background: #dbeafe; color: #1e40af; font-size: 0.75rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 0.375rem;">
                            ${escapeHTML(p.turmaNome)}
                        </span>
                        <span style="font-size: 0.8125rem; color: var(--color-slate-500); margin-left: 0.5rem;">
                            Data da Aula: <strong>${dataFormatada}</strong>
                        </span>
                    </div>
                    <span style="font-size: 0.75rem; color: var(--color-slate-400);">Enviado em: ${enviadoEmFormatado}</span>
                </div>

                <div style="font-size: 0.875rem; color: var(--color-slate-700); background: var(--color-slate-50); padding: 0.75rem; border-radius: 0.5rem; max-height: 120px; overflow-y: auto; white-space: pre-wrap;">
                    ${escapeHTML(typeof p.conteudo === 'string' ? p.conteudo : JSON.stringify(p.conteudo))}
                </div>

                ${p.mensagemProf ? `
                    <p style="font-size: 0.8125rem; color: var(--color-slate-500); italic; margin: 0;">
                        <strong>Obs do Professor:</strong> "${escapeHTML(p.mensagemProf)}"
                    </p>
                ` : ''}

                <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem; flex-wrap: wrap; align-items: center;">
                    <input type="text" id="parecer-${p.dataIso}-${p.turmaId}" placeholder="Escreva um parecer pedagógico (opcional)..." style="flex: 1; padding: 0.4rem 0.75rem; border-radius: 0.5rem; border: 1px solid var(--color-slate-300); font-size: 0.8125rem;">
                    <button type="button" data-action="aprovar-plano" data-data="${p.dataIso}" data-turma="${p.turmaId}" class="btn-primary" style="background: #10b981; padding: 0.4rem 0.875rem; font-size: 0.8125rem;">
                        <i class="fas fa-check"></i> Aprovar
                    </button>
                    <button type="button" data-action="ressalva-plano" data-data="${p.dataIso}" data-turma="${p.turmaId}" class="btn-secondary" style="color: #d97706; border-color: #fcd34d; padding: 0.4rem 0.875rem; font-size: 0.8125rem;">
                        <i class="fas fa-exclamation-circle"></i> Pedir Ajustes
                    </button>
                </div>
            `;
            fragment.appendChild(card);
        });

        listContainer.appendChild(fragment);
    },

    _setupEvents(container) {
        const roleSelect = container.querySelector('#select-role-perfil');
        if (roleSelect) {
            roleSelect.addEventListener('change', (e) => {
                const newRole = e.target.value;
                if (!model.state.userConfig) model.state.userConfig = {};
                model.state.userConfig.role = newRole;
                model.saveLocal();
                Toast.show(`Perfil alterado para: ${newRole === 'coordenador' ? 'Coordenador Pedagógico' : 'Professor Docente'}`, "info");
                this.render(container);
            });
        }

        this._cleanupDelegators = EventDelegator.bind(container, {
            'aprovar-plano': (e, el) => {
                const dataIso = el.dataset.data;
                const turmaId = el.dataset.turma;
                const parecerInput = document.getElementById(`parecer-${dataIso}-${turmaId}`);
                const parecer = parecerInput ? parecerInput.value.trim() : '';

                model.avaliarPlanoValidacao(dataIso, turmaId, 'aprovado', parecer);
                Toast.show("Plano de aula APROVADO com sucesso!", "success");
                this.render(container);
            },
            'ressalva-plano': (e, el) => {
                const dataIso = el.dataset.data;
                const turmaId = el.dataset.turma;
                const parecerInput = document.getElementById(`parecer-${dataIso}-${turmaId}`);
                const parecer = parecerInput ? parecerInput.value.trim() : '';

                if (!parecer) {
                    Toast.show("Por favor, descreva as ressalvas ou ajustes necessários no parecer.", "warning");
                    return;
                }

                model.avaliarPlanoValidacao(dataIso, turmaId, 'com_ressalvas', parecer);
                Toast.show("Plano retornado ao professor com ressalvas.", "info");
                this.render(container);
            },
            'abrir-comunicados': () => {
                this.abrirModalComunicados();
            }
        });
    },

    abrirModalComunicados() {
        const modelos = [
            {
                titulo: "✉️ Boletim Informativo para as Famílias",
                texto: "Prezados Pais e Responsáveis,\n\nGostaríamos de compartilhar os principais avanços pedagógicos do nosso período letivo. Reiteramos a importância do acompanhamento diário das tarefas de casa e da presença assídua do estudante.\n\nAtenciosamente,\nEquipe Pedagógica"
            },
            {
                titulo: "🎓 Carta de Recomendação Acadêmica",
                texto: "A quem possa interessar,\n\nDeclaro para os devidos fins que o(a) estudante demonstrou excelente empenho acadêmico, postura ética e capacidade analítica diferenciada durante o ciclo letivo, apresentando plena aptidão para novos desafios educacionais.\n\nAtenciosamente,\nCoordenação Pedagógica"
            },
            {
                titulo: "⚠️ Alerta de Acompanhamento de Frequência",
                texto: "Prezado Responsável,\n\nIdentificamos uma sequência de ausências não justificadas do estudante. Solicitamos o comparecimento à coordenação pedagógica para alinhamento da rotina escolar.\n\nAtenciosamente,\nGestão Escolar"
            }
        ];

        const modalHtml = `
            <div id="modal-comunicados-root" style="display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem 0;">
                <p style="font-size: 0.875rem; color: #475569; margin: 0;">
                    Selecione um modelo de comunicado oficial ou carta de recomendação para copiar para a área de transferência:
                </p>
                <div style="display: flex; flex-direction: column; gap: 0.875rem;">
                    ${modelos.map((m, idx) => `
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 1rem; border-radius: var(--radius-lg); display: flex; flex-direction: column; gap: 0.5rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <strong style="font-size: 0.875rem; color: #1e293b;">${window.escapeHTML(m.titulo)}</strong>
                                <button type="button" data-action="copiar-comunicado" data-index="${idx}" class="btn-secondary" style="padding: 0.25rem 0.6rem; font-size: 0.75rem; font-weight: 700; background: #ffffff;">
                                    <i class="fas fa-copy"></i> Copiar Texto
                                </button>
                            </div>
                            <pre style="font-size: 0.8125rem; color: #334155; margin: 0; line-height: 1.5; font-family: inherit; white-space: pre-wrap; background: #ffffff; padding: 0.75rem; border-radius: 0.375rem; border: 1px solid #e2e8f0;">${window.escapeHTML(m.texto)}</pre>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        controller.openModal('Central de Comunicados & Recomendação', modalHtml, 'large');

        const modalEl = document.getElementById('modal-comunicados-root');
        if (modalEl) {
            modalEl.querySelectorAll('[data-action="copiar-comunicado"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
                    const item = modelos[idx];
                    if (item && navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(item.texto)
                            .then(() => Toast.show('Comunicado copiado com sucesso!', 'success'))
                            .catch(() => Toast.show('Falha ao copiar comunicado.', 'error'));
                    }
                });
            });
        }
    }
};

