/**
 * Date helpers reproducing the Excel functions the workbook relies on.
 * All public functions take and return ISO strings (yyyy-mm-dd) and work in UTC.
 */
import type { Frequency, PaymentFrequency } from './types';

export function parseIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Excel EOMONTH: last day of the month `months` after the given date. */
export function eomonth(iso: string, months: number): string {
  const d = parseIso(iso);
  const total = d.getUTCMonth() + months;
  const year = d.getUTCFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  return toIso(new Date(Date.UTC(year, month, daysInMonth(year, month))));
}

/** Excel EDATE: same day `months` later, clamped to the end of the target month. */
export function edate(iso: string, months: number): string {
  const d = parseIso(iso);
  const total = d.getUTCMonth() + months;
  const year = d.getUTCFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const day = Math.min(d.getUTCDate(), daysInMonth(year, month));
  return toIso(new Date(Date.UTC(year, month, day)));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86_400_000);
}

/** (Y2-Y1)*12 + (M2-M1), the sheet's whole-month difference. */
export function monthsBetween(a: string, b: string): number {
  const da = parseIso(a);
  const db = parseIso(b);
  return (db.getUTCFullYear() - da.getUTCFullYear()) * 12 + (db.getUTCMonth() - da.getUTCMonth());
}

/** Excel YEARFRAC basis 0 (US NASD 30/360). */
export function yearFrac30360(a: string, b: string): number {
  let start = parseIso(a);
  let end = parseIso(b);
  if (start > end) [start, end] = [end, start];
  let d1 = start.getUTCDate();
  let d2 = end.getUTCDate();
  const m1 = start.getUTCMonth();
  const m2 = end.getUTCMonth();
  const y1 = start.getUTCFullYear();
  const y2 = end.getUTCFullYear();
  const lastDayFeb = (d: Date) => d.getUTCMonth() === 1 && d.getUTCDate() === daysInMonth(d.getUTCFullYear(), 1);
  if (lastDayFeb(start) && lastDayFeb(end)) d2 = 30;
  if (lastDayFeb(start)) d1 = 30;
  if (d2 === 31 && d1 >= 30) d2 = 30;
  if (d1 === 31) d1 = 30;
  return ((y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1)) / 360;
}

export function yearOf(iso: string): number {
  return parseIso(iso).getUTCFullYear();
}

export function compareIso(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function frequencyMonths(f: Frequency): number {
  switch (f) {
    case 'monthly':
      return 1;
    case 'quarterly':
      return 3;
    case 'semi-annually':
      return 6;
    case 'annually':
      return 12;
  }
}

export function paymentFrequencyMonths(f: PaymentFrequency): number {
  switch (f) {
    case 'Monthly':
      return 1;
    case 'Bi-Monthly':
      return 2;
    case 'Quarterly':
      return 3;
    case 'Semi-Annual':
      return 6;
    case 'Annual':
      return 12;
  }
}
