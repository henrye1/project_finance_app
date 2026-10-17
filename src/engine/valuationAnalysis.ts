/** Valuation Analysis sheet: yearly repayments, cash flow available and DSCR. */
import { MAX_LOANS, type ValuationPeriod } from './valuation';

export interface ValuationAnalysisRow {
  year: number;
  repayments: number[];
  totalRepayments: number;
  cfads: number;
  dscr: number;
  averageDscr: number;
}

export function computeValuationAnalysis(periods: ValuationPeriod[], startYear: number, endYear: number): ValuationAnalysisRow[] {
  const rows: ValuationAnalysisRow[] = [];
  for (let year = startYear; year <= endYear; year++) {
    const repayments = new Array<number>(MAX_LOANS).fill(0);
    let cfads = 0;
    for (const p of periods) {
      if (p.year !== year) continue;
      p.repayments.forEach((r, i) => {
        repayments[i] += r;
      });
      cfads += p.freeCashFlow;
    }
    const totalRepayments = repayments.reduce((s, x) => s + x, 0);
    const dscr = totalRepayments === 0 ? 0 : cfads / totalRepayments;
    rows.push({ year, repayments, totalRepayments, cfads, dscr, averageDscr: 0 });
  }
  for (let i = 0; i < rows.length; i++) {
    const tail = rows.slice(i);
    rows[i].averageDscr = tail.reduce((s, r) => s + r.dscr, 0) / tail.length;
  }
  return rows;
}
