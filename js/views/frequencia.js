/**
 * @file frequencia.js
 * @description View responsável pelo controle de frequência (chamada), incluindo modo tabela e modo "Swipe" rápido.
 * @module views/frequenciaView
 */

import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';

/**
 * View de Frequência.
 * @namespace frequenciaView
 */
export const frequenciaView = {
    currentTurmaId: null,
    currentDate: new Date(),

    // Estado do Modo Chamada Rápida (Swipe)
    chamadaAtiva: false,
    alunoIndex: 0,
    startX: 0,

    /**
     * Renderiza a interface de frequência.
     * @param {HTMLElement|string} container 
     */
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const turmas = model.state.turmas || [];

        // Seleção automática da primeira turma válida
        if (!this.currentTurmaId && turmas.length > 0) {
            this.currentTurmaId = turmas[0].id;
        } else if (this.currentTurmaId && !turmas.find(t => String(t.id) === String(this.currentTurmaId))) {
            this.currentTurmaId = turmas.length > 0 ? turmas[0].id : null;
        }

        const turmaSelecionada = turmas.find(t => String(t.id) === String(this.currentTurmaId));
        const ano = this.currentDate.getFullYear();
        const mes = this.currentDate.getMonth();
        const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(this.currentDate);
        const diasNoMes = new Date(ano, mes + 1, 0).getDate();

        const diaSelecionadoStr = this.currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        const html = `
            <div class="fade-in pb-24 h-full flex flex-col">
                <div class="hidden print:block text-center mb-4">
                    <h1 class="text-2xl font-bold">Frequência - ${nomeMes} / ${ano}</h1>
                    <p class="text-sm">Turma: ${turmaSelecionada ? window.escapeHTML(turmaSelecionada.nome) : 'N/A'}</p>
                </div>
                
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-4 flex flex-col md:flex-row gap-4 items-center justify-between shrink-0 no-print">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Frequência</h2>
                        <p class="text-xs text-slate-500">Controle de chamadas e presença.</p>
                    </div>
                    
                    <div class="flex flex-wrap gap-3 items-center justify-center">
                        <button onclick="frequenciaView.iniciarChamada()" 
                                class="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-emerald-700 transition flex items-center gap-2 shadow-lg shadow-emerald-100 active:scale-95">
                            <i class="fas fa-hand-pointer"></i> Iniciar Chamada (${diaSelecionadoStr})
                        </button>

                        <div class="relative">
                            <i class="fas fa-users absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <select onchange="frequenciaView.mudarTurma(this.value)" 
                                    class="bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl pl-10 pr-8 py-2 outline-none focus:border-primary cursor-pointer min-w-[200px]">
                                ${turmas.map(t => `<option value="${t.id}" ${String(t.id) === String(this.currentTurmaId) ? 'selected' : ''}>${window.escapeHTML(t.nome)}</option>`).join('')}
                                ${turmas.length === 0 ? '<option>Nenhuma turma</option>' : ''}
                            </select>
                        </div>
                        
                        <div class="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1">
                            <button onclick="frequenciaView.mudarMes(-1)" class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-white rounded-lg transition-all">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <span class="w-32 text-center text-sm font-bold text-slate-700 capitalize select-none">
                                ${nomeMes} / ${ano}
                            </span>
                            <button onclick="frequenciaView.mudarMes(1)" class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-white rounded-lg transition-all">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                ${turmaSelecionada ? this.renderTabela(turmaSelecionada, ano, mes, diasNoMes) : this.estadoVazio()}
            </div>

            <div id="chamada-rapida-overlay" class="fixed inset-0 bg-slate-900/95 z-[9999] hidden flex flex-col items-center justify-center backdrop-blur-sm p-4 transition-opacity duration-300">
                <div class="w-full max-w-md flex flex-col items-center justify-center h-full max-h-[90vh]">
                    
                    <div id="chamada-card-container" class="w-full flex-1 relative flex items-center justify-center min-h-0">
                        </div>

                    <button onclick="frequenciaView.finalizarChamada()" class="mt-6 text-white/50 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors py-4 px-8 border border-white/10 rounded-full hover:bg-white/10 shrink-0">
                        <i class="fas fa-times mr-1"></i> Cancelar Chamada
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.autoScrollParaHoje(ano, mes);
    },

    autoScrollParaHoje(ano, mes) {
        setTimeout(() => {
            const hoje = new Date();
            const isMesAtual = hoje.getMonth() === mes && hoje.getFullYear() === ano;
            if (!isMesAtual) return;

            const elHoje = document.getElementById('dia-hoje');
            const scrollContainer = document.getElementById('scroll-frequencia');

            if (elHoje && scrollContainer) {
                const scrollPos = elHoje.offsetLeft - (scrollContainer.clientWidth / 2) + (elHoje.clientWidth / 2);
                scrollContainer.scrollTo({ left: scrollPos, behavior: 'smooth' });
            }
        }, 300);
    },

    // --- Lógica da Chamada Swipe ---

    iniciarChamada() {
        const turmas = model.state.turmas || [];
        const turma = turmas.find(t => String(t.id) === String(this.currentTurmaId));

        if (!turma || !turma.alunos || turma.alunos.length === 0) {
            return Toast.show("Não há alunos para realizar a chamada.", "warning");
        }

        this.chamadaAtiva = true;
        this.alunoIndex = 0;
        const overlay = document.getElementById('chamada-rapida-overlay');
        if (overlay) overlay.classList.remove('hidden');
        this.renderProximoAluno();
    },

    renderProximoAluno() {
        const turmas = model.state.turmas || [];
        const turma = turmas.find(t => String(t.id) === String(this.currentTurmaId));
        const container = document.getElementById('chamada-card-container');

        if (this.alunoIndex >= turma.alunos.length) {
            this.finalizarChamada();
            return;
        }

        const aluno = turma.alunos[this.alunoIndex];

        // ALTERAÇÃO: Removido o botão de cancelar de dentro do card
        // O card agora usa max-h-full e aspect-ratio ajustável para caber na tela
        container.innerHTML = `
            <div id="chamada-card" class="w-full max-h-full aspect-[3/4] bg-white rounded-[2rem] shadow-2xl flex flex-col items-center justify-center p-4 md:p-8 text-center touch-none select-none transition-transform duration-300 transform cursor-grab active:cursor-grabbing relative overflow-hidden">
                
                <div class="flex-1 flex flex-col items-center justify-center pointer-events-none w-full">
                    <div class="w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-100 flex items-center justify-center text-3xl md:text-4xl font-black text-primary border-4 border-slate-50 mb-4 shadow-inner shrink-0">
                        ${aluno.nome.charAt(0)}
                    </div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aluno ${this.alunoIndex + 1} de ${turma.alunos.length}</p>
                    <h3 class="text-xl md:text-2xl font-bold text-slate-800 line-clamp-2 px-2">${window.escapeHTML(aluno.nome)}</h3>
                </div>
                
                <div class="flex gap-2 md:gap-4 w-full mt-auto pt-4 pointer-events-none shrink-0">
                    <div class="flex-1 border-2 border-dashed border-red-100 rounded-2xl p-3 bg-red-50/30">
                        <i class="fas fa-arrow-left text-red-300 mb-1 text-lg"></i>
                        <p class="text-[9px] font-bold text-red-400 uppercase">Falta</p>
                    </div>
                    <div class="flex-1 border-2 border-dashed border-emerald-100 rounded-2xl p-3 bg-emerald-50/30">
                        <i class="fas fa-arrow-right text-emerald-300 mb-1 text-lg"></i>
                        <p class="text-[9px] font-bold text-emerald-400 uppercase">Presença</p>
                    </div>
                </div>
            </div>
        `;

        this.vincularEventosSwipe(aluno.id);
    },

    vincularEventosSwipe(alunoId) {
        const card = document.getElementById('chamada-card');
        const overlay = document.getElementById('chamada-rapida-overlay');
        if (!card) return;

        let isDragging = false;

        const handleStart = (e) => {
            isDragging = true;
            this.startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
            card.style.transition = 'none';
        };

        const handleMove = (e) => {
            if (!isDragging || !this.startX) return;

            const currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const diffX = currentX - this.startX;
            const rotation = diffX / 20;

            card.style.transform = `translateX(${diffX}px) rotate(${rotation}deg)`;

            if (diffX > 60) overlay.style.backgroundColor = 'rgba(16, 185, 129, 0.8)';
            else if (diffX < -60) overlay.style.backgroundColor = 'rgba(239, 68, 68, 0.8)';
            else overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
        };

        const handleEnd = (e) => {
            if (!isDragging) return;
            isDragging = false;

            const clientX = e.type === 'touchend' ? e.changedTouches[0].clientX : e.clientX;
            const diffX = clientX - this.startX;
            this.startX = 0;

            if (diffX > 100) {
                this.registrarFrequenciaSwipe(alunoId, 'P');
            } else if (diffX < -100) {
                this.registrarFrequenciaSwipe(alunoId, 'F');
            } else {
                card.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                card.style.transform = '';
                overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
            }
        };

        card.addEventListener('touchstart', handleStart, { passive: true });
        card.addEventListener('touchmove', handleMove, { passive: true });
        card.addEventListener('touchend', handleEnd);

        card.addEventListener('mousedown', handleStart);

        const mouseMoveHandler = (e) => handleMove(e);
        const mouseUpHandler = (e) => {
            handleEnd(e);
            window.removeEventListener('mousemove', mouseMoveHandler);
            window.removeEventListener('mouseup', mouseUpHandler);
        };

        card.addEventListener('mousedown', () => {
            window.addEventListener('mousemove', mouseMoveHandler);
            window.addEventListener('mouseup', mouseUpHandler);
        });
    },

    registrarFrequenciaSwipe(alunoId, status) {
        const card = document.getElementById('chamada-card');
        const overlay = document.getElementById('chamada-rapida-overlay');

        if (!card) return;

        const ano = this.currentDate.getFullYear();
        const mesFmt = (this.currentDate.getMonth() + 1).toString().padStart(2, '0');
        const diaFmt = this.currentDate.getDate().toString().padStart(2, '0');
        const dataIso = `${ano}-${mesFmt}-${diaFmt}`;

        if (model.registrarFrequencia) {
            model.registrarFrequencia(this.currentTurmaId, alunoId, dataIso, status);
        } else {
            // Compatibilidade
            model.setFrequencia(this.currentTurmaId, alunoId, dataIso, status);
        }

        card.style.transition = 'all 0.4s ease-in';
        card.style.transform = `translateX(${status === 'P' ? '1000' : '-1000'}px) rotate(${status === 'P' ? '45' : '-45'}deg)`;
        card.style.opacity = '0';

        setTimeout(() => {
            this.alunoIndex++;
            if (overlay) overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
            this.renderProximoAluno();
        }, 300);
    },

    finalizarChamada() {
        this.chamadaAtiva = false;
        const overlay = document.getElementById('chamada-rapida-overlay');
        if (overlay) overlay.classList.add('hidden');

        model.saveLocal();

        this.render('view-container');
        Toast.show("Chamada finalizada e salva!", "success");
    },

    renderTabela(turma, ano, mes, diasNoMes) {
        let headerDias = '';
        const hoje = new Date();
        
        for (let d = 1; d <= diasNoMes; d++) {
            const dataObj = new Date(ano, mes, d);
            const diaSemana = dataObj.getDay();
            const isFimDeSemana = diaSemana === 0 || diaSemana === 6;
            const letraSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][diaSemana];
            const isHoje = hoje.getDate() === d && hoje.getMonth() === mes && hoje.getFullYear() === ano;
            
            headerDias += `
                <div ${isHoje ? 'id="dia-hoje"' : ''} 
                     class="flex flex-col items-center justify-center min-w-[40px] h-14 border-r border-slate-100 
                     ${isFimDeSemana ? 'bg-slate-50/50' : ''} 
                     ${isHoje ? 'bg-blue-100 text-primary border-blue-200' : ''}">
                    <span class="text-[10px] font-bold text-slate-400">${letraSemana}</span>
                    <span class="text-sm font-bold ${isHoje ? 'text-primary' : 'text-slate-700'}">${d}</span>
                </div>
            `;
        }

        // --- MELHORIA APLICADA: Ordenação Alfabética ---
        const alunosOrdenados = [...turma.alunos].sort((a, b) => {
            return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
        });

        const linhasAlunos = alunosOrdenados.map(aluno => {
            let colunas = '';
            for (let d = 1; d <= diasNoMes; d++) {
                const mesFmt = (mes + 1).toString().padStart(2, '0');
                const diaFmt = d.toString().padStart(2, '0');
                const dataIso = `${ano}-${mesFmt}-${diaFmt}`;
                
                const status = (aluno.frequencia || {})[dataIso];
                const dataObj = new Date(ano, mes, d);
                const isFimDeSemana = dataObj.getDay() === 0 || dataObj.getDay() === 6;
                const isHoje = hoje.getDate() === d && hoje.getMonth() === mes && hoje.getFullYear() === ano;
                
                let cellBg = '';
                if (isHoje) cellBg = 'bg-blue-50/40';
                else if (isFimDeSemana) cellBg = 'bg-slate-50/30';
                
                colunas += `
                    <div onclick="frequenciaView.toggleStatus('${turma.id}', '${aluno.id}', '${dataIso}', this)"
                         class="min-w-[40px] h-12 border-r border-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors ${cellBg}"
                         title="${window.escapeHTML(aluno.nome)} - ${d}/${mes + 1}">
                         ${this.getIconeStatus(status)}
                    </div>
                `;
            }
            return `
                <div class="flex items-center border-b border-slate-100 hover:bg-slate-50/50 transition-colors bg-white">
                    <div class="w-64 shrink-0 p-3 border-r border-slate-200 sticky left-0 bg-white z-10 flex items-center gap-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold border border-slate-200">
                            ${aluno.nome.charAt(0)}
                        </div>
                        <span class="text-sm font-medium text-slate-700 truncate">${window.escapeHTML(aluno.nome)}</span>
                    </div>
                    ${colunas}
                </div>
            `;
        }).join('');

        if (turma.alunos.length === 0) {
            return `
                <div class="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200 py-10">
                    <i class="fas fa-user-slash text-4xl mb-3"></i>
                    <p>Nenhum aluno nesta turma.</p>
                </div>`;
        }

        return `
            <div class="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
                <div class="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
                    <div class="w-64 shrink-0 p-3 border-r border-slate-200 sticky left-0 bg-slate-50 z-30 flex items-end shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Aluno</span>
                    </div>
                    <div id="header-dias" class="flex overflow-hidden flex-1">
                        ${headerDias}
                    </div>
                </div>
                <div id="scroll-frequencia" 
                     onscroll="document.getElementById('header-dias').scrollLeft = this.scrollLeft"
                     class="overflow-auto custom-scrollbar flex-1 relative">
                    <div class="min-w-fit">
                        ${linhasAlunos}
                    </div>
                </div>
                <div class="p-3 bg-slate-50 border-t border-slate-200 flex gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-wide justify-end no-print">
                    <div class="flex items-center gap-1"><div class="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300"></div> Presente</div>
                    <div class="flex items-center gap-1"><div class="w-3 h-3 rounded-full bg-red-100 border border-red-300"></div> Falta</div>
                    <div class="flex items-center gap-1"><div class="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300"></div> Justificada</div>
                </div>
            </div>
        `;
    },

    getIconeStatus(status) {
        if (status === null || status === undefined || status === '') {
            return `<span class="w-2 h-2 rounded-full bg-slate-200 opacity-50"></span>`;
        }
        if (status === 'P') return `<i class="fas fa-check text-emerald-500 text-lg"></i>`;
        if (status === 'F') return `<i class="fas fa-times text-red-500 text-lg"></i>`;
        if (status === 'J') return `<span class="text-xs font-black text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded border border-yellow-200">J</span>`;

        return `<span class="w-2 h-2 rounded-full bg-slate-200 opacity-50"></span>`;
    },

    toggleStatus(turmaId, alunoId, dataIso, element) {
        const novoStatus = model.toggleFrequencia(turmaId, alunoId, dataIso);

        element.innerHTML = this.getIconeStatus(novoStatus);

        element.classList.add('scale-125');
        setTimeout(() => element.classList.remove('scale-125'), 150);
    },

    mudarTurma(id) {
        this.currentTurmaId = id;
        this.render('view-container');
    },

    mudarMes(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.render('view-container');
    },

    estadoVazio() {
        return `
            <div class="flex flex-col items-center justify-center p-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center flex-1">
                <i class="fas fa-users text-4xl text-slate-300 mb-4"></i>
                <h3 class="text-xl font-bold text-slate-700 mb-2">Sem turmas</h3>
                <p class="text-slate-500 text-sm mb-6">Cadastre turmas para realizar a chamada.</p>
                <button onclick="controller.navigate('turmas')" class="btn-primary px-6 py-2 rounded-xl font-bold shadow-lg shadow-primary/20">
                    Ir para Turmas
                </button>
            </div>
        `;
    }
};