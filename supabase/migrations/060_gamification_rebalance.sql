-- Rééquilibrage du barème de points (059) pour inciter davantage au
-- parrainage, et ajout d'un bonus pour un profil complété à 100 %.
-- Nouveau barème :
--   parrainage abouti        : 5  -> 15 (le vrai levier de croissance)
--   créer une activité       : 5  -> 3
--   premier participant      : 10 -> 5
--   avis reçu                : 2  (inchangé)
--   répondre à une question  : 1  (inchangé)
--   profil complété à 100 %  : nouveau, +10 (une seule fois)

alter table public.user_points_ledger drop constraint user_points_ledger_reason_check;
alter table public.user_points_ledger add constraint user_points_ledger_reason_check check (reason in (
  'activity_created', 'activity_first_participant', 'review_received',
  'question_answered', 'referral_joined', 'profile_completed'
));

create or replace function public.award_points_activity_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_points_ledger (user_id, points, reason) values (new.author_id, 3, 'activity_created');
  return new;
end;
$$;

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
    insert into public.user_points_ledger (user_id, points, reason) values (organizer_id, 5, 'activity_first_participant');
  end if;
  return new;
end;
$$;

create or replace function public.award_points_referral_joined()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.referred_by is not null then
    insert into public.user_points_ledger (user_id, points, reason) values (new.referred_by, 15, 'referral_joined');
  end if;
  return new;
end;
$$;

-- +10 : profil complété à 100 % (mêmes 7 critères que la checklist affichée
-- sur /profile — voir profileSteps dans Profile.tsx), une seule fois par
-- utilisateur (vérifié via l'historique plutôt qu'un flag, pas besoin de
-- colonne supplémentaire sur profiles).
create or replace function public.award_points_profile_completed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  is_complete boolean;
  already_awarded boolean;
begin
  is_complete := new.name is not null and length(trim(new.name)) > 0
    and new.photo_url is not null
    and new.bio is not null and length(trim(new.bio)) > 0
    and new.interests is not null and array_length(new.interests, 1) > 0
    and new.status is not null
    and new.availability is not null
    and new.city is not null;

  if not is_complete then
    return new;
  end if;

  select exists(
    select 1 from public.user_points_ledger where user_id = new.user_id and reason = 'profile_completed'
  ) into already_awarded;

  if not already_awarded then
    insert into public.user_points_ledger (user_id, points, reason) values (new.user_id, 10, 'profile_completed');
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_updated_award_points on public.profiles;
create trigger on_profile_updated_award_points
  after update on public.profiles
  for each row execute procedure public.award_points_profile_completed();
