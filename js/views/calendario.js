
import { model } from '../model.js';
import { controller } from '../controller.js';
function safeHTML(str) {
    if (typeof window.escapeHTML === 'function') return window.escapeHTML(str);
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
}
export const calendarioView = {
    exibirLegenda: false,
    mesesNomes: [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ],
    toggleLegenda() {
        this.exibirLegenda = !this.exibirLegenda;
        this.render('view-container');
    },
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
            <div class="fade-in" style="padding-bottom: 5rem;">
                
                <div class="print-only" style="display: none; text-align: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--color-slate-200); padding-bottom: 1rem;">
                    <h1 style="font-size: 1.5rem; font-weight: 700; color: var(--color-slate-800);">Calendário Acadêmico 2026</h1>
                    <p style="font-size: 0.875rem; color: var(--color-slate-500);">${safeHTML(nomeProf)}</p>
                </div>
                <div class="no-print" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; gap: 1.5rem;">
                    <div>
                        <h2 style="font-size: 1.875rem; font-weight: 700; color: var(--color-slate-800); letter-spacing: -0.025em;">Olá, ${safeHTML(nomeProf)}!</h2>
                        <p style="color: var(--color-slate-500); margin-top: 0.25rem;">Calendário Acadêmico 2026</p>
                    </div>
                    
                    <div>
                        <button onclick="calendarioView.toggleLegenda()" 
                                style="font-size: 0.75rem; font-weight: 700; padding: 0.5rem 1rem; border-radius: var(--radius-xl); transition: all var(--transition-fast); display: flex; align-items: center; gap: 0.5rem; cursor: pointer; border: none; ${this.exibirLegenda ? 'color: var(--color-white); background-color: var(--color-primary); box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);' : 'color: var(--color-primary); background-color: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.3);'}" onmouseover="this.style.filter='brightness(1.1)'" onmouseout="this.style.filter='none'">
                            <i class="fas ${this.exibirLegenda ? 'fa-eye-slash' : 'fa-eye'}"></i> 
                            ${this.exibirLegenda ? 'Ocultar Legenda' : 'Ver Legenda'}
                        </button>
                    </div>
                </div>
                ${this.exibirLegenda ? `
                    <div class="no-print animate-slide-up" style="margin-bottom: 2rem; background-color: var(--color-slate-50); padding: 1.5rem; border-radius: var(--radius-2xl); border: 1px solid var(--color-slate-200); box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h3 style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-500); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-tags"></i> Tipos de Eventos
                            </h3>
                            <button onclick="calendarioView.toggleLegenda()" style="color: var(--color-slate-400); background: none; border: none; cursor: pointer; transition: color var(--transition-fast);" onmouseover="this.style.color='var(--color-slate-600)'" onmouseout="this.style.color='var(--color-slate-400)'">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div style="display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));">
                            ${this.gerarLegendaItens()}
                        </div>
                    </div>
                ` : ''}
                <div class="calendar-grid-months">
                    ${this.mesesNomes.map((nome, index) => this.gerarTemplateMes(index + 1, nome)).join('')}
                </div>
                <div class="print-only" style="display: none; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.5rem; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--color-slate-200); page-break-inside: avoid;">
                    <div style="grid-column: 1 / -1; margin-bottom: 0.5rem; font-weight: 700; font-size: 0.875rem; color: var(--color-slate-800);">Legenda:</div>
                    ${this.gerarLegendaItens(true)} 
                </div>
            </div>
        `;
        container.innerHTML = html;
        this.atualizarDataHeader();
    },
    gerarLegendaItens(isPrint = false) {
        if (!model.tiposEventos) return '';

        return Object.entries(model.tiposEventos)
            .filter(([key]) => !key.includes('Antigo'))
            .map(([key, estilo]) => `
                <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-radius: var(--radius-lg); ${isPrint ? '' : 'background-color: var(--color-white); border: 1px solid var(--color-slate-100); box-shadow: var(--shadow-sm);'}">
                    <div style="width: 1.125rem; height: 1.125rem; border-radius: var(--radius-md); background-color: ${estilo.bg || '#ffffff'}; border: 1px solid ${estilo.border || '#cbd5e1'}; box-shadow: var(--shadow-sm); flex-shrink: 0;"></div>
                    <span style="${isPrint ? 'font-size: 0.5625rem;' : 'font-size: 0.6875rem;'} font-weight: 700; color: ${estilo.color || 'var(--color-slate-700)'}; text-transform: uppercase; letter-spacing: 0.025em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${window.escapeHTML(estilo.label)}">${window.escapeHTML(estilo.label)}</span>
                </div>
            `).join('');
    },
    gerarTemplateMes(mes, nome) {
        const ano = 2026;
        const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
        const totalDias = new Date(ano, mes, 0).getDate();
        let diasHtml = '';

        for (let i = 0; i < primeiroDiaSemana; i++) {
            diasHtml += `<div style="height: 2rem;"></div>`;
        }
        for (let dia = 1; dia <= totalDias; dia++) {
            const dataIso = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const evento = model.state.eventos ? model.state.eventos[dataIso] : null;

            let classesBase = "calendar-day ";
            let styleBase = "height: 2rem; display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; border-radius: var(--radius-lg); transition: all var(--transition-fast); font-size: 0.75rem; font-weight: 600;";
            let tooltipText = 'Clique para adicionar evento';
            let hoverBg = 'var(--color-slate-100)';
            if (evento) {
                const configEvento = model.tiposEventos[evento.tipo];
                if (configEvento) {
                    styleBase += `background-color: ${configEvento.bg} !important; color: ${configEvento.color} !important; border: 1px solid ${configEvento.border} !important; font-weight: 700;`;
                    tooltipText = `${window.escapeHTML(configEvento.label)}: ${safeHTML(evento.descricao || '')}`;
                    hoverBg = configEvento.bg;
                } else {
                    styleBase += "background-color: #f3f4f6; color: #6b7280; font-weight: 700; border: 1px solid #e5e7eb;";
                    tooltipText = `Evento: ${safeHTML(evento.descricao || '')}`;
                }
            } else {
                classesBase += "day-empty ";
                styleBase += "color: var(--color-slate-700); background-color: transparent; border: 1px solid transparent;";
            }

            const hoje = new Date();
            const isHoje = hoje.getDate() === dia && (hoje.getMonth() + 1) === mes && hoje.getFullYear() === ano;
            if (isHoje) {
                styleBase += "box-shadow: 0 0 0 2px var(--color-primary); font-weight: 700;";
                if (!evento) {
                    styleBase += "background-color: var(--color-primary) !important; color: var(--color-white) !important;";
                    hoverBg = 'var(--color-primary-hover)';
                }
            }
            diasHtml += `
                <div class="${classesBase}" style="${styleBase}"
                     title="${tooltipText}"
                     onmouseover="if(this.classList.contains('day-empty') && !${isHoje}) this.style.backgroundColor='${hoverBg}'"
                     onmouseout="if(this.classList.contains('day-empty') && !${isHoje}) this.style.backgroundColor='transparent'"
                     onclick="controller.openDayOptions('${dataIso}')">
                    <span>${dia}</span>
                    ${(evento && evento.descricao) ? `<span class="no-print" style="position: absolute; bottom: 0.125rem; width: 0.25rem; height: 0.25rem; border-radius: 50%; background-color: currentColor; opacity: 0.7;"></span>` : ''}
                </div>
            `;
        }
        return `
            <div class="print-border-shadow-none" style="background-color: var(--color-white); padding: 1rem; border-radius: var(--radius-2xl); box-shadow: var(--shadow-sm); border: 1px solid var(--color-slate-200); transition: box-shadow var(--transition-fast); height: 100%; display: flex; flex-direction: column; page-break-inside: avoid;" onmouseover="this.style.boxShadow='var(--shadow-md)'" onmouseout="this.style.boxShadow='var(--shadow-sm)'">
                <h3 style="font-weight: 700; color: var(--color-slate-800); margin-bottom: 0.5rem; text-align: center; border-bottom: 1px solid var(--color-slate-100); padding-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.75rem; display: flex; justify-content: space-between; align-items: center; padding-left: 0.5rem; padding-right: 0.5rem;">
                    <span>${window.escapeHTML(nome)}</span>
                </h3>
                <div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 0.25rem; font-size: 0.5625rem; font-weight: 900; color: var(--color-slate-400); text-align: center; margin-bottom: 0.25rem; text-transform: uppercase;">
                    <div style="color: #ef4444;">D</div>
                    <div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 0.25rem; flex: 1; align-content: start;" class="calendar-grid">
                    ${diasHtml}
                </div>
            </div>
        `;
    },
    atualizarDataHeader() {
        const el = document.getElementById('current-date');
        if (el) {
            const hoje = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            el.innerHTML = `<i class="far fa-clock mr-2"></i>` + hoje.toLocaleDateString('pt-BR', options);
        }
    }
};