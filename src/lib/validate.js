// src/lib/validate.js

/**
 * Lightweight schema guard for question banks.
 * - Logs warnings and skips bad items instead of crashing the app.
 * - Keeps your app running even if a question has a typo.
 */

export function validateArray(name, arr, checks) {
  if (!Array.isArray(arr)) {
    console.warn(`[validate] ${name} is not an array`);
    return [];
  }
  const out = [];
  arr.forEach((item, i) => {
    const ok = checks.every((fn) => {
      try {
        return fn(item);
      } catch (_e) {
        return false;
      }
    });
    if (!ok) {
      console.warn(`[validate] Skipping invalid ${name}[${i}]`, item);
    } else {
      out.push(item);
    }
  });
  return out;
}

/**
 * Validate the full question set.
 * - RIASEC accepts optional `area` (string) in addition to required fields.
 * - Aptitude requires options[] and a valid `correct` index.
 * - Work and Interests accept simple Like/Dislike format.
 * Also warns on duplicate IDs across all sections.
 */
export function validateAll({ Q_RIASEC, Q_APT, Q_WORK, Q_INT }) {
  // RIASEC: id, text, code; area is optional string
  const riasec = validateArray("Q_RIASEC", Q_RIASEC, [
    (q) => Number.isInteger(q?.id),
    (q) => typeof q?.text === "string" && q.text.trim().length > 0,
    (q) => typeof q?.code === "string" && q.code.trim().length >= 1,
    (q) => q?.area === undefined || typeof q.area === "string",
  ]);

  // Aptitude: id, text, domain, options[], correct idx
  const apt = validateArray("Q_APT", Q_APT, [
    (q) => Number.isInteger(q?.id),
    (q) => typeof q?.text === "string" && q.text.trim().length > 0,
    (q) => typeof q?.domain === "string" && q.domain.trim().length > 0,
    (q) => Array.isArray(q?.options) && q.options.length >= 2 && q.options.every((o) => typeof o === "string"),
    (q) => Number.isInteger(q?.correct) && q.correct >= 0 && q.correct < (q.options?.length || 0),
  ]);

  // Work: id, key, text
  const work = validateArray("Q_WORK", Q_WORK, [
    (q) => Number.isInteger(q?.id),
    (q) => typeof q?.text === "string" && q.text.trim().length > 0,
    (q) => typeof q?.key === "string" && q.key.trim().length > 0,
  ]);

  // Interests: id, cluster, text
  const int = validateArray("Q_INT", Q_INT, [
    (q) => Number.isInteger(q?.id),
    (q) => typeof q?.text === "string" && q.text.trim().length > 0,
    (q) => typeof q?.cluster === "string" && q.cluster.trim().length > 0,
  ]);

  // Warn on duplicate IDs across all sections (does not block)
  const allIds = [...riasec, ...apt, ...work, ...int].map((q) => q.id);
  const seen = new Set();
  const dupes = [];
  for (const id of allIds) {
    if (seen.has(id)) dupes.push(id);
    seen.add(id);
  }
  if (dupes.length) {
    console.warn("[validate] Duplicate IDs detected across sections:", Array.from(new Set(dupes)));
  }

  return { Q_RIASEC: riasec, Q_APT: apt, Q_WORK: work, Q_INT: int };
}
