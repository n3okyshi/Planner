/**
 * @typedef {Object} QuestaoPublica
 * @property {string} enunciado
 * @property {string[]} [alternativas]
 * @property {number} [correta]
 * @property {string} materia
 * @property {string} ano
 * @property {string} tipo
 * @property {number} dificuldade
 * @property {string} autor
 * @property {string} uid_autor
 * @property {string} id_local_origem
 * @property {string} data_partilha
 */

/**
 * Módulo de lógica para o Banco de Questões, Provas e Comunidade
 */
export const provaMethods = {

    /**
     * Carrega as questões estáticas do sistema via manifest.json
     */
    async carregarQuestoesSistema() {
        try {
            const manifestRes = await fetch('./assets/data/manifest.json');
            const listaArquivos = await manifestRes.json();
            const buscas = listaArquivos.map(arquivo => 
                fetch(`./assets/data/${arquivo}`).then(res => res.json())
            );
            const resultados = await Promise.all(buscas);
            
            this.state.questoesSistema = resultados.flat().map(q => ({
                ...q,
                id: q.id || `sys_${Math.random().toString(36).substr(2, 9)}`,
                dificuldade: Number(q.dificuldade) || 0,
                preDefinida: true
            }));
            console.log(`✅ Banco Global: ${this.state.questoesSistema.length} questões carregadas.`);
        } catch (e) {
            console.error("❌ Erro ao carregar banco de questões do sistema:", e);
        }
    },

    /**
     * Salva ou atualiza uma questão no banco pessoal do professor
     * @param {Object} questao 
     */
    saveQuestao(questao) {
        if (!questao.id) {
            questao.id = "prof_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
            questao.createdAt = new Date().toISOString();
        }
        
        // Garante que a dificuldade seja sempre um número (0, 1, 2 ou 3)
        questao.dificuldade = Number(questao.dificuldade) || 0;

        const index = this.state.questoes.findIndex(q => String(q.id) === String(questao.id));
        
        if (index !== -1) {
            this.state.questoes[index] = { ...this.state.questoes[index], ...questao };
        } else {
            this.state.questoes.push({ ...questao });
        }

        this.saveLocal();
        this.saveCloudRoot();
    },

    /**
     * Remove uma questão do banco pessoal
     * @param {string} id 
     */
    deleteQuestao(id) {
        this.state.questoes = this.state.questoes.filter(q => String(q.id) !== String(id));
        this.saveLocal();
        this.saveCloudRoot();
    },

    /**
     * Compartilha uma questão local com a comunidade global no Firestore
     * @param {string} questaoId 
     */
    async compartilharQuestao(questaoId) {
        const questao = this.state.questoes.find(q => String(q.id) === String(questaoId));
        if (!questao) return;

        const enunciadoNormalizado = (questao.enunciado || "").trim();

        try {
            // Verifica duplicatas antes de subir
            const jaExiste = await window.firebaseService.verificarDuplicataComunidade(enunciadoNormalizado);
            if (jaExiste) {
                window.Toast.show("Essa questão já existe na comunidade.", "warning");
                questao.compartilhada = true;
                this.saveLocal();
                if (window.provasView) window.provasView.render('view-container');
                return;
            }

            /** @type {QuestaoPublica} */
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

            await window.firebaseService.publicarQuestaoComunidade(qPublica);
            questao.compartilhada = true;
            this.saveLocal();
            this.saveCloudRoot();

            window.Toast.show("Compartilhado com sucesso!", "success");
            if (window.provasView) window.provasView.render('view-container');

        } catch (error) {
            console.error("❌ Erro ao compartilhar:", error);
            window.Toast.show("Falha ao enviar para a comunidade.", "error");
        }
    },

    /**
     * Remove uma questão da comunidade global (apenas se for o autor)
     * @param {string} questaoId 
     */
    async removerDaComunidade(questaoId) {
        try {
            await window.firebaseService.removerQuestaoComunidade(this.currentUser.uid, questaoId);
            const questao = this.state.questoes.find(q => String(q.id) === String(questaoId));
            
            if (questao) {
                delete questao.compartilhada;
                this.saveLocal();
                this.saveCloudRoot();
                
                window.Toast.show("Retirada da comunidade.", "info");
                if (window.provasView) window.provasView.render('view-container');
            }
        } catch (error) {
            console.error("❌ Erro ao remover da comunidade:", error);
            window.Toast.show("Não foi possível remover agora.", "error");
        }
    }
};