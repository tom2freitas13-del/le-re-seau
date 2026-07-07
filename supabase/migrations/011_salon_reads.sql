-- Marqueur "dernière lecture" par utilisateur et par salon thématique, pour
-- afficher un badge de messages non lus sur chaque salon (comme sur les
-- messages privés, qui eux ont déjà une colonne `read` par message).
create table if not exists public.salon_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  salon text not null,
  last_read_at timestamptz not null default now(),
  unique (user_id, salon)
);

alter table public.salon_reads enable row level security;

create policy "Un utilisateur gère ses propres marqueurs de lecture"
  on public.salon_reads for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
