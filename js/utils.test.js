import test from 'node:test';
import assert from 'node:assert';
import { generateUUID } from './utils.js';

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
