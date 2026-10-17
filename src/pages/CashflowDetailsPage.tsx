import { CURRENCIES, FREQUENCIES, glossary } from '../data';
import { DataTable, type Column } from '../components/DataTable';
import { Field } from '../components/Field';
import { fmtDate } from '../components/format';
import { cfadsDates, constructionCostDates } from '../engine/valuation';
import { useDeal } from '../model/dealContext';
import type { CashflowDetails, Frequency } from '../model/deal';
import { errorsForPrefix } from '../model/validation';

interface AmountRow {
  date: string;
  amount: number | null;
}

export function CashflowDetailsPage() {
  const { deal, setDeal, errors } = useDeal();
  const cd = deal.cashflowDetails;
  const pi = deal.projectInformation;
  const err = (key: string) => errorsForPrefix(errors, `cashflowDetails.${key}`)[0]?.message;
  const set = <K extends keyof CashflowDetails>(key: K, value: CashflowDetails[K]) =>
    setDeal((d) => ({ ...d, cashflowDetails: { ...d.cashflowDetails, [key]: value } }));
  const setAmount = (key: 'constructionCosts' | 'cfads', date: string, amount: number | null) =>
    setDeal((d) => {
      const next = { ...d.cashflowDetails[key] };
      if (amount === null) delete next[date];
      else next[date] = amount;
      return { ...d, cashflowDetails: { ...d.cashflowDetails, [key]: next } };
    });

  const haveDates = Boolean(pi.projectStartDate && pi.constructionEndDate && pi.projectEndDate);
  const constructionDates = haveDates ? constructionCostDates(pi.projectStartDate!, pi.constructionEndDate!, cd.constructionFrequency) : [];
  const cfadsDateList = haveDates ? cfadsDates(pi.constructionEndDate!, pi.projectEndDate!, cd.cfadsFrequency) : [];
  const rows = (dates: string[], amounts: Record<string, number>): AmountRow[] => dates.map((date) => ({ date, amount: amounts[date] ?? null }));
  const columns = (label: string): Column<AmountRow>[] => [
    { key: 'date', label: 'Date', kind: 'static', get: (r) => fmtDate(r.date), align: 'left', width: '9rem' },
    { key: 'amount', label, kind: 'amount', get: (r) => r.amount, set: (r, v) => ({ ...r, amount: v as number | null }) },
  ];
  const orphanCount = (dates: string[], amounts: Record<string, number>) => Object.keys(amounts).filter((d) => !dates.includes(d)).length;

  return (
    <article className="page">
      <h1>Cashflow Details</h1>
      <p className="lede">Step 2 of 7. Projected cash flows: the construction costs during the build, and the cash flow available to service debt (CFADS) afterwards. Dates follow the Project Information dates and the frequency you choose; paste a column of numbers into the first amount cell to fill a table.</p>
      {!haveDates && <p className="warnings">Capture the project dates (start, construction end and end) on the Project Information page first; the date rows below are generated from them.</p>}

      <div className="results-grid">
        <section className="sheet">
          <h2>Construction Costs</h2>
          <p className="muted">{glossary['Construction costs / capital outlay']}</p>
          <div className="field-grid">
            <Field kind="select" label="Frequency" value={cd.constructionFrequency} options={FREQUENCIES} onChange={(v) => set('constructionFrequency', (v as Frequency) ?? 'monthly')} />
            <Field kind="select" label="Currency" value={cd.constructionCurrency} options={CURRENCIES} onChange={(v) => set('constructionCurrency', v ?? 'ZAR')} />
          </div>
          {err('constructionCosts') && <p className="field-error">{err('constructionCosts')}</p>}
          <DataTable caption="Construction Costs" columns={columns('Amount')} rows={rows(constructionDates, cd.constructionCosts)} rowKey={(r) => r.date} onChange={(_, row) => setAmount('constructionCosts', row.date, row.amount)} emptyMessage="No dates yet." compact />
          {orphanCount(constructionDates, cd.constructionCosts) > 0 && (
            <p className="muted">{orphanCount(constructionDates, cd.constructionCosts)} captured amount(s) fall on dates that are no longer in the grid and are ignored.</p>
          )}
        </section>

        <section className="sheet">
          <h2>Cash flow Available to Service Debt</h2>
          <p className="muted">{glossary['Cash flow available to service debt (CFASD)']}</p>
          <div className="field-grid">
            <Field kind="select" label="Frequency" value={cd.cfadsFrequency} options={FREQUENCIES} onChange={(v) => set('cfadsFrequency', (v as Frequency) ?? 'semi-annually')} />
            <Field kind="select" label="Currency" value={cd.cfadsCurrency} options={CURRENCIES} onChange={(v) => set('cfadsCurrency', v ?? 'ZAR')} />
            <Field
              kind="percent"
              code="F1.2.2"
              label="Discount rate for project value per cash-flow period"
              value={cd.discountRatePerPeriod}
              onChange={(v) => set('discountRatePerPeriod', v)}
              suffix="% per period"
              help={glossary['F1.2.2']}
              error={err('discountRatePerPeriod')}
            />
          </div>
          {err('cfads') && <p className="field-error">{err('cfads')}</p>}
          <DataTable caption="Cash flow Available to Service Debt (CFADS)" columns={columns('Amount')} rows={rows(cfadsDateList, cd.cfads)} rowKey={(r) => r.date} onChange={(_, row) => setAmount('cfads', row.date, row.amount)} emptyMessage="No dates yet." compact />
          {orphanCount(cfadsDateList, cd.cfads) > 0 && <p className="muted">{orphanCount(cfadsDateList, cd.cfads)} captured amount(s) fall on dates that are no longer in the grid and are ignored.</p>}
        </section>
      </div>
    </article>
  );
}
