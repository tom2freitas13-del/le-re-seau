-- Likes et accusés de lecture sur les messages des salons thématiques,
-- même principe que pour les discussions de groupe (019). Les salons sont
-- ouverts à tous les connectés, donc pas de vérification d'appartenance ici.

create table if not exists public.salon_message_likes (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.salon_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create index if not exists idx_salon_message_likes_message on public.salon_message_likes (message_id);

alter table public.salon_message_likes enable row level security;

create policy "Les likes de salon sont visibles par tous les connectés"
  on public.salon_message_likes for select to authenticated using (true);

create policy "On like en son propre nom"
  on public.salon_message_likes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "On retire son propre like"
  on public.salon_message_likes for delete to authenticated
  using (auth.uid() = user_id);

alter publication supabase_realtime add table public.salon_message_likes;

-- ----------------------------------------------------------------------------
create table if not exists public.salon_message_reads (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.salon_messages(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (message_id, viewer_id)
);

create index if not exists idx_salon_message_reads_message on public.salon_message_reads (message_id);

alter table public.salon_message_reads enable row level security;

create policy "Les vues de salon sont visibles par tous les connectés"
  on public.salon_message_reads for select to authenticated using (true);

create policy "On enregistre sa propre lecture"
  on public.salon_message_reads for insert to authenticated
  with check (auth.uid() = viewer_id);

alter publication supabase_realtime add table public.salon_message_reads;

-- ----------------------------------------------------------------------------
-- Permet au créateur d'un groupe d'y ajouter directement des membres (choix
-- des participants à la création), en plus de la règle existante qui permet
-- à chacun de rejoindre un groupe en son propre nom.
-- ----------------------------------------------------------------------------
create policy "Le créateur du groupe peut y ajouter des membres"
  on public.chat_group_members for insert to authenticated
  with check (
    exists (
      select 1 from public.chat_groups g
      where g.id = chat_group_members.group_id and g.created_by = auth.uid()
    )
  );
