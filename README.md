# RISC-V Instruction Set Explorer

A JavaScript tool that parses the RISC-V instruction dictionary and cross-references it against the official ISA manual.

---

## How to run

No dependencies — just Node.js (v14 or later).

```bash
node index.js
```

---

## Project structure

```
riscv-explorer/
  index.js          # entry point — loads the data and runs each tier
  instr_dict.json   # local copy of the instruction dictionary
  src/
    utils.js        # shared helpers (file loading, field guards)
    tier1.js        # Tier 1 logic — grouping, summary table, multi-extension list
```

---

## Tier 1 — What it does

Reads `instr_dict.json`, which contains 1188 RISC-V instruction entries. Each entry has a `mnemonic` (like `add`, `andn`, `vsha2ch_vv`) and a list of `extension` tags it belongs to (like `rv_zbb`, `rv_zkn`).

The program:

1. Groups every instruction by its extension tag, building a map of which instructions belong to which extension.
2. Prints a summary table with each extension, how many instructions it contains, and one example mnemonic.
3. Lists every instruction that belongs to more than one extension — there are 73 of them.

---

## Design decisions

### Extension tags are kept as-is from the JSON

The JSON uses tags like `rv_zba`, `rv64_zba`, and `rv32_zknd`. These look similar but are treated as separate entries. For example, `rv_zba` covers both 32-bit and 64-bit, while `rv64_zba` adds instructions that only make sense on a 64-bit machine (like `add.uw`).

I did not merge these into a single logical extension at this stage. The Tier 1 table faithfully reflects what the JSON says. Normalizing them (e.g. treating `rv_zba` and `rv64_zba` as just "Zba") would be useful for Tier 2 when cross-referencing against the ISA manual — that normalization happens there.

### The example mnemonic is always alphabetically first

The instructions inside each extension group are stored in alphabetical order. The "example" shown in the table is simply the first one alphabetically. This makes the output reproducible — running the program twice always shows the same example, regardless of JSON key ordering in different Node.js versions.

### Multi-extension list is sorted by how many extensions share the instruction

Instructions that appear in the most extensions come first. `ANDN` and `CLMUL` top the list at 5 extensions each. This makes it easy to spot the most "cross-cutting" instructions at a glance.

### Each function is exported separately

`groupByExtension`, `findMultiExtensionInstructions`, `printSummaryTable`, and `printMultiExtensionInstructions` are all exported individually from `tier1.js`. This means they can be tested in isolation (Tier 3 bonus) without running the whole program.

### The `getExtensions` guard in `utils.js`

In the current dataset, every instruction has a non-empty `extension` array — so the guard is not strictly necessary. It's there because the function is called from multiple places and a malformed entry should produce a warning/skip rather than a crash. Without the guard, a `null` or missing `extension` field would either add instructions to an `undefined` key or throw at runtime.

---

## Assumptions

- The JSON is well-formed and its top-level keys are instruction mnemonics.
- Extension tags that differ only by `rv32_` / `rv64_` / `rv_` prefix are considered separate extensions for Tier 1 purposes.
- "Example mnemonic" means one representative instruction per extension — alphabetically first was chosen for determinism over other heuristics (most-common, shortest name, etc.).

---

## Sample output (truncated)

```
Loaded 1188 instructions from instr_dict.json

=== Tier 1: Extension Summary ===

Extension Tag                 | Instruction Count| Example Mnemonic
-------------------------------------------------------------------
rv_a                          | 11               | e.g. AMOADD_W
rv_i                          | 37               | e.g. ADD
rv_m                          | 8                | e.g. DIV
rv_v                          | 627              | e.g. VAADD_VV
rv_zba                        | 3                | e.g. SH1ADD
rv_zbb                        | 17               | e.g. ANDN
...
Total extensions: 114

=== Tier 1: Multi-Extension Instructions ===

Found 73 instructions belonging to more than one extension:

  ANDN                 (5) -> rv_zbb, rv_zkn, rv_zks, rv_zk, rv_zbkb
  CLMUL                (5) -> rv_zbc, rv_zkn, rv_zks, rv_zk, rv_zbkc
  ...
```
