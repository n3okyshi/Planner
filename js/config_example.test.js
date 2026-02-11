import test from 'node:test';
import assert from 'node:assert';
import { firebaseConfig } from './config.example.js';

test('firebaseConfig example structure', async (t) => {
    await t.test('should export firebaseConfig object', () => {
        assert.ok(firebaseConfig, 'firebaseConfig should be defined');
        assert.strictEqual(typeof firebaseConfig, 'object');
    });

    await t.test('should have required keys', () => {
        const requiredKeys = [
            'apiKey',
            'authDomain',
            'projectId',
            'storageBucket',
            'messagingSenderId',
            'appId'
        ];

        requiredKeys.forEach(key => {
            assert.ok(key in firebaseConfig, `Missing key: ${key}`);
            assert.ok(firebaseConfig[key], `Value for ${key} should be truthy`);
        });
    });
});
