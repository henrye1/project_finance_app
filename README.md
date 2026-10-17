# Project Finance Scorecard

A browser app that reproduces the Project Finance Scorecard workbook (`Stage 3 ECL Calculator (version 3).xlsm`): capture a project finance deal and obtain its PD, LGD and regulatory capital, following the same seven steps as the workbook's *Instructions* sheet.

1. Project Information
2. Cashflow Details
3. Funding Details
4. Project Valuation (press **Calculate**)
5. PD Scorecard
6. LGD Scorecard
7. Results

Help pages reproduce the *Terms of Use* glossary, the *Reference Tables* and the *Recovery Under Restructure* grid.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine, model and page tests (vitest)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

The app has no backend. The deal you are working on is saved in the browser (localStorage) and can be exported to and imported from a JSON file from the header. **Load example** loads the Solar Capital De Aar deal captured in the workbook.

## How it is built

- `src/engine/` — pure TypeScript calculations, one module per workbook sheet: `amortisation.ts`, `valuation.ts`, `valuationAnalysis.ts`, `pdScorecard.ts`, `lgdScorecard.ts`, `projectLgd.ts`, `results.ts`, and `compute.ts` which runs the whole chain on a `Deal`. Nothing in the UI calculates numbers.
- `src/data/` — reference data extracted from the workbook as JSON (scorecard questions and scores, PD calibration, sector volatility, insolvency scores, risk grades, Moody's mapping, sovereign ratings, glossary). Regenerate with:
  ```bash
  python -I tools/extract_reference_data.py "Stage 3 ECL Calculator (version 3).xlsm" src/data
  ```
- `src/model/` — the `Deal` type (every input), validation, persistence and the bundled example deal.
- `src/pages/` and `src/components/` — one page per workbook step; fields follow the workbook's colour legend (yellow drop-down, green capture, grey calculated).

## Verification

The engine tests use the workbook's own cached results for the Solar Capital deal as the oracle: valuation periods, the Valuation Analysis DSCR (1.6326 for 2017), the PD scorecard totals and PDs (post-completion PD 0.7654%, RW14), the LGD scorecard haircut (51.68%), the project LGD rows (12-month LGD 44.05% in 2012, lifetime LGD 36.16%) and the capital calculation (K 5.17%, RWA 68.56%). Where the app deliberately differs from the workbook the tests feed inputs that reproduce the workbook's effective values so the formulas themselves are checked exactly.

## Where the app differs from the workbook (on purpose)

Each of these is also flagged on the page concerned.

- **Pooled collateral**: the workbook's formula sums rows 2–10 of the pooled collateral table and skips row 1. The app sums all ten rows.
- **Valuation parameters**: the workbook hard-codes base value, clearance cost and liquidation cost (1%) on its Project Valuation sheet. The app uses the values captured in Project Information (the example deal has 5% liquidation cost).
- **DSCR covenant score** (F2.1) is a typed constant in the workbook; the app scores the DSCR with the workbook's own `Score_DSCR` rule.
- **PD per valuation period** came from an external template file; the app switches from the pre-completion to the post-completion PD at the construction end date (verified against the workbook's cached lifetime LGD).
- **Amortisation schedule**: the workbook holds pasted values; the app generates the schedule from the loan terms with ACT/365 simple interest on the opening balance (within 0.03% of the pasted figures).
- The hidden Stage 3 ECL sheets (`Loss_Calculation`, `Cash_Flows`, `Term_Structure`) and the PD term-structure upload macro are out of scope.

Design notes live in `docs/superpowers/specs/` and the implementation plan in `docs/superpowers/plans/`.
