-- Avis/confiance entre membres (entraide, services rendus...) — même schéma
-- que poi_reviews (021/024) : un avis par personne max (upsert pour
-- modifier), suppression réservée aux admins pour empêcher qu'un mauvais
-- avis soit juste supprimé par celui qui en est la cible.
create table if not exists public.user_reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewed_user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (reviewed_user_id, reviewer_id),
  check (reviewer_id <> reviewed_user_id)
);

create index if not exists idx_user_reviews_reviewed on public.user_reviews (reviewed_user_id);

alter table public.user_reviews enable row level security;

create policy "Les avis entre membres sont visibles par tous les connectés"
  on public.user_reviews for select to authenticated using (true);

create policy "On laisse un avis en son propre nom"
  on public.user_reviews for insert to authenticated
  with check (auth.uid() = reviewer_id);

create policy "On modifie son propre avis"
  on public.user_reviews for update to authenticated
  using (auth.uid() = reviewer_id) with check (auth.uid() = reviewer_id);

create policy "Seul un admin peut supprimer un avis"
  on public.user_reviews for delete to authenticated
  using (public.is_admin_user(auth.uid()));

alter publication supabase_realtime add table public.user_reviews;
