/**
 * Project LGD by year (the workbook's "Project LGD New" sheet).
 *
 * For every calendar year: loan exposures at year end, realisable project collateral allocated by
 * seniority, additional collateral, LGD per seniority class and the PD/exposure-weighted lifetime LGD.
 */
import { referenceTables } from '../data';
import { SENIORITIES, type Seniority } from './types';
import { MAX_LOANS, type ValuationPeriod } from './valuation';

export interface ProjectLgdLoan {
  slot: number;
  seniority: Seniority | null;
}

export interface ProjectLgdInput {
  periods: ValuationPeriod[];
  startYear: number;
  endYear: number;
  loans: ProjectLgdLoan[];
  recoveryRate: number | null;
  liquidationCostPct: number;
  annualisedRate: number;
  pooledCollateral: number;
  /** Per loan slot, raw amounts of collateral pledged to that loan only. */
  loanCollateral: number[];
  /** Tests only: inject a PD path per year instead of the valuation's PD column. */
  pdOverride?: (year: number) => number | null;
  /** Tests only: explicit ranks per slot instead of the capital-structure lookup. */
  ranksOverride?: (number | null)[];
}

export type ByClass = Record<Seniority, number | null>;

export interface ProjectLgdYear {
  year: number;
  date: string | null;
  exposures: number[];
  projectValue: number;
  projectCollateral: number;
  projectAllocated: number[];
  additionalGross: number;
  additionalRealisable: number;
  additionalAllocated: number[];
  lgdByClass: ByClass;
  pd: number | null;
  lifetimeLgdByClass: ByClass;
}

export function rankForSeniority(s: Seniority | null): number | null {
  if (!s) return null;
  const hit = referenceTables.capitalStructure.find((c) => c.seniority === s);
  return hit ? hit.rank : null;
}

/** Workbook VBA Collateral_Allocation: seniors absorb collateral first, pari-passu tranches share pro rata. */
export function collateralAllocation(
  trancheExposure: number,
  rank: number,
  ranks: (number | null)[],
  exposures: number[],
  collateralValue: number,
): number {
  let sumPari = 0;
  let sumSenior = 0;
  ranks.forEach((r, i) => {
    if (r === null) return;
    if (r === rank) sumPari += exposures[i] ?? 0;
    if (r < rank) sumSenior += exposures[i] ?? 0;
  });
  if (sumPari === 0) return 0;
  const collateralSenior = Math.min(sumSenior, collateralValue);
  return Math.min((trancheExposure / sumPari) * (collateralValue - collateralSenior), trancheExposure);
}

function emptyByClass(): ByClass {
  return { 'Senior Secured': null, 'Senior Unsecured': null, Mezzanine: null, Subordinated: null, Other: null };
}

export function computeProjectLgd(i: ProjectLgdInput): { years: ProjectLgdYear[]; warnings: string[] } {
  const warnings: string[] = [];
  if (i.recoveryRate === null) warnings.push('Project LGD: recovery rate from the LGD scorecard is not available');
  const liq = i.liquidationCostPct;
  const ranks: (number | null)[] = new Array(MAX_LOANS).fill(null);
  const classBySlot: (Seniority | null)[] = new Array(MAX_LOANS).fill(null);
  for (const l of i.loans) {
    if (l.slot >= MAX_LOANS) continue;
    ranks[l.slot] = i.ranksOverride ? (i.ranksOverride[l.slot] ?? null) : rankForSeniority(l.seniority);
    classBySlot[l.slot] = l.seniority;
  }

  const years: ProjectLgdYear[] = [];
  for (let year = i.startYear; year <= i.endYear; year++) {
    const inYear = i.periods.filter((p) => p.year === year);
    const last = inYear[inYear.length - 1];
    const first = inYear[0];
    const exposures = last ? [...last.balances] : new Array<number>(MAX_LOANS).fill(0);
    const projectValue = last ? last.companyAssetValue : 0;
    const projectCollateral = i.recoveryRate === null ? 0 : projectValue * i.recoveryRate * (1 - liq);
    const additionalRealisable = i.pooledCollateral * (1 - liq);

    const projectAllocated = exposures.map((e, slot) =>
      e === 0 || ranks[slot] === null ? 0 : Math.max(collateralAllocation(e, ranks[slot]!, ranks, exposures, projectCollateral), 0),
    );
    const additionalAllocated = exposures.map((e, slot) => {
      const pooled = e === 0 || ranks[slot] === null ? 0 : collateralAllocation(e, ranks[slot]!, ranks, exposures, additionalRealisable);
      return pooled + (i.loanCollateral[slot] ?? 0) * (1 - liq);
    });

    const lgdByClass = emptyByClass();
    for (const cls of SENIORITIES) {
      let exposure = 0;
      let collateral = 0;
      exposures.forEach((e, slot) => {
        if (classBySlot[slot] !== cls) return;
        exposure += e;
        collateral += projectAllocated[slot] + additionalAllocated[slot];
      });
      if (exposure === 0 || i.recoveryRate === null) continue;
      const unsecured = exposure - collateral;
      if (unsecured === 0) {
        lgdByClass[cls] = Math.max(liq, 0);
      } else {
        const unsecuredFraction = Math.max(unsecured / exposure, 0);
        lgdByClass[cls] = Math.max(liq, Math.min(1, 1 - (1 - unsecuredFraction) / (1 + i.annualisedRate)));
      }
    }

    const pd = i.pdOverride ? i.pdOverride(year) : first ? first.pd : null;
    years.push({
      year,
      date: last ? last.date : null,
      exposures,
      projectValue,
      projectCollateral,
      projectAllocated,
      additionalGross: i.pooledCollateral,
      additionalRealisable,
      additionalAllocated,
      lgdByClass,
      pd,
      lifetimeLgdByClass: emptyByClass(),
    });
  }

  // Lifetime LGD per class from each year onward: sum(LGD x PD x E) / sum(PD x E).
  for (let k = 0; k < years.length; k++) {
    for (const cls of SENIORITIES) {
      let num = 0;
      let den = 0;
      for (let t = k; t < years.length; t++) {
        const row = years[t];
        const lgd = row.lgdByClass[cls];
        if (lgd === null || row.pd === null) continue;
        let exposure = 0;
        row.exposures.forEach((e, slot) => {
          if (classBySlot[slot] === cls) exposure += e;
        });
        num += lgd * row.pd * exposure;
        den += row.pd * exposure;
      }
      years[k].lifetimeLgdByClass[cls] = den === 0 ? null : num / den;
    }
  }
  return { years, warnings };
}
