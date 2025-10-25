import { supabase } from "./supabase.js";

export async function saveTestSubmission(profile, ansTF, results) {
  const submissionData = {
    ...profile,
    answers: ansTF,
    results: results,
    submitted_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("test_submissions").insert([submissionData]);
  if (error) throw error;
  return true;
}
