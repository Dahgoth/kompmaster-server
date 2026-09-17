# ADR 004: Spreadsheet Import Stack — SheetJS CE from the Official CDN

- **Status:** Proposed — 2026-09-17 (accepted on merge of the dependency-modernization PR)
- **Date:** 2026-09-17
- **Deciders:** @Dahgoth (maintainer)
- **Related:** ADR 001 (canonical core; `utils/priceImport.js` is canonical), CHANGELOG `[Unreleased]`, PR #29 (dependency baseline), `DEVELOPMENT.md` §Package manager (pnpm)

## Context

The admin price-import flow (`POST /api/products/import-price`) accepts supplier
price files as **xlsx / xls / csv / tsv** and is the only spreadsheet-parsing
surface in the backend (`backend/src/utils/priceImport.js`). Two forces collide:

1. The npm package `xlsx` is **frozen at 0.18.5** — SheetJS stopped publishing
   releases to the npm registry in 2023 and moved distribution to its own CDN.
   The registry artifact carries known vulnerabilities fixed only in CDN
   releases: CVE-2023-30533 (prototype pollution, fixed 0.19.3) and
   CVE-2024-22363 (ReDoS, fixed 0.20.2). Both are reachable in our threat
   model: the parser consumes admin-uploaded files.
2. The formats the business relies on are not negotiable. Russian suppliers
   export from Excel/1C: legacy `.xls` (BIFF8) and CSV in windows-1251 without
   a BOM are common. Any replacement must parse all four formats with
   Cyrillic text intact.

While testing the CDN release 0.20.3 we also found a behavioural difference:
0.18.5 honoured the `codepage: 65001` read option for text formats, 0.20.3 no
longer applies it, silently re-decoding UTF-8 CSV/TSV as windows-1252
(mojibake → header detection fails). Relying on the parser's internal
codepage guessing was fragile either way — a cp1251 CSV (Excel's default in
Russian locales) would have mojibaked under the old code too.

## Decision

1. **Keep SheetJS CE as the parser** — it is the de-facto industry standard for
   multi-format spreadsheet parsing in JS and the only maintained option that
   covers the full xlsx/xls/csv/tsv matrix. Source it from the **official CDN
   tarball**, pinned to the exact version in `backend/package.json`:

   ```json
   "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
   ```

   The CDN is SheetJS's official distribution channel, not a mirror or a
   workaround; the npm package is the abandoned one. The tarball is
   self-contained (drops the `codepage`, `cfb`, `adler-32` transitive
   dependencies) and the pnpm lockfile pins its integrity hash.

2. **Decode text formats explicitly, not via library internals.**
   `parsePriceFile` now sniffs the container: `PK…` (xlsx zip) or
   `D0 CF 11 E0` (OLE2/.xls) go to `XLSX.read(buffer)`; everything else is
   text and is decoded with Node's ICU-backed `TextDecoder` in a fixed order —
   BOM (UTF-16LE/BE, UTF-8) → strict UTF-8 → windows-1251 fallback — then
   passed to SheetJS as a string. Deterministic across parser upgrades, and it
   *fixes* cp1251 CSV exports that the previous code could not read.

3. **Keep the domain logic in `priceImport.js` as is.** Header-alias detection
   (Russian column names), RU decimal/currency parsing, blank-stock semantics,
   and duplicate detection are business rules, not parsing infrastructure;
   they stay hand-written on top of the library's sheet matrix.

## Consequences

- CVE-2023-30533 and CVE-2024-22363 are closed; the parser is on a maintained
  release line (0.20.x).
- `codepage`, `cfb`, `adler-32` disappear from the dependency tree.
- **Dependabot cannot see CDN tarballs** — upgrades to `xlsx` are manual.
  Upgrade procedure (documented in `DEVELOPMENT.md`): check
  <https://cdn.sheetjs.com/> for a newer release, update the pinned URL in
  `backend/package.json`, run `pnpm install`, then run the price-import
  format-matrix check (xlsx/xls/csv/tsv with Cyrillic headers) before merging.
- The pinned URL includes the exact version; pnpm records the tarball
  integrity in `pnpm-lock.yaml`, so CI `--frozen-lockfile` installs stay
  reproducible.
- If SheetJS ever re-publishes to npm or the CDN becomes unavailable, the
  pinned URL can be swapped back to a registry specifier without code changes.

## Alternatives Considered

- **exceljs 4.4.0** (last release 2024-12): pure-npm, but reads only
  `.xlsx`/`.csv` — no legacy `.xls` (BIFF8), no TSV, and its own release cadence
  has stalled. Choosing it would force us to hand-implement `.xls`/TSV parsing
  — the actual wheel re-invention this ADR avoids.
- **Stay on npm `xlsx@0.18.5`**: abandoned with known CVEs; rejected.
- **Write a custom parser** for the four formats: rejected — spreadsheet
  format parsing is exactly the kind of solved problem a library should own.
- **Drop `.xls`/TSV support** to enable exceljs: a business-logic regression
  for supplier workflows; not our call to make in a dependency PR.

## References

- SheetJS distribution note (npm → CDN):
  <https://docs.sheetjs.com/docs/getting-started/installation/>
- CVE-2023-30533 (prototype pollution, fixed 0.19.3):
  <https://git.sheetjs.com/sheetjs/sheetjs/issues/2939>
- CVE-2024-22363 (ReDoS, fixed 0.20.2):
  <https://git.sheetjs.com/sheetjs/sheetjs/issues/3004>
- `DEVELOPMENT.md` — upgrade procedure for CDN dependencies
- ADR 001 — canonical core and the quarantined legacy family
