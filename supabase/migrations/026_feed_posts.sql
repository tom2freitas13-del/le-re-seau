-- Fil de photos façon Instagram sur l'accueil : tout le monde peut publier une
-- photo, les autres peuvent la liker (avec la liste des personnes qui ont
-- aimé), la commenter, et voir/contacter l'auteur en cliquant sur son nom.

create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  photo_url text not null,
  caption text check (caption is null or char_length(caption) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.feed_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) > 0 and char_length(content) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_feed_posts_created_at on public.feed_posts (created_at desc);
create index if not exists idx_feed_likes_post_id on public.feed_likes (post_id);
create index if not exists idx_feed_comments_post_id on public.feed_comments (post_id);

alter table public.feed_posts enable row level security;
alter table public.feed_likes enable row level security;
alter table public.feed_comments enable row level security;

create policy "Les photos du fil sont visibles par tous les connectés"
  on public.feed_posts for select to authenticated using (true);
create policy "On peut publier une photo en son propre nom"
  on public.feed_posts for insert to authenticated with check (auth.uid() = author_id);
create policy "Un admin ou l'auteur peut supprimer une photo"
  on public.feed_posts for delete to authenticated
  using (auth.uid() = author_id or exists (select 1 from public.profiles where user_id = auth.uid() and is_admin = true));

create policy "Les likes du fil sont visibles par tous les connectés"
  on public.feed_likes for select to authenticated using (true);
create policy "On peut liker en son propre nom"
  on public.feed_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "On peut retirer son propre like"
  on public.feed_likes for delete to authenticated using (auth.uid() = user_id);

create policy "Les commentaires du fil sont visibles par tous les connectés"
  on public.feed_comments for select to authenticated using (true);
create policy "On peut commenter en son propre nom"
  on public.feed_comments for insert to authenticated with check (auth.uid() = author_id);
create policy "Un admin ou l'auteur peut supprimer un commentaire"
  on public.feed_comments for delete to authenticated
  using (auth.uid() = author_id or exists (select 1 from public.profiles where user_id = auth.uid() and is_admin = true));

-- Stockage des photos du fil, même convention que les autres buckets
-- (lecture publique, écriture restreinte à son propre dossier userId/...).
insert into storage.buckets (id, name, public) values ('feed-photos', 'feed-photos', true) on conflict (id) do nothing;

create policy "Photos du fil publiques en lecture" on storage.objects for select using (bucket_id = 'feed-photos');
create policy "Un utilisateur connecté peut uploader sa propre photo de fil" on storage.objects for insert to authenticated
  with check (bucket_id = 'feed-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Un admin peut supprimer n'importe quelle photo de fil" on storage.objects for delete to authenticated
  using (bucket_id = 'feed-photos' and exists (select 1 from public.profiles where user_id = auth.uid() and is_admin = true));
