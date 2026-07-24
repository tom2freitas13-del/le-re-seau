-- Récompense de parrainage : jusqu'ici le compteur d'amis invités
-- (referred_by) n'affichait qu'un chiffre sans aucune récompense, aucune
-- raison concrète de partager son lien plutôt que de dire juste "viens
-- sur l'appli". On ajoute un badge "Ambassadeur" débloqué à 3 amis
-- invités, affiché sur le profil (le sien et vu par les autres).
--
-- Compteur dénormalisé (plutôt qu'un COUNT() à la volée sur referred_by)
-- pour ne pas alourdir les listes de profils (Social.tsx affiche des
-- dizaines de ProfileCard, un COUNT par carte serait coûteux).
alter table public.profiles add column if not exists referral_count integer not null default 0;

-- Backfill pour les parrainages déjà enregistrés avant ce compteur.
update public.profiles p
set referral_count = (select count(*) from public.profiles r where r.referred_by = p.user_id)
where referral_count = 0;

create or replace function public.bump_referral_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.referred_by is not null then
    update public.profiles set referral_count = referral_count + 1 where user_id = new.referred_by;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_created_bump_referral on public.profiles;
create trigger on_profile_created_bump_referral
  after insert on public.profiles
  for each row execute procedure public.bump_referral_count();
