const fs = require('fs');
const path = require('path');

function loadInstrDict(filePath) {
  const abs = path.resolve(filePath);
  const raw = fs.readFileSync(abs, 'utf8');
  const data = JSON.parse(raw);

  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('instr_dict.json must be a top-level object');
  }

  return data;
}

// Returns extensions array for an entry, guarding against missing/empty
function getExtensions(entry) {
  if (!Array.isArray(entry.extension)) return [];
  return entry.extension.filter(e => typeof e === 'string' && e.length > 0);
}

module.exports = { loadInstrDict, getExtensions };
