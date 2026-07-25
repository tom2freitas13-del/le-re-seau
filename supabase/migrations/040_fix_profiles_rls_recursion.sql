-- BUG FIX (régression introduite par la migration 038) : la policy SELECT
-- de profiles contenait "exists (select 1 from public.profiles where
-- user_id = auth.uid() and is_admin = true)" — un sous-select sur profiles
-- DEPUIS une policy DE profiles. Évaluer ce sous-select redéclenche la même
-- policy RLS sur profiles, qui relance le même sous-select, à l'infini :
-- "infinite recursion detected in policy for relation profiles". Ça cassait
-- absolument tout ce qui touche profiles, y compris sauvegarder son propre
-- profil.
--
-- Le pattern exists(select ... from profiles where is_admin) DEPUIS une
-- policy sur une AUTRE table (activities, poi_reviews, feed_posts...) est
-- sûr, un seul aller simple. C'est seulement DEPUIS profiles vers profiles
-- que ça boucle. Solution standard : passer par une fonction security
-- definer (même schéma que is_user_banned, déjà utilisée sans problème
-- ailleurs) — elle s'exécute avec les droits du propriétaire de la
-- fonction, qui contourne RLS sur sa propre requête interne puisque
-- "force row level security" n'est pas activé sur la table.
create or replace function public.is_admin_user(uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where user_id = uid), false);
$$;

drop policy if exists "Les profils actifs sont visibles par tous, son propre profil toujours" on public.profiles;
create policy "Les profils actifs sont visibles par tous, son propre profil toujours"
  on public.profiles for select
  to authenticated
  using (
    is_banned = false
    or auth.uid() = user_id
    or public.is_admin_user(auth.uid())
  );
