-- Notifie l'auteur d'un signalement une fois qu'un admin l'a traité —
-- jusqu'ici silence total après un report, ce qui n'inspire pas confiance
-- dans la modération. Message volontairement neutre, sans révéler si le
-- contenu/compte visé a été sanctionné (vie privée de la cible, et évite
-- tout effet "j'ai fait bannir quelqu'un").
--
-- Au passage : les triggers de notifications (064) écrivaient tous un texte
-- français en dur, jamais traduit selon la langue du destinataire
-- (profiles.language) — contraire à la règle "tout traduire à chaque ajout".
-- Corrigé ici pour ce nouveau trigger ET pour les 3 déjà existants qui
-- avaient du texte fixe (nouvelle publication, like, commentaire).
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('new_message', 'new_group_message', 'new_post', 'post_liked', 'post_commented', 'report_resolved'));

create or replace function public.notify_report_resolved()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  recipient_lang text;
begin
  if old.status = 'pending' and new.status in ('reviewed', 'dismissed') then
    select coalesce(language, 'fr') into recipient_lang from public.profiles where user_id = new.reporter_id;
    insert into public.notifications (user_id, type, title, body, link)
    values (
      new.reporter_id, 'report_resolved',
      case when recipient_lang = 'en' then 'Report reviewed' else 'Signalement examiné' end,
      case when recipient_lang = 'en' then 'Thanks for your report — our team has handled it.' else 'Merci pour ton signalement, notre équipe l''a traité.' end,
      '/'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_report_resolved_notify on public.reports;
create trigger on_report_resolved_notify
  after update on public.reports
  for each row execute procedure public.notify_report_resolved();

-- Message privé : seuls les libellés de pièce jointe (audio/photo) étaient
-- en dur, le texte libre reste tel quel (ce sont les mots de l'utilisateur).
create or replace function public.notify_inbox_new_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  sender_name text;
  recipient_lang text;
begin
  select name into sender_name from public.profiles where user_id = new.sender_id;
  select coalesce(language, 'fr') into recipient_lang from public.profiles where user_id = new.receiver_id;
  insert into public.notifications (user_id, type, title, body, link)
  values (
    new.receiver_id, 'new_message', coalesce(sender_name, case when recipient_lang = 'en' then 'Someone' else 'Quelqu''un' end),
    case
      when new.attachment_type = 'audio' then case when recipient_lang = 'en' then '🎤 Voice message' else '🎤 Message vocal' end
      when new.attachment_type = 'image' then case when recipient_lang = 'en' then '📷 Photo' else '📷 Photo' end
      else left(new.content, 120)
    end,
    '/chat/' || new.sender_id::text
  );
  return new;
end;
$$;

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
  for recipient in select user_id, coalesce(language, 'fr') as lang from public.profiles where user_id <> new.author_id loop
    insert into public.notifications (user_id, type, title, body, link)
    values (
      recipient.user_id, 'new_post',
      coalesce(author_name, case when recipient.lang = 'en' then 'Someone' else 'Quelqu''un' end) ||
        (case when recipient.lang = 'en' then ' posted a photo' else ' a publié une photo' end),
      new.caption,
      '/'
    );
  end loop;
  return new;
end;
$$;

create or replace function public.notify_inbox_feed_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  post_author_id uuid;
  liker_name text;
  recipient_lang text;
begin
  select author_id into post_author_id from public.feed_posts where id = new.post_id;
  if post_author_id is null or post_author_id = new.user_id then
    return new;
  end if;

  select name into liker_name from public.profiles where user_id = new.user_id;
  select coalesce(language, 'fr') into recipient_lang from public.profiles where user_id = post_author_id;
  insert into public.notifications (user_id, type, title, body, link)
  values (
    post_author_id, 'post_liked',
    coalesce(liker_name, case when recipient_lang = 'en' then 'Someone' else 'Quelqu''un' end) ||
      (case when recipient_lang = 'en' then ' liked your photo' else ' a aimé ta photo' end),
    null, '/'
  );
  return new;
end;
$$;

create or replace function public.notify_inbox_feed_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  post_author_id uuid;
  commenter_name text;
  recipient_lang text;
begin
  select author_id into post_author_id from public.feed_posts where id = new.post_id;
  if post_author_id is null or post_author_id = new.author_id then
    return new;
  end if;

  select name into commenter_name from public.profiles where user_id = new.author_id;
  select coalesce(language, 'fr') into recipient_lang from public.profiles where user_id = post_author_id;
  insert into public.notifications (user_id, type, title, body, link)
  values (
    post_author_id, 'post_commented',
    coalesce(commenter_name, case when recipient_lang = 'en' then 'Someone' else 'Quelqu''un' end) ||
      (case when recipient_lang = 'en' then ' commented on your photo' else ' a commenté ta photo' end),
    left(new.content, 120), '/'
  );
  return new;
end;
$$;
