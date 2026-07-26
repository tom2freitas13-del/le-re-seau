-- BUG CRITIQUE : bannir/débannir un membre depuis Admin.tsx
-- (toggleBan → update({ is_banned }).eq('user_id', targetUserId)) échouait
-- silencieusement pour TOUT admin depuis toujours. La seule policy UPDATE
-- sur profiles (001_init.sql) est "auth.uid() = user_id" : un admin ne peut
-- modifier que SON PROPRE profil, jamais celui d'un autre membre. Comme
-- Supabase ne renvoie pas d'erreur quand une policy RLS filtre la ligne
-- (0 ligne affectée, pas d'exception), l'UI affichait "Utilisateur banni"
-- avec succès alors que is_banned ne changeait jamais en base.
--
-- Réutilise is_admin_user() (déjà security definer, déjà utilisée en
-- lecture depuis 040) pour éviter toute récursion RLS.
create policy "Un admin peut modifier le profil de n'importe qui"
  on public.profiles for update
  to authenticated
  using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));
