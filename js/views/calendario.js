/**
 * VIEW - Calendário Anual Interativo
 * Funcionalidade: Visão geral do ano, feriados e eventos escolares.
 */
const calendarioView = {
    // Configuração Central de Cores e Tipos
    tiposEventos: {
        'feriado':  { label: 'Feriado',  bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' },
        'recesso':  { label: 'Recesso',  bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
        'prova':    { label: 'Prova',    bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
        'trabalho': { label: 'Trabalho', bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-200' },
        'evento':   { label: 'Evento',   bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
        'conselho': { label: 'Conselho', bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' },
        'aula':     { label: 'Letivo',   bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' }
    },

    mesesNomes: [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ],

    render(containerId) {
        const container = document.getElementById(containerId);
        
        // Dados do Usuário
        const config = (model.state && model.state.userConfig) || {};
        const nomeProf = config.profName ? config.profName.split(' ')[0] : 'Professor(a)';

        const html = `
            <div class="fade-in pb-20">
                <div class="flex flex-wrap justify-between items-end mb-8 gap-6">
                    <div>
                        <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Olá, ${nomeProf}!</h2>
                        <p class="text-slate-500 mt-1">Aqui está o panorama do seu ano letivo de 2026.</p>
                    </div>
                    
                    <div class="flex flex-wrap gap-2 justify-end max-w-2xl">
                        ${this.gerarLegenda()}
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

    /**
     * Gera os botões da legenda baseados na configuração
     */
    gerarLegenda() {
        return Object.entries(this.tiposEventos).map(([key, estilo]) => `
            <div class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-slate-100 shadow-sm">
                <div class="w-2.5 h-2.5 rounded-full ${estilo.bg.replace('100', '500')}"></div>
                <span class="text-[10px] font-bold text-slate-600 uppercase tracking-wide">${estilo.label}</span>
            </div>
        `).join('');
    },

    /**
     * Gera o card de um único mês
     */
    gerarTemplateMes(mes, nome) {
        const ano = 2026; // Fixo conforme o projeto
        const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay(); // 0 = Domingo
        const totalDias = new Date(ano, mes, 0).getDate();

        let diasHtml = '';

        // Preenche espaços vazios antes do dia 1
        for (let i = 0; i < primeiroDiaSemana; i++) {
            diasHtml += `<div class="h-8"></div>`;
        }

        // Gera os dias
        for (let dia = 1; dia <= totalDias; dia++) {
            const dataIso = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            
            // Busca evento no Model
            const evento = model.state.eventos ? model.state.eventos[dataIso] : null;

            // Determina Estilo
            let classesBase = "h-8 flex items-center justify-center relative cursor-pointer rounded-lg transition-all text-xs font-medium ";
            let estiloCor = "hover:bg-slate-100 text-slate-600"; // Padrão
            
            if (evento && this.tiposEventos[evento.tipo]) {
                const style = this.tiposEventos[evento.tipo];
                estiloCor = `${style.bg} ${style.text} font-bold ring-1 ring-inset ${style.border}`;
            }

            // Verifica se é Hoje
            const hoje = new Date();
            const isHoje = hoje.getDate() === dia && (hoje.getMonth() + 1) === mes && hoje.getFullYear() === ano;
            
            if (isHoje) {
                // Se for hoje, adiciona um anel de destaque
                classesBase += "ring-2 ring-primary ring-offset-1 z-10 font-bold ";
                if (!evento) estiloCor = "bg-primary text-white hover:bg-primary/90";
            }

            diasHtml += `
                <div class="${classesBase} ${estiloCor} group"
                     title="${evento ? `${evento.tipo.toUpperCase()}: ${evento.descricao}` : 'Clique para adicionar evento'}"
                     onclick="controller.openDayOptions('${dataIso}')">
                    <span>${dia}</span>
                    
                    ${(evento && evento.descricao) ? 
                        `<span class="absolute -bottom-0.5 w-1 h-1 rounded-full bg-current opacity-50"></span>` 
                        : ''
                    }
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
                    <div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div>
                    <div>S</div>
                </div>

                <div class="grid grid-cols-7 gap-1 flex-1 content-start">
                    ${diasHtml}
                </div>
            </div>
        `;
    },

    /**
     * Atualiza a data no header superior do HTML (breadcrumb)
     */
    atualizarDataHeader() {
        const el = document.getElementById('current-date');
        if (el) {
            const hoje = new Date();
            el.innerHTML = `<i class="far fa-clock mr-2"></i>` + hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
        }
    }
};

window.View = window.View || {};
window.View.renderCalendario = (id) => calendarioView.render(id);