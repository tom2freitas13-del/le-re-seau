alter table public.messages add column if not exists read boolean not null default false;
create index if not exists idx_messages_unread on public.messages (receiver_id, read) where read = false;
