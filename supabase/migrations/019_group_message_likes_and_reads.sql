-- Likes (petit cœur) sur les messages de discussion de groupe, et suivi de
-- qui a vu chaque message — sur le même principe que story_views (016).

create table if not exists public.chat_group_message_likes (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_group_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create index if not exists idx_group_message_likes_message on public.chat_group_message_likes (message_id);

alter table public.chat_group_message_likes enable row level security;

create policy "Les membres du groupe voient les likes"
  on public.chat_group_message_likes for select to authenticated
  using (
    exists (
      select 1 from public.chat_group_messages gm
      join public.chat_group_members m on m.group_id = gm.group_id
      where gm.id = chat_group_message_likes.message_id and m.user_id = auth.uid()
    )
  );

create policy "On like en son propre nom"
  on public.chat_group_message_likes for insert to authenticated
  with check (
    auth.uid() = user_id and exists (
      select 1 from public.chat_group_messages gm
      join public.chat_group_members m on m.group_id = gm.group_id
      where gm.id = chat_group_message_likes.message_id and m.user_id = auth.uid()
    )
  );

create policy "On retire son propre like"
  on public.chat_group_message_likes for delete to authenticated
  using (auth.uid() = user_id);

alter publication supabase_realtime add table public.chat_group_message_likes;

-- ----------------------------------------------------------------------------
create table if not exists public.chat_group_message_reads (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_group_messages(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (message_id, viewer_id)
);

create index if not exists idx_group_message_reads_message on public.chat_group_message_reads (message_id);

alter table public.chat_group_message_reads enable row level security;

create policy "Les membres du groupe voient qui a lu"
  on public.chat_group_message_reads for select to authenticated
  using (
    exists (
      select 1 from public.chat_group_messages gm
      join public.chat_group_members m on m.group_id = gm.group_id
      where gm.id = chat_group_message_reads.message_id and m.user_id = auth.uid()
    )
  );

create policy "On enregistre sa propre lecture"
  on public.chat_group_message_reads for insert to authenticated
  with check (
    auth.uid() = viewer_id and exists (
      select 1 from public.chat_group_messages gm
      join public.chat_group_members m on m.group_id = gm.group_id
      where gm.id = chat_group_message_reads.message_id and m.user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.chat_group_message_reads;
