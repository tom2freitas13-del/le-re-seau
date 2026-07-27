-- Comptes "pro" (bars, associations...) : un badge distinct affiché partout
-- où le profil apparaît (carte communauté, fil photo...), pour que leurs
-- publications soient identifiables comme professionnelles/publicitaires.
-- Statut accordé manuellement par un admin depuis /admin (pas d'auto-inscription).
alter table public.profiles add column if not exists is_pro boolean not null default false;

-- Un utilisateur peut modifier son propre profil (voir migration 001), mais
-- rien n'empêchait jusqu'ici de s'auto-attribuer is_admin/is_banned/is_pro
-- via un appel API direct plutôt que l'interface. On verrouille ces 3 colonnes
-- : seul un admin peut les changer (sur son propre profil ou celui d'un autre).
-- Passe par is_admin_user() (déjà security definer depuis 040) plutôt qu'un
-- sous-select direct sur profiles, pour rester cohérent avec le reste des
-- policies et éviter tout risque de récursion RLS (voir 040).
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security invoker
as $$
begin
  if (new.is_pro is distinct from old.is_pro
      or new.is_admin is distinct from old.is_admin
      or new.is_banned is distinct from old.is_banned)
     and not public.is_admin_user(auth.uid()) then
    raise exception 'Seul un administrateur peut modifier ce statut.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_columns_trigger on public.profiles;
create trigger protect_profile_privileged_columns_trigger
  before update on public.profiles
  for each row execute procedure public.protect_profile_privileged_columns();
