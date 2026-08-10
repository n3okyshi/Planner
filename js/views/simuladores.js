import { controller } from '../controller.js';

const SIM_COLORS = {
    'bg-blue-500': { bg: '#3b82f6', text: '#ffffff' },
    'bg-emerald-500': { bg: '#10b981', text: '#ffffff' },
    'bg-indigo-500': { bg: '#6366f1', text: '#ffffff' },
};

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
            <div class="fade-in animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8); min-height: 100%;">
                <div style="border-bottom: 1px solid var(--color-slate-200); padding-bottom: var(--spacing-6);">
                    <h2 style="font-size: 1.875rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em;">Simulações Interativas</h2>
                    <p style="font-size: 0.9375rem; color: var(--color-slate-500); margin-top: 0.25rem;">Integração com laboratórios virtuais HTML5 para aulas dinâmicas e práticas.</p>
                </div>

                <div class="stat-grid stat-grid--3">
                    ${this.simuladores.map((sim, index) => {
                        const colors = SIM_COLORS[sim.cor] || { bg: '#6366f1', text: '#ffffff' };
                        return `
                        <div onclick="simuladoresView.abrirSimulador(${index})"
                             class="stat-card interactive-element"
                             style="cursor: pointer; animation-delay: ${index * 50}ms; display: flex; flex-direction: column; gap: var(--spacing-2);">
                            <div style="width: 2.5rem; height: 2.5rem; border-radius: var(--radius-xl); background-color: ${colors.bg}; color: ${colors.text}; display: flex; align-items: center; justify-content: center; font-size: 1rem; box-shadow: var(--shadow-sm); margin-bottom: var(--spacing-1); transition: transform 0.2s ease;"
                                 onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                                <i class="fas fa-flask"></i>
                            </div>
                            <h4 style="font-weight: 700; color: var(--color-slate-800); font-size: 0.9375rem;">${sim.nome}</h4>
                            <span style="font-size: 0.625rem; font-weight: 800; color: var(--color-slate-400); text-transform: uppercase; letter-spacing: 0.08em;">${sim.disc}</span>
                        </div>`;
                    }).join('')}
                </div>

                <!-- Container do Iframe (Ocupa 100% da área útil) -->
                <div id="simulador-frame-container"
                     style="display: none; width: 100%; height: 80vh; min-height: 650px; background-color: #0f172a; border-radius: var(--radius-2xl); border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); overflow: hidden; position: relative; flex-direction: column;">
                    
                    <!-- Barra de Controle do Simulador -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1.25rem; background-color: #1e293b; border-bottom: 1px solid #334155; color: #f8fafc; z-index: 10;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <span id="simulador-titulo-ativo" style="font-weight: 700; font-size: 0.9375rem;">Simulação</span>
                            <span id="simulador-disc-ativa" class="badge" style="background-color: rgba(255,255,255,0.1); color: #94a3b8; font-weight: 700; font-size: 0.6875rem;"></span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <button type="button" onclick="simuladoresView.fecharSimulador()"
                                    class="interactive-element"
                                    style="padding: 0.375rem 0.75rem; border-radius: var(--radius-md); background-color: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4); cursor: pointer; display: flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; font-weight: 700; transition: all 0.2s ease;"
                                    onmouseover="this.style.backgroundColor='rgba(239, 68, 68, 0.4)'" onmouseout="this.style.backgroundColor='rgba(239, 68, 68, 0.2)'"
                                    title="Fechar Simulação">
                                <i class="fas fa-times"></i> Fechar
                            </button>
                        </div>
                    </div>

                    <!-- Iframe preenchendo 100% da altura e largura -->
                    <iframe id="simulador-iframe" style="width: 100%; height: calc(100% - 48px); flex: 1; border: none; display: block; background-color: #ffffff;" allowfullscreen></iframe>
                </div>
            </div>
        `;
        container.innerHTML = html;
    },
    abrirSimulador(index) {
        const sim = this.simuladores[index];
        const frameContainer = document.getElementById('simulador-frame-container');
        const iframe = document.getElementById('simulador-iframe');
        const tituloEl = document.getElementById('simulador-titulo-ativo');
        const discEl = document.getElementById('simulador-disc-ativa');
        if (!frameContainer || !iframe) return;

        if (tituloEl) tituloEl.innerText = sim.nome;
        if (discEl) discEl.innerText = sim.disc;

        iframe.src = sim.url;
        frameContainer.style.display = 'flex';
        frameContainer.scrollIntoView({ behavior: 'smooth' });
    },
    fecharSimulador() {
        const frameContainer = document.getElementById('simulador-frame-container');
        const iframe = document.getElementById('simulador-iframe');
        if (!frameContainer || !iframe) return;

        iframe.src = '';
        frameContainer.style.display = 'none';
    }
};

if (typeof window !== 'undefined') {
    window.simuladoresView = simuladoresView;
}
