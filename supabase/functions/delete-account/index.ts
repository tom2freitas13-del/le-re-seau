// Edge Function : suppression complète d'un compte utilisateur.
// Supprime le compte d'authentification (auth.users) ce qui entraîne,
// via les contraintes "on delete cascade" du schéma, la suppression
// automatique de TOUTES les données liées : profil, messages, posts,
// signalements émis, participations à des activités, etc.
//
// Cette opération nécessite la clé service_role, qui ne doit jamais
// être exposée côté client — c'est pour ça qu'elle passe par une
// Edge Function plutôt que d'être appelée directement depuis le site.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

// BUG FIX (obligation RGPD) : ne nettoyait que 2 des 5 buckets réellement
// utilisés — les messages vocaux, les photos partagées en message privé et
// les photos du fil restaient orphelines dans le Storage après suppression
// du compte. Tous suivent la même convention de dossier userId/fichier.
const USER_STORAGE_BUCKETS = ['avatars', 'activity-photos', 'chat-audio', 'chat-images', 'feed-photos'];

async function deleteUserFiles(adminClient: SupabaseClient, userId: string) {
  await Promise.all(USER_STORAGE_BUCKETS.map(async (bucket) => {
    const { data: files } = await adminClient.storage.from(bucket).list(userId);
    if (files?.length) {
      await adminClient.storage.from(bucket).remove(files.map(f => `${userId}/${f.name}`));
    }
  }));
}

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

    // Supprime les fichiers de l'utilisateur dans tous les buckets Storage
    // avant de supprimer le compte, pour ne pas laisser de fichiers orphelins.
    await deleteUserFiles(adminClient, userId);

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
