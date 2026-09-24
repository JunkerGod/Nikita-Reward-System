import type { Config } from "@netlify/functions";

// Runs once a day so the free Supabase project never pauses from inactivity.
// keep_alive() does one tiny read (select id from profiles limit 1) and returns true/false.
export default async (req: Request) => {
  const url = Netlify.env.get("VITE_SUPABASE_URL");
  const key = Netlify.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) {
    console.error("keep-alive: missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
    return;
  }

  const res = await fetch(`${url}/rest/v1/rpc/keep_alive`, {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: "{}",
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`keep-alive: Supabase answered ${res.status}: ${body}`);
    return;
  }
  const { next_run } = await req.json().catch(() => ({ next_run: "unknown" }));
  console.log(`keep-alive: ok (${body}). Next run ${next_run}`);
};

export const config: Config = {
  schedule: "@daily",
};
