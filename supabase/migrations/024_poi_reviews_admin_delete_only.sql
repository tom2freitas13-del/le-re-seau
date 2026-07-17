-- Seuls les admins peuvent supprimer un avis sur un lieu (modération) —
-- l'auteur garde la possibilité de modifier son avis (upsert), mais plus de
-- le supprimer lui-même.
drop policy if exists "On supprime son propre avis" on public.poi_reviews;

create policy "Seul un admin peut supprimer un avis"
  on public.poi_reviews for delete to authenticated
  using (exists (select 1 from public.profiles where user_id = auth.uid() and is_admin = true));
