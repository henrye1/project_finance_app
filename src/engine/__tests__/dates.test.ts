import { describe, it, expect } from 'vitest';
import {
  eomonth,
  edate,
  daysBetween,
  monthsBetween,
  yearFrac30360,
  yearOf,
  compareIso,
  frequencyMonths,
  paymentFrequencyMonths,
  parseIso,
  toIso,
} from '../dates';

describe('dates', () => {
  it('parses and formats ISO dates in UTC', () => {
    expect(toIso(parseIso('2012-12-31'))).toBe('2012-12-31');
    expect(parseIso('2012-12-31').getUTCHours()).toBe(0);
  });

  it('eomonth behaves like Excel', () => {
    expect(eomonth('2012-12-31', 1)).toBe('2013-01-31');
    expect(eomonth('2013-01-31', 1)).toBe('2013-02-28');
    expect(eomonth('2014-06-30', 6)).toBe('2014-12-31');
    expect(eomonth('2014-06-15', 0)).toBe('2014-06-30');
    expect(eomonth('2016-03-31', -1)).toBe('2016-02-29');
  });

  it('edate clamps the day of month', () => {
    expect(edate('2012-12-31', 198)).toBe('2029-06-30');
    expect(edate('2014-12-31', 6)).toBe('2015-06-30');
    expect(edate('2015-01-31', 1)).toBe('2015-02-28');
    expect(edate('2014-12-31', 0)).toBe('2014-12-31');
  });

  it('counts days and whole months', () => {
    expect(daysBetween('2014-06-30', '2014-12-31')).toBe(184);
    expect(daysBetween('2014-12-31', '2015-06-30')).toBe(181);
    expect(monthsBetween('2012-12-31', '2036-06-30')).toBe(282);
    expect(monthsBetween('2012-12-31', '2014-06-30')).toBe(18);
  });

  it('yearfrac uses US 30/360', () => {
    expect(yearFrac30360('2017-12-31', '2020-06-30')).toBeCloseTo(2.5, 10);
    expect(yearFrac30360('2017-12-31', '2036-06-30')).toBeGreaterThan(5);
    expect(yearFrac30360('2020-01-15', '2020-02-15')).toBeCloseTo(30 / 360, 10);
  });

  it('year and comparison helpers', () => {
    expect(yearOf('2017-12-31')).toBe(2017);
    expect(compareIso('2017-12-31', '2018-01-01')).toBeLessThan(0);
    expect(compareIso('2018-01-01', '2018-01-01')).toBe(0);
  });

  it('frequency month steps', () => {
    expect(frequencyMonths('monthly')).toBe(1);
    expect(frequencyMonths('quarterly')).toBe(3);
    expect(frequencyMonths('semi-annually')).toBe(6);
    expect(frequencyMonths('annually')).toBe(12);
    expect(paymentFrequencyMonths('Bi-Monthly')).toBe(2);
    expect(paymentFrequencyMonths('Semi-Annual')).toBe(6);
  });
});
