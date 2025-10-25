import { Q_UNIFIED } from "../questionBank.js";

export function riasecFromAnswers(questions, answers) {
  // Calculate RIASEC scores from answers
  const scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  for (const q of questions) {
    const answer = answers[q.id];
    if (answer != null && q.code) {
      scores[q.code] = (scores[q.code] || 0) + answer;
    }
  }
  return scores;
}

export function answeredCountByLetter(questions, answers) {
  const counts = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  for (const q of questions) {
    if (answers[q.id] != null && q.code) {
      counts[q.code] = (counts[q.code] || 0) + 1;
    }
  }
  return counts;
}

export function topRIASECFiltered(scores, counts) {
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return entries.slice(0, 3).map(([code, score]) => ({ code, score, count: counts[code] || 0 }));
}

export function riasecRadarDataFiltered(scores, counts, maxScale) {
  // Percent per theme = (sum answers) / (answered * maxScale) * 100
  return Object.entries(scores).map(([code, raw]) => ({
    code,
    score: counts[code] > 0 ? (raw / (counts[code] * maxScale)) * 100 : 0,
  }));
}

export function riasecAreaPercents(questions, answers, maxScale) {
  // Compute percent per AREA within each theme code
  const map = new Map(); // key: `${code}||${area}` -> { sum, count }
  for (const q of questions || []) {
    const v = answers?.[q.id];
    if (v == null) continue;
    const code = q.code;
    const area = q.area || "";
    if (!code || !area) continue;
    const key = `${code}||${area}`;
    const cur = map.get(key) || { sum: 0, count: 0 };
    cur.sum += Number(v) || 0;
    cur.count += 1;
    map.set(key, cur);
  }
  const out = [];
  for (const [key, agg] of map.entries()) {
    const [code, area] = key.split("||");
    const max = agg.count * maxScale;
    const percent = max > 0 ? (agg.sum / max) * 100 : 0;
    out.push({ code, area, percent });
  }
  // sort by highest percent first
  out.sort((a, b) => b.percent - a.percent);
  return out;
}

export function interestPercents(questions, answers) {
  // Calculate interest percentages based on question responses
  const interestCounts = {};
  const totalQuestions = questions.length;

  for (const q of questions) {
    const answer = answers[q.id];
    if (answer != null && q.cluster) {
      interestCounts[q.cluster] = (interestCounts[q.cluster] || 0) + answer;
    }
  }

  return Object.entries(interestCounts).map(([cluster, totalScore]) => ({
    cluster,
    percentage: totalQuestions > 0 ? (totalScore / (totalQuestions * 5)) * 100 : 0,
  }));
}

export function getTopCareers(scores, occupations) {
  // Simple logic: sort occupations by match to scores
  // This is a placeholder; implement proper matching logic
  return occupations.slice(0, 5); // Return top 5
}
