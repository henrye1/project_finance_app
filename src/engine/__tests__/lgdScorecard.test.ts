import { describe, it, expect } from 'vitest';
import { computeLgdScorecard, type LgdScorecardInput } from '../lgdScorecard';

export const solarLgdInput: LgdScorecardInput = {
  phase: 'Post-completion Phase',
  projectType: 'Energy',
  country: 'SOUTH AFRICA',
  answers: { H2: 'Moderate Risk', 'H3.1': 'Low Risk', 'H3.2': 'Low Risk', 'H4.1': 'Low Risk' },
  canRealise: 'Yes',
};

describe('computeLgdScorecard (LGD Scorecard sheet)', () => {
  const r = computeLgdScorecard(solarLgdInput);

  it('scores the questionnaire', () => {
    expect(r.phaseScore).toBe(4);
    expect(r.questionScores).toEqual({ H2: 3, 'H3.1': 4, 'H3.2': 4, 'H4.1': 4 });
    expect(r.score).toBeCloseTo(3.825, 10);
    expect(r.warnings).toEqual([]);
  });

  it('derives the "current" haircut from the fitted line', () => {
    expect(r.current.slope).toBeCloseTo(-0.11666666666666664, 12);
    expect(r.current.intercept).toBeCloseTo(1.1166666666666667, 12);
    expect(r.current.haircut).toBeCloseTo(0.6704166666666668, 10);
    expect(r.current.recoveryRate).toBeCloseTo(0.32958333333333323, 10);
  });

  it('derives the "new" haircut from volatility, scaling, country and construction factors', () => {
    expect(r.factors.volatility).toBe(0.1626);
    expect(r.factors.scaling).toBeCloseTo(2.741308269785451, 12);
    expect(r.factors.country).toBeCloseTo(1.0920897284533648, 10);
    expect(r.factors.haircutFactor).toBeCloseTo(0.48678449860340106, 10);
    expect(r.factors.constructionAdjustment).toBe(1);
    expect(r.factors.recoveryCosts).toBe(0.03);
    expect(r.haircut).toBeCloseTo(0.516784498603401, 10);
    expect(r.recoveryRate).toBeCloseTo(0.48321550139659897, 10);
  });

  it('uses the pre-completion adjustment and costs before completion', () => {
    const pre = computeLgdScorecard({ ...solarLgdInput, phase: 'Pre-completion Phase' });
    expect(pre.phaseScore).toBe(1);
    expect(pre.factors.constructionAdjustment).toBe(1.25);
    expect(pre.factors.recoveryCosts).toBe(0.05);
    expect(pre.haircut).toBeCloseTo(Math.min(1.25 * 0.48678449860340106 + 0.05, 1), 10);
  });

  it('caps the haircut at 100% and forces it when the project cannot be realised', () => {
    const no = computeLgdScorecard({ ...solarLgdInput, canRealise: 'No' });
    expect(no.current.haircut).toBe(1);
    expect(no.current.recoveryRate).toBe(0);
    const volatile = computeLgdScorecard({ ...solarLgdInput, projectType: 'Chemicals, Oil & Gas', phase: 'Pre-completion Phase', country: 'Angola' });
    expect(volatile.haircut).toBeLessThanOrEqual(1);
  });

  it('warns and scores 1 for unanswered questions, null factors for unknown sector or country', () => {
    const r2 = computeLgdScorecard({ ...solarLgdInput, answers: { ...solarLgdInput.answers, H2: null }, projectType: null, country: null });
    expect(r2.questionScores.H2).toBe(1);
    expect(r2.factors.volatility).toBeNull();
    expect(r2.factors.country).toBeNull();
    expect(r2.haircut).toBeNull();
    expect(r2.recoveryRate).toBeNull();
    expect(r2.warnings.length).toBeGreaterThanOrEqual(3);
  });
});
