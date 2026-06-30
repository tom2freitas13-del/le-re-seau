// Edge Function : suppression complète d'un compte utilisateur.
// Supprime le compte d'authentification (auth.users) ce qui entraîne,
// via les contraintes "on delete cascade" du schéma, la suppression
// automatique de TOUTES les données liées : profil, messages, posts,
// signalements émis, participations à des activités, etc.
//
// Cette opération nécessite la clé service_role, qui ne doit jamais
// être exposée côté client — c'est pour ça qu'elle passe par une
// Edge Function plutôt que d'être appelée directement depuis le site.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client "anon" pour vérifier qui fait la demande, à partir de son propre jeton.
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Session invalide.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;

    // Client "admin" avec la clé service_role, seul habilité à supprimer un compte.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Supprime les photos de l'utilisateur dans le Storage (avatars + activités)
    // avant de supprimer le compte, pour ne pas laisser de fichiers orphelins.
    const { data: avatarFiles } = await adminClient.storage.from('avatars').list(userId);
    if (avatarFiles?.length) {
      await adminClient.storage.from('avatars').remove(avatarFiles.map(f => `${userId}/${f.name}`));
    }
    const { data: activityFiles } = await adminClient.storage.from('activity-photos').list(userId);
    if (activityFiles?.length) {
      await adminClient.storage.from('activity-photos').remove(activityFiles.map(f => `${userId}/${f.name}`));
    }

    // Supprime le compte d'authentification. Toutes les tables liées
    // (profiles, messages, forum_posts, reports, blocked_users, etc.)
    // sont supprimées automatiquement via "on delete cascade".
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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
