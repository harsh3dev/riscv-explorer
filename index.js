const path = require('path');
const { loadInstrDict } = require('./src/utils');
const { runTier1 } = require('./src/tier1');
const { runTier2 } = require('./src/tier2');
const { createLogger } = require('./src/logger');

const INSTR_DICT_PATH = path.join(__dirname, 'instr_dict.json');
const MANUAL_SRC_PATH = path.join(__dirname, '..', 'riscv-isa-manual', 'src');
const OUTPUT_PATH = path.join(__dirname, 'output.txt');

const tierArg = process.argv[2];
const runAll = !tierArg || tierArg === '--all';
const runT1 = runAll || tierArg === '--tier1';
const runT2 = runAll || tierArg === '--tier2';

if (!runT1 && !runT2) {
  console.error(`Unknown argument: ${tierArg}`);
  console.error('Usage: node index.js [--tier1 | --tier2 | --all]');
  process.exit(1);
}

function main() {
  const instrDict = loadInstrDict(INSTR_DICT_PATH);
  const logger = createLogger(OUTPUT_PATH);

  logger.log(`Loaded ${Object.keys(instrDict).length} instructions from instr_dict.json`);

  if (runT1) runTier1(instrDict, logger.log);
  if (runT2) runTier2(instrDict, MANUAL_SRC_PATH, logger.log);

  logger.save();
  console.log(`\nOutput saved to ${OUTPUT_PATH}`);
}

main();
