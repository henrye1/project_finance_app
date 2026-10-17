import { useRef, type ReactNode } from 'react';
import { useDeal } from '../model/dealContext';
import { emptyDeal, STEP_IDS, type StepId } from '../model/deal';
import { solarCapitalDealFactory } from '../model/exampleDeal';
import { exportDealJson, importDealJson } from '../model/storage';
import { hrefFor, type Route } from './useHashRoute';

export const STEPS: { id: StepId; route: Route; label: string }[] = [
  { id: 'projectInformation', route: 'project-information', label: 'Project Information' },
  { id: 'cashflowDetails', route: 'cashflow-details', label: 'Cashflow Details' },
  { id: 'fundingDetails', route: 'funding-details', label: 'Funding Details' },
  { id: 'projectValuation', route: 'project-valuation', label: 'Project Valuation' },
  { id: 'pdScorecard', route: 'pd-scorecard', label: 'PD Scorecard' },
  { id: 'lgdScorecard', route: 'lgd-scorecard', label: 'LGD Scorecard' },
  { id: 'results', route: 'results', label: 'Results' },
];

const HELP_PAGES: { route: Route; label: string }[] = [
  { route: 'terms-of-use', label: 'Terms of Use' },
  { route: 'reference-tables', label: 'Reference Tables' },
  { route: 'recovery-under-restructure', label: 'Recovery Under Restructure' },
];

export function Layout({ route, onNavigate, children }: { route: Route; onNavigate: (r: Route) => void; children: ReactNode }) {
  const go = (r: Route) => (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate(r);
  };
  const { deal, computed, replaceDeal } = useDeal();
  const fileInput = useRef<HTMLInputElement>(null);

  const onExport = () => {
    const blob = new Blob([exportDealJson(deal)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(deal.projectInformation.dealName || 'deal').replace(/[^\w.-]+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      replaceDeal(importDealJson(await file.text()));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Could not read that file');
    }
  };
  const onNew = () => {
    if (window.confirm('Start a new deal? This replaces the deal saved in this browser. Export the current deal first if you want to keep it.')) replaceDeal(emptyDeal());
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-title">Project Finance Scorecard</span>
          <span className="brand-deal" data-testid="deal-name">
            {deal.projectInformation.dealName || 'New deal'}
          </span>
        </div>
        <div className="actions">
          <button type="button" onClick={onNew}>
            New deal
          </button>
          <button type="button" onClick={() => replaceDeal(solarCapitalDealFactory())}>
            Load example
          </button>
          <button type="button" onClick={() => fileInput.current?.click()}>
            Import JSON
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => onImportFile(e.target.files?.[0])} />
          <button type="button" onClick={onExport}>
            Export JSON
          </button>
        </div>
      </header>
      <div className="body">
        <nav className="rail" aria-label="Steps">
          <a href={hrefFor('instructions')} onClick={go('instructions')} className={`rail-link home${route === 'instructions' ? ' active' : ''}`}>
            Instructions
          </a>
          <ol className="rail-steps">
            {STEPS.map((s, i) => (
              <li key={s.id}>
                <a href={hrefFor(s.route)} onClick={go(s.route)} className={`rail-link${route === s.route ? ' active' : ''}`} data-status={computed.stepStatus[s.id]} aria-current={route === s.route ? 'page' : undefined}>
                  <span className="rail-num">{i + 1}</span> <span className="rail-label">{s.label}</span>
                  <span className={`status-dot ${computed.stepStatus[s.id]}`} title={computed.stepStatus[s.id]} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ol>
          <div className="rail-section">Help and reference</div>
          <ul className="rail-help">
            {HELP_PAGES.map((h) => (
              <li key={h.route}>
                <a href={hrefFor(h.route)} onClick={go(h.route)} className={`rail-link${route === h.route ? ' active' : ''}`}>
                  {h.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

export function stepIndex(id: StepId): number {
  return STEP_IDS.indexOf(id) + 1;
}
