import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';
import { EventDelegator } from '../utils/eventDelegator.js';

export const bimestralizacaoView = {
    dataCache: null,
    isLoading: false,
    disciplinaSelecionada: 'Língua Portuguesa',
    anoSelecionado: '6º Ano',
    bimestreSelecionado: '', // Vazio = Todos os Bimestres
    termoBusca: '',
    selecionarCallback: null,
    _cleanupDelegators: null,
    _itensAtuais: [],

    disciplinasDisponiveis: [
        'Língua Portuguesa',
        'Matemática',
        'Ciências',
        'História',
        'Geografia',
        'Arte',
        'Educação Física',
        'Língua Inglesa',
        'Ensino Religioso'
    ],

    anosDisponiveis: [
        'Berçário I',
        'Berçário II',
        'Maternal I',
        'Maternal II',
        'Jardim I',
        'Jardim II',
        '1º Ano',
        '2º Ano',
        '3º Ano',
        '4º Ano',
        '5º Ano',
        '6º Ano',
        '7º Ano',
        '8º Ano',
        '9º Ano',
        '1ª Série (EM)',
        '2ª Série (EM)',
        '3ª Série (EM)'
    ],

    bimestresDisponiveis: [
        { valor: '', label: 'Todos os Bimestres' },
        { valor: '1', label: '1º Bimestre' },
        { valor: '2', label: '2º Bimestre' },
        { valor: '3', label: '3º Bimestre' },
        { valor: '4', label: '4º Bimestre' }
    ],

    destroy() {
        if (typeof this._cleanupDelegators === 'function') {
            this._cleanupDelegators();
            this._cleanupDelegators = null;
        }
    },

    onLeave() {
        this.destroy();
    },

    async carregarDados() {
        if (this.dataCache) return this.dataCache;
        this.isLoading = true;
        try {
            const resp = await fetch('./assets/BimestralizacaoFormosa/bimestralizacao_formosa.json');
            if (!resp.ok) throw new Error(`HTTP ${resp.status} ao carregar bimestralização`);
            this.dataCache = await resp.json();
            return this.dataCache;
        } catch (e) {
            console.error("❌ Erro ao carregar dados de Bimestralização:", e);
            Toast.show("Erro ao carregar dados de Bimestralização.", "error");
            return null;
        } finally {
            this.isLoading = false;
        }
    },

    async render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        this.destroy();

        const corAtual = model.coresComponentes[this.disciplinaSelecionada] || '#2563eb';
        await this.carregarDados();

        // Calcular estatísticas rápidas
        let totalHabilidadesDisciplinaAno = 0;
        let totalHabilidadesBimestreAtual = 0;

        if (this.dataCache) {
            ['1', '2', '3', '4'].forEach(bNum => {
                const bData = this.dataCache[bNum]?.[this.anoSelecionado]?.[this.disciplinaSelecionada] || [];
                bData.forEach(bloco => {
                    const habs = this._extrairHabilidades(bloco);
                    totalHabilidadesDisciplinaAno += habs.length;
                    if (this.bimestreSelecionado === bNum || !this.bimestreSelecionado) {
                        totalHabilidadesBimestreAtual += habs.length;
                    }
                });
            });
        }

        const labelBimestreAtual = this.bimestresDisponiveis.find(b => b.valor === this.bimestreSelecionado)?.label || 'Todos os Bimestres';

        container.innerHTML = `
            <div class="fade-in animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: 6rem;">
                
                <!-- TOP HEADER & CONTROLS TOOLBAR -->
                <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: var(--spacing-4); border-bottom: 1px solid var(--color-slate-200); padding-bottom: var(--spacing-6); flex-wrap: wrap;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <h2 style="font-size: 1.875rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em;">
                                Bimestralizações (Formosa)
                            </h2>
                            <span class="badge" style="background-color: ${corAtual}; color: #ffffff; font-weight: 800; font-size: 0.75rem; padding: 0.25rem 0.625rem; border-radius: var(--radius-full);">
                                Matriz Curricular
                            </span>
                        </div>
                        <p style="color: var(--color-slate-500); margin-top: 0.25rem; font-size: 0.9375rem;">
                            Consulte as habilidades, eixos temáticos e conteúdos estruturados por bimestre para cada ano letivo.
                        </p>
                    </div>

                    <div style="display: flex; align-items: center; gap: var(--spacing-2);">
                        <button type="button" data-action="ver-bncc" class="btn-secondary interactive-element" title="Consultar BNCC Nacional">
                            <i class="fas fa-book-open"></i> <span>Ver BNCC Geral</span>
                        </button>
                    </div>
                </div>

                <!-- CARDS DE RESUMO (STAT-GRID ESTILO DASHBOARD) -->
                <div class="stat-grid stat-grid--3">
                    
                    <!-- Card 1: Habilidades em Foco -->
                    <div class="stat-card stat-card--blue" style="border-left: 5px solid ${corAtual};">
                        <div class="stat-card__bg-icon" style="color: ${corAtual}; opacity: 0.12;">
                            <i class="fas fa-layer-group"></i>
                        </div>
                        <h3 class="stat-card__title">Habilidades em Foco</h3>
                        <div class="stat-card__content">
                            <div class="stat-card__value" id="stat-total-habs" style="color: var(--color-slate-800);">
                                ${totalHabilidadesBimestreAtual}
                            </div>
                            <p class="stat-card__desc">${labelBimestreAtual}</p>
                            <div class="stat-card__footer">
                                <span style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-500);">
                                    Total do ano: <strong>${totalHabilidadesDisciplinaAno}</strong> habilidades
                                </span>
                            </div>
                        </div>
                        <div class="stat-card__bar" style="background-color: ${corAtual};"></div>
                    </div>

                    <!-- Card 2: Disciplina / Componente -->
                    <div class="stat-card stat-card--emerald">
                        <div class="stat-card__bg-icon" style="color: #059669; opacity: 0.12;">
                            <i class="fas fa-book"></i>
                        </div>
                        <h3 class="stat-card__title">Disciplina Selecionada</h3>
                        <div class="stat-card__content">
                            <div class="stat-card__value" style="font-size: 1.35rem; font-weight: 800; color: var(--color-slate-800); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${window.escapeHTML(this.disciplinaSelecionada)}
                            </div>
                            <p class="stat-card__desc">${window.escapeHTML(this.anoSelecionado)}</p>
                            <div class="stat-card__footer">
                                <span style="font-size: 0.75rem; color: #059669; font-weight: 700; display: flex; align-items: center; gap: 0.25rem;">
                                    <i class="fas fa-check-circle"></i> Padrão Curricular Formosa
                                </span>
                            </div>
                        </div>
                        <div class="stat-card__bar" style="background-color: #059669;"></div>
                    </div>

                    <!-- Card 3: Recorte Pedagógico -->
                    <div class="stat-card stat-card--pink">
                        <div class="stat-card__bg-icon" style="color: #db2777; opacity: 0.12;">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                        <h3 class="stat-card__title">Organização Bimestral</h3>
                        <div class="stat-card__content">
                            <div class="stat-card__value" style="font-size: 1.35rem; font-weight: 800; color: var(--color-slate-800);">
                                4 Bimestres
                            </div>
                            <p class="stat-card__desc">Ensino Fundamental II</p>
                            <div class="stat-card__footer">
                                <span style="font-size: 0.75rem; font-weight: 700; color: #db2777;">
                                    ${this.bimestreSelecionado ? `Filtrando ${this.bimestreSelecionado}º Bimestre` : 'Visualizando Ano Completo'}
                                </span>
                            </div>
                        </div>
                        <div class="stat-card__bar" style="background-color: #db2777;"></div>
                    </div>

                </div>

                <!-- SUBMENU: TABS NO PADRÃO BANCO DE QUESTÕES (MODE-TOGGLE-GROUP) -->
                <div style="display: flex; flex-direction: column; gap: var(--spacing-4);">
                    
                    <div class="mode-toggle-group scrollable-tabs" style="max-width: 100%;">
                        ${this.bimestresDisponiveis.map(b => {
                            const isAtivo = b.valor === this.bimestreSelecionado;
                            return `
                                <button type="button" 
                                        data-action="set-bimestre"
                                        data-bimestre="${b.valor}"
                                        class="mode-toggle-btn interactive-element ${isAtivo ? 'mode-toggle-btn--active' : ''}">
                                    ${b.valor ? `<i class="fas fa-bookmark" style="margin-right: 0.375rem;"></i>` : `<i class="fas fa-list" style="margin-right: 0.375rem;"></i>`}
                                    ${b.label}
                                </button>
                            `;
                        }).join('')}
                    </div>

                    <!-- PAINEL DE FILTROS ELEGANTE (DYNAMIC-BOX / CARD) -->
                    <div class="card" style="padding: var(--spacing-6); border: 1px solid var(--color-slate-200); box-shadow: var(--shadow-sm); border-radius: var(--radius-2xl);">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--spacing-4); align-items: end;">
                            
                            <div>
                                <label class="form-label" style="font-weight: 700; color: var(--color-slate-700); font-size: 0.8125rem;">
                                    <i class="fas fa-book" style="color: ${corAtual}; margin-right: 0.25rem;"></i> Disciplina / Componente
                                </label>
                                <select id="bimestralizacao-disciplina" data-action="mudar-disciplina" class="form-select" style="padding: 0.625rem 0.875rem;">
                                    ${this.disciplinasDisponiveis.map(d => `
                                        <option value="${window.escapeHTML(d)}" ${d === this.disciplinaSelecionada ? 'selected' : ''}>
                                            ${window.escapeHTML(d)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>

                            <div>
                                <label class="form-label" style="font-weight: 700; color: var(--color-slate-700); font-size: 0.8125rem;">
                                    <i class="fas fa-graduation-cap" style="color: var(--color-primary); margin-right: 0.25rem;"></i> Ano / Série
                                </label>
                                <select id="bimestralizacao-ano" data-action="mudar-ano" class="form-select" style="padding: 0.625rem 0.875rem;">
                                    ${this.anosDisponiveis.map(a => `
                                        <option value="${window.escapeHTML(a)}" ${a === this.anoSelecionado ? 'selected' : ''}>
                                            ${window.escapeHTML(a)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>

                            <div>
                                <label class="form-label" style="font-weight: 700; color: var(--color-slate-700); font-size: 0.8125rem;">
                                    <i class="far fa-calendar-alt" style="color: var(--color-primary); margin-right: 0.25rem;"></i> Bimestre
                                </label>
                                <select id="bimestralizacao-bimestre" data-action="mudar-bimestre" class="form-select" style="padding: 0.625rem 0.875rem;">
                                    ${this.bimestresDisponiveis.map(b => `
                                        <option value="${b.valor}" ${b.valor === this.bimestreSelecionado ? 'selected' : ''}>
                                            ${b.label}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>

                        </div>

                        <!-- BARRA DE BUSCA COM ÍCONE -->
                        <div style="position: relative; margin-top: var(--spacing-4); padding-top: var(--spacing-4); border-top: 1px solid var(--color-slate-100);">
                            <i class="fas fa-search" style="position: absolute; left: 1rem; top: calc(50% + 0.5rem); transform: translateY(-50%); color: var(--color-slate-400); font-size: 0.875rem;"></i>
                            <input type="text" 
                                   id="bimestralizacao-busca" 
                                   placeholder="Pesquisar por código (ex: EF06LP01), tema, conteúdo ou palavras-chave..." 
                                   data-action="buscar-habilidades"
                                   value="${window.escapeHTML(this.termoBusca)}"
                                   class="form-input" 
                                   style="padding-left: 2.75rem; width: 100%;">
                        </div>
                    </div>

                </div>

                <!-- BARRA DE STATUS / CONTAGEM -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 var(--spacing-2); font-size: 0.875rem; color: var(--color-slate-500);">
                    <div id="bimestralizacao-contador">Filtrando dados...</div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="badge" style="background-color: ${corAtual}; color: white; font-weight: 700;">
                            ${window.escapeHTML(this.disciplinaSelecionada)}
                        </span>
                        <span class="badge" style="background-color: var(--color-slate-100); color: var(--color-slate-700); font-weight: 700;">
                            ${window.escapeHTML(this.anoSelecionado)}
                        </span>
                    </div>
                </div>

                <!-- CONTAINER DE CARDS COM PADDING CONFORTÁVEL -->
                <div id="bimestralizacao-resultados" style="display: flex; flex-direction: column; gap: var(--spacing-5);">
                    <div class="card" style="padding: 3.5rem 2rem; text-align: center; color: var(--color-primary);">
                        <i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; margin-bottom: 0.75rem;"></i>
                        <p style="font-weight: 600;">Carregando Matriz Curricular...</p>
                    </div>
                </div>

            </div>
        `;

        this._bindEventos(container);
        this.filtrarEPesquisar();
    },

    _bindEventos(container) {
        if (!container) return;

        const unbindClick = EventDelegator.bind(container, {
            'ver-bncc': () => controller.navigate('bncc'),
            'set-bimestre': (e, target) => {
                const b = target.getAttribute('data-bimestre') || '';
                this.setBimestre(b);
            },
            'limpar-filtros': () => this.limparFiltros(),
            'copiar-habilidade': (e, target) => {
                const codigo = target.getAttribute('data-codigo') || '';
                const descricao = target.getAttribute('data-descricao') || '';
                this.copiarParaAreaTransferencia(codigo, descricao);
            },
            'vincular-habilidade': (e, target) => {
                const index = parseInt(target.getAttribute('data-index'), 10);
                const item = this._itensAtuais[index];
                if (item) this.executarSelecao(item, target);
            }
        }, 'click');

        const unbindChange = EventDelegator.bind(container, {
            'mudar-disciplina': (e, target) => this.onDisciplinaChange(target.value),
            'mudar-ano': (e, target) => this.onAnoChange(target.value),
            'mudar-bimestre': (e, target) => this.onBimestreChange(target.value)
        }, 'change');

        const unbindInput = EventDelegator.bind(container, {
            'buscar-habilidades': (e, target) => this.onBuscaInput(target.value)
        }, 'input');

        this._cleanupDelegators = () => {
            if (typeof unbindClick === 'function') unbindClick();
            if (typeof unbindChange === 'function') unbindChange();
            if (typeof unbindInput === 'function') unbindInput();
        };
    },

    onDisciplinaChange(novaDisciplina) {
        this.disciplinaSelecionada = novaDisciplina;
        const container = document.getElementById('view-container');
        if (container) this.render(container);
    },

    onAnoChange(novoAno) {
        this.anoSelecionado = novoAno;
        const container = document.getElementById('view-container');
        if (container) this.render(container);
    },

    onBimestreChange(novoBimestre) {
        this.bimestreSelecionado = novoBimestre;
        const container = document.getElementById('view-container');
        if (container) this.render(container);
    },

    setBimestre(novoBimestre) {
        this.bimestreSelecionado = novoBimestre;
        const container = document.getElementById('view-container');
        if (container) this.render(container);
    },

    onBuscaInput(termo) {
        this.termoBusca = termo || '';
        this.filtrarEPesquisar();
    },

    _extrairEixo(item) {
        if (!item) return '';
        return item['Unidades Temáticas'] ||
            item['Unidade Temática'] ||
            item['Eixos/Unidades Temáticas'] ||
            item['Campo de atuação'] ||
            item['Prática de Linguagem'] ||
            item['Linguagem'] ||
            item['Eixo temático'] ||
            item['Eixo Temático'] ||
            '';
    },

    _extrairConteudos(item) {
        if (!item) return [];
        const raw = item['Conteúdos/ Objetos de conhecimento'] ||
            item['Conteúdos / Objetos de conhecimento'] ||
            item['Conteúdos/Objetos de conhecimento'] ||
            item['Conteúdo'] ||
            item['Objetos de conhecimento'] ||
            [];
        if (Array.isArray(raw)) return raw;
        if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
        return [];
    },

    _extrairHabilidades(item) {
        if (!item) return [];
        const habs = item['Habilidades'] || item['habilidades'] || [];
        if (Array.isArray(habs)) return habs;
        return [];
    },

    filtrarEPesquisar() {
        const resContainer = document.getElementById('bimestralizacao-resultados');
        const contadorEl = document.getElementById('bimestralizacao-contador');
        if (!resContainer) return;

        if (!this.dataCache) {
            resContainer.innerHTML = `
                <div class="card" style="padding: 4rem 2rem; text-align: center; color: var(--color-slate-400);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 0.5rem; color: #f59e0b;"></i>
                    <p>Não foi possível carregar os dados da Matriz Curricular.</p>
                </div>
            `;
            return;
        }

        const normalizar = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
        const termo = normalizar(this.termoBusca);

        const bimestresParaConsultar = this.bimestreSelecionado ? [this.bimestreSelecionado] : ['1', '2', '3', '4'];
        const cor = model.coresComponentes[this.disciplinaSelecionada] || '#2563eb';

        const listaFinal = [];

        bimestresParaConsultar.forEach(bNum => {
            const bimestreData = this.dataCache[bNum];
            if (!bimestreData) return;

            const anoData = bimestreData[this.anoSelecionado];
            if (!anoData) return;

            const disciplinaData = anoData[this.disciplinaSelecionada];
            if (!disciplinaData || !Array.isArray(disciplinaData)) return;

            disciplinaData.forEach(bloco => {
                const eixo = this._extrairEixo(bloco);
                const pratica = bloco['Prática de Linguagem'] && bloco['Prática de Linguagem'] !== eixo ? bloco['Prática de Linguagem'] : '';
                const conteudos = this._extrairConteudos(bloco);
                const habilidades = this._extrairHabilidades(bloco);

                habilidades.forEach(hab => {
                    const codigo = hab.codigo || '';
                    const descricao = hab.descricao || '';

                    // Filtro de pesquisa textual
                    if (termo) {
                        const matchCodigo = normalizar(codigo).includes(termo);
                        const matchDescricao = normalizar(descricao).includes(termo);
                        const matchEixo = normalizar(eixo).includes(termo);
                        const matchPratica = normalizar(pratica).includes(termo);
                        const matchConteudos = conteudos.some(c => normalizar(c).includes(termo));

                        if (!matchCodigo && !matchDescricao && !matchEixo && !matchPratica && !matchConteudos) {
                            return;
                        }
                    }

                    listaFinal.push({
                        bimestre: `${bNum}º Bimestre`,
                        ano: this.anoSelecionado,
                        disciplina: this.disciplinaSelecionada,
                        eixo,
                        pratica,
                        conteudos,
                        codigo,
                        descricao,
                        cor
                    });
                });
            });
        });

        this._itensAtuais = listaFinal;

        if (contadorEl) {
            contadorEl.innerHTML = `Mostrando <strong style="color: var(--color-slate-800);">${listaFinal.length}</strong> habilidade(s) cadastrada(s)`;
        }

        const statTotal = document.getElementById('stat-total-habs');
        if (statTotal && this.termoBusca) {
            statTotal.innerText = `${listaFinal.length}`;
        }

        this.renderCards(listaFinal);
    },

    renderCards(lista) {
        const container = document.getElementById('bimestralizacao-resultados');
        if (!container) return;

        if (lista.length === 0) {
            container.innerHTML = `
                <div class="card" style="padding: 5rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 2px dashed var(--color-slate-200); background-color: var(--color-slate-50); border-radius: var(--radius-2xl);">
                    <div style="width: 4rem; height: 4rem; border-radius: var(--radius-full); background-color: var(--color-white); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; color: var(--color-slate-300); font-size: 1.5rem; box-shadow: var(--shadow-sm);">
                        <i class="far fa-folder-open"></i>
                    </div>
                    <h4 style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-700); margin-bottom: 0.25rem;">Nenhuma habilidade encontrada</h4>
                    <p style="color: var(--color-slate-500); font-size: 0.875rem; max-width: 440px; margin-bottom: 1.5rem;">
                        Tente alterar os termos da busca ou selecionar outro bimestre / ano.
                    </p>
                    <button type="button" data-action="limpar-filtros" class="btn-secondary interactive-element">
                        <i class="fas fa-undo"></i> <span>Limpar Busca</span>
                    </button>
                </div>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.gap = 'var(--spacing-5)';

        wrapper.innerHTML = lista.map((item, index) => {
            const cor = item.cor || '#2563eb';
            const codigoSafe = window.escapeHTML(item.codigo);
            const descricaoSafe = window.escapeHTML(item.descricao);
            const disciplinaSafe = window.escapeHTML(item.disciplina);
            const anoSafe = window.escapeHTML(item.ano);
            const bimestreSafe = window.escapeHTML(item.bimestre);
            const eixoSafe = window.escapeHTML(item.eixo);
            const praticaSafe = window.escapeHTML(item.pratica);

            const conteudosHtml = item.conteudos && item.conteudos.length > 0 ? `
                <div style="margin-top: var(--spacing-4); padding: var(--spacing-4) var(--spacing-5); background-color: var(--color-slate-50); border: 1px solid var(--color-slate-100); border-radius: var(--radius-xl); display: flex; flex-direction: column; gap: var(--spacing-2);">
                    <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 800; color: var(--color-slate-700); text-transform: uppercase; letter-spacing: 0.05em;">
                        <i class="fas fa-lightbulb" style="color: #f59e0b;"></i>
                        <span>Conteúdos & Objetos de Conhecimento:</span>
                    </div>
                    <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.875rem; color: var(--color-slate-600); line-height: 1.6;">
                        ${item.conteudos.map(c => `<li style="margin-bottom: 0.25rem;">${window.escapeHTML(c)}</li>`).join('')}
                    </ul>
                </div>
            ` : '';

            let btnAcao = this.selecionarCallback ?
                `<button type="button" data-action="vincular-habilidade" data-index="${index}" 
                         class="btn-primary" style="background-color: #059669; padding: 0.625rem 1.25rem; font-size: 0.8125rem; border-radius: var(--radius-lg); white-space: nowrap;">
                    <i class="fas fa-plus"></i> <span>Vincular</span>
                </button>` :
                `<button type="button" data-action="copiar-habilidade" data-codigo="${codigoSafe}" data-descricao="${descricaoSafe}" 
                         class="btn-icon interactive-element" 
                         style="width: 2.5rem; height: 2.5rem; border-radius: var(--radius-lg); background-color: var(--color-slate-50); border: 1px solid var(--color-slate-200); color: var(--color-slate-500);" 
                         title="Copiar código e descrição da habilidade">
                    <i class="far fa-copy" style="font-size: 0.9375rem;"></i>
                </button>`;

            return `
                <div class="card interactive-element" style="padding: var(--spacing-6); border-left: 6px solid ${cor}; display: flex; flex-direction: column; gap: var(--spacing-4); transition: all var(--transition-fast); border-radius: var(--radius-2xl);">
                    
                    <!-- HEADER DO CARD COM BADGES E AÇÃO -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--spacing-4);">
                        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;">
                            
                            <span style="background-color: ${cor}; color: #ffffff; font-size: 0.8125rem; font-weight: 900; padding: 0.25rem 0.75rem; border-radius: var(--radius-md); letter-spacing: 0.05em; text-transform: uppercase; box-shadow: var(--shadow-sm);">
                                ${codigoSafe}
                            </span>

                            <span class="badge" style="background-color: var(--color-slate-100); color: var(--color-slate-700); font-weight: 700; padding: 0.25rem 0.625rem;">
                                ${disciplinaSafe}
                            </span>

                            <span class="badge" style="background-color: var(--color-slate-100); color: var(--color-slate-700); font-weight: 700; padding: 0.25rem 0.625rem;">
                                ${anoSafe}
                            </span>

                            <span class="badge" style="background-color: var(--color-primary-light); color: var(--color-primary); font-weight: 800; padding: 0.25rem 0.625rem;">
                                <i class="fas fa-bookmark" style="margin-right: 0.25rem;"></i> ${bimestreSafe}
                            </span>

                            ${eixoSafe ? `
                                <span class="badge" style="background-color: #f1f5f9; color: var(--color-slate-700); font-weight: 600; padding: 0.25rem 0.625rem;">
                                    <strong>Eixo:</strong> ${eixoSafe}
                                </span>
                            ` : ''}

                            ${praticaSafe ? `
                                <span class="badge" style="background-color: #f8fafc; color: var(--color-slate-600); font-weight: 600; padding: 0.25rem 0.625rem;">
                                    <strong>Prática:</strong> ${praticaSafe}
                                </span>
                            ` : ''}

                        </div>

                        <div style="flex-shrink: 0;">
                            ${btnAcao}
                        </div>
                    </div>

                    <!-- DESCRIÇÃO DA HABILIDADE -->
                    <p style="font-size: 0.9375rem; color: var(--color-slate-800); line-height: 1.65; font-weight: 500; margin: 0; padding: 0 var(--spacing-1);">
                        ${descricaoSafe}
                    </p>

                    <!-- CONTEÚDOS / OBJETOS DE CONHECIMENTO -->
                    ${conteudosHtml}

                </div>
            `;
        }).join('');

        fragment.appendChild(wrapper);
        container.innerHTML = '';
        container.appendChild(fragment);
    },

    limparFiltros() {
        this.termoBusca = '';
        const inputBusca = document.getElementById('bimestralizacao-busca');
        if (inputBusca) inputBusca.value = '';
        this.filtrarEPesquisar();
    },

    copiarParaAreaTransferencia(codigo, descricao) {
        const textoCompleto = `(${codigo}) ${descricao}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textoCompleto)
                .then(() => Toast.show(`Habilidade ${codigo} copiada com sucesso!`, 'success'))
                .catch(() => this._fallbackCopy(textoCompleto));
        } else {
            this._fallbackCopy(textoCompleto);
        }
    },

    _fallbackCopy(texto) {
        const textArea = document.createElement("textarea");
        textArea.value = texto;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            Toast.show('Habilidade copiada para a área de transferência!', 'success');
        } catch (err) {
            Toast.show('Falha ao copiar texto.', 'error');
        }
        document.body.removeChild(textArea);
    },

    executarSelecao(obj, btnElement) {
        if (this.selecionarCallback) {
            this.selecionarCallback(obj);
            if (btnElement) {
                btnElement.innerHTML = '<i class="fas fa-check"></i> Vinculado';
                btnElement.classList.remove('btn-primary');
                btnElement.classList.add('btn-secondary');
                btnElement.disabled = true;
            }
        }
    }
};

if (typeof window !== 'undefined') {
    window.bimestralizacaoView = bimestralizacaoView;
}
