// src/lib/assignmentQuestions.js
import { supabase } from "./supabase.js";

const TABLE = import.meta.env.VITE_ASSIGNMENT_QUESTIONS_TABLE || "assignment_questions";
const BUCKET = import.meta.env.VITE_ASSIGNMENT_MEDIA_BUCKET || "assignment-media";

export async function listAssignmentQuestions({ limit = 200, signal } = {}) {
  const query = supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (signal) query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createAssignmentQuestion(payload) {
  const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateAssignmentQuestion(id, payload) {
  const { data, error } = await supabase.from(TABLE).update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteAssignmentQuestion(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
  return true;
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
