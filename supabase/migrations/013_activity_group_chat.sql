-- Groupe de discussion automatique par activité : les participants peuvent
-- s'organiser (donner rendez-vous, envoyer photos/vocaux) sans avoir à se
-- retrouver en 1:1 manuellement. L'accès au groupe est réservé aux membres
-- de l'activité — voir la logique d'accès côté app dans GroupChat.tsx.
alter table public.activities add column if not exists group_id uuid references public.chat_groups(id) on delete set null;

alter table public.chat_group_messages add column if not exists is_system boolean not null default false;
alter table public.chat_group_messages add column if not exists attachment_url text;
alter table public.chat_group_messages add column if not exists attachment_type text check (attachment_type is null or attachment_type in ('audio', 'image'));

-- ----------------------------------------------------------------------------
-- Crée automatiquement un groupe de discussion à la création d'une activité.
-- Le trigger existant handle_new_group() ajoute déjà l'organisateur comme
-- membre dès que ce groupe est créé.
-- ----------------------------------------------------------------------------
create or replace function public.create_activity_group()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_group_id uuid;
begin
  insert into public.chat_groups (name, description, emoji, created_by)
  values (left(new.title, 60), 'Discussion de l''activité', '📅', new.author_id)
  returning id into new_group_id;
  new.group_id := new_group_id;
  return new;
end;
$$;

drop trigger if exists on_activity_created_make_group on public.activities;
create trigger on_activity_created_make_group
  before insert on public.activities
  for each row execute procedure public.create_activity_group();

-- ----------------------------------------------------------------------------
-- Rejoindre une activité = rejoindre son groupe + message système.
-- ----------------------------------------------------------------------------
create or replace function public.handle_activity_participant_joined()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  activity_group_id uuid;
  participant_name text;
begin
  select group_id into activity_group_id from public.activities where id = new.activity_id;
  if activity_group_id is null then
    return new;
  end if;

  insert into public.chat_group_members (group_id, user_id)
  values (activity_group_id, new.user_id)
  on conflict (group_id, user_id) do nothing;

  select name into participant_name from public.profiles where user_id = new.user_id;
  insert into public.chat_group_messages (group_id, sender_id, content, is_system)
  values (activity_group_id, new.user_id, coalesce(participant_name, 'Quelqu''un') || ' a rejoint l''activité 🎉', true);

  return new;
end;
$$;

drop trigger if exists on_activity_participant_joined on public.activity_participants;
create trigger on_activity_participant_joined
  after insert on public.activity_participants
  for each row execute procedure public.handle_activity_participant_joined();

-- ----------------------------------------------------------------------------
-- Quitter une activité = message système + retrait du groupe.
-- ----------------------------------------------------------------------------
create or replace function public.handle_activity_participant_left()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  activity_group_id uuid;
  participant_name text;
begin
  select group_id into activity_group_id from public.activities where id = old.activity_id;
  if activity_group_id is null then
    return old;
  end if;

  select name into participant_name from public.profiles where user_id = old.user_id;
  insert into public.chat_group_messages (group_id, sender_id, content, is_system)
  values (activity_group_id, old.user_id, coalesce(participant_name, 'Quelqu''un') || ' a quitté l''activité 👋', true);

  delete from public.chat_group_members where group_id = activity_group_id and user_id = old.user_id;

  return old;
end;
$$;

drop trigger if exists on_activity_participant_left on public.activity_participants;
create trigger on_activity_participant_left
  after delete on public.activity_participants
  for each row execute procedure public.handle_activity_participant_left();
