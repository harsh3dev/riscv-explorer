const { getExtensions } = require('./utils');

/**
 * Builds an inverted index: extension tag -> sorted list of mnemonics.
 * @param {Object} instrDict
 * @returns {Map<string, string[]>}
 */
function groupByExtension(instrDict) {
  const extensionToMnemonics = new Map();

  const sortedMnemonics = Object.keys(instrDict).sort();

  for (const mnemonic of sortedMnemonics) {
    const extensionTags = getExtensions(instrDict[mnemonic]);
    for (const tag of extensionTags) {
      if (!extensionToMnemonics.has(tag)) extensionToMnemonics.set(tag, []);
      extensionToMnemonics.get(tag).push(mnemonic);
    }
  }

  return extensionToMnemonics;
}

/**
 * Finds all instructions that appear in more than one extension.
 * @param {Object} instrDict
 * @returns {Array<{mnemonic: string, extensions: string[]}>}
 */
function findMultiExtensionInstructions(instrDict) {
  const sharedInstructions = [];

  for (const [mnemonic, instrData] of Object.entries(instrDict)) {
    const extensionTags = getExtensions(instrData);
    if (extensionTags.length > 1) {
      sharedInstructions.push({ mnemonic, extensions: extensionTags });
    }
  }

  // Sort by number of extensions desc, then alphabetically
  sharedInstructions.sort((a, b) =>
    b.extensions.length - a.extensions.length || a.mnemonic.localeCompare(b.mnemonic)
  );

  return sharedInstructions;
}

/**
 * Prints a formatted summary table to stdout.
 * @param {Map<string, string[]>} extensionToMnemonics
 */
function printSummaryTable(extensionToMnemonics, emit = console.log) {
  const sortedExtensions = [...extensionToMnemonics.entries()].sort(([a], [b]) => a.localeCompare(b));

  const TAG_COL_WIDTH = 30;
  const COUNT_COL_WIDTH = 17;

  const header =
    'Extension Tag'.padEnd(TAG_COL_WIDTH) +
    '| ' + 'Instruction Count'.padEnd(COUNT_COL_WIDTH) +
    '| Example Mnemonic';

  emit('\n=== Tier 1: Extension Summary ===\n');
  emit(header);
  emit('-'.repeat(header.length));

  for (const [tag, mnemonics] of sortedExtensions) {
    const exampleMnemonic = mnemonics[0].toUpperCase(); // already sorted alphabetically
    const row =
      tag.padEnd(TAG_COL_WIDTH) +
      '| ' + String(mnemonics.length).padEnd(COUNT_COL_WIDTH) +
      '| e.g. ' + exampleMnemonic;
    emit(row);
  }

  emit(`\nTotal extensions: ${sortedExtensions.length}`);
}

/**
 * Prints the list of instructions shared across multiple extensions.
 * @param {Array<{mnemonic: string, extensions: string[]}>} sharedInstructions
 */
function printMultiExtensionInstructions(sharedInstructions, emit = console.log) {
  emit('\n=== Tier 1: Multi-Extension Instructions ===\n');
  emit(`Found ${sharedInstructions.length} instructions belonging to more than one extension:\n`);

  for (const { mnemonic, extensions } of sharedInstructions) {
    emit(`  ${mnemonic.toUpperCase().padEnd(20)} (${extensions.length}) -> ${extensions.join(', ')}`);
  }
}

/**
 * Orchestrates Tier 1.
 * @param {Object} instrDict
 */
function runTier1(instrDict, emit = console.log) {
  const extensionToMnemonics = groupByExtension(instrDict);
  printSummaryTable(extensionToMnemonics, emit);

  const sharedInstructions = findMultiExtensionInstructions(instrDict);
  printMultiExtensionInstructions(sharedInstructions, emit);

  return { extensionToMnemonics, sharedInstructions };
}

module.exports = {
  groupByExtension,
  findMultiExtensionInstructions,
  printSummaryTable,
  printMultiExtensionInstructions,
  runTier1,
};
