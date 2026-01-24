import { model } from '../model.js';

export const bnccView = {
    selecionarCallback: null,
    dataCache: {},
    filtrosVisiveisMobile: false,
    coresComponentes: {
        "O eu, o outro e o nós": "#4f46e5",
        "Corpo, gestos e movimentos": "#0891b2",
        "Traços, sons, cores e formas": "#db2777",
        "Escuta, fala, pensamento e imaginação": "#7c3aed",
        "Espaços, tempos, quantidades, relações e transformações": "#059669",
        "Língua Portuguesa": "#2563eb",
        "Arte": "#db2777",
        "Educação Física": "#ea580c",
        "Língua Inglesa": "#475569",
        "Matemática": "#dc2626",
        "Ciências": "#16a34a",
        "Geografia": "#ca8a04",
        "História": "#9333ea",
        "Ensino Religioso": "#0d9488",
        "Linguagens e suas Tecnologias": "#2563eb",
        "Matemática e suas Tecnologias": "#dc2626",
        "Ciências da Natureza e suas Tecnologias": "#16a34a",
        "Ciências Humanas e Sociais Aplicadas": "#9333ea"
    },
    async render(container, preNivel = null, preSerie = null, callbackExterno = null) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        this.selecionarCallback = callbackExterno;
        this.filtrosVisiveisMobile = false;
        const html = `
            <div class="fade-in flex flex-col h-full overflow-hidden relative">
                <div class="mb-4 border-b border-slate-100 pb-4 shrink-0 px-1 flex justify-between items-end">
                    <div>
                        <h3 class="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <i class="fas fa-book-open text-primary"></i> 
                            Base Nacional Comum Curricular
                        </h3>
                        <p class="text-xs text-slate-500 mt-1">
                            ${this.selecionarCallback ? '<span class="text-emerald-600 font-bold">Modo Seleção:</span> Escolha a habilidade para adicionar ao seu plano.' : 'Consulte códigos e habilidades da BNCC.'}
                        </p>
                    </div>
                    <button onclick="bnccView.toggleFiltrosMobile()" 
                            class="lg:hidden text-xs font-bold text-slate-500 border border-slate-200 bg-white px-3 py-2 rounded-lg hover:bg-slate-50 transition shadow-sm flex items-center gap-2">
                        <i class="fas fa-filter"></i> Filtros
                    </button>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0 relative">
                    <aside id="bncc-sidebar" class="hidden lg:block space-y-4 overflow-y-auto custom-scrollbar pr-2 h-full absolute lg:relative z-20 w-full lg:w-auto bg-white lg:bg-transparent shadow-2xl lg:shadow-none p-4 lg:p-0 top-0 left-0 h-full">
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                            <div class="flex justify-between items-center lg:hidden mb-2 pb-2 border-b border-slate-50">
                                <h4 class="font-bold text-slate-700">Filtrar Habilidades</h4>
                                <button onclick="bnccView.toggleFiltrosMobile()" class="text-slate-400 hover:text-red-500 bg-slate-50 p-2 rounded-full w-8 h-8 flex items-center justify-center">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div>
                                <label for="bncc-nivel" class="text-xs font-bold text-slate-400 uppercase mb-1 block">1. Nível de Ensino</label>
                                <select id="bncc-nivel" name="bncc-nivel" onchange="bnccView.updateFiltros(this.value)" 
                                        class="w-full border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:border-primary bg-slate-50 focus:bg-white transition-colors">
                                    <option value="">Selecione...</option>
                                    <option value="Educação Infantil">Educação Infantil</option>
                                    <option value="Ensino Fundamental">Ensino Fundamental</option>
                                    <option value="Ensino Médio">Ensino Médio</option>
                                </select>
                            </div>
                            <div>
                                <label for="bncc-componente" class="text-xs font-bold text-slate-400 uppercase mb-1 block">2. Componente</label>
                                <select id="bncc-componente" name="bncc-componente" onchange="bnccView.updateEixos()" disabled
                                        class="w-full border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:border-primary bg-slate-50 disabled:opacity-60 transition-colors">
                                    <option value="">Aguardando nível...</option>
                                </select>
                            </div>
                            <div>
                                <label for="bncc-eixo" class="text-xs font-bold text-slate-400 uppercase mb-1 block">3. Eixo Temático</label>
                                <select id="bncc-eixo" name="bncc-eixo" disabled
                                        class="w-full border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:border-primary bg-slate-50 disabled:opacity-60 transition-colors">
                                    <option value="">Todos os Eixos</option>
                                </select>
                            </div>
                            <div>
                                <label for="bncc-ano" class="text-xs font-bold text-slate-400 uppercase mb-1 block">4. Ano / Faixa Etária</label>
                                <select id="bncc-ano" name="bncc-ano" disabled
                                        class="w-full border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:border-primary bg-slate-50 disabled:opacity-60 transition-colors">
                                    <option value="">Todos</option>
                                </select>
                            </div>
                            <div>
                                <label for="bncc-busca" class="text-xs font-bold text-slate-400 uppercase mb-1 block">5. Palavra-chave</label>
                                <input type="text" id="bncc-busca" name="bncc-busca" placeholder="Ex: EF01LP01 ou 'leitura'"
                                       class="w-full border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:border-primary bg-white">
                            </div>
                            <div class="flex flex-col gap-2 mt-4">
                                <button onclick="bnccView.pesquisar()" class="w-full btn-primary py-3 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                                    <i class="fas fa-search"></i> Buscar Habilidades
                                </button>
                                <button onclick="bnccView.limparFiltros()" class="w-full text-slate-400 text-xs font-bold hover:text-slate-600 py-2 border border-transparent hover:border-slate-100 rounded-lg transition">
                                    Limpar Filtros
                                </button>
                            </div>
                        </div>
                    </aside>

                    <div class="lg:col-span-3 bg-slate-50 rounded-2xl border border-slate-200 relative flex flex-col h-full overflow-hidden">
                        <div id="bncc-resultados" class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3" style="max-height: 100%;">
                            <div class="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                <i class="fas fa-search text-4xl mb-4"></i>
                                <p>Utilize os filtros para encontrar habilidades.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
        if (preNivel) {
            const nivelSelect = document.getElementById('bncc-nivel');
            if (preNivel.includes("Fundamental")) nivelSelect.value = "Ensino Fundamental";
            else if (preNivel.includes("Médio") || preNivel.includes("Medio")) nivelSelect.value = "Ensino Médio";
            else if (preNivel.includes("Infantil")) nivelSelect.value = "Educação Infantil";
            await this.updateFiltros(nivelSelect.value);
            if (preSerie) {
                const anoSelect = document.getElementById('bncc-ano');
                const serieLimpa = preSerie.toLowerCase();
                let melhorMatch = "";
                Array.from(anoSelect.options).forEach(opt => {
                    const optVal = opt.value.toLowerCase();
                    if (optVal === "") return;
                    const numSerie = serieLimpa.match(/\d+/);
                    const numOpt = optVal.match(/\d+/);
                    if (nivelSelect.value === "Educação Infantil") {
                        if (serieLimpa.includes(optVal) || optVal.includes(serieLimpa)) {
                            melhorMatch = opt.value;
                        }
                    } else {
                        if (numSerie && numOpt && numSerie[0] === numOpt[0]) {
                            melhorMatch = opt.value;
                        }
                    }
                });
                if (melhorMatch) {
                    anoSelect.value = melhorMatch;
                }
            }
            this.pesquisar();
        }
    },
    toggleFiltrosMobile() {
        const sidebar = document.getElementById('bncc-sidebar');
        this.filtrosVisiveisMobile = !this.filtrosVisiveisMobile;

        if (this.filtrosVisiveisMobile) {
            sidebar.classList.remove('hidden');
            sidebar.classList.add('block');
        } else {
            sidebar.classList.add('hidden');
            sidebar.classList.remove('block');
        }
    },
    limparFiltros() {
        document.getElementById('bncc-nivel').value = "";
        document.getElementById('bncc-busca').value = "";
        this.updateFiltros("");
        document.getElementById('bncc-resultados').innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                <i class="fas fa-search text-4xl mb-4"></i>
                <p>Filtros limpos.</p>
            </div>
        `;
    },
    async updateFiltros(nivel) {
        const compSelect = document.getElementById('bncc-componente');
        const eixoSelect = document.getElementById('bncc-eixo');
        const anoSelect = document.getElementById('bncc-ano');
        compSelect.innerHTML = '<option value="">Carregando...</option>';
        compSelect.disabled = true;
        eixoSelect.innerHTML = '<option value="">Todos os Eixos</option>';
        eixoSelect.disabled = true;
        anoSelect.innerHTML = '<option value="">Todos</option>';
        anoSelect.disabled = true;
        if (!nivel) {
            compSelect.innerHTML = '<option value="">Aguardando nível...</option>';
            return;
        }
        let arquivo = "";
        let anos = [];
        if (nivel === "Educação Infantil") {
            arquivo = "bncc_infantil.json";
            anos = ["Bebês", "Crianças bem pequenas", "Crianças pequenas"];
        } else if (nivel === "Ensino Fundamental") {
            arquivo = "bncc_fundamental.json";
            anos = ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano", "6º Ano", "7º Ano", "8º Ano", "9º Ano"];
        } else if (nivel === "Ensino Médio") {
            arquivo = "bncc_medio.json";
            anos = ["1ª Série", "2ª Série", "3ª Série"];
        }
        if (!this.dataCache[nivel]) {
            try {
                const response = await fetch(`./assets/BNCC/${arquivo}`);
                if (!response.ok) throw new Error("Erro ao carregar");
                this.dataCache[nivel] = await response.json();
            } catch (e) {
                console.error(e);
                compSelect.innerHTML = '<option value="">Erro ao carregar</option>';
                return;
            }
        }
        const dados = this.dataCache[nivel];
        let listaComponentes = [];
        if (nivel === "Educação Infantil") {
            const list = dados.campos_experiencia || dados.componentes || [];
            listaComponentes = list.map(c => c.nome);
        } else {
            const list = dados.componentes || [];
            listaComponentes = list.map(c => c.nome);
        }
        compSelect.innerHTML = `<option value="">Todos</option>` + listaComponentes.map(c => `<option value="${c}">${c}</option>`).join('');
        compSelect.disabled = false;
        compSelect.classList.remove('bg-slate-50');
        compSelect.classList.add('bg-white');
        anoSelect.innerHTML = `<option value="">Todos</option>` + anos.map(a => `<option value="${a}">${a}</option>`).join('');
        anoSelect.disabled = false;
        anoSelect.classList.remove('bg-slate-50');
        anoSelect.classList.add('bg-white');
    },
    updateEixos() {
        const nivel = document.getElementById('bncc-nivel').value;
        const componenteSelecionado = document.getElementById('bncc-componente').value;
        const eixoSelect = document.getElementById('bncc-eixo');
        eixoSelect.innerHTML = '<option value="">Todos os Eixos</option>';
        if (!componenteSelecionado || componenteSelecionado === "Todos" || !this.dataCache[nivel]) {
            eixoSelect.disabled = true;
            eixoSelect.classList.add('bg-slate-50');
            return;
        }
        const dados = this.dataCache[nivel];
        let eixosEncontrados = [];
        let compObj = null;
        if (nivel === "Educação Infantil") {
            eixoSelect.disabled = true;
            return;
        } else {
            compObj = dados.componentes.find(c => c.nome === componenteSelecionado);
        }
        if (compObj) {
            const listaEixos = compObj.unidades_tematicas || compObj.eixos_tematicos || compObj.areas_conhecimento || [];
            eixosEncontrados = listaEixos.map(e => e.nome);
        }
        if (eixosEncontrados.length > 0) {
            eixoSelect.innerHTML = `<option value="">Todos os Eixos</option>` + eixosEncontrados.map(e => `<option value="${e}">${e}</option>`).join('');
            eixoSelect.disabled = false;
            eixoSelect.classList.remove('bg-slate-50');
            eixoSelect.classList.add('bg-white');
        } else {
            eixoSelect.disabled = true;
        }
    },
    async pesquisar() {
        const nivel = document.getElementById('bncc-nivel').value;
        const componenteSelecionado = document.getElementById('bncc-componente').value;
        const eixoSelecionado = document.getElementById('bncc-eixo').value;
        const anoSelecionado = document.getElementById('bncc-ano').value;
        const termoBusca = document.getElementById('bncc-busca').value.toLowerCase();
        const resContainer = document.getElementById('bncc-resultados');
        if (!nivel) return alert("Selecione o Nível de Ensino.");
        resContainer.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-primary"><i class="fas fa-circle-notch fa-spin text-4xl mb-3"></i><p>Filtrando...</p></div>`;
        if (this.filtrosVisiveisMobile) this.toggleFiltrosMobile();

        setTimeout(() => {
            const dadosBrutos = this.dataCache[nivel];
            const listaHabilidades = this._normalizarDados(dadosBrutos, nivel);
            const resultados = listaHabilidades.filter(item => {
                if (componenteSelecionado && componenteSelecionado !== "Todos") {
                    if (item.componente !== componenteSelecionado) return false;
                }
                if (eixoSelecionado && eixoSelecionado !== "Todos os Eixos" && eixoSelecionado !== "") {
                    if (item.eixo !== eixoSelecionado) return false;
                }
                if (anoSelecionado && anoSelecionado !== "Todos") {
                    const anoItem = (item.ano || "").toLowerCase();
                    const anoFiltro = anoSelecionado.toLowerCase();
                    if (nivel === "Ensino Médio") {
                        if (anoItem.includes("1ª, 2ª e 3ª") || anoItem.includes("1, 2 e 3")) return true;
                    }
                    if (!anoItem.includes(anoFiltro) && !anoFiltro.includes(anoItem)) return false;
                }
                if (termoBusca) {
                    const textoCompleto = `${item.codigo} ${item.descricao} ${item.objeto_conhecimento || ''} ${item.eixo || ''}`.toLowerCase();
                    if (!textoCompleto.includes(termoBusca)) return false;
                }
                return true;
            });

            // Ordena corretamente as habilidades
            resultados.sort((a, b) => {
            return a.codigo.localeCompare(b.codigo, undefined, {
                numeric: true,
                sensitivity: 'base'
            });
        });

            this.renderCards(resultados);
        }, 50);
    },
    _normalizarDados(json, nivel) {
        let lista = [];
        if (nivel === "Educação Infantil") {
            const campos = json.campos_experiencia || json.componentes || [];
            campos.forEach(campo => {
                if (campo.faixas_etarias) {
                    campo.faixas_etarias.forEach(faixa => {
                        faixa.objetivos.forEach(obj => {
                            lista.push({
                                codigo: obj.codigo,
                                descricao: obj.descricao,
                                componente: campo.nome,
                                eixo: "Campo de Experiência",
                                ano: faixa.grupo,
                                objeto_conhecimento: null,
                                cor: model.coresComponentes[campo.nome]
                            });
                        });
                    });
                }
            });
        }
        else if (nivel === "Ensino Fundamental") {
            if (json.componentes) {
                json.componentes.forEach(comp => {
                    const grupos = comp.unidades_tematicas || comp.eixos_tematicos || [];
                    grupos.forEach(grupo => {
                        if (grupo.anos) {
                            grupo.anos.forEach(anoObj => {
                                anoObj.habilidades.forEach(hab => {
                                    lista.push({
                                        codigo: hab.codigo,
                                        descricao: hab.descricao,
                                        componente: comp.nome,
                                        eixo: grupo.nome,
                                        ano: anoObj.ano,
                                        objeto_conhecimento: hab.objetos_de_conhecimento,
                                        cor: model.coresComponentes[comp.nome]
                                    });
                                });
                            });
                        }
                    });
                });
            }
        }
        else if (nivel === "Ensino Médio") {
            if (json.componentes) {
                json.componentes.forEach(comp => {
                    const areas = comp.areas_conhecimento || [];
                    areas.forEach(area => {
                        if (area.anos) {
                            area.anos.forEach(anoObj => {
                                anoObj.habilidades.forEach(hab => {
                                    lista.push({
                                        codigo: hab.codigo,
                                        descricao: hab.descricao,
                                        componente: comp.nome,
                                        eixo: area.nome,
                                        ano: anoObj.ano,
                                        objeto_conhecimento: hab.objetos_de_conhecimento,
                                        cor: model.coresComponentes[comp.nome] || model.coresComponentes[area.nome]
                                    });
                                });
                            });
                        }
                    });
                });
            }
        }
        return lista;
    },
    renderCards(data) {
        const container = document.getElementById('bncc-resultados');
        if (data.length === 0) {
            container.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-slate-400"><i class="far fa-folder-open text-4xl mb-3"></i><p>Nenhuma habilidade encontrada.</p></div>`;
            return;
        }
        container.innerHTML = data.map(item => {
            const cor = item.cor || '#64748b';
            const textoCompleto = `${item.codigo} - ${item.descricao}`;
            const objSafe = JSON.stringify({
                codigo: item.codigo,
                descricao: item.descricao,
                componente: item.componente,
                objeto: item.objeto_conhecimento,
                cor: item.cor
            }).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
            let btnAcao = '';
            if (this.selecionarCallback) {
                btnAcao = `
                    <button onclick='bnccView.executarSelecao(${objSafe}, this)' 
                        class="shrink-0 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600 px-4 py-2 rounded-lg transition-all text-xs font-bold flex flex-col items-center gap-1 shadow-sm group/btn min-w-[70px]">
                        <i class="fas fa-plus text-sm group-hover/btn:scale-110 transition-transform"></i>
                        <span class="text-[9px] uppercase">Usar</span>
                    </button>`;
            } else {
                const textoEscapado = textoCompleto.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/'/g, "\\'");
                btnAcao = `
                    <button onclick="navigator.clipboard.writeText('${textoEscapado}'); alert('Habilidade copiada!')" 
                        class="shrink-0 text-slate-400 hover:text-primary p-2 transition-colors" title="Copiar texto">
                        <i class="far fa-copy text-xl"></i>
                    </button>`;
            }
            let badgeEixo = '';
            if (item.eixo && item.eixo !== "Campo de Experiência" && item.eixo !== item.componente) {
                badgeEixo = `
                    <span class="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wide">
                        ${item.eixo}
                    </span>`;
            }
            let badgeObjeto = '';
            if (item.objeto_conhecimento) {
                badgeObjeto = `
                    <div class="mt-2 pt-2 border-t border-slate-100 flex items-start gap-2">
                        <i class="fas fa-lightbulb text-yellow-500 text-xs mt-0.5"></i>
                        <span class="text-xs text-slate-600 font-medium">${item.objeto_conhecimento}</span>
                    </div>`;
            }
            return `
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 border-l-[4px] hover:shadow-md transition-all flex flex-col animate-slide-up" style="border-left-color: ${cor} !important;">
                    <div class="flex justify-between items-start gap-4">
                        <div class="flex-1">
                            <div class="flex items-center flex-wrap gap-2 mb-2">
                                <span class="text-white text-[11px] font-black px-2 py-0.5 rounded uppercase tracking-wider" style="background-color: ${cor} !important;">${item.codigo}</span>
                                <span class="text-slate-400 text-[10px] font-bold uppercase tracking-wide border border-slate-200 px-1.5 rounded">${item.componente}</span>
                                <span class="text-slate-400 text-[10px] font-bold uppercase tracking-wide border border-slate-200 px-1.5 rounded">${item.ano}</span>
                                ${badgeEixo}
                            </div>
                            <p class="text-slate-700 text-sm leading-relaxed text-justify font-medium">${item.descricao}</p>
                            ${badgeObjeto}
                        </div>
                        <div class="flex flex-col justify-center pl-2 border-l border-slate-100">
                            ${btnAcao}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },
    executarSelecao(obj, btnElement) {
        if (this.selecionarCallback) {
            this.selecionarCallback(obj);
            if (btnElement) {
                const originalHTML = btnElement.innerHTML;
                const originalClass = btnElement.className;
                btnElement.innerHTML = `<i class="fas fa-check text-lg"></i>`;
                btnElement.className = "shrink-0 bg-emerald-500 text-white min-w-[70px] px-4 py-2 rounded-lg flex items-center justify-center shadow-md transform scale-105 transition-all";
                setTimeout(() => {
                    btnElement.innerHTML = originalHTML;
                    btnElement.className = originalClass;
                }, 1500);
            }
        }
    }
};