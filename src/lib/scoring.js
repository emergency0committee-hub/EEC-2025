// src/lib/scoring.js

// ---------- helpers ----------
const LETTERS = ["R", "I", "A", "S", "E", "C"];
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const pct = (num) => Math.round(num * 100);

// ---------- RIASEC (letters) ----------
export function riasecFromAnswers(questions = [], ansMap = {}) {
  const sums = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  questions.forEach((q) => {
    if (!q?.code) return;
    if (Object.prototype.hasOwnProperty.call(ansMap, q.id)) {
      const v = Number(ansMap[q.id]); // Likert 1..5
      if (!Number.isNaN(v)) sums[q.code] += v;
    }
  });
  return sums;
}

export function answeredCountByLetter(questions = [], ansMap = {}) {
  const counts = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  questions.forEach((q) => {
    if (!q?.code) return;
    if (Object.prototype.hasOwnProperty.call(ansMap, q.id)) {
      counts[q.code] += 1;
    }
  });
  return counts;
}

export function topRIASECFiltered(sums, counts) {
  const arr = LETTERS
    .filter((L) => counts[L] > 0)
    .map((L) => ({ L, val: sums[L] / counts[L] }))
    .sort((a, b) => b.val - a.val);
  return arr.slice(0, 3).map((x) => x.L).join("");
}

export function riasecRadarDataFiltered(sums, counts, maxScale = 5) {
  return LETTERS.map((L) => {
    const a = counts[L] || 0;
    const s = sums[L] || 0;
    const p = a > 0 ? (s / (a * maxScale)) : 0;
    return { code: L, score: pct(clamp01(p)) };
  });
}

// ---------- RIASEC Areas (Basic Interests) ----------
export function riasecAreaPercents(questions = [], ansMap = {}, maxScale = 5) {
  const buckets = new Map(); // area -> { code, sum, n }
  questions.forEach((q) => {
    if (!q?.area || !q?.code) return;
    if (!Object.prototype.hasOwnProperty.call(ansMap, q.id)) return;
    const v = Number(ansMap[q.id]);
    if (Number.isNaN(v)) return;

    if (!buckets.has(q.area)) buckets.set(q.area, { code: q.code, sum: 0, n: 0 });
    const b = buckets.get(q.area);
    if (!b.code) b.code = q.code; // keep first if mixed (shouldn't happen)
    b.sum += v;
    b.n += 1;
  });

  const out = [];
  for (const [area, { code, sum, n }] of buckets.entries()) {
    if (n > 0) out.push({ area, code, percent: pct(clamp01(sum / (n * maxScale))) });
  }
  out.sort((a, b) => b.percent - a.percent);
  return out;
}

// ---------- Section D: Interest clusters ----------
export function interestPercents(qInt = [], ansMap = {}) {
  const agg = new Map(); // cluster -> { sum, n }
  qInt.forEach((q) => {
    if (!q?.cluster) return;
    if (!Object.prototype.hasOwnProperty.call(ansMap, q.id)) return;
    const v = Number(ansMap[q.id]); // Like=1, Dislike=0
    if (Number.isNaN(v)) return;
    if (!agg.has(q.cluster)) agg.set(q.cluster, { sum: 0, n: 0 });
    const a = agg.get(q.cluster);
    a.sum += v;
    a.n += 1;
  });

  const out = [];
  for (const [cluster, { sum, n }] of agg.entries()) {
    if (n > 0) out.push({ cluster, percent: pct(clamp01(sum / n)) });
  }
  out.sort((a, b) => b.percent - a.percent);
  return out;
}

// ---------- Aptitude ----------
export function aptitudeAggFromAnswers(qs = [], ansMCQ = {}) {
  const agg = {};
  qs.forEach((q) => {
    if (!agg[q.domain]) agg[q.domain] = { correct: 0, total: 0 };
    const chosen = ansMCQ[q.id];
    if (typeof chosen === "number") {
      agg[q.domain].total += 1;
      if (chosen === q.correct) agg[q.domain].correct += 1;
    }
  });
  return agg;
}

export function aptitudeBarData(agg = {}) {
  return Object.entries(agg).map(([domain, v]) => ({
    domain,
    score: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
  }));
}
