-- Réactions emoji sur les messages privés (❤️ 😂 👍 😮 😢) — un utilisateur ne
-- peut poser qu'une seule fois le même emoji sur un message donné.
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 8),
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create index if not exists idx_message_reactions_message on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;

create policy "Les réactions sont visibles par les deux membres de la conversation"
  on public.message_reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_reactions.message_id
        and (m.sender_id = auth.uid() or m.receiver_id = auth.uid())
    )
  );

create policy "On peut réagir en son propre nom"
  on public.message_reactions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "On peut retirer sa propre réaction"
  on public.message_reactions for delete
  to authenticated
  using (auth.uid() = user_id);

alter publication supabase_realtime add table public.message_reactions;
