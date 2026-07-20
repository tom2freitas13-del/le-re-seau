-- Notifie tous les membres (sauf l'auteur) à chaque nouvelle photo publiée
-- sur le fil de la communauté — même schéma que pour le forum/salon
-- (voir 010_salon_forum_attachments_notify.sql), choix explicite de
-- l'utilisateur malgré le volume, pas de notion d'abonnement au fil.
create or replace function public.notify_all_new_feed_post()
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
        'title', '📸 ' || coalesce(author_name, 'Quelqu''un') || ' a publié une nouvelle photo',
        'body', coalesce(left(new.caption, 120), 'À voir sur le fil de la communauté !'),
        'url', '/'
      )
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists on_feed_post_created_notify on public.feed_posts;
create trigger on_feed_post_created_notify
  after insert on public.feed_posts
  for each row execute procedure public.notify_all_new_feed_post();
