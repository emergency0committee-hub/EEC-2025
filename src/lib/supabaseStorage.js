import { supabase } from "./supabase.js";

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
  const table = import.meta.env.VITE_SUBMISSIONS_TABLE || "cg_submissions";
  const ts = new Date().toISOString();
  const primaryCode = Array.isArray(topCodes) && topCodes.length ? String(topCodes[0]) : null;
  const row = {
    ts,
    participant: profile || null,
    user_email: profile?.email || null,
    answers: answers || null,
    radar_data: radarData || null,
    area_percents: areaPercents || null,
    pillar_agg: pillarAgg || null,
    pillar_counts: pillarCounts || null,
    riasec_code: primaryCode,
    top_codes: topCodes || null,
  };
  const { data, error } = await supabase.from(table).insert([row]).select("id").single();
  if (error) throw error;
  return { ok: true, ts, id: data?.id };
}
