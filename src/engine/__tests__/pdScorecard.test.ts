import { describe, it, expect } from 'vitest';
import { computePdScorecard, scoreDscr, ratingForScore, gradeForPd, lookupSovereign, type PdScorecardInput } from '../pdScorecard';
import { pdAnswers } from './fixtures/solarCapital';
import type { RiskResponse } from '../types';

const answers = Object.fromEntries(
  Object.entries(pdAnswers).map(([k, v]) => [k, { pre: v.pre as RiskResponse | null, post: v.post as RiskResponse | null }]),
);

export const solarPdInput: PdScorecardInput = {
  phase: 'Post-completion Phase',
  country: 'SOUTH AFRICA',
  projectType: 'Energy',
  ppp: 'No',
  offtakePct: { pre: 0, post: 1 },
  answers,
  dscr: 1.6325537896084072,
};

describe('computePdScorecard (PD Scorecard sheet)', () => {
  const r = computePdScorecard(solarPdInput);

  it('derives the sovereign rating, grade, PD and A1 score', () => {
    expect(r.sovereign.rating).toBe('Ba2');
    expect(r.sovereign.grade).toBe('RW15');
    expect(r.sovereign.pd).toBeCloseTo(0.012797155934034719, 12);
    expect(r.sovereign.score).toBeCloseTo(2.232312567066831, 6);
  });

  it('scores the DSCR covenant with the workbook rule', () => {
    expect(r.dscrScore).toBe(4);
  });

  it('reproduces the section scores', () => {
    const s = (id: string) => r.sections.find((x) => x.id === id)!;
    expect(s('A2').scorePre).toBe(3.75);
    expect(s('A2').scorePost).toBe(3.5);
    expect(s('C').scorePre).toBeCloseTo(3.4444444444444446, 10);
    expect(s('C').scorePost).toBe(4);
    expect(s('E2').scorePre).toBe(1);
    expect(s('E2').scorePost).toBe(3.75);
    expect(s('G1').scorePre).toBe(1.75);
    expect(s('G1').scorePost).toBe(3.25);
    expect(s('A1').ratingPost).toBe('Moderate Risk');
    expect(s('E1').ratingPost).toBe('Moderate Risk');
    expect(s('C').ratingPost).toBe('Low Risk');
    expect(s('A2').questionScores['A2.3'].post).toBe(3);
    expect(s('A2').questionScores['A2.3'].description.post).toContain('Government has incentive');
  });

  it('reproduces totals, PDs and grades for both phases', () => {
    expect(r.totalPre).toBeCloseTo(2.8895283440640265, 6);
    expect(r.totalPost).toBeCloseTo(3.2410700107306933, 6);
    expect(r.pdPre).toBeCloseTo(0.02284943674824239, 8);
    expect(r.pdPost).toBeCloseTo(0.007654447841321495, 8);
    expect(r.gradePre).toBe('RW17');
    expect(r.gradePost).toBe('RW14');
    expect(r.overallRatingPre).toBe('Moderate Risk');
    expect(r.overallRatingPost).toBe('Low Risk');
  });

  it('selects the final values from the phase', () => {
    expect(r.finalPd).toBeCloseTo(0.007654447841321495, 8);
    expect(r.finalGrade).toBe('RW14');
    expect(r.finalTotal).toBeCloseTo(3.2410700107306933, 6);
    expect(r.warnings).toEqual([]);
    const pre = computePdScorecard({ ...solarPdInput, phase: 'Pre-completion Phase' });
    expect(pre.finalGrade).toBe('RW17');
  });

  it('scores the DSCR per industry and PPP', () => {
    expect(scoreDscr('Energy', 'No', 1.6)).toBe(4);
    expect(scoreDscr('Energy', 'No', 1.58)).toBe(3);
    expect(scoreDscr('Energy', 'No', 1.0)).toBe(1);
    expect(scoreDscr('Chemicals, Oil & Gas', 'No', 1.7)).toBe(3);
    expect(scoreDscr('Infrastructure', 'No', 1.1)).toBe(3);
    expect(scoreDscr('Mining', 'No', 1.15)).toBe(3);
    expect(scoreDscr('Energy', 'Yes', 1.1)).toBe(3);
    expect(scoreDscr(null, 'No', 2)).toBe(1);
  });

  it('maps scores to risk bands and PDs to grades', () => {
    expect(ratingForScore(1)).toBe('Very High Risk');
    expect(ratingForScore(1.5)).toBe('High Risk');
    expect(ratingForScore(2.232)).toBe('Moderate Risk');
    expect(ratingForScore(3.5)).toBe('Low Risk');
    expect(gradeForPd(0.007654447841321495)).toBe('RW14');
    expect(gradeForPd(0.0000001)).toBe('RW01');
    expect(gradeForPd(0.5)).toBe('RW25');
  });

  it('looks up sovereigns case-insensitively', () => {
    expect(lookupSovereign('South Africa').grade).toBe('RW15');
    expect(lookupSovereign('Nowhere').grade).toBeNull();
  });

  it('falls back to score 1 with warnings when DSCR or answers are missing', () => {
    const r2 = computePdScorecard({ ...solarPdInput, dscr: null, answers: { ...answers, 'A2.1': { pre: null, post: null } } });
    expect(r2.dscrScore).toBe(1);
    expect(r2.sections.find((s) => s.id === 'A2')!.questionScores['A2.1'].post).toBe(1);
    expect(r2.warnings.some((w) => /DSCR/.test(w))).toBe(true);
    expect(r2.warnings.some((w) => /A2\.1/.test(w))).toBe(true);
    expect(r2.finalPd).not.toBeNull();
  });

  it('returns null results when the country or phase is missing', () => {
    const r3 = computePdScorecard({ ...solarPdInput, country: null, phase: null });
    expect(r3.sovereign.score).toBeNull();
    expect(r3.totalPost).toBeNull();
    expect(r3.finalPd).toBeNull();
    expect(r3.warnings.length).toBeGreaterThan(0);
  });
});
