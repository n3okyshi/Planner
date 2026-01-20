const controller = {
    currentTab: 'calendario',
    init() {
        if (window.model) model.init();
        this.aplicarTema();
        this.updateSidebar();
        this.navigate('dashboard');
    },
    aplicarTema() {
        if (model.state.userConfig && model.state.userConfig.themeColor) {
            document.documentElement.style.setProperty('--primary-color', model.state.userConfig.themeColor);
        }
    },
    navigate(tabName) {
        this.currentTab = tabName;
        const container = 'view-container';
        const containerEl = document.getElementById(container);
        this.aplicarTema();
        if (containerEl) containerEl.innerHTML = '';
        this.updateSidebar();
        if (tabName === 'dia' || tabName === 'diario') {
            if (window.diarioView) {
                const [ano, mes] = diarioView.currentDate.split('-');
                diarioView.viewDate = new Date(parseInt(ano), parseInt(mes) - 1, 1);
            }
        }
        switch (tabName) {
            case 'dashboard':
            case 'calendario':
                if (window.View && View.renderDashboard) View.renderDashboard(container);
                else if (window.View && View.renderCalendario) View.renderCalendario(container);
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
                if (containerEl) containerEl.innerHTML = `<p class="p-10 text-center text-slate-400">Página em construção: ${tabName}</p>`;
                break;
        }
    },
    updateSidebar() {
        document.querySelectorAll('aside button').forEach(btn => {
            btn.classList.remove('bg-slate-800', 'text-white', 'shadow-lg');
            btn.classList.add('text-slate-500', 'hover:bg-slate-50');
            if (btn.id !== `nav-${this.currentTab}`) {
                btn.classList.add('text-slate-400');
            }
        });
        const activeBtn = document.getElementById(`nav-${this.currentTab}`);
        if (activeBtn) {
            activeBtn.classList.remove('text-slate-500', 'hover:bg-slate-50', 'text-slate-400');
            activeBtn.classList.add('bg-slate-800', 'text-white', 'shadow-lg');
        }
    },
    mudarDataDiario(novaData) {
        if (window.diarioView) {
            diarioView.currentDate = novaData;
            const [ano, mes] = novaData.split('-');
            diarioView.viewDate = new Date(parseInt(ano), parseInt(mes) - 1, 1);
            View.renderDiario('view-container');
        }
    },
    mudarMesDiario(delta) {
        if (window.diarioView) {
            const novaData = new Date(diarioView.viewDate);
            novaData.setMonth(novaData.getMonth() + delta);
            diarioView.viewDate = novaData;
            View.renderDiario('view-container');
        }
    },
    mudarTurmaDiario(novoId) {
        if (window.diarioView) {
            diarioView.currentTurmaId = novoId;
            View.renderDiario('view-container');
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
        View.renderDiario('view-container');
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-slideIn';
        toast.innerHTML = `<i class="fas fa-check-circle text-lg"></i> <span class="font-bold">Planejamento Salvo!</span>`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 2000);
    },
    openSeletorBnccDiario(turmaId) {
        const turma = model.state.turmas.find(t => t.id === turmaId);
        if (!turma) return;
        const callback = (habilidade) => {
            const campo = document.getElementById('plan-bncc');
            if (campo) {
                const novoTexto = `[${habilidade.codigo}] ${habilidade.descricao}`;
                campo.value = campo.value ? campo.value + "\n\n" + novoTexto : novoTexto;
                campo.classList.add('ring-2', 'ring-primary', 'bg-blue-50');
                setTimeout(() => campo.classList.remove('ring-2', 'ring-primary', 'bg-blue-50'), 500);
            }
        };
        this.openModal(`BNCC - ${turma.nome}`, '<div id="modal-bncc-container"></div>', 'large');
        setTimeout(() => View.renderBncc('modal-bncc-container', turma.nivel, turma.serie, callback), 50);
    },
    openModal(title, content, size = 'normal') {
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
            setTimeout(() => { modal.innerHTML = ''; }, 200);
        }
        if (window.bnccView) window.bnccView.selecionarCallback = null;
    },
    openDayOptions(dataIso) {
        const [ano, mes, dia] = dataIso.split('-');
        const eventoAtual = model.state.eventos ? (model.state.eventos[dataIso] || {}) : {};
        let botoesHtml = '';
        if (window.calendarioView && window.calendarioView.tiposEventos) {
            botoesHtml = Object.entries(window.calendarioView.tiposEventos).map(([key, config]) => {
                let colorName = 'slate';
                const match = config.bg.match(/bg-(\w+)-/);
                if (match) colorName = match[1];
                if (key === 'aula') colorName = 'slate';
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
                             // Remove seleção visual dos outros botões
                             this.parentElement.querySelectorAll('button').forEach(b => {
                                 b.className = 'p-3 rounded-xl text-xs font-bold transition-all bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100';
                             }); 
                             // Aplica seleção visual neste botão
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
        if (this.currentTab === 'calendario' || this.currentTab === 'dashboard') {
            View.renderCalendario('view-container');
        }
    },
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
    deleteQuestao(id) {
        if (confirm("Excluir questão do banco?")) {
            model.deleteQuestao(id);
            if (window.View && View.renderProvas) View.renderProvas('view-container');
        }
    },
    handleLogin() {
        if (window.firebaseService) {
            firebaseService.loginGoogle();
        } else {
            alert("Serviço Firebase indisponível.");
        }
    },
    handleLogout() {
        if (confirm("Sair da conta e parar sincronização?")) {
            if (window.firebaseService) firebaseService.logout();
        }
    },
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
        this.aplicarTema();
        this.navigate('config');
    },
    exportData() {
        model.exportData();
    }
};
window.addEventListener('load', () => controller.init());