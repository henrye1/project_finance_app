/** Field-level validation of a Deal, mirroring the workbook's capture rules. */
import type { Deal } from './deal';

export interface FieldError {
  path: string;
  message: string;
}

const isPct = (v: number | null) => v === null || (v >= 0 && v <= 1);
const isNonNegative = (v: number | null) => v === null || v >= 0;

export function validateDeal(deal: Deal): FieldError[] {
  const errors: FieldError[] = [];
  const add = (path: string, message: string) => errors.push({ path, message });
  const pi = deal.projectInformation;

  if (!pi.dealName.trim()) add('projectInformation.dealName', 'Deal name is required');
  const required: [keyof typeof pi, string][] = [
    ['ratingDate', 'Project rating date is required'],
    ['phase', 'Construction phase is required'],
    ['projectType', 'Type of project is required'],
    ['projectStartDate', 'Project start date is required'],
    ['projectEndDate', 'Project end date is required'],
    ['constructionEndDate', 'Construction end date is required'],
    ['baseValue', 'Base value of project is required'],
    ['clearanceCostPct', 'Estimated clearance cost is required'],
    ['ppp', 'Please indicate whether this is a PPP agreement'],
    ['liquidationCostPct', 'Liquidation cost percentage is required'],
  ];
  for (const [key, message] of required) if (pi[key] === null || pi[key] === '') add(`projectInformation.${key}`, message);

  if (pi.projectStartDate && pi.constructionEndDate && pi.constructionEndDate < pi.projectStartDate)
    add('projectInformation.constructionEndDate', 'Construction end date must be after the project start date');
  if (pi.constructionEndDate && pi.projectEndDate && pi.projectEndDate < pi.constructionEndDate)
    add('projectInformation.projectEndDate', 'Project end date must be after the construction end date');
  if (!isPct(pi.clearanceCostPct)) add('projectInformation.clearanceCostPct', 'Clearance cost must be between 0% and 100%');
  if (!isPct(pi.liquidationCostPct)) add('projectInformation.liquidationCostPct', 'Liquidation cost must be between 0% and 100%');
  if (!isNonNegative(pi.baseValue)) add('projectInformation.baseValue', 'Base value cannot be negative');
  if (!isNonNegative(pi.liquidationPeriodMonths)) add('projectInformation.liquidationPeriodMonths', 'Liquidation period cannot be negative');
  pi.pooledCollateral.forEach((row, i) => {
    if (!isNonNegative(row.amount)) add(`projectInformation.pooledCollateral.${i}.amount`, 'Collateral amount cannot be negative');
  });
  pi.loanCollateral.forEach((row, i) => {
    if (!isNonNegative(row.amount)) add(`projectInformation.loanCollateral.${i}.amount`, 'Collateral amount cannot be negative');
    if (row.amount && row.loan === null) add(`projectInformation.loanCollateral.${i}.loan`, 'Select the loan this collateral belongs to');
  });

  const cd = deal.cashflowDetails;
  if (cd.discountRatePerPeriod === null) add('cashflowDetails.discountRatePerPeriod', 'Discount rate for the project value is required');
  if (Object.keys(cd.constructionCosts).length === 0) add('cashflowDetails.constructionCosts', 'Capture the construction costs');
  if (Object.keys(cd.cfads).length === 0) add('cashflowDetails.cfads', 'Capture the cash flow available to service debt');
  for (const [date, v] of Object.entries(cd.constructionCosts)) if (v < 0) add(`cashflowDetails.constructionCosts.${date}`, 'Construction costs cannot be negative');

  deal.loans.forEach((loan, i) => {
    const p = `loans.${i}`;
    if (loan.facilityAmount === null) add(`${p}.facilityAmount`, 'Facility amount is required');
    else if (loan.facilityAmount < 0) add(`${p}.facilityAmount`, 'Facility amount cannot be negative');
    if (loan.seniority === null) add(`${p}.seniority`, 'Debt ranking is required');
    if (loan.maturityDate === null) add(`${p}.maturityDate`, 'Maturity date is required');
    if (loan.paymentType === null) add(`${p}.paymentType`, 'Settlement type is required');
    if (loan.paymentFrequency === null) add(`${p}.paymentFrequency`, 'Payment frequency is required');
    if (loan.firstPaymentDate === null) add(`${p}.firstPaymentDate`, 'First payment date is required');
    if (loan.interestRate === null) add(`${p}.interestRate`, 'Interest rate is required');
    else if (!isPct(loan.interestRate)) add(`${p}.interestRate`, 'Interest rate must be between 0% and 100%');
    if (!isNonNegative(loan.residualValue)) add(`${p}.residualValue`, 'Residual value cannot be negative');
    if (loan.maturityDate && loan.firstPaymentDate && loan.maturityDate < loan.firstPaymentDate)
      add(`${p}.maturityDate`, 'Maturity date must be on or after the first payment date');
    if (loan.disbursements.length === 0) add(`${p}.disbursements`, 'Capture at least one drawdown');
    loan.disbursements.forEach((d, j) => {
      if (d.amount < 0) add(`${p}.disbursements.${j}.amount`, 'Drawdown cannot be negative');
    });
    if (loan.paymentType === 'VariableCapital' && loan.variableCapital.length === 0)
      add(`${p}.variableCapital`, 'Capture the capital repayment schedule for a variable-capital loan');
  });

  if (deal.pdScorecard.country === null) add('pdScorecard.country', 'Country of risk is required');
  if (!isPct(deal.pdScorecard.offtakePct.pre)) add('pdScorecard.offtakePct.pre', 'Off-take percentage must be between 0% and 100%');
  if (!isPct(deal.pdScorecard.offtakePct.post)) add('pdScorecard.offtakePct.post', 'Off-take percentage must be between 0% and 100%');

  return errors;
}

export function errorsForPrefix(errors: FieldError[], prefix: string): FieldError[] {
  return errors.filter((e) => e.path === prefix || e.path.startsWith(prefix + '.'));
}
