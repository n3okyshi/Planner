// js/views/estatisticas-provas.js
import { model } from '../model.js';

export const estatisticasProvasView = {
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);

        const minhas = model.state.questoes || [];
        const sistema = model.state.questoesSistema || [];
        const todas = [...minhas, ...sistema];

        // Processamento de dados
        const porMateria = this.agruparPor(todas, 'materia', 'Geral');
        const porTipo = this.agruparPor(todas, 'tipo', 'Não definido');
        const porAno = this.agruparPor(todas, 'ano', 'Outros');

        const html = `
        <div class="fade-in pb-12">
        <button onclick="controller.navigate('provas')" class="mb-4 text-xs font-bold text-primary flex items-center gap-2">
            <i class="fas fa-arrow-left"></i> Voltar para Provas
        </button>
            <div class="fade-in pb-12">
                <div class="flex items-center gap-4 mb-8">
                    <div class="bg-primary text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                        <i class="fas fa-chart-line text-xl"></i>
                    </div>
                    <div>
                        <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Análise do Acervo</h2>
                        <p class="text-slate-500">Distribuição e equilíbrio das suas questões.</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    ${this.renderMiniCard('Total Geral', todas.length, 'fa-database', 'bg-slate-800')}
                    ${this.renderMiniCard('Múltipla Escolha', porTipo['multipla'] || 0, 'fa-list-ul', 'bg-purple-600')}
                    ${this.renderMiniCard('Dissertativas', porTipo['aberta'] || 0, 'fa-pen-fancy', 'bg-emerald-600')}
                    ${this.renderMiniCard('Minhas Questões', minhas.length, 'fa-user-check', 'bg-blue-600')}
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h3 class="font-bold text-slate-700 mb-6 flex items-center gap-2">
                            <i class="fas fa-tags text-primary/50"></i> Por Disciplina
                        </h3>
                        <div class="space-y-4">
                            ${Object.entries(porMateria).sort((a, b) => b[1] - a[1]).map(([nome, total]) =>
            this.renderBarraProgresso(nome, total, todas.length, model.coresComponentes[nome])
        ).join('')}
                        </div>
                    </div>

                    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h3 class="font-bold text-slate-700 mb-6 flex items-center gap-2">
                            <i class="fas fa-graduation-cap text-primary/50"></i> Por Ano/Série
                        </h3>
                        <div class="grid grid-cols-2 gap-4">
                            ${Object.entries(porAno).map(([nome, total]) => `
                                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div class="text-[10px] font-black text-slate-400 uppercase mb-1">${nome}</div>
                                    <div class="text-2xl font-black text-slate-700">${total}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    agruparPor(lista, campo, defaultLabel) {
        return lista.reduce((acc, obj) => {
            const chave = obj[campo] || defaultLabel;
            acc[chave] = (acc[chave] || 0) + 1;
            return acc;
        }, {});
    },

    renderMiniCard(label, valor, icone, bg) {
        return `
            <div class="p-5 rounded-3xl border border-slate-100 bg-white shadow-sm">
                <div class="flex justify-between items-start mb-2">
                    <div class="${bg} w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <i class="fas ${icone} text-xs"></i>
                    </div>
                    <span class="text-2xl font-black text-slate-800">${valor}</span>
                </div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${label}</div>
            </div>
        `;
    },

    renderBarraProgresso(label, valor, total, cor = '#cbd5e1') {
        const percent = ((valor / total) * 100).toFixed(1);
        return `
            <div class="space-y-1">
                <div class="flex justify-between text-xs font-bold">
                    <span class="text-slate-600">${label}</span>
                    <span class="text-slate-400">${valor} (${percent}%)</span>
                </div>
                <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-1000" 
                         style="width: ${percent}%; background-color: ${cor}"></div>
                </div>
            </div>
        `;
    }
};