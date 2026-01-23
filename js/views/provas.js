import { model } from '../model.js';

export const provasView = {
    selecionadas: new Set(),
    termoBusca: '',
    tempDados: null,
    disciplinas: [
        "Língua Portuguesa", "Matemática", "Ciências", "História", "Geografia",
        "Arte", "Educação Física", "Língua Inglesa", "Física", "Química",
        "Biologia", "Filosofia", "Sociologia"
    ],
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        const questoes = (model.state && model.state.questoes) ? model.state.questoes : [];
        const idsExistentes = new Set(questoes.map(q => Number(q.id)));
        for (const id of this.selecionadas) {
            if (!idsExistentes.has(Number(id))) this.selecionadas.delete(id);
        }
        const questoesFiltradas = this.filtrarQuestoes(questoes);
        const html = `
            <div class="fade-in pb-24 print:hidden">
                <div class="flex flex-wrap justify-between items-end mb-8 gap-4">
                    <div>
                        <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Gerador de Avaliações</h2>
                        <p class="text-slate-500">Selecione questões e gere provas (Aluno ou Gabarito).</p>
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
                                <button onclick="provasView.abrirOpcoesImpressao()" 
                                        class="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                        ${this.selecionadas.size === 0 ? 'disabled' : ''}>
                                    <i class="fas fa-print"></i> Gerar Prova
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
                    { left: '$', right: '$', display: false }
                ],
                throwOnError: false
            });
        }
    },
    cardQuestao(q) {
        const isSelected = this.selecionadas.has(Number(q.id));
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
                        <div class="text-xs text-slate-600 flex gap-1 ${q.correta == i ? 'text-emerald-600 font-bold' : ''}">
                            <span class="font-bold">${letras[i]})</span>
                            <span>${alt}</span>
                            ${q.correta == i ? '<i class="fas fa-check ml-1 text-[10px]"></i>' : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        const dataJson = JSON.stringify(q).replace(/"/g, '&quot;');
        return `
            <div class="p-5 rounded-2xl border transition-all duration-200 ${borderClass} group relative">
                <div class="flex justify-between items-start gap-4 mb-3">
                    <div class="flex flex-wrap gap-2">
                        ${tagsHtml}
                    </div>
                    <div class="flex gap-2 shrink-0">
                        <button onclick='provasView.openAddQuestao(${dataJson})' 
                                class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                                title="Editar Questão">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        ${!isSelected ? `
                            <button onclick="controller.deleteQuestao(${q.id}); provasView.render('view-container')" 
                                    class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    title="Excluir Questão">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        ` : ''}
                        <button onclick="provasView.toggleSelecao(${q.id})" 
                                class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm ${btnClass}"
                                title="${isSelected ? 'Remover da prova' : 'Adicionar à prova'}">
                            <i class="fas ${iconClass}"></i>
                        </button>
                    </div>
                </div>
                <p class="text-slate-700 text-sm leading-relaxed font-medium font-serif">
                    ${escapeHTML(q.enunciado).replace(/\n/g, '<br>')}
                </p>
                ${alternativasPreview}
                <div class="mt-3 pt-3 border-t border-slate-100/50 flex justify-between items-center">
                    <span class="text-[10px] text-slate-400">Criada em ${new Date(q.createdAt || Date.now()).toLocaleDateString()}</span>
                    ${isSelected ? '<span class="text-[10px] font-bold text-primary flex items-center gap-1"><i class="fas fa-check-circle"></i> Selecionada</span>' : ''}
                </div>
            </div>
        `;
    },
    preservarEstadoEBuscarBNCC() {
        this.tempDados = this.getDataModal();
        controller.openSeletorBnccQuestao();
    },
    openAddQuestao(dados = {}) {
        dados = dados || {};
        if (this.tempDados) {
            dados = { ...this.tempDados, ...dados };
            this.tempDados = null;
        }
        const habilidadeHtml = dados.bncc
            ? `<div class="bg-yellow-50 border border-yellow-100 p-3 rounded-lg flex items-center justify-between">
                 <div>
                    <span class="font-bold text-yellow-700 text-xs">${dados.bncc.codigo}</span>
                    <p class="text-xs text-yellow-600 line-clamp-1">${dados.bncc.descricao}</p>
                 </div>
                 <button onclick="document.getElementById('q-bncc-cod').value=''; provasView.openAddQuestao({...provasView.getDataModal(), bncc: null})" class="text-yellow-600 hover:text-red-500"><i class="fas fa-times"></i></button>
               </div>`
            : `<button onclick="provasView.preservarEstadoEBuscarBNCC()" class="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-primary hover:text-primary hover:bg-blue-50 transition-all text-xs font-bold uppercase flex items-center justify-center gap-2">
                 <i class="fas fa-search"></i> Selecionar Habilidade BNCC
               </button>`;
        const tituloModal = dados.id ? 'Editar Questão' : 'Adicionar ao Banco';
        const botaoTexto = dados.id ? 'Atualizar Questão' : 'Salvar Questão';
        const opcoesDisciplina = this.disciplinas.map(disc =>
            `<option value="${disc}" ${dados.materia === disc ? 'selected' : ''}>${disc}</option>`
        ).join('');
        const html = `
            <div class="p-6 space-y-4">
                <input type="hidden" id="q-id" value="${dados.id || ''}">
                <input type="hidden" id="q-created-at" value="${dados.createdAt || ''}">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Disciplina</label>
                        <select id="q-materia" class="w-full border-2 border-slate-100 p-2.5 rounded-xl outline-none focus:border-primary bg-white">
                            <option value="">Selecione...</option>
                            ${opcoesDisciplina}
                            <option value="Outra" ${dados.materia === 'Outra' ? 'selected' : ''}>Outra</option>
                        </select>
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
                    <div id="container-qtd-alt" class="${dados.tipo === 'multipla' ? '' : 'hidden'}">
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Qtd. Alternativas</label>
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
                    <div class="text-[10px] text-slate-400 mb-1">Dica: Use <b>$$ fórmula $$</b> para matemática.</div>
                    <textarea id="q-enunciado" rows="4" placeholder="Digite o texto da questão..." 
                              class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary text-slate-700 text-sm font-medium">${dados.enunciado || ''}</textarea>
                </div>
                <div id="area-alternativas" class="${dados.tipo === 'multipla' ? '' : 'hidden'} space-y-2 border-t border-slate-100 pt-3">
                    <div class="flex justify-between items-center mb-1">
                        <label class="block text-xs font-bold text-slate-400 uppercase">Alternativas e Resposta Correta</label>
                        <span class="text-[10px] text-primary bg-primary/10 px-2 py-1 rounded-full">Marque a correta</span>
                    </div>
                    <div id="inputs-alternativas" class="space-y-2"></div>
                </div>
                <div id="area-gabarito" class="${dados.tipo === 'multipla' ? 'hidden' : ''} space-y-2 border-t border-slate-100 pt-3">
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Gabarito / Resposta Esperada (Para o Professor)</label>
                    <textarea id="q-gabarito" rows="3" placeholder="Escreva a resposta esperada ou tópicos de correção..." 
                              class="w-full border border-slate-200 p-3 rounded-xl outline-none focus:border-primary text-slate-700 text-sm bg-emerald-50/50 focus:bg-white transition-colors">${dados.gabarito || ''}</textarea>
                </div>
                <div class="flex justify-end gap-3 pt-2">
                    <button onclick="controller.closeModal()" class="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button>
                    <button onclick="provasView.salvarQuestao()" class="btn-primary px-6 py-2 rounded-xl font-bold shadow-lg shadow-primary/20">${botaoTexto}</button>
                </div>
            </div>
        `;
        controller.openModal(tituloModal, html);
        setTimeout(() => {
            if (dados.ano) document.getElementById('q-ano').value = dados.ano;
            if (dados.tipo === 'multipla') {
                if (dados.alternativas) {
                    document.getElementById('q-qtd-alt').value = dados.alternativas.length;
                    provasView.gerarInputsAlternativas(dados.alternativas, dados.correta);
                } else {
                    provasView.gerarInputsAlternativas();
                }
            } else {
                provasView.mudarTipoQuestao();
            }
            if (!dados.id && !dados.enunciado) document.getElementById('q-enunciado').focus();
        }, 50);
    },
    mudarTipoQuestao() {
        const tipo = document.getElementById('q-tipo').value;
        const containerQtd = document.getElementById('container-qtd-alt');
        const areaAlternativas = document.getElementById('area-alternativas');
        const areaGabarito = document.getElementById('area-gabarito');
        if (tipo === 'multipla') {
            containerQtd.classList.remove('hidden');
            areaAlternativas.classList.remove('hidden');
            areaGabarito.classList.add('hidden');
            if (document.getElementById('inputs-alternativas').innerHTML === '') {
                this.gerarInputsAlternativas();
            }
        } else {
            containerQtd.classList.add('hidden');
            areaAlternativas.classList.add('hidden');
            areaGabarito.classList.remove('hidden');
        }
    },
    gerarInputsAlternativas(valoresPreenchidos = null, corretaIndex = null) {
        const qtd = parseInt(document.getElementById('q-qtd-alt').value);
        const container = document.getElementById('inputs-alternativas');
        const letras = ['A', 'B', 'C', 'D', 'E'];
        const valoresAtuais = valoresPreenchidos || [];
        if (!valoresPreenchidos) {
            const inputsAntigos = container.querySelectorAll('input[type="text"]');
            inputsAntigos.forEach(inp => valoresAtuais.push(inp.value));
            const radioAntigo = container.querySelector('input[name="correta"]:checked');
            if (radioAntigo) corretaIndex = radioAntigo.value;
        }
        let html = '';
        for (let i = 0; i < qtd; i++) {
            const valor = valoresAtuais[i] || '';
            const isChecked = (corretaIndex != null && corretaIndex == i) ? 'checked' : '';
            html += `
                <div class="flex items-center gap-3 p-1 hover:bg-slate-50 rounded-lg">
                    <div class="flex items-center gap-2 cursor-pointer" onclick="document.getElementById('radio-${i}').click()">
                        <input type="radio" name="correta" id="radio-${i}" value="${i}" ${isChecked} class="w-4 h-4 text-primary focus:ring-primary accent-primary cursor-pointer">
                        <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center">${letras[i]}</span>
                    </div>
                    <input type="text" id="alt-${i}" value="${valor}" placeholder="Texto da alternativa ${letras[i]} (aceita $$...$$)" 
                           class="flex-1 border border-slate-200 p-2 rounded-lg text-sm outline-none focus:border-primary">
                </div>
            `;
        }
        container.innerHTML = html;
    },
    getDataModal() {
        const dados = {
            id: document.getElementById('q-id').value || null,
            createdAt: document.getElementById('q-created-at').value || null,
            materia: document.getElementById('q-materia').value,
            ano: document.getElementById('q-ano').value,
            enunciado: document.getElementById('q-enunciado').value,
            tipo: document.getElementById('q-tipo').value,
            bncc: document.getElementById('q-bncc-cod').value ? {
                codigo: document.getElementById('q-bncc-cod').value,
                descricao: document.getElementById('q-bncc-desc').value
            } : null
        };
        if (dados.tipo === 'multipla') {
            const qtd = parseInt(document.getElementById('q-qtd-alt').value);
            const alternativas = [];
            for (let i = 0; i < qtd; i++) {
                const el = document.getElementById(`alt-${i}`);
                if (el) alternativas.push(el.value);
            }
            dados.alternativas = alternativas;
            const radio = document.querySelector('input[name="correta"]:checked');
            dados.correta = radio ? parseInt(radio.value) : null;
            dados.gabarito = null;
        } else {
            dados.gabarito = document.getElementById('q-gabarito').value;
            dados.alternativas = null;
            dados.correta = null;
        }
        return dados;
    },
    salvarQuestao() {
        const dados = this.getDataModal();
        if (dados.enunciado) {
            const novaQuestao = {
                materia: dados.materia,
                ano: dados.ano,
                enunciado: dados.enunciado,
                tipo: dados.tipo,
                bncc: dados.bncc
            };
            if (dados.id) {
                novaQuestao.id = Number(dados.id);
                novaQuestao.createdAt = dados.createdAt;
            }
            if (dados.tipo === 'multipla') {
                const alternativas = dados.alternativas.map(a => a.trim());
                if (alternativas.filter(a => a !== '').length < 2) {
                    return alert("Preencha pelo menos duas alternativas.");
                }
                novaQuestao.alternativas = alternativas;
                novaQuestao.correta = dados.correta;
            } else {
                novaQuestao.gabarito = dados.gabarito;
            }
            if (dados.id) {
                model.updateQuestao(novaQuestao.id, novaQuestao);
            } else {
                model.addQuestao(novaQuestao);
            }
            controller.closeModal();
            this.render('view-container');
        } else {
            alert("O enunciado é obrigatório.");
        }
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
        const idNum = Number(id);
        if (this.selecionadas.has(idNum)) {
            this.selecionadas.delete(idNum);
        } else {
            this.selecionadas.add(idNum);
        }
        this.render('view-container');
    },
    limparSelecao() {
        if (confirm("Remover todas as questões da prova atual?")) {
            this.selecionadas.clear();
            this.render('view-container');
        }
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
    },
    abrirOpcoesImpressao() {
        const html = `
            <div class="p-6 text-center space-y-4">
                <div class="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <i class="fas fa-print text-2xl"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-800">Gerar Avaliação</h3>
                <p class="text-slate-500 text-sm">Escolha o formato que deseja imprimir:</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <button onclick="controller.closeModal(); provasView.imprimirProva('aluno')" 
                            class="p-4 border-2 border-slate-100 rounded-2xl hover:border-primary hover:bg-blue-50 transition-all group">
                        <i class="fas fa-user-graduate text-3xl text-slate-300 group-hover:text-primary mb-3"></i>
                        <div class="font-bold text-slate-700">Versão do Aluno</div>
                        <div class="text-xs text-slate-400 mt-1">Sem respostas</div>
                    </button>
                    
                    <button onclick="controller.closeModal(); provasView.imprimirProva('professor')" 
                            class="p-4 border-2 border-slate-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group">
                        <i class="fas fa-chalkboard-teacher text-3xl text-slate-300 group-hover:text-emerald-600 mb-3"></i>
                        <div class="font-bold text-slate-700">Versão do Professor</div>
                        <div class="text-xs text-slate-400 mt-1">Com gabarito e respostas</div>
                    </button>
                </div>
            </div>
        `;
        controller.openModal('Configurar Impressão', html);
    },
    imprimirProva(tipo = 'aluno') {
        const todas = model.state.questoes || [];
        const selecionadas = todas.filter(q => this.selecionadas.has(Number(q.id)));
        if (selecionadas.length === 0) return alert("Selecione pelo menos uma questão.");
        let nomeProf = model.state.userConfig.profName || '__________________________';
        if ((!model.state.userConfig.profName || model.state.userConfig.profName.trim() === "") && model.currentUser) {
            nomeProf = model.currentUser.displayName;
        }
        const isProf = tipo === 'professor';
        const questoesHtml = selecionadas.map((q, i) => {
            const letras = ['a', 'b', 'c', 'd', 'e'];
            let conteudoResposta = '';
            if (q.tipo === 'multipla' && q.alternativas) {
                conteudoResposta = `
                    <div style="margin-top: 10px;">
                        ${q.alternativas.map((alt, idx) => {
                            const styleCorrect = (isProf && q.correta == idx) 
                                ? 'font-weight: bold; color: #059669; background-color: #ecfdf5; border-radius: 4px;' 
                                : '';
                            const iconCheck = (isProf && q.correta == idx) ? ' ✓' : '';
                            return `
                                <div class="alternativa" style="${styleCorrect} padding: 4px 8px;">
                                    <strong>${letras[idx]})</strong> ${alt} ${iconCheck}
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            } else {
                conteudoResposta = `
                    <div style="margin-top: 20px;">
                        <div class="resposta-area"></div>
                        <div class="resposta-area"></div>
                        <div class="resposta-area"></div>
                        <div class="resposta-area"></div>
                        ${isProf && q.gabarito ? `
                            <div style="margin-top: 15px; padding: 10px; background-color: #f0fdf4; border: 1px dashed #16a34a; border-radius: 6px; font-size: 12px; color: #15803d;">
                                <strong>Gabarito Esperado:</strong><br>
                                ${escapeHTML(q.gabarito).replace(/\n/g, '<br>')}
                            </div>
                        ` : ''}
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
        const tituloDoc = isProf ? 'GABARITO - Avaliação' : 'Avaliação de Aprendizagem';
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
                .alternativa { margin-bottom: 5px; font-size: 14px; }
            </style>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        `;
        const conteudoFinal = `
            <html>
            <head>
                <title>Impressão - ${tituloDoc}</title>
                ${estiloImpressao}
            </head>
            <body>
                <div class="header">
                    <p><strong>ESCOLA:</strong> ${model.state.userConfig.schoolName || '________________________________________________'}</p>
                    <p><strong>PROFESSOR(A):</strong> ${escapeHTML(nomeProf)} &nbsp;&nbsp; <strong>DATA:</strong> ____/____/____</p>
                    <p><strong>ALUNO(A):</strong> _______________________________________________________ <strong>TURMA:</strong> ________</p>
                </div>
                <div class="titulo-prova">${tituloDoc}</div>
                <div id="conteudo-prova">${htmlProcessado}</div>
                <script>
                    window.onload = function() { setTimeout(() => window.print(), 500); }
                <\/script>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        win.document.write(conteudoFinal);
        win.document.close();
    }
};
