import { describe, it, expect } from 'vitest';
import { buildSchedule } from '../amortisation';
import { solarLoan, sheetSchedule } from './fixtures/solarCapital';
import type { LoanInput } from '../types';

const base: LoanInput = {
  id: 2,
  description: 'test',
  accountNumber: '',
  facilityAmount: 1_000_000,
  currency: 'ZAR',
  seniority: 'Senior Secured',
  maturityDate: '2025-12-31',
  paymentType: 'FixedPayment',
  paymentFrequency: 'Annual',
  firstPaymentDate: '2021-12-31',
  interestRate: 0.1,
  residualValue: 100_000,
  disbursements: [{ date: '2020-12-31', amount: 1_000_000 }],
  variableCapital: [],
};

describe('buildSchedule', () => {
  it('reproduces the workbook schedule for the variable-capital loan', () => {
    const { rows, warnings } = buildSchedule(solarLoan);
    expect(warnings).toEqual([]);
    expect(rows.length).toBe(30);
    rows.forEach((r, i) => {
      expect(r.date).toBe(sheetSchedule[i].date);
      expect(r.interest / sheetSchedule[i].interest).toBeCloseTo(1, 3);
      expect(Math.abs(r.closing - sheetSchedule[i].closing)).toBeLessThan(60_000); // < 0.004% of 1.6bn
    });
    expect(rows[0].drawdown).toBe(1626419910);
    expect(rows[0].opening).toBe(0);
    expect(rows[0].capital).toBeCloseTo(18400549.38, 2);
    expect(rows[29].closing).toBeCloseTo(0, 0);
  });

  it('fixed payment annuity amortises to the residual with equal payments', () => {
    const { rows } = buildSchedule(base);
    expect(rows.map((r) => r.date)).toEqual(['2021-12-31', '2022-12-31', '2023-12-31', '2024-12-31', '2025-12-31']);
    const pmt = rows[0].payment;
    expect(pmt).toBeCloseTo(247_417.73, 0); // (1,000,000 - 100,000/1.1^5) * 0.1/(1-1.1^-5)
    for (let i = 1; i < 4; i++) expect(rows[i].payment).toBeCloseTo(pmt, 4);
    // last row repays the remaining annuity balance plus the residual balloon
    expect(rows[4].capital).toBeCloseTo(rows[3].closing, 6);
    expect(rows[4].payment).toBeCloseTo(pmt + 100_000, -3);
    expect(rows[4].closing).toBeCloseTo(0, 6);
  });

  it('constant capital repays equal capital each period plus the residual at the end', () => {
    const loan: LoanInput = {
      ...base,
      facilityAmount: 1_200_000,
      paymentType: 'ConstantCapital',
      paymentFrequency: 'Monthly',
      firstPaymentDate: '2021-01-31',
      maturityDate: '2021-12-31',
      residualValue: 0,
      disbursements: [{ date: '2020-12-31', amount: 1_200_000 }],
    };
    const { rows } = buildSchedule(loan);
    expect(rows.length).toBe(12);
    rows.forEach((r) => expect(r.capital).toBeCloseTo(100_000, 6));
    expect(rows[11].closing).toBeCloseTo(0, 6);
    expect(rows[0].interest).toBeCloseTo((1_200_000 * 0.1 * 31) / 365, 6);
  });

  it('interest only repays the balance at maturity', () => {
    const { rows } = buildSchedule({ ...base, paymentType: 'InterestOnly', residualValue: 0 });
    rows.slice(0, 4).forEach((r) => expect(r.capital).toBe(0));
    expect(rows[4].capital).toBeCloseTo(1_000_000, 6);
    expect(rows[4].closing).toBeCloseTo(0, 6);
  });

  it('appends the maturity date when the frequency does not land on it', () => {
    const { rows } = buildSchedule({ ...base, maturityDate: '2026-03-31', paymentType: 'InterestOnly', residualValue: 0 });
    expect(rows[rows.length - 1].date).toBe('2026-03-31');
    expect(rows.length).toBe(6);
  });

  it('later drawdowns increase the balance', () => {
    const { rows } = buildSchedule({
      ...base,
      paymentType: 'InterestOnly',
      residualValue: 0,
      disbursements: [
        { date: '2020-12-31', amount: 600_000 },
        { date: '2022-06-30', amount: 400_000 },
      ],
    });
    expect(rows[0].opening).toBe(0);
    expect(rows[0].drawdown).toBe(600_000);
    expect(rows[1].drawdown).toBe(400_000);
    expect(rows[1].closing).toBe(1_000_000);
  });

  it('returns no rows and a warning when required fields are missing', () => {
    const { rows, warnings } = buildSchedule({ ...base, maturityDate: null });
    expect(rows).toEqual([]);
    expect(warnings[0]).toMatch(/maturity/i);
  });
});
