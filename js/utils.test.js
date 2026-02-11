import test from 'node:test';
import assert from 'node:assert';
import { generateUUID, debounce } from './utils.js';

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
