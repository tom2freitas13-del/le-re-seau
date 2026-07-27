-- Notifie l'auteur d'une photo du fil quand quelqu'un l'aime ou la
-- commente (façon Instagram) — contrairement à 027 (nouvelle photo, diffusée
-- à tout le monde), ici on ne notifie QUE l'auteur du post, jamais soi-même.
create or replace function public.notify_feed_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  post_author_id uuid;
  liker_name text;
  shared_secret text;
begin
  select author_id into post_author_id from public.feed_posts where id = new.post_id;
  if post_author_id is null or post_author_id = new.user_id then
    return new;
  end if;

  select name into liker_name from public.profiles where user_id = new.user_id;
  select decrypted_secret into shared_secret from vault.decrypted_secrets where name = 'webhook_secret';

  perform net.http_post(
    url := 'https://bsfrshupdimoumvqyamx.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', shared_secret
    ),
    body := jsonb_build_object(
      'receiver_id', post_author_id,
      'title', '❤️ ' || coalesce(liker_name, 'Quelqu''un') || ' a aimé ta photo',
      'body', 'Va voir la réaction sur le fil de la communauté !',
      'url', '/'
    )
  );
  return new;
end;
$$;

drop trigger if exists on_feed_like_notify on public.feed_likes;
create trigger on_feed_like_notify
  after insert on public.feed_likes
  for each row execute procedure public.notify_feed_like();

create or replace function public.notify_feed_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  post_author_id uuid;
  commenter_name text;
  shared_secret text;
begin
  select author_id into post_author_id from public.feed_posts where id = new.post_id;
  if post_author_id is null or post_author_id = new.author_id then
    return new;
  end if;

  select name into commenter_name from public.profiles where user_id = new.author_id;
  select decrypted_secret into shared_secret from vault.decrypted_secrets where name = 'webhook_secret';

  perform net.http_post(
    url := 'https://bsfrshupdimoumvqyamx.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', shared_secret
    ),
    body := jsonb_build_object(
      'receiver_id', post_author_id,
      'title', '💬 ' || coalesce(commenter_name, 'Quelqu''un') || ' a commenté ta photo',
      'body', left(new.content, 120),
      'url', '/'
    )
  );
  return new;
end;
$$;

drop trigger if exists on_feed_comment_notify on public.feed_comments;
create trigger on_feed_comment_notify
  after insert on public.feed_comments
  for each row execute procedure public.notify_feed_comment();
