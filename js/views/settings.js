/**
 * VIEW - Configurações do Sistema
 * Responsável por: Personalização, Definição de Período, Tema e Dados.
 */
const settingsView = {
    render(containerId, userConfig) {
        const container = document.getElementById(containerId);
        
        // Garante que a config exista para evitar erros
        const config = userConfig || (model.state && model.state.userConfig) || {};

        container.innerHTML = `
            <div class="fade-in max-w-3xl mx-auto pb-20">
                <div class="mb-8 flex items-end justify-between">
                    <div>
                        <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Configurações</h2>
                        <p class="text-slate-500">Personalize sua experiência no Planner Pro.</p>
                    </div>
                </div>

                <div class="space-y-6">
                    
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
                                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        <i class="far fa-user"></i>
                                    </span>
                                    <input type="text" 
                                           value="${config.profName || ''}" 
                                           placeholder="Como quer ser chamado?"
                                           class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                           onchange="model.state.userConfig.profName = this.value; model.save()">
                                </div>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Nome da Escola</label>
                                <div class="relative">
                                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        <i class="fas fa-school"></i>
                                    </span>
                                    <input type="text" 
                                           value="${config.schoolName || ''}" 
                                           placeholder="Ex: Escola Estadual..."
                                           class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                           onchange="model.state.userConfig.schoolName = this.value; model.save()">
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
                            <p class="text-sm text-slate-500 mb-4">Como seu ano letivo é dividido? Isso altera as colunas do planejamento.</p>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                ${this.renderOptionPeriodo('bimestre', 'Bimestral (4 Etapas)', config.periodType)}
                                ${this.renderOptionPeriodo('trimestre', 'Trimestral (3 Etapas)', config.periodType)}
                                ${this.renderOptionPeriodo('semestre', 'Semestral (2 Etapas)', config.periodType)}
                            </div>
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
                            <p class="text-sm text-slate-500 mb-4">Escolha a cor de destaque do sistema.</p>
                            <div class="flex flex-wrap gap-4">
                                ${this.renderColorOption('#0891b2', 'Ciano (Padrão)', config.themeColor)}
                                ${this.renderColorOption('#2563eb', 'Azul Real', config.themeColor)}
                                ${this.renderColorOption('#7c3aed', 'Roxo Criativo', config.themeColor)}
                                ${this.renderColorOption('#db2777', 'Rosa Vibrante', config.themeColor)}
                                ${this.renderColorOption('#16a34a', 'Verde Natureza', config.themeColor)}
                                ${this.renderColorOption('#ea580c', 'Laranja Energia', config.themeColor)}
                                ${this.renderColorOption('#0f172a', 'Dark Slate', config.themeColor)}
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center">
                                <i class="fas fa-database"></i>
                            </div>
                            <h3 class="font-bold text-slate-700">Gerenciamento de Dados</h3>
                        </div>

                        <div class="p-6 flex items-center justify-between gap-4">
                            <div>
                                <h4 class="font-bold text-slate-700 text-sm">Fazer Backup Local</h4>
                                <p class="text-xs text-slate-500 mt-1">Baixe uma cópia de todos os seus dados (turmas, notas, planos) para segurança.</p>
                            </div>
                            <button onclick="controller.exportData()" class="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition flex items-center gap-2">
                                <i class="fas fa-download"></i> Baixar Dados
                            </button>
                        </div>
                    </div>

                </div>
                
                <div class="text-center mt-12 text-xs text-slate-400">
                    <p>Planner Pro Docente v1.1.0</p>
                    <p>Seus dados são salvos automaticamente no navegador.</p>
                </div>
            </div>
        `;
    },

    /**
     * Helper: Botão de seleção de período
     */
    renderOptionPeriodo(value, label, current) {
        // Se current for undefined, assume bimestre como padrão
        const safeCurrent = current || 'bimestre';
        const active = value === safeCurrent;
        
        const classes = active 
            ? "border-primary bg-primary/5 ring-1 ring-primary text-primary shadow-sm" 
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600";
            
        return `
            <button onclick="controller.updatePeriodType('${value}')" 
                    class="border rounded-xl p-4 text-sm font-bold transition-all flex flex-col items-center justify-center gap-2 ${classes}">
                <i class="fas ${value === 'bimestre' ? 'fa-columns' : (value === 'trimestre' ? 'fa-th-large' : 'fa-pause')} text-lg opacity-80"></i>
                ${label}
            </button>
        `;
    },

    /**
     * Helper: Círculo de seleção de cor
     */
    renderColorOption(color, label, current) {
        const active = color === current;
        return `
            <div class="flex flex-col items-center gap-2 group cursor-pointer" onclick="controller.updateTheme('${color}')">
                <button class="w-12 h-12 rounded-full border-2 transition-transform group-hover:scale-110 flex items-center justify-center shadow-sm ${active ? 'ring-2 ring-offset-2 ring-slate-300 scale-110' : 'border-transparent'}"
                        style="background-color: ${color};">
                    ${active ? '<i class="fas fa-check text-white text-lg drop-shadow-md"></i>' : ''}
                </button>
                <span class="text-[10px] font-bold text-slate-500 group-hover:text-primary transition-colors">${label.split(' ')[0]}</span>
            </div>
        `;
    }
};

window.View = window.View || {};
window.View.renderSettings = (id, cfg) => settingsView.render(id, cfg);