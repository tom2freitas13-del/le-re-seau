// Edge Function : envoie une notification push web à un utilisateur quand il
// reçoit un nouveau message (privé, groupe ou salon). Appelée par un trigger SQL
// (pg_net) sur "after insert", authentifiée par un secret partagé plutôt que par
// un jeton utilisateur puisque l'appelant est Postgres, pas un client.
import webpush from 'npm:web-push@3';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

webpush.setVapidDetails(
  'mailto:contact@le-re-seau.fr',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

interface PushPayload {
  receiver_id: string;
  title: string;
  body: string;
  url: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const secret = req.headers.get('x-webhook-secret');
  if (secret !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response(JSON.stringify({ error: 'Non autorisé.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { receiver_id, title, body, url }: PushPayload = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: subscriptions } = await adminClient
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', receiver_id);

    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.stringify({ title, body, url });
    const staleIds: string[] = [];
    let sent = 0;

    await Promise.all(subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) staleIds.push(sub.id);
      }
    }));

    if (staleIds.length) {
      await adminClient.from('push_subscriptions').delete().in('id', staleIds);
    }

    return new Response(JSON.stringify({ sent }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
