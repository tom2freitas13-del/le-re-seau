-- ============================================================================
-- LE RÉ-SEAU — Schéma Supabase complet
-- À exécuter dans Supabase SQL Editor (Database > SQL Editor > New query)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILS
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text,
  age integer check (age is null or (age >= 15 and age <= 120)),
  bio text check (bio is null or char_length(bio) <= 500),
  photo_url text,
  status text check (status in ('resident', 'frequent', 'vacation')),
  availability text check (availability in ('weekend', 'week', 'summer', 'year')),
  interests text[] default '{}',
  instagram text check (instagram is null or char_length(instagram) <= 50),
  linkedin text check (linkedin is null or char_length(linkedin) <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Les profils sont visibles par tous les connectés"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Un utilisateur ne peut créer que son propre profil"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Un utilisateur ne peut modifier que son propre profil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Un utilisateur ne peut supprimer que son propre profil"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = user_id);

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', null));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. MESSAGES PRIVÉS
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) > 0 and char_length(content) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_participants on public.messages (sender_id, receiver_id, created_at);

alter table public.messages enable row level security;

create policy "On ne voit que ses propres conversations"
  on public.messages for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "On ne peut envoyer qu'en son propre nom"
  on public.messages for insert
  to authenticated
  with check (auth.uid() = sender_id);

create policy "On peut supprimer ses propres messages envoyés"
  on public.messages for delete
  to authenticated
  using (auth.uid() = sender_id);

alter publication supabase_realtime add table public.messages;

-- ----------------------------------------------------------------------------
-- 3. GROUPES DE CHAT (fonctionnalité manquante dans l'original)
-- ----------------------------------------------------------------------------
create table if not exists public.chat_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) > 0 and char_length(name) <= 60),
  description text check (description is null or char_length(description) <= 200),
  emoji text default '💬',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists public.chat_group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) > 0 and char_length(content) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists idx_group_messages_group on public.chat_group_messages (group_id, created_at);

alter table public.chat_groups enable row level security;
alter table public.chat_group_members enable row level security;
alter table public.chat_group_messages enable row level security;

create policy "Les groupes sont visibles par tous les connectés"
  on public.chat_groups for select to authenticated using (true);

create policy "Tout utilisateur connecté peut créer un groupe"
  on public.chat_groups for insert to authenticated
  with check (auth.uid() = created_by);

create policy "Le créateur peut supprimer son groupe"
  on public.chat_groups for delete to authenticated
  using (auth.uid() = created_by);

create policy "Les membres d'un groupe sont visibles par tous les connectés"
  on public.chat_group_members for select to authenticated using (true);

create policy "On peut rejoindre un groupe en son propre nom"
  on public.chat_group_members for insert to authenticated
  with check (auth.uid() = user_id);

create policy "On peut quitter un groupe soi-même"
  on public.chat_group_members for delete to authenticated
  using (auth.uid() = user_id);

create policy "Seuls les membres voient les messages du groupe"
  on public.chat_group_messages for select to authenticated
  using (
    exists (
      select 1 from public.chat_group_members m
      where m.group_id = chat_group_messages.group_id and m.user_id = auth.uid()
    )
  );

create policy "Seuls les membres peuvent écrire dans le groupe"
  on public.chat_group_messages for insert to authenticated
  with check (
    auth.uid() = sender_id and exists (
      select 1 from public.chat_group_members m
      where m.group_id = chat_group_messages.group_id and m.user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.chat_group_messages;

-- Le créateur d'un groupe en devient automatiquement membre
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.chat_group_members (group_id, user_id) values (new.id, new.created_by);
  return new;
end;
$$;

drop trigger if exists on_group_created on public.chat_groups;
create trigger on_group_created
  after insert on public.chat_groups
  for each row execute procedure public.handle_new_group();

-- ----------------------------------------------------------------------------
-- 4. SALONS DE DISCUSSION (persistants — corrige le bug "messages perdus au refresh")
-- ----------------------------------------------------------------------------
create table if not exists public.salon_messages (
  id uuid primary key default gen_random_uuid(),
  salon text not null check (salon in ('plage','velo','surf','apero','bateau','emploi','famille','general')),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) > 0 and char_length(content) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_salon_messages on public.salon_messages (salon, created_at);

alter table public.salon_messages enable row level security;

create policy "Les messages des salons sont visibles par tous les connectés"
  on public.salon_messages for select to authenticated using (true);

create policy "On peut écrire dans un salon en son propre nom"
  on public.salon_messages for insert to authenticated
  with check (auth.uid() = user_id);

create policy "On peut supprimer ses propres messages de salon"
  on public.salon_messages for delete to authenticated
  using (auth.uid() = user_id);

alter publication supabase_realtime add table public.salon_messages;

-- ----------------------------------------------------------------------------
-- 5. FORUM (posts persistants — corrige les MOCK_POSTS en dur)
-- ----------------------------------------------------------------------------
create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) > 0 and char_length(content) <= 1000),
  tag text default 'general',
  created_at timestamptz not null default now()
);

create table if not exists public.forum_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) > 0 and char_length(content) <= 500),
  created_at timestamptz not null default now()
);

alter table public.forum_posts enable row level security;
alter table public.forum_likes enable row level security;
alter table public.forum_comments enable row level security;

create policy "Les posts du forum sont visibles par tous les connectés"
  on public.forum_posts for select to authenticated using (true);
create policy "On peut publier en son propre nom"
  on public.forum_posts for insert to authenticated with check (auth.uid() = author_id);
create policy "On peut supprimer son propre post"
  on public.forum_posts for delete to authenticated using (auth.uid() = author_id);

create policy "Les likes sont visibles par tous les connectés"
  on public.forum_likes for select to authenticated using (true);
create policy "On peut liker en son propre nom"
  on public.forum_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "On peut retirer son propre like"
  on public.forum_likes for delete to authenticated using (auth.uid() = user_id);

create policy "Les commentaires sont visibles par tous les connectés"
  on public.forum_comments for select to authenticated using (true);
create policy "On peut commenter en son propre nom"
  on public.forum_comments for insert to authenticated with check (auth.uid() = author_id);
create policy "On peut supprimer son propre commentaire"
  on public.forum_comments for delete to authenticated using (auth.uid() = author_id);

-- ----------------------------------------------------------------------------
-- 6. SERVICES / EMPLOI (offres et demandes) — avec suppression possible
-- ----------------------------------------------------------------------------
create table if not exists public.job_offers (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) > 0 and char_length(title) <= 100),
  description text check (description is null or char_length(description) <= 1000),
  location text,
  date text,
  pay text,
  category text default 'autre',
  created_at timestamptz not null default now()
);

create table if not exists public.job_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) > 0 and char_length(title) <= 100),
  description text check (description is null or char_length(description) <= 1000),
  availability text,
  category text default 'autre',
  created_at timestamptz not null default now()
);

alter table public.job_offers enable row level security;
alter table public.job_requests enable row level security;

create policy "Les offres sont visibles par tous les connectés"
  on public.job_offers for select to authenticated using (true);
create policy "On peut publier une offre en son propre nom"
  on public.job_offers for insert to authenticated with check (auth.uid() = author_id);
create policy "L'auteur peut modifier son offre"
  on public.job_offers for update to authenticated using (auth.uid() = author_id);
create policy "L'auteur peut supprimer son offre"
  on public.job_offers for delete to authenticated using (auth.uid() = author_id);

create policy "Les demandes sont visibles par tous les connectés"
  on public.job_requests for select to authenticated using (true);
create policy "On peut publier une demande en son propre nom"
  on public.job_requests for insert to authenticated with check (auth.uid() = author_id);
create policy "L'auteur peut modifier sa demande"
  on public.job_requests for update to authenticated using (auth.uid() = author_id);
create policy "L'auteur peut supprimer sa demande"
  on public.job_requests for delete to authenticated using (auth.uid() = author_id);

-- ----------------------------------------------------------------------------
-- 7. ACTIVITÉS (fonctionnalité manquante dans l'original)
-- ----------------------------------------------------------------------------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) > 0 and char_length(title) <= 100),
  description text check (description is null or char_length(description) <= 1000),
  category text check (category in ('plage','velo','surf','apero','bateau','randonnee','sport','autre')) default 'autre',
  location text,
  activity_date date,
  activity_time text,
  min_age integer check (min_age is null or (min_age >= 0 and min_age <= 120)),
  max_participants integer check (max_participants is null or max_participants > 0),
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_participants (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (activity_id, user_id)
);

alter table public.activities enable row level security;
alter table public.activity_participants enable row level security;

create policy "Les activités sont visibles par tous les connectés"
  on public.activities for select to authenticated using (true);
create policy "On peut créer une activité en son propre nom"
  on public.activities for insert to authenticated with check (auth.uid() = author_id);
create policy "L'auteur peut modifier son activité"
  on public.activities for update to authenticated using (auth.uid() = author_id);
create policy "L'auteur peut supprimer son activité"
  on public.activities for delete to authenticated using (auth.uid() = author_id);

create policy "Les participants sont visibles par tous les connectés"
  on public.activity_participants for select to authenticated using (true);
create policy "On peut s'inscrire soi-même à une activité"
  on public.activity_participants for insert to authenticated with check (auth.uid() = user_id);
create policy "On peut se désinscrire soi-même"
  on public.activity_participants for delete to authenticated using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 8. STORAGE — avatars et photos d'activités
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('activity-photos', 'activity-photos', true)
on conflict (id) do nothing;

create policy "Photos de profil publiques en lecture"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Un utilisateur connecté peut uploader sa propre photo"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Un utilisateur connecté peut remplacer sa propre photo"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Photos d'activités publiques en lecture"
  on storage.objects for select
  using (bucket_id = 'activity-photos');

create policy "Un utilisateur connecté peut uploader une photo d'activité"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'activity-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ----------------------------------------------------------------------------
-- 9. VUES — statistiques réelles pour la page d'accueil (corrige les chiffres en dur)
-- ----------------------------------------------------------------------------
create or replace view public.site_stats as
select
  (select count(*) from public.profiles where name is not null) as total_members,
  (select count(*) from public.profiles where availability is not null and name is not null) as available_today,
  (select count(*) from public.forum_posts) + (select count(*) from public.salon_messages) as total_discussions,
  (select count(*) from public.job_offers) + (select count(*) from public.job_requests) as total_services,
  (select count(*) from public.activities) as total_activities;

grant select on public.site_stats to authenticated, anon;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
