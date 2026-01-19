/**
 * CONTROLLER - O Maestro do App
 * Responsável por: Escutar eventos, coordenar o Model e trocar as Views.
 */
const controller = {
    currentTab: 'calendario',

    /**
     * Inicializa a aplicação
     */
    init() {
        // Inicializa o Model
        if (window.model) model.init();

        // Aplica o tema visual salvo
        if (model.state.userConfig && model.state.userConfig.themeColor) {
            document.documentElement.style.setProperty('--primary-color', model.state.userConfig.themeColor);
        }

        // Inicia na tela correta (Dashboard/Calendário)
        this.updateSidebar();
        this.navigate('dashboard');
    },

    /**
     * Navegação Central (Router)
     */
    navigate(tabName) {
        this.currentTab = tabName;
        const container = 'view-container';
        const containerEl = document.getElementById(container);

        // Limpa o container
        if (containerEl) containerEl.innerHTML = '';

        // Atualiza a sidebar
        this.updateSidebar();

        // Renderiza a View correspondente
        switch (tabName) {
            case 'dashboard':
            case 'calendario':
                // Suporte legado para ambos os nomes
                if (window.View && View.renderDashboard) View.renderDashboard(container);
                else if (window.View && View.renderCalendario) View.renderCalendario(container);
                else console.warn("View de Dashboard não encontrada");
                break;

            case 'turmas':
                if (window.View && View.renderTurmas) View.renderTurmas(container);
                break;

            case 'dia':
            case 'diario':
                if (window.View && View.renderDiario) View.renderDiario(container);
                break;

            case 'periodo':
            case 'planejamento':
                if (window.View && View.renderPlanejamento) View.renderPlanejamento(container);
                break;

            case 'mensal':
                if (window.View && View.renderMensal) View.renderMensal(container);
                break;

            case 'bncc':
                if (window.View && View.renderBncc) View.renderBncc(container);
                break;

            case 'mapa':
            case 'sala':
                if (window.View && View.renderSala) View.renderSala(container);
                break;

            case 'provas':
                if (window.View && View.renderProvas) View.renderProvas(container);
                break;

            case 'config':
            case 'settings':
                if (window.View && View.renderSettings) View.renderSettings(container, model.state.userConfig);
                break;

            default:
                console.warn(`Aba "${tabName}" não configurada.`);
                if (containerEl) containerEl.innerHTML = `<p class="p-10 text-center text-slate-400">Página em construção: ${tabName}</p>`;
                break;
        }
    },

    updateSidebar() {
        // Reseta todos
        document.querySelectorAll('aside button').forEach(btn => {
            btn.classList.remove('bg-slate-800', 'text-white', 'shadow-lg');
            btn.classList.add('text-slate-500', 'hover:bg-slate-50'); // Estilo padrão inativo
            // Remove classes específicas de hover que possam conflitar
            if (btn.id !== `nav-${this.currentTab}`) {
                btn.classList.add('text-slate-400');
            }
        });

        // Ativa o atual
        const activeBtn = document.getElementById(`nav-${this.currentTab}`);
        if (activeBtn) {
            activeBtn.classList.remove('text-slate-500', 'hover:bg-slate-50', 'text-slate-400');
            activeBtn.classList.add('bg-slate-800', 'text-white', 'shadow-lg');
        }
    },

    // =========================================================================
    // MODAIS (Janelas Flutuantes)
    // =========================================================================

    openModal(title, content, size = 'normal') {
        // Cria o modal dinamicamente se não existir
        let modal = document.getElementById('global-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'global-modal';
            modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm hidden transition-opacity duration-300';
            document.body.appendChild(modal);
        }

        const widthClass = size === 'large' ? 'max-w-4xl h-[85vh]' : 'max-w-lg';

        modal.innerHTML = `
            <div class="bg-white rounded-3xl shadow-2xl w-full mx-4 overflow-hidden transform transition-all scale-100 flex flex-col ${widthClass}">
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
    },

    closeModal() {
        const modal = document.getElementById('global-modal');
        if (modal) {
            modal.classList.add('hidden');
            // Limpa o conteúdo para economizar memória
            setTimeout(() => { modal.innerHTML = ''; }, 200);
        }
        // Limpa callbacks globais
        if (window.bnccView) window.bnccView.selecionarCallback = null;
    },

    // =========================================================================
    // CALENDÁRIO
    // =========================================================================

    openDayOptions(dataIso) {
        const [ano, mes, dia] = dataIso.split('-');
        const eventoAtual = model.state.eventos ? (model.state.eventos[dataIso] || {}) : {};

        const html = `
            <div class="p-6 space-y-6">
                <div class="text-center border-b border-slate-100 pb-4">
                    <h3 class="text-3xl font-bold text-slate-800">${dia}/${mes}</h3>
                    <p class="text-slate-400 text-sm font-medium uppercase tracking-wide">Agenda do Dia</p>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Tipo de Marcação</label>
                    <div class="grid grid-cols-2 gap-2">
                        ${this._btnEvento('Aula Normal', '', eventoAtual.tipo)}
                        ${this._btnEvento('Feriado', 'feriado', eventoAtual.tipo, 'red')}
                        ${this._btnEvento('Recesso', 'recesso', eventoAtual.tipo, 'orange')}
                        ${this._btnEvento('Prova', 'prova', eventoAtual.tipo, 'purple')}
                        ${this._btnEvento('Evento', 'evento', eventoAtual.tipo, 'blue')}
                        ${this._btnEvento('Conselho', 'conselho', eventoAtual.tipo, 'emerald')}
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Descrição</label>
                    <input type="text" id="evt-desc" value="${eventoAtual.descricao || ''}" 
                           placeholder="Ex: Entrega de notas..."
                           class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary">
                    <input type="hidden" id="evt-tipo" value="${eventoAtual.tipo || ''}">
                </div>

                <button onclick="controller.saveDayEvent('${dataIso}')" class="btn-primary w-full py-3 rounded-xl font-bold shadow-lg shadow-primary/20 mt-2">
                    Salvar
                </button>
            </div>
        `;
        this.openModal('Gerenciar Data', html);
    },

    _btnEvento(label, value, current, color = 'slate') {
        const isSelected = value === (current || '');
        const bgClass = isSelected ? `bg-${color}-500 text-white ring-2 ring-${color}-300 ring-offset-1` : `bg-slate-50 text-slate-500 hover:bg-slate-100`;

        // Ajuste manual para slate (padrão)
        const activeClass = (isSelected && color === 'slate') ? 'bg-slate-700 text-white' : bgClass;

        return `
            <button onclick="document.getElementById('evt-tipo').value='${value}'; this.parentElement.querySelectorAll('button').forEach(b=>b.className='p-3 rounded-xl text-xs font-bold transition-all bg-slate-50 text-slate-500 hover:bg-slate-100'); this.className='p-3 rounded-xl text-xs font-bold transition-all bg-slate-800 text-white shadow-md transform scale-105'"
                class="p-3 rounded-xl text-xs font-bold transition-all ${activeClass}">
                ${label}
            </button>
        `;
    },

    saveDayEvent(dataIso) {
        const tipo = document.getElementById('evt-tipo').value;
        const desc = document.getElementById('evt-desc').value;

        model.setEvento(dataIso, tipo, desc);
        this.closeModal();
        if (this.currentTab === 'calendario' || this.currentTab === 'dashboard') {
            View.renderCalendario('view-container');
        }
    },

    // =========================================================================
    // TURMAS
    // =========================================================================

    openAddTurma() {
        const html = `
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
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Identificador (Ex: A, B, Matutino)</label>
                    <input type="text" id="input-id-turma" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary">
                </div>
                <div class="flex justify-end pt-4">
                    <button onclick="controller.saveTurma()" class="btn-primary px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20">Criar Turma</button>
                </div>
            </div>
        `;
        this.openModal('Nova Turma', html);
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
            const nome = `${serie} ${id}`;
            model.addTurma(nome, nivel, serie, id);
            this.closeModal();
            this.navigate('turmas');
        } else {
            alert("Preencha todos os campos.");
        }
    },

    deleteTurma(id) {
        if (confirm("Tem certeza que deseja excluir esta turma e todos os dados dela?")) {
            model.deleteTurma(id);
            this.navigate('turmas');
        }
    },

    // --- ALUNOS ---

    openAddAluno(turmaId) {
        this.openModal('Novo Aluno', `
            <div class="p-6">
                <input type="text" id="input-aluno-nome" placeholder="Nome Completo" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary mb-4">
                <button onclick="controller.saveAluno(${turmaId})" class="btn-primary w-full py-3 rounded-xl font-bold">Salvar</button>
            </div>
        `);
        setTimeout(() => document.getElementById('input-aluno-nome').focus(), 100);
    },

    saveAluno(turmaId) {
        const nome = document.getElementById('input-aluno-nome').value;
        if (nome) {
            model.addAluno(turmaId, nome);
            this.closeModal();
            View.renderDetalhesTurma('view-container', turmaId);
        }
    },

    deleteAluno(turmaId, alunoId) {
        if (confirm("Remover aluno?")) {
            model.deleteAluno(turmaId, alunoId);
            View.renderDetalhesTurma('view-container', turmaId);
        }
    },

    openAddAlunoLote(turmaId) {
        this.openModal('Importar Alunos', `
            <div class="p-6">
                <p class="text-xs text-slate-500 mb-2">Cole a lista de nomes (um por linha):</p>
                <textarea id="input-lote" rows="10" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary text-sm"></textarea>
                <button onclick="controller.saveAlunoLote(${turmaId})" class="btn-primary w-full py-3 rounded-xl font-bold mt-4">Importar</button>
            </div>
        `);
    },

    saveAlunoLote(turmaId) {
        const text = document.getElementById('input-lote').value;
        if (text) {
            const nomes = text.split('\n').map(n => n.trim()).filter(n => n.length > 0);
            nomes.forEach(nome => model.addAluno(turmaId, nome));
            this.closeModal();
            View.renderDetalhesTurma('view-container', turmaId);
        }
    },

    // --- AVALIAÇÕES (NOTAS) ---

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
                <button onclick="controller.saveAvaliacao(${turmaId})" class="btn-primary w-full py-3 rounded-xl font-bold mt-2">Criar Atividade</button>
            </div>
        `);
    },

    saveAvaliacao(turmaId) {
        const nome = document.getElementById('av-nome').value;
        const max = document.getElementById('av-max').value;
        if (nome && max) {
            model.addAvaliacao(turmaId, nome, max);
            this.closeModal();
            View.renderDetalhesTurma('view-container', turmaId);
        }
    },

    deleteAvaliacao(turmaId, avId) {
        if (confirm("Excluir esta avaliação e todas as notas lançadas nela?")) {
            model.deleteAvaliacao(turmaId, avId);
            View.renderDetalhesTurma('view-container', turmaId);
        }
    },

    updateNota(turmaId, alunoId, avId, valor) {
        model.updateNota(turmaId, alunoId, avId, valor);
    },

    // =========================================================================
    // PLANEJAMENTO & BNCC
    // =========================================================================

    openSeletorBncc(turmaId, periodo) {
        const turma = model.state.turmas.find(t => t.id === turmaId);
        if (!turma) return;

        const callback = (habilidade) => {
            model.addHabilidadePlanejamento(turmaId, periodo, habilidade);
            View.renderPlanejamento('view-container');
        };

        this.openModal(`BNCC - ${turma.nome}`, '<div id="modal-bncc-container"></div>', 'large');
        setTimeout(() => View.renderBncc('modal-bncc-container', turma.nivel, turma.serie, callback), 50);
    },

    removeHabilidade(turmaId, periodo, codigo) {
        if (confirm("Remover do planejamento?")) {
            model.removeHabilidadePlanejamento(turmaId, periodo, codigo);
            View.renderPlanejamento('view-container');
        }
    },

    openSeletorBnccMensal(turmaId, mes) {
        const turma = model.state.turmas.find(t => t.id === turmaId);
        if (!turma) return;

        const callback = (habilidade) => {
            model.addHabilidadeMensal(turmaId, mes, habilidade);
            View.renderMensal('view-container');
        };

        this.openModal(`BNCC - ${mes}`, '<div id="modal-bncc-container"></div>', 'large');
        setTimeout(() => View.renderBncc('modal-bncc-container', turma.nivel, turma.serie, callback), 50);
    },

    removeHabilidadeMensal(turmaId, mes, codigo) {
        if (confirm("Remover deste mês?")) {
            model.removeHabilidadeMensal(turmaId, mes, codigo);
            View.renderMensal('view-container');
        }
    },
    // --- DIÁRIO / PLANO DE AULA ---

    mudarDataDiario(novaData) {
        if (window.diarioView) {
            diarioView.currentDate = novaData;
            View.renderDiario('view-container'); // Re-renderiza para carregar dados da nova data
        }
    },

    mudarTurmaDiario(novoId) {
        if (window.diarioView) {
            diarioView.currentTurmaId = novoId;
            View.renderDiario('view-container'); // Re-renderiza para carregar dados da nova turma
        }
    },

    salvarDiario() {
        const data = document.getElementById('diario-data').value;
        const turmaId = document.getElementById('diario-turma').value;

        const conteudo = {
            tema: document.getElementById('plan-tema').value,
            objetivos: document.getElementById('plan-objetivos').value,
            recursos: document.getElementById('plan-recursos').value,
            metodologia: document.getElementById('plan-metodologia').value,
            avaliacao: document.getElementById('plan-avaliacao').value
        };

        model.savePlanoDiario(data, turmaId, conteudo);

        // Feedback visual
        const btn = event.currentTarget; // O botão que foi clicado
        const original = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-check"></i> Salvo!`;
        btn.classList.add('bg-emerald-500', 'text-white');
        setTimeout(() => {
            btn.innerHTML = original;
            btn.classList.remove('bg-emerald-500', 'text-white');
        }, 2000);
    },

    // =========================================================================
    // CONFIGURAÇÕES
    // =========================================================================

    updatePeriodType(type) {
        model.state.userConfig.periodType = type;
        model.save();
        if (this.currentTab === 'planejamento' || this.currentTab === 'periodo') {
            this.navigate('planejamento');
        } else {
            this.navigate('config');
        }
    },

    updateTheme(color) {
        model.state.userConfig.themeColor = color;
        model.save();
        document.documentElement.style.setProperty('--primary-color', color);
        this.navigate('config');
    },

    exportData() {
        model.exportData();
    }
};

// Inicialização automática
window.addEventListener('load', () => controller.init());