window.bnccView = {
    selecionarCallback: null,
    dataCache: {},
    coresComponentes: {
        "Língua Portuguesa": "#2563eb", "Arte": "#db2777", "Educação Física": "#ea580c", "Língua Inglesa": "#475569",
        "Matemática": "#dc2626",
        "Ciências": "#16a34a", "Ciências da Natureza": "#16a34a",
        "Geografia": "#ca8a04", "História": "#9333ea", "Ensino Religioso": "#0d9488",
        "Linguagens e suas Tecnologias": "#2563eb", "Matemática e suas Tecnologias": "#dc2626",
        "Ciências Humanas e Sociais Aplicadas": "#9333ea",
        "O eu, o outro e o nós": "#4f46e5", "Corpo, gestos e movimentos": "#0891b2",
        "Traços, sons, cores e formas": "#db2777", "Escuta, fala, pensamento e imaginação": "#7c3aed",
        "Espaços, tempos, quantidades, relações e transformações": "#059669"
    },
    mapaEixosBNCC: {
        "Língua Portuguesa": ["Oralidade", "Leitura", "Escrita", "Análise linguística/semiótica"],
        "Arte": ["Artes visuais", "Dança", "Música", "Teatro"],
        "Matemática": ["Números", "Álgebra", "Geometria", "Grandezas e medidas", "Probabilidade e estatística"],
        "Ciências": ["Matéria e Energia", "Vida e Evolução", "Terra e Universo"],
        "Geografia": ["O sujeito e seu lugar no mundo", "Conexões e escalas", "Mundo do trabalho", "Natureza, ambientes e qualidade de vida"],
        "História": ["Mundo pessoal", "Trabalho", "Formas de organização social", "O mundo contemporâneo"]
    },
    async render(container, preNivel = null, preSerie = null, callbackExterno = null) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        this.selecionarCallback = callbackExterno;
        const html = `
            <div class="fade-in flex flex-col h-full">
                <div class="mb-6 border-b border-slate-100 pb-4 shrink-0">
                    <h3 class="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <i class="fas fa-book-open text-primary"></i> 
                        Base Nacional Comum Curricular
                    </h3>
                    <p class="text-slate-500 text-xs mt-1">
                        ${this.selecionarCallback
                            ? '<span class="text-emerald-600 font-bold">Modo Seleção:</span> Escolha a habilidade para adicionar ao seu plano.'
                            : 'Consulte códigos e habilidades da BNCC.'}
                    </p>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
                    <aside class="space-y-4 overflow-y-auto custom-scrollbar pr-2">
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                            <div>
                                <label class="text-xs font-bold text-slate-400 uppercase mb-1 block">1. Nível de Ensino</label>
                                <select id="bncc-nivel" onchange="bnccView.updateFiltros(this.value)" 
                                        class="w-full border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:border-primary bg-slate-50 focus:bg-white transition-colors">
                                    <option value="">Selecione...</option>
                                    <option value="Educação Infantil">Educação Infantil</option>
                                    <option value="Ensino Fundamental">Ensino Fundamental</option>
                                    <option value="Ensino Médio">Ensino Médio</option>
                                </select>
                            </div>
                            <div>
                                <label class="text-xs font-bold text-slate-400 uppercase mb-1 block">2. Componente</label>
                                <select id="bncc-componente" onchange="bnccView.carregarEixos(this.value)" 
                                        class="w-full border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:border-primary bg-white disabled:bg-slate-100 disabled:text-slate-400">
                                    <option value="">Aguardando nível...</option>
                                </select>
                            </div>
                            <div>
                                <label class="text-xs font-bold text-slate-400 uppercase mb-1 block">3. Eixo Temático</label>
                                <select id="bncc-eixo" disabled
                                        class="w-full border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:border-primary bg-slate-50 disabled:opacity-60 transition-colors">
                                    <option value="">Geral (Todos)</option>
                                </select>
                            </div>
                            <div>
                                <label class="text-xs font-bold text-slate-400 uppercase mb-1 block">4. Ano / Série</label>
                                <select id="bncc-ano" disabled
                                        class="w-full border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:border-primary bg-slate-50 disabled:opacity-60 transition-colors">
                                    <option value="">Todos</option>
                                </select>
                            </div>
                            <button onclick="bnccView.pesquisar()" class="w-full btn-primary py-3 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2">
                                <i class="fas fa-search"></i> Buscar Habilidades
                            </button>
                        </div>
                    </aside>
                    <div class="lg:col-span-3 bg-slate-50 rounded-2xl border border-slate-200 relative flex flex-col h-[600px] lg:h-auto">
                        <div id="bncc-resultados" class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                            <div class="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                <i class="fas fa-search text-4xl mb-4"></i>
                                <p>Utilize os filtros para encontrar habilidades.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
        if (preNivel) {
            const nivelSelect = document.getElementById('bncc-nivel');
            if (preNivel.includes("Fundamental")) nivelSelect.value = "Ensino Fundamental";
            else if (preNivel.includes("Médio") || preNivel.includes("Medio")) nivelSelect.value = "Ensino Médio";
            else if (preNivel.includes("Infantil")) nivelSelect.value = "Educação Infantil";
            this.updateFiltros(nivelSelect.value);
            if (preSerie) {
                setTimeout(() => {
                    const anoSelect = document.getElementById('bncc-ano');
                    Array.from(anoSelect.options).forEach(opt => {
                        if (opt.value.includes(preSerie.split(' ')[0])) anoSelect.value = opt.value;
                    });
                }, 100);
            }
        }
    },
    updateFiltros(nivel) {
        const compSelect = document.getElementById('bncc-componente');
        const anoSelect = document.getElementById('bncc-ano');
        const eixoSelect = document.getElementById('bncc-eixo');
        eixoSelect.innerHTML = '<option value="">Geral (Todos)</option>';
        eixoSelect.disabled = true;
        const categorias = {
            "Ensino Fundamental": ["Língua Portuguesa", "Matemática", "Ciências", "Geografia", "História", "Arte", "Educação Física", "Ensino Religioso", "Língua Inglesa"],
            "Ensino Médio": ["Linguagens e suas Tecnologias", "Matemática e suas Tecnologias", "Ciências da Natureza", "Ciências Humanas e Sociais"],
            "Educação Infantil": ["O eu, o outro e o nós", "Corpo, gestos e movimentos", "Traços, sons, cores e formas", "Escuta, fala, pensamento e imaginação", "Espaços, tempos, quantidades, relações e transformações"]
        };
        compSelect.innerHTML = `<option value="">Selecione...</option>` + (categorias[nivel] || []).map(c => `<option value="${c}">${c}</option>`).join('');
        if (nivel) {
            const anos = {
                "Ensino Fundamental": ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano", "6º Ano", "7º Ano", "8º Ano", "9º Ano"],
                "Ensino Médio": ["1ª Série", "2ª Série", "3ª Série"],
                "Educação Infantil": ["Bebês", "Crianças bem pequenas", "Crianças pequenas"]
            };
            anoSelect.innerHTML = `<option value="">Todos</option>` + (anos[nivel] || []).map(a => `<option value="${a}">${a}</option>`).join('');
            anoSelect.disabled = false;
            anoSelect.classList.remove('bg-slate-50');
            anoSelect.classList.add('bg-white');
        } else {
            anoSelect.disabled = true;
        }
    },
    carregarEixos(componente) {
        const eixoSelect = document.getElementById('bncc-eixo');
        if (!componente) {
            eixoSelect.innerHTML = '<option value="">Selecione o componente...</option>';
            eixoSelect.disabled = true;
            return;
        }
        const chaveMapa = Object.keys(this.mapaEixosBNCC).find(k => k === componente || componente.includes(k));
        const eixos = this.mapaEixosBNCC[chaveMapa] || [];
        if (eixos.length > 0) {
            eixoSelect.innerHTML = '<option value="">Todos os Eixos</option>' + eixos.map(e => `<option value="${e}">${e}</option>`).join('');
            eixoSelect.disabled = false;
            eixoSelect.classList.remove('bg-slate-50');
            eixoSelect.classList.add('bg-white');
        } else {
            eixoSelect.innerHTML = '<option value="">Geral</option>';
            eixoSelect.disabled = true;
        }
    },
    async pesquisar() {
        const nivel = document.getElementById('bncc-nivel').value;
        const componente = document.getElementById('bncc-componente').value;
        const anoBusca = document.getElementById('bncc-ano').value;
        const eixoBusca = document.getElementById('bncc-eixo').value;
        const resContainer = document.getElementById('bncc-resultados');
        if (!nivel || !componente) return alert("Selecione Nível e Componente.");
        resContainer.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-primary"><i class="fas fa-circle-notch fa-spin text-4xl mb-3"></i><p>Consultando base de dados...</p></div>`;
        try {
            let arquivoNivel = nivel === "Ensino Médio" ? "Ensino_Medio" : nivel;
            const filePath = `./assets/BNCC/BNCC_${arquivoNivel}.json`;
            if (!this.dataCache[nivel]) {
                const response = await fetch(filePath);
                if (!response.ok) throw new Error("Arquivo da BNCC não encontrado.");
                this.dataCache[nivel] = await response.json();
            }
            const dadosCompletos = this.dataCache[nivel];
            const chaves = Object.keys(dadosCompletos);
            const termoBusca = componente.replace("Hab. de ", "").replace("Comp. de ", "").trim().toLowerCase();
            const chavesCandidatas = chaves.filter(k => k.toLowerCase().includes(termoBusca));
            let chaveVencedora = null;
            let maxHabilidades = -1;
            for (const chave of chavesCandidatas) {
                const arr = dadosCompletos[chave];
                if (!Array.isArray(arr)) continue;
                const qtdHabilidades = arr.filter(item => /\b[A-Z]{2}\d{1,2}[A-Z]{2}\d{2,3}\b/.test(Object.values(item).join(" "))).length;
                if (qtdHabilidades > maxHabilidades) {
                    maxHabilidades = qtdHabilidades;
                    chaveVencedora = chave;
                }
            }
            if (!chaveVencedora) throw new Error("Disciplina não encontrada.");
            let dados = dadosCompletos[chaveVencedora] || [];
            let filtrados = dados.filter(item => {
                const codigo = this._extrairCodigo(item);
                if (!codigo || codigo === "BNCC") return false;
                if (eixoBusca && eixoBusca !== "") {
                    const { titulo } = this._processarItem(item, componente);
                    if (!titulo.toLowerCase().includes(eixoBusca.toLowerCase())) return false;
                }
                if (anoBusca && anoBusca !== "Todos") {
                    if (nivel === "Ensino Fundamental") {
                        const digit = anoBusca.match(/\d+/)?.[0];
                        if (codigo.length < 4) return false;
                        const parAno = codigo.substring(2, 4); 
                        const mapaAnosValidos = {
                            '1': ['01', '12', '15'], '2': ['02', '12', '15'],
                            '3': ['03', '35', '15'], '4': ['04', '35', '15'], '5': ['05', '35', '15'],
                            '6': ['06', '69', '67'], '7': ['07', '69', '67', '79', '78'],
                            '8': ['08', '69', '89', '78', '79'], '9': ['09', '69', '89', '79']
                        };
                        const validos = mapaAnosValidos[digit] || [];
                        if (!validos.includes(parAno)) return false;
                    } else {
                        const linhaTexto = Object.values(item).join(" ").toLowerCase();
                        if (!linhaTexto.includes(anoBusca.toLowerCase())) return false;
                    }
                }
                return true;
            });
            this.renderCards(filtrados, componente);
        } catch (e) {
            console.error(e);
            resContainer.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-red-400 opacity-80"><i class="fas fa-exclamation-triangle text-4xl mb-3"></i><p>Erro ao carregar dados.</p></div>`;
        }
    },
    renderCards(data, categoria) {
        const container = document.getElementById('bncc-resultados');
        const cor = this.coresComponentes[categoria] || '#64748b';
        if (data.length === 0) {
            container.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-slate-400"><i class="far fa-folder-open text-4xl mb-3"></i><p>Nenhuma habilidade encontrada.</p></div>`;
            return;
        }
        container.innerHTML = data.map(item => {
            const { codigo, titulo, descricao } = this._processarItem(item, categoria);
            if (!descricao) return '';
            const textoCompleto = `${codigo} ${categoria}\n${descricao}\n${titulo}`;
            const objSafe = JSON.stringify({ codigo, descricao, cor, titulo, textoFull: textoCompleto }).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
            let btnAcao = '';
            if (this.selecionarCallback) {
                btnAcao = `<button onclick='bnccView.executarSelecao(${objSafe})' class="shrink-0 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600 px-3 py-2 rounded-lg transition-all text-xs font-bold flex flex-col items-center gap-1 shadow-sm group/btn w-20"><i class="fas fa-plus text-sm group-hover/btn:scale-110 transition-transform"></i><span class="text-[9px] uppercase">Add</span></button>`;
            } else {
                const textoEscapado = textoCompleto.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/'/g, "\\'");
                btnAcao = `<button onclick="navigator.clipboard.writeText('${textoEscapado}'); alert('Copiado!')" class="shrink-0 text-slate-300 hover:text-primary p-2 transition-colors" title="Copiar"><i class="far fa-copy text-lg"></i></button>`;
            }
            return `
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 border-l-[4px] hover:shadow-md transition-all flex flex-col" style="border-left-color: ${cor} !important;">
                    <div class="flex justify-between items-start gap-4 mb-2">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-3">
                                <span class="text-white text-[11px] font-black px-2 py-0.5 rounded uppercase tracking-wider" style="background-color: ${cor} !important;">${codigo}</span>
                                <h4 class="font-bold text-slate-700 text-sm uppercase tracking-wide">${categoria}</h4>
                            </div>
                            <p class="text-slate-600 text-sm leading-relaxed text-justify font-medium mb-4">${descricao}</p>
                            <div class="flex items-center">
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wide border border-slate-200">
                                    <i class="fas fa-tag text-[9px] opacity-60"></i>${titulo}
                                </span>
                            </div>
                        </div>
                        <div class="flex flex-col justify-center">${btnAcao}</div>
                    </div>
                </div>
            `;
        }).join('');
    },
    _extrairCodigo(item) {
        if (item["Código"]) return item["Código"];
        if (item["Cód. Hab"]) return item["Cód. Hab"];
        if (item["Column6"] && /\b[A-Z]{2}\d{1,2}[A-Z]{2}\d{2,3}\b/.test(item["Column6"])) {
            return item["Column6"].match(/\b[A-Z]{2}\d{1,2}[A-Z]{2}\d{2,3}\b/)[0];
        }
        const valores = Object.values(item).join(" ");
        const match = valores.match(/\b([A-Z]{2}\d{1,2}[A-Z]{2}\d{2,3})\b/);
        return match ? match[0] : "BNCC";
    },
    _processarItem(item, categoriaDefault) {
        let codigo = this._extrairCodigo(item);
        let descricao = item["Habilidade"] || item["Texto"] || "";
        if (!descricao) {
            const valores = Object.values(item).filter(v => typeof v === 'string');
            const valoresSemCodigo = valores.filter(v => !v.includes(codigo));
            descricao = valoresSemCodigo.sort((a, b) => b.length - a.length)[0] || "";
        }
        if (codigo && codigo !== "BNCC") descricao = descricao.replace(codigo, "").trim();
        descricao = descricao.replace(/^\s*[-–—()]\s*/, "").replace(/^\s*[\)\.]\s*/, "").trim();
        if (descricao && /^[a-z]/.test(descricao)) descricao = descricao.charAt(0).toUpperCase() + descricao.slice(1);
        let titulo = "";
        const keysItem = Object.keys(item);
        const chavesEixo = ["Unidades temáticas", "Unidade Temática", "Campo de experiências", "Práticas de linguagem", "Competência específica", "Objetos de conhecimento"];
        for (let chaveCandidata of chavesEixo) {
            const chaveReal = keysItem.find(k => k.toLowerCase() === chaveCandidata.toLowerCase());
            if (chaveReal && item[chaveReal]) { titulo = item[chaveReal]; break; }
        }
        if (!titulo || titulo === "Geral") {
            const colunasCandidatas = ['Column1', 'Column 1', 'Column3', 'Column 3', 'Column4', 'Column 4', 'Column5', 'Column 5'];
            const primeiraChave = keysItem[0];
            if (!colunasCandidatas.includes(primeiraChave)) colunasCandidatas.unshift(primeiraChave);
            for (let col of colunasCandidatas) {
                if (item[col]) {
                    let val = item[col].toString().trim();
                    if (val.toLowerCase() === categoriaDefault.toLowerCase()) continue;
                    if (val === codigo) continue;
                    if (val === descricao || val.length > 100) continue;
                    if (/^(\d+[º°]|\d+(\s*;)?)+$/.test(val)) continue;
                    if (['COMPONENTE', 'ANO/FAIXA', 'HABILIDADES', 'OBJETOS DE CONHECIMENTO', 'CAMPOS DE ATUAÇÃO'].includes(val)) continue;
                    titulo = val;
                    break;
                }
            }
        }
        if (!titulo) titulo = "Geral";
        return { codigo, titulo, descricao };
    },
    executarSelecao(obj) {
        if (this.selecionarCallback) {
            this.selecionarCallback(obj);
            const btn = event.currentTarget;
            const originalHTML = btn.innerHTML;
            const originalClass = btn.className;
            
            btn.innerHTML = `<i class="fas fa-check text-lg"></i>`;
            btn.className = "shrink-0 bg-emerald-500 text-white w-20 px-3 py-2 rounded-lg flex items-center justify-center shadow-md transform scale-105 transition-all";
            
            setTimeout(() => { if (btn) { btn.innerHTML = originalHTML; btn.className = originalClass; } }, 1000);
        }
    }
};