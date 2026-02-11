/**
 * @file calendario.js
 * @description View responsável pela renderização do Calendário Acadêmico anual.
 * @module views/calendarioView
 */

import { model } from '../model.js';
import { controller } from '../controller.js';

/**
 * Utilitário para escapar HTML e prevenir XSS (se não existir globalmente).
 * @param {string} str 
 * @returns {string}
 */
function safeHTML(str) {
    if (typeof window.escapeHTML === 'function') return window.escapeHTML(str);
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
}

/**
 * View do Calendário.
 * @namespace calendarioView
 */
export const calendarioView = {
    // Estado local para controlar a visualização da legenda
    exibirLegenda: false,

    mesesNomes: [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ],

    /**
     * Alterna a visibilidade da caixa de legenda.
     */
    toggleLegenda() {
        this.exibirLegenda = !this.exibirLegenda;
        // Re-renderiza para atualizar a interface
        this.render('view-container');
    },

    /**
     * Renderiza o calendário completo no container.
     * @param {HTMLElement|string} container 
     */
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        
        const config = (model.state && model.state.userConfig) || {};
        let nomeProf = 'Professor(a)';
        
        if (config.profName && config.profName.trim() !== '') {
            nomeProf = config.profName.split(' ')[0];
        } else if (model.currentUser && model.currentUser.displayName) {
            nomeProf = model.currentUser.displayName.split(' ')[0];
        }
        
        const html = `
            <div class="fade-in pb-20 print:pb-0">
                
                <div class="hidden print:block text-center mb-6 border-b border-slate-200 pb-4">
                    <h1 class="text-2xl font-bold text-slate-800">Calendário Acadêmico 2026</h1>
                    <p class="text-sm text-slate-500">${safeHTML(nomeProf)}</p>
                </div>

                <div class="flex flex-wrap justify-between items-end mb-6 gap-6 no-print">
                    <div>
                        <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Olá, ${safeHTML(nomeProf)}!</h2>
                        <p class="text-slate-500 mt-1">Calendário Acadêmico 2026</p>
                    </div>
                    
                    <div>
                        <button onclick="calendarioView.toggleLegenda()" 
                                class="text-xs font-bold ${this.exibirLegenda ? 'text-white bg-primary shadow-lg shadow-primary/30' : 'text-primary bg-primary/5 hover:bg-primary/10 border border-primary/30'} px-4 py-2 rounded-xl transition-all flex items-center gap-2">
                            <i class="fas ${this.exibirLegenda ? 'fa-eye-slash' : 'fa-eye'}"></i> 
                            ${this.exibirLegenda ? 'Ocultar Legenda' : 'Ver Legenda'}
                        </button>
                    </div>
                </div>

                ${this.exibirLegenda ? `
                    <div class="mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner animate-slideIn no-print">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <i class="fas fa-tags"></i> Tipos de Eventos
                            </h3>
                            <button onclick="calendarioView.toggleLegenda()" class="text-slate-400 hover:text-slate-600">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
                            ${this.gerarLegendaItens()}
                        </div>
                    </div>
                ` : ''}

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 print:grid-cols-3 gap-6 calendar-grid print:gap-4">
                    ${this.mesesNomes.map((nome, index) => this.gerarTemplateMes(index + 1, nome)).join('')}
                </div>

                <div class="hidden print:grid grid-cols-4 gap-2 mt-8 pt-4 border-t border-slate-200 break-inside-avoid">
                    <div class="col-span-full mb-2 font-bold text-sm text-slate-800">Legenda:</div>
                    ${this.gerarLegendaItens(true)} 
                </div>
            </div>
        `;
        container.innerHTML = html;
        this.atualizarDataHeader();
    },

    /**
     * Gera os itens HTML da legenda baseados no Model.
     * @param {boolean} isPrint - Se true, gera estilo otimizado para impressão.
     * @returns {string} HTML string.
     */
    gerarLegendaItens(isPrint = false) {
        if (!model.tiposEventos) return '';
        
        return Object.entries(model.tiposEventos)
            .filter(([key]) => !key.includes('Antigo')) // Exemplo de filtro de legado
            .map(([key, estilo]) => `
                <div class="flex items-center gap-2 p-2 ${isPrint ? '' : 'bg-white border border-slate-100 shadow-sm'} rounded-lg">
                    <div class="w-4 h-4 rounded-md shadow-sm shrink-0 ${estilo.bg} border ${estilo.border} print:border-2"></div>
                    <span class="${isPrint ? 'text-[9px]' : 'text-[10px]'} font-bold text-slate-600 uppercase tracking-wide truncate" title="${window.escapeHTML(estilo.label)}">${window.escapeHTML(estilo.label)}</span>
                </div>
            `).join('');
    },

    /**
     * Gera o HTML de um mês específico.
     * @param {number} mes - Número do mês (1-12).
     * @param {string} nome - Nome do mês.
     * @returns {string} HTML string.
     */
    gerarTemplateMes(mes, nome) {
        const ano = 2026;
        const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
        const totalDias = new Date(ano, mes, 0).getDate();
        let diasHtml = '';
        
        // Espaços vazios antes do dia 1
        for (let i = 0; i < primeiroDiaSemana; i++) {
            diasHtml += `<div class="h-8 calendar-day-empty"></div>`;
        }

        // Dias do mês
        for (let dia = 1; dia <= totalDias; dia++) {
            const dataIso = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const evento = model.state.eventos ? model.state.eventos[dataIso] : null;
            
            let classesBase = "h-8 flex items-center justify-center relative cursor-pointer rounded-lg transition-all text-xs font-medium calendar-day ";
            let estiloCor = "hover:bg-slate-100 text-slate-600";
            let tooltipText = 'Clique para adicionar evento';

            if (evento) {
                // Recupera configuração do Model
                const configEvento = model.tiposEventos[evento.tipo];
                    if (configEvento) {
                    estiloCor = `${configEvento.bg} ${configEvento.text} font-bold ring-1 ring-inset ${configEvento.border}`;
                    tooltipText = `${window.escapeHTML(configEvento.label)}: ${safeHTML(evento.descricao)}`;
                } else {
                    estiloCor = "bg-gray-100 text-gray-500 font-bold border border-gray-200";
                    tooltipText = `Evento: ${safeHTML(evento.descricao)}`;
                }
            }
            
            // Destacar dia atual
            const hoje = new Date();
            const isHoje = hoje.getDate() === dia && (hoje.getMonth() + 1) === mes && hoje.getFullYear() === ano;
            if (isHoje) {
                classesBase += "ring-2 ring-primary ring-offset-1 z-10 font-bold ";
                // Se hoje não tiver evento, destaca em azul
                if (!evento) estiloCor = "bg-primary text-white hover:bg-primary/90";
            }

            diasHtml += `
                <div class="${classesBase} ${estiloCor} group"
                     title="${tooltipText}"
                     onclick="controller.openDayOptions('${dataIso}')">
                    <span>${dia}</span>
                    ${(evento && evento.descricao) ? `<span class="absolute -bottom-0.5 w-1 h-1 rounded-full bg-current opacity-50 no-print"></span>` : ''}
                </div>
            `;
        }

        return `
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow h-full flex flex-col break-inside-avoid print:border print:shadow-none print:p-2">
                <h3 class="font-bold text-slate-800 mb-2 text-center border-b border-slate-50 pb-2 uppercase tracking-widest text-xs flex justify-between items-center px-2">
                    <span>${window.escapeHTML(nome)}</span>
                </h3>
                <div class="grid grid-cols-7 gap-1 text-[9px] font-black text-slate-400 text-center mb-1 uppercase">
                    <div class="text-red-300">D</div>
                    <div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
                </div>
                <div class="grid grid-cols-7 gap-1 flex-1 content-start calendar-grid">
                    ${diasHtml}
                </div>
            </div>
        `;
    },

    /**
     * Atualiza o cabeçalho de data global (se existir na página).
     */
    atualizarDataHeader() {
        const el = document.getElementById('current-date');
        if (el) {
            const hoje = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            el.innerHTML = `<i class="far fa-clock mr-2"></i>` + hoje.toLocaleDateString('pt-BR', options);
        }
    }
};