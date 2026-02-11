/**
 * @file provaModel.js
 * @description Módulo responsável pela lógica de negócios do Banco de Questões, Provas e integração com a Comunidade.
 * @module models/provaModel
 */

/**
 * @typedef {Object} QuestaoPublica
 * @property {string} enunciado - Texto da questão.
 * @property {string[]} [alternativas] - Lista de opções (se múltipla escolha).
 * @property {number|null} [correta] - Índice da alternativa correta.
 * @property {string} materia - Disciplina.
 * @property {string} ano - Ano escolar alvo.
 * @property {string} tipo - 'aberta' ou 'multipla_escolha'.
 * @property {number} [dificuldade] - 0 (Fácil) a 2 (Difícil).
 * @property {string} autor - Nome do professor autor.
 * @property {string} uid_autor - UID do Firebase do autor.
 * @property {string} id_local_origem - ID da questão no banco local do autor.
 * @property {string} data_partilha - Data ISO da publicação.
 * @property {string} [enunciado_search] - Enunciado normalizado para busca.
 */

/**
 * Métodos do Model para gestão de Questões.
 * @namespace provaMethods
 */

import { firebaseService } from '../firebase-service.js';
import { Toast } from '../components/toast.js';
import { normalizeText, generateUUID } from '../utils.js';

export const provaMethods = {

    /**
     * Carrega as questões estáticas do sistema (Global) via manifest.json.
     * @async
     * @returns {Promise<void>}
     */
    async carregarQuestoesSistema() {
        try {
            const manifestRes = await fetch('./assets/data/manifest.json');
            if (!manifestRes.ok) throw new Error("Manifest não encontrado");

            const listaArquivos = await manifestRes.json();

            const buscas = listaArquivos.map(arquivo =>
                fetch(`./assets/data/${arquivo}`).then(res => res.json())
            );

            const resultados = await Promise.all(buscas);

            this.state.questoesSistema = resultados.flat().map(q => ({
                ...q,
                id: q.id || `sys_${Math.random().toString(36).substr(2, 9)}`, // ID temporário se faltar
                dificuldade: Number(q.dificuldade) || 0,
                preDefinida: true
            }));

            console.log(`✅ Banco Global: ${this.state.questoesSistema.length} questões carregadas.`);
        } catch (e) {
            console.error("❌ Erro ao carregar banco de questões do sistema:", e);
        }
    },

    /**
     * Salva ou atualiza uma questão no banco pessoal do professor.
     * Gerencia IDs, Timestamps e sincronização.
     * @async
     * @param {Object} questaoRecebida - Objeto da questão a ser salva.
     * @returns {Promise<void>}
     */
    async saveQuestao(questaoRecebida) {
        const questaoSalvar = {
            ...questaoRecebida,
            dificuldade: Number(questaoRecebida.dificuldade) || 0,
            updatedAt: new Date().toISOString()
        };

        if (!questaoSalvar.id) {
            const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID().split('-')[0]
                : Math.random().toString(36).substr(2, 5);

            questaoSalvar.id = `prof_${Date.now()}_${randomPart}`;
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

    /**
     * Remove uma questão do banco pessoal com trava de segurança para compartilhadas.
     * @async
     * @param {string} id - ID da questão.
     * @returns {Promise<void>}
     */
    async deleteQuestao(id) {
        const questao = this.state.questoes.find(q => String(q.id) === String(id));

        // --- TRAVA DE SEGURANÇA (Comunidade) ---
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
                    "warning" // Define o tipo como alerta 
                );
            }
            return; // Bloqueia exclusão
        }

        // --- EXCLUSÃO ---
        if (this.state.questoes) {
            this.state.questoes = this.state.questoes.filter(q => String(q.id) !== String(id));

            this.saveLocal();


            console.log(`🗑️ Questão ${id} removida.`);
        }
    },

    /**
     * Compartilha uma questão local com a comunidade global no Firestore.
     * @async
     * @param {string} questaoId - ID da questão local.
     * @returns {Promise<void>}
     */
    async compartilharQuestao(questaoId) {
        const questao = this.state.questoes.find(q => String(q.id) === String(questaoId));
        if (!questao) return;

        const enunciadoNormalizado = (questao.enunciado || "").trim();

        try {
            const jaExiste = await firebaseService.verificarDuplicataComunidade(enunciadoNormalizado);

            if (jaExiste) {
                if (window.Toast) window.Toast.show("Essa questão já existe na comunidade.", "warning");

                questao.compartilhada = true;
                this.saveLocal();

                if (window.provasView && window.provasView.render) {
                    window.provasView.render('view-container');
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
                tipo: questao.tipo || 'aberta',
                dificuldade: Number(questao.dificuldade) || 0,
                suporte: questao.suporte || null,
                bncc: questao.bncc || null,
                autor: this.currentUser?.displayName || "Professor(a)",
                uid_autor: this.currentUser?.uid || null,
                id_local_origem: String(questao.id),
                data_partilha: new Date().toISOString()
            };

            await firebaseService.publicarQuestaoComunidade(qPublica);

            questao.compartilhada = true;
            this.saveLocal();

            if (window.Toast) window.Toast.show("Compartilhado com sucesso!", "success");

            if (window.provasView && window.provasView.render) {
                window.provasView.render('view-container');
            }

        } catch (error) {
            console.error("❌ Erro ao compartilhar:", error);
            if (window.Toast) window.Toast.show("Falha ao enviar para a comunidade.", "error");
        }
    },

    /**
     * Remove uma questão da comunidade global (apenas se for o autor).
     * @async
     * @param {string} questaoId - ID da questão local.
     * @returns {Promise<void>}
     */
    async removerDaComunidade(questaoId) {
        try {
            const service = window.firebaseService;
            if (!service) throw new Error("Firebase Service não carregado");

            await service.removerQuestaoComunidade(this.currentUser.uid, questaoId);

            // Atualiza estado local (remove flag)
            const questao = this.state.questoes.find(q => String(q.id) === String(questaoId));

            if (questao) {
                delete questao.compartilhada;
                this.saveLocal();

                window.Toast.show("Retirada da comunidade.", "info");

                if (window.provasView && window.provasView.render) {
                    window.provasView.render('view-container');
                }
            }
        } catch (error) {
            console.error("❌ Erro ao remover da comunidade:", error);
            window.Toast.show("Não foi possível remover agora.", "error");
        }
    },

    /**
     * Algoritmo estatístico para selecionar questões baseado em distribuição de dificuldade.
     * @param {Object} filtros - { materia, ano }
     * @param {number} quantidade - Total de questões desejadas
     * @param {Object} distribuicao - { facil: %, medio: %, dificil: % } (soma 100)
     * @returns {string[]} Array de IDs selecionados
     */
    gerarSelecaoAutomatica(filtros, quantidade, distribuicao) {
        const todasQuestoes = [
            ...(this.state.questoes || []),
            ...(this.state.questoesSistema || [])
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
            const embaralhado = lista.sort(() => 0.5 - Math.random());
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