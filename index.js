const path = require('path');
const { loadInstrDict } = require('./src/utils');
const { runTier1 } = require('./src/tier1');
const { createLogger } = require('./src/logger');

const INSTR_DICT_PATH = path.join(__dirname, 'instr_dict.json');
const OUTPUT_PATH = path.join(__dirname, 'output.txt');

function main() {
  const instrDict = loadInstrDict(INSTR_DICT_PATH);
  const logger = createLogger(OUTPUT_PATH);

  logger.log(`Loaded ${Object.keys(instrDict).length} instructions from instr_dict.json`);

  runTier1(instrDict, logger.log);

  logger.save();
  console.log(`\nOutput saved to ${OUTPUT_PATH}`);
}

main();
