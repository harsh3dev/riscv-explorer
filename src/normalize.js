// Base ISA modes/levels — no [[ext:...]] anchor in the manual, excluded from mismatch counts
const SYNTHETIC_TAGS = new Set(['system', 'u', 's', 'i']);

// Only priv/ files with these filename prefixes are scanned for extension anchors
const PRIV_PREFIXES = ['sm', 'ss', 'sv', 'sd', 'sh'];

function stripPrefix(rawTag) {
  for (const prefix of ['rv32_', 'rv64_', 'rv_']) {
    if (rawTag.startsWith(prefix)) return rawTag.slice(prefix.length);
  }
  return rawTag;
}

// Deduplicates xlen variants: rv_zba and rv64_zba both normalize to "zba"
function collectJsonExtensions(instrDict) {
  const result = new Map();

  for (const instrData of Object.values(instrDict)) {
    for (const rawTag of (instrData.extension || [])) {
      const normalized = stripPrefix(rawTag);
      if (!result.has(normalized)) result.set(normalized, []);
      if (!result.get(normalized).includes(rawTag)) {
        result.get(normalized).push(rawTag);
      }
    }
  }

  return result;
}

// Splits "c_f" or "svinval_h" at each underscore boundary and checks if both
// halves exist in the manual. Returns { left, right } on the first match, or null.
function tryCompoundSplit(normalized, allManualNames) {
  const segments = normalized.split('_');
  for (let i = 1; i < segments.length; i++) {
    const left = segments.slice(0, i).join('_');
    const right = segments.slice(i).join('_');
    if (allManualNames.has(left) && allManualNames.has(right)) {
      return { left, right };
    }
  }
  return null;
}

module.exports = { SYNTHETIC_TAGS, PRIV_PREFIXES, stripPrefix, collectJsonExtensions, tryCompoundSplit };
