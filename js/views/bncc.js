/**
 * @file bncc.js
 * @description View responsável pela interface de busca e seleção da Base Nacional Comum Curricular (BNCC).
 * @module views/bnccView
 */

import { model } from '../model.js';
import { Toast } from '../components/toast.js';

/**
 * View da BNCC.
 * @namespace bnccView
 */
export const bnccView = {
    selecionarCallback: null,
    dataCache: {},
    filtrosVisiveisMobile: false,
    
    // Armazena a lista completa após o primeiro carregamento para busca global rápida
    bancoCompleto: [],
    estaCarregandoBanco: false,

    /**
     * Renderiza o componente principal da BNCC.
     * @param {HTMLElement|string} container - Elemento onde a view será montada.
     * @param {string|null} [preNivel=null] - Nível pré-selecionado (para modal).
     * @param {string|null} [preSerie=null] - Série pré-selecionada.
     * @param {Function|null} [callbackExterno=null] - Função a ser chamada ao selecionar uma habilidade.
     */
    async render(container, preNivel = null, preSerie = null, callbackExterno = null) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        
        this.selecionarCallback = callbackExterno;
        this.filtrosVisiveisMobile = false;

        const html = `
            <div class="fade-in flex flex-col h-full overflow-hidden relative">
                <div class="mb-4 border-b border-slate-100 pb-4 shrink-0 px-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h3 class="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <i class="fas fa-book-open text-primary"></i> 
                            Base Nacional Comum Curricular
                        </h3>
                        <p class="text-xs text-slate-500 mt-1">
                            ${this.selecionarCallback ? '<span class="text-emerald-600 font-bold">Modo Seleção:</span> Escolha a habilidade para adicionar ao seu plano.' : 'Consulte códigos e habilidades da BNCC.'}
                        </p>
                    </div>
                    
                    <div class="relative w-full md:w-96 group">
                        <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors"></i>
                        <input type="text" id="bncc-busca-global" 
                               oninput="bnccView.executarBuscaRapida(this.value)"
                               placeholder="Busca global (ex: Frações, Verbos...)" 
                               class="w-full pl-11 pr-4 py-2.5 bg-slate-100 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all shadow-inner">
                        <div id="loading-global" class="absolute right-4 top-1/2 -translate-y-1/2 hidden">
                            <i class="fas fa-circle-notch fa-spin text-primary text-xs"></i>
                        </div>
                    </div>

                    <button onclick="bnccView.toggleFiltrosMobile()" 
                            class="lg:hidden text-xs font-bold text-slate-500 border border-slate-200 bg-white px-3 py-2 rounded-lg hover:bg-slate-50 transition shadow-sm flex items-center gap-2">
                        <i class="fas fa-filter"></i> Filtros Avançados
                    </button>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0 relative">
                    <aside id="bncc-sidebar" class="hidden lg:block space-y-4 overflow-y-auto custom-scrollbar pr-2 h-full absolute lg:relative z-20 w-full lg:w-auto bg-white lg:bg-transparent shadow-2xl lg:shadow-none p-4 lg:p-0 top-0 left-0">
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                            <div class="flex justify-between items-center lg:hidden mb-2 pb-2 border-b border-slate-50">
                                <h4 class="font-bold text-slate-700">Filtros por Nível</h4>
                                <button onclick="bnccView.toggleFiltrosMobile()" class="text-slate-400 hover:text-red-500 bg-slate-50 p-2 rounded-full w-8 h-8 flex items-center justify-center">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div>
                                <label for="bncc-nivel" class="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Nível de Ensino</label>
                                <select id="bncc-nivel" onchange="bnccView.updateFiltros(this.value)" 
                                        class="w-full border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:border-primary bg-slate-50 focus:bg-white transition-colors">
                                    <option value="">Selecione...</option>
                                    <option value="Educação Infantil">Educação Infantil</option>
                                    <option value="Ensino Fundamental">Ensino Fundamental</option>
                                    <option value="Ensino Médio">Ensino Médio</option>
                                </select>
                            </div>
                            <div>
                                <label for="bncc-componente" class="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Componente</label>
                                <select id="bncc-componente" onchange="bnccView.updateEixos()" disabled
                                        class="w-full border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:border-primary bg-slate-50 disabled:opacity-60 transition-colors font-medium">
                                    <option value="">Aguardando nível...</option>
                                </select>
                            </div>
                            <div>
                                <label for="bncc-eixo" class="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Eixo Temático</label>
                                <select id="bncc-eixo" disabled
                                        class="w-full border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:border-primary bg-slate-50 disabled:opacity-60 transition-colors">
                                    <option value="">Todos os Eixos</option>
                                </select>
                            </div>
                            <div>
                                <label for="bncc-ano" class="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Ano / Faixa Etária</label>
                                <select id="bncc-ano" disabled
                                        class="w-full border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:border-primary bg-slate-50 disabled:opacity-60 transition-colors font-medium">
                                    <option value="">Todos</option>
                                </select>
                            </div>
                            <div class="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-50">
                                <button onclick="bnccView.pesquisar()" class="w-full btn-primary py-3 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                                    <i class="fas fa-search"></i> Aplicar Filtros
                                </button>
                                <button onclick="bnccView.limparFiltros()" class="w-full text-slate-400 text-xs font-bold hover:text-slate-600 py-2">
                                    Limpar Filtros
                                </button>
                            </div>
                        </div>
                    </aside>

                    <div class="lg:col-span-3 bg-white rounded-3xl border border-slate-200 relative flex flex-col h-full overflow-hidden shadow-sm">
                        <div id="bncc-resultados" class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4" style="max-height: 100%;">
                            <div class="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                                <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <i class="fas fa-lightbulb text-4xl"></i>
                                </div>
                                <h4 class="text-slate-500 font-bold">Inicie sua busca</h4>
                                <p class="text-xs max-w-xs text-center mt-2">Use a busca rápida no topo para temas globais ou os filtros ao lado para navegação por nível.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;

        // Pré-carregamento do banco global em segundo plano
        this.garantirBancoCompleto();

        // Auto-seleção se vier de um contexto específico
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
                
                // Lógica fuzzy para tentar encontrar a série certa
                Array.from(anoSelect.options).forEach(opt => {
                    const optVal = opt.value.toLowerCase();
                    if (optVal === "") return;
                    
                    const numSerie = serieLimpa.match(/\d+/); // Pega números (6, 7, 1...)
                    const numOpt = optVal.match(/\d+/);
                    
                    if (nivelSelect.value === "Educação Infantil") {
                        if (serieLimpa.includes(optVal) || optVal.includes(serieLimpa)) melhorMatch = opt.value;
                    } else {
                        // Compara apenas o primeiro dígito encontrado
                        if (numSerie && numOpt && numSerie[0] === numOpt[0]) melhorMatch = opt.value;
                    }
                });
                
                if (melhorMatch) anoSelect.value = melhorMatch;
            }
            this.pesquisar();
        }
    },

    /**
     * Executa a busca em todo o banco de dados carregado.
     * @param {string} valor - Termo de busca.
     */
    async executarBuscaRapida(valor) {
        const loadingIcon = document.getElementById('loading-global');

        if (valor.length < 3) {
            if (loadingIcon) loadingIcon.classList.add('hidden');
            return;
        }

        if (loadingIcon) loadingIcon.classList.remove('hidden');

        // Garante que temos todos os dados antes de filtrar
        await this.garantirBancoCompleto();

        const normalizar = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
        const termo = normalizar(valor);

        // Busca otimizada nos campos principais
        const resultados = this.bancoCompleto.filter(h =>
            normalizar(h.codigo).includes(termo) ||
            normalizar(h.descricao).includes(termo) ||
            normalizar(h.componente).includes(termo) ||
            (h.objeto_conhecimento && normalizar(h.objeto_conhecimento).includes(termo))
        ).slice(0, 100); // Limite de segurança para renderização

        if (loadingIcon) loadingIcon.classList.add('hidden');
        this.renderCards(resultados);
    },

    /**
     * Carrega todos os arquivos JSON da BNCC em memória (Cache Global).
     */
    async garantirBancoCompleto() {
        if (this.bancoCompleto.length > 0 || this.estaCarregandoBanco) return;

        this.estaCarregandoBanco = true;
        try {
            const niveis = ["Educação Infantil", "Ensino Fundamental", "Ensino Médio"];
            const arquivos = ["bncc_infantil.json", "bncc_fundamental.json", "bncc_medio.json"];

            const promises = arquivos.map(async (arq, i) => {
                const res = await fetch(`./assets/BNCC/${arq}`);
                const json = await res.json();
                this.dataCache[niveis[i]] = json; // Salva no cache por nível
                return this._normalizarDados(json, niveis[i]);
            });

            const arrays = await Promise.all(promises);
            this.bancoCompleto = arrays.flat();
            console.log("🚀 BNCC Global carregada com sucesso.");
        } catch (e) {
            console.error("Erro ao carregar banco global BNCC", e);
        } finally {
            this.estaCarregandoBanco = false;
        }
    },

    toggleFiltrosMobile() {
        const sidebar = document.getElementById('bncc-sidebar');
        if (!sidebar) return;
        this.filtrosVisiveisMobile = !this.filtrosVisiveisMobile;
        sidebar.classList.toggle('hidden', !this.filtrosVisiveisMobile);
        sidebar.classList.toggle('block', this.filtrosVisiveisMobile);
    },

    limparFiltros() {
        const nivelEl = document.getElementById('bncc-nivel');
        const buscaEl = document.getElementById('bncc-busca-global');
        const resContainer = document.getElementById('bncc-resultados');

        if (nivelEl) nivelEl.value = "";
        if (buscaEl) buscaEl.value = "";
        
        this.updateFiltros("");
        
        if (resContainer) {
            resContainer.innerHTML = `
                <div class="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <i class="fas fa-search text-4xl mb-4"></i>
                    <p>Filtros limpos.</p>
                </div>
            `;
        }
    },

    async updateFiltros(nivel) {
        const compSelect = document.getElementById('bncc-componente');
        const eixoSelect = document.getElementById('bncc-eixo');
        const anoSelect = document.getElementById('bncc-ano');

        if (!compSelect || !eixoSelect || !anoSelect) return;

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

        let arquivo = nivel === "Educação Infantil" ? "bncc_infantil.json" :
            nivel === "Ensino Fundamental" ? "bncc_fundamental.json" : "bncc_medio.json";

        let anos = nivel === "Educação Infantil" ? ["Bebês", "Crianças bem pequenas", "Crianças pequenas"] :
            nivel === "Ensino Fundamental" ? ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano", "6º Ano", "7º Ano", "8º Ano", "9º Ano"] :
                ["1ª Série", "2ª Série", "3ª Série"];

        if (!this.dataCache[nivel]) {
            try {
                const response = await fetch(`./assets/BNCC/${arquivo}`);
                this.dataCache[nivel] = await response.json();
            } catch (e) {
                compSelect.innerHTML = '<option value="">Erro ao carregar</option>';
                return;
            }
        }

        const dados = this.dataCache[nivel];
        const list = nivel === "Educação Infantil" ? (dados.campos_experiencia || dados.componentes || []) : (dados.componentes || []);
        const listaComponentes = list.map(c => c.nome);

        compSelect.innerHTML = `<option value="">Todos</option>` + listaComponentes.map(c => `<option value="${window.escapeHTML(c)}">${window.escapeHTML(c)}</option>`).join('');
        compSelect.disabled = false;
        compSelect.classList.replace('bg-slate-50', 'bg-white');

        anoSelect.innerHTML = `<option value="">Todos</option>` + anos.map(a => `<option value="${window.escapeHTML(a)}">${window.escapeHTML(a)}</option>`).join('');
        anoSelect.disabled = false;
        anoSelect.classList.replace('bg-slate-50', 'bg-white');
    },

    updateEixos() {
        const nivel = document.getElementById('bncc-nivel')?.value;
        const componenteSelecionado = document.getElementById('bncc-componente')?.value;
        const eixoSelect = document.getElementById('bncc-eixo');

        if (!eixoSelect) return;

        eixoSelect.innerHTML = '<option value="">Todos os Eixos</option>';

        if (!componenteSelecionado || componenteSelecionado === "Todos" || !this.dataCache[nivel]) {
            eixoSelect.disabled = true;
            eixoSelect.classList.add('bg-slate-50');
            return;
        }

        const dados = this.dataCache[nivel];
        let eixosEncontrados = [];
        
        if (nivel !== "Educação Infantil") {
            const compObj = dados.componentes.find(c => c.nome === componenteSelecionado);
            if (compObj) {
                const listaEixos = compObj.unidades_tematicas || compObj.eixos_tematicos || compObj.areas_conhecimento || [];
                eixosEncontrados = listaEixos.map(e => e.nome);
            }
        }

        if (eixosEncontrados.length > 0) {
            eixoSelect.innerHTML = `<option value="">Todos os Eixos</option>` + eixosEncontrados.map(e => `<option value="${window.escapeHTML(e)}">${window.escapeHTML(e)}</option>`).join('');
            eixoSelect.disabled = false;
            eixoSelect.classList.replace('bg-slate-50', 'bg-white');
        } else {
            eixoSelect.disabled = true;
        }
    },

    async pesquisar() {
        const nivel = document.getElementById('bncc-nivel')?.value;
        const componenteSelecionado = document.getElementById('bncc-componente')?.value;
        const eixoSelecionado = document.getElementById('bncc-eixo')?.value;
        const anoSelecionado = document.getElementById('bncc-ano')?.value;
        const resContainer = document.getElementById('bncc-resultados');

        if (!nivel) return Toast.show("Selecione o Nível de Ensino.", "warning");

        if (resContainer) {
            resContainer.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-primary py-10"><i class="fas fa-circle-notch fa-spin text-4xl mb-3"></i><p>Processando filtros...</p></div>`;
        }

        if (this.filtrosVisiveisMobile) this.toggleFiltrosMobile();

        // Timeout para permitir que a UI desenhe o loader antes de processar
        setTimeout(() => {
            const dadosBrutos = this.dataCache[nivel];
            const listaHabilidades = this._normalizarDados(dadosBrutos, nivel);
            
            const resultados = listaHabilidades.filter(item => {
                if (componenteSelecionado && componenteSelecionado !== "Todos" && item.componente !== componenteSelecionado) return false;
                if (eixoSelecionado && eixoSelecionado !== "Todos os Eixos" && eixoSelecionado !== "" && item.eixo !== eixoSelecionado) return false;

                if (anoSelecionado && anoSelecionado !== "Todos") {
                    const anoItem = (item.ano || "").toLowerCase();
                    const anoFiltro = anoSelecionado.toLowerCase();
                    
                    // Tratamento especial para Ensino Médio que agrupa séries (1, 2 e 3)
                    if (nivel === "Ensino Médio" && (anoItem.includes("1ª, 2ª e 3ª") || anoItem.includes("1, 2 e 3"))) return true;
                    
                    if (!anoItem.includes(anoFiltro) && !anoFiltro.includes(anoItem)) return false;
                }
                return true;
            });

            // Ordenação Alfanumérica Natural (ex: EF01 vem antes de EF10)
            resultados.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' }));
            
            this.renderCards(resultados);
        }, 50);
    },

    /**
     * Normaliza os dados heterogêneos dos JSONs em uma estrutura plana única.
     * @private
     */
    _normalizarDados(json, nivel) {
        let lista = [];
        if (!json) return lista;

        if (nivel === "Educação Infantil") {
            const campos = json.campos_experiencia || json.componentes || [];
            campos.forEach(campo => {
                if (campo.faixas_etarias) {
                    campo.faixas_etarias.forEach(faixa => {
                        faixa.objetivos.forEach(obj => {
                            lista.push({
                                codigo: obj.codigo, descricao: obj.descricao, componente: campo.nome,
                                eixo: "Campo de Experiência", ano: faixa.grupo, objeto_conhecimento: null,
                                cor: model.coresComponentes[campo.nome]
                            });
                        });
                    });
                }
            });
        }
        else if (nivel === "Ensino Fundamental") {
            (json.componentes || []).forEach(comp => {
                (comp.unidades_tematicas || comp.eixos_tematicos || []).forEach(grupo => {
                    (grupo.anos || []).forEach(anoObj => {
                        (anoObj.habilidades || []).forEach(hab => {
                            lista.push({
                                codigo: hab.codigo, descricao: hab.descricao, componente: comp.nome,
                                eixo: grupo.nome, ano: anoObj.ano, objeto_conhecimento: hab.objetos_de_conhecimento,
                                cor: model.coresComponentes[comp.nome]
                            });
                        });
                    });
                });
            });
        }
        else if (nivel === "Ensino Médio") {
            (json.componentes || []).forEach(comp => {
                (comp.areas_conhecimento || []).forEach(area => {
                    (area.anos || []).forEach(anoObj => {
                        (anoObj.habilidades || []).forEach(hab => {
                            lista.push({
                                codigo: hab.codigo, descricao: hab.descricao, componente: comp.nome,
                                eixo: area.nome, ano: anoObj.ano, objeto_conhecimento: hab.objetos_de_conhecimento,
                                cor: model.coresComponentes[comp.nome] || model.coresComponentes[area.nome]
                            });
                        });
                    });
                });
            });
        }
        return lista;
    },

    renderCards(data) {
        const container = document.getElementById('bncc-resultados');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-slate-400 py-20"><i class="far fa-folder-open text-4xl mb-3"></i><p>Nenhuma habilidade encontrada.</p></div>`;
            return;
        }

        container.innerHTML = data.map(item => {
            const cor = item.cor || '#64748b';
            
            // Sanitização manual para JSON string
            const objSafe = JSON.stringify({
                codigo: item.codigo,
                descricao: item.descricao,
                componente: item.componente,
                objeto: item.objeto_conhecimento,
                cor: item.cor
            }).replace(/'/g, "&#39;").replace(/"/g, "&quot;");

            let btnAcao = this.selecionarCallback ?
                `<button onclick='bnccView.executarSelecao(${objSafe}, this)' 
                        class="shrink-0 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 px-4 py-2 rounded-lg transition-all text-xs font-bold flex flex-col items-center gap-1 min-w-[70px]">
                    <i class="fas fa-plus text-sm"></i><span class="text-[9px] uppercase">Usar</span>
                </button>` :
                `<button onclick="bnccView.copiarParaAreaTransferencia('${window.escapeHTML(item.codigo)}', '${window.escapeHTML(item.descricao).replace(/'/g, "\\'")}')" 
                    class="shrink-0 text-slate-400 hover:text-primary p-2 transition-colors hover:bg-slate-50 rounded-xl" title="Copiar habilidade">
                    <i class="far fa-copy text-xl"></i>
                </button>`;

            return `
                <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 border-l-[6px] hover:border-slate-200 hover:shadow-md transition-all flex flex-col animate-slide-up" style="border-left-color: ${cor} !important;">
                    <div class="flex justify-between items-start gap-4">
                        <div class="flex-1">
                            <div class="flex items-center flex-wrap gap-2 mb-3">
                                <span class="text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest" style="background-color: ${cor} !important;">${window.escapeHTML(item.codigo)}</span>
                                <span class="text-slate-400 text-[9px] font-bold uppercase tracking-wider border border-slate-100 px-1.5 rounded">${window.escapeHTML(item.componente)}</span>
                                <span class="text-slate-400 text-[9px] font-bold uppercase tracking-wider border border-slate-100 px-1.5 rounded">${window.escapeHTML(item.ano)}</span>
                                ${item.eixo && item.eixo !== item.componente ? `<span class="text-slate-500 text-[9px] font-bold bg-slate-50 px-2 py-0.5 rounded uppercase">${window.escapeHTML(item.eixo)}</span>` : ''}
                            </div>
                            <p class="text-slate-700 text-sm leading-relaxed font-medium">${window.escapeHTML(item.descricao)}</p>
                            ${item.objeto_conhecimento ? `<div class="mt-3 pt-3 border-t border-slate-50 flex items-start gap-2"><i class="fas fa-lightbulb text-yellow-500 text-[10px] mt-1"></i><span class="text-xs text-slate-500 font-medium italic">${window.escapeHTML(item.objeto_conhecimento)}</span></div>` : ''}
                        </div>
                        <div class="flex flex-col justify-center pl-2 border-l border-slate-50">${btnAcao}</div>
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
                btnElement.innerHTML = `<i class="fas fa-check text-lg"></i>`;
                btnElement.classList.replace('bg-emerald-50', 'bg-emerald-500');
                btnElement.classList.replace('text-emerald-600', 'text-white');
                setTimeout(() => {
                    btnElement.innerHTML = originalHTML;
                    btnElement.classList.replace('bg-emerald-500', 'bg-emerald-50');
                    btnElement.classList.replace('text-white', 'text-emerald-600');
                }, 1500);
            }
        }
    },

    copiarParaAreaTransferencia(codigo, descricao) {
        const textoCompleto = `${codigo} - ${descricao}`;
        navigator.clipboard.writeText(textoCompleto).then(() => {
            Toast.show(`Código ${codigo} copiado!`, "success");
        }).catch(() => {
            Toast.show(`Erro ao copiar ${codigo}.`, "error");
        });
    },

    /**
     * Filtra os cards visíveis na tela (Busca local rápida).
     */
    filterHabilidades(termo) {
        const cards = document.querySelectorAll('.bncc-card-habilidade');
        const termoLimpo = termo ? termo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

        cards.forEach(card => {
            // Verifica se o texto interno do card contém o termo
            const texto = card.innerText ? card.innerText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
            
            if (texto.includes(termoLimpo)) {
                card.style.display = 'flex'; // ou 'block', dependendo do layout original
            } else {
                card.style.display = 'none';
            }
        });
    }
};