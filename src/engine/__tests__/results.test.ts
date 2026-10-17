import { describe, it, expect } from 'vitest';
import { computeResults } from '../results';
import { computeAll } from '../compute';
import { emptyDeal } from '../../model/deal';
import { solarCapitalDeal } from '../../model/exampleDeal';
import type { ProjectLgdYear } from '../projectLgd';

const lgdYear: ProjectLgdYear = {
  year: 2017,
  date: '2017-12-31',
  exposures: [1429144231.97, 0, 0, 0, 0],
  projectValue: 0,
  projectCollateral: 0,
  projectAllocated: [0, 0, 0, 0, 0],
  additionalGross: 0,
  additionalRealisable: 0,
  additionalAllocated: [0, 0, 0, 0, 0],
  lgdByClass: { 'Senior Secured': 0.2960033502561854, 'Senior Unsecured': null, Mezzanine: null, Subordinated: null, Other: null },
  pd: 0.0076,
  lifetimeLgdByClass: { 'Senior Secured': 0.18947256261401915, 'Senior Unsecured': null, Mezzanine: null, Subordinated: null, Other: null },
};

describe('computeResults (Results sheet)', () => {
  const r = computeResults({
    ratingDate: '2017-12-31',
    projectEndDate: '2036-06-30',
    finalPd: 0.007654447841321495,
    lgdYear,
    recoveryRate: 0.48321550139659897,
  });

  it('lists 12-month and lifetime LGD per seniority class floored at 1%', () => {
    expect(r.lgdTable[0]).toMatchObject({ seniority: 'Senior Secured' });
    expect(r.lgdTable[0].twelveMonth).toBeCloseTo(0.2960033502561854, 10);
    expect(r.lgdTable[0].lifetime).toBeCloseTo(0.18947256261401915, 10);
    expect(r.lgdTable[1]).toEqual({ seniority: 'Senior Unsecured', twelveMonth: null, lifetime: null });
    expect(r.lgdTable.length).toBe(5);
    expect(r.recoveryRate).toBeCloseTo(0.48321550139659897, 10);
  });

  it('reproduces the capital calculation', () => {
    const c = r.capital;
    expect(c.pd).toBeCloseTo(0.007654447841321495, 12);
    expect(c.downturnLgd).toBeCloseTo(0.25431475760489763, 10);
    expect(c.remainingMaturity).toBe(5);
    expect(c.correlation).toBeCloseTo(0.20184026426772828, 10);
    expect(c.maturityAdjustment).toBeCloseTo(0.14855922807129834, 10);
    expect(c.k).toBeCloseTo(0.05174300785859024, 7);
    expect(c.rwa).toBeCloseTo(0.6855948541263207, 6);
    expect(c.capital).toBeCloseTo(0.07274161402280263, 6);
  });

  it('clips the remaining maturity between 1 and 5 years', () => {
    expect(computeResults({ ratingDate: '2017-12-31', projectEndDate: '2018-03-31', finalPd: 0.01, lgdYear, recoveryRate: 0.5 }).capital.remainingMaturity).toBe(1);
    expect(computeResults({ ratingDate: '2017-12-31', projectEndDate: '2020-06-30', finalPd: 0.01, lgdYear, recoveryRate: 0.5 }).capital.remainingMaturity).toBeCloseTo(2.5, 10);
  });

  it('applies the 1% LGD floor when the lifetime LGD is missing', () => {
    const r2 = computeResults({ ratingDate: '2017-12-31', projectEndDate: '2036-06-30', finalPd: 0.01, lgdYear: undefined, recoveryRate: null });
    expect(r2.lgdTable[0]).toEqual({ seniority: 'Senior Secured', twelveMonth: null, lifetime: null });
    expect(r2.capital.downturnLgd).toBeCloseTo(0.92 * 0.01 + 0.08, 12);
  });

  it('returns null capital numbers without a PD', () => {
    const r3 = computeResults({ ratingDate: null, projectEndDate: null, finalPd: null, lgdYear: undefined, recoveryRate: null });
    expect(r3.capital.k).toBeNull();
    expect(r3.capital.remainingMaturity).toBeNull();
  });
});

describe('computeAll', () => {
  it('does not throw on an empty deal and reports warnings and empty steps', () => {
    const c = computeAll(emptyDeal());
    expect(c.warnings.length).toBeGreaterThan(0);
    expect(c.results.capital.k).toBeNull();
    expect(c.valuation).toBeNull();
    expect(c.stepStatus.projectInformation).toBe('empty');
    expect(c.stepStatus.results).toBe('empty');
  });

  it('reproduces the headline numbers for the Solar Capital example', () => {
    const sheetLike = structuredClone(solarCapitalDeal);
    sheetLike.projectInformation.liquidationCostPct = 0.01; // the sheet hard-codes 1% on its valuation sheet
    sheetLike.projectInformation.pooledCollateral[0].amount = null; // the sheet's SUM skips the first row
    const c = computeAll(sheetLike);
    expect(c.warnings).toEqual([]);
    expect(c.pdScorecard.finalPd).toBeCloseTo(0.007654447841321495, 8);
    expect(c.pdScorecard.finalGrade).toBe('RW14');
    expect(c.lgdScorecard.recoveryRate).toBeCloseTo(0.48321550139659897, 8);
    expect(c.valuationAnalysis.find((r) => r.year === 2017)!.averageDscr).toBeCloseTo(1.63255, 3);
    expect(c.projectLgd.find((y) => y.year === 2012)!.lgdByClass['Senior Secured']).toBeCloseTo(0.44053289501470194, 6);
    expect(c.results.lgdTable[0].twelveMonth).toBeCloseTo(0.2960033502561854, 3);
    expect(c.results.capital.remainingMaturity).toBe(5);
    expect(Object.values(c.stepStatus).every((s) => s === 'complete')).toBe(true);
  });

  it('marks steps partial when some inputs exist', () => {
    const d = emptyDeal();
    d.projectInformation.dealName = 'X';
    const c = computeAll(d);
    expect(c.stepStatus.projectInformation).toBe('partial');
  });
});
