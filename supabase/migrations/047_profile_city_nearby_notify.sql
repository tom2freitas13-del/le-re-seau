-- Ville de résidence sur le profil, pour prévenir quand une activité est
-- créée près de chez soi. Une seule des 10 communes de l'île, cohérent
-- avec status/availability (check ... in (...)).
alter table public.profiles add column if not exists city text
  check (city is null or city in (
    'Rivedoux-Plage', 'La Flotte', 'Sainte-Marie-de-Ré', 'Saint-Martin-de-Ré',
    'Le Bois-Plage-en-Ré', 'La Couarde-sur-Mer', 'Ars-en-Ré', 'Loix',
    'Les Portes-en-Ré', 'Saint-Clément-des-Baleines'
  ));

-- Notifie les membres dont la ville de résidence apparaît dans l'adresse de
-- la nouvelle activité (ex: ville "Ars-en-Ré" et adresse "Rue du Port, 17590
-- Ars-en-Ré"). Île de Ré = 30 km de long, une correspondance par commune
-- suffit largement à "pas loin de chez toi" — pas besoin de calcul de
-- distance GPS. Même mécanisme que notify_new_message (004) : pg_net vers
-- l'Edge Function send-push, secret partagé depuis Vault.
create or replace function public.notify_nearby_activity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  shared_secret text;
  resident record;
begin
  if new.location is null then
    return new;
  end if;

  select decrypted_secret into shared_secret from vault.decrypted_secrets where name = 'webhook_secret';

  for resident in
    select p.user_id
    from public.profiles p
    where p.city is not null
      and p.user_id <> new.author_id
      and p.is_banned = false
      and new.location ilike '%' || p.city || '%'
  loop
    perform net.http_post(
      url := 'https://bsfrshupdimoumvqyamx.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', shared_secret
      ),
      body := jsonb_build_object(
        'receiver_id', resident.user_id,
        'title', '🏝️ Une activité près de chez toi',
        'body', new.title,
        'url', '/activities/' || new.id::text
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists on_activity_created_notify_nearby on public.activities;
create trigger on_activity_created_notify_nearby
  after insert on public.activities
  for each row execute procedure public.notify_nearby_activity();
