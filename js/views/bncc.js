import { model } from '../model.js';
import { Toast } from '../components/toast.js';
import { EventDelegator } from '../utils/eventDelegator.js';

export const bnccView = {
    selecionarCallback: null,
    dataCache: {},
    filtrosVisiveisMobile: false,
    bancoCompleto: [],
    estaCarregandoBanco: false,
    _cleanupDelegators: [],

    destroy() {
        if (Array.isArray(this._cleanupDelegators)) {
            this._cleanupDelegators.forEach(cleanup => {
                if (typeof cleanup === 'function') cleanup();
            });
            this._cleanupDelegators = [];
        }
    },

    onLeave() {
        this.destroy();
    },

    async render(container, preNivel = null, preSerie = null, callbackExterno = null) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        this.selecionarCallback = callbackExterno;
        this.filtrosVisiveisMobile = false;

        // Limpa ouvintes anteriores
        this.destroy();

        const html = `
            <div class="view-shell fade-in">
                <header class="view-header">
                    <div>
                        <h2 class="view-header__title">
                            <i class="fas fa-book-open" style="color: var(--color-primary);"></i> Base Nacional Comum Curricular (BNCC)
                        </h2>
                        <p class="view-header__subtitle">
                            ${this.selecionarCallback ? '<span style="color: #059669; font-weight: 800;">Modo Seleção:</span> Clique em uma habilidade para vinculá-la.' : 'Consulte códigos, competências e habilidades curriculares de toda a Educação Básica.'}
                        </p>
                    </div>

                    <div class="view-header__actions" style="flex: 1 1 420px; max-width: 420px; margin-left: auto;">
                        <div style="position: relative; width: 100%;">
                            <i class="fas fa-search" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--color-slate-400);"></i>
                            <input type="text" id="bncc-busca-global" 
                                   data-action="busca-global-bncc"
                                   placeholder="Busca global (ex: Frações, Verbos, EF06...)" 
                                   class="form-input" style="padding-left: 2.75rem;">
                            <div id="loading-global" style="position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); display: none;">
                                <i class="fas fa-circle-notch fa-spin" style="color: var(--color-primary); font-size: 0.875rem;"></i>
                            </div>
                        </div>
                    </div>
                </header>

                <!-- SIDE-BY-SIDE MAIN GRID (FILTERS SIDEBAR + RESULTS PANEL) -->
                <div class="layout-2col-responsive">
                    
                    <!-- LEFT COLUMN: ADVANCED FILTERS (320px) -->
                    <div class="card" style="padding: var(--spacing-5); display: flex; flex-direction: column; gap: var(--spacing-4); width: 100%; box-sizing: border-box;">
                        <h3 style="font-size: 1rem; font-weight: 800; color: var(--color-slate-800); display: flex; align-items: center; gap: 0.5rem; padding-bottom: var(--spacing-2); border-bottom: 1px solid var(--color-slate-100);">
                            <i class="fas fa-filter" style="color: var(--color-primary);"></i> Filtros por Nível
                        </h3>

                        <div>
                            <label for="bncc-nivel" class="form-label">Nível de Ensino</label>
                            <select id="bncc-nivel" data-action="nivel-bncc" class="form-select">
                                <option value="">Selecione o nível...</option>
                                <option value="Educação Infantil">Educação Infantil</option>
                                <option value="Ensino Fundamental">Ensino Fundamental</option>
                                <option value="Ensino Médio">Ensino Médio</option>
                            </select>
                        </div>

                        <div>
                            <label for="bncc-componente" class="form-label">Componente / Campo</label>
                            <select id="bncc-componente" data-action="componente-bncc" disabled class="form-select">
                                <option value="">Aguardando nível...</option>
                            </select>
                        </div>

                        <div>
                            <label for="bncc-eixo" class="form-label">Eixo / Unidade Temática</label>
                            <select id="bncc-eixo" disabled class="form-select">
                                <option value="">Todos os Eixos</option>
                            </select>
                        </div>

                        <div>
                            <label for="bncc-ano" class="form-label">Ano / Faixa Etária</label>
                            <select id="bncc-ano" disabled class="form-select">
                                <option value="">Todos</option>
                            </select>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: var(--spacing-2); margin-top: var(--spacing-2); padding-top: var(--spacing-4); border-top: 1px solid var(--color-slate-100);">
                            <button type="button" data-action="pesquisar-bncc" class="btn-primary" style="width: 100%; justify-content: center; padding: 0.75rem;">
                                <i class="fas fa-search"></i> <span>Aplicar Filtros</span>
                            </button>
                            <button type="button" data-action="limpar-filtros-bncc" class="btn-secondary" style="width: 100%; justify-content: center; padding: 0.5rem; font-size: 0.75rem;">
                                <span>Limpar Filtros</span>
                            </button>
                        </div>
                    </div>

                    <!-- RIGHT COLUMN: RESULTS PANE -->
                    <div style="width: 100%; min-width: 0;">
                        <div id="bncc-resultados" class="custom-scrollbar" style="display: flex; flex-direction: column; gap: var(--spacing-4); min-height: 400px;">
                            <div class="card" style="padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 2px dashed var(--color-slate-200);">
                                <div style="width: 4rem; height: 4rem; border-radius: var(--radius-full); background-color: var(--color-primary-light); color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 1rem;">
                                    <i class="fas fa-lightbulb"></i>
                                </div>
                                <h4 style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-800); margin-bottom: 0.25rem;">Inicie sua busca na BNCC</h4>
                                <p style="font-size: 0.875rem; color: var(--color-slate-500); max-width: 360px;">Digite um termo no campo de pesquisa acima ou selecione o nível e componente ao lado.</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        `;

        container.innerHTML = html;

        // Registro centralizado de eventos via EventDelegator
        this._cleanupDelegators.push(
            EventDelegator.bind(container, {
                'pesquisar-bncc': () => this.pesquisar(),
                'limpar-filtros-bncc': () => this.limparFiltros(),
                'copiar-bncc': (e, target) => {
                    const codigo = target.getAttribute('data-codigo');
                    const descricao = target.getAttribute('data-descricao');
                    if (codigo && descricao) this.copiarParaAreaTransferencia(codigo, descricao);
                },
                'vincular-bncc': (e, target) => {
                    const rawPayload = target.getAttribute('data-payload');
                    if (rawPayload) {
                        try {
                            const obj = JSON.parse(rawPayload);
                            this.executarSelecao(obj, target);
                        } catch (err) { }
                    }
                }
            }, 'click')
        );

        this._cleanupDelegators.push(
            EventDelegator.bind(container, {
                'nivel-bncc': (e, target) => this.updateFiltros(target.value),
                'componente-bncc': () => this.updateEixos()
            }, 'change')
        );

        this._cleanupDelegators.push(
            EventDelegator.bind(container, {
                'busca-global-bncc': (e, target) => this.executarBuscaRapida(target.value)
            }, 'input')
        );

        // Carga diferida do banco completo ocorre sob demanda na busca global
        // (removido chamada ansiosathis.garantirBancoCompleto() para economizar memória)

        if (preNivel) {
            const nivelSelect = document.getElementById('bncc-nivel');
            if (nivelSelect) {
                if (preNivel.includes("Fundamental")) nivelSelect.value = "Ensino Fundamental";
                else if (preNivel.includes("Médio") || preNivel.includes("Medio")) nivelSelect.value = "Ensino Médio";
                else if (preNivel.includes("Infantil")) nivelSelect.value = "Educação Infantil";

                await this.updateFiltros(nivelSelect.value);

                if (preSerie) {
                    const anoSelect = document.getElementById('bncc-ano');
                    const serieLimpa = preSerie.toLowerCase();
                    let melhorMatch = "";

                    if (anoSelect) {
                        Array.from(anoSelect.options).forEach(opt => {
                            const optVal = opt.value.toLowerCase();
                            if (optVal === "") return;

                            const numSerie = serieLimpa.match(/\d+/);
                            const numOpt = optVal.match(/\d+/);

                            if (nivelSelect.value === "Educação Infantil") {
                                if (serieLimpa.includes(optVal) || optVal.includes(serieLimpa)) melhorMatch = opt.value;
                            } else {
                                if (numSerie && numOpt && numSerie[0] === numOpt[0]) melhorMatch = opt.value;
                            }
                        });

                        if (melhorMatch) anoSelect.value = melhorMatch;
                    }
                }
                this.pesquisar();
            }
        }
    },

    async executarBuscaRapida(valor) {
        const loadingIcon = document.getElementById('loading-global');
        if (valor.length < 3) {
            if (loadingIcon) loadingIcon.style.display = 'none';
            return;
        }
        if (loadingIcon) loadingIcon.style.display = 'block';

        await this.garantirBancoCompleto();
        const normalizar = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
        const termo = normalizar(valor);

        const resultados = this.bancoCompleto.filter(h =>
            normalizar(h.codigo).includes(termo) ||
            normalizar(h.descricao).includes(termo) ||
            normalizar(h.componente).includes(termo) ||
            (h.objeto_conhecimento && normalizar(h.objeto_conhecimento).includes(termo))
        ).slice(0, 100);

        if (loadingIcon) loadingIcon.style.display = 'none';
        this.renderCards(resultados);
    },

    async garantirBancoCompleto() {
        if (this.bancoCompleto.length > 0 || this.estaCarregandoBanco) return;
        this.estaCarregandoBanco = true;
        try {
            const niveis = ["Educação Infantil", "Ensino Fundamental", "Ensino Médio"];
            const arquivos = ["bncc_infantil.json", "bncc_fundamental.json", "bncc_medio.json"];
            const arrayNiveis = [];
            for (let i = 0; i < niveis.length; i++) {
                const niv = niveis[i];
                if (!this.dataCache[niv]) {
                    const res = await fetch(`./assets/BNCC/${arquivos[i]}`);
                    this.dataCache[niv] = await res.json();
                }
                arrayNiveis.push(this._normalizarDados(this.dataCache[niv], niv));
            }
            this.bancoCompleto = arrayNiveis.flat();
        } catch (e) {
            console.error("Erro ao carregar banco global BNCC", e);
        } finally {
            this.estaCarregandoBanco = false;
        }
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
                <div class="card" style="padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 2px dashed var(--color-slate-200);">
                    <i class="fas fa-search" style="font-size: 2.5rem; color: var(--color-slate-300); margin-bottom: 1rem;"></i>
                    <p style="color: var(--color-slate-500);">Filtros limpos. Selecione uma opção para buscar.</p>
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

        anoSelect.innerHTML = `<option value="">Todos</option>` + anos.map(a => `<option value="${window.escapeHTML(a)}">${window.escapeHTML(a)}</option>`).join('');
        anoSelect.disabled = false;
    },

    updateEixos() {
        const nivel = document.getElementById('bncc-nivel')?.value;
        const componenteSelecionado = document.getElementById('bncc-componente')?.value;
        const eixoSelect = document.getElementById('bncc-eixo');
        if (!eixoSelect) return;

        eixoSelect.innerHTML = '<option value="">Todos os Eixos</option>';
        if (!componenteSelecionado || componenteSelecionado === "Todos" || !this.dataCache[nivel]) {
            eixoSelect.disabled = true;
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
            resContainer.innerHTML = `<div class="card" style="padding: 3rem; text-align: center; color: var(--color-primary);"><i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; margin-bottom: 0.5rem;"></i><p>Processando filtros...</p></div>`;
        }

        setTimeout(() => {
            const dadosBrutos = this.dataCache[nivel];
            const listaHabilidades = this._normalizarDados(dadosBrutos, nivel);

            const resultados = listaHabilidades.filter(item => {
                if (componenteSelecionado && componenteSelecionado !== "Todos" && item.componente !== componenteSelecionado) return false;
                if (eixoSelecionado && eixoSelecionado !== "Todos os Eixos" && eixoSelecionado !== "" && item.eixo !== eixoSelecionado) return false;
                if (anoSelecionado && anoSelecionado !== "Todos") {
                    const anoItem = (item.ano || "").toLowerCase();
                    const anoFiltro = anoSelecionado.toLowerCase();

                    if (nivel === "Ensino Médio" && (anoItem.includes("1ª, 2ª e 3ª") || anoItem.includes("1, 2 e 3"))) return true;
                    if (!anoItem.includes(anoFiltro) && !anoFiltro.includes(anoItem)) return false;
                }
                return true;
            });

            resultados.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' }));
            this.renderCards(resultados);
        }, 50);
    },

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
        } else if (nivel === "Ensino Fundamental") {
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
        } else if (nivel === "Ensino Médio") {
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

    /**
     * Renderiza os cards de habilidades utilizando DocumentFragment para otimização do DOM e elimina Layout Thrashing.
     */
    renderCards(data) {
        const container = document.getElementById('bncc-resultados');
        if (!container) return;

        container.innerHTML = '';

        if (data.length === 0) {
            container.innerHTML = `
                <div class="card" style="padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 2px dashed var(--color-slate-200);">
                    <i class="far fa-folder-open" style="font-size: 2.5rem; color: var(--color-slate-300); margin-bottom: 1rem;"></i>
                    <p style="color: var(--color-slate-500);">Nenhuma habilidade encontrada para os filtros selecionados.</p>
                </div>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();

        data.forEach(item => {
            const cor = item.cor || '#64748b';
            const payloadStr = JSON.stringify({
                codigo: item.codigo,
                descricao: item.descricao,
                componente: item.componente,
                objeto: item.objeto_conhecimento,
                cor: item.cor
            });

            const card = document.createElement('div');
            card.className = 'card';
            card.style.cssText = `padding: var(--spacing-4); border-left: 5px solid ${cor}; display: flex; flex-direction: column; gap: var(--spacing-3); transition: all var(--transition-fast);`;

            let btnAcaoHTML = this.selecionarCallback ?
                `<button type="button" data-action="vincular-bncc" data-payload='${window.escapeHTML(payloadStr)}' 
                         class="btn-primary" style="background-color: #059669; padding: 0.5rem 1rem; font-size: 0.75rem; border-radius: var(--radius-lg); white-space: nowrap;">
                    <i class="fas fa-plus"></i> <span>Vincular</span>
                </button>` :
                `<button type="button" data-action="copiar-bncc" data-codigo="${window.escapeHTML(item.codigo)}" data-descricao="${window.escapeHTML(item.descricao)}" 
                         class="btn-icon" title="Copiar código e descrição">
                    <i class="far fa-copy" style="font-size: 1rem;"></i>
                </button>`;

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--spacing-3);">
                    <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.375rem;">
                        <span style="background-color: ${cor}; color: white; font-size: 0.6875rem; font-weight: 900; padding: 0.125rem 0.5rem; border-radius: var(--radius-sm); letter-spacing: 0.05em; text-transform: uppercase;">
                            ${window.escapeHTML(item.codigo)}
                        </span>
                        <span class="badge" style="background-color: var(--color-slate-100); color: var(--color-slate-600); font-weight: 700;">
                            ${window.escapeHTML(item.componente)}
                        </span>
                        <span class="badge" style="background-color: var(--color-slate-100); color: var(--color-slate-600); font-weight: 700;">
                            ${window.escapeHTML(item.ano)}
                        </span>
                        ${item.eixo && item.eixo !== item.componente ? `
                            <span class="badge" style="background-color: var(--color-primary-light); color: var(--color-primary); font-weight: 700;">
                                ${window.escapeHTML(item.eixo)}
                            </span>
                        ` : ''}
                    </div>

                    <div style="flex-shrink: 0;">
                        ${btnAcaoHTML}
                    </div>
                </div>

                <p style="font-size: 0.875rem; color: var(--color-slate-700); line-height: 1.6; font-weight: 500; margin: 0;">
                    ${window.escapeHTML(item.descricao)}
                </p>

                ${item.objeto_conhecimento ? `
                    <div style="padding-top: var(--spacing-2); border-top: 1px solid var(--color-slate-100); display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.75rem; color: var(--color-slate-500);">
                        <i class="fas fa-lightbulb" style="color: #f59e0b; margin-top: 0.125rem;"></i>
                        <span><em>Objeto de Conhecimento:</em> ${window.escapeHTML(item.objeto_conhecimento)}</span>
                    </div>
                ` : ''}
            `;

            fragment.appendChild(card);
        });

        container.appendChild(fragment);
    },

    executarSelecao(obj, btnElement) {
        if (this.selecionarCallback) {
            this.selecionarCallback(obj);
            if (btnElement) {
                const originalHTML = btnElement.innerHTML;
                btnElement.innerHTML = `<i class="fas fa-check"></i> Vinculado`;
                btnElement.style.backgroundColor = '#10b981';
                setTimeout(() => {
                    btnElement.innerHTML = originalHTML;
                    btnElement.style.backgroundColor = '#059669';
                }, 1200);
            }
        }
    },

    copiarParaAreaTransferencia(codigo, descricao) {
        const textoCompleto = `${codigo} - ${descricao}`;
        navigator.clipboard.writeText(textoCompleto).then(() => {
            Toast.show(`Habilidade ${codigo} copiada!`, "success");
        }).catch(() => {
            Toast.show(`Erro ao copiar ${codigo}.`, "error");
        });
    }
};