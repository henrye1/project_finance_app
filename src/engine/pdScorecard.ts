/** PD Scorecard engine (the workbook's "PD Scorecard" sheet and the Results sheet's PD block). */
import { pdScorecardStructure, referenceTables, sovereignRatings } from '../data';
import { normSInv } from './stats';
import type { Phase, RiskResponse, YesNo } from './types';

export interface PdAnswer {
  pre: RiskResponse | null;
  post: RiskResponse | null;
}

export interface PdScorecardInput {
  phase: Phase | null;
  country: string | null;
  projectType: string | null;
  ppp: YesNo | null;
  offtakePct: { pre: number | null; post: number | null };
  answers: Record<string, PdAnswer>;
  /** Average DSCR for the rating year from the valuation analysis. */
  dscr: number | null;
}

export interface PdQuestionScore {
  pre: number | null;
  post: number | null;
  description: { pre: string; post: string };
}

export interface PdSectionResult {
  id: string;
  group: string;
  groupTitle: string;
  title: string;
  weight: number;
  kind: 'standard' | 'sovereign' | 'offtake' | 'dscr';
  scorePre: number | null;
  scorePost: number | null;
  weightedPre: number | null;
  weightedPost: number | null;
  ratingPre: string | null;
  ratingPost: string | null;
  questionScores: Record<string, PdQuestionScore>;
}

export interface PdScorecardResult {
  sovereign: { rating: string | null; grade: string | null; pd: number | null; score: number | null };
  sections: PdSectionResult[];
  dscrScore: number | null;
  totalPre: number | null;
  totalPost: number | null;
  pdPre: number | null;
  pdPost: number | null;
  gradePre: string | null;
  gradePost: string | null;
  overallRatingPre: string | null;
  overallRatingPost: string | null;
  finalPd: number | null;
  finalGrade: string | null;
  finalTotal: number | null;
  finalRating: string | null;
  warnings: string[];
}

/** Workbook VBA `Score_DSCR`: industry- and PPP-dependent DSCR thresholds. */
export function scoreDscr(projectType: string | null, ppp: YesNo | null, dscr: number): number {
  const bands = (a: number, b: number, c: number) => (dscr <= a ? 1 : dscr <= b ? 2 : dscr <= c ? 3 : 4);
  if (ppp === 'Yes') return bands(1.01, 1.06, 1.17);
  if (ppp !== 'No') return 1;
  switch (projectType) {
    case 'Energy':
      return bands(1.03, 1.31, 1.58);
    case 'Chemicals, Oil & Gas':
      return bands(1.31, 1.67, 2.18);
    case 'Infrastructure':
    case 'Other':
    case 'Telecoms':
      return bands(1.01, 1.06, 1.15);
    case 'Mining':
      return bands(1.03, 1.125, 1.2);
    default:
      return 1;
  }
}

/** Reference Tables AB2:AD5 lookup: the band whose minimum is the largest value <= score. */
export function ratingForScore(score: number): string {
  let rating = referenceTables.scoreBands[0].rating;
  for (const b of referenceTables.scoreBands) if (score >= b.min) rating = b.rating;
  return rating;
}

/** Reference Tables AH3:AJ30 approximate VLOOKUP on the PD lower bound. */
export function gradeForPd(pd: number): string {
  let grade = referenceTables.riskGrades[0].grade;
  for (const g of referenceTables.riskGrades) if (pd >= g.pdLower) grade = g.grade;
  return grade;
}

export function lookupSovereign(country: string): { rating: string | null; grade: string | null; pd: number | null } {
  const key = country.trim().toLowerCase();
  const sov = sovereignRatings.find((s) => s.country.toLowerCase() === key);
  if (!sov) return { rating: null, grade: null, pd: null };
  const map = referenceTables.moodysMap.find((m) => m.moodys === sov.rating);
  if (!map) return { rating: sov.rating, grade: null, pd: null };
  const grade = referenceTables.riskGrades.find((g) => g.grade === map.grade);
  return { rating: sov.rating, grade: map.grade, pd: grade ? grade.pdFitted : null };
}

export function pdFromScore(total: number): number {
  const { alpha, beta } = referenceTables.pdCalibration;
  return 1 / (1 + Math.exp(alpha + beta * total));
}

function responseScore(questionId: string, response: RiskResponse | null): { score: number; description: string } | null {
  if (!response) return null;
  const options = referenceTables.responses[questionId] ?? [];
  const hit = options.find((o) => o.response === response);
  return hit ? { score: hit.score, description: hit.description } : null;
}

function mean(values: number[]): number {
  return values.reduce((s, x) => s + x, 0) / values.length;
}

export function computePdScorecard(i: PdScorecardInput): PdScorecardResult {
  const warnings: string[] = [];

  const sovereign = i.country ? lookupSovereign(i.country) : { rating: null, grade: null, pd: null };
  if (!i.country) warnings.push('PD Scorecard A1.1: country of risk is required');
  else if (sovereign.pd === null) warnings.push(`PD Scorecard A1.1: no sovereign rating found for "${i.country}"`);
  const sovereignScore = sovereign.pd !== null ? -normSInv(sovereign.pd) : null;

  let dscrScore: number;
  if (i.dscr === null) {
    dscrScore = 1;
    warnings.push('PD Scorecard F2.1: DSCR is not available from the valuation (score 1 applied)');
  } else {
    dscrScore = scoreDscr(i.projectType, i.ppp, i.dscr);
  }

  const sections: PdSectionResult[] = pdScorecardStructure.map((sec) => {
    const questionScores: Record<string, PdQuestionScore> = {};
    const pre: number[] = [];
    const post: number[] = [];
    let scorePre: number | null = null;
    let scorePost: number | null = null;

    if (sec.kind === 'sovereign') {
      scorePre = sovereignScore;
      scorePost = sovereignScore;
      questionScores['A1.1'] = { pre: sovereignScore, post: sovereignScore, description: { pre: sovereign.grade ?? '', post: sovereign.grade ?? '' } };
    } else if (sec.kind === 'dscr') {
      scorePre = dscrScore;
      scorePost = dscrScore;
      questionScores['F2.1'] = { pre: dscrScore, post: dscrScore, description: { pre: '', post: '' } };
    } else {
      for (const q of sec.questions) {
        if (sec.kind === 'offtake' && q.id === 'E2.1') continue;
        const a = i.answers[q.id] ?? { pre: null, post: null };
        const sp = responseScore(q.id, a.pre);
        const so = responseScore(q.id, a.post);
        if (!sp) warnings.push(`PD Scorecard ${q.id}: pre-completion response missing (score 1 applied)`);
        if (!so) warnings.push(`PD Scorecard ${q.id}: post-completion response missing (score 1 applied)`);
        const vPre = sp ? sp.score : 1;
        const vPost = so ? so.score : 1;
        pre.push(vPre);
        post.push(vPost);
        questionScores[q.id] = { pre: vPre, post: vPost, description: { pre: sp?.description ?? '', post: so?.description ?? '' } };
      }
      if (sec.kind === 'offtake') {
        const { slope, intercept } = referenceTables.offtake;
        const pPre = i.offtakePct.pre ?? 0;
        const pPost = i.offtakePct.post ?? 0;
        if (i.offtakePct.pre === null) warnings.push('PD Scorecard E2.1: pre-completion off-take percentage missing (0% applied)');
        if (i.offtakePct.post === null) warnings.push('PD Scorecard E2.1: post-completion off-take percentage missing (0% applied)');
        scorePre = mean(pre) * pPre * slope + intercept;
        scorePost = mean(post) * pPost * slope + intercept;
        questionScores['E2.1'] = { pre: pPre, post: pPost, description: { pre: '', post: '' } };
      } else {
        scorePre = mean(pre);
        scorePost = mean(post);
      }
    }

    return {
      id: sec.id,
      group: sec.group,
      groupTitle: sec.groupTitle,
      title: sec.title,
      weight: sec.weight,
      kind: sec.kind,
      scorePre,
      scorePost,
      weightedPre: scorePre === null ? null : scorePre * sec.weight,
      weightedPost: scorePost === null ? null : scorePost * sec.weight,
      ratingPre: scorePre === null ? null : ratingForScore(scorePre),
      ratingPost: scorePost === null ? null : ratingForScore(scorePost),
      questionScores,
    };
  });

  const sumOrNull = (vals: (number | null)[]) => (vals.some((v) => v === null) ? null : vals.reduce((s, v) => s + (v as number), 0));
  const totalPre = sumOrNull(sections.map((s) => s.weightedPre));
  const totalPost = sumOrNull(sections.map((s) => s.weightedPost));
  const pdPre = totalPre === null ? null : pdFromScore(totalPre);
  const pdPost = totalPost === null ? null : pdFromScore(totalPost);

  if (!i.phase) warnings.push('Project Information: construction phase is required');
  const finalTotal = i.phase === 'Pre-completion Phase' ? totalPre : i.phase === 'Post-completion Phase' ? totalPost : null;
  const finalPd = i.phase === 'Pre-completion Phase' ? pdPre : i.phase === 'Post-completion Phase' ? pdPost : null;

  return {
    sovereign: { ...sovereign, score: sovereignScore },
    sections,
    dscrScore,
    totalPre,
    totalPost,
    pdPre,
    pdPost,
    gradePre: pdPre === null ? null : gradeForPd(pdPre),
    gradePost: pdPost === null ? null : gradeForPd(pdPost),
    overallRatingPre: totalPre === null ? null : ratingForScore(totalPre),
    overallRatingPost: totalPost === null ? null : ratingForScore(totalPost),
    finalPd,
    finalGrade: finalPd === null ? null : gradeForPd(finalPd),
    finalTotal,
    finalRating: finalTotal === null ? null : ratingForScore(finalTotal),
    warnings,
  };
}
