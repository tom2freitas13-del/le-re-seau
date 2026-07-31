-- Rattrapage "Services locaux" : statut "pourvu" pour marquer une annonce
-- comme réglée (le système de catégories, lui, existait déjà en base —
-- job_offers.category / job_requests.category — mais n'était jamais branché
-- côté UI, corrigé dans le code React, pas besoin de migration pour ça).
alter table public.job_offers add column if not exists fulfilled boolean not null default false;
alter table public.job_requests add column if not exists fulfilled boolean not null default false;

-- Notification quand quelqu'un rejoint une activité qu'on a créée — jusqu'ici
-- l'organisateur gagnait des points (059/065) sans jamais être informé de
-- qui a rejoint, il fallait retourner sur la page pour le découvrir.
create or replace function public.notify_inbox_activity_joined()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  organizer_id uuid;
  activity_title text;
  joiner_name text;
  recipient_lang text;
begin
  select author_id, title into organizer_id, activity_title from public.activities where id = new.activity_id;
  if organizer_id is null or organizer_id = new.user_id then
    return new;
  end if;

  select name into joiner_name from public.profiles where user_id = new.user_id;
  select coalesce(language, 'fr') into recipient_lang from public.profiles where user_id = organizer_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    organizer_id, 'activity_joined',
    coalesce(joiner_name, case when recipient_lang = 'en' then 'Someone' else 'Quelqu''un' end) ||
      (case when recipient_lang = 'en' then ' joined your activity' else ' a rejoint ton activité' end),
    activity_title,
    '/activities/' || new.activity_id::text
  );
  return new;
end;
$$;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('new_message', 'new_group_message', 'new_post', 'post_liked', 'post_commented', 'report_resolved', 'activity_joined'));

drop trigger if exists on_activity_joined_notify on public.activity_participants;
create trigger on_activity_joined_notify
  after insert on public.activity_participants
  for each row execute procedure public.notify_inbox_activity_joined();
