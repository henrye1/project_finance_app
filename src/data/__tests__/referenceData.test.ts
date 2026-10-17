import { describe, it, expect } from 'vitest';
import {
  referenceTables as rt,
  sovereignRatings,
  pdScorecardStructure,
  glossary,
  recoveryUnderRestructure,
} from '..';

describe('reference data extracted from the workbook', () => {
  it('has PD calibration', () => {
    expect(rt.pdCalibration.alpha).toBeCloseTo(-5.36038804, 8);
    expect(rt.pdCalibration.beta).toBeCloseTo(3.154875549, 8);
  });

  it('has off-take slope and intercept', () => {
    expect(rt.offtake).toEqual({ slope: 0.75, intercept: 1 });
  });

  it('has Energy volatility', () => {
    expect(rt.sectors.find((s) => s.name === 'Energy')!.volatility).toBe(0.1626);
    expect(rt.sectors.map((s) => s.name)).toEqual([
      'Chemicals, Oil & Gas',
      'Infrastructure',
      'Telecoms',
      'Mining',
      'Energy',
      'Other',
    ]);
  });

  it('has South Africa insolvency score', () => {
    expect(rt.insolvencyScores['South Africa']).toBeCloseTo(1.843243243243243, 12);
    expect(Object.keys(rt.insolvencyScores).length).toBe(179);
  });

  it('A2.1 responses', () => {
    expect(rt.responses['A2.1'].map((r) => [r.response, r.score])).toEqual([
      ['Low Risk', 4],
      ['High Risk', 1],
    ]);
    expect(rt.responses['A2.1'][0].description).toBe('No');
  });

  it('normalises LGD question ids', () => {
    expect(rt.responses['H3.1'].length).toBe(3);
    expect(rt.responses['H4.1'].map((r) => r.score)).toEqual([4, 1]);
    expect(rt.responses['H2'].length).toBe(4);
  });

  it('has construction phase parameters', () => {
    expect(rt.construction).toEqual({
      pre: { recoveryCosts: 0.05, adjustment: 1.25 },
      post: { recoveryCosts: 0.03, adjustment: 1 },
    });
  });

  it('has score bands and capital structure', () => {
    expect(rt.scoreBands.map((b) => b.rating)).toEqual([
      'Very High Risk',
      'High Risk',
      'Moderate Risk',
      'Low Risk',
    ]);
    expect(rt.capitalStructure).toEqual([
      { seniority: 'Senior Secured', rank: 1 },
      { seniority: 'Senior Unsecured', rank: 2 },
      { seniority: 'Mezzanine', rank: 3 },
      { seniority: 'Subordinated', rank: 4 },
      { seniority: 'Other', rank: 5 },
    ]);
  });

  it('RW15 fitted pd and grade band', () => {
    const g = rt.riskGrades.find((x) => x.grade === 'RW15')!;
    expect(g.pdFitted).toBeCloseTo(0.012797155934034719, 12);
    expect(g.pdLower).toBe(0.01076);
    expect(rt.riskGrades.length).toBe(28);
  });

  it('maps Moody\'s Ba2 to RW15', () => {
    expect(rt.moodysMap.find((m) => m.moodys === 'Ba2')!.grade).toBe('RW15');
  });

  it('has the LGD scaling factor', () => {
    expect(rt.lgdScaling).toBeCloseTo(2.741308269785451, 12);
  });

  it('weights sum to 1', () => {
    expect(pdScorecardStructure.reduce((s, x) => s + x.weight, 0)).toBeCloseTo(1, 10);
    expect(pdScorecardStructure.map((s) => s.id)).toEqual([
      'A1', 'A2', 'B', 'C', 'D1', 'D2', 'D3', 'E1', 'E2', 'E3', 'E4', 'F1', 'F2', 'G1',
    ]);
    const c = pdScorecardStructure.find((s) => s.id === 'C')!;
    expect(c.questions.map((q) => q.id)).toEqual([
      'C1.1.1', 'C1.1.2', 'C1.1.3', 'C1.2', 'C1.3', 'C1.4', 'C1.5.1', 'C1.5.2', 'C1.6',
    ]);
    expect(c.questions[3].text).toContain('Experience and reputation');
  });

  it('sovereign SA is Ba2', () => {
    expect(sovereignRatings.find((r) => r.country === 'SOUTH AFRICA')!.rating).toBe('Ba2');
    expect(sovereignRatings.length).toBeGreaterThan(130);
  });

  it('has glossary text for the rating date', () => {
    expect(glossary['PROJECT RATING DATE']).toContain('evaluation / rating date');
    expect(glossary['A2.1']).toContain('multiple jurisdictions');
    expect(glossary['Facility Amount']).toContain('capital balance at the original commencement');
    expect(glossary['FUNDING DETAILS:']).toMatch(/^This section captures the funding details/);
  });

  it('has the restructure grid', () => {
    expect(recoveryUnderRestructure.categories.map((c) => c.weight)).toEqual([
      0.15, 0.1, 0.05, 0.1, 0.25, 0.35,
    ]);
    expect(recoveryUnderRestructure.categories[0].name).toBe('Information Quality');
    expect(recoveryUnderRestructure.categories[0].options['a)']).toContain('Solar and Wind');
  });
});
