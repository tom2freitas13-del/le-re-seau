-- Reconstitue en migration une protection déjà active en production mais
-- jamais committée : is_user_banned() + les 8 policies INSERT qui
-- l'utilisent (empêche un compte banni de publier du nouveau contenu,
-- même en contournant le blocage côté client BannedScreen). Trouvé en
-- comparant un export du schéma réel avec les fichiers de ce dossier —
-- même dérive que les Edge Functions send-engagement-reminder et
-- send-message-notification, jamais versionnées non plus.
--
-- Idempotent (drop puis recreate) : ne change rien en production où c'est
-- déjà appliqué, sert seulement à ce qu'un environnement reconstruit depuis
-- ces migrations retrouve exactement le même état.
create or replace function public.is_user_banned(uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select is_banned from public.profiles where user_id = uid), false);
$$;

drop policy if exists "On ne peut envoyer qu'en son propre nom" on public.messages;
create policy "On ne peut envoyer qu'en son propre nom"
  on public.messages for insert to authenticated
  with check (auth.uid() = sender_id and not public.is_user_banned(auth.uid()));

drop policy if exists "Seuls les membres peuvent écrire dans le groupe" on public.chat_group_messages;
create policy "Seuls les membres peuvent écrire dans le groupe"
  on public.chat_group_messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and not public.is_user_banned(auth.uid())
    and exists (
      select 1 from public.chat_group_members m
      where m.group_id = chat_group_messages.group_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "On peut écrire dans un salon en son propre nom" on public.salon_messages;
create policy "On peut écrire dans un salon en son propre nom"
  on public.salon_messages for insert to authenticated
  with check (auth.uid() = user_id and not public.is_user_banned(auth.uid()));

drop policy if exists "On peut publier en son propre nom" on public.forum_posts;
create policy "On peut publier en son propre nom"
  on public.forum_posts for insert to authenticated
  with check (auth.uid() = author_id and not public.is_user_banned(auth.uid()));

drop policy if exists "On peut commenter en son propre nom" on public.forum_comments;
create policy "On peut commenter en son propre nom"
  on public.forum_comments for insert to authenticated
  with check (auth.uid() = author_id and not public.is_user_banned(auth.uid()));

drop policy if exists "On peut publier une offre en son propre nom" on public.job_offers;
create policy "On peut publier une offre en son propre nom"
  on public.job_offers for insert to authenticated
  with check (auth.uid() = author_id and not public.is_user_banned(auth.uid()));

drop policy if exists "On peut publier une demande en son propre nom" on public.job_requests;
create policy "On peut publier une demande en son propre nom"
  on public.job_requests for insert to authenticated
  with check (auth.uid() = author_id and not public.is_user_banned(auth.uid()));

drop policy if exists "On peut créer une activité en son propre nom" on public.activities;
create policy "On peut créer une activité en son propre nom"
  on public.activities for insert to authenticated
  with check (auth.uid() = author_id and not public.is_user_banned(auth.uid()));
