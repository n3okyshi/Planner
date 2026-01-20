const controller = {
    currentView: null,
    views: {}, 
    init: function() {
        // Garante que o model iniciou
        if (window.model && model.init) model.init();
        // Faz o mapeamento inicial das views
        this.bindViews();
        this.aplicarTema();
        this.setupGlobalListeners();
        this.monitorAuth(); 
    },
    // Função separada para mapear as views (pode ser chamada novamente se falhar no init)
    bindViews: function() {
        this.views = {
            'dashboard': window.calendarioView, 
            'mensal': window.mensalView,
            'periodo': window.planejamentoView,
            'dia': window.diarioView,
            'turmas': window.turmasView,
            'bncc': window.bnccView,
            'mapa': window.salaView,
            'provas': window.provasView,
            'config': window.settingsView
        };
    },
    monitorAuth: function() {
        if (!window.firebaseService) {
            console.error("Firebase Service não carregado.");
            return;
        }
        firebaseService.onAuthStateChanged(async (user) => {
            if (user) {
                console.log("Usuário logado:", user.email);
                this.updateAuthButton(true, user);
                
                const cloudStatus = document.getElementById('cloud-status');
                if (cloudStatus) cloudStatus.innerHTML = '<i class="fas fa-check text-green-500"></i> Sync ON';
                try {
                    await model.loadUserData(); 
                    
                    // Se já tem uma view definida (ex: refresh da página), mantém ela.
                    // Se não, vai para dashboard.
                    if (!this.currentView) {
                        this.navigate('dashboard');
                    } else {
                        this.navigate(this.currentView);
                    }
                } catch (error) {
                    console.error("Erro ao carregar dados:", error);
                    // Não alertar erro de conexão agressivamente, apenas logar
                }
            } else {
                console.log("Usuário deslogado");
                model.currentUser = null;
                model.data = {}; 
                
                this.updateAuthButton(false);
                const cloudStatus = document.getElementById('cloud-status');
                if (cloudStatus) cloudStatus.innerHTML = '<i class="fas fa-cloud text-slate-300"></i> Offline';
                
                this.navigate('dashboard');
            }
        });
    },
    handleLogin: async function() {
        try {
            await firebaseService.loginGoogle();
        } catch (error) {
            console.error("Login falhou:", error);
            alert("Erro no login Google: " + error.message);
        }
    },
    handleLogout: function() {
        if (confirm("Sair da conta e parar sincronização?")) {
            firebaseService.logout();
            // Recarrega a página para limpar estados da memória
            window.location.reload();
        }
    },
    navigate: async function(viewName) {
        // Redirecionamentos de nomes antigos/alternativos
        if (viewName === 'calendario') viewName = 'dashboard';
        if (viewName === 'planejamento') viewName = 'periodo';
        if (viewName === 'diario') viewName = 'dia';
        if (viewName === 'sala') viewName = 'mapa';
        if (viewName === 'settings') viewName = 'config';
        // Tenta re-mapear as views se a solicitada não existir (Correção do erro "View não encontrada")
        if (!this.views[viewName]) {
            console.log(`Tentando re-mapear views para encontrar: ${viewName}`);
            this.bindViews();
        }
        const container = document.getElementById('view-container');
        const view = this.views[viewName];
        this.currentView = viewName;
        this.aplicarTema();
        // Atualiza Menu Lateral
        document.querySelectorAll('nav button').forEach(btn => {
            btn.classList.remove('bg-white/10', 'text-white');
            btn.classList.add('text-slate-400');
        });
        // Tenta encontrar o botão do menu para destacar
        let activeBtn = document.getElementById(`nav-${viewName}`);
        if (!activeBtn) {
             const mapId = {'periodo': 'planejamento', 'dia': 'diario', 'mapa': 'sala', 'config': 'settings'};
             if(mapId[viewName]) activeBtn = document.getElementById(`nav-${mapId[viewName]}`);
        }
        if(activeBtn) {
            activeBtn.classList.add('bg-white/10', 'text-white');
            activeBtn.classList.remove('text-slate-400');
        }
        // Lógica específica do Diário (Data)
        if (viewName === 'dia' && window.diarioView) {
             if (!diarioView.viewDate) {
                const [ano, mes] = diarioView.currentDate.split('-');
                diarioView.viewDate = new Date(parseInt(ano), parseInt(mes) - 1, 1);
             }
        }
        // Se mesmo após re-mapear a view não existir, mostra erro amigável
        if (!view) {
            console.error(`View '${viewName}' é undefined. Views disponíveis:`, Object.keys(this.views));
            container.innerHTML = `<p class="p-10 text-center text-slate-400">Erro: A tela '${viewName}' não foi carregada corretamente. Tente recarregar a página.</p>`;
            return;
        }
        // Loading
        container.innerHTML = '<div class="flex justify-center p-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>';
        
        // Renderização com pequeno delay para garantir fluidez da UI
        setTimeout(async () => {
            container.innerHTML = '';
            try {
                if (view.render) {
                    if (viewName === 'config') await view.render(container, model.state.userConfig);
                    else await view.render(container);
                }
                this.updateBreadcrumb(viewName);
                this.updateSidebarUserArea(); 
            } catch (e) {
                console.error(`Erro fatal ao renderizar ${viewName}:`, e);
                container.innerHTML = `<div class="p-4 text-red-500">Erro de renderização: ${e.message}</div>`;
            }
        }, 50);
    },
    updateBreadcrumb: function(viewName) {
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
    updateAuthButton: function(isLoggedIn, user = null) {
        const container = document.getElementById('auth-container');
        if (!container) return;
        if (isLoggedIn && user) {
            container.innerHTML = `
                <div class="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10" onclick="controller.handleLogout()">
                    <img src="${user.photoURL || 'https://ui-avatars.com/api/?name=Prof'}" class="w-8 h-8 rounded-full border border-white/20">
                    <div class="overflow-hidden">
                        <p class="text-xs text-slate-300 truncate">Olá,</p>
                        <p class="text-xs font-bold text-white truncate w-24">${user.displayName}</p>
                    </div>
                    <i class="fas fa-sign-out-alt ml-auto text-slate-500 hover:text-red-400"></i>
                </div>
            `;
        } else {
            container.innerHTML = `
                <button onclick="controller.handleLogin()"
                    class="w-full flex items-center gap-3 p-3 bg-white text-primary rounded-xl font-bold shadow-lg hover:bg-slate-50 transition-colors">
                    <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <i class="fab fa-google text-primary"></i>
                    </div>
                    <span>Entrar</span>
                </button>
            `;
        }
    },
    updateSidebarUserArea: function() {
        if (model.currentUser) this.updateAuthButton(true, model.currentUser);
    },
    aplicarTema: function() {
        if (model.state.userConfig && model.state.userConfig.themeColor) {
            document.documentElement.style.setProperty('--primary-color', model.state.userConfig.themeColor);
        }
    },
    setupGlobalListeners: function() {
        const dateEl = document.getElementById('current-date');
        if(dateEl) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.innerText = new Date().toLocaleDateString('pt-BR', options);
        }
    },
    // --- MODAIS & UTILITÁRIOS ---
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
        if (this.views['bncc']) this.views['bncc'].selecionarCallback = null;
    },
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            // Feedback visual rápido se necessário
        });
    },
    // --- PROXIES PARA MÉTODOS DE NEGÓCIO ---
    // Estes métodos servem para os onclicks no HTML chamarem o controller, 
    // que por sua vez chama a View correta ou o Model.
    openAddTurma() { this.openModal('Nova Turma', this._getAddTurmaHtml()); },
    
    // HTML Interno para o modal de turma (movido para cá para organizar)
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
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Identificador (Ex: A, B, Matutino)</label>
                    <input type="text" id="input-id-turma" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary">
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
            if (this.currentView === 'turmas' && this.views['turmas'].renderDetalhesTurma) {
                 this.views['turmas'].renderDetalhesTurma(document.getElementById('view-container'), turmaId);
            } else {
                this.navigate('turmas');
            }
        }
    },
    deleteAluno(turmaId, alunoId) {
        if (confirm("Remover aluno?")) {
            model.deleteAluno(turmaId, alunoId);
            if (this.currentView === 'turmas' && this.views['turmas'].renderDetalhesTurma) {
                this.views['turmas'].renderDetalhesTurma(document.getElementById('view-container'), turmaId);
           }
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
            if (this.views['turmas'].renderDetalhesTurma) {
                this.views['turmas'].renderDetalhesTurma(document.getElementById('view-container'), turmaId);
            }
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
            this.views['turmas'].renderDetalhesTurma(document.getElementById('view-container'), turmaId);
        }
    },
    deleteAvaliacao(turmaId, avId) {
        if (confirm("Excluir esta avaliação e todas as notas lançadas nela?")) {
            model.deleteAvaliacao(turmaId, avId);
            this.views['turmas'].renderDetalhesTurma(document.getElementById('view-container'), turmaId);
        }
    },
    updateNota(turmaId, alunoId, avId, valor) {
        model.updateNota(turmaId, alunoId, avId, valor);
    },
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
        setTimeout(() => this.views['bncc'].render('modal-bncc-container', turma.nivel, turma.serie, callback), 50);
    },
    openSeletorBncc(turmaId, periodo) {
        const turma = model.state.turmas.find(t => t.id === turmaId);
        if (!turma) return;
        const callback = (habilidade) => {
            model.addHabilidadePlanejamento(turmaId, periodo, habilidade);
            this.navigate('periodo');
        };
        this.openModal(`BNCC - ${turma.nome}`, '<div id="modal-bncc-container"></div>', 'large');
        setTimeout(() => this.views['bncc'].render('modal-bncc-container', turma.nivel, turma.serie, callback), 50);
    },
    removeHabilidade(turmaId, periodo, codigo) {
        if (confirm("Remover do planejamento?")) {
            model.removeHabilidadePlanejamento(turmaId, periodo, codigo);
            this.navigate('periodo');
        }
    },
    openSeletorBnccMensal(turmaId, mes) {
        const turma = model.state.turmas.find(t => t.id === turmaId);
        if (!turma) return;
        const callback = (habilidade) => {
            model.addHabilidadeMensal(turmaId, mes, habilidade);
            this.navigate('mensal');
        };
        this.openModal(`BNCC - ${mes}`, '<div id="modal-bncc-container"></div>', 'large');
        setTimeout(() => this.views['bncc'].render('modal-bncc-container', turma.nivel, turma.serie, callback), 50);
    },
    removeHabilidadeMensal(turmaId, mes, codigo) {
        if (confirm("Remover deste mês?")) {
            model.removeHabilidadeMensal(turmaId, mes, codigo);
            this.navigate('mensal');
        }
    },
    openDayOptions(dataIso) {
        const [ano, mes, dia] = dataIso.split('-');
        const eventoAtual = model.state.eventos ? (model.state.eventos[dataIso] || {}) : {};
        
        let botoesHtml = '';
        const viewCal = this.views['dashboard']; 
        if (viewCal && viewCal.tiposEventos) {
            botoesHtml = Object.entries(viewCal.tiposEventos).map(([key, config]) => {
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
    deleteQuestao(id) {
        if (confirm("Excluir questão do banco?")) {
            model.deleteQuestao(id);
            if (this.currentView === 'provas') this.navigate('provas');
        }
    },
    updatePeriodType(type) {
        model.state.userConfig.periodType = type;
        model.save();
        if (this.currentView === 'periodo') {
            this.navigate('periodo');
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
// =========================================================
// INICIALIZAÇÃO SEGURA (ESPERA TUDO CARREGAR)
// =========================================================
window.addEventListener('load', () => {
    console.log("Sistema inicializado.");
    controller.init();
});
