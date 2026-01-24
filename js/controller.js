import { model } from './model.js';
import { firebaseService } from './firebase-service.js';
import { bnccView } from './views/bncc.js';
import { turmasView } from './views/turmas.js';
import { calendarioView } from './views/calendario.js';
import { mensalView } from './views/mensal.js';
import { planejamentoView } from './views/planejamento.js';
import { diarioView } from './views/diario.js';
import { salaView } from './views/sala.js';
import { provasView } from './views/provas.js';
import { frequenciaView } from './views/frequencia.js';
import { settingsView } from './views/settings.js';
import { Toast } from './components/toast.js';
import { dashboardView } from './views/dashboard.js';
import { horarioView } from './views/horario.js';
// Helper Global de Segurança
window.escapeHTML = function (str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (match) {
        const escape = {
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        };
        return escape[match];
    });
};
export const controller = {
    currentView: null,
    views: {},
    // --- Inicialização ---
    init: function () {
        if (model && model.init) model.init();
        this.bindViews();
        this.aplicarTema();
        this.setupGlobalListeners();
        this.monitorAuth();
        model.carregarQuestoesSistema();

    },
    bindViews: function () {
        this.views = {
            'dashboard': dashboardView, 'horario': horarioView, 'calendario': calendarioView,
            'mensal': mensalView, 'periodo': planejamentoView, 'dia': diarioView,
            'turmas': turmasView, 'bncc': bnccView, 'mapa': salaView,
            'provas': provasView, 'frequencia': frequenciaView, 'config': settingsView
        };
    },
    monitorAuth: function () {
        if (!firebaseService) return console.error("Firebase Service não carregado.");
        firebaseService.onAuthStateChanged(async (user) => {
            if (user) {
                console.log("Usuário logado:", user.email);
                this.updateAuthButton(true, user);
                const cloudStatus = document.getElementById('cloud-status');
                if (cloudStatus) cloudStatus.innerHTML = '<i class="fas fa-check text-green-500"></i> Sync ON';
                try {
                    await model.loadUserData();
                    this.navigate(this.currentView || 'dashboard');
                } catch (error) {
                    console.error("Erro ao carregar dados:", error);
                }
            } else {
                model.currentUser = null;
                model.data = {};
                this.updateAuthButton(false);
                const cloudStatus = document.getElementById('cloud-status');
                if (cloudStatus) cloudStatus.innerHTML = '<i class="fas fa-cloud text-slate-300"></i> Offline';
                this.navigate('dashboard');
            }
        });
    },
    handleLogin: async function () {
        try { await firebaseService.loginGoogle(); }
        catch (error) { Toast.show("Erro no login Google: " + error.message, 'error'); }
    },
    handleLogout: function () {
        this.confirmarAcao(
            'Sair do Sistema?',
            'Deseja encerrar sua sessão e parar a sincronização?',
            () => { firebaseService.logout(); window.location.reload(); }
        );
    },
    toggleSidebar: function () {
        const sidebar = document.getElementById('app-sidebar');
        const main = document.getElementById('main-content');
        const icon = document.getElementById('sidebar-toggle-icon');
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            sidebar.classList.toggle('mobile-open');
            sidebar.classList.toggle('collapsed', !sidebar.classList.contains('mobile-open'));
        } else {
            sidebar.classList.toggle('collapsed');
            main.classList.toggle('expanded-content');
        }
        icon.className = (sidebar.classList.contains('collapsed') && !sidebar.classList.contains('mobile-open')) ? 'fas fa-bars' : 'fas fa-chevron-left';
    },
    // --- Navegação e UX (Skeleton Loading) ---
    navigate: async function (viewName) {
        if (viewName === 'planejamento') viewName = 'periodo';
        if (viewName === 'diario') viewName = 'dia';
        if (viewName === 'sala') viewName = 'mapa';
        if (viewName === 'settings') viewName = 'config';
        if (!this.views[viewName]) this.bindViews();
        const container = document.getElementById('view-container');
        const view = this.views[viewName];
        this.currentView = viewName;
        this.updateNavHighlight(viewName);
        this.aplicarTema();
        if (viewName === 'dia' && window.diarioView && !diarioView.viewDate) {
            const [ano, mes] = diarioView.currentDate.split('-');
            diarioView.viewDate = new Date(parseInt(ano), parseInt(mes) - 1, 1);
        }
        if (!view) {
            container.innerHTML = `<p class="p-10 text-center text-slate-400">Erro: Tela '${viewName}' não encontrada.</p>`;
            return;
        }
        this.renderSkeleton(container, viewName);
        setTimeout(async () => {
            try {
                container.innerHTML = '';
                if (view.render) {
                    if (viewName === 'config') await view.render(container, model.state.userConfig);
                    else await view.render(container);
                }
                this.updateBreadcrumb(viewName);
                this.updateSidebarUserArea();
            } catch (e) {
                console.error(`Erro fatal em ${viewName}:`, e);
                container.innerHTML = `<div class="p-4 text-red-500">Erro de renderização: ${e.message}</div>`;
            }
        }, 50);
    },
    updateNavHighlight(viewName) {
        document.querySelectorAll('nav button').forEach(btn => {
            btn.classList.remove('bg-white/10', 'text-white');
            btn.classList.add('text-slate-400');
        });
        let activeBtn = document.getElementById(`nav-${viewName}`);
        if (!activeBtn) {
            const mapId = { 'periodo': 'planejamento', 'dia': 'diario', 'mapa': 'sala', 'frequencia': 'frequencia', 'config': 'settings' };
            if (mapId[viewName]) activeBtn = document.getElementById(`nav-${mapId[viewName]}`);
        }
        if (activeBtn) {
            activeBtn.classList.add('bg-white/10', 'text-white');
            activeBtn.classList.remove('text-slate-400');
        }
    },
    renderSkeleton(container, viewName) {
        const skeletons = {
            dashboard: `
                <div class="animate-pulse space-y-4 fade-in">
                    <div class="h-8 bg-slate-200 rounded w-1/3 mb-6"></div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="h-32 bg-slate-200 rounded-2xl"></div>
                        <div class="h-32 bg-slate-200 rounded-2xl"></div>
                        <div class="h-32 bg-slate-200 rounded-2xl"></div>
                    </div>
                    <div class="h-64 bg-slate-200 rounded-2xl mt-6"></div>
                </div>`,
            turmas: `
                <div class="animate-pulse fade-in">
                    <div class="flex justify-between items-center mb-6">
                        <div class="h-8 bg-slate-200 rounded w-48"></div>
                        <div class="h-10 bg-slate-200 rounded w-32"></div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div class="h-40 bg-slate-200 rounded-2xl"></div>
                        <div class="h-40 bg-slate-200 rounded-2xl"></div>
                        <div class="h-40 bg-slate-200 rounded-2xl"></div>
                    </div>
                </div>`,
            generic: `
                <div class="animate-pulse p-4 fade-in">
                    <div class="h-8 bg-slate-200 rounded w-1/4 mb-8"></div>
                    <div class="space-y-4">
                        <div class="h-4 bg-slate-200 rounded w-3/4"></div>
                        <div class="h-4 bg-slate-200 rounded w-full"></div>
                        <div class="h-4 bg-slate-200 rounded w-5/6"></div>
                    </div>
                </div>`
        };
        container.innerHTML = skeletons[viewName] || skeletons.generic;
    },
    // --- Sistema de Modais e Confirmação ---
    openModal(title, content, size = 'normal') {
        let modal = document.getElementById('global-modal');
        if (!modal) return;
        const widthClass = size === 'large' ? 'max-w-4xl h-[85vh]' : 'max-w-lg max-h-[90vh]';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl shadow-2xl w-full mx-4 overflow-hidden transform transition-all scale-100 flex flex-col ${widthClass} animate-slideUpFade">
                <div class="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <h3 class="text-lg font-bold text-slate-800">${title}</h3>
                    <button onclick="controller.closeModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="modal-content-body" class="overflow-y-auto custom-scrollbar flex-1 relative">
                    ${content}
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },
    closeModal() {
        const modal = document.getElementById('global-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            setTimeout(() => { modal.innerHTML = ''; }, 200);
        }
        if (this.views['bncc']) this.views['bncc'].selecionarCallback = null;
    },
    confirmarAcao(titulo, mensagem, callbackConfirmacao) {
        const html = `
            <div class="p-8 text-center">
                <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-800 mb-2">${titulo}</h3>
                <p class="text-slate-500 mb-8 leading-relaxed">${mensagem}</p>
                <div class="flex gap-3 justify-center">
                    <button onclick="controller.closeModal()" class="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition">Cancelar</button>
                    <button id="btn-confirm-action" class="px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition shadow-lg shadow-red-500/30">Confirmar</button>
                </div>
            </div>
        `;
        this.openModal('Confirmação', html);
        setTimeout(() => {
            const btn = document.getElementById('btn-confirm-action');
            if (btn) {
                btn.onclick = () => {
                    callbackConfirmacao();
                    this.closeModal();
                };
            }
        }, 50);
    },
    // --- Gerenciamento de Turmas ---
    openAddTurma() { this.openModal('Nova Turma', this._getAddTurmaHtml()); },
    _getAddTurmaHtml() {
        return `
            <div class="p-6 space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Nível</label>
                        <select id="input-nivel" onchange="controller.updateSerieOptions(this.value)" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary bg-white">
                            <option value="">Selecione...</option>
                            <option value="Educação Infantil">Educação Infantil</option>
                            <option value="Ensino Fundamental">Ensino Fundamental</option>
                            <option value="Ensino Médio">Ensino Médio</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Série</label>
                        <select id="input-serie" disabled class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary bg-slate-50 transition-colors">
                            <option value="">Aguardando nível...</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Identificador</label>
                    <input type="text" id="input-id-turma" placeholder="Ex: A, B, Matutino" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary">
                </div>
                <div class="flex justify-end pt-4">
                    <button onclick="controller.saveTurma()" class="btn-primary px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20">Criar Turma</button>
                </div>
            </div>
        `;
    },
    updateSerieOptions(nivel) {
        const select = document.getElementById('input-serie');
        const opcoes = {
            'Educação Infantil': ['G1', 'G2', 'G3', 'G4', 'G5'],
            'Ensino Fundamental': ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano'],
            'Ensino Médio': ['1ª Série', '2ª Série', '3ª Série']
        };
        if (opcoes[nivel]) {
            select.innerHTML = opcoes[nivel].map(op => `<option value="${op}">${op}</option>`).join('');
            select.disabled = false;
            select.classList.remove('bg-slate-50');
            select.classList.add('bg-white');
        } else {
            select.innerHTML = '<option value="">Aguardando nível...</option>';
            select.disabled = true;
        }
    },
    saveTurma() {
        const nivel = document.getElementById('input-nivel').value;
        const serie = document.getElementById('input-serie').value;
        const id = document.getElementById('input-id-turma').value;
        if (nivel && serie && id) {
            model.addTurma(`${serie} ${id}`, nivel, serie, id);
            this.closeModal();
            this.navigate('turmas');
            Toast.show('Turma criada com sucesso!', 'success');
        } else {
            Toast.show("Por favor, preencha todos os campos.", 'warning');
        }
    },
    deleteTurma(id) {
        this.confirmarAcao(
            'Excluir Turma?',
            'Esta ação apagará todos os alunos, notas e planejamentos vinculados. <strong>Não pode ser desfeita.</strong>',
            () => {
                model.deleteTurma(id);
                this.navigate('turmas');
                Toast.show("Turma excluída permanentemente.", 'success');
            }
        );
    },
    // --- Gerenciamento de Alunos (Com Undo) ---
    openAddAluno(turmaId) {
        this.openModal('Novo Aluno', `
            <div class="p-6">
                <input type="text" id="input-aluno-nome" placeholder="Nome Completo" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary mb-4">
                <button onclick="controller.saveAluno('${turmaId}')" class="btn-primary w-full py-3 rounded-xl font-bold">Salvar</button>
            </div>
        `);
        setTimeout(() => document.getElementById('input-aluno-nome').focus(), 100);
    },
    saveAluno(turmaId) {
        const nome = document.getElementById('input-aluno-nome').value;
        if (nome) {
            model.addAluno(turmaId, nome);
            this.closeModal();
            this._refreshTurmaView(turmaId);
        }
    },
    deleteAluno(turmaId, alunoId) {
        const turma = model.state.turmas.find(t => t.id == turmaId);
        const aluno = turma ? turma.alunos.find(a => a.id == alunoId) : null;
        if (!aluno) return;
        model.deleteAluno(turmaId, alunoId);
        this._refreshTurmaView(turmaId);
        Toast.show(`Aluno removido.`, 'info', 5000, {
            label: 'DESFAZER',
            callback: () => {
                const t = model.state.turmas.find(t => t.id == turmaId);
                if (t) {
                    t.alunos.push(aluno);
                    t.alunos.sort((a, b) => a.nome.localeCompare(b.nome));
                    model.saveLocal();
                    if (model.currentUser) firebaseService.saveAluno(model.currentUser.uid, turmaId, aluno);
                    this._refreshTurmaView(turmaId);
                    Toast.show('Aluno restaurado!', 'success');
                }
            }
        });
    },
    _refreshTurmaView(turmaId) {
        if (this.currentView === 'turmas' && this.views['turmas'].renderDetalhesTurma) {
            this.views['turmas'].renderDetalhesTurma(document.getElementById('view-container'), turmaId);
        } else {
            this.navigate('turmas');
        }
    },
    openAddAlunoLote(turmaId) {
        this.openModal('Importar Alunos', `
            <div class="p-6">
                <p class="text-xs text-slate-500 mb-2">Cole a lista de nomes (um por linha):</p>
                <textarea id="input-lote" rows="10" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary text-sm"></textarea>
                <button onclick="controller.saveAlunoLote('${turmaId}')" class="btn-primary w-full py-3 rounded-xl font-bold mt-4">Importar</button>
            </div>
        `);
    },
    saveAlunoLote(turmaId) {
        const text = document.getElementById('input-lote').value;
        if (text) {
            const nomes = text.split('\n').map(n => n.trim()).filter(n => n.length > 0);
            nomes.forEach(nome => model.addAluno(turmaId, nome));
            this.closeModal();
            this._refreshTurmaView(turmaId);
            Toast.show(`${nomes.length} alunos importados.`, 'success');
        }
    },
    // --- Avaliações e Notas ---
    openAddAvaliacao(turmaId) {
        this.openModal('Nova Atividade Avaliativa', `
            <div class="p-6 space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Nome da Atividade</label>
                    <input type="text" id="av-nome" placeholder="Ex: Prova Mensal, Trabalho..." class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Peso / Nota Máxima</label>
                    <input type="number" id="av-max" value="10" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary">
                </div>
                <button onclick="controller.saveAvaliacao('${turmaId}')" class="btn-primary w-full py-3 rounded-xl font-bold mt-2">Criar Atividade</button>
            </div>
        `);
    },
    saveAvaliacao(turmaId) {
        const nome = document.getElementById('av-nome').value;
        const max = document.getElementById('av-max').value;
        if (nome && max) {
            model.addAvaliacao(turmaId, nome, max);
            this.closeModal();
            this._refreshTurmaView(turmaId);
        }
    },
    deleteAvaliacao(turmaId, avId) {
        this.confirmarAcao("Excluir Avaliação?", "Isso apagará todas as notas lançadas para esta atividade.", () => {
            model.deleteAvaliacao(turmaId, avId);
            this._refreshTurmaView(turmaId);
            Toast.show("Avaliação excluída.", 'success');
        });
    },
    updateNota(turmaId, alunoId, avId, valor) {
        model.updateNota(turmaId, alunoId, avId, valor);
    },
    // --- Diário e Planejamento ---
    mudarDataDiario(novaData) {
        if (this.views['dia']) {
            this.views['dia'].currentDate = novaData;
            const [ano, mes] = novaData.split('-');
            this.views['dia'].viewDate = new Date(parseInt(ano), parseInt(mes) - 1, 1);
            this.navigate('dia');
        }
    },
    mudarMesDiario(delta) {
        if (this.views['dia']) {
            const novaData = new Date(this.views['dia'].viewDate);
            novaData.setMonth(novaData.getMonth() + delta);
            this.views['dia'].viewDate = novaData;
            this.navigate('dia');
        }
    },
    mudarTurmaDiario(novoId) {
        if (this.views['dia']) {
            this.views['dia'].currentTurmaId = novoId;
            this.navigate('dia');
        }
    },
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

        this.openModal('Replicar Planejamento', `
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
            this.confirmarAcao("Tem certeza?", "O planejamento da turma de destino será substituído.", () => {
                const sucesso = model.copiarPlanejamentoEntreTurmas(idOrigem, idDestino);
                if (sucesso) {
                    this.closeModal();
                    Toast.show("Planejamento copiado!", "success");
                } else {
                    Toast.show("Erro ao copiar.", "error");
                }
            });
        }
    },
    // --- BNCC e Seletores ---
    openSeletorBnccQuestao() {
        const rascunho = {
            materia: document.getElementById('q-materia').value,
            ano: document.getElementById('q-ano').value,
            enunciado: document.getElementById('q-enunciado').value
        };
        const callback = (habilidade) => {
            rascunho.bncc = { codigo: habilidade.codigo, descricao: habilidade.descricao };
            this.views['provas'].openAddQuestao(rascunho);
        };
        let nivelPre = null;
        if (rascunho.ano && (rascunho.ano.includes('Ano') || rascunho.ano.includes('9'))) nivelPre = 'Ensino Fundamental';
        if (rascunho.ano && rascunho.ano.includes('Série')) nivelPre = 'Ensino Médio';

        this.openModal('Selecionar Habilidade BNCC', '<div id="modal-bncc-container"></div>', 'large');
        setTimeout(() => {
            this.views['bncc'].render('modal-bncc-container', nivelPre, null, callback);
        }, 50);
    },
    openSeletorBncc(turmaId, periodoIdx, nivelHtml, serieHtml) {
        const turma = model.state.turmas.find(t => t.id == turmaId);
        if (!turma) return;
        const callback = (habilidade) => {
            model.addHabilidadePlanejamento(turmaId, periodoIdx, habilidade);
            const modal = document.getElementById('global-modal');
            //if (modal) modal.classList.add('hidden');
            if (window.planejamentoView) window.planejamentoView.render('view-container');
        };
        this.openModal(`BNCC - ${periodoIdx}º Período`,
            `<div id="modal-bncc-planejamento" class="w-full h-full min-h-[500px]"><div class="flex items-center justify-center h-full"><i class="fas fa-spinner fa-spin text-2xl text-slate-300"></i></div></div>`,
            'large'
        );
        setTimeout(() => {
            if (window.bnccView) window.bnccView.render('modal-bncc-planejamento', turma.nivel || nivelHtml, turma.serie || serieHtml, callback);
        }, 100);
    },
    removeHabilidade(turmaId, periodoIdx, codigoHabilidade) {
        const turma = model.state.turmas.find(t => t.id == turmaId);
        if (!turma || !turma.planejamento[periodoIdx]) return;
        const habilidadeRemovida = turma.planejamento[periodoIdx].find(h => h.codigo === codigoHabilidade);
        model.removeHabilidadePlanejamento(turmaId, periodoIdx, codigoHabilidade);
        window.planejamentoView.render('view-container');
        if (habilidadeRemovida) {
            Toast.show(`Habilidade removida.`, 'info', 4000, {
                label: 'DESFAZER',
                callback: () => {
                    model.addHabilidadePlanejamento(turmaId, periodoIdx, habilidadeRemovida);
                    window.planejamentoView.render('view-container');
                }
            });
        }
    },
    openSeletorBnccMensal(turmaId, mes, nivelHtml, serieHtml) {
        const turma = model.state.turmas.find(t => t.id == turmaId);
        if (!turma) return;
        const callback = (habilidade) => {
            model.addHabilidadeMensal(turmaId, mes, habilidade);
            const modal = document.getElementById('global-modal');
            //if (modal) modal.classList.add('hidden');
            if (window.mensalView) window.mensalView.render('view-container');
        };
        this.openModal(`BNCC - ${mes}`, '<div id="modal-bncc-container" class="h-full"></div>', 'large');
        setTimeout(() => {
            if (window.bnccView) window.bnccView.render('modal-bncc-container', turma.nivel || nivelHtml, turma.serie || serieHtml, callback);
        }, 50);
    },
    removeHabilidadeMensal(turmaId, mes, codigo) {
        this.confirmarAcao("Remover?", "Deseja remover esta habilidade do planejamento mensal?", () => {
            model.removeHabilidadeMensal(turmaId, mes, codigo);
            this.navigate('mensal');
        });
    },
    savePeriodoDates(tipo, index, campo, valor) {
        model.state.userConfig.periodosDatas[tipo][index][campo] = valor;
        model.saveLocal();
        model.saveCloudRoot();
    },
    updatePeriodDate(index, campo, valor) {
        const tipo = model.state.userConfig.periodType || 'bimestre';
        if (model.state.periodosDatas && model.state.periodosDatas[tipo]) {
            model.state.periodosDatas[tipo][index][campo] = valor;
            model.saveLocal();
            model.saveCloudRoot();
            Toast.show("Calendário escolar atualizado!", "success");
        }
    },
    // --- Calendário e Agenda ---
    openDayOptions(dataIso) {
        const [ano, mes, dia] = dataIso.split('-');
        const eventoAtual = model.state.eventos ? (model.state.eventos[dataIso] || {}) : {};
        let botoesHtml = '';
        if (model.tiposEventos) {
            botoesHtml = Object.entries(model.tiposEventos).map(([key, config]) => {
                let colorName = 'slate';
                const match = config.bg.match(/bg-(\w+)-/);
                if (match) colorName = match[1];
                if (key === 'aula' || config.bg.includes('white')) colorName = 'slate';
                return this._btnEvento(config.label, key, eventoAtual.tipo, colorName);
            }).join('');
        }
        const html = `
            <div class="p-6 space-y-6">
                <div class="text-center border-b border-slate-100 pb-4">
                    <h3 class="text-3xl font-bold text-slate-800">${dia}/${mes}</h3>
                    <p class="text-slate-400 text-sm font-medium uppercase tracking-wide">Agenda do Dia</p>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Marcar como:</label>
                    <div class="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                        <button onclick="document.getElementById('evt-tipo').value=''; this.closest('.grid').querySelectorAll('button').forEach(b=>b.classList.remove('ring-2','ring-offset-1','scale-105')); this.classList.add('ring-2','ring-offset-1','scale-105');"
                            class="p-3 rounded-xl text-xs font-bold transition-all bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200 ${!eventoAtual.tipo ? 'ring-2 ring-slate-400 ring-offset-1 bg-slate-200' : ''}">
                            Limpar / Padrão
                        </button>
                        ${botoesHtml}
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Descrição (Opcional)</label>
                    <input type="text" id="evt-desc" value="${eventoAtual.descricao || ''}" 
                           placeholder="Ex: Entrega de notas..."
                           class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary">
                    <input type="hidden" id="evt-tipo" value="${eventoAtual.tipo || ''}">
                </div>
                <button onclick="controller.saveDayEvent('${dataIso}')" class="btn-primary w-full py-3 rounded-xl font-bold shadow-lg shadow-primary/20 mt-2">
                    Salvar Marcação
                </button>
            </div>
        `;
        this.openModal('Gerenciar Calendário', html);
    },
    _btnEvento(label, value, current, color = 'slate') {
        const isSelected = value === (current || '');
        let bgClass = `bg-slate-50 text-slate-500 hover:bg-${color}-50 border border-slate-100`;
        let activeClass = `bg-${color}-100 text-${color}-700 ring-2 ring-${color}-400 ring-offset-1 border-${color}-200 font-black shadow-sm transform scale-105`;
        if (color === 'white' || value === 'aula') {
            activeClass = `bg-slate-100 text-slate-800 ring-2 ring-slate-400 ring-offset-1 font-black`;
        }
        return `
            <button onclick="document.getElementById('evt-tipo').value='${value}'; 
                             this.parentElement.querySelectorAll('button').forEach(b => {
                                 b.className = 'p-3 rounded-xl text-xs font-bold transition-all bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100';
                             }); 
                             this.className = 'p-3 rounded-xl text-xs font-bold transition-all ${activeClass}';"
                class="p-3 rounded-xl text-xs font-bold transition-all ${isSelected ? activeClass : bgClass}">
                ${label}
            </button>
        `;
    },
    saveDayEvent(dataIso) {
        const tipo = document.getElementById('evt-tipo').value;
        const desc = document.getElementById('evt-desc').value;
        model.setEvento(dataIso, tipo, desc);
        this.closeModal();
        if (this.currentView === 'dashboard') {
            this.navigate('dashboard');
        }
    },
    // --- Outros ---
    deleteQuestao(id) {
        this.confirmarAcao("Excluir Questão?", "Esta questão será removida permanentemente.", () => {
            model.deleteQuestao(id);
            if (window.provasView) {
                window.provasView.selecionadas.delete(id);
                if (this.currentView === 'provas') {
                    window.provasView.render('view-container');
                }
            }
            Toast.show("Questão excluída.", "success");
        });
    },
    updatePeriodType(type) {
        model.state.userConfig.periodType = type;
        model.saveLocal();
        model.saveCloudRoot();
        this.navigate(this.currentView === 'periodo' ? 'periodo' : 'config');
    },
    updateTheme(color) {
        model.state.userConfig.themeColor = color;
        model.saveLocal();
        model.saveCloudRoot();
        this.aplicarTema();
        this.navigate('config');
    },
    exportData() { model.exportData(); },
    updateBreadcrumb: function (viewName) {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;
        const map = {
            'dashboard': 'Visão Geral', 'mensal': 'Planejamento / Mensal',
            'periodo': 'Planejamento / Por Período', 'dia': 'Planejamento / Diário',
            'turmas': 'Acadêmico / Turmas', 'bncc': 'Acadêmico / BNCC',
            'mapa': 'Acadêmico / Mapa de Sala', 'provas': 'Acadêmico / Gerador de Provas',
            'config': 'Configurações'
        };
        breadcrumb.innerHTML = `<i class="fas fa-home text-slate-300"></i> <span class="text-slate-300">/</span> ${map[viewName] || viewName}`;
    },
    updateAuthButton: function (isLoggedIn, user = null) {
        const container = document.getElementById('auth-container');
        if (!container) return;
        if (isLoggedIn && user) {
            container.innerHTML = `
                <div class="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 overflow-hidden" onclick="controller.handleLogout()">
                    <img src="${user.photoURL || 'https://ui-avatars.com/api/?name=Prof'}" class="w-8 h-8 rounded-full border border-white/20 shrink-0">
                    <div class="overflow-hidden nav-label transition-all duration-300">
                        <p class="text-xs text-slate-300 truncate">Olá,</p>
                        <p class="text-xs font-bold text-white truncate w-24">${escapeHTML(user.displayName)}</p>
                    </div>
                    <i class="fas fa-sign-out-alt ml-auto text-slate-500 hover:text-red-400 nav-label"></i>
                </div>
            `;
        } else {
            container.innerHTML = `
                <button onclick="controller.handleLogin()"
                    class="w-full flex items-center gap-3 p-3 bg-white text-primary rounded-xl font-bold shadow-lg hover:bg-slate-50 transition-colors overflow-hidden whitespace-nowrap">
                    <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <i class="fab fa-google text-primary"></i>
                    </div>
                    <span class="nav-label transition-all duration-300">Entrar</span>
                </button>
            `;
        }
    },
    updateSidebarUserArea: function () {
        if (model.currentUser) this.updateAuthButton(true, model.currentUser);
    },
    aplicarTema: function () {
        if (model.state.userConfig && model.state.userConfig.themeColor) {
            document.documentElement.style.setProperty('--primary-color', model.state.userConfig.themeColor);
        }
    },
    setupGlobalListeners: function () {
        const dateEl = document.getElementById('current-date');
        if (dateEl) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.innerText = new Date().toLocaleDateString('pt-BR', options);
        }
    },
    copyToClipboard(text) { navigator.clipboard.writeText(text); }
};
window.controller = controller;
window.bnccView = bnccView;
window.turmasView = turmasView;
window.calendarioView = calendarioView;
window.mensalView = mensalView;
window.planejamentoView = planejamentoView;
window.diarioView = diarioView;
window.salaView = salaView;
window.provasView = provasView;
window.frequenciaView = frequenciaView;
window.settingsView = settingsView;
window.dashboardView = dashboardView;
window.horarioView = horarioView;
window.addEventListener('load', () => {
    console.log("Sistema Modulado Inicializado.");
    controller.init();
});

