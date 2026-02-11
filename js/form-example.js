/**
 * @file form-example.js
 * @description Exemplo pronto para usar: Implementação de validação em formulário
 * @description Copie o padrão deste arquivo para seus outros formulários
 * 
 * COMO USAR:
 * 1. Crie um novo arquivo com nome do seu form (ex: formTurma.js)
 * 2. Copie este padrão
 * 3. Substitua os nomes dos campos, validadores e modelo
 * 4. Importe no seu controller principal
 * 5. Pronto! Seu form terá validação automática + error handling
 */

import { validators } from './validators.js';
import { validateFormData, validateFormField } from './error-integration.js';
import { errorHandler } from './error-handler.js';
import { logger } from './logger.js';

/**
 * EXEMPLO 1: Validação Básica - Salvar Turma
 * Aplique este padrão em qualquer formulário
 */
export async function salvarTurmaForm(evento) {
    evento.preventDefault();
    
    const formId = evento.target.id || 'formTurma';
    logger.info('form', `Iniciando envio de ${formId}`);

    // 1. COLETAR dados do formulário
    const formData = {
        nomeTurma: document.getElementById('nomeTurma')?.value?.trim() || '',
        serie: document.getElementById('serie')?.value?.trim() || '',
        periodo: document.getElementById('periodo')?.value || 'matutino',
        descricao: document.getElementById('descricao')?.value?.trim() || ''
    };

    // 2. VALIDAR - tudo de uma vez
    const dados = validateFormData(formData, {
        nomeTurma: validators.nomeTurma,
        serie: validators.descricao,
        // periodo não precisa validar (tem valor padrão)
        descricao: validators.descricao // opcional
    });

    // 3. PARAR se validação falhou
    if (!dados) {
        logger.warn('form', 'Validação falhou em ' + formId);
        return; // Usuário já viu o toast de erro
    }

    // 4. SALVAR no modelo
    try {
        logger.debug('form', 'Dados validados, enviando para modelo', { dados });
        
        // Aqui você chama seu modelo/API
        // const resultado = await turmaModel.salvar(dados);
        const resultado = { id: 'nova_turma_123', ...dados };
        
        logger.info('form', 'Turma salva com sucesso', { turmaId: resultado.id });
        Toast.show('✓ Turma salva com sucesso!', 'success');
        
        // 5. LIMPAR formulário após sucesso
        evento.target.reset();
        
        // 6. RECARREGAR lista ou redirecionar
        // await recarregarTurmas();
        // window.location.hash = '#turmas';
        
        return resultado;
        
    } catch (err) {
        logger.error('form', 'Erro ao salvar turma', err, { dados });
        errorHandler.handle(err, 'form', 'salvarTurmaForm');
    }
}

/**
 * EXEMPLO 2: Validação em Tempo Real - Enquanto Digita
 * Útil para feedback imediato ao usuário
 */
export function setupRealtimeValidation() {
    // Campo: Nome da Turma
    const inputNomeTurma = document.getElementById('nomeTurma');
    if (inputNomeTurma) {
        inputNomeTurma.addEventListener('blur', (e) => {
            const valor = e.target.value.trim();
            
            if (!valor) {
                // Permitir vazio ao sair (validação final pega isso)
                e.target.classList.remove('is-invalid', 'is-valid');
                return;
            }

            try {
                validators.nomeTurma(valor);
                e.target.classList.remove('is-invalid');
                e.target.classList.add('is-valid');
                logger.debug('form', 'Nome turma válido');
            } catch (err) {
                e.target.classList.remove('is-valid');
                e.target.classList.add('is-invalid');
                logger.warn('form', 'Nome turma inválido', { erro: err.message });
            }
        });
    }

    // Campo: Email
    const inputEmail = document.getElementById('email');
    if (inputEmail) {
        inputEmail.addEventListener('blur', (e) => {
            const valor = e.target.value.trim();
            
            if (!valor) return; // Campo opcional

            try {
                validators.email(valor);
                e.target.classList.remove('is-invalid');
                e.target.classList.add('is-valid');
            } catch (err) {
                e.target.classList.remove('is-valid');
                e.target.classList.add('is-invalid');
            }
        });
    }

    // Campo: Nota
    const inputNota = document.getElementById('nota');
    if (inputNota) {
        inputNota.addEventListener('blur', (e) => {
            const valor = e.target.value.trim();
            
            if (!valor) return; // Campo opcional

            try {
                validators.nota(valor);
                e.target.classList.remove('is-invalid');
                e.target.classList.add('is-valid');
            } catch (err) {
                e.target.classList.remove('is-valid');
                e.target.classList.add('is-invalid');
            }
        });
    }
}

/**
 * EXEMPLO 3: Múltiplos Validadores Customizados
 * Para quando o padrão não atender
 */
export async function criarQuestaoForm(evento) {
    evento.preventDefault();

    const formData = {
        enunciado: document.getElementById('enunciado')?.value?.trim() || '',
        alternativaA: document.getElementById('altA')?.value?.trim() || '',
        alternativaB: document.getElementById('altB')?.value?.trim() || '',
        alternativaC: document.getElementById('altC')?.value?.trim() || '',
        alternativaD: document.getElementById('altD')?.value?.trim() || '',
        gabarito: document.getElementById('gabarito')?.value || '',
        dificuldade: document.getElementById('dificuldade')?.value || 'medio'
    };

    // Validar cada campo
    const erros = [];
    const dados = {};

    // Enunciado
    try {
        dados.enunciado = validators.enunciado(formData.enunciado);
    } catch (err) {
        erros.push(err);
    }

    // Alternativas
    try {
        dados.alternativaA = validators.alternativa(formData.alternativaA);
        dados.alternativaB = validators.alternativa(formData.alternativaB);
        dados.alternativaC = validators.alternativa(formData.alternativaC);
        dados.alternativaD = validators.alternativa(formData.alternativaD);
    } catch (err) {
        erros.push(err);
    }

    // Gabarito
    try {
        dados.gabarito = validators.gabarito(formData.gabarito);
        
        // Validação extra: gabarito deve ser uma das alternativas
        const alternativasValidas = ['a', 'b', 'c', 'd'];
        if (!alternativasValidas.includes(dados.gabarito.toLowerCase())) {
            throw errorHandler.validation(
                'GABARITO_INVALIDO',
                'Gabarito deve ser A, B, C ou D'
            );
        }
    } catch (err) {
        erros.push(err);
    }

    // Dificuldade
    try {
        dados.dificuldade = validators.dificuldade(formData.dificuldade);
    } catch (err) {
        erros.push(err);
    }

    // Se teve erros, mostrar todos
    if (erros.length > 0) {
        logger.warn('form', 'Múltiplos erros em criarQuestao', { 
            erros: erros.map(e => e.message) 
        });
        
        erros.forEach(err => {
            errorHandler.handle(err, 'form', 'criarQuestaoForm');
        });
        return;
    }

    // Se chegou aqui, tudo está válido
    try {
        logger.info('form', 'Salvando questão', { dificuldade: dados.dificuldade });
        
        // const resultado = await provaModel.salvarQuestao(dados);
        const resultado = { id: 'quest_123', ...dados };
        
        Toast.show('✓ Questão criada com sucesso!', 'success');
        evento.target.reset();
        
        return resultado;
        
    } catch (err) {
        logger.error('form', 'Erro ao salvar questão', err, { dados });
        errorHandler.handle(err, 'form', 'criarQuestaoForm');
    }
}

/**
 * EXEMPLO 4: Validação com Confirmação
 * Para operações críticas que exigem double-check
 */
export async function deletarTurmaComConfirmacao(turmaId, nomeTurma) {
    const confirmacao = confirm(
        `Tem certeza que deseja deletar a turma "${nomeTurma}"?\n\nEsta ação é irreversível.`
    );

    if (!confirmacao) {
        logger.info('form', 'Deleção cancelada pelo usuário', { turmaId });
        return;
    }

    try {
        logger.info('form', 'Deletando turma', { turmaId, nomeTurma });
        
        // Validar ID antes de fazer requisição
        const idValidado = validators.turmaId(turmaId);
        
        // const resultado = await turmaModel.deletar(idValidado);
        const resultado = { deletado: true, turmaId };
        
        logger.info('form', 'Turma deletada com sucesso', { turmaId });
        Toast.show('✓ Turma deletada com sucesso!', 'success');
        
        // Recarregar lista
        // await recarregarTurmas();
        
        return resultado;
        
    } catch (err) {
        logger.error('form', 'Erro ao deletar turma', err, { turmaId });
        errorHandler.handle(err, 'form', 'deletarTurmaComConfirmacao');
    }
}

/**
 * EXEMPLO 5: Inicializar Todos os Forms de Uma View
 * Chame isto quando sua view/página for carregada
 */
export function inicializarFormularios() {
    logger.info('form', 'Inicializando formulários da página');

    // Setup validação em tempo real
    setupRealtimeValidation();

    // Vincular evento de submit dos forms
    const formTurma = document.getElementById('formTurma');
    if (formTurma) {
        formTurma.addEventListener('submit', salvarTurmaForm);
    }

    const formQuestao = document.getElementById('formQuestao');
    if (formQuestao) {
        formQuestao.addEventListener('submit', criarQuestaoForm);
    }

    logger.debug('form', 'Formulários inicializados');
}

/**
 * PADRÃO FINAL - USAR EM SEU PROJETO
 * 
 * Nos seus controllers, faça assim:
 * 
 * // controllers/turmaController.js
 * import * as turmaForms from '../forms/turmaForms.js';
 * 
 * export function carregarTurmasView() {
 *     renderizarTelaTurmas();
 *     turmaForms.inicializarFormularios();
 * }
 * 
 * Pronto! Todos os forms da página já têm validação automática.
 */

// Export default com todas as funções
export default {
    salvarTurmaForm,
    criarQuestaoForm,
    deletarTurmaComConfirmacao,
    setupRealtimeValidation,
    inicializarFormularios
};
