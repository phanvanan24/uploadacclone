import { createClient } from "@supabase/supabase-js";

if (!process.env.VITE_SUPABASE_URL) {
  throw new Error("VITE_SUPABASE_URL is not set");
}

if (!process.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error("VITE_SUPABASE_ANON_KEY is not set");
}

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);
