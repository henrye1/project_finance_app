/** Statistical helpers reproducing Excel's NORMSINV, NORMSDIST and NPV. */

/** Inverse standard normal CDF (Acklam's algorithm with one Newton refinement step). */
export function normSInv(p: number): number {
  if (p <= 0 || p >= 1) return NaN;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let x: number;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const e = normSDist(x) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}

/** Standard normal CDF. */
export function normSDist(z: number): number {
  return 0.5 * erfc(-z / Math.SQRT2);
}

/**
 * Complementary error function, W. J. Cody's rational Chebyshev approximation
 * (as used in many numerical libraries), relative error below 1e-15.
 */
function erfc(x: number): number {
  const ax = Math.abs(x);
  let result: number;
  if (ax < 0.5) {
    const t = x * x;
    const top = (((0.185777706184603153 * t + 3.16112374387056560) * t + 113.864154151050156) * t + 377.485237685302021) * t + 3209.37758913846947;
    const bot = (((t + 23.6012909523441209) * t + 244.024637934444173) * t + 1282.61652607737228) * t + 2844.23683343917062;
    result = 1 - (x * top) / bot;
    return result;
  }
  if (ax < 4) {
    const top =
      (((((((2.15311535474403846e-8 * ax + 0.564188496988670089) * ax + 8.88314979438837594) * ax + 66.1191906371416295) * ax + 298.635138197400131) * ax + 881.95222124176909) * ax + 1712.04761263407058) * ax + 2051.07837782607147) * ax + 1230.33935479799725;
    const bot =
      (((((((ax + 15.7449261107098347) * ax + 117.693950891312499) * ax + 537.181101862009858) * ax + 1621.38957456669019) * ax + 3290.79923573345963) * ax + 4362.61909014324716) * ax + 3439.36767414372164) * ax + 1230.33935480374942;
    result = Math.exp(-ax * ax) * (top / bot);
  } else {
    const t = 1 / (ax * ax);
    const top = (((0.0163153871373020978 * t + 0.305326634961232344) * t + 0.360344899949804439) * t + 0.125781726111229246) * t + 0.0160837851487422766;
    const bot = (((t + 2.56852019228982242) * t + 1.87295284992346725) * t + 0.527905102951428412) * t + 0.0605183413124413191;
    result = (Math.exp(-ax * ax) / ax) * (1 / Math.sqrt(Math.PI) - (t * top) / bot);
  }
  return x < 0 ? 2 - result : result;
}

/** Excel NPV: the first cash flow is discounted by one period. */
export function npv(rate: number, flows: number[]): number {
  let total = 0;
  for (let i = 0; i < flows.length; i++) {
    total += flows[i] / Math.pow(1 + rate, i + 1);
  }
  return total;
}
