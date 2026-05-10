const { test } = require('node:test');
const assert = require('node:assert/strict');
const { groupByExtension, findMultiExtensionInstructions } = require('../src/tier1');

const FIXTURE = {
  add:    { extension: ['rv_i'] },
  addi:   { extension: ['rv_i'] },
  mul:    { extension: ['rv_m'] },
  andn:   { extension: ['rv_zbb', 'rv_zk'] },
  clmul:  { extension: ['rv_zbc', 'rv_zk', 'rv_zkn'] },
};

// --- groupByExtension ---

test('groups instructions by extension tag', () => {
  const result = groupByExtension(FIXTURE);
  assert.ok(result.has('rv_i'));
  assert.deepEqual(result.get('rv_i'), ['add', 'addi']);
});

test('each extension contains the right instruction count', () => {
  const result = groupByExtension(FIXTURE);
  assert.equal(result.get('rv_i').length, 2);
  assert.equal(result.get('rv_m').length, 1);
  assert.equal(result.get('rv_zk').length, 2); // andn + clmul
});

test('mnemonics within an extension are sorted alphabetically', () => {
  const dict = { zzz: { extension: ['rv_i'] }, aaa: { extension: ['rv_i'] } };
  const result = groupByExtension(dict);
  assert.deepEqual(result.get('rv_i'), ['aaa', 'zzz']);
});

test('an instruction in multiple extensions appears in each', () => {
  const result = groupByExtension(FIXTURE);
  assert.ok(result.get('rv_zk').includes('andn'));
  assert.ok(result.get('rv_zbb').includes('andn'));
});

test('returns empty map for empty dict', () => {
  assert.equal(groupByExtension({}).size, 0);
});

test('skips instructions with no extension field', () => {
  const dict = { add: { extension: ['rv_i'] }, bad: {} };
  const result = groupByExtension(dict);
  assert.equal(result.size, 1);
});

// --- findMultiExtensionInstructions ---

test('finds only instructions with more than one extension', () => {
  const result = findMultiExtensionInstructions(FIXTURE);
  const mnemonics = result.map(r => r.mnemonic);
  assert.ok(mnemonics.includes('andn'));
  assert.ok(mnemonics.includes('clmul'));
  assert.ok(!mnemonics.includes('add'));
  assert.ok(!mnemonics.includes('mul'));
});

test('result includes extensions list for each instruction', () => {
  const result = findMultiExtensionInstructions(FIXTURE);
  const andn = result.find(r => r.mnemonic === 'andn');
  assert.deepEqual(andn.extensions, ['rv_zbb', 'rv_zk']);
});

test('sorted by extension count descending', () => {
  const result = findMultiExtensionInstructions(FIXTURE);
  // clmul has 3 extensions, andn has 2 — clmul must come first
  assert.equal(result[0].mnemonic, 'clmul');
  assert.equal(result[1].mnemonic, 'andn');
});

test('ties broken alphabetically', () => {
  const dict = {
    zzz: { extension: ['rv_a', 'rv_b'] },
    aaa: { extension: ['rv_a', 'rv_b'] },
  };
  const result = findMultiExtensionInstructions(dict);
  assert.equal(result[0].mnemonic, 'aaa');
});

test('returns empty array when no instruction spans multiple extensions', () => {
  const dict = { add: { extension: ['rv_i'] }, mul: { extension: ['rv_m'] } };
  assert.deepEqual(findMultiExtensionInstructions(dict), []);
});
