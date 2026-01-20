const calendarioView = {
    tiposEventos: {
        'feriado_nac':   { label: 'Feriado Nacional',      bg: 'bg-red-100',     text: 'text-red-700', border: 'border-red-200' },
        'feriado_est':   { label: 'Feriado Estadual',      bg: 'bg-red-50',      text: 'text-red-600', border: 'border-red-100' },
        'feriado_mun':   { label: 'Feriado Municipal',     bg: 'bg-rose-100',    text: 'text-rose-600', border: 'border-rose-200' },
        'recesso':       { label: 'Recesso Escolar',       bg: 'bg-orange-100',  text: 'text-orange-700', border: 'border-orange-200' },
        'ferias':        { label: 'Férias Escolares',      bg: 'bg-amber-100',   text: 'text-amber-700', border: 'border-amber-200' },
        'retorno_adm':   { label: 'Retorno Admin.',        bg: 'bg-slate-200',   text: 'text-slate-700', border: 'border-slate-300' },
        'modulacao':     { label: 'Modulação',             bg: 'bg-indigo-100',  text: 'text-indigo-700', border: 'border-indigo-200' },
        'plan_pedag':    { label: 'Planej. Pedagógico',    bg: 'bg-blue-100',    text: 'text-blue-700', border: 'border-blue-200' },
        'reuniao_ped':   { label: 'Reunião Pedagógica',    bg: 'bg-sky-100',     text: 'text-sky-700', border: 'border-sky-200' },
        'conselho':      { label: 'Conselho de Classe',    bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
        'reuniao_pais':  { label: 'Reunião de Pais',       bg: 'bg-teal-100',    text: 'text-teal-700', border: 'border-teal-200' },
        'avaliacao':     { label: 'Avaliação Periódica',   bg: 'bg-purple-100',  text: 'text-purple-700', border: 'border-purple-200' },
        'inicio_per':    { label: 'Início do Período',     bg: 'bg-lime-100',    text: 'text-lime-800', border: 'border-lime-200' },
        'aula':          { label: 'Dia Letivo',            bg: 'bg-white',       text: 'text-slate-600', border: 'border-slate-200' },

    },
    mesesNomes: [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ],
    render(containerId) {
        const container = document.getElementById(containerId);
        
        const config = (model.state && model.state.userConfig) || {};
        let nomeProf = 'Professor(a)';
        if (config.profName && config.profName.trim() !== '') {
            nomeProf = config.profName.split(' ')[0]; 
        } else if (model.currentUser && model.currentUser.displayName) {
            nomeProf = model.currentUser.displayName.split(' ')[0];
        }
        const html = `
            <div class="fade-in pb-20">
                <div class="flex flex-wrap justify-between items-end mb-8 gap-6">
                    <div>
                        <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Olá, ${nomeProf}!</h2>
                        <p class="text-slate-500 mt-1">Calendário Acadêmico 2026</p>
                    </div>
                    
                    <div class="group relative">
                        <button class="text-xs font-bold text-primary border border-primary/30 px-3 py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition">
                            <i class="fas fa-info-circle mr-1"></i> Ver Legenda
                        </button>
                        <div class="absolute right-0 top-full mt-2 w-64 bg-white p-4 rounded-xl shadow-xl border border-slate-100 z-50 hidden group-hover:grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            ${this.gerarLegenda()}
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    ${this.mesesNomes.map((nome, index) => this.gerarTemplateMes(index + 1, nome)).join('')}
                </div>
            </div>
        `;
        container.innerHTML = html;
        this.atualizarDataHeader();
    },
    gerarLegenda() {
        return Object.entries(this.tiposEventos)
            .filter(([key]) => !key.includes('Antigo'))
            .map(([key, estilo]) => `
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full ${estilo.bg.replace('100', '500').replace('50', '400').replace('white', 'slate-300')}"></div>
                    <span class="text-[10px] font-bold text-slate-600 uppercase tracking-wide">${estilo.label}</span>
                </div>
            `).join('');
    },
    gerarTemplateMes(mes, nome) {
        const ano = 2026; 
        const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay(); 
        const totalDias = new Date(ano, mes, 0).getDate();
        let diasHtml = '';
        for (let i = 0; i < primeiroDiaSemana; i++) {
            diasHtml += `<div class="h-8"></div>`;
        }
        for (let dia = 1; dia <= totalDias; dia++) {
            const dataIso = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const evento = model.state.eventos ? model.state.eventos[dataIso] : null;
            let classesBase = "h-8 flex items-center justify-center relative cursor-pointer rounded-lg transition-all text-xs font-medium ";
            let estiloCor = "hover:bg-slate-100 text-slate-600"; 
            let tooltipText = 'Clique para adicionar evento';
            if (evento) {
                const configEvento = this.tiposEventos[evento.tipo];
                if (configEvento) {
                    estiloCor = `${configEvento.bg} ${configEvento.text} font-bold ring-1 ring-inset ${configEvento.border}`;
                    tooltipText = `${configEvento.label}: ${evento.descricao}`;
                } else {
                    estiloCor = "bg-gray-100 text-gray-500 font-bold border border-gray-200";
                    tooltipText = `Evento (Tipo desconhecido): ${evento.descricao}`;
                }
            }
            const hoje = new Date();
            const isHoje = hoje.getDate() === dia && (hoje.getMonth() + 1) === mes && hoje.getFullYear() === ano;
            
            if (isHoje) {
                classesBase += "ring-2 ring-primary ring-offset-1 z-10 font-bold ";
                if (!evento) estiloCor = "bg-primary text-white hover:bg-primary/90";
            }
            diasHtml += `
                <div class="${classesBase} ${estiloCor} group"
                     title="${tooltipText}"
                     onclick="controller.openDayOptions('${dataIso}')">
                    <span>${dia}</span>
                    ${(evento && evento.descricao) ? `<span class="absolute -bottom-0.5 w-1 h-1 rounded-full bg-current opacity-50"></span>` : ''}
                </div>
            `;
        }
        return `
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow h-full flex flex-col">
                <h3 class="font-bold text-slate-800 mb-4 text-center border-b border-slate-50 pb-2 uppercase tracking-widest text-xs flex justify-between items-center px-2">
                    <span>${nome}</span>
                    <span class="text-slate-300 font-normal">2026</span>
                </h3>
                <div class="grid grid-cols-7 gap-1 text-[9px] font-black text-slate-400 text-center mb-2 uppercase">
                    <div class="text-red-300">D</div>
                    <div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
                </div>
                <div class="grid grid-cols-7 gap-1 flex-1 content-start">
                    ${diasHtml}
                </div>
            </div>
        `;
    },
    atualizarDataHeader() {
        const el = document.getElementById('current-date');
        if (el) {
            const hoje = new Date();
            el.innerHTML = `<i class="far fa-clock mr-2"></i>` + hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
        }
    }
};
window.calendarioView = calendarioView;
window.View = window.View || {};
window.View.renderCalendario = (id) => calendarioView.render(id);
