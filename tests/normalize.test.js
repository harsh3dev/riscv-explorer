const { test } = require('node:test');
const assert = require('node:assert/strict');
const { stripPrefix, collectJsonExtensions, tryCompoundSplit } = require('../src/normalize');

// --- stripPrefix ---

test('strips rv_ prefix', () => {
  assert.equal(stripPrefix('rv_zba'), 'zba');
});

test('strips rv32_ prefix', () => {
  assert.equal(stripPrefix('rv32_zknd'), 'zknd');
});

test('strips rv64_ prefix', () => {
  assert.equal(stripPrefix('rv64_zbb'), 'zbb');
});

test('leaves unknown prefixes untouched', () => {
  assert.equal(stripPrefix('zba'), 'zba');
  assert.equal(stripPrefix('rv128_zba'), 'rv128_zba');
});

test('strips longest matching prefix (rv32_ before rv_)', () => {
  // rv32_ must be tried before rv_ so it takes priority
  assert.equal(stripPrefix('rv32_c'), 'c');
});

// --- collectJsonExtensions ---

test('builds a map of normalized name -> raw tags', () => {
  const dict = {
    add:  { extension: ['rv_i'] },
    addw: { extension: ['rv64_i'] },
  };
  const result = collectJsonExtensions(dict);
  assert.ok(result.has('i'));
  assert.deepEqual(result.get('i').sort(), ['rv64_i', 'rv_i']);
});

test('deduplicates xlen variants under the same normalized key', () => {
  const dict = {
    sh1add:    { extension: ['rv_zba'] },
    sh1add_uw: { extension: ['rv64_zba'] },
  };
  const result = collectJsonExtensions(dict);
  assert.equal(result.size, 1);
  assert.ok(result.has('zba'));
  assert.equal(result.get('zba').length, 2);
});

test('does not add duplicate raw tags for the same extension', () => {
  const dict = {
    add:  { extension: ['rv_i'] },
    addi: { extension: ['rv_i'] },
  };
  const result = collectJsonExtensions(dict);
  assert.deepEqual(result.get('i'), ['rv_i']);
});

test('skips entries with missing extension field', () => {
  const dict = {
    add: { extension: ['rv_i'] },
    bad: {},
  };
  const result = collectJsonExtensions(dict);
  assert.equal(result.size, 1);
});

// --- tryCompoundSplit ---

test('splits "d_zfa" into d + zfa when both exist', () => {
  const manual = new Set(['d', 'zfa', 'f']);
  const result = tryCompoundSplit('d_zfa', manual);
  assert.deepEqual(result, { left: 'd', right: 'zfa' });
});

test('splits "svinval_h" correctly', () => {
  const manual = new Set(['svinval', 'h']);
  const result = tryCompoundSplit('svinval_h', manual);
  assert.deepEqual(result, { left: 'svinval', right: 'h' });
});

test('returns null when no valid split exists', () => {
  const manual = new Set(['zba', 'zbb']);
  assert.equal(tryCompoundSplit('d_zfa', manual), null);
});

test('returns null for a name with no underscore', () => {
  const manual = new Set(['zba', 'zfa']);
  assert.equal(tryCompoundSplit('zba', manual), null);
});

test('tries all split points for multi-underscore names', () => {
  // "a_b_c" — should try (a, b_c) and (a_b, c)
  const manual = new Set(['a_b', 'c']);
  const result = tryCompoundSplit('a_b_c', manual);
  assert.deepEqual(result, { left: 'a_b', right: 'c' });
});
