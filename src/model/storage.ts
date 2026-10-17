/** Persistence: localStorage autosave and JSON import/export of a Deal. */
import { emptyDeal, emptyLoan, type Deal } from './deal';

export const STORAGE_KEY = 'pf-scorecard-deal-v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function exportDealJson(deal: Deal): string {
  return JSON.stringify(deal, null, 2);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Parses exported JSON, filling defaults for anything missing so older exports still load. */
export function importDealJson(text: string): Deal {
  const raw: unknown = JSON.parse(text);
  if (!isObject(raw) || !isObject(raw.projectInformation)) throw new Error('This file is not a Project Finance Scorecard deal');
  if (raw.version !== 1) throw new Error(`Unsupported deal file version: ${String(raw.version)}`);
  const base = emptyDeal();
  const pi = raw.projectInformation as Partial<Deal['projectInformation']>;
  const cd = isObject(raw.cashflowDetails) ? (raw.cashflowDetails as Partial<Deal['cashflowDetails']>) : {};
  const pd = isObject(raw.pdScorecard) ? (raw.pdScorecard as Partial<Deal['pdScorecard']>) : {};
  const lgd = isObject(raw.lgdScorecard) ? (raw.lgdScorecard as Partial<Deal['lgdScorecard']>) : {};
  const loans = Array.isArray(raw.loans) && raw.loans.length > 0 ? (raw.loans as Partial<Deal['loans'][number]>[]) : [];
  const deal: Deal = {
    version: 1,
    projectInformation: {
      ...base.projectInformation,
      ...pi,
      pooledCollateral: Array.isArray(pi.pooledCollateral) && pi.pooledCollateral.length === 10 ? pi.pooledCollateral : base.projectInformation.pooledCollateral,
      loanCollateral: Array.isArray(pi.loanCollateral) && pi.loanCollateral.length === 10 ? pi.loanCollateral : base.projectInformation.loanCollateral,
    },
    cashflowDetails: { ...base.cashflowDetails, ...cd },
    loans: loans.length ? loans.map((l, i) => ({ ...emptyLoan(i + 1), ...l, id: i + 1 })) : base.loans,
    pdScorecard: { ...base.pdScorecard, ...pd, offtakePct: { ...base.pdScorecard.offtakePct, ...(pd.offtakePct ?? {}) } },
    lgdScorecard: { ...base.lgdScorecard, ...lgd, answers: { ...base.lgdScorecard.answers, ...(lgd.answers ?? {}) } },
    recoveryUnderRestructure: isObject(raw.recoveryUnderRestructure) ? (raw.recoveryUnderRestructure as Deal['recoveryUnderRestructure']) : {},
  };
  return deal;
}

export function loadDeal(storage: StorageLike | null = defaultStorage()): Deal | null {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    return text ? importDealJson(text) : null;
  } catch {
    return null;
  }
}

export function saveDeal(deal: Deal, storage: StorageLike | null = defaultStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, exportDealJson(deal));
    return true;
  } catch {
    return false;
  }
}
