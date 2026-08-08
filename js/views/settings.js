/**
 * @file settings.js
 * @description View responsável pelas Configurações do sistema (Perfil, Tema, Sincronização e Backup).
 * @module views/settingsView
 */
import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';

export const settingsView = {
    /**
     * Renderiza a tela de configurações
     * @param {HTMLElement|string} container - Elemento pai.
     * @param {Object} [userConfig] - Configuração opcional para renderização direta.
     */
    render(container, userConfig) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const config = userConfig || (model.state && model.state.userConfig) || {};
        const user = model.currentUser;
        
        let lastSyncText = "Agora mesmo";
        if (model.state.lastUpdate) {
            const date = new Date(model.state.lastUpdate);
            lastSyncText = date.toLocaleDateString() + ' às ' + date.toLocaleTimeString().slice(0, 5);
        }

        const tipoAtual = config.periodType || 'bimestre';
        const listaPeriodos = model.state.periodosDatas ? (model.state.periodosDatas[tipoAtual] || []) : [];

        // Valores seguros para a interface
        const nomeProfSafe = config.profName ? (window.escapeHTML ? window.escapeHTML(config.profName) : config.profName) : '';
        const nomeEscolaSafe = config.schoolName ? (window.escapeHTML ? window.escapeHTML(config.schoolName) : config.schoolName) : '';
        const cidadeSafe = config.cidade ? (window.escapeHTML ? window.escapeHTML(config.cidade) : config.cidade) : '';
        
        // Estados dos Toggles (padrão true se não estiver definido)
        const showData = config.showData !== false;
        const showDisciplina = config.showDisciplina !== false;
        const showSerie = config.showSerie !== false;

        container.innerHTML = `
            <div class="fade-in max-w-5xl mx-auto pb-20">
                <div class="mb-8">
                    <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Meu Perfil</h2>
                    <p class="text-slate-500 mt-1">Gerencie sua conta, cabeçalhos de provas e personalize o sistema.</p>
                </div>

                <div class="space-y-8">
                    
                    <!-- NOVO MÓDULO 7: Cabeçalho Dinâmico (Two-Way Data Binding) -->
                    <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="p-6 md:p-8 grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">
                            
                            <!-- Coluna Esquerda: Formulário -->
                            <div class="space-y-6">
                                <div>
                                    <h3 class="font-bold text-slate-800 text-xl mb-1">Cabeçalho dos Materiais</h3>
                                    <p class="text-sm text-slate-500">Estas informações serão usadas no cabeçalho dos materiais exportados (Word/PDF).</p>
                                </div>

                                <!-- Logo Upload Simulação -->
                                <div>
                                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Logo da Instituição</label>
                                    <div class="flex items-center gap-4">
                                        <div class="w-16 h-16 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-300 bg-slate-50">
                                            <i class="fas fa-building text-xl"></i>
                                        </div>
                                        <div>
                                            <button onclick="window.Toast.show('Upload de logo em desenvolvimento.', 'info')" class="px-5 py-2.5 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 transition flex items-center gap-2">
                                                <i class="fas fa-upload"></i> Carregar logo
                                            </button>
                                            <p class="text-[9px] text-slate-400 mt-2 uppercase tracking-wide">Recomendado: 200x200px, PNG ou JPG</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Nome da escola / instituição</label>
                                    <input type="text" id="config-escola" value="${nomeEscolaSafe}" oninput="settingsView.atualizarPreview()" class="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-medium text-slate-700 shadow-sm" placeholder="Ex: E.E. João Pessoa">
                                </div>

                                <div>
                                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Cidade</label>
                                    <input type="text" id="config-cidade" value="${cidadeSafe}" oninput="settingsView.atualizarPreview()" class="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-medium text-slate-700 shadow-sm" placeholder="Ex: São Paulo - SP">
                                </div>

                                <div>
                                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Nome do professor(a)</label>
                                    <input type="text" id="config-prof" value="${nomeProfSafe}" oninput="settingsView.atualizarPreview()" class="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-medium text-slate-700 shadow-sm" placeholder="Ex: Prof.ª Maria Souza">
                                </div>

                                <!-- Toggles CSS Puro -->
                                <div class="space-y-4 pt-4 border-t border-slate-100">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Exibição de Campos</label>
                                    ${this.gerarToggle('config-show-data', 'Exibir data no cabeçalho', showData)}
                                    ${this.gerarToggle('config-show-disciplina', 'Exibir disciplina', showDisciplina)}
                                    ${this.gerarToggle('config-show-serie', 'Exibir série/turma', showSerie)}
                                </div>

                                <button onclick="settingsView.salvarCabecalho()" class="w-full py-3.5 border-2 border-indigo-600 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition shadow-sm active:scale-[0.98]">
                                    Salvar cabeçalho
                                </button>
                            </div>

                            <!-- Coluna Direita: Preview Dinâmico em Tempo Real -->
                            <div class="xl:sticky xl:top-24">
                                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pré-visualização</h4>
                                <div class="bg-white border border-slate-200 shadow-lg shadow-slate-200/50 rounded-xl overflow-hidden flex flex-col h-48 transition-all">
                                    <div class="bg-indigo-600 text-white p-3.5 font-bold text-sm truncate flex items-center justify-between">
                                        <span id="prev-escola">${nomeEscolaSafe || 'Nome da escola'}</span>
                                        <span id="prev-cidade" class="text-[10px] font-normal opacity-80 uppercase tracking-widest">${cidadeSafe}</span>
                                    </div>
                                    <div class="p-5 flex-1 flex flex-col gap-2 text-xs text-slate-600 bg-[#fafafa]">
                                        <div class="flex justify-between border-b border-slate-200 pb-3">
                                            <div class="flex-1 overflow-hidden pr-2">
                                                <span class="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Professor(a)</span>
                                                <strong id="prev-prof" class="text-slate-800 truncate block text-sm mt-0.5">${nomeProfSafe || 'Professor(a)'}</strong>
                                            </div>
                                            <div class="flex-1 border-l border-slate-200 pl-3" id="prev-container-disciplina" style="${showDisciplina ? '' : 'display:none;'}">
                                                <span class="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Disciplina</span>
                                                <strong class="text-slate-800 text-sm mt-0.5 block">—</strong>
                                            </div>
                                            <div class="flex-1 border-l border-slate-200 pl-3" id="prev-container-serie" style="${showSerie ? '' : 'display:none;'}">
                                                <span class="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Série</span>
                                                <strong class="text-slate-800 text-sm mt-0.5 block">—</strong>
                                            </div>
                                            <div class="flex-1 border-l border-slate-200 pl-3" id="prev-container-data" style="${showData ? '' : 'display:none;'}">
                                                <span class="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Data</span>
                                                <strong class="text-slate-800 text-sm mt-0.5 block text-center">__/__/____</strong>
                                            </div>
                                        </div>
                                        <div class="text-slate-400 italic pt-3 font-serif text-center flex-1 flex items-center justify-center">
                                            Título do Material e conteúdo aparecem aqui...
                                        </div>
                                    </div>
                                </div>
                                <div class="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex gap-3">
                                    <i class="fas fa-info-circle mt-0.5"></i>
                                    <p>O cabeçalho é injetado automaticamente quando você baixa materiais em Word ou gera Provas em PDF.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Módulo Antigo: Sincronização em Nuvem -->
                    <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
                                <i class="fas fa-cloud"></i>
                            </div>
                            <h3 class="font-bold text-slate-700 text-lg">Conta e Sincronização</h3>
                        </div>
                        <div class="p-6 md:p-8">
                            ${user ? this.renderLogado(user, lastSyncText) : this.renderDeslogado()}
                        </div>
                    </div>

                    <!-- Módulo Antigo: Ano Letivo e Datas -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div class="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                                    <i class="fas fa-calendar-alt"></i>
                                </div>
                                <h3 class="font-bold text-slate-700 text-lg">Ano Letivo</h3>
                            </div>
                            <div class="p-6">
                                <p class="text-sm text-slate-500 mb-5">Como seu ano letivo é dividido?</p>
                                <div class="flex flex-col gap-3">
                                    ${this.renderOptionPeriodo('bimestre', 'Bimestral (4 Períodos)', config.periodType)}
                                    ${this.renderOptionPeriodo('trimestre', 'Trimestral (3 Períodos)', config.periodType)}
                                    ${this.renderOptionPeriodo('semestre', 'Semestral (2 Períodos)', config.periodType)}
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div class="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm">
                                    <i class="fas fa-calendar-day"></i>
                                </div>
                                <h3 class="font-bold text-slate-700 text-lg">Datas dos Períodos</h3>
                            </div>
                            <div class="p-6">
                                <div class="space-y-4">
                                    ${listaPeriodos.map((p, idx) => `
                                        <div class="flex flex-col items-start gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                                            <span class="font-bold text-slate-700 text-xs uppercase tracking-wider">${window.escapeHTML ? window.escapeHTML(p.nome) : p.nome}</span>
                                            <div class="flex items-center gap-2 w-full">
                                                <input type="date" value="${window.escapeHTML ? window.escapeHTML(p.inicio) : p.inicio}"
                                                     onchange="controller.updatePeriodDate(${idx}, 'inicio', this.value)"
                                                    class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary shadow-sm font-medium text-slate-600">
                                                <span class="text-slate-400 text-[10px] font-black uppercase">ATÉ</span>
                                                <input type="date" value="${window.escapeHTML ? window.escapeHTML(p.fim) : p.fim}"
                                                     onchange="controller.updatePeriodDate(${idx}, 'fim', this.value)"
                                                    class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary shadow-sm font-medium text-slate-600">
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Módulo Antigo: Aparência e Backup -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div class="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm">
                                    <i class="fas fa-palette"></i>
                                </div>
                                <h3 class="font-bold text-slate-700 text-lg">Aparência Global</h3>
                            </div>
                            <div class="p-6">
                                <div class="flex flex-wrap gap-4">
                                    ${this.renderColorOption('#0891b2', 'Ciano', config.themeColor)}
                                    ${this.renderColorOption('#4f46e5', 'Índigo', config.themeColor)}
                                    ${this.renderColorOption('#7c3aed', 'Roxo', config.themeColor)}
                                    ${this.renderColorOption('#db2777', 'Rosa', config.themeColor)}
                                    ${this.renderColorOption('#16a34a', 'Verde', config.themeColor)}
                                    ${this.renderColorOption('#ea580c', 'Laranja', config.themeColor)}
                                    ${this.renderColorOption('#0f172a', 'Slate', config.themeColor)}
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div class="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shadow-sm">
                                    <i class="fas fa-database"></i>
                                </div>
                                <h3 class="font-bold text-slate-700 text-lg">Backup de Segurança</h3>
                            </div>
                            <div class="p-6 flex flex-col justify-center h-[calc(100%-80px)]">
                                <h4 class="font-bold text-slate-700 text-sm mb-1">Exportar JSON Local</h4>
                                <p class="text-xs text-slate-500 mb-6">Baixe uma cópia de segurança física de todos os seus planejamentos e turmas.</p>
                                <button onclick="controller.exportData()" class="w-full py-3 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition flex items-center justify-center gap-2 shadow-md">
                                    <i class="fas fa-download"></i> Baixar Backup
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        `;
        
        // Garante que o preview já inicie correto
        setTimeout(() => this.atualizarPreview(), 100);
    },

    /**
     * O EVENTO NATIVO DE TWO-WAY BINDING
     * Lida com as teclas sendo digitadas e os toggles clicados, atualizando o DOM diretamente.
     */
    atualizarPreview() {
        const escola = document.getElementById('config-escola')?.value || 'Nome da escola';
        const cidade = document.getElementById('config-cidade')?.value || '';
        const prof = document.getElementById('config-prof')?.value || 'Professor(a)';
        
        const showData = document.getElementById('config-show-data')?.checked;
        const showDisciplina = document.getElementById('config-show-disciplina')?.checked;
        const showSerie = document.getElementById('config-show-serie')?.checked;

        // Atualização de Textos
        const prevEscola = document.getElementById('prev-escola');
        const prevCidade = document.getElementById('prev-cidade');
        const prevProf = document.getElementById('prev-prof');

        if(prevEscola) prevEscola.innerText = escola;
        if(prevCidade) prevCidade.innerText = cidade;
        if(prevProf) prevProf.innerText = prof;

        // Atualização de Visibilidade (CSS)
        const cData = document.getElementById('prev-container-data');
        const cDisc = document.getElementById('prev-container-disciplina');
        const cSerie = document.getElementById('prev-container-serie');

        if(cData) cData.style.display = showData ? 'block' : 'none';
        if(cDisc) cDisc.style.display = showDisciplina ? 'block' : 'none';
        if(cSerie) cSerie.style.display = showSerie ? 'block' : 'none';
    },

    /**
     * Salva as propriedades de perfil globalmente e dispara sync cloud
     */
    salvarCabecalho() {
        if (!model.state.userConfig) model.state.userConfig = {};
        
        model.state.userConfig.schoolName = document.getElementById('config-escola').value;
        model.state.userConfig.cidade = document.getElementById('config-cidade').value;
        model.state.userConfig.profName = document.getElementById('config-prof').value;
        
        model.state.userConfig.showData = document.getElementById('config-show-data').checked;
        model.state.userConfig.showDisciplina = document.getElementById('config-show-disciplina').checked;
        model.state.userConfig.showSerie = document.getElementById('config-show-serie').checked;

        model.saveLocal();
        Toast.show("Cabeçalho atualizado com sucesso!", "success");
    },

    /**
     * Helper para renderizar os Toggles estilizados (Switch do iOS/Android) usando CSS e Tailwind.
     * Atualizado com o padrão Soft UI e tipografia legível.
     */
    gerarToggle(id, label, isChecked) {
        return `
            <label class="flex items-center justify-between cursor-pointer group p-3 bg-white border border-slate-100 hover:border-indigo-200 rounded-xl transition-all shadow-sm">
                <span class="text-sm font-bold text-slate-700 select-none">${label}</span>
                <div class="relative inline-flex items-center">
                    <input type="checkbox" id="${id}" class="sr-only peer" ${isChecked ? 'checked' : ''} onchange="settingsView.atualizarPreview()">
                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </div>
            </label>
        `;
    },

    // --- FUNÇÕES LEGADAS PRESERVADAS ---
    renderLogado(user, lastSyncText) {
        const nomeSafe = window.escapeHTML ? window.escapeHTML(user.displayName) : user.displayName;
        const emailSafe = window.escapeHTML ? window.escapeHTML(user.email) : user.email;
        const nomeEncodado = encodeURIComponent(nomeSafe);
        const urlFoto = user.photoURL || 'https://ui-avatars.com/api/?name=' + nomeEncodado + '&background=e0e7ff&color=4f46e5';
        
        return `
            <div class="flex flex-col md:flex-row items-center justify-between gap-6 animate-slideIn">
                <div class="flex items-center gap-4">
                    <img src="${urlFoto}" class="w-16 h-16 rounded-full border-4 border-indigo-50 shadow-sm" alt="Foto de perfil">
                    <div>
                        <h4 class="font-bold text-slate-800 text-lg">${nomeSafe}</h4>
                        <p class="text-sm text-slate-500">${emailSafe}</p>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                <i class="fas fa-check-circle"></i> Sincronizado
                            </span>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Última att: <span class="text-slate-600">${lastSyncText}</span>
                            </span>
                        </div>
                    </div>
                </div>
                <button onclick="controller.handleLogout()" class="px-6 py-2 border-2 border-red-100 text-red-500 font-bold rounded-xl hover:bg-red-50 transition shadow-sm w-full md:w-auto">
                    Encerrar Sessão
                </button>
            </div>
        `;
    },

    renderDeslogado() {
        return `
            <div class="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h4 class="font-bold text-slate-800 text-lg">Salve seus dados na nuvem</h4>
                    <p class="text-sm text-slate-500 mt-1 max-w-md">Faça login com o Google para salvar todas as suas turmas, planejamentos e banco de questões automaticamente na nuvem.</p>
                </div>
                <button onclick="controller.handleLogin()" class="w-full md:w-auto px-6 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition flex items-center justify-center gap-3">
                    <i class="fab fa-google text-lg"></i> Fazer login no Google
                </button>
            </div>
        `;
    },

    renderOptionPeriodo(valor, label, atual) {
        const isSelected = valor === atual;
        const bgClass = isSelected ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-300';
        const textClass = isSelected ? 'text-emerald-700 font-bold' : 'text-slate-600 font-medium';
        return `
            <button onclick="controller.updatePeriodType('${valor}')" class="w-full p-4 rounded-2xl border transition-all text-left shadow-sm ${bgClass} ${textClass}">
                <div class="flex items-center justify-between">
                    <span>${label}</span>
                    ${isSelected ? '<i class="fas fa-check-circle text-emerald-500 text-lg"></i>' : ''}
                </div>
            </button>
        `;
    },

    renderColorOption(hex, nome, atual) {
        const isSelected = hex === atual;
        const styleSelect = isSelected ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'hover:scale-105';
        return `
            <button onclick="controller.updateTheme('${hex}')" class="w-10 h-10 rounded-full transition-transform shadow-md ${styleSelect}" style="background-color: ${hex};" title="${nome}">
                ${isSelected ? '<i class="fas fa-check text-white text-xs drop-shadow-md"></i>' : ''}
            </button>
        `;
    }
};

if (typeof window !== 'undefined') {
    window.settingsView = settingsView;
}