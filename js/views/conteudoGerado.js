/**
 * @file conteudoGerado.js
 * @description View responsável por exibir o material gerado pela IA e oferecer opções de exportação.
 * @module views/conteudoGeradoView
 */
import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';

export const conteudoGeradoView = {
    materialIdAtual: null,

    /**
     * Define o ID do material a ser exibido antes de renderizar a view.
     * @param {string} id 
     */
    setMaterial(id) {
        this.materialIdAtual = id;
    },

    /**
     * Renderiza a interface de leitura e ações do material.
     */
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        // Se não tiver ID definido, pega o último material gerado da biblioteca
        if (!this.materialIdAtual && model.state.materiaisGerados && model.state.materiaisGerados.length > 0) {
            this.materialIdAtual = model.state.materiaisGerados[model.state.materiaisGerados.length - 1].id;
        }

        const material = (model.state.materiaisGerados || []).find(m => m.id === this.materialIdAtual);

        if (!material) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-32 text-slate-400">
                    <i class="far fa-folder-open text-6xl mb-4 text-slate-300"></i>
                    <h2 class="text-2xl font-bold text-slate-600">Material não encontrado</h2>
                    <button onclick="controller.navigate('biblioteca')" class="mt-4 text-primary font-bold hover:underline">Ir para Biblioteca</button>
                </div>
            `;
            return;
        }

        const dataGeracao = new Date(material.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        const tituloSafe = window.escapeHTML ? window.escapeHTML(material.titulo || material.tema || 'Conteúdo Gerado') : (material.titulo || 'Conteúdo Gerado');
        const temaSafe = window.escapeHTML ? window.escapeHTML(material.tema || 'Geral') : (material.tema || 'Geral');
        const ferramentaSafe = window.escapeHTML ? window.escapeHTML(material.tipo || 'Gerador IA') : (material.tipo || 'Gerador IA');

        const html = `
            <div class="fade-in pb-24 max-w-6xl mx-auto">
                <button onclick="controller.navigate('biblioteca')" class="mb-4 text-xs font-bold text-slate-400 flex items-center gap-2 hover:text-primary transition-colors">
                    <i class="fas fa-arrow-left"></i> Voltar para a Biblioteca
                </button>

                <div class="mb-6">
                    <h2 class="text-3xl font-bold text-slate-800 tracking-tight">${tituloSafe}</h2>
                    <p class="text-slate-500 mt-1">${temaSafe} • ${dataGeracao}</p>
                </div>

                <!-- Barra de Ações (Toolbar) -->
                <div class="flex flex-wrap items-center gap-3 mb-8 pb-6 border-b border-slate-200">
                    <button onclick="conteudoGeradoView.baixarWord('${material.id}', true)" class="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-200 hover:bg-indigo-700 transition flex items-center gap-2 active:scale-95">
                        <i class="far fa-file-word"></i> Baixar Word
                    </button>
                    <button onclick="conteudoGeradoView.baixarWord('${material.id}', false)" class="bg-white border border-slate-300 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition flex items-center gap-2 active:scale-95">
                        <i class="far fa-file-word text-slate-400"></i> Versão Aluno (Sem Gabarito)
                    </button>
                    <button onclick="window.Toast.show('Integração com o calendário em desenvolvimento.', 'info')" class="bg-white border border-slate-300 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition flex items-center gap-2">
                        <i class="far fa-calendar-plus"></i> Adicionar ao planejamento
                    </button>
                    <button onclick="window.Toast.show('Integração com Google Classroom em breve!', 'info')" class="bg-white border border-slate-300 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition flex items-center gap-2">
                        <i class="fab fa-google"></i> Adicionar ao Classroom
                    </button>
                    <button onclick="controller.navigate('criar-material')" class="ml-auto text-slate-400 hover:text-slate-700 text-sm font-bold flex items-center gap-2 transition-colors">
                        <i class="fas fa-sync-alt"></i> Gerar novamente
                    </button>
                </div>

                <!-- Layout Principal: Conteúdo (Esquerda) e Sidebar (Direita) -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    <!-- Área do Documento HTML -->
                    <div class="lg:col-span-8 bg-white border border-slate-200 shadow-sm rounded-3xl p-8 md:p-12 min-h-[600px] print:shadow-none print:border-none print:p-0">
                        <div id="documento-html-content" class="prose max-w-none prose-slate prose-headings:font-bold prose-h3:text-xl prose-h3:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600 marker:text-indigo-500">
                            ${material.conteudo_html || '<p class="text-slate-400 italic">O conteúdo gerado está vazio.</p>'}
                        </div>
                    </div>

                    <!-- Sidebar de Metadados -->
                    <div class="lg:col-span-4 space-y-6 sticky top-24 no-print">
                        <div class="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <h3 class="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">Detalhes</h3>
                            
                            <div class="space-y-4">
                                <div>
                                    <span class="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ferramenta</span>
                                    <span class="text-sm font-bold text-slate-700 capitalize">${ferramentaSafe.replace('-', ' ')}</span>
                                </div>
                                <div>
                                    <span class="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Disciplina</span>
                                    <span class="text-sm font-bold text-slate-700 capitalize">${material.disciplina || 'Geral'}</span>
                                </div>
                                <div>
                                    <span class="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Série</span>
                                    <span class="text-sm font-bold text-slate-700">${material.serie || '-'}</span>
                                </div>
                                <div>
                                    <span class="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tema</span>
                                    <span class="text-sm font-bold text-slate-700">${temaSafe}</span>
                                </div>
                                
                                ${material.bncc ? `
                                <div class="pt-4 border-t border-slate-200">
                                    <span class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Competências BNCC</span>
                                    <span class="inline-block bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded border border-indigo-200">${material.bncc}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Card de Próximo Passo -->
                        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 class="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                                <i class="fas fa-bolt text-amber-500"></i> Próximo passo
                            </h3>
                            <button onclick="controller.navigate('criar-material')" class="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition group flex items-center justify-between">
                                <div>
                                    <span class="block text-xs font-bold text-slate-700 group-hover:text-indigo-700">Lista de Exercícios</span>
                                    <span class="block text-[10px] text-slate-400">Treine antes da prova</span>
                                </div>
                                <i class="fas fa-chevron-right text-slate-300 group-hover:text-indigo-400 text-xs"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Renderiza as fórmulas matemáticas (LaTeX) caso a IA tenha gerado alguma equação
        const docContent = document.getElementById('documento-html-content');
        if (docContent && window.renderMathInElement) {
            renderMathInElement(docContent, {
                delimiters: [
                    { left: "$$", right: "$$", display: true },
                    { left: "$", right: "$", display: false }
                ],
                strict: false,
                throwOnError: false
            });
        }
    },

    /**
     * Converte o HTML gerado em um arquivo do Microsoft Word (.doc) e inicia o download.
     * @param {string} id - ID do material
     * @param {boolean} comGabarito - Se falso, tenta ocultar a área de gabarito antes de exportar.
     */
    baixarWord(id, comGabarito) {
        const material = (model.state.materiaisGerados || []).find(m => m.id === id);
        if (!material) return Toast.show("Material não encontrado para exportação.", "error");

        let htmlExport = material.conteudo_html || '';

        // Simplificação do Vanilla JS para remover gabarito: Remove trechos de texto indicativos.
        // Em um caso de uso real, a IA deve envolver o gabarito em uma tag específica, ex: <div class="gabarito">
        if (!comGabarito) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlExport;
            
            // Procura e remove elementos que a IA possa ter classificado como gabarito/respostas
            const tagsGabarito = tempDiv.querySelectorAll('.gabarito, .respostas, h3:contains("Gabarito"), h3:contains("Respostas")');
            tagsGabarito.forEach(el => el.remove());
            
            htmlExport = tempDiv.innerHTML;
            
            Toast.show("Baixando Versão do Aluno. Verifique as formatações.", "info");
        } else {
            Toast.show("Preparando download do Documento Word...", "info");
        }

        const nomeArquivo = (material.titulo || material.tema || 'Atividade').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        // Estrutura padrão exigida pelo MS Word para interpretar HTML adequadamente
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word</title><style>body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; } h1, h2, h3 { color: #333; } p { line-height: 1.5; color: #444; }</style></head><body>";
        const footer = "</body></html>";
        const sourceHTML = header + htmlExport + footer;
        
        // Codifica para URI format
        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        
        // Dispara o download nativo
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = nomeArquivo + '.doc';
        fileDownload.click();
        document.body.removeChild(fileDownload);
    },
    // Adicione em conteudoGeradoView
    renderDocumentoEmBranco(container) {
        const materialId = 'mat_' + Date.now();
        // Mock de um documento em branco
        this.currentMaterial = {
            id: materialId,
            titulo: "Novo Documento Sem Título",
            conteudo_html: "<h2>Título Principal</h2><p>Comece a digitar seu conteúdo aqui...</p>",
            tipo: "documento_livre"
        };
        
        this.render(container); // Chama a renderização normal
        
        // Ativa o contentEditable para o usuário editar
        setTimeout(() => {
            const painelTexto = document.getElementById('conteudo-html-render');
            if(painelTexto) {
                painelTexto.setAttribute("contenteditable", "true");
                painelTexto.classList.add("outline-none", "focus:ring-2", "focus:ring-primary/50", "rounded-xl", "p-4", "transition-all");
                Toast.show("Modo edição livre ativado! Você pode digitar na tela.", "info");
            }
        }, 100);
    }
};

if (typeof window !== 'undefined') {
    window.conteudoGeradoView = conteudoGeradoView;
}