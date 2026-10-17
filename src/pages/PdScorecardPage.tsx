import { Fragment } from 'react';
import { glossary, pdScorecardStructure, referenceTables, RISK_RESPONSES, sovereignRatings } from '../data';
import { Field, NumberInput } from '../components/Field';
import { DeviationNote, HelpNote } from '../components/HelpNote';
import { fmtNumber, fmtPct } from '../components/format';
import type { PdSectionResult } from '../engine/pdScorecard';
import type { RiskResponse } from '../engine/types';
import { useDeal } from '../model/dealContext';

type Col = 'pre' | 'post';

function RatingChip({ rating }: { rating: string | null }) {
  if (!rating) return null;
  const cls = rating.toLowerCase().replace(' risk', '').replace(' ', '-');
  return <span className={`rating-chip ${cls}`}>{rating}</span>;
}

export function PdScorecardPage() {
  const { deal, setDeal, computed } = useDeal();
  const pd = computed.pdScorecard;
  const inputs = deal.pdScorecard;
  const phase = deal.projectInformation.phase;
  const activeCol: Col | null = phase === 'Pre-completion Phase' ? 'pre' : phase === 'Post-completion Phase' ? 'post' : null;

  const setAnswer = (id: string, col: Col, value: RiskResponse | null) =>
    setDeal((d) => ({
      ...d,
      pdScorecard: { ...d.pdScorecard, answers: { ...d.pdScorecard.answers, [id]: { ...(d.pdScorecard.answers[id] ?? { pre: null, post: null }), [col]: value } } },
    }));
  const setOfftake = (col: Col, value: number | null) =>
    setDeal((d) => ({ ...d, pdScorecard: { ...d.pdScorecard, offtakePct: { ...d.pdScorecard.offtakePct, [col]: value } } }));
  const setCountry = (value: string | null) => setDeal((d) => ({ ...d, pdScorecard: { ...d.pdScorecard, country: value } }));

  const responsesFor = (id: string) => (referenceTables.responses[id] ?? []).map((r) => r.response);
  const section = (id: string): PdSectionResult => pd.sections.find((s) => s.id === id)!;
  const activeClass = (col: Col) => (activeCol === col ? ' active-phase' : '');

  const groups = Array.from(new Set(pdScorecardStructure.map((s) => s.group)));

  return (
    <article className="page">
      <h1>PD Scorecard</h1>
      <p className="lede">
        Step 5 of 7. Answer each question for the pre-completion and the post-completion view. The phase chosen in Project Information ({phase ?? 'not set yet'}) decides which column gives the final PD.
      </p>

      <section className="sheet">
        <h2>
          <span className="section-code">A1</span>Systemic country risk factors
        </h2>
        <p className="muted">{glossary['A1']}</p>
        <div className="field-grid">
          <Field kind="select" code="A1.1" label="What is the country of risk?" value={inputs.country} options={sovereignRatings.map((s) => s.country)} onChange={setCountry} help={glossary['A1.1']} />
          <Field kind="static" label="Sovereign rating (Moody's)" value={pd.sovereign.rating ?? ''} />
          <div className="field">
            <div className="field-label">
              <span>Sovereign risk grade</span>
            </div>
            <output className="field-input calc" data-testid="sovereign-grade">
              {pd.sovereign.grade ?? ''}
            </output>
          </div>
          <Field kind="static" label="Sovereign PD" value={fmtPct(pd.sovereign.pd, 4)} />
          <Field kind="static" label="A1 score (−NORMSINV of sovereign PD)" value={fmtNumber(pd.sovereign.score, 4)} />
        </div>
      </section>

      <section className="sheet">
        <div className="table-wrap">
          <table className="data-table score-table">
            <caption>Scorecard questions</caption>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Question</th>
                <th className={activeClass('pre')}>Pre-completion response</th>
                <th className="right">Score</th>
                <th className={activeClass('post')}>Post-completion response</th>
                <th className="right">Score</th>
                <th>Selected response ({activeCol === 'pre' ? 'pre' : 'post'}-completion)</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const sections = pdScorecardStructure.filter((s) => s.group === g);
                return (
                  <Fragment key={g}>
                    <tr className="group-row">
                      <td>{g}</td>
                      <td colSpan={6}>{sections[0].groupTitle}</td>
                    </tr>
                    {sections.map((sec) => {
                      const res = section(sec.id);
                      return (
                        <Fragment key={sec.id}>
                          <tr className="section-row">
                            <td>{sec.id}</td>
                            <td>
                              {sec.title} <span className="muted">(weight {fmtPct(sec.weight, 2)})</span>
                            </td>
                            <td className={`right${activeClass('pre')}`}>{res.scorePre === null ? '' : `weighted ${fmtNumber(res.weightedPre, 4)}`}</td>
                            <td className="right">{fmtNumber(res.scorePre, 3)}</td>
                            <td className={`right${activeClass('post')}`}>{res.scorePost === null ? '' : `weighted ${fmtNumber(res.weightedPost, 4)}`}</td>
                            <td className="right">{fmtNumber(res.scorePost, 3)}</td>
                            <td>
                              <RatingChip rating={activeCol === 'pre' ? res.ratingPre : res.ratingPost} />
                            </td>
                          </tr>
                          {sec.kind === 'sovereign' && (
                            <tr>
                              <td>A1.1</td>
                              <td className="question">Country of risk: {inputs.country ?? 'not selected'} (captured above)</td>
                              <td className={activeClass('pre')} />
                              <td className="right">{fmtNumber(res.scorePre, 3)}</td>
                              <td className={activeClass('post')} />
                              <td className="right">{fmtNumber(res.scorePost, 3)}</td>
                              <td className="description">{pd.sovereign.grade ?? ''}</td>
                            </tr>
                          )}
                          {sec.kind === 'dscr' && (
                            <tr>
                              <td>F2.1</td>
                              <td className="question">
                                Debt service coverage ratio covenant <HelpNote text={glossary['F2'] ?? ''} />
                                <DeviationNote>The workbook holds a typed score here (4). This app scores the DSCR from the valuation with the workbook's own Score_DSCR rule for the project type and PPP answer.</DeviationNote>
                              </td>
                              <td className={`right${activeClass('pre')}`}>
                                <span data-testid="dscr-value">{computed.dscr === null ? 'no DSCR yet' : fmtNumber(computed.dscr, 4)}</span>
                              </td>
                              <td className="right" data-testid="dscr-score">
                                {pd.dscrScore ?? ''}
                              </td>
                              <td className={`right${activeClass('post')}`}>{computed.dscr === null ? '' : fmtNumber(computed.dscr, 4)}</td>
                              <td className="right">{pd.dscrScore ?? ''}</td>
                              <td className="description">Average DSCR from the rating year to the end of the project</td>
                            </tr>
                          )}
                          {sec.kind !== 'sovereign' &&
                            sec.kind !== 'dscr' &&
                            sec.questions.map((q) => {
                              if (q.id === 'E2.1') {
                                return (
                                  <tr key={q.id}>
                                    <td>{q.id}</td>
                                    <td className="question">
                                      {q.text} <HelpNote text={glossary[q.id] ?? ''} />
                                    </td>
                                    <td className={activeClass('pre')}>
                                      <NumberInput className="cell-input capture" ariaLabel="E2.1 pre-completion percentage" value={inputs.offtakePct.pre} scale={100} digits={2} onChange={(v) => setOfftake('pre', v)} />
                                    </td>
                                    <td className="right">%</td>
                                    <td className={activeClass('post')}>
                                      <NumberInput className="cell-input capture" ariaLabel="E2.1 post-completion percentage" value={inputs.offtakePct.post} scale={100} digits={2} onChange={(v) => setOfftake('post', v)} />
                                    </td>
                                    <td className="right">%</td>
                                    <td className="description">Portion of output under off-take agreements; scales the E2.2 average (slope {referenceTables.offtake.slope}, intercept {referenceTables.offtake.intercept}).</td>
                                  </tr>
                                );
                              }
                              const a = inputs.answers[q.id] ?? { pre: null, post: null };
                              const qs = res.questionScores[q.id];
                              return (
                                <tr key={q.id}>
                                  <td>{q.id}</td>
                                  <td className="question">
                                    {q.text} <HelpNote text={glossary[q.id] ?? ''} />
                                  </td>
                                  <td className={activeClass('pre')}>
                                    <select className="cell-input choice" aria-label={`${q.id} pre-completion response`} value={a.pre ?? ''} onChange={(e) => setAnswer(q.id, 'pre', (e.target.value || null) as RiskResponse | null)}>
                                      <option value="">Select…</option>
                                      {responsesFor(q.id).map((r) => (
                                        <option key={r} value={r}>
                                          {r}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="right">{qs ? fmtNumber(qs.pre, 0) : ''}</td>
                                  <td className={activeClass('post')}>
                                    <select className="cell-input choice" aria-label={`${q.id} post-completion response`} value={a.post ?? ''} onChange={(e) => setAnswer(q.id, 'post', (e.target.value || null) as RiskResponse | null)}>
                                      <option value="">Select…</option>
                                      {responsesFor(q.id).map((r) => (
                                        <option key={r} value={r}>
                                          {r}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="right">{qs ? fmtNumber(qs.post, 0) : ''}</td>
                                  <td className="description">{qs ? (activeCol === 'pre' ? qs.description.pre : qs.description.post) : ''}</td>
                                </tr>
                              );
                            })}
                        </Fragment>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Total weighted score</td>
                <td className={`right${activeClass('pre')}`} colSpan={2}>
                  {fmtNumber(pd.totalPre, 4)}
                </td>
                <td className={`right${activeClass('post')}`} colSpan={2}>
                  {fmtNumber(pd.totalPost, 4)}
                </td>
                <td />
              </tr>
              <tr>
                <td colSpan={2}>Probability of default</td>
                <td className={`right${activeClass('pre')}`} colSpan={2} data-testid="pd-pre">
                  {fmtPct(pd.pdPre, 2)}
                </td>
                <td className={`right${activeClass('post')}`} colSpan={2} data-testid="pd-post">
                  {fmtPct(pd.pdPost, 2)}
                </td>
                <td />
              </tr>
              <tr>
                <td colSpan={2}>Risk grade</td>
                <td className={`right${activeClass('pre')}`} colSpan={2} data-testid="grade-pre">
                  {pd.gradePre ?? ''}
                </td>
                <td className={`right${activeClass('post')}`} colSpan={2} data-testid="grade-post">
                  {pd.gradePost ?? ''}
                </td>
                <td />
              </tr>
              <tr>
                <td colSpan={2}>Overall rating</td>
                <td className={`right${activeClass('pre')}`} colSpan={2}>
                  <RatingChip rating={pd.overallRatingPre} />
                </td>
                <td className={`right${activeClass('post')}`} colSpan={2}>
                  <RatingChip rating={pd.overallRatingPost} />
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="muted">
          PD = 1 / (1 + e^(α + β × score)) with α = {referenceTables.pdCalibration.alpha} and β = {referenceTables.pdCalibration.beta}. Unanswered questions score 1 (very high risk), as in the workbook. Responses: {RISK_RESPONSES.join(', ')}.
        </p>
        {pd.warnings.length > 0 && (
          <ul className="field-error">
            {pd.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
