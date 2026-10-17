# Project Finance Scorecard App — Design

Date: 2026-10-17
Source workbook: `Stage 3 ECL Calculator (version 3).xlsm` (Project Finance Scorecard, PF Scorecard Model v08.4.2 lineage)

## 1. Intent

Rebuild the workbook's **visible, user-facing flow** as a web application so a credit analyst can capture a project finance deal and obtain the same PD, LGD and capital outputs the spreadsheet produces, following the same step order as the workbook's *Instructions* sheet:

1. Project Information
2. Cashflow Details
3. Funding Details
4. Project Valuation (the "calculation" step)
5. PD Scorecard
6. LGD Scorecard
7. Results

Supporting sheets (Terms of Use glossary, Reference Tables, Recovery Under Restructure) are available as help / reference pages.

**What the user said:** build an app from the loaded spreadsheet, keeping the flow the same as the spreadsheet.

**Assumptions made (session was autonomous, no clarifying questions possible):**

- A1. The deliverable is the *Project Finance Scorecard* flow (the visible sheets listed in *Instructions*). The four **hidden** sheets (`Loss_Calculation`, `Cash_Flows`, `Term_Structure`, `Client and Facility Information`) form a separate generic Stage 3 ECL template driven by VBA (`payment`, `Weighted_PD_Structured`, ...) that nothing on the visible sheets consumes. They are out of scope for this build.
- A2. Single-user, local tool. No login, no server, no database. Deal state is kept in the browser (localStorage) and can be exported / imported as a JSON file. This mirrors "one workbook = one deal".
- A3. Calculations run instantly in the browser; a *Calculate* button is still shown on the Project Valuation step to preserve the workbook's step, and it also validates upstream inputs.
- A4. Up to **5 loans** (the valuation engine supports Loan 1-5, matching the sheet).

## 2. Calculation chain (as reverse-engineered from the workbook)

Notation: PI = Project Information, CD = Cashflow Details, FD = Funding Details, PV = Project Valuation, VA = Valuation Analysis, PLN = Project LGD New, RT = Reference Tables.

### 2.1 Project Information (inputs)
Deal name, borrower (CIF) number, capturer, rating date, phase (Pre-completion / Post-completion), project type (RT sector list: Chemicals Oil & Gas, Infrastructure, Telecoms, Mining, Energy, Other), project start date, project end date, construction end date, base value + currency, clearance cost %, PPP (Yes/No), liquidation period (months), liquidation cost %, pooled collateral (10 rows: type, amount, currency), per-loan collateral (10 rows: type, amount, loan, currency).
Derived: project life (months), construction duration (months).

### 2.2 Cashflow Details (inputs)
- Construction costs: frequency (monthly/quarterly/semi-annually/annually), currency, dated amounts from project start to construction end.
- Cash flow available to service debt (CFADS): frequency, currency, dated amounts from construction end to project end.
Dates are generated from PI and the chosen frequency (as the sheet's formulas do); the user captures amounts.

### 2.3 Funding Details (inputs) -> amortisation schedule
Per loan: description, facility amount, currency, debt ranking (Senior Secured / Senior Unsecured / Mezzanine / Subordinated / Other -> rank 1-5 from RT "Capital Structure"), maturity date, payment type (FixedPayment, ConstantCapital, InterestOnly, VariableCapital), payment frequency (Monthly, Bi-Monthly, Quarterly, Semi-Annual, Annual), first payment date, interest rate, residual value, disbursements (date, amount), variable capital repayments (date, amount; VariableCapital only).

Schedule generation (the workbook's *Amortisation Schedule* sheet holds pasted values; the app generates them):
- Payment dates: first payment date stepped by the frequency until maturity.
- Opening balance at first payment = total drawdowns up to that date; interest per period = opening x rate x days/365 (ACT/365 simple; reproduces the sheet's values to within 0.02%).
- Capital per period: FixedPayment -> annuity payment less interest; ConstantCapital -> (balance - residual)/n; InterestOnly -> 0 until maturity, then balance; VariableCapital -> amount from the variable table for that date.
- Payment = interest + capital; closing = opening + drawdown - capital.

### 2.4 Project Valuation (engine)
Period grid: start at project start date, step by the CFADS frequency (EOMONTH), stop at project end date. Per period:
- Construction cost in period (sum of CD construction rows with date in (prev, current]); blank after construction end.
- Accumulated construction cost; clearance cost = accumulated x clearance %.
- Project value timeline: from construction end, step by CFADS frequency; free cash flow per date; project value at each date = NPV(discount rate per period, cash flows from that date to the end) using Excel NPV semantics (first flow discounted one period).
- Discounted-CF project value (J): after construction -> NPV at that date; last construction period -> accumulated cost + clearance; otherwise 0.
- Project value (K): during construction accumulated + clearance, otherwise J.
- Per loan: drawdowns in period (during construction), capital repayment and total repayment from the schedule at that date, balance at month end (cumulative drawdowns during construction, schedule closing balance afterwards).
- Free cash flow (AF), after debt service (AG), year (AH), company asset value AI = MAX(accumulated + clearance, project value at the previous period date).
- PD per period (AJ): pre-completion PD while period date <= construction end, else post-completion PD (see deviation D4).
- Annualised discount rate = (1 + rate per period)^(12/months per period) - 1.

### 2.5 Valuation Analysis
Per calendar year from project start to end: repayments per loan, CFADS total, DSCR = CFADS / total repayments (0 if no repayments), average DSCR from that year to the end. The PD scorecard reads the average DSCR for the rating year.

### 2.6 PD Scorecard
Sections and weights (sum to 1): A1 0.16, A2 0.10, B 0.039, C 0.1236, D1 0.0311, D2 0.0535, D3 0.01, E1 0.0114, E2 0.0171, E3 0.08, E4 0.148, F1 0.0748, F2 0.034, G1 0.1175.
- A1 score = -NORMSINV(sovereign PD); sovereign grade = country -> Moody's LT issuer rating (Sovereign Ratings table) -> RW grade (RT Moody's map) -> fitted PD (RT risk grades).
- Every other question: response (Low / Moderate / High / Very High Risk) -> score 1-4 from RT; section score = average of its questions. Pre-completion and post-completion responses are captured side by side; the phase in PI decides which column feeds the result.
- E2 (off-takers) = (average(E2.2.x) x off-take % x 0.75) + 1.
- F2.1 DSCR score: DSCR from VA for the rating year, scored with the workbook's `Score_DSCR` rule (industry + PPP thresholds).
- Total = sum of weight x section score; PD = 1 / (1 + exp(alpha + beta x total)) with alpha = -5.36038804, beta = 3.154875549; risk grade from RT PD bands.

### 2.7 LGD Scorecard
- "Current LGD": H1 phase (pre 1 / post 4, weight 0.3), H2 regulatory, H3.1, H3.2, H4.1 (weight 0.175 each) -> score; haircut = score x slope + intercept fitted through (score 4 -> 65%, score 1 -> 100%); H5 = No forces 100%. Recovery = 1 - haircut (informational).
- "New LGD": haircut = MIN(construction adjustment(phase) x sector volatility x 2.741308269785451 x country factor + recovery costs(phase), 1); country factor = 1 / (1 - (insolvency score - 1) x 0.1). Recovery rate = 1 - haircut -> used by the project LGD engine.

### 2.8 Project LGD (per year, PLN sheet)
For each year from project start year to end year:
- Loan exposures = balances at the last period date in that year; project value = company asset value at that date.
- Project collateral (realisable) = project value x recovery rate x (1 - liquidation cost %), allocated to loans by seniority waterfall (`Collateral_Allocation`: senior tranches absorb collateral first, pari-passu tranches share pro rata).
- Additional collateral = pooled collateral x (1 - liquidation cost %) allocated the same way, plus per-loan collateral x (1 - liquidation cost %).
- LGD per seniority class = MAX(liquidation cost %, MIN(1, 1 - (1 - unsecured fraction) / (1 + annualised discount rate))), 0 when fully covered.
- Lifetime LGD per class from year t = sum(LGD x PD x exposure) / sum(PD x exposure) over years >= t.

### 2.9 Results
- Deal header, country of risk, sovereign grade and PD, section ratings (Low/Moderate/High/Very High from score bands), final PD and risk grade.
- Recovery rate on the project, LGD by seniority class for the rating year: 12-month (point-in-time) and lifetime, floored at 1%.
- Capital calculation: downturn LGD = 0.92 x lifetime LGD (Senior Secured) + 0.08; remaining maturity = YEARFRAC(rating date, project end) clipped to [1, 5]; Basel correlation, maturity adjustment, K, RWA (x 12.5 x 1.06), capital at 10.61%.

## 3. Deviations from the workbook (deliberate, each flagged in the UI help)

- D1. **Pooled collateral**: the sheet sums rows 2-11 of the pooled-collateral table (an off-by-one that drops row 1). The app sums all ten rows.
- D2. **Valuation parameters**: the sheet hard-codes base value, clearance % and liquidation cost % on the Project Valuation sheet (1%) instead of linking to Project Information (where liquidation cost is 5%). The app links them to Project Information.
- D3. **DSCR covenant score** is a typed constant (4) in the sheet; the app computes it with the workbook's own `Score_DSCR` rule.
- D4. **PD per valuation period** came from an external template file (not shipped). The app switches from pre- to post-completion PD at the construction end date.
- D5. **Interest accrual** uses ACT/365 simple interest on the opening balance (the sheet's schedule was pasted from another tool).
- D6. The hidden Stage 3 ECL sheets and the "Update PD Term Structure" VBA are out of scope (A1).
- D7. Per-loan collateral is keyed "Loan 1...Loan 5" (the sheet's dropdown says "Tranche n" while its formulas match "Loan n").

## 4. Architecture

- **Stack**: Vite + React 18 + TypeScript. No backend. Vitest for tests.
- `src/engine/` - pure, framework-free calculation modules, one per workbook sheet:
  `dates.ts`, `stats.ts` (normSInv / normSDist), `amortisation.ts`, `valuation.ts`, `valuationAnalysis.ts`, `pdScorecard.ts`, `lgdScorecard.ts`, `projectLgd.ts`, `results.ts`, `compute.ts` (runs the whole chain on a `Deal`).
- `src/data/` - reference data as JSON, generated from the workbook by `tools/extract_reference_data.py`: reference tables (questions, responses, scores, weights, PD calibration, sectors, insolvency scores, construction adjustments, score bands, risk grades, Moody's map, capital structure), sovereign ratings (country -> Moody's rating), glossary (Terms of Use), PD scorecard structure.
- `src/model/` - `Deal` type (all inputs), defaults, validation, localStorage persistence, JSON import/export, and a bundled example deal (Solar Capital De Aar, from the workbook).
- `src/pages/` - one page per workbook step, plus Instructions (home), Terms of Use, Reference Tables, Recovery Under Restructure.
- `src/components/` - field widgets following the sheet's colour language (yellow = dropdown, green = capture, grey = calculated), editable tables, help popovers.

## 5. Data flow
`Deal` (inputs) -> `computeAll(deal)` -> `Computed` { schedules, valuation periods, valuation analysis, pd scorecard, lgd scorecard, project LGD table, results, warnings }. Pages read `Computed` via a context; nothing in the UI computes numbers itself.

## 6. Error handling
- Field-level validation (dates ordered, percentages 0-1, amounts >= 0, required fields) shown inline; the Instructions page shows each step's status.
- The engine never throws on incomplete input: missing pieces yield `null` outputs and a warning list (mirroring the sheet's `IFERROR(...,"")`). Results page shows which inputs are missing.

## 7. Testing
- Engine unit tests use the workbook's cached values for the bundled deal as the oracle: valuation periods (selected rows), VA average DSCR 2017 = 1.63255, PD scorecard totals (pre 2.88953 / post 3.24107) and PDs (0.022849 / 0.0076544), RG RW17 / RW14, LGD scorecard haircut 0.516784, project LGD rows (K, L, S, X, AF for 2012-2014), results capital (K 0.051743, RWA 0.685595).
- Where a deviation applies, the test feeds inputs that reproduce the sheet's effective values (e.g. pooled collateral of 33,724,938 only; liquidation cost 1%; external PD path injected) so the formulas are verified exactly.
- `Score_DSCR`, `Collateral_Allocation`, amortisation types, date helpers get direct unit tests.

## 8. Out of scope
Multi-user storage, authentication, PDF export, the hidden Stage 3 ECL template, PD term-structure uploads, FX conversion between currencies (the sheet captures currency labels but never converts).
