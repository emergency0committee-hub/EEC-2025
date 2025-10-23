const STORAGE_KEY = "cg_submissions_v1";
export const readSubs = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
};
export const writeSubs = (rows) => localStorage.setItem(STORAGE_KEY, JSON.stringify(rows || []));
