-- Parrainage : chaque membre a un lien d'invitation personnel
-- (/?ref=<son_user_id>) ; on garde une trace de qui a invité qui pour
-- afficher un compteur "X amis invités" sur le profil.
alter table public.profiles add column if not exists referred_by uuid references auth.users(id) on delete set null;

create index if not exists idx_profiles_referred_by on public.profiles (referred_by);

-- Le trigger de création de profil lit maintenant aussi le code de parrainage
-- transmis via les métadonnées d'inscription (options.data.referred_by).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  referrer_id uuid;
begin
  begin
    referrer_id := (new.raw_user_meta_data->>'referred_by')::uuid;
  exception when others then
    referrer_id := null;
  end;

  -- On ignore un éventuel auto-parrainage ou un id qui ne correspond à aucun membre.
  if referrer_id is not null and (
    referrer_id = new.id or not exists (select 1 from auth.users where id = referrer_id)
  ) then
    referrer_id := null;
  end if;

  insert into public.profiles (user_id, name, referred_by)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', null), referrer_id);
  return new;
end;
$$;
