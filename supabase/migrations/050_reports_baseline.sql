-- La table "reports" (signalements) existe en production depuis le début
-- mais n'a jamais été créée par une migration commitée — même type de dérive
-- dépôt/prod que les deux Edge Functions retrouvées précédemment
-- (send-engagement-reminder, send-message-notification). 009 et 032
-- supposaient déjà son existence sans jamais la créer. Ce fichier capture
-- le schéma et les policies réels (obtenus directement depuis la prod) pour
-- que le dépôt reste la source de vérité.
--
-- NB : comme 009 (trigger) et 032 (contrainte target_type) s'exécutent
-- numériquement avant ce fichier, rejouer 001→050 sur une base neuve
-- échouerait encore à 009. Sans intérêt pratique ici (une seule base de
-- prod, déjà à jour), mais à garder en tête si un jour un environnement
-- de test est provisionné depuis zéro : il faudrait alors renuméroter ce
-- fichier avant 009.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in (
    'profile', 'message', 'group_message', 'salon_message',
    'forum_post', 'forum_comment', 'job_offer', 'job_request', 'activity',
    'feed_post', 'feed_comment'
  )),
  target_id uuid not null,
  target_user_id uuid references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

alter table public.reports enable row level security;

drop policy if exists "On peut signaler en son propre nom" on public.reports;
create policy "On peut signaler en son propre nom"
  on public.reports for insert to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists "On voit ses propres signalements envoyés" on public.reports;
create policy "On voit ses propres signalements envoyés"
  on public.reports for select to authenticated
  using (auth.uid() = reporter_id);

drop policy if exists "Les admins voient tous les signalements" on public.reports;
create policy "Les admins voient tous les signalements"
  on public.reports for select to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

drop policy if exists "Les admins peuvent traiter les signalements" on public.reports;
create policy "Les admins peuvent traiter les signalements"
  on public.reports for update to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));
