/**
 * Amortisation schedule generator (the workbook's "Amortisation Schedule" sheet).
 * Interest accrues ACT/365 simple on the opening balance of each payment period.
 */
import { compareIso, daysBetween, edate, paymentFrequencyMonths } from './dates';
import type { LoanInput, ScheduleRow } from './types';

export interface ScheduleResult {
  rows: ScheduleRow[];
  warnings: string[];
}

function sumAmounts(items: { date: string; amount: number }[], from: string | null, to: string): number {
  let total = 0;
  for (const it of items) {
    if (compareIso(it.date, to) <= 0 && (from === null || compareIso(it.date, from) > 0)) total += it.amount;
  }
  return total;
}

export function buildSchedule(loan: LoanInput): ScheduleResult {
  const warnings: string[] = [];
  const label = `Loan ${loan.id}`;
  if (!loan.firstPaymentDate) warnings.push(`${label}: first payment date is required`);
  if (!loan.maturityDate) warnings.push(`${label}: maturity date is required`);
  if (!loan.paymentFrequency) warnings.push(`${label}: payment frequency is required`);
  if (!loan.paymentType) warnings.push(`${label}: payment type is required`);
  if (loan.interestRate === null) warnings.push(`${label}: interest rate is required`);
  if (loan.disbursements.length === 0) warnings.push(`${label}: at least one disbursement is required`);
  if (warnings.length > 0) return { rows: [], warnings };

  const first = loan.firstPaymentDate!;
  const maturity = loan.maturityDate!;
  if (compareIso(maturity, first) < 0) {
    return { rows: [], warnings: [`${label}: maturity date must be on or after the first payment date`] };
  }
  const step = paymentFrequencyMonths(loan.paymentFrequency!);
  const rate = loan.interestRate!;
  const residual = loan.residualValue ?? 0;

  const dates: string[] = [];
  for (let k = 0; ; k++) {
    const d = edate(first, k * step);
    if (compareIso(d, maturity) > 0) break;
    dates.push(d);
  }
  if (dates.length === 0 || dates[dates.length - 1] !== maturity) dates.push(maturity);
  const n = dates.length;

  // Accrual start for the first period: latest disbursement on or before the first payment date.
  const earlyDisbursements = loan.disbursements.filter((d) => compareIso(d.date, first) <= 0);
  const accrualStart = earlyDisbursements.length
    ? earlyDisbursements.map((d) => d.date).sort(compareIso)[earlyDisbursements.length - 1]
    : first;

  const initialDrawdown = sumAmounts(loan.disbursements, null, first);
  const periodRate = (rate * step) / 12;
  let annuity = 0;
  if (loan.paymentType === 'FixedPayment') {
    const principal = initialDrawdown;
    annuity =
      periodRate === 0
        ? (principal - residual) / n
        : ((principal - residual / Math.pow(1 + periodRate, n)) * periodRate) / (1 - Math.pow(1 + periodRate, -n));
  }
  const constantCapital = (initialDrawdown - residual) / n;
  const variableByDate = new Map(loan.variableCapital.map((v) => [v.date, v.amount]));

  const rows: ScheduleRow[] = [];
  let balance = 0;
  let prev = accrualStart;
  for (let i = 0; i < n; i++) {
    const date = dates[i];
    const opening = balance;
    const drawdown = i === 0 ? initialDrawdown : sumAmounts(loan.disbursements, dates[i - 1], date);
    // Opening balance accrues for the whole period; drawdowns accrue from the day they are made.
    // The initial drawdown (everything up to the first payment date) accrues from the last disbursement date.
    let interest = (opening * rate * daysBetween(prev, date)) / 365;
    if (i === 0) {
      interest += (initialDrawdown * rate * daysBetween(accrualStart, date)) / 365;
    } else {
      for (const d of loan.disbursements) {
        if (compareIso(d.date, dates[i - 1]) > 0 && compareIso(d.date, date) <= 0) {
          interest += (d.amount * rate * daysBetween(d.date, date)) / 365;
        }
      }
    }
    const last = i === n - 1;
    let capital: number;
    switch (loan.paymentType) {
      case 'FixedPayment':
        capital = last ? opening + drawdown : annuity - interest;
        break;
      case 'ConstantCapital':
        capital = last ? opening + drawdown : constantCapital;
        break;
      case 'InterestOnly':
        capital = last ? opening + drawdown : 0;
        break;
      case 'VariableCapital':
      default:
        capital = last ? opening + drawdown : (variableByDate.get(date) ?? 0);
        break;
    }
    const closing = opening + drawdown - capital;
    rows.push({ date, opening, drawdown, interest, capital, payment: interest + capital, closing });
    balance = closing;
    prev = date;
  }
  return { rows, warnings };
}
