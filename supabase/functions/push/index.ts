// Sends a web push notification to every phone one person has turned notifications on for.
// Called only by the database (public.send_push, via pg_net) with a shared secret from Vault.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

let config: Record<string, string> | null = null;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  if (!config) {
    const { data, error } = await db.rpc("push_config");
    if (error || !data) return new Response("Push is not set up", { status: 500 });
    config = data as Record<string, string>;
    webpush.setVapidDetails(config.vapid_subject, config.vapid_public, config.vapid_private);
  }
  if (req.headers.get("x-push-secret") !== config.push_secret) {
    return new Response("Forbidden", { status: 403 });
  }

  const { user_id, title, body, url } = await req.json();
  const { data: subs, error } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user_id);
  if (error) return new Response(error.message, { status: 500 });

  const payload = JSON.stringify({ title, body, url });
  const results = await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 60 * 24,
          urgency: "high",
        });
        return "sent";
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // The phone turned notifications off or the subscription expired: forget it.
        if (status === 404 || status === 410) {
          await db.from("push_subscriptions").delete().eq("id", s.id);
          return "removed";
        }
        console.error("push failed", status, (e as Error).message);
        return `failed ${status ?? ""}`.trim();
      }
    }),
  );

  return new Response(JSON.stringify({ results }), { headers: { "content-type": "application/json" } });
});
