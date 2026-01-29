/**
 * @file sala.js
 * @description View responsável pelo Mapa de Sala (Mapeamento de assentos dos alunos).
 * @module views/salaView
 */

import { model } from '../model.js';
import { controller } from '../controller.js';
import { firebaseService } from '../firebase-service.js';

/**
 * View do Mapa de Sala.
 * @namespace salaView
 */
export const salaView = {
    alunoSelecionadoParaMover: null,
    currentTurmaId: null,

    /**
     * Renderiza o layout principal do mapa de sala.
     * @param {HTMLElement|string} container 
     */
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const turmas = (model.state && model.state.turmas) ? model.state.turmas : [];
        
        // Validação da Turma Ativa
        if (this.currentTurmaId && !turmas.find(t => String(t.id) === String(this.currentTurmaId))) {
            this.currentTurmaId = null;
        }
        if (!this.currentTurmaId && turmas.length > 0) {
            this.currentTurmaId = turmas[0].id;
        }

        const html = `
            <div class="fade-in pb-20">
                <div class="flex flex-wrap justify-between items-center mb-8 gap-4 no-print">
                    <div>
                        <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Mapa de Sala</h2>
                        <p class="text-slate-500">Arraste ou clique para organizar a sala.</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 no-print">
                    <select id="map-select-turma" onchange="salaView.carregarMapa(this.value)" 
                            class="md:col-span-3 border border-slate-200 p-4 rounded-xl bg-white focus:border-primary outline-none font-medium transition-all shadow-sm cursor-pointer">
                        ${turmas.length > 0
                            ? turmas.map(t => `<option value="${t.id}" ${String(t.id) === String(this.currentTurmaId) ? 'selected' : ''}>${window.escapeHTML(t.nome)}</option>`).join('')
                            : '<option value="">Nenhuma turma cadastrada</option>'
                        }
                    </select>
                    <button onclick="window.print()" class="bg-slate-800 text-white rounded-xl font-bold hover:bg-black transition flex items-center justify-center gap-2 shadow-md">
                        <i class="fas fa-print"></i> Imprimir
                    </button>
                </div>
                <div id="mapa-container" class="bg-slate-100 p-8 md:p-12 rounded-[2rem] relative min-h-[600px] border-4 border-slate-200 shadow-inner print:border-none print:bg-white print:p-0">
                    <div class="w-full max-w-xl mx-auto h-16 bg-white rounded-xl shadow-sm mb-12 flex items-center justify-center font-black text-slate-300 border-b-4 border-slate-200 tracking-[0.5em] uppercase print:border print:border-black">
                        Quadro / Professor
                    </div>
                    <div class="grid grid-cols-6 gap-3 md:gap-6 max-w-4xl mx-auto" id="room-grid">
                        <div class="col-span-full py-20 text-center text-slate-400 italic flex flex-col items-center gap-2">
                            <i class="fas fa-chair text-4xl opacity-50"></i>
                            <p>Carregando mapa...</p>
                        </div>
                    </div>
                </div>
                <div class="mt-8 text-center text-xs text-slate-400 no-print">
                    Dica: Arraste ou clique em um aluno e depois no destino para mover.
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        if (this.currentTurmaId) {
            this.carregarMapa(this.currentTurmaId);
        } else {
            const grid = document.getElementById('room-grid');
            if (grid) {
                grid.innerHTML = `
                    <div class="col-span-full py-20 text-center text-slate-400 italic flex flex-col items-center gap-2">
                        <i class="fas fa-chair text-4xl opacity-50"></i>
                        <p>Cadastre uma turma para visualizar o mapa.</p>
                    </div>
                `;
            }
        }
    },

    /**
     * Renderiza a grade de assentos para a turma selecionada.
     * @param {string|number} turmaId 
     */
    carregarMapa(turmaId) {
        if (!turmaId) return;
        this.currentTurmaId = turmaId;
        
        const grid = document.getElementById('room-grid');
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        if (!turma || !grid) return;

        let assentosHtml = '';
        for (let i = 1; i <= 36; i++) {
            const aluno = turma.alunos.find(a => a.posicao === i);
            const isSelecionado = this.alunoSelecionadoParaMover === i;
            
            let bgClass = '';
            if (isSelecionado) {
                bgClass = 'bg-blue-50 border-primary shadow-lg ring-4 ring-primary/30 z-10 scale-105 border-2';
            } else if (aluno) {
                bgClass = 'bg-white border-l-4 border-primary shadow-md draggable-card cursor-grab active:cursor-grabbing';
            } else {
                bgClass = 'bg-slate-50 border-2 border-dashed border-slate-300 hover:border-primary hover:bg-white';
            }

            const content = aluno
                ? `
                    <div class="flex flex-col items-center justify-center h-full w-full p-1 text-center pointer-events-none"> 
                        <span class="font-bold text-slate-700 text-[10px] md:text-xs leading-tight line-clamp-2 w-full break-words select-none">
                            ${window.escapeHTML(aluno.nome).split(' ')[0]} ${aluno.nome.split(' ')[1] ? aluno.nome.split(' ')[1].charAt(0) + '.' : ''}
                        </span>
                        ${isSelecionado ? '<i class="fas fa-arrows-alt text-primary text-xs mt-1 animate-pulse"></i>' : ''}
                    </div>
                  `
                : `<span class="text-[10px] font-bold text-slate-300 pointer-events-none">${i}</span>`;

            const dragAttributes = aluno
                ? `draggable="true" ondragstart="salaView.handleDragStart(event, '${aluno.id}', ${i})"`
                : '';

            assentosHtml += `
                <div id="seat-${i}"
                     data-posicao="${i}"
                     onclick="salaView.handleClick('${turmaId}', ${i})"
                     ondragover="salaView.handleDragOver(event)"
                     ondragleave="salaView.handleDragLeave(event)"
                     ondrop="salaView.handleDrop(event, ${i})"
                     ${dragAttributes}
                     class="aspect-square rounded-lg flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 ${bgClass} relative group print:border print:border-black print:shadow-none overflow-hidden"
                     aria-label="Assento ${i} ${aluno ? 'ocupado por ' + window.escapeHTML(aluno.nome) : 'vazio'}">
                    ${content}
                </div>
            `;
        }
        grid.innerHTML = assentosHtml;
    },

    handleDragStart(e, alunoId, posicaoAtual) {
        e.dataTransfer.setData('text/plain', JSON.stringify({
            alunoId: alunoId,
            posicaoOrigem: posicaoAtual,
            turmaId: this.currentTurmaId
        }));
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('opacity-50', 'scale-95'); // Feedback visual de drag
        this.alunoSelecionadoParaMover = null;
    },

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const seat = e.target.closest('[id^="seat-"]');
        if (seat) {
            seat.classList.add('bg-blue-100', 'border-blue-300'); // Feedback de drop target
        }
    },

    handleDragLeave(e) {
        const seat = e.target.closest('[id^="seat-"]');
        if (seat) {
            seat.classList.remove('bg-blue-100', 'border-blue-300');
        }
    },

    handleDrop(e, posicaoDestino) {
        e.preventDefault();
        const seat = e.target.closest('[id^="seat-"]');
        if (seat) seat.classList.remove('bg-blue-100', 'border-blue-300');
        
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            
            // Validações de segurança
            if (String(data.turmaId) !== String(this.currentTurmaId)) return;
            if (data.posicaoOrigem === posicaoDestino) return;

            model.movimentarAluno(this.currentTurmaId, data.alunoId, posicaoDestino);
            this.carregarMapa(this.currentTurmaId);
        } catch (err) {
            console.error("Erro no drop:", err);
        }
    },

    handleClick(turmaId, posicao) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        
        // Se já tem um aluno selecionado para mover
        if (this.alunoSelecionadoParaMover !== null) {
            if (this.alunoSelecionadoParaMover === posicao) {
                // Clicou no mesmo lugar -> cancela seleção e abre modal
                this.alunoSelecionadoParaMover = null;
                this.carregarMapa(turmaId);
                this.abrirModalSelecao(turmaId, posicao);
            } else {
                // Clicou em outro lugar -> move
                const alunoMover = turma.alunos.find(a => a.posicao === this.alunoSelecionadoParaMover);
                if (alunoMover) {
                    model.movimentarAluno(turmaId, alunoMover.id, posicao);
                }
                this.alunoSelecionadoParaMover = null;
                this.carregarMapa(turmaId);
            }
            return;
        }

        const aluno = turma.alunos.find(a => a.posicao === posicao);
        if (aluno) {
            // Seleciona para mover
            this.alunoSelecionadoParaMover = posicao;
            this.carregarMapa(turmaId);
        } else {
            // Lugar vazio -> abre modal para adicionar
            this.abrirModalSelecao(turmaId, posicao);
        }
    },

    abrirModalSelecao(turmaId, posicao) {
        const turma = model.state.turmas.find(t => String(t.id) === String(turmaId));
        const alunosSemLugar = turma.alunos.filter(a => !a.posicao);
        const alunoAtual = turma.alunos.find(a => a.posicao === posicao);

        controller.openModal(`Assento ${posicao}`, `
            <div class="p-4">
                <p class="text-sm text-slate-500 mb-4">Selecione um aluno para sentar aqui:</p>
                
                <div class="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 mb-4 pr-1">
                    ${alunosSemLugar.length > 0
                        ? alunosSemLugar
                            .sort((a, b) => a.nome.localeCompare(b.nome))
                            .map(aluno => `
                                <button onclick="salaView.salvarPosicaoManual('${turmaId}', '${aluno.id}', ${posicao})" 
                                        class="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-primary hover:bg-blue-50 transition-all group w-full text-left">
                                    <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary shadow-sm">
                                        <i class="fas fa-user-plus text-xs"></i>
                                    </div>
                                    <span class="font-bold text-slate-700 text-sm">${window.escapeHTML(aluno.nome)}</span>
                                </button>
                            `).join('')
                        : '<div class="text-center text-slate-400 text-xs py-4">Não há alunos sem lugar definido.</div>'
                    }
                </div>

                ${alunoAtual ? `
                    <div class="pt-4 border-t border-slate-100">
                        <p class="text-xs font-bold text-slate-800 mb-2">Aluno atual: ${window.escapeHTML(alunoAtual.nome)}</p>
                        <button onclick="salaView.salvarPosicaoManual('${turmaId}', null, ${posicao})" 
                                class="w-full py-2.5 text-red-500 text-sm font-bold hover:bg-red-50 rounded-lg transition flex items-center justify-center gap-2">
                            <i class="fas fa-user-slash"></i> Desocupar Assento
                        </button>
                    </div>
                ` : ''}
            </div>
        `);
    },

    salvarPosicaoManual(turmaId, alunoId, posicao) {
        if (alunoId === null || alunoId === "null") {
            model.desocuparPosicao(turmaId, posicao);
        } else {
            model.movimentarAluno(turmaId, alunoId, posicao);
        }
        controller.closeModal();
        this.carregarMapa(turmaId);
    }
};