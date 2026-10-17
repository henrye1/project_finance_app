import { useEffect, useState, type ReactNode } from 'react';
import { fmtAmount, fmtDate, fmtNumber, fmtPct, parseNumber } from './format';
import type { FieldColour } from './Field';

export type CellKind = 'text' | 'amount' | 'number' | 'percent' | 'date' | 'select' | 'static';

export interface Column<Row> {
  key: string;
  label: string;
  kind: CellKind;
  get: (row: Row) => string | number | null;
  set?: (row: Row, value: string | number | null) => Row;
  options?: readonly string[];
  digits?: number;
  colour?: FieldColour;
  width?: string;
  align?: 'left' | 'right';
}

interface Props<Row> {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row, index: number) => string;
  onChange?: (index: number, row: Row) => void;
  caption?: string;
  footer?: ReactNode;
  emptyMessage?: string;
  highlightRow?: (row: Row) => boolean;
  compact?: boolean;
}

function display(kind: CellKind, v: string | number | null, digits?: number): string {
  if (v === null || v === undefined) return '';
  switch (kind) {
    case 'amount':
      return fmtAmount(v as number);
    case 'number':
      return fmtNumber(v as number, digits ?? 2);
    case 'percent':
      return fmtPct(v as number, digits ?? 2);
    case 'date':
      return fmtDate(v as string);
    default:
      return String(v);
  }
}

function NumericCell({ value, scale, onCommit, className, onPaste }: { value: number | null; scale: number; onCommit: (v: number | null) => void; className: string; onPaste?: (values: number[]) => void }) {
  const toText = (v: number | null) => (v === null ? '' : String(Number((v * scale).toFixed(10))));
  const [text, setText] = useState(toText(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(toText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused]);
  return (
    <input
      className={className}
      inputMode="decimal"
      value={focused ? text : value === null ? '' : scale === 100 ? fmtPct(value) : fmtAmount(value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseNumber(e.target.value);
        onCommit(n === null ? null : n / scale);
      }}
      onPaste={(e) => {
        if (!onPaste) return;
        const lines = e.clipboardData
          .getData('text')
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l !== '');
        if (lines.length <= 1) return;
        e.preventDefault();
        const values = lines.map((l) => parseNumber(l.split('\t').pop() ?? l)).map((n) => (n === null ? 0 : n / scale));
        onPaste(values);
      }}
    />
  );
}

export function DataTable<Row>({ columns, rows, rowKey, onChange, caption, footer, emptyMessage, highlightRow, compact }: Props<Row>) {
  const editable = Boolean(onChange);
  const pasteColumn = (startIndex: number, col: Column<Row>, values: number[]) => {
    if (!onChange || !col.set) return;
    values.forEach((v, k) => {
      const idx = startIndex + k;
      if (idx < rows.length) onChange(idx, col.set!(rows[idx], v));
    });
  };
  return (
    <div className={`table-wrap${compact ? ' compact' : ''}`}>
      <table className="data-table">
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width }} className={c.align ?? (c.kind === 'text' || c.kind === 'select' || c.kind === 'date' ? 'left' : 'right')}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="empty">
                {emptyMessage ?? 'Nothing captured yet.'}
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr key={rowKey(row, i)} className={highlightRow?.(row) ? 'highlight' : undefined}>
              {columns.map((c) => {
                const value = c.get(row);
                const canEdit = editable && c.set && c.kind !== 'static';
                const colour = c.colour ?? (c.kind === 'select' ? 'choice' : c.kind === 'static' ? 'calc' : 'capture');
                const cls = `cell-input ${colour}`;
                if (!canEdit) {
                  return (
                    <td key={c.key} className={`${c.align ?? (c.kind === 'text' || c.kind === 'select' || c.kind === 'date' ? 'left' : 'right')} ${c.kind === 'static' ? 'calc' : ''}`}>
                      {display(c.kind, value, c.digits)}
                    </td>
                  );
                }
                const commit = (v: string | number | null) => onChange!(i, c.set!(row, v));
                return (
                  <td key={c.key} className={c.align ?? (c.kind === 'text' || c.kind === 'select' || c.kind === 'date' ? 'left' : 'right')}>
                    {c.kind === 'select' ? (
                      <select className={cls} value={(value as string | null) ?? ''} onChange={(e) => commit(e.target.value || null)} aria-label={c.label}>
                        <option value="">Select…</option>
                        {c.options?.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : c.kind === 'date' ? (
                      <input type="date" className={cls} value={(value as string | null) ?? ''} onChange={(e) => commit(e.target.value || null)} aria-label={c.label} />
                    ) : c.kind === 'text' ? (
                      <input className={cls} value={(value as string | null) ?? ''} onChange={(e) => commit(e.target.value)} aria-label={c.label} />
                    ) : (
                      <NumericCell
                        className={cls}
                        value={value as number | null}
                        scale={c.kind === 'percent' ? 100 : 1}
                        onCommit={commit}
                        onPaste={(values) => pasteColumn(i, c, values)}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {footer && <tfoot>{footer}</tfoot>}
      </table>
    </div>
  );
}
