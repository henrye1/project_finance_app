# Project Finance Scorecard — working notes

Vite + React 18 + TypeScript single-page app that reproduces the Project Finance Scorecard workbook. No backend.

## Commands
- `npm run dev` — dev server; `npm test` — vitest (jsdom); `npm run typecheck`; `npm run build` (type-check + bundle).
- `python -I tools/extract_reference_data.py "<workbook>.xlsm" src/data` regenerates the JSON reference data. The workbook is git-ignored (`*.xlsm`) and 200 MB; never open its `Project LGD New` sheet with openpyxl in normal mode.

## Layout
- `src/engine/` pure calculation modules (no React/DOM imports). `compute.ts` wires the chain: schedules → valuation → valuation analysis → PD scorecard → LGD scorecard → project LGD → results.
- `src/data/` extracted reference JSON + typed exports in `index.ts`.
- `src/model/` `Deal` type, `emptyDeal()`, example deal, validation, storage, React context.
- `src/pages/` one page per workbook sheet; `src/components/` Field, DataTable, Layout, formatting.

## Rules that matter
- Dates are ISO `yyyy-mm-dd` strings; engine helpers in `engine/dates.ts` mimic Excel (`EOMONTH`, `EDATE`, `YEARFRAC` 30/360).
- Percentages are fractions in the model (0.05 = 5%); formatting happens in `components/format.ts`.
- Engine tests in `src/engine/__tests__` use the workbook's cached values for the Solar Capital deal as the oracle (fixture `fixtures/solarCapital.ts`). Keep them exact; if a formula changes, the workbook is the authority.
- Deliberate differences from the workbook are listed in `README.md` and the spec (`docs/superpowers/specs/`); surface any new one with a `DeviationNote` on the page.
- Field colours follow the workbook legend: yellow = drop-down, green = capture, grey = calculated.
