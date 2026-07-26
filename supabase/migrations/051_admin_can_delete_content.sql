-- Un admin peut déjà supprimer un post du fil photo (026) ou un avis de lieu
-- (024), et la base autorise déjà la suppression de n'importe quel message
-- de groupe par un admin (041) — mais rien n'existe côté messages privés,
-- salons, ou forum : un admin qui traite un signalement sur ce type de
-- contenu ne peut faire que bannir l'auteur, impossible de juste retirer le
-- message. Aligne ces quatre policies DELETE sur le même principe, via
-- is_admin_user() (déjà security definer depuis 040, pas de risque de
-- récursion RLS).
drop policy if exists "On peut supprimer ses propres messages envoyés" on public.messages;
create policy "On peut supprimer ses propres messages envoyés"
  on public.messages for delete to authenticated
  using (auth.uid() = sender_id or public.is_admin_user(auth.uid()));

drop policy if exists "On peut supprimer ses propres messages de salon" on public.salon_messages;
create policy "On peut supprimer ses propres messages de salon"
  on public.salon_messages for delete to authenticated
  using (auth.uid() = user_id or public.is_admin_user(auth.uid()));

drop policy if exists "On peut supprimer son propre post" on public.forum_posts;
create policy "On peut supprimer son propre post"
  on public.forum_posts for delete to authenticated
  using (auth.uid() = author_id or public.is_admin_user(auth.uid()));

drop policy if exists "On peut supprimer son propre commentaire" on public.forum_comments;
create policy "On peut supprimer son propre commentaire"
  on public.forum_comments for delete to authenticated
  using (auth.uid() = author_id or public.is_admin_user(auth.uid()));
