-- Relance une seule fois (comme les rappels d'activité en 015) les membres
-- qui ont un profil par ailleurs rempli (nom) mais aucun centre d'intérêt
-- coché — la compatibilité affichée sur Communauté dépend presque entièrement
-- des centres d'intérêt (voir matchScore.ts), donc ces profils ne matchent
-- avec personne sans même s'en rendre compte.
alter table public.profiles add column if not exists profile_nudge_sent boolean not null default false;

create or replace function public.send_profile_completion_nudges()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  shared_secret text;
  candidate record;
begin
  select decrypted_secret into shared_secret from vault.decrypted_secrets where name = 'webhook_secret';

  for candidate in
    select distinct p.user_id
    from public.profiles p
    join public.push_subscriptions ps on ps.user_id = p.user_id
    where p.name is not null
      and (p.interests is null or array_length(p.interests, 1) is null)
      and p.is_banned = false
      and p.profile_nudge_sent = false
      and p.created_at < now() - interval '1 day'
  loop
    perform net.http_post(
      url := 'https://bsfrshupdimoumvqyamx.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', shared_secret
      ),
      body := jsonb_build_object(
        'receiver_id', candidate.user_id,
        'title', '🌊 Complète ton profil pour de meilleurs matchs',
        'body', 'Ajoute tes centres d''intérêt pour voir de vraies suggestions compatibles sur Communauté !',
        'url', '/profile'
      )
    );
    update public.profiles set profile_nudge_sent = true where user_id = candidate.user_id;
  end loop;
end;
$$;

select cron.schedule('profile-completion-nudge', '0 10 * * 3', $$select public.send_profile_completion_nudges();$$);
