import { useState } from 'react';
import { DataTable, type Column } from '../components/DataTable';
import { Field } from '../components/Field';
import { DeviationNote } from '../components/HelpNote';
import { fmtAmount, fmtDate, fmtNumber, fmtPct } from '../components/format';
import { monthsBetween, yearOf } from '../engine/dates';
import type { ValuationPeriod } from '../engine/valuation';
import type { ValuationAnalysisRow } from '../engine/valuationAnalysis';
import { useDeal } from '../model/dealContext';
import { errorsForPrefix } from '../model/validation';

const UPSTREAM: { prefix: string; label: string }[] = [
  { prefix: 'projectInformation', label: 'Project Information' },
  { prefix: 'cashflowDetails', label: 'Cashflow Details' },
  { prefix: 'loans', label: 'Funding Details' },
];

export function ProjectValuationPage() {
  const { deal, computed, errors, calculated, markCalculated } = useDeal();
  const [attempted, setAttempted] = useState(false);
  const pi = deal.projectInformation;
  const cd = deal.cashflowDetails;
  const v = computed.valuation;
  const blocking = UPSTREAM.map((u) => ({ ...u, errors: errorsForPrefix(errors, u.prefix) })).filter((u) => u.errors.length > 0);
  const ratingYear = pi.ratingDate ? yearOf(pi.ratingDate) : null;

  const onCalculate = () => {
    setAttempted(true);
    if (blocking.length === 0) markCalculated();
  };

  const loanSlots = deal.loans.map((l, i) => ({ slot: i, label: `Loan ${l.id}` }));
  const periodColumns: Column<ValuationPeriod>[] = [
    { key: 'date', label: 'Date', kind: 'static', get: (p) => fmtDate(p.date), align: 'left' },
    { key: 'cc', label: 'Construction costs', kind: 'amount', get: (p) => p.constructionCost },
    { key: 'acc', label: 'Accumulated construction cost', kind: 'amount', get: (p) => p.accumulatedCost },
    { key: 'clr', label: 'Base clearance costs (accumulated)', kind: 'amount', get: (p) => p.clearanceCost },
    { key: 'dv', label: 'Project value (discounted CF)', kind: 'amount', get: (p) => p.discountedValue },
    { key: 'pv', label: 'Project value', kind: 'amount', get: (p) => p.projectValue },
    ...loanSlots.flatMap(({ slot, label }): Column<ValuationPeriod>[] => [
      { key: `dd${slot}`, label: `${label} drawdown`, kind: 'amount', get: (p) => p.drawdowns[slot] },
      { key: `cap${slot}`, label: `${label} capital repayment`, kind: 'amount', get: (p) => p.capitalRepayments[slot] },
      { key: `rep${slot}`, label: `${label} total repayment`, kind: 'amount', get: (p) => p.repayments[slot] },
      { key: `bal${slot}`, label: `${label} balance at month end`, kind: 'amount', get: (p) => p.balances[slot] },
    ]),
    { key: 'fcf', label: 'Free cash flow', kind: 'amount', get: (p) => p.freeCashFlow },
    { key: 'ads', label: 'After debt service', kind: 'amount', get: (p) => p.afterDebtService },
    { key: 'year', label: 'Year', kind: 'static', get: (p) => p.year },
    { key: 'cav', label: 'Company asset value', kind: 'amount', get: (p) => p.companyAssetValue },
    { key: 'pd', label: 'PD', kind: 'percent', get: (p) => p.pd, digits: 3 },
  ];
  const analysisColumns: Column<ValuationAnalysisRow>[] = [
    { key: 'year', label: 'Year', kind: 'static', get: (r) => r.year, align: 'left' },
    ...loanSlots.map(({ slot, label }): Column<ValuationAnalysisRow> => ({ key: `r${slot}`, label: `Repayment ${label}`, kind: 'amount', get: (r) => r.repayments[slot] })),
    { key: 'cf', label: 'Cash flow available', kind: 'amount', get: (r) => r.cfads },
    { key: 'dscr', label: 'Overall DSCR', kind: 'number', get: (r) => r.dscr, digits: 2 },
    { key: 'avg', label: 'Average DSCR (from this year)', kind: 'number', get: (r) => r.averageDscr, digits: 2 },
  ];

  return (
    <article className="page">
      <h1>Project Valuation</h1>
      <p className="lede">Step 4 of 7. The project value over the life of the loan: construction costs during the build, discounted cash flows afterwards, and the debt service coverage used by the PD scorecard. Press Calculate to check the first three steps and run the valuation.</p>

      <section className="sheet">
        <div className="toolbar">
          <button type="button" className="btn btn-primary" onClick={onCalculate}>
            Calculate
          </button>
          {calculated && blocking.length === 0 && (
            <span role="status" data-testid="calculated-status" className="status-pill complete">
              Calculated. The PD and LGD scorecards and the results now use this valuation.
            </span>
          )}
        </div>
        {attempted && blocking.length > 0 && (
          <div role="alert" className="warnings">
            <h2>Complete these before calculating</h2>
            <ul>
              {blocking.map((u) => (
                <li key={u.prefix}>
                  <strong>{u.label}:</strong> {u.errors.map((e) => e.message).join('; ')}
                </li>
              ))}
            </ul>
          </div>
        )}
        <h2>Parameters (from the earlier steps)</h2>
        <div className="field-grid">
          <Field kind="static" label="Rating date" value={fmtDate(pi.ratingDate)} />
          <Field kind="static" label="Type of project" value={pi.projectType ?? ''} />
          <Field kind="static" label="Base value of project" value={fmtAmount(pi.baseValue)} suffix={pi.currency} />
          <Field kind="static" label="Est. base clearance cost" value={fmtPct(pi.clearanceCostPct)} suffix="of construction costs" />
          <Field kind="static" label="Project start date" value={fmtDate(pi.projectStartDate)} />
          <Field kind="static" label="Duration of construction phase" value={pi.projectStartDate && pi.constructionEndDate ? String(monthsBetween(pi.projectStartDate, pi.constructionEndDate)) : ''} suffix="months" />
          <Field kind="static" label="Construction end date" value={fmtDate(pi.constructionEndDate)} />
          <Field kind="static" label="Life of the project" value={pi.projectStartDate && pi.projectEndDate ? fmtNumber(monthsBetween(pi.projectStartDate, pi.projectEndDate) / 12, 1) : ''} suffix="years" />
          <Field kind="static" label="Project end date" value={fmtDate(pi.projectEndDate)} />
          <Field kind="static" label="Cash flow frequency" value={cd.cfadsFrequency} />
          <Field kind="static" label="Compounding rate (per cash-flow period)" value={fmtPct(cd.discountRatePerPeriod)} />
          <Field kind="static" label="Annualised WACC" value={fmtPct(v?.annualisedRate)} />
          <Field kind="static" label="Est. project value after construction" value={fmtAmount(v?.estValueAfterConstruction)} suffix={pi.currency} />
          <Field kind="static" label="Liquidation period" value={pi.liquidationPeriodMonths === null ? '' : String(pi.liquidationPeriodMonths)} suffix="months" />
          <Field kind="static" label="Liquidation costs" value={fmtPct(pi.liquidationCostPct)} />
        </div>
        <DeviationNote>
          The PD column switches from the pre-completion PD to the post-completion PD at the construction end date. In the workbook this column came from an external template file that is not part of the model.
        </DeviationNote>
      </section>

      <section className="sheet">
        <h2>Valuation by period</h2>
        {!v && <p className="muted">The valuation runs once the project dates, valuation parameters and the discount rate are captured.</p>}
        <DataTable caption="Valuation by period" columns={periodColumns} rows={v?.periods ?? []} rowKey={(p) => p.date} compact emptyMessage="No valuation yet." />
      </section>

      <section className="sheet">
        <h2>Valuation Analysis</h2>
        <p className="muted">Debt service coverage by calendar year. The highlighted row is the rating year; its average DSCR feeds question F2.1 of the PD scorecard.</p>
        <DataTable caption="Valuation Analysis" columns={analysisColumns} rows={computed.valuationAnalysis} rowKey={(r) => String(r.year)} highlightRow={(r) => r.year === ratingYear} compact emptyMessage="No valuation yet." />
      </section>
    </article>
  );
}
