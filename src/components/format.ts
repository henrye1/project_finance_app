const numberFormat = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 });
const decimalFormat = (digits: number) => new Intl.NumberFormat('en-ZA', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function fmtAmount(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '';
  return numberFormat.format(v).replace(/ /g, ' ');
}

export function fmtNumber(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '';
  return decimalFormat(digits).format(v).replace(/ /g, ' ');
}

export function fmtPct(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '';
  return `${decimalFormat(digits).format(v * 100).replace(/ /g, ' ')}%`;
}

/** ISO yyyy-mm-dd -> dd/mm/yyyy, the workbook's display format. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Parses a typed number, accepting thousands separators and percentages. */
export function parseNumber(text: string): number | null {
  const cleaned = text.replace(/[\s,]/g, '').replace(/%$/, '');
  if (cleaned === '' || cleaned === '-') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
