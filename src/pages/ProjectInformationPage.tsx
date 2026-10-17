import { CURRENCIES, glossary, PHASES, referenceTables } from '../data';
import { DataTable, type Column } from '../components/DataTable';
import { Field } from '../components/Field';
import { DeviationNote } from '../components/HelpNote';
import { monthsBetween } from '../engine/dates';
import { useDeal } from '../model/dealContext';
import type { CollateralRow, LoanCollateralRow, ProjectInformation } from '../model/deal';
import { errorsForPrefix } from '../model/validation';
import { MAX_LOANS } from '../engine/valuation';

const LOAN_LABELS = Array.from({ length: MAX_LOANS }, (_, i) => `Loan ${i + 1}`);
const COLLATERAL_TYPES = referenceTables.collateralTypes.map((c) => c.type);

export function ProjectInformationPage() {
  const { deal, setDeal, errors } = useDeal();
  const pi = deal.projectInformation;
  const err = (key: string) => errorsForPrefix(errors, `projectInformation.${key}`)[0]?.message;
  const set = <K extends keyof ProjectInformation>(key: K, value: ProjectInformation[K]) =>
    setDeal((d) => ({ ...d, projectInformation: { ...d.projectInformation, [key]: value } }));
  const setPooled = (i: number, row: CollateralRow) =>
    setDeal((d) => ({ ...d, projectInformation: { ...d.projectInformation, pooledCollateral: d.projectInformation.pooledCollateral.map((r, k) => (k === i ? row : r)) } }));
  const setLoanColl = (i: number, row: LoanCollateralRow) =>
    setDeal((d) => ({ ...d, projectInformation: { ...d.projectInformation, loanCollateral: d.projectInformation.loanCollateral.map((r, k) => (k === i ? row : r)) } }));

  const life = pi.projectStartDate && pi.projectEndDate ? monthsBetween(pi.projectStartDate, pi.projectEndDate) : null;
  const construction = pi.projectStartDate && pi.constructionEndDate ? monthsBetween(pi.projectStartDate, pi.constructionEndDate) : null;

  const pooledColumns: Column<CollateralRow & { n: number }>[] = [
    { key: 'n', label: '#', kind: 'static', get: (r) => r.n, width: '3rem', align: 'left' },
    { key: 'type', label: 'Type of additional collateral', kind: 'select', options: COLLATERAL_TYPES, get: (r) => r.type, set: (r, v) => ({ ...r, type: (v as string) || null }) },
    { key: 'amount', label: 'Amount', kind: 'amount', get: (r) => r.amount, set: (r, v) => ({ ...r, amount: v as number | null }) },
    { key: 'currency', label: 'Currency', kind: 'select', options: CURRENCIES, get: (r) => r.currency, set: (r, v) => ({ ...r, currency: (v as string) || 'ZAR' }) },
  ];
  const loanColumns: Column<LoanCollateralRow & { n: number }>[] = [
    { key: 'n', label: '#', kind: 'static', get: (r) => r.n, width: '3rem', align: 'left' },
    { key: 'type', label: 'Type of additional collateral', kind: 'select', options: COLLATERAL_TYPES, get: (r) => r.type, set: (r, v) => ({ ...r, type: (v as string) || null }) },
    { key: 'amount', label: 'Amount', kind: 'amount', get: (r) => r.amount, set: (r, v) => ({ ...r, amount: v as number | null }) },
    {
      key: 'loan',
      label: 'Loan',
      kind: 'select',
      options: LOAN_LABELS,
      get: (r) => (r.loan === null ? null : `Loan ${r.loan}`),
      set: (r, v) => ({ ...r, loan: v ? Number(String(v).replace('Loan ', '')) : null }),
    },
    { key: 'currency', label: 'Currency', kind: 'select', options: CURRENCIES, get: (r) => r.currency, set: (r, v) => ({ ...r, currency: (v as string) || 'ZAR' }) },
  ];

  return (
    <article className="page">
      <h1>Project Information</h1>
      <p className="lede">Step 1 of 7. Capture the deal, the project dates and the collateral offered. Yellow fields are drop-downs, green fields are typed in, grey fields are calculated.</p>

      <section className="sheet">
        <div className="field-grid">
          <Field kind="text" label="Deal Name" value={pi.dealName} onChange={(v) => set('dealName', v)} error={err('dealName')} />
          <Field kind="text" label="BorrowerF Number" value={pi.borrowerNumber} onChange={(v) => set('borrowerNumber', v)} />
          <Field kind="text" label="Capturer" value={pi.capturer} onChange={(v) => set('capturer', v)} />
        </div>
      </section>

      <section className="sheet">
        <h2>Project rating date</h2>
        <p className="muted">
          The project rating date is the evaluation date the project credit rating will be derived. The information below must be captured and based on the date above. For calibration purposes this date should be the same for all the project finance deals captured.
        </p>
        <div className="field-grid">
          <Field kind="date" label="Project rating date" value={pi.ratingDate} onChange={(v) => set('ratingDate', v)} help={glossary['PROJECT RATING DATE']} error={err('ratingDate')} />
          <Field kind="select" label="Construction or post-construction phase?" value={pi.phase} options={PHASES} onChange={(v) => set('phase', v as ProjectInformation['phase'])} error={err('phase')} />
        </div>
      </section>

      <section className="sheet">
        <h2>
          <span className="section-code">1</span>Collateral
        </h2>
        <h3>
          <span className="section-code">1.1</span>Project Valuation
        </h3>
        <p className="muted">This sub-section refers to the variables required to assist in determining the value of the project over the life of the loan.</p>
        <DeviationNote>
          The workbook keeps its own copies of the base value, clearance cost and liquidation cost on the Project Valuation sheet (liquidation cost fixed at 1%). This app uses the values captured here throughout.
        </DeviationNote>
        <div className="field-grid">
          <Field kind="select" code="1.1.1" label="Type of project" value={pi.projectType} options={referenceTables.sectors.map((s) => s.name)} onChange={(v) => set('projectType', v)} help={glossary['1.1.1']} error={err('projectType')} />
          <Field kind="static" code="1.1.2" label="Life of the project from initiation till expected end of project" value={life === null ? '' : String(life)} suffix="months" help={glossary['1.1.2']} />
          <Field kind="date" code="1.1.3.1" label="Project Start Date" value={pi.projectStartDate} onChange={(v) => set('projectStartDate', v)} help={glossary['1.1.3']} error={err('projectStartDate')} />
          <Field kind="date" code="1.1.3.2" label="Project End Date" value={pi.projectEndDate} onChange={(v) => set('projectEndDate', v)} error={err('projectEndDate')} />
          <Field kind="static" code="1.1.4" label="Duration of construction phase from project start date until construction completion" value={construction === null ? '' : String(construction)} suffix="months" help={glossary['1.1.4']} />
          <Field kind="date" code="1.1.4.1" label="Construction End Date" value={pi.constructionEndDate} onChange={(v) => set('constructionEndDate', v)} error={err('constructionEndDate')} />
          <Field kind="number" code="1.1.5" label="Base Value of Project at the project start date" value={pi.baseValue} onChange={(v) => set('baseValue', v)} suffix="amount" help={glossary['1.1.5']} error={err('baseValue')} />
          <Field kind="select" code="1.1.5a" label="Currency" value={pi.currency} options={CURRENCIES} onChange={(v) => set('currency', v ?? 'ZAR')} />
          <Field kind="percent" code="1.1.6" label="Estimated clearance costs (% of construction costs) of base value" value={pi.clearanceCostPct} onChange={(v) => set('clearanceCostPct', v)} suffix="%" help={glossary['1.1.6']} error={err('clearanceCostPct')} />
          <Field kind="select" code="1.1.7" label="Is this a Public and Private Party (PPP) agreement?" value={pi.ppp} options={['Yes', 'No']} onChange={(v) => set('ppp', v as ProjectInformation['ppp'])} error={err('ppp')} />
          <Field kind="number" code="1.1.8" label="In the event of default, how long will it take to realise / recover this portion of the project value (liquidation period)?" value={pi.liquidationPeriodMonths} onChange={(v) => set('liquidationPeriodMonths', v)} suffix="months" digits={0} help={glossary['1.1.7']} error={err('liquidationPeriodMonths')} />
          <Field kind="percent" code="1.1.9" label="In the event of default, what is the liquidation costs (as a percentage of underlying project value)?" value={pi.liquidationCostPct} onChange={(v) => set('liquidationCostPct', v)} suffix="of project value" help={glossary['1.1.8']} error={err('liquidationCostPct')} />
        </div>
      </section>

      <section className="sheet">
        <h3>
          <span className="section-code">1.2</span>Additional pooled collateral offered:
        </h3>
        <p className="muted">{glossary['1.2']}</p>
        <DeviationNote>The workbook's formula adds rows 2 to 10 of this table and skips row 1. This app adds all ten rows.</DeviationNote>
        <DataTable
          caption="Additional pooled collateral"
          columns={pooledColumns}
          rows={pi.pooledCollateral.map((r, i) => ({ ...r, n: i + 1 }))}
          rowKey={(r) => String(r.n)}
          onChange={(i, row) => setPooled(i, { type: row.type, amount: row.amount, currency: row.currency })}
          compact
        />
      </section>

      <section className="sheet">
        <h3>
          <span className="section-code">1.3</span>Additional collateral offered per Loan:
        </h3>
        <p className="muted">{glossary['1.3']}</p>
        <DeviationNote>Collateral is linked to "Loan 1" to "Loan 5" here; the workbook's drop-down says "Tranche n" while its formulas look for "Loan n".</DeviationNote>
        <DataTable
          caption="Additional collateral per loan"
          columns={loanColumns}
          rows={pi.loanCollateral.map((r, i) => ({ ...r, n: i + 1 }))}
          rowKey={(r) => String(r.n)}
          onChange={(i, row) => setLoanColl(i, { type: row.type, amount: row.amount, loan: row.loan, currency: row.currency })}
          compact
        />
      </section>
    </article>
  );
}
