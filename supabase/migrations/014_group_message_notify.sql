-- Notifications pour les groupes de discussion (dont les groupes d'activité) :
-- marqueur de lecture par utilisateur/groupe, et push à tous les membres du
-- groupe (sauf l'expéditeur) à chaque nouveau message. Contrairement aux
-- salons/forum (publics, sans membre), ici on a une vraie liste de membres
-- (chat_group_members), donc la notification est ciblée comme pour les
-- messages privés — pas de diffusion à tout le monde.
create table if not exists public.group_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  unique (user_id, group_id)
);

alter table public.group_reads enable row level security;

create policy "Un utilisateur gère ses propres marqueurs de lecture de groupe"
  on public.group_reads for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.notify_group_new_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  sender_name text;
  group_name text;
  shared_secret text;
  recipient record;
  push_body text;
begin
  select name into sender_name from public.profiles where user_id = new.sender_id;
  select name into group_name from public.chat_groups where id = new.group_id;
  select decrypted_secret into shared_secret from vault.decrypted_secrets where name = 'webhook_secret';

  push_body := case
    when new.is_system then new.content
    else coalesce(sender_name, 'Quelqu''un') || ' : ' || left(new.content, 100)
  end;

  for recipient in
    select user_id from public.chat_group_members where group_id = new.group_id and user_id <> new.sender_id
  loop
    perform net.http_post(
      url := 'https://bsfrshupdimoumvqyamx.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', shared_secret
      ),
      body := jsonb_build_object(
        'receiver_id', recipient.user_id,
        'title', '💬 ' || coalesce(group_name, 'Groupe'),
        'body', push_body,
        'url', '/groups/' || new.group_id::text
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists on_group_message_created_notify on public.chat_group_messages;
create trigger on_group_message_created_notify
  after insert on public.chat_group_messages
  for each row execute procedure public.notify_group_new_message();
