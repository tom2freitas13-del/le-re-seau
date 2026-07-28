-- Gamification : niveaux communautaires + classement hebdomadaire des
-- membres les plus utiles. Historique auditable de chaque action qui
-- rapporte des points (plutôt qu'un simple compteur sur profiles) pour
-- pouvoir calculer aussi bien le total (niveau) que les points de la
-- semaine (classement) via une somme filtrée par date.
create table if not exists public.user_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  points integer not null,
  reason text not null check (reason in (
    'activity_created', 'activity_first_participant', 'review_received',
    'question_answered', 'referral_joined'
  )),
  created_at timestamptz not null default now()
);

create index if not exists idx_user_points_ledger_user on public.user_points_ledger (user_id);
create index if not exists idx_user_points_ledger_created on public.user_points_ledger (created_at);

alter table public.user_points_ledger enable row level security;

create policy "Le détail des points est visible par tous les connectés"
  on public.user_points_ledger for select to authenticated using (true);

-- Pas de policy INSERT pour les utilisateurs : uniquement alimenté par les
-- triggers security definer ci-dessous, pour qu'on ne puisse pas s'attribuer
-- des points soi-même via un appel direct à l'API.

-- +5 : créer une activité
create or replace function public.award_points_activity_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_points_ledger (user_id, points, reason) values (new.author_id, 5, 'activity_created');
  return new;
end;
$$;

drop trigger if exists on_activity_created_award_points on public.activities;
create trigger on_activity_created_award_points
  after insert on public.activities
  for each row execute procedure public.award_points_activity_created();

-- +10 : bonus à l'organisateur quand SON activité obtient son premier
-- participant — récompense une activité qui prend vie, pas juste postée.
create or replace function public.award_points_first_participant()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  organizer_id uuid;
  participant_count integer;
begin
  select author_id into organizer_id from public.activities where id = new.activity_id;
  if organizer_id is null or organizer_id = new.user_id then
    return new;
  end if;
  select count(*) into participant_count from public.activity_participants where activity_id = new.activity_id;
  if participant_count = 1 then
    insert into public.user_points_ledger (user_id, points, reason) values (organizer_id, 10, 'activity_first_participant');
  end if;
  return new;
end;
$$;

drop trigger if exists on_activity_first_participant_award_points on public.activity_participants;
create trigger on_activity_first_participant_award_points
  after insert on public.activity_participants
  for each row execute procedure public.award_points_first_participant();

-- +2 : recevoir un avis (aide reconnue par un autre membre, voir 057)
create or replace function public.award_points_review_received()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_points_ledger (user_id, points, reason) values (new.reviewed_user_id, 2, 'review_received');
  return new;
end;
$$;

drop trigger if exists on_review_created_award_points on public.user_reviews;
create trigger on_review_created_award_points
  after insert on public.user_reviews
  for each row execute procedure public.award_points_review_received();

-- +1 : répondre à une question du forum (uniquement les posts catégorisés
-- "question", voir constants.ts FORUM_CATEGORIES — jamais pour répondre à
-- son propre post).
create or replace function public.award_points_question_answered()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  post_tag text;
  post_author_id uuid;
begin
  select tag, author_id into post_tag, post_author_id from public.forum_posts where id = new.post_id;
  if post_tag = 'question' and post_author_id is distinct from new.author_id then
    insert into public.user_points_ledger (user_id, points, reason) values (new.author_id, 1, 'question_answered');
  end if;
  return new;
end;
$$;

drop trigger if exists on_forum_comment_award_points on public.forum_comments;
create trigger on_forum_comment_award_points
  after insert on public.forum_comments
  for each row execute procedure public.award_points_question_answered();

-- +5 : un ami invité rejoint la communauté (referred_by déjà suivi, voir 025)
create or replace function public.award_points_referral_joined()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.referred_by is not null then
    insert into public.user_points_ledger (user_id, points, reason) values (new.referred_by, 5, 'referral_joined');
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_referral_award_points on public.profiles;
create trigger on_profile_referral_award_points
  after insert on public.profiles
  for each row execute procedure public.award_points_referral_joined();

-- Vue agrégée : total (pour le niveau) + points des 7 derniers jours (pour
-- le classement hebdomadaire "membres les plus utiles de la semaine").
create or replace view public.user_points_summary as
select
  user_id,
  coalesce(sum(points), 0)::int as total_points,
  coalesce(sum(points) filter (where created_at >= now() - interval '7 days'), 0)::int as points_this_week
from public.user_points_ledger
group by user_id;

grant select on public.user_points_summary to authenticated;
