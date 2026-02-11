import test from 'node:test';
import assert from 'node:assert';
import { generateUUID, escapeHTML } from './utils.js';
import { generateUUID, debounce } from './utils.js';
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

    await t.test('should follow expected format (alphanumeric or UUID)', () => {
        const uuid = generateUUID();
        // Updated to allow hyphens for standard UUIDs
        assert.match(uuid, /^[a-z0-9-]+$/i);
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

test('debounce', async (t) => {
    // Enable mocked timers for this test
    t.mock.timers.enable(['setTimeout', 'clearTimeout']);

    await t.test('should call function after wait time', () => {
        const fn = t.mock.fn();
        const debounced = debounce(fn, 100);
        debounced();
        assert.strictEqual(fn.mock.callCount(), 0);
        t.mock.timers.tick(100);
        assert.strictEqual(fn.mock.callCount(), 1);
    });

    await t.test('should only call function once if invoked multiple times', () => {
        const fn = t.mock.fn();
        const debounced = debounce(fn, 100);
        debounced();
        debounced();
        debounced();
        assert.strictEqual(fn.mock.callCount(), 0);
        t.mock.timers.tick(100);
        assert.strictEqual(fn.mock.callCount(), 1);
    });

    await t.test('should restart timer on subsequent calls', () => {
        const fn = t.mock.fn();
        const debounced = debounce(fn, 100);
        debounced();
        t.mock.timers.tick(50);
        debounced();
        t.mock.timers.tick(50);
        assert.strictEqual(fn.mock.callCount(), 0); // Total 100ms passed since first call, but only 50ms since second call
        t.mock.timers.tick(50);
        assert.strictEqual(fn.mock.callCount(), 1);
    });

    await t.test('should pass arguments correctly', () => {
        const fn = t.mock.fn();
        const debounced = debounce(fn, 100);
        debounced('arg1', 'arg2');
        t.mock.timers.tick(100);
        assert.strictEqual(fn.mock.callCount(), 1);
        assert.deepStrictEqual(fn.mock.calls[0].arguments, ['arg1', 'arg2']);
    });

    await t.test('should preserve context', () => {
        const fn = t.mock.fn();
        const context = { value: 42 };
        const debounced = debounce(fn, 100);
        debounced.call(context);
        t.mock.timers.tick(100);
        assert.strictEqual(fn.mock.callCount(), 1);
        assert.strictEqual(fn.mock.calls[0].this, context);
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
