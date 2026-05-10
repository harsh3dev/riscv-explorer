const fs = require('fs');
const path = require('path');
const { SYNTHETIC_TAGS, PRIV_PREFIXES, collectJsonExtensions, tryCompoundSplit } = require('./normalize');

// 'c' was reorganized in the manual into zca/zcb/zcd/zcf/zce — match against any zc* anchor
const C_EXTENSION_REMAPPED_TO = /^zc[a-z]/;

function scanManualExtensions(srcPath) {
  const extAnchors = new Set();
  const privAnchors = new Set();

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'profiles') continue; // profiles cite extensions, not define them
        walk(fullPath);
        continue;
      }

      if (!entry.name.endsWith('.adoc')) continue;

      const content = fs.readFileSync(fullPath, 'utf8');

      for (const match of content.matchAll(/\[\[ext:([a-zA-Z0-9_]+)\]\]/g)) {
        extAnchors.add(match[1].toLowerCase());
      }

      // Accept a bare [[NAME]] anchor only when it matches the filename — this is the
      // file's own self-anchor and reliably distinguishes extension names from internal
      // section anchors that use the same [[NAME]] syntax throughout priv/ files.
      if (fullPath.includes(`${path.sep}priv${path.sep}`)) {
        const filenameBase = entry.name.replace(/\.adoc$/, '').toLowerCase();
        if (PRIV_PREFIXES.some(p => filenameBase.startsWith(p))) {
          const selfAnchorPattern = new RegExp(`\\[\\[${filenameBase}\\]\\]`, 'i');
          if (selfAnchorPattern.test(content)) {
            privAnchors.add(filenameBase);
          }
        }
      }
    }
  }

  walk(srcPath);
  return { extAnchors, privAnchors };
}

function crossReference(jsonExtensions, extAnchors, privAnchors) {
  const allManualNames = new Set([...extAnchors, ...privAnchors]);
  const zcNames = [...allManualNames].filter(n => C_EXTENSION_REMAPPED_TO.test(n));

  const matched = [];
  const jsonOnly = [];
  const synthetic = [];
  const coveredManualNames = new Set();

  for (const [normalized, rawTags] of jsonExtensions) {
    if (SYNTHETIC_TAGS.has(normalized)) {
      synthetic.push({ normalized, rawTags });
      continue;
    }

    if (allManualNames.has(normalized)) {
      matched.push({ normalized, rawTags, how: 'direct', manualNames: [normalized] });
      coveredManualNames.add(normalized);
      continue;
    }

    if (normalized === 'c' && zcNames.length > 0) {
      matched.push({ normalized, rawTags, how: 'remap (c → zca/zcb/...)', manualNames: zcNames });
      zcNames.forEach(n => coveredManualNames.add(n));
      continue;
    }

    if (normalized.includes('_')) {
      const split = tryCompoundSplit(normalized, allManualNames);
      if (split) {
        matched.push({ normalized, rawTags, how: `compound (${split.left} + ${split.right})`, manualNames: [split.left, split.right] });
        coveredManualNames.add(split.left);
        coveredManualNames.add(split.right);
        continue;
      }
    }

    jsonOnly.push({ normalized, rawTags });
  }

  const manualOnly = [...allManualNames]
    .filter(n => !coveredManualNames.has(n))
    .sort()
    .map(n => ({ name: n, source: extAnchors.has(n) ? 'ext' : 'priv' }));

  matched.sort((a, b) => a.normalized.localeCompare(b.normalized));
  jsonOnly.sort((a, b) => a.normalized.localeCompare(b.normalized));

  return { matched, jsonOnly, manualOnly, synthetic };
}

function printCrossReference(results, emit = console.log) {
  const { matched, jsonOnly, manualOnly, synthetic } = results;

  emit('\n=== Tier 2: Cross-Reference Results ===\n');
  emit(`  Matched:      ${matched.length}`);
  emit(`  JSON only:    ${jsonOnly.length}`);
  emit(`  Manual only:  ${manualOnly.length}`);
  emit(`  Synthetic*:   ${synthetic.length}  (* base ISA tags, excluded from mismatch)`);
  emit('');

  if (jsonOnly.length > 0) {
    emit('Extensions in instr_dict.json but NOT found in the ISA manual:\n');
    for (const { normalized, rawTags } of jsonOnly) {
      emit(`  ${normalized.padEnd(25)} (raw: ${rawTags.join(', ')})`);
    }
  }

  emit('');

  if (manualOnly.length > 0) {
    emit('Extensions in the ISA manual but NOT present in instr_dict.json:\n');
    for (const { name, source } of manualOnly) {
      emit(`  ${name.padEnd(25)} [${source}]`);
    }
  }

  emit('');

  emit('Matched extensions (with how they were matched):\n');
  for (const { normalized, how } of matched) {
    emit(`  ${normalized.padEnd(25)} ${how}`);
  }
}

function runTier2(instrDict, manualSrcPath, emit = console.log) {
  const jsonExtensions = collectJsonExtensions(instrDict);
  emit(`Normalized JSON extensions: ${jsonExtensions.size} unique names`);

  const { extAnchors, privAnchors } = scanManualExtensions(manualSrcPath);
  emit(`Manual extensions found:    ${extAnchors.size} [[ext:...]] anchors, ${privAnchors.size} priv anchors`);

  const results = crossReference(jsonExtensions, extAnchors, privAnchors);
  printCrossReference(results, emit);

  return results;
}

module.exports = { scanManualExtensions, crossReference, printCrossReference, runTier2 };
