import { supabase } from "./supabase.js";

const TRAINING_KIND_WHITELIST = ["classwork", "homework", "quiz", "lecture", "test"];
const normalizeTrainingKind = (value) => {
  const str = String(value || "").trim().toLowerCase();
  if (TRAINING_KIND_WHITELIST.includes(str)) return str;
  if (["exam", "diagnostic", "sat", "assessment"].includes(str)) return "test";
  if (["practice", "session"].includes(str)) return "classwork";
  return "classwork";
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const sanitizeUuid = (value) => {
  const str = typeof value === "string" ? value : String(value || "");
  return uuidRegex.test(str) ? str : null;
};

const cleanse = (obj) => {
  const out = {};
  Object.entries(obj || {}).forEach(([key, value]) => {
    if (value !== undefined) out[key] = value;
  });
  return out;
};

// Save a single row into 'submissions' for easier retrieval in Admin
export async function saveTestSubmission({
  profile,
  answers,
  radarData,
  areaPercents,
  pillarAgg,
  pillarCounts,
  topCodes,
}) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured (missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY)");
  }
  // Write to the new results table by default
  const table = import.meta.env.VITE_SUBMISSIONS_TABLE || "cg_results";
  const ts = new Date().toISOString();
  const primaryCode = Array.isArray(topCodes) && topCodes.length ? String(topCodes[0]) : null;
  // Attach auth email if available (schema has user_email but no user_id)
  let authEmail = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) { authEmail = user.email || null; }
  } catch {}
  const row = {
    ts,
    participant: profile || null,
    user_email: authEmail || profile?.email || null,
    answers: answers || null,
    radar_data: radarData || null,
    area_percents: areaPercents || null,
    pillar_agg: pillarAgg || null,
    pillar_counts: pillarCounts || null,
    riasec_code: primaryCode,
    top_codes: topCodes || null,
  };
  const { error } = await supabase.from(table).insert([row]);
  if (error) throw error;
  return { ok: true, ts };
}

// Save SAT diagnostic result
export async function saveSatResult({ summary, skills = null, difficulty = null, answers, modules, elapsedSec }) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  const table = import.meta.env.VITE_SAT_RESULTS_TABLE || "cg_sat_results";
  const ts = new Date().toISOString();
  // Attach user email if available
  let userEmail = null;
  try { const { data: { user } } = await supabase.auth.getUser(); userEmail = user?.email || null; } catch {}
  const row = {
    ts,
    user_email: userEmail,
    participant: null,
    // store diagnostic payload
    answers: answers || null,
    radar_data: null,
    area_percents: null,
    pillar_agg: { summary, skills, difficulty },
    pillar_counts: { modules, elapsedSec },
    riasec_code: null,
    top_codes: null,
  };
  const { error } = await supabase.from(table).insert([row]);
  if (error) throw error;
  return { ok: true, ts };
}

export async function beginSatTrainingSession({
  kind = "classwork",
  section = null,
  unit = null,
  lesson = null,
  resourceId = null,
  className = null,
  meta = null,
  durationSec = null,
  attempt = null,
  status = "active",
}) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  const table = import.meta.env.VITE_SAT_TRAINING_TABLE || "cg_sat_training";
  const ts = new Date().toISOString();
  let userEmail = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email || null;
  } catch {}

  const kindValue = normalizeTrainingKind(kind);
  const baseRow = {
    ts,
    user_email: userEmail,
    kind: kindValue,
    section,
    unit,
    lesson,
    summary: null,
    answers: null,
    elapsed_sec: 0,
    resource_id: sanitizeUuid(resourceId),
    class_name: className || null,
    status,
    meta,
    duration_sec: typeof durationSec === "number" ? durationSec : null,
    attempt_index: attempt ?? null,
  };

  let lastError = null;
  const { error, data } = await supabase
    .from(table)
    .insert([baseRow])
    .select()
    .single();
  if (!error) {
    return { sessionId: data?.id ?? null, ts: data?.ts || ts };
  }
  lastError = error;
  const code = error?.code || "";
  const msg = error?.message || "";
  const isMissingColumn = code === "42703" || /column .* does not exist/i.test(msg);
  if (!isMissingColumn) {
    throw lastError;
  }
  const fallbackRow = cleanse({
    ts,
    user_email: userEmail,
    kind: kindValue,
    section,
    unit,
    lesson,
    status,
    class_name: className || null,
  });
  const fb = await supabase.from(table).insert([fallbackRow]).select().single();
  if (fb.error) throw fb.error;
  return { sessionId: fb.data?.id ?? null, ts: fb.data?.ts || ts };
}

export async function updateSatTrainingSession(sessionId, patch = {}) {
  if (!sessionId) return { ok: false };
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  const table = import.meta.env.VITE_SAT_TRAINING_TABLE || "cg_sat_training";
  const updateRow = cleanse({
    ...patch,
    resource_id: patch.resource_id ? sanitizeUuid(patch.resource_id) : undefined,
  });
  if (Object.keys(updateRow).length === 0) {
    return { ok: true };
  }
  const { error } = await supabase.from(table).update(updateRow).eq("id", sessionId);
  if (error) throw error;
  return { ok: true };
}

// Save SAT training activity (lecture/classwork/homework)
export async function saveSatTraining({
  kind = "classwork",         // 'lecture' | 'classwork' | 'homework' | 'quiz'
  section = null,             // 'RW' | 'MATH'
  unit = null,                // e.g., 'algebra'
  lesson = null,              // e.g., 'linear_equations'
  summary = null,             // { rw: {correct,total}, math: {correct,total} } or custom
  answers = null,
  elapsedSec = 0,
  resourceId = null,
  className = null,
  status = "completed",
  meta = null,
  attempt = null,
  durationSec = null,
  sessionId = null,
}) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  const table = import.meta.env.VITE_SAT_TRAINING_TABLE || "cg_sat_training";
  const ts = new Date().toISOString();
  let userEmail = null;
  try { const { data: { user } } = await supabase.auth.getUser(); userEmail = user?.email || null; } catch {}

  const kindValue = normalizeTrainingKind(kind);
  const baseRow = {
    ts,
    user_email: userEmail,
    kind: kindValue,
    section,
    unit,
    lesson,
    summary: summary || null,
    answers: answers || null,
    elapsed_sec: Math.max(0, Number.isFinite(elapsedSec) ? Math.round(elapsedSec) : 0),
  };
  const fullRow = {
    ...baseRow,
    resource_id: sanitizeUuid(resourceId || answers?.resourceId),
    class_name: className || answers?.className || null,
    status: status || answers?.status || null,
    meta: meta || answers?.meta || null,
    duration_sec: (typeof durationSec === "number" ? durationSec : null) ?? (answers?.durationSec ?? null),
    attempt_index: attempt ?? answers?.attempt ?? null,
  };
  if (sessionId) {
    const updateRow = cleanse({
      ...fullRow,
      ts: undefined,
    });
    const { error } = await supabase.from(table).update(updateRow).eq("id", sessionId);
    if (error) throw error;
    return { ok: true, ts };
  }
  const tryRows = [fullRow, baseRow];
  let lastError = null;
  for (let i = 0; i < tryRows.length; i++) {
    const row = tryRows[i];
    try {
      const { error } = await supabase.from(table).insert([row]);
      if (!error) return { ok: true, ts };
      lastError = error;
      const code = error?.code || "";
      const msg = error?.message || "";
      const isMissingColumn = code === "42703" || /column .* does not exist/i.test(msg);
      if (!isMissingColumn) break;
    } catch (err) {
      lastError = err;
      break;
    }
  }
  throw lastError;
}
