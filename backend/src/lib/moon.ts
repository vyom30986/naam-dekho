/**
 * Moon position, for the birth-star (nakshatra) calculation.
 *
 * WHY THIS EXISTS: the Avakahada chakra is traditionally run one way — the
 * baby's birth nakshatra prescribes the syllables the name should start with.
 * Without a birth date we could only run it backwards ("this syllable belongs
 * to these stars"), which is a curiosity. With a date we can do the real
 * thing a pandit does.
 *
 * Method: Meeus, *Astronomical Algorithms*, chapter 47 — the abridged lunar
 * theory (the largest periodic terms). Accuracy is roughly ±0.2°, against a
 * nakshatra 13°20' wide, so the answer is solid except within a few minutes
 * of a boundary — and those cases are reported as uncertain rather than
 * guessed.
 *
 * Sidereal (Vedic) longitude = tropical − ayanamsa. We use Lahiri, the
 * ayanamsa the Government of India's calendar committee adopted and the one
 * Indian almanacs print.
 */

const DEG = Math.PI / 180;
const norm360 = (x: number) => ((x % 360) + 360) % 360;

/** Julian Day from a UTC date. */
export function julianDay(date: Date): number {
  return date.getTime() / 86_400_000 + 2440587.5;
}

/**
 * Lahiri ayanamsa in degrees.
 *
 * Chitrapaksha (Lahiri): 23°51'11" at the start of 2000, precessing at
 * ~50.29" per year. Linear is ample here — the drift over a human lifetime
 * is under a hundredth of a nakshatra.
 */
export function lahiriAyanamsa(jd: number): number {
  const yearsSince2000 = (jd - 2451545.0) / 365.25;
  return 23.85306 + (yearsSince2000 * 50.29) / 3600;
}

/** Moon's apparent tropical ecliptic longitude, in degrees. */
export function moonTropicalLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525;

  // Mean elements (Meeus 47.1–47.5)
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + (T ** 3) / 538841 - (T ** 4) / 65194000;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + (T ** 3) / 545868 - (T ** 4) / 113065000;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + (T ** 3) / 24490000;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + (T ** 3) / 69699 - (T ** 4) / 14712000;
  const F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - (T ** 3) / 3526000 + (T ** 4) / 863310000;

  // Eccentricity correction for terms involving the Sun's anomaly
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;

  const d = norm360(D) * DEG;
  const m = norm360(M) * DEG;
  const mp = norm360(Mp) * DEG;
  const f = norm360(F) * DEG;

  // The principal periodic terms of Meeus table 47.A, in units of 1e-6 degrees.
  // Terms below ~10000 contribute less than 0.01° and are omitted.
  const terms: Array<[number, number, number, number, number]> = [
    // coefficient, D, M, M', F
    [6288774, 0, 0, 1, 0],
    [1274027, 2, 0, -1, 0],
    [658314, 2, 0, 0, 0],
    [213618, 0, 0, 2, 0],
    [-185116, 0, 1, 0, 0],
    [-114332, 0, 0, 0, 2],
    [58793, 2, 0, -2, 0],
    [57066, 2, -1, -1, 0],
    [53322, 2, 0, 1, 0],
    [45758, 2, -1, 0, 0],
    [-40923, 0, 1, -1, 0],
    [-34720, 1, 0, 0, 0],
    [-30383, 0, 1, 1, 0],
    [15327, 2, 0, 0, -2],
    [-12528, 0, 0, 1, 2],
    [10980, 0, 0, 1, -2],
    [10675, 4, 0, -1, 0],
    [10034, 0, 0, 3, 0],
    [8548, 4, 0, -2, 0],
    [-7888, 2, 1, -1, 0],
    [-6766, 2, 1, 0, 0],
    [-5163, 1, 0, -1, 0],
    [4987, 1, 1, 0, 0],
    [4036, 2, -1, 1, 0],
    [3994, 2, 0, 2, 0],
    [3861, 4, 0, 0, 0],
    [3665, 2, 0, -3, 0],
    [-2689, 0, 1, -2, 0],
    [-2602, 2, 0, -1, 2],
    [2390, 2, -1, -2, 0],
    [-2348, 1, 0, 1, 0],
    [2236, 2, -2, 0, 0],
    [-2120, 0, 1, 2, 0],
    [-2069, 0, 2, 0, 0],
    [2048, 2, -2, -1, 0],
    [-1773, 2, 0, 1, -2],
    [-1595, 2, 0, 0, 2],
    [1215, 4, -1, -1, 0],
    [-1110, 0, 0, 2, 2],
    [-892, 3, 0, -1, 0],
    [-810, 2, 1, 1, 0],
    [759, 4, -1, -2, 0],
    [-713, 0, 2, -1, 0],
    [-700, 2, 2, -1, 0],
    [691, 2, 1, -2, 0],
    [596, 2, -1, 0, -2],
    [549, 4, 0, 1, 0],
    [537, 0, 0, 4, 0],
    [520, 4, -1, 0, 0],
    [-487, 1, 0, -2, 0],
  ];

  let sum = 0;
  for (const [coef, cd, cm, cmp, cf] of terms) {
    // Terms containing M are scaled by the eccentricity correction.
    const scale = Math.abs(cm) === 1 ? E : Math.abs(cm) === 2 ? E * E : 1;
    sum += coef * scale * Math.sin(cd * d + cm * m + cmp * mp + cf * f);
  }

  return norm360(Lp + sum / 1_000_000);
}

/** Moon's sidereal (Vedic) longitude in degrees, Lahiri ayanamsa. */
export function moonSiderealLongitude(date: Date): number {
  const jd = julianDay(date);
  return norm360(moonTropicalLongitude(jd) - lahiriAyanamsa(jd));
}

export interface NakshatraPosition {
  /** 0-based index into the 27 nakshatras. */
  index: number;
  /** 1-based pada, 1..4. */
  pada: number;
  /** Sidereal longitude, degrees. */
  longitude: number;
  /** How far through the current nakshatra, 0..1 — used to spot boundaries. */
  through: number;
}

const NAK_WIDTH = 360 / 27; // 13°20'

export function nakshatraAt(date: Date): NakshatraPosition {
  const longitude = moonSiderealLongitude(date);
  const raw = longitude / NAK_WIDTH;
  const index = Math.floor(raw);
  const through = raw - index;
  return {
    index,
    pada: Math.floor(through * 4) + 1,
    longitude,
    through,
  };
}
