# Project Finance Scorecard App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browser app that reproduces the workbook's Project Finance Scorecard flow (Project Information -> Cashflow Details -> Funding Details -> Project Valuation -> PD Scorecard -> LGD Scorecard -> Results) with a pure TypeScript calculation engine verified against the workbook's cached numbers.

**Architecture:** Vite + React + TypeScript single-page app. A `Deal` JSON object holds every input; `computeAll(deal)` in `src/engine` produces every output; React pages only render. Reference tables are extracted once from the workbook into JSON by a Python script.

**Tech Stack:** Node 25, npm, Vite 6, React 18, TypeScript 5, Vitest, Python 3 + openpyxl (extraction only).

**Spec:** `docs/superpowers/specs/2026-10-17-project-finance-scorecard-app-design.md`

## Global Constraints

- Engine code (`src/engine/**`) imports nothing from React or the DOM; it is pure functions over plain data.
- Dates are ISO strings `yyyy-mm-dd` in the model; the engine converts to UTC `Date` objects internally (never local time).
- Percentages are stored as fractions (0.05 = 5%); the UI formats them.
- Up to 5 loans; seniority classes are exactly `Senior Secured`, `Senior Unsecured`, `Mezzanine`, `Subordinated`, `Other` (rank 1..5). The workbook spelling `Mazanine` is mapped to `Mezzanine` at extraction time.
- Risk responses are exactly `Low Risk`, `Moderate Risk`, `High Risk`, `Very High Risk` (scores 4,3,2,1 per the reference table rows that exist for each question).
- Excel semantics are reproduced where the sheet relies on them: `EOMONTH`, `EDATE`, `NPV` (first flow discounted one period), `YEARFRAC` basis 0 (US 30/360), `NORMSINV`/`NORMSDIST`.
- The workbook `*.xlsm` is git-ignored and never bundled.
- Every deviation from the workbook listed in spec section 3 is surfaced in the UI as a help note on the affected field or table.

## Review Focus

1. Empty or partially captured deals: every page and the Results page must render with `null` outputs and a warning list, never a thrown error (test in Task 9: `computeAll(emptyDeal())` returns warnings and no throw).
2. Rating date outside the project life or before the first cash flow: Valuation Analysis has no row, DSCR must be `null` and the PD scorecard F2 score falls back to 1 (lowest) with a warning (test in Task 6).
3. Several loans with the same rank and mixed seniority classes: collateral allocation must be pro rata among pari-passu loans and never exceed exposure (test in Task 8).
4. Cash-flow frequencies that do not divide the construction period evenly (e.g. quarterly costs with an 18-month build): the generated date grid must end exactly at construction end and not drop the last partial period (test in Task 5).
5. Browser storage unavailable (private window): persistence must silently fall back to in-memory state (test in Task 10 with a throwing storage stub).

---

## File structure

```
project_finance_app/
  package.json, vite.config.ts, tsconfig.json, index.html
  tools/extract_reference_data.py        # workbook -> src/data/*.json (run once, committed output)
  src/
    main.tsx, App.tsx, styles.css
    data/
      referenceTables.json               # scorecard questions/responses/scores, weights, calibration, sectors, insolvency, bands, grades, moody map, capital structure
      sovereignRatings.json              # [{country, rating}] Moody's LT issuer ratings
      glossary.json                      # Terms of Use help text keyed by question / field id
      pdScorecardStructure.json          # sections -> questions (ids, text, weights, applicable columns)
      recoveryUnderRestructure.json      # the renewable-energy qualitative grid
    engine/
      dates.ts, stats.ts, amortisation.ts, valuation.ts, valuationAnalysis.ts,
      pdScorecard.ts, lgdScorecard.ts, projectLgd.ts, results.ts, compute.ts, types.ts
      __tests__/*.test.ts, __tests__/fixtures/solarCapital.ts
    model/
      deal.ts (types + defaults), exampleDeal.ts, validation.ts, storage.ts, dealContext.tsx
    components/
      Field.tsx (text/number/percent/date/select, colour-coded), DataTable.tsx, HelpNote.tsx, StepStatus.tsx, NumberFormat.ts
    pages/
      InstructionsPage.tsx, ProjectInformationPage.tsx, CashflowDetailsPage.tsx, FundingDetailsPage.tsx,
      ProjectValuationPage.tsx, PdScorecardPage.tsx, LgdScorecardPage.tsx, ResultsPage.tsx,
      TermsOfUsePage.tsx, ReferenceTablesPage.tsx, RecoveryUnderRestructurePage.tsx
```

---

### Task 1: Scaffold the project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/engine/__tests__/smoke.test.ts`

- [ ] **Step 1: Create the Vite React TS project in place**

```bash
npm create vite@latest . -- --template react-ts   # answer "Ignore files and continue" if prompted
npm install
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Configure Vitest in `vite.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, include: ['src/**/*.test.ts', 'src/**/*.test.tsx'] },
});
```
Add `"test": "vitest run"` and `"typecheck": "tsc --noEmit"` to `package.json` scripts. Set `"resolveJsonModule": true` in tsconfig.

- [ ] **Step 3: Smoke test**

`src/engine/__tests__/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
describe('toolchain', () => { it('runs', () => { expect(1 + 1).toBe(2); }); });
```
Run `npm test` -> PASS. Run `npm run build` -> succeeds.

- [ ] **Step 4: Commit** `chore: scaffold vite react ts app with vitest`

---

### Task 2: Extract reference data from the workbook

**Files:**
- Create: `tools/extract_reference_data.py`, `src/data/*.json`, `src/data/index.ts`, `src/data/__tests__/referenceData.test.ts`

**Interfaces (produces):**
```ts
// src/data/index.ts
export interface QuestionResponse { response: string; description: string; score: number }
export interface ReferenceTables {
  responses: Record<string, QuestionResponse[]>;        // key = question id e.g. "A2.1", "C1.1.1", "H2", "H 3.1" normalised to "H3.1"
  pdCalibration: { alpha: number; beta: number };       // RT K4, L4
  offtake: { slope: number; intercept: number };        // RT I10, I11 (0.75, 1)
  sectors: { name: string; volatility: number }[];      // RT O4:P9
  insolvencyScores: Record<string, number>;             // RT R3:S181 (country name as in sheet)
  construction: { pre: { recoveryCosts: number; adjustment: number }; post: { recoveryCosts: number; adjustment: number } }; // RT V3:W4
  collateralTypes: { type: string; recoveryRate: number }[];   // RT Y4:Z25
  scoreBands: { min: number; rating: string }[];        // RT AB2:AD5 -> [{0,'Very High Risk'},{1.00000000001,'High Risk'},...]
  riskGrades: { grade: string; pdFitted: number; pdLower: number; pdUpper: number }[]; // RT AF3:AJ30
  moodysMap: { moodys: string; sp: string; grade: string }[]; // RT AO3:AQ23
  capitalStructure: { seniority: string; rank: number }[];    // RT AY3:AZ7 with Mazanine->Mezzanine
  lgdScaling: number;                                   // 2.741308269785451 (LGD Scorecard K27)
}
export const referenceTables: ReferenceTables;
export const sovereignRatings: { country: string; rating: string }[];
export const glossary: Record<string, string>;
export const pdScorecardStructure: PdSection[];
```
```ts
export interface PdQuestion { id: string; text: string; hasPrePost: boolean }
export interface PdSection { id: string; title: string; weight: number; questions: PdQuestion[]; kind: 'standard' | 'sovereign' | 'offtake' | 'dscr' }
```
Sections (ids, weights, questions) exactly:
A1 (sovereign, 0.16, A1.1 country), A2 (0.10: A2.1, A2.2, A2.3, A2.4), B (0.039: B1.1, B1.2), C (0.1236: C1.1.1, C1.1.2, C1.1.3, C1.2, C1.3, C1.4, C1.5.1, C1.5.2, C1.6), D1 (0.0311: D1.1), D2 (0.0535: D2.1), D3 (0.01: D3.1, D3.2), E1 (0.0114: E1.1, E1.2), E2 (offtake, 0.0171: E2.1 percentage, E2.2.1, E2.2.2, E2.2.3), E3 (0.08: E3.1, E3.2), E4 (0.148: E4.1, E4.2), F1 (0.0748: F1.1, F1.2, F1.3), F2 (dscr, 0.034: F2.1), G1 (0.1175: G1.1, G1.2, G1.3, G1.4). All questions have pre and post columns (`hasPrePost: true`).

- [ ] **Step 1: Write the data test first** (`src/data/__tests__/referenceData.test.ts`)

```ts
import { referenceTables as rt, sovereignRatings, pdScorecardStructure } from '..';
it('has PD calibration', () => { expect(rt.pdCalibration.alpha).toBeCloseTo(-5.36038804, 8); expect(rt.pdCalibration.beta).toBeCloseTo(3.154875549, 8); });
it('has Energy volatility', () => { expect(rt.sectors.find(s => s.name === 'Energy')!.volatility).toBe(0.1626); });
it('has South Africa insolvency score', () => { expect(rt.insolvencyScores['South Africa']).toBeCloseTo(1.843243243243243, 12); });
it('A2.1 responses', () => { expect(rt.responses['A2.1'].map(r => [r.response, r.score])).toEqual([['Low Risk', 4], ['High Risk', 1]]); });
it('weights sum to 1', () => { expect(pdScorecardStructure.reduce((s, x) => s + x.weight, 0)).toBeCloseTo(1, 10); });
it('sovereign SA is Ba2', () => { expect(sovereignRatings.find(r => r.country === 'SOUTH AFRICA')!.rating).toBe('Ba2'); });
it('RW15 fitted pd', () => { expect(rt.riskGrades.find(g => g.grade === 'RW15')!.pdFitted).toBeCloseTo(0.012797155934034719, 12); });
```

- [ ] **Step 2: Write `tools/extract_reference_data.py`** using openpyxl read-only (skip sheet `Project LGD New`). Read `Reference Tables` into a dict of cells, then build each structure from the fixed ranges above. Question ids come from column B (rows 3..139); a response block runs from a row with a B value until the next B value. Normalise ids: strip spaces (`'H 3.1' -> 'H3.1'`, `'H2' -> 'H2'`, `'H 4' -> 'H4.1'`). Sovereign ratings: `Sovereign Ratings` columns C (country) and I (rating) where H == 'LT Issuer Rating'. Glossary: `Terms of Use` column B id / column C text pairs (the text is on the row after the title row). PD structure: hard-code the section/weight/question table above; pull question text from `PD Scorecard` column D (or C for section-level questions C1.2, C1.3, C1.4, C1.6, E2.1). Recovery Under Restructure: columns D/F/H/J/L/N rows 4-6 with weights S1:X1 and headers row 2.
  Run: `python -I tools/extract_reference_data.py "Stage 3 ECL Calculator (version 3).xlsm" src/data`.

- [ ] **Step 3: `src/data/index.ts`** imports the JSON files with types above. Run `npm test` -> PASS.

- [ ] **Step 4: Commit** `feat(data): extract reference tables, sovereign ratings and glossary from workbook`

---

### Task 3: Engine foundations — dates and statistics

**Files:**
- Create: `src/engine/dates.ts`, `src/engine/stats.ts`, `src/engine/__tests__/dates.test.ts`, `src/engine/__tests__/stats.test.ts`

**Interfaces (produces):**
```ts
// dates.ts  (all ISO 'yyyy-mm-dd' in/out)
export function parseIso(s: string): Date;                  // UTC midnight
export function toIso(d: Date): string;
export function eomonth(iso: string, months: number): string; // Excel EOMONTH
export function edate(iso: string, months: number): string;   // Excel EDATE (clamps day)
export function daysBetween(a: string, b: string): number;    // b - a in days
export function monthsBetween(a: string, b: string): number;  // (Y2-Y1)*12 + (M2-M1)  (sheet's PI!H22 formula)
export function yearFrac30360(a: string, b: string): number;  // Excel YEARFRAC basis 0
export function yearOf(iso: string): number;
export function compareIso(a: string, b: string): number;
export function frequencyMonths(f: 'monthly'|'quarterly'|'semi-annually'|'annually'): number; // 1,3,6,12
export function paymentFrequencyMonths(f: 'Monthly'|'Bi-Monthly'|'Quarterly'|'Semi-Annual'|'Annual'): number; // 1,2,3,6,12
// stats.ts
export function normSInv(p: number): number;   // Acklam algorithm, |err| < 1e-9
export function normSDist(z: number): number;  // Abramowitz-Stegun 26.2.17 refined, |err| < 1e-7
export function npv(rate: number, flows: number[]): number; // Excel NPV
```

- [ ] **Step 1: Tests**
```ts
expect(eomonth('2012-12-31', 1)).toBe('2013-01-31');
expect(eomonth('2013-01-31', 1)).toBe('2013-02-28');
expect(eomonth('2014-06-30', 6)).toBe('2014-12-31');
expect(edate('2012-12-31', 198)).toBe('2029-06-30');
expect(monthsBetween('2012-12-31', '2036-06-30')).toBe(282);
expect(yearFrac30360('2017-12-31', '2020-06-30')).toBeCloseTo(2.5, 10);
expect(yearFrac30360('2017-12-31', '2036-06-30')).toBeGreaterThan(5);
expect(normSInv(0.012797155934034719)).toBeCloseTo(-2.232312567066831, 6);   // PD Scorecard F6
expect(normSInv(0.999)).toBeCloseTo(3.090232306, 6);
expect(normSDist(1.6448536)).toBeCloseTo(0.95, 6);
expect(npv(0.1, [100, 100])).toBeCloseTo(173.553719, 6);
```
- [ ] **Step 2: Run -> FAIL (modules missing).** **Step 3: Implement.** For `yearFrac30360` use Excel's US (NASD) rule: if d1 is 31 -> 30; if d2 is 31 and d1 >= 30 -> 30; February end-of-month adjustments per Excel. **Step 4: Run -> PASS.** **Step 5: Commit** `feat(engine): date and statistics helpers`

---

### Task 4: Engine — amortisation schedule

**Files:**
- Create: `src/engine/types.ts`, `src/engine/amortisation.ts`, `src/engine/__tests__/amortisation.test.ts`, `src/engine/__tests__/fixtures/solarCapital.ts`

**Interfaces (produces):**
```ts
// types.ts (engine-facing input types; the model re-exports these)
export type Phase = 'Pre-completion Phase' | 'Post-completion Phase';
export type Frequency = 'monthly' | 'quarterly' | 'semi-annually' | 'annually';
export type PaymentFrequency = 'Monthly' | 'Bi-Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual';
export type PaymentType = 'FixedPayment' | 'ConstantCapital' | 'InterestOnly' | 'VariableCapital';
export type Seniority = 'Senior Secured' | 'Senior Unsecured' | 'Mezzanine' | 'Subordinated' | 'Other';
export type RiskResponse = 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Very High Risk';
export interface DatedAmount { date: string; amount: number }
export interface LoanInput {
  id: number; description: string; accountNumber: string; facilityAmount: number | null; currency: string;
  seniority: Seniority | null; maturityDate: string | null; paymentType: PaymentType | null;
  paymentFrequency: PaymentFrequency | null; firstPaymentDate: string | null; interestRate: number | null;
  residualValue: number | null; disbursements: DatedAmount[]; variableCapital: DatedAmount[];
}
export interface ScheduleRow { date: string; opening: number; drawdown: number; interest: number; capital: number; payment: number; closing: number }
// amortisation.ts
export function buildSchedule(loan: LoanInput): { rows: ScheduleRow[]; warnings: string[] };
```
Rules: payment dates = firstPaymentDate, then `edate(first, k*step)` while `<= maturityDate`; if the last generated date `< maturityDate` the maturity date is appended as a final date. Drawdown in a row = disbursements with date `<= first payment date` (first row) or in `(prev, date]` (later rows). Opening = previous closing. Interest = opening x rate x daysBetween(prev, date)/365 where `prev` for the first row is the latest disbursement date on or before the first payment date (`2014-06-30` in the fixture). Capital: FixedPayment -> annuity on (opening at first payment, n = number of payment dates, residual) : `pmt = (P - R/(1+i)^n) * i / (1 - (1+i)^-n)` with `i = rate x stepMonths/12`, capital = pmt - interest, last row capital = remaining balance; ConstantCapital -> (P - R)/n each row, last row adds R; InterestOnly -> 0, last row = balance; VariableCapital -> amount of `variableCapital` with the same date (0 if none), last row also repays any remaining balance. Closing = opening + drawdown - capital (never below 0 except rounding). Warnings when required fields are missing (returns empty rows).

- [ ] **Step 1: Fixture** `fixtures/solarCapital.ts` exports `solarLoan: LoanInput` (facility 1,626,419,910; ZAR; Senior Secured; maturity 2029-06-30; VariableCapital; Semi-Annual; first payment 2014-12-31; rate 0.1053; residual 0; the 17 disbursements from the `Disbursements` sheet; the 30 variable capital amounts from `Variable Cashflows`) and `sheetSchedule` = the 30 rows of the `Amortisation Schedule` sheet (date, opening, interest, payment, closing).

- [ ] **Step 2: Tests**
```ts
it('reproduces the workbook schedule within 0.03%', () => {
  const { rows } = buildSchedule(solarLoan);
  expect(rows.length).toBe(30);
  rows.forEach((r, i) => {
    expect(r.date).toBe(sheetSchedule[i].date);
    expect(r.interest / sheetSchedule[i].interest).toBeCloseTo(1, 3);
    expect(r.closing).toBeCloseTo(sheetSchedule[i].closing, -3);   // within 1,000 on ~1.6bn
  });
  expect(rows[0].drawdown).toBe(1626419910); expect(rows[29].closing).toBeCloseTo(0, 0);
});
it('fixed payment annuity amortises to the residual', () => { /* 1,000,000 at 10%, annual, 5 payments, residual 100,000 -> closing[4] ≈ 100,000 before residual repayment, final closing 0, all payments equal except last */ });
it('constant capital', () => { /* 1,200,000, 12 monthly -> capital 100,000 each */ });
it('interest only', () => { /* capital 0 until last row = balance */ });
it('missing fields -> no rows + warning', () => {...});
```
- [ ] **Step 3: Implement, run, commit** `feat(engine): amortisation schedule generator`

---

### Task 5: Engine — project valuation and valuation analysis

**Files:**
- Create: `src/engine/valuation.ts`, `src/engine/valuationAnalysis.ts`, tests, extend fixture with construction costs (17 monthly rows from `Cashflow Details` E/F) and CFADS (the 44 semi-annual rows K/L 2014-06-30..2036-06-30 — extract from the dump `Cashflow_Details.txt`).

**Interfaces (produces):**
```ts
export interface ValuationInput {
  projectStartDate: string; projectEndDate: string; constructionEndDate: string;
  baseValue: number; clearanceCostPct: number; liquidationCostPct: number;
  cfadsFrequency: Frequency; constructionCosts: DatedAmount[]; cfads: DatedAmount[];
  ratePerPeriod: number;                       // PV!H25
  loans: { id: number; schedule: ScheduleRow[]; disbursements: DatedAmount[] }[];
  pdPre: number | null; pdPost: number | null; // for the PD column
}
export interface ValuationPeriod {
  date: string; year: number; constructionCost: number | null; accumulatedCost: number | null; clearanceCost: number | null;
  baseValue: number | null; discountedValue: number; projectValue: number;
  drawdowns: number[]; capitalRepayments: number[]; repayments: number[]; balances: number[];   // index = loan slot 0..4
  freeCashFlow: number; afterDebtService: number; companyAssetValue: number; pd: number | null;
}
export interface ValuationResult {
  periods: ValuationPeriod[]; timeline: { date: string; freeCashFlow: number; projectValue: number }[];
  ratePerPeriod: number; annualisedRate: number; estValueAfterConstruction: number; warnings: string[];
}
export function computeValuation(v: ValuationInput): ValuationResult;
export interface ValuationAnalysisRow { year: number; repayments: number[]; totalRepayments: number; cfads: number; dscr: number; averageDscr: number }
export function computeValuationAnalysis(periods: ValuationPeriod[], startYear: number, endYear: number): ValuationAnalysisRow[];
```
Formulas (from the sheet, period p with date d, previous date d0):
- grid: `d_0 = start`, `d_k = eomonth(d_{k-1}, m)` while `<= end`; m = frequencyMonths(cfadsFrequency).
- timeline: `t_0 = constructionEnd`, `t_j = eomonth(t_{j-1}, m)` while `<= end`; `fcf_j = sum cfads with date == t_j`; `pv_j = npv(rate, [fcf_j .. fcf_last])`.
- constructionCost = `d > constructionEnd ? null : sum costs with date in (d0, d]` (first period: `== d`).
- accumulatedCost = null if cost null else cost + previous accumulated; clearance = accumulated x clearancePct; baseValue = accumulated null ? null : baseValue.
- discountedValue = accumulated null ? (pv at d, 0 if no timeline date) : (accumulated is the max accumulated -> accumulated + clearance : 0).
- projectValue = accumulated null ? discountedValue : accumulated + clearance.
- drawdowns[i] = `d > constructionEnd ? 0 : sum of loan i disbursements in (d0, d]`.
- repayments[i] = schedule row with date d ? payment : 0; capitalRepayments[i] = payment - interest of that row.
- balances[i] = schedule row at d ? closing : (d <= constructionEnd or no row yet) cumulative drawdowns to d : (d past last schedule date ? 0 : previous balance).
- freeCashFlow = fcf at d (0 if d not in timeline); afterDebtService = fcf - sum repayments; companyAssetValue = max(accumulated+clearance or 0, pv at d0 or 0).
- pd = `d <= constructionEnd ? pdPre : pdPost`.
- annualisedRate = `(1+rate)^(12/m) - 1`; estValueAfterConstruction = max(accumulated) + max(clearance).
Valuation analysis: for each year y in [startYear, endYear]: repayments[i] = sum over periods with year y; cfads = sum freeCashFlow; dscr = total == 0 ? 0 : cfads/total; averageDscr(y) = mean of dscr over years >= y.

- [ ] **Step 1: Tests from the sheet (periods, semi-annual grid from 2012-12-31)**
```ts
const r = computeValuation(solarValuationInput);          // rate 0.08501736996769146, clearance 0.01, base 1, liq 0.01
expect(r.periods[0]).toMatchObject({ date: '2012-12-31', constructionCost: 190272978, accumulatedCost: 190272978, clearanceCost: 1902729.78, projectValue: 192175707.78, companyAssetValue: 192175707.78 });
expect(r.periods[1]).toMatchObject({ date: '2013-06-30', constructionCost: 665521560, accumulatedCost: 855794538 });
expect(r.periods[3].discountedValue).toBeCloseTo(1642684109.1, 1);   // 2014-06-30 last construction period
expect(r.periods[4].discountedValue).toBeCloseTo(1782340792.83, 1);  // 2014-12-31 = NPV at that date
expect(r.periods[4].balances[0]).toBeCloseTo(1608019360.62, 0);
expect(r.periods[4].repayments[0]).toBeCloseTo(104753737.52, 0);
expect(r.periods[4].companyAssetValue).toBeCloseTo(1642684110.1, 1);
expect(r.periods[5].capitalRepayments[0]).toBeCloseTo(18400549.38, 0);
expect(r.timeline[0]).toMatchObject({ date: '2014-06-30', freeCashFlow: 0 }); expect(r.timeline[0].projectValue).toBeCloseTo(1642684110.1, 1);
expect(r.annualisedRate).toBeCloseTo(0.17726269313160636, 10);
expect(r.estValueAfterConstruction).toBeCloseTo(1642684109.1, 1);
const va = computeValuationAnalysis(r.periods, 2012, 2036);
expect(va.find(x => x.year === 2017)!.averageDscr).toBeCloseTo(1.6325537896084072, 6);
expect(va.find(x => x.year === 2014)!.repayments[0]).toBeCloseTo(104753737.52, 0);
```
Plus the Review Focus test: quarterly construction frequency with an 18-month build -> `periods` still contains `constructionEndDate` row when the grid is quarterly, and `timeline[0].date === constructionEndDate`.
Note: the valuation uses the sheet's own schedule rows for the oracle test (pass `sheetSchedule` as the loan schedule) so this task does not depend on amortisation tolerances.

- [ ] **Step 2: Implement, run, commit** `feat(engine): project valuation and valuation analysis`

---

### Task 6: Engine — PD scorecard

**Files:**
- Create: `src/engine/pdScorecard.ts`, test; fixture adds the Solar answers (PD Scorecard columns E and J, rows per question id) and off-take % pre 0 / post 1.

**Interfaces (produces):**
```ts
export interface PdScorecardInput {
  phase: Phase | null; country: string | null; projectType: string | null; ppp: 'Yes' | 'No' | null;
  offtakePct: { pre: number | null; post: number | null };
  answers: Record<string, { pre: RiskResponse | null; post: RiskResponse | null }>;   // key = question id
  dscr: number | null;                      // average DSCR for rating year from valuation analysis
}
export interface PdSectionResult { id: string; title: string; weight: number; scorePre: number | null; scorePost: number | null; ratingPre: string | null; ratingPost: string | null; questionScores: Record<string, { pre: number | null; post: number | null; description: { pre: string; post: string } }> }
export interface PdScorecardResult {
  sovereign: { rating: string | null; grade: string | null; pd: number | null; score: number | null };
  sections: PdSectionResult[]; dscrScore: number | null;
  totalPre: number | null; totalPost: number | null; pdPre: number | null; pdPost: number | null; gradePre: string | null; gradePost: string | null;
  overallRatingPre: string | null; overallRatingPost: string | null;
  finalPd: number | null; finalGrade: string | null; finalTotal: number | null; warnings: string[];
}
export function scoreDscr(projectType: string | null, ppp: 'Yes' | 'No' | null, dscr: number): number;   // workbook Score_DSCR
export function ratingForScore(score: number): string;   // bands: <1.00000000001 Very High, <2.00000000001 High, <3.00000000001 Moderate, else Low
export function gradeForPd(pd: number): string;          // riskGrades: last grade whose pdLower <= pd
export function lookupSovereign(country: string): { rating: string | null; grade: string | null; pd: number | null };
export function computePdScorecard(i: PdScorecardInput): PdScorecardResult;
```
Rules: question score = score of the chosen response in `referenceTables.responses[id]`, or 1 when unanswered (the sheet's `IFERROR(...,1)`), with a warning. Section score = mean of its question scores (both columns independently). E2 = `(mean(E2.2.1..3) x offtakePct x 0.75) + 1`. F2 score = `scoreDscr(...)` when dscr is a number, else 1 + warning; it is the same in both columns. A1 score = `-normSInv(sovereignPd)` (null -> warning, treated as 0 contribution? No: the sheet would error; return nulls for totals). Total = sum(weight x sectionScore). PD = `1/(1+exp(alpha + beta x total))`. Final = phase pre -> pre values, post -> post values, null phase -> nulls + warning. `scoreDscr` thresholds: PPP Yes: <=1.01 ->1, <=1.06 ->2, <=1.17 ->3, else 4. PPP No by type: Energy (1.03, 1.31, 1.58); `Chemicals, Oil & Gas` (1.31, 1.67, 2.18); Infrastructure/Other/Telecoms (1.01, 1.06, 1.15); Mining (1.03, 1.125, 1.2); unknown type -> 1.

- [ ] **Step 1: Tests**
```ts
const r = computePdScorecard(solarPdInput);   // dscr 1.6325537896084072, Energy, PPP No, SOUTH AFRICA
expect(r.sovereign).toMatchObject({ rating: 'Ba2', grade: 'RW15' }); expect(r.sovereign.pd).toBeCloseTo(0.012797155934034719, 12); expect(r.sovereign.score).toBeCloseTo(2.232312567066831, 6);
expect(r.dscrScore).toBe(4);
expect(r.totalPre).toBeCloseTo(2.8895283440640265, 6); expect(r.totalPost).toBeCloseTo(3.2410700107306933, 6);
expect(r.pdPre).toBeCloseTo(0.02284943674824239, 8); expect(r.pdPost).toBeCloseTo(0.007654447841321495, 8);
expect(r.gradePre).toBe('RW17'); expect(r.gradePost).toBe('RW14');
expect(r.sections.find(s => s.id === 'E2')!.scorePre).toBe(1); expect(r.sections.find(s => s.id === 'E2')!.scorePost).toBe(3.75);
expect(r.sections.find(s => s.id === 'A1')!.ratingPost).toBe('Moderate Risk');
expect(r.finalPd).toBeCloseTo(0.007654447841321495, 8); expect(r.finalGrade).toBe('RW14');
expect(scoreDscr('Chemicals, Oil & Gas', 'No', 1.7)).toBe(3);
it('no DSCR -> score 1 with warning', ...); it('unanswered question -> score 1 with warning', ...); it('score 1.0 exactly is Very High Risk', () => expect(ratingForScore(1)).toBe('Very High Risk'));
```
- [ ] **Step 2: Implement, run, commit** `feat(engine): PD scorecard`

---

### Task 7: Engine — LGD scorecard

**Files:** `src/engine/lgdScorecard.ts`, test.

**Interfaces (produces):**
```ts
export interface LgdScorecardInput { phase: Phase | null; projectType: string | null; country: string | null;
  answers: { H2: RiskResponse | null; 'H3.1': RiskResponse | null; 'H3.2': RiskResponse | null; 'H4.1': RiskResponse | null }; canRealise: 'Yes' | 'No' | null }
export interface LgdScorecardResult {
  phaseScore: number; questionScores: Record<string, number | null>; score: number | null;
  current: { haircut: number | null; recoveryRate: number | null; slope: number; intercept: number };
  factors: { volatility: number | null; scaling: number; country: number | null; haircutFactor: number | null; constructionAdjustment: number | null; recoveryCosts: number | null };
  haircut: number | null; recoveryRate: number | null; warnings: string[];
}
export function computeLgdScorecard(i: LgdScorecardInput): LgdScorecardResult;
```
Rules: phaseScore pre/null -> 1, post -> 4, weight 0.3; other four weight 0.175, score of response or 1 if unanswered (+warning). score = sum(weight x s). slope/intercept through (4, 0.65), (1, 1.0): slope = -0.35/3, intercept = 1 - slope. current.haircut = canRealise === 'No' ? 1 : score x slope + intercept. factors: volatility from sectors; country = `1/(1-((insolvency-1)*0.1))` using a case-insensitive match of the country name against `insolvencyScores` keys; constructionAdjustment / recoveryCosts from `construction[pre|post]` (null phase -> pre); haircutFactor = vol x scaling x country; haircut = min(adj x haircutFactor + costs, 1); recoveryRate = 1 - haircut.

- [ ] **Step 1: Tests** (Solar: post-completion, Energy, SOUTH AFRICA, H2 Moderate, H3.1 Low, H3.2 Low, H4.1 Low, canRealise Yes)
```ts
expect(r.score).toBeCloseTo(3.825, 10); expect(r.current.haircut).toBeCloseTo(0.6704166666666668, 10);
expect(r.factors.country).toBeCloseTo(1.0920897284533648, 10); expect(r.factors.haircutFactor).toBeCloseTo(0.48678449860340106, 10);
expect(r.haircut).toBeCloseTo(0.516784498603401, 10); expect(r.recoveryRate).toBeCloseTo(0.48321550139659897, 10);
it('pre-completion uses 1.25 adjustment and 5% costs', ...); it('canRealise No -> current haircut 1', ...);
```
- [ ] **Step 2: Implement, run, commit** `feat(engine): LGD scorecard`

---

### Task 8: Engine — project LGD by year

**Files:** `src/engine/projectLgd.ts`, test.

**Interfaces (produces):**
```ts
export interface ProjectLgdInput {
  periods: ValuationPeriod[]; startYear: number; endYear: number;
  loans: { slot: number; seniority: Seniority | null }[];           // slot 0..4
  recoveryRate: number | null; liquidationCostPct: number; annualisedRate: number;
  pooledCollateral: number; loanCollateral: number[];               // per slot, raw amounts
  pdOverride?: (year: number) => number | null;                      // tests only: inject the sheet's PD path
}
export interface ProjectLgdYear {
  year: number; exposures: number[]; projectValue: number; projectCollateral: number; projectAllocated: number[];
  additionalGross: number; additionalRealisable: number; additionalAllocated: number[];
  lgdByClass: Record<Seniority, number | null>; pd: number | null; lifetimeLgdByClass: Record<Seniority, number | null>;
}
export function collateralAllocation(trancheExposure: number, rank: number, ranks: (number | null)[], exposures: number[], collateralValue: number): number;
export function computeProjectLgd(i: ProjectLgdInput): { years: ProjectLgdYear[]; warnings: string[] };
```
Rules (per year y): pick the last period with year y (`exposures = balances`, `projectValue = companyAssetValue`, `pd = period.pd` of the FIRST period of that year, or `pdOverride(y)`); projectCollateral = projectValue x recoveryRate x (1 - liq); projectAllocated[i] = exposures[i] === 0 || rank null ? 0 : max(collateralAllocation(exposures[i], rank_i, ranks, exposures, projectCollateral), 0); additionalRealisable = pooled x (1 - liq); additionalAllocated[i] = (exposure 0 ? 0 : collateralAllocation(..., additionalRealisable)) + loanCollateral[i] x (1 - liq). For each class c: E = sum exposures of loans in c; if E === 0 -> null; Coll = sum(projectAllocated + additionalAllocated) over loans in c; unsecured = E - Coll; lgd = unsecured === 0 ? max(liq, 0) : max(liq, min(1, 1 - (1 - max(unsecured/E, 0)) / (1 + annualisedRate))). Lifetime for class c at year y = sum_{t>=y}(lgd_t x pd_t x E_t) / sum_{t>=y}(pd_t x E_t) (skip years where lgd or pd null); null when denominator 0.
`collateralAllocation` = workbook VBA: sumPari = sum exposures with rank == r; sumSenior = sum exposures with rank < r; collSenior = min(sumSenior, C); return min(exposure/sumPari x (C - collSenior), exposure).

- [ ] **Step 1: Tests**
```ts
it('collateral allocation waterfall', () => {
  expect(collateralAllocation(100, 1, [1, 2], [100, 50], 120)).toBe(100);
  expect(collateralAllocation(50, 2, [1, 2], [100, 50], 120)).toBe(20);
  expect(collateralAllocation(60, 1, [1, 1], [60, 40], 50)).toBeCloseTo(30, 10);   // pari passu pro rata
  expect(collateralAllocation(60, 1, [1, 1], [60, 40], 500)).toBe(60);             // never exceeds exposure
});
const r = computeProjectLgd({ ...solar, pooledCollateral: 33724938, loanCollateral: [0,0,0,0,0], liquidationCostPct: 0.01, recoveryRate: 0.48321550139659897, annualisedRate: 0.17726269313160636, pdOverride: y => y <= 2021 ? 0.029353106208183811 : 0.0079850580192199587 });
const y12 = r.years[0]; expect(y12.year).toBe(2012); expect(y12.exposures[0]).toBe(190272978);
expect(y12.projectValue).toBeCloseTo(192175707.78, 2); expect(y12.projectCollateral).toBeCloseTo(91933658.181247398, 3);
expect(y12.projectAllocated[0]).toBeCloseTo(91933658.181247398, 3); expect(y12.additionalAllocated[0]).toBeCloseTo(33387688.62, 3);
expect(y12.lgdByClass['Senior Secured']).toBeCloseTo(0.44053289501470194, 9);
expect(r.years[1].lgdByClass['Senior Secured']).toBeCloseTo(0.56935598621907402, 9);
expect(r.years[2].lgdByClass['Senior Secured']).toBeCloseTo(0.56725096424697008, 9);
expect(y12.lifetimeLgdByClass['Senior Secured']).toBeCloseTo(0.36156372107105816, 6);
expect(r.years[2].lifetimeLgdByClass['Senior Secured']).toBeCloseTo(0.28233571502304877, 6);
```
Also a Review Focus test: two loans, same rank, classes Senior Secured and Mezzanine -> allocations pro rata and `<=` exposures; class with zero exposure -> null LGD.

- [ ] **Step 2: Implement, run, commit** `feat(engine): project LGD by year with collateral waterfall`

---

### Task 9: Engine — results and `computeAll`

**Files:** `src/engine/results.ts`, `src/engine/compute.ts`, `src/model/deal.ts` (types + `emptyDeal()`), tests.

**Interfaces (produces):**
```ts
// model/deal.ts
export interface CollateralRow { type: string | null; amount: number | null; currency: string }
export interface LoanCollateralRow extends CollateralRow { loan: number | null }   // 1..5
export interface Deal {
  version: 1;
  projectInformation: { dealName: string; borrowerNumber: string; capturer: string; ratingDate: string | null; phase: Phase | null; projectType: string | null;
    projectStartDate: string | null; projectEndDate: string | null; constructionEndDate: string | null; baseValue: number | null; currency: string;
    clearanceCostPct: number | null; ppp: 'Yes' | 'No' | null; liquidationPeriodMonths: number | null; liquidationCostPct: number | null;
    pooledCollateral: CollateralRow[]; loanCollateral: LoanCollateralRow[] };
  cashflowDetails: { constructionFrequency: Frequency; constructionCurrency: string; constructionCosts: Record<string, number>;
    cfadsFrequency: Frequency; cfadsCurrency: string; cfads: Record<string, number>; discountRatePerPeriod: number | null };
  loans: LoanInput[];                                   // length 1..5
  pdScorecard: { country: string | null; offtakePct: { pre: number | null; post: number | null }; answers: Record<string, { pre: RiskResponse | null; post: RiskResponse | null }> };
  lgdScorecard: { answers: { H2: RiskResponse | null; 'H3.1': RiskResponse | null; 'H3.2': RiskResponse | null; 'H4.1': RiskResponse | null }; canRealise: 'Yes' | 'No' | null };
  recoveryUnderRestructure: Record<string, 'a)' | 'b)' | 'c)' | null>;
}
export function emptyDeal(): Deal; export function emptyLoan(id: number): LoanInput;
// engine/results.ts
export interface ResultsInput { ratingDate: string | null; projectEndDate: string | null; finalPd: number | null; lgdYear: ProjectLgdYear | undefined; recoveryRate: number | null }
export interface CapitalResult { pd: number | null; downturnLgd: number | null; remainingMaturity: number | null; correlation: number | null; maturityAdjustment: number | null; k: number | null; rwa: number | null; capital: number | null }
export interface ResultsOutput { lgdTable: { seniority: Seniority; twelveMonth: number | null; lifetime: number | null }[]; capital: CapitalResult; recoveryRate: number | null }
export function computeResults(i: ResultsInput): ResultsOutput;
// engine/compute.ts
export interface Computed { schedules: Record<number, ScheduleRow[]>; valuation: ValuationResult | null; valuationAnalysis: ValuationAnalysisRow[]; pdScorecard: PdScorecardResult; lgdScorecard: LgdScorecardResult; projectLgd: ProjectLgdYear[]; results: ResultsOutput; warnings: string[]; stepStatus: Record<'projectInformation'|'cashflowDetails'|'fundingDetails'|'projectValuation'|'pdScorecard'|'lgdScorecard'|'results', 'empty'|'partial'|'complete'> }
export function computeAll(deal: Deal): Computed;
```
Results rules: LGD table per class: twelveMonth = max(lgdByClass, 0.01) (null if class absent), lifetime = max(lifetimeLgdByClass, 0.01); lgdYear = project LGD row for `yearOf(ratingDate)`. Capital: pd = finalPd; downturnLgd = 0.92 x lifetime(Senior Secured) + 0.08 (lifetime null -> 0.01 floor as the sheet's IFERROR gives 0.01); remainingMaturity = clamp(yearFrac30360(ratingDate, projectEnd), 1, 5); correlation = `0.12*(1-e^(-50pd))/(1-e^-50) + 0.24*(1-(1-e^(-50pd))/(1-e^-50))`; maturityAdjustment b = `(0.11852 - 0.05478 ln pd)^2`; k = `(dLGD * N(((1-R)^-0.5) * G(pd) + sqrt(R/(1-R)) * G(0.999)) - pd*dLGD) * (1 - 1.5b)^-1 * (1 + (M - 2.5) b)`; rwa = k x 12.5 x 1.06; capital = rwa x 0.1061.
`computeAll` wiring: schedules from loans; valuation input from PI/CD/loans (pdPre/pdPost from a first pass of the PD scorecard without DSCR is NOT needed: compute valuation first with `pdPre/pdPost` null placeholders, then valuation analysis -> DSCR -> PD scorecard -> set period PDs by phase date -> project LGD -> results). Step status: `complete` when the page's required fields are filled and produce no warnings for that page, `partial` when something is filled, else `empty`.

- [ ] **Step 1: Tests**
```ts
const cap = computeResults({ ratingDate: '2017-12-31', projectEndDate: '2036-06-30', finalPd: 0.007654447841321495, lgdYear: { ...minimalYear, lifetimeLgdByClass: { 'Senior Secured': 0.18947256261401915, ... nulls }, lgdByClass: { 'Senior Secured': 0.2960033502561854, ... } }, recoveryRate: 0.4832 }).capital;
expect(cap.downturnLgd).toBeCloseTo(0.25431475760489763, 10); expect(cap.remainingMaturity).toBe(5);
expect(cap.correlation).toBeCloseTo(0.20184026426772828, 10); expect(cap.maturityAdjustment).toBeCloseTo(0.14855922807129834, 10);
expect(cap.k).toBeCloseTo(0.05174300785859024, 7); expect(cap.rwa).toBeCloseTo(0.6855948541263207, 6); expect(cap.capital).toBeCloseTo(0.07274161402280263, 6);
it('computeAll on empty deal does not throw and reports warnings', () => { const c = computeAll(emptyDeal()); expect(c.warnings.length).toBeGreaterThan(0); expect(c.results.capital.k).toBeNull(); expect(c.stepStatus.projectInformation).toBe('empty'); });
it('computeAll on the Solar example reproduces the headline numbers', () => { const c = computeAll(solarDeal /* with liquidationCostPct 0.01 and pooled row 1 blank to match the sheet */); expect(c.pdScorecard.finalPd).toBeCloseTo(0.0076544478, 8); expect(c.lgdScorecard.recoveryRate).toBeCloseTo(0.4832155, 6); expect(c.valuationAnalysis.find(r => r.year === 2017)!.averageDscr).toBeCloseTo(1.63255, 4); expect(c.results.lgdTable[0].twelveMonth).toBeCloseTo(0.2960033502561854, 3); });
```
(The last assertion uses the app's own schedule, so tolerance 3 decimals.)

- [ ] **Step 2: Implement, run, commit** `feat(engine): results, capital calculation and computeAll pipeline`

---

### Task 10: Model — example deal, validation, persistence

**Files:** `src/model/exampleDeal.ts`, `src/model/validation.ts`, `src/model/storage.ts`, `src/model/dealContext.tsx`, tests.

**Interfaces (produces):**
```ts
export const solarCapitalDeal: Deal;                       // full workbook inputs (liquidation 5%, both pooled rows)
export interface FieldError { path: string; message: string }
export function validateDeal(deal: Deal): FieldError[];    // dates ordered (start < constructionEnd <= end, ratingDate set), percentages in [0,1], amounts >= 0, loan maturity > first payment, required fields per step
export const STORAGE_KEY = 'pf-scorecard-deal-v1';
export function loadDeal(storage?: Pick<Storage,'getItem'|'setItem'>): Deal | null;   // returns null on any error
export function saveDeal(deal: Deal, storage?: ...): boolean;
export function exportDealJson(deal: Deal): string; export function importDealJson(text: string): Deal;  // validates shape, throws Error with message otherwise
// dealContext.tsx
export function DealProvider(props: { children: ReactNode }): JSX.Element;
export function useDeal(): { deal: Deal; setDeal(updater: (d: Deal) => Deal): void; computed: Computed; errors: FieldError[]; replaceDeal(d: Deal): void };
```
- [ ] **Step 1: Tests**: roundtrip export/import equals; import of `{}` throws; `loadDeal` with a storage whose `getItem` throws returns null; `saveDeal` with throwing `setItem` returns false; `validateDeal(emptyDeal())` lists required fields; `validateDeal(solarCapitalDeal)` is empty.
- [ ] **Step 2: Implement, run, commit** `feat(model): example deal, validation and persistence`

---

### Task 11: App shell and navigation

**Files:** `src/App.tsx`, `src/components/Layout.tsx`, `src/components/StepStatus.tsx`, `src/pages/InstructionsPage.tsx`, `src/styles.css`, `src/components/Field.tsx`, `src/components/DataTable.tsx`, `src/components/HelpNote.tsx`, `src/components/NumberFormat.ts`, test `src/__tests__/app.test.tsx`.

- Routing: hash-based (`#/project-information` ...) implemented with a tiny `useHashRoute()` hook (no router dependency). Left nav lists the seven steps in workbook order with a status dot from `computed.stepStatus`, then a divider and Terms of Use / Reference Tables / Recovery Under Restructure.
- Header: deal name, buttons: New deal, Load example (Solar Capital De Aar), Import JSON, Export JSON. Autosave to localStorage on every change (debounced 300 ms).
- `Field` renders label, help popover (glossary text), input; variants `text | number | percent | date | select`; colour classes `.capture` (green), `.choice` (yellow), `.calc` (grey, read-only) matching the sheet's legend, which is printed on the Instructions page.
- `DataTable` is a generic editable grid (`columns: {key, label, kind, width, readOnly}`, `rows`, `onChange(rowIndex, key, value)`), supports pasting a column of numbers from the clipboard into number cells (split on newlines, strip thousands separators).
- `InstructionsPage` reproduces the Instructions sheet text (steps 1-7, help, informational sheets) as links with status.
- Test: renders App, nav shows the seven steps, clicking "Load example" sets the header deal name to `Solar Capital De Aar RF (Pty) Ltd`.
- [ ] Implement, run tests + `npm run build`, commit `feat(ui): app shell, navigation, field widgets`

---

### Task 12: Input pages — Project Information, Cashflow Details, Funding Details

**Files:** `src/pages/ProjectInformationPage.tsx`, `src/pages/CashflowDetailsPage.tsx`, `src/pages/FundingDetailsPage.tsx`, tests for each (render with example deal, change a field, assert deal updated).

- Project Information: sections and numbering as the sheet (header fields; 1 Collateral; 1.1 Project Valuation 1.1.1-1.1.9 with derived life/duration shown grey; 1.2 pooled collateral table 10 rows; 1.3 per-loan collateral 10 rows with Loan 1..5 select). Help notes carry deviations D1, D2, D7.
- Cashflow Details: two blocks side by side as the sheet (Construction Costs: frequency, currency, generated date rows with amount inputs; CFADS: same) plus the discount rate per period field (F1.2.2 glossary). Dates regenerate from Project Information; amounts are keyed by date so unchanged dates keep their values. "Paste amounts" supported via `DataTable`.
- Funding Details: tabs Loan 1..5 (add/remove, max 5). Per loan the fields of `LoanInput`, a disbursements table, a variable-capital table (shown for VariableCapital), and the generated schedule (read-only grey table: Date, Opening, Drawdown, Interest, Capital, Payment, Closing) with help note D5.
- [ ] Implement, test, build, commit `feat(ui): project information, cashflow details and funding details pages`

---

### Task 13: Calculation pages — Project Valuation, PD Scorecard, LGD Scorecard

**Files:** `src/pages/ProjectValuationPage.tsx`, `src/pages/PdScorecardPage.tsx`, `src/pages/LgdScorecardPage.tsx`, tests.

- Project Valuation: parameter block (grey: rating date, type, base value, clearance, start, construction end, life, end, frequency, rate per period, annualised rate, est. value after construction, liquidation costs) with a **Calculate** button that runs `validateDeal` for steps 1-3, shows blocking errors or marks the step complete; below: the period table (Date, Construction cost, Accumulated, Clearance, Discounted value, Project value, per-loan Drawdown / Capital / Repayment / Balance, Free cash flow, After debt service, Company asset value, PD) and the Valuation Analysis table (Year, Repayments per loan, Cash flow available, DSCR, Average DSCR) with the rating-year row highlighted. Help note D4.
- PD Scorecard: sections A-G with the sheet's layout: question id, text, Pre-completion response select, score, Post-completion response select, score, description of the selected response for the active phase; section rows show weight and weighted score for both columns; A1 shows country select (sovereign list), derived sovereign rating / grade / PD and score; E2.1 is a percent field per column; F2.1 shows the DSCR from valuation (grey) and its score with help note D3; footer shows totals, pre/post PD and risk grade, and highlights the active phase.
- LGD Scorecard: H1-H5 as the sheet, then the "Current LGD" and "New LGD" panels with every intermediate factor (volatility, scaling, country, haircut factor, construction adjustment, recovery costs, haircut, recovery rate).
- Tests: valuation page shows `1,642,684,109` for the example; PD page shows `RW14`; LGD page shows `48.32%`.
- [ ] Implement, test, build, commit `feat(ui): valuation, PD scorecard and LGD scorecard pages`

---

### Task 14: Results and reference pages

**Files:** `src/pages/ResultsPage.tsx`, `src/pages/TermsOfUsePage.tsx`, `src/pages/ReferenceTablesPage.tsx`, `src/pages/RecoveryUnderRestructurePage.tsx`, tests.

- Results: left panel "Project Finance Scorecard - Results" (deal header; country of risk, sovereign grade and PD; section ratings table A-G with weights; overall rating; final PD and risk grade; recovery rate on the project; loan-level LGD table 12-month / lifetime for the five classes); right panel "Capital Calculation" (PD, downturn LGD, remaining maturity, correlation, maturity adjustment, K, RWA, capital at 10.61%); below, the project LGD by year table (year, exposures, project value, collateral, LGD by class, PD, lifetime LGD). A warnings box lists missing inputs. Footer: model version string from the sheet (`PF Scorecard Model_v08.4.2_PDMS_Excel 2007 (2010/09/27)`) and the app's deviation list.
- Terms of Use: glossary grouped by sheet, searchable.
- Reference Tables: read-only rendering of every structure in `referenceTables` plus the sovereign ratings list.
- Recovery Under Restructure: the six categories with a)/b)/c) descriptions, select per category, weights and the weighted score (SUMPRODUCT of weights and scores, Solar example = 1.2).
- Tests: Results page for the example shows `RW14`, `0.77%`, and capital `7.27%`.
- [ ] Implement, test, build, commit `feat(ui): results and reference pages`

---

### Task 15: Documentation and final verification

**Files:** `README.md`, `CLAUDE.md`.

- README: what the app is, how to run (`npm install`, `npm run dev`, `npm test`, `npm run build`), how to regenerate reference data from the workbook, the step flow, the deviations list (spec section 3), and how the engine was verified.
- CLAUDE.md: project layout, commands, engine-purity rule, where reference data comes from, test oracle note.
- Run `npm run typecheck && npm test && npm run build`; start `npm run dev`, load the example, walk the seven steps, confirm Results shows PD 0.77% / RW14 and LGD 12-month 29.6% (within rounding), export JSON and re-import.
- Commit `docs: readme and project notes`.
