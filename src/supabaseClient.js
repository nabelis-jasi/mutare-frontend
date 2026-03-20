import { createClient } from "@supabase/supabase-js";

// Use Vite environment variables (prefixed with VITE_)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log to verify variables are loaded (remove in production)
console.log("Supabase URL:", SUPABASE_URL ? "✅ Found" : "❌ Missing");
console.log("Supabase Key:", SUPABASE_ANON_KEY ? "✅ Found" : "❌ Missing");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	console.warn("Supabase env variables not set: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(
  SUPABASE_URL || "", 
  SUPABASE_ANON_KEY || "",
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);