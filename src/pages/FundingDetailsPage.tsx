import { useState } from 'react';
import { CURRENCIES, glossary, PAYMENT_FREQUENCIES, PAYMENT_TYPES } from '../data';
import { DataTable, type Column } from '../components/DataTable';
import { Field } from '../components/Field';
import { DeviationNote } from '../components/HelpNote';
import { SENIORITIES, type DatedAmount, type LoanInput, type ScheduleRow } from '../engine/types';
import { MAX_LOANS } from '../engine/valuation';
import { useDeal } from '../model/dealContext';
import { emptyLoan } from '../model/deal';
import { errorsForPrefix } from '../model/validation';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  FixedPayment: 'Fixed payment (annuity)',
  ConstantCapital: 'Constant capital',
  InterestOnly: 'Interest only (bullet)',
  VariableCapital: 'Variable capital (structured to cash flow)',
};

export function FundingDetailsPage() {
  const { deal, setDeal, errors, computed } = useDeal();
  const [active, setActive] = useState(0);
  const index = Math.min(active, deal.loans.length - 1);
  const loan = deal.loans[index];
  const err = (key: string) => errorsForPrefix(errors, `loans.${index}.${key}`)[0]?.message;
  const update = (patch: Partial<LoanInput>) => setDeal((d) => ({ ...d, loans: d.loans.map((l, i) => (i === index ? { ...l, ...patch } : l)) }));
  const addLoan = () => {
    setDeal((d) => ({ ...d, loans: [...d.loans, emptyLoan(d.loans.length + 1)] }));
    setActive(deal.loans.length);
  };
  const removeLoan = (i: number) => {
    setDeal((d) => ({ ...d, loans: d.loans.filter((_, k) => k !== i).map((l, k) => ({ ...l, id: k + 1 })) }));
    setActive(Math.max(0, Math.min(i, deal.loans.length - 2)));
  };

  const datedColumns = (amountLabel: string): Column<DatedAmount & { i: number }>[] => [
    { key: 'date', label: 'Date', kind: 'date', get: (r) => r.date, set: (r, v) => ({ ...r, date: (v as string) || r.date }), width: '11rem' },
    { key: 'amount', label: amountLabel, kind: 'amount', get: (r) => r.amount, set: (r, v) => ({ ...r, amount: (v as number | null) ?? 0 }) },
  ];
  const setDated = (key: 'disbursements' | 'variableCapital', i: number, row: DatedAmount) =>
    update({ [key]: loan[key].map((r, k) => (k === i ? { date: row.date, amount: row.amount } : r)) } as Partial<LoanInput>);
  const addDated = (key: 'disbursements' | 'variableCapital') => {
    const last = loan[key][loan[key].length - 1];
    const date = last?.date ?? loan.firstPaymentDate ?? deal.projectInformation.projectStartDate ?? new Date().toISOString().slice(0, 10);
    update({ [key]: [...loan[key], { date, amount: 0 }] } as Partial<LoanInput>);
  };
  const removeDated = (key: 'disbursements' | 'variableCapital', i: number) => update({ [key]: loan[key].filter((_, k) => k !== i) } as Partial<LoanInput>);

  const scheduleColumns: Column<ScheduleRow>[] = [
    { key: 'date', label: 'Date', kind: 'date', get: (r) => r.date },
    { key: 'opening', label: 'Opening', kind: 'amount', get: (r) => r.opening },
    { key: 'drawdown', label: 'Draw down', kind: 'amount', get: (r) => r.drawdown },
    { key: 'interest', label: 'Interest', kind: 'amount', get: (r) => r.interest },
    { key: 'capital', label: 'Capital', kind: 'amount', get: (r) => r.capital },
    { key: 'payment', label: 'Payment', kind: 'amount', get: (r) => r.payment },
    { key: 'closing', label: 'Closing', kind: 'amount', get: (r) => r.closing },
  ];
  const schedule = computed.schedules[loan.id] ?? [];
  const scheduleWarnings = computed.warnings.filter((w) => w.startsWith(`Loan ${loan.id}:`));

  return (
    <article className="page">
      <h1>Funding Details</h1>
      <p className="lede">Step 3 of 7. {glossary['FUNDING DETAILS:'] ?? 'This section captures the funding details of the transaction: interest rates, dates, repayment structure and drawdowns.'} Up to five loans; the most senior ranks first.</p>

      <div className="tabs" role="tablist" aria-label="Loans">
        {deal.loans.map((l, i) => (
          <button key={l.id} type="button" role="tab" aria-selected={i === index} className={`tab${i === index ? ' active' : ''}`} onClick={() => setActive(i)}>
            Loan {l.id}
            {l.description ? ` · ${l.description}` : ''}
          </button>
        ))}
        {deal.loans.length < MAX_LOANS && (
          <button type="button" className="tab" onClick={addLoan}>
            + Add loan
          </button>
        )}
      </div>

      <section className="sheet" role="tabpanel">
        <div className="toolbar">
          <h2 style={{ margin: 0 }}>Loan {loan.id}</h2>
          {deal.loans.length > 1 && (
            <button type="button" className="btn" onClick={() => removeLoan(index)}>
              Remove loan {loan.id}
            </button>
          )}
        </div>
        <div className="field-grid">
          <Field kind="text" label="Description" value={loan.description} onChange={(v) => update({ description: v })} />
          <Field kind="text" label="Account Number" value={loan.accountNumber} onChange={(v) => update({ accountNumber: v })} />
          <Field kind="number" label="Facility Amount" value={loan.facilityAmount} onChange={(v) => update({ facilityAmount: v })} help={glossary['Facility Amount']} error={err('facilityAmount')} digits={0} />
          <Field kind="select" label="Currency of funding" value={loan.currency} options={CURRENCIES} onChange={(v) => update({ currency: v ?? 'ZAR' })} help={glossary['Currency of funding']} />
          <Field kind="select" label="Ranking relative to other Loans (debt ranking)" value={loan.seniority} options={SENIORITIES} onChange={(v) => update({ seniority: v as LoanInput['seniority'] })} help={glossary['Ranking relative to other Loans (Senior / mezz / Sub-ordinated loans) (ALL FUNDING MUST BE CONSIDERED)']} error={err('seniority')} />
          <Field kind="date" label="End Date (Loan maturity date)" value={loan.maturityDate} onChange={(v) => update({ maturityDate: v })} help={glossary['End Date (Loan maturity date)']} error={err('maturityDate')} />
          <Field kind="select" label="Settlement Type" value={loan.paymentType} options={PAYMENT_TYPES} onChange={(v) => update({ paymentType: v as LoanInput['paymentType'] })} help={`${glossary['Settlement Type'] ?? ''} ${Object.entries(PAYMENT_TYPE_LABELS).map(([k, v]) => `${k}: ${v}.`).join(' ')}`} error={err('paymentType')} />
          <Field kind="select" label="Payment frequency (debt service and compounding)" value={loan.paymentFrequency} options={PAYMENT_FREQUENCIES} onChange={(v) => update({ paymentFrequency: v as LoanInput['paymentFrequency'] })} help={glossary['Compounding frequency']} error={err('paymentFrequency')} />
          <Field kind="date" label="1st Payment Date" value={loan.firstPaymentDate} onChange={(v) => update({ firstPaymentDate: v })} help={glossary['Debt Service Dates']} error={err('firstPaymentDate')} />
          <Field kind="percent" label="Interest Rate (per annum)" value={loan.interestRate} onChange={(v) => update({ interestRate: v })} suffix="%" help={glossary['Fixed Rate (per annum) (1)']} error={err('interestRate')} />
          <Field kind="number" label="Residual Value (repaid at maturity)" value={loan.residualValue} onChange={(v) => update({ residualValue: v })} help={glossary['Residual (% facility amount)']} error={err('residualValue')} digits={0} />
        </div>
      </section>

      <div className="results-grid">
        <section className="sheet">
          <h3>Drawdown schedule</h3>
          <p className="muted">{glossary['Drawdown Schedule']}</p>
          {err('disbursements') && <p className="field-error">{err('disbursements')}</p>}
          <DataTable
            caption="Drawdown schedule"
            columns={[
              ...datedColumns('Amount'),
              { key: 'remove', label: '', kind: 'static', get: () => null, width: '3rem' },
            ]}
            rows={loan.disbursements.map((d, i) => ({ ...d, i }))}
            rowKey={(r) => String(r.i)}
            onChange={(i, row) => setDated('disbursements', i, row)}
            emptyMessage="No drawdowns captured."
            compact
          />
          <div className="toolbar">
            <button type="button" className="btn" onClick={() => addDated('disbursements')}>
              Add drawdown
            </button>
            {loan.disbursements.length > 0 && (
              <button type="button" className="btn" onClick={() => removeDated('disbursements', loan.disbursements.length - 1)}>
                Remove last drawdown
              </button>
            )}
          </div>
        </section>

        <section className="sheet">
          <h3>Capital repayments</h3>
          <p className="muted">
            {loan.paymentType === 'VariableCapital'
              ? 'Capital amounts repaid on each date (interest is added automatically). Dates should match the payment dates.'
              : 'Only used for the "VariableCapital" settlement type. Other settlement types derive the capital repayments from the loan terms.'}
          </p>
          {err('variableCapital') && <p className="field-error">{err('variableCapital')}</p>}
          <DataTable
            caption="Capital repayments"
            columns={datedColumns('Capital amount')}
            rows={loan.variableCapital.map((d, i) => ({ ...d, i }))}
            rowKey={(r) => String(r.i)}
            onChange={(i, row) => setDated('variableCapital', i, row)}
            emptyMessage="No capital repayments captured."
            compact
          />
          <div className="toolbar">
            <button type="button" className="btn" onClick={() => addDated('variableCapital')}>
              Add repayment
            </button>
            {loan.variableCapital.length > 0 && (
              <button type="button" className="btn" onClick={() => removeDated('variableCapital', loan.variableCapital.length - 1)}>
                Remove last repayment
              </button>
            )}
          </div>
        </section>
      </div>

      <section className="sheet">
        <h3>Amortisation schedule (generated)</h3>
        <DeviationNote>The workbook's schedule was pasted in from another tool. This app generates it from the terms above: interest accrues on the opening balance at the contractual rate, actual days / 365, with drawdowns accruing from the day they are made.</DeviationNote>
        {scheduleWarnings.length > 0 && (
          <ul className="field-error">
            {scheduleWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
        <DataTable caption="Amortisation schedule" columns={scheduleColumns} rows={schedule} rowKey={(r) => r.date} emptyMessage="The schedule appears once the loan terms and at least one drawdown are captured." compact />
      </section>
    </article>
  );
}
