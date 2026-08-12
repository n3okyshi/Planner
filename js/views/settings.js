import { model } from '../model.js';
import { controller } from '../controller.js';
import { Toast } from '../components/toast.js';

export const settingsView = {
    render(container, userConfig) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const config = userConfig || (model.state && model.state.userConfig) || {};
        const user = model.currentUser || (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser);

        let lastSyncText = "Agora mesmo";
        if (model.state.lastUpdate) {
            const date = new Date(model.state.lastUpdate);
            lastSyncText = date.toLocaleDateString() + ' às ' + date.toLocaleTimeString().slice(0, 5);
        }

        const tipoAtual = config.periodType || 'bimestre';
        const listaPeriodos = model.state.periodosDatas ? (model.state.periodosDatas[tipoAtual] || []) : [];
        const rawProfName = config.profName || (user ? user.displayName : '') || '';
        const nomeProfSafe = rawProfName ? (window.escapeHTML ? window.escapeHTML(rawProfName) : rawProfName) : '';
        const nomeEscolaSafe = config.schoolName ? (window.escapeHTML ? window.escapeHTML(config.schoolName) : config.schoolName) : '';
        const cidadeSafe = config.cidade ? (window.escapeHTML ? window.escapeHTML(config.cidade) : config.cidade) : '';

        const logoUrl = config.logo || '';
        const showData = config.showData !== false;
        const showDisciplina = config.showDisciplina !== false;
        const showSerie = config.showSerie !== false;

        container.innerHTML = `
            <div class="animate-enter" style="display: flex; flex-direction: column; gap: var(--spacing-6); padding-bottom: var(--spacing-8); max-width: 1080px; margin: 0 auto;">
                
                <!-- TOP HEADER -->
                <div class="card" style="padding: var(--spacing-4) var(--spacing-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-slate-800); letter-spacing: -0.025em; display: flex; align-items: center; gap: var(--spacing-2);">
                            <i class="fas fa-cog" style="color: var(--color-primary);"></i> Configurações do Sistema
                        </h2>
                        <p style="font-size: 0.875rem; color: var(--color-slate-500);">Gerencie seu perfil docente, sincronização com a nuvem e cabeçalho de avaliações.</p>
                    </div>
                </div>

                <!-- MÓDULO 1: CABEÇALHO DOS MATERIAIS (SIDE-BY-SIDE FORM + PREVIEW) -->
                <div class="card" style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-6);">
                    <div style="border-bottom: 1px solid var(--color-slate-100); padding-bottom: var(--spacing-3);">
                        <h3 style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-800); display: flex; align-items: center; gap: var(--spacing-2);">
                            <i class="fas fa-heading" style="color: var(--color-primary);"></i> Cabeçalho Oficial de Provas e Materiais
                        </h3>
                        <p style="font-size: 0.8125rem; color: var(--color-slate-500);">Estes dados são injetados automaticamente na exportação de provas em PDF e Word.</p>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--spacing-8); align-items: start;">
                        
                        <!-- Coluna Esquerda: Formulário -->
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-4);">
                            <!-- Upload de Logo -->
                            <div>
                                <label class="form-label">Brasão / Logo da Escola</label>
                                <div style="display: flex; align-items: center; gap: var(--spacing-4);">
                                    <div style="width: 4rem; height: 4rem; border: 2px dashed var(--color-slate-300); border-radius: var(--radius-xl); display: flex; align-items: center; justify-content: center; color: var(--color-slate-300); background-color: var(--color-slate-50); overflow: hidden; flex-shrink: 0;">
                                        ${logoUrl ? `<img src="${logoUrl}" style="width: 100%; height: 100%; object-fit: contain; padding: 2px;">` : `<i class="fas fa-building" style="font-size: 1.5rem;"></i>`}
                                    </div>
                                    <div style="display: flex; flex-direction: column; gap: 0.375rem;">
                                        <input type="file" id="upload-logo-input" style="display: none;" accept="image/png, image/jpeg, image/jpg" onchange="settingsView.processarUploadLogo(event)">
                                        <button type="button" onclick="document.getElementById('upload-logo-input').click()" class="btn-secondary" style="padding: 0.375rem 0.75rem; font-size: 0.75rem;">
                                            <i class="fas fa-upload"></i> <span>Enviar Logo</span>
                                        </button>
                                        <div style="font-size: 0.6875rem; color: var(--color-slate-400); display: flex; gap: 0.5rem; align-items: center;">
                                            <span>PNG ou JPG até 5MB</span>
                                            ${logoUrl ? `<button type="button" style="color: #ef4444; font-weight: 700; background: none; border: none; cursor: pointer; text-decoration: underline;" onclick="settingsView.removerLogo()">Remover</button>` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label class="form-label">Nome da Escola / Instituição</label>
                                <input type="text" id="config-escola" value="${nomeEscolaSafe}" oninput="settingsView.atualizarPreview()" class="form-input" placeholder="Ex: E.E. Professor João Silva">
                            </div>

                            <div>
                                <label class="form-label">Cidade / Estado</label>
                                <input type="text" id="config-cidade" value="${cidadeSafe}" oninput="settingsView.atualizarPreview()" class="form-input" placeholder="Ex: São Paulo - SP">
                            </div>

                            <div>
                                <label class="form-label">Nome do Professor(a)</label>
                                <input type="text" id="config-prof" value="${nomeProfSafe}" oninput="settingsView.atualizarPreview()" class="form-input" placeholder="Ex: Prof. Dr. Carlos Souza">
                            </div>

                            <div style="display: flex; flex-direction: column; gap: var(--spacing-2); padding-top: var(--spacing-3); border-top: 1px solid var(--color-slate-100);">
                                <label class="form-label" style="margin-bottom: 0;">Campos no Cabeçalho</label>
                                ${this.gerarToggle('config-show-data', 'Exibir campo de data', showData)}
                                ${this.gerarToggle('config-show-disciplina', 'Exibir campo de disciplina', showDisciplina)}
                                ${this.gerarToggle('config-show-serie', 'Exibir campo de série/turma', showSerie)}
                            </div>

                            <button type="button" onclick="settingsView.salvarCabecalho()" class="btn-primary" style="width: 100%; justify-content: center; padding: 0.75rem; margin-top: 0.5rem;">
                                <i class="fas fa-save"></i> <span>Salvar Cabeçalho</span>
                            </button>
                        </div>

                        <!-- Coluna Direita: Live Preview -->
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-3); position: sticky; top: 5.5rem;">
                            <span style="font-size: 0.6875rem; font-weight: 900; color: var(--color-slate-400); text-transform: uppercase; letter-spacing: 0.1em;">Pré-Visualização em Tempo Real</span>
                            
                            <div style="background-color: white; border: 1px solid var(--color-slate-300); border-radius: var(--radius-xl); overflow: hidden; box-shadow: var(--shadow-md);">
                                <div style="background-color: var(--color-primary); color: white; padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; font-weight: 800; font-size: 0.875rem;">
                                    <div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden;">
                                        <div id="prev-logo-container" style="width: 1.75rem; height: 1.75rem; background-color: white; border-radius: var(--radius-sm); display: ${logoUrl ? 'flex' : 'none'}; align-items: center; justify-content: center; overflow: hidden; padding: 1px; flex-shrink: 0;">
                                            <img id="prev-logo" src="${logoUrl}" style="width: 100%; height: 100%; object-fit: contain;">
                                        </div>
                                        <span id="prev-escola" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${nomeEscolaSafe || 'Nome da Escola'}</span>
                                    </div>
                                    <span id="prev-cidade" style="font-size: 0.6875rem; opacity: 0.85; font-weight: 700; white-space: nowrap; margin-left: 0.5rem;">${cidadeSafe}</span>
                                </div>

                                <div style="padding: 1rem; background-color: #fafafa; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.75rem; color: var(--color-slate-600);">
                                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--color-slate-200); padding-bottom: 0.5rem;">
                                        <div style="flex: 1;">
                                            <span style="font-size: 0.5625rem; font-weight: 800; color: var(--color-slate-400); text-transform: uppercase; display: block;">Professor(a)</span>
                                            <strong id="prev-prof" style="color: var(--color-slate-800); font-size: 0.8125rem;">${nomeProfSafe || 'Professor(a)'}</strong>
                                        </div>
                                        <div style="flex: 1; border-left: 1px solid var(--color-slate-200); padding-left: 0.5rem; display: ${showDisciplina ? 'block' : 'none'};" id="prev-container-disciplina">
                                            <span style="font-size: 0.5625rem; font-weight: 800; color: var(--color-slate-400); text-transform: uppercase; display: block;">Disciplina</span>
                                            <strong style="color: var(--color-slate-800); font-size: 0.8125rem;">—</strong>
                                        </div>
                                        <div style="flex: 1; border-left: 1px solid var(--color-slate-200); padding-left: 0.5rem; display: ${showSerie ? 'block' : 'none'};" id="prev-container-serie">
                                            <span style="font-size: 0.5625rem; font-weight: 800; color: var(--color-slate-400); text-transform: uppercase; display: block;">Turma</span>
                                            <strong style="color: var(--color-slate-800); font-size: 0.8125rem;">—</strong>
                                        </div>
                                        <div style="flex: 1; border-left: 1px solid var(--color-slate-200); padding-left: 0.5rem; display: ${showData ? 'block' : 'none'};" id="prev-container-data">
                                            <span style="font-size: 0.5625rem; font-weight: 800; color: var(--color-slate-400); text-transform: uppercase; display: block;">Data</span>
                                            <strong style="color: var(--color-slate-800); font-size: 0.8125rem;">__/__/____</strong>
                                        </div>
                                    </div>

                                    <div style="padding: 1.5rem 0; text-align: center; color: var(--color-slate-400); font-style: italic;">
                                        O enunciado da avaliação e as questões aparecem aqui...
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- MÓDULO 2: CONTA E SINCRONIZAÇÃO EM NUVEM -->
                <div class="card" style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
                    <div style="border-bottom: 1px solid var(--color-slate-100); padding-bottom: var(--spacing-3);">
                        <h3 style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-800); display: flex; align-items: center; gap: var(--spacing-2);">
                            <i class="fas fa-cloud" style="color: var(--color-primary);"></i> Conta e Sincronização em Nuvem (Firebase)
                        </h3>
                        <p style="font-size: 0.8125rem; color: var(--color-slate-500);">Mantenha seus dados seguros e sincronizados entre múltiplos dispositivos.</p>
                    </div>

                    <div>
                        ${user ? this.renderLogado(user, lastSyncText) : this.renderDeslogado()}
                    </div>
                </div>

                <!-- MÓDULO 3: ANO LETIVO E DATAS (SIDE-BY-SIDE) -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--spacing-6); align-items: start;">
                    
                    <!-- ESTRUTURA LETIVA -->
                    <div class="card" style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
                        <div style="border-bottom: 1px solid var(--color-slate-100); padding-bottom: var(--spacing-3);">
                            <h3 style="font-size: 1rem; font-weight: 800; color: var(--color-slate-800); display: flex; align-items: center; gap: var(--spacing-2);">
                                <i class="fas fa-calendar-alt" style="color: var(--color-primary);"></i> Estrutura do Ano Letivo
                            </h3>
                            <p style="font-size: 0.75rem; color: var(--color-slate-500);">Como sua instituição divide o calendário escolar?</p>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: var(--spacing-2);">
                            ${this.renderOptionPeriodo('bimestre', 'Bimestral (4 Períodos / Bimestres)', config.periodType)}
                            ${this.renderOptionPeriodo('trimestre', 'Trimestral (3 Períodos / Trimestres)', config.periodType)}
                            ${this.renderOptionPeriodo('semestre', 'Semestral (2 Períodos / Semestres)', config.periodType)}
                        </div>
                    </div>

                    <!-- DATAS DOS PERÍODOS -->
                    <div class="card" style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
                        <div style="border-bottom: 1px solid var(--color-slate-100); padding-bottom: var(--spacing-3);">
                            <h3 style="font-size: 1rem; font-weight: 800; color: var(--color-slate-800); display: flex; align-items: center; gap: var(--spacing-2);">
                                <i class="fas fa-calendar-day" style="color: var(--color-primary);"></i> Limites de Datas por Período
                            </h3>
                            <p style="font-size: 0.75rem; color: var(--color-slate-500);">Defina início e fim de cada período para o cálculo de presenças.</p>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: var(--spacing-3);">
                            ${listaPeriodos.map((p, idx) => `
                                <div style="padding: var(--spacing-3); background-color: var(--color-slate-50); border: 1px solid var(--color-slate-200); border-radius: var(--radius-xl); display: flex; flex-direction: column; gap: 0.375rem;">
                                    <span style="font-size: 0.75rem; font-weight: 800; color: var(--color-slate-700); text-transform: uppercase;">${window.escapeHTML ? window.escapeHTML(p.nome) : p.nome}</span>
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <input type="date" value="${window.escapeHTML ? window.escapeHTML(p.inicio) : p.inicio}"
                                               onchange="controller.updatePeriodDate(${idx}, 'inicio', this.value)"
                                               class="form-input" style="padding: 0.375rem 0.5rem; font-size: 0.8125rem;">
                                        <span style="font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-400);">ATÉ</span>
                                        <input type="date" value="${window.escapeHTML ? window.escapeHTML(p.fim) : p.fim}"
                                               onchange="controller.updatePeriodDate(${idx}, 'fim', this.value)"
                                               class="form-input" style="padding: 0.375rem 0.5rem; font-size: 0.8125rem;">
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                </div>

                <!-- MÓDULO 4: BACKUP LOCAL E APARÊNCIA (SIDE-BY-SIDE) -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--spacing-6); align-items: start;">
                    
                    <div class="card" style="padding: var(--spacing-6); display: flex; flex-direction: column; gap: var(--spacing-4);">
                        <div style="border-bottom: 1px solid var(--color-slate-100); padding-bottom: var(--spacing-3); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                            <div>
                                <h3 style="font-size: 1rem; font-weight: 800; color: var(--color-slate-800); display: flex; align-items: center; gap: var(--spacing-2);">
                                    <i class="fas fa-palette" style="color: var(--color-primary);"></i> Personalização de Cor de Destaque
                                </h3>
                                <p style="font-size: 0.75rem; color: var(--color-slate-500);">Personalize a paleta visual do Planner Pro com qualquer cor ou código hexadecimal.</p>
                            </div>
                            <button type="button" onclick="controller.resetTheme()" class="btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.625rem;" title="Restaurar a cor padrão do sistema (Azul #3b82f6)">
                                <i class="fas fa-undo" style="margin-right: 0.25rem;"></i> Retornar ao Padrão
                            </button>
                        </div>

                        <!-- SELETOR INTERATIVO / HEXADECIMAL -->
                        <div style="display: flex; align-items: center; gap: 1rem; padding: 0.875rem; background: var(--color-slate-50); border: 1px solid var(--color-slate-200); border-radius: var(--radius-xl);">
                            <div style="position: relative; width: 3rem; height: 3rem; border-radius: var(--radius-lg); overflow: hidden; border: 2px solid var(--color-slate-300); box-shadow: var(--shadow-sm); flex-shrink: 0; cursor: pointer;">
                                <input type="color" id="input-color-picker" value="${config.themeColor || '#3b82f6'}" 
                                       oninput="document.getElementById('input-hex-color').value = this.value; controller.updateTheme(this.value);" 
                                       style="position: absolute; top: -10px; left: -10px; width: 60px; height: 60px; border: none; cursor: pointer;">
                            </div>
                            <div style="flex: 1;">
                                <label style="font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-500); text-transform: uppercase;">Código Hexadecimal</label>
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
                                    <input type="text" id="input-hex-color" value="${config.themeColor || '#3b82f6'}" maxlength="7"
                                           placeholder="#3b82f6" 
                                           class="form-input" style="font-family: monospace; font-weight: 800; text-transform: uppercase; padding: 0.375rem 0.75rem; max-width: 140px;"
                                           onchange="if(/^#([0-9A-F]{3}){1,2}$/i.test(this.value)) { document.getElementById('input-color-picker').value = this.value; controller.updateTheme(this.value); }">
                                    <span style="font-size: 0.75rem; color: var(--color-slate-400);">Clique no mapa ou digite a cor</span>
                                </div>
                            </div>
                        </div>

                        <!-- PALETAS PRÉ-DEFINIDAS RÁPIDAS -->
                        <div>
                            <span style="font-size: 0.6875rem; font-weight: 800; color: var(--color-slate-400); text-transform: uppercase; display: block; margin-bottom: 0.5rem;">Paletas Rápidas</span>
                            <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-3);">
                                ${this.renderColorOption('#3b82f6', 'Azul Padrão', config.themeColor || '#3b82f6')}
                                ${this.renderColorOption('#4f46e5', 'Índigo', config.themeColor)}
                                ${this.renderColorOption('#0891b2', 'Ciano', config.themeColor)}
                                ${this.renderColorOption('#7c3aed', 'Roxo', config.themeColor)}
                                ${this.renderColorOption('#db2777', 'Rosa', config.themeColor)}
                                ${this.renderColorOption('#059669', 'Verde', config.themeColor)}
                                ${this.renderColorOption('#ea580c', 'Laranja', config.themeColor)}
                                ${this.renderColorOption('#1e293b', 'Slate', config.themeColor)}
                            </div>
                        </div>
                    </div>

                    <div class="card" style="padding: var(--spacing-6); display: flex; flex-direction: column; justify-content: space-between; gap: var(--spacing-4);">
                        <div style="border-bottom: 1px solid var(--color-slate-100); padding-bottom: var(--spacing-3);">
                            <h3 style="font-size: 1rem; font-weight: 800; color: var(--color-slate-800); display: flex; align-items: center; gap: var(--spacing-2);">
                                <i class="fas fa-database" style="color: var(--color-primary);"></i> Backup Físico Local (JSON)
                            </h3>
                            <p style="font-size: 0.75rem; color: var(--color-slate-500);">Baixe uma cópia de segurança completa de todas as suas turmas e notas.</p>
                        </div>

                        <button onclick="controller.exportData()" class="btn-primary" style="width: 100%; justify-content: center; padding: 0.75rem; background-color: var(--color-slate-800);">
                            <i class="fas fa-download"></i> <span>Baixar Backup JSON</span>
                        </button>
                    </div>

                </div>

            </div>
        `;

        setTimeout(() => this.atualizarPreview(), 100);
    },

    atualizarPreview() {
        const escola = document.getElementById('config-escola')?.value || 'Nome da Escola';
        const cidade = document.getElementById('config-cidade')?.value || '';
        const prof = document.getElementById('config-prof')?.value || 'Professor(a)';

        const showData = document.getElementById('config-show-data')?.checked;
        const showDisciplina = document.getElementById('config-show-disciplina')?.checked;
        const showSerie = document.getElementById('config-show-serie')?.checked;

        const prevEscola = document.getElementById('prev-escola');
        const prevCidade = document.getElementById('prev-cidade');
        const prevProf = document.getElementById('prev-prof');

        if (prevEscola) prevEscola.innerText = escola;
        if (prevCidade) prevCidade.innerText = cidade;
        if (prevProf) prevProf.innerText = prof;

        const cData = document.getElementById('prev-container-data');
        const cDisc = document.getElementById('prev-container-disciplina');
        const cSerie = document.getElementById('prev-container-serie');

        if (cData) cData.style.display = showData ? 'block' : 'none';
        if (cDisc) cDisc.style.display = showDisciplina ? 'block' : 'none';
        if (cSerie) cSerie.style.display = showSerie ? 'block' : 'none';
    },

    salvarCabecalho() {
        if (!model.state.userConfig) model.state.userConfig = {};

        model.state.userConfig.schoolName = document.getElementById('config-escola')?.value || '';
        model.state.userConfig.cidade = document.getElementById('config-cidade')?.value || '';
        model.state.userConfig.profName = document.getElementById('config-prof')?.value || '';

        model.state.userConfig.showData = document.getElementById('config-show-data')?.checked;
        model.state.userConfig.showDisciplina = document.getElementById('config-show-disciplina')?.checked;
        model.state.userConfig.showSerie = document.getElementById('config-show-serie')?.checked;

        model.saveLocal();
        Toast.show("Cabeçalho atualizado com sucesso!", "success");
    },

    processarUploadLogo(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            if (window.Toast) window.Toast.show("A imagem deve ter no máximo 5MB.", "warning");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                let width = img.width;
                let height = img.height;
                const maxSize = 250;
                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                const isJpeg = file.type === 'image/jpeg';
                const base64Logo = canvas.toDataURL(isJpeg ? 'image/jpeg' : 'image/png', isJpeg ? 0.8 : undefined);
                if (!model.state.userConfig) model.state.userConfig = {};
                model.state.userConfig.logo = base64Logo;
                model.saveLocal();
                if (window.Toast) window.Toast.show("Logo da instituição atualizado!", "success");

                settingsView.render('view-container');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    removerLogo() {
        if (model.state.userConfig && model.state.userConfig.logo) {
            model.state.userConfig.logo = null;
            model.saveLocal();
            if (window.Toast) window.Toast.show("Logo removido.", "info");
            settingsView.render('view-container');
        }
    },

    gerarToggle(id, label, isChecked) {
        return `
            <label style="display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-3); background-color: var(--color-white); border: 1px solid var(--color-slate-200); border-radius: var(--radius-xl); cursor: pointer;">
                <span style="font-size: 0.8125rem; font-weight: 700; color: var(--color-slate-700); user-select: none;">${label}</span>
                <input type="checkbox" id="${id}" ${isChecked ? 'checked' : ''} onchange="settingsView.atualizarPreview()" style="width: 1.25rem; height: 1.25rem; accent-color: var(--color-primary); cursor: pointer;">
            </label>
        `;
    },

    renderLogado(user, lastSyncText) {
        const nomeSafe = window.escapeHTML ? window.escapeHTML(user.displayName) : user.displayName;
        const emailSafe = window.escapeHTML ? window.escapeHTML(user.email) : user.email;
        const nomeEncodado = encodeURIComponent(nomeSafe);
        const urlFoto = user.photoURL || 'https://ui-avatars.com/api/?name=' + nomeEncodado + '&background=e0e7ff&color=4f46e5';

        return `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                <div style="display: flex; align-items: center; gap: var(--spacing-4);">
                    <img src="${urlFoto}" 
                         referrerpolicy="no-referrer"
                         onerror="this.onerror=null;this.src='assets/icons/icon-192.png';"
                         style="width: 3.5rem; height: 3.5rem; border-radius: 50%; border: 3px solid var(--color-primary-light); box-shadow: var(--shadow-sm); object-fit: cover;" 
                         alt="Foto de perfil">
                    <div>
                        <h4 style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-800);">${nomeSafe}</h4>
                        <p style="font-size: 0.8125rem; color: var(--color-slate-500);">${emailSafe}</p>
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
                            <span class="badge" style="background-color: #ecfdf5; color: #059669; font-weight: 800;">
                                <i class="fas fa-check-circle"></i> Sincronizado
                            </span>
                            <span style="font-size: 0.6875rem; color: var(--color-slate-400);">Última att: ${lastSyncText}</span>
                        </div>
                    </div>
                </div>

                <button onclick="controller.handleLogout()" class="btn-secondary" style="color: #ef4444; border-color: #fecaca;">
                    <i class="fas fa-sign-out-alt"></i> <span>Encerrar Sessão</span>
                </button>
            </div>
        `;
    },

    renderDeslogado() {
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-4);">
                <div>
                    <h4 style="font-size: 1.125rem; font-weight: 800; color: var(--color-slate-800);">Salve seus dados na nuvem</h4>
                    <p style="font-size: 0.875rem; color: var(--color-slate-500); max-width: 480px; margin-top: 0.25rem;">Faça login com sua conta Google para sincronizar automaticamente turmas, avaliações e planejamentos.</p>
                </div>

                <button onclick="controller.handleLogin()" class="btn-primary" style="padding: 0.75rem 1.5rem;">
                    <i class="fab fa-google"></i> <span>Fazer Login com Google</span>
                </button>
            </div>
        `;
    },

    renderOptionPeriodo(valor, label, atual) {
        const isSelected = valor === atual;
        const bgStyle = isSelected
            ? 'background-color: var(--color-primary-light); border: 2px solid var(--color-primary); color: var(--color-primary); font-weight: 800;'
            : 'background-color: var(--color-white); border: 1px solid var(--color-slate-200); color: var(--color-slate-700);';

        return `
            <button onclick="controller.updatePeriodType('${valor}')" 
                    style="width: 100%; padding: var(--spacing-3) var(--spacing-4); border-radius: var(--radius-xl); text-align: left; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all var(--transition-fast); ${bgStyle}">
                <span>${label}</span>
                ${isSelected ? '<i class="fas fa-check-circle" style="color: var(--color-primary);"></i>' : ''}
            </button>
        `;
    },

    renderColorOption(hex, nome, atual) {
        const isSelected = hex === atual;
        const borderStyle = isSelected ? 'outline: 3px solid var(--color-slate-800); transform: scale(1.15);' : '';

        return `
            <button onclick="controller.updateTheme('${hex}')" 
                    style="width: 2.25rem; height: 2.25rem; border-radius: 50%; background-color: ${hex}; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform var(--transition-fast); ${borderStyle}" 
                    title="${nome}">
                ${isSelected ? '<i class="fas fa-check" style="color: white; font-size: 0.75rem;"></i>' : ''}
            </button>
        `;
    }
};

if (typeof window !== 'undefined') {
    window.settingsView = settingsView;
}
