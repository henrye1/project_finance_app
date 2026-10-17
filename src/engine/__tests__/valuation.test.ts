import { describe, it, expect } from 'vitest';
import { computeValuation, constructionCostDates, cfadsDates, type ValuationInput } from '../valuation';
import { computeValuationAnalysis } from '../valuationAnalysis';
import { solarLoan, sheetSchedule, constructionCosts, cfads } from './fixtures/solarCapital';
import type { ScheduleRow } from '../types';

const schedule: ScheduleRow[] = sheetSchedule.map((r) => ({
  date: r.date,
  opening: r.opening,
  drawdown: r.drawdown,
  interest: r.interest,
  capital: r.payment - r.interest,
  payment: r.payment,
  closing: r.closing,
}));

export const solarValuationInput: ValuationInput = {
  projectStartDate: '2012-12-31',
  projectEndDate: '2036-06-30',
  constructionEndDate: '2014-06-30',
  baseValue: 1,
  clearanceCostPct: 0.01,
  liquidationCostPct: 0.01,
  cfadsFrequency: 'semi-annually',
  constructionCosts,
  cfads,
  ratePerPeriod: 0.08501736996769146,
  loans: [{ id: 1, schedule, disbursements: solarLoan.disbursements }],
  pdPre: 0.02,
  pdPost: 0.01,
};

describe('computeValuation (Project Valuation sheet)', () => {
  const r = computeValuation(solarValuationInput);

  it('builds the semi-annual period grid from project start to end', () => {
    expect(r.periods[0].date).toBe('2012-12-31');
    expect(r.periods[1].date).toBe('2013-06-30');
    expect(r.periods[r.periods.length - 1].date).toBe('2036-06-30');
    expect(r.periods.length).toBe(48);
    expect(r.warnings).toEqual([]);
  });

  it('accumulates construction costs and clearance during construction', () => {
    expect(r.periods[0]).toMatchObject({
      constructionCost: 190272978,
      accumulatedCost: 190272978,
      baseValue: 1,
      discountedValue: 0,
      year: 2012,
    });
    expect(r.periods[0].clearanceCost).toBeCloseTo(1902729.78, 6);
    expect(r.periods[0].projectValue).toBeCloseTo(192175707.78, 6);
    expect(r.periods[0].companyAssetValue).toBeCloseTo(192175707.78, 6);
    expect(r.periods[1]).toMatchObject({ constructionCost: 665521560, accumulatedCost: 855794538 });
    expect(r.periods[1].companyAssetValue).toBeCloseTo(864352483.38, 6);
    expect(r.periods[3].constructionCost).toBe(224397718);
    expect(r.periods[3].accumulatedCost).toBe(1626419910);
    expect(r.periods[3].discountedValue).toBeCloseTo(1642684109.1, 1);
    expect(r.periods[3].projectValue).toBeCloseTo(1642684109.1, 1);
    expect(r.periods[3].companyAssetValue).toBeCloseTo(1642684109.1, 1);
    expect(r.periods[4].constructionCost).toBeNull();
    expect(r.periods[4].accumulatedCost).toBeNull();
    expect(r.periods[4].baseValue).toBeNull();
  });

  it('values the project from discounted cash flows after construction', () => {
    expect(r.periods[4].discountedValue).toBeCloseTo(1782340792.8284202, 1);
    expect(r.periods[4].projectValue).toBeCloseTo(1782340792.8284202, 1);
    expect(r.periods[4].companyAssetValue).toBeCloseTo(1642684110.1, 1);
    expect(r.periods[5].companyAssetValue).toBeCloseTo(1782340792.8284202, 1);
    expect(r.timeline[0].date).toBe('2014-06-30');
    expect(r.timeline[0].freeCashFlow).toBe(0);
    expect(r.timeline[0].projectValue).toBeCloseTo(1642684110.1, 1);
    expect(r.timeline[1].projectValue).toBeCloseTo(1782340792.8284202, 1);
    expect(r.timeline[4].freeCashFlow).toBeCloseTo(129423692.97495937, 3);
    expect(r.timeline[r.timeline.length - 1].date).toBe('2036-06-30');
  });

  it('maps loan drawdowns, repayments and balances onto the grid', () => {
    expect(r.periods[0].drawdowns[0]).toBe(190272978);
    expect(r.periods[0].balances[0]).toBe(190272978);
    expect(r.periods[1].balances[0]).toBe(855794538);
    expect(r.periods[3].balances[0]).toBe(1626419910);
    expect(r.periods[4].drawdowns[0]).toBe(0);
    expect(r.periods[4].repayments[0]).toBeCloseTo(104753737.52282995, 3);
    expect(r.periods[4].capitalRepayments[0]).toBeCloseTo(18400549.38, 3);
    expect(r.periods[4].balances[0]).toBeCloseTo(1608019360.62, 3);
    expect(r.periods[4].afterDebtService).toBeCloseTo(-104753737.52282995, 3);
    expect(r.periods[5].repayments[0]).toBeCloseTo(102349060.29614778, 3);
    expect(r.periods[5].balances[0]).toBeCloseTo(1589618811.24, 3);
    expect(r.periods[47].balances[0]).toBe(0);
    expect(r.periods[1].repayments).toEqual([0, 0, 0, 0, 0]);
  });

  it('assigns the pre-completion PD until construction end and the post PD after', () => {
    expect(r.periods[3].pd).toBe(0.02);
    expect(r.periods[4].pd).toBe(0.01);
  });

  it('derives the annualised rate and the value after construction', () => {
    expect(r.ratePerPeriod).toBe(0.08501736996769146);
    expect(r.annualisedRate).toBeCloseTo(0.17726269313160636, 12);
    expect(r.estValueAfterConstruction).toBeCloseTo(1642684109.1, 1);
  });

  it('keeps construction costs that fall inside a coarser period', () => {
    const annual = computeValuation({ ...solarValuationInput, cfadsFrequency: 'annually' });
    expect(annual.periods.map((p) => p.date).slice(0, 3)).toEqual(['2012-12-31', '2013-12-31', '2014-12-31']);
    expect(annual.periods[2].constructionCost).toBe(224397718);
    expect(annual.periods[2].accumulatedCost).toBe(1626419910);
    expect(annual.periods[3].constructionCost).toBeNull();
  });
});

describe('date grids for Cashflow Details', () => {
  it('construction dates run from project start to construction end at the chosen frequency', () => {
    const monthly = constructionCostDates('2012-12-31', '2014-06-30', 'monthly');
    expect(monthly.length).toBe(19);
    expect(monthly[0]).toBe('2012-12-31');
    expect(monthly[18]).toBe('2014-06-30');
  });

  it('keeps the last partial construction period', () => {
    const annual = constructionCostDates('2012-12-31', '2014-06-30', 'annually');
    expect(annual).toEqual(['2012-12-31', '2013-12-31', '2014-06-30']);
  });

  it('cfads dates run from construction end to project end', () => {
    const d = cfadsDates('2014-06-30', '2036-06-30', 'semi-annually');
    expect(d.length).toBe(45);
    expect(d[0]).toBe('2014-06-30');
    expect(d[44]).toBe('2036-06-30');
  });
});

describe('computeValuationAnalysis (Valuation Analysis sheet)', () => {
  const r = computeValuation(solarValuationInput);
  const va = computeValuationAnalysis(r.periods, 2012, 2036);

  it('has one row per calendar year', () => {
    expect(va.length).toBe(25);
    expect(va[0].year).toBe(2012);
    expect(va[24].year).toBe(2036);
  });

  it('sums repayments and cash flow by year and derives the DSCR', () => {
    expect(va.find((x) => x.year === 2014)!.repayments[0]).toBeCloseTo(104753737.52282995, 3);
    expect(va.find((x) => x.year === 2015)!.repayments[0]).toBeCloseTo(217109236.24270332, 3);
    expect(va.find((x) => x.year === 2012)!.dscr).toBe(0);
    expect(va.find((x) => x.year === 2014)!.dscr).toBe(0);
    expect(va.find((x) => x.year === 2016)!.cfads).toBeCloseTo(129423692.97495937 + 133646941.14380816, 3);
  });

  it('averages the DSCR from each year to the end', () => {
    expect(va.find((x) => x.year === 2017)!.averageDscr).toBeCloseTo(1.6325537896084072, 6);
    expect(va.find((x) => x.year === 2012)!.averageDscr).toBeCloseTo(1.3534906323393556, 6);
  });
});
