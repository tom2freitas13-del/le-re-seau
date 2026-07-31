-- Photos perso de l'utilisateur pour la plage du Bois-Plage (déjà en base
-- sous le nom "Les Gollandières", sa plage principale) et nouveau POI pour
-- le port de Saint-Martin-de-Ré (n'existait pas encore). Les chemins
-- pointent vers public/images/pois/ — même convention que les photos de
-- l'accueil (LocalImage/ISLAND_PHOTOS) : tant que le fichier n'est pas
-- déposé, l'app retombe simplement sur l'emoji, rien ne casse.
update public.points_of_interest
set image_url = '/images/pois/bois-plage-gollandieres.jpg'
where name = 'Les Gollandières';

insert into public.points_of_interest (name, category, description, description_en, address, latitude, longitude, image_url) values
('Port de Saint-Martin-de-Ré', 'bateau',
 'Le port historique de la capitale de l''île, au pied de la citadelle Vauban (UNESCO) : bateaux de plaisance, façades colorées et terrasses animées, une étape incontournable en toute saison.',
 'The historic harbour of the island''s capital, at the foot of the Vauban citadel (UNESCO): pleasure boats, colourful façades and lively terraces — a must-see at any time of year.',
 'Quai Job Foran, 17410 Saint-Martin-de-Ré', 46.20430, -1.36930, '/images/pois/port-saint-martin.jpg');
