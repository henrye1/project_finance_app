/**
 * Project Valuation engine (the workbook's "Project Valuation" sheet).
 *
 * Builds the period grid from project start to project end at the CFADS frequency and, per period,
 * accumulates construction costs, values the project from discounted cash flows, maps each loan's
 * drawdowns / repayments / balances onto the grid and derives the company asset value used by the LGD engine.
 */
import { compareIso, eomonth, frequencyMonths, yearOf } from './dates';
import { npv } from './stats';
import type { DatedAmount, Frequency, ScheduleRow } from './types';

export const MAX_LOANS = 5;

export interface ValuationLoan {
  id: number;
  schedule: ScheduleRow[];
  disbursements: DatedAmount[];
}

export interface ValuationInput {
  projectStartDate: string;
  projectEndDate: string;
  constructionEndDate: string;
  baseValue: number;
  clearanceCostPct: number;
  liquidationCostPct: number;
  cfadsFrequency: Frequency;
  constructionCosts: DatedAmount[];
  cfads: DatedAmount[];
  /** Discount rate per cash-flow period (PV!H25). */
  ratePerPeriod: number;
  loans: ValuationLoan[];
  pdPre: number | null;
  pdPost: number | null;
}

export interface ValuationPeriod {
  date: string;
  year: number;
  constructionCost: number | null;
  accumulatedCost: number | null;
  clearanceCost: number | null;
  baseValue: number | null;
  discountedValue: number;
  projectValue: number;
  drawdowns: number[];
  capitalRepayments: number[];
  repayments: number[];
  balances: number[];
  freeCashFlow: number;
  afterDebtService: number;
  companyAssetValue: number;
  pd: number | null;
}

export interface TimelinePoint {
  date: string;
  freeCashFlow: number;
  projectValue: number;
}

export interface ValuationResult {
  periods: ValuationPeriod[];
  timeline: TimelinePoint[];
  ratePerPeriod: number;
  annualisedRate: number;
  estValueAfterConstruction: number;
  warnings: string[];
}

/** Dates stepping by `months` from `start` while <= `end`, appending `end` when the step overshoots it. */
function dateGrid(start: string, end: string, months: number, appendEnd: boolean): string[] {
  const out: string[] = [];
  let d = start;
  while (compareIso(d, end) <= 0) {
    out.push(d);
    d = eomonth(d, months);
  }
  if (appendEnd && out[out.length - 1] !== end) out.push(end);
  return out;
}

/** Cashflow Details: construction cost dates (project start .. construction end). */
export function constructionCostDates(start: string, constructionEnd: string, f: Frequency): string[] {
  if (compareIso(start, constructionEnd) > 0) return [];
  return dateGrid(start, constructionEnd, frequencyMonths(f), true);
}

/** Cashflow Details: CFADS dates (construction end .. project end). */
export function cfadsDates(constructionEnd: string, end: string, f: Frequency): string[] {
  if (compareIso(constructionEnd, end) > 0) return [];
  return dateGrid(constructionEnd, end, frequencyMonths(f), true);
}

function sumBetween(items: DatedAmount[], after: string | null, upTo: string): number {
  let t = 0;
  for (const it of items) {
    if (compareIso(it.date, upTo) <= 0 && (after === null || compareIso(it.date, after) > 0)) t += it.amount;
  }
  return t;
}

function emptySlots(): number[] {
  return new Array<number>(MAX_LOANS).fill(0);
}

export function computeValuation(v: ValuationInput): ValuationResult {
  const warnings: string[] = [];
  const months = frequencyMonths(v.cfadsFrequency);
  // The grid passes through construction end so CFADS dates (anchored there) always land on it; the
  // construction stub period simply ends early when the build is not a whole number of periods.
  const grid =
    compareIso(v.projectStartDate, v.constructionEndDate) < 0 && compareIso(v.constructionEndDate, v.projectEndDate) <= 0
      ? [...dateGrid(v.projectStartDate, v.constructionEndDate, months, true), ...dateGrid(v.constructionEndDate, v.projectEndDate, months, false).slice(1)]
      : dateGrid(v.projectStartDate, v.projectEndDate, months, false);

  // Project value timeline from construction end (PV rows 26-28).
  const timelineDates = dateGrid(v.constructionEndDate, v.projectEndDate, months, false);
  const fcfByDate = new Map<string, number>();
  for (const c of v.cfads) fcfByDate.set(c.date, (fcfByDate.get(c.date) ?? 0) + c.amount);
  const flows = timelineDates.map((d) => fcfByDate.get(d) ?? 0);
  const timeline: TimelinePoint[] = timelineDates.map((d, j) => ({
    date: d,
    freeCashFlow: flows[j],
    projectValue: npv(v.ratePerPeriod, flows.slice(j)),
  }));
  const pvByDate = new Map(timeline.map((t) => [t.date, t.projectValue]));

  const sortedSchedules = v.loans.map((l) => [...l.schedule].sort((a, b) => compareIso(a.date, b.date)));

  const periods: ValuationPeriod[] = [];
  let accumulated: number | null = null;
  let cumulativeDrawdowns = emptySlots();
  let prevDate: string | null = null;
  let maxAccumulated = 0;

  // First pass: construction costs (needed to know the maximum accumulated cost).
  const costs: (number | null)[] = grid.map((d, i) => {
    const prev = i === 0 ? null : grid[i - 1];
    const inConstruction = prev === null ? compareIso(d, v.constructionEndDate) <= 0 || i === 0 : compareIso(prev, v.constructionEndDate) < 0;
    if (!inConstruction) return null;
    return sumBetween(v.constructionCosts, prev, d);
  });
  let running = 0;
  for (const c of costs) {
    if (c === null) break;
    running += c;
    maxAccumulated = Math.max(maxAccumulated, running);
  }

  for (let i = 0; i < grid.length; i++) {
    const date = grid[i];
    const cost = costs[i];
    let clearance: number | null = null;
    let baseValue: number | null = null;
    if (cost !== null) {
      accumulated = (accumulated ?? 0) + cost;
      clearance = accumulated * v.clearanceCostPct;
      baseValue = v.baseValue;
    }
    const accForRow: number | null = cost !== null ? accumulated : null;
    const pvHere = pvByDate.get(date) ?? 0;
    const discountedValue =
      accForRow === null ? pvHere : accForRow === maxAccumulated ? accForRow + (clearance ?? 0) : 0;
    const projectValue = accForRow === null ? discountedValue : accForRow + (clearance ?? 0);

    const drawdowns = emptySlots();
    const capitalRepayments = emptySlots();
    const repayments = emptySlots();
    const balances = emptySlots();
    v.loans.forEach((loan, slot) => {
      if (slot >= MAX_LOANS) return;
      const draw = compareIso(date, v.constructionEndDate) > 0 ? 0 : sumBetween(loan.disbursements, prevDate, date);
      drawdowns[slot] = draw;
      cumulativeDrawdowns[slot] += draw;
      // Payments inside (previous grid date, this grid date]; balance = closing of the last payment on or before this date.
      let lastRow: ScheduleRow | null = null;
      for (const row of sortedSchedules[slot]) {
        if (compareIso(row.date, date) > 0) break;
        if (prevDate === null || compareIso(row.date, prevDate) > 0) {
          repayments[slot] += row.payment;
          capitalRepayments[slot] += row.payment - row.interest;
        }
        lastRow = row;
      }
      balances[slot] = lastRow ? lastRow.closing : cumulativeDrawdowns[slot];
    });

    const freeCashFlow = fcfByDate.has(date) && pvByDate.has(date) ? fcfByDate.get(date)! : 0;
    const totalRepayments = repayments.reduce((s, x) => s + x, 0);
    const pvPrev = prevDate ? (pvByDate.get(prevDate) ?? 0) : 0;
    const companyAssetValue = Math.max(accForRow !== null ? accForRow + (clearance ?? 0) : 0, pvPrev);
    const pd = compareIso(date, v.constructionEndDate) < 0 ? v.pdPre : v.pdPost;

    periods.push({
      date,
      year: yearOf(date),
      constructionCost: cost,
      accumulatedCost: accForRow,
      clearanceCost: clearance,
      baseValue,
      discountedValue,
      projectValue,
      drawdowns,
      capitalRepayments,
      repayments,
      balances,
      freeCashFlow,
      afterDebtService: freeCashFlow - totalRepayments,
      companyAssetValue,
      pd,
    });
    prevDate = date;
  }

  if (v.loans.length > MAX_LOANS) warnings.push(`Only the first ${MAX_LOANS} loans are used in the valuation`);
  const annualisedRate = Math.pow(1 + v.ratePerPeriod, 12 / months) - 1;
  const maxClearance = maxAccumulated * v.clearanceCostPct;
  return {
    periods,
    timeline,
    ratePerPeriod: v.ratePerPeriod,
    annualisedRate,
    estValueAfterConstruction: maxAccumulated + maxClearance,
    warnings,
  };
}
