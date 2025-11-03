// src/lib/assignmentQuestions.js
import { supabase } from "./supabase.js";

const DEFAULT_TABLE = import.meta.env.VITE_ASSIGNMENT_QUESTIONS_TABLE || "assignment_questions";
const BUCKET = import.meta.env.VITE_ASSIGNMENT_MEDIA_BUCKET || "assignment-media";

const resolveTable = (table) => table || DEFAULT_TABLE;

export async function listAssignmentQuestions({ table, limit = 200, signal } = {}) {
  const query = supabase
    .from(resolveTable(table))
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (signal) query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createAssignmentQuestion(payload, { table } = {}) {
  const { data, error } = await supabase.from(resolveTable(table)).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateAssignmentQuestion(id, payload, { table } = {}) {
  const { data, error } = await supabase.from(resolveTable(table)).update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteAssignmentQuestion(id, { table } = {}) {
  const { error } = await supabase.from(resolveTable(table)).delete().eq("id", id);
  if (error) throw error;
  return true;
}

const dedupeRows = (rows = []) => {
  const seen = new Set();
  const result = [];
  rows.forEach((row) => {
    if (!row) return;
    const key =
      row.id ||
      row.uuid ||
      `${row.question || ""}_${row.subject || ""}_${row.unit || ""}_${row.lesson || ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(row);
    }
  });
  return result;
};

const shuffleRows = (rows = []) => {
  const array = rows.slice();
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export async function fetchQuestionBankSample({
  table,
  subject,
  unit,
  lesson,
  limit = 20,
} = {}) {
  const target = resolveTable(table);
  const fetchLimit = Math.min(Math.max(limit * 5, limit), 500);

  const tryFetch = async (filters = {}) => {
    let query = supabase.from(target).select("*").limit(fetchLimit);
    if (filters.subject) query = query.eq("subject", filters.subject);
    if (filters.unit) query = query.eq("unit", filters.unit);
    if (filters.lesson) query = query.eq("lesson", filters.lesson);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };

  let rows = await tryFetch({ subject, unit, lesson });

  if (rows.length < limit && lesson) {
    const lessonRelaxed = await tryFetch({ subject, unit });
    rows = rows.concat(lessonRelaxed);
  }

  if (rows.length < limit && unit) {
    const unitRelaxed = await tryFetch({ subject });
    rows = rows.concat(unitRelaxed);
  }

  if (rows.length < limit && subject) {
    const subjectRelaxed = await tryFetch({});
    rows = rows.concat(subjectRelaxed);
  }

  const deduped = dedupeRows(rows);
  const shuffled = shuffleRows(deduped);
  return shuffled.slice(0, limit);
}

export async function uploadQuestionImage(file, { prefix = "questions" } = {}) {
  const name = `${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name.replace(/\s+/g, "_")}`;
  const path = `${prefix}/${name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}
