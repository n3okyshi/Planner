

import { firebaseService } from '../firebase-service.js';
import { dataProxy } from '../services/dataProxy.js';
import { viewRegistry } from '../services/viewRegistry.js';
import { Toast } from '../components/toast.js';
import { normalizeText, generateUUID, generateId, secureShuffle } from '../utils.js';
export const provaMethods = {
    async carregarQuestoesSistema() {
        try {
            const manifestRes = await fetch('./assets/data/manifest.json');
            if (!manifestRes.ok) throw new Error("Manifest não encontrado");
            const listaArquivos = await manifestRes.json();
            const buscas = listaArquivos.map(arquivo =>
                fetch(`./assets/data/${arquivo}`)
                    .then(res => res.json())
                    .then(itens => ({ arquivo, itens }))
            );
            const resultados = await Promise.all(buscas);

            const sysList = [];
            const enemList = [];

            resultados.forEach(({ arquivo, itens }) => {
                const isEnem = arquivo.toLowerCase().includes('enem');
                const formatados = (Array.isArray(itens) ? itens : []).map(q => ({
                    ...q,
                    id: q.id || generateId(isEnem ? 'enem' : 'sys'),
                    dificuldade: q.dificuldade || 'Média',
                    preDefinida: true
                }));

                if (isEnem) {
                    enemList.push(...formatados);
                } else {
                    sysList.push(...formatados);
                }
            });

            this.state.questoesSistema = sysList;
            this.state.questoesEnem = enemList;
            console.log(`✅ Banco do Sistema: ${this.state.questoesSistema.length} questões | Banco ENEM: ${this.state.questoesEnem.length} questões.`);
        } catch (e) {
            console.error("❌ Erro ao carregar banco de questões do sistema:", e);
        }
    },
    async carregarDescritoresSaeb() {
        try {
            const res = await fetch('./assets/SAEB/saeb_todos.json');
            if (!res.ok) return;
            const dados = await res.json();
            const descritoresAchatados = [];
            dados.forEach(disc => {
                const disciplina = disc.disciplina;
                (disc.etapas || []).forEach(etapaObj => {
                    const etapa = etapaObj.etapa;
                    (etapaObj.topicos || []).forEach(topicoObj => {
                        const topico = topicoObj.topico;
                        (topicoObj.descritores || []).forEach(d => {
                            descritoresAchatados.push({
                                id: `${d.codigo}_${disciplina}_${etapa}`.replace(/\s+/g, '_'),
                                codigo: d.codigo,
                                descricao: d.descricao,
                                disciplina,
                                etapa,
                                topico
                            });
                        });
                    });
                });
            });
            if (descritoresAchatados.length > 0) {
                this.state.descritoresSaeb = descritoresAchatados;
                console.log(`✅ Descritores SAEB: ${descritoresAchatados.length} descritores carregados dos arquivos JSON.`);
            }
        } catch (e) {
            console.warn("Aviso ao carregar JSONs do SAEB:", e);
        }
    },
    async saveQuestao(questaoRecebida) {
        const questaoSalvar = {
            ...questaoRecebida,
            dificuldade: Number(questaoRecebida.dificuldade) || 0,
            updatedAt: new Date().toISOString()
        };
        if (!questaoSalvar.id) {
            questaoSalvar.id = generateId(`prof_${Date.now()}`);
            questaoSalvar.createdAt = new Date().toISOString();
        }
        if (!this.state.questoes) this.state.questoes = [];
        const index = this.state.questoes.findIndex(q => String(q.id) === String(questaoSalvar.id));
        if (index !== -1) {
            this.state.questoes[index] = { ...this.state.questoes[index], ...questaoSalvar };
        } else {
            this.state.questoes.push(questaoSalvar);
        }
        this.saveLocal();
    },
    async deleteQuestao(id) {
        const questao = this.state.questoes.find(q => String(q.id) === String(id));
        if (questao && questao.compartilhada) {
            if (window.Toast) {
                window.Toast.show(
                    "⚠️ Questão em uso na Comunidade! Remova-a da comunidade antes de excluir.",
                    "warning",
                    5000
                );
            } else {
                Toast.show(
                    "Esta questão está compartilhada na comunidade. Você deve removê-la de lá antes de apagar do seu banco pessoal.",
                    "warning"
                );
            }
            return;
        }
        if (this.state.questoes) {
            this.state.questoes = this.state.questoes.filter(q => String(q.id) !== String(id));
            this.saveLocal();
            console.log(`🗑️ Questão ${id} removida.`);
        }
    },
    async compartilharQuestao(questaoId) {
        const questao = this.state.questoes.find(q => String(q.id) === String(questaoId));
        if (!questao) return;
        const enunciadoNormalizado = (questao.enunciado || "").trim();
        try {
            const jaExiste = await dataProxy.verificarDuplicataComunidade(enunciadoNormalizado);
            if (jaExiste) {
                if (Toast) Toast.show("Essa questão já existe na comunidade.", "warning");
                questao.compartilhada = true;
                this.saveLocal();
                const provasView = viewRegistry.provas || viewRegistry['provas'];
                if (provasView && provasView.render) {
                    provasView.render('view-container');
                }
                return;
            }
            const qPublica = {
                enunciado: enunciadoNormalizado,
                alternativas: questao.alternativas || null,
                correta: (questao.correta !== undefined && questao.correta !== null) ? Number(questao.correta) : null,
                gabarito: questao.gabarito || null,
                gabarito_comentado: questao.gabarito_comentado || null,
                materia: questao.materia || 'Geral',
                ano: questao.ano || '2026',
                escola: questao.escola || null,
                bimestre: questao.bimestre || null,
                tipo: questao.tipo || 'aberta',
                dificuldade: Number(questao.dificuldade) || 0,
                suporte: questao.suporte || null,
                bncc: questao.bncc || null,
                autor: this.currentUser?.displayName || "Professor(a)",
                uid_autor: this.currentUser?.uid || null,
                id_local_origem: String(questao.id),
                data_partilha: new Date().toISOString()
            };
            await dataProxy.publicarQuestaoComunidade(qPublica);
            questao.compartilhada = true;
            this.saveLocal();
            if (Toast) Toast.show("Compartilhado com sucesso!", "success");
            const provasView = viewRegistry.provas || viewRegistry['provas'];
            if (provasView && provasView.render) {
                provasView.render('view-container');
            }
        } catch (error) {
            console.error("❌ Erro ao compartilhar:", error);
            if (Toast) Toast.show("Falha ao enviar para a comunidade.", "error");
        }
    },
    async removerDaComunidade(questaoId) {
        try {
            if (!firebaseService?.removerQuestaoComunidade) throw new Error("Firebase Service não carregado");
            await dataProxy.removerQuestaoComunidade(this.currentUser.uid, questaoId);
            const questao = this.state.questoes.find(q => String(q.id) === String(questaoId));
            if (questao) {
                delete questao.compartilhada;
                this.saveLocal();
            if (Toast) Toast.show("Retirada da comunidade.", "info");
                const provasView = viewRegistry.provas || viewRegistry['provas'];
                if (provasView && provasView.render) {
                    provasView.render('view-container');
                }
            }
        } catch (error) {
            console.error("❌ Erro ao remover da comunidade:", error);
            Toast.show("Não foi possível remover agora.", "error");
        }
    },
    gerarSelecaoAutomatica(filtros, quantidade, distribuicao) {
        const todasQuestoes = [
            ...(this.state.questoes || []),
            ...(this.state.questoesSistema || []),
            ...(this.state.questoesEnem || [])
        ];
        const poolCandidatas = todasQuestoes.filter(q => {
            const matchMateria = !filtros.materia || q.materia === filtros.materia;
            const matchAno = !filtros.ano || q.ano === filtros.ano;
            return matchMateria && matchAno;
        });
        if (poolCandidatas.length === 0) {
            throw new Error("Nenhuma questão encontrada com os filtros selecionados (Matéria/Ano).");
        }
        const buckets = {
            facil: poolCandidatas.filter(q => Number(q.dificuldade) === 1 || Number(q.dificuldade) === 0),
            medio: poolCandidatas.filter(q => Number(q.dificuldade) === 2),
            dificil: poolCandidatas.filter(q => Number(q.dificuldade) === 3)
        };
        const alvoFacil = Math.round(quantidade * (distribuicao.facil / 100));
        const alvoMedio = Math.round(quantidade * (distribuicao.medio / 100));
        const alvoDificil = quantidade - alvoFacil - alvoMedio;
        const selecionadas = new Set();
        const pegarAleatorio = (lista, n) => {
            const embaralhado = secureShuffle(lista);
            return embaralhado.slice(0, n);
        };
        const selecionadasFacil = pegarAleatorio(buckets.facil, alvoFacil);
        const selecionadasMedio = pegarAleatorio(buckets.medio, alvoMedio);
        const selecionadasDificil = pegarAleatorio(buckets.dificil, alvoDificil);
        [...selecionadasFacil, ...selecionadasMedio, ...selecionadasDificil].forEach(q => selecionadas.add(String(q.id)));
        if (selecionadas.size < quantidade) {
            const faltam = quantidade - selecionadas.size;
            const resto = poolCandidatas.filter(q => !selecionadas.has(String(q.id)));
            const extras = pegarAleatorio(resto, faltam);
            extras.forEach(q => selecionadas.add(String(q.id)));
        }
        return Array.from(selecionadas);
    }
};