-- Partage de photos dans les messages privés — élargit attachment_type
-- (jusqu'ici réservé aux messages vocaux) et ajoute un bucket dédié, sur
-- le même modèle que les buckets avatars / chat-audio existants.
alter table public.messages drop constraint if exists messages_attachment_type_check;
alter table public.messages add constraint messages_attachment_type_check
  check (attachment_type is null or attachment_type in ('audio', 'image'));

insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

create policy "Photos de messages publiques en lecture"
  on storage.objects for select
  using (bucket_id = 'chat-images');

create policy "Un utilisateur connecté peut uploader sa propre photo de message"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-images' and (storage.foldername(name))[1] = auth.uid()::text);
