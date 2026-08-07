import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';
import { aiService } from '../ai-service.js';

export const correcaoAutomaticaView = {
    abaAtiva: 'redacao', // 'redacao' ou 'camera'

    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const html = `
            <div class="fade-in pb-24">
                <div class="mb-8">
                    <h2 class="text-3xl font-bold text-slate-800">Correção com IA</h2>
                    <p class="text-slate-500">Corrija redações nos moldes do ENEM ou escaneie gabaritos.</p>
                </div>

                <div class="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200 mb-8">
                    <button onclick="correcaoAutomaticaView.mudarAba('redacao')" class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${this.abaAtiva === 'redacao' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                        <i class="fas fa-pen-nib mr-2"></i> Redação ENEM
                    </button>
                    <button onclick="correcaoAutomaticaView.mudarAba('camera')" class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${this.abaAtiva === 'camera' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                        <i class="fas fa-camera mr-2"></i> Gabarito por Foto
                    </button>
                </div>

                ${this.abaAtiva === 'redacao' ? this.renderRedacao() : this.renderCamera()}
            </div>
        `;
        container.innerHTML = html;
    },

    mudarAba(aba) {
        this.abaAtiva = aba;
        this.render('view-container');
    },

    renderRedacao() {
        return `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up">
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Tema da Redação (Opcional)</label>
                    <input type="text" id="tema-redacao" placeholder="Ex: Caminhos para combater a intolerância..." class="w-full border-2 border-slate-100 p-3 rounded-xl mb-4 outline-none focus:border-primary">
                    
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Texto do Aluno</label>
                    <textarea id="texto-redacao" rows="12" class="w-full border-2 border-slate-100 p-4 rounded-xl outline-none focus:border-primary custom-scrollbar resize-none font-serif text-sm" placeholder="Cole ou digite a redação aqui..."></textarea>
                    
                    <button onclick="correcaoAutomaticaView.corrigirRedacao()" class="w-full mt-4 bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                        <i class="fas fa-magic"></i> Avaliar (5 Competências)
                    </button>
                </div>

                <div id="resultado-redacao" class="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 h-full min-h-[400px]">
                    <i class="fas fa-clipboard-check text-5xl mb-4 opacity-50"></i>
                    <p class="font-medium text-center max-w-sm">Insira o texto e clique em Avaliar para receber as notas das 5 competências do ENEM e comentários detalhados.</p>
                </div>
            </div>
        `;
    },

    async corrigirRedacao() {
        const tema = document.getElementById('tema-redacao').value || "Tema Livre";
        const texto = document.getElementById('texto-redacao').value;
        const resultadoContainer = document.getElementById('resultado-redacao');

        if (!texto || texto.length < 50) return Toast.show("O texto é muito curto para ser avaliado.", "warning");

        resultadoContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center text-indigo-600">
                <i class="fas fa-circle-notch fa-spin text-4xl mb-4"></i>
                <p class="font-bold animate-pulse">Avaliando competências, sintaxe e coerência...</p>
            </div>
        `;

        try {
            // Reaproveitando a IA, enviando um JSON forçado
            const resultado = await aiService.gerarMaterial('correcao_enem', { 
                tema, 
                texto,
                formato: "Retorne um JSON exato contendo { 'notaTotal': numero, 'competencias': [{ 'numero': 1 a 5, 'nota': numero, 'comentario': 'texto' }], 'feedbackGeral': 'texto' }"
            });

            resultadoContainer.className = "bg-white p-6 rounded-2xl shadow-md border border-slate-200 h-full max-h-[600px] overflow-y-auto custom-scrollbar";
            
            resultadoContainer.innerHTML = `
                <div class="flex justify-between items-end mb-6 pb-4 border-b border-slate-100">
                    <h3 class="font-bold text-slate-700 text-lg">Resultado da Correção</h3>
                    <div class="text-right">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nota Final</span>
                        <div class="text-4xl font-black text-indigo-600">${resultado.notaTotal || 0}</div>
                    </div>
                </div>
                <div class="space-y-4 mb-6">
                    ${(resultado.competencias || []).map(c => `
                        <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div class="flex justify-between font-bold mb-2">
                                <span class="text-xs text-slate-500 uppercase tracking-wide">Competência ${c.numero}</span>
                                <span class="text-sm text-indigo-600">${c.nota} pts</span>
                            </div>
                            <p class="text-sm text-slate-700 leading-relaxed">${c.comentario}</p>
                        </div>
                    `).join('')}
                </div>
                <h4 class="font-bold text-slate-700 mb-2">Comentário Geral</h4>
                <p class="text-sm text-slate-600 leading-relaxed bg-indigo-50 p-4 rounded-xl border border-indigo-100">${resultado.feedbackGeral}</p>
            `;
            Toast.show("Redação corrigida!", "success");

        } catch (error) {
            resultadoContainer.innerHTML = `<p class="text-red-500 font-bold">Erro ao avaliar redação. Tente novamente.</p>`;
            Toast.show("Erro na API da IA.", "error");
        }
    },

    renderCamera() {
        return `
            <div class="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 text-center animate-slide-up">
                <div class="w-24 h-24 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
                    <i class="fas fa-camera-retro"></i>
                </div>
                <h3 class="text-2xl font-bold text-slate-800 mb-2">Leitor de Gabarito por Foto</h3>
                <p class="text-slate-500 mb-8 max-w-lg mx-auto">Em breve: Aponte a câmera do celular para a folha de respostas e deixe o sistema corrigir 40 questões em 3 segundos via Visão Computacional (Tesseract.js).</p>
                <button disabled class="bg-slate-200 text-slate-400 px-8 py-3 rounded-xl font-bold cursor-not-allowed">
                    <i class="fas fa-lock mr-2"></i> Módulo em Desenvolvimento
                </button>
            </div>
        `;
    }
};

if (typeof window !== 'undefined') window.correcaoAutomaticaView = correcaoAutomaticaView;