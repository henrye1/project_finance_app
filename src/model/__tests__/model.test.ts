import { describe, it, expect } from 'vitest';
import { emptyDeal } from '../deal';
import { solarCapitalDeal, solarCapitalDealFactory } from '../exampleDeal';
import { validateDeal } from '../validation';
import { exportDealJson, importDealJson, loadDeal, saveDeal, STORAGE_KEY } from '../storage';

describe('validateDeal', () => {
  it('lists required fields for an empty deal', () => {
    const errors = validateDeal(emptyDeal());
    const paths = errors.map((e) => e.path);
    expect(paths).toContain('projectInformation.dealName');
    expect(paths).toContain('projectInformation.ratingDate');
    expect(paths).toContain('projectInformation.projectStartDate');
    expect(paths).toContain('cashflowDetails.discountRatePerPeriod');
    expect(paths).toContain('loans.0.facilityAmount');
    expect(paths).toContain('pdScorecard.country');
  });

  it('accepts the example deal', () => {
    expect(validateDeal(solarCapitalDeal)).toEqual([]);
  });

  it('checks date order and ranges', () => {
    const d = solarCapitalDealFactory();
    d.projectInformation.constructionEndDate = '2010-01-01';
    d.projectInformation.clearanceCostPct = 1.5;
    d.loans[0].firstPaymentDate = '2030-01-01';
    const errors = validateDeal(d);
    expect(errors.find((e) => e.path === 'projectInformation.constructionEndDate')!.message).toMatch(/after the project start/);
    expect(errors.find((e) => e.path === 'projectInformation.clearanceCostPct')!.message).toMatch(/between 0% and 100%/);
    expect(errors.find((e) => e.path === 'loans.0.maturityDate')!.message).toMatch(/first payment/);
  });

  it('rejects negative amounts', () => {
    const d = solarCapitalDealFactory();
    d.loans[0].facilityAmount = -5;
    d.projectInformation.pooledCollateral[0].amount = -1;
    const paths = validateDeal(d).map((e) => e.path);
    expect(paths).toContain('loans.0.facilityAmount');
    expect(paths).toContain('projectInformation.pooledCollateral.0.amount');
  });
});

describe('storage', () => {
  it('round-trips a deal through JSON', () => {
    const text = exportDealJson(solarCapitalDeal);
    expect(importDealJson(text)).toEqual(solarCapitalDeal);
  });

  it('rejects JSON that is not a deal', () => {
    expect(() => importDealJson('{}')).toThrow(/not a Project Finance Scorecard deal/);
    expect(() => importDealJson('nonsense')).toThrow();
    expect(() => importDealJson(JSON.stringify({ version: 99, projectInformation: {} }))).toThrow(/version/);
  });

  it('fills defaults for fields missing from an older export', () => {
    const partial = { version: 1, projectInformation: { dealName: 'X' }, loans: [] };
    const d = importDealJson(JSON.stringify(partial));
    expect(d.projectInformation.dealName).toBe('X');
    expect(d.projectInformation.pooledCollateral.length).toBe(10);
    expect(d.loans.length).toBe(1);
    expect(d.cashflowDetails.cfadsFrequency).toBe('semi-annually');
  });

  it('saves to and loads from storage', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    expect(saveDeal(solarCapitalDeal, storage)).toBe(true);
    expect(store.has(STORAGE_KEY)).toBe(true);
    expect(loadDeal(storage)).toEqual(solarCapitalDeal);
  });

  it('falls back silently when storage is unavailable', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadDeal(throwing)).toBeNull();
    expect(saveDeal(solarCapitalDeal, throwing)).toBe(false);
  });

  it('returns null for corrupt stored data', () => {
    const storage = { getItem: () => '{broken', setItem: () => undefined };
    expect(loadDeal(storage)).toBeNull();
  });
});
