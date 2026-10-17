/** Results sheet: loan-level LGD table and the Basel capital calculation. */
import { yearFrac30360 } from './dates';
import { normSDist, normSInv } from './stats';
import type { ProjectLgdYear } from './projectLgd';
import { SENIORITIES, type Seniority } from './types';

export const LGD_FLOOR = 0.01;
export const CAPITAL_RATIO = 0.1061;

export interface ResultsInput {
  ratingDate: string | null;
  projectEndDate: string | null;
  finalPd: number | null;
  lgdYear: ProjectLgdYear | undefined;
  recoveryRate: number | null;
}

export interface CapitalResult {
  pd: number | null;
  downturnLgd: number | null;
  remainingMaturity: number | null;
  correlation: number | null;
  maturityAdjustment: number | null;
  k: number | null;
  rwa: number | null;
  capital: number | null;
}

export interface LgdTableRow {
  seniority: Seniority;
  twelveMonth: number | null;
  lifetime: number | null;
}

export interface ResultsOutput {
  lgdTable: LgdTableRow[];
  capital: CapitalResult;
  recoveryRate: number | null;
}

function floored(v: number | null | undefined): number | null {
  return v === null || v === undefined ? null : Math.max(v, LGD_FLOOR);
}

export function computeResults(i: ResultsInput): ResultsOutput {
  const lgdTable: LgdTableRow[] = SENIORITIES.map((s) => ({
    seniority: s,
    twelveMonth: floored(i.lgdYear?.lgdByClass[s]),
    lifetime: floored(i.lgdYear?.lifetimeLgdByClass[s]),
  }));

  const pd = i.finalPd;
  const seniorLifetime = lgdTable[0].lifetime ?? LGD_FLOOR; // sheet: IFERROR(..., 0.01)
  const downturnLgd = 0.92 * seniorLifetime + 0.08;
  let remainingMaturity: number | null = null;
  if (i.ratingDate && i.projectEndDate) {
    const yf = yearFrac30360(i.ratingDate, i.projectEndDate);
    remainingMaturity = yf <= 1 ? 1 : yf > 5 ? 5 : yf;
  }

  let correlation: number | null = null;
  let maturityAdjustment: number | null = null;
  let k: number | null = null;
  let rwa: number | null = null;
  let capital: number | null = null;
  if (pd !== null && pd > 0 && pd < 1) {
    const w = (1 - Math.exp(-50 * pd)) / (1 - Math.exp(-50));
    correlation = 0.12 * w + 0.24 * (1 - w);
    maturityAdjustment = Math.pow(0.11852 - 0.05478 * Math.log(pd), 2);
    if (remainingMaturity !== null) {
      const r = correlation;
      const b = maturityAdjustment;
      const conditional = normSDist(Math.pow(1 - r, -0.5) * normSInv(pd) + Math.sqrt(r / (1 - r)) * normSInv(0.999));
      k = (downturnLgd * conditional - pd * downturnLgd) * Math.pow(1 - 1.5 * b, -1) * (1 + (remainingMaturity - 2.5) * b);
      rwa = k * 12.5 * 1.06;
      capital = rwa * CAPITAL_RATIO;
    }
  }

  return {
    lgdTable,
    capital: { pd, downturnLgd, remainingMaturity, correlation, maturityAdjustment, k, rwa, capital },
    recoveryRate: i.recoveryRate,
  };
}
