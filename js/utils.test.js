import test from 'node:test';
import assert from 'node:assert';
import { generateUUID, normalizeText } from './utils.js';

test('generateUUID', async (t) => {
    await t.test('should return a string', () => {
        const uuid = generateUUID();
        assert.strictEqual(typeof uuid, 'string');
    });

    await t.test('should not be empty', () => {
        const uuid = generateUUID();
        assert.ok(uuid.length > 0);
    });

    await t.test('should generate unique values', () => {
        const uuids = new Set();
        for (let i = 0; i < 1000; i++) {
            const uuid = generateUUID();
            assert.strictEqual(uuids.has(uuid), false, `Duplicate UUID generated: ${uuid}`);
            uuids.add(uuid);
        }
    });

    await t.test('should follow expected format (alphanumeric)', () => {
        const uuid = generateUUID();
        // Date.now().toString(36) is alphanumeric
        // Math.random().toString(36).substr(2) is alphanumeric
        assert.match(uuid, /^[a-z0-9]+$/i);
    });
});

test('normalizeText', async (t) => {
    await t.test('should return empty string for null/undefined/empty input', () => {
        assert.strictEqual(normalizeText(null), "");
        assert.strictEqual(normalizeText(undefined), "");
        assert.strictEqual(normalizeText(""), "");
    });

    await t.test('should convert to lowercase', () => {
        assert.strictEqual(normalizeText("TEST"), "test");
        assert.strictEqual(normalizeText("TeSt"), "test");
    });

    await t.test('should remove accents', () => {
        assert.strictEqual(normalizeText("Ação"), "acao");
        assert.strictEqual(normalizeText("Épico"), "epico");
        assert.strictEqual(normalizeText("Ônibus"), "onibus");
        assert.strictEqual(normalizeText("Às vezes"), "as vezes");
        assert.strictEqual(normalizeText("Coração"), "coracao");
    });

    await t.test('should handle mixed content', () => {
        assert.strictEqual(normalizeText("123 Teste!"), "123 teste!");
    });

    await t.test('should handle leading/trailing spaces', () => {
        // The current implementation does not trim, so it should preserve spaces
        assert.strictEqual(normalizeText("  test  "), "  test  ");
    });
});
