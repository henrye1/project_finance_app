/** The Deal: every input the workbook captures, as one JSON-serialisable object. */
import type { Frequency, LoanInput, Phase, RiskResponse, YesNo } from '../engine/types';
import type { LgdQuestionId } from '../engine/lgdScorecard';

export type { Frequency, LoanInput, Phase, RiskResponse, YesNo, PaymentFrequency, PaymentType, Seniority, DatedAmount } from '../engine/types';

export interface CollateralRow {
  type: string | null;
  amount: number | null;
  currency: string;
}

export interface LoanCollateralRow extends CollateralRow {
  /** 1..5 */
  loan: number | null;
}

export interface ProjectInformation {
  dealName: string;
  borrowerNumber: string;
  capturer: string;
  ratingDate: string | null;
  phase: Phase | null;
  projectType: string | null;
  projectStartDate: string | null;
  projectEndDate: string | null;
  constructionEndDate: string | null;
  baseValue: number | null;
  currency: string;
  clearanceCostPct: number | null;
  ppp: YesNo | null;
  liquidationPeriodMonths: number | null;
  liquidationCostPct: number | null;
  pooledCollateral: CollateralRow[];
  loanCollateral: LoanCollateralRow[];
}

export interface CashflowDetails {
  constructionFrequency: Frequency;
  constructionCurrency: string;
  /** amounts keyed by ISO date */
  constructionCosts: Record<string, number>;
  cfadsFrequency: Frequency;
  cfadsCurrency: string;
  cfads: Record<string, number>;
  /** Discount rate per cash-flow period used to value the project (PV!H25). */
  discountRatePerPeriod: number | null;
}

export interface PdScorecardInputs {
  country: string | null;
  offtakePct: { pre: number | null; post: number | null };
  answers: Record<string, { pre: RiskResponse | null; post: RiskResponse | null }>;
}

export interface LgdScorecardInputs {
  answers: Record<LgdQuestionId, RiskResponse | null>;
  canRealise: YesNo | null;
}

export interface Deal {
  version: 1;
  projectInformation: ProjectInformation;
  cashflowDetails: CashflowDetails;
  loans: LoanInput[];
  pdScorecard: PdScorecardInputs;
  lgdScorecard: LgdScorecardInputs;
  recoveryUnderRestructure: Record<string, 'a)' | 'b)' | 'c)' | null>;
}

export const COLLATERAL_ROWS = 10;
export const STEP_IDS = ['projectInformation', 'cashflowDetails', 'fundingDetails', 'projectValuation', 'pdScorecard', 'lgdScorecard', 'results'] as const;
export type StepId = (typeof STEP_IDS)[number];
export type StepStatus = 'empty' | 'partial' | 'complete';

export function emptyLoan(id: number): LoanInput {
  return {
    id,
    description: '',
    accountNumber: '',
    facilityAmount: null,
    currency: 'ZAR',
    seniority: null,
    maturityDate: null,
    paymentType: null,
    paymentFrequency: null,
    firstPaymentDate: null,
    interestRate: null,
    residualValue: 0,
    disbursements: [],
    variableCapital: [],
  };
}

export function emptyDeal(): Deal {
  return {
    version: 1,
    projectInformation: {
      dealName: '',
      borrowerNumber: '',
      capturer: '',
      ratingDate: null,
      phase: null,
      projectType: null,
      projectStartDate: null,
      projectEndDate: null,
      constructionEndDate: null,
      baseValue: null,
      currency: 'ZAR',
      clearanceCostPct: null,
      ppp: null,
      liquidationPeriodMonths: null,
      liquidationCostPct: null,
      pooledCollateral: Array.from({ length: COLLATERAL_ROWS }, () => ({ type: null, amount: null, currency: 'ZAR' })),
      loanCollateral: Array.from({ length: COLLATERAL_ROWS }, () => ({ type: null, amount: null, loan: null, currency: 'ZAR' })),
    },
    cashflowDetails: {
      constructionFrequency: 'monthly',
      constructionCurrency: 'ZAR',
      constructionCosts: {},
      cfadsFrequency: 'semi-annually',
      cfadsCurrency: 'ZAR',
      cfads: {},
      discountRatePerPeriod: null,
    },
    loans: [emptyLoan(1)],
    pdScorecard: { country: null, offtakePct: { pre: null, post: null }, answers: {} },
    lgdScorecard: { answers: { H2: null, 'H3.1': null, 'H3.2': null, 'H4.1': null }, canRealise: null },
    recoveryUnderRestructure: {},
  };
}
