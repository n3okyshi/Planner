// js/views/simuladores.js
/**
 * ==========================================================================
 * LABORATÓRIO VIRTUAL & SIMULAÇÕES (SIMULADORES VIEW)
 * Padrão: Vanilla MVC, ES Modules, Event Delegation (data-action).
 * ==========================================================================
 */

import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';
import { EventDelegator } from '../utils/eventDelegator.js';

const SIM_COLORS = {
    'Matemática': { bg: '#3b82f6', text: '#ffffff' },
    'Física': { bg: '#059669', text: '#ffffff' },
    'Ciências': { bg: '#4f46e5', text: '#ffffff' },
    'Química': { bg: '#d97706', text: '#ffffff' },
    'Biologia': { bg: '#0891b2', text: '#ffffff' }
};

export const simuladoresView = {
    simuladores: [
        { 
            nome: 'Estados da Matéria & Mudanças de Fase', 
            disc: 'Ciências', 
            url: 'https://phet.colorado.edu/sims/html/states-of-matter-basics/latest/states-of-matter-basics_pt_BR.html',
            desc: 'Observação do comportamento molecular de sólidos, líquidos e gases.'
        },
        { 
            nome: 'Forças e Movimento: Fundamentos', 
            disc: 'Física', 
            url: 'https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_pt_BR.html',
            desc: 'Exploração de atrito, aceleração, inércia e 2ª Lei de Newton.'
        },
        { 
            nome: 'Construa um Átomo & Tabela Periódica', 
            disc: 'Química', 
            url: 'https://phet.colorado.edu/sims/html/build-an-atom/latest/build-an-atom_pt_BR.html',
            desc: 'Prática de montagem atômica com prótons, nêutrons e elétrons.'
        },
        { 
            nome: 'Kit de Construção de Circuitos DC', 
            disc: 'Física', 
            url: 'https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_pt_BR.html',
            desc: 'Montagem de circuitos em série, paralelo, resistores e lâmpadas.'
        },
        { 
            nome: 'Densidade e Flutuabilidade dos Corpos', 
            disc: 'Ciências', 
            url: 'https://phet.colorado.edu/sims/html/density/latest/density_pt_BR.html',
            desc: 'Investigação da relação entre massa, volume e empuxo.'
        },
        { 
            nome: 'Frações: Introdução e Comparação', 
            disc: 'Matemática', 
            url: 'https://phet.colorado.edu/sims/html/fractions-intro/latest/fractions-intro_pt_BR.html',
            desc: 'Visualização interativa de partes de um todo e equivalências.'
        },
        { 
            nome: 'Seleção Natural & Evolução', 
            disc: 'Biologia', 
            url: 'https://phet.colorado.edu/sims/html/natural-selection/latest/natural-selection_pt_BR.html',
            desc: 'Simulação de mutações, predadores e adaptação populacional.'
        },
        { 
            nome: 'Ondas em uma Corda & Som', 
            disc: 'Física', 
            url: 'https://phet.colorado.edu/sims/html/wave-on-a-string/latest/wave-on-a-string_pt_BR.html',
            desc: 'Estudo de frequência, amplitude, comprimento de onda e amortecimento.'
        }
    ],
    _cleanupDelegators: null,
    _simuladorAtivoIndex: null,

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) {
            container = this._lastContainer || document.getElementById('interatividades-tab-content') || document.getElementById('view-container');
        }
        if (!container) return;

        this._lastContainer = container;

        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }

        const html = `
            <div class="fade-in animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8); min-height: 100%;">
                
                <!-- HEADER DO MÓDULO -->
                <div style="border-bottom: 1px solid var(--color-slate-200); padding-bottom: var(--spacing-6); display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <h2 style="font-size: 1.875rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em;">Laboratório Virtual & Simulações</h2>
                            <span class="badge" style="background-color: #ecfdf5; color: #059669; font-weight: 800;">
                                <i class="fas fa-flask"></i> PhET Interativo
                            </span>
                        </div>
                        <p style="font-size: 0.9375rem; color: var(--color-slate-500); margin-top: 0.25rem;">
                            Laboratórios virtuais científicos em HTML5 integrados à Inteligência Artificial para geração instantânea de roteiros práticos.
                        </p>
                    </div>

                    <button type="button" data-action="nav-criar-material" class="btn-primary interactive-element" style="box-shadow: var(--shadow-sm);">
                        <i class="fas fa-magic"></i> <span>Criar Roteiro Personalizado</span>
                    </button>
                </div>

                <!-- GRADE DE SIMULADORES CIENTÍFICOS -->
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--spacing-4);">
                    ${this.simuladores.map((sim, index) => {
                        const colors = SIM_COLORS[sim.disc] || { bg: '#4f46e5', text: '#ffffff' };
                        return `
                        <div class="card interactive-element animate-enter"
                             style="padding: 1.25rem; border-radius: var(--radius-2xl); border: 1px solid var(--color-slate-200); display: flex; flex-direction: column; justify-content: space-between; gap: var(--spacing-4); box-sizing: border-box; background-color: var(--color-white); box-shadow: var(--shadow-sm); transition: all 0.2s ease;">
                            
                            <div>
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-3);">
                                    <div style="width: 2.75rem; height: 2.75rem; border-radius: var(--radius-xl); background-color: ${colors.bg}; color: ${colors.text}; display: flex; align-items: center; justify-content: center; font-size: 1.125rem; box-shadow: var(--shadow-sm);">
                                        <i class="fas fa-flask"></i>
                                    </div>
                                    <span class="badge" style="background-color: var(--color-slate-100); color: var(--color-slate-700); font-weight: 800; font-size: 0.6875rem; text-transform: uppercase;">
                                        ${sim.disc}
                                    </span>
                                </div>
                                <h4 style="font-weight: 800; color: var(--color-slate-800); font-size: 1rem; line-height: 1.35; margin-bottom: 0.375rem;">${sim.nome}</h4>
                                <p style="font-size: 0.8125rem; color: var(--color-slate-500); line-height: 1.45;">${sim.desc}</p>
                            </div>

                            <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: var(--spacing-2); padding-top: var(--spacing-3); border-top: 1px solid var(--color-slate-100);">
                                <button type="button" data-action="abrir-simulador" data-index="${index}" class="btn-primary interactive-element" style="width: 100%; justify-content: center; font-size: 0.8125rem; padding: 0.5rem;">
                                    <i class="fas fa-play"></i> <span>Abrir Simulação</span>
                                </button>
                                
                                <button type="button" data-action="gerar-roteiro-simulador" data-index="${index}" class="btn-secondary interactive-element" style="width: 100%; justify-content: center; font-size: 0.75rem; padding: 0.375rem; background-color: #f0fdf4; color: #166534; border-color: #bbf7d0;">
                                    <i class="fas fa-file-invoice"></i> <span>Gerar Roteiro Prático (IA)</span>
                                </button>
                            </div>
                        </div>`;
                    }).join('')}
                </div>

                <!-- Container do Iframe (Ocupa 100% da área útil quando aberto) -->
                <div id="simulador-frame-container"
                     style="display: none; width: 100%; height: 85vh; min-height: 680px; background-color: #0f172a; border-radius: var(--radius-2xl); border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); overflow: hidden; position: relative; flex-direction: column; margin-top: var(--spacing-4);">
                    
                    <!-- Barra de Controle do Simulador -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1.25rem; background-color: #1e293b; border-bottom: 1px solid #334155; color: #f8fafc; z-index: 10;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <span id="simulador-titulo-ativo" style="font-weight: 700; font-size: 0.9375rem;">Simulação</span>
                            <span id="simulador-disc-ativa" class="badge" style="background-color: rgba(255,255,255,0.1); color: #94a3b8; font-weight: 700; font-size: 0.6875rem;"></span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <button type="button" data-action="gerar-roteiro-iframe-btn"
                                    class="interactive-element"
                                    style="padding: 0.375rem 0.75rem; border-radius: var(--radius-md); background-color: #059669; color: #ffffff; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; font-weight: 700;">
                                <i class="fas fa-file-invoice"></i> Gerar Roteiro
                            </button>
                            <button type="button" data-action="fechar-simulador-btn"
                                    class="interactive-element"
                                    style="padding: 0.375rem 0.75rem; border-radius: var(--radius-md); background-color: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4); cursor: pointer; display: flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; font-weight: 700;"
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

        this._cleanupDelegators = EventDelegator.bind(container, {
            'nav-criar-material': () => controller.navigate('criar-material'),
            'abrir-simulador': (e, target) => {
                const idx = Number(target.getAttribute('data-index'));
                if (!isNaN(idx)) this.abrirSimulador(idx);
            },
            'gerar-roteiro-simulador': (e, target) => {
                const idx = Number(target.getAttribute('data-index'));
                if (!isNaN(idx)) this.gerarRoteiroParaSimulador(idx);
            },
            'gerar-roteiro-iframe-btn': () => {
                if (this._simuladorAtivoIndex !== null) {
                    this.gerarRoteiroParaSimulador(this._simuladorAtivoIndex);
                }
            },
            'fechar-simulador-btn': () => this.fecharSimulador()
        }, 'click');
    },

    destroy() {
        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }
    },

    onLeave() {
        this.destroy();
    },

    abrirSimulador(index) {
        const sim = this.simuladores[index];
        const frameContainer = document.getElementById('simulador-frame-container');
        const iframe = document.getElementById('simulador-iframe');
        const tituloEl = document.getElementById('simulador-titulo-ativo');
        const discEl = document.getElementById('simulador-disc-ativa');
        if (!frameContainer || !iframe || !sim) return;

        this._simuladorAtivoIndex = index;
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

        this._simuladorAtivoIndex = null;
        iframe.src = '';
        frameContainer.style.display = 'none';
    },

    gerarRoteiroParaSimulador(index) {
        const sim = this.simuladores[index];
        if (!sim) return;

        if (window.criarMaterialView) {
            window.criarMaterialView.ferramentaAtiva = 'pratica-laboratorio';
        }

        controller.navigate('criar-material');

        setTimeout(() => {
            const temaInput = document.querySelector('input[data-field="Assunto / Fenômeno a ser Investigado"], input[data-field="Tema"]');
            const materiaisInput = document.querySelector('input[data-field="Materiais Disponíveis ou em Foco"]');
            const discInput = document.querySelector('input[data-field="Disciplina"]');

            if (temaInput) {
                temaInput.value = sim.nome;
                temaInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (materiaisInput) {
                materiaisInput.value = `Simulador Virtual PhET (${sim.nome}), Caderno de Anotações, Computador/Tablet`;
                materiaisInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (discInput) {
                discInput.value = sim.disc;
                discInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

            Toast.show(`Configurado para gerar roteiro de: ${sim.nome}`, "success");
        }, 150);
    }
};

if (typeof window !== 'undefined') {
    window.simuladoresView = simuladoresView;
}
