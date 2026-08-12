import { model } from '../model.js';
import { controller } from '../controller.js';
export const bibliotecaView = {
    abaAtiva: 'criados',
    mudarAba(aba) {
        if (aba === 'comunidade') {
            controller.navigate('comunidade');
            return;
        }
        this.abaAtiva = aba;
        this.render('view-container');
    },
    render(container) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        const materiais = model.state.materiaisGerados || [];
        let conteudoHtml = '';
        if (materiais.length === 0) {
            conteudoHtml = this.gerarHTMLEmptyState();
        } else {
            const agrupados = this.agruparPorTipo(materiais);
            conteudoHtml = Object.keys(agrupados).map(tipo => {
                const itens = agrupados[tipo];
                const labelTipo = tipo.replace(/-/g, ' ').toUpperCase();

                const colorMap = {
                    'planejamento': { i: 'far fa-calendar-alt', c: '#4f46e5', bg: '#eef2ff' },
                    'dinamica-jogo': { i: 'fas fa-users', c: '#2563eb', bg: '#eff6ff' },
                    'atividade-imprimivel': { i: 'fas fa-print', c: '#059669', bg: '#ecfdf5' },
                    'avaliacao-prova': { i: 'fas fa-clipboard-list', c: '#ea580c', bg: '#fff7ed' }
                };
                const style = colorMap[tipo] || { i: 'fas fa-file-alt', c: '#64748b', bg: '#f8fafc' };
                return `
                    <div class="mb-10 animate-enter">
                        <div class="flex items-center gap-2 mb-4">
                            <div style="width: 0.5rem; height: 0.5rem; border-radius: 9999px; background-color: ${style.c};"></div>
                            <h3 style="font-weight: 700; color: #1e293b; font-size: 1.125rem; text-transform: capitalize;">${labelTipo.toLowerCase()} 
                                <span style="color: #94a3b8; font-weight: 400; font-size: 0.875rem; margin-left: 0.25rem;">(${itens.length})</span>
                            </h3>
                        </div>
                        <div class="stat-grid stat-grid--3">
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
                    <p class="text-slate-500 mt-1">Seus materiais e conteúdos pedagógicos gerados</p>
                </div>
                <!-- Abas Superiores -->
                <div class="mode-toggle-group" style="width: fit-content; margin-bottom: 2rem;">
                    <button type="button" onclick="bibliotecaView.mudarAba('comunidade')"
                            class="mode-toggle-btn interactive-element">
                        Comunidade
                    </button>
                    <button type="button" onclick="bibliotecaView.mudarAba('criados')"
                            class="mode-toggle-btn mode-toggle-btn--active interactive-element">
                        <i class="fas fa-magic" style="color: #4f46e5;"></i> Criados por mim 
                        <span style="background-color: #eef2ff; color: #4338ca; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.625rem; font-weight: 900; margin-left: 0.25rem;">${materiais.length}</span>
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
    gerarCardMaterial(m, style) {
        const tituloSafe = window.escapeHTML ? window.escapeHTML(m.titulo || m.tema || 'Material sem título') : (m.titulo || m.tema || 'Material sem título');
        const disciplinaSafe = window.escapeHTML ? window.escapeHTML(m.disciplina || 'Geral') : (m.disciplina || 'Geral');
        const serieSafe = window.escapeHTML ? window.escapeHTML(m.serie || 'Série não informada') : (m.serie || 'Série não informada');
        const dataFormatada = new Date(m.createdAt).toLocaleDateString('pt-BR');
        return `
            <div class="material-card interactive-element animate-enter group">
                <!-- Capa Ilustrativa Dinâmica -->
                <div class="material-card__cover" style="background-color: ${style.bg};">
                    <span class="material-card__badge">
                        ${disciplinaSafe}
                    </span>
                    <i class="${style.i} material-card__icon" style="color: ${style.c};"></i>
                </div>
                
                <!-- Informações e Ações -->
                <div class="material-card__body">
                    <h4 style="font-weight: 700; color: #1e293b; font-size: 1.125rem; margin-bottom: 0.375rem; line-height: 1.3;" class="line-clamp-2">${tituloSafe}</h4>
                    <p style="font-size: 0.75rem; color: #94a3b8; font-weight: 500; margin-bottom: 1.25rem;" class="line-clamp-1">${serieSafe} • Gerado em ${dataFormatada}</p>
                    
                    <div style="margin-top: auto; padding-top: 1rem; border-top: 1px solid #f8fafc; display: flex; gap: 0.5rem; align-items: center;">
                        <button type="button" onclick="bibliotecaView.abrirMaterial('${m.id}')" class="btn-primary interactive-element" style="flex: 1; padding: 0.75rem; font-size: 0.75rem; background-color: #4f46e5; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
                            <i class="fas fa-book-open"></i> Abrir material
                        </button>
                        ${m.compartilhado ? `
                            <button type="button" onclick="model.removerMaterialDaComunidade('${m.id}')" class="interactive-element" style="width: 2.75rem; height: 2.75rem; display: flex; align-items: center; justify-content: center; color: #7c3aed; background-color: #f3e8ff; border-radius: 0.75rem; border: 1px solid #ddd6fe; cursor: pointer; transition: all var(--transition-fast);" title="Material Público na Comunidade (Clique para retirar)">
                                <i class="fas fa-globe"></i>
                            </button>
                        ` : `
                            <button type="button" onclick="model.compartilharMaterial('${m.id}')" class="interactive-element" style="width: 2.75rem; height: 2.75rem; display: flex; align-items: center; justify-content: center; color: #94a3b8; border-radius: 0.75rem; border: 1px solid #f1f5f9; background: transparent; cursor: pointer; transition: all var(--transition-fast);" onmouseover="this.style.color='#7c3aed'; this.style.backgroundColor='#f3e8ff'; this.style.borderColor='#ddd6fe';" onmouseout="this.style.color='#94a3b8'; this.style.backgroundColor='transparent'; this.style.borderColor='#f1f5f9';" title="Tornar Público / Compartilhar com a Comunidade">
                                <i class="fas fa-globe"></i>
                            </button>
                        `}
                        <button type="button" onclick="bibliotecaView.excluirMaterial('${m.id}')" class="interactive-element" style="width: 2.75rem; height: 2.75rem; display: flex; align-items: center; justify-content: center; color: #94a3b8; border-radius: 0.75rem; border: 1px solid #f1f5f9; background: transparent; cursor: pointer; transition: all var(--transition-fast);" onmouseover="this.style.color='#ef4444'; this.style.backgroundColor='#fef2f2'; this.style.borderColor='#fee2e2';" onmouseout="this.style.color='#94a3b8'; this.style.backgroundColor='transparent'; this.style.borderColor='#f1f5f9';" title="Excluir Material">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },
    gerarHTMLEmptyState() {
        return `
            <div class="tool-empty-state animate-enter" style="max-width: 32rem; padding: 4rem 2rem; background-color: var(--color-white); border-radius: 1.5rem; border: 1px solid #f1f5f9; box-shadow: var(--shadow-sm); margin-top: 2rem;">
                <div class="tool-empty-state__icon-wrap" style="width: 6rem; height: 6rem;">
                    <i class="fas fa-folder-open" style="font-size: 2.25rem;"></i>
                </div>
                <h2 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">Sua biblioteca está vazia</h2>
                <p style="color: #64748b; font-weight: 500; font-size: 0.875rem;">Você ainda não gerou nenhum material pedagógico com IA.</p>
                <button type="button" onclick="controller.navigate('criar-material')" class="btn-primary interactive-element" style="margin-top: 2rem; padding: 0.875rem 2rem; background-color: #4f46e5; border-radius: 0.75rem; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3); display: flex; align-items: center; gap: 0.5rem;">
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
            model.saveLocal();
            if (window.Toast) window.Toast.show("Material excluído com sucesso.", "success");
            this.render('view-container');
        }
    }
};
if (typeof window !== 'undefined') {
    window.bibliotecaView = bibliotecaView;
}