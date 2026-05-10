const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getExtensions } = require('../src/utils');

test('returns extension array when present', () => {
  assert.deepEqual(getExtensions({ extension: ['rv_i', 'rv_m'] }), ['rv_i', 'rv_m']);
});

test('returns empty array when extension field is missing', () => {
  assert.deepEqual(getExtensions({}), []);
});

test('returns empty array when extension is null', () => {
  assert.deepEqual(getExtensions({ extension: null }), []);
});

test('filters out non-string entries', () => {
  assert.deepEqual(getExtensions({ extension: ['rv_i', 42, '', 'rv_m'] }), ['rv_i', 'rv_m']);
});
