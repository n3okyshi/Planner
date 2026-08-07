/**
 * @file biblioteca.js
 * @description View da Biblioteca (Meus Materiais gerados por IA).
 * @module views/bibliotecaView
 */
import { model } from '../model.js';
import { controller } from '../controller.js';

export const bibliotecaView = {
    abaAtiva: 'criados',

    /**
     * Alterna entre as abas da biblioteca e da comunidade global.
     * @param {string} aba 
     */
    mudarAba(aba) {
        if(aba === 'comunidade') {
            controller.navigate('comunidade'); // Redireciona para a view de Comunidade existente
            return;
        }
        this.abaAtiva = aba;
        this.render('view-container');
    },

    /**
     * Renderiza o layout principal da biblioteca.
     */
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const materiais = model.state.materiaisGerados || [];
        let conteudoHtml = '';

        if (materiais.length === 0) {
            conteudoHtml = this.gerarHTMLEmptyState();
        } else {
            // Agrupar materiais pelo "tipo" (ferramenta que os gerou) para criar a noção de Pacotes
            const agrupados = this.agruparPorTipo(materiais);

            conteudoHtml = Object.keys(agrupados).map(tipo => {
                const itens = agrupados[tipo];
                const labelTipo = tipo.replace(/-/g, ' ').toUpperCase();
                
                // Mapeamento visual dinâmico dependendo da ferramenta
                const iconMap = {
                    'planejamento': { i: 'far fa-calendar-alt', c: 'text-indigo-500', bg: 'bg-indigo-50' },
                    'dinamica-jogo': { i: 'fas fa-users', c: 'text-blue-500', bg: 'bg-blue-50' },
                    'atividade-imprimivel': { i: 'fas fa-print', c: 'text-emerald-500', bg: 'bg-emerald-50' },
                    'avaliacao-prova': { i: 'fas fa-clipboard-list', c: 'text-orange-500', bg: 'bg-orange-50' }
                };
                const style = iconMap[tipo] || { i: 'fas fa-file-alt', c: 'text-slate-500', bg: 'bg-slate-50' };

                return `
                    <div class="mb-10 animate-slide-in">
                        <div class="flex items-center gap-2 mb-4">
                            <div class="w-2 h-2 rounded-full ${style.bg.replace('bg-', 'bg-').replace('50', '400')}"></div>
                            <h3 class="font-bold text-slate-800 text-lg capitalize">${labelTipo.toLowerCase()} 
                                <span class="text-slate-400 font-normal text-sm ml-1">(${itens.length})</span>
                            </h3>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            ${itens.map(m => this.gerarCardMaterial(m, style)).join('')}
                        </div>
                    </div>
                `;
            }).join('');
        }

        const html = `
            <div class="fade-in pb-24">
                <div class="mb-6">
                    <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Biblioteca</h2>
                    <p class="text-slate-500 mt-1">Seus materiais e conteúdos gerados</p>
                </div>

                <!-- Abas Superiores -->
                <div class="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200 mb-8">
                    <button onclick="bibliotecaView.mudarAba('comunidade')"
                            class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all text-slate-500 hover:text-slate-700">
                        Comunidade
                    </button>
                    <button onclick="bibliotecaView.mudarAba('criados')"
                            class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 bg-white text-slate-800 shadow-sm">
                        <i class="fas fa-magic text-indigo-500"></i> Criados por mim 
                        <span class="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-[10px]">${materiais.length}</span>
                    </button>
                </div>

                <!-- Grid de Pacotes/Materiais -->
                <div class="mt-4">
                    ${conteudoHtml}
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    /**
     * Gera o HTML de um cartão individual de material gerado.
     */
    gerarCardMaterial(m, style) {
        const tituloSafe = window.escapeHTML ? window.escapeHTML(m.titulo || m.tema || 'Material sem título') : (m.titulo || m.tema || 'Material sem título');
        const disciplinaSafe = window.escapeHTML ? window.escapeHTML(m.disciplina || 'Geral') : (m.disciplina || 'Geral');
        const serieSafe = window.escapeHTML ? window.escapeHTML(m.serie || 'Série não informada') : (m.serie || 'Série não informada');
        const dataFormatada = new Date(m.createdAt).toLocaleDateString('pt-BR');

        return `
            <div class="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all flex flex-col overflow-hidden group">
                <!-- Capa Ilustrativa Dinâmica -->
                <div class="h-36 ${style.bg} flex items-center justify-center relative overflow-hidden">
                    <span class="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[9px] font-black px-2.5 py-1 rounded-lg text-slate-600 uppercase tracking-widest shadow-sm">
                        ${disciplinaSafe}
                    </span>
                    <i class="${style.i} text-5xl ${style.c} group-hover:scale-110 transition-transform duration-300 opacity-80"></i>
                </div>
                
                <!-- Informações e Ações -->
                <div class="p-6 flex-1 flex flex-col">
                    <h4 class="font-bold text-slate-800 text-lg mb-1.5 leading-tight line-clamp-2">${tituloSafe}</h4>
                    <p class="text-xs text-slate-400 font-medium mb-5 line-clamp-1">${serieSafe} • Gerado em ${dataFormatada}</p>
                    
                    <div class="mt-auto pt-4 border-t border-slate-50 flex gap-3">
                        <button onclick="bibliotecaView.abrirMaterial('${m.id}')" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-indigo-100 active:scale-95">
                            <i class="fas fa-book-open"></i> Abrir material
                        </button>
                        <button onclick="bibliotecaView.excluirMaterial('${m.id}')" class="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-slate-100 shrink-0" title="Excluir Material">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    gerarHTMLEmptyState() {
        return `
            <div class="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm mt-8 animate-pop-in">
                <div class="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                    <i class="fas fa-folder-open text-4xl text-indigo-300"></i>
                </div>
                <h2 class="text-2xl font-bold text-slate-700 mb-2">Sua biblioteca está vazia</h2>
                <p class="text-slate-400 font-medium">Você ainda não gerou nenhum material com IA.</p>
                <button onclick="controller.navigate('criar-material')" class="mt-8 bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition flex items-center gap-2 active:scale-95">
                    <i class="fas fa-magic"></i> Começar a criar
                </button>
            </div>
        `;
    },

    agruparPorTipo(materiais) {
        return materiais.reduce((acc, obj) => {
            const chave = obj.tipo || 'outros';
            if (!acc[chave]) acc[chave] = [];
            acc[chave].push(obj);
            return acc;
        }, {});
    },

    abrirMaterial(id) {
        if (window.conteudoGeradoView) {
            window.conteudoGeradoView.setMaterial(id);
        }
        controller.navigate('conteudo-gerado');
    },

    excluirMaterial(id) {
        // Valida se uiController e o Modal global existem para a exclusão rica, se não recai no fallback
        if (window.uiController && window.uiController.confirmarAcao) {
            window.uiController.confirmarAcao(
                "Excluir Material", 
                "Tem certeza que deseja apagar este material da sua biblioteca? Esta ação é irreversível.", 
                () => { this._processarExclusao(id); }
            );
        } else {
            if (confirm("Tem certeza que deseja apagar este material da sua biblioteca?")) {
                this._processarExclusao(id);
            }
        }
    },

    _processarExclusao(id) {
        const index = model.state.materiaisGerados.findIndex(m => m.id === id);
        if (index !== -1) {
            model.state.materiaisGerados.splice(index, 1);
            model.saveLocal(); // Persiste no cache e engatilha debounce para a Nuvem
            if (window.Toast) window.Toast.show("Material excluído com sucesso.", "success");
            this.render('view-container');
        }
    }
};

if (typeof window !== 'undefined') {
    window.bibliotecaView = bibliotecaView;
}