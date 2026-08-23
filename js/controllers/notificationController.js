/**
 * Controlador da Central de Notificações & Alertas Pedagógicos Proativos
 * Monitora em tempo real riscos de infrequência (LDB), diários pendentes e pendências avaliativas.
 */
import { model } from '../model.js';
import { controller } from '../controller.js';

export const notificationController = {
    isOpen: false,

    init() {
        if (typeof window === 'undefined') return;
        window.notificationController = this;
        this.atualizarNotificacoes();

        // Recalcula periodicamente ou quando o modelo é alterado
        setInterval(() => this.atualizarNotificacoes(), 60000);
    },

    calcularAlertas() {
        const alertas = [];
        const turmas = model.state.turmas || [];
        const frequencia = model.state.frequencia || {};
        const planosDiarios = model.state.planosDiarios || {};

        // 1. Monitoramento de Infrequência (LDB Art. 24 - 25% de faltas)
        let totalAlunosRisco = 0;
        turmas.forEach(t => {
            const estudantes = t.estudantes || [];
            const freqTurma = frequencia[t.id] || {};
            const totalAulasTurma = Object.keys(freqTurma).length;

            if (totalAulasTurma >= 3) {
                estudantes.forEach(est => {
                    let faltas = 0;
                    Object.values(freqTurma).forEach(registroDia => {
                        if (registroDia && (registroDia[est.id] === false || registroDia[est.id] === 'F')) {
                            faltas++;
                        }
                    });

                    const pctFaltas = (faltas / totalAulasTurma) * 100;
                    if (pctFaltas >= 20) {
                        totalAlunosRisco++;
                        if (alertas.length < 5) {
                            alertas.push({
                                tipo: pctFaltas >= 25 ? 'danger' : 'warning',
                                icone: 'fas fa-user-times',
                                titulo: `${est.nome || 'Estudante'} (${t.nome})`,
                                descricao: `${pctFaltas.toFixed(0)}% de faltas acumuladas (${faltas}/${totalAulasTurma} aulas).`,
                                rota: 'frequencia'
                            });
                        }
                    }
                });
            }
        });

        // 2. Diários Pendentes nos Últimos 7 Dias Letivos
        const hoje = new Date();
        for (let i = 1; i <= 5; i++) {
            const d = new Date();
            d.setDate(hoje.getDate() - i);
            const diaSemana = d.getDay();
            // Ignora sábado (6) e domingo (0)
            if (diaSemana !== 0 && diaSemana !== 6) {
                const dataIso = d.toISOString().split('T')[0];
                const planosDoDia = planosDiarios[dataIso] || {};
                const turmasSemPlano = turmas.filter(t => !planosDoDia[t.id]);

                if (turmas.length > 0 && turmasSemPlano.length === turmas.length) {
                    const dataFormatada = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    alertas.push({
                        tipo: 'warning',
                        icone: 'fas fa-book-reader',
                        titulo: `Diário Pendente (${dataFormatada})`,
                        descricao: `Nenhum planejamento registrado para suas turmas nesta data.`,
                        rota: 'dia'
                    });
                    break;
                }
            }
        }

        // 3. Matriz de Notas / Recuperação
        alertas.push({
            tipo: 'info',
            icone: 'fas fa-award',
            titulo: 'Conselho & Recuperação IA',
            descricao: 'Gere pareceres descritivos e roteiros de recuperação para alunos em risco.',
            rota: 'notas-anuais'
        });

        return alertas;
    },

    atualizarNotificacoes() {
        const alertas = this.calcularAlertas();
        const badge = document.getElementById('notification-badge');
        if (badge) {
            const count = alertas.length;
            if (count > 0) {
                badge.textContent = count > 9 ? '9+' : String(count);
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    },

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    open() {
        this.isOpen = true;
        const popover = document.getElementById('notification-popover');
        if (!popover) return;

        const alertas = this.calcularAlertas();
        let itensHtml = '';

        if (alertas.length === 0) {
            itensHtml = `
                <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.8125rem;">
                    <i class="fas fa-check-circle" style="color: var(--color-emerald-600); font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
                    <p style="font-weight: 700; margin-bottom: 0.25rem;">Tudo em dia!</p>
                    <p>Nenhuma pendência ou alerta crítico no momento.</p>
                </div>
            `;
        } else {
            alertas.forEach(al => {
                itensHtml += `
                    <div class="notification-item notification-item--${al.tipo}" onclick="notificationController.navegarPara('${al.rota}')">
                        <div class="notification-icon">
                            <i class="${al.icone}"></i>
                        </div>
                        <div class="notification-text">
                            <div class="notification-text-title">${window.escapeHTML ? window.escapeHTML(al.titulo) : al.titulo}</div>
                            <div class="notification-text-desc">${window.escapeHTML ? window.escapeHTML(al.descricao) : al.descricao}</div>
                        </div>
                    </div>
                `;
            });
        }

        popover.innerHTML = `
            <div class="notification-header">
                <h4><i class="far fa-bell" style="color: var(--color-primary); margin-right: 0.375rem;"></i> Alertas Pedagógicos</h4>
                <button onclick="notificationController.close()" class="btn-icon" style="width: 1.5rem; height: 1.5rem;" title="Fechar">
                    <i class="fas fa-times" style="font-size: 0.75rem;"></i>
                </button>
            </div>
            <div class="notification-list custom-scrollbar">
                ${itensHtml}
            </div>
            <div style="padding: 0.5rem 0.75rem; background: var(--bg-surface-secondary); border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; font-size: 0.6875rem; color: var(--text-muted);">
                <span>Monitoramento LDB Art. 24</span>
                <a href="#frequencia" onclick="notificationController.navegarPara('frequencia')" style="color: var(--color-primary); font-weight: 700; text-decoration: none;">Ver Todas</a>
            </div>
        `;

        popover.style.display = 'flex';

        // Fecha ao clicar fora
        setTimeout(() => {
            const fecharCliqueFora = (e) => {
                if (!popover.contains(e.target) && !e.target.closest('#notification-bell-btn')) {
                    this.close();
                    document.removeEventListener('click', fecharCliqueFora);
                }
            };
            document.addEventListener('click', fecharCliqueFora);
        }, 10);
    },

    close() {
        this.isOpen = false;
        const popover = document.getElementById('notification-popover');
        if (popover) {
            popover.style.display = 'none';
            popover.innerHTML = '';
        }
    },

    navegarPara(rota) {
        this.close();
        if (rota) {
            controller.navigate(rota);
        }
    },

    /**
     * Solicita permissão para emissão de Web Notifications nativas do sistema operacional.
     */
    async solicitarPermissaoWebNotifications() {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                const result = await Notification.requestPermission();
                return result === 'granted';
            }
            return Notification.permission === 'granted';
        }
        return false;
    },

    /**
     * Dispara uma notificação nativa do sistema via Web Notification API.
     * @param {string} titulo 
     * @param {string} corpo 
     */
    dispararNotificacaoWeb(titulo, corpo) {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(titulo, {
                    body: corpo,
                    icon: './assets/icons/icon-192.png'
                });
            } catch (err) {
                console.warn("[notificationController] Não foi possível disparar notificação Web nativa:", err);
            }
        }
    }
};
