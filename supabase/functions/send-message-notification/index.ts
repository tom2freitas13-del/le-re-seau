import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails("mailto:contact@re-seau.fr", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const message = payload.record;
    if (!message) return new Response("no record", { status: 400 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: sender } = await supabase.from("profiles").select("name").eq("user_id", message.sender_id).single();
    const senderName = sender?.name || "Quelqu'un";

    const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", message.receiver_id);
    if (!subs || subs.length === 0) return new Response("no subscription", { status: 200 });

    const body = message.content.length > 100 ? message.content.slice(0, 100) + "…" : message.content;

    await Promise.all(subs.map(async (sub: { id: string; endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: senderName, body, url: `/chat/${message.sender_id}` })
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }));

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("error", { status: 500 });
  }
});
