export function validateAll(answers) {
  // Basic validation: ensure all questions are answered
  if (!answers || typeof answers !== 'object') return false;
  // Assuming answers is an object with question ids as keys
  for (const key in answers) {
    if (answers[key] === null || answers[key] === undefined) return false;
  }
  return true;
}
