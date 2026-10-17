import { describe, it, expect } from 'vitest';
import { normSInv, normSDist, npv } from '../stats';

describe('stats', () => {
  it('normSInv matches Excel NORMSINV', () => {
    // PD Scorecard F6 = -NORMSINV(0.012797...) = 2.232312567066831
    expect(normSInv(0.012797155934034719)).toBeCloseTo(-2.232312567066831, 6);
    expect(normSInv(0.999)).toBeCloseTo(3.090232306, 6);
    expect(normSInv(0.5)).toBeCloseTo(0, 10);
    expect(normSInv(0.007654447841321495)).toBeCloseTo(-2.4253, 3);
  });

  it('normSDist matches Excel NORMSDIST', () => {
    expect(normSDist(1.6448536)).toBeCloseTo(0.95, 6);
    expect(normSDist(0)).toBeCloseTo(0.5, 10);
    expect(normSDist(-1.96)).toBeCloseTo(0.0249979, 6);
  });

  it('npv discounts the first flow by one period like Excel', () => {
    expect(npv(0.1, [100, 100])).toBeCloseTo(173.553719, 6);
    expect(npv(0.1, [])).toBe(0);
  });
});
