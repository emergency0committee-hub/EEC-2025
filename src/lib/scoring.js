import { Q_UNIFIED } from "../questionBank.js";

export function riasecFromAnswers(answers) {
  // Calculate RIASEC scores from answers
  const scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  for (const [qid, answer] of Object.entries(answers)) {
    const question = Q_UNIFIED.find(q => q.id == qid);
    if (question) {
      scores[question.type] += answer; // Assuming answer is a number
    }
  }
  return scores;
}

export function answeredCountByLetter(questions, answers) {
  const counts = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  for (const q of questions) {
    if (answers[q.id] != null) {
      counts[q.type] += 1;
    }
  }
  return counts;
}

export function topRIASECFiltered(scores, counts) {
  // Return top 3 RIASEC types based on scores
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return entries.slice(0, 3).map(([type, score]) => ({ type, score, count: counts[type] }));
}

export function riasecRadarDataFiltered(scores, counts, maxScale) {
  // Prepare data for radar chart
  return Object.entries(scores).map(([type, score]) => ({
    type,
    score: (score / (counts[type] * maxScale)) * 100, // Percentage
  }));
}

export function riasecAreaPercents(questions, answers, maxScale) {
  const scores = riasecFromAnswers(answers);
  const counts = answeredCountByLetter(questions, answers);
  return Object.entries(scores).map(([type, score]) => ({
    type,
    percent: counts[type] > 0 ? (score / (counts[type] * maxScale)) * 100 : 0,
  }));
}

export function interestPercents(questions, answers) {
  // Placeholder for interest percentages
  return [];
}

export function getTopCareers(scores, occupations) {
  // Simple logic: sort occupations by match to scores
  // This is a placeholder; implement proper matching logic
  return occupations.slice(0, 5); // Return top 5
}
