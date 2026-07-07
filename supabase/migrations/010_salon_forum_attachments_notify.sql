-- Photos et messages vocaux dans les salons thématiques et le forum, avec
-- notification push à TOUS les membres à chaque nouveau message/post — choix
-- explicite de l'utilisateur malgré le risque de volume (pas de notion
-- d'abonnement/membre par salon, donc "tout le monde" = tous les profils).
alter table public.salon_messages add column if not exists attachment_url text;
alter table public.salon_messages add column if not exists attachment_type text check (attachment_type is null or attachment_type in ('audio', 'image'));

alter table public.forum_posts add column if not exists attachment_url text;
alter table public.forum_posts add column if not exists attachment_type text check (attachment_type is null or attachment_type in ('audio', 'image'));

-- ----------------------------------------------------------------------------
-- Notifie tous les membres (sauf l'auteur) à chaque nouveau message de salon.
-- ----------------------------------------------------------------------------
create or replace function public.notify_all_new_salon_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  sender_name text;
  shared_secret text;
  recipient record;
begin
  select name into sender_name from public.profiles where user_id = new.user_id;
  select decrypted_secret into shared_secret from vault.decrypted_secrets where name = 'webhook_secret';
  for recipient in select user_id from public.profiles where user_id <> new.user_id loop
    perform net.http_post(
      url := 'https://bsfrshupdimoumvqyamx.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', shared_secret
      ),
      body := jsonb_build_object(
        'receiver_id', recipient.user_id,
        'title', '💬 ' || coalesce(sender_name, 'Quelqu''un') || ' — #' || new.salon,
        'body', left(new.content, 120),
        'url', '/discussions'
      )
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists on_salon_message_created_notify on public.salon_messages;
create trigger on_salon_message_created_notify
  after insert on public.salon_messages
  for each row execute procedure public.notify_all_new_salon_message();

-- ----------------------------------------------------------------------------
-- Notifie tous les membres (sauf l'auteur) à chaque nouveau post du forum.
-- ----------------------------------------------------------------------------
create or replace function public.notify_all_new_forum_post()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  author_name text;
  shared_secret text;
  recipient record;
begin
  select name into author_name from public.profiles where user_id = new.author_id;
  select decrypted_secret into shared_secret from vault.decrypted_secrets where name = 'webhook_secret';
  for recipient in select user_id from public.profiles where user_id <> new.author_id loop
    perform net.http_post(
      url := 'https://bsfrshupdimoumvqyamx.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', shared_secret
      ),
      body := jsonb_build_object(
        'receiver_id', recipient.user_id,
        'title', '📰 Nouveau post de ' || coalesce(author_name, 'Quelqu''un'),
        'body', left(new.content, 120),
        'url', '/discussions'
      )
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists on_forum_post_created_notify on public.forum_posts;
create trigger on_forum_post_created_notify
  after insert on public.forum_posts
  for each row execute procedure public.notify_all_new_forum_post();
