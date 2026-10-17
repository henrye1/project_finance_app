/** Number and date formatting: space-grouped thousands, dot decimals, dd/mm/yyyy dates (as the workbook displays them). */
const withDigits = (digits: number) => new Intl.NumberFormat('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: true });

function group(s: string): string {
  return s.replace(/,/g, ' ');
}

export function fmtAmount(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '';
  return group(withDigits(0).format(v));
}

export function fmtNumber(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '';
  return group(withDigits(digits).format(v));
}

export function fmtPct(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '';
  return `${group(withDigits(digits).format(v * 100))}%`;
}

/** ISO yyyy-mm-dd -> dd/mm/yyyy, the workbook's display format. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Parses a typed number, accepting spaces or commas as thousands separators and a trailing %. */
export function parseNumber(text: string): number | null {
  const cleaned = text.replace(/[\s,  ]/g, '').replace(/%$/, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
