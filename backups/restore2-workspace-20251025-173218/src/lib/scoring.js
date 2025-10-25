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
  // Return top 3 RIASEC types based on scores
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return entries.slice(0, 3).map(([type, score]) => ({ type, score, count: counts[type] || 0 }));
}

export function riasecRadarDataFiltered(scores, counts, maxScale) {
  // Prepare data for radar chart
  return Object.entries(scores).map(([type, score]) => ({
    type,
    score: counts[type] > 0 ? (score / (counts[type] * maxScale)) * 100 : 0,
  }));
}

export function riasecAreaPercents(questions, answers, maxScale) {
  const scores = riasecFromAnswers(questions, answers);
  const counts = answeredCountByLetter(questions, answers);
  return Object.entries(scores).map(([type, score]) => ({
    type,
    percent: counts[type] > 0 ? (score / (counts[type] * maxScale)) * 100 : 0,
  }));
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
