import { supabase } from "./supabase.js";

const LIVE_TEST_TABLE = (import.meta.env.VITE_LIVE_TEST_TABLE || "cg_live_test_sessions").trim();

const cleanse = (obj) => {
  const out = {};
  Object.entries(obj || {}).forEach(([key, value]) => {
    if (value !== undefined) out[key] = value;
  });
  return out;
};

const normalizeCount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
};

const ensureTable = () => {
  if (!LIVE_TEST_TABLE) {
    throw new Error("Live test table is not configured (missing VITE_LIVE_TEST_TABLE).");
  }
  return LIVE_TEST_TABLE;
};

export async function startLiveTestSession({
  userId,
  userEmail,
  name,
  school,
  className,
  testType,
  totalQuestions,
  startedAt,
}) {
  if (!userId || !testType) return { ok: false, sessionId: null };
  const table = ensureTable();
  const nowIso = new Date().toISOString();
  const startedAtIso = startedAt || nowIso;
  const payload = cleanse({
    user_id: userId,
    user_email: userEmail || null,
    participant_name: name || null,
    school: school || null,
    class_name: className || null,
    test_type: testType,
    status: "in_progress",
    answered_count: normalizeCount(0),
    total_questions: normalizeCount(totalQuestions),
    started_at: startedAtIso,
    last_seen_at: nowIso,
  });

  const { data: existing, error: findError } = await supabase
    .from(table)
    .select("id,status")
    .eq("user_id", userId)
    .eq("test_type", testType)
    .in("status", ["in_progress", "paused"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError && findError.code !== "PGRST116") {
    throw findError;
  }
  if (existing?.id) {
    const { error } = await supabase
      .from(table)
      .update(cleanse({ ...payload, started_at: undefined }))
      .eq("id", existing.id);
    if (error) throw error;
    return { ok: true, sessionId: existing.id };
  }

  const { data, error } = await supabase.from(table).insert([payload]).select().single();
  if (error) throw error;
  return { ok: true, sessionId: data?.id || null };
}

export async function updateLiveTestSession(sessionId, patch = {}) {
  if (!sessionId) return { ok: false };
  const table = ensureTable();
  const nowIso = new Date().toISOString();
  const updateRow = cleanse({
    ...patch,
    answered_count: normalizeCount(patch.answered_count ?? patch.answeredCount),
    total_questions: normalizeCount(patch.total_questions ?? patch.totalQuestions),
    last_seen_at: patch.last_seen_at || nowIso,
  });
  if (Object.keys(updateRow).length === 0) return { ok: true };
  const { error } = await supabase.from(table).update(updateRow).eq("id", sessionId);
  if (error) throw error;
  return { ok: true };
}

export async function completeLiveTestSession(sessionId, patch = {}) {
  if (!sessionId) return { ok: false };
  const finishedAt = patch.finished_at || new Date().toISOString();
  return updateLiveTestSession(sessionId, {
    ...patch,
    status: "completed",
    finished_at: finishedAt,
  });
}
