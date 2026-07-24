-- "État des lieux" : spots réels et connus de l'Île de Ré affichés sur la
-- carte à côté des activités créées par les membres — sources : recherche
-- web (office de tourisme, guides locaux), géocodées via l'API IGN.
create table if not exists public.points_of_interest (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) > 0 and char_length(name) <= 100),
  category text not null check (category in ('surf', 'apero', 'sport', 'plage', 'velo')),
  description text not null check (char_length(description) <= 500),
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  image_url text,
  -- Pour la catégorie "velo" : suite de points [lat, lon] du trajet complet,
  -- approximation reliant des lieux réels géocodés (pas un tracé GPX précis).
  route_waypoints jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_poi_category on public.points_of_interest (category);

alter table public.points_of_interest enable row level security;

create policy "Les points d'intérêt sont visibles par tous les connectés"
  on public.points_of_interest for select to authenticated using (true);

-- ----------------------------------------------------------------------------
create table if not exists public.poi_reviews (
  id uuid primary key default gen_random_uuid(),
  poi_id uuid not null references public.points_of_interest(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (poi_id, user_id)
);

create index if not exists idx_poi_reviews_poi on public.poi_reviews (poi_id);

alter table public.poi_reviews enable row level security;

create policy "Les avis sont visibles par tous les connectés"
  on public.poi_reviews for select to authenticated using (true);

create policy "On laisse un avis en son propre nom"
  on public.poi_reviews for insert to authenticated
  with check (auth.uid() = user_id);

create policy "On modifie son propre avis"
  on public.poi_reviews for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "On supprime son propre avis"
  on public.poi_reviews for delete to authenticated
  using (auth.uid() = user_id);

alter publication supabase_realtime add table public.poi_reviews;

-- ----------------------------------------------------------------------------
-- Données : spots réels de l'Île de Ré (surf, sorties, sport, plages, vélo)
-- ----------------------------------------------------------------------------
insert into public.points_of_interest (name, category, description, address, latitude, longitude, image_url) values
-- Surf
('Les Grenettes', 'surf', 'Spot le plus accessible et connu de l''île, vagues plutôt douces sur fond de reef rocheux. Idéal pour débuter, mais très fréquenté l''été.', 'Les Grenettes, 17740 Sainte-Marie-de-Ré', 46.162291, -1.363410, '/images/activities/surf.jpg'),
('Plage de Gouillaud', 'surf', 'Spot prisé des locaux, vagues de qualité toute l''année mais peu puissantes. Uniquement exploitable à marée haute.', 'Le Fond Gouillaud, 17580 Le Bois-Plage-en-Ré', 46.169877, -1.371277, '/images/activities/surf.jpg'),
('Sous le Phare des Baleines', 'surf', 'À la pointe nord-ouest de l''île, ce spot capte la houle de plein fouet : vagues puissantes et creuses, surtout par houle d''automne ou d''hiver.', 'Allée du Phare, 17590 Saint-Clément-des-Baleines', 46.243509, -1.559685, '/images/activities/surf.jpg'),
('Petit Bec & Diamond Head', 'surf', 'Entouré de forêts de pins, loin de la foule touristique. Vagues puissantes et rapides pouvant atteindre 3 mètres, réservé aux surfeurs expérimentés.', 'Route du Petit Bec, 17880 Les Portes-en-Ré', 46.252440, -1.523045, '/images/activities/surf.jpg'),
('Pointe de Grignon', 'surf', 'Totalement exposé à la houle sans aucune protection, considéré comme l''un des meilleurs spots de l''île, très fréquenté par les surfeurs confirmés.', 'Rue de la Pointe, 17580 Le Bois-Plage-en-Ré', 46.189690, -1.375349, '/images/activities/surf.jpg'),
-- Sorties
('La Pergola', 'apero', 'LA discothèque historique de l''île, ouverte depuis 1936. Bar-restaurant-boîte incontournable, ambiance rétro années 80 aux sons actuels, soirées à thème l''été.', '32 Route de Joachim, 17670 La Couarde-sur-Mer', 46.191100, -1.431170, '/images/activities/apero.jpg'),
('Le Bastion', 'apero', 'Perché sur les hauteurs de la citadelle Vauban (classée UNESCO), vue imprenable sur l''océan. Restaurant-bar le jour, club dès 23h avec DJ le week-end.', '50 Cours Pasteur, 17410 Saint-Martin-de-Ré', 46.205176, -1.372895, '/images/activities/apero.jpg'),
('Léon Dit', 'apero', 'Nouveau concept qui a repris la suite du bar "Le 120", institution du nord de l''île pour ses concerts et son ambiance conviviale.', '9 Route de Saint-Clément, 17590 Ars-en-Ré', 46.205712, -1.520120, '/images/activities/apero.jpg'),
('La Java des Baleines', 'apero', 'Guinguette éphémère associative (fin mai à fin août) : bar, piste de danse, concerts et food-trucks sous un chapiteau, programme différent chaque soir.', 'Rue de la Mairie, 17590 Saint-Clément-des-Baleines', 46.229143, -1.541172, '/images/activities/apero.jpg'),
('Kokot', 'apero', 'Sur le port de Saint-Martin, ambiance musicale éclectique, deux terrasses et patio intérieur pour cocktails, vins et bières artisanales.', '53 Quai de la Poithevinière, 17410 Saint-Martin-de-Ré', 46.205057, -1.369615, '/images/activities/apero.jpg'),
('Ré Glisse Bar', 'apero', 'Bar de plage décontracté, les pieds dans le sable, ambiance vacances toute la journée.', 'Avenue de la Plage, 17940 Rivedoux-Plage', 46.158195, -1.269981, '/images/activities/apero.jpg'),
-- Sport
('Complexe Marcel Gaillard', 'sport', 'Principal complexe sportif de l''île : terrain de football officiel avec tribunes, piste d''athlétisme et gymnase multisport.', '36 Avenue Philippsburg, 17410 Saint-Martin-de-Ré', 46.195255, -1.356260, '/images/activities/sport.jpg'),
('Ré Tennis Club', 'sport', '7 courts extérieurs et 2 courts couverts (utilisables toute l''année), plus 2 courts de padel éclairés.', '4 Route de Gros Jonc, 17580 Le Bois-Plage-en-Ré', 46.178433, -1.375100, '/images/activities/sport.jpg'),
('Tennis des Pertuis', 'sport', '7 courts de tennis, 3 courts de padel et 1 terrain de pickleball, à quelques mètres de la plage de La Couarde.', '21 Avenue d''Antioche, 17670 La Couarde-sur-Mer', 46.192877, -1.431082, '/images/activities/sport.jpg'),
('City-Stade d''Ars-en-Ré', 'sport', 'Terrain de football et basket en accès libre, avec piste de course autour, près du port.', 'Quai de la Criée, 17590 Ars-en-Ré', 46.213313, -1.509527, '/images/activities/sport.jpg'),
-- Plages
('Conche des Baleines', 'plage', 'Considérée par les connaisseurs comme la plus belle plage de l''île : 3 km de sable fin et l''un des plus beaux couchers de soleil de la côte.', 'Chemin de la Conche, 17590 Saint-Clément-des-Baleines', 46.241868, -1.550817, '/images/activities/plage.jpg'),
('Trousse-Chemise', 'plage', 'Plage mythique rendue célèbre par la chanson de Charles Aznavour, accessible à pied à travers la forêt, cadre naturel préservé.', 'Trousse Chemise, 17880 Les Portes-en-Ré', 46.234094, -1.477608, '/images/activities/plage.jpg'),
('Plage du Lizay', 'plage', 'Plage sauvage bordée de dunes, prisée des surfeurs, marcheurs et familles en quête de tranquillité.', 'Route du Lizay, 17880 Les Portes-en-Ré', 46.256333, -1.517441, '/images/activities/plage.jpg'),
('Les Gollandières', 'plage', 'Une des plages les plus fréquentées de l''île, large étendue de sable fin plein sud, baignade surveillée en saison.', 'Avenue des Gollandières, 17580 Le Bois-Plage-en-Ré', 46.181152, -1.395261, '/images/activities/plage.jpg'),
-- Vélo (avec trajet complet en route_waypoints)
('Tour complet de l''île', 'velo', '82 km à travers les 10 villages de l''île, faisable en une journée pour cyclistes confirmés ou sur deux jours en famille. Départ conseillé depuis le pont.', 'Rivedoux-Plage (entrée de l''île)', 46.161976, -1.277881, '/images/activities/velo.jpg'),
('Route des marais salants', 'velo', 'Itinéraire au cœur des marais salants, certaines pistes réservées aux vélos. Ars-en-Ré, Loix et La Couarde sont les meilleurs points de départ.', 'Ars-en-Ré', 46.214096, -1.508569, '/images/activities/velo.jpg'),
('Route vers le Phare des Baleines', 'velo', 'Direction la pointe la plus au nord de l''île pour rejoindre l''emblématique Phare des Baleines.', 'Ars-en-Ré', 46.214096, -1.508569, '/images/activities/velo.jpg'),
('Littoral La Flotte ↔ Saint-Martin', 'velo', 'Parcours qui longe le littoral en douceur, vue sur le Pertuis Breton. La Flotte est classée parmi les Plus Beaux Villages de France.', 'La Flotte', 46.187316, -1.327585, '/images/activities/velo.jpg');

-- Trajets complets pour les 4 itinéraires vélo (waypoints réels reliés dans l'ordre géographique)
update public.points_of_interest set route_waypoints = '[[46.161976,-1.277881],[46.155424,-1.330263],[46.187316,-1.327585],[46.201689,-1.368379],[46.197643,-1.442943],[46.182576,-1.386186],[46.214096,-1.508569],[46.222784,-1.446893],[46.251941,-1.507593],[46.228236,-1.541776]]'::jsonb
  where name = 'Tour complet de l''île';

update public.points_of_interest set route_waypoints = '[[46.214096,-1.508569],[46.222784,-1.446893],[46.197643,-1.442943]]'::jsonb
  where name = 'Route des marais salants';

update public.points_of_interest set route_waypoints = '[[46.214096,-1.508569],[46.228236,-1.541776]]'::jsonb
  where name = 'Route vers le Phare des Baleines';

update public.points_of_interest set route_waypoints = '[[46.187316,-1.327585],[46.201689,-1.368379]]'::jsonb
  where name = 'Littoral La Flotte ↔ Saint-Martin';
