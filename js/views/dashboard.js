/**
 * @file dashboard.js
 * @description View principal (Home) do aplicativo. Exibe resumo do dia, pendências e calendário.
 * @module views/dashboardView
 */

import { model } from '../model.js';
import { controller } from '../controller.js';
import { calendarioView } from './calendario.js';

/**
 * View da Dashboard.
 * @namespace dashboardView
 */
export const dashboardView = {

    /**
     * Renderiza o painel principal.
     * @param {HTMLElement|string} container 
     */
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const saudacao = this.getSaudacao();
        const pendencias = this.calcularPendencias();
        const aniversariantes = this.buscarAniversariantes(); 
        
        const hoje = new Date();
        const dataHojeIso = hoje.toISOString().split('T')[0];
        
        // Calcula quantas turmas já têm plano de aula hoje
        const turmas = model.state.turmas || [];
        const aulasHoje = turmas.filter(t => {
            const planos = model.state.planosDiarios || {};
            return planos[dataHojeIso] && planos[dataHojeIso][t.id];
        });

        // Nome seguro para exibição
        const nomeProf = this.getNomeProf();
        const nomeSafe = window.escapeHTML ? window.escapeHTML(nomeProf) : nomeProf.replace(/[<>]/g, '');

        const html = `
            <div class="fade-in pb-20 space-y-8">
                
                <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6">
                    <div>
                        <h1 class="text-3xl font-bold text-slate-800 tracking-tight">${saudacao.texto}, ${nomeSafe}!</h1>
                        <p class="text-slate-500 mt-1 flex items-center gap-2">
                            <i class="far fa-calendar text-primary"></i>
                            ${hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                    <div class="flex gap-2">
                         <button onclick="controller.navigate('dia')" class="bg-primary text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition flex items-center gap-2 active:scale-95">
                            <i class="fas fa-plus"></i> Novo Diário
                         </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all relative overflow-hidden group">
                        <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <i class="fas fa-chalkboard-teacher text-6xl text-blue-500"></i>
                        </div>
                        <h3 class="font-bold text-slate-500 text-xs uppercase tracking-wider mb-3">Situação de Hoje</h3>
                        <div class="relative z-10">
                            <div class="text-4xl font-black text-slate-800 mb-1">
                                ${aulasHoje.length} / ${turmas.length}
                            </div>
                            <p class="text-sm text-slate-500 font-medium">Turmas planejadas</p>
                            
                            <div class="mt-4 flex flex-col gap-2">
                                ${turmas.length === 0 
                                    ? '<span class="text-xs text-orange-500">Nenhuma turma cadastrada.</span>' 
                                    : aulasHoje.length === turmas.length 
                                        ? '<span class="text-xs text-emerald-600 font-bold flex items-center gap-1"><i class="fas fa-check-circle"></i> Tudo pronto para hoje!</span>'
                                        : `<button onclick="controller.navigate('dia')" class="text-xs text-primary font-bold hover:underline text-left">
                                             <i class="fas fa-arrow-right"></i> Planejar ${turmas.length - aulasHoje.length} turmas restantes
                                           </button>`
                                }
                            </div>
                        </div>
                        <div class="absolute bottom-0 left-0 w-full h-1 bg-blue-500"></div>
                    </div>

                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all relative overflow-hidden group">
                        <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <i class="fas fa-tasks text-6xl ${pendencias.total > 0 ? 'text-orange-500' : 'text-emerald-500'}"></i>
                        </div>
                        <h3 class="font-bold text-slate-500 text-xs uppercase tracking-wider mb-3">Pendências</h3>
                        <div class="relative z-10">
                            <div class="text-4xl font-black ${pendencias.total > 0 ? 'text-orange-500' : 'text-emerald-600'} mb-1">
                                ${pendencias.total}
                            </div>
                            <p class="text-sm text-slate-500 font-medium">${pendencias.total === 1 ? 'Diário atrasado' : 'Diários atrasados'}</p>
                            
                            <div class="mt-4">
                                ${pendencias.total > 0 
                                    ? `<button onclick="controller.navigate('mensal')" class="text-xs font-bold text-orange-500 hover:text-orange-600 bg-orange-50 px-2 py-1 rounded transition">
                                         Ver pendências
                                       </button>` 
                                    : '<span class="text-xs text-emerald-600 font-bold">Você está em dia!</span>'
                                }
                            </div>
                        </div>
                        <div class="absolute bottom-0 left-0 w-full h-1 ${pendencias.total > 0 ? 'bg-orange-500' : 'bg-emerald-500'}"></div>
                    </div>

                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all relative overflow-hidden group">
                        <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <i class="fas fa-birthday-cake text-6xl text-pink-500"></i>
                        </div>
                        <h3 class="font-bold text-slate-500 text-xs uppercase tracking-wider mb-3">Aniversariantes (Mês)</h3>
                        <div class="relative z-10 h-full">
                            ${aniversariantes.length > 0 
                                ? `<div class="flex -space-x-2 overflow-hidden mb-2">
                                    ${aniversariantes.map(a => `
                                        <div class="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-pink-100 flex items-center justify-center text-xs font-bold text-pink-600" title="${window.escapeHTML(a.nome)}">
                                            ${window.escapeHTML(a.nome.charAt(0))}
                                        </div>
                                     `).join('')}
                                   </div>
                                   <p class="text-sm text-slate-500"><span class="font-bold text-slate-800">${aniversariantes.length}</span> alunos celebram este mês.</p>`
                                : `<div class="flex flex-col justify-center h-20">
                                     <p class="text-3xl font-black text-slate-300">0</p>
                                     <p class="text-xs text-slate-400">Nenhum aniversariante cadastrado.</p>
                                   </div>`
                            }
                        </div>
                        <div class="absolute bottom-0 left-0 w-full h-1 bg-pink-500"></div>
                    </div>
                </div>

                <div class="pt-8 border-t border-slate-200">
                     <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-bold text-slate-700">Calendário Geral</h2>
                     </div>
                     <div id="calendar-wrapper"></div>
                </div>

            </div>
        `;

        container.innerHTML = html;
        
        // Renderiza o calendário de forma assíncrona para não bloquear a UI principal
        setTimeout(() => {
            const calContainer = document.getElementById('calendar-wrapper');
            if(calContainer) {
                calendarioView.render(calContainer);
                
                // Remove o header duplicado do componente calendário, pois já temos um título na section
                const oldHeader = calContainer.querySelector('h1.text-2xl'); 
                if(oldHeader && oldHeader.parentElement) oldHeader.parentElement.style.display = 'none';
                const oldHello = calContainer.querySelector('h2.text-3xl');
                if(oldHello && oldHello.parentElement) oldHello.parentElement.parentElement.style.display = 'none';
            }
        }, 0);
    },

    /**
     * Retorna a saudação baseada na hora do dia.
     * @returns {{texto: string, icon: string}}
     */
    getSaudacao() {
        const hora = new Date().getHours();
        if (hora < 12) return { texto: 'Bom dia', icon: 'fa-sun' };
        if (hora < 18) return { texto: 'Boa tarde', icon: 'fa-cloud-sun' };
        return { texto: 'Boa noite', icon: 'fa-moon' };
    },

    /**
     * Recupera o nome do professor das configurações ou do auth.
     * @returns {string} Primeiro nome.
     */
    getNomeProf() {
        const config = model.state.userConfig || {};
        if (config.profName && config.profName.trim() !== '') {
            return config.profName.split(' ')[0];
        }
        if (model.currentUser && model.currentUser.displayName) {
            return model.currentUser.displayName.split(' ')[0];
        }
        return 'Professor(a)';
    },

    /**
     * Calcula se houve dias letivos recentes sem diário preenchido.
     * @returns {{total: number}}
     */
    calcularPendencias() {
        let pendencias = 0;
        const hoje = new Date();
        const turmas = model.state.turmas || [];
        
        if (turmas.length === 0) return { total: 0 };

        // Verifica os últimos 3 dias
        for (let i = 1; i <= 3; i++) {
            const d = new Date();
            d.setDate(hoje.getDate() - i);
            
            // Pula fim de semana (0=Dom, 6=Sab)
            if (d.getDay() === 0 || d.getDay() === 6) continue;

            const dataIso = d.toISOString().split('T')[0];
            
            // Se for feriado/evento, não cobra
            if (model.state.eventos && model.state.eventos[dataIso]) continue;
            
            // Verifica se tem plano
            const temDiario = model.state.planosDiarios && model.state.planosDiarios[dataIso];
            
            // Simplificação: Se não tem NENHUM registro no dia, conta como 1 pendência (dia não trabalhado)
            if (!temDiario) {
                pendencias++;
            }
        }
        
        return { total: pendencias };
    },

    /**
     * Placeholder para busca de aniversariantes (Futuro).
     * @returns {Array} Lista vazia por enquanto.
     */
    buscarAniversariantes() {
        // Futuro: Implementar campo data_nascimento no cadastro de aluno
        // return model.state.turmas.flatMap(t => t.alunos).filter(a => isAniversario(a.nascimento));
        return []; 
    }
};