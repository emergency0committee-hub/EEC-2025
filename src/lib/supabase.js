import { createClient } from "@supabase/supabase-js";

// Allow env via Vite, with optional window fallback for static hosting
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof window !== 'undefined' && window.__SUPABASE_URL__) || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof window !== 'undefined' && window.__SUPABASE_ANON_KEY__) || "";

if (!supabaseUrl || !supabaseKey) {
  // Helpful runtime log in production if envs are missing
  console.error(
    "Supabase env missing. Define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY at build time (or set window.__SUPABASE_URL__ / window.__SUPABASE_ANON_KEY__ before scripts)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export function testSupabaseConnection() {
  console.log("Testing Supabase connection...");
  // Add your test logic here
}
