/**
 * @file simuladores.js
 * @description View de Simulações Interativas (Física, Matemática, Química)
 */
import { controller } from '../controller.js';

export const simuladoresView = {
    simuladores: [
        { nome: 'Frações: Introdução', disc: 'Matemática', cor: 'bg-blue-500', url: 'https://phet.colorado.edu/sims/html/fractions-intro/latest/fractions-intro_pt_BR.html' },
        { nome: 'Forças e Movimento', disc: 'Física', cor: 'bg-emerald-500', url: 'https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_pt_BR.html' },
        { nome: 'Estados da Matéria', disc: 'Ciências', cor: 'bg-indigo-500', url: 'https://phet.colorado.edu/sims/html/states-of-matter-basics/latest/states-of-matter-basics_pt_BR.html' }
    ],

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const html = `
            <div class="fade-in pb-20 h-full flex flex-col">
                <div class="mb-8 border-b border-slate-200 pb-6 shrink-0">
                    <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Simulações Interativas</h2>
                    <p class="text-slate-500">Integração com laboratórios virtuais HTML5 para aulas dinâmicas.</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
                    ${this.simuladores.map((sim, index) => `
                        <div onclick="simuladoresView.abrirSimulador(${index})" class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all group animate-slide-up" style="animation-delay: ${index * 50}ms">
                            <div class="${sim.cor} w-10 h-10 rounded-xl mb-3 flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                                <i class="fas fa-flask"></i>
                            </div>
                            <h4 class="font-bold text-slate-800">${sim.nome}</h4>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${sim.disc}</span>
                        </div>
                    `).join('')}
                </div>

                <!-- Container do Iframe -->
                <div id="simulador-frame-container" class="flex-1 bg-slate-900 rounded-[2rem] border-4 border-slate-200 shadow-inner overflow-hidden min-h-[500px] hidden relative">
                    <div class="absolute top-4 right-4 z-10">
                        <button onclick="simuladoresView.fecharSimulador()" class="w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white flex items-center justify-center transition-colors">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <iframe id="simulador-iframe" class="w-full h-full border-none" allowfullscreen></iframe>
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    abrirSimulador(index) {
        const sim = this.simuladores[index];
        const container = document.getElementById('simulador-frame-container');
        const iframe = document.getElementById('simulador-iframe');
        
        iframe.src = sim.url;
        container.classList.remove('hidden');
        container.scrollIntoView({ behavior: 'smooth' });
    },

    fecharSimulador() {
        const container = document.getElementById('simulador-frame-container');
        const iframe = document.getElementById('simulador-iframe');
        
        iframe.src = '';
        container.classList.add('hidden');
    }
};