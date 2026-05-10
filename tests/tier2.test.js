const { test } = require('node:test');
const assert = require('node:assert/strict');
const { crossReference } = require('../src/tier2');

// Helper to build a jsonExtensions Map directly (bypassing collectJsonExtensions)
function makeJsonExtensions(entries) {
  return new Map(entries.map(([norm, raws]) => [norm, raws]));
}

// --- direct match ---

test('direct match against extAnchors', () => {
  const json = makeJsonExtensions([['zba', ['rv_zba']]]);
  const { matched, jsonOnly, manualOnly } = crossReference(json, new Set(['zba']), new Set());
  assert.equal(matched.length, 1);
  assert.equal(matched[0].how, 'direct');
  assert.equal(jsonOnly.length, 0);
  assert.equal(manualOnly.length, 0);
});

test('direct match against privAnchors', () => {
  const json = makeJsonExtensions([['svinval', ['rv_svinval']]]);
  const { matched } = crossReference(json, new Set(), new Set(['svinval']));
  assert.equal(matched.length, 1);
  assert.equal(matched[0].how, 'direct');
});

// --- compound match ---

test('compound match splits "d_zfa" into d + zfa', () => {
  const json = makeJsonExtensions([['d_zfa', ['rv_d_zfa']]]);
  const ext = new Set(['d', 'zfa', 'f']);
  const { matched, jsonOnly } = crossReference(json, ext, new Set());
  assert.equal(matched.length, 1);
  assert.ok(matched[0].how.startsWith('compound'));
  assert.equal(jsonOnly.length, 0);
});

test('compound match marks both parts as covered in manual', () => {
  const json = makeJsonExtensions([['d_zfa', ['rv_d_zfa']]]);
  const ext = new Set(['d', 'zfa']);
  const { manualOnly } = crossReference(json, ext, new Set());
  // both d and zfa covered by the compound match — nothing manual-only
  assert.equal(manualOnly.length, 0);
});

// --- 'c' remap ---

test("'c' matches against zc* anchors in the manual", () => {
  const json = makeJsonExtensions([['c', ['rv_c']]]);
  const ext = new Set(['zca', 'zcb', 'zcd']);
  const { matched, jsonOnly } = crossReference(json, ext, new Set());
  assert.equal(matched.length, 1);
  assert.ok(matched[0].how.includes('remap'));
  assert.equal(jsonOnly.length, 0);
});

test("'c' is JSON-only if no zc* anchors exist", () => {
  const json = makeJsonExtensions([['c', ['rv_c']]]);
  const { jsonOnly } = crossReference(json, new Set(['zba']), new Set());
  assert.equal(jsonOnly.length, 1);
  assert.equal(jsonOnly[0].normalized, 'c');
});

// --- synthetic ---

test('synthetic tags are excluded from matched and jsonOnly', () => {
  const json = makeJsonExtensions([
    ['system', ['rv_system']],
    ['u',      ['rv_u']],
    ['s',      ['rv_s']],
    ['i',      ['rv_i']],
  ]);
  const { matched, jsonOnly, synthetic } = crossReference(json, new Set(), new Set());
  assert.equal(matched.length, 0);
  assert.equal(jsonOnly.length, 0);
  assert.equal(synthetic.length, 4);
});

// --- JSON only ---

test('unmatched JSON extension lands in jsonOnly', () => {
  const json = makeJsonExtensions([['zbp', ['rv_zbp']]]);
  const { jsonOnly } = crossReference(json, new Set(['zba']), new Set());
  assert.equal(jsonOnly.length, 1);
  assert.equal(jsonOnly[0].normalized, 'zbp');
});

// --- manual only ---

test('manual extension not covered by any JSON tag lands in manualOnly', () => {
  const json = makeJsonExtensions([['zba', ['rv_zba']]]);
  const ext = new Set(['zba', 'zmmul']);
  const { manualOnly } = crossReference(json, ext, new Set());
  assert.equal(manualOnly.length, 1);
  assert.equal(manualOnly[0].name, 'zmmul');
});

test('manualOnly source field reflects which anchor set it came from', () => {
  const json = makeJsonExtensions([]);
  const { manualOnly } = crossReference(
    json,
    new Set(['zba']),
    new Set(['svinval'])
  );
  const extEntry  = manualOnly.find(e => e.name === 'zba');
  const privEntry = manualOnly.find(e => e.name === 'svinval');
  assert.equal(extEntry.source, 'ext');
  assert.equal(privEntry.source, 'priv');
});

test('manualOnly is sorted alphabetically', () => {
  const json = makeJsonExtensions([]);
  const ext = new Set(['ztso', 'zba', 'zmmul']);
  const { manualOnly } = crossReference(json, ext, new Set());
  const names = manualOnly.map(e => e.name);
  assert.deepEqual(names, [...names].sort());
});

// --- mixed scenario ---

test('mixed: direct, compound, and jsonOnly in one call', () => {
  const json = makeJsonExtensions([
    ['zba',   ['rv_zba']],    // direct
    ['d_zfa', ['rv_d_zfa']],  // compound
    ['zbp',   ['rv_zbp']],    // json only
  ]);
  const ext = new Set(['zba', 'd', 'zfa', 'zmmul']);
  const { matched, jsonOnly, manualOnly } = crossReference(json, ext, new Set());
  assert.equal(matched.length, 2);
  assert.equal(jsonOnly.length, 1);
  assert.equal(jsonOnly[0].normalized, 'zbp');
  assert.equal(manualOnly.length, 1);
  assert.equal(manualOnly[0].name, 'zmmul');
});
