-- Page "Notifications" persistante — jusqu'ici tout était éphémère (toast
-- ou push qui disparaît), pas d'historique consultable. Volontairement
-- limité aux interactions directes qui concernent la personne (nouveau
-- message, nouvelle publication, like/commentaire sur SA publication) —
-- PAS les relances génériques du type "reviens voir l'île" (digest
-- hebdomadaire, rappel d'activité, profil incomplet, activité à proximité),
-- qui restent des push notifications ponctuelles sans entrer dans cet historique.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('new_message', 'new_group_message', 'new_post', 'post_liked', 'post_commented')),
  title text not null,
  body text,
  link text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_created on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Un utilisateur voit ses propres notifications"
  on public.notifications for select to authenticated using (auth.uid() = user_id);

create policy "Un utilisateur marque ses propres notifications comme lues"
  on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Pas de policy insert pour les utilisateurs : uniquement alimenté par les
-- triggers security definer ci-dessous.

alter publication supabase_realtime add table public.notifications;

-- Nouveau message privé (1-to-1)
create or replace function public.notify_inbox_new_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  sender_name text;
begin
  select name into sender_name from public.profiles where user_id = new.sender_id;
  insert into public.notifications (user_id, type, title, body, link)
  values (
    new.receiver_id, 'new_message', coalesce(sender_name, 'Quelqu''un'),
    case
      when new.attachment_type = 'audio' then '🎤 Message vocal'
      when new.attachment_type = 'image' then '📷 Photo'
      else left(new.content, 120)
    end,
    '/chat/' || new.sender_id::text
  );
  return new;
end;
$$;

drop trigger if exists on_message_notify_inbox on public.messages;
create trigger on_message_notify_inbox
  after insert on public.messages
  for each row execute procedure public.notify_inbox_new_message();

-- Nouveau message de groupe (à chaque membre sauf l'expéditeur, pas les
-- messages système comme "X a rejoint le groupe")
create or replace function public.notify_inbox_new_group_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  sender_name text;
  group_name text;
  recipient record;
begin
  if new.is_system then
    return new;
  end if;

  select name into sender_name from public.profiles where user_id = new.sender_id;
  select name into group_name from public.chat_groups where id = new.group_id;

  for recipient in
    select user_id from public.chat_group_members where group_id = new.group_id and user_id <> new.sender_id
  loop
    insert into public.notifications (user_id, type, title, body, link)
    values (
      recipient.user_id, 'new_group_message', coalesce(group_name, 'Groupe'),
      coalesce(sender_name, 'Quelqu''un') || ' : ' || left(new.content, 100),
      '/groups/' || new.group_id::text
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists on_group_message_notify_inbox on public.chat_group_messages;
create trigger on_group_message_notify_inbox
  after insert on public.chat_group_messages
  for each row execute procedure public.notify_inbox_new_group_message();

-- Nouvelle photo publiée sur le fil (à tout le monde sauf l'auteur, même
-- diffusion que le push existant en 027_feed_posts_notify.sql)
create or replace function public.notify_inbox_new_post()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  author_name text;
  recipient record;
begin
  select name into author_name from public.profiles where user_id = new.author_id;
  for recipient in select user_id from public.profiles where user_id <> new.author_id loop
    insert into public.notifications (user_id, type, title, body, link)
    values (
      recipient.user_id, 'new_post',
      coalesce(author_name, 'Quelqu''un') || ' a publié une photo',
      new.caption,
      '/'
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists on_feed_post_notify_inbox on public.feed_posts;
create trigger on_feed_post_notify_inbox
  after insert on public.feed_posts
  for each row execute procedure public.notify_inbox_new_post();

-- Like sur SA publication (jamais soi-même)
create or replace function public.notify_inbox_feed_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  post_author_id uuid;
  liker_name text;
begin
  select author_id into post_author_id from public.feed_posts where id = new.post_id;
  if post_author_id is null or post_author_id = new.user_id then
    return new;
  end if;

  select name into liker_name from public.profiles where user_id = new.user_id;
  insert into public.notifications (user_id, type, title, body, link)
  values (post_author_id, 'post_liked', coalesce(liker_name, 'Quelqu''un') || ' a aimé ta photo', null, '/');
  return new;
end;
$$;

drop trigger if exists on_feed_like_notify_inbox on public.feed_likes;
create trigger on_feed_like_notify_inbox
  after insert on public.feed_likes
  for each row execute procedure public.notify_inbox_feed_like();

-- Commentaire sur SA publication (jamais soi-même)
create or replace function public.notify_inbox_feed_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  post_author_id uuid;
  commenter_name text;
begin
  select author_id into post_author_id from public.feed_posts where id = new.post_id;
  if post_author_id is null or post_author_id = new.author_id then
    return new;
  end if;

  select name into commenter_name from public.profiles where user_id = new.author_id;
  insert into public.notifications (user_id, type, title, body, link)
  values (post_author_id, 'post_commented', coalesce(commenter_name, 'Quelqu''un') || ' a commenté ta photo', left(new.content, 120), '/');
  return new;
end;
$$;

drop trigger if exists on_feed_comment_notify_inbox on public.feed_comments;
create trigger on_feed_comment_notify_inbox
  after insert on public.feed_comments
  for each row execute procedure public.notify_inbox_feed_comment();
