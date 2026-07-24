-- Deuxième passe de correction des pins mal placés sur la carte : cette fois
-- recoupés avec le jeu de données officiel des plages d'OpenStreetMap
-- (tags natural=beach, liés aux fiches iledere.com), plus précis qu'une
-- simple adresse postale pour placer le pin exactement sur le sable.

-- Était à ~950m du centre réel de la plage.
update public.points_of_interest
set latitude = 46.246427, longitude = -1.540398
where name = 'Conche des Baleines';

-- Était à la lisière du parking/forêt plutôt que sur le sable (signalé par
-- l'utilisateur).
update public.points_of_interest
set latitude = 46.235289, longitude = -1.475688
where name = 'Trousse-Chemise';

-- Affinage mineur (~180m) vers le polygone de plage officiellement nommé.
update public.points_of_interest
set latitude = 46.256637, longitude = -1.515018
where name = 'Plage du Lizay';

-- Était à ~610m du centre réel de la plage.
update public.points_of_interest
set latitude = 46.180381, longitude = -1.403162
where name = 'Les Gollandières';

-- Resserré sur la plage explicitement nommée "Plage de la Pointe de
-- Grignon" dans OpenStreetMap plutôt que le point générique publié par
-- l'office de tourisme (~440m d'écart).
update public.points_of_interest
set latitude = 46.204462, longitude = -1.535630
where name = 'Pointe de Grignon';
