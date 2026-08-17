import { generateId } from '../utils.js';
import { firebaseService } from '../firebase-service.js';

/**
 * Módulo Model para Gestão de Apresentações Animadas (Nativas & PPTX)
 */
export const apresentacaoMethods = {
    /**
     * Cria uma nova apresentação no estado
     */
    addApresentacao(dados = {}) {
        if (!this.state.apresentacoes) {
            this.state.apresentacoes = [];
        }

        const id = dados.id || generateId('apres');
        const novaApresentacao = {
            id,
            titulo: (dados.titulo || 'Nova Apresentação Pedagógica').trim(),
            subtitulo: (dados.subtitulo || '').trim(),
            disciplina: dados.disciplina || 'Geral',
            turmaId: dados.turmaId || '',
            temaVisual: dados.temaVisual || 'glassmorphism', // 'glassmorphism' | 'modern-dark' | 'academic-clean' | 'neon-tech' | 'vibrant'
            transicao: dados.transicao || 'slide', // 'slide' | 'fade' | 'zoom' | 'flip'
            modoOrigem: dados.modoOrigem || 'nativo', // 'nativo' | 'pptx' | 'ia'
            slides: Array.isArray(dados.slides) && dados.slides.length > 0 ? dados.slides : [
                this.criarSlidePadraoCapa(dados.titulo || 'Nova Apresentação Pedagógica', dados.subtitulo || 'Desenvolvido no Planner Pro')
            ],
            notasGerais: dados.notasGerais || '',
            createdAt: dados.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.state.apresentacoes.unshift(novaApresentacao);
        this.saveLocal?.();

        if (this.currentUser && firebaseService?.saveApresentacao) {
            firebaseService.saveApresentacao(this.currentUser.uid, novaApresentacao);
        }

        return novaApresentacao;
    },

    /**
     * Atualiza dados de uma apresentação existente
     */
    updateApresentacao(id, dadosAtualizados) {
        if (!this.state.apresentacoes) return null;
        const index = this.state.apresentacoes.findIndex(a => String(a.id) === String(id));
        if (index === -1) return null;

        const apresAtual = this.state.apresentacoes[index];
        const atualizada = {
            ...apresAtual,
            ...dadosAtualizados,
            updatedAt: new Date().toISOString()
        };

        this.state.apresentacoes[index] = atualizada;
        this.saveLocal?.();

        if (this.currentUser && firebaseService?.saveApresentacao) {
            firebaseService.saveApresentacao(this.currentUser.uid, atualizada);
        }

        return atualizada;
    },

    /**
     * Remove uma apresentação pelo ID
     */
    deleteApresentacao(id) {
        if (!this.state.apresentacoes) return;
        this.state.apresentacoes = this.state.apresentacoes.filter(a => String(a.id) !== String(id));
        this.saveLocal?.();

        if (this.currentUser && firebaseService?.deleteApresentacao) {
            firebaseService.deleteApresentacao(this.currentUser.uid, id);
        }
    },

    /**
     * Retorna uma apresentação por ID
     */
    getApresentacaoById(id) {
        if (!this.state.apresentacoes) return null;
        return this.state.apresentacoes.find(a => String(a.id) === String(id)) || null;
    },

    /**
     * Adiciona um novo slide a uma apresentação
     */
    addSlide(apresentacaoId, slideDados = {}) {
        const apres = this.getApresentacaoById(apresentacaoId);
        if (!apres) return null;

        const novoSlide = {
            id: generateId('slide'),
            tipoLayout: slideDados.tipoLayout || 'titulo-texto', // 'capa' | 'titulo-texto' | 'topicos-animados' | 'comparacao' | 'katex' | 'quiz' | 'flashcard' | 'imagem'
            titulo: (slideDados.titulo || 'Novo Slide').trim(),
            subtitulo: (slideDados.subtitulo || '').trim(),
            conteudo: slideDados.conteudo || '',
            topicos: Array.isArray(slideDados.topicos) ? slideDados.topicos : [],
            opcoesQuiz: Array.isArray(slideDados.opcoesQuiz) ? slideDados.opcoesQuiz : [],
            respostaCorreta: slideDados.respostaCorreta ?? null,
            frenteFlashcard: slideDados.frenteFlashcard || '',
            versoFlashcard: slideDados.versoFlashcard || '',
            formulaKatex: slideDados.formulaKatex || '',
            imagemUrl: slideDados.imagemUrl || '',
            notasProfessor: slideDados.notasProfessor || '',
            bgGradient: slideDados.bgGradient || '',
            animacaoEntrada: slideDados.animacaoEntrada || 'fade-up'
        };

        apres.slides.push(novoSlide);
        apres.updatedAt = new Date().toISOString();

        this.saveLocal?.();
        if (this.currentUser && firebaseService?.saveApresentacao) {
            firebaseService.saveApresentacao(this.currentUser.uid, apres);
        }

        return novoSlide;
    },

    /**
     * Atualiza um slide específico
     */
    updateSlide(apresentacaoId, slideId, novosDados) {
        const apres = this.getApresentacaoById(apresentacaoId);
        if (!apres) return null;

        const index = apres.slides.findIndex(s => String(s.id) === String(slideId));
        if (index === -1) return null;

        apres.slides[index] = {
            ...apres.slides[index],
            ...novosDados
        };
        apres.updatedAt = new Date().toISOString();

        this.saveLocal?.();
        if (this.currentUser && firebaseService?.saveApresentacao) {
            firebaseService.saveApresentacao(this.currentUser.uid, apres);
        }

        return apres.slides[index];
    },

    /**
     * Remove um slide da apresentação
     */
    deleteSlide(apresentacaoId, slideId) {
        const apres = this.getApresentacaoById(apresentacaoId);
        if (!apres || apres.slides.length <= 1) return false;

        apres.slides = apres.slides.filter(s => String(s.id) !== String(slideId));
        apres.updatedAt = new Date().toISOString();

        this.saveLocal?.();
        if (this.currentUser && firebaseService?.saveApresentacao) {
            firebaseService.saveApresentacao(this.currentUser.uid, apres);
        }

        return true;
    },

    /**
     * Reordena os slides de uma apresentação com base na ordem dos IDs passados
     */
    reorderSlides(apresentacaoId, ordemIds = []) {
        const apres = this.getApresentacaoById(apresentacaoId);
        if (!apres || !Array.isArray(ordemIds)) return false;

        const slideMap = new Map(apres.slides.map(s => [String(s.id), s]));
        const novosSlides = [];

        ordemIds.forEach(id => {
            const slide = slideMap.get(String(id));
            if (slide) novosSlides.push(slide);
        });

        apres.slides.forEach(s => {
            if (!novosSlides.includes(s)) novosSlides.push(s);
        });

        apres.slides = novosSlides;
        apres.updatedAt = new Date().toISOString();

        this.saveLocal?.();
        if (this.currentUser && firebaseService?.saveApresentacao) {
            firebaseService.saveApresentacao(this.currentUser.uid, apres);
        }

        return true;
    },

    /**
     * Duplica uma apresentação existente
     */
    duplicarApresentacao(id) {
        const apres = this.getApresentacaoById(id);
        if (!apres) return null;

        const copia = JSON.parse(JSON.stringify(apres));
        copia.id = generateId('apres');
        copia.titulo = `${apres.titulo} (Cópia)`;
        copia.createdAt = new Date().toISOString();
        copia.updatedAt = new Date().toISOString();

        copia.slides = (copia.slides || []).map(s => ({
            ...s,
            id: generateId('slide')
        }));

        this.state.apresentacoes.unshift(copia);
        this.saveLocal?.();

        if (this.currentUser && firebaseService?.saveApresentacao) {
            firebaseService.saveApresentacao(this.currentUser.uid, copia);
        }

        return copia;
    },

    /**
     * Helper para gerar slide padrão de capa
     */
    criarSlidePadraoCapa(titulo, subtitulo) {
        return {
            id: generateId('slide'),
            tipoLayout: 'capa',
            titulo: titulo || 'Apresentação Pedagógica',
            subtitulo: subtitulo || 'Planner Pro Docente',
            conteudo: 'Criado para facilitar a explicação e fixação de conteúdos em sala de aula.',
            topicos: [],
            notasProfessor: 'Boas-vindas aos alunos. Apresentar os objetivos da aula de hoje.',
            animacaoEntrada: 'zoom-in'
        };
    }
};
