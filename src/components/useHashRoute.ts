import { useCallback, useEffect, useState } from 'react';

export type Route =
  | 'instructions'
  | 'project-information'
  | 'cashflow-details'
  | 'funding-details'
  | 'project-valuation'
  | 'pd-scorecard'
  | 'lgd-scorecard'
  | 'results'
  | 'terms-of-use'
  | 'reference-tables'
  | 'recovery-under-restructure';

const ROUTES: Route[] = [
  'instructions',
  'project-information',
  'cashflow-details',
  'funding-details',
  'project-valuation',
  'pd-scorecard',
  'lgd-scorecard',
  'results',
  'terms-of-use',
  'reference-tables',
  'recovery-under-restructure',
];

function parse(hash: string): Route {
  const name = hash.replace(/^#\/?/, '').split('?')[0];
  return (ROUTES as string[]).includes(name) ? (name as Route) : 'instructions';
}

export function useHashRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = useCallback((r: Route) => {
    window.location.hash = `#/${r}`;
    setRoute(r);
  }, []);
  return [route, navigate];
}

export function hrefFor(r: Route): string {
  return `#/${r}`;
}
