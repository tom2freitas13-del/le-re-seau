-- Relance hebdomadaire : rien ne fait revenir un membre qui a ouvert
-- l'appli une fois puis oublié. On envoie chaque lundi un push aux
-- membres abonnés aux notifications, uniquement s'il y a eu de nouvelles
-- activités dans la semaine (pas de push s'il n'y a rien de neuf).
-- Même schéma que send_activity_reminders (migration 015) : pg_cron
-- appelle une fonction SQL qui relaie vers l'Edge Function send-push
-- via pg_net, un appel par destinataire.
create or replace function public.send_weekly_digest()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  new_activities_count int;
  shared_secret text;
  recipient record;
begin
  select count(*) into new_activities_count
  from public.activities
  where created_at >= now() - interval '7 days';

  -- Rien de neuf cette semaine : pas de notification, pour ne pas
  -- entraîner les gens à ignorer les push de l'appli.
  if new_activities_count = 0 then
    return;
  end if;

  select decrypted_secret into shared_secret from vault.decrypted_secrets where name = 'webhook_secret';

  for recipient in
    select distinct ps.user_id
    from public.push_subscriptions ps
    join public.profiles p on p.user_id = ps.user_id
    where p.is_banned = false
  loop
    perform net.http_post(
      url := 'https://bsfrshupdimoumvqyamx.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', shared_secret
      ),
      body := jsonb_build_object(
        'receiver_id', recipient.user_id,
        'title', '🏝️ Ça bouge sur Le Ré-seau',
        'body', new_activities_count || case when new_activities_count > 1 then ' nouvelles activités cette semaine sur l''île !' else ' nouvelle activité cette semaine sur l''île !' end,
        'url', '/activities'
      )
    );
  end loop;
end;
$$;

-- Chaque lundi 9h UTC (10-11h en France selon la saison).
select cron.schedule('weekly-digest', '0 9 * * 1', $$select public.send_weekly_digest();$$);
