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
    await t.test('should return empty string for null/undefined/empty input', () => {
        assert.strictEqual(escapeHTML(null), '');
        assert.strictEqual(escapeHTML(undefined), '');
        assert.strictEqual(escapeHTML(''), '');
    });

    await t.test('should return original string if no special characters', () => {
        const safeString = 'Hello World 123';
        assert.strictEqual(escapeHTML(safeString), safeString);
    });

    await t.test('should escape special characters', () => {
        const input = '& < > " \'';
        const expected = '&amp; &lt; &gt; &quot; &#39;';
        assert.strictEqual(escapeHTML(input), expected);
    });

    await t.test('should escape mixed content', () => {
        const input = '<script>alert("xss")</script>';
        const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
        assert.strictEqual(escapeHTML(input), expected);
    });

    await t.test('should escape repeated special characters', () => {
        const input = '<<<>>>&&&"""\'\'\'';
        const expected = '&lt;&lt;&lt;&gt;&gt;&gt;&amp;&amp;&amp;&quot;&quot;&quot;&#39;&#39;&#39;';
        assert.strictEqual(escapeHTML(input), expected);
    });
});
