import test from 'node:test';
import assert from 'node:assert';
import { generateUUID, escapeHTML } from './utils.js';

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

test('escapeHTML', async (t) => {
    await t.test('should handle empty string', () => {
        assert.strictEqual(escapeHTML(''), '');
    });

    await t.test('should handle null or undefined', () => {
        assert.strictEqual(escapeHTML(null), '');
        assert.strictEqual(escapeHTML(undefined), '');
    });

    await t.test('should return original string if no special characters', () => {
        assert.strictEqual(escapeHTML('hello world'), 'hello world');
    });

    await t.test('should escape &', () => {
        assert.strictEqual(escapeHTML('Me & You'), 'Me &amp; You');
    });

    await t.test('should escape < and >', () => {
        assert.strictEqual(escapeHTML('<script>'), '&lt;script&gt;');
    });

    await t.test('should escape " and \'', () => {
        assert.strictEqual(escapeHTML('"Hello"'), '&quot;Hello&quot;');
        assert.strictEqual(escapeHTML("'Hello'"), '&#39;Hello&#39;');
    });

    await t.test('should handle mixed special characters', () => {
        assert.strictEqual(escapeHTML('<div class="test">Foo & Bar</div>'), '&lt;div class=&quot;test&quot;&gt;Foo &amp; Bar&lt;/div&gt;');
    });
});
