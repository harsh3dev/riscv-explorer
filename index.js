const path = require('path');
const { loadInstrDict } = require('./src/utils');
const { runTier1 } = require('./src/tier1');
const { runTier2 } = require('./src/tier2');
const { runGraph } = require('./src/graph');
const { createLogger } = require('./src/logger');

const INSTR_DICT_PATH  = path.join(__dirname, 'instr_dict.json');
const MANUAL_SRC_PATH  = path.join(__dirname, '..', 'riscv-isa-manual', 'src');
const OUTPUT_PATH      = path.join(__dirname, 'output.txt');
const GRAPH_HTML_PATH  = path.join(__dirname, 'graph.html');

const arg    = process.argv[2];
const runAll = !arg || arg === '--all';
const runT1  = runAll || arg === '--tier1';
const runT2  = runAll || arg === '--tier2';
const runG   = arg === '--graph';

if (!runT1 && !runT2 && !runG) {
  console.error(`Unknown argument: ${arg}`);
  console.error('Usage: node index.js [--tier1 | --tier2 | --all | --graph]');
  process.exit(1);
}

function main() {
  const instrDict = loadInstrDict(INSTR_DICT_PATH);
  const logger    = createLogger(OUTPUT_PATH);

  logger.log(`Loaded ${Object.keys(instrDict).length} instructions from instr_dict.json`);

  if (runT1) runTier1(instrDict, logger.log);
  if (runT2) runTier2(instrDict, MANUAL_SRC_PATH, logger.log);
  if (runG)  runGraph(instrDict, GRAPH_HTML_PATH, logger.log);

  logger.save();
  console.log(`\nOutput saved to ${OUTPUT_PATH}`);
}

main();
