-- Lacune de modération : bannir un membre bloque uniquement SA propre
-- utilisation de l'appli (BannedScreen), mais ne le retire de rien pour les
-- autres — son profil restait visible et contactable dans Social (matching),
-- le fil, les activités, les annonces, exactement comme n'importe qui
-- d'autre. Tout l'intérêt d'un bannissement (protéger la communauté d'un
-- comportement signalé) n'était donc pas rempli.
--
-- Fait au niveau RLS plutôt que dans chaque page (comme les stories qui
-- expirent après 24h via la policy elle-même) : ça protège d'un coup toutes
-- les pages qui listent des profils (Social, HomeFeed, participants
-- d'activité, auteurs d'annonces...), au lieu de devoir penser à filtrer
-- is_banned partout où un profil est affiché.
--
-- Exceptions : le compte banni voit toujours sa propre ligne (sinon son
-- expérience résiduelle casserait), et les admins voient tout le monde
-- (nécessaire pour la modération dans Admin.tsx) — même pattern que les
-- autres policies admin déjà en place (017, 024, 026).
drop policy if exists "Les profils sont visibles par tous les connectés" on public.profiles;

create policy "Les profils actifs sont visibles par tous, son propre profil toujours"
  on public.profiles for select
  to authenticated
  using (
    is_banned = false
    or auth.uid() = user_id
    or exists (select 1 from public.profiles where user_id = auth.uid() and is_admin = true)
  );
