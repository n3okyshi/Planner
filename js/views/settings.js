/**
 * @file settings.js
 * @description View responsável pelas Configurações do sistema (Perfil, Tema, Sincronização e Backup).
 * @module views/settingsView
 */

import { model } from '../model.js';

/**
 * View de Configurações.
 * @namespace settingsView
 */
export const settingsView = {

    /**
     * Renderiza a tela de configurações.
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

        // Escape seguro para inputs - nomes padronizados
        const nomeProfSafe = config.profName ? (window.escapeHTML ? window.escapeHTML(config.profName) : config.profName) : '';
        const nomeEscolaSafe = config.schoolName ? (window.escapeHTML ? window.escapeHTML(config.schoolName) : config.schoolName) : '';

        container.innerHTML = `
            <div class="fade-in max-w-3xl mx-auto pb-20">
                <div class="mb-8 flex items-end justify-between">
                    <div>
                        <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Configurações</h2>
                        <p class="text-slate-500">Gerencie sua conta e personalize o sistema.</p>
                    </div>
                </div>

                <div class="space-y-6">
                    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
                        <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <i class="fas fa-cloud"></i>
                            </div>
                            <h3 class="font-bold text-slate-700">Sincronização em Nuvem</h3>
                        </div>
                        <div class="p-6">
                            ${user ? this.renderLogado(user, lastSyncText) : this.renderDeslogado()}
                        </div>
                    </div>

                    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                <i class="fas fa-id-card"></i>
                            </div>
                            <h3 class="font-bold text-slate-700">Identificação</h3>
                        </div>
                        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Nome do Professor(a)</label>
                                <div class="relative">
                                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><i class="far fa-user"></i></span>
                                    <input type="text" value="${nomeProfSafe}" placeholder="Como quer ser chamado?"
                                           class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary outline-none transition-all"
                                           onchange="model.state.userConfig.profName = this.value; model.saveLocal();">
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Nome da Escola</label>
                                <div class="relative">
                                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><i class="fas fa-school"></i></span>
                                    <input type="text" value="${nomeEscolaSafe}" placeholder="Ex: Escola Estadual..."
                                           class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary outline-none transition-all"
                                           onchange="model.state.userConfig.schoolName = this.value; model.saveLocal();">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <i class="fas fa-calendar-alt"></i>
                            </div>
                            <h3 class="font-bold text-slate-700">Ano Letivo</h3>
                        </div>
                        <div class="p-6">
                            <p class="text-sm text-slate-500 mb-4">Como seu ano letivo é dividido?</p>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                ${this.renderOptionPeriodo('bimestre', 'Bimestral (4)', config.periodType)}
                                ${this.renderOptionPeriodo('trimestre', 'Trimestral (3)', config.periodType)}
                                ${this.renderOptionPeriodo('semestre', 'Semestral (2)', config.periodType)}
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                                <i class="fas fa-calendar-day"></i>
                            </div>
                            <h3 class="font-bold text-slate-700">Datas dos Períodos</h3>
                        </div>
                        <div class="p-6">
                            <div class="grid grid-cols-1 gap-4">
                                ${listaPeriodos.map((p, idx) => `
                                    <div class="flex flex-col md:flex-row items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <span class="font-bold text-slate-700 w-24">${window.escapeHTML ? window.escapeHTML(p.nome) : p.nome}</span>
                                        <div class="flex items-center gap-2 flex-1 w-full">
                                            <div class="flex-1">
                                                <input type="date" value="${window.escapeHTML ? window.escapeHTML(p.inicio) : p.inicio}" 
                                                    onchange="controller.updatePeriodDate(${idx}, 'inicio', this.value)"
                                                    class="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-primary">
                                            </div>
                                            <span class="text-slate-400 text-xs font-bold">ATÉ</span>
                                            <div class="flex-1">
                                                <input type="date" value="${window.escapeHTML ? window.escapeHTML(p.fim) : p.fim}" 
                                                    onchange="controller.updatePeriodDate(${idx}, 'fim', this.value)"
                                                    class="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-primary">
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <p class="text-[10px] text-slate-400 mt-4 italic">
                                <i class="fas fa-info-circle mr-1"></i> 
                                Estas datas definem quais habilidades serão sugeridas no Planejamento Mensal.
                            </p>
                        </div>
                    </div>

                    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                                <i class="fas fa-palette"></i>
                            </div>
                            <h3 class="font-bold text-slate-700">Aparência</h3>
                        </div>
                        <div class="p-6">
                            <div class="flex flex-wrap gap-4">
                                ${this.renderColorOption('#0891b2', 'Ciano', config.themeColor)}
                                ${this.renderColorOption('#2563eb', 'Azul', config.themeColor)}
                                ${this.renderColorOption('#7c3aed', 'Roxo', config.themeColor)}
                                ${this.renderColorOption('#db2777', 'Rosa', config.themeColor)}
                                ${this.renderColorOption('#16a34a', 'Verde', config.themeColor)}
                                ${this.renderColorOption('#ea580c', 'Laranja', config.themeColor)}
                                ${this.renderColorOption('#0f172a', 'Slate', config.themeColor)}
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center">
                                <i class="fas fa-database"></i>
                            </div>
                            <h3 class="font-bold text-slate-700">Backup Local</h3>
                        </div>
                        <div class="p-6 flex items-center justify-between gap-4">
                            <div>
                                <h4 class="font-bold text-slate-700 text-sm">Exportar Arquivo JSON</h4>
                                <p class="text-xs text-slate-500 mt-1">Baixe uma cópia de segurança dos seus dados.</p>
                            </div>
                            <button onclick="controller.exportData()" class="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition flex items-center gap-2">
                                <i class="fas fa-download"></i> Baixar
                            </button>
                        </div>
                    </div>
                </div>

                <div class="text-center mt-12 text-xs text-slate-400">
                    <p>Planner Pro Docente v1.3.1 (Cloud)</p>
                </div>
            </div>
        `;
    },

    renderLogado(user, lastSyncText) {
        const nomeSafe = window.escapeHTML ? window.escapeHTML(user.displayName) : user.displayName;
        const emailSafe = window.escapeHTML ? window.escapeHTML(user.email) : user.email;
        const nomeEncodado = encodeURIComponent(nomeSafe);
        const urlFoto = user.photoURL || 'https://ui-avatars.com/api/?name=' + nomeEncodado;

        return `
            <div class="flex flex-col md:flex-row items-center justify-between gap-6 animate-slideIn">
                <div class="flex items-center gap-4">
                    <img src="${urlFoto}" 
                         class="w-16 h-16 rounded-full border-4 border-emerald-50 shadow-sm" alt="Foto de perfil">
                    <div>
                        <h4 class="font-bold text-slate-800 text-lg">${nomeSafe}</h4>
                        <p class="text-sm text-slate-500">${emailSafe}</p>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                <i class="fas fa-check-circle"></i> Sincronizado
                            </span>
                            <span class="text-[10px] text-slate-400">
                                Última atualização: ${lastSyncText}
                            </span>
                        </div>
                    </div>
                </div>
                <button onclick="controller.handleLogout()" class="px-6 py-2 border-2 border-red-100 text-red-500 font-bold rounded-xl hover:bg-red-50 transition">
                    Sair
                </button>
            </div>
        `;
    },

    renderDeslogado() {
        return `
            <div class="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h4 class="font-bold text-slate-800">Salve seus dados na nuvem</h4>
                    <p class="text-sm text-slate-500 mt-1 max-w-md leading-relaxed">
                        Faça login com sua conta Google para acessar seus planejamentos de qualquer dispositivo e garantir que nada seja perdido.
                    </p>
                </div>
                <button onclick="controller.handleLogin()" 
                        class="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:text-slate-900 shadow-sm hover:shadow-md transition flex items-center gap-2 shrink-0">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-5 h-5" alt="Google Logo">
                    Entrar com Google
                </button>
            </div>
        `;
    },

    renderOptionPeriodo(value, label, current) {
        const safeCurrent = current || 'bimestre';
        const active = value === safeCurrent;
        const classes = active
            ? "border-primary bg-primary/5 ring-1 ring-primary text-primary shadow-sm"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600";
        
        const iconClass = value === 'bimestre' ? 'fa-columns' : (value === 'trimestre' ? 'fa-th-large' : 'fa-pause');

        return `
            <button onclick="controller.updatePeriodType('${value}')" 
                    class="border rounded-xl p-4 text-sm font-bold transition-all flex flex-col items-center justify-center gap-2 ${classes}">
                <i class="fas ${iconClass} text-lg opacity-80"></i>
                ${window.escapeHTML ? window.escapeHTML(label) : label}
            </button>
        `;
    },

    renderColorOption(color, label, current) {
        const active = color === current;
        return `
            <div class="flex flex-col items-center gap-2 group cursor-pointer" onclick="controller.updateTheme('${color}')">
                <button class="w-10 h-10 rounded-full border-2 transition-transform group-hover:scale-110 flex items-center justify-center shadow-sm ${active ? 'ring-2 ring-offset-2 ring-slate-300 scale-110 border-white' : 'border-transparent'}"
                        style="background-color: ${color};" title="${window.escapeHTML ? window.escapeHTML(label) : label}">
                    ${active ? '<i class="fas fa-check text-white text-xs drop-shadow-md"></i>' : ''}
                </button>
            </div>
        `;
    }
};