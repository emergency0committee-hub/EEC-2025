// src/lib/db.js
import { createClient } from "@supabase/supabase-js";

// Vite automatically loads variables starting with VITE_ from .env.local
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON
);
