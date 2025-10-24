import { supabase } from "./supabase.js";

export async function saveTestSubmission(data) {
  const { error } = await supabase.from("test_submissions").insert([data]);
  if (error) throw error;
}
