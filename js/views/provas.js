import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';

export const provasView = {
    selecionadas: new Set(),
    termoBusca: '',
    tempDados: null,
    abaAtiva: 'minhas',
    filtros: {
        materia: '',
        ano: '',
        tipo: '',
        bncc: ''
    },
    disciplinas: [
        "Língua Portuguesa", "Matemática", "Ciências", "História", "Geografia",
        "Arte", "Educação Física", "Língua Inglesa", "Física", "Química",
        "Biologia", "Filosofia", "Sociologia"
    ],

    // HELPER PARA RENDERIZAR ESTRELAS DE DIFICULDADE
    _renderEstrelasDificuldade(nivel = 0) {
        const n = Number(nivel) || 0;
        let estrelas = '';

        for (let i = 1; i <= 3; i++) {
            let cor = 'text-slate-200';
            if (n > 0 && i <= n) {
                cor = 'text-amber-400'; // Dourado apenas se houver nível
            }
            estrelas += `<i class="fas fa-star ${cor} text-[10px]"></i>`;
        }
        const labels = ["Não definida", "Fácil", "Média", "Difícil"];
        return `
        <div class="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100" title="Dificuldade: ${labels[n]}">
            ${estrelas}
        </div>
    `;
    },

    mudarAba(novaAba) {
        this.abaAtiva = novaAba;
        this.filtros = { materia: '', ano: '', tipo: '', bncc: '' };
        this.termoBusca = '';
        this.render('view-container');
    },
    atualizarFiltro(campo, valor) {
        this.filtros[campo] = valor;
        this.render('view-container');
    },
    filtrarQuestoes(todas) {
        return todas.filter(q => {
            const termo = this.termoBusca.toLowerCase();
            const matchBusca = !this.termoBusca ||
                (q.enunciado?.toLowerCase().includes(termo)) ||
                (q.bncc?.codigo?.toLowerCase().includes(termo)) ||
                (q.tags?.some(tag => tag.toLowerCase().includes(termo)));
            const matchMateria = !this.filtros.materia || q.materia === this.filtros.materia;
            const matchAno = !this.filtros.ano || q.ano === this.filtros.ano;
            const matchTipo = !this.filtros.tipo || q.tipo === this.filtros.tipo;
            const matchUnidade = !this.filtros.unidade || q.bncc?.unidade_tematica === this.filtros.unidade;
            return matchBusca && matchMateria && matchAno && matchTipo && matchUnidade;
        });
    },
    async verificarImagem(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (e) {
            return false;
        }
    },
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        const minhasQuestoes = model.state.questoes || [];
        const questoesSistema = model.state.questoesSistema || [];
        const listaParaFiltrar = this.abaAtiva === 'minhas' ? minhasQuestoes : questoesSistema;
        const questoesFiltradas = this.filtrarQuestoes(listaParaFiltrar);

        const todosIdsExistentes = new Set([...minhasQuestoes, ...questoesSistema].map(q => String(q.id)));
        for (const id of this.selecionadas) {
            if (!todosIdsExistentes.has(String(id))) this.selecionadas.delete(id);
        }
        const html = `
        <div class="fade-in pb-24 print:hidden">
            <div class="flex flex-wrap justify-between items-end mb-8 gap-4">
                <div>
                    <div class="flex items-center gap-3">
                        <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Gerador de Avaliações</h2>
                        <button onclick="controller.navigate('stats-provas')" 
                                class="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 hover:bg-blue-50 transition-all flex items-center justify-center shadow-sm group"
                                title="Analisar Acervo de Questões">
                            <i class="fas fa-chart-pie group-hover:scale-110 transition-transform"></i>
                        </button>
                    </div>
                    <p class="text-slate-500">Selecione questões e gere provas (Aluno ou Gabarito).</p>
                </div>

                <div class="flex items-center gap-3">
                    <button onclick="controller.navigate('comunidade')" 
                            class="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg shadow-indigo-200 hover:scale-105 transition-transform">
                        <i class="fas fa-globe"></i> Explorar Comunidade
                    </button>

                    <button onclick="provasView.openAddQuestao()" 
                            class="btn-primary px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                        <i class="fas fa-plus"></i> Nova Questão
                    </button>
                </div>
                </div>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div class="lg:col-span-2 space-y-6">
                    <div class="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200">
                        <button onclick="provasView.mudarAba('minhas')" 
                            class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${this.abaAtiva === 'minhas' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                            Minhas Questões (${minhasQuestoes.length})
                        </button>
                        <button onclick="provasView.mudarAba('sistema')" 
                            class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${this.abaAtiva === 'sistema' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                            Banco do Sistema (${questoesSistema.length})
                        </button>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Disciplina</label>
                                <select onchange="provasView.atualizarFiltro('materia', this.value)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary">
                                    <option value="">Todas as Matérias</option>
                                    ${this.disciplinas.map(d => `<option value="${d}" ${this.filtros.materia === d ? 'selected' : ''}>${d}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Série/Ano</label>
                                <select onchange="provasView.atualizarFiltro('ano', this.value)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary">
                                    <option value="">Todos os Anos</option>
                                    <option value="6º Ano" ${this.filtros.ano === '6º Ano' ? 'selected' : ''}>6º Ano</option>
                                    <option value="7º Ano" ${this.filtros.ano === '7º Ano' ? 'selected' : ''}>7º Ano</option>
                                    <option value="8º Ano" ${this.filtros.ano === '8º Ano' ? 'selected' : ''}>8º Ano</option>
                                    <option value="9º Ano" ${this.filtros.ano === '9º Ano' ? 'selected' : ''}>9º Ano</option>
                                    <option value="Ensino Médio" ${this.filtros.ano === 'Ensino Médio' ? 'selected' : ''}>Ensino Médio</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Tipo</label>
                                <select onchange="provasView.atualizarFiltro('tipo', this.value)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary">
                                    <option value="">Todos os Tipos</option>
                                    <option value="multipla" ${this.filtros.tipo === 'multipla' ? 'selected' : ''}>Múltipla Escolha</option>
                                    <option value="aberta" ${this.filtros.tipo === 'aberta' ? 'selected' : ''}>Dissertativa</option>
                                </select>
                            </div>
                        </div>
                        <div class="relative">
                            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                            <input type="text" id="input-busca-provas" placeholder="Pesquisar por enunciado ou código BNCC..." 
                                   class="w-full bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                                   oninput="provasView.atualizarBusca(this.value)" value="${this.termoBusca}">
                        </div>
                    </div>
                    <div class="space-y-4" id="lista-questoes">
                        ${questoesFiltradas.length > 0
                ? questoesFiltradas.map(q => provasView.cardQuestao(q)).join('')
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
                        <div class="mb-6 text-center">
                            <div id="contador-questoes" class="text-4xl font-black text-slate-800 mb-1">${this.selecionadas.size}</div>
                            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Selecionadas</p>
                        </div>
                        <div class="space-y-3">
                            <button onclick="provasView.abrirOpcoesImpressao()" 
                                    class="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50" 
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
        const listaQuestoesEl = document.getElementById('lista-questoes');
        if (listaQuestoesEl && listaQuestoesEl.innerHTML.includes('$')) {
            this.renderizarLatex(listaQuestoesEl);
        }
        questoesFiltradas.forEach(async (q) => {
            if (q.suporte && q.suporte.tem_imagem) {
                const containerImg = document.getElementById(`img-container-${q.id}`);
                if (!containerImg) return;
                const url = q.suporte.url_imagem;
                const existe = await this.verificarImagem(url);
                if (existe) {
                    containerImg.classList.remove('hidden');
                    containerImg.innerHTML = '';
                    const img = new Image();
                    img.src = url;
                    img.className = "max-h-48 rounded shadow-sm object-contain";
                    containerImg.appendChild(img);
                    if (q.suporte.legenda) {
                        const p = document.createElement('p');
                        p.className = "text-[9px] text-slate-400 mt-2 italic text-center";
                        p.textContent = q.suporte.legenda;
                        containerImg.appendChild(p);
                    }
                }
            }
        });
    },
    cardQuestao(q) {
        const isSelected = this.selecionadas.has(String(q.id));
        const isCompartilhada = q.compartilhada === true;
        const isSistema = this.abaAtiva === 'sistema';
        const borderClass = isSelected ? 'border-primary ring-1 ring-primary bg-blue-50/30' : 'border-slate-200 hover:border-slate-300 bg-white';
        const btnClass = isSelected ? 'bg-red-100 text-red-500 hover:bg-red-200' : 'bg-slate-100 text-slate-400 hover:bg-primary hover:text-white';

        let tagsHtml = `<span class="px-2 py-1 bg-slate-100 text-[10px] font-bold text-slate-600 rounded uppercase tracking-wider">${q.materia || 'Geral'}</span>`;
        if (q.ano) tagsHtml += `<span class="px-2 py-1 bg-indigo-50 text-[10px] font-bold text-indigo-600 rounded uppercase border border-indigo-100">${escapeHTML(q.ano)}</span>`;
        if (q.bncc && q.bncc.codigo) tagsHtml += `<span class="px-2 py-1 bg-yellow-50 text-[10px] font-bold text-yellow-700 rounded uppercase border border-yellow-100" title="${escapeHTML(q.bncc.descricao)}">${escapeHTML(q.bncc.codigo)}</span>`;
        const tipoLabel = (q.tipo === 'multipla') ? 'Múltipla Escolha' : 'Dissertativa';
        const tipoCor = (q.tipo === 'multipla') ? 'text-purple-600 bg-purple-50 border-purple-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100';
        tagsHtml += `<span class="px-2 py-1 ${tipoCor} text-[10px] font-bold rounded uppercase border">${tipoLabel}</span>`;
        tagsHtml += this._renderEstrelasDificuldade(q.dificuldade);
        let conteudoGabarito = '';
        if (q.tipo === 'multipla' && q.alternativas) {
            const letras = ['a', 'b', 'c', 'd', 'e'];
            conteudoGabarito = `
            <div class="mt-4 space-y-1.5 pl-3 border-l-2 border-slate-100">
                ${q.alternativas.map((alt, i) => `
                    <div class="text-xs flex gap-2 ${q.correta == i ? 'text-emerald-600 font-bold' : 'text-slate-500'}">
                        <span class="uppercase font-bold">${letras[i]})</span> 
                        <span>${alt}</span>
                        ${q.correta == i ? '<i class="fas fa-check-circle text-[10px] mt-0.5"></i>' : ''}
                    </div>
                `).join('')}
            </div>`;
        } else if (q.gabarito || q.gabarito_comentado) {
            const textoGabarito = q.gabarito || q.gabarito_comentado;
            conteudoGabarito = `
            <div class="mt-4 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                <p class="text-[9px] font-black text-emerald-700 uppercase mb-1 flex items-center gap-1">
                    <i class="fas fa-lightbulb"></i> Gabarito / Resposta Esperada
                </p>
                <p class="text-xs text-emerald-800 leading-relaxed">${escapeHTML(textoGabarito)}</p>
                ${q.gabarito_comentado ? `
                <p class="text-[9px] font-black text-emerald-700 uppercase mt-2 mb-1 flex items-center gap-1">
                    <i class="fas fa-comment-dots"></i> Comentário Pedagógico
                </p>
                <p class="text-xs text-emerald-800 leading-relaxed italic">${escapeHTML(q.gabarito_comentado)}</p>
                ` : ''}
            </div>`;
        }
        const dataJson = JSON.stringify(q).replace(/'/g, "&#39;").replace(/"/g, '&quot;');
        const btnComunidade = isCompartilhada ?
            `
            <button onclick="model.removerDaComunidade('${q.id}')" 
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all" 
                    title="Remover da Comunidade">
                <i class="fas fa-globe"></i>
            </button>
            ` :
            `
            <button onclick="model.compartilharQuestao('${q.id}')" 
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" 
                    title="Compartilhar com a Comunidade">
                <i class="fas fa-share-nodes"></i>
            </button>
            `;
        const botoesAcao = isSistema ?
            `
            <button onclick='provasView.clonarQuestaoParaProfessor(${dataJson})' 
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors" 
                    title="Clonar e Editar">
                <i class="fas fa-copy"></i>
            </button>
            <span class="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 uppercase tracking-tighter">Global</span>
            ` :
            `
            ${btnComunidade}
            <button onclick='provasView.openAddQuestao(${dataJson})' 
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors" 
                    title="Editar">
                <i class="fas fa-pencil-alt"></i>
            </button>
            ${!isSelected ? `<button onclick="provasView.excluirQuestao('${q.id}')" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors" title="Excluir"><i class="fas fa-trash-alt"></i></button>` : ''}
            `;
        return `
        <div id="card-questao-${q.id}" class="p-6 rounded-2xl border transition-all duration-200 ${borderClass} group relative animate-slide-up">
            <div class="flex justify-between items-start gap-4 mb-4">
                <div class="flex flex-wrap gap-2 items-center">${tagsHtml}</div>
                <div class="flex gap-1 shrink-0">
                    ${botoesAcao}
                    <button onclick="provasView.toggleSelecao('${q.id}')" class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm ${btnClass}">
                        <i class="fas ${isSelected ? 'fa-minus' : 'fa-plus'}"></i>
                    </button>
                </div>
            </div>
            <div class="text-slate-700 text-sm leading-relaxed font-medium font-serif">
                ${escapeHTML(q.enunciado).replace(/\n/g, '<br>')}
                <div id="img-container-${q.id}" class="mt-4 hidden flex flex-col items-center"></div>
            </div>
            ${conteudoGabarito}
            <div class="mt-4 pt-3 border-t border-slate-50 flex justify-end">
                ${isSelected ? '<span class="text-[10px] font-bold text-primary flex items-center gap-1"><i class="fas fa-check-circle"></i> Selecionada para Prova</span>' : '<span class="text-[10px] text-slate-300 uppercase font-bold tracking-tighter">Disponível no banco</span>'}
            </div>
        </div>`;
    },
    atualizarBusca(valor) {
        this.termoBusca = valor;
        const lista = this.abaAtiva === 'minhas' ? (model.state.questoes || []) : (model.state.questoesSistema || []);
        const filtradas = this.filtrarQuestoes(lista);
        const container = document.getElementById('lista-questoes');
        if (container) {
            container.innerHTML = filtradas.length > 0 ? filtradas.map(q => provasView.cardQuestao(q)).join('') : this.estadoVazio();
            this.renderizarLatex(container);
        }
        document.getElementById('input-busca-provas')?.focus();
    },
    renderizarLatex(elemento) {
        if (typeof renderMathInElement === 'function') {
            renderMathInElement(elemento, {
                delimiters: [
                    { left: "$$", right: "$$", display: true },
                    { left: "$", right: "$", display: false }
                ],
                strict: false,
                throwOnError: false,
                trust: true
            });
        }
    },
    openAddQuestao(dados = {}) {
        dados = dados || {};
        if (this.tempDados) {
            dados = { ...this.tempDados, ...dados };
            this.tempDados = null;
        }
        const habilidadeHtml = dados.bncc
            ? `<div class="bg-yellow-50 border border-yellow-100 p-3 rounded-lg flex items-center justify-between">
                 <div><span class="font-bold text-yellow-700 text-xs">${dados.bncc.codigo}</span><p class="text-xs text-yellow-600 line-clamp-1">${dados.bncc.descricao}</p></div>
                 <button onclick="document.getElementById('q-bncc-cod').value=''; provasView.openAddQuestao({...provasView.getDataModal(), bncc: null})" class="text-yellow-600 hover:text-red-500"><i class="fas fa-times"></i></button>
               </div>`
            : `<button onclick="provasView.preservarEstadoEBuscarBNCC()" class="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-primary hover:text-primary hover:bg-blue-50 transition-all text-xs font-bold uppercase flex items-center justify-center gap-2"><i class="fas fa-search"></i> Selecionar Habilidade BNCC</button>`;

        const html = `
            <div class="p-6 space-y-4">
                <input type="hidden" id="q-id" value="${dados.id || ''}">
                <input type="hidden" id="q-created-at" value="${dados.createdAt || ''}">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Disciplina</label>
                        <select id="q-materia" class="w-full border-2 border-slate-100 p-2.5 rounded-xl outline-none focus:border-primary bg-white text-sm">
                            <option value="">Selecione...</option>
                            ${this.disciplinas.map(d => `<option value="${d}" ${dados.materia === d ? 'selected' : ''}>${d}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Ano / Série</label>
                        <select id="q-ano" class="w-full border-2 border-slate-100 p-2.5 rounded-xl outline-none focus:border-primary bg-white text-sm">
                            <option value="">Selecione...</option>
                            <option value="6º Ano" ${dados.ano === '6º Ano' ? 'selected' : ''}>6º Ano</option>
                            <option value="7º Ano" ${dados.ano === '7º Ano' ? 'selected' : ''}>7º Ano</option>
                            <option value="8º Ano" ${dados.ano === '8º Ano' ? 'selected' : ''}>8º Ano</option>
                            <option value="9º Ano" ${dados.ano === '9º Ano' ? 'selected' : ''}>9º Ano</option>
                            <option value="Ensino Médio" ${dados.ano === 'Ensino Médio' ? 'selected' : ''}>Ensino Médio</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo</label>
                        <select id="q-tipo" onchange="provasView.mudarTipoQuestao()" class="w-full border border-slate-200 p-2 rounded-lg outline-none focus:border-primary bg-white text-sm font-medium">
                            <option value="aberta" ${dados.tipo === 'aberta' ? 'selected' : ''}>Dissertativa</option>
                            <option value="multipla" ${dados.tipo === 'multipla' ? 'selected' : ''}>Múltipla Escolha</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Dificuldade</label>
                        <select id="q-dificuldade" class="w-full border border-slate-200 p-2 rounded-lg outline-none focus:border-primary bg-white text-sm font-medium">
                            <option value="0" ${!dados.dificuldade || dados.dificuldade == 0 ? 'selected' : ''}>Não Definida</option>
                            <option value="1" ${dados.dificuldade == 1 ? 'selected' : ''}>★ (Fácil)</option>
                            <option value="2" ${dados.dificuldade == 2 ? 'selected' : ''}>★★ (Média)</option>
                            <option value="3" ${dados.dificuldade == 3 ? 'selected' : ''}>★★★ (Difícil)</option>
                        </select>
                    </div>
                </div>

                <div id="container-qtd-alt" class="${dados.tipo === 'multipla' ? '' : 'hidden'}">
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Quantidade de Alternativas</label>
                    <select id="q-qtd-alt" onchange="provasView.gerarInputsAlternativas()" class="w-full border border-slate-200 p-2 rounded-lg outline-none focus:border-primary bg-white text-sm font-medium">
                        <option value="3" ${dados.alternativas?.length === 3 ? 'selected' : ''}>3</option>
                        <option value="4" ${dados.alternativas?.length === 4 || !dados.id ? 'selected' : ''}>4</option>
                        <option value="5" ${dados.alternativas?.length === 5 ? 'selected' : ''}>5</option>
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">BNCC</label>
                    <input type="hidden" id="q-bncc-cod" value="${dados.bncc ? dados.bncc.codigo : ''}">
                    <input type="hidden" id="q-bncc-desc" value="${dados.bncc ? dados.bncc.descricao : ''}">
                    ${habilidadeHtml}
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Enunciado (Aceita $$...$$)</label>
                    <textarea id="q-enunciado" rows="4" class="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-primary text-sm font-medium">${dados.enunciado || ''}</textarea>
                </div>
                <div id="area-alternativas" class="${dados.tipo === 'multipla' ? '' : 'hidden'} space-y-2 border-t border-slate-100 pt-3">
                    <div id="inputs-alternativas" class="space-y-2"></div>
                </div>
                <div id="area-gabarito" class="${dados.tipo === 'multipla' ? 'hidden' : ''} space-y-2 border-t border-slate-100 pt-3">
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Resposta / Gabarito Sugerido</label>
                    <textarea id="q-gabarito" rows="2" class="w-full border border-slate-200 p-3 rounded-xl outline-none focus:border-primary text-sm bg-emerald-50/30" placeholder="Resposta esperada...">${dados.gabarito || ''}</textarea>
                </div>
                <div class="flex justify-end gap-3 pt-2">
                    <button onclick="controller.closeModal()" class="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                    <button onclick="provasView.salvarQuestao()" class="btn-primary px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20">${dados.id ? 'Atualizar' : 'Salvar'}</button>
                </div>
            </div>`;

        controller.openModal(dados.id ? 'Editar Questão' : 'Nova Questão', html);
        setTimeout(() => {
            if (dados.tipo === 'multipla') provasView.gerarInputsAlternativas(dados.alternativas, dados.correta);
            else provasView.mudarTipoQuestao();
        }, 50);
    },
    clonarQuestaoParaProfessor(questaoOriginal) {
        const novaQuestao = JSON.parse(JSON.stringify(questaoOriginal));
        delete novaQuestao.id;
        delete novaQuestao.preDefinida;
        this.openAddQuestao(novaQuestao);
        Toast.show("Cópia pronta para edição!", "info");
    },
    preservarEstadoEBuscarBNCC() {
        this.tempDados = this.getDataModal();
        controller.openSeletorBnccQuestao();
    },
    mudarTipoQuestao() {
        const tipo = document.getElementById('q-tipo').value;
        const containerQtd = document.getElementById('container-qtd-alt');
        const areaAlt = document.getElementById('area-alternativas');
        const areaGab = document.getElementById('area-gabarito');
        if (tipo === 'multipla') {
            containerQtd?.classList.remove('hidden'); areaAlt?.classList.remove('hidden'); areaGab?.classList.add('hidden');
            if (!document.getElementById('inputs-alternativas').innerHTML) this.gerarInputsAlternativas();
        } else {
            containerQtd?.classList.add('hidden'); areaAlt?.classList.add('hidden'); areaGab?.classList.remove('hidden');
        }
    },
    gerarInputsAlternativas(valores = null, correta = null) {
        const qtdEl = document.getElementById('q-qtd-alt');
        if (!qtdEl) return;
        const qtd = parseInt(qtdEl.value);
        const container = document.getElementById('inputs-alternativas');
        const letras = ['A', 'B', 'C', 'D', 'E'];
        let html = '';
        for (let i = 0; i < qtd; i++) {
            const valor = (valores && valores[i]) ? valores[i] : '';
            const isChecked = (correta != null && correta == i) ? 'checked' : '';
            html += `
                <div class="flex items-center gap-3 p-1 hover:bg-slate-50 rounded-lg">
                    <input type="radio" name="correta" value="${i}" ${isChecked} class="w-4 h-4 text-primary accent-primary cursor-pointer">
                    <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] flex items-center justify-center shrink-0">${letras[i]}</span>
                    <input type="text" id="alt-${i}" value="${valor}" placeholder="Alternativa ${letras[i]}" class="flex-1 border border-slate-200 p-2 rounded-lg text-sm outline-none focus:border-primary">
                </div>`;
        }
        container.innerHTML = html;
    },
    getDataModal() {
        const dados = {
            id: document.getElementById('q-id')?.value || null,
            createdAt: document.getElementById('q-created-at')?.value || null,
            materia: document.getElementById('q-materia')?.value,
            ano: document.getElementById('q-ano')?.value,
            enunciado: document.getElementById('q-enunciado')?.value,
            tipo: document.getElementById('q-tipo')?.value,
            dificuldade: Number(document.getElementById('q-dificuldade')?.value) || 0,
            bncc: document.getElementById('q-bncc-cod')?.value ? {
                codigo: document.getElementById('q-bncc-cod').value,
                descricao: document.getElementById('q-bncc-desc').value
            } : null
        };
        if (dados.tipo === 'multipla') {
            const qtdEl = document.getElementById('q-qtd-alt');
            if (qtdEl) {
                const qtd = parseInt(qtdEl.value);
                dados.alternativas = Array.from({ length: qtd }, (_, i) => document.getElementById(`alt-${i}`)?.value || '');
                const radio = document.querySelector('input[name="correta"]:checked');
                dados.correta = radio ? parseInt(radio.value) : null;
            }
        } else {
            dados.gabarito = document.getElementById('q-gabarito')?.value || '';
        }
        return dados;
    },
    salvarQuestao() {
        const dados = this.getDataModal();
        if (!dados.enunciado) return Toast.show("O enunciado é obrigatório.", "error");
        model.saveQuestao(dados);
        controller.closeModal();
        this.render('view-container');
    },
    excluirQuestao(id) {
        if (confirm("Tem certeza que deseja excluir esta questão?")) {
            model.deleteQuestao(id);
            this.render('view-container');
            Toast.show("Questão excluída.", "info");
        }
    },
    toggleSelecao(id) {
        const idStr = String(id);
        if (this.selecionadas.has(idStr)) { this.selecionadas.delete(idStr); }
        else { this.selecionadas.add(idStr); }
        this.render('view-container');
    },
    limparSelecao() {
        if (confirm("Limpar todas as questões da prova atual?")) {
            this.selecionadas.clear();
            this.render('view-container');
        }
    },
    estadoVazio() {
        return `<div class="p-10 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">Nenhuma questão encontrada para este filtro.</div>`;
    },
    abrirOpcoesImpressao() {
        const html = `
            <div class="p-6 text-center space-y-4">
                <h3 class="text-xl font-bold text-slate-800">Gerar Documento</h3>
                <div class="grid grid-cols-2 gap-4 mt-6">
                    <button onclick="controller.closeModal(); provasView.imprimirProva('aluno')" class="p-4 border-2 border-slate-100 rounded-2xl hover:border-primary hover:bg-blue-50 transition-all">
                        <i class="fas fa-user-graduate text-2xl mb-2 text-slate-400"></i>
                        <div class="font-bold text-slate-700">Aluno</div>
                    </button>
                    <button onclick="controller.closeModal(); provasView.imprimirProva('professor')" class="p-4 border-2 border-slate-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                        <i class="fas fa-chalkboard-teacher text-2xl mb-2 text-slate-400"></i>
                        <div class="font-bold text-slate-700">Gabarito</div>
                    </button>
                </div>
            </div>`;
        controller.openModal('Impressão', html);
    },
    imprimirProva(tipo = 'aluno') {
        if (this.selecionadas.size === 0) {
            Toast.show("Nenhuma questão selecionada!", "warning");
            return;
        }
        const bancoTotal = [
            ...(model.state.questoesSistema || []),
            ...(model.state.questoes || [])
        ];
        const selecionadas = bancoTotal.filter(q => this.selecionadas.has(String(q.id)));
        if (selecionadas.length === 0) { Toast.show("Erro ao recuperar questões selecionadas.", "error"); return; }
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
                    <span class="questao-texto">${escapeHTML(q.enunciado).replace(/\n/g, '<br>')}</span>
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
                
                /* CORREÇÃO DE ALINHAMENTO */
                .questao-numero { font-weight: bold; font-size: 16px; margin-right: 5px; }
                .questao-texto { font-size: 14px; line-height: 1.5; text-align: justify; margin-bottom: 15px; }
                
                .resposta-area { border-bottom: 1px solid #ccc; height: 25px; width: 100%; display: block; margin-top: 5px; }
                .alternativa { margin-bottom: 5px; font-size: 14px; }

                /* BOTÃO FLUTUANTE DE VOLTAR */
                .btn-voltar {
                    position: fixed; top: 20px; right: 20px;
                    background-color: #ef4444; color: white; padding: 12px 20px;
                    border: none; border-radius: 50px; font-weight: bold; cursor: pointer;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 9999;
                    display: flex; align-items: center; gap: 8px;
                    font-family: sans-serif; text-transform: uppercase; font-size: 12px;
                }
                .btn-voltar:hover { background-color: #dc2626; }

                /* ESCONDER NA IMPRESSÃO */
                @media print {
                    .no-print, .btn-voltar { display: none !important; }
                    body { padding: 0; }
                }
            </style>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        `;
        const conteudoFinal = `
            <html>
            <head>
                <title>Impressão - ${tituloDoc}</title>
                ${estiloImpressao}
            </head>
            <body>
                <button onclick="window.close()" class="btn-voltar">
                    <i class="fas fa-arrow-left"></i> Voltar para o App
                </button>
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