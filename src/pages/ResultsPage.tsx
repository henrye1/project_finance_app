import { MODEL_VERSION, pdScorecardStructure } from '../data';
import { DataTable, type Column } from '../components/DataTable';
import { fmtDate, fmtNumber, fmtPct } from '../components/format';
import type { ProjectLgdYear } from '../engine/projectLgd';
import type { LgdTableRow } from '../engine/results';
import { SENIORITIES } from '../engine/types';
import { yearOf } from '../engine/dates';
import { useDeal } from '../model/dealContext';

function Chip({ rating }: { rating: string | null }) {
  if (!rating) return <span className="muted">—</span>;
  return <span className={`rating-chip ${rating.toLowerCase().replace(' risk', '').replace(' ', '-')}`}>{rating}</span>;
}

export function ResultsPage() {
  const { deal, computed } = useDeal();
  const pi = deal.projectInformation;
  const pd = computed.pdScorecard;
  const res = computed.results;
  const cap = res.capital;
  const active = pi.phase === 'Pre-completion Phase' ? 'Pre' : 'Post';
  const ratingYear = pi.ratingDate ? yearOf(pi.ratingDate) : null;
  const sectionRating = (id: string) => {
    const s = pd.sections.find((x) => x.id === id);
    return active === 'Pre' ? s?.ratingPre ?? null : s?.ratingPost ?? null;
  };

  const lgdColumns: Column<LgdTableRow>[] = [
    { key: 's', label: 'Seniority', kind: 'static', get: (r) => r.seniority, align: 'left' },
    { key: 'm', label: '12-Month LGD', kind: 'percent', get: (r) => r.twelveMonth },
    { key: 'l', label: 'Lifetime LGD', kind: 'percent', get: (r) => r.lifetime },
  ];
  const loanSlots = deal.loans.map((l, i) => ({ slot: i, label: `Loan ${l.id}` }));
  const yearColumns: Column<ProjectLgdYear>[] = [
    { key: 'y', label: 'Year', kind: 'static', get: (r) => r.year, align: 'left' },
    ...loanSlots.map(({ slot, label }): Column<ProjectLgdYear> => ({ key: `e${slot}`, label: `${label} exposure`, kind: 'amount', get: (r) => r.exposures[slot] })),
    { key: 'pv', label: 'Project value', kind: 'amount', get: (r) => r.projectValue },
    { key: 'pc', label: 'Realisable project collateral', kind: 'amount', get: (r) => r.projectCollateral },
    { key: 'ac', label: 'Additional collateral allocated', kind: 'amount', get: (r) => r.additionalAllocated.reduce((t, x) => t + x, 0) },
    ...SENIORITIES.map((s): Column<ProjectLgdYear> => ({ key: `lgd-${s}`, label: `LGD ${s}`, kind: 'percent', get: (r) => r.lgdByClass[s] })),
    { key: 'pd', label: 'PD', kind: 'percent', get: (r) => r.pd, digits: 3 },
    ...SENIORITIES.map((s): Column<ProjectLgdYear> => ({ key: `lt-${s}`, label: `Lifetime LGD ${s}`, kind: 'percent', get: (r) => r.lifetimeLgdByClass[s] })),
  ];

  return (
    <article className="page">
      <h1>Results</h1>
      <p className="lede">Step 7 of 7. The scorecard results and the capital calculation for {pi.dealName || 'this deal'}, using the {active.toLowerCase()}-completion column of the PD scorecard.</p>

      {computed.warnings.length > 0 && (
        <section className="warnings">
          <h2>Still needed before the results are complete</h2>
          <ul>
            {computed.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="results-grid">
        <section className="sheet">
          <h2>Project Finance Scorecard</h2>
          <dl className="kv">
            <dt>Deal Name</dt>
            <dd>{pi.dealName}</dd>
            <dt>CIF ID</dt>
            <dd>{pi.borrowerNumber}</dd>
            <dt>Rating Date</dt>
            <dd>{fmtDate(pi.ratingDate)}</dd>
            <dt>Capturer</dt>
            <dd>{pi.capturer}</dd>
          </dl>
          <h3>PD (Probability of Default)</h3>
          <dl className="kv">
            <dt>Country of Risk</dt>
            <dd data-testid="country-of-risk">{deal.pdScorecard.country ?? ''}</dd>
            <dt>Sovereign RG</dt>
            <dd data-testid="sovereign-rg">{pd.sovereign.grade ?? ''}</dd>
            <dt>Sovereign PD</dt>
            <dd>{fmtPct(pd.sovereign.pd, 4)}</dd>
          </dl>
          <div className="table-wrap">
            <table className="data-table compact wrap">
              <caption>Section ratings</caption>
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Section</th>
                  <th>Rating</th>
                  <th className="right">Weight</th>
                </tr>
              </thead>
              <tbody>
                {pdScorecardStructure.map((s) => (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>{s.title}</td>
                    <td>
                      <Chip rating={sectionRating(s.id)} />
                    </td>
                    <td className="right">{fmtPct(s.weight, 2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td />
                  <td>Overall Rating</td>
                  <td>
                    <Chip rating={pd.finalRating} />
                  </td>
                  <td className="right">{fmtPct(pdScorecardStructure.reduce((a, s) => a + s.weight, 0), 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="field-grid" style={{ marginTop: '1rem' }}>
            <div>
              <div className="headline-number" data-testid="final-pd">
                {fmtPct(pd.finalPd, 2)}
              </div>
              <div className="headline-label">Final PD</div>
            </div>
            <div>
              <div className="headline-number" data-testid="final-grade">
                {pd.finalGrade ?? ''}
              </div>
              <div className="headline-label">Final Risk Grade</div>
            </div>
          </div>

          <h3>LGD (Loss Given Default)</h3>
          <dl className="kv">
            <dt>Recovery Rate on underlying project</dt>
            <dd data-testid="recovery-rate">{fmtPct(res.recoveryRate, 2)}</dd>
          </dl>
          <DataTable caption="Loan-level lifetime LGD" columns={lgdColumns} rows={res.lgdTable} rowKey={(r) => r.seniority} compact />
          <p className="muted">LGDs are floored at 1%. Classes without exposure in the rating year are blank.</p>
        </section>

        <section className="sheet">
          <h2>Capital Calculation</h2>
          <dl className="kv">
            <dt>PD</dt>
            <dd>{fmtPct(cap.pd, 4)}</dd>
            <dt>Downturn LGD</dt>
            <dd>{fmtPct(cap.downturnLgd, 2)}</dd>
            <dt>Remaining maturity (years)</dt>
            <dd data-testid="remaining-maturity">{fmtNumber(cap.remainingMaturity, 2)}</dd>
            <dt>Correlation</dt>
            <dd>{fmtNumber(cap.correlation, 4)}</dd>
            <dt>Maturity adjustment</dt>
            <dd>{fmtNumber(cap.maturityAdjustment, 4)}</dd>
            <dt>K</dt>
            <dd data-testid="capital-k">{fmtPct(cap.k, 2)}</dd>
            <dt>RWA</dt>
            <dd data-testid="capital-rwa">{fmtPct(cap.rwa, 2)}</dd>
            <dt>Capital @ 10.61%</dt>
            <dd data-testid="capital-pct">{fmtPct(cap.capital, 2)}</dd>
          </dl>
          <p className="muted">Downturn LGD = 0.92 × lifetime LGD (Senior Secured) + 0.08. Remaining maturity is clipped to between 1 and 5 years. RWA = K × 12.5 × 1.06.</p>
        </section>
      </div>

      <section className="sheet">
        <h2>Project LGD by year</h2>
        <p className="muted">Exposures at year end, realisable collateral allocated by seniority, the LGD per seniority class and the PD- and exposure-weighted lifetime LGD from each year onward. The rating year ({ratingYear ?? '—'}) is highlighted.</p>
        <DataTable caption="Project LGD by year" columns={yearColumns} rows={computed.projectLgd} rowKey={(r) => String(r.year)} highlightRow={(r) => r.year === ratingYear} compact emptyMessage="Available once the valuation has run." />
      </section>

      <p className="muted">
        Model lineage: {MODEL_VERSION}. Where this app deliberately differs from the workbook (pooled collateral rows, valuation parameters, DSCR score, PD per period, interest accrual) the relevant page carries a note.
      </p>
    </article>
  );
}
