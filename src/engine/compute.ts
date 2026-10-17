/** Runs the whole workbook chain on a Deal: schedules -> valuation -> analysis -> PD -> LGD -> project LGD -> results. */
import { buildSchedule } from './amortisation';
import { yearOf } from './dates';
import { computeLgdScorecard, type LgdScorecardResult } from './lgdScorecard';
import { computePdScorecard, type PdScorecardResult } from './pdScorecard';
import { computeProjectLgd, type ProjectLgdYear } from './projectLgd';
import { computeResults, type ResultsOutput } from './results';
import type { DatedAmount, ScheduleRow } from './types';
import { computeValuation, MAX_LOANS, type ValuationResult } from './valuation';
import { computeValuationAnalysis, type ValuationAnalysisRow } from './valuationAnalysis';
import type { Deal, StepId, StepStatus } from '../model/deal';

export interface Computed {
  schedules: Record<number, ScheduleRow[]>;
  valuation: ValuationResult | null;
  valuationAnalysis: ValuationAnalysisRow[];
  dscr: number | null;
  pdScorecard: PdScorecardResult;
  lgdScorecard: LgdScorecardResult;
  projectLgd: ProjectLgdYear[];
  results: ResultsOutput;
  warnings: string[];
  stepStatus: Record<StepId, StepStatus>;
}

function toDated(record: Record<string, number>): DatedAmount[] {
  return Object.entries(record)
    .filter(([, v]) => typeof v === 'number' && !Number.isNaN(v))
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function status(filled: boolean[], complete: boolean): StepStatus {
  if (complete) return 'complete';
  return filled.some(Boolean) ? 'partial' : 'empty';
}

export function computeAll(deal: Deal): Computed {
  const warnings: string[] = [];
  const pi = deal.projectInformation;
  const cd = deal.cashflowDetails;
  const loans = deal.loans.slice(0, MAX_LOANS);

  // 1. Funding details -> schedules
  const schedules: Record<number, ScheduleRow[]> = {};
  const scheduleWarnings: string[] = [];
  for (const loan of loans) {
    const r = buildSchedule(loan);
    schedules[loan.id] = r.rows;
    scheduleWarnings.push(...r.warnings);
    if (loan.seniority === null) scheduleWarnings.push(`Loan ${loan.id}: debt ranking is required`);
    if (loan.facilityAmount === null) scheduleWarnings.push(`Loan ${loan.id}: facility amount is required`);
  }
  warnings.push(...scheduleWarnings);

  // 2. Project valuation
  const piRequired = {
    'rating date': pi.ratingDate,
    'construction phase': pi.phase,
    'type of project': pi.projectType,
    'project start date': pi.projectStartDate,
    'project end date': pi.projectEndDate,
    'construction end date': pi.constructionEndDate,
    'base value': pi.baseValue,
    'clearance cost %': pi.clearanceCostPct,
    'PPP indicator': pi.ppp,
    'liquidation cost %': pi.liquidationCostPct,
  };
  const piMissing = Object.entries(piRequired)
    .filter(([, v]) => v === null || v === '')
    .map(([k]) => k);
  if (!pi.dealName) piMissing.push('deal name');
  for (const m of piMissing) warnings.push(`Project Information: ${m} is required`);
  if (pi.projectStartDate && pi.constructionEndDate && pi.constructionEndDate < pi.projectStartDate)
    warnings.push('Project Information: construction end date is before the project start date');
  if (pi.constructionEndDate && pi.projectEndDate && pi.projectEndDate < pi.constructionEndDate)
    warnings.push('Project Information: project end date is before the construction end date');
  const ratingInLife =
    pi.ratingDate !== null && pi.projectStartDate !== null && pi.projectEndDate !== null && pi.ratingDate >= pi.projectStartDate && pi.ratingDate <= pi.projectEndDate;
  if (pi.ratingDate && pi.projectStartDate && pi.projectEndDate && !ratingInLife)
    warnings.push('Project Information: the rating date must fall between the project start and end dates');

  const constructionCosts = toDated(cd.constructionCosts);
  const cfads = toDated(cd.cfads);
  if (cd.discountRatePerPeriod === null) warnings.push('Cashflow Details: discount rate per period is required');
  if (cfads.length === 0) warnings.push('Cashflow Details: cash flow available to service debt is required');
  if (constructionCosts.length === 0) warnings.push('Cashflow Details: construction costs are required');

  const canValue =
    pi.projectStartDate !== null &&
    pi.projectEndDate !== null &&
    pi.constructionEndDate !== null &&
    pi.projectStartDate <= pi.constructionEndDate &&
    pi.constructionEndDate <= pi.projectEndDate &&
    pi.baseValue !== null &&
    pi.clearanceCostPct !== null &&
    pi.liquidationCostPct !== null &&
    cd.discountRatePerPeriod !== null;

  let valuation: ValuationResult | null = null;
  let valuationAnalysis: ValuationAnalysisRow[] = [];
  let dscr: number | null = null;
  const startYear = pi.projectStartDate ? yearOf(pi.projectStartDate) : null;
  const endYear = pi.projectEndDate ? yearOf(pi.projectEndDate) : null;
  if (canValue) {
    valuation = computeValuation({
      projectStartDate: pi.projectStartDate!,
      projectEndDate: pi.projectEndDate!,
      constructionEndDate: pi.constructionEndDate!,
      baseValue: pi.baseValue!,
      clearanceCostPct: pi.clearanceCostPct!,
      liquidationCostPct: pi.liquidationCostPct!,
      cfadsFrequency: cd.cfadsFrequency,
      constructionCosts,
      cfads,
      ratePerPeriod: cd.discountRatePerPeriod!,
      loans: loans.map((l) => ({ id: l.id, schedule: schedules[l.id] ?? [], disbursements: l.disbursements })),
      pdPre: null,
      pdPost: null,
    });
    warnings.push(...valuation.warnings);
    const gridDates = new Set(valuation.periods.map((p) => p.date));
    const offGridCfads = cfads.filter((c) => !gridDates.has(c.date)).length;
    if (offGridCfads > 0) warnings.push(`Cashflow Details: ${offGridCfads} cash flow amount(s) are dated off the valuation grid and are ignored (not on the valuation grid)`);
    const lastConstruction = valuation.periods.filter((p) => p.constructionCost !== null).map((p) => p.date).pop();
    const lateCosts = constructionCosts.filter((c) => lastConstruction !== undefined && c.date > lastConstruction).length;
    if (lateCosts > 0) warnings.push(`Cashflow Details: ${lateCosts} construction cost amount(s) are dated after construction end and are ignored`);
    valuationAnalysis = computeValuationAnalysis(valuation.periods, startYear!, endYear!);
    if (pi.ratingDate && ratingInLife) {
      const row = valuationAnalysis.find((r) => r.year === yearOf(pi.ratingDate!));
      if (row) dscr = row.averageDscr;
    }
    if (pi.ratingDate && !ratingInLife) warnings.push('Project Valuation: the rating date falls outside the project life, so no DSCR is available');
  } else {
    warnings.push('Project Valuation: cannot run until Project Information dates, valuation parameters and the discount rate are captured');
  }

  // 3. PD scorecard
  const pdScorecard = computePdScorecard({
    phase: pi.phase,
    country: deal.pdScorecard.country,
    projectType: pi.projectType,
    ppp: pi.ppp,
    offtakePct: deal.pdScorecard.offtakePct,
    answers: deal.pdScorecard.answers,
    dscr,
  });
  warnings.push(...pdScorecard.warnings);

  // Feed the PDs back into the valuation periods (PV column AJ).
  if (valuation) {
    for (const p of valuation.periods) {
      p.pd = p.date < pi.constructionEndDate! ? pdScorecard.pdPre : pdScorecard.pdPost;
    }
  }

  // 4. LGD scorecard
  const lgdScorecard = computeLgdScorecard({
    phase: pi.phase,
    projectType: pi.projectType,
    country: deal.pdScorecard.country,
    answers: deal.lgdScorecard.answers,
    canRealise: deal.lgdScorecard.canRealise,
  });
  warnings.push(...lgdScorecard.warnings);

  // 5. Project LGD by year
  let projectLgd: ProjectLgdYear[] = [];
  if (valuation) {
    const pooled = pi.pooledCollateral.reduce((s, r) => s + (r.amount ?? 0), 0);
    const loanCollateral = new Array<number>(MAX_LOANS).fill(0);
    for (const r of pi.loanCollateral) {
      if (r.loan !== null && r.loan >= 1 && r.loan <= MAX_LOANS && r.amount) loanCollateral[r.loan - 1] += r.amount;
    }
    const pl = computeProjectLgd({
      periods: valuation.periods,
      startYear: startYear!,
      endYear: endYear!,
      loans: loans.map((l, slot) => ({ slot, seniority: l.seniority })),
      recoveryRate: lgdScorecard.recoveryRate,
      liquidationCostPct: pi.liquidationCostPct!,
      annualisedRate: valuation.annualisedRate,
      pooledCollateral: pooled,
      loanCollateral,
    });
    projectLgd = pl.years;
    warnings.push(...pl.warnings);
  }

  // 6. Results
  const lgdYear = pi.ratingDate ? projectLgd.find((y) => y.year === yearOf(pi.ratingDate!)) : undefined;
  if (pi.ratingDate && projectLgd.length && !lgdYear) warnings.push('Results: no project LGD row for the rating year');
  const results = computeResults({
    ratingDate: pi.ratingDate,
    projectEndDate: pi.projectEndDate,
    finalPd: pdScorecard.finalPd,
    lgdYear,
    recoveryRate: lgdScorecard.recoveryRate,
  });
  if (lgdYear && results.lgdTable[0].lifetime === null)
    warnings.push('Results: no Senior Secured lifetime LGD in the rating year (no Senior Secured loan with exposure), so the capital calculation is withheld');

  // Step status
  const unique = Array.from(new Set(warnings));
  warnings.length = 0;
  warnings.push(...unique);
  const piFilled = [pi.dealName !== '', ...Object.values(piRequired).map((v) => v !== null)];
  const cdFilled = [constructionCosts.length > 0, cfads.length > 0, cd.discountRatePerPeriod !== null];
  const loanFilled = loans.some(
    (l) => l.facilityAmount !== null || l.seniority !== null || l.maturityDate !== null || l.disbursements.length > 0 || l.interestRate !== null,
  );
  const pdFilled = [deal.pdScorecard.country !== null, Object.values(deal.pdScorecard.answers).some((a) => a.pre !== null || a.post !== null)];
  const lgdFilled = [deal.lgdScorecard.canRealise !== null, Object.values(deal.lgdScorecard.answers).some((a) => a !== null)];
  const stepStatus: Record<StepId, StepStatus> = {
    projectInformation: status(piFilled, piMissing.length === 0 && !warnings.some((w) => w.startsWith('Project Information:'))),
    cashflowDetails: status(cdFilled, cdFilled.every(Boolean)),
    fundingDetails: status([loanFilled], loanFilled && scheduleWarnings.length === 0),
    projectValuation: status([valuation !== null], valuation !== null && dscr !== null && valuation.warnings.length === 0),
    pdScorecard: status(pdFilled, pdScorecard.warnings.length === 0),
    lgdScorecard: status(lgdFilled, lgdScorecard.warnings.length === 0),
    results: status([pdScorecard.finalPd !== null], results.capital.k !== null && warnings.length === 0),
  };

  return { schedules, valuation, valuationAnalysis, dscr, pdScorecard, lgdScorecard, projectLgd, results, warnings, stepStatus };
}
