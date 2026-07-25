import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails("mailto:contact@re-seau.fr", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const MESSAGES = [
  "Quoi de neuf sur l'Île de Ré ? Viens jeter un œil 🌊",
  "De nouveaux membres t'attendent sur Le Ré-seau 👋",
  "Des discussions animées t'attendent sur l'île 🏖️",
];

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: subs } = await supabase.from("push_subscriptions").select("*");
    if (!subs || subs.length === 0) return new Response("no subscriptions", { status: 200 });

    const text = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

    await Promise.all(subs.map(async (sub: { id: string; endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: "Le Ré-seau", body: text, url: "/" })
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
