-- Données publiques (accessibles sans connexion) pour les futures pages
-- SEO par ville — uniquement des agrégats/contenus déjà publics par nature,
-- jamais de données personnelles individuelles.

-- Les points d'intérêt (spots réels : surf, sorties, sport, plages, vélo)
-- sont déjà un contenu de type "office de tourisme", pas de raison de les
-- garder derrière la connexion pour les pages publiques par ville.
create policy "Les points d'intérêt sont visibles publiquement"
  on public.points_of_interest for select to anon using (true);

-- Nombre de membres par ville, en agrégat uniquement (aucun nom, aucune
-- donnée individuelle) — même logique que site_stats (déjà ouvert à anon).
create or replace view public.city_member_counts as
select city, count(*) as member_count
from public.profiles
where city is not null and name is not null and is_banned = false
group by city;

grant select on public.city_member_counts to authenticated, anon;
