import { useMemo, useState } from 'react';
import { glossary } from '../data';

interface Entry {
  id: string | null;
  title: string;
  text: string;
}

const ID_PATTERN = /^([A-H]\d(\.\d)*|\d+(\.\d+)*[a-z]?|H\d\.\d)$/;

function buildEntries(): Entry[] {
  const byText = new Map<string, string[]>();
  for (const [key, text] of Object.entries(glossary)) {
    const keys = byText.get(text) ?? [];
    keys.push(key);
    byText.set(text, keys);
  }
  const entries: Entry[] = [];
  for (const [text, keys] of byText) {
    const id = keys.find((k) => ID_PATTERN.test(k)) ?? null;
    const title = keys.find((k) => !ID_PATTERN.test(k)) ?? keys[0];
    entries.push({ id, title, text });
  }
  return entries;
}

export function TermsOfUsePage() {
  const [query, setQuery] = useState('');
  const entries = useMemo(buildEntries, []);
  const q = query.trim().toLowerCase();
  const shown = q ? entries.filter((e) => e.title.toLowerCase().includes(q) || e.text.toLowerCase().includes(q) || (e.id ?? '').toLowerCase().includes(q)) : entries;
  return (
    <article className="page">
      <h1>Terms of Use</h1>
      <p className="lede">The workbook's description and guide sheet: what each captured field means and how to answer each scorecard question. The same text appears behind the help buttons on the input pages.</p>
      <input type="search" className="field-input search" placeholder="Search the glossary" aria-label="Search the glossary" value={query} onChange={(e) => setQuery(e.target.value)} />
      <p className="muted">
        {shown.length} of {entries.length} entries
      </p>
      <dl className="glossary">
        {shown.map((e) => (
          <div key={`${e.id ?? ''}-${e.title}`}>
            <dt>
              {e.id && <span className="section-code">{e.id}</span>}
              {e.title}
            </dt>
            <dd>{e.text}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
