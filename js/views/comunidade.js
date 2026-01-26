import { model } from '../model.js';
import { controller } from '../controller.js';
import { firebaseService } from '../firebase-service.js';
import { Toast } from '../components/toast.js';

export const comunidadeView = {
    questoes: [],
    filtroMateria: '',
    async render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        const html = `
            <div class="fade-in pb-20">
                <div class="mb-8">
                    <h2 class="text-3xl font-bold text-slate-800 tracking-tight">Comunidade</h2>
                    <p class="text-slate-500">Explore e importe questões compartilhadas por outros professores.</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <input type="text" id="search-comunidade" placeholder="Buscar por tema ou palavra-chave..." 
                           class="md:col-span-2 p-4 rounded-xl border border-slate-200 outline-none focus:border-primary shadow-sm">
                    <select id="filter-materia" onchange="comunidadeView.setFiltro(this.value)"
                            class="p-4 rounded-xl border border-slate-200 outline-none cursor-pointer shadow-sm bg-white">
                        <option value="">Todas as matérias</option>
                        ${Object.keys(model.coresComponentes).map(m => `
                            <option value="${m}" ${this.filtroMateria === m ? 'selected' : ''}>${m}</option>
                        `).join('')}
                    </select>
                    <button onclick="comunidadeView.buscar()" 
                            class="bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-md flex items-center justify-center gap-2">
                        <i class="fas fa-search"></i> Buscar
                    </button>
                </div>
                <div id="comunidade-results" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="col-span-full py-20 text-center text-slate-400">
                        <i class="fas fa-users text-5xl mb-4 opacity-20"></i>
                        <p>Clique em buscar para ver as questões da comunidade.</p>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
        document.getElementById('search-comunidade')?.focus();
    },
    async buscar() {
        const grid = document.getElementById('comunidade-results');
        const filtro = this.filtroMateria;
        grid.innerHTML = '<div class="col-span-full text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-primary"></i></div>';
        try {
            let ref = firebaseService.db.collection('comunidade_questoes');
            if (filtro) ref = ref.where('materia', '==', filtro);
            const snapshot = await ref.limit(50).get();
            this.questoes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.renderLista();
        } catch (error) {
            console.error("Erro na busca:", error);
            window.Toast.show("Verifique o console para erros de índice.", "error");
        }
    },
    renderLista() {
        const grid = document.getElementById('comunidade-results');
        if (this.questoes.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                    <i class="fas fa-search text-4xl text-slate-200 mb-2"></i>
                    <p class="text-slate-400">Nenhuma questão encontrada com esses filtros.</p>
                </div>`;
            return;
        }
        grid.innerHTML = this.questoes.map(q => {
            const corMateria = model.coresComponentes[q.materia] || '#64748b';
            return `
                <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
                    <div class="flex justify-between items-start mb-4">
                        <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" 
                              style="background-color: ${corMateria}15; color: ${corMateria}">
                            ${q.materia}
                        </span>
                        <div class="text-right">
                            <span class="block text-[10px] text-slate-400 font-bold uppercase">${q.ano || ''}</span>
                            <span class="text-[10px] text-slate-300">Prof: ${q.autor || 'Anônimo'}</span>
                        </div>
                    </div>
                    <div class="text-slate-700 mb-6 flex-grow font-medium text-sm leading-relaxed">
                        ${q.enunciado.replace(/\n/g, '<br>')}
                    </div>
                    <div class="pt-4 border-t border-slate-50 mt-auto">
                        <button onclick="comunidadeView.importarQuestao('${q.id}')" 
                                class="w-full py-3 rounded-xl bg-slate-50 text-indigo-600 font-bold text-xs hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2">
                            <i class="fas fa-file-import"></i> Importar para meu Banco
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        if (window.renderMathInElement) {
            renderMathInElement(grid, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false }
                ],
                throwOnError: false
            });
        }
    },
    async importarQuestao(idCloud) {
        const questao = this.questoes.find(q => q.id === idCloud);
        if (questao) {
            const novaQuestao = {
                enunciado: questao.enunciado,
                alternativas: questao.alternativas || null,
                correta: questao.correta !== undefined ? questao.correta : null,
                gabarito: questao.gabarito || null,
                gabarito_comentado: questao.gabarito_comentado || null,
                materia: questao.materia,
                ano: questao.ano,
                tipo: questao.tipo,
                suporte: questao.suporte || null,
                bncc: questao.bncc || null,
                origem: `Comunidade (${questao.autor || 'Prof.'})`
            };
            try {
                model.saveQuestao(novaQuestao);
                Toast.show("Questão importada com sucesso!", "success");
                setTimeout(() => {
                    controller.navigate('provas');
                }, 1000);
            } catch (err) {
                Toast.show("Erro ao salvar questão localmente.", "error");
            }
        }
    },
    setFiltro(val) {
        this.filtroMateria = val;
    }
};
if (typeof window !== 'undefined') {
    window.comunidadeView = comunidadeView;
}