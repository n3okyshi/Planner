import { model } from '../model.js';

export const provasView = {
    selecionadas: new Set(),
    termoBusca: '',
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        const questoes = (model.state && model.state.questoes) ? model.state.questoes : [];
        const idsExistentes = new Set(questoes.map(q => q.id));
        for (const id of this.selecionadas) {
            if (!idsExistentes.has(id)) this.selecionadas.delete(id);
        }
        const questoesFiltradas = this.filtrarQuestoes(questoes);
        const html = `
            <div class="fade-in pb-24">
                <div class="flex flex-wrap justify-between items-end mb-8 gap-4">
                    <div>
                        <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Gerador de Avaliações</h2>
                        <p class="text-slate-500">Selecione questões do banco para montar sua prova.</p>
                    </div>
                    <button onclick="provasView.openAddQuestao()" 
                            class="btn-primary px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                        <i class="fas fa-plus"></i> Nova Questão
                    </button>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div class="lg:col-span-2 space-y-6">
                        <div class="bg-white p-2 rounded-xl border border-slate-200 flex items-center shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                            <div class="w-10 h-10 flex items-center justify-center text-slate-400">
                                <i class="fas fa-search"></i>
                            </div>
                            <input type="text" 
                                   placeholder="Buscar por matéria, ano, código BNCC ou enunciado..." 
                                   class="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400 font-medium"
                                   onkeyup="provasView.atualizarBusca(this.value)">
                        </div>
                        <div class="space-y-4" id="lista-questoes">
                            ${questoesFiltradas.length > 0
                ? questoesFiltradas.map(q => this.cardQuestao(q)).join('')
                : this.estadoVazio()}
                        </div>
                    </div>
                    <div class="lg:col-span-1 sticky top-24">
                        <div class="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 ring-1 ring-slate-200/50">
                            <div class="flex items-center gap-3 mb-4 border-b border-slate-50 pb-4">
                                <div class="bg-indigo-100 text-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center">
                                    <i class="fas fa-file-alt text-lg"></i>
                                </div>
                                <div>
                                    <h3 class="font-bold text-slate-800">Prova Atual</h3>
                                    <p class="text-xs text-slate-500">Questões selecionadas</p>
                                </div>
                            </div>
                            <div class="mb-6">
                                <div class="text-4xl font-black text-slate-800 mb-1 text-center">
                                    ${this.selecionadas.size}
                                </div>
                                <p class="text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Questões</p>
                            </div>
                            <div class="space-y-3">
                                <button onclick="provasView.imprimirProva()" 
                                        class="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                        ${this.selecionadas.size === 0 ? 'disabled' : ''}>
                                    <i class="fas fa-print"></i> Gerar PDF / Imprimir
                                </button>
                                ${this.selecionadas.size > 0 ? `
                                    <button onclick="provasView.limparSelecao()" class="w-full py-2 text-red-500 text-xs font-bold hover:bg-red-50 rounded-lg transition">
                                        Limpar Seleção
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
        this.renderizarLatex(container);
    },
    renderizarLatex(elemento) {
        if (window.renderMathInElement) {
            window.renderMathInElement(elemento, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ],
                throwOnError: false
            });
        }
    },
    cardQuestao(q) {
        const isSelected = this.selecionadas.has(q.id);
        const borderClass = isSelected ? 'border-primary ring-1 ring-primary bg-blue-50/30' : 'border-slate-200 hover:border-slate-300 bg-white';
        const btnClass = isSelected ? 'bg-red-100 text-red-500 hover:bg-red-200' : 'bg-slate-100 text-slate-400 hover:bg-primary hover:text-white';
        const iconClass = isSelected ? 'fa-minus' : 'fa-plus';
        let tagsHtml = `<span class="px-2 py-1 bg-slate-100 text-[10px] font-bold text-slate-600 rounded uppercase tracking-wider">${q.materia || 'Geral'}</span>`;
        if (q.ano) {
            tagsHtml += `<span class="px-2 py-1 bg-indigo-50 text-[10px] font-bold text-indigo-600 rounded uppercase tracking-wider border border-indigo-100">${escapeHTML(q.ano)}</span>`;
        }
        if (q.bncc && q.bncc.codigo) {
            tagsHtml += `<span class="px-2 py-1 bg-yellow-50 text-[10px] font-bold text-yellow-700 rounded uppercase tracking-wider border border-yellow-100" title="${escapeHTML(q.bncc.descricao)}">${escapeHTML(q.bncc.codigo)}</span>`;
        }
        const tipoLabel = (q.tipo === 'multipla') ? 'Múltipla Escolha' : 'Dissertativa';
        const tipoCor = (q.tipo === 'multipla') ? 'text-purple-600 bg-purple-50 border-purple-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100';
        tagsHtml += `<span class="px-2 py-1 ${tipoCor} text-[10px] font-bold rounded uppercase tracking-wider border">${tipoLabel}</span>`;
        let alternativasPreview = '';
        if (q.tipo === 'multipla' && q.alternativas && q.alternativas.length > 0) {
            const letras = ['a', 'b', 'c', 'd', 'e'];
            alternativasPreview = `
                <div class="mt-3 pl-2 border-l-2 border-slate-100 space-y-1">
                    ${q.alternativas.map((alt, i) => `
                        <div class="text-xs text-slate-600 flex gap-1">
                            <span class="font-bold">${letras[i]})</span>
                            <span>${alt}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        return `
            <div class="p-5 rounded-2xl border transition-all duration-200 ${borderClass} group relative">
                <div class="flex justify-between items-start gap-4 mb-3">
                    <div class="flex flex-wrap gap-2">
                        ${tagsHtml}
                    </div>
                    <div class="flex gap-2 shrink-0">
                        <button onclick="provasView.toggleSelecao(${q.id})" 
                                class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm ${btnClass}"
                                title="${isSelected ? 'Remover da prova' : 'Adicionar à prova'}">
                            <i class="fas ${iconClass}"></i>
                        </button>
                        ${!isSelected ? `
                            <button onclick="controller.deleteQuestao(${q.id}); provasView.render('view-container')" 
                                    class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
                <p class="text-slate-700 text-sm leading-relaxed font-medium font-serif">
                    ${escapeHTML(q.enunciado).replace(/\n/g, '<br>')}
                </p>
                ${alternativasPreview}
                <div class="mt-3 pt-3 border-t border-slate-100/50 flex justify-between items-center">
                    <span class="text-[10px] text-slate-400">Adicionada em ${new Date(q.createdAt || Date.now()).toLocaleDateString()}</span>
                    ${isSelected ? '<span class="text-[10px] font-bold text-primary flex items-center gap-1"><i class="fas fa-check-circle"></i> Selecionada</span>' : ''}
                </div>
            </div>
        `;
    },
    filtrarQuestoes(todas) {
        if (!this.termoBusca) return todas;
        const termo = this.termoBusca.toLowerCase();
        return todas.filter(q =>
            (q.materia && q.materia.toLowerCase().includes(termo)) ||
            (q.enunciado && q.enunciado.toLowerCase().includes(termo)) ||
            (q.ano && q.ano.toLowerCase().includes(termo)) ||
            (q.bncc && q.bncc.codigo && q.bncc.codigo.toLowerCase().includes(termo))
        );
    },
    atualizarBusca(valor) {
        this.termoBusca = valor;
        this.render('view-container');
        const input = document.querySelector('input[type="text"]');
        if (input) {
            input.focus();
            input.value = valor;
        }
    },
    toggleSelecao(id) {
        if (this.selecionadas.has(id)) {
            this.selecionadas.delete(id);
        } else {
            this.selecionadas.add(id);
        }
        this.render('view-container');
    },
    limparSelecao() {
        if (confirm("Remover todas as questões da prova atual?")) {
            this.selecionadas.clear();
            this.render('view-container');
        }
    },
    openAddQuestao(dados = {}) {
        const habilidadeHtml = dados.bncc
            ? `<div class="bg-yellow-50 border border-yellow-100 p-3 rounded-lg flex items-center justify-between">
                 <div>
                    <span class="font-bold text-yellow-700 text-xs">${dados.bncc.codigo}</span>
                    <p class="text-xs text-yellow-600 line-clamp-1">${dados.bncc.descricao}</p>
                 </div>
                 <button onclick="document.getElementById('q-bncc-cod').value=''; provasView.openAddQuestao({...provasView.getDataModal(), bncc: null})" class="text-yellow-600 hover:text-red-500"><i class="fas fa-times"></i></button>
               </div>`
            : `<button onclick="controller.openSeletorBnccQuestao()" class="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-primary hover:text-primary hover:bg-blue-50 transition-all text-xs font-bold uppercase flex items-center justify-center gap-2">
                 <i class="fas fa-search"></i> Selecionar Habilidade BNCC
               </button>`;
        const html = `
            <div class="p-6 space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Disciplina</label>
                        <input type="text" id="q-materia" value="${dados.materia || ''}" placeholder="Ex: Matemática" 
                               class="w-full border-2 border-slate-100 p-2.5 rounded-xl outline-none focus:border-primary">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Ano / Série</label>
                        <select id="q-ano" class="w-full border-2 border-slate-100 p-2.5 rounded-xl outline-none focus:border-primary bg-white">
                            <option value="">Selecione...</option>
                            <option value="6º Ano">6º Ano</option>
                            <option value="7º Ano">7º Ano</option>
                            <option value="8º Ano">8º Ano</option>
                            <option value="9º Ano">9º Ano</option>
                            <option value="1ª Série EM">1ª Série EM</option>
                            <option value="2ª Série EM">2ª Série EM</option>
                            <option value="3ª Série EM">3ª Série EM</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo de Questão</label>
                        <select id="q-tipo" onchange="provasView.mudarTipoQuestao()" class="w-full border border-slate-200 p-2 rounded-lg outline-none focus:border-primary bg-white text-sm font-medium">
                            <option value="aberta" ${dados.tipo === 'aberta' ? 'selected' : ''}>Dissertativa (Linhas)</option>
                            <option value="multipla" ${dados.tipo === 'multipla' ? 'selected' : ''}>Múltipla Escolha</option>
                        </select>
                    </div>
                    <div id="container-qtd-alt" class="hidden">
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Alternativas</label>
                        <select id="q-qtd-alt" onchange="provasView.gerarInputsAlternativas()" class="w-full border border-slate-200 p-2 rounded-lg outline-none focus:border-primary bg-white text-sm font-medium">
                            <option value="3">3 (A, B, C)</option>
                            <option value="4" selected>4 (A, B, C, D)</option>
                            <option value="5">5 (A, B, C, D, E)</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Habilidade BNCC (Opcional)</label>
                    <input type="hidden" id="q-bncc-cod" value="${dados.bncc ? dados.bncc.codigo : ''}">
                    <input type="hidden" id="q-bncc-desc" value="${dados.bncc ? dados.bncc.descricao : ''}">
                    ${habilidadeHtml}
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Enunciado da Questão</label>
                    <div class="text-[10px] text-slate-400 mb-1">Dica: Use <b>$$ fórmula $$</b> para matemática. Ex: $$ x^2 + y^2 = z^2 $$</div>
                    <textarea id="q-enunciado" rows="4" placeholder="Digite o texto da questão..." 
                              class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary text-slate-700 text-sm font-medium">${dados.enunciado || ''}</textarea>
                </div>
                <div id="area-alternativas" class="hidden space-y-2 border-t border-slate-100 pt-3">
                    <label class="block text-xs font-bold text-slate-400 uppercase">Opções de Resposta</label>
                    <div id="inputs-alternativas" class="space-y-2"></div>
                </div>
                <div class="flex justify-end gap-3 pt-2">
                    <button onclick="controller.closeModal()" class="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button>
                    <button onclick="provasView.salvarQuestao()" class="btn-primary px-6 py-2 rounded-xl font-bold shadow-lg shadow-primary/20">Salvar Questão</button>
                </div>
            </div>
        `;
        controller.openModal('Adicionar ao Banco', html);
        setTimeout(() => {
            if (dados.ano) document.getElementById('q-ano').value = dados.ano;
            provasView.mudarTipoQuestao();
            document.getElementById('q-enunciado').focus();
        }, 50);
    },
    mudarTipoQuestao() {
        const tipo = document.getElementById('q-tipo').value;
        const containerQtd = document.getElementById('container-qtd-alt');
        const areaAlternativas = document.getElementById('area-alternativas');

        if (tipo === 'multipla') {
            containerQtd.classList.remove('hidden');
            areaAlternativas.classList.remove('hidden');
            this.gerarInputsAlternativas();
        } else {
            containerQtd.classList.add('hidden');
            areaAlternativas.classList.add('hidden');
        }
    },
    gerarInputsAlternativas() {
        const qtd = parseInt(document.getElementById('q-qtd-alt').value);
        const container = document.getElementById('inputs-alternativas');
        const letras = ['A', 'B', 'C', 'D', 'E'];
        const valoresAtuais = [];
        const inputsAntigos = container.querySelectorAll('input');
        inputsAntigos.forEach(inp => valoresAtuais.push(inp.value));
        let html = '';
        for (let i = 0; i < qtd; i++) {
            const valor = valoresAtuais[i] || '';
            html += `
                <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center">${letras[i]}</span>
                    <input type="text" id="alt-${i}" value="${valor}" placeholder="Texto da alternativa ${letras[i]} (aceita $$...$$)" 
                           class="flex-1 border border-slate-200 p-2 rounded-lg text-sm outline-none focus:border-primary">
                </div>
            `;
        }
        container.innerHTML = html;
    },
    getDataModal() {
        return {
            materia: document.getElementById('q-materia').value,
            ano: document.getElementById('q-ano').value,
            enunciado: document.getElementById('q-enunciado').value,
            tipo: document.getElementById('q-tipo').value,
            bncc: document.getElementById('q-bncc-cod').value ? {
                codigo: document.getElementById('q-bncc-cod').value,
                descricao: document.getElementById('q-bncc-desc').value
            } : null
        };
    },
    salvarQuestao() {
        const materia = document.getElementById('q-materia').value;
        const ano = document.getElementById('q-ano').value;
        const enunciado = document.getElementById('q-enunciado').value;
        const bnccCod = document.getElementById('q-bncc-cod').value;
        const bnccDesc = document.getElementById('q-bncc-desc').value;
        const tipo = document.getElementById('q-tipo').value;
        if (enunciado) {
            const novaQuestao = {
                materia,
                ano,
                enunciado,
                tipo
            };
            if (bnccCod) {
                novaQuestao.bncc = { codigo: bnccCod, descricao: bnccDesc };
            }
            if (tipo === 'multipla') {
                const qtd = parseInt(document.getElementById('q-qtd-alt').value);
                const alternativas = [];
                let todasPreenchidas = true;
                for (let i = 0; i < qtd; i++) {
                    const val = document.getElementById(`alt-${i}`).value.trim();
                    if (!val) todasPreenchidas = false;
                    alternativas.push(val);
                }
                if (!todasPreenchidas) {
                    return alert("Por favor, preencha todas as alternativas.");
                }
                novaQuestao.alternativas = alternativas;
            }
            model.addQuestao(novaQuestao);
            controller.closeModal();
            this.render('view-container');
        } else {
            alert("O enunciado é obrigatório.");
        }
    },
    imprimirProva() {
        const todas = model.state.questoes || [];
        const selecionadas = todas.filter(q => this.selecionadas.has(q.id));
        if (selecionadas.length === 0) return alert("Selecione pelo menos uma questão.");
        let nomeProf = model.state.userConfig.profName || '__________________________';
        if ((!model.state.userConfig.profName || model.state.userConfig.profName.trim() === "") && model.currentUser) {
            nomeProf = model.currentUser.displayName;
        }
        const questoesHtml = selecionadas.map((q, i) => {
            const letras = ['a', 'b', 'c', 'd', 'e'];
            let conteudoResposta = '';

            if (q.tipo === 'multipla' && q.alternativas) {
                conteudoResposta = `
                    <div style="margin-top: 10px;">
                        ${q.alternativas.map((alt, idx) => `
                            <div class="alternativa">
                                <strong>${letras[idx]})</strong> ${alt}
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                conteudoResposta = `
                    <div style="margin-top: 20px;">
                        <div class="resposta-area"></div>
                        <div class="resposta-area"></div>
                        <div class="resposta-area"></div>
                    </div>
                `;
            }
            return `
                <div class="questao">
                    ${q.bncc ? `<div class="questao-info no-print">Habilidade: ${escapeHTML(q.bncc.codigo)}</div>` : ''}
                    <span class="questao-numero">${i + 1})</span>
                    <div class="questao-texto">${escapeHTML(q.enunciado).replace(/\n/g, '<br>')}</div>
                    ${conteudoResposta}
                </div>
            `;
        }).join('');
        const divTemporaria = document.createElement('div');
        divTemporaria.innerHTML = questoesHtml;
        if (window.renderMathInElement) {
            renderMathInElement(divTemporaria, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false }
                ]
            });
        }
        const htmlProcessado = divTemporaria.innerHTML;
        const estiloImpressao = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
                body { font-family: 'Roboto', sans-serif; padding: 40px; color: #000; }
                .header { border: 1px solid #000; padding: 15px; margin-bottom: 40px; border-radius: 4px; }
                .header p { margin: 5px 0; font-size: 14px; }
                .titulo-prova { text-align: center; text-transform: uppercase; font-weight: bold; font-size: 18px; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .questao { margin-bottom: 30px; page-break-inside: avoid; }
                .questao-info { font-size: 10px; color: #666; margin-bottom: 5px; text-transform: uppercase; font-weight: bold; }
                .questao-numero { font-weight: bold; margin-bottom: 10px; display: block; font-size: 16px; }
                .questao-texto { font-size: 14px; line-height: 1.5; text-align: justify; margin-bottom: 15px; }
                .resposta-area { border-bottom: 1px solid #ccc; height: 25px; width: 100%; display: block; margin-top: 5px; }
                .alternativa { margin-bottom: 8px; font-size: 14px; padding-left: 10px; }
            </style>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        `;
        const conteudoFinal = `
            <html>
            <head>
                <title>Impressão de Avaliação</title>
                ${estiloImpressao}
            </head>
            <body>
                <div class="header">
                    <p><strong>ESCOLA:</strong> ${model.state.userConfig.schoolName || '________________________________________________'}</p>
                    <p><strong>PROFESSOR(A):</strong> ${escapeHTML(nomeProf)} &nbsp;&nbsp; <strong>DATA:</strong> ____/____/____</p>
                    <p><strong>ALUNO(A):</strong> _______________________________________________________ <strong>TURMA:</strong> ________</p>
                </div>
                <div class="titulo-prova">Avaliação de Aprendizagem</div>
                <div id="conteudo-prova">
                    ${htmlProcessado}
                </div>
                <script>
                    // Pequeno delay apenas para garantir que o CSS carregou e as fontes foram aplicadas
                    window.onload = function() {
                        setTimeout(() => window.print(), 500);
                    }
                <\/script>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        win.document.write(conteudoFinal);
        win.document.close();
    },
    estadoVazio() {
        return `
            <div class="flex flex-col items-center justify-center py-16 px-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center">
                <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 text-slate-300 shadow-sm">
                    <i class="fas fa-box-open text-2xl"></i>
                </div>
                <h3 class="text-lg font-bold text-slate-600 mb-1">Banco Vazio</h3>
                <p class="text-slate-400 text-sm mb-4">Você ainda não cadastrou nenhuma questão.</p>
                <button onclick="provasView.openAddQuestao()" class="text-primary font-bold text-sm hover:underline">
                    Adicionar Primeira Questão
                </button>
            </div>
        `;
    }
};