import { describe, it, expect } from 'vitest';
import { collateralAllocation, computeProjectLgd, type ProjectLgdInput } from '../projectLgd';
import { computeValuation } from '../valuation';
import { solarValuationInput } from './valuation.test';
import { externalPdByYear } from './fixtures/solarCapital';

describe('collateralAllocation (workbook VBA Collateral_Allocation)', () => {
  it('gives senior tranches first claim and juniors the remainder', () => {
    expect(collateralAllocation(100, 1, [1, 2], [100, 50], 120)).toBe(100);
    expect(collateralAllocation(50, 2, [1, 2], [100, 50], 120)).toBe(20);
  });

  it('shares pro rata among pari-passu tranches and never exceeds exposure', () => {
    expect(collateralAllocation(60, 1, [1, 1], [60, 40], 50)).toBeCloseTo(30, 10);
    expect(collateralAllocation(40, 1, [1, 1], [60, 40], 50)).toBeCloseTo(20, 10);
    expect(collateralAllocation(60, 1, [1, 1], [60, 40], 500)).toBe(60);
  });

  it('ignores loans without a rank', () => {
    expect(collateralAllocation(100, 1, [1, null], [100, 50], 120)).toBe(100);
  });
});

describe('computeProjectLgd (Project LGD New sheet)', () => {
  const valuation = computeValuation(solarValuationInput);
  const input: ProjectLgdInput = {
    periods: valuation.periods,
    startYear: 2012,
    endYear: 2036,
    loans: [{ slot: 0, seniority: 'Senior Secured' }],
    recoveryRate: 0.48321550139659897,
    liquidationCostPct: 0.01,
    annualisedRate: valuation.annualisedRate,
    pooledCollateral: 33724938,
    loanCollateral: [0, 0, 0, 0, 0],
    pdOverride: externalPdByYear,
  };
  const r = computeProjectLgd(input);
  const y = (year: number) => r.years.find((x) => x.year === year)!;

  it('has one row per year with exposures at year end and the asset value', () => {
    expect(r.years.length).toBe(25);
    expect(y(2012).exposures[0]).toBe(190272978);
    expect(y(2013).exposures[0]).toBe(1402022192);
    expect(y(2014).exposures[0]).toBeCloseTo(1608019360.62, 3);
    expect(y(2012).projectValue).toBeCloseTo(192175707.78, 2);
    expect(y(2013).projectValue).toBeCloseTo(1416042413.92, 2);
    expect(y(2036).exposures[0]).toBe(0);
  });

  it('allocates project and additional collateral', () => {
    expect(y(2012).projectCollateral).toBeCloseTo(91933658.181247398, 3);
    expect(y(2012).projectAllocated[0]).toBeCloseTo(91933658.181247398, 3);
    expect(y(2013).projectAllocated[0]).toBeCloseTo(677411108.59079111, 2);
    expect(y(2012).additionalGross).toBe(33724938);
    expect(y(2012).additionalRealisable).toBeCloseTo(33387688.62, 6);
    expect(y(2012).additionalAllocated[0]).toBeCloseTo(33387688.62, 3);
  });

  it('derives the LGD per seniority class', () => {
    expect(y(2012).lgdByClass['Senior Secured']).toBeCloseTo(0.44053289501470194, 9);
    expect(y(2013).lgdByClass['Senior Secured']).toBeCloseTo(0.56935598621907402, 9);
    expect(y(2014).lgdByClass['Senior Secured']).toBeCloseTo(0.56725096424697008, 9);
    expect(y(2012).lgdByClass['Mezzanine']).toBeNull();
    expect(y(2036).lgdByClass['Senior Secured']).toBeNull();
  });

  it('derives the PD-and-exposure weighted lifetime LGD', () => {
    expect(y(2012).pd).toBeCloseTo(0.029353106208183811, 12);
    expect(y(2012).lifetimeLgdByClass['Senior Secured']).toBeCloseTo(0.36156372107105816, 6);
    expect(y(2013).lifetimeLgdByClass['Senior Secured']).toBeCloseTo(0.35871188138904886, 6);
    expect(y(2014).lifetimeLgdByClass['Senior Secured']).toBeCloseTo(0.28233571502304877, 6);
  });

  it('uses the valuation PD path when no override is given', () => {
    const r2 = computeProjectLgd({ ...input, pdOverride: undefined });
    expect(y(2012).pd).not.toBe(r2.years[0].pd);
    expect(r2.years[0].pd).toBe(0.02);
    expect(r2.years.find((x) => x.year === 2015)!.pd).toBe(0.01);
  });

  it('handles two pari-passu loans of different classes', () => {
    const periods = valuation.periods.map((p) => ({ ...p, balances: [p.balances[0] * 0.6, p.balances[0] * 0.4, 0, 0, 0] }));
    const r3 = computeProjectLgd({
      ...input,
      periods,
      loans: [
        { slot: 0, seniority: 'Senior Secured' },
        { slot: 1, seniority: 'Mezzanine' },
      ],
      ranksOverride: [1, 1],
    });
    const row = r3.years.find((x) => x.year === 2013)!;
    expect(row.projectAllocated[0]).toBeCloseTo(row.projectCollateral * 0.6, 3);
    expect(row.projectAllocated[1]).toBeCloseTo(row.projectCollateral * 0.4, 3);
    expect(row.projectAllocated[0]).toBeLessThanOrEqual(row.exposures[0]);
    expect(row.lgdByClass['Senior Secured']).toBeCloseTo(row.lgdByClass['Mezzanine']!, 9);
    expect(row.lgdByClass['Subordinated']).toBeNull();
  });

  it('leaves only the one-year time-value loss when over-collateralised (sheet formula)', () => {
    const r4 = computeProjectLgd({ ...input, pooledCollateral: 5e9 });
    expect(y(2013).lgdByClass['Senior Secured']).toBeGreaterThan(0.2);
    expect(r4.years.find((x) => x.year === 2013)!.lgdByClass['Senior Secured']).toBeCloseTo(1 - 1 / (1 + valuation.annualisedRate), 10);
  });

  it('returns nulls and a warning without a recovery rate', () => {
    const r5 = computeProjectLgd({ ...input, recoveryRate: null });
    expect(r5.warnings.length).toBeGreaterThan(0);
    expect(r5.years[0].lgdByClass['Senior Secured']).toBeNull();
  });
});
