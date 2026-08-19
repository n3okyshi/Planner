/**
 * Componente Reutilizável de Barra de Filtros e Busca (Vanilla JS ES6+)
 * Padroniza os filtros por Disciplina, Série, Bimestre e Campo de Busca em todo o App.
 */
export class FilterBarComponent {
    /**
     * @param {Object} options
     * @param {Array<string>} [options.disciplinas] - Lista de disciplinas disponíveis
     * @param {Array<string>} [options.series] - Lista de séries disponíveis
     * @param {Array<string>} [options.bimestres] - Lista de bimestres
     * @param {string} [options.placeholder='Buscar por termo ou título...'] - Placeholder da busca
     * @param {Function} options.onFilterChange - Callback acionado quando qualquer filtro muda `(filters)`
     */
    constructor(options = {}) {
        this.disciplinas = options.disciplinas || [
            'Língua Portuguesa', 'Matemática', 'Ciências', 'História', 'Geografia', 
            'Arte', 'Educação Física', 'Inglês', 'Física', 'Química', 'Biologia', 'Filosofia', 'Sociologia'
        ];
        this.series = options.series || [
            '1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano',
            '6º Ano', '7º Ano', '8º Ano', '9º Ano', 'Ensino Médio'
        ];
        this.bimestres = options.bimestres || [
            '1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'
        ];
        this.placeholder = options.placeholder || 'Buscar por termo ou título...';
        this.onFilterChange = options.onFilterChange || (() => {});

        this.filters = {
            materia: '',
            serie: '',
            bimestre: '',
            busca: ''
        };
    }

    render() {
        const container = document.createElement('div');
        container.className = 'filter-bar-component';
        container.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.75rem;
            background-color: var(--color-white, #ffffff);
            border: 1px solid var(--color-slate-200, #e2e8f0);
            padding: 0.875rem 1.25rem;
            border-radius: var(--radius-2xl, 1rem);
            margin-bottom: 1.25rem;
            box-shadow: var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05));
        `;

        // Input de Busca
        const searchWrapper = document.createElement('div');
        searchWrapper.style.cssText = `position: relative; flex: 1; min-width: 220px;`;
        
        const searchIcon = document.createElement('i');
        searchIcon.className = 'fas fa-search';
        searchIcon.style.cssText = `
            position: absolute;
            left: 0.875rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--color-slate-400, #94a3b8);
            font-size: 0.875rem;
        `;

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'input-default';
        searchInput.placeholder = this.placeholder;
        searchInput.value = this.filters.busca;
        searchInput.style.cssText = `
            width: 100%;
            padding: 0.5rem 0.875rem 0.5rem 2.25rem;
            border: 1px solid var(--color-slate-200, #e2e8f0);
            border-radius: var(--radius-xl, 0.75rem);
            font-size: 0.875rem;
            outline: none;
            box-sizing: border-box;
        `;
        searchInput.oninput = (e) => {
            this.filters.busca = e.target.value;
            this._notify();
        };

        searchWrapper.appendChild(searchIcon);
        searchWrapper.appendChild(searchInput);

        // Select Disciplina
        const selectDisc = this._createSelect('Todas as Disciplinas', this.disciplinas, this.filters.materia, (val) => {
            this.filters.materia = val;
            this._notify();
        });

        // Select Série
        const selectSerie = this._createSelect('Todas as Séries', this.series, this.filters.serie, (val) => {
            this.filters.serie = val;
            this._notify();
        });

        // Select Bimestre
        const selectBim = this._createSelect('Todos os Bimestres', this.bimestres, this.filters.bimestre, (val) => {
            this.filters.bimestre = val;
            this._notify();
        });

        container.appendChild(searchWrapper);
        container.appendChild(selectDisc);
        container.appendChild(selectSerie);
        container.appendChild(selectBim);

        return container;
    }

    _createSelect(defaultLabel, optionsList, currentValue, onChange) {
        const select = document.createElement('select');
        select.className = 'input-default';
        select.style.cssText = `
            padding: 0.5rem 0.875rem;
            border: 1px solid var(--color-slate-200, #e2e8f0);
            border-radius: var(--radius-xl, 0.75rem);
            font-size: 0.875rem;
            background-color: var(--color-white, #ffffff);
            outline: none;
            cursor: pointer;
        `;

        const optDefault = document.createElement('option');
        optDefault.value = '';
        optDefault.textContent = defaultLabel;
        select.appendChild(optDefault);

        optionsList.forEach(optVal => {
            const opt = document.createElement('option');
            opt.value = optVal;
            opt.textContent = optVal;
            if (currentValue === optVal) opt.selected = true;
            select.appendChild(opt);
        });

        select.onchange = (e) => onChange(e.target.value);
        return select;
    }

    _notify() {
        if (typeof this.onFilterChange === 'function') {
            this.onFilterChange({ ...this.filters });
        }
    }
}
