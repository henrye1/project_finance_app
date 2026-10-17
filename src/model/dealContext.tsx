import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { computeAll, type Computed } from '../engine/compute';
import { emptyDeal, type Deal } from './deal';
import { loadDeal, saveDeal } from './storage';
import { validateDeal, type FieldError } from './validation';

export interface DealContextValue {
  deal: Deal;
  setDeal: (updater: (d: Deal) => Deal) => void;
  replaceDeal: (d: Deal) => void;
  computed: Computed;
  errors: FieldError[];
  /** True once the user has pressed Calculate on the Project Valuation step. */
  calculated: boolean;
  markCalculated: () => void;
}

const DealContext = createContext<DealContextValue | null>(null);

export function DealProvider({ children, initialDeal }: { children: ReactNode; initialDeal?: Deal }) {
  const [deal, setDealState] = useState<Deal>(() => initialDeal ?? loadDeal() ?? emptyDeal());
  const [calculated, setCalculated] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveDeal(deal), 300);
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [deal]);

  const setDeal = useCallback((updater: (d: Deal) => Deal) => setDealState((d) => updater(d)), []);
  const replaceDeal = useCallback((d: Deal) => {
    setDealState(d);
    setCalculated(false);
  }, []);
  const markCalculated = useCallback(() => setCalculated(true), []);

  const computed = useMemo(() => computeAll(deal), [deal]);
  const errors = useMemo(() => validateDeal(deal), [deal]);

  const value = useMemo(
    () => ({ deal, setDeal, replaceDeal, computed, errors, calculated, markCalculated }),
    [deal, setDeal, replaceDeal, computed, errors, calculated, markCalculated],
  );
  return <DealContext.Provider value={value}>{children}</DealContext.Provider>;
}

export function useDeal(): DealContextValue {
  const ctx = useContext(DealContext);
  if (!ctx) throw new Error('useDeal must be used inside DealProvider');
  return ctx;
}
