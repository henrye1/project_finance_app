import { recoveryUnderRestructure as grid } from '../data';
import { Field } from '../components/Field';
import { fmtNumber, fmtPct } from '../components/format';
import { useDeal } from '../model/dealContext';

type Option = 'a)' | 'b)' | 'c)';

export function RecoveryUnderRestructurePage() {
  const { deal, setDeal } = useDeal();
  const answers = deal.recoveryUnderRestructure;
  const setAnswer = (name: string, value: Option | null) => setDeal((d) => ({ ...d, recoveryUnderRestructure: { ...d.recoveryUnderRestructure, [name]: value } }));
  const complete = grid.categories.every((c) => answers[c.name]);
  const score = complete ? grid.categories.reduce((s, c) => s + c.weight * (grid.scores[answers[c.name] as string] ?? 0), 0) : null;

  return (
    <article className="page">
      <h1>Recovery Under Restructure</h1>
      <p className="lede">A qualitative grid for renewable-energy projects: pick the description that fits best in each category. The weighted score is informational and does not feed the PD or LGD results.</p>
      <section className="sheet">
        <dl className="kv" style={{ maxWidth: '24rem' }}>
          <dt>Weighted score (1 = strongest, 3 = weakest)</dt>
          <dd data-testid="restructure-score">{score === null ? 'answer every category' : fmtNumber(score, 2)}</dd>
        </dl>
      </section>
      {grid.categories.map((c) => (
        <section className="sheet" key={c.name}>
          <h2>
            {c.name} <span className="muted">(weight {fmtPct(c.weight, 0)})</span>
          </h2>
          <div style={{ maxWidth: '20rem' }}>
            <Field kind="select" label={c.name} value={answers[c.name] ?? null} options={['a)', 'b)', 'c)']} onChange={(v) => setAnswer(c.name, v as Option | null)} />
          </div>
          <div className="results-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            {(['a)', 'b)', 'c)'] as Option[]).map((o) => (
              <div key={o} className={answers[c.name] === o ? 'deviation' : undefined} style={{ whiteSpace: 'pre-line', fontSize: '0.86rem' }}>
                <strong>{o}</strong> score {grid.scores[o]}
                <br />
                {c.options[o]}
              </div>
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
