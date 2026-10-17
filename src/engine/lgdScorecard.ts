/** LGD Scorecard engine (the workbook's "LGD Scorecard" sheet). */
import { referenceTables } from '../data';
import type { Phase, RiskResponse, YesNo } from './types';

export type LgdQuestionId = 'H2' | 'H3.1' | 'H3.2' | 'H4.1';
export const LGD_QUESTIONS: { id: LgdQuestionId; text: string; weight: number }[] = [
  { id: 'H2', text: 'How conducive is the regulatory framework to the efficient realising / liquidation of the underlying collateral?', weight: 0.175 },
  { id: 'H3.1', text: 'Does the rate of technological change within the industry present a risk of obsolescence to the object (e.g. equipment, specialist techniques)?', weight: 0.175 },
  { id: 'H3.2', text: 'Does the object rely on proven technology?', weight: 0.175 },
  { id: 'H4.1', text: 'Is the project comprehensively insured against physical loss?', weight: 0.175 },
];
export const PHASE_WEIGHT = 0.3;

export interface LgdScorecardInput {
  phase: Phase | null;
  projectType: string | null;
  country: string | null;
  answers: Record<LgdQuestionId, RiskResponse | null>;
  canRealise: YesNo | null;
}

export interface LgdScorecardResult {
  phaseScore: number;
  questionScores: Record<LgdQuestionId, number | null>;
  questionDescriptions: Record<LgdQuestionId, string>;
  score: number | null;
  current: { haircut: number | null; recoveryRate: number | null; slope: number; intercept: number };
  factors: {
    volatility: number | null;
    scaling: number;
    country: number | null;
    insolvencyScore: number | null;
    haircutFactor: number | null;
    constructionAdjustment: number | null;
    recoveryCosts: number | null;
  };
  haircut: number | null;
  recoveryRate: number | null;
  warnings: string[];
}

/** Line through (score 4, haircut 65%) and (score 1, haircut 100%). */
const SLOPE = (0.65 - 1) / (4 - 1);
const INTERCEPT = 1 - SLOPE * 1;

export function insolvencyScoreFor(country: string | null): number | null {
  if (!country) return null;
  const key = country.trim().toLowerCase();
  for (const [name, score] of Object.entries(referenceTables.insolvencyScores)) {
    if (name.toLowerCase() === key) return score;
  }
  return null;
}

export function computeLgdScorecard(i: LgdScorecardInput): LgdScorecardResult {
  const warnings: string[] = [];
  const phaseScore = i.phase === 'Post-completion Phase' ? 4 : 1;
  if (!i.phase) warnings.push('LGD Scorecard H1: construction phase is missing (pre-completion assumed)');

  const questionScores = {} as Record<LgdQuestionId, number | null>;
  const questionDescriptions = {} as Record<LgdQuestionId, string>;
  let score = phaseScore * PHASE_WEIGHT;
  for (const q of LGD_QUESTIONS) {
    const response = i.answers[q.id];
    const hit = response ? (referenceTables.responses[q.id] ?? []).find((o) => o.response === response) : undefined;
    if (!hit) warnings.push(`LGD Scorecard ${q.id}: response missing (score 1 applied)`);
    const s = hit ? hit.score : 1;
    questionScores[q.id] = s;
    questionDescriptions[q.id] = hit?.description ?? '';
    score += s * q.weight;
  }

  const currentHaircut = i.canRealise === 'No' ? 1 : score * SLOPE + INTERCEPT;
  if (!i.canRealise) warnings.push('LGD Scorecard H5: please indicate whether project value can be realised');

  const sector = i.projectType ? referenceTables.sectors.find((s) => s.name === i.projectType) : undefined;
  if (!sector) warnings.push('LGD Scorecard: project type is missing or unknown (no sector volatility)');
  const insolvency = insolvencyScoreFor(i.country);
  if (insolvency === null) warnings.push('LGD Scorecard: country of risk is missing or has no insolvency regime score');
  const countryFactor = insolvency === null ? null : 1 / (1 - (insolvency - 1) * 0.1);
  const construction = i.phase === 'Post-completion Phase' ? referenceTables.construction.post : referenceTables.construction.pre;
  const volatility = sector ? sector.volatility : null;
  const scaling = referenceTables.lgdScaling;
  const haircutFactor = volatility !== null && countryFactor !== null ? volatility * scaling * countryFactor : null;
  const haircut = haircutFactor === null ? null : Math.min(construction.adjustment * haircutFactor + construction.recoveryCosts, 1);

  return {
    phaseScore,
    questionScores,
    questionDescriptions,
    score,
    current: { haircut: currentHaircut, recoveryRate: 1 - currentHaircut, slope: SLOPE, intercept: INTERCEPT },
    factors: {
      volatility,
      scaling,
      country: countryFactor,
      insolvencyScore: insolvency,
      haircutFactor,
      constructionAdjustment: construction.adjustment,
      recoveryCosts: construction.recoveryCosts,
    },
    haircut,
    recoveryRate: haircut === null ? null : 1 - haircut,
    warnings,
  };
}
