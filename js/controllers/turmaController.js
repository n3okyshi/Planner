import { model } from '../model.js';
import { controller } from '../controller.js';
import { turmasView } from '../views/turmas.js';
import { Toast } from '../components/toast.js';
import { EventDelegator } from '../utils/eventDelegator.js';

export const turmaController = {
    wizard: {
        step: 1,
        maxSteps: 4,
        data: {
            id: null,
            nome: '',
            serie: '',
            disciplina: '',
            turno: '',
            periodoLetivo: { inicio: '', termino: '', divisao: 'Bimestral', media: 6.0, faltas: '' },
            horarios: [],
            alunosRascunho: [],
            textoBrutoAlunos: ''
        }
    },
    disciplinas: [
        "Língua Portuguesa", "Matemática", "Ciências", "História", "Geografia",
        "Arte", "Educação Física", "Língua Inglesa", "Ensino Religioso", "Física", "Química",
        "Biologia", "Filosofia", "Sociologia"
    ],
    series: [
        "Berçário I", "Berçário II", "Maternal I", "Maternal II", "Jardim I", "Jardim II",
        "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano", "6º Ano", "7º Ano", "8º Ano", "9º Ano",
        "1ª Série (EM)", "2ª Série (EM)", "3ª Série (EM)"
    ],
    openAddTurma() {
        this.wizard.step = 1;
        this.wizard.data = {
            id: 'turma_' + Date.now().toString(36),
            nome: '', serie: '', disciplina: '', turno: '',
            periodoLetivo: { inicio: '', termino: '', divisao: 'Bimestral', media: 6.0, faltas: '' },
            horarios: [], alunosRascunho: [], textoBrutoAlunos: ''
        };

        const html = `<div id="wizard-container" class="min-h-[500px] flex flex-col relative transition-all duration-300"></div>`;
        controller.openModal('', html, 'xl');
        setTimeout(() => this.renderWizardStep(), 50);
    },
    avancar() {
        if (!this.salvarEstadoPassoAtual()) return;
        if (this.wizard.step < this.wizard.maxSteps) {
            this.wizard.step++;
            this.renderWizardStep();
        } else {
            this.finalizarWizard();
        }
    },
    voltar() {
        this.salvarEstadoPassoAtual();
        if (this.wizard.step > 1) {
            this.wizard.step--;
            this.renderWizardStep();
        } else {
            controller.closeModal();
        }
    },
    salvarEstadoPassoAtual() {
        const step = this.wizard.step;
        const d = this.wizard.data;
        if (step === 1) {
            d.nome = document.getElementById('wiz-nome')?.value.trim();
            d.serie = document.getElementById('wiz-serie')?.value;
            d.disciplina = document.getElementById('wiz-disciplina')?.value;
            d.turno = document.getElementById('wiz-turno')?.value;

            if (!d.nome) {
                Toast.show("O nome da turma é obrigatório.", "warning");
                document.getElementById('wiz-nome')?.focus();
                return false;
            }
        }
        else if (step === 2) {
            d.periodoLetivo.inicio = document.getElementById('wiz-per-ini')?.value;
            d.periodoLetivo.termino = document.getElementById('wiz-per-fim')?.value;
            d.periodoLetivo.divisao = document.getElementById('wiz-per-div')?.value;
            d.periodoLetivo.media = parseFloat(document.getElementById('wiz-per-med')?.value) || 6.0;
            d.periodoLetivo.faltas = parseInt(document.getElementById('wiz-per-faltas')?.value) || null;
        }
        else if (step === 4) {
            const textarea = document.getElementById('wiz-alunos-texto');
            if (textarea && textarea.parentElement.classList.contains('hidden') === false) {
                d.textoBrutoAlunos = textarea.value;
                this.limparListaAlunos(d.textoBrutoAlunos);
            }
        }
        return true;
    },
    parseLinhaAlunoLote(linha) {
        linha = (linha || '').trim();
        if (!linha) return null;

        // Se a linha contiver underscores '_'
        if (linha.includes('_')) {
            const partes = linha.split('_').map(p => p.trim());
            const idOuChamada = partes[0] || '';
            const nome = partes[1] || partes[0] || '';
            const matricula = partes[2] || '';
            const dataNascimento = partes[3] || '';

            if (!nome || nome.length < 2) return null;

            return {
                idPrefixo: idOuChamada,
                nome: nome,
                matricula: matricula,
                dataNascimento: dataNascimento
            };
        } else {
            // Sem underscore: tratar como apenas o nome do aluno.
            // Remove número de lista no início (ex: "01. Nome", "1) Nome", "1 - Nome") mantendo hífens no meio do nome (ex: Jean-Luc)
            let nome = linha.replace(/^\d+[\.\)\s\t]+/, '').replace(/^-\s+/, '').trim();
            if (nome.length < 2) return null;

            return {
                idPrefixo: '',
                nome: nome,
                matricula: '',
                dataNascimento: ''
            };
        }
    },
    limparListaAlunos(textoBruto) {
        if (!textoBruto) {
            this.wizard.data.alunosRascunho = [];
            return;
        }
        const linhas = textoBruto.split('\n');
        const alunosLimpos = [];
        linhas.forEach(linha => {
            const parsed = this.parseLinhaAlunoLote(linha);
            if (parsed) {
                alunosLimpos.push(parsed.nome);
            }
        });
        this.wizard.data.alunosRascunho = alunosLimpos;
        this.renderRevisaoAlunos();
    },
    removerAlunoRascunho(index) {
        this.wizard.data.alunosRascunho.splice(index, 1);
        this.renderRevisaoAlunos();
    },
    finalizarWizard() {
        const d = this.wizard.data;
        const novaTurma = {
            id: d.id,
            nome: d.nome,
            serie: d.serie,
            disciplina: d.disciplina,
            turno: d.turno,
            periodoLetivo: d.periodoLetivo,
            horarios: d.horarios,
            planejamento: {},
            planejamentoMensal: {},
            alunos: [],
            avaliacoes: []
        };
        d.alunosRascunho.forEach((nomeAluno, index) => {
            const numChamada = String(index + 1).padStart(2, '0');
            novaTurma.alunos.push({
                id: 'aluno_' + Date.now().toString(36) + '_' + index,
                nome: nomeAluno,
                chamada: numChamada,
                matricula: '',
                dataNascimento: '',
                status: 'cursando',
                posicao: null,
                frequencia: {},
                notas: {},
                dossie: []
            });
        });
        if (!model.state.turmas) model.state.turmas = [];
        model.state.turmas.push(novaTurma);

        model.saveLocal();
        if (model.persist && window.firebaseService) {
            model.persist(() => window.firebaseService.saveTurma(model.currentUser.uid, novaTurma));
        }
        Toast.show("Turma criada com sucesso!", "success");
        controller.closeModal();
        controller.navigate('turmas');
    },
    openAddAlunoLote(turmaId) {
        const html = `
            <div id="modal-aluno-lote-wrap" style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
                <div class="alert alert--info">
                    <div>
                        <p style="font-weight: 700; margin-bottom: 0.25rem;"><i class="fas fa-magic"></i> Importação Flexível de Estudantes</p>
                        <p style="font-size: 0.8125rem; line-height: 1.4;">
                            Você pode colar nomes simples <em>(um por linha)</em> ou a estrutura padrão com underscore:<br>
                            <code>ID _ NOME COMPLETO _ MATRÍCULA _ DATA/DE/NASCIMENTO</code><br>
                            <small class="text-slate-400">* Hífens dentro dos nomes (ex: Jean-Luc) são preservados com segurança.</small>
                        </p>
                    </div>
                </div>
                
                <div>
                    <label class="form-label">Lista de Estudantes</label>
                    <textarea id="al-lista" rows="10" class="form-input" style="font-family: monospace; resize: vertical;" placeholder="1 _ João da Silva _ 20260101 _ 15/03/2012\n2 _ Maria Oliveira _ 20260102 _ 22/07/2012\nou apenas nomes simples:\nPedro Santos\nAna Paula"></textarea>
                </div>
                
                <div style="display: flex; align-items: center; gap: var(--spacing-3); padding: var(--spacing-3); background-color: var(--color-slate-50); border-radius: var(--radius-xl); border: 1px solid var(--color-slate-100);">
                    <input type="checkbox" id="al-alfabetica" checked style="width: 1.25rem; height: 1.25rem; cursor: pointer;">
                    <label for="al-alfabetica" style="font-size: 0.875rem; font-weight: 700; color: var(--color-slate-600); cursor: pointer; user-select: none;">
                        Ordenar em ordem alfabética antes de importar
                    </label>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: var(--spacing-3); padding-top: var(--spacing-4); border-top: 1px solid var(--color-slate-100); margin-top: var(--spacing-2);">
                    <button type="button" data-action="fechar-modal" class="btn-secondary">Cancelar</button>
                    <button type="button" data-action="salvar-aluno-lote" data-turma-id="${turmaId}" class="btn-primary">Importar Lista</button>
                </div>
            </div>
        `;
        controller.openModal('Importar Estudantes em Lote', html);
        const wrap = document.getElementById('modal-aluno-lote-wrap');
        if (wrap) {
            EventDelegator.bind(wrap, {
                'fechar-modal': () => controller.closeModal(),
                'salvar-aluno-lote': (e, target) => {
                    const tId = target.getAttribute('data-turma-id');
                    if (tId) this.saveAlunoLote(tId);
                }
            }, 'click');
        }
    },
    saveAlunoLote(turmaId) {
        const texto = document.getElementById('al-lista')?.value || '';
        const inputOrdenar = document.getElementById('al-alfabetica');
        const ordenar = inputOrdenar ? inputOrdenar.checked : false;

        const linhas = texto.split('\n');
        let alunosParsed = [];

        linhas.forEach(linha => {
            const parsed = this.parseLinhaAlunoLote(linha);
            if (parsed) {
                alunosParsed.push(parsed);
            }
        });

        if (alunosParsed.length === 0) return Toast.show("A lista informada está vazia.", "warning");

        if (ordenar) {
            alunosParsed.sort((a, b) => a.nome.localeCompare(b.nome));
        }

        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;

        let ultimoNumeroChamada = 0;
        (turma.alunos || []).forEach(a => {
            const num = parseInt(a.chamada);
            if (!isNaN(num) && num > ultimoNumeroChamada) {
                ultimoNumeroChamada = num;
            }
        });

        alunosParsed.forEach((item, index) => {
            const numChamada = item.idPrefixo && !isNaN(parseInt(item.idPrefixo))
                ? String(parseInt(item.idPrefixo)).padStart(2, '0')
                : String(ultimoNumeroChamada + index + 1).padStart(2, '0');

            const novoAluno = {
                id: 'aluno_' + Date.now().toString(36) + '_' + index,
                nome: item.nome,
                chamada: numChamada,
                matricula: item.matricula || '',
                dataNascimento: item.dataNascimento || '',
                status: 'cursando',
                notas: {},
                frequencia: {},
                dossie: []
            };
            turma.alunos.push(novoAluno);
        });

        model.saveLocal();
        if (model.persist && window.firebaseService) {
            model.persist(() => firebaseService.saveTurma(model.currentUser.uid, turma));
        }
        controller.closeModal();
        if (turmasView) {
            turmasView.renderDetalhesTurma('view-container', turmaId);
        }
        Toast.show(`${alunosParsed.length} estudantes importados com sucesso!`, "success");
    },
    abrirModalReplicarAvaliacao(turmaOrigemId) {
        const turmaOrigem = model.state.turmas.find(t => String(t.id) === String(turmaOrigemId));
        if (!turmaOrigem || !turmaOrigem.avaliacoes || turmaOrigem.avaliacoes.length === 0) {
            return Toast.show("Esta turma não possui avaliações cadastradas para replicar.", "warning");
        }

        const outrasTurmas = (model.state.turmas || []).filter(t => String(t.id) !== String(turmaOrigemId));
        if (outrasTurmas.length === 0) {
            return Toast.show("Não há outras turmas cadastradas no sistema.", "info");
        }

        const htmlAvaliacoes = turmaOrigem.avaliacoes.map(av => `
            <option value="${av.id}">
                ${window.escapeHTML(av.nome)} (${av.periodo || 1}º Período - Max: ${av.max} pts)
            </option>
        `).join('');

        const htmlTurmas = outrasTurmas.map(t => {
            const isMesmaSerie = t.serie && turmaOrigem.serie && t.serie.trim().toLowerCase() === turmaOrigem.serie.trim().toLowerCase();
            return `
                <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border: 1px solid var(--color-slate-200); border-radius: var(--radius-lg); background-color: var(--color-white); cursor: pointer;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" class="checkbox-replicar-av" value="${t.id}" ${isMesmaSerie ? 'checked' : ''}>
                        <span style="font-weight: 700; font-size: 0.875rem; color: var(--color-slate-800);">${window.escapeHTML(t.nome)}</span>
                    </div>
                    <span style="font-size: 0.75rem; color: var(--color-slate-400); font-weight: 600;">
                        ${window.escapeHTML(t.serie || '')} ${isMesmaSerie ? '<strong style="color: #10b981;">(Mesma Série)</strong>' : ''}
                    </span>
                </label>
            `;
        }).join('');

        window.controller.openModal(`Replicar Avaliação para Outras Turmas`, `
            <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; max-width: 580px;">
                <div class="alert alert--info" style="font-size: 0.8125rem;">
                    <i class="fas fa-copy mr-1"></i> Selecione a avaliação de <strong>${window.escapeHTML(turmaOrigem.nome)}</strong> e as turmas que receberão a mesma estrutura avaliativa.
                </div>

                <div>
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase;">Avaliação a Replicar</label>
                    <select id="select-av-origem" class="form-input" style="width: 100%; font-weight: 700;">
                        ${htmlAvaliacoes}
                    </select>
                </div>

                <div>
                    <label class="form-label" style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.5rem; display: block;">Selecione as Turmas de Destino</label>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 250px; overflow-y: auto;" class="custom-scrollbar">
                        ${htmlTurmas}
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem;">
                    <button type="button" data-action="fechar-modal" class="btn-secondary">Cancelar</button>
                    <button type="button" data-action="confirmar-replicar-av" data-origem="${turmaOrigemId}" class="btn-primary">
                        <i class="fas fa-check mr-1"></i> Replicar Avaliação
                    </button>
                </div>
            </div>
        `);

        const modalReplicarAvWrap = document.getElementById('modal-replicar-av-wrap');
        if (modalReplicarAvWrap) {
            EventDelegator.bind(modalReplicarAvWrap, {
                'fechar-modal': () => window.controller.closeModal(),
                'confirmar-replicar-av': (e, target) => {
                    const orig = target.getAttribute('data-origem');
                    if (orig) this.confirmarReplicacaoAvaliacao(orig);
                }
            }, 'click');
        }
    },
    confirmarReplicacaoAvaliacao(turmaOrigemId) {
        const avaliacaoId = document.getElementById('select-av-origem')?.value;
        const checkboxes = document.querySelectorAll('.checkbox-replicar-av:checked');

        if (!avaliacaoId) return Toast.show("Selecione a avaliação.", "warning");
        if (checkboxes.length === 0) return Toast.show("Selecione ao menos uma turma de destino.", "warning");

        const turmasDestinoIds = Array.from(checkboxes).map(cb => cb.value);
        const total = model.replicarAvaliacaoParaTurmas(turmaOrigemId, avaliacaoId, turmasDestinoIds);

        if (total > 0) {
            window.controller.closeModal();
            Toast.show(`Avaliação replicada com sucesso para ${total} turma${total > 1 ? 's' : ''}!`, "success");
        } else {
            Toast.show("Não foi possível replicar a avaliação.", "error");
        }
    },
    abrirModalDossieComportamental(turmaId, alunoId) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        const aluno = (turma.alunos || []).find(a => String(a.id) === String(alunoId));
        if (!aluno) return;

        const dossie = Array.isArray(aluno.dossie) ? aluno.dossie : [];
        const hojeIso = new Date().toISOString().split('T')[0];

        const iconesTipo = {
            'positivo': { icone: 'fa-star', cor: '#10b981', label: 'Elogio / Positivo', bg: '#ecfdf5' },
            'indisciplina': { icone: 'fa-exclamation-triangle', cor: '#ef4444', label: 'Indisciplina / Atenção', bg: '#fef2f2' },
            'coordenacao': { icone: 'fa-user-shield', cor: '#6366f1', label: 'Encaminhamento Coordenação', bg: '#eef2ff' },
            'familia': { icone: 'fa-phone-alt', cor: '#a855f7', label: 'Contato com Família', bg: '#faf5ff' },
            'outro': { icone: 'fa-sticky-note', cor: '#64748b', label: 'Observação Geral', bg: '#f8fafc' }
        };

        const htmlTimeline = dossie.length > 0 ? dossie.map(oc => {
            const cfg = iconesTipo[oc.tipo] || iconesTipo['outro'];
            const dataFmt = oc.data ? oc.data.split('-').reverse().join('/') : 'Data n/d';
            return `
                <div style="display: flex; gap: 1rem; position: relative; padding-bottom: 1.25rem;">
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <div style="width: 2rem; height: 2rem; border-radius: 50%; background-color: ${cfg.bg}; color: ${cfg.cor}; display: flex; align-items: center; justify-content: center; font-size: 0.875rem; border: 2px solid ${cfg.cor}; z-index: 2;">
                            <i class="fas ${cfg.icone}"></i>
                        </div>
                        <div style="width: 2px; height: 100%; background-color: #e2e8f0; margin-top: 0.25rem;"></div>
                    </div>
                    <div style="flex: 1; background-color: var(--color-white); border: 1px solid var(--color-slate-200); border-radius: var(--radius-lg); padding: 0.75rem 1rem; box-shadow: var(--shadow-sm);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                            <span style="font-size: 0.6875rem; font-weight: 800; color: ${cfg.cor}; text-transform: uppercase; letter-spacing: 0.05em;">
                                ${cfg.label}
                            </span>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span style="font-size: 0.6875rem; color: var(--color-slate-400); font-weight: 600;">
                                     <i class="far fa-calendar-alt mr-1"></i> ${dataFmt}
                                </span>
                                <button type="button" data-action="remover-ocorrencia" data-turma-id="${turmaId}" data-aluno-id="${alunoId}" data-id="${oc.id}" style="background: none; border: none; color: var(--color-slate-300); cursor: pointer; padding: 0;" title="Remover Ocorrência">
                                    <i class="fas fa-trash-alt" style="font-size: 0.75rem;"></i>
                                </button>
                            </div>
                        </div>
                        <h4 style="font-size: 0.875rem; font-weight: 700; color: var(--color-slate-800); margin: 0 0 0.25rem 0;">${window.escapeHTML(oc.titulo || 'Registro')}</h4>
                        <p style="font-size: 0.8125rem; color: var(--color-slate-600); margin: 0; line-height: 1.4;">${window.escapeHTML(oc.descricao || '')}</p>
                    </div>
                </div>
            `;
        }).join('') : `
            <div style="text-align: center; padding: 2rem 1rem; color: var(--color-slate-400);">
                <i class="fas fa-clipboard-list text-3xl" style="margin-bottom: 0.5rem; opacity: 0.5;"></i>
                <p style="font-size: 0.875rem; font-weight: 600;">Nenhum registro comportamental no dossiê até o momento.</p>
            </div>
        `;

        window.controller.openModal(`Dossiê Comportamental - ${aluno.nome}`, `
            <div id="modal-dossie-wrap" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; max-width: 680px; max-height: 80vh; overflow-y: auto;" class="custom-scrollbar">
                
                <!-- HEADER DO ESTUDANTE -->
                <div style="display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #1e293b, #0f172a); color: white; padding: 1rem 1.25rem; border-radius: var(--radius-xl);">
                    <div>
                        <span style="font-size: 0.6875rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Ficha Pedagógica & Linha do Tempo</span>
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: white; margin: 0.125rem 0 0 0;">${window.escapeHTML(aluno.nome)}</h3>
                        <p style="font-size: 0.75rem; color: #cbd5e1; margin-top: 0.125rem;">${window.escapeHTML(turma.nome)} • Chamada Nº ${aluno.chamada || '1'}</p>
                    </div>
                    <button type="button" data-action="gerar-relatorio-conselho" data-turma-id="${turmaId}" data-aluno-id="${alunoId}" class="btn-secondary" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); color: white; font-size: 0.75rem; padding: 0.5rem 0.875rem; border-radius: var(--radius-lg);" title="Gerar Relatório para Conselho de Classe">
                        <i class="fas fa-file-signature mr-1"></i> Relatório Conselho
                    </button>
                </div>

                <!-- FORMULÁRIO DE NOVO REGISTRO RÁPIDO -->
                <div style="background-color: var(--color-slate-50); border: 1px solid var(--color-slate-200); border-radius: var(--radius-xl); padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;">
                    <h4 style="font-size: 0.8125rem; font-weight: 800; color: var(--color-slate-700); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.35rem;">
                        <i class="fas fa-plus-circle text-primary"></i> Novo Registro na Linha do Tempo
                    </h4>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                        <div>
                            <label class="form-label" style="font-size: 0.6875rem; font-weight: 800; text-transform: uppercase;">Tipo de Ocorrência</label>
                            <select id="dossie-tipo" class="form-input" style="width: 100%; font-weight: 700;">
                                <option value="positivo">🟢 Elogio / Alta Participação</option>
                                <option value="indisciplina">🔴 Indisciplina / Alerta</option>
                                <option value="coordenacao">🔵 Encaminhamento Coordenação</option>
                                <option value="familia">🟣 Contato com Família</option>
                                <option value="outro">⚪ Observação Geral</option>
                            </select>
                        </div>

                        <div>
                            <label class="form-label" style="font-size: 0.6875rem; font-weight: 800; text-transform: uppercase;">Data</label>
                            <input type="date" id="dossie-data" class="form-input" value="${hojeIso}" style="width: 100%; font-weight: 700;">
                        </div>
                    </div>

                    <div>
                        <label class="form-label" style="font-size: 0.6875rem; font-weight: 800; text-transform: uppercase;">Título do Registro</label>
                        <input type="text" id="dossie-titulo" class="form-input" placeholder="Ex: Excelente liderança em trabalho de grupo / Advertência verbal por uso de celular" style="width: 100%; font-weight: 600;">
                    </div>

                    <div>
                        <label class="form-label" style="font-size: 0.6875rem; font-weight: 800; text-transform: uppercase;">Detalhamento Pedagógico / Encaminhamento</label>
                        <textarea id="dossie-desc" class="form-input" rows="2" placeholder="Descreva os fatos, atitudes tomadas ou combinados firmados com o estudante..." style="width: 100%; resize: vertical; font-weight: 500;"></textarea>
                    </div>

                    <div style="display: flex; justify-content: flex-end;">
                        <button type="button" data-action="salvar-dossie" data-turma-id="${turmaId}" data-aluno-id="${alunoId}" class="btn-primary" style="padding: 0.5rem 1.25rem; font-size: 0.8125rem;">
                            <i class="fas fa-save mr-1"></i> Salvar no Dossiê
                        </button>
                    </div>
                </div>

                <!-- LINHA DO TEMPO CRONOLÓGICA -->
                <div>
                    <h4 style="font-size: 0.8125rem; font-weight: 800; color: var(--color-slate-700); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem;">
                        <i class="fas fa-stream mr-1 text-primary"></i> Linha do Tempo Cronológica (${dossie.length} registros)
                    </h4>
                    <div style="display: flex; flex-direction: column;">
                        ${htmlTimeline}
                    </div>
                </div>
            </div>
        `, 'lg');

        const modalDossieWrap = document.getElementById('modal-dossie-wrap');
        if (modalDossieWrap) {
            EventDelegator.bind(modalDossieWrap, {
                'gerar-relatorio-conselho': (e, target) => {
                    const tId = target.getAttribute('data-turma-id');
                    const aId = target.getAttribute('data-aluno-id');
                    if (tId && aId) this.gerarRelatorioConselhoClasse(tId, aId);
                },
                'salvar-dossie': (e, target) => {
                    const tId = target.getAttribute('data-turma-id');
                    const aId = target.getAttribute('data-aluno-id');
                    if (tId && aId) this.salvarOcorrenciaDossie(tId, aId);
                },
                'remover-ocorrencia': (e, target) => {
                    const tId = target.getAttribute('data-turma-id');
                    const aId = target.getAttribute('data-aluno-id');
                    const ocId = target.getAttribute('data-id');
                    if (tId && aId && ocId) this.removerOcorrenciaDossie(tId, aId, ocId);
                }
            }, 'click');
        }
    },
    salvarOcorrenciaDossie(turmaId, alunoId) {
        const tipo = document.getElementById('dossie-tipo')?.value || 'outro';
        const data = document.getElementById('dossie-data')?.value || new Date().toISOString().split('T')[0];
        const titulo = document.getElementById('dossie-titulo')?.value.trim();
        const descricao = document.getElementById('dossie-desc')?.value.trim();

        if (!titulo) {
            return Toast.show("Informe o título da ocorrência.", "warning");
        }

        const novaOcorrencia = {
            tipo,
            data,
            titulo,
            descricao
        };

        const salvo = model.addOcorrenciaDossie(turmaId, alunoId, novaOcorrencia);
        if (salvo) {
            Toast.show("Registro adicionado à linha do tempo!", "success");
            this.abrirModalDossieComportamental(turmaId, alunoId);
        } else {
            Toast.show("Não foi possível salvar o registro.", "error");
        }
    },
    removerOcorrenciaDossie(turmaId, alunoId, ocorrenciaId) {
        if (confirm("Remover esta ocorrência do dossiê?")) {
            model.deleteOcorrenciaDossie(turmaId, alunoId, ocorrenciaId);
            Toast.show("Registro removido.", "info");
            this.abrirModalDossieComportamental(turmaId, alunoId);
        }
    },
    gerarRelatorioConselhoClasse(turmaId, alunoId) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return;
        const aluno = (turma.alunos || []).find(a => String(a.id) === String(alunoId));
        if (!aluno) return;

        const dossie = Array.isArray(aluno.dossie) ? aluno.dossie : [];

        const relatorioHtml = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Relatório de Conselho de Classe - ${window.escapeHTML(aluno.nome)}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2rem; color: #1e293b; line-height: 1.5; }
                    .header { border-bottom: 2px solid #0f172a; padding-bottom: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: flex-end; }
                    h1 { font-size: 1.5rem; margin: 0 0 0.25rem 0; color: #0f172a; }
                    .meta { font-size: 0.875rem; color: #64748b; }
                    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; page-break-inside: avoid; }
                    .tag { display: inline-block; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; }
                    .positivo { background-color: #dcfce7; color: #15803d; }
                    .indisciplina { background-color: #fee2e2; color: #b91c1c; }
                    .coordenacao { background-color: #e0e7ff; color: #4338ca; }
                    .familia { background-color: #f3e8ff; color: #7e22ce; }
                    .outro { background-color: #f1f5f9; color: #475569; }
                    .print-btn { margin-bottom: 1.5rem; padding: 0.5rem 1rem; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
                    @media print { .print-btn { display: none; } }
                </style>
            </head>
            <body>
                <button type="button" class="print-btn" id="btn-imprimir-conselho">Imprimir Relatório</button>
                <div class="header">
                    <div>
                        <h1>Dossiê Pedagógico & Conselho de Classe</h1>
                        <div class="meta">
                            <strong>Estudante:</strong> ${window.escapeHTML(aluno.nome)} | 
                            <strong>Turma:</strong> ${window.escapeHTML(turma.nome)} | 
                            <strong>Nº Chamada:</strong> ${aluno.chamada || '1'}
                        </div>
                    </div>
                    <div class="meta" style="text-align: right;">
                        <strong>Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}
                    </div>
                </div>

                <h3>Histórico Cronológico de Ocorrências & Acompanhamento</h3>
                ${dossie.length > 0 ? dossie.map(oc => `
                    <div class="card">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span class="tag ${oc.tipo || 'outro'}">${oc.tipo?.toUpperCase() || 'REGISTRO'}</span>
                            <span style="font-size: 0.8125rem; color: #64748b;">${oc.data ? oc.data.split('-').reverse().join('/') : ''}</span>
                        </div>
                        <h4 style="margin: 0 0 0.25rem 0; font-size: 1rem;">${window.escapeHTML(oc.titulo || '')}</h4>
                        <p style="margin: 0; font-size: 0.875rem; color: #334155;">${window.escapeHTML(oc.descricao || '')}</p>
                    </div>
                `).join('') : '<p>Nenhum apontamento comportamental registrado.</p>'}
                <script>
                    document.getElementById('btn-imprimir-conselho')?.addEventListener('click', function() {
                        window.print();
                    });
                </script>
            </body>
            </html>
        `;

        const win = window.open('', '_blank');
        if (win) {
            const safeHtml = window.sanitizeComLatex ? window.sanitizeComLatex(relatorioHtml) : relatorioHtml;
            win.document.open();
            win.document.write(safeHtml);
            win.document.close();
        } else {
            Toast.show("Permita pop-ups para visualizar a impressão do relatório.", "warning");
        }
    },
    renderWizardStep() {
        const container = document.getElementById('wizard-container');
        if (!container) return;
        const { step } = this.wizard;

        let headerHtml = `
            <div class="wizard-header">
                <button type="button" data-action="wizard-voltar" class="btn-outline">
                    <i class="fas fa-chevron-left"></i> ${step === 1 ? 'Cancelar' : 'Voltar'}
                </button>
                <div class="hidden md:flex items-center gap-2">
                    ${this.gerarProgressoVisual()}
                </div>
            </div>
        `;
        let bodyHtml = '';
        let footerHtml = `
            <div class="wizard-footer">
                <button type="button" data-action="wizard-avancar" class="btn-primary" style="padding: 0.75rem 2rem;">
                    ${step === 4 ? 'Concluir e Salvar' : 'Continuar'} <i class="fas ${step === 4 ? 'fa-check' : 'fa-chevron-right'}"></i>
                </button>
            </div>
        `;
        switch (step) {
            case 1: bodyHtml = this.renderStep1_Dados(); break;
            case 2: bodyHtml = this.renderStep2_Periodo(); break;
            case 3: bodyHtml = this.renderStep3_Horarios(); break;
            case 4:
                bodyHtml = this.renderStep4_Alunos();
                footerHtml = '';
                break;
        }
        container.innerHTML = headerHtml + `<div class="flex-1 animate-slide-in">` + bodyHtml + `</div>` + footerHtml;

        EventDelegator.bind(container, {
            'wizard-voltar': () => this.voltar(),
            'wizard-avancar': () => this.avancar(),
            'wizard-revisar': () => this.salvarEstadoPassoAtual(),
            'wizard-remover-rascunho': (e, target) => {
                const idx = parseInt(target.getAttribute('data-index'), 10);
                if (!isNaN(idx)) this.removerAlunoRascunho(idx);
            },
            'wizard-voltar-texto': () => this.voltarParaTexto(),
            'wizard-finalizar': () => this.finalizarWizard()
        }, 'click');

        if (step === 4 && this.wizard.data.alunosRascunho.length > 0) {
            this.renderRevisaoAlunos();
        }
    },
    gerarProgressoVisual() {
        const steps = ['Dados', 'Período', 'Horários', 'Alunos'];
        return steps.map((label, idx) => {
            const numero = idx + 1;
            const isActive = numero === this.wizard.step;
            const isCompleted = numero < this.wizard.step;

            let circleClass = 'wizard-step';
            let iconOrNum = numero;
            if (isCompleted) {
                circleClass += ' wizard-step--completed';
                iconOrNum = '<i class="fas fa-check"></i>';
            } else if (isActive) {
                circleClass += ' wizard-step--active';
            }
            const linha = idx < 3 ? `<div class="wizard-step__line ${isCompleted ? 'wizard-step__line--completed' : ''}"></div>` : '';
            return `
                <div style="display: flex; align-items: center; gap: var(--spacing-2);">
                    <div style="display: flex; align-items: center; gap: var(--spacing-2);">
                        <div class="${circleClass}">
                            ${iconOrNum}
                        </div>
                        <span style="font-size: 0.75rem; font-weight: 700; color: ${isActive || isCompleted ? 'var(--color-slate-700)' : 'var(--color-slate-400)'};">${label}</span>
                    </div>
                    ${linha}
                </div>
            `;
        }).join('');
    },
    renderStep1_Dados() {
        const d = this.wizard.data;
        return `
            <div style="max-width: 42rem; margin: 0 auto; display: flex; flex-direction: column; gap: var(--spacing-6);">
                <div>
                    <h3 style="font-size: 1.5rem; font-weight: 700; color: var(--color-slate-800);">Dados da turma</h3>
                    <p style="color: var(--color-slate-500); font-size: 0.875rem; margin-top: var(--spacing-1);">Só o nome é obrigatório — o resto dá pra ajustar depois.</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: var(--spacing-4);">
                    <div>
                        <label class="form-label">Nome da turma *</label>
                        <input type="text" id="wiz-nome" value="${d.nome}" placeholder="Ex: 9º Ano B, Manhã" class="form-input">
                    </div>
                    <div>
                        <label class="form-label">Série</label>
                        <select id="wiz-serie" class="form-select">
                            <option value="">—</option>
                            ${this.series.map(s => `<option value="${s}" ${d.serie === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Disciplina</label>
                        <select id="wiz-disciplina" class="form-select">
                            <option value="">—</option>
                            ${this.disciplinas.map(m => `<option value="${m}" ${d.disciplina === m ? 'selected' : ''}>${m}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Turno</label>
                        <select id="wiz-turno" class="form-select">
                            <option value="">—</option>
                            <option value="Manhã" ${d.turno === 'Manhã' ? 'selected' : ''}>Manhã</option>
                            <option value="Tarde" ${d.turno === 'Tarde' ? 'selected' : ''}>Tarde</option>
                            <option value="Noite" ${d.turno === 'Noite' ? 'selected' : ''}>Noite</option>
                            <option value="Integral" ${d.turno === 'Integral' ? 'selected' : ''}>Integral</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    },
    renderStep2_Periodo() {
        const d = this.wizard.data.periodoLetivo;
        return `
            <div style="max-width: 42rem; margin: 0 auto; display: flex; flex-direction: column; gap: var(--spacing-6);">
                <div>
                    <h3 style="font-size: 1.5rem; font-weight: 700; color: var(--color-slate-800);">Período letivo e avaliação</h3>
                    <p style="color: var(--color-slate-500); font-size: 0.875rem; margin-top: var(--spacing-1);">Opcional. Define os bimestres e as regras de aprovação/faltas.</p>
                </div>
                <div style="padding: var(--spacing-6); background-color: var(--color-slate-50); border: 1px solid var(--color-slate-200); border-radius: var(--radius-2xl); display: flex; flex-direction: column; gap: var(--spacing-5);">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4);">
                        <div>
                            <label class="form-label">Início</label>
                            <input type="date" id="wiz-per-ini" value="${d.inicio}" class="form-input">
                        </div>
                        <div>
                            <label class="form-label">Término</label>
                            <input type="date" id="wiz-per-fim" value="${d.termino}" class="form-input">
                        </div>
                    </div>
                    <div>
                        <label class="form-label">Divisão do ano</label>
                        <select id="wiz-per-div" class="form-select">
                            <option value="Bimestral" ${d.divisao === 'Bimestral' ? 'selected' : ''}>Bimestral (4 períodos)</option>
                            <option value="Trimestral" ${d.divisao === 'Trimestral' ? 'selected' : ''}>Trimestral (3 períodos)</option>
                            <option value="Semestral" ${d.divisao === 'Semestral' ? 'selected' : ''}>Semestral (2 períodos)</option>
                            <option value="Anual" ${d.divisao === 'Anual' ? 'selected' : ''}>Anual (Sem divisões)</option>
                        </select>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4);">
                    <div>
                        <label class="form-label">Média de aprovação</label>
                        <input type="number" id="wiz-per-med" value="${d.media}" step="0.1" class="form-input" placeholder="Ex: 6.0">
                    </div>
                    <div>
                        <label class="form-label">Limite de faltas</label>
                        <input type="number" id="wiz-per-faltas" value="${d.faltas}" class="form-input" placeholder="Ex: 25">
                    </div>
                </div>
            </div>
        `;
    },
    renderStep3_Horarios() {
        return `
            <div style="max-width: 42rem; margin: 0 auto; display: flex; flex-direction: column; gap: var(--spacing-6);">
                <div>
                    <h3 style="font-size: 1.5rem; font-weight: 700; color: var(--color-slate-800);">Horários das aulas</h3>
                    <p style="color: var(--color-slate-500); font-size: 0.875rem; margin-top: var(--spacing-1);">Opcional. Com os horários, a chamada do dia aparece sozinha.</p>
                </div>
                <div style="padding: var(--spacing-10); border: 2px dashed var(--color-slate-200); border-radius: var(--radius-2xl); text-align: center; background-color: var(--color-slate-50);">
                    <i class="far fa-clock" style="font-size: 2.25rem; color: var(--color-slate-300); margin-bottom: var(--spacing-4);"></i>
                    <h4 style="font-weight: 700; color: var(--color-slate-600); margin-bottom: var(--spacing-1);">Módulo unificado na Grade Horária</h4>
                    <p style="font-size: 0.875rem; color: var(--color-slate-500); margin-bottom: var(--spacing-6); max-width: 24rem; margin-left: auto; margin-right: auto;">Para evitar conflitos de horários entre turmas, toda a alocação de aulas agora é feita na aba central de <strong>Grade Horária</strong>.</p>
                    <button type="button" data-action="wizard-avancar" class="btn-primary" style="margin: 0 auto;">
                        Pular esta etapa <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
    },
    renderStep4_Alunos() {
        const d = this.wizard.data;
        return `
            <div style="max-width: 42rem; margin: 0 auto; display: flex; flex-direction: column; gap: var(--spacing-6); height: 100%;">
                <div>
                    <h3 style="font-size: 1.5rem; font-weight: 700; color: var(--color-slate-800);">Alunos da turma</h3>
                    <p style="color: var(--color-slate-500); font-size: 0.875rem; margin-top: var(--spacing-1);">Cole a lista do WhatsApp ou da secretaria — você confere antes de criar.</p>
                </div>
                <div id="step-colar-alunos" style="display: ${d.alunosRascunho.length > 0 ? 'none' : 'flex'}; flex-direction: column; flex: 1;">
                    <label class="form-label">Cole a lista, um nome por linha</label>
                    <textarea id="wiz-alunos-texto" rows="12" placeholder="Ana Beatriz Souza\nCarlos Eduardo Lima\nDaniela Nunes\n..." 
                              style="width: 100%; flex: 1; padding: var(--spacing-5); background-color: var(--color-slate-50); border: 1px solid var(--color-slate-200); border-radius: var(--radius-2xl); outline: none; font-family: monospace; font-size: 0.875rem; line-height: 1.625; resize: none;" class="form-input">${d.textoBrutoAlunos}</textarea>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--spacing-4); padding-top: var(--spacing-4); border-top: 1px solid var(--color-slate-100);">
                        <p style="font-size: 0.625rem; color: var(--color-slate-400); font-weight: 700; text-transform: uppercase;">Pode colar com número, "nº", travessão — a IA limpa.</p>
                        <button type="button" data-action="wizard-revisar" class="btn-primary" style="background-color: #e0e7ff; color: #4338ca;">
                            <i class="fas fa-magic"></i> Revisar Lista
                        </button>
                    </div>
                </div>
                <div id="step-revisar-alunos" style="display: none; flex-direction: column; flex: 1;">
                    <!-- Conteúdo injetado via JS na função renderRevisaoAlunos() -->
                </div>
            </div>
        `;
    },
    renderRevisaoAlunos() {
        const d = this.wizard.data;
        const containerColar = document.getElementById('step-colar-alunos');
        const containerRevisar = document.getElementById('step-revisar-alunos');
        const footerWizard = document.querySelector('.mt-auto.pt-6');
        if (!containerColar || !containerRevisar) return;
        containerColar.style.display = 'none';
        containerRevisar.style.display = 'flex';
        if (footerWizard) footerWizard.style.display = 'none';
        const itensHtml = d.alunosRascunho.map((nome, i) => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-3); background-color: var(--color-white); border: 1px solid var(--color-slate-100); border-radius: var(--radius-xl); box-shadow: var(--shadow-sm); animation: slideUp 0.3s ease forwards; animation-delay: ${i * 20}ms;">
                <div style="display: flex; align-items: center; gap: var(--spacing-3);">
                    <span style="font-size: 0.625rem; font-weight: 900; color: var(--color-slate-300); width: 1rem; text-align: right;">${i + 1}</span>
                    <span style="font-size: 0.875rem; font-weight: 700; color: var(--color-slate-700); text-transform: uppercase;">${window.escapeHTML(nome)}</span>
                </div>
                <button type="button" data-action="wizard-remover-rascunho" data-index="${i}" class="btn-icon" style="color: #ef4444; background-color: #fef2f2;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
        containerRevisar.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; background-color: #ecfdf5; border: 1px solid #d1fae5; padding: var(--spacing-4); border-radius: var(--radius-xl); margin-bottom: var(--spacing-4);">
                <span style="font-weight: 700; color: #065f46; font-size: 0.875rem;">Confira antes de salvar</span>
                <span style="background-color: #a7f3d0; color: #065f46; padding: 0.25rem 0.75rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 900; box-shadow: var(--shadow-sm);">${d.alunosRascunho.length} alunos</span>
            </div>
            <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: var(--spacing-2); padding-right: var(--spacing-2); padding-bottom: var(--spacing-4); max-height: 300px;">
                ${itensHtml}
            </div>
            <div class="wizard-footer">
                <button type="button" data-action="wizard-voltar-texto" class="btn-outline">
                    <i class="fas fa-arrow-left"></i> Voltar e colar de novo
                </button>
                <button type="button" data-action="wizard-finalizar" class="btn-primary" style="padding: 0.75rem 2rem;">
                    Criar turma com ${d.alunosRascunho.length} alunos
                </button>
            </div>
        `;
    },
    voltarParaTexto() {
        const containerColar = document.getElementById('step-colar-alunos');
        const containerRevisar = document.getElementById('step-revisar-alunos');
        containerRevisar.style.display = 'none';
        containerColar.style.display = 'flex';
    },

    deleteTurma(id) {
        model.deleteTurma(id);
        controller.navigate('turmas');
        Toast.show("Turma removida com sucesso.", "info");
    },
    openAddAluno(turmaId, alunoId = null) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        const aluno = alunoId ? turma.alunos.find(a => String(a.id) === String(alunoId)) : null;
        const isEdit = !!aluno;

        const nome = aluno ? aluno.nome : '';
        const chamada = (aluno && aluno.chamada) ? aluno.chamada : '';
        const matricula = (aluno && aluno.matricula) ? aluno.matricula : '';
        const status = (aluno && aluno.status) ? aluno.status : 'cursando';
        const html = `
            <div id="modal-novo-aluno-wrap" style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
                <div>
                    <label class="form-label">Nome do Estudante *</label>
                    <input type="text" id="al-nome" class="form-input" placeholder="Nome completo..." value="${window.escapeHTML(nome)}">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4);">
                    <div>
                        <label class="form-label">Nº Chamada</label>
                        <input type="text" id="al-chamada" class="form-input" placeholder="Ex: 01" value="${window.escapeHTML(chamada)}">
                    </div>
                    <div>
                        <label class="form-label">Matrícula</label>
                        <input type="text" id="al-matricula" class="form-input" placeholder="Ex: 20261234" value="${window.escapeHTML(matricula)}">
                    </div>
                </div>
                <div>
                    <label class="form-label">Situação / Status</label>
                    <select id="al-status" class="form-select">
                        <option value="cursando" ${status === 'cursando' ? 'selected' : ''}>Cursando Ativamente</option>
                        <option value="transferido" ${status === 'transferido' ? 'selected' : ''}>Transferido para outra escola</option>
                        <option value="realocado" ${status === 'realocado' ? 'selected' : ''}>Realocado de Turma</option>
                    </select>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: var(--spacing-3); padding-top: var(--spacing-4);">
                    <button type="button" data-action="fechar-modal" class="btn-secondary">Cancelar</button>
                    <button type="button" data-action="salvar-aluno" data-turma-id="${turmaId}" data-aluno-id="${isEdit ? aluno.id : ''}" class="btn-primary">
                        ${isEdit ? 'Salvar Alterações' : 'Adicionar Estudante'}
                    </button>
                </div>
            </div>
        `;
        controller.openModal(isEdit ? 'Editar Estudante' : 'Novo Estudante', html);
        const modalAlunoWrap = document.getElementById('modal-novo-aluno-wrap');
        if (modalAlunoWrap) {
            EventDelegator.bind(modalAlunoWrap, {
                'fechar-modal': () => controller.closeModal(),
                'salvar-aluno': (e, target) => {
                    const tId = target.getAttribute('data-turma-id');
                    const aId = target.getAttribute('data-aluno-id');
                    this.saveAluno(tId, aId || null);
                }
            }, 'click');
        }
    },
    saveAluno(turmaId, alunoId = null) {
        const nome = document.getElementById('al-nome').value.trim();
        const chamada = document.getElementById('al-chamada').value.trim();
        const matricula = document.getElementById('al-matricula').value.trim();
        const status = document.getElementById('al-status').value;
        if (!nome) return Toast.show("O nome do aluno é obrigatório.", "error");
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (alunoId && alunoId !== 'null' && alunoId !== '') {
            const aluno = turma.alunos.find(a => String(a.id) === String(alunoId));
            if (aluno) {
                aluno.nome = nome;
                aluno.chamada = chamada;
                aluno.matricula = matricula;
                aluno.status = status;

                model.saveLocal();
                if (model.saveTurma) {
                    model.saveTurma(turma);
                }
                Toast.show("Dados do estudante atualizados!", "success");
            }
        } else {
            const novoAluno = {
                id: 'aluno_' + Date.now().toString(36),
                nome: nome,
                chamada: chamada,
                matricula: matricula,
                status: status,
                xp: 0,
                notas: {},
                frequencia: {}
            };
            turma.alunos.push(novoAluno);
            model.saveLocal();

            if (model.saveTurma) {
                model.saveTurma(turma);
            }
            Toast.show("Estudante adicionado!", "success");
        }
        controller.closeModal();
        controller.views['turmas'].renderDetalhesTurma('view-container', turmaId);
    },
    deleteAluno(turmaId, alunoId) {
        if (confirm("Deseja remover este estudante? As notas e frequência serão perdidas.")) {
            model.deleteAluno(turmaId, alunoId);
            turmasView.renderDetalhesTurma('view-container', turmaId);
            Toast.show("Estudante removido.", "info");
        }
    },
    adicionarXP(turmaId, alunoId, quantidade) {
        const turma = model.state.turmas.find(t => t.id === turmaId);
        const aluno = turma.alunos.find(a => a.id === alunoId);

        if (aluno) {
            aluno.xp = (aluno.xp || 0) + quantidade;

            const xpElement = document.getElementById(`xp-${alunoId}`);
            if (xpElement) {
                xpElement.innerText = `${aluno.xp} XP`;
                xpElement.classList.add('text-emerald-500', 'scale-110');
                setTimeout(() => xpElement.classList.remove('text-emerald-500', 'scale-110'), 300);
            }
            Toast.show(`+${quantidade} XP concedido a ${aluno.nome.split(' ')[0]}!`, "success");
        }
    },
    openAddAvaliacao(turmaId) {
        const tipoConfig = model.state.userConfig.periodType || 'bimestre';
        const numPeriodos = tipoConfig === 'bimestre' ? 4 : tipoConfig === 'trimestre' ? 3 : 2;
        const html = `
            <div id="modal-add-avaliacao-wrap" style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4); animation: slideUp 0.3s ease forwards;">
                <div>
                    <label class="form-label">Nome da Avaliação</label>
                    <input type="text" id="av-nome" class="form-input" placeholder="Ex: Prova Mensal, Simulado...">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4);">
                    <div>
                        <label class="form-label">Valor Máximo</label>
                        <input type="number" id="av-max" class="form-input" value="10" step="0.5">
                    </div>
                    <div>
                        <label class="form-label">Período Letivo</label>
                        <select id="av-periodo" class="form-select" style="color: var(--color-primary);">
                            ${Array.from({ length: numPeriodos }, (_, i) => `
                                <option value="${i + 1}" ${turmasView.periodoAtivo === (i + 1) ? 'selected' : ''}>
                                    ${i + 1}º ${tipoConfig.charAt(0).toUpperCase() + tipoConfig.slice(1, 3)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="alert alert--info">
                    <p style="font-size: 0.75rem; line-height: 1.25;">
                        <i class="fas fa-info-circle" style="margin-right: 0.25rem;"></i> Esta nota será computada automaticamente na média do período selecionado.
                    </p>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: var(--spacing-3); padding-top: var(--spacing-4);">
                    <button type="button" data-action="fechar-modal" class="btn-secondary">Cancelar</button>
                    <button type="button" data-action="salvar-avaliacao" data-turma-id="${turmaId}" class="btn-primary">Salvar Avaliação</button>
                </div>
            </div>
        `;
        controller.openModal('Nova Avaliação', html);
        const modalAvWrap = document.getElementById('modal-add-avaliacao-wrap');
        if (modalAvWrap) {
            EventDelegator.bind(modalAvWrap, {
                'fechar-modal': () => controller.closeModal(),
                'salvar-avaliacao': (e, target) => {
                    const tId = target.getAttribute('data-turma-id');
                    if (tId) this.saveAvaliacao(tId);
                }
            }, 'click');
        }
    },
    saveAvaliacao(turmaId) {
        const nome = document.getElementById('av-nome').value;
        const max = document.getElementById('av-max').value;
        const periodo = document.getElementById('av-periodo').value;
        if (!nome || !max) return Toast.show("Preencha o nome e valor da nota.", "error");
        model.addAvaliacao(turmaId, nome, max, periodo);
        controller.closeModal();

        turmasView.periodoAtivo = Number(periodo);
        turmasView.renderDetalhesTurma('view-container', turmaId);

        Toast.show("Avaliação cadastrada com sucesso!", "success");
    },
    deleteAvaliacao(turmaId, avId) {
        if (confirm("Excluir esta avaliação? Todas as notas vinculadas serão apagadas.")) {
            model.deleteAvaliacao(turmaId, avId);
            turmasView.renderDetalhesTurma('view-container', turmaId);
            Toast.show("Avaliação removida.", "info");
        }
    },
    updateNota(turmaId, alunoId, avId, valor) {
        const notaLimpa = valor === "" ? "" : Number(valor);

        model.updateNota(turmaId, alunoId, avId, notaLimpa);

        const turma = model.state.turmas.find(t => t.id === turmaId);
        if (!turma) return;
        const aluno = turma.alunos.find(a => a.id === alunoId);
        if (!aluno) return;

        const avaliacoesFiltradas = (turma.avaliacoes || []).filter(av => Number(av.periodo || 1) === (turmasView?.periodoAtivo || 1));
        const somaPeriodo = avaliacoesFiltradas.reduce((acc, av) => acc + (Number(aluno.notas?.[av.id]) || 0), 0);

        const somaElement = document.getElementById(`soma-${alunoId}`);
        if (somaElement) {
            somaElement.innerText = somaPeriodo.toFixed(1);

            somaElement.classList.add('bg-emerald-100', 'text-emerald-700', 'scale-110');
            setTimeout(() => {
                somaElement.classList.remove('bg-emerald-100', 'text-emerald-700', 'scale-110');
            }, 300);
        }
        if (turmasView) {
            const statsPeriodo = turmasView._calcularEstatisticas(turma, avaliacoesFiltradas);
            const gradientPeriodo = turmasView._gerarGradientDonut(statsPeriodo);

            const rosca = document.getElementById('grafico-rosca');
            const mediaTexto = document.getElementById('media-rosca');
            const legenda = document.getElementById('legenda-rosca');

            if (rosca) {
                const bg = gradientPeriodo.replace('background: ', '').replace(';', '');
                rosca.style.background = bg;
            }
            if (mediaTexto) mediaTexto.innerText = statsPeriodo.mediaGeral;
            if (legenda) legenda.innerHTML = turmasView._renderLegenda(statsPeriodo);

            const statsGeral = turmasView._calcularEstatisticas(turma, turma.avaliacoes || []);
            const gradientGeral = turmasView._gerarGradientDonut(statsGeral);
            const roscaGeral = document.getElementById('grafico-rosca-geral');
            const mediaTextoGeral = document.getElementById('media-rosca-geral');
            const legendaGeral = document.getElementById('legenda-rosca-geral');

            if (roscaGeral) {
                const bgGeral = gradientGeral.replace('background: ', '').replace(';', '');
                roscaGeral.style.background = bgGeral;
            }
            if (mediaTextoGeral) mediaTextoGeral.innerText = statsGeral.mediaGeral;
            if (legendaGeral) legendaGeral.innerHTML = turmasView._renderLegenda(statsGeral);
        }
    }
};
if (typeof window !== 'undefined') {
    window.turmaController = turmaController;
}