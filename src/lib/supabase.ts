import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: "nikitas-rewards-auth",
  },
});

// Logins are usernames. Supabase Auth needs an email, so each username maps to a private
// address that never receives mail.
export const USERNAME_DOMAIN = "nikitas-rewards.local";
export const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`;

export const FACES_BUCKET = "faces";
