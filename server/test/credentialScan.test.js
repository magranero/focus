import test from 'node:test';
import assert from 'node:assert/strict';
import { scanText, redactText } from '../lib/credentialScan.js';

test('detects an OpenAI-style key', () => {
  const found = scanText('use my key sk-abc123def456ghi789jkl012mno345 please');
  assert.equal(found.length, 1);
  assert.equal(found[0].kind, 'openai_api_key');
});

test('prefers the more specific Anthropic pattern', () => {
  const found = scanText('sk-ant-abc123def456ghi789jkl012mno345');
  assert.equal(found.length, 1);
  assert.equal(found[0].kind, 'anthropic_api_key');
});

test('detects google, github, slack and stripe tokens', () => {
  const text = [
    'AIzaSyA1234567890abcdefghijklmnopqrstu',
    'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    'xoxb-1234567890-abcdefghij',
    'sk_test_abcdefghijklmnop'
  ].join(' ');
  const kinds = scanText(text).map((f) => f.kind).sort();
  assert.deepEqual(kinds, ['github_token', 'google_api_key', 'slack_token', 'stripe_key']);
});

test('detects password assignments in spanish', () => {
  const found = scanText('mi contraseña: superSecreta99');
  assert.equal(found.length, 1);
  assert.equal(found[0].kind, 'password_assignment');
});

test('clean text yields nothing', () => {
  assert.equal(scanText('a clock showing the time in Tokyo, big digits').length, 0);
});

test('redactText replaces credentials with placeholders', () => {
  const text = 'key sk-abc123def456ghi789jkl012mno345 end';
  const found = scanText(text);
  const redacted = redactText(text, found);
  assert.ok(!redacted.includes('sk-abc123'));
  assert.ok(redacted.includes('{{settings.secret_1}}'));
});
