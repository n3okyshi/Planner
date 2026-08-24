
import { model } from '../model.js';
import { Toast } from '../components/toast.js';
import { controller } from '../controller.js';
import { renderMath } from '../utils.js';
import { EventDelegator } from '../utils/eventDelegator.js';

export const uiController = {
    _modalCleanup: null,

    openModal(titulo, conteudo, tamanho = 'medium') {
        const modal = document.getElementById('global-modal');
        if (!modal) return;

        if (typeof this._modalCleanup === 'function') {
            this._modalCleanup();
            this._modalCleanup = null;
        }

        const headerHtml = titulo ? `
            <div class="modal__header">
                <h3 class="modal__title">${window.escapeHTML(titulo)}</h3>
                <button type="button" data-action="close-modal" class="modal__close" title="Fechar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        ` : `
            <button type="button" data-action="close-modal" class="modal__close" style="position: absolute; top: 1rem; right: 1rem; z-index: 20;" title="Fechar">
                <i class="fas fa-times"></i>
            </button>
        `;
        modal.innerHTML = `
        <div class="modal__content modal__content--${tamanho}">
            ${headerHtml}
            <div class="modal__body custom-scrollbar">
                ${conteudo}
            </div>
        </div>
        `;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        this._modalCleanup = EventDelegator.bind(modal, {
            'close-modal': () => uiController.closeModal(),
            'fechar-modal': () => uiController.closeModal(),
            'export-backup': () => controller.exportData(),
            'executar-forcar-sync': () => uiController.executarForcarSincronizacao()
        }, 'click');

        setTimeout(() => {
            uiController.initAllDropdowns();
            renderMath(modal);
        }, 50);
        setTimeout(() => {
            renderMath(modal);
        }, 200);
    },
    closeModal() {
        if (typeof this._modalCleanup === 'function') {
            this._modalCleanup();
            this._modalCleanup = null;
        }
        const modal = document.getElementById('global-modal');
        if (modal) {
            modal.classList.add('hidden');
            setTimeout(() => { modal.innerHTML = ''; }, 300);
        }
        document.body.style.overflow = '';
    },
    confirmarAcao(titulo, mensagem, callbackConfirmacao) {
        const html = `
            <div class="confirm-dialog">
                <div class="confirm-dialog__icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="confirm-dialog__title">${titulo}</h3>
                <p class="confirm-dialog__text">${mensagem}</p>
                <div class="confirm-dialog__actions">
                    <button type="button" data-action="close-modal" class="btn-secondary">Cancelar</button>
                    <button id="btn-confirm-action" class="btn-danger">Confirmar</button>
                </div>
            </div>
        `;
        this.openModal('Confirmação', html, 'small');
        setTimeout(() => {
            const btn = document.getElementById('btn-confirm-action');
            if (btn) {
                btn.onclick = () => {
                    callbackConfirmacao();
                    this.closeModal();
                };
                btn.focus();
            }
        }, 50);
    },
    toggleSidebar() {
        const sidebar = document.getElementById('app-sidebar');
        const main = document.getElementById('main-content');
        const icon = document.getElementById('sidebar-toggle-icon');
        const headerIcon = document.getElementById('header-sidebar-toggle-icon');
        if (!sidebar || !main) return;

        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            sidebar.classList.toggle('mobile-open');
            const isExp = sidebar.classList.contains('mobile-open');
            if (icon) icon.className = isExp ? 'fas fa-chevron-left' : 'fas fa-bars';
            if (headerIcon) headerIcon.className = isExp ? 'fas fa-chevron-left' : 'fas fa-bars';
        } else {
            sidebar.classList.toggle('collapsed');
            main.classList.toggle('expanded-content');
            const isCollapsed = sidebar.classList.contains('collapsed');
            if (icon) icon.className = isCollapsed ? 'fas fa-bars' : 'fas fa-chevron-left';
            if (headerIcon) headerIcon.className = isCollapsed ? 'fas fa-bars' : 'fas fa-chevron-left';
        }
    },
    updateNavHighlight(viewName) {
        document.querySelectorAll('nav button').forEach(btn => {
            btn.classList.remove('nav-item--active');
        });
        const mapId = {
            'periodo': 'planejamento',
            'dia': 'diario',
            'mapa': 'sala',
            'frequencia': 'frequencia',
            'config': 'settings',
            'mensal': 'mensal',
            'bimestralizacoes': 'bimestralizacao'
        };
        let activeBtn = document.getElementById(`nav-${viewName}`);
        if (!activeBtn && mapId[viewName]) {
            activeBtn = document.getElementById(`nav-${mapId[viewName]}`);
        }
        if (activeBtn) {
            activeBtn.classList.add('nav-item--active');
        }
    },
    updateBreadcrumb(viewName) {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;
        const map = {
            'dashboard': 'Visão Geral',
            'mensal': 'Planejamento / Mensal',
            'periodo': 'Planejamento / Por Período',
            'dia': 'Planejamento / Diário',
            'turmas': 'Acadêmico / Turmas',
            'bncc': 'Acadêmico / BNCC',
            'bimestralizacao': 'Acadêmico / Bimestralizações (Formosa)',
            'bimestralizacoes': 'Acadêmico / Bimestralizações (Formosa)',
            'mapa': 'Acadêmico / Mapa de Sala',
            'provas': 'Acadêmico / Gerador de Provas',
            'stats-provas': 'Acadêmico / Estatísticas de Avaliações',
            'frequencia': 'Acadêmico / Frequência',
            'comunidade': 'Comunidade / Banco de Questões',
            'biblioteca': 'Biblioteca de Materiais',
            'criar-material': 'Criador de Materiais IA',
            'conteudo-gerado': 'Material Pedagógico',
            'quiz-gestor': 'Gestor de Quizzes',
            'quiz-player': 'Apresentação de Quiz',
            'correcao': 'Correção Automática',
            'simuladores': 'Simulações Interativas',
            'notas-anuais': 'Notas Anuais & Médias',
            'estatisticas': 'Analytics / Desempenho',
            'config': 'Configurações'
        };
        const label = map[viewName] || viewName.charAt(0).toUpperCase() + viewName.slice(1);
        breadcrumb.innerHTML = `<i class="fas fa-home text-slate-300"></i> <span class="text-slate-300 mx-2">/</span> ${window.escapeHTML(label)}`;
    },
    getCardSkeleton(count = 6) {
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--spacing-6);" class="animate-enter">
                ${Array.from({ length: count }).map(() => `
                    <div class="card" style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div class="skeleton-bg skeleton-rounded-xl" style="width: 3rem; height: 3rem;"></div>
                            <div class="skeleton-bg skeleton-rounded-md" style="width: 5rem; height: 1rem;"></div>
                        </div>
                        <div class="skeleton-bg skeleton-rounded-md" style="width: 75%; height: 1.5rem;"></div>
                        <div class="skeleton-bg skeleton-rounded-md" style="width: 50%; height: 1rem;"></div>
                        <div class="skeleton-bg skeleton-rounded-full" style="width: 100%; height: 0.375rem; margin-top: var(--spacing-3);"></div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    getTableSkeleton(rows = 5) {
        return `
            <div class="card animate-enter" style="padding: var(--spacing-4); display: flex; flex-direction: column; gap: var(--spacing-4);">
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--spacing-4); border-bottom: 1px solid var(--color-slate-100);">
                    <div class="skeleton-bg skeleton-rounded-md" style="width: 12rem; height: 1.5rem;"></div>
                    <div class="skeleton-bg skeleton-rounded-lg" style="width: 6rem; height: 2rem;"></div>
                </div>
                <div style="display: flex; flex-direction: column; gap: var(--spacing-3);">
                    ${Array.from({ length: rows }).map(() => `
                        <div style="display: flex; align-items: center; gap: var(--spacing-4); padding: var(--spacing-2) 0;">
                            <div class="skeleton-bg skeleton-rounded-full" style="width: 2rem; height: 2rem; flex-shrink: 0;"></div>
                            <div class="skeleton-bg skeleton-rounded-md" style="flex: 1; height: 1.25rem;"></div>
                            <div class="skeleton-bg skeleton-rounded-md" style="width: 5rem; height: 1.25rem;"></div>
                            <div class="skeleton-bg skeleton-rounded-md" style="width: 4rem; height: 1.25rem;"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },
    renderSkeleton(container, viewTarget) {
        if (!container) return;
        const specificSkeletons = {
            dashboard: `
                <div class="skeleton animate-enter">
                    <div style="height: 2rem; width: 33%; margin-bottom: 1.5rem;" class="skeleton-bg skeleton-rounded"></div>
                    <div style="display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
                        <div style="height: 8rem;" class="skeleton-bg skeleton-rounded-2xl"></div>
                        <div style="height: 8rem;" class="skeleton-bg skeleton-rounded-2xl"></div>
                        <div style="height: 8rem;" class="skeleton-bg skeleton-rounded-2xl"></div>
                    </div>
                    <div style="height: 16rem; margin-top: 1.5rem;" class="skeleton-bg skeleton-rounded-2xl"></div>
                </div>`,
            turmas: `
                <div class="skeleton animate-enter">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem;">
                        <div style="height: 2rem; width: 12rem;" class="skeleton-bg skeleton-rounded"></div>
                        <div style="height: 2.5rem; width: 8rem;" class="skeleton-bg skeleton-rounded"></div>
                    </div>
                    <div style="display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
                        <div style="height: 10rem;" class="skeleton-bg skeleton-rounded-2xl"></div>
                        <div style="height: 10rem;" class="skeleton-bg skeleton-rounded-2xl"></div>
                        <div style="height: 10rem;" class="skeleton-bg skeleton-rounded-2xl"></div>
                    </div>
                </div>`
        };

        if (specificSkeletons[viewTarget]) {
            container.innerHTML = specificSkeletons[viewTarget];
            return;
        }

        const tableViews = ['diario', 'dia', 'frequencia', 'horario', 'notas-anuais'];
        if (tableViews.includes(viewTarget)) {
            container.innerHTML = this.getTableSkeleton();
            return;
        }

        container.innerHTML = this.getCardSkeleton();
    },
    initLazyLoading(scope = document) {
        const lazyElements = scope.querySelectorAll('.lazy-content:not(.loaded)');
        if (lazyElements.length === 0) return;
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('loaded');
                    obs.unobserve(entry.target);
                }
            });
        }, { rootMargin: '50px 0px', threshold: 0.1 });
        lazyElements.forEach(el => observer.observe(el));
    },
    async animateViewExit(container) {
        if (!container || !container.firstElementChild) return;
        return new Promise(resolve => {
            container.firstElementChild.classList.add('animate-exit');
            setTimeout(resolve, 180);
        });
    },
    aplicarTema() {
        // 1. Aplica tema Claro/Escuro (data-theme)
        const configTheme = model.state?.userConfig?.theme;
        const localTheme = localStorage.getItem('planner_theme');
        const temaAtual = configTheme || localTheme || 'light';
        document.documentElement.setAttribute('data-theme', temaAtual);
        
        const icon = document.getElementById('theme-toggle-icon');
        if (icon) {
            icon.className = temaAtual === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            icon.parentElement.title = temaAtual === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro';
        }

        // 2. Aplica paleta de cores personalizada dinamicamente nas variáveis CSS
        const themeColor = model.state?.userConfig?.themeColor || localStorage.getItem('planner_theme_color') || '#3b82f6';
        if (themeColor && /^#([0-9A-F]{3}){1,2}$/i.test(themeColor)) {
            let hex = themeColor.replace('#', '');
            if (hex.length === 3) {
                hex = hex.split('').map(c => c + c).join('');
            }
            const num = parseInt(hex, 16);
            const r = (num >> 16) & 255;
            const g = (num >> 8) & 255;
            const b = num & 255;

            // Escurece ~15% para o estado hover
            const rHover = Math.max(0, Math.floor(r * 0.85));
            const gHover = Math.max(0, Math.floor(g * 0.85));
            const bHover = Math.max(0, Math.floor(b * 0.85));
            const hexHover = `#${((1 << 24) + (rHover << 16) + (gHover << 8) + bHover).toString(16).slice(1)}`;

            document.documentElement.style.setProperty('--color-primary', `#${hex}`);
            document.documentElement.style.setProperty('--color-primary-rgb', `${r}, ${g}, ${b}`);
            document.documentElement.style.setProperty('--color-primary-hover', hexHover);
            document.documentElement.style.setProperty('--color-primary-light', `rgba(${r}, ${g}, ${b}, 0.12)`);
        }
    },

    aplicarTemaPreview(hexColor) {
        if (!hexColor || !/^#([0-9A-F]{3}){1,2}$/i.test(hexColor)) return;
        let hex = hexColor.replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        const num = parseInt(hex, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;

        const rHover = Math.max(0, Math.floor(r * 0.85));
        const gHover = Math.max(0, Math.floor(g * 0.85));
        const bHover = Math.max(0, Math.floor(b * 0.85));
        const hexHover = `#${((1 << 24) + (rHover << 16) + (gHover << 8) + bHover).toString(16).slice(1)}`;

        document.documentElement.style.setProperty('--color-primary', `#${hex}`);
        document.documentElement.style.setProperty('--color-primary-rgb', `${r}, ${g}, ${b}`);
        document.documentElement.style.setProperty('--color-primary-hover', hexHover);
        document.documentElement.style.setProperty('--color-primary-light', `rgba(${r}, ${g}, ${b}, 0.12)`);
    },

    toggleTema() {
        const atual = document.documentElement.getAttribute('data-theme') || 'light';
        const novoTema = atual === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', novoTema);
        localStorage.setItem('planner_theme', novoTema);
        
        if (model.state.userConfig) {
            model.state.userConfig = { ...model.state.userConfig, theme: novoTema };
            if (model.salvarEstado) model.salvarEstado();
        }

        const icon = document.getElementById('theme-toggle-icon');
        if (icon) {
            icon.className = novoTema === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            icon.parentElement.title = novoTema === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro';
        }

        Toast.show(`Tema ${novoTema === 'dark' ? 'Escuro' : 'Claro'} ativado.`, 'info');
    },

    toggleZenMode() {
        const isZen = document.body.classList.toggle('zen-presentation-mode');
        let exitBtn = document.querySelector('.zen-exit-btn');
        
        if (isZen) {
            if (!exitBtn) {
                exitBtn = document.createElement('button');
                exitBtn.className = 'zen-exit-btn';
                exitBtn.innerHTML = '<i class="fas fa-compress"></i> Sair do Modo Apresentação';
                exitBtn.onclick = () => uiController.toggleZenMode();
                document.body.appendChild(exitBtn);
            }
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
            Toast.show('Modo Apresentação ativado. Barras administrativas ocultadas.', 'info');
        } else {
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
            Toast.show('Modo Apresentação encerrado.', 'info');
        }
    },

    gerarDossieAluno(turmaId, alunoId) {
        const turmas = model.state.turmas || [];
        const turma = turmas.find(t => String(t.id) === String(turmaId));
        if (!turma) return Toast.show('Turma não encontrada.', 'error');
        
        const estudante = (turma.estudantes || []).find(e => String(e.id) === String(alunoId));
        if (!estudante) return Toast.show('Estudante não encontrado.', 'error');

        // Calcula Frequência
        const freqTurma = (model.state.frequencia || {})[turma.id] || {};
        const totalAulas = Object.keys(freqTurma).length;
        let presencas = 0;
        let faltas = 0;

        Object.values(freqTurma).forEach(dia => {
            if (dia && dia[estudante.id] !== undefined) {
                if (dia[estudante.id] === true || dia[estudante.id] === 'P') presencas++;
                else if (dia[estudante.id] === false || dia[estudante.id] === 'F') faltas++;
            }
        });

        const pctFreq = totalAulas > 0 ? ((presencas / totalAulas) * 100).toFixed(1) : '100.0';
        const isRiscoLDB = Number(pctFreq) < 75;

        // Calcula Notas Bimestrais
        const avaliacoes = (model.state.avaliacoes || []).filter(a => String(a.turmaId) === String(turma.id));
        const mediasBimestrais = { '1º Bimestre': [], '2º Bimestre': [], '3º Bimestre': [], '4º Bimestre': [] };

        avaliacoes.forEach(av => {
            const bim = av.bimestre || '1º Bimestre';
            const nota = av.notas ? av.notas[estudante.id] : null;
            if (nota !== null && nota !== undefined && !isNaN(Number(nota))) {
                if (mediasBimestrais[bim]) mediasBimestrais[bim].push(Number(nota));
            }
        });

        const mediasCalculadas = {};
        let somaTotal = 0;
        let bimestresComNota = 0;

        ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'].forEach(b => {
            const arr = mediasBimestrais[b] || [];
            if (arr.length > 0) {
                const mediaBim = arr.reduce((acc, v) => acc + v, 0) / arr.length;
                mediasCalculadas[b] = mediaBim.toFixed(1);
                somaTotal += mediaBim;
                bimestresComNota++;
            } else {
                mediasCalculadas[b] = '-';
            }
        });

        const mediaAnual = bimestresComNota > 0 ? (somaTotal / bimestresComNota).toFixed(1) : '-';
        const professor = model.state.userConfig?.nome || model.state.userConfig?.name || 'Professor(a)';
        const escola = turma.escola || model.state.userConfig?.escola || 'Escola de Educação Básica';

        // Gráfico SVG de Evolução das Médias
        const barrasSvg = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'].map((b, idx) => {
            const val = mediasCalculadas[b] !== '-' ? Number(mediasCalculadas[b]) : 0;
            const altura = Math.min(100, Math.max(8, val * 10));
            const cor = val >= 6.0 ? '#10b981' : val > 0 ? '#ef4444' : '#cbd5e1';
            const x = 30 + (idx * 60);
            const y = 120 - altura;
            return `
                <rect x="${x}" y="${y}" width="32" height="${altura}" fill="${cor}" rx="4"></rect>
                <text x="${x + 16}" y="${y - 6}" font-size="11" font-weight="bold" fill="var(--text-main)" text-anchor="middle">${mediasCalculadas[b]}</text>
                <text x="${x + 16}" y="136" font-size="10" fill="var(--text-muted)" text-anchor="middle">${b.split(' ')[0]}</text>
            `;
        }).join('');

        const modalHtml = `
            <div class="dossie-modal-container">
                <div class="dossie-header-box">
                    <div>
                        <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--color-primary); margin: 0;">Ficha Individual de Desempenho & Frequência</h2>
                        <p style="font-size: 0.8125rem; color: var(--text-muted); margin: 0.25rem 0 0 0;">Dossiê Pedagógico do Estudante — Ano Letivo 2026</p>
                    </div>
                    <button onclick="window.print()" class="btn-primary btn-print-hide" style="padding: 0.5rem 1rem; font-size: 0.8125rem;">
                        <i class="fas fa-print"></i> Imprimir Ficha
                    </button>
                </div>

                <div class="dossie-student-info">
                    <div class="dossie-info-field">
                        <span class="dossie-info-label">Estudante</span>
                        <span class="dossie-info-val">${window.escapeHTML(estudante.nome)}</span>
                    </div>
                    <div class="dossie-info-field">
                        <span class="dossie-info-label">Turma / Série</span>
                        <span class="dossie-info-val">${window.escapeHTML(turma.nome)} (${window.escapeHTML(turma.serie || 'Ensino Regular')})</span>
                    </div>
                    <div class="dossie-info-field">
                        <span class="dossie-info-label">Instituição</span>
                        <span class="dossie-info-val">${window.escapeHTML(escola)}</span>
                    </div>
                    <div class="dossie-info-field">
                        <span class="dossie-info-label">Docente Responsável</span>
                        <span class="dossie-info-val">${window.escapeHTML(professor)}</span>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <!-- Tabela de Médias -->
                    <div>
                        <h4 style="font-size: 0.875rem; font-weight: 800; margin-bottom: 0.5rem;">Desempenho Acadêmico</h4>
                        <table class="dossie-table">
                            <thead>
                                <tr>
                                    <th>1º Bim</th>
                                    <th>2º Bim</th>
                                    <th>3º Bim</th>
                                    <th>4º Bim</th>
                                    <th>Média Anual</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>${mediasCalculadas['1º Bimestre']}</td>
                                    <td>${mediasCalculadas['2º Bimestre']}</td>
                                    <td>${mediasCalculadas['3º Bimestre']}</td>
                                    <td>${mediasCalculadas['4º Bimestre']}</td>
                                    <td style="color: var(--color-primary); font-size: 1.0625rem; font-weight: 800;">${mediaAnual}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Frequência e Assiduidade -->
                    <div>
                        <h4 style="font-size: 0.875rem; font-weight: 800; margin-bottom: 0.5rem;">Assiduidade (LDB Art. 24)</h4>
                        <div style="display: flex; gap: 0.75rem; background: var(--bg-surface-secondary); padding: 0.75rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
                            <div style="flex: 1; text-align: center;">
                                <div style="font-size: 0.6875rem; font-weight: 700; color: var(--text-muted);">PRESENÇAS</div>
                                <div style="font-size: 1.125rem; font-weight: 800; color: #059669;">${presencas}</div>
                            </div>
                            <div style="flex: 1; text-align: center; border-left: 1px solid var(--border-color); border-right: 1px solid var(--border-color);">
                                <div style="font-size: 0.6875rem; font-weight: 700; color: var(--text-muted);">FALTAS</div>
                                <div style="font-size: 1.125rem; font-weight: 800; color: ${faltas > 5 ? '#dc2626' : 'var(--text-main)'};">${faltas}</div>
                            </div>
                            <div style="flex: 1; text-align: center;">
                                <div style="font-size: 0.6875rem; font-weight: 700; color: var(--text-muted);">FREQUÊNCIA</div>
                                <div style="font-size: 1.125rem; font-weight: 800; color: ${isRiscoLDB ? '#dc2626' : '#059669'};">${pctFreq}%</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Gráfico de Evolução -->
                <div class="dossie-chart-box">
                    <h4 style="font-size: 0.8125rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem;">Evolução das Notas por Bimestre</h4>
                    <svg viewBox="0 0 280 150" style="width: 100%; max-height: 120px;">
                        <line x1="20" y1="120" x2="260" y2="120" stroke="var(--border-color)" stroke-width="1.5"></line>
                        <!-- Linha de Média 6.0 -->
                        <line x1="20" y1="60" x2="260" y2="60" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3 3"></line>
                        <text x="265" y="63" font-size="9" fill="#f59e0b" font-weight="bold">Meta 6.0</text>
                        ${barrasSvg}
                    </svg>
                </div>

                <!-- Parecer Pedagógico -->
                <div>
                    <h4 style="font-size: 0.875rem; font-weight: 800; margin-bottom: 0.375rem;">Parecer Descritivo e Observações do Docente</h4>
                    <div style="border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 0.75rem; min-height: 60px; font-size: 0.8125rem; line-height: 1.5; color: var(--text-main); background: var(--bg-surface);">
                        ${window.escapeHTML(estudante.observacoes || 'Estudante com participação e engajamento registrados nas atividades curriculares.')}
                    </div>
                </div>

                <!-- PEI / AEE - Educação Inclusiva (LDB Art. 59) -->
                <div style="border: 1px solid #c7d2fe; background: #f5f3ff; border-radius: var(--radius-lg); padding: 0.75rem;">
                    <h4 style="font-size: 0.8125rem; font-weight: 800; color: #5b21b6; margin: 0 0 0.35rem 0; display: flex; align-items: center; gap: 0.35rem;">
                        <i class="fas fa-universal-access"></i> Plano Educacional Individualizado (PEI / AEE - Educação Inclusiva)
                    </h4>
                    <p style="font-size: 0.75rem; color: #4c1d95; margin: 0;">
                        <strong>Laudo / Diagnóstico / CID:</strong> ${window.escapeHTML(estudante.pei?.laudo || 'Acompanhamento Pedagógico Regular / AEE')}
                    </p>
                    <p style="font-size: 0.75rem; color: #4c1d95; margin: 0.25rem 0 0 0;">
                        <strong>Adaptações Curriculares & Recursos:</strong> ${window.escapeHTML(estudante.pei?.adaptacao || 'Tempo estendido em avaliações, recursos visuais e apoio individualizado.')}
                    </p>
                </div>

                <div class="dossie-signatures-grid">
                    <div class="dossie-signature-line">
                        Assinatura do(a) Professor(a)
                    </div>
                    <div class="dossie-signature-line">
                        Coordenação Pedagógica
                    </div>
                    <div class="dossie-signature-line">
                        Responsável pelo Estudante
                    </div>
                </div>
            </div>
        `;

        this.openModal('Dossiê do Estudante', modalHtml, 'large');
    },

    setupCustomDropdown(dropdownId, onChangeCallback) {
        const container = document.getElementById(dropdownId);
        if (!container) return;
        this.initAllDropdowns(container);
        if (onChangeCallback) {
            const inputHidden = container.querySelector('input[type="hidden"]');
            if (inputHidden) {
                inputHidden.addEventListener('change', (e) => onChangeCallback(e.target.value));
            }
        }
    },
    _globalClickListenerAtivo: false,
    iniciarObservadorDropdowns() {
        if (!this._globalClickListenerAtivo) {
            document.addEventListener('click', (e) => {
                const targetDropdown = e.target.closest('.custom-dropdown');
                document.querySelectorAll('.custom-dropdown').forEach(d => {
                    if (d !== targetDropdown) {
                        const m = d.querySelector('.dropdown-menu');
                        const b = d.querySelector('.dropdown-button');
                        if (m) m.classList.add('hidden');
                        if (b) b.classList.remove('dropdown-button--active');
                    }
                });
            });
            this._globalClickListenerAtivo = true;
        }

        if (this._observerAtivo) return;
        const observer = new MutationObserver((mutations) => {
            let temNovoElemento = false;
            for (let mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    temNovoElemento = true;
                    break;
                }
            }
            if (temNovoElemento) {
                this.initAllDropdowns();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        this._observerAtivo = true;
    },
    initAllDropdowns(scope = document) {
        const containers = scope.querySelectorAll ? scope.querySelectorAll('.custom-dropdown') : [];
        containers.forEach(container => {
            if (container.dataset.initialized === 'true') return;
            container.dataset.initialized = 'true';
            container.classList.add('dropdown-initialized');

            const button = container.querySelector('.dropdown-button');
            const menu = container.querySelector('.dropdown-menu');
            const inputHidden = container.querySelector('input[type="hidden"]');
            let labelElement = container.querySelector('.dropdown-label');
            if (!button || !menu) return;
            if (!labelElement) {
                labelElement = button.querySelector('span') || button;
            }

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (button.disabled || button.classList.contains('opacity-60')) return;
                document.querySelectorAll('.dropdown-menu').forEach(m => {
                    if (m !== menu) m.classList.add('hidden');
                });
                document.querySelectorAll('.dropdown-button').forEach(b => {
                    if (b !== button) b.classList.remove('dropdown-button--active');
                });
                menu.classList.toggle('hidden');
                button.classList.toggle('dropdown-button--active');
            });

            menu.addEventListener('click', (e) => {
                const item = e.target.closest('.dropdown-item');
                if (!item) return;
                e.stopPropagation();
                const value = item.dataset.value;
                const text = item.innerText.trim();

                if (labelElement) {
                    labelElement.innerText = text;
                }

                menu.classList.add('hidden');
                button.classList.remove('dropdown-button--active');
                menu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('dropdown-item--selected'));
                item.classList.add('dropdown-item--selected');

                if (inputHidden) {
                    inputHidden.value = value !== undefined ? value : text;
                    
                    // Executa callback de forma assíncrona para permitir encerramento do clique
                    setTimeout(() => {
                        // 1. Executa onchange atribuído programaticamente se existir
                        if (typeof inputHidden.onchange === 'function') {
                            try {
                                inputHidden.onchange.call(inputHidden, { target: inputHidden });
                            } catch (err) {
                                console.error("Erro no handler onchange do dropdown:", err);
                            }
                        }

                        // 2. Dispara eventos padrão DOM nativos de forma segura
                        inputHidden.dispatchEvent(new Event('change', { bubbles: true }));
                        inputHidden.dispatchEvent(new Event('input', { bubbles: true }));
                    }, 0);
                }
            });
        });
    },

    async abrirCentroSincronizacao() {
        const isOnline = navigator.onLine;
        const filaDetalhada = window.syncService ? await window.syncService.obterDetalhesFilaOffline() : [];
        const usuario = model.currentUser?.email || 'Professor(a) Conectado(a)';
        const pendentesCount = filaDetalhada.length;

        const htmlFila = pendentesCount > 0 ? filaDetalhada.map(item => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border: 1px solid var(--color-slate-200); border-radius: var(--radius-lg); background-color: var(--color-white); box-shadow: var(--shadow-sm);">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 2rem; height: 2rem; border-radius: 50%; background-color: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 0.8125rem;">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div>
                        <strong style="font-size: 0.8125rem; color: var(--color-slate-800); display: block;">${window.escapeHTML(item.label)}</strong>
                        <span style="font-size: 0.75rem; color: var(--color-slate-500);">${window.escapeHTML(item.detalhe)}</span>
                    </div>
                </div>
                <span style="font-size: 0.6875rem; font-weight: 700; color: var(--color-slate-400); background-color: var(--color-slate-100); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm);">
                    ${item.dataHora}
                </span>
            </div>
        `).join('') : `
            <div style="text-align: center; padding: 2rem 1rem; background-color: var(--color-slate-50); border-radius: var(--radius-xl); border: 1px dashed var(--color-slate-200);">
                <div style="width: 3rem; height: 3rem; border-radius: 50%; background-color: #dcfce7; color: #15803d; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; margin: 0 auto 0.75rem;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h4 style="font-size: 0.9375rem; font-weight: 800; color: var(--color-slate-800); margin: 0 0 0.25rem 0;">Tudo 100% Sincronizado!</h4>
                <p style="font-size: 0.8125rem; color: var(--color-slate-500); margin: 0;">Nenhuma alteração pendente na fila local do IndexedDB.</p>
            </div>
        `;

        this.openModal(`Centro de Transparência de Sincronização`, `
            <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; max-width: 600px;">
                
                <!-- STATUS DA NUVEM BANNER -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-radius: var(--radius-xl); background: ${isOnline ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #475569, #334155)'}; color: white; box-shadow: var(--shadow-md);">
                    <div>
                        <span style="font-size: 0.6875rem; font-weight: 800; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.05em;">Status da Rede & PWA</span>
                        <h3 style="font-size: 1.25rem; font-weight: 900; color: white; margin: 0.125rem 0 0 0; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas ${isOnline ? 'fa-wifi' : 'fa-plane'}"></i>
                            ${isOnline ? 'Conexão Ativa com a Nuvem' : 'Modo Offline Ativo'}
                        </h3>
                        <p style="font-size: 0.75rem; color: rgba(255,255,255,0.85); margin-top: 0.25rem;">
                            ${usuario}
                        </p>
                    </div>
                    <div style="text-align: right; background: rgba(255,255,255,0.15); padding: 0.5rem 1rem; border-radius: var(--radius-lg); border: 1px solid rgba(255,255,255,0.25);">
                        <span style="font-size: 0.625rem; font-weight: 800; text-transform: uppercase; display: block;">Fila Offline</span>
                        <strong style="font-size: 1.25rem;">${pendentesCount} ${pendentesCount === 1 ? 'item' : 'itens'}</strong>
                    </div>
                </div>

                <!-- FILA DE ALTERAÇÕES LOCAL (INDEXEDDB) -->
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <label class="form-label" style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; margin: 0;">
                            <i class="fas fa-database text-primary mr-1"></i> Fila de Operações Locais (IndexedDB)
                        </label>
                        <span style="font-size: 0.6875rem; color: var(--color-slate-400);">Garantia anti-perda offline</span>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 220px; overflow-y: auto;" class="custom-scrollbar">
                        ${htmlFila}
                    </div>
                </div>

                <!-- AÇÕES -->
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--color-slate-100);">
                    <button type="button" data-action="export-backup" class="btn-secondary" style="font-size: 0.8125rem;">
                        <i class="fas fa-download mr-1"></i> Fazer Backup JSON
                    </button>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" data-action="close-modal" class="btn-secondary">Fechar</button>
                        <button type="button" data-action="executar-forcar-sync" class="btn-primary" style="font-size: 0.8125rem;">
                            <i class="fas fa-sync-alt mr-1"></i> Forçar Sincronização
                        </button>
                    </div>
                </div>
            </div>
        `, 'medium');
    },

    async executarForcarSincronizacao() {
        if (window.syncService && window.syncService.forcarSincronizacao) {
            await window.syncService.forcarSincronizacao();
            this.abrirCentroSincronizacao();
        }
    },

    renderLoading(container, mensagem = 'Carregando...') {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        const msgEscaped = window.escapeHTML(mensagem);
        container.innerHTML = `
            <div class="comunidade-empty fade-in" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1rem;">
                <i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--color-primary);"></i>
                <p style="color: var(--color-slate-500); margin-top: var(--spacing-4); font-size: 0.875rem; font-weight: 700;">${msgEscaped}</p>
            </div>
        `;
    },

    renderEmptyState(container, { icone = 'fa-search', titulo = 'Nenhum resultado encontrado', mensagem = 'Tente ajustar os filtros de busca.', acaoTexto = '', acaoDataAction = '' } = {}) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        const iconEscaped = window.escapeHTML(icone);
        const titEscaped = window.escapeHTML(titulo);
        const msgEscaped = window.escapeHTML(mensagem);
        const acaoTxtEscaped = window.escapeHTML(acaoTexto);
        const acaoActionEscaped = window.escapeHTML(acaoDataAction);

        container.innerHTML = `
            <div class="card fade-in" style="padding: 3rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 2px dashed var(--color-slate-200); width: 100%; box-sizing: border-box;">
                <div style="width: 3.5rem; height: 3.5rem; border-radius: var(--radius-full); background-color: var(--color-slate-100); color: var(--color-slate-400); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 1rem;">
                    <i class="fas ${iconEscaped}"></i>
                </div>
                <h4 style="font-size: 1rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.25rem;">${titEscaped}</h4>
                <p style="font-size: 0.875rem; color: var(--color-slate-500); max-width: 380px;">${msgEscaped}</p>
                ${acaoTexto ? `
                    <button type="button" data-action="${acaoActionEscaped}" class="btn-primary" style="margin-top: 1rem;">
                        <span>${acaoTxtEscaped}</span>
                    </button>
                ` : ''}
            </div>
        `;
    }
};

if (typeof window !== 'undefined') {
    window.uiController = uiController;
}