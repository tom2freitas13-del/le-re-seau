-- Stories éphémères (24h), façon Instagram/Snapchat — photo avec légende
-- optionnelle, ou texte seul sur fond coloré. La RLS elle-même masque les
-- stories expirées, donc même un bug côté client ne peut pas en afficher
-- une passée 24h.
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text,
  text text check (text is null or char_length(text) <= 200),
  background_color text,
  created_at timestamptz not null default now(),
  constraint story_has_content check (image_url is not null or text is not null)
);

create index if not exists idx_stories_created_at on public.stories (created_at);

alter table public.stories enable row level security;

create policy "Les stories actives sont visibles par tous les connectés"
  on public.stories for select
  to authenticated
  using (created_at > now() - interval '24 hours');

create policy "On ne peut publier une story qu'en son propre nom"
  on public.stories for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "On peut supprimer sa propre story"
  on public.stories for delete
  to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Vues : qui a vu quelle story, pour l'anneau "vu/pas vu" et la liste des
-- vues affichée à l'auteur (comme sur Instagram).
-- ----------------------------------------------------------------------------
create table if not exists public.story_views (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (story_id, viewer_id)
);

alter table public.story_views enable row level security;

create policy "L'auteur de la story voit qui l'a vue"
  on public.story_views for select
  to authenticated
  using (
    exists (select 1 from public.stories s where s.id = story_views.story_id and s.user_id = auth.uid())
    or viewer_id = auth.uid()
  );

create policy "On enregistre sa propre vue"
  on public.story_views for insert
  to authenticated
  with check (auth.uid() = viewer_id);

-- ----------------------------------------------------------------------------
-- Nettoyage quotidien des stories expirées (la RLS les masque déjà, ceci
-- évite juste que la table grossisse indéfiniment).
-- ----------------------------------------------------------------------------
create or replace function public.delete_expired_stories()
returns void
language sql
security definer set search_path = public
as $$
  delete from public.stories where created_at <= now() - interval '24 hours';
$$;

select cron.schedule('delete-expired-stories-daily', '30 3 * * *', $$select public.delete_expired_stories();$$);
