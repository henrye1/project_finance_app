import { glossary, referenceTables } from '../data';
import { Field } from '../components/Field';
import { fmtNumber, fmtPct } from '../components/format';
import { LGD_QUESTIONS, PHASE_WEIGHT, type LgdQuestionId } from '../engine/lgdScorecard';
import type { RiskResponse, YesNo } from '../engine/types';
import { useDeal } from '../model/dealContext';

function Stat({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd data-testid={testId}>{value}</dd>
    </>
  );
}

export function LgdScorecardPage() {
  const { deal, setDeal, computed } = useDeal();
  const lgd = computed.lgdScorecard;
  const inputs = deal.lgdScorecard;
  const phase = deal.projectInformation.phase;
  const setAnswer = (id: LgdQuestionId, value: RiskResponse | null) =>
    setDeal((d) => ({ ...d, lgdScorecard: { ...d.lgdScorecard, answers: { ...d.lgdScorecard.answers, [id]: value } } }));
  const setCanRealise = (value: YesNo | null) => setDeal((d) => ({ ...d, lgdScorecard: { ...d.lgdScorecard, canRealise: value } }));

  return (
    <article className="page">
      <h1>LGD Scorecard</h1>
      <p className="lede">Step 6 of 7. Five questions on how much of the project can be recovered after a default. The recovery rate from the "New LGD" block drives the project collateral in the results.</p>

      <section className="sheet">
        <div className="field-grid">
          <Field kind="static" code="H1" label="Construction or post-construction phase?" value={phase ?? 'not set in Project Information'} suffix={`score ${lgd.phaseScore} × ${PHASE_WEIGHT}`} />
          {LGD_QUESTIONS.map((q) => (
            <Field
              key={q.id}
              kind="select"
              code={q.id}
              label={q.text}
              value={inputs.answers[q.id]}
              options={(referenceTables.responses[q.id] ?? []).map((r) => r.response)}
              onChange={(v) => setAnswer(q.id, v as RiskResponse | null)}
              help={glossary[q.id]}
              suffix={lgd.questionScores[q.id] === null ? '' : `score ${lgd.questionScores[q.id]} × ${q.weight}`}
            />
          ))}
          <Field kind="select" code="H5" label="In the event of default, can a portion of the project value (NPV of project cash flows) be realised or recovered?" value={inputs.canRealise} options={['Yes', 'No']} onChange={(v) => setCanRealise(v as YesNo | null)} help={glossary['H5']} />
        </div>
        {lgd.warnings.length > 0 && (
          <ul className="field-error">
            {lgd.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
      </section>

      <div className="results-grid">
        <section className="sheet">
          <h2>Current LGD</h2>
          <p className="muted">Questionnaire score mapped to a haircut on a straight line through (score 4, haircut 65%) and (score 1, haircut 100%). Informational; the workbook uses the "New LGD" block for the results.</p>
          <dl className="kv">
            <Stat label="Weighted score" value={fmtNumber(lgd.score, 4)} />
            <Stat label="Slope" value={fmtNumber(lgd.current.slope, 6)} />
            <Stat label="Intercept" value={fmtNumber(lgd.current.intercept, 6)} />
            <Stat label="Final haircut" value={fmtPct(lgd.current.haircut)} testId="lgd-current-haircut" />
            <Stat label="Recovery rate" value={fmtPct(lgd.current.recoveryRate)} />
          </dl>
        </section>

        <section className="sheet">
          <h2>New LGD</h2>
          <p className="muted">Haircut = min(construction adjustment × volatility × scaling × country factor + recovery costs, 100%).</p>
          <dl className="kv">
            <Stat label="Industry" value={deal.projectInformation.projectType ?? ''} />
            <Stat label="Description" value={phase ?? ''} />
            <Stat label="Volatility" value={fmtNumber(lgd.factors.volatility, 4)} />
            <Stat label="Scaling" value={fmtNumber(lgd.factors.scaling, 6)} />
            <Stat label="Insolvency regime score" value={fmtNumber(lgd.factors.insolvencyScore, 4)} />
            <Stat label="Country factor" value={fmtNumber(lgd.factors.country, 4)} testId="lgd-country-factor" />
            <Stat label="Haircut (volatility × scaling × country)" value={fmtNumber(lgd.factors.haircutFactor, 6)} />
            <Stat label="Construction adjustment" value={fmtNumber(lgd.factors.constructionAdjustment, 2)} />
            <Stat label="Recovery costs" value={fmtPct(lgd.factors.recoveryCosts)} />
            <Stat label="Final haircut" value={fmtPct(lgd.haircut)} testId="lgd-haircut" />
            <Stat label="Recovery rate" value={fmtPct(lgd.recoveryRate)} testId="lgd-recovery" />
          </dl>
        </section>
      </div>
    </article>
  );
}
