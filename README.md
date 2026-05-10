# RISC-V Instruction Set Explorer

A JavaScript tool that parses the RISC-V instruction dictionary and cross-references it against the official ISA manual.

---

## How to run

No dependencies — just Node.js (v14 or later).

```bash
node index.js
```

Output is printed to the terminal and also written to `output.txt` in the same folder, overwriting it on each run.

<img width="1728" height="966" alt="image" src="https://github.com/user-attachments/assets/93faf9ba-0fdb-41be-a973-28ff4988f01d" />

---

## Project structure

```
riscv-explorer/
  index.js            # entry point — loads the data and runs all tiers
  instr_dict.json     # local copy of the instruction dictionary
  output.txt          # last run's output (overwritten on each run)
  src/
    utils.js          # file loading and field guards
    normalize.js      # tag normalization shared between Tier 1 and Tier 2
    tier1.js          # grouping, summary table, multi-extension list
    tier2.js          # ISA manual scanning and cross-reference
    logger.js         # writes to stdout and buffers for output.txt
```

The ISA manual is read from `../riscv-isa-manual/src/` relative to this folder. That path is configured at the top of `index.js`.

---

## Tier 1 — Instruction grouping

Reads `instr_dict.json`, which contains 1188 RISC-V instruction entries. Each entry has a mnemonic (like `add`, `andn`, `vsha2ch_vv`) and a list of extension tags it belongs to (like `rv_zbb`, `rv_zkn`).

The program:

1. Groups every instruction by its extension tag, building a map of which instructions belong to which extension.
2. Prints a summary table with each extension, how many instructions it contains, and one example mnemonic.
3. Lists every instruction that belongs to more than one extension — there are 73 of them.

---

## Tier 2 — Cross-reference with the ISA manual

Scans all `.adoc` source files under the ISA manual's `src/` directory and extracts extension names. These are then matched against the extensions found in `instr_dict.json`.

The program reports:

- Extensions present in `instr_dict.json` but not mentioned in the manual (likely experimental or in-progress extensions)
- Extensions in the manual but not in `instr_dict.json` (CSR-only extensions, paging modes, privilege extensions with no instructions)
- A count summary of matched, JSON-only, and manual-only extensions

---

## Design decisions

### Tier 1: Extension tags are kept as-is from the JSON

The JSON uses tags like `rv_zba`, `rv64_zba`, and `rv32_zknd`. These look similar but are treated as separate entries in Tier 1. For example, `rv_zba` covers both 32-bit and 64-bit, while `rv64_zba` adds instructions that only make sense on a 64-bit machine (like `add.uw`). The Tier 1 table faithfully reflects what the JSON says. Normalization happens in Tier 2.

### Tier 1: The example mnemonic is always alphabetically first

Instructions within each extension group are stored alphabetically. The "example" is the first one, making the output reproducible regardless of JSON key ordering across different Node.js versions.

### Tier 1: Multi-extension list is sorted by count descending

Instructions that appear in the most extensions come first. `ANDN` and `CLMUL` top the list at 5 extensions each, making the most cross-cutting instructions immediately visible.

### Tier 2: How extension names are extracted from the manual

The `.adoc` files use `[[ext:NAME]]` as the canonical anchor for extension definitions (e.g. `[[ext:zba]]`). This is the primary source — scanning these is reliable and unambiguous.

For privilege-level extensions (`smrnmi`, `svinval`, `svnapot`, etc.) the manual uses plain `[[NAME]]` anchors without the `ext:` prefix. To avoid picking up thousands of internal section anchors that use the same syntax, we only accept a bare `[[NAME]]` anchor if the anchor name matches the file it's in. For example, `[[smrnmi]]` inside `smrnmi.adoc` is accepted; `[[smstateen_bit_supervisor]]` inside `smstateen.adoc` is not.

The `profiles/` directory is intentionally skipped — those files reference extensions but don't define them, so including them would double-count.

### Tier 2: Normalizing JSON tags before matching

JSON tags carry a prefix (`rv_`, `rv32_`, `rv64_`) and the manual doesn't. `normalize.js` strips the prefix to get the bare name, then deduplicates across xlen variants — `rv_zba` and `rv64_zba` both become `zba` and count as one entry for cross-reference purposes.

### Tier 2: Compound tags

Some JSON tags like `rv_d_zfa` or `rv_svinval_h` represent instructions that live at the intersection of two extensions. The manual has no single anchor for them — it only defines `d` and `zfa` separately. After stripping the prefix, if a name like `d_zfa` doesn't match any known extension directly, we try splitting it at each underscore boundary and check if both halves exist in the manual. If they do, it's counted as a compound match.

### Tier 2: Synthetic tags

Tags like `rv_system`, `rv_u`, `rv_s`, and `rv_i` represent base ISA modes or privilege levels rather than real optional extensions. They have no `[[ext:...]]` anchor in the manual and are excluded from the mismatch count. They're reported separately so they don't inflate the "JSON only" list.

### Tier 2: The `c` extension

The compressed `c` extension in the JSON predates the manual's current organization, where it was split into `zca`, `zcb`, `zcd`, `zcf`, and `zce`. Rather than hardcoding a mapping, we treat `c` as matched if any `zc*` anchor exists in the manual, which is a forward-compatible check.

### Output: each function accepts an `emit` callback

Print functions in `tier1.js` and `tier2.js` take an optional `emit` parameter that defaults to `console.log`. This means the logger can swap it out to capture lines for `output.txt` without changing any logic. It also keeps each function independently testable.

---

## Assumptions

- The JSON is well-formed and its top-level keys are instruction mnemonics.
- Extension tags that differ only by `rv32_` / `rv64_` / `rv_` prefix are treated as separate in Tier 1 and merged in Tier 2.
- The ISA manual lives at `../riscv-isa-manual/` relative to this project folder.
- Extensions in the manual that have no associated instructions (CSR-only, paging modes, profiles) legitimately produce "manual only" results — this is expected, not a bug.
- Experimental or pre-ratification extensions in the JSON that don't appear in the manual produce "JSON only" results for the same reason.

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

=== Tier 2: Cross-Reference Results ===

  Matched:      61
  JSON only:    20
  Manual only:  76
  Synthetic*:   4  (* base ISA tags, excluded from mismatch)

Extensions in instr_dict.json but NOT found in the ISA manual:

  zbp                       (raw: rv64_zbp, rv_zbp)
  zibi                      (raw: rv_zibi)
  zvzip                     (raw: rv_zvzip)
  ...

Extensions in the ISA manual but NOT present in instr_dict.json:

  zca                       [ext]
  zmmul                     [ext]
  svnapot                   [priv]
  ...

Matched extensions (with how they were matched):

  zba                       direct
  d_zfa                     compound (d + zfa)
  c                         direct
  svinval                   direct
  ...
```
