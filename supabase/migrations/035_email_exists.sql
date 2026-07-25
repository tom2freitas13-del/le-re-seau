-- Permet à la page de connexion de distinguer "mauvais mot de passe" de
-- "compte inexistant" : Supabase renvoie volontairement la même erreur
-- pour les deux (anti-énumération), mais pour une communauté locale on
-- préfère guider clairement — mauvais mot de passe → "réessaie ou mot de
-- passe oublié", email inconnu → "inscris-toi". Choix assumé : cette
-- fonction révèle qu'un email possède un compte.
create or replace function public.email_exists(check_email text)
returns boolean
language sql
security definer set search_path = public, auth
stable
as $$
  select exists (select 1 from auth.users where lower(email) = lower(check_email));
$$;

revoke all on function public.email_exists(text) from public;
grant execute on function public.email_exists(text) to anon, authenticated;
