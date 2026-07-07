-- Messages vocaux — alternative aux appels audio/vidéo (WebRTC jugé trop lourd
-- pour l'instant : pas de serveur TURN). content garde toujours un texte
-- (placeholder "🎤 Message vocal") pour respecter la contrainte existante.
alter table public.messages add column if not exists attachment_url text;
alter table public.messages add column if not exists attachment_type text check (attachment_type is null or attachment_type in ('audio'));

insert into storage.buckets (id, name, public)
values ('chat-audio', 'chat-audio', true)
on conflict (id) do nothing;

create policy "Messages vocaux publics en lecture"
  on storage.objects for select
  using (bucket_id = 'chat-audio');

create policy "Un utilisateur connecté peut uploader son propre message vocal"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-audio' and (storage.foldername(name))[1] = auth.uid()::text);
