const fs = require('fs');

/**
 * Creates a logger that writes to stdout and buffers lines for file output.
 * Call save() at the end to flush the buffer to disk (overwriting the file).
 */
function createLogger(outputPath) {
  const lines = [];

  function log(line = '') {
    console.log(line);
    lines.push(line);
  }

  function save() {
    fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf8');
  }

  return { log, save };
}

module.exports = { createLogger };
