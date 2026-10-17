import referenceTablesJson from './referenceTables.json';
import sovereignRatingsJson from './sovereignRatings.json';
import glossaryJson from './glossary.json';
import pdScorecardStructureJson from './pdScorecardStructure.json';
import recoveryUnderRestructureJson from './recoveryUnderRestructure.json';

export interface QuestionResponse {
  response: string;
  description: string;
  score: number;
}

export interface ReferenceTables {
  /** key = question id, e.g. "A2.1", "C1.1.1", "H2", "H3.1" */
  responses: Record<string, QuestionResponse[]>;
  pdCalibration: { alpha: number; beta: number };
  offtake: { slope: number; intercept: number };
  sectors: { name: string; volatility: number }[];
  insolvencyScores: Record<string, number>;
  construction: {
    pre: { recoveryCosts: number; adjustment: number };
    post: { recoveryCosts: number; adjustment: number };
  };
  collateralTypes: { type: string; recoveryRate: number }[];
  scoreBands: { min: number; rating: string }[];
  riskGrades: { grade: string; pdFitted: number; pdLower: number; pdUpper: number }[];
  moodysMap: { moodys: string; sp: string; grade: string }[];
  capitalStructure: { seniority: string; rank: number }[];
  lgdScaling: number;
}

export interface PdQuestion {
  id: string;
  text: string;
  hasPrePost: boolean;
}

export interface PdSection {
  group: string;
  groupTitle: string;
  id: string;
  title: string;
  weight: number;
  kind: 'standard' | 'sovereign' | 'offtake' | 'dscr';
  questions: PdQuestion[];
}

export interface RestructureCategory {
  name: string;
  weight: number;
  options: Record<string, string>;
}

export interface RecoveryUnderRestructure {
  categories: RestructureCategory[];
  scores: Record<string, number>;
}

export const referenceTables = referenceTablesJson as ReferenceTables;
export const sovereignRatings = sovereignRatingsJson as { country: string; rating: string }[];
export const glossary = glossaryJson as Record<string, string>;
export const pdScorecardStructure = pdScorecardStructureJson as PdSection[];
export const recoveryUnderRestructure = recoveryUnderRestructureJson as RecoveryUnderRestructure;

export const RISK_RESPONSES = ['Low Risk', 'Moderate Risk', 'High Risk', 'Very High Risk'] as const;
export const CURRENCIES = ['USD', 'ZAR', 'GBP', 'EUR'] as const;
export const FREQUENCIES = ['monthly', 'quarterly', 'semi-annually', 'annually'] as const;
export const PAYMENT_FREQUENCIES = ['Monthly', 'Bi-Monthly', 'Quarterly', 'Semi-Annual', 'Annual'] as const;
export const PAYMENT_TYPES = ['FixedPayment', 'ConstantCapital', 'InterestOnly', 'VariableCapital'] as const;
export const PHASES = ['Pre-completion Phase', 'Post-completion Phase'] as const;
export const MODEL_VERSION = 'PF Scorecard Model_v08.4.2_PDMS_Excel 2007 (2010/09/27)';
