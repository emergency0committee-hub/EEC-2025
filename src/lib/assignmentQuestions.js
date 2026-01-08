// src/lib/assignmentQuestions.js
import { supabase } from "./supabase.js";

const DEFAULT_TABLE = import.meta.env.VITE_ASSIGNMENT_QUESTIONS_TABLE || "assignment_questions";
const BUCKET = import.meta.env.VITE_ASSIGNMENT_MEDIA_BUCKET || "assignment-media";
const DEFAULT_LIST_LIMIT = Number(import.meta.env.VITE_QUESTION_BANK_LIMIT || 20000);
const LIST_PAGE_SIZE = 1000;
const HARD_ROW_LIMIT = 20000;

const resolveTable = (table) => table || DEFAULT_TABLE;

export async function listAssignmentQuestions({
  table,
  limit = DEFAULT_LIST_LIMIT,
  signal,
  order = [{ column: "created_at", ascending: false }],
} = {}) {
  const target = resolveTable(table);
  const safeLimit = Number.isFinite(limit)
    ? Math.max(0, Math.min(limit, HARD_ROW_LIMIT))
    : HARD_ROW_LIMIT;

  if (safeLimit <= 0) return [];

  if (safeLimit <= LIST_PAGE_SIZE) {
    let query = supabase.from(target).select("*");
    (Array.isArray(order) ? order : []).forEach((rule) => {
      if (!rule?.column) return;
      query = query.order(rule.column, { ascending: Boolean(rule.ascending) });
    });
    query = query.limit(safeLimit);
    if (signal) query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  const rows = [];
  for (let offset = 0; offset < safeLimit; offset += LIST_PAGE_SIZE) {
    const to = Math.min(offset + LIST_PAGE_SIZE - 1, safeLimit - 1);
    let query = supabase.from(target).select("*");
    (Array.isArray(order) ? order : []).forEach((rule) => {
      if (!rule?.column) return;
      query = query.order(rule.column, { ascending: Boolean(rule.ascending) });
    });
    query = query.range(offset, to);
    if (signal) query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    const page = Array.isArray(data) ? data : [];
    if (page.length === 0) break;
    rows.push(...page);
    if (page.length < to - offset + 1) break;
  }

  return rows;
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
  hardness,
  limit = 20,
  strictFilters = false,
} = {}) {
  const target = resolveTable(table);
  const PAGE_SIZE = 500;
  const HARD_ROW_LIMIT = 20000;
  const baseFetchLimit = Math.min(Math.max(limit * 10, 200), HARD_ROW_LIMIT);
  const escapePattern = (value) =>
    String(value ?? "")
      .trim()
      .replace(/[%_]/g, (match) => `\\${match}`);
  const normalizeFilter = (value) => escapePattern(value).toLowerCase();

  const pagedFetch = async (filters = {}, desiredRows = baseFetchLimit) => {
    const rows = [];
    const targetRows = Math.min(Math.max(desiredRows, PAGE_SIZE), HARD_ROW_LIMIT);
    for (let offset = 0; offset < HARD_ROW_LIMIT; offset += PAGE_SIZE) {
      if (rows.length >= targetRows) break;
      const to = Math.min(offset + PAGE_SIZE - 1, HARD_ROW_LIMIT - 1);
      let query = supabase
        .from(target)
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, to);
      if (filters.subject) {
        const pattern = escapePattern(filters.subject);
        query = query.ilike("subject", pattern);
      }
      if (filters.unit) {
        const pattern = normalizeFilter(filters.unit);
        query = query.ilike("unit", pattern);
      }
      if (filters.lesson) {
        const pattern = normalizeFilter(filters.lesson);
        query = query.ilike("lesson", pattern);
      }
      if (filters.hardness) {
        const pattern = normalizeFilter(filters.hardness);
        query = query.ilike("hardness", pattern);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (Array.isArray(data) && data.length > 0) {
        rows.push(...data);
        if (data.length < PAGE_SIZE) break;
      } else {
        break;
      }
    }
    return rows;
  };

  let rows = await pagedFetch({ subject, unit, lesson, hardness });

  if (!strictFilters && rows.length < limit && lesson) {
    rows = rows.concat(await pagedFetch({ subject, unit, hardness }));
  }

  if (!strictFilters && rows.length < limit && unit) {
    rows = rows.concat(await pagedFetch({ subject, hardness }));
  }

  if (!strictFilters && rows.length < limit && subject) {
    rows = rows.concat(await pagedFetch({ hardness }));
  }

  let deduped = dedupeRows(rows);

  if (!strictFilters && deduped.length < limit) {
    deduped = dedupeRows(deduped.concat(await pagedFetch({ subject, unit, lesson, hardness }, baseFetchLimit * 2)));
  }

  if (!strictFilters && deduped.length < limit) {
    deduped = dedupeRows(deduped.concat(await pagedFetch({ hardness }, Math.min(baseFetchLimit * 3, HARD_ROW_LIMIT))));
  }

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

export async function fetchQuestionBankByIds({ table, ids = [] } = {}) {
  const unique = Array.from(
    new Set(
      (Array.isArray(ids) ? ids : [])
        .map((id) => (id == null ? null : String(id).trim()))
        .filter(Boolean),
    ),
  );
  if (unique.length === 0) return [];
  const target = resolveTable(table);
  const chunkSize = 1000;
  const results = [];
  for (let offset = 0; offset < unique.length; offset += chunkSize) {
    const chunk = unique.slice(offset, offset + chunkSize);
    const { data, error } = await supabase.from(target).select("*").in("id", chunk);
    if (error) throw error;
    if (Array.isArray(data)) results.push(...data);
  }
  return results;
}
