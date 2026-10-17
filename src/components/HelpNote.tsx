import { useId, useState } from 'react';

/** Inline help toggle, the app's version of the workbook's "Help" links and cell comments. */
export function HelpNote({ text, label = 'Help' }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="help">
      <button type="button" className="help-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} title={label}>
        ?
      </button>
      {open && (
        <span id={id} role="note" className="help-text">
          {text}
        </span>
      )}
    </span>
  );
}

/** A visible note explaining where the app deliberately differs from the workbook. */
export function DeviationNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="deviation" role="note">
      <strong>Differs from the workbook.</strong> {children}
    </p>
  );
}
