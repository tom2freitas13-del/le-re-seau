-- BUG FIX : créer une activité n'ajoutait jamais l'organisateur comme
-- participant (compteur "0/5" alors qu'il y a forcément au moins lui,
-- corrigé côté client dans NewActivity.tsx). Du coup le calcul du bonus
-- "premier participant" (059/060, +5 à l'organisateur) doit maintenant
-- exclure l'organisateur du décompte, sinon son propre insert compte comme
-- le "premier participant" et le vrai premier participant externe ne
-- déclenche plus jamais le bonus (participant_count vaudrait 2, pas 1).
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
  select count(*) into participant_count
    from public.activity_participants
    where activity_id = new.activity_id and user_id <> organizer_id;
  if participant_count = 1 then
    insert into public.user_points_ledger (user_id, points, reason) values (organizer_id, 5, 'activity_first_participant');
  end if;
  return new;
end;
$$;
