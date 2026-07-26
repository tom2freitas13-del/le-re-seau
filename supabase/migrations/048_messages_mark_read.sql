-- Le destinataire n'a jamais pu marquer un message comme lu : la table
-- messages n'a jamais eu de policy UPDATE (seulement SELECT/INSERT/DELETE
-- dans 001_init.sql), donc les .update({ read: true }) de Chat.tsx (au
-- chargement et à la réception en temps réel) échouaient silencieusement
-- (RLS bloque par défaut sans erreur renvoyée côté client via .then()).
-- Le badge "vu" n'a donc jamais fonctionné.
create policy "Le destinataire peut marquer un message comme lu"
  on public.messages for update
  to authenticated
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

-- Cette policy autorise techniquement le destinataire à modifier n'importe
-- quelle colonne de la ligne (RLS ne fait pas de restriction par colonne).
-- Comme les messages peuvent faire l'objet d'un signalement/modération, on
-- verrouille les colonnes autres que "read" avec un trigger, pour qu'un
-- destinataire ne puisse jamais altérer le contenu d'un message reçu.
create or replace function public.messages_lock_immutable_fields()
returns trigger
language plpgsql
as $$
begin
  if new.content <> old.content
     or new.sender_id <> old.sender_id
     or new.receiver_id <> old.receiver_id
     or new.created_at <> old.created_at then
    raise exception 'Seul le champ "read" peut être modifié sur un message existant';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_lock_immutable_fields on public.messages;
create trigger messages_lock_immutable_fields
  before update on public.messages
  for each row execute procedure public.messages_lock_immutable_fields();
