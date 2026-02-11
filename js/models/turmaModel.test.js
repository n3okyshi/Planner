
import test from 'node:test';
import assert from 'node:assert';
import { turmaMethods } from './turmaModel.js';

test('getResumoAcademico', async (t) => {
    const mockState = {
        turmas: [
            {
                id: 't1',
                avaliacoes: [
                    { id: 'av1', periodo: 1, max: 10 },
                    { id: 'av2', periodo: 2, max: 10 },
                    { id: 'av3', periodo: 3, max: 10 },
                    { id: 'av4', periodo: 4, max: 10 }
                ],
                alunos: [
                    {
                        id: 'a1',
                        notas: {
                            'av1': 8,
                            'av2': 7
                        }
                    }
                ]
            }
        ],
        userConfig: { periodType: 'bimestre' }
    };

    const context = {
        state: mockState,
        ...turmaMethods
    };

    // Test Case 1: Legacy call (only IDs)
    await t.test('should calculate summary using IDs lookup', () => {
        const result = context.getResumoAcademico('t1', 'a1');
        assert.ok(result);
        assert.strictEqual(result.periodos[1], 8);
        assert.strictEqual(result.periodos[2], 7);
        assert.strictEqual(result.somaAnual, 15);
        assert.strictEqual(result.mediaAnual, 15/4);
    });

    // Test Case 2: Optimized call (passing objects)
    await t.test('should calculate summary using passed objects', () => {
        const turma = mockState.turmas[0];
        const aluno = turma.alunos[0];
        const result = context.getResumoAcademico('t1', 'a1', turma, aluno);
        assert.ok(result);
        assert.strictEqual(result.periodos[1], 8);
        assert.strictEqual(result.periodos[2], 7);
        assert.strictEqual(result.somaAnual, 15);
        assert.strictEqual(result.mediaAnual, 15/4);
    });

    // Test Case 3: Mixed call (turma object passed, find aluno)
    await t.test('should work with partial optimization (turma object only)', () => {
        const turma = mockState.turmas[0];
        const result = context.getResumoAcademico('t1', 'a1', turma);
        assert.ok(result);
        assert.strictEqual(result.periodos[1], 8);
    });

     // Test Case 4: Non-existent student
    await t.test('should return null for non-existent student', () => {
        const result = context.getResumoAcademico('t1', 'non-existent');
        assert.strictEqual(result, null);
    });
});
