-- Marqueur "dernière lecture du forum" par utilisateur, pour le badge de
-- posts non lus sur la carte "Forum" (même principe que salon_reads).
create table if not exists public.forum_reads (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now()
);

alter table public.forum_reads enable row level security;

create policy "Un utilisateur gère son propre marqueur de lecture du forum"
  on public.forum_reads for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
